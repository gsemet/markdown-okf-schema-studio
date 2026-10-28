import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";

/**
 * Structural keyboard navigation: Right goes down one level of the document structure, Left and
 * Escape go up, the arrows walk the cells of a selected table (features/structuralNavigationView.ts,
 * wired from features/blockSelectionView.ts).
 */

const SELECTED = "data-sphinx-preview-block-selected";
const CELL_FOCUS = "data-sphinx-preview-cell-focus";

interface Page {
  harness: RuntimeHarness;
  table: RuntimeElement;
  cells: RuntimeElement[][];
  admonition: RuntimeElement;
  inner: RuntimeElement[];
}

function mapped(harness: RuntimeHarness, line: number, endLine: number, top: number, tag = "div"): RuntimeElement {
  const element = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": String(endLine),
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": String(line),
  }, harness.windowState, top, 40, tag);
  harness.mappings.push(element);
  return element;
}

// The default page has blocks at lines 1, 50 and 100. This one adds a 2 x 3 table at line 60 and
// an admonition at line 70 that holds two paragraphs (lines 71 and 73).
function page(): Page {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const table = mapped(harness, 60, 63, 600, "table");
  const rows = [0, 1].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 600 + rowIndex * 30, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    return row;
  });
  const cells = rows.map((row, rowIndex) => [0, 1, 2].map((cellIndex) => {
    const cell = new RuntimeElement({}, harness.windowState, row.top, 30, rowIndex === 0 ? "th" : "td");
    cell.cellIndex = cellIndex;
    row.appendChild(cell);
    return cell;
  }));
  rows.forEach((row, index) => { row.cells = cells[index]; });
  table.rows = rows;
  const admonition = mapped(harness, 70, 75, 700);
  const inner = [mapped(harness, 71, 71, 710, "p"), mapped(harness, 73, 73, 730, "p")];
  inner.forEach((element) => admonition.appendChild(element));
  return { harness, table, cells, admonition, inner };
}

function key(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const event: Record<string, unknown> = {
    key: name,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    stopImmediatePropagation: () => { event.immediatePropagationStopped = true; },
    ...extra,
  };
  return event;
}

function press(harness: RuntimeHarness, name: string): void {
  harness.dispatchDocument("keydown", key(name));
}

function selectedLines(harness: RuntimeHarness): number[] {
  return harness.mappings
    .filter((block) => block.getAttribute(SELECTED) !== null)
    .map((block) => Number(block.getAttribute("data-sphinx-source-line")));
}

function focusedCells(cells: RuntimeElement[][]): string[] {
  return cells.flatMap((row, r) => row.map((cell, c) => ({ cell, name: r + "," + c })))
    .filter(({ cell }) => cell.getAttribute(CELL_FOCUS) !== null)
    .map(({ name }) => name);
}

function announcement(harness: RuntimeHarness): string | undefined {
  return harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))?.textContent;
}

