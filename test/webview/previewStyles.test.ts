import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PREVIEW_ACCESSIBILITY_CSS,
  PREVIEW_THEME_CSS,
  previewContentWidthCss,
} from "../../src/preview/previewStyles";
import { renderPreviewToolbar } from "../../src/preview/previewToolbar";

test("frontmatter link tooltips wrap text in a fixed theme-aware pointer-transparent surface", () => {
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-link-tooltip\s*\{[^}]*position: fixed;[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;[^}]*pointer-events: none;/u);
  for (const variable of ["background", "foreground", "border"]) {
    assert.ok(PREVIEW_THEME_CSS.includes("--vscode-editorHoverWidget-" + variable));
  }
});

test("typography is driven by VS Code markdown preview variables", () => {
  for (const variable of [
    "--vscode-markdown-font-family",
    "--vscode-markdown-font-size",
    "--vscode-markdown-line-height",
  ]) {
    assert.ok(PREVIEW_THEME_CSS.includes(variable), `expected ${variable} in the preview theme`);
  }
});

test("scrollbar tracks and thumbs follow the preview theme", () => {
  assert.match(PREVIEW_THEME_CSS, /scrollbar-color: var\(--sphinx-preview-scrollbar-thumb\) var\(--vscode-editor-background, Canvas\);/u);
  assert.match(PREVIEW_THEME_CSS, /::-webkit-scrollbar-track,\s*::-webkit-scrollbar-corner \{\s*background: var\(--vscode-editor-background, Canvas\);/u);
  for (const mode of ["white", "dark"]) {
    assert.match(PREVIEW_THEME_CSS, new RegExp(`html\\[data-sphinx-preview-theme-mode="${mode}"\\] body \\{[^}]*--sphinx-preview-scrollbar-thumb: #[0-9a-f]+;`, "u"));
  }
});

test("linked file details are muted, italic, and clipped to the available line", () => {
  assert.match(PREVIEW_THEME_CSS, /\.okf-link-excerpt,\s*[^{}]*\.okf-link-line \{[^}]*color: var\(--vscode-descriptionForeground, GrayText\);[^}]*font-style: italic;/u);
  assert.match(PREVIEW_THEME_CSS, /\.okf-link-excerpt \{[^}]*width: 0;[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/u);
});

test("list insertion lines show the drop boundary without moving the rows", () => {
  assert.match(PREVIEW_THEME_CSS, /\.okf-list-editor-item \{[^}]*position: relative;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\.okf-list-editor-item\[data-okf-list-drop\]::after \{[^}]*position: absolute;[^}]*inset-inline: 0;[^}]*height: 2px;[^}]*background: var\(--vscode-focusBorder, Highlight\);[^}]*pointer-events: none;/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-list-drop="before"\]::after \{\s*top: -0\.1em;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-list-drop="after"\]::after \{\s*bottom: -0\.1em;/u);
});

test("the top heading keeps the stock preview rule underneath it", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content h1 \{[^}]*border-bottom: 1px solid/u,
  );
});

test("sticky headings align with content and emphasize text in a full-width band", () => {
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*position: fixed;/u);
  assert.match(PREVIEW_THEME_CSS, /html,\s*body\s*\{\s*overflow-anchor: none;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*width: 100%;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*font-size: calc\(var\(--sphinx-preview-font-size\) \+ 2px\);/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*font-weight: 700;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*white-space: pre-wrap;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*overflow-wrap: anywhere;/u);
  assert.doesNotMatch(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*min-height:/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*margin: 0;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*padding-block: 0 4px;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*border-radius: 0;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*border-bottom: 1px solid var\(--sphinx-preview-border\);/u,
  );
  assert.ok(
    PREVIEW_THEME_CSS.includes(
      "padding-inline: max(var(--sphinx-preview-content-gutter), calc((100% - var(--sphinx-preview-content-max-width)) / 2 + var(--sphinx-preview-content-gutter)));",
    ),
  );
  const headingBorder = PREVIEW_THEME_CSS.match(
    /#sphinx-myst-preview-content h1 \{[^}]*border-bottom: ([^;]+);/u,
  )?.[1];
  const stickyBorder = PREVIEW_THEME_CSS.match(
    /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*border-bottom: ([^;]+);/u,
  )?.[1];
  assert.ok(headingBorder);
  assert.equal(stickyBorder, headingBorder);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*box-shadow:/u);
});

