import assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-220
test("CR 463: the change bar tooltip shows on the bar only, in the tooltip look, never in edit mode or with the bars hidden", () => {
  const css = PREVIEW_THEME_CSS;
  // Only a bar takes the pointer (the layer and the block do not), and only the bar's own hover shows the bubble.
  assert.match(css, /\[data-sphinx-preview-change-layer\] > span\[data-tooltip\] \{[^}]*pointer-events: auto;/u);
  assert.match(css, /\[data-sphinx-preview-change-layer\] > span\[data-tooltip\]::after \{[^}]*content: attr\(data-tooltip\);[^}]*font-size: 11px;[^}]*white-space: nowrap;[^}]*visibility: hidden;[^}]*pointer-events: none;/u);
  assert.match(css, /\[data-sphinx-preview-change-layer\] > span\[data-tooltip\]:hover::after \{[^}]*visibility: visible;[^}]*animation: sphinx-preview-tooltip-in/u);
  assert.match(css, /--studio-editorHoverWidget-background/u);
  // Edit mode takes the pointer from the bars and hides the bubble; the Diff toggle off hides the whole layer.
  assert.match(css, /edit-mode="on"\] \[data-sphinx-preview-change-layer\] > span \{\s*pointer-events: none;/u);
  assert.match(css, /edit-mode="on"\] \[data-sphinx-preview-change-layer\] > span::after \{\s*display: none;/u);
  assert.match(css, /data-sphinx-preview-incoming="off"\] \[data-sphinx-preview-change-layer\] \{\s*display: none;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-221
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-222
test("CR 463: the removed-lines marker is a red triangle in the diff's removed colour, the bubble sits above the bar, and a bar is clickable", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /\[data-sphinx-preview-change-layer\] > span\[data-removed\] \{[^}]*background: transparent;/u);
  assert.match(css, /span\[data-removed\]::before \{[^}]*background: var\(--studio-errorForeground, #f14c4c\);[^}]*clip-path: polygon/u);
  // The bubble goes above the bar so that it never covers the first line of the block.
  assert.match(css, /span\[data-tooltip\]::after \{[^}]*inset-block-end: calc\(100% \+ 4px\);[^}]*inset-inline-start: 0;/u);
  assert.doesNotMatch(css, /span\[data-tooltip\]::after \{[^}]*inset-block-start/u);
  // The removed marker's bubble sits beside it, centred on the gap between two blocks, never over a line of text.
  assert.match(css, /span\[data-removed\]::after \{[^}]*inset-block-start: 50%;[^}]*inset-block-end: auto;[^}]*inset-inline-start: calc\(100% \+ 6px\);/u);
  assert.match(css, /span\[data-tooltip\] \{\s*cursor: pointer;\s*pointer-events: auto;/u);
  // The single card shows while the page's side-by-side attribute is off.
  assert.match(css, /\[data-okf-sbs-card\]:not\(\[data-okf-sbs-single\]\)/u);
});
