# Keystone

A desktop review inbox for AI-generated Markdown.

AI agents (Claude Code, Codex, scripts, …) drop Markdown artifacts — plans,
designs, reports — into a watched folder. Keystone surfaces them as a review
queue: open, read a nicely rendered version, annotate, and your feedback flows
back to disk as a `.feedback.md` file next to the original. Agents watch for
that feedback and act on it, closing the human-in-the-loop.

> The keystone is the piece that locks the arch — the review that makes the
> rest hold.

## How it works

```
agent writes  plan.md            ─┐
                                  ├─►  Keystone shows it in the review queue
you review + annotate            ─┘
                                       │  writes
                                       ▼
              plan.feedback.md   ─►  agent picks up  status: pending
                                       │  acts on it, sets status: consumed
                                       ▼
              (loop continues)
```

- **Folder-based, tool-agnostic.** Any agent that can write a file participates.
  No API, no per-agent integration.
- **Plain files.** Originals and feedback are Markdown on disk — git-friendly,
  inspectable, no database.
- **Feedback loop.** A companion agent skill (Claude / Codex) polls for
  `status: pending` feedback and applies it.

See [`docs/specs/feedback-format.md`](./docs/specs/feedback-format.md) for the
file and feedback format, and [`docs/`](./docs) for the full documentation set.

## Stack

- **Tauri** — small, native shell (window, tray, notifications, fs-watch)
- **React + Tailwind** — the review UI
- Markdown rendering in-app

## Status

Early scaffolding. Roadmap:

- **v0** — watch a folder, list queue, render Markdown, write `.feedback.md`
  (feedback fed back to the agent manually).
- **v1** — inline / section-level annotations, desktop notifications on new
  artifacts, and an agent trigger (skill loop that consumes pending feedback).

## License

TBD
