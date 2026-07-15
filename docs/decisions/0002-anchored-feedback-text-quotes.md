---
keystone:
  title: "ADR 0002 — Anchored feedback via text quotes"
  kind: decision
  status: done
---

# ADR 0002 — Anchored feedback via text quotes

- **Status:** Accepted
- **Date:** 2026-07-15

## Context

Reviewers need to attach a comment to a specific place in an artifact, and that
anchor must survive the agent rewriting the file. It must be expressible purely
in Markdown and legible to an AI agent as "this feedback is about *here*".

## Decision

Anchor each comment to an **exact text quote** (TextQuote-style): the selected
text, an occurrence index for disambiguation, and the nearest heading. Machine
fields live in an HTML comment; the human/AI-readable quote lives in a
blockquote. Keystone relocates a comment by searching the rendered text, and
flags it as *orphaned* if the quote no longer exists. Line numbers were rejected
because they rot on the first rewrite.

See [feedback-format](../specs/feedback-format.md) for the on-disk format.

## Consequences

- **+** Robust to rewrites; pure Markdown; an agent reads the quote directly.
- **+** No modification of the artifact itself — feedback stays in a sibling file.
- **−** A quote that appears many times relies on the occurrence index; heavy
  edits can orphan a comment (surfaced explicitly, not dropped).
