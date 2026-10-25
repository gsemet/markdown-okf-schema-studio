/**
 * Requirement tests of the toolbar-navigation scope on pure modules: the stylesheet rule of the
 * marked block and the classification of a query-only link.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { classifyPreviewReference } from "../../../src/core/navigation/previewNavigation";
import { PREVIEW_ACCESSIBILITY_CSS } from "../../../src/core/preview/previewStyles";

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-128
test("in forced-colors mode the marked block is outlined in the highlight colour", () => {
  const normal = /^\[data-sphinx-preview-current="true"\] \{([^}]*)\}/mu.exec(PREVIEW_ACCESSIBILITY_CSS);
  assert.ok(normal, "the rule of the normal mode exists");
  assert.match(normal[1], /outline: 2px solid var\(--studio-editor-findMatchHighlightBackground, Highlight\)/u);
  const forced = /@media \(forced-colors: active\) \{([\s\S]*?)\n\}/u.exec(PREVIEW_ACCESSIBILITY_CSS);
  assert.ok(forced, "the forced-colors block exists");
  assert.match(
    forced[1],
    /\[data-sphinx-preview-current="true"\] \{\s*outline: 2px solid Highlight;\s*\}/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-090
test("a query-only link is blocked and a file with a query is relative", () => {
  assert.deepEqual(classifyPreviewReference("?x=1"), {
    kind: "blocked",
    reason: "Query-only navigation targets are not valid file links.",
  });
  assert.deepEqual(classifyPreviewReference("other.md?view=1"), { kind: "relative", value: "other.md?view=1" });
});
