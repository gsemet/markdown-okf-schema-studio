import { sourceLines } from "../edits/textEdit";
import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { splitLines } from "./blockMove";
import { listItemIndent, startsSiblingItem, startsWithListMarker } from "./listItemIndent";

export interface InsertionPlan {
  /** UTF-16 offset in the document text where the inserted text starts. */
  offset: number;
  prefix: string;
  suffix: string;
  lineEnding: string;
  /** A blank run's region the inserted text replaces (`offset` is its start); absent otherwise. */
  replace?: { start: number; end: number };
  /**
   * A blank run inside a list item: the indents of that item, and whether the run is between two
   * items (the line below is a sibling item), decided once against the document of the plan.
   */
  listIndent?: { item: string; content: string; betweenItems: boolean };
}

const lineEndingOf = (text: string): string =>
  text.includes("\r\n") ? "\r\n" : text.includes("\n") ? "\n" : text.includes("\r") ? "\r" : "\n";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * The plan of a block written in place of the blank run at lines `line`..`endLine` (already checked
 * by `checkBlankRun`). The region runs from the end of line `line - 1` (the start of the text for
 * line 1) to the start of line `endLine + 1`, or to the end of the text for a run at the end. One
 * separator goes before the block (none at the start of the file) and one after it (none at the
 * end, where the document's final line break is kept, or kept absent). With `itemLine` (the line
 * of the list item that holds the run), the plan also carries that item's indents.
 */
export function planBlankRunInsertion(
  text: string,
  line: number,
  endLine: number,
  itemLine?: number,
): InsertionPlan {
  const lines = splitLines(text);
  const lineEnding = lineEndingOf(text);
  const offsetOfLine = (count: number): number =>
    lines.slice(0, count).reduce((sum, entry) => sum + entry.text.length + entry.eol.length, 0);
  const start = line === 1 ? 0 : offsetOfLine(line - 1) - lines[line - 2].eol.length;
  const hasBelow = endLine < lines.length;
  const end = hasBelow ? offsetOfLine(endLine) : text.length;
  const indents = itemLine === undefined ? undefined : listItemIndent(text, itemLine, line);
  return {
    offset: start,
    prefix: line === 1 ? "" : lineEnding + lineEnding,
    suffix: hasBelow ? lineEnding + lineEnding : lines[lines.length - 1].eol,
    lineEnding,
    replace: { start, end },
    ...(indents
      ? {
        listIndent: {
          item: indents.item,
          content: indents.content,
          betweenItems: hasBelow && startsSiblingItem(lines[endLine].text, indents.itemColumn),
        },
      }
      : {}),
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
  const block = raw.replace(/^(?:[ \t]*(?:\r\n|\n|\r))+/u, "")
    .replace(/\r\n|\n|\r/gu, plan.lineEnding).replace(/(?:\r\n|\n|\r)+$/u, "");
  return plan.prefix + (plan.listIndent ? indentedToItem(block, plan) : block) + plan.suffix;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * A block written in a run inside a list item takes that item's content indent, or the item's own
 * indent (a sibling item) when the run is between items and the block starts with a list marker.
 * Blank lines of the block get nothing; the writer's own indentation stays after the indent.
 */
function indentedToItem(block: string, plan: InsertionPlan): string {
  const { item, content, betweenItems } = plan.listIndent!;
  const indent = betweenItems && startsWithListMarker(block) ? item : content;
  return block.split(plan.lineEnding).map((line) => (/^[ \t]*$/u.test(line) ? line : indent + line))
    .join(plan.lineEnding);
}
