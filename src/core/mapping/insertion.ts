import { sourceLines } from "../edits/textEdit";
import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { splitLines } from "./blockMove";
import { blankRunIndent, startsDefinitionEntry, startsFootnoteDefinition, type RunIndent } from "./blankRunContainer";
import { startsWithListMarker } from "./listMarker";
import { emptyQuoteLine, sameQuoteShape } from "./quoteLine";
import { isCommonMarkBlank } from "./blockRange";

export interface InsertionPlan {
  /** UTF-16 offset in the document text where the inserted text starts. */
  offset: number;
  prefix: string;
  suffix: string;
  lineEnding: string;
  /** A blank line's region the inserted text replaces (`offset` is its start); absent otherwise. */
  replace?: { start: number; end: number };
  /**
   * A blank run inside a quote or another container (a list item, a directive, a definition, a
   * footnote): what each line of the block takes before it, decided once against the document of
   * the plan. Absent for a plain run at the top level.
   */
  indent?: RunIndent;
}

const lineEndingOf = (text: string): string =>
  text.includes("\r\n") ? "\r\n" : text.includes("\n") ? "\n" : text.includes("\r") ? "\r" : "\n";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * The plan of a block written in place of the one blank line `line` (already checked by
 * `checkBlankLine`). The region is that line without its line break, which stays as it is, so the
 * document's final line break, or its absence, is kept. A separator goes before the block only when
 * line `line - 1` exists and is not blank, and after it only when line `line + 1` exists and is not
 * blank: a CommonMark blank line, or, in a quote run, an empty quote line of the run's shape. In a
 * quote run a separator is a copy of the run's first line. With `itemLine` (the line of the list item
 * that holds the line) or `containerLine` (the line of the directive, panel, definition or footnote
 * that holds it), and for a quote run, the plan also carries the indent of the block; a container
 * line that does not hold is ignored here, the callers check it first.
 */
export function planBlankRunInsertion(
  text: string,
  line: number,
  itemLine?: number,
  containerLine?: number,
): InsertionPlan {
  const lines = splitLines(text);
  const lineEnding = lineEndingOf(text);
  const start = lines.slice(0, line - 1).reduce((sum, entry) => sum + entry.text.length + entry.eol.length, 0);
  const end = start + lines[line - 1].text.length;
  const indent = blankRunIndent(text, line, itemLine, containerLine) ?? blankRunIndent(text, line);
  const separator = indent?.blank === undefined ? "" : indent.blank;
  const shape = emptyQuoteLine(lines[line - 1].text);
  const isBlankNeighbour = (neighbour: string): boolean => {
    if (isCommonMarkBlank(neighbour)) return true;
    const other = shape ? emptyQuoteLine(neighbour) : undefined;
    return shape !== undefined && other !== undefined && sameQuoteShape(shape, other);
  };
  const before = lines[line - 2];
  const after = lines[line];
  return {
    offset: start,
    prefix: before !== undefined && !isBlankNeighbour(before.text) ? separator + lineEnding : "",
    suffix: after !== undefined && !isBlankNeighbour(after.text) ? lineEnding + separator : "",
    lineEnding,
    replace: { start, end },
    ...(indent && (indent.blank !== undefined || itemLine !== undefined || containerLine !== undefined) ? { indent } : {}),
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
  return plan.prefix + (plan.indent ? indentedToContainer(block, plan) : block) + plan.suffix;
}

/** True when the block is a sibling entry of the kind: a list item, a definition entry or a footnote. */
function isSiblingEntry(kind: NonNullable<RunIndent["sibling"]>["kind"], block: string, lineEnding: string): boolean {
  if (kind === "item") return startsWithListMarker(block);
  if (kind === "footnote") return startsFootnoteDefinition(block);
  return startsDefinitionEntry(block.split(lineEnding));
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * A block written in a run inside a container takes the container's indent after its quote part:
 * the content indent, or the entry's own indent (a sibling) when the run is between two entries and
 * the block is one (a list item, a definition entry, a footnote). Blank lines of the block become a
 * copy of the run's first line in a quote run and get nothing otherwise; the writer's own
 * indentation stays after the indent.
 */
function indentedToContainer(block: string, plan: InsertionPlan): string {
  const { quote, blank, content, sibling } = plan.indent!;
  const indent = sibling && isSiblingEntry(sibling.kind, block, plan.lineEnding) ? sibling.indent : content;
  return block.split(plan.lineEnding)
    .map((line) => (/^[ \t]*$/u.test(line) ? (blank ?? line) : quote + indent + line))
    .join(plan.lineEnding);
}
