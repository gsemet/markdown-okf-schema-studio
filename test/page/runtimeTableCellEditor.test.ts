import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import {
  altKey,
  cellEditorOf,
  openBlockEditorWithSource,
  openTableCellEditor,
  openTableCellEditorForTab,
  shiftKey,
} from "./runtimeTestSupport";

/**
 * The table cell editor and its toolbar (features/tableCellEditor.ts).
 */

// @tests_req SwRS-MDOKFSTUDIO-TABLE-001
// @tests_req SwRS-MDOKFSTUDIO-TABLE-013
// @tests_req SwRS-MDOKFSTUDIO-TABLE-055
test("table cell editing exposes row and column operations and saves the edited table", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  const renderedContent = new RuntimeElement({}, harness.windowState, 100, 30, "strong");
  renderedContent.textContent = "y";
  cell.appendChild(renderedContent);
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const request = harness.messages.at(-1);
  assert.equal(request?.type, "previewEditOpen");
  assert.equal(request?.line, 20);
  assert.equal(request?.endLine, 23);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | :---: |\n| x | y |\n| p | q |\n",
  });

  let input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  assert.equal(input.tagName, "TEXTAREA");
  assert.equal(input.value, "y");
  const cellEditor = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true");
  assert.ok(cellEditor);
  assert.equal(cellEditor.parentElement, cell);
  const hiddenContent = cell.childElements.find((element) =>
    element.getAttribute("data-sphinx-table-cell-content") === "true");
  assert.ok(hiddenContent);
  assert.equal(renderedContent.parentElement, hiddenContent);
  assert.equal(hiddenContent.getAttribute("aria-hidden"), "true");
  const tableMenu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(tableMenu);
  tableMenu.height = 40;
  cell.rectProvider = () => ({
    top: cell.top - harness.windowState.scrollY,
    bottom: cell.top - harness.windowState.scrollY + cell.height,
    height: cell.height,
    left: 120,
    width: 200,
  });
  harness.dispatchWindow("resize");
  // The toolbar is in the document flow (no body placement, no floating coordinates); its parent
  // here is the detached test table's parent, i.e. the body fallback.
  assert.equal(tableMenu.getAttribute("role"), "toolbar");
  assert.equal(tableMenu.getAttribute("data-placement"), null);
  assert.equal(tableMenu.style.getPropertyValue("--sphinx-preview-table-menu-top"), "");
  assert.equal(tableMenu.style.getPropertyValue("--sphinx-preview-table-menu-left"), "");
  cell.top = 100;
  assert.equal(
    tableMenu.childElements.filter((element) => element.tagName === "BUTTON").length,
    7,
  );
  const operationButtons = harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-table-operation") !== null);
  assert.equal(operationButtons.length, 7);
  assert.ok(operationButtons.every((button) =>
    button.innerHTML.includes("<svg") && button.getAttribute("title") !== null));
  assert.equal(harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-save") !== null
    || element.getAttribute("data-sphinx-preview-table-cancel") !== null).length, 0);
  input.value = "new";
  input.dispatch("input");
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Insert row after selected row").at(-1)?.dispatch("click");
  // The press saves the table and has the page render it again: the editor reopens in the new row
  // (a row the open editor's DOM does not have), with the typed text kept in the original cell.
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.equal(save?.originalText, "| A | B |\n| --- | :---: |\n| x | y |\n| p | q |\n");
  assert.equal(save?.editedText, [
    "| A | B |",
    "| --- | :---: |",
    "| x | new |",
    "|   |   |",
    "| p | q |",
    "",
  ].join("\n"));
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.tableRowIndex, 2);
  assert.equal(pending?.tableColumnIndex, 1);
  assert.equal(pending?.sourceLine, 20);
});

/** A press of `label` on the cell (row 1, column `column`) of the two-column table of the tab helper. */
function pressTableButton(label: string, options: { row?: number; column?: number; typed?: string } = {}) {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness);
  click(cells[options.row ?? 1][options.column ?? 0]);
  if (options.typed !== undefined) {
    input().value = options.typed;
    input().dispatch("input");
  }
  const button = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === label).at(-1);
  assert.ok(button, label);
  const disabled = button.disabled;
  const before = harness.messages.length;
  button.dispatch("click");
  const save = harness.messages.slice(before).find((message) => message.type === "previewEditSave");
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  return { harness, disabled, save, pending };
}

