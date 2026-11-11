import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { messagesAfter, patchMessage, sourceReply } from "./runtimeTestSupport";

/**
 * A table inside a quote, an alert or an admonition gets the cell editor (features/blockSourceEditor.ts,
 * features/editMode.ts, features/tableCellEditor.ts, modules/tableInContainer.ts). The renderer maps
 * the table as a block of its own (its lines carry the quote prefixes); a block that holds the table
 * and is itself the click target is covered too.
 */

const FILE = {
  "data-sphinx-preview-document": "file:///active.md",
  "data-sphinx-source-file": "/workspace/active.md",
};

const QUOTE = "> | Q1 | Q2 |\n> | --- | --- |\n> | qa | qb |\n> | qc | qd |\n";
const TWO = "> intro\n> | P | Q |\n> | - | - |\n> | x | y |\n> | x2 | y2 |\n>\n> | R | S |\n> | - | - |\n> | u | v |\n> | w | z |\n";

interface Built {
  container: RuntimeElement;
  table: RuntimeElement;
  cells: RuntimeElement[][];
}

/** A table of three rendered rows and two columns, mapped from `line` to `endLine` when `mapped`. */
function buildTable(harness: RuntimeHarness, parent: RuntimeElement, line: number, endLine: number, mapped: boolean) {
  const table = new RuntimeElement(mapped ? {
    ...FILE, "data-sphinx-source-line": String(line), "data-sphinx-source-end-line": String(endLine),
  } : {}, harness.windowState, 100, 100, "table");
  const rows: RuntimeElement[] = [];
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    rows.push(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      row.cells.push(cell);
      return cell;
    });
  });
  table.rows = rows;
  parent.appendChild(table);
  if (mapped) harness.mappings.push(table);
  return { table, cells };
}

/** A quote mapped from `line` to `endLine`, holding one table (lines 20 to 23), mapped as the renderer does. */
function buildQuote(harness: RuntimeHarness, mappedTable = true): Built {
  const container = new RuntimeElement({
    ...FILE, "data-sphinx-source-line": "20", "data-sphinx-source-end-line": "23",
  }, harness.windowState, 100, 100, "blockquote");
  harness.mappings.push(container);
  return { container, ...buildTable(harness, container, 20, 23, mappedTable) };
}

/** A quote mapped from line 20 to 27 holding two tables, the quote being the only mapped block. */
function buildTwoTables(harness: RuntimeHarness) {
  const container = new RuntimeElement({
    ...FILE, "data-sphinx-source-line": "20", "data-sphinx-source-end-line": "27",
  }, harness.windowState, 100, 200, "blockquote");
  harness.mappings.push(container);
  const first = buildTable(harness, container, 21, 23, false);
  const second = buildTable(harness, container, 25, 27, false);
  return { container, first, second };
}

const click = (harness: RuntimeHarness, target: RuntimeElement): void => harness.dispatchDocument("click", {
  target, preventDefault: () => undefined, stopPropagation: () => undefined,
});

const regions = (harness: RuntimeHarness) => harness.createdElements.filter((element) =>
  element.getAttribute("data-sphinx-preview-block-editor") === "true");
const rawBox = (harness: RuntimeHarness) => harness.createdElements.find((element) =>
  element.getAttribute("aria-label") === "Raw Markdown block");
const bar = (harness: RuntimeHarness) => harness.createdElements.find((element) =>
  element.getAttribute("data-sphinx-table-menu") === "true");
const input = (harness: RuntimeHarness): RuntimeElement => {
  const control = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(control, "the cell input is open");
  return control;
};
const button = (harness: RuntimeHarness, label: string): RuntimeElement => {
  const found = harness.createdElements.filter((element) => element.getAttribute("aria-label") === label).at(-1);
  assert.ok(found, label);
  return found;
};
const finalSaves = (harness: RuntimeHarness) =>
  harness.messages.filter((message) => message.type === "previewEditSave" && message.final === true);

