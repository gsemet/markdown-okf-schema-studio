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

/** The live column handle of column `index` of the tables on the page. */
const columnHandle = (index: number): RuntimeElement | undefined =>
  harnessUnderTest?.createdElements.find((element) => element.getAttribute("data-okf-col-handle") !== null
    && !element.parentElement?.removed && element.getAttribute("data-okf-col") === String(index));

const LIST_SOURCE = [
  "```{list-table}", ":header-rows: 1", "", "* - H1", "  - H2", "* - a", "  - 1", "* - b", "  - 2",
  "* - c", "  - 3", "```", "",
].join("\n");

/** A list-table of a header and `bodyRows` body rows: a figure around a table of paragraph cells. */
function listTable(harness: ReturnType<typeof createRuntimeHarness>, bodyRows = 3): FakeTable {
  const entry = pipeTable(harness, bodyRows);
  const figure = new RuntimeElement({}, harness.windowState, 0, 10, "figure");
  figure.appendChild(entry.table);
  for (const row of entry.rows) {
    for (const cell of row.cells) cell.appendChild(new RuntimeElement({}, harness.windowState, 0, 10, "p"));
  }
  return entry;
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("edit mode shows a handle above each column of a pipe table, outside its cells", () => {
  const harness = createRuntimeHarness();
  const { table, rows, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  for (const index of [0, 1]) {
    const handle = columnHandle(index);
    assert.ok(handle, "a column has a handle");
    assert.equal(handle.tagName, "BUTTON");
    assert.equal(handle.getAttribute("draggable"), "true");
    assert.equal(handle.getAttribute("aria-label"), "Move table column");
    assert.match(handle.className, /okf-list-editor-handle okf-table-col-handle/u);
    // In the layer of its own, not in a cell or a row of the table.
    assert.equal(handle.parentElement?.getAttribute("data-okf-row-handle-layer"), "true");
    assert.ok(rows.every((row) => !row.contains(handle)));
  }
  const first = columnHandle(0)!;
  assert.equal(first.style.getPropertyValue("left"), "100px", "the middle of the header cell (left 0, width 200)");
  assert.equal(first.style.getPropertyValue("top"), "98px", "just above the top of the table (100)");
  assert.equal(table.getAttribute("data-okf-col-handles"), "true");
  assert.ok(cells.every((cell) => cell.getAttribute("data-okf-col-handle") === null));
  harness.editModeButton.dispatch("click");
  assert.equal(columnHandle(0), undefined, "edit mode off removes the handles");
  assert.equal(table.getAttribute("data-okf-col-handles"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a table with one body row has column handles and no row handle; one column has none", () => {
  const harness = createRuntimeHarness();
  const single = pipeTable(harness, 1);
  harness.editModeButton.dispatch("click");
  assert.ok(columnHandle(0) && columnHandle(1));
  assert.equal(handleOf(single.cells[1]!), undefined);
  assert.equal(single.table.getAttribute("data-okf-row-handles"), null);

  const narrow = createRuntimeHarness();
  const one = pipeTable(narrow, 3);
  one.rows.forEach((row) => { row.cells = [row.cells[0]!]; });
  narrow.editModeButton.dispatch("click");
  assert.equal(columnHandle(0), undefined, "nothing to reorder in a one-column table");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a list-table, a captioned table and the properties table: column handles on the first only", () => {
  const harness = createRuntimeHarness();
  const list = listTable(harness);
  const figure = new RuntimeElement({}, harness.windowState, 0, 10, "figure");
  const captioned = pipeTable(harness);
  figure.appendChild(captioned.table);
  harness.editModeButton.dispatch("click");
  assert.equal(list.table.getAttribute("data-okf-col-handles"), "true");
  assert.equal(captioned.table.getAttribute("data-okf-col-handles"), null);
  assert.equal(list.table.getAttribute("data-okf-row-handles"), "true", "the list-table keeps its row handles");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("dragging a column handle onto another column moves it with one save and no cell editor", () => {
  const harness = createRuntimeHarness();
  const { rows, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const handle = columnHandle(0)!;
  const transfer: Record<string, unknown> = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  handle.dispatch("dragstart", { dataTransfer: transfer });
  assert.equal(transfer.effectAllowed, "move");
  assert.equal(rows[2]!.cells[0]!.getAttribute("data-okf-col-dragging"), "true", "the dragged column is dimmed");
  assert.equal(rows[0]!.cells[0]!.getAttribute("data-okf-col-dragging"), "true");
  const over = rows[2]!.cells[1]!;
  over.dispatch("dragover", { ...dragEvent(0, transfer), clientX: 20 });
  assert.equal(over.getAttribute("data-okf-col-drop"), "before");
  assert.equal(rows[0]!.cells[1]!.getAttribute("data-okf-col-drop"), "before", "the whole column shows the line");
  over.dispatch("dragover", { ...dragEvent(0, transfer), clientX: 180 });
  assert.equal(over.getAttribute("data-okf-col-drop"), "after");
  over.dispatch("drop", { ...dragEvent(0, transfer), clientX: 180 });
  handle.dispatch("dragend");
  assert.equal(over.getAttribute("data-okf-col-drop"), null);
  assert.equal(rows[0]!.cells[0]!.getAttribute("data-okf-col-dragging"), null);

  const open = harness.messages.at(-1)!;
  assert.equal(open.type, "previewEditOpen");
  assert.equal(open.line, 20);
  sourceReply(harness, SOURCE);
  const [save] = messagesOf(harness, "previewEditSave");
  assert.ok(save);
  assert.equal(save.final, true);
  assert.equal(save.editedText, "| H2 | H1 |\n| --- | --- |\n| 1 | a |\n| 2 | b |\n| 3 | c |\n");
  assert.equal(messagesOf(harness, "previewEditSave").length, 1);
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");
  assert.ok(harness.createdElements.every((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === null));
  assert.ok(cells.length > 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a drop of a column on its own place requests nothing; a row drag does not drop on a column", () => {
  const harness = createRuntimeHarness();
  const { rows, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const transfer = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  columnHandle(0)!.dispatch("dragstart", { dataTransfer: transfer });
  const own = rows[1]!.cells[0]!;
  own.dispatch("dragover", { ...dragEvent(0, transfer), clientX: 180 });
  own.dispatch("drop", { ...dragEvent(0, transfer), clientX: 180 });
  // The right half of the left neighbour of the next column leaves the column in place too.
  rows[1]!.cells[1]!.dispatch("dragover", { ...dragEvent(0, transfer), clientX: 20 });
  rows[1]!.cells[1]!.dispatch("drop", { ...dragEvent(0, transfer), clientX: 20 });
  columnHandle(0)!.dispatch("dragend");
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);

  const handle = handleOf(cells[1]!)!;
  handle.dispatch("dragstart", { dataTransfer: transfer });
  rows[2]!.cells[1]!.dispatch("dragover", { ...dragEvent(0, transfer), clientX: 20 });
  assert.equal(rows[2]!.cells[1]!.getAttribute("data-okf-col-drop"), null, "a row drag shows no column line");
  handle.dispatch("dragend");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("Alt+Right and Alt+Left on a column handle move the column by one, at the edges nothing", () => {
  const harness = createRuntimeHarness();
  pipeTable(harness);
  harness.editModeButton.dispatch("click");
  columnHandle(0)!.dispatch("keydown", altKey("ArrowLeft"));
  columnHandle(1)!.dispatch("keydown", altKey("ArrowRight"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);
  // The row chord is not a column chord, and a plain arrow is left alone.
  columnHandle(0)!.dispatch("keydown", altKey("ArrowDown"));
  columnHandle(0)!.dispatch("keydown", { key: "ArrowRight", preventDefault: () => undefined });
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);

  let bubbled = false;
  columnHandle(0)!.dispatch("keydown", altKey("ArrowRight", { stopPropagation: () => { bubbled = true; } }));
  assert.equal(bubbled, true, "the chord stays on the handle");
  sourceReply(harness, SOURCE);
  assert.equal(messagesOf(harness, "previewEditSave")[0]?.editedText,
    "| H2 | H1 |\n| --- | --- |\n| 1 | a |\n| 2 | b |\n| 3 | c |\n");
  // Until the render arrives the page is stale: a repeat posts nothing.
  columnHandle(1)!.dispatch("keydown", altKey("ArrowLeft"));
  assert.equal(messagesOf(harness, "previewEditOpen").length, 1);
  // After the render the handle of the moved column has the focus.
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  assert.equal(columnHandle(1)!.focusOptions?.preventScroll, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a column of a list-table moves on the directive source, keeping its syntax", () => {
  const harness = createRuntimeHarness();
  const { rows } = listTable(harness);
  harness.editModeButton.dispatch("click");
  const handle = columnHandle(1)!;
  const transfer = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  handle.dispatch("dragstart", { dataTransfer: transfer });
  const over = rows[1]!.cells[0]!;
  over.dispatch("dragover", { ...dragEvent(0, transfer), clientX: 20 });
  over.dispatch("drop", { ...dragEvent(0, transfer), clientX: 20 });
  handle.dispatch("dragend");
  sourceReply(harness, LIST_SOURCE);
  assert.equal(messagesOf(harness, "previewEditSave")[0]?.editedText, [
    "```{list-table}", ":header-rows: 1", "", "* - H2", "  - H1", "* - 1", "  - a", "* - 2", "  - b",
    "* - 3", "  - c", "```", "",
  ].join("\n"));
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a source that cannot move a column leaves the document alone", () => {
  const harness = createRuntimeHarness();
  pipeTable(harness);
  harness.editModeButton.dispatch("click");
  columnHandle(0)!.dispatch("keydown", altKey("ArrowRight"));
  sourceReply(harness, "", { originalText: undefined, error: "The preview is stale." });
  assert.equal(messagesOf(harness, "previewEditSave").length, 0);
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");

  columnHandle(0)!.dispatch("keydown", altKey("ArrowRight"));
  sourceReply(harness, "```{list-table}\n* - a\n  - b\n```\n");
  assert.equal(messagesOf(harness, "previewEditSave").length, 0, "a list-table source for a pipe table");
  assert.equal(harness.messages.at(-1)?.type, "previewEditClosed");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a click on a column handle opens no editor", () => {
  const harness = createRuntimeHarness();
  pipeTable(harness);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: columnHandle(0), preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.equal(messagesOf(harness, "previewEditOpen").length, 0);
});

/** Opens the cell editor on `cell` (the source of the table is `SOURCE`) and returns its text box. */
function openCellEditor(harness: ReturnType<typeof createRuntimeHarness>, cell: RuntimeElement): RuntimeElement {
  harness.dispatchDocument("click", {
    target: cell, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  sourceReply(harness, SOURCE);
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input, "the cell editor is open");
  return input;
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a row handle moves its row while a cell editor of the table is open, saving the typed text with it", () => {
  const harness = createRuntimeHarness();
  const { rows, cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const input = openCellEditor(harness, cells[2]!);
  input.value = "b-typed";
  const opens = messagesOf(harness, "previewEditOpen").length;
  const handle = handleOf(cells[1]!)!;
  const transfer: Record<string, unknown> = { effectAllowed: "", dropEffect: "", setData: () => undefined };
  let prevented = false;
  handle.dispatch("dragstart", { dataTransfer: transfer, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false, "the drag is not refused");
  harness.windowState.scrollY = 0;
  rows[3]!.dispatch("dragover", dragEvent(rows[3]!.top + 25, transfer));
  rows[3]!.dispatch("drop", dragEvent(rows[3]!.top + 25, transfer));
  handle.dispatch("dragend");
  assert.equal(messagesOf(harness, "previewEditOpen").length, opens, "no source is requested: the editor has it");
  const saves = messagesOf(harness, "previewEditSave").filter((message) => message.final === true);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]!.editedText, "| H1 | H2 |\n| --- | --- |\n| b-typed | 2 |\n| c | 3 |\n| a | 1 |\n");
  assert.equal(saves[0]!.originalText, SOURCE);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
test("a column handle and Alt+Right move a column while a cell editor of the table is open", () => {
  const harness = createRuntimeHarness();
  const { cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  const input = openCellEditor(harness, cells[2]!);
  input.value = "b-typed";
  columnHandle(0)!.dispatch("keydown", altKey("ArrowRight"));
  const saves = messagesOf(harness, "previewEditSave").filter((message) => message.final === true);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]!.editedText, "| H2 | H1 |\n| --- | --- |\n| 1 | a |\n| 2 | b-typed |\n| 3 | c |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
test("a drag is still refused while the source of a cell editor has not arrived", () => {
  const harness = createRuntimeHarness();
  const { cells } = pipeTable(harness);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cells[2], preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  let prevented = false;
  columnHandle(0)!.dispatch("dragstart", { preventDefault: () => { prevented = true; }, dataTransfer: {} });
  assert.equal(prevented, true);
});
