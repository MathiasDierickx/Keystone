import type { Artifact, Feedback } from "@/types";

/**
 * Dev-only data used when running in a plain browser (no Tauri backend), so the
 * UI can be exercised without the native shell. In the packaged app Tauri is
 * always present, so this never runs. See `isTauri()` in data.ts.
 */

export function tauriMissing(): boolean {
  return (
    typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)
  );
}

const CONTENT = `# Auth service — architecture proposal

A proposal to split authentication out of the monolith into a dedicated
service, behind a thin gateway.

## Token refresh

We use a **sliding expiry**: every authenticated request extends the session
by 30 minutes. Sessions never hard-expire while the user stays active.

## Data model

Each row in \`sessions\` is one row per active session, keyed by user.
`;

const MOCK_ARTIFACTS: Artifact[] = [
  {
    path: "/mock/auth.md",
    filename: "auth.md",
    title: "Auth service — architecture proposal",
    kind: "design",
    status: "in-review",
    content: CONTENT,
    modifiedAt: new Date(Date.now() - 3_600_000).toISOString(),
    hasFeedback: true,
    worktree: "/mock",
    branch: "main",
    isMain: true,
  },
  {
    path: "/mock/migration.md",
    filename: "migration.md",
    title: "Postgres 14 → 16 migration plan",
    kind: "plan",
    status: "awaiting-review",
    content: "# Postgres migration\n\nUpgrade with a rollback checkpoint.\n",
    modifiedAt: new Date(Date.now() - 7_200_000).toISOString(),
    hasFeedback: false,
    worktree: "/mock",
    branch: "main",
    isMain: true,
  },
  {
    path: "/mock-wt/feature/rate-limit.md",
    filename: "rate-limit.md",
    title: "Rate limiting — design",
    kind: "design",
    status: "awaiting-review",
    content: "# Rate limiting\n\nToken-bucket per API key.\n",
    modifiedAt: new Date(Date.now() - 1_800_000).toISOString(),
    hasFeedback: false,
    worktree: "/mock-wt/feature",
    branch: "feature/rate-limit",
    isMain: false,
  },
];

const MOCK_FEEDBACK = new Map<string, Feedback>([
  [
    "/mock/auth.md",
    {
      target: "auth.md",
      status: "pending",
      verdict: "changes-requested",
      reviewedAt: new Date().toISOString(),
      summary: "Good direction; token refresh needs an absolute cap.",
      comments: [
        {
          id: "seed1",
          status: "pending",
          quote: "every authenticated request extends the session by 30 minutes",
          occ: 1,
          section: "Token refresh",
          body: "No absolute cap means a stolen token refreshes forever. Add a 12h cap.",
        },
      ],
    },
  ],
]);

export const devMock = {
  listArtifacts: async (): Promise<Artifact[]> => MOCK_ARTIFACTS,
  readFeedback: async (path: string): Promise<Feedback | null> =>
    MOCK_FEEDBACK.get(path) ?? null,
  writeFeedback: async (path: string, fb: Feedback): Promise<string> => {
    MOCK_FEEDBACK.set(path, fb);
    return `${path.replace(/\.md$/, "")}.feedback.md`;
  },
};
