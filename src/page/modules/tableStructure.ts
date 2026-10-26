/**
 * The structural edits of a pipe table model that insert before the selection (row above, column
 * to the left), and the model of a plain `{list-table}` so the same buttons work on it. They are
 * bound to the parser, the converter and the pipe writer of `markdownTable.ts`.
 */

import type { MarkdownTableModel, TableConversion } from "./markdownTable";

interface TableStructureDeps {
  parse: (source: string) => MarkdownTableModel | undefined;
  convertTable: (source: string, target: "pipe" | "list-table") => TableConversion | undefined;
  serializePipe: (model: MarkdownTableModel) => string;
}

const HEADER_ROWS_ONE = /^:header-rows:[ \t]+1[ \t]*$/u;

export function createTableStructureTools({ parse, convertTable, serializePipe }: TableStructureDeps) {
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-003
  /**
   * Inserts an empty body row above the body row at rendered index `renderedRowIndex` (the header
   * has no row above it). Returns the rendered index of the new row, or undefined when refused.
   */
  function insertRowBefore(model: MarkdownTableModel, renderedRowIndex: number): number | undefined {
    if (!Number.isInteger(renderedRowIndex) || renderedRowIndex < 1 || renderedRowIndex > model.rows.length - 2) {
      return undefined;
    }
    const rowIndex = renderedRowIndex + 1;
    model.rows.splice(rowIndex, 0, Array(model.rows[0].length).fill(""));
    model.rowOrigins?.splice(rowIndex, 0, undefined);
    return renderedRowIndex;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-004
  /** Inserts an empty column to the left of `columnIndex`; returns the index of the new column. */
  function insertColumnBefore(model: MarkdownTableModel, columnIndex: number): number {
    const insertAt = Math.max(0, Math.min(columnIndex, model.rows[0].length));
    model.rows.forEach((row, rowIndex) => row.splice(insertAt, 0, rowIndex === 1 ? "---" : ""));
    model.columnOrigins?.splice(insertAt, 0, undefined);
    return insertAt;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-005
  /**
   * The grid of the plain `{list-table}` `source` as a table model whose `serialize` writes a
   * list-table again (the source itself while the grid is untouched): one header row, one-line
   * cells, no title, label or option other than `:header-rows: 1`, no indentation. Any other
   * list-table has no model and is edited as text.
   */
  function parseListTable(source: string): MarkdownTableModel | undefined {
    const lines = source.replace(/(?:\r\n|\r|\n)+$/u, "").split(/\r\n|\r|\n/u);
    if (!/^(`{3,}|~{3,}|:{3,})\{list-table\}[ \t]*$/u.test(lines[0] ?? "")) return undefined;
    const options = lines.slice(1).filter((line) => /^:[\w-]+:/u.test(line));
    if (options.length !== 1 || !HEADER_ROWS_ONE.test(options[0])) return undefined;
    const converted = convertTable(source, "pipe");
    if (!converted || !converted.ok) return undefined;
    const model = parse(converted.text);
    if (!model) return undefined;
    const baseline = serializePipe(model);
    model.listTable = {
      write: (pipeText) => {
        if (pipeText === baseline) return source;
        const list = convertTable(pipeText, "list-table");
        return list && list.ok ? list.text : source;
      },
    };
    return model;
  }

  return { insertRowBefore, insertColumnBefore, parseListTable };
}
