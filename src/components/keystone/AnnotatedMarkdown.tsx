import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, Trash2, Unlink } from "lucide-react";
import type { Comment } from "@/types";
import { cn } from "@/lib/utils";
import { newId } from "@/lib/projects";
import {
  buildTextIndex,
  findRange,
  selectionAnchor,
  type SelectionAnchor,
} from "@/lib/anchoring";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "./MarkdownView";

const RAIL_W = 288; // px, matches w-72
const CARD_GAP = 12;

interface Placement {
  id: string;
  top: number;
  found: boolean;
}

interface AnnotatedMarkdownProps {
  content: string;
  comments: Comment[];
  onCreateComment: (comment: Comment) => void;
  onDeleteComment: (id: string) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const HL: any = typeof CSS !== "undefined" && (CSS as any).highlights;
const HighlightCtor: any =
  typeof window !== "undefined" ? (window as any).Highlight : undefined;
const supportsHighlight = !!HL && !!HighlightCtor;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function AnnotatedMarkdown({
  content,
  comments,
  onCreateComment,
  onDeleteComment,
}: AnnotatedMarkdownProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [raw, setRaw] = useState<Placement[]>([]);
  const [tops, setTops] = useState<Record<string, number>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toolbar, setToolbar] = useState<SelectionAnchor | null>(null);
  const [composer, setComposer] = useState<SelectionAnchor | null>(null);
  const [draft, setDraft] = useState("");

  // Locate each comment's anchor range, register highlights, and record
  // its raw vertical offset within the rail. Re-runs when text/comments change.
  const relayout = useCallback(() => {
    const article = articleRef.current;
    const wrapper = wrapperRef.current;
    if (!article || !wrapper) return;

    const index = buildTextIndex(article);
    const wrapperTop = wrapper.getBoundingClientRect().top;
    const hl = supportsHighlight ? new HighlightCtor() : null;
    const activeHl = supportsHighlight ? new HighlightCtor() : null;

    const next: Placement[] = comments.map((c) => {
      const range = findRange(index, c.quote, c.occ);
      if (!range) return { id: c.id, top: 0, found: false };
      if (hl) hl.add(range);
      if (activeHl && c.id === activeId) activeHl.add(range);
      const top = range.getBoundingClientRect().top - wrapperTop;
      return { id: c.id, top: Math.max(0, top), found: true };
    });

    if (HL) {
      if (hl) HL.set("keystone-anchor", hl);
      if (activeHl) HL.set("keystone-anchor-active", activeHl);
    }
    setRaw(next);
  }, [comments, activeId]);

  useLayoutEffect(() => {
    relayout();
  }, [relayout, content]);

  // Recompute on container resize (wrapping changes anchor offsets).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => relayout());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [relayout]);

  // Clear highlights on unmount.
  useEffect(() => {
    return () => {
      if (HL) {
        HL.delete("keystone-anchor");
        HL.delete("keystone-anchor-active");
      }
    };
  }, []);

  // De-overlap cards using their measured heights.
  useLayoutEffect(() => {
    const sorted = [...raw].sort((a, b) => a.top - b.top);
    const nextTops: Record<string, number> = {};
    let prevBottom = -Infinity;
    for (const p of sorted) {
      const h = cardRefs.current.get(p.id)?.offsetHeight ?? 90;
      const top = Math.max(p.top, prevBottom + CARD_GAP);
      nextTops[p.id] = top;
      prevBottom = top + h;
    }
    setTops((prev) => {
      const ids = Object.keys(nextTops);
      const same =
        ids.length === Object.keys(prev).length &&
        ids.every((id) => Math.abs((prev[id] ?? -1) - nextTops[id]) < 0.5);
      return same ? prev : nextTops;
    });
  }, [raw, activeId]);

  const handleMouseUp = useCallback(() => {
    const article = articleRef.current;
    if (!article) return;
    // Defer so the browser has committed the selection.
    requestAnimationFrame(() => {
      const index = buildTextIndex(article);
      const anchor = selectionAnchor(article, index);
      setToolbar(anchor);
    });
  }, []);

