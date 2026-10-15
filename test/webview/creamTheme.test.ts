import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../src/preview/previewStyles";
import { renderPreviewToolbar } from "../../src/preview/previewToolbar";
import { isPreviewThemeMode } from "../../src/state/previewTheme";

const CREAM_BLOCK = /html\[data-sphinx-preview-theme-mode="cream"\]\s*,\s*html\[data-sphinx-preview-theme-mode="cream"\] body\s*\{([^}]*)\}/u;

function creamVariables(): Record<string, string> {
  const block = CREAM_BLOCK.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  const variables: Record<string, string> = {};
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/gu)) {
    variables[match[1]] = match[2].trim();
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

test("cream is an accepted preview theme mode with its own coffee toolbar icon", () => {
  assert.equal(isPreviewThemeMode("cream"), true);
  assert.equal(isPreviewThemeMode("sepia"), false);
  assert.match(renderPreviewToolbar(), /data-theme-icon="cream"/u);
  assert.match(renderPreviewToolbar(), /M8 6c0-1\.2 1-1\.2 1-2\.5/u);
  assert.match(PREVIEW_THEME_CSS, /data-theme-mode="cream"\] \[data-theme-icon="cream"\]/u);
});

test("cream defines a light warm palette for every variable white mode overrides", () => {
  const cream = creamVariables();
  const white = /html\[data-sphinx-preview-theme-mode="white"\] body\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  const whiteNames = [...white.matchAll(/(--[\w-]+):/gu)].map((match) => match[1]);
  assert.ok(whiteNames.length > 10);
  for (const name of whiteNames) {
    assert.ok(name in cream, `cream is missing ${name}`);
  }
  assert.match(PREVIEW_THEME_CSS, /html\[data-sphinx-preview-theme-mode="cream"\][^{]*\{[^}]*color-scheme: light;/u);
  const background = cream["--vscode-editor-background"];
  assert.match(background, /^#[0-9a-f]{6}$/iu);
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(background.slice(index, index + 2), 16));
  assert.ok(red > 0xe8 && red > green && green > blue, `${background} is not a warm light paper colour`);
});

test("cream text and background pairs meet WCAG AA 4.5:1", () => {
  const cream = creamVariables();
  const surfaces = [
    "--vscode-editor-background",
    "--vscode-textCodeBlock-background",
    "--vscode-textBlockQuote-background",
    "--vscode-editorHoverWidget-background",
    "--vscode-editorWidget-background",
    "--vscode-input-background",
  ];
  const texts = [
    "--vscode-editor-foreground",
    "--vscode-descriptionForeground",
    "--vscode-textLink-foreground",
    "--vscode-charts-blue",
    "--vscode-charts-green",
    "--vscode-charts-purple",
    "--vscode-charts-yellow",
    "--vscode-charts-red",
    "--vscode-charts-orange",
    "--vscode-errorForeground",
  ];
  for (const surface of surfaces) {
    for (const text of texts) {
      assert.ok(cream[surface] && cream[text], `${surface} / ${text} must be defined`);
      const ratio = contrast(cream[text], cream[surface]);
      assert.ok(ratio >= 4.5, `${text} ${cream[text]} on ${surface} ${cream[surface]} is ${ratio.toFixed(2)}:1`);
    }
  }
  for (const [foreground, background] of [
    ["--vscode-editorHoverWidget-foreground", "--vscode-editorHoverWidget-background"],
    ["--vscode-button-secondaryForeground", "--vscode-button-secondaryBackground"],
    ["--vscode-button-foreground", "--vscode-button-background"],
    ["--vscode-input-foreground", "--vscode-input-background"],
    ["--vscode-icon-foreground", "--vscode-editorWidget-background"],
  ]) {
    const ratio = contrast(cream[foreground], cream[background]);
    assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
  }
});

test("cream mirrors the white-mode code colouring", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="cream"\] #sphinx-myst-preview-content :not\(pre\) > code,\s*html\[data-sphinx-preview-theme-mode="white"\][^{]*\{\s*color: var\(--vscode-textLink-foreground/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="cream"\] #sphinx-myst-preview-content pre > code\.language-yaml,[\s\S]*?color: var\(--vscode-textLink-foreground/u,
  );
});

test("toolbar theme icons are well-formed sibling svgs, one per mode", () => {
  const toolbar = renderPreviewToolbar();
  assert.equal((toolbar.match(/<svg\b/gu) ?? []).length, (toolbar.match(/<\/svg>/gu) ?? []).length);
  const button = /<button[^>]*data-sphinx-preview-theme-toggle[^>]*>([\s\S]*?)<\/button>/u.exec(toolbar)?.[1] ?? "";
  const svgs = button.match(/<svg\b[\s\S]*?<\/svg>/gu) ?? [];
  assert.deepEqual(
    svgs.map((svg) => /data-theme-icon="(\w+)"/u.exec(svg)?.[1]),
    ["current", "dark", "white", "cream"],
  );
  for (const svg of svgs) {
    assert.equal((svg.match(/<svg\b/gu) ?? []).length, 1, "an svg must not contain another svg");
  }
  assert.equal(button.replace(/<svg\b[\s\S]*?<\/svg>/gu, ""), "");
});
