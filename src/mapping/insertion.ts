export interface InsertionPlan {
  /** UTF-16 offset in the document text where the inserted text starts. */
  offset: number;
  prefix: string;
  suffix: string;
  lineEnding: string;
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/u;

/** Where and how to insert a new block after `afterLine` (0 = start of the body). */
export function planInsertion(text: string, afterLine: number): InsertionPlan | undefined {
  if (!Number.isSafeInteger(afterLine) || afterLine < 0) {
    return undefined;
  }
  const lineEnding = text.includes("\r\n") ? "\r\n" : "\n";
  let anchorLine = afterLine;
  if (afterLine === 0) {
    const frontmatter = FRONTMATTER.exec(text);
    if (!frontmatter) {
      const firstBreak = text.search(/\r?\n/u);
      const firstLine = firstBreak === -1 ? text : text.slice(0, firstBreak);
      const firstLineBlank = text.length > 0 && firstLine.trim() === "";
      return {
        offset: 0,
        prefix: "",
        suffix: text.length === 0 || firstLineBlank ? lineEnding : lineEnding + lineEnding,
        lineEnding,
      };
    }
    const closed = frontmatter[0].replace(/\r?\n$/u, "");
    anchorLine = closed.split("\n").length;
  }
  // Locate the end of `anchorLine` (before its line break).
  let offset = 0;
  for (let line = 1; line < anchorLine; line += 1) {
    const next = text.indexOf("\n", offset);
    if (next === -1) {
      return undefined;
    }
    offset = next + 1;
  }
  if (offset >= text.length && !(anchorLine === 1 && text.length === 0)) {
    // The line after a final line break does not exist.
    return undefined;
  }
  const lineBreak = text.indexOf("\n", offset);
  offset = lineBreak === -1 ? text.length : (lineBreak > offset && text[lineBreak - 1] === "\r" ? lineBreak - 1 : lineBreak);
  const breakLength = offset < text.length ? (text[offset] === "\r" ? 2 : 1) : 0;
  const followingStart = offset + breakLength;
  let followingExists = false;
  if (followingStart < text.length) {
    const nextBreak = text.indexOf("\n", followingStart);
    const following = text.slice(followingStart, nextBreak === -1 ? text.length : nextBreak);
    followingExists = following.trim() !== "";
  }
  return {
    offset,
    prefix: lineEnding + lineEnding,
    suffix: followingExists ? lineEnding : "",
    lineEnding,
  };
}

/** Text to insert at `plan.offset` for the raw block text; empty when nothing should be inserted. */
export function insertionText(plan: InsertionPlan, raw: string): string {
  if (raw.trim() === "") {
    return "";
  }
  return plan.prefix
    + raw.replace(/\r?\n/gu, plan.lineEnding).replace(/(\r?\n)+$/u, "")
    + plan.suffix;
}
