import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  bufferText,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

// The first table of the QA fixture `synth/c5-reading.md` (replay 271-c5-2), whose last row holds
// the cell `row five`.
const READING_DOCUMENT = [
  "# C5 reading",
  "",
  "## Long text",
  "",
  "| Topic | Description | Owner |",
  "| --- | --- | --- |",
  "| Short | needle in a haystack | carol |",
  "| Four | row four | dave |",
  "| Five | row five | erin |",
  "",
  "## Second",
  "",
  "| Key | Value |",
  "| --- | --- |",
  "| one | 1 |",
  "",
].join("\n");

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

/**
 * QA replay 271-c5-2: two spreadsheet rows (tab-separated text on the system clipboard) pasted into
 * the cell `row five` with a real Select all and Paste fill the cells from that cell: no tab
 * reaches the source, a column and a row are added, the editor is open in the start cell, and one
 * undo in the source brings the table back.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-120
 */
export async function scenarioTableGridPaste(page: Page): Promise<void> {
  await withDocument("realinput-table-grid-paste", READING_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await vscode.env.clipboard.writeText("a\tb\tc\n1\t2\t3\n");

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^row five$/u }).click());
    await waitForEditor(page, CELL);
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await press(page, `${modifier}+a`);
    await press(page, `${modifier}+v`);

    await waitFor("the pasted cells in the buffer", () => bufferText(document).includes("| Five | a "));
    const text = bufferText(document);
    assert.equal(text.includes("\t"), false, "no tab in the source");
    const rows = text.split("\n").filter((line) => line.startsWith("|"));
    assert.deepEqual(rows[0]!.split("|").map((cell) => cell.trim()).slice(1, -1), ["Topic", "Description", "Owner", ""]);
    assert.deepEqual(rows[4]!.split("|").map((cell) => cell.trim()).slice(1, -1), ["Five", "a", "b", "c"]);
    assert.deepEqual(rows[5]!.split("|").map((cell) => cell.trim()).slice(1, -1), ["", "1", "2", "3"]);
    await waitFor("the editor open in the start cell showing its new text", async () =>
      await withCurrentFrame(page, (frame) => frame.locator(CELL).inputValue()) === "a");

    await press(page, "Escape");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("undo");
    await waitFor("one undo to bring the table back", () => bufferText(document) === READING_DOCUMENT);
  });
}
