import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../src/preview/previewStyles";

function rule(selectorPattern: string): string {
  const match = new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`, "u").exec(PREVIEW_THEME_CSS);
  assert.ok(match, `no rule for ${selectorPattern}`);
  return match[1];
}

const INLINE_CODE = rule(String.raw`#sphinx-myst-preview-content :not\(pre\) > code`);

test("inline code is a subtle tinted pill derived from the text colour", () => {
  assert.match(INLINE_CODE, /background: color-mix\(in srgb, currentColor (\d+)%, transparent\)/u);
  const tint = Number(/background: color-mix\(in srgb, currentColor (\d+)%/u.exec(INLINE_CODE)?.[1]);
  assert.ok(tint >= 6 && tint <= 12, `tint ${tint}% is not subtle`);
  assert.match(INLINE_CODE, /border: 1px solid color-mix\(in srgb, currentColor \d+%, transparent\)/u);
  const radius = Number(/border-radius: (\d+)px/u.exec(INLINE_CODE)?.[1]);
  assert.ok(radius >= 3 && radius <= 6, `radius ${radius}px`);
  assert.match(INLINE_CODE, /padding: 0\.1em 0\.35em/u);
  assert.doesNotMatch(INLINE_CODE, /textCodeBlock-background/u);
});

test("inline code scales with its context and wraps without growing the line", () => {
  assert.match(INLINE_CODE, /font-size: 0\.875em/u);
  assert.match(INLINE_CODE, /box-decoration-break: clone/u);
  assert.match(INLINE_CODE, /overflow-wrap: break-word/u);
  assert.doesNotMatch(INLINE_CODE, /overflow-wrap: anywhere/u);
  assert.doesNotMatch(INLINE_CODE, /line-height|word-break/u);
  assert.doesNotMatch(INLINE_CODE, /font-size: \d+(\.\d+)?px/u);
});

test("inline code stays compact in table cells", () => {
  const cell = rule(String.raw`#sphinx-myst-preview-content :is\(td, th\) > code`);
  assert.match(cell, /padding: 0\.05em 0\.3em/u);
});

// ---- contrast of code text on its tinted background, per preview mode ----

function channels(hex: string): number[] {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function luminance(rgb: number[]): number {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: number[], second: number[]): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function modeVariables(mode: string): Record<string, string> {
  const pattern = new RegExp(`html\\[data-sphinx-preview-theme-mode="${mode}"\\] body\\s*\\{([^}]*)\\}`, "u");
  const block = pattern.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/gu)].map((m) => [m[1], m[2].trim()]));
}

test("inline code text keeps 4.5:1 on the tinted background in every forced mode", () => {
  const tint = Number(/background: color-mix\(in srgb, currentColor (\d+)%/u.exec(INLINE_CODE)?.[1]) / 100;
  const linkCoded = /theme-mode="cream"\] #sphinx-myst-preview-content :not\(pre\) > code,\s*html\[data-sphinx-preview-theme-mode="white"\][^{]*\{\s*color: var\(--studio-textLink-foreground/u;
  assert.match(PREVIEW_THEME_CSS, linkCoded);
  for (const [mode, usesLinkColour] of [["dark", false], ["white", true], ["cream", true]] as const) {
    const variables = modeVariables(mode);
    const page = channels(variables["--studio-editor-background"]);
    const text = channels(variables[usesLinkColour ? "--studio-textLink-foreground" : "--studio-editor-foreground"]);
    const tinted = page.map((channel, index) => channel * (1 - tint) + text[index] * tint);
    const ratio = contrast(text, tinted);
    assert.ok(ratio >= 4.5, `${mode}: ${ratio.toFixed(2)}:1`);
  }
});
