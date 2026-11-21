import { sourceLines } from "../edits/textEdit";
import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { splitLines } from "./blockMove";

export interface InsertionPlan {
  /** UTF-16 offset in the document text where the inserted text starts. */
  offset: number;
  prefix: string;
  suffix: string;
  lineEnding: string;
  /** A blank run's region the inserted text replaces (`offset` is its start); absent otherwise. */
  replace?: { start: number; end: number };
}

const lineEndingOf = (text: string): string =>
  text.includes("\r\n") ? "\r\n" : text.includes("\n") ? "\n" : text.includes("\r") ? "\r" : "\n";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * The plan of a block written in place of the blank run at lines `line`..`endLine` (already checked
 * by `checkBlankRun`). The region runs from the end of line `line - 1` (the start of the text for
 * line 1) to the start of line `endLine + 1`, or to the end of the text for a run at the end. One
 * separator goes before the block (none at the start of the file) and one after it (none at the
 * end, where the document's final line break is kept, or kept absent).
 */
export function planBlankRunInsertion(text: string, line: number, endLine: number): InsertionPlan {
  const lines = splitLines(text);
  const lineEnding = lineEndingOf(text);
  const offsetOfLine = (count: number): number =>
    lines.slice(0, count).reduce((sum, entry) => sum + entry.text.length + entry.eol.length, 0);
  const start = line === 1 ? 0 : offsetOfLine(line - 1) - lines[line - 2].eol.length;
  const hasBelow = endLine < lines.length;
  const end = hasBelow ? offsetOfLine(endLine) : text.length;
  return {
    offset: start,
    prefix: line === 1 ? "" : lineEnding + lineEnding,
    suffix: hasBelow ? lineEnding + lineEnding : lines[lines.length - 1].eol,
    lineEnding,
    replace: { start, end },
  };
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-094
/** Where and how to insert a new block after `afterLine` (0 = start of the body). */
export function planInsertion(text: string, afterLine: number): InsertionPlan | undefined {
  if (!Number.isSafeInteger(afterLine) || afterLine < 0) {
    return undefined;
  }
  const lineEnding = lineEndingOf(text);
  const lines = sourceLines(text);
  let anchorLine = afterLine;
  if (afterLine === 0) {
    const frontmatter = matchFrontmatterBlock(text);
    if (!frontmatter) {
      const firstLineBlank = text.length > 0 && lines.text(0).trim() === "";
      return {
        offset: 0,
        prefix: "",
        suffix: text.length === 0 || firstLineBlank ? lineEnding : lineEnding + lineEnding,
        lineEnding,
      };
    }
    const closed = text.slice(0, frontmatter.length).replace(/(?:\r\n|\n|\r)$/u, "");
    anchorLine = sourceLines(closed).count;
  }
  // The line after a final line break does not exist; an empty text has its one empty line.
  if (anchorLine > lines.count || (lines.start(anchorLine - 1) >= text.length && text.length > 0)) {
    return undefined;
  }
  const offset = lines.end(anchorLine - 1);
  const following = anchorLine < lines.count ? lines.text(anchorLine) : "";
  // An anchor line that is blank (a list ending on its blank separator) is already the separator.
  const anchorBlank = lines.text(anchorLine - 1).trim() === "";
  return {
    offset,
    prefix: anchorBlank ? lineEnding : lineEnding + lineEnding,
    suffix: following.trim() !== "" ? lineEnding : "",
    lineEnding,
  };
}

/** Text to insert at `plan.offset` for the raw block text; empty when nothing should be inserted. */
export function insertionText(plan: InsertionPlan, raw: string): string {
  if (raw.trim() === "") {
    return "";
  }
  // Whole blank lines at the start go; the indentation of the first non-blank line stays.
  return plan.prefix
    + raw.replace(/^(?:[ \t]*(?:\r\n|\n|\r))+/u, "")
      .replace(/\r\n|\n|\r/gu, plan.lineEnding).replace(/(?:\r\n|\n|\r)+$/u, "")
    + plan.suffix;
}
