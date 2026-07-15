import { FileText } from "lucide-react";
import type { Artifact, Comment, Feedback, Verdict } from "@/types";
import { KIND_LABEL, STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnnotatedMarkdown } from "./AnnotatedMarkdown";
import { FeedbackComposer } from "./FeedbackComposer";

interface ArtifactViewProps {
  artifact: Artifact | null;
  feedback: Feedback | null;
  onSubmitFeedback: (verdict: Verdict, body: string) => void;
  onCreateComment: (comment: Comment) => void;
  onDeleteComment: (id: string) => void;
}

export function ArtifactView({
  artifact,
  feedback,
  onSubmitFeedback,
  onCreateComment,
  onDeleteComment,
}: ArtifactViewProps) {
  if (!artifact) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <FileText className="size-6" />
        </div>
        <p className="text-sm">Select an artifact to review.</p>
      </div>
    );
  }

  const comments = feedback?.comments ?? [];

  return (
    <div className="flex h-full flex-col gap-3 p-4 pl-1">
      {/* Header */}
      <div className="shrink-0 px-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full font-normal">
            {KIND_LABEL[artifact.kind]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {STATUS_LABEL[artifact.status]} · updated {timeAgo(artifact.modifiedAt)}
            {comments.length > 0 &&
              ` · ${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {artifact.title}
        </h1>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">
          {artifact.filename}
        </p>
      </div>

      {/* Rendered body + anchored comments */}
      <div className="glass min-h-0 flex-1 overflow-hidden rounded-2xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <AnnotatedMarkdown
              key={artifact.path}
              content={artifact.content}
              comments={comments}
              onCreateComment={onCreateComment}
              onDeleteComment={onDeleteComment}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Feedback composer */}
      <FeedbackComposer
        key={artifact.path}
        initialVerdict={feedback?.verdict}
        initialBody={feedback?.summary}
        onSubmit={onSubmitFeedback}
      />
    </div>
  );
}
