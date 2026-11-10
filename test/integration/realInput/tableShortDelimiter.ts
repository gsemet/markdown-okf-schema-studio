import * as assert from "node:assert/strict";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  bufferText,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

const SHORT_DELIMITER_DOCUMENT = [
  "# Short delimiter table",
  "",
  "| A | B |",
  "| :-- | --: |",
  "| a1 | b1 |",
  "| a2 | b2 |",
  "",
  "end",
  "",
].join("\n");

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

/**
 * QA replay 271-c3-1: a table whose delimiter row has two dashes (":--", "--:") opens the cell
 * editor and the table bar on a click, not the raw Markdown editor, and a cell edit leaves the
 * delimiter row as written.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-001
 */
export async function scenarioTableShortDelimiter(page: Page): Promise<void> {
  await withDocument("realinput-table-short-delimiter", SHORT_DELIMITER_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^a1$/u }).click());
    await waitForEditor(page, CELL);
    await waitFor("the table bar next to the table", async () =>
      await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-table-menu]").count()) === 1);

    await press(page, "End");
    await typeText(page, "X");
    await press(page, "Enter");
    await waitFor("the edited cell in the buffer", () => bufferText(document).includes("| a1X | b1 |"));
    const lines = bufferText(document).split("\n");
    assert.equal(lines[3], "| :-- | --: |");
    assert.equal(bufferText(document), SHORT_DELIMITER_DOCUMENT.replace("| a1 | b1 |", "| a1X | b1 |"));
  });
}
