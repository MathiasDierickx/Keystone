---
keystone:
  title: "ADR 0001 — Git-driven worktree discovery"
  kind: decision
  status: done
---

# ADR 0001 — Git-driven worktree discovery

- **Status:** Accepted
- **Date:** 2026-07-15

## Context

A Keystone project watches one folder. When an AI agent works inside a git
**worktree**, the Markdown it writes lands in a different working directory, so
those artifacts were invisible to a project pointed at the main repo folder.

We compared four options (recursive scan, git-driven enumeration, manual
multi-folder, dot-folder watching) in [worktree-support](../design/worktree-support.md).

## Decision

When a watched folder is inside a git repo, enumerate every worktree with
`git worktree list --porcelain` and scan each at the same relative subpath,
tagging artifacts with their `{ worktree, branch }`. Fall back to a plain
single-folder scan when the folder is not in a repo, or when git enumeration
fails.

## Consequences

- **+** Finds worktrees anywhere on disk and gives a branch label for grouping.
- **+** No new watcher — re-enumeration rides the existing poll.
- **−** Shells out to `git` on each poll (acceptable for small repos).
- **−** Branches that are not checked out as a worktree are still invisible;
  reading those via `git show <ref>:<path>` is future work (version switcher).
