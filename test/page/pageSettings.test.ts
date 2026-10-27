import * as assert from "node:assert/strict";
import { test } from "node:test";

import { applyCodeBlockSettings, pageSettings, stickyHeadingDepthOf } from "../../src/page/pageSettings";
import type { PreviewRuntimeContext } from "../../src/core/protocol/bootContext";

const BASE: PreviewRuntimeContext = { documentId: "file:///a.md", revision: 1, requestId: 1, activeSourceFile: "/a.md" };

// @tests_req SwRS-MDOKFSTUDIO-LIFE-097
// @tests_req SwRS-MDOKFSTUDIO-LIFE-156
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-128
test("page settings default to following both ways and without selection marks", () => {
  assert.deepEqual(pageSettings(BASE), {
    scrollPreviewWithEditor: true,
    scrollEditorWithPreview: true,
    markEditorSelection: false,
  });
  assert.deepEqual(pageSettings({
    ...BASE,
    scrollPreviewWithEditor: false,
    scrollEditorWithPreview: false,
    markEditorSelection: true,
  }), {
    scrollPreviewWithEditor: false,
    scrollEditorWithPreview: false,
    markEditorSelection: true,
  });
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-022
test("the sticky heading depth is rounded and clamped to 1..6, else 3", () => {
  assert.equal(stickyHeadingDepthOf(BASE), 3);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: 0 }), 1);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: 4.6 }), 5);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: 12 }), 6);
  assert.equal(stickyHeadingDepthOf({ ...BASE, stickyHeadingDepth: Number.NaN }), 3);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-039
// @tests_req SwRS-MDOKFSTUDIO-CODE-040
test("the code block settings reach the stylesheet as attributes of the root element, on by default", () => {
  const read = (context: PreviewRuntimeContext): Record<string, string> => {
    const attributes: Record<string, string> = {};
    applyCodeBlockSettings({ setAttribute: (name: string, value: string) => { attributes[name] = value; } } as unknown as Element, context);
    return attributes;
  };
  assert.deepEqual(read(BASE), { "data-okf-code-dark-background": "true", "data-okf-code-line-numbers": "true" });
  assert.deepEqual(
    read({ ...BASE, "codeBlocks.darkBackground": false, "codeBlocks.lineNumbers": false }),
    { "data-okf-code-dark-background": "false", "data-okf-code-line-numbers": "false" },
  );
  assert.deepEqual(
    read({ ...BASE, "codeBlocks.lineNumbers": false }),
    { "data-okf-code-dark-background": "true", "data-okf-code-line-numbers": "false" },
  );
});
