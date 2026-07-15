import type { Artifact, Feedback } from "@/types";

/**
 * Data access layer. For v0 this returns in-memory mock artifacts so the shell
 * can be built and styled. It will be swapped for Tauri fs commands
 * (folder-watch + read/write) without touching the UI:
 *
 *   import { invoke } from "@tauri-apps/api/core";
 *   return invoke<Artifact[]>("list_artifacts", { folder });
 */

const MOCK: Artifact[] = [
  {
    path: "/reviews/auth-service-architecture.md",
    filename: "auth-service-architecture.md",
    title: "Auth service — architecture proposal",
    kind: "design",
    status: "awaiting-review",
    modifiedAt: "2026-07-15T09:12:00Z",
    hasFeedback: false,
    content: `# Auth service — architecture proposal

A proposal to split authentication out of the monolith into a dedicated
service, behind a thin gateway.

## Goals

- Single source of truth for identity
- Token issuance decoupled from the app tier
- Zero-downtime migration path

## Token refresh

We use a **sliding expiry**: every authenticated request extends the session
by 30 minutes. Sessions never hard-expire while the user stays active.

> ⚠️ Open question: should we add an absolute cap?

## Data model

| Table | Key columns | Notes |
| --- | --- | --- |
| \`sessions\` | \`id\`, \`user_id\`, \`expires_at\` | one row per active session |
| \`tokens\` | \`jti\`, \`session_id\` | issued access tokens |

## Request flow

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant G as Gateway
    participant A as Auth service
    U->>G: request + access token
    G->>A: validate(token)
    A-->>G: claims / 401
    G-->>U: response
\`\`\`

## Middleware sketch

\`\`\`ts
export async function requireAuth(req: Request): Promise<Claims> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Unauthorized();
  return verify(token);
}
\`\`\`

## Rollout

- [x] Stand up the service in shadow mode
- [ ] Mirror traffic, compare responses
- [ ] Cut over gateway routing
`,
  },
  {
    path: "/reviews/q3-load-report.md",
    filename: "q3-load-report.md",
    title: "Q3 training-load report",
    kind: "report",
    status: "in-review",
    modifiedAt: "2026-07-14T16:40:00Z",
    hasFeedback: true,
    content: `# Q3 training-load report

Summary of roster-wide load trends for the quarter.

- Acute:chronic ratio trending **up** across 3 squads
- Two athletes flagged for spike patterns
- Recommend a deload week for the sprint group

## Detail

Full breakdown per athlete follows below…
`,
  },
  {
    path: "/reviews/migration-plan.md",
    filename: "migration-plan.md",
    title: "Postgres 14 → 16 migration plan",
    kind: "plan",
    status: "awaiting-review",
    modifiedAt: "2026-07-15T11:05:00Z",
    hasFeedback: false,
    content: `# Postgres 14 → 16 migration plan

Step-by-step upgrade with a rollback checkpoint at each stage.

1. Snapshot + logical replication slot
2. Spin up 16 replica, catch up
3. Verify extensions (\`pg_stat_statements\`, \`postgis\`)
4. Cut over during the Sunday window
`,
  },
  {
    path: "/reviews/onboarding-copy.md",
    filename: "onboarding-copy.md",
    title: "Onboarding email copy — v2",
    kind: "note",
    status: "done",
    modifiedAt: "2026-07-12T08:20:00Z",
    hasFeedback: true,
    content: `# Onboarding email copy — v2

Three-email sequence for new coaches.

**Email 1 — Welcome.** Warm, short, one clear CTA.
**Email 2 — First win.** Nudge toward adding their first athlete.
**Email 3 — Habit.** Weekly review ritual.
`,
  },
];

export async function listArtifacts(): Promise<Artifact[]> {
  return MOCK;
}

export async function writeFeedback(feedback: Feedback): Promise<void> {
  // Placeholder — will invoke a Tauri command that writes
  // <basename>.feedback.md next to the artifact per SPEC.md.
  console.log("[keystone] writeFeedback (mock):", feedback);
}