const COMPACT = "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n";

// @tests_req SwRS-MDOKFSTUDIO-TABLE-003
test("Row above inserts an empty row above the selected one and keeps its text", () => {
  const { save, pending } = pressTableButton("Insert row before selected row", { row: 2, column: 1, typed: "qq" });
  assert.equal(save?.originalText, COMPACT);
  assert.match(String(save?.editedText), /^\| A \| B \|\n\| --- \| --- \|\n\| x \| y \|\n\|\s*\|\s*\|\n\| p \| qq \|\n$/u);
  assert.equal(pending?.tableRowIndex, 2);
  assert.equal(pending?.tableColumnIndex, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-003
test("Row above is off in the header row", () => {
  const { disabled, save } = pressTableButton("Insert row before selected row", { row: 0 });
  assert.equal(disabled, true);
  assert.equal(save, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-055
test("Row below on the header row inserts the first body row", () => {
  const { save, pending } = pressTableButton("Insert row after selected row", { row: 0, column: 1 });
  assert.match(String(save?.editedText), /^\| A \| B \|\n\| --- \| --- \|\n\|\s*\|\s*\|\n\| x \| y \|\n\| p \| q \|\n$/u);
  assert.equal(pending?.tableRowIndex, 1);
  assert.equal(pending?.tableColumnIndex, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-055
test("Row - removes the selected body row and keeps the editor on the row that took its place", () => {
  const { save, pending } = pressTableButton("Delete selected row", { row: 1, column: 1 });
  assert.equal(save?.editedText, "| A | B |\n| --- | --- |\n| p | q |\n");
  assert.equal(pending?.tableRowIndex, 1);
  assert.equal(pending?.tableColumnIndex, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-004
test("Col left inserts an empty column to the left and leaves the title of the selected column", () => {
  const { save, pending } = pressTableButton("Insert column before selected column", { row: 0, column: 1, typed: "B" });
  assert.equal(save?.originalText, COMPACT);
  const lines = String(save?.editedText).split("\n");
  assert.equal(lines[0].replace(/\s+/gu, ""), "|A||B|", "the header keeps both titles and gains an empty cell");
  assert.equal(lines[1].replace(/\s+/gu, ""), "|---|---|---|");
  assert.equal(lines[2].replace(/\s+/gu, ""), "|x||y|");
  assert.equal(lines[3].replace(/\s+/gu, ""), "|p||q|");
  assert.equal(pending?.tableRowIndex, 0);
  assert.equal(pending?.tableColumnIndex, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-055
test("Col right inserts an empty column to the right and leaves the title of the selected column", () => {
  const { save, pending } = pressTableButton("Insert column after selected column", { row: 0, column: 0 });
  const lines = String(save?.editedText).split("\n");
  assert.equal(lines[0].replace(/\s+/gu, ""), "|A||B|");
  assert.equal(lines[2].replace(/\s+/gu, ""), "|x||y|");
  assert.equal(pending?.tableRowIndex, 0);
  assert.equal(pending?.tableColumnIndex, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-055
test("Col - removes the selected column from every row", () => {
  const { save, pending } = pressTableButton("Delete selected column", { row: 1, column: 0 });
  assert.equal(save?.editedText, "| B |\n| --- |\n| y |\n| q |\n");
  assert.equal(pending?.tableRowIndex, 1);
  assert.equal(pending?.tableColumnIndex, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-005
test("a plain {list-table} opens the cell editor and its buttons write a list-table", () => {
  const source = "```{list-table}\n:header-rows: 1\n\n* - A\n  - B\n* - x\n  - y\n```\n";
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness, {}, source);
  click(cells[1][0]);
  assert.equal(input().value, "x");
  const press = (label: string): Record<string, unknown> | undefined => {
    const before = harness.messages.length;
    harness.createdElements.filter((element) => element.getAttribute("aria-label") === label).at(-1)?.dispatch("click");
    return harness.messages.slice(before).find((message) => message.type === "previewEditSave");
  };
  const save = press("Insert column before selected column");
  assert.equal(save?.editedText, "```{list-table}\n:header-rows: 1\n\n* -\n  - A\n  - B\n* -\n  - x\n  - y\n```\n");
  const converted = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Convert to list-table").at(-1);
  assert.equal(converted?.disabled, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-055
test("Col + on a padded, indented table keeps the style of every line", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 0;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: cell, preventDefault: () => undefined, stopPropagation: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "  | Name  | Qty |\n  | ----- | --- |\n  | brake | 1   |\n",
  });
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Insert column after selected column").at(-1)?.dispatch("click");
  // The press itself saves the table.
  assert.equal(harness.messages.at(-1)?.editedText,
    "  | Name  |       | Qty |\n  | ----- | ----- | --- |\n  | brake |       | 1   |\n");
});

function openPipeTableCellEditor(harness: ReturnType<typeof createRuntimeHarness>, parent?: RuntimeElement) {
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  if (parent) parent.appendChild(table);
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n",
  });
}

const convertButton = (harness: ReturnType<typeof createRuntimeHarness>) =>
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Convert to list-table").at(-1);

// @tests_req SwRS-MDOKFSTUDIO-TABLE-070
test("CR038: the table toolbar converts the pipe table to a list-table in one final save", () => {
  const harness = createRuntimeHarness();
  openPipeTableCellEditor(harness);
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  input.value = "edited";
  input.dispatch("input");
  const saves = harness.messages.filter((message) => message.type === "previewEditSave").length;
  const button = convertButton(harness);
  assert.ok(button, "the conversion button is in the table toolbar");
  assert.equal(button.disabled, false);
  button.dispatch("click");
  const saved = harness.messages.filter((message) => message.type === "previewEditSave");
  assert.equal(saved.length, saves + 1, "one save, so one undo step");
  assert.equal(saved.at(-1)?.final, true);
  assert.equal(saved.at(-1)?.originalText, "| A | B |\n| --- | --- |\n| x | y |\n");
  assert.equal(saved.at(-1)?.editedText, [
    "```{list-table}", ":header-rows: 1", "", "* - A", "  - B", "* - x", "  - edited", "```", "",
  ].join("\n"));
});

test("CR038: the conversion button is off for a table inside a captioned figure", () => {
  const harness = createRuntimeHarness();
  const figure = new RuntimeElement({}, harness.windowState, 100, 100, "figure");
  harness.body.appendChild(figure);
  openPipeTableCellEditor(harness, figure);
  assert.equal(convertButton(harness)?.disabled, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-048
test("table toolbar sits in the flow above the table with text labels and a position status", () => {
  const harness = createRuntimeHarness();
  const section = new RuntimeElement({}, harness.windowState, 0, 300, "section");
  harness.body.appendChild(section);
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  section.appendChild(table);
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      return cell;
    });
  });
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  harness.editModeButton.dispatch("click");
  click(cells[1][1]);
  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  const menu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(menu);
  assert.equal(menu.parentElement, section);
  assert.equal(section.childElements.indexOf(menu) + 1, section.childElements.indexOf(table));
  assert.equal(menu.getAttribute("data-placement"), null);
  assert.equal(menu.style.getPropertyValue("--sphinx-preview-table-menu-top"), "");
  const labels = menu.childElements.filter((element) => element.tagName === "BUTTON")
    .map((button) => button.childElements.find((child) =>
      child.className === "sphinx-preview-table-menu-label")?.textContent);
  assert.deepEqual(labels, ["Row above", "Row below", "Row \u2212", "Col left", "Col right", "Col \u2212", "List table"]);
  assert.equal(menu.childElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null)?.textContent,
  "Row 1 of 2 \u00b7 column 2 of 2");
  click(cells[0][0]);
  assert.equal(menu.childElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null)?.textContent,
  "Header \u00b7 column 1 of 2");
  assert.equal(menu.parentElement, section);
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(menu.parentElement, undefined);
  assert.equal(section.childElements.includes(menu), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-064
test("CR 034: the table toolbar rides down with a tall table and leaves with the table", () => {
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
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  const menu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(menu);
  // The bar's natural place is just above the table (top 156 in the page); a shift moves it.
  const shiftOf = (): number => Number.parseFloat(menu.style.getPropertyValue("--sphinx-preview-table-menu-shift")) || 0;
  menu.rectProvider = () => {
    const top = 156 - harness.windowState.scrollY + shiftOf();
    return { top, bottom: top + 40, height: 40, left: 0, right: 200, width: 200 };
  };
  const scrollTo = (y: number): void => {
    harness.windowState.scrollY = y;
    harness.dispatchWindow("scroll");
  };
  scrollTo(0);
  assert.equal(shiftOf(), 0, "table top in view: the bar stays above the table");
  assert.equal(menu.getAttribute("data-sphinx-table-menu-stuck"), null);
  scrollTo(400);
  assert.ok(shiftOf() > 0, "table top scrolled out: the bar rides down");
  assert.equal(menu.getAttribute("data-sphinx-table-menu-stuck"), "true");
  const stuck = menu.getBoundingClientRect();
  assert.ok(stuck.top >= 0 && (stuck.bottom ?? 0) <= 600, "the bar stays inside the viewport");
  scrollTo(1250);
  const leaving = menu.getBoundingClientRect();
  assert.ok((leaving.bottom ?? 0) <= 200 + 1200 - 1250 + 0.5, "the bar never goes below the table's bottom");
  scrollTo(0);
  assert.equal(shiftOf(), 0, "back at the top the bar is back in place");
  assert.equal(menu.getAttribute("data-sphinx-table-menu-stuck"), null);
  assert.equal(menu.parentElement, section, "the bar is not moved in the flow");
});

function openTableForToolbarReveal(options: {
  cellTop: number;
  barTop: number;
  scrollY: number;
  /** The floating controls cover the right end of the table toolbar box; its items are given. */
  controlsOverRightEnd?: boolean;
}) {
  const harness = createRuntimeHarness({ viewportHeight: 600 });
  if (options.controlsOverRightEnd) {
    harness.toolbar.rectProvider = () => ({ top: 12, height: 100, bottom: 112, left: 150, right: 280, width: 130 });
  }
  const section = new RuntimeElement({}, harness.windowState, 0, 2000, "section");
  harness.body.appendChild(section);
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  section.appendChild(table);
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  table.appendChild(row);
  const cell = new RuntimeElement({}, harness.windowState, options.cellTop, 30, "td");
  cell.cellIndex = 0;
  row.appendChild(cell);
  const insertBefore = section.insertBefore.bind(section);
  const bar = { top: options.barTop, height: 76 };
  section.insertBefore = (child: RuntimeElement, reference: RuntimeElement | null): RuntimeElement => {
    if (child.getAttribute("data-sphinx-table-menu") === "true") {
      // The toolbar's viewport top is fixed by the test, as after the R7 anchor restore.
      child.rectProvider = () => ({
        top: bar.top, bottom: bar.top + bar.height, height: bar.height, left: 0, width: options.controlsOverRightEnd ? 300 : 200,
      });
      if (options.controlsOverRightEnd) {
        // Line 1 (the buttons) ends left of the controls; the status text on line 2 sits under them.
        const place = (item: RuntimeElement): void => {
          const status = item.getAttribute("data-sphinx-preview-edit-status") !== null;
          item.rectProvider = () => ({
            top: bar.top + (status ? 40 : 10), height: 20, bottom: bar.top + (status ? 60 : 30),
            left: status ? 200 : 0, width: status ? 90 : 20,
          });
        };
        child.childElements.forEach(place);
        const appendChild = child.appendChild.bind(child);
        child.appendChild = (item: RuntimeElement): RuntimeElement => {
          place(item);
          bar.height += 1; // the menu grows as it is filled, like a real one
          return appendChild(item);
        };
      }
    }
    return insertBefore(child, reference);
  };
  harness.editModeButton.dispatch("click");
  harness.windowState.scrollY = options.scrollY;
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const scrolls: number[] = [];
  const request = harness.messages.at(-1);
  const beforeScroll = harness.windowState.scrollY;
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A |\n| --- |\n| x |\n",
  });
  scrolls.push(beforeScroll, harness.windowState.scrollY);
  return { harness, cell, scrolls, bar };
}

test("a toolbar that appears above the reading offset is scrolled into view by the exact delta", () => {
  // Reading offset is 65 in the harness; the bar top is -28, so the page scrolls up by 93.
  const { scrolls } = openTableForToolbarReveal({ cellTop: 340, barTop: -28, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300 - 93]);
});

test("P8: a toolbar box is not revealed when only its empty part is under the preview controls", () => {
  // Controls bottom 112 + 4 = 116 > bar top 90, but the buttons end left of the controls and the
  // status text on line 2 (top 130) is already below them: nothing is covered, so no scroll.
  const free = openTableForToolbarReveal({ cellTop: 340, barTop: 90, scrollY: 300, controlsOverRightEnd: true });
  assert.deepEqual(free.scrolls, [300, 300]);
  // A bar 24 px higher has its status text (top 106) under the controls (bottom 112 + 4): the page
  // scrolls by the 10 px that bring the status text under them, not by the 26 px of the box.
  const covered = openTableForToolbarReveal({ cellTop: 340, barTop: 66, scrollY: 300, controlsOverRightEnd: true });
  assert.deepEqual(covered.scrolls, [300, 300 - 10]);
});

test("a toolbar that is already visible causes no extra scroll", () => {
  const { scrolls } = openTableForToolbarReveal({ cellTop: 340, barTop: 80, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300]);
});

test("the toolbar is not revealed when that would push the selected cell out of the viewport", () => {
  // The cell sits near the bottom of the 600 px viewport, so a 93 px reveal would push it out.
  const { scrolls } = openTableForToolbarReveal({ cellTop: 860, barTop: -28, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300]);
});

test("a later layout change that pushes the toolbar above the reading offset is revealed again", () => {
  // The bar first appears visible (top 80). The status line then wraps: the bar grows and the anchor
  // restore leaves its top at 20, under the 65 px sticky band, so the page scrolls up by 45.
  const { harness, scrolls, bar } = openTableForToolbarReveal({ cellTop: 340, barTop: 80, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300]);
  bar.top = 20;
  bar.height = 100;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 300 - 45);
  // Unchanged bar size: a deliberate user scroll is not undone by a further layout pass.
  bar.top = 10;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 300 - 45);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-034
test("table editing switches cells without losing changes and finalizes before leaving the table", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      const content = new RuntimeElement({}, harness.windowState, 100, 30, "strong");
      content.textContent = `${rowIndex}-${columnIndex}`;
      cell.appendChild(content);
      row.appendChild(cell);
      return cell;
    });
  });
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
  });
  const input = (): RuntimeElement => {
    const control = harness.createdElements.filter((element) =>
      element.getAttribute("aria-label") === "Markdown table cell").at(-1);
    assert.ok(control);
    return control;
  };
  harness.editModeButton.dispatch("click");
  click(cells[1][0]);
  const editId = harness.messages.at(-1)?.editId;
  click(harness.mappings[2]);
  assert.equal(harness.messages.at(-1)?.editId, editId);
  assert.equal(harness.getWebviewState().pendingBlockNavigation, undefined);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  input().value = "edited x";
  input().dispatch("input");
  click(cells[2][1]);
  assert.equal(input().value, "q");
  assert.equal(cells[1][0].getAttribute("data-sphinx-preview-table-cell-selected"), null);
  assert.equal(cells[1][0].childElements[0].tagName, "STRONG");
  input().value = "edited q";
  input().dispatch("input");
  click(cells[0][1]);
  assert.equal(input().value, "B");
  input().value = "edited B";
  input().dispatch("input");
  click(cells[1][0]);
  assert.equal(input().value, "edited x");
  assert.equal(harness.messages.filter((message) => message.type === "previewEditOpen").length, 1);
  const saves = harness.messages.filter((message) => message.type === "previewEditSave");
  assert.ok(saves.every((message) => message.editId === editId && message.final === false));
  assert.equal(saves.at(-1)?.editedText, "| A | edited B |\n| --- | --- |\n| edited x | y |\n| p | edited q |\n");
  click(harness.mappings[2]);
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.equal(harness.getWebviewState().pendingBlockNavigation !== undefined, true);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    error: "The save could not be applied.",
  });
  assert.equal(harness.getWebviewState().pendingBlockNavigation, undefined);
  click(cells[2][1]);
  assert.equal(input().value, "edited q");
  input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  // Enter commits the edited cell like blur; the re-render closes the editor.
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.match(String(harness.messages.at(-1)?.editedText), /edited q/u);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("Tab and Shift+Tab move between table cells, wrapping across rows", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  let prevented = 0;
  const tab = (shiftKey = false): void => input().dispatch("keydown", {
    key: "Tab", shiftKey, preventDefault: () => { prevented += 1; },
  });
  assert.equal(input().value, "x");
  tab();
  assert.equal(input().value, "y");
  assert.equal(harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true")[0].parentElement, cells[1][1]);
  input().value = "yy";
  input().dispatch("input");
  tab();
  assert.equal(input().value, "p");
  assert.equal(prevented, 2);
  tab(true);
  assert.equal(input().value, "yy");
  tab(true);
  assert.equal(input().value, "x");
  assert.equal(harness.messages.filter((message) => message.type === "previewEditOpen").length, 1);
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Shift+Tab on the first header cell does nothing", () => {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness);
  click(cells[0][0]);
  assert.equal(input().value, "A");
  const count = harness.messages.length;
  let prevented = false;
  input().dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(harness.messages.length, count);
  assert.equal(input().value, "A");
});

function descendantsOf(element: RuntimeElement): RuntimeElement[] {
  return element.childElements.flatMap((child) => [child, ...descendantsOf(child)]);
}

test("arrow keys move the table cell editor cell to cell in every direction", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  const press = (key: string, position: number | "end", init: Record<string, unknown> = {}): boolean => {
    const at = position === "end" ? input().value.length : position;
    input().setSelectionRange(at, at);
    let prevented = false;
    input().dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
    return prevented;
  };
  assert.equal(input().value, "x");
  // Mid-text caret: native caret movement, nothing happens.
  input().value = "xx";
  assert.equal(press("ArrowRight", 1), false);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  assert.equal(press("ArrowRight", "end"), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][1]);
  assert.equal(input().value, "y");
  assert.deepEqual(input().selectionRange, [0, 0]);
  assert.equal(press("ArrowDown", "end"), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[2][1]);
  assert.equal(input().value, "q");
  assert.equal(press("ArrowLeft", 0), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[2][0]);
  assert.equal(input().value, "p");
  assert.deepEqual(input().selectionRange, [1, 1]);
  assert.equal(press("ArrowUp", 0), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  // The edited first cell was committed by the move, like Tab: autosave, no final save, one edit.
  assert.equal(input().value, "xx");
  assert.equal(harness.messages.filter((message) => message.type === "previewEditOpen").length, 1);
  assert.equal(harness.messages.some((message) => message.final === true), false);
  assert.match(String(harness.messages.at(-1)?.editedText), /\| xx \| y \|/u);
});

test("table cell arrows behave natively with a selection, modifiers, IME or a caret inside a multi-line cell", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  const count = harness.messages.length;
  const attempt = (key: string, start: number, end: number, init: Record<string, unknown> = {}): void => {
    input().setSelectionRange(start, end);
    let prevented = false;
    input().dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, false, key + JSON.stringify(init));
  };
  input().value = "ab";
  attempt("ArrowRight", 0, 2);
  attempt("ArrowLeft", 0, 2);
  for (const modifier of ["shiftKey", "altKey", "metaKey", "ctrlKey"]) {
    attempt("ArrowRight", 2, 2, { [modifier]: true });
    attempt("ArrowLeft", 0, 0, { [modifier]: true });
  }
  input().value = "one\ntwo";
  attempt("ArrowDown", 1, 1);
  attempt("ArrowUp", 5, 5);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  assert.equal(harness.messages.length, count);
});

test("table cell arrows fall back to block navigation only when no cell lies in that direction", () => {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness, { mapped: true });
  click(cells[0][0]);
  assert.equal(input().value, "A");
  input().setSelectionRange(0, 0);
  let prevented = false;
  input().dispatch("keydown", { key: "ArrowUp", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditOpen");
  assert.equal(harness.messages.at(-1)?.line, 1);
});

test("a table cell arrow without a matching model cell is not swallowed", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  // The rendered table has a third column in the row below that the Markdown model lacks.
  const extra = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  extra.cellIndex = 2;
  cells[1][1].parentElement?.appendChild(extra);
  (cells[1][1].parentElement as unknown as { cells: RuntimeElement[] }).cells.push(extra);
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  assert.equal(input().value, "y");
  input().setSelectionRange(1, 1);
  let prevented = false;
  input().dispatch("keydown", { key: "ArrowRight", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][1]);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("the table cell field is re-fitted when the preview is resized", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  const field = input();
  const heights: number[] = [];
  Object.defineProperty(field, "scrollHeight", { get: () => 77, configurable: true });
  field.style.height = "5px";
  harness.dispatchWindow("resize");
  harness.flushFrames();
  heights.push(parseFloat(String(field.style.height)));
  assert.deepEqual(heights, [77]);
});

test("the table cell editor has Done and Cancel but no status hint", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  const editor = cellEditorOf(harness);
  const buttons = descendantsOf(editor).filter((element) => element.tagName === "BUTTON");
  assert.deepEqual(buttons.map((button) => button.textContent), ["Done", "Cancel"]);
  assert.equal(descendantsOf(editor).filter((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null).length, 0);
  assert.equal(descendantsOf(editor).filter((element) =>
    element.className === "sphinx-preview-block-editor-buttons").length, 1);
  assert.equal(editor.childElements.at(-1)?.className, "sphinx-preview-block-editor-actions");
  // The status stays on the toolbar.
  const menu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(menu?.childElements.some((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null));
  // Done commits the cell, like Enter; the buttons never take the focus from the field.
  input().value = "typed";
  input().dispatch("input");
  let prevented = false;
  buttons[0].dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  buttons[0].dispatch("click");
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.match(String(harness.messages.at(-1)?.editedText), /typed/u);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
});

test("Cancel in the table cell editor does what Escape does", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  harness.flushTimers();
  const buttons = descendantsOf(cellEditorOf(harness)).filter((element) => element.tagName === "BUTTON");
  buttons[1].dispatch("click");
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true"
    && element.parentElement !== undefined).length, 0);
});

function homeEndKeys(
  control: RuntimeElement,
  harness: ReturnType<typeof createRuntimeHarness>,
  value: string,
): void {
  control.value = value;
  const end = value.replace(/[\r\n]+$/u, "").length;
  const press = (key: string, init: Record<string, unknown> = {}): boolean => {
    let prevented = false;
    harness.windowState.scrollY = 77;
    control.dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
    assert.equal(harness.windowState.scrollY, 77, key + " must not scroll the preview");
    return prevented;
  };
  control.setSelectionRange(4, 4);
  assert.equal(press("Home"), true);
  assert.deepEqual(control.selectionRange, [0, 0]);
  assert.equal(press("End"), true);
  assert.deepEqual(control.selectionRange, [end, end]);
  control.setSelectionRange(4, 4);
  assert.equal(press("End", { shiftKey: true }), true);
  assert.deepEqual(control.selectionRange, [4, end]);
  control.setSelectionRange(4, 4);
  assert.equal(press("Home", { shiftKey: true }), true);
  assert.deepEqual(control.selectionRange, [0, 4]);
  assert.equal(control.selectionDirection, "backward");
  // Extending a backward selection keeps its anchor at the original caret.
  assert.equal(press("End", { shiftKey: true }), true);
  assert.deepEqual(control.selectionRange, [4, end]);
  // Cmd+arrow stays native, Cmd+Home is not ours, IME composition is ignored.
  control.setSelectionRange(4, 4);
  assert.equal(press("End", { metaKey: true }), false);
  assert.equal(press("Home", { isComposing: true }), false);
  assert.deepEqual(control.selectionRange, [4, 4]);
}

test("Home and End move the caret inside the block textarea instead of scrolling the preview", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "first line\nsecond line\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(textarea);
  homeEndKeys(textarea, harness, "first line\nsecond line\n");
});

test("Home and End move the caret inside the table cell input instead of scrolling the table", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  homeEndKeys(input(), harness, "a very wide table cell value");
});

test("Tab on the last cell inserts a row and resumes in its first cell", () => {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness);
  click(cells[2][1]);
  assert.equal(input().value, "q");
  input().value = "qq";
  input().dispatch("input");
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.match(String(save?.editedText), /^\| A \| B \|\n\| --- \| --- \|\n\| x \| y \|\n\| p \| qq \|\n\|\s*\|\s*\|\n$/u);
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.tableRowIndex, 3);
  assert.equal(pending?.tableColumnIndex, 0);
  assert.equal(pending?.sourceLine, 20);
});

test("the table cell editor commits on blur unless a pointer press is in progress", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  const control = input();
  harness.dispatchDocument("pointerdown", { target: harness.mappings[2] });
  control.dispatch("blur");
  harness.flushTimers();
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("the table cell editor commits and closes when focus leaves without a click", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  input().dispatch("blur");
  harness.flushTimers();
  const last = harness.messages.at(-1);
  assert.equal(last?.type, "previewEditSave");
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /typed/u);
});