test("sticky headings start at the viewport top without filler and leave horizontal room for controls", () => {
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]::before/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*inset-block-start: 0;[^}]*padding-inline-end: [^;]*var\(--sphinx-preview-toolbar-width, 0px\)/u,
  );
});

test("preview controls stack above the sticky heading band", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-toolbar\]\s*\{[^}]*z-index: 1100;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*z-index: 999;/u,
  );
});

test("the theme neutralises Shibuya page gutters", () => {
  assert.match(PREVIEW_THEME_CSS, /body :where\(\.sy-page, \.sy-container/u);
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-content-gutter: clamp\(16px, 8vw, 78px\);/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \{[^}]*max-width: var\(--sphinx-preview-content-max-width, 960px\);[^}]*margin-inline: auto;[^}]*padding: 0 var\(--sphinx-preview-content-gutter\) min\(80vh, max\(24px, calc\(100vh - var\(--sphinx-preview-reading-offset, 0px\) - 40px\)\)\);/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*inset-block-start: 0;/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /body::before\s*\{/u);
});

test("description header controls align right and restore only when collapsed", () => {
  assert.match(PREVIEW_THEME_CSS, /\.okf-column-heading\s*\{[^}]*display: flex;[^}]*justify-content: space-between;[^}]*min-height: 24px;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-properties\] \.okf-description-restore\s*\{\s*display: none;/u);
  assert.match(PREVIEW_THEME_CSS, /html\[data-okf-descriptions-collapsed="true"\] \[data-okf-properties\] \.okf-description-restore\s*\{\s*display: inline-flex;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-description-toggle\]\s*\{[^}]*width: 24px;[^}]*height: 24px;[^}]*flex-shrink: 0;[^}]*margin: 0;/u);
});

test("properties tables fill the preview content column", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \[data-okf-properties\] \.okf-properties\s*\{[^}]*display: table;[^}]*width: 100%;/u,
  );
});

test("narrow properties wrap long paths without hiding expanded descriptions", () => {
  const narrowStyles = PREVIEW_THEME_CSS.split("@media (max-width: 640px) {")[1]?.split("\n[data-okf-properties] .okf-properties th {")[0];
  assert.ok(narrowStyles);
  assert.match(narrowStyles, /\[data-okf-properties\]\s*\{[^}]*min-width: 0;[^}]*max-width: 100%;/u);
  assert.match(narrowStyles, /\.okf-properties\s*\{[^}]*table-layout: fixed;/u);
  assert.match(narrowStyles, /\.okf-properties td,[^]*?white-space: normal;[^}]*overflow-wrap: anywhere;/u);
  assert.match(narrowStyles, /\.okf-name-cell\s*\{[^}]*min-width: 0;[^}]*max-width: 100%;[^}]*flex-wrap: wrap;/u);
  assert.match(narrowStyles, /\.okf-link-with-details\s*\{[^}]*flex-wrap: wrap;/u);
  assert.doesNotMatch(narrowStyles, /display: none|overflow(?:-x)?: hidden/u);
});

test("every admonition flavour gets an accent colour", () => {
  for (const flavour of [
    "note",
    "tip",
    "hint",
    "important",
    "warning",
    "attention",
    "caution",
    "danger",
    "error",
    "seealso",
    "versionadded",
    "versionchanged",
    "deprecated",
  ]) {
    assert.match(
      PREVIEW_THEME_CSS,
      new RegExp(`\\.${flavour}[,)]`, "u"),
      `expected an accent rule for .${flavour}`,
    );
  }
  assert.match(PREVIEW_THEME_CSS, /border-inline-start: 4px solid var\(--sphinx-preview-accent\)/u);
});

test("block editing grows without internal scrolling and is framed", () => {
  const textarea = PREVIEW_THEME_CSS.match(/\.sphinx-preview-block-editor textarea\s*\{([^}]*)\}/u)?.[1];
  assert.ok(textarea);
  assert.match(textarea, /max-height: none;/u);
  assert.match(textarea, /overflow: hidden;/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\.sphinx-preview-block-editor::before/u);
  const frame = PREVIEW_THEME_CSS.match(/\.sphinx-preview-block-editor\s*\{([^}]*)\}/u)?.[1];
  assert.ok(frame);
  assert.match(frame, /position: relative;[^}]*z-index: 1;/u);
  assert.match(frame, /border: 1px solid var\(--vscode-focusBorder, Highlight\);/u);
  assert.match(frame, /border-radius: 4px;/u);
  assert.match(frame, /padding: 6px 8px;/u);
  assert.match(frame, /background: var\(--vscode-editor-background, Canvas\);/u);
});

