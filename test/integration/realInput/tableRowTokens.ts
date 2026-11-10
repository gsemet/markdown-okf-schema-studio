import * as assert from "node:assert/strict";
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

/*
 * Real-input replays of QA campaign 271 for block ids and tokens at the end of a table row. The
 * tables are those of the fixture `anchors-trailing-tokens.md` of the exploratory QA skill.
 *
 * | Replay | Scenario |
 * | --- | --- |
 * | 271-c1b-1 (QA271-02) | scenarioColumnMoveKeepsBlockIdAtRowEnd |
 * | 271-c1b-2 (QA271-10) | scenarioTailedTableMovesAndOpensCellEditor |
 */

const COLUMN_HANDLE = ".okf-table-col-handle";
const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

const TABLE_BODY = "| beta | 2 | second |\n| gamma | 3 | third |\n";
const HEADER = "| Name | Value | Note |\n| --- | --- | --- |\n";

/** One table of the fixture, with `first` as the Note cell of its first row. */
const table = (first: string): string => `${HEADER}| alpha | 1 | ${first}\n${TABLE_BODY}`;

const MOVED_HEADER = "| Name | Note | Value |\n| --- | --- | --- |\n";
const MOVED_BODY = "| beta | second | 2 |\n| gamma | third | 3 |\n";

/** Focuses the handle of the Note column of the first table and presses Alt+Left. */
async function moveNoteLeft(page: Page): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.locator(`${COLUMN_HANDLE}[data-okf-col="2"]`).first().click());
  await press(page, "Alt+ArrowLeft");
}

/**
 * QA replay 271-c1b-1 (T2): in `| alpha | 1 | first ^row-b |` the Note column moves left and the
 * block id ends the row, after the closing pipe, instead of travelling into the middle of it.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-007
 */
export async function scenarioColumnMoveKeepsBlockIdAtRowEnd(page: Page): Promise<void> {
  const document = "# Block id in the last cell\n\n" + table("first ^row-b |");
  await withDocument("realinput-table-block-id", document, async (buffer) => {
    await openSidePreview(buffer);
    await waitForRender(buffer);
    await setEditMode(page, true);
    await moveNoteLeft(page);
    await waitFor("the block id to end the moved row", () =>
      bufferText(buffer).includes(MOVED_HEADER + "| alpha | first | 1 | ^row-b\n" + MOVED_BODY));
  });
}

/**
 * QA replay 271-c1b-2 (T1, T3, T5): a token after the closing pipe of one row (a block id, a
 * heading-style id, an HTML comment) no longer makes the handles inert: the column moves with the
 * token kept at the end of its row, and a click on a cell opens the cell editor.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-001
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-007
 */
export async function scenarioTailedTableMovesAndOpensCellEditor(page: Page): Promise<void> {
  for (const token of ["^row-a", "{#row-c}", "<!-- keep -->"]) {
    const document = "# Token after the closing pipe\n\n" + table(`first | ${token}`);
    await withDocument("realinput-table-row-tail", document, async (buffer) => {
      await openSidePreview(buffer);
      await waitForRender(buffer);
      await setEditMode(page, true);
      await moveNoteLeft(page);
      await waitFor(`the column to move with ${token} at the end of its row`, () =>
        bufferText(buffer).includes(MOVED_HEADER + `| alpha | first | 1 | ${token}\n` + MOVED_BODY));
      await waitForRender(buffer);
      await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^beta$/u }).click());
      await waitForEditor(page, CELL);
      const menu = await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-table-menu]").count());
      assert.ok(menu > 0, `the cell editor opens in the table with ${token}, not the raw Markdown editor`);
    });
  }
}