  const openComposer = (anchor: SelectionAnchor) => {
    setComposer(anchor);
    setDraft("");
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  const saveComment = () => {
    if (!composer || !draft.trim()) return;
    onCreateComment({
      id: newId(),
      status: "pending",
      quote: composer.quote,
      occ: composer.occ,
      section: composer.section,
      body: draft.trim(),
    });
    setComposer(null);
    setDraft("");
  };

  const foundIds = new Set(raw.filter((p) => p.found).map((p) => p.id));

  return (
    <div ref={wrapperRef} className="relative flex gap-6">
      {/* Article */}
      <div
        ref={articleRef}
        onMouseUp={handleMouseUp}
        className="min-w-0 flex-1 selection:bg-primary/20"
      >
        <MarkdownView content={content} />
      </div>

      {/* Comment rail */}
      <div
        className="relative shrink-0"
        style={{ width: RAIL_W }}
        aria-label="Comments"
      >
        {comments.map((c) => {
          const orphaned = !foundIds.has(c.id);
          const top = tops[c.id] ?? raw.find((p) => p.id === c.id)?.top ?? 0;
          const isActive = activeId === c.id;
          return (
            <div
              key={c.id}
              ref={(el) => {
                if (el) cardRefs.current.set(c.id, el);
                else cardRefs.current.delete(c.id);
              }}
              onMouseEnter={() => setActiveId(c.id)}
              onMouseLeave={() => setActiveId((id) => (id === c.id ? null : id))}
              style={{ position: "absolute", top, width: RAIL_W }}
              className={cn(
                "group rounded-xl border p-3 text-sm shadow-sm transition-all",
                isActive
                  ? "border-primary/40 bg-card shadow-md"
                  : "border-border/70 bg-card/70",
              )}
            >
              <div className="mb-1.5 flex items-start gap-1.5">
                <p
                  className={cn(
                    "min-w-0 flex-1 border-l-2 pl-2 text-xs italic",
                    orphaned
                      ? "border-amber-400/60 text-muted-foreground"
                      : "border-primary/40 text-muted-foreground",
                  )}
                >
                  {orphaned && (
                    <Unlink className="mr-1 inline size-3 text-amber-500" />
                  )}
                  {c.section ? `§ ${c.section} — ` : ""}
                  <span className="line-clamp-2">“{c.quote}”</span>
                </p>
                <button
                  onClick={() => onDeleteComment(c.id)}
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete comment"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
              {orphaned && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                  Anchor text no longer found — the artifact may have changed.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection toolbar — portaled to escape transformed ancestors,
          so `position: fixed` is viewport-relative. */}
      {toolbar &&
        createPortal(
        <div
          style={{
            position: "fixed",
            top: toolbar.rect.top - 44,
            left: toolbar.rect.left + toolbar.rect.width / 2,
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
        >
          <Button
            size="sm"
            className="rounded-full shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => openComposer(toolbar)}
          >
            <MessageSquarePlus className="size-3.5" />
            Comment
          </Button>
        </div>,
          document.body,
        )}

      {/* New-comment composer — also portaled. */}
      {composer &&
        createPortal(
        <div
          style={{
            position: "fixed",
            top: Math.min(composer.rect.bottom + 8, window.innerHeight - 220),
            left: Math.min(
              Math.max(composer.rect.left, 16),
              window.innerWidth - 340,
            ),
            zIndex: 50,
            width: 320,
          }}
          className="glass rounded-2xl p-3 shadow-xl"
        >
          <p className="mb-2 line-clamp-2 border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
            {composer.section ? `§ ${composer.section} — ` : ""}“{composer.quote}”
          </p>
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your comment on this…"
            className="min-h-20 resize-none rounded-xl bg-background/60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveComment();
              if (e.key === "Escape") setComposer(null);
            }}
          />
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">⌘↵ to save</span>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => setComposer(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-lg"
                disabled={!draft.trim()}
                onClick={saveComment}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
