/**
 * Requirement tests of the page style for the width and zoom requirements: the width rule, the
 * centring rules of narrow tables and figures, the zoom scope, and the host theme palette.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS, previewContentWidthCss } from "../../../src/core/preview/previewStyles";

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-002#S4
test("the width rule is a whole number of pixels, a negative value gives the default and only 0 lifts the limit", () => {
  assert.equal(previewContentWidthCss(1049.6), ":root { --sphinx-preview-content-max-width: 1050px; }");
  assert.equal(previewContentWidthCss(-1), ":root { --sphinx-preview-content-max-width: 960px; }");
  assert.equal(previewContentWidthCss(1), ":root { --sphinx-preview-content-max-width: 1px; }");
  assert.equal(previewContentWidthCss(2400), ":root { --sphinx-preview-content-max-width: 2400px; }");
  assert.equal(previewContentWidthCss(2500), ":root { --sphinx-preview-content-max-width: 2400px; }");
  assert.equal(previewContentWidthCss(Number.NaN), ":root { --sphinx-preview-content-max-width: 960px; }");
  assert.equal(previewContentWidthCss(0), ":root { --sphinx-preview-content-max-width: none; }");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-022#S3
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-022#S4
test("a table is centred through automatic inline margins and a figure paragraph is centred, in every width mode", () => {
  assert.match(PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content > table,\s*#sphinx-myst-preview-content > \.table-wrapper\s*\{\s*margin-inline: auto;/u);
  assert.match(PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content > p\[data-sphinx-preview-figure\]\s*\{\s*text-align: center;/u);
  // No width-mode rule overrides the centring of a table that stays in the column.
  assert.doesNotMatch(PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-width="(?:margin|full)"\] #sphinx-myst-preview-content > table\s*\{[^}]*margin-inline/u);
});

/** The selectors of the rule blocks of the page style that read the zoom variables. */
function zoomRuleSelectors(): string[] {
  const selectors: string[] = [];
  for (const chunk of PREVIEW_THEME_CSS.split("}")) {
    const open = chunk.lastIndexOf("{");
    if (open < 0) continue;
    if (!/--sphinx-preview-zoom(?:ed-font-size)?\b/u.test(chunk.slice(open + 1))) continue;
    selectors.push(chunk.slice(0, open).split(/\n/u).pop()!.trim());
  }
  return selectors;
}

// @tests_req SwRS-MDOKFSTUDIO-THEME-043#S2
test("the toolbar does not scale with the zoom: no toolbar rule reads the zoom variables", () => {
  const selectors = zoomRuleSelectors();
  assert.ok(selectors.length > 0, "the zoom is used by some rules");
  for (const selector of selectors) {
    assert.doesNotMatch(selector, /toolbar/u, `the rule "${selector}" scales a toolbar part with the zoom`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-016#S2
// @tests_req SwRS-MDOKFSTUDIO-THEME-016#S3
test("no rule of the page palette is keyed to a host theme kind, so the host variables rule in high contrast too", () => {
  assert.doesNotMatch(PREVIEW_THEME_CSS, /data-sphinx-preview-theme="(?:[1-4]|default)"/u);
});
