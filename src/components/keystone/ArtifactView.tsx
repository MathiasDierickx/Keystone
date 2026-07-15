import { ChevronLeft, ChevronRight, Eye, FileText, GitBranch } from "lucide-react";
import type { Artifact, Comment, Feedback, Verdict } from "@/types";
import type { DocVersion } from "@/lib/versions";
import { cn } from "@/lib/utils";
import { KIND_LABEL, STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnnotatedMarkdown } from "./AnnotatedMarkdown";
import { MarkdownView } from "./MarkdownView";
import { FeedbackComposer } from "./FeedbackComposer";
import { VersionSwitcher } from "./VersionSwitcher";

interface ArtifactViewProps {
  artifact: Artifact | null;
  feedback: Feedback | null;
  versions: DocVersion[];
  currentVersionKey: string | null;
  override: { label: string; content: string } | null;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onSelectVersion: (v: DocVersion) => void;
  onLinkClick: (href: string) => void;
  onSubmitFeedback: (verdict: Verdict, body: string) => void;
  onCreateComment: (comment: Comment) => void;
  onDeleteComment: (id: string) => void;
}

function NavButton({
  icon: Icon,
  disabled,
  onClick,
  label,
}: {
  icon: typeof ChevronLeft;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-lg transition-colors",
        disabled
          ? "text-muted-foreground/30"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function ArtifactView({
  artifact,
  feedback,
  versions,
  currentVersionKey,
  override,
  canBack,
  canForward,
  onBack,
  onForward,
  onSelectVersion,
  onLinkClick,
  onSubmitFeedback,
  onCreateComment,
  onDeleteComment,
}: ArtifactViewProps) {
  const comments = feedback?.comments ?? [];

  return (
    <div className="flex h-full flex-col gap-3 p-4 pl-1">
      {/* Navigation bar */}
      <div className="flex shrink-0 items-center gap-1 px-2">
        <NavButton
          icon={ChevronLeft}
          disabled={!canBack}
          onClick={onBack}
          label="Back"
        />
        <NavButton
          icon={ChevronRight}
          disabled={!canForward}
          onClick={onForward}
          label="Forward"
        />
        {artifact && (
          <div className="ml-auto">
            <VersionSwitcher
              versions={versions}
              currentKey={currentVersionKey}
              onSelect={onSelectVersion}
            />
          </div>
        )}
      </div>

      {!artifact ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <FileText className="size-6" />
          </div>
          <p className="text-sm">Select a document to view.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 px-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full font-normal">
                {KIND_LABEL[artifact.kind]}
              </Badge>
              {artifact.branch && !artifact.isMain && (
                <Badge
                  variant="outline"
                  className="gap-1 rounded-full font-normal text-muted-foreground"
                >
                  <GitBranch className="size-3" />
                  {artifact.branch}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {STATUS_LABEL[artifact.status]} · updated{" "}
                {timeAgo(artifact.modifiedAt)}
                {comments.length > 0 &&
                  ` · ${comments.length} comment${comments.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              {artifact.title}
            </h1>
            <p
              className="mt-0.5 truncate font-mono text-xs text-muted-foreground/70"
              title={artifact.path}
            >
              {artifact.path}
            </p>
          </div>

          {/* Read-only banner when viewing another branch's version */}
          {override && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
              <Eye className="size-3.5 text-primary" />
              Viewing this document on{" "}
              <span className="font-medium text-foreground">{override.label}</span>{" "}
              — read-only. Switch to a worktree version to comment.
            </div>
          )}

          {/* Rendered body */}
          <div className="glass min-h-0 flex-1 overflow-hidden rounded-2xl">
            <ScrollArea className="h-full">
              <div className="p-6">
                {override ? (
                  <MarkdownView
                    content={override.content}
                    onLinkClick={onLinkClick}
                  />
                ) : (
                  <AnnotatedMarkdown
                    key={artifact.path}
                    content={artifact.content}
                    comments={comments}
                    onCreateComment={onCreateComment}
                    onDeleteComment={onDeleteComment}
                    onLinkClick={onLinkClick}
                  />
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Feedback composer — only for the on-disk (worktree) version */}
          {!override && (
            <FeedbackComposer
              key={`${artifact.path}${feedback ? "#fb" : ""}`}
              initialVerdict={feedback?.verdict}
              initialBody={feedback?.summary}
              onSubmit={onSubmitFeedback}
            />
          )}
        </>
      )}
    </div>
  );
}
