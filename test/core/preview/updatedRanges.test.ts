import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isOutsideChange, MAX_UPDATED_RANGES, updatedRangesForPatch } from "../../../src/core/preview/updatedRanges";

const BEFORE = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n";
const AFTER = "# Title\n\nFirst paragraph, edited.\n\nSecond paragraph.\n";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-094
test("CR 046: an undo or a redo always counts as an outside change, the preview's own edit does not", () => {
  assert.equal(isOutsideChange(undefined, false, false), true, "another tool, a file changed on disk");
  assert.equal(isOutsideChange(undefined, true, false), false, "an edit the preview asked for");
  assert.equal(isOutsideChange(1, true, false), true, "Undo");
  assert.equal(isOutsideChange(2, true, false), true, "Redo");
});

test("CR 046: typing in the active text editor does not glow, its undo and redo do", () => {
  assert.equal(isOutsideChange(undefined, false, true), false, "typing in the active text editor");
  assert.equal(isOutsideChange(undefined, true, true), false, "the preview's own edit of the active editor's document");
  assert.equal(isOutsideChange(1, false, true), true, "Undo in the active text editor");
  assert.equal(isOutsideChange(2, false, true), true, "Redo in the active text editor");
});

test("CR 046: the patch that first shows an outside change carries its changed lines", () => {
  assert.deepEqual(
    updatedRangesForPatch({ sourceText: BEFORE, version: 4 }, { sourceText: AFTER, version: 5 }, 5),
    [{ start: 3, end: 3 }],
  );
});

test("CR 046: no glow without an outside change in the versions the patch moves across", () => {
  const previous = { sourceText: BEFORE, version: 4 };
  const next = { sourceText: AFTER, version: 6 };
  assert.deepEqual(updatedRangesForPatch(previous, next, undefined), [], "only the preview's own edits");
  assert.deepEqual(updatedRangesForPatch(previous, next, 4), [], "already shown by the previous render");
  assert.deepEqual(updatedRangesForPatch(previous, next, 7), [], "not in this render yet");
  assert.deepEqual(updatedRangesForPatch(previous, next, 6), [{ start: 3, end: 3 }]);
});

test("CR 046: a change spread over too many places glows nowhere", () => {
  const lines = Array.from({ length: 2 * (MAX_UPDATED_RANGES + 1) }, (_, index) => "line " + index);
  const edited = lines.map((line, index) => (index % 2 === 0 ? line + " edited" : line));
  assert.deepEqual(
    updatedRangesForPatch({ sourceText: lines.join("\n"), version: 1 }, { sourceText: edited.join("\n"), version: 2 }, 2),
    [],
  );
});
