import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { isContextTagOpenLine } from "../render/mystContextTags";
import { splitLines } from "./blockMove";
import { blankRunAround } from "./blankRuns";
import { listItemIndentOfLine, startsSiblingItem } from "./listItemIndent";
import { emptyQuoteLine, quoteContent, type EmptyQuoteLine } from "./quoteLine";

/** The kind of entry a block written between two entries of a container can be a sibling of. */
export type SiblingKind = "item" | "definition" | "footnote";

/**
 * Where a block written in place of a blank run goes: the text before each of its lines, so it stays
 * in the container that holds the run.
 */
export interface RunIndent {
  /** The quote part: the quote prefix of the run's first line and one space; empty for a plain run. */
  quote: string;
  /** A quote run: the run's first line, byte for byte (the copy a blank line or separator becomes). */
  blank?: string;
  /** The inner indent of the container (item, directive, panel, definition or footnote content). */
  content: string;
  /** A run between two entries: the indent of a sibling entry, and which entry the block must be. */
  sibling?: { kind: SiblingKind; indent: string };
}

const DIRECTIVE_OPEN = /^([ \t]*)(?:`{3,}|~{3,}|:{3,})\{[^{}\s]+\}/u;
const DEFINITION_MARKER = /^([ \t]*)[:~][ \t]+\S/u;
const FOOTNOTE_LABEL = /^( {0,3})\[\^[^\]\s]+\]:/u;

/** The column after `text` is read from column 0; a tab runs to the next stop of 4. */
function columnOf(text: string): number {
  let column = 0;
  for (const character of text) column = character === "\t" ? column + 4 - (column % 4) : column + 1;
  return column;
}

const leadingOf = (text: string): string => /^[ \t]*/u.exec(text)![0];

/** True for a definition marker line (`: text`, `~ text`). */
function isDefinitionMarkerLine(text: string): boolean {
  return DEFINITION_MARKER.test(text);
}

/** True when the text starts with a footnote label (`[^label]:`, at most three spaces before it). */
export function startsFootnoteDefinition(text: string): boolean {
  return FOOTNOTE_LABEL.test(text);
}

/**
 * True when a block starts a definition entry: a first line that is no marker line, then, after at
 * most one blank line, a definition marker line (a term and its definition).
 */
export function startsDefinitionEntry(block: readonly string[]): boolean {
  if (block.length === 0 || block[0].trim() === "" || isDefinitionMarkerLine(block[0])) return false;
  const next = block[1]?.trim() === "" ? block[2] : block[1];
  return next !== undefined && isDefinitionMarkerLine(next);
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * The indent of a block written in place of the blank line `line` (already checked by
 * `checkBlankLine`), read from the whole run that holds it (`blankRunAround`: the container line and
 * the sibling rules look at the run's first line above it and the line below it), with the optional
 * line of the list item (`itemLine`) or of the other container
 * (`containerLine`: a directive's opening fence, a context tag's opening line, a definition's marker
 * line, a footnote's label line) that holds the run. For a quote run, the container line is read
 * without its quote markers, which must sit at the run's depth and columns.
 *
 * Undefined, a stale line, when the container line is in the frontmatter, not above the run, not a
 * line of the shape its container has, or at other quote markers. The host checks the shape and the
 * place only: a well-formed line of another container gives that line's indent.
 */
export function blankRunIndent(
  text: string,
  line: number,
  itemLine?: number,
  containerLine?: number,
): RunIndent | undefined {
  const lines = splitLines(text);
  const run = blankRunAround(text, line);
  const first = run ? lines[run.line - 1] : undefined;
  if (!run || !first) return undefined;
  const shape: EmptyQuoteLine | undefined = emptyQuoteLine(first.text);
  const base: RunIndent = shape
    ? { quote: `${shape.prefix} `, blank: first.text, content: "" }
    : { quote: "", content: "" };
  const anchorLine = itemLine ?? containerLine;
  if (anchorLine === undefined) return base;
  if (itemLine !== undefined && containerLine !== undefined) return undefined;
  if (!Number.isSafeInteger(anchorLine) || anchorLine < 1 || anchorLine >= run.line) return undefined;
  const frontmatter = matchFrontmatterBlock(text);
  if (frontmatter && anchorLine <= splitLines(text.slice(0, frontmatter.length)).length) return undefined;
  const read = (lineText: string): string | undefined => (shape ? quoteContent(lineText, shape) : lineText);
  const anchor = read(lines[anchorLine - 1].text);
  if (anchor === undefined) return undefined;
  const below = run.endLine < lines.length ? read(lines[run.endLine].text) : undefined;
  const indent = itemLine !== undefined ? itemIndent(anchor, below) : containerIndent(anchor, below);
  return indent ? { ...base, ...indent } : undefined;
}

type Inner = Pick<RunIndent, "content" | "sibling">;

function itemIndent(anchor: string, below: string | undefined): Inner | undefined {
  const indents = listItemIndentOfLine(anchor);
  if (!indents) return undefined;
  const sibling = below !== undefined && startsSiblingItem(below, indents.itemColumn);
  return { content: indents.content, ...(sibling ? { sibling: { kind: "item" as const, indent: indents.item } } : {}) };
}

function containerIndent(anchor: string, below: string | undefined): Inner | undefined {
  const directive = DIRECTIVE_OPEN.exec(anchor);
  if (directive) return { content: directive[1] };
  const leading = leadingOf(anchor);
  if (isContextTagOpenLine(anchor.slice(leading.length))) return { content: leading };
  if (isDefinitionMarkerLine(anchor)) {
    const entry = below !== undefined && columnOf(leadingOf(below)) === columnOf(leading)
      && !isDefinitionMarkerLine(below);
    return { content: `${leading}  `, ...(entry ? { sibling: { kind: "definition" as const, indent: leading } } : {}) };
  }
  const footnote = FOOTNOTE_LABEL.exec(anchor);
  if (footnote) {
    const entry = below !== undefined && FOOTNOTE_LABEL.test(below)
      && columnOf(leadingOf(below)) === columnOf(leading);
    return { content: `${leading}    `, ...(entry ? { sibling: { kind: "footnote" as const, indent: leading } } : {}) };
  }
  return undefined;
}
