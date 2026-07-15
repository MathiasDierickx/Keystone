import type { ArtifactKind, ArtifactStatus } from "@/types";

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export const KIND_LABEL: Record<ArtifactKind, string> = {
  spec: "Spec",
  design: "Design",
  decision: "Decision",
  rfc: "RFC",
  reference: "Reference",
  guide: "Guide",
  tutorial: "Tutorial",
  explanation: "Explanation",
  runbook: "Runbook",
  changelog: "Changelog",
  research: "Research",
  plan: "Plan",
  report: "Report",
  note: "Note",
};

/** Doc-type families for the sidebar, in display order. */
export interface KindFamily {
  name: string;
  kinds: ArtifactKind[];
}

export const KIND_FAMILIES: KindFamily[] = [
  { name: "Specs & decisions", kinds: ["spec", "design", "decision", "rfc"] },
  {
    name: "Documentation",
    kinds: ["reference", "guide", "tutorial", "explanation"],
  },
  { name: "Operations", kinds: ["runbook", "changelog"] },
  { name: "Working notes", kinds: ["research", "plan", "report", "note"] },
];

/** Folder-name → kind hint, for when front-matter omits `keystone.kind`. */
export const FOLDER_KIND: Record<string, ArtifactKind> = {
  specs: "spec",
  spec: "spec",
  design: "design",
  decisions: "decision",
  adr: "decision",
  adrs: "decision",
  rfcs: "rfc",
  rfc: "rfc",
  reference: "reference",
  guides: "guide",
  "how-to": "guide",
  tutorials: "tutorial",
  explanation: "explanation",
  explanations: "explanation",
  runbooks: "runbook",
  changelog: "changelog",
  research: "research",
  notes: "note",
  plans: "plan",
  reports: "report",
};

export const STATUS_LABEL: Record<ArtifactStatus, string> = {
  "awaiting-review": "Awaiting review",
  "in-review": "In review",
  done: "Done",
};
