import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  bufferText,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

// The second table of the QA 271 fixture synth/c5-reading.md, alone in a short document.
const TABLE_TAB_ROW_DOCUMENT = [
  "# Tab row",
  "",
  "## Second",
  "",
  "| Key | Value |",
  "| --- | --- |",
  "| one | 1 |",
  "| two | 2 |",
  "| three | 3 |",
  "",
].join("\n");

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";
const HINT = "[data-sphinx-preview-table-cell-hint]";

/**
 * QA271-13: the last cell shows the hint "Tab: new row"; Tab adds a row; Escape in the new row,
 * still empty, removes it so the buffer equals the one before the Tab; one undo from the source
 * gives the empty row back (the removal is its own undo step), a second one undoes the Tab.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-025
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-035
 */
export async function scenarioTableTabRow(page: Page): Promise<void> {
  await withDocument("realinput-table-tab-row", TABLE_TAB_ROW_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const editorClosed = async (): Promise<boolean> => {
      const frame = await findCurrentFrame(page);
      return frame !== undefined && await frame.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    };

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^3$/u }).click());
    await waitForEditor(page, CELL);
    await waitFor("the hint Tab: new row in the last cell", async () => {
      const frame = await findCurrentFrame(page);
      return frame !== undefined && (await frame.locator(HINT).allTextContents()).join() === "Tab: new row";
    });
    const mark = bufferText(document);
    assert.equal(mark, TABLE_TAB_ROW_DOCUMENT);

    await press(page, "Tab");
    await waitFor("the buffer to gain one row", () =>
      bufferText(document).split("\n").length === mark.split("\n").length + 1);
    const withRow = bufferText(document);
    await waitForRender(document);
    await waitFor("the cell editor to reopen in the new row", async () => {
      const frame = await findCurrentFrame(page);
      return frame !== undefined && await frame.locator(CELL).count() === 1
        && await frame.locator(HINT).count() === 0;
    });

    await press(page, "Escape");
    await waitFor("the cell editor to close after Escape", editorClosed);
    await waitFor("the buffer to equal the buffer before the Tab", () => bufferText(document) === mark);

    // The removal is its own undo step: one undo gives the empty row back, a second one undoes the Tab.
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    await waitFor("the first undo to give the empty row back", () => bufferText(document) === withRow);
    await vscode.commands.executeCommand("undo");
    await waitFor("the second undo to undo the Tab", () => bufferText(document) === mark);
  });
}
