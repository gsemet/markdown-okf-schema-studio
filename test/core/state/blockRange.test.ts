import * as assert from "node:assert/strict";
import { test } from "node:test";

import { rebaseBlockRange } from "../../../src/core/state/blockRange";

// The block is "BLOCK" at offset 10 of the document "0123456789BLOCK-tail".
const block = { start: 10, length: 5 };

test("STAB-06: a change before the open block shifts it by the inserted or removed length", () => {
  assert.deepEqual(rebaseBlockRange(block, [{ rangeOffset: 2, rangeLength: 0, text: "abc" }]), { start: 13 });
  assert.deepEqual(rebaseBlockRange(block, [{ rangeOffset: 0, rangeLength: 4, text: "" }]), { start: 6 });
  assert.deepEqual(rebaseBlockRange(block, [{ rangeOffset: 6, rangeLength: 4, text: "x" }]), { start: 7 },
    "a replacement that ends where the block starts is before it");
  assert.deepEqual(rebaseBlockRange(block, [{ rangeOffset: 10, rangeLength: 0, text: "new " }]), { start: 14 },
    "an insertion at the start of the block is before it");
});

test("STAB-06: a change at or after the end of the open block leaves it in place", () => {
  assert.deepEqual(rebaseBlockRange(block, [{ rangeOffset: 15, rangeLength: 0, text: "more" }]), { start: 10 });
  assert.deepEqual(rebaseBlockRange(block, [{ rangeOffset: 16, rangeLength: 3, text: "" }]), { start: 10 });
});

test("STAB-06: several changes of one event add up; offsets refer to the text before the event", () => {
  assert.deepEqual(rebaseBlockRange(block, [
    { rangeOffset: 18, rangeLength: 1, text: "TAIL" },
    { rangeOffset: 1, rangeLength: 0, text: "++" },
    { rangeOffset: 5, rangeLength: 2, text: "" },
  ]), { start: 10 });
});

test("STAB-06: a change inside or across the open block is a conflict", () => {
  assert.equal(rebaseBlockRange(block, [{ rangeOffset: 12, rangeLength: 0, text: "x" }]), "conflict");
  assert.equal(rebaseBlockRange(block, [{ rangeOffset: 8, rangeLength: 4, text: "" }]), "conflict");
  assert.equal(rebaseBlockRange(block, [{ rangeOffset: 14, rangeLength: 3, text: "y" }]), "conflict");
  assert.equal(rebaseBlockRange(block, [
    { rangeOffset: 0, rangeLength: 0, text: "ok" },
    { rangeOffset: 11, rangeLength: 1, text: "" },
  ]), "conflict", "one overlapping change is enough");
});

test("STAB-06: an empty block (an insertion editor) conflicts only with a change at its offset", () => {
  const empty = { start: 10, length: 0 };
  assert.deepEqual(rebaseBlockRange(empty, [{ rangeOffset: 3, rangeLength: 0, text: "ab" }]), { start: 12 });
  assert.deepEqual(rebaseBlockRange(empty, [{ rangeOffset: 11, rangeLength: 2, text: "" }]), { start: 10 });
  assert.equal(rebaseBlockRange(empty, [{ rangeOffset: 9, rangeLength: 2, text: "" }]), "conflict");
});
