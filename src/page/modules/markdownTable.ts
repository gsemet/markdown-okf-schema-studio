import { createTableStructureTools } from "./tableStructure";
import { moveListTableColumn, moveListTableRow } from "./listTableMove";
import { createTableConversionTools } from "./tableConversion";

export interface MarkdownTableModel {
  rows: string[][];
  lineEnding: string;
  trailingLineEnding: boolean;
  /** Original lines, without line endings, indentation included. Set by `parse`. */
  sourceLines?: string[];
  /** Cells as parsed from `sourceLines` (deep copy). Set by `parse`. */
  sourceRows?: string[][];
  /** For each current row, the index of its source row; undefined for new rows. */
  rowOrigins?: (number | undefined)[];
  /**
   * For each current column, the index of its source column; undefined for a new column. Column
   * operations edit this list so every line keeps its own padding, indentation and outer pipes.
   */
  columnOrigins?: (number | undefined)[];
  /**
   * Set on the model of a `{list-table}` (see `tableStructure.ts`): `write` turns the pipe text of
   * the grid into the text to save, the list-table again.
   */
  listTable?: { write: (pipeText: string) => string };
}

export type MarkdownTableTools = ReturnType<typeof createMarkdownTableTools>;

/** The forms of a table the conversion reads and writes. */
export type TableKind = "pipe" | "list-table" | "html";

/** The outcome of a conversion: the new text, or why nothing may change. */
export type TableConversion = { ok: true; text: string } | { ok: false; reason: string };

