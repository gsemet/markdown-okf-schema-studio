import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_FOLDED_DOCUMENTS,
  hasSection,
  headingFoldKey,
  normalizeHeadingFolds,
  planHeadingFold,
  sectionEnd,
  withDocumentFolds,
} from "../../../src/core/state/headingFold";

// Blocks: h1, p, h2, p, p, h3, p, h2, p
const BLOCKS = [1, undefined, 2, undefined, undefined, 3, undefined, 2, undefined];

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("a folded heading hides its blocks up to the next heading of the same or a higher level", () => {
  assert.deepEqual(planHeadingFold(BLOCKS, new Set([2])),
    [false, false, false, true, true, true, true, false, false]);
  assert.deepEqual(planHeadingFold(BLOCKS, new Set([5])),
    [false, false, false, false, false, false, true, false, false], "a deeper heading stops at the next h2");
  assert.deepEqual(planHeadingFold(BLOCKS, new Set([0])),
    [false, true, true, true, true, true, true, true, true], "the h1 holds the whole document");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("a heading inside a folded section stays hidden whatever its own fold state", () => {
  assert.deepEqual(planHeadingFold(BLOCKS, new Set([2, 5])), planHeadingFold(BLOCKS, new Set([2])));
  assert.deepEqual(planHeadingFold(BLOCKS, new Set()), BLOCKS.map(() => false));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("a section ends at the next heading of the same or a higher level, and may be empty", () => {
  assert.equal(sectionEnd(BLOCKS, 2), 7);
  assert.equal(sectionEnd(BLOCKS, 5), 7);
  assert.equal(sectionEnd(BLOCKS, 7), 9, "the last section runs to the end");
  assert.equal(sectionEnd(BLOCKS, 1), 1, "a paragraph has no section");
  assert.equal(hasSection([2, 2, undefined], 0), false, "a heading followed by a heading of its level is empty");
  assert.equal(hasSection([2, 3, undefined], 0), true);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-004
test("the key tells two headings with the same text apart by their occurrence", () => {
  assert.equal(headingFoldKey(2, "Scope", 0), "2|Scope|0");
  assert.notEqual(headingFoldKey(2, "Scope", 0), headingFoldKey(2, "Scope", 1));
  assert.notEqual(headingFoldKey(2, "Scope", 0), headingFoldKey(3, "Scope", 0));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-004
test("the saved fold state keeps only documents mapped to string keys", () => {
  assert.deepEqual(normalizeHeadingFolds({ "file:///a.md": ["2|A|0", 7, "3|B|0"], b: "x", c: [], d: null }),
    { "file:///a.md": ["2|A|0", "3|B|0"] });
  assert.deepEqual(normalizeHeadingFolds(undefined), {});
  assert.deepEqual(normalizeHeadingFolds(["2|A|0"]), {});
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-004
test("the fold state replaces the keys of one document, drops it when empty and stays bounded", () => {
  const first = withDocumentFolds({}, "a", ["2|A|0"]);
  assert.deepEqual(first, { a: ["2|A|0"] });
  assert.deepEqual(withDocumentFolds(first, "a", []), {});
  let folds = {};
  for (let index = 0; index < MAX_FOLDED_DOCUMENTS + 5; index += 1) {
    folds = withDocumentFolds(folds, `doc-${index}`, ["2|A|0"]);
  }
  const ids = Object.keys(folds);
  assert.equal(ids.length, MAX_FOLDED_DOCUMENTS);
  assert.equal(ids.at(-1), `doc-${MAX_FOLDED_DOCUMENTS + 4}`, "the newest document is kept");
  assert.ok(!ids.includes("doc-0"), "the oldest document is dropped");
});