test("Escape cancels a table cell even when focus is outside the cell editor", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, false);
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.body });
  assert.equal(harness.messages.filter((message) => message.final === true).length, 0);
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Escape in a changed table cell cancels and never saves a final table", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
  assert.equal(harness.pendingTimerCount(), 0);
  input.dispatch("blur");
  harness.flushTimers();
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
});

test("Escape during IME composition neither cancels nor saves a table cell", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  harness.flushTimers();
  const count = harness.messages.length;
  input.dispatch("keydown", { key: "Escape", isComposing: true, preventDefault: () => undefined });
  assert.equal(harness.messages.length, count);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Escape in a table cell after an autosave restores the table with previewEditCancel", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, false);
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-018
test("Enter in a changed table cell saves the table", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const last = harness.messages.at(-1);
  assert.equal(last?.type, "previewEditSave");
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /\| x \| y2 \|/u);
});

test("turning edit mode off saves a changed block editor and ignores an unchanged one", () => {
  const changed = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(changed);
  textarea.value = "Second paragraph. B";
  changed.editModeButton.dispatch("click");
  const last = changed.messages.at(-1);
  assert.equal(last?.type, "previewEditSave");
  assert.equal(last?.final, true);
  assert.equal(last?.editedText, "Second paragraph. B\n");
  assert.equal(changed.messages.some((message) => message.type === "previewEditCancel"), false);

  const unchanged = createRuntimeHarness();
  openBlockEditorWithSource(unchanged);
  const messageCount = unchanged.messages.length;
  unchanged.editModeButton.dispatch("click");
  assert.deepEqual(
    unchanged.messages.slice(messageCount).map((message) => message.type),
    ["previewEditModeChanged"],
  );
  assert.equal(unchanged.messages.some((message) => message.type === "previewEditCancel"), false);
  assert.equal(unchanged.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
});

test("table header cannot be deleted from the cell toolbar", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 0;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "th");
  cell.cellIndex = 0;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n",
  });

  const deleteButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Delete selected row");
  assert.ok(deleteButton);
  assert.equal(deleteButton.disabled, true);
});

test("table toolbar cannot delete the last body row", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "22",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 0;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A |\n| --- |\n| x |\n",
  });

  const deleteButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Delete selected row");
  assert.ok(deleteButton);
  assert.equal(deleteButton.disabled, true);
});

test("switching table cells posts the pending change immediately", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      return cell;
    });
  });
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
  });
  const input = (): RuntimeElement => {
    const control = harness.createdElements.filter((element) =>
      element.getAttribute("aria-label") === "Markdown table cell").at(-1);
    assert.ok(control);
    return control;
  };
  harness.editModeButton.dispatch("click");
  click(cells[1][0]);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  input().value = "edited x";
  input().dispatch("input");
  const before = harness.messages.length;
  click(cells[2][1]);
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.match(String(saves[0].editedText), /\| edited x \| y \|/u);
  assert.equal(harness.pendingTimerCount(), 0);
});