function selectBlock(harness: RuntimeHarness, line: number): void {
  for (let step = 0; step < 10 && !selectedLines(harness).includes(line); step += 1) press(harness, "ArrowDown");
  assert.deepEqual(selectedLines(harness), [line]);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Right on a selected table selects its first header cell", () => {
  const { harness, cells } = page();
  selectBlock(harness, 60);
  press(harness, "ArrowRight");
  assert.deepEqual(focusedCells(cells), ["0,0"]);
  assert.deepEqual(selectedLines(harness), [], "the cell, not the table, carries the outline");
  assert.equal(announcement(harness), "Table cell row 1, column 1 selected");
  assert.equal(cells[0][0].focusOptions !== undefined, true, "the cell takes the focus");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: the four arrows move cell to cell and stop at the edges", () => {
  const { harness, cells } = page();
  selectBlock(harness, 60);
  press(harness, "ArrowRight");
  press(harness, "ArrowLeft");
  assert.deepEqual(focusedCells(cells), ["0,0"], "Left at the first column stays on the cell");
  press(harness, "ArrowUp");
  assert.deepEqual(focusedCells(cells), ["0,0"], "Up on the first row stays");
  press(harness, "ArrowRight");
  press(harness, "ArrowRight");
  assert.deepEqual(focusedCells(cells), ["0,2"]);
  press(harness, "ArrowRight");
  assert.deepEqual(focusedCells(cells), ["0,2"], "no wrap past the last column");
  press(harness, "ArrowDown");
  assert.deepEqual(focusedCells(cells), ["1,2"]);
  press(harness, "ArrowDown");
  assert.deepEqual(focusedCells(cells), ["1,2"], "no wrap past the last row");
  press(harness, "ArrowLeft");
  press(harness, "ArrowUp");
  assert.deepEqual(focusedCells(cells), ["0,1"]);
  assert.equal(announcement(harness), "Table cell row 1, column 2 selected");
  assert.deepEqual(selectedLines(harness), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Escape on a cell returns to the table block, a second Escape leaves the selection", () => {
  const { harness, cells } = page();
  selectBlock(harness, 60);
  press(harness, "ArrowRight");
  press(harness, "ArrowRight");
  press(harness, "Escape");
  assert.deepEqual(focusedCells(cells), []);
  assert.deepEqual(selectedLines(harness), [60]);
  press(harness, "Escape");
  assert.deepEqual(selectedLines(harness), [], "Escape at the top level keeps clearing the selection");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Enter on a selected cell opens the cell editor like a click", () => {
  const { harness, table, cells } = page();
  selectBlock(harness, 60);
  press(harness, "ArrowRight");
  press(harness, "ArrowRight");
  press(harness, "ArrowDown");
  const before = harness.messages.length;
  press(harness, "Enter");
  const opened = harness.messages.slice(before).filter((message) => message.type === "previewEditOpen");
  assert.equal(opened.length, 1);
  assert.equal(opened[0].line, 60);
  assert.equal(opened[0].endLine, 63);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: opened[0].editId,
    originalText: "| A | B | C |\n| --- | --- | --- |\n| x | y | z |\n",
  });
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true");
  assert.ok(editor, "the table cell editor is open");
  assert.equal(editor.parentElement, cells[1][1]);
  assert.equal(table.getAttribute("data-sphinx-preview-editing"), null);
  assert.deepEqual(focusedCells(cells), [], "the editor replaces the cell highlight");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Right on an admonition selects its first inner block, Left and Escape go back up", () => {
  const { harness, inner } = page();
  selectBlock(harness, 70);
  press(harness, "ArrowRight");
  assert.deepEqual(selectedLines(harness), [71]);
  assert.equal(inner[0].getAttribute(SELECTED), "true");
  press(harness, "ArrowLeft");
  assert.deepEqual(selectedLines(harness), [70]);
  press(harness, "ArrowRight");
  assert.deepEqual(selectedLines(harness), [71]);
  press(harness, "Escape");
  assert.deepEqual(selectedLines(harness), [70], "Escape goes up one level, not out of the selection");
  press(harness, "Escape");
  assert.deepEqual(selectedLines(harness), [], "at the top level Escape clears as before");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Up and Down walk the inner blocks of a container and stop at its edges", () => {
  const { harness } = page();
  selectBlock(harness, 70);
  press(harness, "ArrowRight");
  press(harness, "ArrowUp");
  assert.deepEqual(selectedLines(harness), [71], "Up at the first inner block stays inside");
  press(harness, "ArrowDown");
  assert.deepEqual(selectedLines(harness), [73]);
  press(harness, "ArrowDown");
  assert.deepEqual(selectedLines(harness), [73], "Down at the last inner block stays inside");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Enter on an inner block opens that block's editor", () => {
  const { harness } = page();
  selectBlock(harness, 70);
  press(harness, "ArrowRight");
  const before = harness.messages.length;
  press(harness, "Enter");
  const opened = harness.messages.slice(before).filter((message) => message.type === "previewEditOpen");
  assert.equal(opened.length, 1);
  assert.equal(opened[0].line, 71);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Right with the whole page selected selects its first block", () => {
  const { harness } = page();
  assert.deepEqual(selectedLines(harness), []);
  let prevented = 0;
  harness.dispatchDocument("keydown", key("ArrowRight", { preventDefault: () => { prevented += 1; } }));
  assert.deepEqual(selectedLines(harness), [1]);
  assert.equal(prevented, 1);
  assert.equal(announcement(harness), "1 block selected");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Right on a leaf block does nothing, Left at the top level does nothing", () => {
  const { harness } = page();
  selectBlock(harness, 50);
  press(harness, "ArrowRight");
  assert.deepEqual(selectedLines(harness), [50]);
  press(harness, "ArrowLeft");
  assert.deepEqual(selectedLines(harness), [50]);
  assert.equal(announcement(harness), "1 block selected");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Left, Right and Escape with nothing selected, or outside edit mode, do nothing", () => {
  const { harness } = page();
  press(harness, "ArrowLeft");
  press(harness, "Escape");
  assert.deepEqual(selectedLines(harness), []);
  const reading = createRuntimeHarness();
  press(reading, "ArrowRight");
  assert.deepEqual(selectedLines(reading), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: the structural keys leave an open editor and modifier chords alone", () => {
  const { harness, cells } = page();
  selectBlock(harness, 60);
  press(harness, "ArrowRight");
  harness.dispatchDocument("keydown", key("ArrowRight", { shiftKey: true }));
  harness.dispatchDocument("keydown", key("ArrowRight", { metaKey: true }));
  harness.dispatchDocument("keydown", key("ArrowRight", { altKey: true }));
  assert.deepEqual(focusedCells(cells), ["0,0"]);
});
