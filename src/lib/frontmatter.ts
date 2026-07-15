import type { ArtifactKind, ArtifactStatus } from "@/types";

const KINDS: ArtifactKind[] = ["plan", "design", "report", "note"];
const STATUSES: ArtifactStatus[] = ["awaiting-review", "in-review", "done"];

export interface ArtifactMeta {
  title?: string;
  kind?: ArtifactKind;
  status?: ArtifactStatus;
}

interface ParsedArtifact {
  meta: ArtifactMeta;
  /** Content with the front-matter block stripped. */
  body: string;
}

function unquote(v: string): string {
  const t = v.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * Extracts Keystone front-matter (`keystone: { title, kind, status }`) and
 * strips the YAML block from the content. Deliberately lightweight — we only
 * read three known keys, so a full YAML parser is overkill.
 */
export function parseArtifact(raw: string): ParsedArtifact {
  const meta: ArtifactMeta = {};
  let body = raw;

  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (fm) {
    body = raw.slice(fm[0].length);
    const block = fm[1];
    for (const line of block.split(/\r?\n/)) {
      const m = /^\s*(title|kind|status)\s*:\s*(.+)$/.exec(line);
      if (!m) continue;
      const key = m[1];
      const val = unquote(m[2]);
      if (key === "title") meta.title = val;
      else if (key === "kind" && (KINDS as string[]).includes(val))
        meta.kind = val as ArtifactKind;
      else if (key === "status" && (STATUSES as string[]).includes(val))
        meta.status = val as ArtifactStatus;
    }
  }

  return { meta, body };
}

/** First Markdown H1 in `body`, if any. */
export function firstHeading(body: string): string | undefined {
  const m = /^#\s+(.+?)\s*$/m.exec(body);
  return m?.[1];
}
