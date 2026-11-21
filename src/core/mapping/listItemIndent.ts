import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { splitLines } from "./blockMove";

/** The two indents of a list item line (CommonMark columns; a tab runs to the next stop of 4). */
export interface ListItemIndent {
  /** The text that brings a line to the item column: a sibling item starts with it. */
  item: string;
  /** The item indent followed by spaces up to the content column: the item's own content. */
  content: string;
  /** The column of the innermost list marker of the line. */
  itemColumn: number;
}

const MARKER = /^(?:[-+*]|[0-9]{1,9}[.)])(?=[ \t]|$)/u;
const THEMATIC_BREAK = /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/u;

/** True when `text` (without leading spaces or tabs) starts with a list marker that is not a thematic break. */
export function startsWithListMarker(text: string): boolean {
  const trimmed = text.replace(/^[ \t]+/u, "");
  return MARKER.test(trimmed) && !THEMATIC_BREAK.test(trimmed.trimEnd());
}

/** The column after `text` is read from `column`; a tab runs to the next stop of 4. */
function columnAfter(text: string, column: number): number {
  let result = column;
  for (const character of text) result = character === "\t" ? result + 4 - (result % 4) : result + 1;
  return result;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * The indents of the list item whose marker is on line `itemLine`, for a block written in a blank
 * run that starts at `runLine`. Undefined when the line is no list item line: it has no marker
 * followed by a space, a tab or the end of the line, it is a thematic break, it is in the
 * frontmatter, or it is not above the run.
 */
export function listItemIndent(text: string, itemLine: number, runLine?: number): ListItemIndent | undefined {
  if (!Number.isSafeInteger(itemLine) || itemLine < 1) return undefined;
  if (runLine !== undefined && itemLine >= runLine) return undefined;
  const frontmatter = matchFrontmatterBlock(text);
  if (frontmatter && itemLine <= splitLines(text.slice(0, frontmatter.length)).length) return undefined;
  const entry = splitLines(text)[itemLine - 1];
  return entry ? listItemIndentOfLine(entry.text) : undefined;
}

/**
 * The indents of the list item whose marker is on the line `lineText`, read from column 0.
 * Undefined when the line has no marker followed by a space, a tab or the end of the line, or when
 * it is a thematic break.
 */
export function listItemIndentOfLine(lineText: string): ListItemIndent | undefined {
  if (THEMATIC_BREAK.test(lineText.trim())) return undefined;
  const leading = /^[ \t]*/u.exec(lineText)![0];
  let rest = lineText.slice(leading.length);
  const leadingColumn = columnAfter(leading, 0);
  let column = leadingColumn;
  let itemColumn = -1;
  let contentColumn = -1;
  // Each marker opens an item; one that follows another after 1 to 4 columns opens an item inside it.
  for (;;) {
    const marker = MARKER.exec(rest);
    if (!marker) break;
    itemColumn = column;
    const markerEnd = column + marker[0].length;
    const afterMarker = rest.slice(marker[0].length);
    const spaces = /^[ \t]*/u.exec(afterMarker)![0];
    const spaceColumns = columnAfter(spaces, markerEnd) - markerEnd;
    const next = afterMarker.slice(spaces.length);
    contentColumn = next === "" || spaceColumns > 4 ? markerEnd + 1 : markerEnd + spaceColumns;
    if (next === "" || spaceColumns > 4) break;
    column = markerEnd + spaceColumns;
    rest = next;
  }
  if (itemColumn < 0) return undefined;
  const item = leading + " ".repeat(itemColumn - leadingColumn);
  return { item, content: item + " ".repeat(contentColumn - itemColumn), itemColumn };
}

/**
 * True when the line after a blank run is a sibling of the item at `itemColumn`: it starts, after
 * spaces and tabs only, with a list marker at that column.
 */
export function startsSiblingItem(lineText: string, itemColumn: number): boolean {
  const leading = /^[ \t]*/u.exec(lineText)![0];
  return columnAfter(leading, 0) === itemColumn && startsWithListMarker(lineText);
}
