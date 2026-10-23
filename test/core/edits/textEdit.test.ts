import * as assert from "node:assert/strict";
import { test } from "node:test";

import { applyTextEdits, isRefusal, sourceLines } from "../../../src/core/edits/textEdit";

test("text edits apply in offset order, whatever order they come in", () => {
  assert.equal(applyTextEdits("abcdef", [
    { start: 4, end: 5, text: "E" },
    { start: 0, end: 1, text: "A" },
    { start: 2, end: 2, text: "+" },
  ]), "Ab+cdEf");
  assert.equal(applyTextEdits("abc", []), "abc");
});

test("overlapping or out-of-range text edits are refused", () => {
  assert.throws(() => applyTextEdits("abcdef", [{ start: 0, end: 3, text: "" }, { start: 2, end: 4, text: "" }]), RangeError);
  assert.throws(() => applyTextEdits("abc", [{ start: 2, end: 4, text: "" }]), RangeError);
  assert.throws(() => applyTextEdits("abc", [{ start: 2, end: 1, text: "" }]), RangeError);
});

test("source lines split on LF, CRLF and CR, and a final line break adds an empty last line", () => {
  const lines = sourceLines("a\r\nbb\ncc\rd\n");
  assert.equal(lines.count, 5);
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => lines.text(index)), ["a", "bb", "cc", "d", ""]);
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => [lines.start(index), lines.end(index)]), [
    [0, 1],
    [3, 5],
    [6, 8],
    [9, 10],
    [11, 11],
  ]);
  assert.equal(sourceLines("").count, 1);
  assert.equal(sourceLines("no break").count, 1);
});

test("a refusal is told apart from a plan", () => {
  assert.equal(isRefusal({ refused: "no" }), true);
  assert.equal(isRefusal({ edit: { start: 0, end: 0, text: "" } }), false);
});
