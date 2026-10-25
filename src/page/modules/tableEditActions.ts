/**
 * The table edit actions of the palette: insert a pipe table, convert the table under the caret
 * (pipe, `{list-table}`, HTML), align a column and add a caption. `tableTools` is the Markdown
 * table parser and HTML writer; without it the actions that read a table refuse.
 */

import { COLUMN_ALIGNMENTS } from "../../core/palette/paletteActions";
import { insertBlockAfterSelection, insertBlockAt, validSelection } from "./editActionHelpers";
import type { EditActionContext } from "./editActions";
import type { MarkdownTableTools } from "./markdownTable";
import type { TextEdit } from "./textEditing";

/** The table actions bound to the page's table tools. */
export function createTableEditActions(tableTools: MarkdownTableTools | undefined) {
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-106
  /** A table of `rows` x `cols` (the header counts as a row) set apart by blank lines. */
  function insertTable(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const size = /^([1-9])x([1-9])$/u.exec(ctx.arg ?? "");
    if (!size) return undefined;
    const rows = Number(size[1]);
    const cols = Number(size[2]);
    const row = (cell: (column: number) => string): string =>
      "| " + Array.from({ length: cols }, (_, column) => cell(column)).join(" | ") + " |";
    const header = row((column) => "Column " + (column + 1));
    const lines = [header, row(() => "---")];
    for (let index = 1; index < rows; index += 1) lines.push(row(() => ""));
    // The table goes after the selection, which stays untouched.
    return insertBlockAfterSelection(ctx, lines.join("\n"), "Column 1");
  }

  /**
   * The pipe table the caret is in (or at the end of): its text range, parsed model, lines and
   * the caret's line. The table is the run of non-blank lines around the caret, started at the
   * first line from which the rest parses as a table.
   */
  function tableAtCaret(ctx: EditActionContext) {
    const tools = tableTools;
    if (!tools) return undefined;
    const { value } = ctx;
    // The run of non-blank lines around the caret, with the offset of each line.
    const caretLineStart = value.lastIndexOf("\n", ctx.selectionStart - 1) + 1;
    const offsets: number[] = [];
    const rows: string[] = [];
    let from = caretLineStart;
    while (from > 0) {
      const previous = value.lastIndexOf("\n", from - 2) + 1;
      if (value.slice(previous, from - 1).trim() === "") break;
      from = previous;
    }
    for (let offset = from; offset <= value.length;) {
      const lineEnd = value.indexOf("\n", offset) === -1 ? value.length : value.indexOf("\n", offset);
      const line = value.slice(offset, lineEnd);
      if (line.trim() === "") break;
      offsets.push(offset);
      rows.push(line);
      offset = lineEnd + 1;
    }
    for (let first = 0; first < rows.length && offsets[first] <= caretLineStart; first += 1) {
      const model = tools.parse(rows.slice(first).join("\n"));
      if (!model) continue;
      return {
        model,
        start: offsets[first],
        end: offsets[rows.length - 1] + rows[rows.length - 1].length,
        lines: rows.slice(first),
        lineOffsets: offsets.slice(first),
        caretLine: offsets.indexOf(caretLineStart) - first,
        caretLineStart,
      };
    }
    return undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-117
  /**
   * With the caret in a pipe table, replaces that table's lines with an HTML `<table>`; anywhere
   * else (or without table tools) inserts a new 2 x 2 HTML table after the selection.
   */
  function htmlTable(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const found = tableAtCaret(ctx);
    if (found && tableTools) {
      const text = tableTools.toHtmlTable(found.model);
      return {
        start: found.start,
        end: found.end,
        text,
        selectionStart: found.start + text.length,
        selectionEnd: found.start + text.length,
      };
    }
    const body = [
      "<table>", "  <thead>", "    <tr>", "      <th>Column 1</th>", "      <th>Column 2</th>",
      "    </tr>", "  </thead>", "  <tbody>", "    <tr>", "      <td></td>", "      <td></td>",
      "    </tr>", "  </tbody>", "</table>",
    ].join("\n");
    return insertBlockAfterSelection(ctx, body, "Column 1");
  }

  /**
   * The table around the caret in any form the conversion reads, as the text range to replace: a
   * `{list-table}` directive (its fences included), an HTML `<table>` block or a pipe table.
   */
  function anyTableAtCaret(ctx: EditActionContext): { start: number; end: number; text: string } | undefined {
    if (!tableTools) return undefined;
    const { value } = ctx;
    const lines = value.split("\n");
    const offsets: number[] = [];
    let running = 0;
    for (const line of lines) {
      offsets.push(running);
      running += line.length + 1;
    }
    const caretLine = Math.max(0, value.slice(0, ctx.selectionStart).split("\n").length - 1);
    const rangeOf = (first: number, last: number) => ({
      start: offsets[first],
      end: offsets[last] + lines[last].length,
      text: value.slice(offsets[first], offsets[last] + lines[last].length),
    });
    // A `{list-table}` directive: the nearest opener at or above the caret whose closing fence is
    // at or below it.
    for (let first = caretLine; first >= 0; first -= 1) {
      const opener = /^([ \t]*)(`{3,}|~{3,}|:{3,})\{list-table\}/u.exec(lines[first]);
      if (!opener) continue;
      for (let last = first + 1; last < lines.length; last += 1) {
        const text = lines[last].trim();
        if (text.length >= opener[2].length && text === opener[2][0].repeat(text.length)) {
          if (last >= caretLine) return rangeOf(first, last);
          break;
        }
      }
    }
    // An HTML table: its `<table` line at or above the caret to its `</table>` line below.
    let first = caretLine;
    while (first >= 0 && lines[first].trim() !== "" && !/^\s*<table[\s>]/iu.test(lines[first])) first -= 1;
    if (first >= 0 && /^\s*<table[\s>]/iu.test(lines[first])) {
      for (let last = first; last < lines.length && lines[last].trim() !== ""; last += 1) {
        if (/<\/table\s*>\s*$/iu.test(lines[last])) {
          if (last >= caretLine) return rangeOf(first, last);
          break;
        }
      }
    }
    const pipe = tableAtCaret(ctx);
    return pipe ? { start: pipe.start, end: pipe.end, text: value.slice(pipe.start, pipe.end) } : undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-073
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-074
  /** The conversion of the table at the caret to `target`, or the reason it cannot be done. */
  function convertTableAtCaret(
    ctx: EditActionContext, target: "pipe" | "list-table",
  ): { edit?: TextEdit; reason?: string } {
    if (!validSelection(ctx) || !tableTools) return {};
    const found = anyTableAtCaret(ctx);
    if (!found) return {};
    const result = tableTools.convertTable(found.text, target);
    if (!result) return {};
    if (!result.ok) return { reason: result.reason };
    const end = found.start + result.text.length;
    return {
      edit: { start: found.start, end: found.end, text: result.text, selectionStart: end, selectionEnd: end },
    };
  }

  /** Shown for the table-conversion buttons while the caret is in a table of another form. */
  function tableKindAt(ctx: EditActionContext): "pipe" | "list-table" | "html" | undefined {
    if (!validSelection(ctx) || !tableTools) return undefined;
    const found = anyTableAtCaret(ctx);
    return found ? tableTools.detectTable(found.text) : undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-111
  /**
   * Sets the alignment of the table column the caret is in, rewriting only that cell of the
   * delimiter row (`:---`, `:---:`, `---:`): the cell keeps its padding and, when the colons need
   * room, takes it from the trailing spaces. Outside a pipe table nothing happens.
   */
  function alignColumn(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    if (ctx.arg === undefined || !COLUMN_ALIGNMENTS.includes(ctx.arg)) return undefined;
    const found = tableAtCaret(ctx);
    const tools = tableTools;
    if (!found || !tools || found.caretLine < 0) return undefined;
    const caretSegments = tools.cellSegments(found.lines[found.caretLine]);
    const offset = ctx.selectionStart - found.caretLineStart;
    let column = caretSegments.findIndex((segment) => offset <= segment.end);
    if (column === -1) column = caretSegments.length - 1;
    const delimiter = found.lines[1];
    const segments = tools.cellSegments(delimiter);
    const segment = segments[Math.min(column, segments.length - 1)];
    const cell = delimiter.slice(segment.start, segment.end);
    const lead = /^\s*/u.exec(cell)![0];
    const core = cell.trim();
    const tail = cell.slice(lead.length + core.length);
    const colons = ctx.arg === "center" ? 2 : 1;
    const dashes = Math.max(3, core.length - colons);
    const next = (ctx.arg === "left" || ctx.arg === "center" ? ":" : "")
      + "-".repeat(dashes) + (ctx.arg === "right" || ctx.arg === "center" ? ":" : "");
    if (next === core) return undefined;
    // Growth comes out of the trailing spaces, keeping at least one when there was one.
    const grow = next.length - core.length;
    const padding = tail === "" ? "" : " ".repeat(Math.max(1, tail.length - Math.max(0, grow)));
    const start = found.lineOffsets[1] + segment.start + lead.length;
    const end = found.lineOffsets[1] + segment.end;
    const shift = next.length + padding.length - core.length - tail.length;
    const mapped = (position: number): number => (position >= end ? position + shift : position);
    return {
      start,
      end,
      text: next + padding,
      selectionStart: mapped(ctx.selectionStart),
      selectionEnd: mapped(ctx.selectionEnd),
    };
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-115
  /**
   * Wraps the pipe table at the caret in `:::{table} Caption` (the caption selected), or inserts a
   * new 2 x 2 captioned table. A table that is already inside a `{table}` directive is left alone.
   */
  function tableCaption(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    // Inside a `{table}` directive: its opener comes before the caret with no closing fence between.
    const above = ctx.value.slice(0, ctx.selectionStart).split("\n");
    for (let index = above.length - 1; index >= 0; index -= 1) {
      if (/^\s*:{3,}\{table\}/u.test(above[index])) return undefined;
      if (/^\s*:{3,}\s*$/u.test(above[index])) break;
    }
    const found = tableAtCaret(ctx);
    const head = ":".repeat(3) + "{table} Caption\n\n";
    if (found) {
      const text = head + ctx.value.slice(found.start, found.end) + "\n" + ":".repeat(3);
      return {
        start: found.start, end: found.end, text,
        selectionStart: found.start + head.indexOf("Caption"),
        selectionEnd: found.start + head.indexOf("Caption") + 7,
      };
    }
    const body = head + "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n" + ":".repeat(3);
    return insertBlockAt(ctx, body, head.indexOf("Caption"), 7);
  }

  return { insertTable, htmlTable, convertTableAtCaret, tableKindAt, alignColumn, tableCaption };
}
