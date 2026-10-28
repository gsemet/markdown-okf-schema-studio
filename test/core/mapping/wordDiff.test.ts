import * as assert from "node:assert/strict";
import { test } from "node:test";

import { diffSegments, diffWords, MAX_WORD_DIFF_CELLS } from "../../../src/core/mapping/wordDiff";

const slices = (text: string, ranges: readonly { start: number; end: number }[]): string[] =>
  ranges.map((range) => text.slice(range.start, range.end));

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: identical texts have no changed word", () => {
  assert.deepEqual(diffWords("one two", "one two"), { removed: [], added: [] });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: a replaced word is removed on the left and added on the right", () => {
  const before = "the quick brown fox";
  const after = "the slow brown fox";
  const diff = diffWords(before, after);
  assert.deepEqual(slices(before, diff.removed), ["quick"]);
  assert.deepEqual(slices(after, diff.added), ["slow"]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: consecutive changed words are one range, separate ones are separate", () => {
  const before = "a b c d e";
  const after = "a X Y d Z";
  const diff = diffWords(before, after);
  assert.deepEqual(slices(before, diff.removed), ["b c", "e"]);
  assert.deepEqual(slices(after, diff.added), ["X Y", "Z"]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: inserted and deleted words only mark one side", () => {
  const diff = diffWords("a c", "a b c");
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(slices("a b c", diff.added), ["b"]);
  const gone = diffWords("a b c", "a c");
  assert.deepEqual(slices("a b c", gone.removed), ["b"]);
  assert.deepEqual(gone.added, []);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: an empty side marks all of the other", () => {
  assert.deepEqual(diffWords("", "new text"), { removed: [], added: [{ start: 0, end: 8 }] });
  assert.deepEqual(diffWords("old text", ""), { removed: [{ start: 0, end: 8 }], added: [] });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: a very long pair marks everything", () => {
  const size = Math.ceil(Math.sqrt(MAX_WORD_DIFF_CELLS)) + 1;
  const words = Array.from({ length: size }, (_, index) => `w${index}`);
  const other = [...words];
  other[5] = "changed";
  const diff = diffWords(words.join(" "), other.join(" "));
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.removed[0].start, 0);
  assert.equal(diff.removed[0].end, words.join(" ").length);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: pieces of text are compared as one text and the ranges come back inside their piece", () => {
  const before = ["Hello ", "brave", " world"];
  const after = ["Hello ", "new", " world"];
  const diff = diffSegments(before, after);
  assert.deepEqual(diff.removed, [[], [{ start: 0, end: 5 }], []]);
  assert.deepEqual(diff.added, [[], [{ start: 0, end: 3 }], []]);
  // A boundary between pieces separates words: "a" + "b" are two words.
  const glued = diffSegments(["a", "b"], ["a", "c"]);
  assert.deepEqual(glued.removed, [[], [{ start: 0, end: 1 }]]);
  assert.deepEqual(glued.added, [[], [{ start: 0, end: 1 }]]);
});
