import * as assert from "node:assert/strict";
import { test } from "node:test";

import { pageSettings, stickyHeadingDepthOf } from "../../src/page/pageSettings";
import type { PreviewRuntimeContext } from "../../src/protocol/bootContext";

const BASE: PreviewRuntimeContext = { documentId: "file:///a.md", revision: 1, requestId: 1, activeSourceFile: "/a.md" };

test("page settings default to following both ways, without selection marks or double-click reveal", () => {
  assert.deepEqual(pageSettings(BASE), {
    scrollPreviewWithEditor: true,
    scrollEditorWithPreview: true,
    markEditorSelection: false,
    doubleClickToSwitchToEditor: false,
  });
  assert.deepEqual(pageSettings({
    ...BASE,
    scrollPreviewWithEditor: false,
    scrollEditorWithPreview: false,
    markEditorSelection: true,
    doubleClickToSwitchToEditor: true,
  }), {
    scrollPreviewWithEditor: false,
    scrollEditorWithPreview: false,
    markEditorSelection: true,
    doubleClickToSwitchToEditor: true,
  });
});

test("the sticky heading depth is rounded and clamped to 1..6, else 3", () => {
  assert.equal(stickyHeadingDepthOf(BASE), 3);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: 0 }), 1);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: 4.6 }), 5);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: 12 }), 6);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: Number.NaN }), 3);
});
