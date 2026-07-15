import type { Comment, Feedback, FeedbackStatus, Verdict } from "@/types";

/**
 * (De)serialization for `<artifact>.feedback.md`. This is the single source of
 * truth for the on-disk feedback format — the UI, the SPEC, and the agent
 * review skills must agree with it. See SPEC.md for the human-facing contract.
 *
 * A comment is delimited by HTML comments (invisible in any Markdown viewer)
 * carrying the machine fields, and a blockquote carrying the human/AI-readable
 * anchor:
 *
 *   <!-- keystone:comment id=k3f9 status=pending occ=1 -->
 *   > **On** _(§ Token refresh)_ — «every request extends the session by 30 minutes»
 *
 *   Sliding expiry with no absolute cap lets stale sessions live forever.
 *   <!-- /keystone:comment -->
 */

const OPEN_RE =
  /<!--\s*keystone:comment\s+id=(\S+)\s+status=(\S+)(?:\s+occ=(\d+))?\s*-->([\s\S]*?)<!--\s*\/keystone:comment\s*-->/g;

const ON_RE = /^>\s*\*\*On\*\*(?:\s*_\(§\s*(.+?)\)_)?\s*—\s*«([\s\S]*?)»\s*$/m;

const VERDICTS: Verdict[] = ["approved", "changes-requested", "rejected"];

function fmField(block: string, key: string): string | undefined {
  const m = new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, "m").exec(block);
  return m?.[1]?.trim();
}

/** Normalize a selection into a single-line anchor quote. */
export function normalizeQuote(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function serializeComment(c: Comment): string {
  const section = c.section ? ` _(§ ${c.section})_` : "";
  return [
    `<!-- keystone:comment id=${c.id} status=${c.status} occ=${c.occ} -->`,
    `> **On**${section} — «${normalizeQuote(c.quote)}»`,
    ``,
    c.body.trim(),
    `<!-- /keystone:comment -->`,
  ].join("\n");
}

export function serializeFeedback(fb: Feedback): string {
  const lines: string[] = [
    `---`,
    `keystone-feedback:`,
    `  target: ${fb.target}`,
    `  status: ${fb.status}`,
    `  verdict: ${fb.verdict}`,
    `  reviewed-at: ${fb.reviewedAt}`,
    `---`,
    ``,
    `## Summary`,
    ``,
    fb.summary.trim() || "_No general comments._",
    ``,
  ];

  if (fb.comments.length > 0) {
    lines.push(`## Comments`, ``);
    lines.push(fb.comments.map(serializeComment).join("\n\n"), ``);
  }

  return lines.join("\n");
}

export function parseFeedback(md: string): Feedback {
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
  const fm = fmMatch?.[1] ?? "";
  const body = fmMatch ? md.slice(fmMatch[0].length) : md;

  const verdictRaw = fmField(fm, "verdict") ?? "changes-requested";
  const verdict = (VERDICTS as string[]).includes(verdictRaw)
    ? (verdictRaw as Verdict)
    : "changes-requested";
  const statusRaw = fmField(fm, "status") ?? "pending";
  const status: FeedbackStatus = statusRaw === "consumed" ? "consumed" : "pending";

  // Summary: text between "## Summary" and the next "## " heading.
  const summaryMatch = /##\s+Summary\s*\r?\n([\s\S]*?)(?:\r?\n##\s|$)/.exec(body);
  let summary = summaryMatch?.[1]?.trim() ?? "";
  if (summary === "_No general comments._") summary = "";

  const comments: Comment[] = [];
  for (const m of body.matchAll(OPEN_RE)) {
    const [, id, cStatus, occ, inner] = m;
    const on = ON_RE.exec(inner);
    const quote = on?.[2] ? normalizeQuote(on[2]) : "";
    const section = on?.[1]?.trim() || undefined;
    // Body = inner minus the leading blockquote anchor line(s).
    const bodyText = inner
      .replace(ON_RE, "")
      .replace(/^\s*>.*$/gm, "")
      .trim();
    comments.push({
      id,
      status: cStatus === "consumed" ? "consumed" : "pending",
      quote,
      occ: occ ? Number(occ) : 1,
      section,
      body: bodyText,
    });
  }

  return {
    target: fmField(fm, "target") ?? "",
    status,
    verdict,
    reviewedAt: fmField(fm, "reviewed-at") ?? "",
    summary,
    comments,
  };
}
