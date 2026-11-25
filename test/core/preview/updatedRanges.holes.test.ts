import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_UPDATED_RANGES,
  touchesSelection,
  updatedRangesForPatch,
} from "../../../src/core/preview/updatedRanges";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const at = (startLine: number, endLine = startLine) => ({ startLine, endLine });

// @tests_req SwRS-MDOKFSTUDIO-LIFE-094#S2
// @tests_req SwRS-MDOKFSTUDIO-LIFE-094#S3
test("a selection touches a change from one line before it to one line after its last line, counted over the inserted text", () => {
  const change = { startLine: 5, endLine: 5, text: "x" };
  assert.equal(touchesSelection([change], [at(4)]), true, "one line before");
  assert.equal(touchesSelection([change], [at(3)]), false, "two lines before");
  assert.equal(touchesSelection([change], [at(6)]), true, "one line after");
  assert.equal(touchesSelection([change], [at(7)]), false, "two lines after");
  assert.equal(touchesSelection([change], [at(1, 4)]), true, "a selection ending on the line before");
  assert.equal(touchesSelection([change], [at(1, 3)]), false);
  const grown = { startLine: 5, endLine: 5, text: "a\nb" };
  assert.equal(touchesSelection([grown], [at(7)]), true, "the text spans lines 5 and 6, so one line after is 7");
  assert.equal(touchesSelection([grown], [at(8)]), false);
  const long = { startLine: 5, endLine: 5, text: "a\nb\nc" };
  assert.equal(touchesSelection([long], [at(8)]), true);
  assert.equal(touchesSelection([long], [at(9)]), false);
  const removed = { startLine: 5, endLine: 9, text: "" };
  assert.equal(touchesSelection([removed], [at(10)]), true, "the replaced lines count too");
  assert.equal(touchesSelection([removed], [at(11)]), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-094#S2
// @tests_req SwRS-MDOKFSTUDIO-LIFE-094#S3
test("every changed span must touch some selection, and one touching selection is enough for a span", () => {
  const first = { startLine: 1, endLine: 1, text: "x" };
  const far = { startLine: 50, endLine: 50, text: "x" };
  assert.equal(touchesSelection([first, far], [at(1), at(50)]), true);
  assert.equal(touchesSelection([first, far], [at(1)]), false, "the second span touches nothing");
  assert.equal(touchesSelection([first], [at(1), at(80)]), true, "a second selection far away does no harm");
  assert.equal(touchesSelection([], [at(1)]), false);
  assert.equal(touchesSelection([first], []), false);
});

const lines = (count: number, change: (index: number) => string) => Array.from({ length: count }, (_, index) => change(index)).join("\n");

// @tests_req SwRS-MDOKFSTUDIO-LIFE-094#S3
// @tests_req SwRS-MDOKFSTUDIO-LIFE-094#S4
test("a patch lights up at most 50 ranges, and none when there are more", () => {
  assert.equal(MAX_UPDATED_RANGES, 50);
  const previous = { sourceText: lines(101, (index) => `line ${index}`), version: 1 };
  const changed = (count: number) => ({
    sourceText: lines(101, (index) => (index % 2 === 0 && index < count * 2 ? `changed ${index}` : `line ${index}`)),
    version: 3,
  });
  assert.equal(updatedRangesForPatch(previous, changed(50), 2).length, 50, "exactly 50 ranges are kept");
  assert.deepEqual(updatedRangesForPatch(previous, changed(51), 2), [], "51 ranges are too many");
  assert.equal(updatedRangesForPatch(previous, changed(1), 2).length, 1);
});
