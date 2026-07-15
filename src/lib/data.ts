import { invoke } from "@tauri-apps/api/core";
import type { Artifact, ArtifactKind, ArtifactStatus, Feedback } from "@/types";
import { firstHeading, parseArtifact } from "@/lib/frontmatter";
import { FOLDER_KIND } from "@/lib/format";
import { parseFeedback, serializeFeedback } from "@/lib/feedbackFormat";
import { devMock, tauriMissing } from "@/lib/devMock";

/** Shape returned by the Rust `list_artifacts` command. */
interface RawArtifact {
  path: string;
  filename: string;
  content: string;
  modifiedMs: number;
  hasFeedback: boolean;
  worktree: string | null;
  branch: string | null;
  isMain: boolean;
  repoRelPath: string | null;
}

/** Infer a kind from the doc's enclosing folder (front-matter still wins). */
function inferKind(relOrPath: string): ArtifactKind | undefined {
  const parts = relOrPath.split(/[/\\]/).filter(Boolean);
  // Look at the nearest folders (skip the filename), nearest first.
  for (let i = parts.length - 2; i >= 0; i--) {
    const hit = FOLDER_KIND[parts[i].toLowerCase()];
    if (hit) return hit;
  }
  return undefined;
}

function toArtifact(raw: RawArtifact): Artifact {
  const { meta, body } = parseArtifact(raw.content);
  const title =
    meta.title ??
    firstHeading(body) ??
    raw.filename.replace(/\.md$/, "");
  const kind: ArtifactKind =
    meta.kind ?? inferKind(raw.repoRelPath ?? raw.path) ?? "note";
  const status: ArtifactStatus =
    meta.status ?? (raw.hasFeedback ? "in-review" : "awaiting-review");

  return {
    path: raw.path,
    filename: raw.filename,
    title,
    kind,
    status,
    content: body,
    modifiedAt: new Date(raw.modifiedMs).toISOString(),
    hasFeedback: raw.hasFeedback,
    worktree: raw.worktree ?? undefined,
    branch: raw.branch ?? undefined,
    isMain: raw.isMain,
    repoRelPath: raw.repoRelPath ?? undefined,
  };
}

/** List reviewable artifacts in a watched folder. */
export async function listArtifacts(folder: string): Promise<Artifact[]> {
  if (tauriMissing()) return devMock.listArtifacts();
  const raw = await invoke<RawArtifact[]>("list_artifacts", { folder });
  return raw.map(toArtifact);
}

/** Read existing feedback for an artifact, if any. */
export async function readFeedback(
  artifactPath: string,
): Promise<Feedback | null> {
  if (tauriMissing()) return devMock.readFeedback(artifactPath);
  const md = await invoke<string | null>("read_feedback", { artifactPath });
  return md ? parseFeedback(md) : null;
}

/** Write feedback for an artifact; returns the path written. */
export async function writeFeedback(
  artifactPath: string,
  feedback: Feedback,
): Promise<string> {
  if (tauriMissing()) return devMock.writeFeedback(artifactPath, feedback);
  const content = serializeFeedback(feedback);
  return invoke<string>("write_feedback", { artifactPath, content });
}
