/**
 * The thread data the page receives from the host, and the check that keeps only well-formed
 * threads. Thread content comes from a file next to the document and is untrusted.
 */
export interface PageCommentEntry {
  id: string;
  author: string;
  createdAt: string;
  body: string;
}

export interface PageCommentThread {
  id: string;
  anchor: { line: number; endLine: number; quote: string; prefix: string; suffix: string };
  resolved: boolean;
  createdAt: string;
  comments: PageCommentEntry[];
  /**
   * T45: the host's verdict after re-anchoring. `true`: list in the Orphaned box without looking at
   * the page; `false`: the host placed the thread, so its lines are trusted and the page does not
   * search the quote elsewhere; absent: the page decides alone (T44 rules).
   */
  orphaned?: boolean;
}

export const MAX_TEXT = 10000;
const MAX_THREADS = 1000;
const MAX_COMMENTS = 200;

const text = (value: unknown): string => (typeof value === "string" ? value.slice(0, MAX_TEXT) : "");

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-001
// Keeps only well-formed threads, as fresh objects (the host validated them already).
export const sanitize = (value: unknown): PageCommentThread[] => {
  if (!Array.isArray(value)) return [];
  const result: PageCommentThread[] = [];
  for (const raw of value.slice(0, MAX_THREADS)) {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || raw.id === "") continue;
    const anchor = raw.anchor;
    if (!anchor || !Number.isSafeInteger(anchor.line) || anchor.line < 1) continue;
    if (!Array.isArray(raw.comments)) continue;
    const comments: PageCommentEntry[] = [];
    for (const comment of raw.comments.slice(0, MAX_COMMENTS)) {
      if (!comment || typeof comment !== "object") continue;
      comments.push({
        id: text(comment.id),
        author: text(comment.author),
        createdAt: text(comment.createdAt),
        body: text(comment.body),
      });
    }
    result.push({
      id: text(raw.id),
      anchor: {
        line: anchor.line,
        endLine: Number.isSafeInteger(anchor.endLine) && anchor.endLine >= anchor.line ? anchor.endLine : anchor.line,
        quote: text(anchor.quote),
        prefix: text(anchor.prefix),
        suffix: text(anchor.suffix),
      },
      resolved: raw.resolved === true,
      createdAt: text(raw.createdAt),
      comments,
      ...(typeof raw.orphaned === "boolean" ? { orphaned: raw.orphaned } : {}),
    });
  }
  return result;
};

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-216
// Where a quote sits in a text node. The quote has its whitespace collapsed, the node keeps the line
// breaks of a wrapped source paragraph: a whitespace run of the quote matches any run of the node.
export const locate = (value: string, variant: string, from: number): { index: number; length: number } | undefined => {
  const words = variant.split(/\s+/u).filter((word) => word !== "");
  const source = words.map((word) => word.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")).join("\\s+");
  const pattern = new RegExp(source, "gu");
  pattern.lastIndex = from;
  const match = words.length > 0 ? pattern.exec(value) : null;
  return match ? { index: match.index, length: match[0].length } : undefined;
};
