import * as assert from "node:assert/strict";
import { test } from "node:test";

import { baseSpanOf, lineHunks, spanChanged } from "../../../src/core/mapping/lineDiff";

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: identical texts have no hunk, line endings do not count", () => {
  assert.deepEqual(lineHunks("a\nb\n", "a\nb\n"), []);
  assert.deepEqual(lineHunks("a\r\nb\r\n", "a\nb\n"), []);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: a hunk gives the base lines and the current lines", () => {
  assert.deepEqual(lineHunks("a\nb\nc\n", "a\nB\nc\n"), [{ baseStart: 2, baseEnd: 2, start: 2, end: 2 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: added lines have an empty base side and removed lines an empty current side", () => {
  assert.deepEqual(lineHunks("a\nc\n", "a\nb\nc\n"), [{ baseStart: 2, baseEnd: 1, start: 2, end: 2 }]);
  assert.deepEqual(lineHunks("a\nb\nc\n", "a\nc\n"), [{ baseStart: 2, baseEnd: 2, start: 2, end: 1 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: separate edits are separate hunks", () => {
  assert.deepEqual(lineHunks("a\nb\nc\nd\ne\n", "A\nb\nc\nd\nE\n"), [
    { baseStart: 1, baseEnd: 1, start: 1, end: 1 },
    { baseStart: 5, baseEnd: 5, start: 5, end: 5 },
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: lines removed and added before the next common line form one hunk", () => {
  assert.deepEqual(lineHunks("a\nx\ny\nz\nb\n", "a\nP\nQ\nb\n"), [{ baseStart: 2, baseEnd: 4, start: 2, end: 3 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: above the size caps the whole differing middle is one hunk", () => {
  const base = Array.from({ length: 3000 }, (_, index) => `a${index}`);
  const current = Array.from({ length: 3000 }, (_, index) => `b${index}`);
  assert.deepEqual(lineHunks(base.join("\n"), current.join("\n")), [{ baseStart: 1, baseEnd: 3000, start: 1, end: 3000 }]);
  const long = Array.from({ length: 20_005 }, (_, index) => `line ${index}`);
  const wide = [...long];
  wide[1] = "x";
  wide[20_003] = "y";
  assert.deepEqual(lineHunks(long.join("\n"), wide.join("\n")), [{ baseStart: 2, baseEnd: 20_004, start: 2, end: 20_004 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: a block is changed when it meets added lines or holds a removal", () => {
  const hunks = lineHunks("a\nb\nc\nd\ne\n", "a\nB\nc\ne\nf\n");
  // base b->B at 2; d removed (current: before line 4); f added at 5.
  assert.deepEqual(hunks.map((hunk) => [hunk.start, hunk.end]), [[2, 2], [4, 3], [5, 5]]);
  assert.equal(spanChanged({ start: 1, end: 1 }, hunks), false);
  assert.equal(spanChanged({ start: 2, end: 2 }, hunks), true);
  assert.equal(spanChanged({ start: 3, end: 3 }, hunks), false);
  assert.equal(spanChanged({ start: 3, end: 4 }, hunks), true, "the removal lies inside the block");
  assert.equal(spanChanged({ start: 4, end: 4 }, hunks), false, "a removal before the first line is not in the block");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-010
test("CR147: the base lines of a block follow the hunks", () => {
  const hunks = lineHunks("h\nold\nkeep\ngone\nend\n", "h\nnew\nnew2\nkeep\nend\n");
  assert.deepEqual(hunks, [
    { baseStart: 2, baseEnd: 2, start: 2, end: 3 },
    { baseStart: 4, baseEnd: 4, start: 5, end: 4 },
  ]);
  assert.deepEqual(baseSpanOf({ start: 2, end: 3 }, hunks), { start: 2, end: 2 });
  assert.deepEqual(baseSpanOf({ start: 4, end: 4 }, hunks), { start: 3, end: 3 }, "an unchanged block shifts");
  assert.deepEqual(baseSpanOf({ start: 4, end: 5 }, hunks), { start: 3, end: 5 }, "a block with a removal inside");
  const added = lineHunks("a\nb\n", "a\nx\nb\n");
  const span = baseSpanOf({ start: 2, end: 2 }, added);
  assert.ok(span.end < span.start, "an added block has no base lines");
});