test("edit mode outlines the hovered block without moving the layout", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-sphinx-preview-edit-hover="true"\]\s*\{[^}]*outline: 1px dashed var\(--vscode-focusBorder, Highlight\);[^}]*outline-offset: 3px;/u,
  );
});

test("raw Markdown and YAML editors use the editor font, text fields keep the preview font", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor textarea\s*\{[^}]*font-family: var\(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace\);[^}]*font-size: calc\(var\(--vscode-editor-font-size, 0\.95em\) - 1px\);[^}]*tab-size: 4;/u,
  );
  assert.doesNotMatch(
    PREVIEW_THEME_CSS.match(/\.sphinx-preview-block-editor textarea\s*\{([^}]*)\}/u)?.[1] ?? "",
    /font: inherit;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > textarea:not\(\[data-okf-text-value\]\)\s*\{[^}]*font-family: var\(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace\);[^}]*font-size: var\(--vscode-editor-font-size, 0\.95em\);[^}]*tab-size: 4;/u,
  );
});

test("the table cell editor shares the block editor textarea rule and grows with its content", () => {
  // One rule carries the font family, size and line-height for both editors (no duplicated values).
  const shared = PREVIEW_THEME_CSS.match(
    /([^{}]*\.sphinx-preview-table-cell-editor textarea[^{}]*)\{([^}]*)\}/u,
  );
  assert.ok(shared);
  assert.match(shared[1], /\.sphinx-preview-block-editor textarea/u);
  assert.match(shared[2], /font-family: var\(--vscode-editor-font-family, ui-monospace/u);
  assert.match(shared[2], /font-size: calc\(var\(--vscode-editor-font-size, 0\.95em\) - 1px\);/u);
  assert.match(shared[2], /line-height: inherit;/u);
  const cellEditor = PREVIEW_THEME_CSS.match(/\.sphinx-preview-table-cell-editor\s*\{([^}]*)\}/u)?.[1] ?? "";
  assert.doesNotMatch(cellEditor, /position: absolute;/u);
  assert.doesNotMatch(
    PREVIEW_THEME_CSS.match(/\.sphinx-preview-table-cell-editor textarea\s*\{([^}]*)\}/u)?.[1] ?? "",
    /font(-family|-size)?:/u,
  );
});

test("the table toolbar status is not pushed up by the paragraph margin", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.sphinx-preview-table-menu \[data-sphinx-preview-edit-status\]\s*\{[^}]*margin: 0 4px;/u,
  );
});

test("the block editor status and its buttons share one wrapping row", () => {
  const row = PREVIEW_THEME_CSS.match(/\.sphinx-preview-block-editor-actions\s*\{([^}]*)\}/u)?.[1] ?? "";
  assert.match(row, /display: flex;/u);
  assert.match(row, /flex-wrap: wrap;/u);
  assert.match(row, /justify-content: space-between;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor-buttons\s*\{[^}]*flex: none;[^}]*margin-inline-start: auto;/u,
  );
});

test("active paragraph editors share the rendered paragraph spacing", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content p,\s*#sphinx-myst-preview-content p\[data-sphinx-preview-editing="true"\] \+ \.sphinx-preview-block-editor\s*\{\s*margin: 0 0 1em;/u,
  );
});

test("Sphinx version admonitions use success, warning, and danger accents", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /:where\(\.tip, \.tips, \.hint, \.versionadded\)\s*\{[^}]*--sphinx-preview-accent: var\(--vscode-charts-green/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /:where\(\.warning, \.attention, \.caution, \.versionchanged\)\s*\{[^}]*--sphinx-preview-accent: var\(--vscode-charts-yellow/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /:where\(\.danger, \.error, \.deprecated\)\s*\{[^}]*--sphinx-preview-accent: var\(--vscode-charts-red/u,
  );
});

test("MyST simple and no-icon admonition modifiers are styled", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.admonition\.simple\s*\{[^}]*background: none;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.admonition\.no-icon[^}]*\{\s*display: none;/u,
  );
});

