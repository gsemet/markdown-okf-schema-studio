import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { splitLines } from "./blockMove";
import { listItemIndentOfLine, type ListItemIndent } from "./listMarker";

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
