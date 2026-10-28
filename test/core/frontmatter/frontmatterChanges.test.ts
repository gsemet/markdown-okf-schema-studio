import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  frontmatterFieldChanges,
  frontmatterFieldLines,
  incomingChangeRanges,
} from "../../../src/core/frontmatter/frontmatterChanges";

const BASE = [
  "---",
  "title: Release checklist",
  "owner: Platform team",
  "status: draft",
  "tags:",
  "  - docs",
  "  - preview",
  "---",
  "",
  "# Heading",
  "",
].join("\n");

const CURRENT = [
  "---",
  "title: Release checklist",
  "owner: Platform team",
  "status: reviewed",
  "tags:",
  "  - docs",
  "  - preview",
  "reviewer: Ada",
  "---",
  "",
  "# Heading",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: the lines of each field cover its key line and the lines of its value", () => {
  const lines = frontmatterFieldLines(CURRENT);
  assert.deepEqual([...lines.keys()], ["title", "owner", "status", "tags", "reviewer"]);
  assert.deepEqual(lines.get("title"), { start: 2, end: 2 });
  assert.deepEqual(lines.get("status"), { start: 4, end: 4 });
  assert.deepEqual(lines.get("tags"), { start: 5, end: 7 });
  assert.deepEqual(lines.get("reviewer"), { start: 8, end: 8 });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a text without front matter, or with an invalid one, has no field lines", () => {
  assert.equal(frontmatterFieldLines("# Heading\n").size, 0);
  assert.equal(frontmatterFieldLines("---\n- a\n- b\n---\n").size, 0);
  assert.equal(frontmatterFieldLines("---\nkey: [unclosed\n---\n").size, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a changed value is modified and a new key is added", () => {
  assert.deepEqual(frontmatterFieldChanges(BASE, CURRENT), {
    added: ["reviewer"],
    modified: ["status"],
    removed: [],
  });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a key that disappeared is removed, a changed list item modifies the field", () => {
  const without = BASE.replace("owner: Platform team\n", "").replace("  - preview", "  - ui");
  assert.deepEqual(frontmatterFieldChanges(BASE, without), {
    added: [],
    modified: ["tags"],
    removed: ["owner"],
  });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: the same fields in another order are not changes, and a missing front matter has none", () => {
  const reordered = BASE.replace("owner: Platform team\nstatus: draft", "status: draft\nowner: Platform team");
  assert.deepEqual(frontmatterFieldChanges(BASE, reordered), { added: [], modified: [], removed: [] });
  assert.deepEqual(frontmatterFieldChanges("# a\n", "# b\n"), { added: [], modified: [], removed: [] });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a removed field adds a range on line 1 so that the properties table is marked", () => {
  const without = BASE.replace("owner: Platform team\n", "");
  assert.deepEqual(incomingChangeRanges(BASE, without), [{ start: 1, end: 1 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: changed and added fields keep their line ranges and add nothing", () => {
  assert.deepEqual(incomingChangeRanges(BASE, CURRENT), [{ start: 4, end: 4 }, { start: 8, end: 8 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a body that lost lines but no field adds no range", () => {
  assert.deepEqual(incomingChangeRanges(BASE, BASE.replace("# Heading\n", "")), []);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: a removed field with a changed field reports the table line and the changed field", () => {
  const edited = BASE.replace("owner: Platform team\n", "").replace("draft", "reviewed");
  // The page marks the row of the changed field; the table is not innermost, so it gets no bar of its own.
  assert.deepEqual(incomingChangeRanges(BASE, edited), [{ start: 1, end: 1 }, { start: 3, end: 3 }]);
});
