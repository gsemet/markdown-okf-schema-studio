import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { type Page } from "playwright-core";
import * as vscode from "vscode";

import { withDocument } from "./common";
import {
  bufferText,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

/** The table and the two comment targets of the QA fixture `synth/anchors-tables.md` (beta on line 13). */
const DOCUMENT = [
  "# Anchors and tables",
  "",
  "(intro-label)=",
  "## Heading with explicit id {#heading-id}",
  "",
  "A paragraph before the table, with a block id. ^para-before",
  "",
  "(table-label)=",
  "",
  "| Name | Value | Note |",
  "| --- | --- | --- |",
  "| alpha | 1 | first row ^row-a |",
  "| beta | 2 | second row |",
  "| gamma | 3 | third row |",
  "",
  "A paragraph right after the table.",
  "",
  "### Second heading {#second-id}",
  "",
  "The retry budget is exceeded when three consecutive calls fail.",
  "",
  "| Key | Meaning |",
  "| --- | --- |",
  "| retry | the retry budget |",
  "| cache | warmed at start-up |",
  "",
].join("\n");

const thread = (id: string, line: number, quote: string, prefix: string, suffix: string) => ({
  id,
  anchor: { line, endLine: line, quote, prefix, suffix },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: `c_${id}`, author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: `Body ${id}` }],
});

const MARK = "mark[data-okf-comment-thread]";

/** The ids of the threads shown as a mark in the page. */
async function markedThreads(page: Page): Promise<string[]> {
  return await withCurrentFrame(page, (frame) => frame.evaluate((selector) =>
    Array.from(document.querySelectorAll(selector)).map((mark) => (mark as HTMLElement).dataset.okfCommentThread ?? ""),
  MARK));
}

/**
 * QA replay `scenarios/271-c1b-3-undo-row-delete-keeps-comment-mark.json`: Row - on the row a
 * comment quotes, Escape, then an undo in the editor. The buffer is back and so is the mark of the
 * thread (it is not an orphan), and the comments file is untouched.
 * @tests_req SwRS-MDOKFSTUDIO-REVIEW-219
 * @tests_req SwRS-MDOKFSTUDIO-REVIEW-119
 */
export async function scenarioUndoRestoresCommentMark(page: Page): Promise<void> {
  await withDocument("realinput-table-comment-undo", DOCUMENT, async (document) => {
    const sidecar = path.join(path.dirname(document.uri.fsPath), "smoke.comments.json");
    const sidecarText = `${JSON.stringify({
      version: 1,
      document: "smoke.md",
      threads: [
        thread("t1", 13, "beta", "| ", " | 2"),
        thread("t2", 24, "retry budget", "| retry | the ", ""),
      ],
    }, null, 2)}\n`;
    fs.writeFileSync(sidecar, sidecarText);
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await waitFor("both comment marks", async () => (await markedThreads(page)).sort().join() === "t1,t2");

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^2$/u }).first().click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-table-menu] button").filter({ hasText: "Row −" }).click());
    await waitFor("the row to leave the buffer", () => !bufferText(document).includes("| beta |"));
    await press(page, "Escape");

    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await press(page, `${MOD}+1`);
    await press(page, `${MOD}+z`);
    await waitFor("the undo to restore the buffer", () => bufferText(document) === DOCUMENT);
    await waitForRender(document);
    await waitFor("both comment marks after the undo", async () => (await markedThreads(page)).sort().join() === "t1,t2");
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await frame.locator('[data-okf-comment-orphan="t1"]').count(), 0, "t1 is not an orphan");
    });
    assert.equal(fs.readFileSync(sidecar, "utf8"), sidecarText, "the comments file is unchanged");
  });
}
