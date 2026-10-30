import assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

const ROOT = "#sphinx-myst-preview-content";

function rule(selector: string): string {
  const start = PREVIEW_THEME_CSS.indexOf(`${selector} {`);
  assert.ok(start >= 0, `expected the rule ${selector} in the preview theme`);
  return PREVIEW_THEME_CSS.slice(start, PREVIEW_THEME_CSS.indexOf("}", start));
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-257
test("a grid row with an open block editor lets its tracks grow to the minimum width of the card being edited", () => {
  assert.match(rule(`${ROOT} .myst-grid-row:has(.myst-grid-item .sphinx-preview-block-editor)`), /--myst-grid-track-min: auto;/u);
  assert.match(rule(`${ROOT} .myst-grid-item:has(.sphinx-preview-block-editor)`), /min-width: 24em;/u);
  // The fixed column rules read the track minimum, which is 0 outside an edit.
  assert.match(PREVIEW_THEME_CSS, /\.myst-grid-row\.myst-grid-md-3 \{\s*grid-template-columns: repeat\(3, minmax\(var\(--myst-grid-track-min, 0px\), 1fr\)\);/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-257
test("the card being edited is not clipped, so the palette may leave it", () => {
  assert.match(rule(`${ROOT} .myst-grid-card:has(.sphinx-preview-block-editor-host)`), /overflow: visible;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-257
test("in a card the palette stays in the flow above the text box with a maximum height and a vertical scroll", () => {
  const bar = rule(`${ROOT} .myst-grid-card .sphinx-preview-block-editor-host > .sphinx-preview-edit-palette`);
  assert.match(bar, /position: relative;/u);
  assert.match(bar, /max-height: min\(9em, 30vh\);/u);
  assert.match(bar, /max-width: min\(100cqw, calc\(100% \+ 4em\)\);/u);
  assert.match(
    rule(`${ROOT} .myst-grid-card .sphinx-preview-block-editor-host > .sphinx-preview-edit-palette:not(:has(> .sphinx-preview-edit-palette-menu))`),
    /overflow-y: auto;/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-257
test("the text box of a block editor in a card keeps a readable minimum width", () => {
  assert.match(rule(`${ROOT} .myst-grid-card .sphinx-preview-block-editor`), /min-width: min\(100%, 18em\);/u);
});
