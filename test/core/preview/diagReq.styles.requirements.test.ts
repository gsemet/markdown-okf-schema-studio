/**
 * Requirement tests of the stylesheet rules of the PlantUML figures (`contentBlockStyles.ts`,
 * part of `PREVIEW_THEME_CSS`): the error style, the source disclosure and the picture size.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

/** The declaration block of the rule whose selector is exactly `selector`. */
function ruleOf(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*(?:\\/\\*[^*]*\\*\\/\\s*)?${escaped}\\s*\\{([^}]*)\\}`, "u").exec(PREVIEW_THEME_CSS);
  assert.ok(match, `a rule for ${selector}`);
  return match[1]!;
}

const CONTENT = "#sphinx-myst-preview-content";

// @tests_req SwRS-MDOKFSTUDIO-DIAG-032
test("a PlantUML message uses the theme error colour with a red fallback, in italics", () => {
  const rule = ruleOf(`${CONTENT} .myst-plantuml-error`);
  assert.match(rule, /color: var\(--studio-errorForeground, #f14c4c\);/u);
  assert.match(rule, /font-style: italic;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-023
test("the PlantUML source disclosure has the rules of the Mermaid one", () => {
  const summary = ruleOf(`${CONTENT} .myst-plantuml-source summary`);
  assert.match(summary, /color: var\(--studio-descriptionForeground, inherit\);/u);
  assert.match(summary, /cursor: pointer;/u);
  assert.match(summary, /font-size: 0\.9em;/u);
  assert.match(ruleOf(`${CONTENT} details.myst-plantuml-source`), /margin-top: 0\.75em;/u);

  assert.equal(summary, ruleOf(`${CONTENT} .myst-mermaid-source summary`));
  assert.equal(
    ruleOf(`${CONTENT} details.myst-plantuml-source`),
    ruleOf(`${CONTENT} details.myst-mermaid-source`),
  );
});

test("a PlantUML picture is a block centred with automatic inline margins", () => {
  const rule = ruleOf(`${CONTENT} .myst-plantuml-image`);
  assert.match(rule, /display: block;/u);
  assert.match(rule, /margin-inline: auto;/u);
});

test("a PlantUML picture is scaled down to the column and never set to a fixed width", () => {
  const rule = ruleOf(`${CONTENT} .myst-plantuml-image`);
  assert.match(rule, /max-width: 100%;/u);
  assert.match(rule, /height: auto;/u);
  assert.doesNotMatch(rule, /(?:^|[\s;])width:/u, "a narrow picture keeps its natural size");
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-025
test("the sticky heading band takes the page colours of the forced mode", () => {
  const band = ruleOf("[data-sphinx-preview-sticky-headings]");
  assert.match(band, /background: var\(--studio-editor-background, Canvas\);/u);
  assert.match(band, /color: var\(--studio-editor-foreground, CanvasText\);/u);

  const mode = (name: string): string => {
    const match = new RegExp(
      `html\\[data-sphinx-preview-theme-mode="${name}"\\],\\s*html\\[data-sphinx-preview-theme-mode="${name}"\\] body\\s*\\{([^}]*)\\}`,
      "u",
    ).exec(PREVIEW_THEME_CSS);
    assert.ok(match, `the ${name} mode overrides the tokens`);
    return match[1]!;
  };
  assert.match(mode("white"), /--studio-editor-background: #ffffff;/u);
  assert.match(mode("white"), /--studio-editor-foreground: #1f1f1f;/u);
  assert.match(mode("dark"), /--studio-editor-background: #1e1e1e;/u, "rgb(30, 30, 30)");
  assert.match(mode("dark"), /--studio-editor-foreground: #d4d4d4;/u);
  assert.match(mode("cream"), /--studio-editor-background: #f5f1e8;/u);
});