/** Opens the cell [row, column] of `cells`, the host answering `source`. */
function open(harness: RuntimeHarness, cells: RuntimeElement[][], row: number, column: number, source: string) {
  harness.editModeButton.dispatch("click");
  click(harness, cells[row]![column]!);
  const request = harness.messages.at(-1)!;
  sourceReply(harness, source);
  return request;
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a click on a cell of a table inside a quote opens the cell editor and the table bar, not the raw editor", () => {
  const harness = createRuntimeHarness();
  const { cells } = buildQuote(harness);
  const request = open(harness, cells, 1, 0, QUOTE);
  assert.equal(request.type, "previewEditOpen");
  assert.equal(request.line, 20);
  assert.equal(request.endLine, 23);
  assert.equal(request.cellEditor, true);
  assert.equal(regions(harness)[0]!.getAttribute("aria-label"), "Markdown table cell editor");
  assert.equal(rawBox(harness), undefined);
  assert.ok(bar(harness), "the table bar is there");
  assert.equal(input(harness).value, "qa");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("typing in a quoted table and Enter save one edit of the container: only the edited line changes", () => {
  const harness = createRuntimeHarness();
  const { cells } = buildQuote(harness);
  open(harness, cells, 1, 0, QUOTE);
  input(harness).value = "qaX";
  input(harness).dispatch("input");
  input(harness).dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const saves = finalSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]!.originalText, QUOTE);
  assert.equal(saves[0]!.editedText, "> | Q1 | Q2 |\n> | --- | --- |\n> | qaX | qb |\n> | qc | qd |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("Tab and the arrow keys move between the cells of a quoted table and keep the prefix", () => {
  const harness = createRuntimeHarness();
  const { cells } = buildQuote(harness);
  open(harness, cells, 1, 0, QUOTE);
  input(harness).value = "qa1";
  input(harness).dispatch("input");
  input(harness).dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  assert.equal(input(harness).value, "qb");
  input(harness).value = "qb1";
  input(harness).dispatch("input");
  input(harness).dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(finalSaves(harness).at(-1)!.editedText, "> | Q1 | Q2 |\n> | --- | --- |\n> | qa1 | qb1 |\n> | qc | qd |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("Tab in the last cell of a quoted table adds a prefixed row and the editor reopens in that table", () => {
  const harness = createRuntimeHarness();
  const { cells, table } = buildQuote(harness);
  open(harness, cells, 2, 1, QUOTE);
  input(harness).dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  const save = finalSaves(harness).at(-1)!;
  assert.equal(
    save.editedText,
    "> | Q1 | Q2 |\n> | --- | --- |\n> | qa | qb |\n> | qc | qd |\n> |    |    |\n",
  );
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.tableRowIndex, 3);
  assert.equal(pending?.tableColumnIndex, 0);
  // The render of the saved text has the new row; the table is a block inside the quote.
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 3;
  table.appendChild(row);
  (table.rows as RuntimeElement[]).push(row);
  [0, 1].forEach((columnIndex) => {
    const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
    cell.cellIndex = columnIndex;
    row.appendChild(cell);
    row.cells.push(cell);
  });
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const reopened = messagesAfter(harness, before).find((message) => message.type === "previewEditOpen");
  assert.ok(reopened, "the table is found again inside the quote");
  assert.equal(reopened.line, 20);
  sourceReply(harness, String(save.editedText), {
    documentId: "file:///active.md", revision: 8, requestId: 12, editId: reopened.editId,
  });
  assert.equal(row.cells[0]!.getAttribute("data-sphinx-preview-table-cell-selected"), "true");
  assert.equal(input(harness).value, "");
  assert.equal(harness.getWebviewState().pendingBlockNavigation, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("the second of two tables in a quote is edited by its rank and reopens by its rank", () => {
  const harness = createRuntimeHarness();
  const { first, second } = buildTwoTables(harness);
  const request = open(harness, second.cells, 1, 0, TWO);
  assert.equal(request.line, 20);
  assert.equal(request.endLine, 27);
  assert.equal(input(harness).value, "u");
  assert.ok(bar(harness));
  input(harness).value = "u2";
  input(harness).dispatch("input");
  button(harness, "Insert row after selected row").dispatch("click");
  const save = finalSaves(harness).at(-1)!;
  assert.equal(
    save.editedText,
    "> intro\n> | P | Q |\n> | - | - |\n> | x | y |\n> | x2 | y2 |\n>\n> | R | S |\n> | - | - |\n> | u2 | v |\n> |   |   |\n> | w | z |\n",
  );
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.tableRank, 1);
  assert.equal(pending?.tableRowIndex, 2);
  assert.equal(pending?.sourceLine, 20);
  // The render holds the new row: the editor reopens in the second table, not in the first.
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 3;
  second.table.appendChild(row);
  (second.table.rows as RuntimeElement[]).push(row);
  [0, 1].forEach((columnIndex) => {
    const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
    cell.cellIndex = columnIndex;
    row.appendChild(cell);
    row.cells.push(cell);
  });
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const reopened = messagesAfter(harness, before).find((message) => message.type === "previewEditOpen");
  assert.ok(reopened);
  sourceReply(harness, String(save.editedText), {
    documentId: "file:///active.md", revision: 8, requestId: 12, editId: reopened.editId,
  });
  assert.equal(second.cells[2]![0]!.getAttribute("data-sphinx-preview-table-cell-selected"), "true");
  assert.equal(first.cells.flat().some((cell) => cell.getAttribute("data-sphinx-preview-table-cell-selected") !== null), false);
  assert.equal(regions(harness).at(-1)!.getAttribute("aria-label"), "Markdown table cell editor");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a quoted table's bar disables Convert to list-table and says why", () => {
  const harness = createRuntimeHarness();
  const { cells } = buildQuote(harness);
  open(harness, cells, 1, 0, QUOTE);
  const convert = button(harness, "Convert to list-table");
  assert.equal(convert.disabled, true);
  assert.equal(convert.getAttribute("title"), "Not available for a table inside a quote or an admonition");
  const before = harness.messages.length;
  convert.dispatch("click");
  assert.equal(messagesAfter(harness, before).some((message) => message.type === "previewEditSave"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a quoted table whose lines do not share one prefix opens the raw editor, never a wrong table", () => {
  const lazy = createRuntimeHarness();
  const lazyTable = buildQuote(lazy);
  open(lazy, lazyTable.cells, 1, 0, "> | Q1 | Q2 |\n> | --- | --- |\n> | qa | qb |\n| qc | qd |\n");
  assert.equal(regions(lazy)[0]!.getAttribute("aria-label"), "Raw Markdown editor");
  assert.ok(rawBox(lazy));
  assert.equal(bar(lazy), undefined);

  const mixed = createRuntimeHarness();
  const mixedTable = buildQuote(mixed);
  open(mixed, mixedTable.cells, 1, 0, "> | Q1 | Q2 |\n>| --- | --- |\n> | qa | qb |\n> | qc | qd |\n");
  assert.equal(regions(mixed)[0]!.getAttribute("aria-label"), "Raw Markdown editor");
  assert.equal(bar(mixed), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("rendered tables that do not match the pipe tables of the source open the raw editor", () => {
  const harness = createRuntimeHarness();
  const { second } = buildTwoTables(harness);
  // The host's source holds one table where the page rendered two (a table in a fence, say).
  open(harness, second.cells, 1, 0, QUOTE);
  assert.equal(regions(harness)[0]!.getAttribute("aria-label"), "Raw Markdown editor");
  assert.ok(rawBox(harness));
  assert.equal(bar(harness), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a rendered table that has not the rows and columns of the source pipe table opens the raw editor", () => {
  // The page rendered 3 rows of 2 columns (an HTML table, a list-table, say) while the one pipe table
  // the source holds is a fenced code sample of 4 rows: same count of tables, another table.
  const rows = createRuntimeHarness();
  const rowTable = buildQuote(rows);
  open(rows, rowTable.cells, 1, 0, QUOTE + "> | qe | qf |\n");
  assert.equal(regions(rows)[0]!.getAttribute("aria-label"), "Raw Markdown editor");
  assert.equal(bar(rows), undefined);

  const columns = createRuntimeHarness();
  const columnTable = buildQuote(columns);
  open(columns, columnTable.cells, 1, 0, "> | Q1 | Q2 | Q3 |\n> | --- | --- | --- |\n> | qa | qb | qc |\n> | qd | qe | qf |\n");
  assert.equal(regions(columns)[0]!.getAttribute("aria-label"), "Raw Markdown editor");
  assert.equal(bar(columns), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-121
test("a table block that is itself the click target and holds no container keeps the plain path", () => {
  const harness = createRuntimeHarness();
  const parent = new RuntimeElement({}, harness.windowState, 100, 100, "div");
  const { table, cells } = buildTable(harness, parent, 20, 23, true);
  void table;
  open(harness, cells, 1, 0, "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n");
  assert.equal(regions(harness)[0]!.getAttribute("aria-label"), "Markdown table cell editor");
  input(harness).value = "x2";
  input(harness).dispatch("input");
  input(harness).dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(finalSaves(harness).at(-1)!.editedText, "| A | B |\n| --- | --- |\n| x2 | y |\n| p | q |\n");
  assert.equal(button(harness, "Convert to list-table").getAttribute("title"), "Convert to list-table");
});
