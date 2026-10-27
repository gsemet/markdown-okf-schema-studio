import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  isOutsideChange,
  isTypingChange,
  KEYSTROKE_WINDOW_MS,
  MAX_UPDATED_RANGES,
  touchesSelection,
  updatedRangesForPatch,
} from "../../../src/core/preview/updatedRanges";

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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-094
test("CR 139: a change is typing only with a recent keystroke and a cursor on it", () => {
  const typed = [{ startLine: 10, endLine: 10, text: "a" }];
  const caret = [{ startLine: 10, endLine: 10 }];
  assert.equal(isTypingChange(typed, caret, 0), true, "a keystroke just now, at the caret");
  assert.equal(isTypingChange(typed, [{ startLine: 11, endLine: 11 }], 20), true, "the caret is reported a line behind or ahead");
  assert.equal(isTypingChange(typed, caret, KEYSTROKE_WINDOW_MS), true, "at the edge of the window");
  assert.equal(isTypingChange(typed, caret, KEYSTROKE_WINDOW_MS + 1), false, "no keystroke in the last 500 ms");
  assert.equal(isTypingChange(typed, caret, undefined), false, "no keystroke seen at all");
  assert.equal(isTypingChange(typed, [{ startLine: 40, endLine: 42 }], 0), false, "far from every cursor, whatever the keystroke");
  assert.equal(isTypingChange(typed, [], 0), false, "no editor shows the document");
});

test("CR 139: a change touches a selection when the changed lines meet it", () => {
  const replaced = [{ startLine: 10, endLine: 12, text: "x" }];
  assert.equal(touchesSelection(replaced, [{ startLine: 11, endLine: 11 }]), true, "inside the replaced lines");
  assert.equal(touchesSelection(replaced, [{ startLine: 13, endLine: 13 }]), true, "one line after, the cursor lags");
  assert.equal(touchesSelection(replaced, [{ startLine: 0, endLine: 30 }]), true, "inside a larger selection");
  assert.equal(touchesSelection(replaced, [{ startLine: 14, endLine: 20 }]), false, "two lines after");
  assert.equal(touchesSelection([{ startLine: 3, endLine: 3, text: "a\nb\nc\nd" }], [{ startLine: 6, endLine: 6 }]), true,
    "the inserted lines count");
  assert.equal(touchesSelection([...replaced, { startLine: 100, endLine: 100, text: "b" }], [{ startLine: 11, endLine: 11 }]), false,
    "one of two spans is away from the only cursor");
  assert.equal(touchesSelection([], [{ startLine: 0, endLine: 0 }]), false);
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
