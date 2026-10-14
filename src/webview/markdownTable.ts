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
  /** Set by column operations; those rewrite every line in the canonical style. */
  columnsChanged?: boolean;
}

export function createMarkdownTableTools() {
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
    let codeTicks = 0;
    for (let index = start; index < end; index += 1) {
      const character = text[index];
      if (character === "\\" && index + 1 < end) {
        cell += character + text[index + 1];
        index += 1;
      } else if (character === "`") {
        let runLength = 1;
        while (text[index + runLength] === "`") runLength += 1;
        cell += "`".repeat(runLength);
        if (codeTicks === 0) codeTicks = runLength;
        else if (codeTicks === runLength) codeTicks = 0;
        index += runLength - 1;
      } else if (character === "|" && codeTicks === 0) {
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
    let codeTicks = 0;
    for (let index = start; index < end; index += 1) {
      const character = text[index];
      if (character === "\\" && index + 1 < end) {
        index += 1;
      } else if (character === "`") {
        let runLength = 1;
        while (text[index + runLength] === "`") runLength += 1;
        if (codeTicks === 0) codeTicks = runLength;
        else if (codeTicks === runLength) codeTicks = 0;
        index += runLength - 1;
      } else if (character === "|" && codeTicks === 0) {
        segments.push({ start: segmentStart + offset, end: index + offset });
        segmentStart = index + 1;
      }
    }
    segments.push({ start: segmentStart + offset, end: end + offset });
    return segments;
  }

  function escapeCellPipes(value: string): string {
    let result = "";
    let codeTicks = 0;
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (character === "\\" && index + 1 < value.length) {
        result += character + value[index + 1];
        index += 1;
      } else if (character === "`") {
        let runLength = 1;
        while (value[index + runLength] === "`") runLength += 1;
        result += "`".repeat(runLength);
        if (codeTicks === 0) codeTicks = runLength;
        else if (codeTicks === runLength) codeTicks = 0;
        index += runLength - 1;
      } else {
        result += character === "|" && codeTicks === 0 ? "\\|" : character;
      }
    }
    return result;
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
      const text = line.slice(segment.start, segment.end);
      // A whitespace-only segment keeps one leading space, so the value is not right-aligned.
      const leading = text.trim() === ""
        ? (text.length > 0 ? " " : "")
        : (/^\s*/u.exec(text)?.[0] ?? "");
      const value = escapeCellPipes(newCells[index]);
      const trailing = /\s$/u.test(text)
        ? " ".repeat(Math.max(1, text.length - leading.length - value.length))
        : "";
      result = result.slice(0, segment.start) + leading + value + trailing + result.slice(segment.end);
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
    };
  }

  function serialize(model: MarkdownTableModel): string {
    if (
      !model.sourceLines
      || !model.sourceRows
      || !model.rowOrigins
      || model.columnsChanged === true
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
    const lines = model.rows.map((row, rowIndex) => {
      const origin = rowOrigins[rowIndex];
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

  function insertColumnAfter(model: MarkdownTableModel, columnIndex: number): number {
    const insertAt = Math.max(0, Math.min(columnIndex + 1, model.rows[0].length));
    model.rows.forEach((row, rowIndex) => row.splice(insertAt, 0, rowIndex === 1 ? "---" : ""));
    model.columnsChanged = true;
    return insertAt;
  }

  function deleteColumn(model: MarkdownTableModel, columnIndex: number): number | undefined {
    if (model.rows[0].length <= 1) return undefined;
    const deleteAt = Math.max(0, Math.min(columnIndex, model.rows[0].length - 1));
    model.rows.forEach((row) => row.splice(deleteAt, 1));
    model.columnsChanged = true;
    return Math.min(deleteAt, model.rows[0].length - 1);
  }

  return {
    parse,
    serialize,
    insertRowAfter,
    deleteRow,
    insertColumnAfter,
    deleteColumn,
    cellSegments,
  };
}
