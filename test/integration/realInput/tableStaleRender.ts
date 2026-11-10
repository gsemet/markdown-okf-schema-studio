import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  bufferText,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

/*
 * The preview table shows what the buffer holds after an undo or a revert (CR 277). Real mouse and
 * keys on the workbench, one scenario for each replay of QA campaign 271 (the JSON files of the
 * exploratory QA skill, .agents/skills/markdown-studio-exploratory-qa-claude/scenarios/):
 *
 * | Replay | Real-input test |
 * | --- | --- |
 * | 271-c3-2-undo-after-column-deletes-leaves-preview-table-stale | scenarioUndoUnderCellEditorRendersTable |
 * | 271-c6-1-revert-file-leaves-preview-cell-stale (and -part2) | scenarioRevertAfterExternalWriteRendersCell |
 */

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

// The fixture of replay c3-2 (synth/structure-tables.md), reduced to the Alignment table.
const ALIGNMENT_DOCUMENT = [
  "# Structure tables",
  "",
  "Alignment:",
  "",
  "| Left | Center | Right |",
  "| :--- | :---: | ---: |",
  "| l1 | c1 | r1 |",
  "| l2 | c2 | r2 |",
  "",
  "Tail paragraph.",
  "",
].join("\n");

// The fixture of replay c6-1 (synth/c6-concurrency.md).
const CONCURRENCY_DOCUMENT = [
  "# Concurrency tables",
  "",
  "## Table one",
  "",
  "| Name | Value |",
  "| --- | --- |",
  "| alpha | 1 |",
  "| beta | 2 |",
  "| gamma | 3 |",
  "",
  "## Paragraph block",
  "",
  "A plain paragraph below the first table.",
  "",
].join("\n");

/** The number of cells in the header row of the table that has a `Left` header cell, if any. */
async function leftTableWidth(page: Page): Promise<number | undefined> {
  return await withCurrentFrame(page, (frame) => frame.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table"))
      .find((candidate) => (candidate.rows[0]?.textContent ?? "").includes("Left"));
    return table?.rows[0]?.cells.length;
  }));
}

/** True when no table cell editor is open in the current webview. */
async function noCellEditor(page: Page): Promise<boolean> {
  const frame = await findCurrentFrame(page);
  return frame !== undefined && await frame.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
}

/**
 * Replay 271-c3-2: Col − twice in the table toolbar, then three undos from the source (the third
 * one undoes an earlier edit elsewhere). The buffer goes back to the original and the preview
 * table shows its three columns again, with no cell editor left over the old structure.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-119
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
 */
export async function scenarioUndoUnderCellEditorRendersTable(page: Page): Promise<void> {
  await withDocument("realinput-stale-undo", ALIGNMENT_DOCUMENT, async (document) => {
    // One earlier edit elsewhere in the undo stack: the third undo of the replay takes it back.
    const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await editor.edit((builder) => builder.insert(new vscode.Position(9, 14), " (edited)"),
      { undoStopBefore: true, undoStopAfter: true });
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await waitFor("the three-column table", async () => await leftTableWidth(page) === 3);

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c1$/u }).click());
    await waitForEditor(page, CELL);
    for (const step of [1, 2]) {
      await withCurrentFrame(page, (frame) =>
        frame.locator("[data-sphinx-table-menu] button").filter({ hasText: "Col −" }).first().click());
      await waitFor(`Col − number ${step} to reach the buffer`, () =>
        bufferText(document).split("\n").find((line) => line.includes("l1"))!.split("|").length === 5 - step);
      await waitFor("the cell editor to reopen in the table", async () => {
        const frame = await findCurrentFrame(page);
        return frame !== undefined && await frame.locator(CELL).count() === 1;
      });
    }

    await press(page, `${MOD}+1`);
    for (let undo = 0; undo < 3; undo += 1) {
      await press(page, `${MOD}+z`);
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }
    const original = ALIGNMENT_DOCUMENT;
    await waitFor("the three undos to restore the original buffer", () => bufferText(document) === original);
    await waitForRender(document);
    await waitFor("the table to show its three columns again", async () => await leftTableWidth(page) === 3);
    await waitFor("no cell editor to be left over the old structure", () => noCellEditor(page));
    assert.equal(bufferText(document), original);
  });
}

/**
 * Replay 271-c6-1 (both parts): ` X` typed in the `alpha` cell, the file rewritten on disk by another
 * tool, Tab, Escape, then File: Revert File from the source. The buffer equals the disk, a cell
 * shows `alpha` and none shows `alpha X`, and the paragraph shows the external text.
 * @tests_req SwRS-MDOKFSTUDIO-LIFE-069
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-035
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-119
 */
export async function scenarioRevertAfterExternalWriteRendersCell(page: Page): Promise<void> {
  await withDocument("realinput-stale-revert", CONCURRENCY_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^alpha$/u }).click());
    await waitForEditor(page, CELL);
    await press(page, "End");
    await typeText(page, " X");
    await waitFor("the typed text to reach the buffer", () => bufferText(document).includes("| alpha X | 1 |"));

    // Part 1 of the replay ends here: another tool rewrites the paragraph line on disk.
    const onDisk = CONCURRENCY_DOCUMENT.replace("A plain paragraph", "EXTERNAL paragraph");
    fs.writeFileSync(document.uri.fsPath, onDisk);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));

    await press(page, "Tab");
    await press(page, "Escape");
    await waitFor("the cell editor to close after Escape", () => noCellEditor(page));
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.files.revert");
    await waitFor("the buffer to equal the disk", () => bufferText(document) === onDisk);
    await waitForRender(document);

    const shown = async (): Promise<{ alpha: boolean; typed: boolean; paragraph: string }> =>
      await withCurrentFrame(page, (frame) => frame.evaluate(() => {
        const cells = Array.from(window.document.querySelectorAll("td")).map((cell) => (cell.textContent ?? "").trim());
        return {
          alpha: cells.includes("alpha"),
          typed: cells.some((text) => text.includes("alpha X")),
          paragraph: window.document.querySelector("p")?.textContent ?? "",
        };
      }));
    await waitFor("a cell to show alpha and none alpha X", async () => {
      const state = await shown();
      return state.alpha && !state.typed;
    });
    await waitFor("the paragraph to show the external text", async () => (await shown()).paragraph.includes("EXTERNAL"));
    assert.equal(bufferText(document), onDisk);
  });
}