test("MyST table alignment and notebook output placeholders are styled", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content :where\(th, td\)\[align="center"\]\s*\{\s*text-align: center;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content table\[align="center"\]\s*\{\s*margin-inline: auto;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.myst-notebook-output\s*\{[^}]*border: 1px dashed/u,
  );
});

test("MyST numbered and emphasized code lines are styled", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content code\[data-myst-line-numbers="true"\] \.myst-code-line::before\s*\{[^}]*content: attr\(data-line-number\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.myst-code-line-emphasized\s*\{[^}]*background:/u,
  );
});

test("diff lines use full-width theme-aware add and delete treatments", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content pre\.myst-code-block-diff\s*\{[^}]*padding: 0;[^}]*border: 0;[^}]*border-radius: 0;[^}]*background: transparent;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content :where\(\.myst-diff-line-addition, \.myst-diff-line-deletion\)\s*\{[^}]*box-sizing: border-box;[^}]*width: 100%;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.myst-diff-line-addition\s*\{[^}]*border-inline-start: 3px solid var\(--sphinx-preview-diff-addition\);[^}]*background: color-mix\(in srgb, var\(--sphinx-preview-diff-addition\) 18%, transparent\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.myst-diff-line-deletion\s*\{[^}]*border-inline-start: 3px solid var\(--sphinx-preview-diff-deletion\);[^}]*background: color-mix\(in srgb, var\(--sphinx-preview-diff-deletion\) 18%, transparent\);/u,
  );
  assert.match(PREVIEW_THEME_CSS, /@media \(forced-colors: active\)[\s\S]*?\.myst-diff-line-addition/u);
  assert.match(PREVIEW_THEME_CSS, /@media \(forced-colors: active\)[\s\S]*?\.myst-diff-line-deletion/u);
});

test("Mermaid diagrams keep SVG images contained and source inspectable", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.myst-mermaid-image\s*\{[^}]*max-width: 100%;[^}]*height: auto;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content details\.myst-mermaid-source\s*\{/u,
  );
});

test("figure captions are centred and de-emphasised", () => {
  // The MyST writer emits a caption as a trailing paragraph, so the rule covers both shapes.
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content figcaption,\s*#sphinx-myst-preview-content figure > p:last-child \{[^}]*font-style: italic;[^}]*text-align: center;/u,
  );
});

test("images never overflow the preview column", () => {
  assert.match(PREVIEW_THEME_CSS, /#sphinx-myst-preview-content img \{[^}]*max-width: 100%;/u);
});

test("floating preview toolbar supports forced dark and white palettes", () => {
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar\]\s*\{\s*position: fixed;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar\]\s*\{[^}]*display: flex;[^}]*border-radius: 18px;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="dark"\]\s*,\s*html\[data-sphinx-preview-theme-mode="dark"\] body\s*\{[^}]*--vscode-editor-background: #1e1e1e;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\]\s*,\s*html\[data-sphinx-preview-theme-mode="white"\] body\s*\{[^}]*--vscode-editor-background: #ffffff;/u,
  );
  assert.match(PREVIEW_THEME_CSS, /data-theme-mode="current"/u);
  assert.match(PREVIEW_THEME_CSS, /data-theme-mode="dark"/u);
  assert.match(PREVIEW_THEME_CSS, /data-theme-mode="white"/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /data-sphinx-preview-mode-controls/u);
});

