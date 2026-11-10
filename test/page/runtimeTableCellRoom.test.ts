import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import { openTableCellEditorForTab } from "./runtimeTestSupport";

/**
 * The room the cell editor gets in a narrow pane (features/tableCellEditor.ts, modules/cellEditorRoom.ts).
 */

const ROOM = "--sphinx-preview-cell-editor-room";

interface Layout {
  /** The content width of the column holding the table. */
  column: number;
  /** The row-handle shift: the table's inline-start margin. */
  shift?: string;
}

/** A table in a column `column` wide, cells with 10 px of padding and a 1 px border on each side. */
function openInColumn(layout: Layout, start?: [number, number]) {
  const harness = createRuntimeHarness();
  const opened = openTableCellEditorForTab(harness, {
    ...(start ? { start } : {}),
    beforeSource: (table, cells) => {
      const column = new RuntimeElement({}, harness.windowState, 0, 500, "div");
      column.clientWidth = layout.column;
      column.appendChild(table);
      table.computedStyle = { marginInlineStart: layout.shift ?? "auto" };
      for (const cell of cells.flat()) {
        cell.computedStyle = {
          paddingLeft: "10px", paddingRight: "10px", borderLeftWidth: "1px", borderRightWidth: "1px",
        };
      }
    },
  });
  const roomOf = (cell: RuntimeElement): string => cell.style.getPropertyValue(ROOM);
  const withRoom = (): RuntimeElement[] => opened.cells.flat().filter((cell) => roomOf(cell) !== "");
  return { harness, roomOf, withRoom, column: opened.cells[0][0].closest("table")!.parentElement!, ...opened };
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("a cell opened in a 200 px column gets the room of the column less 16 px margins and its own padding and borders", () => {
  const { cells, roomOf, withRoom } = openInColumn({ column: 200 });
  // 200 - 2 x 16 - 2 x 10 - 2 x 1.
  assert.equal(roomOf(cells[1][0]), "146px");
  assert.deepEqual(withRoom(), [cells[1][0]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("the row-handle shift of the table is subtracted from the room", () => {
  const { cells, roomOf } = openInColumn({ column: 200, shift: "35.2px" });
  assert.equal(roomOf(cells[1][0]), "110.8px");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("in a wide column the room is 300 px or more, so the cell keeps its 300 px minimum", () => {
  const { cells, roomOf } = openInColumn({ column: 700 });
  assert.ok(Number.parseFloat(roomOf(cells[1][0])) >= 300);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("Tab to the next cell moves the room property to it", () => {
  const { cells, roomOf, input, withRoom } = openInColumn({ column: 200 });
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  assert.equal(roomOf(cells[1][0]), "");
  assert.equal(roomOf(cells[1][1]), "146px");
  assert.deepEqual(withRoom(), [cells[1][1]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("a window resize under the open editor measures the room again", () => {
  const { harness, cells, roomOf, column } = openInColumn({ column: 200 });
  assert.equal(roomOf(cells[1][0]), "146px");
  column.clientWidth = 260;
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(roomOf(cells[1][0]), "206px");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("closing the cell editor with Escape or Done leaves no cell with the room property", () => {
  const escaped = openInColumn({ column: 200 });
  assert.equal(escaped.withRoom().length, 1);
  escaped.input().dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.deepEqual(escaped.withRoom(), []);

  // Done on an unchanged cell closes the editor at once.
  const done = openInColumn({ column: 200 });
  const buttons = done.input().parentElement!.childElements.flatMap((part) => part.childElements.flatMap((child) =>
    child.tagName === "BUTTON" ? [child] : child.childElements.filter((leaf) => leaf.tagName === "BUTTON")));
  assert.equal(done.withRoom().length, 1);
  buttons[0].dispatch("click");
  done.harness.flushTimers();
  assert.deepEqual(done.withRoom(), []);
});
