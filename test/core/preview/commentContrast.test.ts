import * as assert from "node:assert/strict";
import { test } from "node:test";

import { COMMENT_CSS } from "../../../src/core/preview/styles/commentStyles";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

type Palette = Record<string, string>;

function palette(mode: string): Palette {
  const pattern = new RegExp(`html\\[data-sphinx-preview-theme-mode="${mode}"\\] body\\s*\\{([^}]*)\\}`, "u");
  const block = pattern.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  const variables: Palette = {};
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/gu)) variables[match[1]] = match[2].trim();
  for (const [name, value] of Object.entries(variables)) {
    const reference = /^var\((--[\w-]+)\)$/u.exec(value);
    if (reference) variables[name] = variables[reference[1]];
  }
  return variables;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// The text colors a comment thread uses (popover, inline thread, reply box, orphans box) and the
// surfaces they sit on.
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["--studio-editorWidget-foreground", "--studio-editorWidget-background"],
  ["--studio-descriptionForeground", "--studio-editorWidget-background"],
  ["--studio-editor-foreground", "--studio-textBlockQuote-background"],
  ["--studio-descriptionForeground", "--studio-textBlockQuote-background"],
  ["--studio-editor-foreground", "--studio-editor-background"],
  ["--studio-descriptionForeground", "--studio-editor-background"],
  ["--studio-input-foreground", "--studio-input-background"],
  ["--studio-descriptionForeground", "--studio-input-background"],
  ["--studio-button-foreground", "--studio-button-background"],
  ["--studio-button-secondaryForeground", "--studio-button-secondaryBackground"],
  ["--studio-charts-green", "--studio-editor-background"],
];

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-002
test("comment thread text reaches WCAG AA 4.5:1 on its surface in every theme mode", () => {
  for (const mode of ["dark", "white", "cream"]) {
    const colors = palette(mode);
    for (const [foreground, background] of PAIRS) {
      assert.ok(colors[foreground] && colors[background], `${mode}: ${foreground} / ${background} must be defined`);
      const ratio = contrast(colors[foreground], colors[background]);
      assert.ok(ratio >= 4.5, `${mode}: ${foreground} ${colors[foreground]} on ${background} ${colors[background]} is ${ratio.toFixed(2)}:1`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-002
test("the comment popover and boxes never dim their text with opacity", () => {
  const rules = COMMENT_CSS.split("}").filter((rule) =>
    /okf-comment-popover|okf-comment-compose|okf-orphans|okf-thread-/u.test(rule) && /opacity/u.test(rule));
  const dimmed = rules.filter((rule) => !/:disabled|\[disabled\]|::placeholder|\[data-okf-comment-badge\]/u.test(rule));
  assert.deepEqual(dimmed.map((rule) => rule.trim().split("{")[0].trim()), []);
  assert.match(COMMENT_CSS, /\[data-okf-comment-popover\] \[data-okf-comment-head\] span \{\s*color: var\(--studio-descriptionForeground/u);
});
