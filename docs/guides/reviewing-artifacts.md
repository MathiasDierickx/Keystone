---
keystone:
  title: "Reviewing an artifact"
  kind: guide
  status: done
---

# Reviewing an artifact

A short how-to for reviewing AI-generated documents in Keystone.

## Open the queue

1. Pick a project from the switcher (top-left), or create one pointed at a
   folder your agents write to.
2. Use the **Review queue** to triage by status, or **browse by type**
   (specs, decisions, guides, …) in the sidebar.
3. Click an artifact to open it. The header shows its full path and, if it
   came from a git worktree, its branch.

## Leave feedback

- **Document-level:** write in the composer at the bottom, pick a verdict
  (approve / request changes / reject), and **Send feedback**.
- **Anchored:** select any text in the rendered document and click
  **Comment**. Your note is pinned next to that spot and highlights the exact
  text it refers to.

Everything you write is saved next to the artifact as a `.feedback.md` file,
which the agent reads to act on your feedback. See
[feedback-format](../specs/feedback-format.md) for the details.
