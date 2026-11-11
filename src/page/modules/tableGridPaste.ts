/**
 * A spreadsheet paste into a table cell: the pasted text (tab-separated values) is read as a grid
 * and written into the table model from the open cell, rightwards and downwards, adding the
 * columns and rows the table lacks. Pure: the cell editor saves the model once afterwards.
 */

import type { MarkdownTableModel, MarkdownTableTools } from "./markdownTable";

/** The table model row of a rendered row: the model also holds the delimiter row after the header. */
function modelRowOf(renderedRow: number): number {
  return renderedRow === 0 ? 0 : renderedRow + 1;
}

/**
 * The grid of a spreadsheet paste, or undefined when the text is not one: after one final line
 * break is removed, a grid paste holds at least one tab. Values are trimmed of surrounding spaces;
 * there is no quote handling.
 */
// @implements_req SwRS-MDOKFSTUDIO-TABLE-120
export function spreadsheetGrid(text: string): string[][] | undefined {
  const body = text.replace(/(?:\r\n|\r|\n)$/u, "");
  if (!body.includes("\t")) return undefined;
  return body.split(/\r\n|\r|\n/u).map((line) => line.split("\t").map((value) => value.replace(/^ +| +$/gu, "")));
}

/**
 * Writes `grid` into `model` from the cell at rendered row `startRenderedRow` and column
 * `startColumn`. Missing columns are added at the right end and missing rows at the end of the
 * table; the delimiter row is never written; cells outside the grid keep their text.
 */
// @implements_req SwRS-MDOKFSTUDIO-TABLE-120
export function fillGrid(model: MarkdownTableModel, tools: Pick<MarkdownTableTools, "insertRowAfter" | "insertColumnAfter">,
  startRenderedRow: number, startColumn: number, grid: string[][]): void {
  const width = Math.max(0, ...grid.map((line) => line.length));
  while (model.rows[0]!.length < startColumn + width) {
    tools.insertColumnAfter(model, model.rows[0]!.length - 1);
  }
  const lastRenderedRow = startRenderedRow + grid.length - 1;
  while (model.rows.length - 2 < lastRenderedRow) {
    tools.insertRowAfter(model, model.rows.length - 2);
  }
  grid.forEach((line, offset) => {
    const row = model.rows[modelRowOf(startRenderedRow + offset)]!;
    line.forEach((value, index) => {
      row[startColumn + index] = value;
    });
  });
}
