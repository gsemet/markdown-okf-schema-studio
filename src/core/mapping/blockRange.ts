import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { insertionText, planInsertion } from "./insertion";
import { splitLines } from "./blockMove";

/** A selected run of top-level blocks: 1-based, inclusive source lines. */
export interface BlockSpan {
  line: number;
  endLine: number;
}

export interface BlockRangeRefusal {
  refused: string;
}

export interface CutPlan {
  /** Offsets of the text to delete. */
  start: number;
  end: number;
  /** First line (before the cut) that moves up into the span's place; undefined for a last block. */
  followingLine: number | undefined;
}

export interface PastePlan {
  /** Offset where `text` is inserted. */
  offset: number;
  text: string;
}

const OUT_OF_DATE = "The preview is out of date. Refresh it and try again.";
const IN_FRONTMATTER = "Blocks of the frontmatter cannot be cut, copied or pasted into.";

const isBlank = (text: string): boolean => text.trim() === "";

function frontmatterLineCount(text: string): number {
  const frontmatter = matchFrontmatterBlock(text);
  return frontmatter ? splitLines(text.slice(0, frontmatter.length)).length : 0;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-124
/** Validates a span against the text: lines in bounds, first and last line not blank. */
function checkSpan(text: string, span: BlockSpan): BlockRangeRefusal | undefined {
  const { line, endLine } = span;
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(endLine) || line < 1 || endLine < line) {
    return { refused: OUT_OF_DATE };
  }
  const lines = splitLines(text);
  if (endLine > lines.length || isBlank(lines[line - 1].text) || isBlank(lines[endLine - 1].text)) {
    return { refused: OUT_OF_DATE };
  }
  if (line <= frontmatterLineCount(text)) {
    return { refused: IN_FRONTMATTER };
  }
  return undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-166
/**
 * The exact source text of the lines `line`..`endLine`, without the final line break, with the
 * document's own line breaks. Refused for a span that is out of bounds or in the frontmatter.
 */
export function spanText(text: string, line: number, endLine: number): string | BlockRangeRefusal {
  const refusal = checkSpan(text, { line, endLine });
  if (refusal) {
    return refusal;
  }
  const lines = splitLines(text).slice(line - 1, endLine);
  return lines.map((entry, index) => entry.text + (index === lines.length - 1 ? "" : entry.eol)).join("");
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-169
/**
 * Plans the deletion of a span of blocks together with one blank separator, so no gap of two blank
 * lines is left and no two blocks are glued. In the middle the span goes with the blank lines that
 * follow it; when the block above touched the span and a blank line followed it, that blank line
 * stays (the neighbours were apart on one side and still are). The last block goes with the blank
 * lines before it, keeping the line break of the block above; the only block empties the body.
 */
export function planCut(text: string, line: number, endLine: number): CutPlan | BlockRangeRefusal {
  const refusal = checkSpan(text, { line, endLine });
  if (refusal) {
    return refusal;
  }
  const lines = splitLines(text);
  const offsetOfLine = (count: number): number =>
    lines.slice(0, count).reduce((sum, entry) => sum + entry.text.length + entry.eol.length, 0);
  const first = line - 1;
  const last = endLine - 1;
  let next = last + 1;
  while (next < lines.length && isBlank(lines[next].text)) {
    next += 1;
  }
  if (next < lines.length) {
    const touchesAbove = first > 0 && !isBlank(lines[first - 1].text);
    return {
      start: offsetOfLine(first),
      end: offsetOfLine(touchesAbove ? last + 1 : next),
      followingLine: next + 1,
    };
  }
  let previous = first - 1;
  while (previous >= 0 && isBlank(lines[previous].text)) {
    previous -= 1;
  }
  if (previous < 0) {
    return { start: 0, end: text.length, followingLine: undefined };
  }
  // A document without a final line break stays without one.
  const keepsFinalBreak = lines[lines.length - 1].eol !== "";
  return {
    start: offsetOfLine(previous + 1) - (keepsFinalBreak ? 0 : lines[previous].eol.length),
    end: text.length,
    followingLine: undefined,
  };
}

/** Clipboard text as a block: blank lines at both ends dropped, empty when nothing is left. */
export function pastedBlockText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/u);
  while (lines.length > 0 && isBlank(lines[0])) {
    lines.shift();
  }
  while (lines.length > 0 && isBlank(lines[lines.length - 1])) {
    lines.pop();
  }
  return lines.join("\n");
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-174
/** Plans the insertion of clipboard text as new blocks after `afterLine` (0 = start of the body). */
export function planPaste(text: string, afterLine: number, raw: string): PastePlan | BlockRangeRefusal {
  const block = pastedBlockText(raw);
  if (block === "") {
    return { refused: "The clipboard has no text to paste." };
  }
  if (!Number.isSafeInteger(afterLine) || afterLine < 0) {
    return { refused: OUT_OF_DATE };
  }
  if (afterLine > 0) {
    const lines = splitLines(text);
    if (afterLine > lines.length || isBlank(lines[afterLine - 1].text)) {
      return { refused: OUT_OF_DATE };
    }
    if (afterLine <= frontmatterLineCount(text)) {
      return { refused: IN_FRONTMATTER };
    }
  }
  const plan = planInsertion(text, afterLine);
  if (!plan) {
    return { refused: OUT_OF_DATE };
  }
  return { offset: plan.offset, text: insertionText(plan, block) };
}
