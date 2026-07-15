import { normalizeQuote } from "@/lib/feedbackFormat";

/**
 * Text anchoring over rendered Markdown. Everything is DOM-based and computed
 * over the same normalized text, so a selection's occurrence index matches
 * where the comment is later re-located. See SPEC.md §Anchors.
 */

export interface TextIndex {
  /** Whitespace-normalized concatenation of all text in the root. */
  text: string;
  /** Per normalized-char: the source Text node. */
  nodeAt: Text[];
  /** Per normalized-char: the offset within that Text node. */
  offsetAt: number[];
}

export interface SelectionAnchor {
  quote: string;
  occ: number;
  section?: string;
  /** Viewport rect of the selection, for placing the toolbar. */
  rect: DOMRect;
}

const isWs = (ch: string) => ch === " " || ch === "\n" || ch === "\t" || ch === "\r";

/** Build a normalized text index over a root element's text nodes. */
export function buildTextIndex(root: HTMLElement): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = "";
  const nodeAt: Text[] = [];
  const offsetAt: number[] = [];
  let prevWasSpace = true; // trims leading whitespace + collapses runs

  let n: Node | null;
  while ((n = walker.nextNode())) {
    const node = n as Text;
    const s = node.data;
    for (let i = 0; i < s.length; i++) {
      if (isWs(s[i])) {
        if (prevWasSpace) continue;
        text += " ";
        nodeAt.push(node);
        offsetAt.push(i);
        prevWasSpace = true;
      } else {
        text += s[i];
        nodeAt.push(node);
        offsetAt.push(i);
        prevWasSpace = false;
      }
    }
  }
  // Trim a trailing collapsed space.
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    nodeAt.pop();
    offsetAt.pop();
  }
  return { text, nodeAt, offsetAt };
}

function matchStarts(haystack: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  let from = 0;
  let idx: number;
  while ((idx = haystack.indexOf(needle, from)) !== -1) {
    out.push(idx);
    from = idx + 1;
  }
  return out;
}

function rangeAt(index: TextIndex, start: number, len: number): Range | null {
  const end = start + len - 1;
  if (start < 0 || end >= index.nodeAt.length) return null;
  const range = document.createRange();
  range.setStart(index.nodeAt[start], index.offsetAt[start]);
  range.setEnd(index.nodeAt[end], index.offsetAt[end] + 1);
  return range;
}

/**
 * Locate a comment's anchor range: the `occ`-th occurrence of `quote`.
 * Falls back to the first occurrence if `occ` is out of range, and returns
 * null (orphaned) only when the text is absent entirely.
 */
export function findRange(
  index: TextIndex,
  quote: string,
  occ: number,
): Range | null {
  const q = normalizeQuote(quote);
  const starts = matchStarts(index.text, q);
  if (starts.length === 0) return null;
  const start = starts[occ - 1] ?? starts[0];
  return rangeAt(index, start, q.length);
}

/** Normalized-text offset of a (node, offset) DOM position, or -1. */
function normOffsetOf(index: TextIndex, node: Node, offset: number): number {
  for (let i = 0; i < index.nodeAt.length; i++) {
    if (index.nodeAt[i] === node && index.offsetAt[i] >= offset) return i;
  }
  return -1;
}

function nearestSection(root: HTMLElement, startNode: Node): string | undefined {
  const headings = Array.from(
    root.querySelectorAll("h1,h2,h3,h4,h5,h6"),
  ) as HTMLElement[];
  let best: HTMLElement | undefined;
  for (const h of headings) {
    const pos = h.compareDocumentPosition(startNode);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) best = h;
    else break;
  }
  return best?.textContent?.trim() || undefined;
}

/** Read the current selection as an anchor, if it lies inside `root`. */
export function selectionAnchor(
  root: HTMLElement,
  index: TextIndex,
): SelectionAnchor | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer))
    return null;

  const quote = normalizeQuote(sel.toString());
  if (quote.length < 2) return null;

  const starts = matchStarts(index.text, quote);
  if (starts.length === 0) return null;

  const normStart = normOffsetOf(index, range.startContainer, range.startOffset);
  // Pick the occurrence whose start best matches the selection start.
  let occIdx = 0;
  if (normStart >= 0) {
    let bestDist = Infinity;
    starts.forEach((s, i) => {
      const d = Math.abs(s - normStart);
      if (d < bestDist) {
        bestDist = d;
        occIdx = i;
      }
    });
  }

  return {
    quote,
    occ: occIdx + 1,
    section: nearestSection(root, range.startContainer),
    rect: range.getBoundingClientRect(),
  };
}