export function createMarkdownTableTools() {
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-102
  // A backslash keeps the next character in the cell. A code span does not shelter a pipe: the
  // preview follows the GFM table rule, so an unescaped pipe splits the row inside backticks too.
  function splitRow(line: string): string[] {
    const text = line.trim();
    const start = text.startsWith("|") ? 1 : 0;
    let end = text.length;
    if (text.endsWith("|")) {
      let backslashes = 0;
      for (let index = end - 2; index >= start && text[index] === "\\"; index -= 1) {
        backslashes += 1;
      }
      if (backslashes % 2 === 0) end -= 1;
    }
    const cells: string[] = [];
    let cell = "";
    for (let index = start; index < end; index += 1) {
      const character = text[index];
      if (character === "\\" && index + 1 < end) {
        cell += character + text[index + 1];
        index += 1;
      } else if (character === "|") {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += character;
      }
    }
    cells.push(cell.trim());
    return cells;
  }

  /**
   * Offsets, in the untrimmed line, of the text between the delimiting pipes of each cell. The
   * scan follows the same rules as `splitRow`, so there is one segment per parsed cell.
   */
  function cellSegments(line: string): { start: number; end: number }[] {
    const offset = line.length - line.trimStart().length;
    const text = line.trim();
    const start = text.startsWith("|") ? 1 : 0;
    let end = text.length;
    if (text.endsWith("|")) {
      let backslashes = 0;
      for (let index = end - 2; index >= start && text[index] === "\\"; index -= 1) {
        backslashes += 1;
      }
      if (backslashes % 2 === 0) end -= 1;
    }
    const segments: { start: number; end: number }[] = [];
    let segmentStart = start;
    for (let index = start; index < end; index += 1) {
      const character = text[index];
      if (character === "\\" && index + 1 < end) {
        index += 1;
      } else if (character === "|") {
        segments.push({ start: segmentStart + offset, end: index + offset });
        segmentStart = index + 1;
      }
    }
    segments.push({ start: segmentStart + offset, end: end + offset });
    return segments;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-091
  /** Every pipe not already escaped becomes `\\|`, also inside a code span (the preview unescapes it). */
  function escapeCellPipes(value: string): string {
    let result = "";
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (character === "\\" && index + 1 < value.length) {
        result += character + value[index + 1];
        index += 1;
      } else {
        result += character === "|" ? "\\|" : character;
      }
    }
    return result;
  }

  /** The text between two pipes with a new value: it keeps the leading whitespace and the width. */
  function rewriteSegment(text: string, newCell: string): string {
    // A whitespace-only segment keeps one leading space, so the value is not right-aligned.
    const leading = text.trim() === ""
      ? (text.length > 0 ? " " : "")
      : (/^\s*/u.exec(text)?.[0] ?? "");
    const value = escapeCellPipes(newCell);
    const trailing = /\s$/u.test(text)
      ? " ".repeat(Math.max(1, text.length - leading.length - value.length))
      : "";
    return leading + value + trailing;
  }

  /**
   * A new cell written in the style of `reference`, a neighbouring segment of the same line (for a
   * delimiter row, of the header line, whose widths the dashes follow). In a padded table the new
   * cell takes the width of that neighbour; otherwise it is one space wider than its text.
   */
  function newSegment(reference: string, value: string, delimiter: boolean, padded: boolean): string {
    const leading = /^\s/u.test(reference) ? " " : "";
    const trailing = /\s$/u.test(reference) ? " " : "";
    const body = delimiter ? "---" : escapeCellPipes(value);
    const fill = padded ? Math.max(0, reference.length - leading.length - trailing.length - body.length) : 0;
    return delimiter
      ? leading + body + "-".repeat(fill) + trailing
      : leading + body + " ".repeat(fill) + trailing;
  }

  /**
   * The line of a source row after column operations: the segment of a kept column stays verbatim
   * (rewritten only if its value changed), a new column is written in the style of its left
   * neighbour, and the indentation and the outer pipes stay as they were.
   */
  function columnsRow(line: string, oldCells: string[], newCells: string[],
    origins: (number | undefined)[], delimiter: boolean, headerLine: string, padded: boolean): string {
    const segments = cellSegments(line);
    const raw = (column: number | undefined): string | undefined => (
      column === undefined || !segments[column] ? undefined : line.slice(segments[column].start, segments[column].end));
    const headerSegments = cellSegments(headerLine);
    const layout = (column: number | undefined): string | undefined => (delimiter
      ? (column === undefined || !headerSegments[column]
        ? undefined : headerLine.slice(headerSegments[column].start, headerSegments[column].end))
      : raw(column));
    const parts = newCells.map((cell, index) => {
      const kept = raw(origins[index]);
      if (kept !== undefined) return cell === oldCells[origins[index]!] ? kept : rewriteSegment(kept, cell);
      let reference: string | undefined;
      for (let step = index - 1; step >= 0 && reference === undefined; step -= 1) reference = layout(origins[step]);
      for (let step = index + 1; step < origins.length && reference === undefined; step += 1) {
        reference = layout(origins[step]);
      }
      return newSegment(reference ?? " x ", cell, delimiter, padded);
    });
    const result = line.slice(0, segments[0]!.start) + parts.join("|") + line.slice(segments.at(-1)!.end);
    const expected = newCells.map((cell) => escapeCellPipes(cell).trim());
    const actual = splitRow(result);
    // The dashes of a new delimiter cell fill the column width: only the cell count is compared there.
    if (actual.length === expected.length
      && actual.every((cell, index) => (delimiter && origins[index] === undefined) || cell === expected[index])
      && (newCells.length > 1 || result.includes("|"))) {
      return result;
    }
    const indentation = line.slice(0, line.length - line.trimStart().length);
    return `${indentation}| ${newCells.map((cell) => escapeCellPipes(cell)).join(" | ")} |`;
  }

  /**
   * Replaces the text of each changed cell inside `line`, keeping the other segments verbatim. A
   * changed segment keeps its leading whitespace; when it had trailing whitespace, the trailing
   * whitespace fills the original width (at least one space).
   */
  function spliceRow(line: string, oldCells: string[], newCells: string[]): string {
    const segments = cellSegments(line);
    let result = line;
    for (let index = Math.min(segments.length, newCells.length) - 1; index >= 0; index -= 1) {
      if (newCells[index] === oldCells[index]) continue;
      const segment = segments[index];
      result = result.slice(0, segment.start)
        + rewriteSegment(line.slice(segment.start, segment.end), newCells[index])
        + result.slice(segment.end);
    }
    // Rows without outer pipes can lose a delimiter when an edge cell is emptied. When the spliced
    // row no longer splits into the new cells, rewrite it canonically and keep its indentation.
    const expected = newCells.map((cell) => escapeCellPipes(cell).trim());
    const actual = splitRow(result);
    if (actual.length === expected.length && actual.every((cell, index) => cell === expected[index])) {
      return result;
    }
    const indentation = line.slice(0, line.length - line.trimStart().length);
    return `${indentation}| ${newCells.map((cell) => escapeCellPipes(cell)).join(" | ")} |`;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-001
  function parse(source: string): MarkdownTableModel | undefined {
    const lineEnding = /\r\n|\r|\n/u.exec(source)?.[0] ?? "\n";
    const lines = source.split(/\r\n|\r|\n/u);
    const trailingLineEnding = lines.at(-1) === "";
    if (trailingLineEnding) lines.pop();
    if (lines.length < 2) return undefined;
    const rows = lines.map(splitRow);
    const columnCount = rows[0].length;
    if (
      columnCount < 1
      || rows.some((row) => row.length !== columnCount)
      || !rows[1].every((cell) => /^:?-{3,}:?$/u.test(cell.replace(/\s/gu, "")))
    ) {
      return undefined;
    }
    return {
      rows,
      lineEnding,
      trailingLineEnding,
      sourceLines: [...lines],
      sourceRows: rows.map((row) => [...row]),
      rowOrigins: rows.map((_, index) => index),
      columnOrigins: rows[0].map((_, index) => index),
    };
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-094
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-234
  function serialize(model: MarkdownTableModel): string {
    const pipe = serializePipe(model);
    return model.listTable ? model.listTable.write(pipe) : pipe;
  }

  function serializePipe(model: MarkdownTableModel): string {
    if (
      !model.sourceLines
      || !model.sourceRows
      || !model.rowOrigins
    ) {
      const lines = model.rows.map((row) => `| ${row.map(escapeCellPipes).join(" | ")} |`);
      return lines.join(model.lineEnding) + (model.trailingLineEnding ? model.lineEnding : "");
    }
    const { sourceLines, sourceRows, rowOrigins } = model;
    // The source row a new row takes its style from: the nearest preceding body row with an
    // origin, else the first body row, else the header. The delimiter row is never a template.
    const templateRowOrigin = (rowIndex: number): number => {
      for (let index = rowIndex - 1; index >= 2; index -= 1) {
        if (rowOrigins[index] !== undefined) return rowOrigins[index] as number;
      }
      for (let index = rowIndex + 1; index < model.rows.length; index += 1) {
        if (index >= 2 && rowOrigins[index] !== undefined) return rowOrigins[index] as number;
      }
      return 0;
    };
    const origins = model.columnOrigins;
    const sameColumns = !origins
      || (origins.length === sourceRows[0]!.length && origins.every((column, index) => column === index));
    // A padded table has a cell wider than its text and a space on each side.
    const padded = !sameColumns && sourceLines.some((line) => cellSegments(line).some((segment) => {
      const text = line.slice(segment.start, segment.end);
      return text.length > text.trim().length + 2;
    }));
    const lines = model.rows.map((row, rowIndex) => {
      const origin = rowOrigins[rowIndex];
      if (!sameColumns) {
        const template = origin ?? templateRowOrigin(rowIndex);
        return columnsRow(sourceLines[template]!, sourceRows[template]!, row, origins!, rowIndex === 1, sourceLines[0]!, padded);
      }
      if (origin !== undefined) {
        const sourceRow = sourceRows[origin];
        if (row.length === sourceRow.length && row.every((cell, index) => cell === sourceRow[index])) {
          return sourceLines[origin];
        }
        return spliceRow(sourceLines[origin], sourceRow, row);
      }
      const templateOrigin = templateRowOrigin(rowIndex);
      return spliceRow(sourceLines[templateOrigin], sourceRows[templateOrigin], row);
    });
    return lines.join(model.lineEnding) + (model.trailingLineEnding ? model.lineEnding : "");
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-055
  function insertRowAfter(model: MarkdownTableModel, renderedRowIndex: number): number {
    const rowIndex = renderedRowIndex === 0 ? 2 : renderedRowIndex + 2;
    model.rows.splice(rowIndex, 0, Array(model.rows[0].length).fill(""));
    model.rowOrigins?.splice(rowIndex, 0, undefined);
    return renderedRowIndex === 0 ? 1 : renderedRowIndex + 1;
  }

  function deleteRow(model: MarkdownTableModel, renderedRowIndex: number): number | undefined {
    if (renderedRowIndex <= 0 || model.rows.length <= 3) return undefined;
    const rowIndex = Math.min(renderedRowIndex + 1, model.rows.length - 1);
    model.rows.splice(rowIndex, 1);
    model.rowOrigins?.splice(rowIndex, 1);
    return Math.max(1, Math.min(renderedRowIndex, model.rows.length - 2));
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-002
  /**
   * Moves the body row at rendered index `from` so that it sits at rendered index `to` (the header
   * is rendered row 0 and never moves, nor does anything move to its place). The row keeps its
   * source line, so the serialized table differs from the source by the order of lines only.
   * Returns the rendered index of the row after the move, or undefined when the model refuses.
   */
  function moveRow(model: MarkdownTableModel, from: number, to: number): number | undefined {
    const bodyRows = model.rows.length - 2;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1
      || from > bodyRows || to > bodyRows || from === to) return undefined;
    const [row] = model.rows.splice(from + 1, 1);
    model.rows.splice(to + 1, 0, row!);
    if (model.rowOrigins) {
      const [origin] = model.rowOrigins.splice(from + 1, 1);
      model.rowOrigins.splice(to + 1, 0, origin);
    }
    return to;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-007
  /**
   * Moves the column at index `from` to index `to` in every row, the delimiter row included, so
   * the alignment colons travel with their column. Each cell keeps its own padding in the
   * serialized table. Returns the new index of the column, or undefined when the model refuses.
   */
  function moveColumn(model: MarkdownTableModel, from: number, to: number): number | undefined {
    const columns = model.rows[0]?.length ?? 0;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0
      || from >= columns || to >= columns || from === to) return undefined;
    for (const row of model.rows) {
      const [cell] = row.splice(from, 1);
      row.splice(to, 0, cell!);
    }
    if (model.columnOrigins) {
      const [origin] = model.columnOrigins.splice(from, 1);
      model.columnOrigins.splice(to, 0, origin);
    }
    return to;
  }

  function insertColumnAfter(model: MarkdownTableModel, columnIndex: number): number {
    const insertAt = Math.max(0, Math.min(columnIndex + 1, model.rows[0].length));
    model.rows.forEach((row, rowIndex) => row.splice(insertAt, 0, rowIndex === 1 ? "---" : ""));
    model.columnOrigins?.splice(insertAt, 0, undefined);
    return insertAt;
  }

  function deleteColumn(model: MarkdownTableModel, columnIndex: number): number | undefined {
    if (model.rows[0].length <= 1) return undefined;
    const deleteAt = Math.max(0, Math.min(columnIndex, model.rows[0].length - 1));
    model.rows.forEach((row) => row.splice(deleteAt, 1));
    model.columnOrigins?.splice(deleteAt, 1);
    return Math.min(deleteAt, model.rows[0].length - 1);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-117
  /**
   * The model as an HTML `<table>`: the first row in `<thead>`, the rows after the delimiter row
   * in `<tbody>`, the delimiter's colons as `align` attributes. Cell text is kept as text: only
   * `&`, `<` and `>` are escaped and an escaped pipe becomes `|`, so inline Markdown stays as typed.
   */
  function toHtmlTable(model: MarkdownTableModel): string {
    const escapeText = (text: string): string => {
      let out = "";
      for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (character === "\\" && text[index + 1] === "|") {
          out += "|";
          index += 1;
        } else if (character === "\\" && index + 1 < text.length) {
          out += character + text[index + 1];
          index += 1;
        } else {
          out += character === "&" ? "&amp;" : character === "<" ? "&lt;" : character === ">" ? "&gt;" : character;
        }
      }
      return out;
    };
    const alignments = (model.rows[1] ?? []).map((cell) => {
      const mark = cell.replace(/\s/gu, "");
      const left = mark.startsWith(":");
      const right = mark.endsWith(":");
      return left && right ? "center" : right ? "right" : left ? "left" : "";
    });
    const row = (cells: string[], tag: string): string[] => [
      "    <tr>",
      ...cells.map((cell, column) => {
        const align = alignments[column] ? ` align="${alignments[column]}"` : "";
        return `      <${tag}${align}>${escapeText(cell)}</${tag}>`;
      }),
      "    </tr>",
    ];
    const lines = ["<table>", "  <thead>", ...row(model.rows[0] ?? [], "th"), "  </thead>"];
    const body = model.rows.slice(2);
    if (body.length > 0) {
      lines.push("  <tbody>", ...body.flatMap((cells) => row(cells, "td")), "  </tbody>");
    }
    lines.push("</table>");
    return lines.join("\n");
  }

  const { detectTable, convertTable } = createTableConversionTools({ parse, escapeCellPipes });

  return {
    ...createTableStructureTools({ parse, convertTable, serializePipe }),
    parse,
    serialize,
    toHtmlTable,
    detectTable,
    convertTable,
    insertRowAfter,
    deleteRow,
    moveRow,
    moveListTableRow,
    moveListTableColumn,
    moveColumn,
    insertColumnAfter,
    deleteColumn,
    cellSegments,
  };
}
