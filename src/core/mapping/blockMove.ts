import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { blockQuoteEnd } from "../syntax/blockQuoteRange";
import { firstBlockRefusal } from "./boxFirstBlock";

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

const QUOTED = /^[ \t]*>/u;
const QUOTE_MARKERS = /^[ \t]*(?:>[ \t]*)*/u;

/** The number of `>` markers a line starts with. */
const quoteDepth = (text: string): number => QUOTE_MARKERS.exec(text)![0].split(">").length - 1;

/** True when a line holds nothing but `depth` quote markers: the empty line of a quote that deep. */
export const isEmptyQuoteLine = (text: string, depth: number): boolean =>
  quoteDepth(text) === depth && QUOTE_MARKERS.exec(text)![0] === text;

/** True when the block starting on `line` lies in a block quote that opens above it. */
function insideQuote(texts: readonly string[], line: number): boolean {
  if (!QUOTED.test(texts[line - 1]!)) return false;
  for (let above = line - 2; above >= 0 && texts[above]!.trim() !== ""; above -= 1) {
    const text = texts[above]!;
    if (QUOTED.test(text) && blockQuoteEnd(texts, above, text.indexOf(">")) >= line - 1) return true;
  }
  return false;
}

/** The block quote two blocks lie in: its number of markers, and the text of its empty line. */
export interface QuoteContainer {
  depth: number;
  prefix: string;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-117
/**
 * The block quote (a GitHub alert) that holds both the block starting on line `first` and the one
 * starting on line `second`, below it: `undefined` when neither lies in a quote (a block that is
 * a whole quote does not), `"mixed"` when they do not lie in the same one.
 */
export function quoteContainer(text: string, first: number, second: number): QuoteContainer | "mixed" | undefined {
  const texts = splitLines(text).map((line) => line.text);
  if (![first, second].every((line) => Number.isSafeInteger(line) && line >= 1 && line <= texts.length)) {
    return undefined;
  }
  const inside = [first, second].map((line) => insideQuote(texts, line));
  if (!inside.includes(true)) return undefined;
  const between = texts.slice(first - 1, second);
  if (inside.includes(false) || between.some((line) => line.trim() === "")) return "mixed";
  const quoted = between.filter((line) => QUOTED.test(line));
  const depth = Math.min(...quoted.map(quoteDepth));
  const prefix = new RegExp(`^[ \\t]*(?:>[ \\t]*){${depth}}`, "u").exec(quoted[0]!)![0].trimEnd();
  return { depth, prefix };
}

const OUT_OF_DATE = "The preview is out of date. Refresh it and try again.";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-117
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-124
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-156
/**
 * Plans the swap of two blocks, `first` above `second`: two top-level blocks, or two blocks of one
 * block quote (the body of a GitHub alert). Only the lines from the start of `first` to the end of
 * `second` are rewritten: the blocks swap, the blank separator and the final line break stay where
 * they are, and each block keeps its own line breaks. A blank line is added where the swap would
 * glue a block to its new neighbour (they were glued before, or the separator was empty). Inside a
 * quote a line holding only its markers is blank, and an added line carries them. Refused: ranges
 * that overlap, are unordered or out of bounds, blocks inside the frontmatter, blocks that start or
 * end on a blank line, blocks that are not in the same quote, non-blank text between the blocks
 * (a comment, a link definition): moving it would be a guess, and a block that would spoil an
 * admonition as its first block (`firstBlockRefusal`).
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
  const quote = quoteContainer(text, first.line, second.line);
  if (quote === "mixed") {
    return { refused: OUT_OF_DATE };
  }
  const isBlank = (line: SourceLine): boolean =>
    line.text.trim() === "" || (quote !== undefined && isEmptyQuoteLine(line.text, quote.depth));
  const emptyLine = quote?.prefix ?? "";
  const blockA = lines.slice(first.line - 1, first.endLine);
  const separator = lines.slice(first.endLine, second.line - 1);
  const blockB = lines.slice(second.line - 1, second.endLine);
  if ([blockA[0]!, blockA[blockA.length - 1]!, blockB[0]!, blockB[blockB.length - 1]!].some(isBlank)) {
    return { refused: OUT_OF_DATE };
  }
  if (!separator.every(isBlank)) {
    return {
      refused: "Text between the two blocks (a comment or a link definition) prevents the move.",
    };
  }
  const spoiled = firstBlockRefusal(lines.map((line) => line.text), first.line, second);
  if (spoiled) {
    return { refused: spoiled };
  }
  const eolA = blockA[blockA.length - 1].eol;
  const eolB = blockB[blockB.length - 1].eol;
  const before = lines[first.line - 2];
  const after = lines[second.endLine];
  const moved: SourceLine[] = [];
  if (before && !isBlank(before)) {
    moved.push({ text: emptyLine, eol: before.eol || eolA });
  }
  const leading = moved.length;
  moved.push(...blockB.map((line, index) =>
    index === blockB.length - 1 ? { ...line, eol: eolA } : line));
  const newSeparator = separator.length > 0 ? separator : [{ text: emptyLine, eol: eolA }];
  moved.push(...newSeparator);
  moved.push(...blockA.map((line, index) =>
    index === blockA.length - 1 ? { ...line, eol: eolB } : line));
  if (after && !isBlank(after)) {
    moved.push({ text: emptyLine, eol: eolB });
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
