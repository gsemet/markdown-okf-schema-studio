import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";

/** A block as the preview maps it: 1-based, inclusive source lines. */
export interface BlockLines {
  line: number;
  endLine: number;
}

export interface BlockMovePlan {
  /** Offsets of the text to replace: from the first block's start to the second block's end. */
  start: number;
  end: number;
  /** The replacement: the second block, the separator, then the first block. */
  text: string;
  /** New first line of the block that was `first`, and of the block that was `second`. */
  newStartLine: number;
  newSecondStartLine: number;
}

export interface BlockMoveRefusal {
  refused: string;
}

export interface SourceLine {
  text: string;
  eol: string;
}

export function splitLines(text: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let offset = 0;
  for (const match of text.matchAll(/\r\n|\n|\r/gu)) {
    const index = match.index as number;
    lines.push({ text: text.slice(offset, index), eol: match[0] });
    offset = index + match[0].length;
  }
  if (offset < text.length) {
    lines.push({ text: text.slice(offset), eol: "" });
  }
  return lines;
}

const isBlank = (line: SourceLine): boolean => line.text.trim() === "";

const OUT_OF_DATE = "The preview is out of date. Refresh it and try again.";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-117
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-124
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-156
/**
 * Plans the swap of two top-level blocks, `first` above `second`. Only the lines from the start of
 * `first` to the end of `second` are rewritten: the blocks swap, the blank separator and the final
 * line break stay where they are, and each block keeps its own line breaks. A blank line is added
 * where the swap would glue a block to its new neighbour (they were glued before, or the separator
 * was empty). Refused: ranges that overlap, are unordered or out of bounds, blocks inside the
 * frontmatter, blocks that start or end on a blank line, and non-blank text between the blocks
 * (a comment, a link definition): moving it would be a guess.
 */
export function planBlockMove(
  text: string,
  first: BlockLines,
  second: BlockLines,
): BlockMovePlan | BlockMoveRefusal {
  const integers = [first.line, first.endLine, second.line, second.endLine];
  if (!integers.every((value) => Number.isSafeInteger(value) && value >= 1)
    || first.endLine < first.line || second.endLine < second.line
    || second.line <= first.endLine) {
    return { refused: OUT_OF_DATE };
  }
  const lines = splitLines(text);
  if (second.endLine > lines.length) {
    return { refused: OUT_OF_DATE };
  }
  const frontmatter = matchFrontmatterBlock(text);
  if (frontmatter && first.line <= splitLines(text.slice(0, frontmatter.length)).length) {
    return { refused: "A block cannot be moved into or out of the frontmatter." };
  }
  const blockA = lines.slice(first.line - 1, first.endLine);
  const separator = lines.slice(first.endLine, second.line - 1);
  const blockB = lines.slice(second.line - 1, second.endLine);
  if ([blockA[0], blockA[blockA.length - 1], blockB[0], blockB[blockB.length - 1]].some(isBlank)) {
    return { refused: OUT_OF_DATE };
  }
  if (!separator.every(isBlank)) {
    return {
      refused: "Text between the two blocks (a comment or a link definition) prevents the move.",
    };
  }
  const eolA = blockA[blockA.length - 1].eol;
  const eolB = blockB[blockB.length - 1].eol;
  const before = lines[first.line - 2];
  const after = lines[second.endLine];
  const moved: SourceLine[] = [];
  if (before && !isBlank(before)) {
    moved.push({ text: "", eol: before.eol || eolA });
  }
  const leading = moved.length;
  moved.push(...blockB.map((line, index) =>
    index === blockB.length - 1 ? { ...line, eol: eolA } : line));
  const newSeparator = separator.length > 0 ? separator : [{ text: "", eol: eolA }];
  moved.push(...newSeparator);
  moved.push(...blockA.map((line, index) =>
    index === blockA.length - 1 ? { ...line, eol: eolB } : line));
  if (after && !isBlank(after)) {
    moved.push({ text: "", eol: eolB });
  }
  const offsetOfLine = (count: number): number =>
    lines.slice(0, count).reduce((sum, line) => sum + line.text.length + line.eol.length, 0);
  return {
    start: offsetOfLine(first.line - 1),
    end: offsetOfLine(second.endLine),
    text: moved.map((line) => line.text + line.eol).join(""),
    newStartLine: first.line + leading + blockB.length + newSeparator.length,
    newSecondStartLine: first.line + leading,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-127
/** True when a line opens an `{include}` directive (a block that is not part of this file). */
export function opensIncludeDirective(lineText: string): boolean {
  return /^\s*(?::{3,}|`{3,}|~{3,})\s*\{include\}/u.test(lineText);
}
