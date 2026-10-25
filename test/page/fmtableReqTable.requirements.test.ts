import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  linkPanelOf,
  openTableCellEditorForTab,
  paletteButton,
  paletteMenu,
  stubExecCommand,
} from "./runtimeTestSupport";

/**
 * The table cell editor and its bar (features/tableCellEditor.ts, blockSourceEditor.ts,
 * blockEditor.ts, editMode.ts, pageInput.ts): states and refusals that the neighbouring
 * runtimeTableCellEditor.test.ts does not assert.
 */

const PIPE = "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n";
const LIST_TABLE = "```{list-table}\n:header-rows: 1\n\n* - A\n  - B\n* - x\n  - y\n```\n";

/** A table of three rows and two columns in the page; the bottom-right cell has index `columns - 1`. */
function buildTable(harness: RuntimeHarness, columns = 2): { table: RuntimeElement; cells: RuntimeElement[][] } {
  const table = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const rows: RuntimeElement[] = [];
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    rows.push(row);
    return Array.from({ length: columns }, (_, columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      row.cells.push(cell);
      return cell;
    });
  });
  table.rows = rows;
  harness.mappings.push(table);
  return { table, cells };
}

const clickEvent = () => ({ preventDefault: () => undefined, stopPropagation: () => undefined });

/** Opens the editor of one cell and returns before the host has answered. */
function openCellWithoutSource(harness: RuntimeHarness, row = 1, column = 0, columns = 2) {
  const { table, cells } = buildTable(harness, columns);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: cells[row]![column], ...clickEvent() });
  return { table, cell: cells[row]![column]!, request: harness.messages.at(-1)! };
}

function sendSource(harness: RuntimeHarness, editId: unknown, originalText: string): void {
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    originalText,
  });
}

function sendError(harness: RuntimeHarness, editId: unknown, error: string): void {
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    error,
  });
}

function cellEditorRegion(harness: RuntimeHarness): RuntimeElement {
  const region = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") === "true");
  assert.ok(region);
  return region;
}

function tableBar(harness: RuntimeHarness): RuntimeElement {
  const bar = harness.createdElements.find((element) => element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(bar);
  return bar;
}

function cellInput(harness: RuntimeHarness): RuntimeElement {
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  return input;
}

function barButton(harness: RuntimeHarness, label: string): RuntimeElement {
  const button = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === label).at(-1);
  assert.ok(button, label);
  return button;
}

const saves = (harness: RuntimeHarness): Array<Record<string, unknown>> =>
  harness.messages.filter((message) => message.type === "previewEditSave");

// @tests_req SwRS-MDOKFSTUDIO-TABLE-001
test("the cell editor shows a loading status until the host sends the table source", () => {
  const harness = createRuntimeHarness();
  const { request } = openCellWithoutSource(harness);
  const region = cellEditorRegion(harness);
  assert.equal(region.childElements.length, 1);
  assert.equal(region.childElements[0]!.getAttribute("data-sphinx-preview-edit-status"), "");
  assert.equal(region.childElements[0]!.textContent, "Loading Markdown table source…");
  assert.equal(harness.createdElements.some((element) => element.tagName === "TEXTAREA"), false);

  sendSource(harness, request.editId, PIPE);
  assert.ok(cellInput(harness));
  assert.equal(region.childElements.some((element) => element.textContent === "Loading Markdown table source…"), false);
  assert.match(tableBar(harness).childElements.at(-1)!.textContent, /^Row 1 of 2 · /u);
});

