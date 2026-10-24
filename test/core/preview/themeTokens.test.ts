import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import {
  STUDIO_TOKEN_PREFIX,
  THEME_TOKEN_NAMES,
  VSCODE_THEME_TOKEN_CSS,
  VSCODE_VARIABLE_PREFIX,
  studioToken,
} from "../../../src/core/preview/themeTokens";

test("every theme token maps to the VS Code variable of the same name, on the root and on body", () => {
  assert.match(VSCODE_THEME_TOKEN_CSS, /^\s*:root,\s*body\s*\{/u);
  for (const name of THEME_TOKEN_NAMES) {
    assert.ok(
      VSCODE_THEME_TOKEN_CSS.includes(`${studioToken(name)}: var(${VSCODE_VARIABLE_PREFIX}${name});`),
      `expected ${studioToken(name)} to map to ${VSCODE_VARIABLE_PREFIX}${name}`,
    );
  }
  assert.equal(new Set(THEME_TOKEN_NAMES).size, THEME_TOKEN_NAMES.length);
});

test("the page stylesheet reads VS Code variables only through the token map", () => {
  const stylesheet = `${PREVIEW_ACCESSIBILITY_CSS}${PREVIEW_THEME_CSS}`;
  assert.ok(PREVIEW_ACCESSIBILITY_CSS.startsWith(VSCODE_THEME_TOKEN_CSS));
  const outsideMap = stylesheet.replace(VSCODE_THEME_TOKEN_CSS, "");
  assert.doesNotMatch(outsideMap, /--vscode-/u);
});

/** The tokens the Mermaid theme reads from the page (src/page/modules/mermaidPreview.ts). */
const MERMAID_THEME_TOKENS = ["textCodeBlock-background", "editor-foreground", "textBlockQuote-background", "editor-background"];

test("every token the stylesheet or the Mermaid theme reads is in the token map", () => {
  const used = new Set([...`${PREVIEW_ACCESSIBILITY_CSS}${PREVIEW_THEME_CSS}`.matchAll(/--studio-([\w-]+)/gu)].map((match) => match[1]));
  const known = new Set<string>(THEME_TOKEN_NAMES);
  for (const name of [...used, ...MERMAID_THEME_TOKENS]) {
    assert.ok(known.has(name), `${STUDIO_TOKEN_PREFIX}${name} is not mapped`);
  }
});

test("the forced theme modes set the neutral tokens, not the VS Code variables", () => {
  for (const mode of ["dark", "white", "cream"]) {
    const pattern = new RegExp(`html\\[data-sphinx-preview-theme-mode="${mode}"\\]\\s*,\\s*html\\[data-sphinx-preview-theme-mode="${mode}"\\] body\\s*\\{([^}]*)\\}`, "u");
    const block = pattern.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
    assert.match(block, /--studio-editor-background: #[0-9a-f]{6};/u, mode);
    assert.doesNotMatch(block, /--vscode-/u, mode);
  }
});
