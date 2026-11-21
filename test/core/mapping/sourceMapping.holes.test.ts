import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseSourceMappings,
  sourceRangeForLines,
  type MappingElement,
} from "../../../src/core/mapping/sourceMapping";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.
// No SwRS of requirements/ names this module, so these tests carry no @tests_req marker.

const element = (attributes: Record<string, string>): MappingElement => ({ getAttribute: (name) => attributes[name] ?? null });
const mapped = (line: string, extra: Record<string, string> = {}) => element({
  "data-sphinx-preview-document": "doc",
  "data-sphinx-source-file": "a.md",
  "data-sphinx-source-line": line,
  ...extra,
});
const options = { documentId: "doc", activeSourceFile: "a.md" };

test("a line range needs two safe integers, a first line of 1 or more, and an end not before the start", () => {
  const text = "one\ntwo\nthree";
  assert.deepEqual(sourceRangeForLines(text, 1, 1), { start: 0, end: 4 }, "line 1 is valid");
  assert.deepEqual(sourceRangeForLines(text, 2, 3), { start: 4, end: 13 });
  assert.equal(sourceRangeForLines(text, 0, 1), undefined);
  assert.equal(sourceRangeForLines(text, 3, 2), undefined);
  assert.equal(sourceRangeForLines(text, 1.5, 2), undefined, "a fractional start");
  assert.equal(sourceRangeForLines(text, 1, 2.5), undefined, "a fractional end");
  assert.equal(sourceRangeForLines(text, Number.NaN, 2), undefined);
  assert.equal(sourceRangeForLines(text, 1, Number.POSITIVE_INFINITY), undefined);
  assert.equal(sourceRangeForLines(text, 1, 4), undefined, "past the last line");
  assert.equal(sourceRangeForLines(text, 2 ** 53, 2 ** 53), undefined, "an unsafe integer");
  assert.equal(sourceRangeForLines(text, 1, 2 ** 53), undefined);
  assert.equal(sourceRangeForLines("", 1, 1)?.end, 0);
});

test("every kind of line ending counts as one break", () => {
  assert.deepEqual(sourceRangeForLines("a\r\nb\rc\nd", 2, 2), { start: 3, end: 5 });
  assert.deepEqual(sourceRangeForLines("a\r\nb\rc\nd", 4, 4), { start: 7, end: 8 });
});

test("a mapping line is a plain positive integer without a sign, a space, a fraction or a leading zero", () => {
  const lines = (line: string) => parseSourceMappings([mapped(line)], options).length;
  assert.equal(lines("12"), 1);
  assert.equal(lines("1"), 1);
  assert.equal(lines("0"), 0);
  assert.equal(lines("012"), 0);
  assert.equal(lines("x12"), 0, "anchored at the start");
  assert.equal(lines("12x"), 0, "anchored at the end");
  assert.equal(lines("-12"), 0);
  assert.equal(lines("1.5"), 0);
  assert.equal(lines(" 12"), 0);
  assert.equal(lines("12 "), 0);
});

test("a mapping with no block id is named after its place among all the elements, counted from 1", () => {
  const ignored = element({});
  const result = parseSourceMappings([ignored, mapped("3"), mapped("4", { "data-sphinx-preview-block": "named" }), mapped("5")], options);
  assert.deepEqual(result.map((entry) => [entry.blockId, entry.domOrder, entry.sourceLine]), [
    ["source-block-2", 1, 3],
    ["named", 2, 4],
    ["source-block-4", 3, 5],
  ]);
});
