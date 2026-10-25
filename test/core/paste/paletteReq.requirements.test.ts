/**
 * Requirement tests of the rich text conversion and of the slash menu styles: what the pasted
 * HTML keeps of elements the converter does not know, and the forced-colours drawing of the menu.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { htmlToMarkdown } from "../../../src/core/paste/htmlToMarkdown";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-217
test("elements that are not converted contribute their text only; converted ones keep their conversion", () => {
  assert.equal(
    htmlToMarkdown("<div>First <span>part</span></div><section>Second part</section>"),
    "First part\n\nSecond part",
  );
  assert.equal(
    htmlToMarkdown("<div><span>Before</span><h2>Title</h2><span>After</span></div>"),
    "Before\n\n## Title\n\nAfter",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-252
test("in forced-colours mode the slash menu uses Canvas and the lit command Highlight", () => {
  const forced = /@media \(forced-colors: active\) \{[\s\S]*?\.sphinx-preview-slash-menu \{([^}]*)\}\s*\.sphinx-preview-slash-option\[data-active="true"\] \{([^}]*)\}\s*\.sphinx-preview-slash-option\[data-active="true"\] \.sphinx-preview-slash-category,\s*\.sphinx-preview-slash-option\[data-active="true"\] \.sphinx-preview-slash-shortcut \{([^}]*)\}/u
    .exec(PREVIEW_THEME_CSS);
  assert.ok(forced, "the forced-colours block of the slash menu exists");
  const [, menu, lit, secondary] = forced;
  assert.match(menu, /background: Canvas;/u);
  assert.match(menu, /color: CanvasText;/u);
  assert.match(lit, /background: Highlight;/u);
  assert.match(lit, /color: HighlightText;/u);
  assert.match(secondary, /color: HighlightText;/u);
});
