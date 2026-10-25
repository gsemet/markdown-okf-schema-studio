import * as assert from "node:assert/strict";
import { test } from "node:test";

import { changedLineRanges } from "../../../src/core/mapping/lineDiff";

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-200
test("T16: identical text has no changed range", () => {
  assert.deepEqual(changedLineRanges("a\nb\nc\n", "a\nb\nc\n"), []);
});

test("T16: added lines are reported in current line numbers", () => {
  assert.deepEqual(changedLineRanges("a\nc\n", "a\nb\nc\n"), [{ start: 2, end: 2 }]);
  assert.deepEqual(changedLineRanges("a\n", "a\nb\nc\n"), [{ start: 2, end: 3 }]);
});

test("T16: a modified line is one range and two separate edits are two ranges", () => {
  assert.deepEqual(changedLineRanges("a\nb\nc\n", "a\nB\nc\n"), [{ start: 2, end: 2 }]);
  assert.deepEqual(
    changedLineRanges("a\nb\nc\nd\ne\n", "A\nb\nc\nd\nE\n"),
    [{ start: 1, end: 1 }, { start: 5, end: 5 }],
  );
});

test("T16: deleted-only lines give no range", () => {
  assert.deepEqual(changedLineRanges("a\nb\nc\n", "a\nc\n"), []);
});

test("T16: line endings do not count as changes", () => {
  assert.deepEqual(changedLineRanges("a\r\nb\r\nc\r\n", "a\nb\nc\n"), []);
  assert.deepEqual(changedLineRanges("a\rb\r", "a\nB\n"), [{ start: 2, end: 2 }]);
});

test("T16: a base without a trailing newline matches one with it", () => {
  assert.deepEqual(changedLineRanges("a\nb", "a\nb\n"), []);
});

test("T16: above the size cap the whole middle counts as changed", () => {
  const base = Array.from({ length: 20_005 }, (_, index) => `line ${index}`);
  const current = [...base];
  current[10_000] = "changed";
  const ranges = changedLineRanges(base.join("\n"), current.join("\n"));
  // The common prefix and suffix are stripped first, so one edited line stays one line.
  assert.deepEqual(ranges, [{ start: 10_001, end: 10_001 }]);
  const wide = [...base];
  wide[1] = "x";
  wide[20_003] = "y";
  assert.deepEqual(changedLineRanges(base.join("\n"), wide.join("\n")), [{ start: 2, end: 20_004 }]);
});

test("T16: many differences beyond the edit budget fall back to the whole middle", () => {
  const base = Array.from({ length: 3000 }, (_, index) => `a${index}`);
  const current = Array.from({ length: 3000 }, (_, index) => `b${index}`);
  assert.deepEqual(changedLineRanges(base.join("\n"), current.join("\n")), [{ start: 1, end: 3000 }]);
});
