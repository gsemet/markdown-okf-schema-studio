import * as assert from "node:assert/strict";
import { test } from "node:test";

import { structuralMove, type StructuralNode, type StructuralPosition } from "../../../src/page/modules/structuralCursor";

// A document of four top-level blocks: a leaf, a 2 x 3 table (the second row has two cells), a
// container with two leaf children and a skipped (included) leaf.
const leaf: StructuralNode = { children: [] };
const doc: StructuralNode = {
  children: [
    leaf,
    { children: [], grid: { columns: [3, 2] } },
    { children: [leaf, { children: [leaf] }] },
    { children: [], skip: true },
  ],
};

const block = (...path: number[]): StructuralPosition => ({ path });
const cell = (row: number, column: number): StructuralPosition => ({ path: [1], cell: { row, column } });
const move = (to: StructuralPosition) => ({ kind: "move", to });

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Right goes down one level: table to its first cell, container to its first child", () => {
  assert.deepEqual(structuralMove(doc, block(1), "right"), move(cell(0, 0)));
  assert.deepEqual(structuralMove(doc, block(2), "right"), move(block(2, 0)));
  assert.deepEqual(structuralMove(doc, block(2, 1), "right"), move(block(2, 1, 0)));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Right on the whole document goes to its first selectable child", () => {
  assert.deepEqual(structuralMove(doc, undefined, "right"), move(block(0)));
  const skippedFirst: StructuralNode = { children: [{ children: [], skip: true }, leaf] };
  assert.deepEqual(structuralMove(skippedFirst, undefined, "right"), move(block(1)));
  assert.deepEqual(structuralMove({ children: [] }, undefined, "right"), { kind: "stay" });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Right on a leaf and on an empty grid stays", () => {
  assert.deepEqual(structuralMove(doc, block(0), "right"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, block(2, 0), "right"), { kind: "stay" });
  const empty: StructuralNode = { children: [{ children: [], grid: { columns: [] } }] };
  assert.deepEqual(structuralMove(empty, block(0), "right"), { kind: "stay" });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Left and Escape go up one level; at the top Left stays and Escape defers", () => {
  assert.deepEqual(structuralMove(doc, block(2, 1, 0), "left"), move(block(2, 1)));
  assert.deepEqual(structuralMove(doc, block(2, 1), "escape"), move(block(2)));
  assert.deepEqual(structuralMove(doc, block(2), "left"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, block(2), "escape"), { kind: "top" });
  assert.deepEqual(structuralMove(doc, undefined, "left"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, undefined, "escape"), { kind: "top" });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: the arrows move cell to cell without wrapping, and a short row clamps the column", () => {
  assert.deepEqual(structuralMove(doc, cell(0, 0), "right"), move(cell(0, 1)));
  assert.deepEqual(structuralMove(doc, cell(0, 2), "right"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, cell(0, 0), "left"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, cell(1, 1), "left"), move(cell(1, 0)));
  assert.deepEqual(structuralMove(doc, cell(0, 1), "down"), move(cell(1, 1)));
  assert.deepEqual(structuralMove(doc, cell(0, 2), "down"), move(cell(1, 1)), "the second row has two cells");
  assert.deepEqual(structuralMove(doc, cell(1, 1), "down"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, cell(1, 1), "up"), move(cell(0, 1)));
  assert.deepEqual(structuralMove(doc, cell(0, 1), "up"), { kind: "stay" });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Escape on a cell returns to its table block", () => {
  assert.deepEqual(structuralMove(doc, cell(1, 1), "escape"), move(block(1)));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: Up and Down walk the siblings of a nested block and stop at the edges; top level defers", () => {
  assert.deepEqual(structuralMove(doc, block(2, 0), "down"), move(block(2, 1)));
  assert.deepEqual(structuralMove(doc, block(2, 1), "down"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, block(2, 0), "up"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, block(2, 1), "up"), move(block(2, 0)));
  assert.deepEqual(structuralMove(doc, block(0), "down"), { kind: "top" });
  assert.deepEqual(structuralMove(doc, block(0), "up"), { kind: "top" });
  assert.deepEqual(structuralMove(doc, undefined, "down"), { kind: "top" });
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254
test("CR 157: a position that names nothing in the tree stays", () => {
  assert.deepEqual(structuralMove(doc, block(9), "right"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, block(0, 3), "left"), { kind: "stay" });
  assert.deepEqual(structuralMove(doc, { path: [0], cell: { row: 0, column: 0 } }, "right"), { kind: "stay" });
});
