/**
 * The conversions between the forms of one whole table: pipe table, `{list-table}` directive and
 * HTML table. They are bound to the pipe-table parser and the pipe escape of `markdownTable.ts`.
 */

import type { MarkdownTableModel, TableConversion, TableKind } from "./markdownTable";

/**
 * A table independent of its Markdown form. Cells are in pipe-table form (a literal pipe is `\|`);
 * `aligns` has one of `left`, `center`, `right` or `""` per column and may be empty.
 */
interface TableGrid {
  rows: string[][];
  headerRows: number;
  aligns: string[];
  lineEnding: string;
  trailingLineEnding: boolean;
}

type GridResult = { ok: true; grid: TableGrid } | { ok: false; reason: string };

interface TableConversionDeps {
  parse: (source: string) => MarkdownTableModel | undefined;
  escapeCellPipes: (value: string) => string;
}

export function createTableConversionTools({ parse, escapeCellPipes }: TableConversionDeps) {
  const LIST_TABLE_OPEN = /^([ \t]*)(`{3,}|~{3,}|:{3,})\{list-table\}[ \t]*(.*?)\s*$/u;

  function lineEndingOf(source: string): string {
    return /\r\n|\r|\n/u.exec(source)?.[0] ?? "\n";
  }

  /** `\|` written as a plain pipe (list-table and HTML cells have no pipe escape). */
  function unescapePipes(cell: string): string {
    let out = "";
    for (let index = 0; index < cell.length; index += 1) {
      if (cell[index] === "\\" && index + 1 < cell.length) {
        out += cell[index + 1] === "|" ? "|" : cell[index] + cell[index + 1];
        index += 1;
      } else {
        out += cell[index];
      }
    }
    return out;
  }

  /** The form of the table `source` holds: a list-table directive, an HTML table or a pipe table. */
  function detectTable(source: string): TableKind | undefined {
    const text = source.trim();
    if (text === "") return undefined;
    if (LIST_TABLE_OPEN.test(text.split(/\r\n|\r|\n/u)[0])) return "list-table";
    if (/^<table[\s>]/iu.test(text) && /<\/table\s*>$/iu.test(text)) return "html";
    return parse(source) ? "pipe" : undefined;
  }

  function pipeGrid(source: string): GridResult {
    const model = parse(source);
    if (!model) return { ok: false, reason: "This is not a pipe table." };
    const aligns = model.rows[1].map((cell) => {
      const mark = cell.replace(/\s/gu, "");
      const left = mark.startsWith(":");
      const right = mark.endsWith(":");
      return left && right ? "center" : right ? "right" : left ? "left" : "";
    });
    return {
      ok: true,
      grid: {
        rows: [model.rows[0], ...model.rows.slice(2)],
        headerRows: 1,
        aligns,
        lineEnding: model.lineEnding,
        trailingLineEnding: model.trailingLineEnding,
      },
    };
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-076
  function listTableGrid(source: string): GridResult {
    const lineEnding = lineEndingOf(source);
    const trailingLineEnding = /(?:\r\n|\r|\n)$/u.test(source);
    const lines = source.split(/\r\n|\r|\n/u);
    while (lines.length > 0 && lines[0].trim() === "") lines.shift();
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
    const opener = lines.length > 0 ? LIST_TABLE_OPEN.exec(lines[0]) : null;
    if (!opener) return { ok: false, reason: "This is not a list-table." };
    const indent = opener[1].length;
    const fence = opener[2];
    const last = lines[lines.length - 1].trim();
    const closed = lines.length > 1 && last.length >= fence.length
      && last === fence[0].repeat(last.length);
    const body = lines.slice(1, closed ? lines.length - 1 : lines.length)
      .map((line) => line.slice(Math.min(indent, line.length - line.trimStart().length)));
    if (opener[3] !== "") {
      return { ok: false, reason: "The list-table title would be lost in a pipe table. Nothing was changed." };
    }
    if (body.length > 0 && body[0].trim() === "---") {
      return { ok: false, reason: "A list-table with YAML options cannot be converted. Nothing was changed." };
    }
    const options: Record<string, string> = {};
    let index = 0;
    for (; index < body.length; index += 1) {
      const option = /^:([\w-]+):(?:[ \t]+(.*))?$/u.exec(body[index]);
      if (!option) break;
      options[option[1]] = (option[2] ?? "").trim();
    }
    if ("name" in options || "label" in options) {
      return { ok: false, reason: "The list-table label (:name:) would be lost in a pipe table. Nothing was changed." };
    }
    const headerRows = options["header-rows"] === undefined ? 0 : Number(options["header-rows"]);
    if (!Number.isInteger(headerRows) || headerRows < 0) {
      return { ok: false, reason: "The :header-rows: option is not a number. Nothing was changed." };
    }
    const several = {
      ok: false as const,
      reason: "A list-table cell with several lines or block content cannot be a pipe table cell. Nothing was changed.",
    };
    const rows: string[][] = [];
    let innerIndent = -1;
    for (; index < body.length; index += 1) {
      const line = body[index];
      if (line.trim() === "") continue;
      const start = /^([*+-])([ \t]+)([*+-])(?:[ \t]+(.*))?$/u.exec(line);
      if (start) {
        if (innerIndent === -1) innerIndent = 1 + start[2].length;
        rows.push([(start[4] ?? "").trim()]);
        continue;
      }
      const cell = /^([ \t]+)([*+-])(?:[ \t]+(.*))?$/u.exec(line);
      if (rows.length > 0 && cell && cell[1].length === innerIndent) {
        rows[rows.length - 1].push((cell[3] ?? "").trim());
        continue;
      }
      return rows.length > 0 && /^[ \t]/u.test(line)
        ? several
        : { ok: false, reason: "This list-table cannot be read as rows of cells. Nothing was changed." };
    }
    if (rows.length === 0) return { ok: false, reason: "The list-table has no rows. Nothing was changed." };
    if (rows.some((row) => row.length !== rows[0].length)) {
      return { ok: false, reason: "The rows do not all have the same number of cells. Nothing was changed." };
    }
    return {
      ok: true,
      grid: {
        rows: rows.map((row) => row.map((cell) => escapeCellPipes(cell))),
        headerRows: Math.min(headerRows, rows.length),
        aligns: [],
        lineEnding,
        trailingLineEnding,
      },
    };
  }

  /** A strict reader of the HTML table `toHtmlTable` writes: no spans, attributes or inline markup. */
  function htmlGrid(source: string): GridResult {
    const refuse = (what: string): GridResult => ({
      ok: false,
      reason: `This HTML table has ${what}; only a simple table converts. Nothing was changed.`,
    });
    const lineEnding = lineEndingOf(source);
    const trailingLineEnding = /(?:\r\n|\r|\n)$/u.test(source);
    const text = source.trim();
    const decode = (value: string): string => value
      .replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, "\"")
      .replace(/&#39;/gu, "'").replace(/&amp;/gu, "&");
    const rows: string[][] = [];
    const allHeader: boolean[] = [];
    const inHeadRow: boolean[] = [];
    let aligns: string[] = [];
    let row: string[] | undefined;
    let rowHeader = true;
    let cellText: string | undefined;
    let cellAlign = "";
    let inHead = false;
    let sawTable = false;
    const token = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>|([^<]+)/gu;
    let position = 0;
    while (position < text.length) {
      token.lastIndex = position;
      const match = token.exec(text);
      if (!match || match.index !== position) return refuse("markup that is not a table");
      position = token.lastIndex;
      if (match[4] !== undefined) {
        if (cellText !== undefined) cellText += match[4];
        else if (match[4].trim() !== "") return refuse("text outside its cells");
        continue;
      }
      const closing = match[1] === "/";
      const tag = match[2].toLowerCase();
      const attributes = match[3].trim();
      if (cellText !== undefined && !(closing && (tag === "td" || tag === "th"))) {
        return refuse("markup inside a cell");
      }
      if (tag === "table") {
        if (attributes !== "") return refuse("table attributes");
        if (!closing) sawTable = true;
      } else if (tag === "thead" || tag === "tbody") {
        if (attributes !== "") return refuse("attributes");
        inHead = tag === "thead" && !closing;
      } else if (tag === "tr") {
        if (attributes !== "") return refuse("row attributes");
        if (closing) {
          if (!row) return refuse("a misplaced row");
          rows.push(row);
          allHeader.push(rowHeader);
          inHeadRow.push(inHead);
          row = undefined;
        } else {
          row = [];
          rowHeader = true;
        }
      } else if (tag === "td" || tag === "th") {
        if (closing) {
          if (cellText === undefined || !row) return refuse("a misplaced cell");
          row.push(escapeCellPipes(decode(cellText).replace(/\s+/gu, " ").trim()));
          if (tag === "td") rowHeader = false;
          if (rows.length === 0) aligns[row.length - 1] = cellAlign;
          cellText = undefined;
        } else {
          if (!row) return refuse("a misplaced cell");
          const align = /^align=(?:"(left|center|right)"|'(left|center|right)')$/u.exec(attributes);
          if (attributes !== "" && !align) return refuse("cell attributes (spans, classes or styles)");
          cellAlign = align ? align[1] ?? align[2] : "";
          cellText = "";
        }
      } else {
        return refuse(`a <${tag}> element`);
      }
    }
    if (!sawTable || rows.length === 0 || cellText !== undefined || row) {
      return refuse("an incomplete structure");
    }
    if (rows.some((cells) => cells.length !== rows[0].length)) {
      return { ok: false, reason: "The rows do not all have the same number of cells. Nothing was changed." };
    }
    let headerRows = 0;
    while (headerRows < rows.length && (inHeadRow[headerRows] || (!inHeadRow.some(Boolean) && allHeader[headerRows]))) {
      headerRows += 1;
    }
    return { ok: true, grid: { rows, headerRows, aligns, lineEnding, trailingLineEnding } };
  }

  function gridToPipe(grid: TableGrid): TableConversion {
    if (grid.headerRows > 1) {
      return {
        ok: false,
        reason: `A pipe table has one header row; this table has ${grid.headerRows}. Nothing was changed.`,
      };
    }
    const columns = grid.rows[0].length;
    const header = grid.headerRows === 1 ? grid.rows[0] : Array<string>(columns).fill("");
    const body = grid.headerRows === 1 ? grid.rows.slice(1) : grid.rows;
    const delimiter = Array.from({ length: columns }, (_, column) => {
      const align = grid.aligns[column] ?? "";
      return align === "center" ? ":---:" : align === "left" ? ":---" : align === "right" ? "---:" : "---";
    });
    const lines = [header, delimiter, ...body].map((cells) => `| ${cells.join(" | ")} |`);
    return {
      ok: true,
      text: lines.join(grid.lineEnding) + (grid.trailingLineEnding ? grid.lineEnding : ""),
    };
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-080
  function gridToListTable(grid: TableGrid): TableConversion {
    let ticks = 2;
    for (const row of grid.rows) {
      for (const cell of row) {
        for (const run of cell.match(/`+/gu) ?? []) ticks = Math.max(ticks, run.length);
      }
    }
    const fence = "`".repeat(ticks + 1);
    const lines = [`${fence}{list-table}`];
    if (grid.headerRows > 0) lines.push(`:header-rows: ${grid.headerRows}`);
    lines.push("");
    for (const row of grid.rows) {
      row.forEach((cell, column) => {
        const value = unescapePipes(cell);
        lines.push(`${column === 0 ? "* -" : "  -"}${value === "" ? "" : " " + value}`);
      });
    }
    lines.push(fence);
    return {
      ok: true,
      text: lines.join(grid.lineEnding) + (grid.trailingLineEnding ? grid.lineEnding : ""),
    };
  }

  /**
   * `source` (one whole table: pipe, HTML or `{list-table}`) written in the `target` form. Never
   * HTML. A conversion that would lose content (several-line or block cells, a title, a label,
   * several header rows to a pipe table) is refused with the reason. Column alignment and
   * `:widths:` / `:align:` are presentation: a list-table has no per-column alignment, so the
   * colons are dropped going to a list-table. `undefined`: `source` is no table.
   */
  function convertTable(source: string, target: "pipe" | "list-table"): TableConversion | undefined {
    const kind = detectTable(source);
    if (!kind) return undefined;
    if (kind === target) {
      return {
        ok: false,
        reason: target === "pipe" ? "This is already a pipe table." : "This is already a list-table.",
      };
    }
    const grid = kind === "pipe" ? pipeGrid(source) : kind === "list-table" ? listTableGrid(source) : htmlGrid(source);
    if (!grid.ok) return grid;
    return target === "pipe" ? gridToPipe(grid.grid) : gridToListTable(grid.grid);
  }

  return { detectTable, convertTable };
}
