import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import type { Page } from "playwright-core";

import {
  bufferText,
  closeAllEditors,
  createFixture,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./realInput/harness";

/**
 * Real-window scenarios of the table editing of CR 115: the conversion of a pipe table to a
 * `{list-table}` and back, the click on a cell of each, the move of a body row and of a column by
 * a real mouse drag and by key, on both syntaxes, with and without a cell editor open.
 */

const PIPE = [
  "# Tables", "", "| H1 | H2 | H3 |", "| --- | --- | --- |", "| a1 | a2 | a3 |", "| b1 |  | b3 |",
  "| c1 | c2 | c3 |", "",
].join("\n");

const LIST = [
  "# Tables", "", "```{list-table}", ":header-rows: 1", "", "* - H1", "  - H2", "  - H3",
  "* - a1", "  - a2", "  - a3", "* - b1", "  -", "  - b3", "* - c1", "  - c2", "  - c3", "```", "",
].join("\n");

/** The table of `PIPE` or `LIST` with the first column moved to the end. */
const COLUMN_TO_END = {
  pipe: [
    "# Tables", "", "| H2 | H3 | H1 |", "| --- | --- | --- |", "| a2 | a3 | a1 |", "|  | b3 | b1 |",
    "| c2 | c3 | c1 |", "",
  ].join("\n"),
  "list-table": [
    "# Tables", "", "```{list-table}", ":header-rows: 1", "", "* - H2", "  - H3", "  - H1",
    "* - a2", "  - a3", "  - a1", "* -", "  - b3", "  - b1", "* - c2", "  - c3", "  - c1", "```", "",
  ].join("\n"),
};

/** `COLUMN_TO_END` after Alt+Left on the moved column: the order H2 H1 H3. */
const COLUMN_BACK_ONE = {
  pipe: [
    "# Tables", "", "| H2 | H1 | H3 |", "| --- | --- | --- |", "| a2 | a1 | a3 |", "|  | b1 | b3 |",
    "| c2 | c1 | c3 |", "",
  ].join("\n"),
  "list-table": [
    "# Tables", "", "```{list-table}", ":header-rows: 1", "", "* - H2", "  - H1", "  - H3",
    "* - a2", "  - a1", "  - a3", "* -", "  - b1", "  - b3", "* - c2", "  - c1", "  - c3", "```", "",
  ].join("\n"),
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `scenario` on a document of `content` shown in the preview with edit mode on. */
async function withTable(
  page: Page, prefix: string, content: string, scenario: (document: vscode.TextDocument) => Promise<void>,
): Promise<void> {
  const fixture = createFixture(prefix, { "tables.md": content });
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("tables.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      await scenario(document);
    } finally {
      try {
        const frame = await findCurrentFrame(page);
        if (frame !== undefined && await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on") {
          await setEditMode(page, false);
          await wait(250);
        }
      } catch {
        // Best effort: it must not hide the scenario's own result.
      }
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

/** Waits for the buffer to equal `expected`, the preview to show it and the handles to be rebuilt. */
async function expectBuffer(page: Page, document: vscode.TextDocument, expected: string, what: string): Promise<void> {
  try {
    await waitFor(what, () => bufferText(document) === expected);
  } catch (error) {
    throw new Error(`${String(error)} The buffer holds ${JSON.stringify(bufferText(document))}.`, { cause: error });
  }
  await waitForRender(document);
  await waitFor("the table handles after the render", async () => {
    const current = await findCurrentFrame(page);
    return current !== undefined && await current.locator(".okf-table-col-handle").count() > 0;
  });
}

/**
 * A real mouse drag from the centre of `handle` to the point of `target` at the given fractions of
 * its box (the half of a row or a column decides before or after).
 */
async function dragTo(page: Page, handle: string, target: string, at: { x: number; y: number }): Promise<void> {
  const boxes = await withCurrentFrame(page, async (frame) => ({
    from: await frame.locator(handle).first().boundingBox(),
    to: await frame.locator(target).first().boundingBox(),
  }));
  assert.ok(boxes.from, `the handle ${handle} has a box`);
  assert.ok(boxes.to, `the drop target ${target} has a box`);
  const fromX = boxes.from.x + boxes.from.width / 2;
  const fromY = boxes.from.y + boxes.from.height / 2;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + 4, fromY + 8, { steps: 3 });
  await page.mouse.move(boxes.to.x + boxes.to.width * at.x, boxes.to.y + boxes.to.height * at.y, { steps: 12 });
  await wait(150);
  await page.mouse.up();
}

const TABLE = "#sphinx-myst-preview-content table";
const ROW_HANDLE = (row: number): string => `.okf-table-row-handle[data-okf-row="${row}"]`;
const COLUMN_HANDLE = (column: number): string => `.okf-table-col-handle[data-okf-col="${column}"]`;

/** The first characters of each data row of the table in `source`, in order. */
function bodyRows(source: string, syntax: "pipe" | "list-table"): string[] {
  const rows = syntax === "pipe"
    ? source.split("\n").filter((line) => line.startsWith("|")).slice(2).map((line) => line.slice(2))
    : source.split("\n").filter((line) => line.startsWith("* - ")).map((line) => line.slice(4)).slice(1);
  return rows.map((row) => row.slice(0, 2));
}

async function activeHandle(page: Page, selector: string): Promise<boolean> {
  return withCurrentFrame(page, (frame) =>
    frame.locator(selector).evaluate((element) => element === element.ownerDocument.activeElement));
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-001
// @tests_req SwRS-MDOKFSTUDIO-TABLE-070
// @tests_req SwRS-MDOKFSTUDIO-TABLE-080
/** The pipe table becomes a list-table with every cell, stays in view, and comes back as a pipe table. */
async function scenarioConversionRoundTrip(page: Page): Promise<void> {
  await withTable(page, "tablemoves-convert", PIPE, async (document) => {
    await withCurrentFrame(page, (frame) => frame.locator("th").filter({ hasText: /^H2$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-table-operation='Convert to list-table']").click());
    await waitFor("the table converted to a list-table in the buffer", () => bufferText(document).includes("```{list-table}"));
    await waitForRender(document);
    const text = bufferText(document);
    // Every cell survives, the header row included; the empty cell stays an empty item.
    for (const cell of ["H1", "H2", "H3", "a1", "a2", "a3", "b1", "b3", "c1", "c2", "c3"]) {
      assert.ok(text.includes(`- ${cell}\n`), `the cell ${cell} is in the list-table: ${JSON.stringify(text)}`);
    }
    assert.ok(text.includes(":header-rows: 1"), "the header row is declared");
    // The rendered table is still there, visible, with its header cells.
    const shown = await withCurrentFrame(page, async (frame) => ({
      tables: await frame.locator(TABLE).count(),
      visible: await frame.locator(TABLE).first().isVisible(),
      headers: await frame.locator(`${TABLE} th`).allTextContents(),
    }));
    assert.equal(shown.tables, 1);
    assert.ok(shown.visible, "the converted table is visible");
    assert.deepEqual(shown.headers.map((header) => header.trim()), ["H1", "H2", "H3"]);

    // A click on a cell of the list-table opens its raw editor, in view (it used to vanish).
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c2$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    const editor = await withCurrentFrame(page, async (frame) => ({
      box: await frame.locator("[data-sphinx-preview-block-editor]").first().boundingBox(),
      text: await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue(),
    }));
    assert.ok(editor.box && editor.box.height > 20 && editor.box.width > 100,
      `the raw editor of the list-table is in view: ${JSON.stringify(editor.box)}`);
    assert.ok(editor.text.includes("{list-table}") && editor.text.includes("H1"),
      "the raw editor holds the whole directive, header included");

    // Back to a pipe table from the raw editor's bar, then Done: the same pipe table.
    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-action='pipeTable']").first().click());
    await withCurrentFrame(page, (frame) => frame.getByRole("button", { name: "Done editing" }).click());
    await expectBuffer(page, document, PIPE, "the pipe table back in the buffer");
    const back = await withCurrentFrame(page, (frame) => frame.locator(`${TABLE} th`).allTextContents());
    assert.deepEqual(back.map((header) => header.trim()), ["H1", "H2", "H3"]);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
/** A body row moves by mouse and by key, with and without a cell editor open. */
async function scenarioRowMoves(page: Page, syntax: "pipe" | "list-table"): Promise<void> {
  await withTable(page, `tablemoves-rows-${syntax}`, syntax === "pipe" ? PIPE : LIST, async (document) => {
    const order = (): string => bodyRows(bufferText(document), syntax).join();
    // Mouse: the first body row dropped on the lower half of the last one.
    await dragTo(page, ROW_HANDLE(1), `${TABLE} tbody tr:last-child`, { x: 0.5, y: 0.8 });
    await waitFor("the first row moved to the end by the drag", () => order() === "b1,c1,a1");
    await waitForRender(document);
    // Key: the focused handle of the moved row, Alt+Up.
    await waitFor("the handle of the moved row has the focus", () => activeHandle(page, ROW_HANDLE(3)));
    await press(page, "Alt+ArrowUp");
    await waitFor("the row moved up by the key", () => order() === "b1,a1,c1");
    await waitForRender(document);
    if (syntax === "pipe") {
      // With a cell editor open on the table: the text typed in the cell moves with its row.
      await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c2$/u }).click());
      await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
      await typeText(page, "X");
      await dragTo(page, ROW_HANDLE(1), `${TABLE} tbody tr:last-child`, { x: 0.9, y: 0.8 });
      await waitFor("the row moved while the cell editor was open", () =>
        order() === "a1,c1,b1" && bufferText(document).includes("| c2X |"));
      await waitForRender(document);
      await waitFor("the cell editor closed with the saved move", async () =>
        await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-table-cell-editor]").count()) === 0);
    }
    assert.ok(bufferText(document).startsWith("# Tables\n\n"), "the rest of the document is untouched");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
/** A column moves by mouse and by key, with and without a cell editor open. */
async function scenarioColumnMoves(page: Page, syntax: "pipe" | "list-table"): Promise<void> {
  await withTable(page, `tablemoves-columns-${syntax}`, syntax === "pipe" ? PIPE : LIST, async (document) => {
    // The handles are above the table, outside its cells, centred on their columns.
    const geometry = await withCurrentFrame(page, async (frame) => ({
      handles: await frame.locator(".okf-table-col-handle").evaluateAll((handles) =>
        handles.map((handle) => handle.getBoundingClientRect().toJSON() as { bottom: number; left: number; right: number })),
      headers: await frame.locator(`${TABLE} th`).evaluateAll((cells) =>
        cells.map((cell) => cell.getBoundingClientRect().toJSON() as { top: number; left: number; right: number })),
      inTable: await frame.locator(`${TABLE} .okf-table-col-handle`).count(),
    }));
    assert.equal(geometry.handles.length, 3, "one handle per column");
    assert.equal(geometry.inTable, 0, "no handle inside the table");
    geometry.handles.forEach((handle, index) => {
      const header = geometry.headers[index]!;
      assert.ok(handle.bottom <= header.top + 1, `handle ${index} is above the header: ${handle.bottom} vs ${header.top}`);
      assert.ok(Math.abs((handle.left + handle.right) / 2 - (header.left + header.right) / 2) <= 2,
        `handle ${index} is centred on its column`);
    });
    // Mouse: the first column dropped on the right half of the last header cell.
    await dragTo(page, COLUMN_HANDLE(0), `${TABLE} th:nth-child(3)`, { x: 0.8, y: 0.5 });
    await expectBuffer(page, document, COLUMN_TO_END[syntax], "the first column moved to the end by the drag");
    // Key: the focused handle of the moved column, Alt+Left.
    await waitFor("the handle of the moved column has the focus", () => activeHandle(page, COLUMN_HANDLE(2)));
    await press(page, "Alt+ArrowLeft");
    await expectBuffer(page, document, COLUMN_BACK_ONE[syntax], "the column moved left by the key");
    if (syntax === "pipe") {
      // With a cell editor open: the typed text moves with its column.
      await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c1$/u }).click());
      await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
      await typeText(page, "X");
      await dragTo(page, COLUMN_HANDLE(0), `${TABLE} th:nth-child(3)`, { x: 0.8, y: 0.5 });
      await waitFor("the column moved while the cell editor was open", () => {
        const text = bufferText(document);
        return text.includes("| H1 | H3 | H2 |") && text.includes("| c1X | c3 | c2 |");
      });
    }
  });
}

/** The table scenarios of CR 115, in one window. */
export async function scenarioTableMoves(page: Page): Promise<void> {
  await scenarioConversionRoundTrip(page);
  console.log("PASS table moves: conversion round trip and the click on a list-table cell");
  for (const syntax of ["pipe", "list-table"] as const) {
    await scenarioRowMoves(page, syntax);
    console.log(`PASS table moves: rows of a ${syntax} (mouse, key, cell editor open)`);
    await scenarioColumnMoves(page, syntax);
    console.log(`PASS table moves: columns of a ${syntax} (mouse, key, cell editor open)`);
  }
}