test("a source that is no pipe table, or has no cell at the clicked position, opens the raw Markdown editor", () => {
  const list = createRuntimeHarness();
  const { cell, request } = openCellWithoutSource(list);
  sendSource(list, request.editId, LIST_TABLE);
  assert.equal(cell.getAttribute("data-sphinx-preview-table-cell-selected"), null);
  const region = cellEditorRegion(list);
  assert.equal(region.getAttribute("aria-label"), "Raw Markdown editor");
  assert.equal(region.getAttribute("data-sphinx-preview-table-cell-editor"), null);
  const raw = list.createdElements.find((element) => element.getAttribute("aria-label") === "Raw Markdown block");
  assert.ok(raw);
  assert.equal(raw.tagName, "TEXTAREA");
  assert.equal(raw.value, LIST_TABLE.trimEnd());
  assert.equal(list.createdElements.some((element) => element.getAttribute("aria-label") === "Markdown table cell"), false);

  const wide = createRuntimeHarness();
  const beyond = openCellWithoutSource(wide, 1, 2, 3);
  sendSource(wide, beyond.request.editId, PIPE);
  assert.equal(cellEditorRegion(wide).getAttribute("aria-label"), "Raw Markdown editor");
  assert.ok(wide.createdElements.find((element) => element.getAttribute("aria-label") === "Raw Markdown block"));
  assert.equal(beyond.cell.getAttribute("data-sphinx-preview-table-cell-selected"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-018
test("an unchanged cell closes without a save; typed back after an autosave it saves a final text", () => {
  const untouched = createRuntimeHarness();
  const first = openTableCellEditorForTab(untouched);
  first.input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(saves(untouched).length, 0);
  assert.equal(untouched.messages.some((message) => message.type === "previewEditCancel"), false);
  assert.equal(untouched.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true").at(-1)?.removed, true);

  const typedBack = createRuntimeHarness();
  const second = openTableCellEditorForTab(typedBack);
  second.input().value = "changed";
  second.input().dispatch("input");
  typedBack.flushTimers();
  assert.equal(saves(typedBack).length, 1, "the autosave reached the document");
  assert.equal(saves(typedBack)[0]!.final, false, "an autosave is not a final save");
  second.input().value = "x";
  second.input().dispatch("input");
  second.input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const last = saves(typedBack).at(-1)!;
  assert.equal(last.final, true);
  assert.equal(last.editedText, PIPE);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-205
test("turning edit mode off saves a changed open cell and closes an unchanged or loading one without a save", () => {
  const changed = createRuntimeHarness();
  const opened = openTableCellEditorForTab(changed);
  opened.input().value = "edited";
  opened.input().dispatch("input");
  changed.editModeButton.dispatch("click");
  const last = saves(changed).at(-1)!;
  assert.equal(last.final, true);
  assert.match(String(last.editedText), /\| edited \| y \|/u);

  const unchanged = createRuntimeHarness();
  openTableCellEditorForTab(unchanged);
  unchanged.editModeButton.dispatch("click");
  assert.equal(saves(unchanged).length, 0);

  const loading = createRuntimeHarness();
  openCellWithoutSource(loading);
  const before = loading.messages.length;
  loading.editModeButton.dispatch("click");
  assert.equal(loading.messages.slice(before).some((message) => message.type === "previewEditSave"), false);
  assert.equal(cellEditorRegion(loading).removed, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-034
test("a host refusal of a cell save shows in the table bar; a refused open replaces the loading status", () => {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness);
  opened.input().value = "edited";
  opened.input().dispatch("input");
  opened.input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const save = saves(harness).at(-1)!;
  sendError(harness, save.editId, "Cannot save the table right now.");
  const status = tableBar(harness).childElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.ok(status);
  assert.equal(status.textContent, "Cannot save the table right now.");

  const refusedOpen = createRuntimeHarness();
  const { request } = openCellWithoutSource(refusedOpen);
  sendError(refusedOpen, request.editId, "Editing requires a trusted workspace.");
  const region = cellEditorRegion(refusedOpen);
  assert.equal(region.childElements.length, 1);
  assert.equal(region.childElements[0]!.textContent, "Editing requires a trusted workspace.");
  assert.equal(refusedOpen.createdElements.some((element) => element.tagName === "TEXTAREA"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-055
test("rendering the cell editor again closes the emoji picker, the link panel and the slash menu", () => {
  const picker = createRuntimeHarness({ initialPaletteMode: "myst" });
  const first = openTableCellEditorForTab(picker);
  const control = first.input();
  stubExecCommand(picker, control);
  control.value = "foo";
  control.dispatch("input");
  control.setSelectionRange(0, 3);
  paletteButton(picker, "emoji").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(picker), "the emoji picker is open");
  barButton(picker, "Insert column after selected column").dispatch("click");
  assert.equal(paletteMenu(picker), undefined, "the picker closed with the column button");

  const panel = createRuntimeHarness({ initialPaletteMode: "myst" });
  const second = openTableCellEditorForTab(panel);
  const secondControl = second.input();
  stubExecCommand(panel, secondControl);
  secondControl.value = "foo";
  secondControl.dispatch("input");
  secondControl.setSelectionRange(0, 3);
  paletteButton(panel, "link").dispatch("click", { preventDefault: () => undefined });
  assert.ok(linkPanelOf(panel), "the link panel is open");
  secondControl.dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  assert.equal(linkPanelOf(panel), undefined, "the panel closed when the editor moved to the next cell");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-064
test("the table bar position follows a window resize and stops once the editor is closed", () => {
  const harness = createRuntimeHarness({ viewportHeight: 600 });
  const section = new RuntimeElement({}, harness.windowState, 0, 3000, "section");
  harness.body.appendChild(section);
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 200, 1200, "table");
  section.appendChild(table);
  const row = new RuntimeElement({}, harness.windowState, 200, 30, "tr");
  row.rowIndex = 1;
  table.appendChild(row);
  const cell = new RuntimeElement({}, harness.windowState, 240, 30, "td");
  cell.cellIndex = 0;
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: cell, ...clickEvent() });
  sendSource(harness, harness.messages.at(-1)?.editId, PIPE);
  const menu = tableBar(harness);
  const shiftOf = (): number =>
    Number.parseFloat(menu.style.getPropertyValue("--sphinx-preview-table-menu-shift")) || 0;
  const tableTop = 200;
  let naturalTop = 156;
  menu.rectProvider = () => {
    const top = naturalTop - harness.windowState.scrollY + shiftOf();
    return { top, bottom: top + 40, height: 40, left: 0, right: 200, width: 200 };
  };
  table.rectProvider = () => ({
    top: tableTop - harness.windowState.scrollY, bottom: tableTop + 1200 - harness.windowState.scrollY,
    height: 1200, left: 0, right: 400, width: 400,
  });
  harness.windowState.scrollY = 400;
  harness.dispatchWindow("scroll");
  const afterScroll = shiftOf();
  assert.ok(afterScroll > 0);
  // The layout moved while the window was resized: the shift is computed again.
  naturalTop = 106;
  harness.dispatchWindow("resize");
  assert.notEqual(shiftOf(), afterScroll, "the resize recomputed the shift");

  const resized = shiftOf();
  cellInput(harness).dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  naturalTop = 56;
  harness.dispatchWindow("resize");
  harness.dispatchWindow("scroll");
  assert.equal(shiftOf(), resized, "nothing is recomputed once the editor is closed");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-070
test("a cell change after a refused conversion drops the prepared list-table and saves the pipe table", () => {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness);
  barButton(harness, "Convert to list-table").dispatch("click");
  const conversion = saves(harness).at(-1)!;
  assert.match(String(conversion.editedText), /^```\{list-table\}/u);
  sendError(harness, conversion.editId, "The host refused the conversion.");

  opened.input().value = "typed";
  opened.input().dispatch("input");
  opened.input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const next = saves(harness).at(-1)!;
  assert.equal(next.final, true);
  assert.equal(next.editedText, "| A | B |\n| --- | --- |\n| typed | y |\n| p | q |\n");

  const plain = createRuntimeHarness();
  const plainOpened = openTableCellEditorForTab(plain);
  plainOpened.input().value = "typed";
  plainOpened.input().dispatch("input");
  plainOpened.input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(saves(plain).at(-1)!.editedText, next.editedText);
});

test("the List table button does nothing and shows no message when the table text is not recognised", () => {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness);
  // A line break in a cell splits the source row, so the table text no longer parses.
  opened.input().value = "a\nb";
  opened.input().dispatch("input");
  const statusOf = (): string => tableBar(harness).childElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null)!.textContent;
  const before = statusOf();
  const finals = saves(harness).filter((message) => message.final === true).length;
  barButton(harness, "Convert to list-table").dispatch("click");
  assert.equal(statusOf(), before, "no message in the bar status");
  assert.equal(saves(harness).filter((message) => message.final === true).length, finals, "no final save");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-091
test("a line break pasted into the cell text box is kept and written into the source row", () => {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness);
  let prevented = false;
  opened.input().dispatch("paste", { preventDefault: () => { prevented = true; }, clipboardData: undefined });
  assert.equal(prevented, false, "the cell text box has no paste handler");
  opened.input().value = "a\nb";
  opened.input().dispatch("input");
  opened.input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const last = saves(harness).at(-1)!;
  assert.equal(last.final, true);
  assert.equal(last.editedText, "| A | B |\n| --- | --- |\n| a\nb | y |\n| p | q |\n");
});

test("a click outside any editable block saves the open cell once", () => {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness);
  opened.input().value = "edited";
  opened.input().dispatch("input");
  const outside = new RuntimeElement({}, harness.windowState, 900, 20, "p");
  harness.dispatchDocument("click", { target: outside, ...clickEvent() });
  const finals = saves(harness).filter((message) => message.final === true);
  assert.equal(finals.length, 1);
  assert.match(String(finals[0]!.editedText), /\| edited \| y \|/u);
  harness.dispatchDocument("click", { target: outside, ...clickEvent() });
  assert.equal(saves(harness).filter((message) => message.final === true).length, 1, "no second save");
});

test("a table bar taller than 40 percent of the viewport keeps its place above the table", () => {
  const run = (barHeight: number): { shift: number; stuck: string | null } => {
    const harness = createRuntimeHarness({ viewportHeight: 600 });
    const section = new RuntimeElement({}, harness.windowState, 0, 3000, "section");
    harness.body.appendChild(section);
    const table = new RuntimeElement({
      "data-sphinx-source-end-line": "23",
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": "20",
    }, harness.windowState, 200, 1200, "table");
    section.appendChild(table);
    const row = new RuntimeElement({}, harness.windowState, 200, 30, "tr");
    row.rowIndex = 1;
    table.appendChild(row);
    const cell = new RuntimeElement({}, harness.windowState, 240, 30, "td");
    cell.cellIndex = 0;
    row.appendChild(cell);
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", { target: cell, ...clickEvent() });
    sendSource(harness, harness.messages.at(-1)?.editId, PIPE);
    const menu = tableBar(harness);
    const shiftOf = (): number =>
      Number.parseFloat(menu.style.getPropertyValue("--sphinx-preview-table-menu-shift")) || 0;
    menu.rectProvider = () => {
      const top = 156 - harness.windowState.scrollY + shiftOf();
      return { top, bottom: top + barHeight, height: barHeight, left: 0, right: 200, width: 200 };
    };
    harness.windowState.scrollY = 400;
    harness.dispatchWindow("scroll");
    return { shift: shiftOf(), stuck: menu.getAttribute("data-sphinx-table-menu-stuck") };
  };
  assert.deepEqual(run(300), { shift: 0, stuck: null }, "300 px is over 40 percent of 600 px");
  const small = run(240);
  assert.ok(small.shift > 0, "240 px is exactly 40 percent: the bar rides down");
  assert.equal(small.stuck, "true");
});
