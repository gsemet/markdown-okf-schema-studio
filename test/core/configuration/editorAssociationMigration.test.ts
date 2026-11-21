import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  removeStudioMarkdownAssociation,
  STUDIO_EDITOR_VIEW_TYPE,
} from "../../../src/core/configuration/editorAssociationMigration";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("the object form loses its *.md entry for Studio and keeps every other entry", () => {
  const result = removeStudioMarkdownAssociation({ "*.md": STUDIO_EDITOR_VIEW_TYPE, "*.png": "imagePreview.previewEditor" });
  assert.deepEqual(result, { changed: true, value: { "*.png": "imagePreview.previewEditor" } });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("an object that held only the Studio entry becomes undefined, which removes the key", () => {
  assert.deepEqual(removeStudioMarkdownAssociation({ "*.md": STUDIO_EDITOR_VIEW_TYPE }), { changed: true, value: undefined });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("an association of *.md to another editor, another pattern or another shape is left alone", () => {
  const other = { "*.md": "vscode.markdown.preview.editor" };
  const patterns = { "**/*.md": STUDIO_EDITOR_VIEW_TYPE, "docs/*.md": STUDIO_EDITOR_VIEW_TYPE };
  for (const value of [other, patterns, {}, undefined, null, "text", 42, [{ viewType: "x", filenamePattern: "*.md" }]]) {
    const result = removeStudioMarkdownAssociation(value);
    assert.equal(result.changed, false, JSON.stringify(value));
    assert.equal(result.value, value, "the very same value comes back");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("the legacy array form loses the Studio *.md entry only", () => {
  const keep = { viewType: "other.editor", filenamePattern: "*.txt" };
  assert.deepEqual(removeStudioMarkdownAssociation([
    { viewType: STUDIO_EDITOR_VIEW_TYPE, filenamePattern: "*.md" }, keep,
  ]), { changed: true, value: [keep] });
  assert.deepEqual(removeStudioMarkdownAssociation([
    { viewType: STUDIO_EDITOR_VIEW_TYPE, filenamePattern: "*.md" },
  ]), { changed: true, value: undefined });
});