test("preview toolbar provides refresh, editor anchoring, edit mode and theme controls", () => {
  const toolbar = renderPreviewToolbar();
  assert.match(toolbar, /role="toolbar" aria-label="Preview controls"/u);
  assert.equal((toolbar.match(/<button\b/gu) ?? []).length, 4);
  assert.equal((toolbar.match(/<\/button><button\b/gu) ?? []).length, 3);
  assert.doesNotMatch(toolbar, /data-sphinx-preview-mode-controls|role="group"/u);
  for (const control of [
    'data-sphinx-preview-refresh aria-label="Refresh preview" title="Refresh preview" data-tooltip="Refresh preview"',
    'data-sphinx-preview-anchor data-anchor-mode="off" aria-pressed="false" aria-label="Anchor preview to text editor" title="Anchor preview to text editor" data-tooltip="Anchor preview to text editor"',
    'data-sphinx-preview-edit-toggle data-edit-mode="off" aria-pressed="false" aria-label="Toggle edit mode" title="Edit mode" data-tooltip="Edit mode"',
    'data-sphinx-preview-theme-toggle data-theme-mode="current"',
  ]) {
    assert.ok(toolbar.includes(control), `expected toolbar control ${control}`);
  }
  assert.equal((toolbar.match(/data-tooltip="/gu) ?? []).length, 4);
  assert.match(
    PREVIEW_THEME_CSS,
    /button\[data-tooltip\]::after\s*\{[^}]*content: attr\(data-tooltip\);[^}]*visibility: hidden;[^}]*opacity: 0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /button\[data-tooltip\]:hover::after,[\s\S]*?button\[data-tooltip\]:focus-visible::after\s*\{[^}]*visibility: visible;[^}]*opacity: 1;/u,
  );
});

test("control tooltips retain their offset while sticky headings remain at the top", () => {
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-controls-height: 116px;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*position: fixed;[^}]*inset-block-start: 0;/u);
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-table-menu \{[^}]*flex-wrap: wrap;/u);
  assert.match(PREVIEW_THEME_CSS, /width: max-content;[\s\S]*max-width: min\(240px, calc\(100vw - 16px\)\);/u);
  assert.match(PREVIEW_THEME_CSS, /background: var\(--vscode-editorHoverWidget-background, var\(--vscode-editor-background, Canvas\)\);/u);
  assert.match(PREVIEW_THEME_CSS, /\.caption-number::after\s*\{\s*content: "\\00a0";/u);
});

test("white mode keeps code backgrounds soft and code text readable blue", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\][\s\S]*?--vscode-textCodeBlock-background: #f0f0f0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content :not\(pre\) > code\s*\{[^}]*background: var\(--vscode-textCodeBlock-background/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content pre\s*\{[^}]*background: var\(--vscode-textCodeBlock-background/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\] #sphinx-myst-preview-content :not\(pre\) > code\s*\{\s*color: var\(--vscode-textLink-foreground/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\] #sphinx-myst-preview-content pre > code\.language-yaml,[\s\S]*?color: var\(--vscode-textLink-foreground/u,
  );
});

test("fenced code uses the editor foreground and one font scale", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content pre\s*\{[^}]*border-radius: 4px;[^}]*color: var\(--vscode-editor-foreground, inherit\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content pre > code\s*\{[^}]*font-size: 1em;[^}]*color: inherit;/u,
  );
});

test("frontmatter properties label is inset, table-matched, and unboxed", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.okf-properties-title\s*\{[^}]*margin: 0\.75em 0 0\.5em;[^}]*font-family: inherit;[^}]*font-size: 1em;[^}]*font-weight: 600;[^}]*background: none;[^}]*color: var\(--vscode-descriptionForeground, #6e6e6e\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.okf-properties thead th\s*\{[^}]*background: rgba\(128, 128, 128, 0\.12\);/u,
  );
});

test("frontmatter edit hover colors follow the selected preview theme", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="dark"\],[\s\S]*?--vscode-list-hoverBackground: rgba\(255, 255, 255, 0\.1\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\],[\s\S]*?--vscode-list-hoverBackground: rgba\(0, 0, 0, 0\.08\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-okf-edit-cell\]:hover\s*\{\s*background: var\(--vscode-list-hoverBackground,/u,
  );
});

