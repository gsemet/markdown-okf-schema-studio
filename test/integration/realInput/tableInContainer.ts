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

const DOCUMENT = [
  "# Tables in containers",
  "",
  "> | Q1 | Q2 |",
  "> | --- | --- |",
  "> | qa | qb |",
  "> | qc | qd |",
  "",
  "> [!NOTE]",
  "> | N1 | N2 |",
  "> | --- | --- |",
  "> | na | nb |",
  "",
  "```{note}",
  ":class: wide",
  "| M1 | M2 |",
  "| --- | --- |",
  "| ma | mb |",
  "```",
  "",
  "end",
  "",
].join("\n");

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";
const BAR = "[data-sphinx-table-menu]";

async function openCell(page: Page, text: string): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: new RegExp(`^${text}$`, "u") }).click());
  await waitForEditor(page, CELL);
  await waitFor("the table bar next to the table", async () =>
    await withCurrentFrame(page, (frame) => frame.locator(BAR).count()) === 1);
  assert.equal(await withCurrentFrame(page, (frame) => frame.locator(".sphinx-preview-block-editor").count()), 0,
    "the raw block editor stays closed");
}

/**
 * QA replay 271-c3-3: a pipe table inside a quote, a GitHub alert or a MyST admonition opens the
 * cell editor and the table bar on a click, not the raw block editor. A typed letter and Enter
 * change only that cell, the quote prefixes, the alert marker line and the directive fence and
 * option line stay as written, and Tab in the last cell adds a row that carries the prefix.
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-121
 */
export async function scenarioTableInContainer(page: Page): Promise<void> {
  await withDocument("realinput-table-in-container", DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);

    // A quote: one cell changes, every other line is as written.
    await openCell(page, "qa");
    await press(page, "End");
    await typeText(page, "X");
    await press(page, "Enter");
    await waitFor("the edited cell of the quote in the buffer", () => bufferText(document).includes("> | qaX | qb |"));
    assert.equal(bufferText(document), DOCUMENT.replace("> | qa | qb |", "> | qaX | qb |"));
    await waitForRender(document);

    // A MyST admonition: the fence and the option line stay.
    await openCell(page, "ma");
    await press(page, "End");
    await typeText(page, "Y");
    await press(page, "Enter");
    await waitFor("the edited cell of the admonition in the buffer", () => bufferText(document).includes("| maY | mb |"));
    assert.equal(bufferText(document), DOCUMENT.replace("> | qa | qb |", "> | qaX | qb |").replace("| ma | mb |", "| maY | mb |"));
    await waitForRender(document);

    // A GitHub alert: Tab in the last cell adds a row with the prefix and keeps the editor open in it.
    await openCell(page, "nb");
    await press(page, "Tab");
    await waitFor("a prefixed row under the alert table", () => {
      const text = bufferText(document).split("\n");
      const row = text.indexOf("> | na | nb |");
      return row > 0 && /^> \|\s*\|\s*\|$/u.test(text[row + 1] ?? "");
    });
    const text = bufferText(document).split("\n");
    assert.equal(text[text.indexOf("> [!NOTE]") + 1], "> | N1 | N2 |");
    await waitForEditor(page, CELL);
  });
}
