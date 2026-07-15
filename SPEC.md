# Keystone — file & feedback format

This is the contract between **agents** (which produce artifacts and consume
feedback) and **Keystone** (which renders artifacts and produces feedback).
Both the Claude and Codex review skills implement the agent side of this spec.

## 1. Artifacts

An **artifact** is any Markdown file in a watched folder that an agent wants
reviewed. No special marker is required — Keystone lists every `*.md` in the
watched folder(s) that is not itself a feedback file.

Optional front-matter lets the agent give Keystone hints:

```markdown
---
keystone:
  title: "Auth service — architecture proposal"   # display name; falls back to filename / first H1
  kind: plan                                        # plan | design | report | note (free-form, for filtering)
  status: awaiting-review                           # awaiting-review | in-review | done
---

# Auth service — architecture proposal
...
```

Front-matter is optional. A bare `.md` file is a valid artifact.

## 2. Feedback

When you review `plan.md` and submit feedback, Keystone writes a sibling file:

```
plan.md            ← artifact
plan.feedback.md   ← feedback (same basename + ".feedback.md")
```

### Format

```markdown
---
keystone-feedback:
  target: plan.md            # basename of the artifact this feedback belongs to
  status: pending            # pending | consumed  — agents only act on `pending`
  verdict: changes-requested # approved | changes-requested | rejected
  reviewed-at: 2026-07-15T14:32:00Z
---

## Summary

Document-level feedback that isn't tied to one spot. Overall direction is good,
but the token-refresh flow needs rework.

## Comments

<!-- keystone:comment id=k3f9a2 status=pending occ=1 -->
> **On** _(§ Token refresh)_ — «every authenticated request extends the session by 30 minutes»

Sliding expiry with no absolute cap lets an active session live forever. Add an
absolute cap (e.g. 12h) alongside the sliding window.
<!-- /keystone:comment -->
```

- **`target`** — which artifact this is about.
- **`status`** (front-matter) — the loop control. Keystone writes `pending`. The
  agent flips it to `consumed` after acting, so feedback is never processed twice.
- **`verdict`** — quick machine-readable outcome.
- **`## Summary`** — free-form, document-level feedback (no anchor).
- **`## Comments`** — zero or more *anchored* comments (see §Anchors below).

### Anchors — feedback tied to a specific place

Feedback can point at any span of the artifact and stay attached to it, purely
in Markdown, in a way an AI agent reads as "this note is about **here**".

Each comment is wrapped in HTML comments (invisible in any Markdown renderer)
that carry the machine fields, plus a blockquote that carries the human- and
AI-readable anchor:

```markdown
<!-- keystone:comment id=<id> status=pending occ=<n> -->
> **On** _(§ <section>)_ — «<exact quoted text>»

<free-form comment body>
<!-- /keystone:comment -->
```

- **`id`** — stable, so `consumed`/resolved state survives edits and re-writes.
- **`status`** — per-comment `pending | consumed`, same loop semantics as the file.
- **`occ`** — which occurrence (1-based) of the quote to bind to, when the same
  text appears more than once.
- **The quote** (`«…»`) — the **exact text the comment is about**, verbatim from
  the artifact, whitespace-normalized to one line. This is the anchor.
- **`§ <section>`** — the nearest heading; context for humans and a relocation hint.

**Why a text quote and not a line number?** The agent rewrites the artifact, so
line numbers rot immediately. A quote is relocatable: Keystone re-finds it by
text search (the `occ`-th match) and pins the comment back in place; an agent
reads the quote and knows precisely what the feedback refers to. If the quoted
text no longer exists after a rewrite, the comment is surfaced as **orphaned**
rather than silently dropped.

## 3. Agent loop (skill side)

A review skill (run on an interval, e.g. via `/loop`) does:

1. Scan watched folder(s) for `*.feedback.md` with front-matter `status: pending`.
2. For each: read the feedback + its `target` artifact. Use the `## Summary` for
   document-level intent and each anchored comment's quote to locate exactly what
   to change. Apply the changes (rewriting the artifact, or replying).
3. Mark work done: set each addressed comment's `status=consumed`, and the file's
   front-matter `status: consumed`. Optionally update the artifact's own
   `keystone.status`.

Idempotency comes from the `pending → consumed` transition: never act on a
comment or feedback file that is already `consumed`.

## 4. Projects & folder layout

Keystone organizes work into **projects** — one per client, each watching a
single folder, fully isolated from the others. The projects list and the last
selected project are stored locally on the reviewer's machine (not in the
watched folders), so nothing Keystone-specific leaks into the artifact folders.

A project's folder is just a directory the agent and Keystone both point at:

```
acme-fc/                     ← one project's watched folder
  plan.md
  plan.feedback.md
  auth-design.md
  auth-design.feedback.md
```

Nothing else is required — no lock files, no database, no hidden state in the
folder beyond the `.md` artifacts and their `.feedback.md` siblings.
