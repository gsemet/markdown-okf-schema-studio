import * as assert from "node:assert/strict";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  bufferText,
  type Evidence,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

/** Ten columns of 24-character cells: far wider than the side preview, so the table scrolls sideways. */
export const WIDE_TABLE_DOCUMENT = [
  "# Wide table",
  "",
  "| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I | Col J |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  "| aaaaaaaaaaaaaaaaaaaaaaaa | bbbbbbbbbbbbbbbbbbbbbbbb | cccccccccccccccccccccccc | dddddddddddddddddddddddd "
    + "| eeeeeeeeeeeeeeeeeeeeeeee | ffffffffffffffffffffffff | gggggggggggggggggggggggg | hhhhhhhhhhhhhhhhhhhhhhhh "
    + "| iiiiiiiiiiiiiiiiiiiiiiii | LASTCELL |",
  "| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |",
  "",
  "Text after the table.",
  "",
].join("\n");

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

interface EditorPlace {
  row: number;
  column: number;
  left: number;
  right: number;
  viewRight: number;
  pageScrollX: number;
  scrollLeft: number;
  overflow: number;
  cellLeft: number;
  boxLeft: number;
  boxRight: number;
}

/** Where the cell editor is: its cell, its horizontal extent and the scroll of its table and page. */
async function editorPlace(page: Page): Promise<EditorPlace> {
  return await withCurrentFrame(page, (frame) => frame.evaluate(() => {
    const editor = document.querySelector("[data-sphinx-preview-table-cell-editor]");
    const cell = document.querySelector<HTMLTableCellElement>("[data-sphinx-preview-table-cell-selected=\"true\"]");
    const table = cell?.closest("table");
    const rect = editor?.getBoundingClientRect();
    return {
      row: cell ? (cell.parentElement as HTMLTableRowElement).rowIndex : -1,
      column: cell ? cell.cellIndex : -1,
      left: rect ? rect.left : Number.NaN,
      right: rect ? rect.right : Number.NaN,
      // The webview viewport without its vertical scrollbar.
      viewRight: Math.min(window.innerWidth, document.documentElement.clientWidth),
      pageScrollX: window.scrollX,
      scrollLeft: table ? table.scrollLeft : 0,
      overflow: table ? table.scrollWidth - table.clientWidth : 0,
      cellLeft: cell ? cell.getBoundingClientRect().left : Number.NaN,
      boxLeft: table ? table.getBoundingClientRect().left + table.clientLeft : Number.NaN,
      boxRight: table ? table.getBoundingClientRect().left + table.clientLeft + table.clientWidth : Number.NaN,
    };
  }));
}

