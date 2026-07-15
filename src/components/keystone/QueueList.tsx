import { MessageSquareText } from "lucide-react";
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

export function QueueList({ artifacts, selectedPath, onSelect }: QueueListProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-3">
        {artifacts.length === 0 && (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </div>
        )}
        {artifacts.map((a) => {
          const isSelected = a.path === selectedPath;
          return (
            <button
              key={a.path}
              onClick={() => onSelect(a)}
              className={cn(
                "group flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all",
                isSelected
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
                <span>·</span>
                <span>{STATUS_LABEL[a.status]}</span>
                <span className="ml-auto">{timeAgo(a.modifiedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