test("frontmatter edits stay inline while edit mode preserves source newlines", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-okf-edit-cell\]\s*\{[^}]*cursor: pointer;/u,
  );
  assert.doesNotMatch(PREVIEW_THEME_CSS, /data-okf-edit-field/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor\s*\{[^}]*border: 1px solid var\(--vscode-focusBorder, Highlight\);[^}]*padding: 6px 8px;[^}]*background: var\(--vscode-editor-background, Canvas\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor textarea\s*\{[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor textarea\s*\{[^}]*resize: none;[^}]*padding: 0;[^}]*border: 0;[^}]*background: transparent;[^}]*font-family: var\(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\]\s*\{[^}]*margin: 0;[^}]*padding: 0;[^}]*border: 0;[^}]*background: transparent;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-frontmatter-editor \[role="status"\]\[data-visible="true"\]\[data-state="error"\]\s*\{[^}]*display: flex;[^}]*padding: 3px 6px;[^}]*background: var\(--vscode-inputValidation-errorBackground,/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-frontmatter-editor \[role="status"\]\[data-visible="true"\]\[data-state="error"\]::before\s*\{[^}]*content: "!";[^}]*border-radius: 50%;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-key-editing="true"\] > \.okf-name-cell,\s*\[data-okf-editing="true"\] > \[data-okf-value-display\]\s*\{\s*display: none !important;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > input\[list\],[\s\S]*?width: 100%;[^}]*padding: 2px 4px;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > textarea\s*\{[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > textarea\s*\{[^}]*max-height: none;[^}]*resize: none;[^}]*overflow-wrap: anywhere;[^}]*overflow: hidden;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > textarea\[data-okf-text-value\]\s*\{[^}]*font-family: inherit;/u,
  );
  assert.doesNotMatch(PREVIEW_THEME_CSS, /sphinx-preview-frontmatter-actions|display: contents;/u);
  assert.doesNotMatch(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\][^{]*p\[data-sphinx-source-line\]\s*\{[^}]*white-space: pre-wrap/u,
  );
  assert.doesNotMatch(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\][^{]*table p\[data-sphinx-source-line\]\s*\{/u,
  );
});

test("active toolbar toggles do not show a redundant focus ring", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-toolbar\] button\[aria-pressed="true"\]:focus-visible\s*\{\s*outline: none;/u,
  );
});

test("frontmatter and table editors keep the active cell surface without nested input frames", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > input\[list\],[\s\S]*?\{[^}]*border: 0;[^}]*outline: none;[^}]*background: transparent;[^}]*color: var\(--vscode-editor-foreground,/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-cell-editor\s*\{[^}]*background: transparent;[^}]*color: var\(--vscode-editor-foreground,/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-cell-editor textarea\s*\{[^}]*border: 0;[^}]*outline: none;[^}]*background: transparent;[^}]*color: var\(--vscode-editor-foreground,/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-table-cell-content="true"\]\s*\{[^}]*display: block;[^}]*visibility: hidden;/u);
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-table-cell-editor textarea\s*\{[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;[^}]*resize: none;/u);
});

test("preview content width is configurable and can be unlimited", () => {
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-content-max-width: 960px;/u);
  assert.equal(
    previewContentWidthCss(1200),
    ":root { --sphinx-preview-content-max-width: 1200px; }",
  );
  assert.equal(
    previewContentWidthCss(0),
    ":root { --sphinx-preview-content-max-width: none; }",
  );
});

test("table toolbar sits in the document flow above the table with labelled buttons", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-menu\s*\{\s*position: static;[^}]*flex-wrap: wrap;[^}]*margin: 0 0 6px;/u,
  );
  const rule = /\.sphinx-preview-table-menu\s*\{[^}]*\}/u.exec(PREVIEW_THEME_CSS)?.[0] ?? "";
  assert.doesNotMatch(rule, /position: fixed|--sphinx-preview-table-menu-(top|left)|100vw/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-menu button\s*\{[^}]*display: inline-flex;[^}]*align-items: center;[^}]*width: auto;[^}]*gap: 4px;[^}]*padding: 0 8px;[^}]*border: 0;[^}]*border-radius: 14px;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-sphinx-preview-table-cell-selected="true"\]\s*\{\s*outline: 2px solid var\(--vscode-focusBorder, Highlight\);\s*outline-offset: -2px;/u,
  );
});

