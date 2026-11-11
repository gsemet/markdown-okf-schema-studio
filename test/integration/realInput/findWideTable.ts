import * as assert from "node:assert/strict";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

/** The first table of the QA 271 fixture `synth/c5-reading.md`: edit mode keeps whole words, so it scrolls sideways. */
const WIDE_TABLE_DOCUMENT = [
  "# C5 reading",
  "",
  "| Topic | Description | Owner |",
  "| --- | --- | --- |",
  "| Wrapping | This cell holds a long sentence that should wrap inside the column instead of stretching the table far beyond the pane width, and it keeps going to prove the point about readability. | alice |",
  "| Token | averyveryverylongunbrokentokenaveryveryverylongunbrokentokenaveryveryverylongunbrokentokenaveryveryverylongunbrokentoken | bob |",
  "| Short | needle in a haystack | carol |",
  "| Four | row four | dave |",
  "| Five | row five | erin |",
  "",
].join("\n");

/**
 * QA replay 271-c5-1 (QA271-08): with a wide table scrolled to its Owner column, Cmd/Ctrl+F then a
 * word of the Description column and Enter scroll the table so the hit text lies inside its box and
 * the pane.
 * @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
 */
export async function scenarioFindWideTable(page: Page): Promise<void> {
  await withDocument("realinput-find-wide-table", WIDE_TABLE_DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);

    // Clicking the last column scrolls the table to it; Escape closes the cell editor.
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^carol$/u }).click());
    await press(page, "Escape");
    await waitFor("the table to be scrolled sideways", async () => await withCurrentFrame(page, (frame) =>
      frame.evaluate(() => (document.querySelector("table")?.scrollLeft ?? 0) > 100)));

    await press(page, `${MOD}+F`);
    await typeText(page, "needle");
    await press(page, "Enter");
    await waitFor("the find bar to count the hit", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && /^1 of 1$/u.test(await current.locator("[data-find-count]").textContent() ?? "");
    });

    const geometry = await withCurrentFrame(page, (frame) => frame.evaluate(() => {
      const table = document.querySelector("table")!;
      const cell = Array.from(table.querySelectorAll("td")).find((td) => td.textContent?.includes("needle"))!;
      const text = cell.firstChild!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 6);
      const rect = range.getBoundingClientRect();
      const box = table.getBoundingClientRect();
      return {
        left: rect.left, right: rect.right,
        boxLeft: box.left + table.clientLeft, boxRight: box.left + table.clientLeft + table.clientWidth,
        innerWidth: window.innerWidth, scrollX: window.scrollX,
      };
    }));
    assert.ok(geometry.left >= geometry.boxLeft && geometry.right <= geometry.boxRight,
      `the hit text is inside the table's box: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.innerWidth,
      `the hit text is inside the pane: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.scrollX, 0, "the page does not scroll sideways");
  });
}
