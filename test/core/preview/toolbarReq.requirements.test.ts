/**
 * Requirement tests of the toolbar-navigation scope on pure modules: the stylesheet rule of the
 * marked block, the titles and tooltips of the toolbar markup, the place of the toolbar and the
 * first state of the Anchor button.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { renderPreviewToolbar } from "../../../src/core/preview/previewToolbar";

/** The opening tag of every button of the toolbar markup, in document order. */
function buttonTags(): string[] {
  return [...renderPreviewToolbar().matchAll(/<button\b[^>]*>/gu)].map((match) => match[0]);
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`, "u").exec(tag)?.[1];
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001
test("every one of the 16 toolbar buttons has a data-tooltip equal to its title", () => {
  const tags = buttonTags();
  assert.equal(tags.length, 16);
  for (const tag of tags) {
    const title = attribute(tag, "title");
    assert.ok(title, `a title on ${tag}`);
    assert.equal(attribute(tag, "data-tooltip"), title, `the tooltip of ${tag}`);
  }
  // The aria-label may differ from the title; the tooltip still follows the title.
  const theme = tags.find((tag) => tag.includes("data-sphinx-preview-theme-toggle"))!;
  assert.equal(attribute(theme, "aria-label"), "Preview theme: Current theme");
  assert.notEqual(attribute(theme, "title"), attribute(theme, "aria-label"));
  const edit = tags.find((tag) => tag.includes("data-sphinx-preview-edit-toggle"))!;
  assert.equal(attribute(edit, "aria-label"), "Toggle edit mode");
  assert.equal(attribute(edit, "data-tooltip"), "Edit mode");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001
test("the tooltip shown on keyboard focus is the same box as on hover, and the toolbar sits 12 px from the top and 14 px from the end", () => {
  // One rule shows the tooltip for hover and for keyboard focus: same content and same colours.
  const shared = [...PREVIEW_THEME_CSS.matchAll(
    /\[data-sphinx-preview-toolbar\] button\[data-tooltip\]:hover::after,\s*\[data-sphinx-preview-toolbar\] button\[data-tooltip\]:focus-visible::after[^{]*\{([^}]*)\}/gu,
  )].map((match) => match[1]);
  const shown = shared.find((body) => body.includes("visibility: visible;"));
  assert.ok(shown, "the hover and focus-visible selectors share the rule that shows the tooltip");
  assert.match(shown, /opacity: 1;/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar\] button\[data-tooltip\]:focus-visible::after\s*\{[^}]*(color|background)/u,
    "no colour of its own for the focus case");
  const box = /\[data-sphinx-preview-toolbar\] \{([^}]*)\}/u.exec(PREVIEW_THEME_CSS);
  assert.ok(box, "the toolbar rule exists");
  assert.match(box[1], /position: fixed;\s*inset-block-start: 12px;\s*inset-inline-end: 14px;\s*z-index: 1100;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-120
test("the Anchor button starts in the off mode, not pressed, before the page script runs", () => {
  const anchor = buttonTags().find((tag) => tag.includes("data-sphinx-preview-anchor"));
  assert.ok(anchor, "the Anchor button is in the markup");
  assert.equal(attribute(anchor, "data-anchor-mode"), "off");
  assert.equal(attribute(anchor, "aria-pressed"), "false");
  assert.equal(attribute(anchor, "title"), "Anchor preview to text editor");
  assert.doesNotMatch(anchor, /\sdisabled\b/u, "the pairing, not the markup, disables it");
});

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