test("overflowing content tables keep short cells whole and show scroll shadows", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content table\[data-sphinx-table-overflow="true"\] :where\(th, td\)\[data-sphinx-short-cell="true"\]\s*\{[^}]*white-space: nowrap;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content table\[data-sphinx-table-overflow="true"\]\s*\{[^}]*linear-gradient\(to right[^}]*linear-gradient\(to left[^}]*radial-gradient\(farthest-side at 0 50%[^}]*radial-gradient\(farthest-side at 100% 50%, color-mix\(in srgb, var\(--vscode-editor-foreground, var\(--vscode-foreground/u,
  );
});

test("frontmatter field actions sit in the editing row with labels and no pseudo-tooltips", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-frontmatter-menu\s*\{\s*position: static;[^}]*display: flex;[^}]*flex-wrap: wrap;[^}]*width: auto;[^}]*max-width: 100%;[^}]*margin: 4px 0 0;/u,
  );
  const rule = /\.sphinx-preview-frontmatter-menu\s*\{[^}]*\}/u.exec(PREVIEW_THEME_CSS)?.[0] ?? "";
  assert.doesNotMatch(rule, /position: fixed|z-index|--sphinx-preview-frontmatter-menu-(top|left)|100vw/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-frontmatter-menu button\s*\{[^}]*display: inline-flex;[^}]*align-items: center;[^}]*gap: 4px;[^}]*width: auto;[^}]*padding: 0 8px;[^}]*border-radius: 14px;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-frontmatter-menu button\[data-tooltip\]::after\s*\{\s*content: none;/u,
  );
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\.sphinx-preview-frontmatter-menu button\[data-tooltip\]:(hover|focus-visible)::after/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-frontmatter-editor\] > textarea \{\s*min-height: 1\.6em;/u);
});

test("the issue badge is a plain button and a clicked badge highlights its row", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-properties\] button\[data-okf-badge\]\s*\{[^}]*border: 0;[^}]*background: none;[^}]*font: inherit;[^}]*color: inherit;[^}]*cursor: pointer;/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-badge\]:focus-visible\s*\{[^}]*outline: 1px solid var\(--vscode-focusBorder/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-issue-highlight="true"\]\s*\{[^}]*outline: 2px solid var\(--vscode-errorForeground/u,
  );
});

test("T28: insertion points are zero-height, hover-revealed gutter buttons", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point\s*\{\s*position: relative;\s*height: 0;\s*margin: 0;\s*padding: 0;\s*border: 0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point button\s*\{[^}]*position: absolute;[^}]*left: -1\.6em;[^}]*top: -0\.8em;[^}]*width: 1\.4em;[^}]*height: 1\.4em;[^}]*border-radius: 50%;[^}]*opacity: 0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-source-line\]:hover \+ \.sphinx-preview-insert-point button,[^{]*\.sphinx-preview-insert-point button:hover,[^{]*\.sphinx-preview-insert-point button:focus-visible\s*\{\s*opacity: 1;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point--start\s*\{\s*height: auto;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point--start button\s*\{[^}]*position: static;[^}]*opacity: 1;/u,
  );
});

test("status titles and messages are block-level only on status pages and non-pending banners", () => {
  const selectors: string[] = [];
  for (const match of PREVIEW_ACCESSIBILITY_CSS.matchAll(/([^{}]+)\{([^}]*)\}/gu)) {
    if (/display:\s*block/u.test(match[2]) && /data-sphinx-preview-status/u.test(match[1])) {
      selectors.push(...match[1].split(",").map((selector) => selector.trim()));
    }
  }
  assert.ok(selectors.length >= 4, "block rules exist: " + selectors.join(" | "));
  for (const selector of selectors) {
    assert.ok(
      selector.includes("[data-sphinx-preview-status-page]")
        || selector.includes(':not([data-sphinx-preview-status="pending"])'),
      "unscoped status block rule: " + selector,
    );
  }
  assert.match(PREVIEW_ACCESSIBILITY_CSS,
    /\[data-sphinx-preview-status-page\] \[data-sphinx-preview-status\] > strong/u);
  assert.match(PREVIEW_ACCESSIBILITY_CSS,
    /\[data-sphinx-preview-status\]:not\(\[data-sphinx-preview-status="pending"\]\) > strong/u);
  assert.match(PREVIEW_ACCESSIBILITY_CSS,
    /\[data-sphinx-preview-status-message\][^{]*\{[^}]*margin-block-start: 0\.25em;/u);
});

test("T43: the pending overlay is fixed, pointer-transparent and never in flow", () => {
  const rule = /\[data-sphinx-preview-pending-overlay\]\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS);
  assert.ok(rule, "the pending overlay rule exists");
  assert.match(rule[1]!, /position: fixed;/u);
  assert.match(rule[1]!, /pointer-events: none;/u);
  assert.match(rule[1]!, /max-width: [^;]*;/u);
  assert.match(PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-pending-overlay\] > (strong|span)[^{]*\{[^}]*display: block;/u);
});
