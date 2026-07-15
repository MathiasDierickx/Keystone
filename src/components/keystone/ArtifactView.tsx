import { FileText } from "lucide-react";
import type { Artifact, Verdict } from "@/types";
import { KIND_LABEL, STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownView } from "./MarkdownView";
import { FeedbackComposer } from "./FeedbackComposer";

interface ArtifactViewProps {
  artifact: Artifact | null;
  onSubmitFeedback: (verdict: Verdict, body: string) => void;
}

export function ArtifactView({ artifact, onSubmitFeedback }: ArtifactViewProps) {
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
          </span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {artifact.title}
        </h1>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">
          {artifact.filename}
        </p>
      </div>

      {/* Rendered body */}
      <div className="glass min-h-0 flex-1 overflow-hidden rounded-2xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <MarkdownView content={artifact.content} />
          </div>
        </ScrollArea>
      </div>

      {/* Feedback */}
      <FeedbackComposer onSubmit={onSubmitFeedback} />
    </div>
  );
}
