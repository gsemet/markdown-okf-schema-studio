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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S2
test("CR 157: Right on a selected table selects its first header cell", () => {
  const { harness, cells } = page();
  selectBlock(harness, 60);
  press(harness, "ArrowRight");
  assert.deepEqual(focusedCells(cells), ["0,0"]);
  assert.deepEqual(selectedLines(harness), [], "the cell, not the table, carries the outline");
  assert.equal(announcement(harness), "Table cell row 1, column 1 selected");
  assert.equal(cells[0][0].focusOptions !== undefined, true, "the cell takes the focus");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S2
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S2
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S1
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S1
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S1
test("CR 157: Right with the whole page selected selects its first block", () => {
  const { harness } = page();
  assert.deepEqual(selectedLines(harness), []);
  let prevented = 0;
  harness.dispatchDocument("keydown", key("ArrowRight", { preventDefault: () => { prevented += 1; } }));
  assert.deepEqual(selectedLines(harness), [1]);
  assert.equal(prevented, 1);
  assert.equal(announcement(harness), "1 block selected");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S1
test("CR 157: Right on a leaf block does nothing, Left at the top level does nothing", () => {
  const { harness } = page();
  selectBlock(harness, 50);
  press(harness, "ArrowRight");
  assert.deepEqual(selectedLines(harness), [50]);
  press(harness, "ArrowLeft");
  assert.deepEqual(selectedLines(harness), [50]);
  assert.equal(announcement(harness), "1 block selected");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S1
test("CR 157: Left, Right and Escape with nothing selected, or outside edit mode, do nothing", () => {
  const { harness } = page();
  press(harness, "ArrowLeft");
  press(harness, "Escape");
  assert.deepEqual(selectedLines(harness), []);
  const reading = createRuntimeHarness();
  press(reading, "ArrowRight");
  assert.deepEqual(selectedLines(reading), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S4
test("CR 157: the structural keys leave an open editor and modifier chords alone", () => {
  const { harness, cells } = page();
  selectBlock(harness, 60);
  press(harness, "ArrowRight");
  harness.dispatchDocument("keydown", key("ArrowRight", { shiftKey: true }));
  harness.dispatchDocument("keydown", key("ArrowRight", { metaKey: true }));
  harness.dispatchDocument("keydown", key("ArrowRight", { altKey: true }));
  assert.deepEqual(focusedCells(cells), ["0,0"]);
});

// A list at line 80 with two items: the first (lines 80 to 82) holds two paragraphs, the second
// (lines 84 and 85) one paragraph.
function listPage() {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const list = mapped(harness, 80, 85, 800, "ul");
  const first = mapped(harness, 80, 83, 800, "li");
  const second = mapped(harness, 84, 85, 840, "li");
  const paragraphs = [mapped(harness, 80, 80, 800, "p"), mapped(harness, 82, 82, 820, "p"), mapped(harness, 84, 85, 840, "p")];
  first.appendChild(paragraphs[0]);
  first.appendChild(paragraphs[1]);
  second.appendChild(paragraphs[2]);
  list.appendChild(first);
  list.appendChild(second);
  return { harness, list, first, second, paragraphs };
}

function opened(harness: RuntimeHarness, before: number): number[][] {
  return harness.messages.slice(before)
    .filter((message) => message.type === "previewEditOpen")
    .map((message) => [Number(message.line), Number(message.endLine)]);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S2
test("Right walks a list down to its items and their blocks, Enter edits the selected level, Left goes back up", () => {
  const { harness, list, first, second, paragraphs } = listPage();
  selectBlock(harness, 80);
  assert.equal(list.getAttribute(SELECTED), "true");
  press(harness, "ArrowRight");
  assert.equal(first.getAttribute(SELECTED), "true", "Right on the list selects its first item");
  press(harness, "ArrowDown");
  assert.equal(second.getAttribute(SELECTED), "true");
  press(harness, "ArrowUp");
  let before = harness.messages.length;
  press(harness, "Enter");
  assert.deepEqual(opened(harness, before), [[80, 83]], "Enter on an item edits that item");

  const again = listPage();
  selectBlock(again.harness, 80);
  press(again.harness, "ArrowRight");
  press(again.harness, "ArrowRight");
  press(again.harness, "ArrowDown");
  assert.equal(again.paragraphs[1].getAttribute(SELECTED), "true", "Right on an item selects its first block");
  before = again.harness.messages.length;
  press(again.harness, "Enter");
  assert.deepEqual(opened(again.harness, before), [[82, 83]], "Enter on a block of an item edits that block only, up to the end of the item");
  assert.equal(paragraphs.length, 3);

  const up = listPage();
  selectBlock(up.harness, 80);
  press(up.harness, "ArrowRight");
  press(up.harness, "ArrowRight");
  press(up.harness, "ArrowLeft");
  assert.equal(up.first.getAttribute(SELECTED), "true", "Left goes back to the item");
  press(up.harness, "ArrowLeft");
  assert.equal(up.list.getAttribute(SELECTED), "true", "and then to the list");
  before = up.harness.messages.length;
  press(up.harness, "Enter");
  assert.deepEqual(opened(up.harness, before), [[80, 85]], "Enter on the selected list edits the whole list");
});

/** Opens the selected block's editor with Enter, puts the caret at the `edge` and presses `arrow`. */
function arrowAtEdge(harness: RuntimeHarness, arrow: "ArrowUp" | "ArrowDown"): { prevented: boolean; opened: number[][] } {
  press(harness, "Enter");
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 7, requestId: 11,
    editId: harness.messages.at(-1)?.editId, originalText: "Inner text\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  const position = arrow === "ArrowDown" ? textarea.value.length : 0;
  textarea.setSelectionRange(position, position);
  const before = harness.messages.length;
  let prevented = false;
  textarea.dispatch("keydown", { key: arrow, preventDefault: () => { prevented = true; } });
  return { prevented, opened: opened(harness, before) };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-079#S6
test("the arrow at the edge of an admonition inner block editor stays with the text box", () => {
  for (const [arrow, line] of [["ArrowUp", 71], ["ArrowDown", 73]] as const) {
    const { harness } = page();
    selectBlock(harness, 70);
    press(harness, "ArrowRight");
    if (line === 73) press(harness, "ArrowDown");
    assert.deepEqual(selectedLines(harness), [line]);
    assert.deepEqual(arrowAtEdge(harness, arrow), { prevented: false, opened: [] }, arrow + " on the inner block at line " + line);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-079#S6
test("the arrow at the edge of a block inside a list item goes to the sibling item, then past the list", () => {
  const down = listPage();
  [down.first, down.second].forEach((item) => { item.siblingsFromParent = true; });
  selectBlock(down.harness, 80);
  press(down.harness, "ArrowRight");
  press(down.harness, "ArrowRight");
  press(down.harness, "ArrowDown");
  assert.deepEqual(arrowAtEdge(down.harness, "ArrowDown"), { prevented: true, opened: [[84, 85]] }, "to the next item");

  const past = listPage();
  [past.first, past.second].forEach((item) => { item.siblingsFromParent = true; });
  selectBlock(past.harness, 80);
  press(past.harness, "ArrowRight");
  press(past.harness, "ArrowDown");
  press(past.harness, "ArrowRight");
  assert.equal(past.paragraphs[2].getAttribute(SELECTED), "true");
  assert.deepEqual(arrowAtEdge(past.harness, "ArrowDown"), { prevented: true, opened: [[100, 100]] }, "past the list");
});
