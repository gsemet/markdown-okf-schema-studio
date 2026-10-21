import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createBlockSelection, type SelectableBlock } from "../../src/webview/blockSelection";

const blocks: SelectableBlock[] = [
  { line: 1, endLine: 2 },
  { line: 4, endLine: 6 },
  { line: 8 },
  { line: 10, endLine: 12 },
  { line: 14, endLine: 14 },
];

function selection(list: readonly SelectableBlock[] = blocks) {
  const model = createBlockSelection();
  model.setBlocks(list);
  return model;
}

test("T39: a new selection is empty and has no range", () => {
  const model = selection();
  assert.equal(model.isActive(), false);
  assert.deepEqual(model.indices(), []);
  assert.equal(model.range(), undefined);
});

test("T39: extendTo selects from the anchor in both directions", () => {
  const model = selection();
  model.setAnchor(1);
  assert.equal(model.extendTo(3), true);
  assert.deepEqual([model.anchorIndex, model.startIndex, model.endIndex], [1, 1, 3]);
  assert.deepEqual(model.indices(), [1, 2, 3]);
  assert.deepEqual(model.range(), { line: 4, endLine: 12 });
  assert.equal(model.extendTo(0), true);
  assert.deepEqual([model.anchorIndex, model.startIndex, model.endIndex], [1, 0, 1]);
  assert.deepEqual(model.range(), { line: 1, endLine: 6 });
});

test("T39: extendTo without an anchor selects that block alone and anchors on it", () => {
  const model = selection();
  assert.equal(model.extendTo(2), true);
  assert.deepEqual([model.anchorIndex, model.startIndex, model.endIndex], [2, 2, 2]);
  assert.deepEqual(model.range(), { line: 8, endLine: 8 });
});

test("T39: extendBy grows the free end and shrinks it back, keeping the anchor", () => {
  const model = selection();
  assert.equal(model.extendBy(1, 1), true);
  assert.deepEqual([model.anchorIndex, model.startIndex, model.endIndex], [1, 1, 2]);
  model.extendBy(1);
  assert.deepEqual([model.startIndex, model.endIndex], [1, 3]);
  model.extendBy(-1);
  model.extendBy(-1);
  assert.deepEqual([model.startIndex, model.endIndex], [1, 1], "back to the anchor alone");
  model.extendBy(-1);
  assert.deepEqual([model.anchorIndex, model.startIndex, model.endIndex], [1, 0, 1], "crosses over upward");
  model.extendBy(1);
  assert.deepEqual([model.startIndex, model.endIndex], [1, 1]);
});

test("T39: the selection stops at the first and the last block", () => {
  const model = selection();
  model.extendBy(-1, 0);
  assert.deepEqual([model.startIndex, model.endIndex], [0, 0]);
  model.extendTo(4);
  model.extendBy(1);
  assert.deepEqual([model.startIndex, model.endIndex], [0, 4]);
  assert.equal(model.extendTo(99), false);
  assert.equal(model.extendTo(-1), false);
  assert.equal(model.extendBy(1), true, "extending past the end is a no-op, not a failure");
  assert.deepEqual([model.startIndex, model.endIndex], [0, 4]);
});

test("T39: an included block stops the range before it", () => {
  const list = blocks.map((block, index) => (index === 3 ? { ...block, included: true } : block));
  const model = selection(list);
  model.setAnchor(1);
  assert.equal(model.extendTo(4), true);
  assert.deepEqual([model.startIndex, model.endIndex], [1, 2], "stops before the included block");
  model.extendBy(1);
  assert.deepEqual([model.startIndex, model.endIndex], [1, 2], "Shift+Down cannot pass it");
  const upward = selection(list);
  upward.setAnchor(4);
  upward.extendTo(0);
  assert.deepEqual([upward.startIndex, upward.endIndex], [4, 4], "nothing but the anchor above an include");
});

test("T39: an included block cannot be the anchor, nor start a selection", () => {
  const list = blocks.map((block, index) => (index === 2 ? { ...block, included: true } : block));
  const model = selection(list);
  assert.equal(model.extendTo(2), false);
  assert.equal(model.isActive(), false);
  assert.equal(model.extendBy(1, 2), false);
  assert.equal(model.isActive(), false);
});

test("T39: clear empties the selection; a block list of another length drops it", () => {
  const model = selection();
  model.extendTo(1);
  model.extendBy(1);
  model.clear();
  assert.deepEqual([model.isActive(), model.anchorIndex, model.range()], [false, undefined, undefined]);
  model.extendTo(1);
  model.setBlocks(blocks.slice(0, 3));
  assert.equal(model.isActive(), false);
  model.extendTo(1);
  model.setBlocks(blocks.slice(0, 3).map((block) => ({ ...block })));
  assert.equal(model.isActive(), true, "same length keeps it");
});

test("T39: invalid anchors and an empty list are ignored", () => {
  const model = selection([]);
  assert.equal(model.extendTo(0), false);
  assert.equal(model.extendBy(1, 0), false);
  model.setAnchor(0);
  assert.equal(model.anchorIndex, undefined);
});
