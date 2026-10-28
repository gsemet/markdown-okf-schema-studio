/**
 * Real-window scenario of CR 114: every structural button of the table bar (row above and below,
 * row delete, column left and right, column delete) on a pipe table and on a `{list-table}`. A
 * press saves the table and the page renders it again: the buffer holds the new table, the titles
 * and cells that were there are untouched, and the editor reopens in the cell the press selects.
 */
import * as assert from "node:assert/strict";
import type { Page } from "playwright-core";
import * as vscode from "vscode";

import {
  bufferText,
  closeAllEditors,
  createFixture,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./realInput/harness";

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

const PIPE_TABLE = ["| Name | Value |", "| --- | --- |", "| one | 1 |", "| two | 2 |"];
const LIST_TABLE = [
  "```{list-table}", ":header-rows: 1", "", "* - Item", "  - Qty", "* - bolt", "  - 4", "* - nut", "  - 6", "```",
];

/** The document text: the pipe table, then the list-table, each between blank lines. */
const SOURCE = ["# Structure", "", ...PIPE_TABLE, "", ...LIST_TABLE, ""].join("\n");

/** The cells of the rows of the pipe table in the buffer, one array of trimmed cells per line. */
function pipeRows(text: string): string[][] {
  return text.split("\n").filter((line) => line.startsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

/** The cells of the list-table in the buffer, one array per row. */
function listRows(text: string): string[][] {
  const body = text.split("\n").filter((line) => /^(\* -|  -)/u.test(line));
  const rows: string[][] = [];
  for (const line of body) {
    const cell = line.replace(/^(\* -|  -)\s?/u, "");
    if (line.startsWith("* -")) rows.push([cell]);
    else rows[rows.length - 1].push(cell);
  }
  return rows;
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-064
export async function scenarioTableStructure(page: Page): Promise<void> {
  const fixture = createFixture("realinput-t114", { "structure.md": SOURCE });
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("structure.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);

      const editorCount = async (): Promise<number> => {
        const current = await findCurrentFrame(page);
        return current === undefined ? -1 : await current.locator("[data-sphinx-preview-table-cell-editor]").count();
      };
      /**
       * Presses the button named `label` of the table bar, from the cell at `selector` (opened
       * first) or, with no selector, from the editor the last press reopened; waits for the buffer
       * to satisfy `expected` and for the editor to reopen in the cell at `reopened`.
       */
      const pressButton = async (
        selector: string | undefined, label: string, expected: (text: string) => boolean, reopened: string,
      ): Promise<void> => {
        if (selector !== undefined) {
          if (await editorCount() > 0) {
            await press(page, "Escape");
            await waitFor("the cell editor to close", async () => await editorCount() === 0);
          }
          await withCurrentFrame(page, (frame) => frame.locator(selector).click());
          await waitForEditor(page, CELL);
        }
        await withCurrentFrame(page, (frame) => frame.locator(`[data-sphinx-table-operation="${label}"]`).click());
        await waitFor(`"${label}" to reach the source buffer`, () => expected(bufferText(document)));
        await waitForRender(document);
        await waitFor(`the editor to reopen in ${reopened} after "${label}"`, async () => {
          const current = await findCurrentFrame(page);
          return current !== undefined && await current.locator(`${reopened} >> ${CELL}`).count() === 1;
        });
      };
      const pipe = (text: string): string[][] => pipeRows(text);
      const list = (text: string): string[][] => listRows(text);
      /** The cell at rendered row `row` (the header is 0) and column `column` of table number `table`. */
      const cell = (table: number, row: number, column: number): string =>
        `table >> nth=${table} >> tr >> nth=${row} >> :is(th, td) >> nth=${column}`;
      const BEFORE_COLUMN = "Insert column before selected column";
      const AFTER_COLUMN = "Insert column after selected column";
      const BEFORE_ROW = "Insert row before selected row";
      const AFTER_ROW = "Insert row after selected row";
      const empty = (row: string[] | undefined): boolean => row !== undefined && row.every((value) => value === "");

      // A press reopens the editor in the new cell, so the next press starts from it; an empty cell
      // is too narrow to click, and is never clicked.
      // Pipe table. Columns: Col left on `Value`, Col right on `Name`, Col delete twice.
      await pressButton(cell(0, 0, 1), BEFORE_COLUMN,
        (text) => pipe(text)[0]?.join("|") === "Name||Value", cell(0, 0, 1));
      await pressButton(cell(0, 0, 0), AFTER_COLUMN,
        (text) => pipe(text)[0]?.join("|") === "Name|||Value", cell(0, 0, 1));
      await pressButton(undefined, "Delete selected column",
        (text) => pipe(text)[0]?.join("|") === "Name||Value", cell(0, 0, 1));
      await pressButton(undefined, "Delete selected column",
        (text) => pipe(text)[0]?.join("|") === "Name|Value", cell(0, 0, 1));
      // Rows: Row above `two`, Row delete, Row below `one`, Row delete.
      await pressButton(cell(0, 2, 0), BEFORE_ROW,
        (text) => pipe(text).length === 5 && empty(pipe(text)[3]) && pipe(text)[4][0] === "two", cell(0, 2, 0));
      await pressButton(undefined, "Delete selected row",
        (text) => pipe(text).length === 4 && pipe(text)[2][0] === "one" && pipe(text)[3][0] === "two", cell(0, 2, 0));
      await pressButton(cell(0, 1, 0), AFTER_ROW,
        (text) => pipe(text).length === 5 && pipe(text)[2][0] === "one" && empty(pipe(text)[3]), cell(0, 2, 0));
      await pressButton(undefined, "Delete selected row",
        (text) => pipe(text).length === 4 && pipe(text)[3][0] === "two", cell(0, 2, 0));

      // List-table: the same buttons write a list-table back.
      await pressButton(cell(1, 0, 1), BEFORE_COLUMN,
        (text) => list(text)[0]?.join("|") === "Item||Qty", cell(1, 0, 1));
      await pressButton(cell(1, 0, 0), AFTER_COLUMN,
        (text) => list(text)[0]?.join("|") === "Item|||Qty", cell(1, 0, 1));
      await pressButton(undefined, "Delete selected column",
        (text) => list(text)[0]?.join("|") === "Item||Qty", cell(1, 0, 1));
      await pressButton(undefined, "Delete selected column",
        (text) => list(text)[0]?.join("|") === "Item|Qty", cell(1, 0, 1));
      await pressButton(cell(1, 2, 0), BEFORE_ROW,
        (text) => list(text).length === 4 && empty(list(text)[2]) && list(text)[3][0] === "nut", cell(1, 2, 0));
      await pressButton(undefined, "Delete selected row",
        (text) => list(text).length === 3 && list(text)[1][0] === "bolt" && list(text)[2][0] === "nut", cell(1, 2, 0));
      await pressButton(cell(1, 1, 0), AFTER_ROW,
        (text) => list(text).length === 4 && list(text)[1][0] === "bolt" && empty(list(text)[2]), cell(1, 2, 0));
      await pressButton(undefined, "Delete selected row",
        (text) => list(text).length === 3 && list(text)[2][0] === "nut", cell(1, 2, 0));
      if (await editorCount() > 0) await press(page, "Escape");
      assert.match(bufferText(document), /^```\{list-table\}\n:header-rows: 1\n/mu);
      assert.deepEqual(pipe(bufferText(document)), [["Name", "Value"], ["---", "---"], ["one", "1"], ["two", "2"]]);
    } finally {
      const frame = await findCurrentFrame(page);
      if (frame !== undefined) await setEditMode(page, false);
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}
