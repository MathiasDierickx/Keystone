import { GitBranch, MessageSquareText } from "lucide-react";
import type { Artifact } from "@/types";
import { cn } from "@/lib/utils";
import { KIND_LABEL, STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const STATUS_DOT: Record<Artifact["status"], string> = {
  "awaiting-review": "bg-amber-500",
  "in-review": "bg-primary",
  done: "bg-emerald-500",
};

interface QueueListProps {
  artifacts: Artifact[];
  selectedPath: string | null;
  onSelect: (a: Artifact) => void;
}

interface Group {
  key: string;
  label: string;
  isMain: boolean;
  items: Artifact[];
}

/** Group artifacts by worktree (labelled by branch); main worktree first. */
function groupByWorktree(artifacts: Artifact[]): Group[] {
  const map = new Map<string, Group>();
  for (const a of artifacts) {
    const key = a.worktree ?? "local";
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: a.branch ?? (a.isMain ? "main" : "detached"),
        isMain: a.isMain,
        items: [],
      });
    }
    map.get(key)!.items.push(a);
  }
  return [...map.values()].sort((x, y) => {
    if (x.isMain !== y.isMain) return x.isMain ? -1 : 1;
    return x.label.localeCompare(y.label);
  });
}

function ArtifactCard({
  a,
  selected,
  onSelect,
}: {
  a: Artifact;
  selected: boolean;
  onSelect: (a: Artifact) => void;
}) {
  return (
    <button
      onClick={() => onSelect(a)}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all",
        selected
          ? "glass border-primary/30 shadow-md ring-1 ring-primary/20"
          : "border-transparent bg-card/40 hover:bg-card/70 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            STATUS_DOT[a.status],
          )}
        />
        <span className="flex-1 font-medium leading-snug tracking-tight">
          {a.title}
        </span>
        {a.hasFeedback && (
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary/70" />
        )}
      </div>
      <div className="flex items-center gap-2 pl-4 text-xs text-muted-foreground">
        <Badge
          variant="secondary"
          className="rounded-full px-2 py-0 font-normal"
        >
          {KIND_LABEL[a.kind]}
        </Badge>
        {a.branch && !a.isMain && (
          <span className="flex min-w-0 items-center gap-1 text-primary/80">
            <GitBranch className="size-3 shrink-0" />
            <span className="truncate">{a.branch}</span>
          </span>
        )}
        <span>·</span>
        <span>{STATUS_LABEL[a.status]}</span>
        <span className="ml-auto shrink-0">{timeAgo(a.modifiedAt)}</span>
      </div>
    </button>
  );
}

export function QueueList({ artifacts, selectedPath, onSelect }: QueueListProps) {
  if (artifacts.length === 0) {
    return (
      <ScrollArea className="h-full">
        <div className="mt-16 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </div>
      </ScrollArea>
    );
  }

  const groups = groupByWorktree(artifacts);
  const grouped = groups.length > 1;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-3">
        {!grouped &&
          artifacts.map((a) => (
            <ArtifactCard
              key={a.path}
              a={a}
              selected={a.path === selectedPath}
              onSelect={onSelect}
            />
          ))}

        {grouped &&
          groups.map((g) => (
            <div key={g.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-2 pt-2 text-xs font-medium text-muted-foreground">
                <GitBranch className="size-3.5" />
                <span className="truncate">{g.label}</span>
                {g.isMain && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    main
                  </span>
                )}
                <span className="ml-auto tabular-nums">{g.items.length}</span>
              </div>
              {g.items.map((a) => (
                <ArtifactCard
                  key={a.path}
                  a={a}
                  selected={a.path === selectedPath}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))}
      </div>
    </ScrollArea>
  );
}
