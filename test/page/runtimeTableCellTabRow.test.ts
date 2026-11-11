import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { findButton, messagesAfter, openTableCellEditorForTab, patchMessage } from "./runtimeTestSupport";

/**
 * The "Tab: new row" hint in the last cell of a table, and Escape (or Cancel) removing a row that
 * Tab added while it is still empty (features/tableCellEditor.ts).
 */

const TABLE = "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n";
const WITH_NEW_ROW = TABLE + "|   |   |\n";
const NOOP = (): void => undefined;
const HINT = "data-sphinx-preview-table-cell-hint";

const typeInto = (control: RuntimeElement, text: string): void => {
  control.value = text;
  control.dispatch("input");
};
const press = (control: RuntimeElement, key: string): void =>
  control.dispatch("keydown", { key, preventDefault: NOOP });
// The harness does not clear an element on `textContent = ""`: read the newest actions row.
const hintsOf = (harness: RuntimeHarness): RuntimeElement[] => {
  const actions = harness.createdElements.filter((element) =>
    element.className === "sphinx-preview-block-editor-actions").at(-1);
  assert.ok(actions);
  return actions.childElements.filter((child) => child.getAttribute(HINT) !== null);
};
const finalSaves = (harness: RuntimeHarness): Array<Record<string, unknown>> =>
  harness.messages.filter((message) => message.type === "previewEditSave" && message.final === true);

/** Opens the editor in the last cell of the table, presses Tab and answers the render of the new row. */
function tabIntoNewRow(harness: RuntimeHarness, typed?: string) {
  const opened = openTableCellEditorForTab(harness, { mapped: true, start: [2, 1] });
  const table = harness.mappings.find((element) => element.tagName.toLowerCase() === "table")!;
  if (typed !== undefined) typeInto(opened.input(), typed);
  press(opened.input(), "Tab");
  assert.equal(finalSaves(harness).length, 1, "Tab in the last cell saves the new row");
  // The page renders the saved table again: the new row has two cells.
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 3;
  table.appendChild(row);
  const newCells = [0, 1].map((columnIndex) => {
    const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
    cell.cellIndex = columnIndex;
    row.appendChild(cell);
    row.cells.push(cell);
    return cell;
  });
  (table.rows as RuntimeElement[]).push(row);
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const open = messagesAfter(harness, before).find((message) => message.type === "previewEditOpen");
  assert.ok(open, "the editor reopens in the new row");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 8,
    requestId: 12,
    editId: open.editId,
    originalText: WITH_NEW_ROW,
  });
  return { ...opened, table, row, newCells };
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("the Tab hint shows in the last cell only, follows the editor and is described by the text box", () => {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness, { start: [1, 0] });
  assert.equal(hintsOf(harness).length, 0, "no hint in the first cell");
  click(cells[2][1]);
  const hints = hintsOf(harness);
  assert.equal(hints.length, 1, "the hint shows in the last cell of the last row");
  assert.equal(hints[0].textContent, "Tab: new row");
  const hintId = hints[0].getAttribute("id");
  assert.ok(hintId);
  assert.equal(input().getAttribute("aria-describedby"), hintId);
  click(cells[2][0]);
  assert.equal(hintsOf(harness).length, 0, "no hint in the other cell of the last row");
  assert.equal(input().getAttribute("aria-describedby"), null);
  click(cells[1][1]);
  assert.equal(hintsOf(harness).length, 0, "no hint in the last column of another row");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("the Tab hint appears after Tab into the last cell and goes after Shift+Tab out of it", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness, { start: [2, 0] });
  assert.equal(hintsOf(harness).length, 0);
  press(input(), "Tab");
  assert.equal(hintsOf(harness).length, 1);
  input().dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: NOOP });
  assert.equal(hintsOf(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Escape in the empty row that Tab added removes it with one final save", () => {
  const harness = createRuntimeHarness();
  const { input } = tabIntoNewRow(harness);
  const before = finalSaves(harness).length;
  press(input(), "Escape");
  const saves = finalSaves(harness);
  assert.equal(saves.length, before + 1, "one final save");
  assert.equal(saves.at(-1)?.editedText, TABLE);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Cancel in the empty row that Tab added removes it like Escape", () => {
  const harness = createRuntimeHarness();
  tabIntoNewRow(harness);
  const before = finalSaves(harness).length;
  harness.createdElements.filter((element) => element.tagName === "BUTTON"
    && element.getAttribute("aria-label") === "Cancel editing and restore the original text").at(-1)!.dispatch("click");
  const saves = finalSaves(harness);
  assert.equal(saves.length, before + 1);
  assert.equal(saves.at(-1)?.editedText, TABLE);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Escape after typing in the first cell of the added row drops the text and removes the row", () => {
  const harness = createRuntimeHarness();
  const { input } = tabIntoNewRow(harness);
  typeInto(input(), "x");
  press(input(), "Escape");
  assert.equal(finalSaves(harness).at(-1)?.editedText, TABLE);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("a cell of the added row left holding text keeps the row on Escape", () => {
  const harness = createRuntimeHarness();
  const { input } = tabIntoNewRow(harness);
  typeInto(input(), "x");
  press(input(), "Tab");
  press(input(), "Escape");
  const last = finalSaves(harness).at(-1);
  assert.match(String(last?.editedText), /\| x\s+\|\s+\|\n$/u);
  assert.match(String(last?.editedText), /\| p \| q \|\n\| x/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("a row added with the Row below button is not removed by Escape", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness, { mapped: true, start: [2, 1] });
  findButton(harness, "Insert row after selected row").dispatch("click");
  const table = harness.mappings.find((element) => element.tagName.toLowerCase() === "table")!;
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 3;
  table.appendChild(row);
  for (const columnIndex of [0, 1]) {
    const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
    cell.cellIndex = columnIndex;
    row.appendChild(cell);
    row.cells.push(cell);
  }
  (table.rows as RuntimeElement[]).push(row);
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const open = messagesAfter(harness, before).find((message) => message.type === "previewEditOpen");
  assert.ok(open);
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 8, requestId: 12,
    editId: open.editId, originalText: WITH_NEW_ROW,
  });
  const saves = finalSaves(harness).length;
  press(input(), "Escape");
  assert.equal(finalSaves(harness).length, saves, "Escape does not save a table without the row");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"
    && message.final === true && message.editedText === TABLE), false);
});
