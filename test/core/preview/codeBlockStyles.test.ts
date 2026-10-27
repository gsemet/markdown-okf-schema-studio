/**
 * The stylesheet contract of code blocks (CR 131): the Dark+ background and token colours, the
 * line numbers as generated content, the settings as attributes of the root element, and the
 * colour contrast of every token class.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  contrastRatio,
  DARK_CODE_SURFACE,
  DARK_LINE_NUMBER_COLOR,
  darkPaletteColors,
  lightPaletteColors,
  MINIMUM_CONTRAST,
} from "../../../src/core/render/codeTheme";
import { highlightCodeBlocks } from "../../../src/core/render/highlight";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

const CONTENT = "#sphinx-myst-preview-content";

// @tests_req SwRS-MDOKFSTUDIO-CODE-040
test("code blocks are Dark+ editor surfaces unless the dark background setting is off", () => {
  const rule = new RegExp(
    String.raw`html:not\(\[data-okf-code-dark-background="false"\]\) ${CONTENT} pre:has\(> code\)\s*\{([^}]*)\}`,
    "u",
  ).exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.match(rule, new RegExp(`background: ${DARK_CODE_SURFACE.background};`, "u"));
  assert.match(rule, new RegExp(`color: ${DARK_CODE_SURFACE.foreground};`, "u"));
  // Inline code keeps its own look: the dark rules never name a bare `code` element.
  assert.doesNotMatch(PREVIEW_THEME_CSS, /data-okf-code-dark-background[^{]*:not\(pre\) > code/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-040
test("with the dark background off the Light+ colours apply in the light themes and light VS Code themes", () => {
  const light = PREVIEW_THEME_CSS.match(/html\[data-okf-code-dark-background="false"\][^{]*\.sl-[0-9a-f]{6}[^{]*\{[^}]*\}/gu) ?? [];
  assert.ok(light.length > 10, "the light palette has rules");
  assert.match(light[0]!, /\[data-sphinx-preview-theme-mode="cream"\]/u);
  assert.match(light[0]!, /\[data-sphinx-preview-theme-mode="white"\]/u);
  assert.match(light[0]!, /vscode-light/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /pre > code\.language-yaml/u, "no per-language override flattens the tokens");
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-039
test("line numbers are generated content gated by the setting, and MyST options are not gated", () => {
  const numbered = PREVIEW_THEME_CSS.match(/[^{}]*\.myst-code-line::before\s*\{[^}]*content: attr\(data-line-number\);[^}]*\}/u)?.[0] ?? "";
  assert.match(numbered, /user-select: none;/u, "the number cannot be selected");
  assert.match(
    numbered,
    /html:not\(\[data-okf-code-line-numbers="false"\]\) #sphinx-myst-preview-content code\[data-myst-auto-numbers="true"\] \.myst-code-line::before/u,
    "an automatic number follows the setting",
  );
  assert.match(
    numbered,
    /(^|[,\s])#sphinx-myst-preview-content code\[data-myst-line-numbers="true"\] \.myst-code-line::before/u,
    "a :linenos: block is numbered whatever the setting says",
  );
  assert.doesNotMatch(
    numbered.split("{")[0]!.split(",").filter((selector) => selector.includes('data-myst-line-numbers')).join(","),
    /data-okf-code-line-numbers/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("every token class the highlighter writes has a colour rule", () => {
  const sources = [
    'def f(x):\n    return "a" + str(1)  # note\n',
    "const a: Map<string, number> = new Map(); // x\n",
    "key: [1, 2]\n# c\nlist:\n  - a: true\n",
    "#!/bin/bash\nset -e\necho \"$HOME\" | grep -v x\n",
    "# Title\n\n> quote\n\n- **bold** `code`\n",
    "SELECT a, COUNT(*) FROM t WHERE b = 'x' GROUP BY a;\n",
    '[tool.x]\nname = "y"\nn = 3\n',
    "-removed\n+added\n@@ -1 +1 @@\n",
    "<div class=\"a\"><!-- c --></div>\n",
  ];
  const languages = ["python", "typescript", "yaml", "bash", "markdown", "sql", "toml", "diff", "html"];
  const used = new Set<string>();
  sources.forEach((source, index) => {
    const html = highlightCodeBlocks(`<pre><code class="language-${languages[index]}">${source.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code></pre>`);
    for (const match of html.matchAll(/\bs[dl]-[0-9a-f]{6}\b/gu)) used.add(match[0]);
  });
  assert.ok(used.size > 10, "the samples use many colours");
  for (const className of used) {
    assert.match(PREVIEW_THEME_CSS, new RegExp(String.raw`\.${className}\s*\{ color: #[0-9a-f]{6}; \}`, "u"), className);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-040
test("code text and line numbers keep WCAG AA contrast on the dark background; light tokens on the cream page", () => {
  for (const color of [...darkPaletteColors(), DARK_CODE_SURFACE.foreground, DARK_LINE_NUMBER_COLOR]) {
    assert.ok(
      contrastRatio(color, DARK_CODE_SURFACE.background) >= MINIMUM_CONTRAST,
      `${color} on ${DARK_CODE_SURFACE.background} is ${contrastRatio(color, DARK_CODE_SURFACE.background).toFixed(2)}:1`,
    );
  }
  for (const color of lightPaletteColors()) {
    for (const background of ["#ede6da", "#f0f0f0", "#ffffff"]) {
      assert.ok(contrastRatio(color, background) >= MINIMUM_CONTRAST, `${color} on ${background}`);
    }
  }
  assert.ok(contrastRatio("#ffffff", "#000000") > 20.9, "the ratio of black on white is 21:1");
});
