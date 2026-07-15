/** Core domain types for Keystone — see SPEC.md for the on-disk contract. */

export type ArtifactKind = "plan" | "design" | "report" | "note";
export type ArtifactStatus = "awaiting-review" | "in-review" | "done";
export type Verdict = "approved" | "changes-requested" | "rejected";
export type FeedbackStatus = "pending" | "consumed";

export interface Artifact {
  /** Absolute path on disk. */
  path: string;
  /** File basename, e.g. "plan.md". */
  filename: string;
  /** Display title — from front-matter, first H1, or filename. */
  title: string;
  kind: ArtifactKind;
  status: ArtifactStatus;
  /** Raw Markdown body (front-matter stripped). */
  content: string;
  /** Last modified, ISO-8601. */
  modifiedAt: string;
  /** Whether a sibling *.feedback.md already exists. */
  hasFeedback: boolean;
}

export interface Feedback {
  target: string;
  status: FeedbackStatus;
  verdict: Verdict;
  reviewedAt: string;
  body: string;
}
