import * as assert from "node:assert/strict";
import { test } from "node:test";
import { createRuntimeHarness } from "./runtimeHarness";
import { cellEditorOf, openTableCellEditorForTab, shiftKey } from "./runtimeTestSupport";

/**
 * A two-column table in its own sideways scroll box: the box is 300 px wide at x=50, column 1 starts
 * 100 px and column 2 600 px into the 1000 px wide table, each cell 200 px wide. The cell editor is
 * `editorWidth` wide from the left edge of its cell. Rects follow the table's scrollLeft. The
 * geometry is in place before the editor opens in `start` (the first body cell by default).
 */
function openWideTableForReveal(editorWidth = 220, start?: [number, number]) {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness, {
    ...(start ? { start } : {}),
    beforeSource: (table, cells) => {
      table.clientWidth = 300;
      table.scrollWidth = 1000;
      table.rectProvider = () => ({ top: 100, height: 100, left: 50, width: 300 });
      const columnStart = [100, 600];
      for (const cell of cells.flat()) {
        cell.rectProvider = () => ({
          top: 100, height: 30, left: 50 + columnStart[cell.cellIndex]! - table.scrollLeft, width: 200,
        });
      }
      const editor = cellEditorOf(harness);
      editor.rectProvider = () => ({
        top: 100, height: 30, left: editor.parentElement!.getBoundingClientRect().left!, width: editorWidth,
      });
    },
  });
  const table = opened.cells[0][0].closest("table")!;
  const editor = cellEditorOf(harness);
  const tab = (shiftKey = false): void => opened.input().dispatch("keydown", {
    key: "Tab", shiftKey, preventDefault: () => undefined,
  });
  return { harness, table, editor, tab, ...opened };
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-126#S1
test("Tab to a cell right of a wide table's box scrolls the box by the smallest amount plus 16 px", () => {
  const { harness, table, editor, tab, cells } = openWideTableForReveal();
  const pageScroll = harness.windowState.scrollY;
  // Opened in the first body cell: cell 150..350, editor 150..370, 20 px past the right edge.
  assert.equal(table.scrollLeft, 20 + 16);
  tab();
  assert.equal(editor.parentElement, cells[1][1]);
  // At scrollLeft 0: cell 650..850, editor 650..870 (wider than its cell); the union's right edge
  // lands 16 px inside.
  assert.equal(table.scrollLeft, 870 - (350 - 16));
  assert.equal(editor.getBoundingClientRect().left! + 220, 350 - 16);
  assert.equal(harness.windowState.scrollY, pageScroll);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-126#S1
test("Tab across the row wrap and Shift+Tab to a cell left of the box align the cell start 16 px inside", () => {
  const { harness, table, editor, tab, cells } = openWideTableForReveal();
  const pageScroll = harness.windowState.scrollY;
  tab();
  assert.equal(table.scrollLeft, 536);
  tab();
  assert.equal(editor.parentElement, cells[2][0]);
  assert.equal(table.scrollLeft, 84);
  assert.equal(cells[2][0].getBoundingClientRect().left, 50 + 16);
  tab(true);
  assert.equal(editor.parentElement, cells[1][1]);
  assert.equal(table.scrollLeft, 536);
  tab(true);
  assert.equal(editor.parentElement, cells[1][0]);
  assert.equal(table.scrollLeft, 84);
  assert.equal(cells[1][0].getBoundingClientRect().left, 50 + 16);
  assert.equal(harness.windowState.scrollY, pageScroll);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-126#S1
test("a cell already inside the table box does not scroll it; a target wider than the box is aligned on its start", () => {
  const visible = openWideTableForReveal();
  visible.table.scrollLeft = 30;
  // Cell 120..320, editor 120..340: inside the 50..350 box.
  visible.click(visible.cells[2][0]);
  assert.equal(visible.editor.parentElement, visible.cells[2][0]);
  assert.equal(visible.table.scrollLeft, 30);

  const wide = openWideTableForReveal(320);
  wide.tab();
  // Cell 650..850, editor 650..970: 320 px does not fit in 300 - 2 x 16, so its start goes 16 px in.
  assert.equal(wide.table.scrollLeft, 650 - (50 + 16));
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-126#S1
test("a layout pass that narrows the table box brings the open cell editor back inside it", () => {
  const opened = openWideTableForReveal();
  // Cell 150..350, editor 150..370: 20 px past the 50..350 box, so the open scrolled it 36 px.
  assert.equal(opened.table.scrollLeft, 370 - (350 - 16));
  // A layout pass resizes the box, here to 50..310 (a pane resize, a toolbar change).
  opened.table.clientWidth = 260;
  opened.table.rectProvider = () => ({ top: 100, height: 100, left: 50, width: 260 });
  opened.harness.dispatchWindow("resize");
  opened.harness.flushFrames();
  // Editor 114..334 is 24 px past the new right edge.
  assert.equal(opened.table.scrollLeft, 36 + 334 - (310 - 16));
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-126#S1
test("a click on a partly hidden cell and an editor opening in a hidden cell scroll the table box to it", () => {
  const clicked = openWideTableForReveal();
  clicked.table.scrollLeft = 400;
  // Cell 250..450, editor 250..470: 120 px hidden past the right edge of the 50..350 box.
  clicked.click(clicked.cells[1][1]);
  assert.equal(clicked.editor.parentElement, clicked.cells[1][1]);
  assert.equal(clicked.table.scrollLeft, 400 + 120 + 16);

  // The open path is also the reopen after a re-render (Tab in the last cell, a structural button).
  const opened = openWideTableForReveal(220, [2, 1]);
  assert.equal(opened.editor.parentElement, opened.cells[2][1]);
  assert.equal(opened.input().value, "q");
  assert.equal(opened.table.scrollLeft, 870 - (350 - 16));
});
