import type { Artifact } from "@/types";

/** A viewable version of a document — an on-disk worktree, or a git branch. */
export interface DocVersion {
  key: string;
  label: string;
  kind: "worktree" | "branch";
  isMain: boolean;
  /** Set for worktree versions: the on-disk artifact path. */
  path?: string;
  /** Set for branch versions: the git ref (e.g. "feature/x", "origin/main"). */
  ref?: string;
}

/** Short branch name for a ref, dropping an `origin/` remote prefix. */
export function refShort(ref: string): string {
  return ref.replace(/^origin\//, "");
}

/**
 * All versions of `current`: every worktree that has the same document (by
 * repo-relative path), plus branches that carry it but aren't checked out.
 */
export function buildVersions(
  current: Artifact,
  artifacts: Artifact[],
  branchRefs: string[],
): DocVersion[] {
  const rel = current.repoRelPath;
  const worktrees: DocVersion[] = artifacts
    .filter((a) => rel && a.repoRelPath === rel)
    .map((a) => ({
      key: `wt:${a.path}`,
      label: a.branch ?? (a.isMain ? "main" : "detached"),
      kind: "worktree" as const,
      isMain: a.isMain,
      path: a.path,
    }))
    .sort((x, y) => {
      if (x.isMain !== y.isMain) return x.isMain ? -1 : 1;
      return x.label.localeCompare(y.label);
    });

  const branches: DocVersion[] = branchRefs.map((ref) => ({
    key: `br:${ref}`,
    label: ref,
    kind: "branch" as const,
    isMain: false,
    ref,
  }));

  return [...worktrees, ...branches];
}
