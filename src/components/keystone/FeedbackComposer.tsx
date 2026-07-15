import { useState } from "react";
import { Check, MessageSquareText, X, Send } from "lucide-react";
import type { Verdict } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const VERDICTS: { key: Verdict; label: string; icon: typeof Check; tone: string }[] =
  [
    {
      key: "approved",
      label: "Approve",
      icon: Check,
      tone: "data-[on=true]:bg-emerald-500/15 data-[on=true]:text-emerald-600 data-[on=true]:ring-emerald-500/30 dark:data-[on=true]:text-emerald-400",
    },
    {
      key: "changes-requested",
      label: "Request changes",
      icon: MessageSquareText,
      tone: "data-[on=true]:bg-primary/15 data-[on=true]:text-primary data-[on=true]:ring-primary/30",
    },
    {
      key: "rejected",
      label: "Reject",
      icon: X,
      tone: "data-[on=true]:bg-destructive/15 data-[on=true]:text-destructive data-[on=true]:ring-destructive/30",
    },
  ];

interface FeedbackComposerProps {
  onSubmit: (verdict: Verdict, body: string) => void;
}

export function FeedbackComposer({ onSubmit }: FeedbackComposerProps) {
  const [verdict, setVerdict] = useState<Verdict>("changes-requested");
  const [body, setBody] = useState("");

  return (
    <div className="glass shrink-0 rounded-2xl p-3">
      <div className="mb-2 flex flex-wrap gap-2">
        {VERDICTS.map(({ key, label, icon: Icon, tone }) => (
          <button
            key={key}
            data-on={verdict === key}
            onClick={() => setVerdict(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-transparent transition-colors hover:text-foreground",
              tone,
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write feedback… Use “§ Section — note” lines for section-scoped comments."
        className="min-h-24 resize-none rounded-xl border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between pt-1">
        <p className="pl-1 text-xs text-muted-foreground">
          Writes a <code className="text-foreground/70">.feedback.md</code> next to the artifact.
        </p>
        <Button
          size="sm"
          className="rounded-xl"
          disabled={!body.trim()}
          onClick={() => {
            onSubmit(verdict, body.trim());
            setBody("");
          }}
        >
          <Send className="size-3.5" />
          Send feedback
        </Button>
      </div>
    </div>
  );
}
