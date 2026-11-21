import * as assert from "node:assert/strict";
import { test } from "node:test";

import { openingDecision, studioTargetFor, type OpeningFacts } from "../../../src/core/navigation/openingPolicy";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("a Studio tab of the file in the text tab's group is revealed, for a plain opening and for a jump", () => {
  const groups = [{ viewColumn: 1, lastActive: 1 }, { viewColumn: 2, lastActive: 9 }];
  for (const action of ["studio", "studio-at-line"] as const) {
    assert.deepEqual(studioTargetFor(action, 1, groups), { kind: "reveal", viewColumn: 1 });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("a jump reveals the most recently active Studio tab of the other groups", () => {
  const groups = [{ viewColumn: 1, lastActive: 3 }, { viewColumn: 3, lastActive: 8 }, { viewColumn: 4, lastActive: 5 }];
  assert.deepEqual(studioTargetFor("studio-at-line", 2, groups), { kind: "reveal", viewColumn: 3 });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("a plain opening in a group with no Studio tab of the file opens a new one there", () => {
  assert.deepEqual(studioTargetFor("studio", 2, [{ viewColumn: 1, lastActive: 9 }]), { kind: "open", viewColumn: 2 });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("a file with no Studio tab opens one in the text tab's group, jump or not", () => {
  for (const action of ["studio", "studio-at-line"] as const) {
    assert.deepEqual(studioTargetFor(action, 2, []), { kind: "open", viewColumn: 2 });
  }
});

/** A new, eligible text tab opening at line 12 under the default settings; each test changes one fact. */
const base: OpeningFacts = {
  kind: "text",
  eligible: true,
  isNew: true,
  presentAtStart: false,
  triggeredActivation: false,
  line: 12,
  searchResultsInStudio: true,
  markdownFilesInStudio: false,
  reopenedAsText: false,
  openedByStudio: false,
  sidePreviewFollowsActiveEditor: false,
};
const decide = (changes: Partial<OpeningFacts>) => openingDecision({ ...base, ...changes });
const KEEP = { kind: "keep" };

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 1: anything that is not a text tab is kept, under both settings", () => {
  for (const kind of ["diff", "merge", "custom", "other"] as const) {
    assert.deepEqual(decide({ kind }), KEEP);
    assert.deepEqual(decide({ kind, markdownFilesInStudio: true }), KEEP);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 2: a document that is not an eligible saved file .md is kept", () => {
  assert.deepEqual(decide({ eligible: false }), KEEP);
  assert.deepEqual(decide({ eligible: false, markdownFilesInStudio: true, line: undefined }), KEEP);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 3: a tab that is not new, or present at start, is kept, except the opening that triggered the activation", () => {
  assert.deepEqual(decide({ isNew: false }), KEEP);
  assert.deepEqual(decide({ isNew: false, markdownFilesInStudio: true }), KEEP);
  assert.deepEqual(decide({ presentAtStart: true }), KEEP);
  assert.deepEqual(decide({ presentAtStart: true, markdownFilesInStudio: true, line: undefined }), KEEP);
  assert.deepEqual(decide({ presentAtStart: true, triggeredActivation: true }), { kind: "studio-at-line", line: 12 });
  assert.deepEqual(decide({ isNew: false, presentAtStart: true, triggeredActivation: true }), KEEP);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 4: a text editor Studio opened itself is kept", () => {
  assert.deepEqual(decide({ openedByStudio: true }), KEEP);
  assert.deepEqual(decide({ openedByStudio: true, markdownFilesInStudio: true }), KEEP);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 5: a text editor reopened as text on purpose is kept", () => {
  assert.deepEqual(decide({ reopenedAsText: true }), KEEP);
  assert.deepEqual(decide({ reopenedAsText: true, markdownFilesInStudio: true, line: undefined }), KEEP);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 6: a jump is kept while a side preview follows the active editor, a plain opening goes on", () => {
  assert.deepEqual(decide({ sidePreviewFollowsActiveEditor: true }), KEEP);
  assert.deepEqual(decide({ sidePreviewFollowsActiveEditor: true, markdownFilesInStudio: true }), KEEP);
  assert.deepEqual(decide({ sidePreviewFollowsActiveEditor: true, markdownFilesInStudio: true, line: undefined }), { kind: "studio" });
  assert.deepEqual(decide({ sidePreviewFollowsActiveEditor: true, line: undefined }), KEEP);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 7: with Open Markdown files in Studio on, a jump opens Studio at the line and a plain opening opens Studio", () => {
  assert.deepEqual(decide({ markdownFilesInStudio: true }), { kind: "studio-at-line", line: 12 });
  assert.deepEqual(decide({ markdownFilesInStudio: true, searchResultsInStudio: false }), { kind: "studio-at-line", line: 12 });
  assert.deepEqual(decide({ markdownFilesInStudio: true, line: undefined }), { kind: "studio" });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 8: with Open search results in Studio on, a jump opens Studio at the line", () => {
  assert.deepEqual(decide({}), { kind: "studio-at-line", line: 12 });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-184
test("rule 9: a plain opening, or a jump with the setting off, stays a text editor", () => {
  assert.deepEqual(decide({ line: undefined }), KEEP);
  assert.deepEqual(decide({ searchResultsInStudio: false }), KEEP);
  assert.deepEqual(decide({ searchResultsInStudio: false, line: undefined }), KEEP);
});
