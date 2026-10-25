import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import { altKey, sourceReply } from "./runtimeTestSupport";

/**
 * The row handles of a pipe table and the move of a body row (features/tableRowMove.ts).
 */

const SOURCE = "| H1 | H2 |\n| --- | --- |\n| a | 1 |\n| b | 2 |\n| c | 3 |\n";

interface FakeTable {
  table: RuntimeElement;
  rows: RuntimeElement[];
  cells: RuntimeElement[];
}

/** A pipe table of a header and `bodyRows` body rows, mapped at lines 20 to 24. */
function pipeTable(harness: ReturnType<typeof createRuntimeHarness>, bodyRows = 3, tag = "td"): FakeTable {
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": String(21 + bodyRows),
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 30 * (bodyRows + 1), "table");
  const rows: RuntimeElement[] = [];
  const cells: RuntimeElement[] = [];
  for (let index = 0; index <= bodyRows; index += 1) {
    const row = new RuntimeElement({}, harness.windowState, 100 + 30 * index, 30, "tr");
    row.rowIndex = index;
    const cell = new RuntimeElement({}, harness.windowState, 100 + 30 * index, 30, index === 0 ? "th" : tag);
    const second = new RuntimeElement({}, harness.windowState, 100 + 30 * index, 30, index === 0 ? "th" : tag);
    second.cellIndex = 1;
    row.cells = [cell, second];
    row.appendChild(cell);
    row.appendChild(second);
    table.appendChild(row);
    rows.push(row);
    cells.push(cell);
  }
  table.rows = rows;
  harness.contentTables.push(table);
  harnessUnderTest = harness;
  return { table, rows, cells };
}

let harnessUnderTest: ReturnType<typeof createRuntimeHarness> | undefined;

/** The live handle of the body row `cell` belongs to (the handles sit in a layer of their own). */
const handleOf = (cell: RuntimeElement): RuntimeElement | undefined =>
  harnessUnderTest?.createdElements.find((element) => element.getAttribute("data-okf-row-handle") !== null
    && !element.parentElement?.removed && element.getAttribute("data-okf-row") === String(cell.parentElement?.rowIndex));

const dragEvent = (clientY: number, dataTransfer: Record<string, unknown>) => ({
  clientY,
  dataTransfer,
  preventDefault: () => undefined,
  stopPropagation: () => undefined,
});

