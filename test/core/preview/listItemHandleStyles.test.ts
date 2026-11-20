import assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

/**
 * The shipped rules of the list item handles (SwRS-MDOKFSTUDIO-BLOCK-262), read from the preview
 * theme stylesheet the page loads.
 */

/** The rules of the shipped stylesheet whose selector names a list item handle attribute. */
function listHandleRules(): Array<{ selector: string; body: string }> {
  return Array.from(PREVIEW_THEME_CSS.matchAll(/([^{}]+)\{([^}]*)\}/gu))
    .map((match) => ({ selector: match[1]!.replace(/\/\*[\s\S]*?\*\//gu, "").trim(), body: match[2]! }))
    .filter(({ selector }) => /data-okf-list-(?:handle-layer|shift|item-dragging|item-drop)|okf-list-item-handle/u
      .test(selector));
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("every list item handle rule is scoped to edit mode", () => {
  const rules = listHandleRules();
  assert.ok(rules.length >= 7, `the handle rules ship (${rules.length} found)`);
  for (const { selector } of rules) {
    assert.ok(selector.startsWith('html[data-sphinx-preview-edit-mode="on"] '), `scoped to edit mode: ${selector}`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("the list handle layer sits at the page origin and each handle ends left of its column, on its line", () => {
  const rules = listHandleRules();
  const body = (pattern: RegExp): string => rules.find(({ selector }) => pattern.test(selector))?.body ?? "";
  assert.match(body(/\[data-okf-list-handle-layer\]$/u), /position: absolute;[^}]*inset: 0 auto auto 0;[^}]*z-index: 2;/u);
  assert.match(body(/\.okf-list-item-handle$/u), /position: absolute;[^}]*transform: translate\(-100%, -50%\);/u);
  assert.match(body(/\.okf-list-item-handle::before$/u), /transform: translate\(-2\.5px, -5px\);/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a block with no room on its left is pushed right by a handle's width, without a max-content width", () => {
  const push = listHandleRules().find(({ selector }) => selector.endsWith('[data-okf-list-shift="true"]'));
  assert.ok(push, "the push rule ships");
  assert.match(push.body, /margin-inline-start: 2\.2em;/u);
  assert.match(push.body, /max-width: calc\(100% - 2\.2em\);/u);
  assert.doesNotMatch(push.body, /max-content/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("the dragged item is dimmed and the drop lines use the theme focus colour", () => {
  const rules = listHandleRules();
  const body = (pattern: RegExp): string => rules.find(({ selector }) => pattern.test(selector))?.body ?? "";
  assert.match(body(/li\[data-okf-list-item-dragging="true"\]$/u), /opacity: 0\.45;/u);
  assert.match(body(/li\[data-okf-list-item-drop="before"\]$/u),
    /box-shadow: inset 0 2px 0 var\(--studio-focusBorder, Highlight\);/u);
  assert.match(body(/li\[data-okf-list-item-drop="after"\]$/u),
    /box-shadow: inset 0 -2px 0 var\(--studio-focusBorder, Highlight\);/u);
});
