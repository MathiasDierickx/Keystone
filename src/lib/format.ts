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
  plan: "Plan",
  design: "Design",
  report: "Report",
  note: "Note",
};

export const STATUS_LABEL: Record<ArtifactStatus, string> = {
  "awaiting-review": "Awaiting review",
  "in-review": "In review",
  done: "Done",
};
