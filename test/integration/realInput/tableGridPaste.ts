import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import { explained, waitForPageSettled } from "./flushBeforeNavigate";
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
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-120#S2
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

// The stage and the expected paste of the clip paste-spreadsheet-cells, copied verbatim; the scenario compares the
// copies with the shipped files.
const CLIP = path.resolve(__dirname, "../../../../docs/demo-video/clips/paste-spreadsheet-cells");
const CHECKLIST_DOCUMENT = [
  "# Release 2.4 checklist",
  "",
  "| Task | Owner |",
  "| --- | --- |",
  "| Freeze the branch | Ana |",
  "",
].join("\n");
const TASKS_TSV = [
  "Task\tOwner\tDue",
  "Freeze the branch\tAna\tMon",
  "Run the migrations\tBen\tTue",
  "Restart the workers\tChen\tWed",
  "Announce the release\tDev\tThu",
  "",
].join("\n");
// `EXPECTED` of the clip's scenario.mjs.
const PASTED_CHECKLIST = [
  "# Release 2.4 checklist",
  "",
  "| Task | Owner | Due |",
  "| --- | --- | --- |",
  "| Freeze the branch | Ana | Mon |",
  "| Run the migrations | Ben | Tue |",
  "| Restart the workers | Chen | Wed |",
  "| Announce the release | Dev | Thu |",
  "",
].join("\n");

/** The open cell editors of the page: the table's row count, the cell each one is in and the text of its text box. */
async function openCellEditors(page: Page): Promise<Array<Record<"tag" | "text", string> & Record<"rows" | "row" | "column", number>>> {
  return withCurrentFrame(page, (frame) => frame.locator(CELL).evaluateAll((fields) => fields.map((field) => {
    const cell = field.closest("th, td") as HTMLTableCellElement;
    return {
      rows: (cell.closest("table") as HTMLTableElement).rows.length,
      tag: cell.tagName,
      row: (cell.parentElement as HTMLTableRowElement).rowIndex,
      column: cell.cellIndex,
      text: (field as HTMLTextAreaElement).value,
    };
  })));
}

/**
 * The paste of the clip paste-spreadsheet-cells: five spreadsheet rows pasted with a real Paste, and
 * no Select all, into the header cell "Task" of a two-column table fill the table, and the editor is
 * open in that header cell showing its new text, still there once the page has settled.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-120#S3
 */
export async function scenarioTableGridPasteFromHeader(page: Page): Promise<void> {
  assert.equal(fs.readFileSync(path.join(CLIP, "stage", "release-checklist.md"), "utf8"), CHECKLIST_DOCUMENT);
  assert.equal(fs.readFileSync(path.join(CLIP, "stage", "tasks.tsv"), "utf8"), TASKS_TSV);
  const clip = await import(pathToFileURL(path.join(CLIP, "scenario.mjs")).href) as { EXPECTED: string };
  assert.equal(clip.EXPECTED, PASTED_CHECKLIST);
  await withDocument("realinput-table-grid-paste-header", CHECKLIST_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await vscode.env.clipboard.writeText(TASKS_TSV);

    await withCurrentFrame(page, (frame) => frame.locator("th").filter({ hasText: /^Task$/u }).click());
    await waitForEditor(page, CELL);
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await press(page, `${modifier}+v`);

    await waitFor("the pasted table in the buffer", () => bufferText(document) === PASTED_CHECKLIST);
    // Five rows: the editor of the table as rendered after the paste, not the one the paste was typed in.
    const inHeaderCell = [{ rows: 5, tag: "TH", row: 0, column: 0, text: "Task" }];
    await explained(page, () => waitFor("the editor open in the header cell Task", async () =>
      JSON.stringify(await openCellEditors(page)) === JSON.stringify(inHeaderCell)));
    await waitForPageSettled(page, "after the paste", document);
    await explained(page, async () =>
      assert.deepEqual(await openCellEditors(page), inHeaderCell, "the editor stays open in the header cell Task"));
    await press(page, "Escape");
  });
}
