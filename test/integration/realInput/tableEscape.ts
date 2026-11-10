import * as assert from "node:assert/strict";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  bufferText,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

const TABLE_ESCAPE_DOCUMENT = [
  "# Table escape",
  "",
  "| Name | Value |",
  "| --- | --- |",
  "| alpha | 1 |",
  "| beta | 2 |",
  "",
].join("\n");

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

/** The text of every rendered cell of the first table, row by row. */
async function shownCells(page: Page): Promise<string[]> {
  return await withCurrentFrame(page, (frame) => frame.evaluate(() =>
    Array.from(document.querySelectorAll("table tr")).map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) => (cell.textContent ?? "").trim()).join("|"))));
}

/**
 * QA replay 271-c2-1: Escape cancels only the cell it is pressed in. Text typed in a cell, then
 * Tab, then Escape in the next cell: the buffer line and the shown cell both keep the text of the
 * cell left. Checked for Tab, then for a click on another cell.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-025
 */
export async function scenarioTableEscapeKeepsCellsLeft(page: Page): Promise<void> {
  await withDocument("realinput-table-escape", TABLE_ESCAPE_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const editorClosed = async (): Promise<boolean> => {
      const frame = await findCurrentFrame(page);
      return frame !== undefined && await frame.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    };

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^alpha$/u }).click());
    await waitForEditor(page, CELL);
    await press(page, "End");
    await typeText(page, " X");
    await press(page, "Tab");
    await waitFor("the cell left with Tab to reach the buffer", () => bufferText(document).includes("| alpha X | 1 |"));
    await typeText(page, "9");
    await press(page, "Escape");
    await waitFor("the cell editor to close after Escape", editorClosed);
    await waitFor("the buffer to keep the cell left with Tab and drop the open one", () =>
      bufferText(document) === TABLE_ESCAPE_DOCUMENT.replace("| alpha | 1 |", "| alpha X | 1 |"));
    await waitForRender(document);
    await waitFor("the shown cells to equal the buffer", async () =>
      (await shownCells(page)).join("/") === "Name|Value/alpha X|1/beta|2");

    // A click on another cell leaves the first one the same way.
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^beta$/u }).click());
    await waitForEditor(page, CELL);
    await press(page, "End");
    await typeText(page, "!");
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^2$/u }).click());
    await waitFor("the cell left with a click to reach the buffer", () => bufferText(document).includes("| beta! | 2 |"));
    await typeText(page, "7");
    await press(page, "Escape");
    await waitFor("the cell editor to close after Escape", editorClosed);
    await waitFor("the buffer to keep the cell left with a click", () =>
      bufferText(document).includes("| beta! | 2 |") && !bufferText(document).includes("27"));
    await waitForRender(document);
    await waitFor("the shown cells to equal the buffer after the click", async () =>
      (await shownCells(page)).join("/") === "Name|Value/alpha X|1/beta!|2");
    assert.equal(bufferText(document), TABLE_ESCAPE_DOCUMENT.replace("| alpha | 1 |", "| alpha X | 1 |")
      .replace("| beta | 2 |", "| beta! | 2 |"));
  });
}
