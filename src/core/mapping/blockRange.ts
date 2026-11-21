import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { insertionText, planBlankRunInsertion, planInsertion } from "./insertion";
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
  /** End offset of the text `text` replaces (a blank run); absent for a plain insertion. */
  end?: number;
}

/** What a blank run's removal deletes: offsets, and the first line (before it) that moves up. */
export interface BlankRunRemovalPlan {
  start: number;
  end: number;
  followingLine: number | undefined;
}

const OUT_OF_DATE = "The preview is out of date. Refresh it and try again.";
const IN_FRONTMATTER = "Blocks of the frontmatter cannot be cut, copied or pasted into.";

const isBlank = (text: string): boolean => text.trim() === "";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * True for a CommonMark blank line: only spaces and tabs. `trim()` also strips U+00A0, which
 * renders as a paragraph, so it cannot decide this.
 */
export function isCommonMarkBlank(text: string): boolean {
  return /^[ \t]*$/u.test(text);
}

export function frontmatterLineCount(text: string): number {
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

const DISAGREE_ON_LINES =
  "The preview and the document disagree about this block's lines. Refresh the preview and try again.";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-256
/**
 * Validates the lines the page sends to edit one block: integers in the document, and a first line
 * that is not blank. The last line may be blank because the renderer ends a list, or a list item
 * followed by a blank line, on that blank separator; the text of the range is still the block's.
 * The frontmatter is not refused here: only the shape of the range is checked.
 */
export function checkBlockLines(text: string, line: number, endLine: number): BlockRangeRefusal | undefined {
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(endLine) || line < 1 || endLine < line) {
    return { refused: DISAGREE_ON_LINES };
  }
  const lines = splitLines(text);
  if (endLine > lines.length || isBlank(lines[line - 1].text)) {
    return { refused: DISAGREE_ON_LINES };
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
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-124
/**
 * Plans the insertion of clipboard text as new blocks after `afterLine` (0 = start of the body).
 * An anchor that is a CommonMark blank line under a body line (the blank separator a list is
 * mapped to) is moved up to the first blank line under that line, so the new block reuses the
 * blank lines already there. Refused: a blank line with no body line above it or with only the
 * frontmatter above, and a line holding only a no-break space.
 */
export function planPaste(text: string, afterLine: number, raw: string): PastePlan | BlockRangeRefusal {
  const block = pastedBlockText(raw);
  if (block === "") {
    return { refused: "The clipboard has no text to paste." };
  }
  if (!Number.isSafeInteger(afterLine) || afterLine < 0) {
    return { refused: OUT_OF_DATE };
  }
  let anchor = afterLine;
  if (afterLine > 0) {
    const lines = splitLines(text);
    if (afterLine > lines.length) {
      return { refused: OUT_OF_DATE };
    }
    if (isBlank(lines[afterLine - 1].text)) {
      if (!isCommonMarkBlank(lines[afterLine - 1].text)) {
        return { refused: OUT_OF_DATE };
      }
      let above = afterLine - 1;
      while (above >= 1 && isCommonMarkBlank(lines[above - 1].text)) {
        above -= 1;
      }
      if (above < 1 || above <= frontmatterLineCount(text)) {
        return { refused: OUT_OF_DATE };
      }
      anchor = above + 1;
    } else if (afterLine <= frontmatterLineCount(text)) {
      return { refused: IN_FRONTMATTER };
    }
  }
  const plan = planInsertion(text, anchor);
  if (!plan) {
    return { refused: OUT_OF_DATE };
  }
  return { offset: plan.offset, text: insertionText(plan, block) };
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-269
/**
 * Validates a blank run against the text: two or more CommonMark blank lines after the
 * frontmatter, with a line that is not blank (or the frontmatter, or the start) above and below.
 */
export function checkBlankRun(text: string, line: number, endLine: number): BlockRangeRefusal | undefined {
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(endLine) || line < 1 || endLine <= line) {
    return { refused: OUT_OF_DATE };
  }
  const lines = splitLines(text);
  const frontmatterLines = frontmatterLineCount(text);
  if (endLine > lines.length || line <= frontmatterLines) {
    return { refused: OUT_OF_DATE };
  }
  for (let current = line; current <= endLine; current += 1) {
    if (!isCommonMarkBlank(lines[current - 1].text)) {
      return { refused: OUT_OF_DATE };
    }
  }
  const aboveBlank = line > 1 && line - 1 > frontmatterLines && isCommonMarkBlank(lines[line - 2].text);
  const belowBlank = endLine < lines.length && isCommonMarkBlank(lines[endLine].text);
  return aboveBlank || belowBlank ? { refused: OUT_OF_DATE } : undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-269
/**
 * Plans the removal of a blank run, keeping one separator: between two blocks (the frontmatter is
 * one) lines `line + 1`..`endLine` go; at the start of a file without frontmatter, and at the end of
 * the body, every line of the run goes (the text then ends where the line above ends, with its line
 * break when the document had a final one). A text of only blank lines becomes empty.
 */
export function planBlankRunRemoval(
  text: string,
  line: number,
  endLine: number,
): BlankRunRemovalPlan | BlockRangeRefusal {
  const refusal = checkBlankRun(text, line, endLine);
  if (refusal) {
    return refusal;
  }
  const lines = splitLines(text);
  const offsetOfLine = (count: number): number =>
    lines.slice(0, count).reduce((sum, entry) => sum + entry.text.length + entry.eol.length, 0);
  const followingLine = endLine < lines.length ? endLine + 1 : undefined;
  if (followingLine !== undefined) {
    return { start: offsetOfLine(line === 1 ? 0 : line), end: offsetOfLine(endLine), followingLine };
  }
  if (line === 1) {
    return { start: 0, end: text.length, followingLine };
  }
  const keepsFinalBreak = lines[lines.length - 1].eol !== "";
  return {
    start: offsetOfLine(line - 1) - (keepsFinalBreak ? 0 : lines[line - 2].eol.length),
    end: text.length,
    followingLine,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/** Plans a paste in place of a blank run: one separator on each side of the pasted block. */
export function planBlankRunPaste(
  text: string,
  line: number,
  endLine: number,
  raw: string,
): PastePlan | BlockRangeRefusal {
  const block = pastedBlockText(raw);
  if (block === "") {
    return { refused: "The clipboard has no text to paste." };
  }
  const refusal = checkBlankRun(text, line, endLine);
  if (refusal) {
    return refusal;
  }
  const plan = planBlankRunInsertion(text, line, endLine);
  return { offset: plan.offset, text: insertionText(plan, block), end: plan.replace?.end };
}
