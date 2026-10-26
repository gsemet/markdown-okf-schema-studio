/**
 * Moves a row or a column of a MyST `{list-table}` on the directive source. The source is read as
 * the directive line, its options, the top-level list items (the rows) and the closing fence; a
 * move reorders whole items (rows) or the cells inside every item (columns) and leaves the rest of
 * the text where it was: the directive line, the title, the options (the `:widths:` of a moved
 * column excepted), the indentation, the blank lines between items and the fence.
 */

const LIST_TABLE_OPEN = /^([ \t]*)(`{3,}|~{3,}|:{3,})\{list-table\}[ \t]*(.*?)\s*$/u;
const ITEM_START = /^([ \t]*)([*+-])[ \t]+/u;

/** The parts of a `{list-table}` directive a move works on. */
interface ListTableSource {
  /** Every line of the source with its line ending. */
  lines: string[];
  /** The line ending of the source (the first one found). */
  ending: string;
  /** Index of the first line of the first item. */
  bodyStart: number;
  /** Index after the last line the rows can use: the closing fence line (or the end). */
  end: number;
  /** The number of leading header rows (`:header-rows:`). */
  headerRows: number;
  /** Index of the `:widths:` option line, or -1. */
  widthsLine: number;
  /** The lines of each item (a row), the blank lines inside it included. */
  items: string[][];
  /** The blank lines that follow each item and belong to the table, not to the item. */
  gaps: string[][];
}

const text = (line: string): string => line.replace(/[\r\n]+$/u, "");

/** Reads `source` (one whole `{list-table}` directive), or undefined when it has no readable rows. */
function readListTable(source: string): ListTableSource | undefined {
  const lines = source.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/gu) ?? [];
  const opener = lines.findIndex((line) => text(line).trim() !== "");
  const open = opener < 0 ? null : LIST_TABLE_OPEN.exec(text(lines[opener]!));
  if (!open) return undefined;
  const fence = open[2]!;
  let end = lines.length;
  while (end > opener + 1 && text(lines[end - 1]!).trim() === "") end -= 1;
  const closing = text(lines[end - 1]!).trim();
  if (end - 1 > opener && closing.length >= fence.length && closing === fence[0]!.repeat(closing.length)) end -= 1;
  let index = opener + 1;
  if (index < end && text(lines[index]!).trim() === "---") {
    index += 1;
    while (index < end && text(lines[index]!).trim() !== "---") index += 1;
    index += 1;
  }
  let headerRows = 0;
  let widthsLine = -1;
  for (; index < end; index += 1) {
    const line = text(lines[index]!);
    if (line.trim() === "") continue;
    const option = /^\s*:([\w-]+):(?:[ \t]+(.*))?$/u.exec(line);
    if (!option) break;
    if (option[1] === "header-rows") {
      headerRows = Number((option[2] ?? "").trim());
      if (!Number.isInteger(headerRows) || headerRows < 0) return undefined;
    } else if (option[1] === "widths") {
      widthsLine = index;
    }
  }
  // The blank lines between the options and the first item stay with the options.
  while (index < end && text(lines[index]!).trim() === "") index += 1;
  const first = index < end ? ITEM_START.exec(text(lines[index]!)) : null;
  if (!first) return undefined;
  const itemIndent = first[1]!.length;
  const bodyStart = index;
  const items: string[][] = [];
  const gaps: string[][] = [];
  for (; index < end; index += 1) {
    const line = text(lines[index]!);
    const start = ITEM_START.exec(line);
    if (start && start[1]!.length === itemIndent) {
      items.push([lines[index]!]);
      gaps.push([]);
    } else if (line.trim() === "") {
      gaps[gaps.length - 1]!.push(lines[index]!);
    } else if (line.length - line.trimStart().length > itemIndent) {
      // A line of the item: the blank lines before it belong to the item too.
      items[items.length - 1]!.push(...gaps[gaps.length - 1]!, lines[index]!);
      gaps[gaps.length - 1] = [];
    } else {
      return undefined;
    }
  }
  const ending = /\r\n|\r|\n/u.exec(source)?.[0] ?? "\n";
  return { lines, ending, bodyStart, end, headerRows, widthsLine, items, gaps };
}

/** The source with its items replaced by `items` (and, optionally, one option line rewritten). */
function writeListTable(source: string, table: ListTableSource, items: string[][], widths?: string): string {
  const { lines, bodyStart, end, ending } = table;
  const withEnding = (line: string): string => (/[\r\n]$/u.test(line) ? line : line + ending);
  const body = items.flatMap((item, position) => [...item.map(withEnding), ...table.gaps[position]!]);
  const head = lines.slice(0, bodyStart);
  if (widths !== undefined) head[table.widthsLine] = widths + (/[\r\n]+$/u.exec(head[table.widthsLine]!)?.[0] ?? "");
  const result = [...head, ...body, ...lines.slice(end)].join("");
  return /[\r\n]$/u.test(lines[lines.length - 1]!) ? result : result.replace(/(?:\r\n|\r|\n)$/u, "");
}

// @implements_req SwRS-MDOKFSTUDIO-TABLE-002
/**
 * `source` (one whole `{list-table}` directive) with the row at `from` moved to index `to`. Rows are
 * the top-level list items after the options, counted from 0 with the header rows first; rows
 * under `:header-rows:` never move and nothing moves into them. An item travels with all its lines
 * (cell lines, continuation lines, blank lines inside it); the directive line, the options, the
 * indentation, the blank lines between items and the closing fence stay where they are.
 * Returns undefined when the directive cannot be read as rows or the move is refused.
 */
export function moveListTableRow(source: string, from: number, to: number): string | undefined {
  const table = readListTable(source);
  if (!table) return undefined;
  const { items, headerRows } = table;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to
    || from < headerRows || to < headerRows || from >= items.length || to >= items.length) return undefined;
  const moved = [...items];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item!);
  return writeListTable(source, table, moved);
}

/** The cells of one item: the text after each cell marker and the continuation lines under it. */
interface ItemCells {
  /** The marker of each cell as written (`* -` for the first, `  -` for the others). */
  markers: string[];
  /** What follows each marker on its line, and the lines under it up to the next marker. */
  contents: string[][];
}

/**
 * Splits one item (a row) into its cells. The first cell sits on the item's own line after the
 * inner marker (`* - text`); the others start on a line indented as that inner marker (`  - text`);
 * any other line belongs to the cell above it. Undefined when the item has no inner marker.
 */
function splitItem(item: string[]): ItemCells | undefined {
  const first = /^([ \t]*[*+-][ \t]+[*+-])(?=[ \t]|$)(.*)$/u.exec(text(item[0]!));
  if (!first) return undefined;
  const innerColumn = first[1]!.length - 1;
  const markers = [first[1]!];
  const contents: string[][] = [[first[2]! + (/[\r\n]+$/u.exec(item[0]!)?.[0] ?? "")]];
  for (const line of item.slice(1)) {
    const cell = /^([ \t]*[*+-])(?=[ \t]|$)(.*)$/u.exec(text(line));
    if (cell && cell[1]!.length - 1 === innerColumn) {
      markers.push(cell[1]!);
      contents.push([cell[2]! + (/[\r\n]+$/u.exec(line)?.[0] ?? "")]);
    } else {
      contents[contents.length - 1]!.push(line);
    }
  }
  return { markers, contents };
}

// @implements_req SwRS-MDOKFSTUDIO-TABLE-007
/**
 * `source` (one whole `{list-table}` directive) with the column at `from` moved to index `to` in
 * every row, header rows included. A cell travels with the continuation lines under it; the
 * markers (`* -` and `  -`) stay at their positions, so the first cell always carries the item
 * marker. A `:widths:` option with one number per column moves its number with the column. Returns
 * undefined when the rows do not all have the same number of cells, or the move is refused.
 */
export function moveListTableColumn(source: string, from: number, to: number): string | undefined {
  const table = readListTable(source);
  if (!table) return undefined;
  const rows = table.items.map(splitItem);
  const columns = rows[0]?.markers.length ?? 0;
  if (rows.some((row) => row === undefined || row.markers.length !== columns)) return undefined;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to
    || from < 0 || to < 0 || from >= columns || to >= columns) return undefined;
  const items = (rows as ItemCells[]).map((row) => {
    const contents = [...row.contents];
    const [cell] = contents.splice(from, 1);
    contents.splice(to, 0, cell!);
    return contents.flatMap((content, column) => [
      row.markers[column]! + content[0]!,
      ...content.slice(1),
    ]);
  });
  let widths: string | undefined;
  if (table.widthsLine >= 0) {
    const line = text(table.lines[table.widthsLine]!);
    const parsed = /^(\s*:widths:[ \t]+)(.*?)\s*$/u.exec(line);
    const numbers = parsed ? parsed[2]!.split(/[ \t,]+/u).filter((token) => token !== "") : [];
    if (parsed && numbers.length === columns && numbers.every((token) => /^\d+(?:\.\d+)?$/u.test(token))) {
      const [width] = numbers.splice(from, 1);
      numbers.splice(to, 0, width!);
      widths = parsed[1]! + numbers.join(" ");
    }
  }
  return writeListTable(source, table, items, widths);
}