function messagesOf(harness: ReturnType<typeof createRuntimeHarness>, type: string) {
  return harness.messages.filter((message) => message.type === type);
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("edit mode shows a handle on each body row of a pipe table and not on the header", () => {
  const harness = createRuntimeHarness();
  const { table, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  assert.equal(handleOf(cells[0]!), undefined);
  for (const cell of cells.slice(1)) {
    const handle = handleOf(cell);
    assert.ok(handle, "a body row has a handle");
    assert.equal(handle.tagName, "BUTTON");
    assert.equal(handle.getAttribute("draggable"), "true");
    assert.match(handle.className, /okf-list-editor-handle/u);
    assert.equal(handle.getAttribute("aria-label"), "Move table row");
  }
  assert.equal(table.getAttribute("data-okf-row-handles"), "true");
  // Outside the table, in a layer of their own, centred on their row.
  const first = handleOf(cells[1]!)!;
  assert.equal(first.parentElement?.getAttribute("data-okf-row-handle-layer"), "true");
  assert.equal(first.parentElement?.parentElement, harness.body);
  assert.ok(cells.every((cell) => !handleOf(cell) || handleOf(cell)!.parentElement !== cell.parentElement));
  assert.equal(first.style.getPropertyValue("top"), "145px", "the middle of the row (top 130, height 30)");
  assert.equal(first.style.getPropertyValue("left"), "-4px", "just left of the table");
  assert.equal(table.getAttribute("data-okf-row-shift"), "true", "no room on the left: the table is pushed right");
  harness.editModeButton.dispatch("click");
  for (const cell of cells) assert.equal(handleOf(cell), undefined, "edit mode off removes the handles");
  assert.equal(table.getAttribute("data-okf-row-handles"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a captioned pipe table, paragraph cells outside a figure and a table with one body row get no handle", () => {
  const harness = createRuntimeHarness();
  const listTable = pipeTable(harness);
  for (const row of listTable.rows.slice(1)) {
    row.cells[0]!.appendChild(new RuntimeElement({}, harness.windowState, 0, 10, "p"));
  }
  const figure = new RuntimeElement({}, harness.windowState, 0, 10, "figure");
  const captioned = pipeTable(harness);
  figure.appendChild(captioned.table);
  const single = pipeTable(harness, 1);
  harness.editModeButton.dispatch("click");
  for (const entry of [listTable, captioned, single]) {
    assert.ok(entry.cells.every((cell) => handleOf(cell) === undefined));
    assert.equal(entry.table.getAttribute("data-okf-row-handles"), null);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("dragging a handle onto a row moves it with one save and opens no cell editor", () => {
  const harness = createRuntimeHarness();
  const { rows, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const handle = handleOf(cells[1]!)!;
  const transfer: Record<string, unknown> = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  handle.dispatch("dragstart", { dataTransfer: transfer });
  assert.equal(rows[1]!.getAttribute("data-okf-row-dragging"), "true");
  assert.equal(transfer.effectAllowed, "move");
  harness.windowState.scrollY = 0;
  rows[3]!.dispatch("dragover", dragEvent(rows[3]!.top + 5, transfer));
  assert.equal(rows[3]!.getAttribute("data-okf-row-drop"), "before");
  rows[3]!.dispatch("dragover", dragEvent(rows[3]!.top + 25, transfer));
  assert.equal(rows[3]!.getAttribute("data-okf-row-drop"), "after");
  rows[3]!.dispatch("drop", dragEvent(rows[3]!.top + 25, transfer));
  handle.dispatch("dragend");
  assert.equal(rows[1]!.getAttribute("data-okf-row-dragging"), null);
  assert.equal(rows[3]!.getAttribute("data-okf-row-drop"), null);

  const open = harness.messages.at(-1)!;
  assert.equal(open.type, "previewEditOpen");
  assert.equal(open.line, 20);
  assert.equal(open.endLine, 24);
  sourceReply(harness, SOURCE);
  const [save] = messagesOf(harness, "previewEditSave");
  assert.ok(save);
  assert.equal(save.editId, open.editId);
  assert.equal(save.final, true);
  assert.equal(save.originalText, SOURCE);
  assert.equal(save.editedText, "| H1 | H2 |\n| --- | --- |\n| b | 2 |\n| c | 3 |\n| a | 1 |\n");
  assert.equal(messagesOf(harness, "previewEditSave").length, 1);
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");
  assert.equal(harness.messages.at(-1)?.editId, open.editId);
  assert.ok(harness.createdElements.every((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === null));
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("dropping a row on the half of its neighbour that leaves it in place requests nothing", () => {
  const harness = createRuntimeHarness();
  const { rows, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const handle = handleOf(cells[2]!)!;
  const transfer = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  handle.dispatch("dragstart", { dataTransfer: transfer });
  harness.windowState.scrollY = 0;
  rows[3]!.dispatch("dragover", dragEvent(rows[3]!.top + 5, transfer));
  rows[3]!.dispatch("drop", dragEvent(rows[3]!.top + 5, transfer));
  handle.dispatch("dragend");
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a drop on the header row is refused and no source is requested", () => {
  const harness = createRuntimeHarness();
  const { rows, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const handle = handleOf(cells[2]!)!;
  const transfer = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  handle.dispatch("dragstart", { dataTransfer: transfer });
  harness.windowState.scrollY = 0;
  rows[0]!.dispatch("dragover", dragEvent(rows[0]!.top + 5, transfer));
  assert.equal(rows[0]!.getAttribute("data-okf-row-drop"), null);
  rows[0]!.dispatch("drop", dragEvent(rows[0]!.top + 5, transfer));
  handle.dispatch("dragend");
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("Alt+Down and Alt+Up on a handle move the row by one and Alt+Up on the first body row does nothing", () => {
  const harness = createRuntimeHarness();
  const { cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  handleOf(cells[1]!)!.dispatch("keydown", altKey("ArrowUp"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);

  let bubbled = false;
  handleOf(cells[2]!)!.dispatch("keydown", altKey("ArrowDown", { stopPropagation: () => { bubbled = true; } }));
  assert.equal(bubbled, true, "the block move chord does not see the key");
  sourceReply(harness, SOURCE);
  assert.equal(messagesOf(harness, "previewBlockMove").length, 0);
  assert.equal(messagesOf(harness, "previewEditSave")[0]?.editedText,
    "| H1 | H2 |\n| --- | --- |\n| a | 1 |\n| c | 3 |\n| b | 2 |\n");
  // The render of the edit has not arrived: a repeated key posts nothing for the stale rows.
  handleOf(cells[3]!)!.dispatch("keydown", altKey("ArrowUp"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 1);

  const open = messagesOf(harness, "previewEditOpen").length;
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(handleOf(cells[3]!)!.focusOptions?.preventScroll, true, "the handle of the moved row has the focus");
  handleOf(cells[3]!)!.dispatch("keydown", altKey("ArrowUp"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, open + 1, "the render frees the handles");
  sourceReply(harness, SOURCE);
  assert.equal(messagesOf(harness, "previewEditSave")[1]?.editedText,
    "| H1 | H2 |\n| --- | --- |\n| a | 1 |\n| c | 3 |\n| b | 2 |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a refused source or a source that is not a pipe table leaves the document alone", () => {
  const harness = createRuntimeHarness();
  const { cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  handleOf(cells[1]!)!.dispatch("keydown", altKey("ArrowDown"));
  sourceReply(harness, "", { originalText: undefined, error: "The preview is stale." });
  assert.equal(messagesOf(harness, "previewEditSave").length, 0);
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");

  handleOf(cells[1]!)!.dispatch("keydown", altKey("ArrowDown"));
  sourceReply(harness, "```{list-table}\n* - a\n  - b\n```\n");
  assert.equal(messagesOf(harness, "previewEditSave").length, 0);
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a click on a handle opens no editor and a drag is refused while a cell editor is open", () => {
  const harness = createRuntimeHarness();
  const { cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const handle = handleOf(cells[1]!)!;
  harness.dispatchDocument("click", { target: handle, preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);

  harness.dispatchDocument("click", {
    target: cells[2], preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.equal(messagesOf(harness, "previewEditOpen").length, 1);
  let prevented = false;
  handle.dispatch("dragstart", { preventDefault: () => { prevented = true; }, dataTransfer: {} });
  assert.equal(prevented, true);
  assert.equal(cells[1]!.parentElement?.getAttribute("data-okf-row-dragging"), null);
  assert.ok(handleOf(cells[2]!), "the handle of the row being edited stays");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a list-table shows handles under its header rows and a drag moves the whole item", () => {
  const harness = createRuntimeHarness();
  const { table, rows, cells } = pipeTable(harness, 4);
  const figure = new RuntimeElement({}, harness.windowState, 0, 10, "figure");
  figure.appendChild(table);
  for (const row of rows) {
    const cell = row.cells[0]!;
    cell.appendChild(new RuntimeElement({}, harness.windowState, 0, 10, "p"));
  }
  (table as unknown as { tHead: { rows: RuntimeElement[] } }).tHead = { rows: rows.slice(0, 2) };
  harness.editModeButton.dispatch("click");
  assert.ok(cells.slice(0, 2).every((cell) => handleOf(cell) === undefined), "the two header rows have no handle");
  assert.ok(cells.slice(2).every((cell) => handleOf(cell) !== undefined), "the body rows have a handle");

  const handle = handleOf(cells[2]!)!;
  const transfer: Record<string, unknown> = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  handle.dispatch("dragstart", { dataTransfer: transfer });
  harness.windowState.scrollY = 0;
  rows[1]!.dispatch("dragover", dragEvent(rows[1]!.top + 25, transfer));
  assert.equal(rows[1]!.getAttribute("data-okf-row-drop"), null, "a header row takes no drop");
  rows[4]!.dispatch("dragover", dragEvent(rows[4]!.top + 25, transfer));
  rows[4]!.dispatch("drop", dragEvent(rows[4]!.top + 25, transfer));
  handle.dispatch("dragend");
  const source = [
    "```{list-table}", ":header-rows: 2", "", "* - h", "  - h", "* - u", "  - u",
    "* - a", "  - one", "", "    more", "* - b", "  - two", "* - c", "  - three", "```", "",
  ].join("\n");
  sourceReply(harness, source);
  const [save] = messagesOf(harness, "previewEditSave");
  assert.ok(save);
  assert.equal(save.editedText, [
    "```{list-table}", ":header-rows: 2", "", "* - h", "  - h", "* - u", "  - u",
    "* - b", "  - two", "* - c", "  - three", "* - a", "  - one", "", "    more", "```", "",
  ].join("\n"));
});
