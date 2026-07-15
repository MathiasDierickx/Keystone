/** Core domain types for Keystone — see SPEC.md for the on-disk contract. */

export type ArtifactKind = "plan" | "design" | "report" | "note";
export type ArtifactStatus = "awaiting-review" | "in-review" | "done";
export type Verdict = "approved" | "changes-requested" | "rejected";
export type FeedbackStatus = "pending" | "consumed";

/** A client workspace. Projects are fully isolated: one watched folder each. */
export interface Project {
  id: string;
  name: string;
  /** Absolute path to the watched folder. */
  folder: string;
  /** Accent color (oklch/hex) for the project chip. */
  color: string;
  createdAt: string;
}

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
  /** Absolute path of the git worktree this artifact was found in, if any. */
  worktree?: string;
  /** Branch checked out in that worktree, if any. */
  branch?: string;
  /** Whether this came from the repo's main worktree (true when not in a repo). */
  isMain: boolean;
}

/**
 * A single anchored comment. The anchor is a text quote (see SPEC.md §Anchors):
 * `quote` is the exact selected text, `occ` disambiguates repeated matches, and
 * `section` is the nearest heading. This survives artifact rewrites better than
 * line numbers and reads naturally to an AI agent ("this is about «quote»").
 */
export interface Comment {
  id: string;
  status: FeedbackStatus;
  /** Exact text the comment anchors to (whitespace-normalized, single line). */
  quote: string;
  /** 1-based occurrence of `quote` within the artifact, for disambiguation. */
  occ: number;
  /** Nearest heading, for context + relocation hints. */
  section?: string;
  /** The feedback prose (Markdown). */
  body: string;
}

/** The full contents of a `<artifact>.feedback.md` file. */
export interface Feedback {
  target: string;
  /** Overall loop state — `pending` until an agent consumes it. */
  status: FeedbackStatus;
  verdict: Verdict;
  reviewedAt: string;
  /** Document-level feedback (not anchored). */
  summary: string;
  /** Anchored, inline comments. */
  comments: Comment[];
}