/** Waits for the editor in rendered row `row`, column `column`, then checks it lies inside the preview. */
async function expectEditorInView(page: Page, step: string, row: number, column: number): Promise<EditorPlace> {
  await waitFor(`${step}: the cell editor in row ${row}, column ${column}`, async () => {
    const frame = await findCurrentFrame(page);
    if (frame === undefined || await frame.locator(CELL).count() !== 1) return false;
    const place = await editorPlace(page);
    return place.row === row && place.column === column;
  });
  await withCurrentFrame(page, (frame) => frame.evaluate(() =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  const place = await editorPlace(page);
  assert.ok(place.overflow > 0, `${step}: the table scrolls sideways (overflow ${place.overflow} px)`);
  assert.ok(place.left >= -1 && place.right <= place.viewRight + 1,
    `${step}: the cell editor (${place.left}..${place.right}) lies inside the preview (0..${place.viewRight}); `
    + `table scrollLeft ${place.scrollLeft}`);
  assert.ok(place.cellLeft >= place.boxLeft - 1 && place.cellLeft <= place.boxRight + 1,
    `${step}: the selected cell starts (${place.cellLeft}) inside the table box (${place.boxLeft}..${place.boxRight}); `
    + `table scrollLeft ${place.scrollLeft}`);
  assert.equal(place.pageScrollX, 0, `${step}: the page does not scroll sideways`);
  return place;
}

const WIDTH_CYCLE = ["margin", "auto", "full"];

async function widthMode(page: Page): Promise<string | null> {
  return await withCurrentFrame(page, (frame) => frame.locator("html").getAttribute("data-sphinx-preview-width"));
}

/**
 * Presses the toolbar Width button until the page is in `mode`. The cycle is margin, auto, full:
 * the clicks are computed from the current mode, and each one waits for the mode the page reports.
 */
async function setWidthMode(page: Page, mode: string): Promise<void> {
  let current = await widthMode(page);
  const from = WIDTH_CYCLE.indexOf(current ?? "");
  assert.ok(from >= 0, `the page reports a known width mode (got ${String(current)})`);
  const clicks = (WIDTH_CYCLE.indexOf(mode) - from + WIDTH_CYCLE.length) % WIDTH_CYCLE.length;
  for (let click = 0; click < clicks; click += 1) {
    const expected = WIDTH_CYCLE[(WIDTH_CYCLE.indexOf(current as string) + 1) % WIDTH_CYCLE.length];
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-width-toggle]").click());
    let actual: string | null = current;
    await waitFor(`the width mode ${expected} after the Width button (now ${String(actual)})`, async () => {
      actual = await widthMode(page);
      return actual === expected;
    });
    current = expected;
  }
}

async function closeCellEditor(page: Page): Promise<void> {
  await press(page, "Escape");
  await waitFor("the cell editor to close", async () => {
    const frame = await findCurrentFrame(page);
    return frame !== undefined && await frame.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
  });
}

/**
 * QA replay c5-1: in a table wider than the preview, real Tab and Shift+Tab presses keep the cell
 * editor inside the preview after every key (the table box scrolls sideways to it), the row wrap in
 * both directions included, and from the last cell with the table scrolled to its end. Margin and
 * Auto width. No key changes the document.
 */
export async function scenarioWideTableTab(page: Page, _evidence: Evidence): Promise<void> {
  await withDocument("realinput-wide-table-tab", WIDE_TABLE_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    try {
      for (const mode of ["margin", "auto"]) {
        await setWidthMode(page, mode);
        await withCurrentFrame(page, (frame) => frame.locator("table").evaluate((table) => { table.scrollLeft = 0; }));
        await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^a{24}$/u }).click());
        await waitForEditor(page, CELL);
        await expectEditorInView(page, `${mode}, open in the first body cell`, 1, 0);
        for (let column = 1; column <= 9; column += 1) {
          await press(page, "Tab");
          await expectEditorInView(page, `${mode}, Tab ${column}`, 1, column);
        }
        await press(page, "Tab");
        await expectEditorInView(page, `${mode}, Tab across the row wrap`, 2, 0);
        await press(page, "Shift+Tab");
        await expectEditorInView(page, `${mode}, Shift+Tab back across the wrap`, 1, 9);
        await closeCellEditor(page);

        // As an author reaches the last cell: the table scrolled to its end, then a click.
        await withCurrentFrame(page, (frame) => frame.locator("table").evaluate((table) => {
          table.scrollLeft = table.scrollWidth;
        }));
        await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^LASTCELL$/u }).click());
        await waitForEditor(page, CELL);
        await expectEditorInView(page, `${mode}, click on the last cell of a table scrolled to its end`, 1, 9);
        await press(page, "Tab");
        await expectEditorInView(page, `${mode}, Tab from the scrolled-to-end last cell`, 2, 0);
        await press(page, "Shift+Tab");
        await expectEditorInView(page, `${mode}, Shift+Tab back to the last cell`, 1, 9);
        await closeCellEditor(page);
      }
    } finally {
      // The width mode is a saved view preference: the next scenarios start in Margin.
      await setWidthMode(page, "margin");
    }
    assert.equal(bufferText(document), WIDE_TABLE_DOCUMENT, "moving between cells does not change the document");
  });
}
