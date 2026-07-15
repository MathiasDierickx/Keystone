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

## General

Overall direction is good, but the token-refresh flow needs rework.

## Comments

- **§ Token refresh** — sliding expiry will let stale sessions live forever;
  use absolute + sliding cap.
- **§ Data model** — `sessions.user_id` should be indexed.
```

- **`target`** — which artifact this is about.
- **`status`** — the loop control. Keystone writes `pending`. The agent flips it
  to `consumed` after acting, so the same feedback is never processed twice.
- **`verdict`** — quick machine-readable outcome.
- **Body** — free-form Markdown. `## Comments` with `§ <section>` prefixes is the
  convention for section-scoped notes; agents should treat these as best-effort
  anchors (Markdown has no stable line identity across rewrites).

## 3. Agent loop (skill side)

A review skill (run on an interval, e.g. via `/loop`) does:

1. Scan watched folder(s) for `*.feedback.md` with `status: pending`.
2. For each: read the feedback + its `target` artifact, apply the requested
   changes (rewriting the artifact, or replying), then set the feedback's
   `status: consumed`.
3. Optionally update the artifact's own `keystone.status`.

Idempotency comes from the `pending → consumed` transition: never act on a
feedback file that is already `consumed`.

## 4. Folder layout

Keystone watches one or more folders (configurable). A minimal setup is a single
shared folder both the agent and Keystone point at:

```
reviews/
  plan.md
  plan.feedback.md
  auth-design.md
```

Nothing else is required — no lock files, no database, no hidden state beyond the
`status` fields above.
