import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  restoreStudioMarkdownAssociation,
  STUDIO_EDITOR_VIEW_TYPE,
} from "../../../src/core/configuration/editorAssociationMigration";

const STUDIO_ITEM = { viewType: STUDIO_EDITOR_VIEW_TYPE, filenamePattern: "*.md" };

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("an absent association becomes the *.md entry for Studio", () => {
  assert.deepEqual(restoreStudioMarkdownAssociation(undefined), { kind: "write", value: { "*.md": STUDIO_EDITOR_VIEW_TYPE } });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("an object without *.md gets the entry and keeps every other entry in its order", () => {
  const result = restoreStudioMarkdownAssociation({ "*.png": "imagePreview.previewEditor", "docs/*.md": "x" });
  assert.deepEqual(result, {
    kind: "write",
    value: { "*.png": "imagePreview.previewEditor", "docs/*.md": "x", "*.md": STUDIO_EDITOR_VIEW_TYPE },
  });
  assert.deepEqual(Object.keys((result as { value: object }).value), ["*.png", "docs/*.md", "*.md"]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("an object whose *.md already names Studio has nothing to write", () => {
  assert.deepEqual(restoreStudioMarkdownAssociation({ "*.md": STUDIO_EDITOR_VIEW_TYPE }), { kind: "none" });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("an object whose *.md names another editor has nothing to write: the user's choice wins", () => {
  assert.deepEqual(restoreStudioMarkdownAssociation({ "*.md": "vscode.markdown.preview.editor" }), { kind: "none" });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("the legacy array form gets the Studio item appended and keeps its items", () => {
  const keep = { viewType: "other.editor", filenamePattern: "*.txt" };
  assert.deepEqual(restoreStudioMarkdownAssociation([keep]), { kind: "write", value: [keep, STUDIO_ITEM] });
  assert.deepEqual(restoreStudioMarkdownAssociation([]), { kind: "write", value: [STUDIO_ITEM] });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("the legacy array form with a *.md item, Studio's or another editor's, has nothing to write", () => {
  assert.deepEqual(restoreStudioMarkdownAssociation([STUDIO_ITEM]), { kind: "none" });
  assert.deepEqual(restoreStudioMarkdownAssociation([{ viewType: "x", filenamePattern: "*.md" }]), { kind: "none" });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S2
test("any other shape is malformed: nothing is written", () => {
  for (const value of [null, "text", 42, true]) {
    assert.deepEqual(restoreStudioMarkdownAssociation(value), { kind: "malformed" }, JSON.stringify(value));
  }
});
