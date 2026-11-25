import assert from "node:assert/strict";
import { test } from "node:test";
import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS, previewContentWidthCss } from "../../../src/core/preview/previewStyles";
import { renderPreviewToolbar } from "../../../src/core/preview/previewToolbar";


test("frontmatter link tooltips wrap text in a fixed theme-aware pointer-transparent surface", () => {
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-link-tooltip\s*\{[^}]*position: fixed;[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;[^}]*pointer-events: none;/u);
  for (const variable of ["background", "foreground", "border"]) {
    assert.ok(PREVIEW_THEME_CSS.includes("--studio-editorHoverWidget-" + variable));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-028
test("typography is driven by VS Code markdown preview variables", () => {
  for (const variable of [
    "--studio-markdown-font-family",
    "--studio-markdown-font-size",
    "--studio-markdown-line-height",
  ]) {
    assert.ok(PREVIEW_THEME_CSS.includes(variable), `expected ${variable} in the preview theme`);
  }
});

test("shared borders resolve against the body palette rather than inherited host root colors", () => {
  assert.match(PREVIEW_THEME_CSS, /(?:^|\})\s*body\s*\{\s*--sphinx-preview-border: var\(--studio-widget-border, var\(--studio-panel-border, rgba\(128, 128, 128, 0\.35\)\)\);/u);
  const root = /:root\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.doesNotMatch(root, /--sphinx-preview-border:/u);
});

test("scrollbar tracks and thumbs follow the preview theme", () => {
  assert.match(PREVIEW_THEME_CSS, /scrollbar-color: var\(--sphinx-preview-scrollbar-thumb\) var\(--studio-editor-background, Canvas\);/u);
  assert.match(PREVIEW_THEME_CSS, /::-webkit-scrollbar-track,\s*::-webkit-scrollbar-corner \{\s*background: var\(--studio-editor-background, Canvas\);/u);
  for (const mode of ["white", "dark"]) {
    assert.match(PREVIEW_THEME_CSS, new RegExp(`html\\[data-sphinx-preview-theme-mode="${mode}"\\] body \\{[^}]*--sphinx-preview-scrollbar-thumb: #[0-9a-f]+;`, "u"));
  }
});

test("linked file details are muted, italic, and clipped to the available line", () => {
  assert.match(PREVIEW_THEME_CSS, /\.okf-link-excerpt,\s*[^{}]*\.okf-link-line \{[^}]*color: var\(--studio-descriptionForeground, GrayText\);[^}]*font-style: italic;/u);
  assert.match(PREVIEW_THEME_CSS, /\.okf-link-excerpt \{[^}]*width: 0;[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/u);
});

test("list insertion lines show the drop boundary without moving the rows", () => {
  assert.match(PREVIEW_THEME_CSS, /\.okf-list-editor-item \{[^}]*position: relative;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\.okf-list-editor-item\[data-okf-list-drop\]::after \{[^}]*position: absolute;[^}]*inset-inline: 0;[^}]*height: 2px;[^}]*background: var\(--studio-focusBorder, Highlight\);[^}]*pointer-events: none;/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-list-drop="before"\]::after \{\s*top: -0\.1em;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-list-drop="after"\]::after \{\s*bottom: -0\.1em;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-028
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
    /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*font-size: calc\(var\(--sphinx-preview-zoomed-font-size\) \+ 2px\);/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*font-weight: 700;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*white-space: pre;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*overflow: hidden;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*text-overflow: ellipsis;/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*overflow-wrap: anywhere;/u);
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
      "padding-inline: max(var(--sphinx-preview-content-gutter), calc((100% - var(--sphinx-preview-toc-reserve, 0px) - var(--sphinx-preview-column-width)) / 2 + var(--sphinx-preview-content-gutter)));",
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

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-025
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
    /#sphinx-myst-preview-content \{[^}]*max-width: var\(--sphinx-preview-column-width, 960px\);[^}]*margin-inline: auto;[^}]*padding: 0 var\(--sphinx-preview-content-gutter\) min\(80vh, max\(24px, calc\(100vh - var\(--sphinx-preview-reading-offset, 0px\) - 40px\)\)\);/u,
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

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-005#S5
test("the key column of the properties table fits its keys and never breaks one inside a word", () => {
  const rule = (selector: RegExp) => PREVIEW_THEME_CSS.match(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`, "u"))?.[1] ?? "";
  const name = rule(/\.okf-properties \.okf-name-text/u);
  assert.match(name, /white-space: nowrap;/u);
  assert.match(name, /overflow-wrap: normal;/u);
  assert.match(name, /text-overflow: ellipsis;/u);
  assert.match(name, /overflow: hidden;/u);
  assert.match(rule(/\.okf-properties tbody th\[scope="row"\]:not\(\[colspan\]\)/u), /width: 1%;/u);
  assert.match(rule(/\.okf-properties tbody th:not\(\[colspan\]\) \.okf-name-cell/u), /max-width: calc\(40cqw - 2em\);/u);
  assert.match(PREVIEW_THEME_CSS, /\n\[data-okf-properties\]\s*\{\s*container-type: inline-size;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-005#S5
test("the Names header label never breaks inside the word, even when every key is shorter", () => {
  const header = PREVIEW_THEME_CSS.match(/\.okf-properties thead th:first-child\s*\{([^}]*)\}/u)?.[1] ?? "";
  assert.match(header, /white-space: nowrap;/u);
  assert.match(header, /overflow-wrap: normal;/u);
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

// @tests_req SwRS-MDOKFSTUDIO-MYST-001#S3
// @tests_req SwRS-MDOKFSTUDIO-MYST-001#S4
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
  assert.match(frame, /border: 1px solid var\(--studio-focusBorder, Highlight\);/u);
  assert.match(frame, /border-radius: 4px;/u);
  assert.match(frame, /padding: 6px 8px;/u);
  assert.match(frame, /background: var\(--studio-editor-background, Canvas\);/u);
});

test("edit mode outlines the hovered block without moving the layout", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-sphinx-preview-edit-hover="true"\]\s*\{[^}]*outline: 1px dashed var\(--studio-focusBorder, Highlight\);[^}]*outline-offset: 3px;/u,
  );
});

test("selected blocks get a solid focus outline and the count is announced off screen", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-sphinx-preview-block-selected="true"\]\s*\{[^}]*outline: 2px solid var\(--studio-focusBorder, Highlight\);[^}]*outline-offset: 3px;/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-selection-status\s*\{[^}]*clip-path: inset\(50%\);/u);
});

test("raw Markdown and YAML editors use the editor font, text fields keep the preview font", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor textarea\s*\{[^}]*font-family: var\(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace\);[^}]*font-size: calc\(var\(--studio-editor-font-size, 0\.95em\) - 1px\);[^}]*tab-size: 4;/u,
  );
  assert.doesNotMatch(
    PREVIEW_THEME_CSS.match(/\.sphinx-preview-block-editor textarea\s*\{([^}]*)\}/u)?.[1] ?? "",
    /font: inherit;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > textarea:not\(\[data-okf-text-value\]\)\s*\{[^}]*font-family: var\(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace\);[^}]*font-size: var\(--studio-editor-font-size, 0\.95em\);[^}]*tab-size: 4;/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("the table cell editor shares the block editor textarea rule and grows with its content", () => {
  // One rule carries the font family, size and line-height for both editors (no duplicated values).
  const shared = PREVIEW_THEME_CSS.match(
    /([^{}]*\.sphinx-preview-table-cell-editor textarea[^{}]*)\{([^}]*)\}/u,
  );
  assert.ok(shared);
  assert.match(shared[1], /\.sphinx-preview-block-editor textarea/u);
  assert.match(shared[2], /font-family: var\(--studio-editor-font-family, ui-monospace/u);
  assert.match(shared[2], /font-size: calc\(var\(--studio-editor-font-size, 0\.95em\) - 1px\);/u);
  assert.match(shared[2], /line-height: inherit;/u);
  const cellEditor = PREVIEW_THEME_CSS.match(/\.sphinx-preview-table-cell-editor\s*\{([^}]*)\}/u)?.[1] ?? "";
  assert.doesNotMatch(cellEditor, /position: absolute;/u);
  assert.doesNotMatch(
    PREVIEW_THEME_CSS.match(/\.sphinx-preview-table-cell-editor textarea\s*\{([^}]*)\}/u)?.[1] ?? "",
    /font(-family|-size)?:/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-048
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

test("the block editor status is not pushed up by the paragraph margin", () => {
  // The id selector of `#sphinx-myst-preview-content p` outweighs a class-only margin reset.
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.sphinx-preview-block-editor \.sphinx-preview-block-editor-actions \[data-sphinx-preview-edit-status\]\s*\{[^}]*flex: 1 1 14em;[^}]*align-self: center;[^}]*margin: 0;/u,
  );
});

test("the block editor status uses compact text", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.sphinx-preview-block-editor \.sphinx-preview-block-editor-actions \[data-sphinx-preview-edit-status\]\s*\{[^}]*font-size: 0\.75em;[^}]*line-height: 1\.4;/u,
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
    /:where\(\.tip, \.tips, \.hint, \.versionadded\)\s*\{[^}]*--sphinx-preview-accent: var\(--studio-charts-green/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /:where\(\.warning, \.attention, \.versionchanged\)\s*\{[^}]*--sphinx-preview-accent: var\(--studio-charts-yellow/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /:where\(\.danger, \.error, \.deprecated\)\s*\{[^}]*--sphinx-preview-accent: var\(--studio-charts-red/u,
  );
});

test("caution callouts are red with the octagon icon, not the warning amber", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.caution\s*\{[^}]*--sphinx-preview-accent: var\(--studio-charts-red/u,
  );
  const rule = /#sphinx-myst-preview-content \.caution\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  const octagon = /--sphinx-preview-icon: (url\("[^"]*"\))/u.exec(rule)?.[1] ?? "";
  assert.ok(octagon.includes("data:image/svg+xml"), "caution sets an icon");
  const triangle = /:where\(\.warning[^)]*\)\s*\{[^}]*--sphinx-preview-icon: (url\("[^"]*"\))/u.exec(PREVIEW_THEME_CSS)?.[1];
  assert.ok(triangle?.includes("data:image/svg+xml"), "the warning rule sets an icon");
  assert.notEqual(octagon, triangle, "caution does not reuse the warning triangle");
  assert.doesNotMatch(PREVIEW_THEME_CSS, /:where\(\.warning[^)]*\.caution[^)]*\)/u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-001#S8
test("dropdown admonitions show their open or closed state with a chevron", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content details\.admonition > summary\.admonition-title::after\s*\{[^}]*content: "";[^}]*transform: rotate\(-45deg\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content details\.admonition\[open\] > summary\.admonition-title::after\s*\{[^}]*transform: rotate\(45deg\);/u,
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

// @tests_req SwRS-MDOKFSTUDIO-CORE-022
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

// @tests_req SwRS-MDOKFSTUDIO-CODE-039#S5
test("MyST numbered and emphasized code lines are styled", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content code\[data-myst-line-numbers="true"\] \.myst-code-line::before,[^{]*\{[^}]*content: attr\(data-line-number\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.myst-code-line-emphasized\s*\{[^}]*background:/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-008#S1
// @tests_req SwRS-MDOKFSTUDIO-CODE-008#S3
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

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-001#S5
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

// @tests_req SwRS-MDOKFSTUDIO-CODE-014#S5
// @tests_req SwRS-MDOKFSTUDIO-CODE-014#S6
test("a captioned code block is left-aligned with its caption as a title bar on top", () => {
  const css = PREVIEW_THEME_CSS;
  // The figure around the code no longer inherits the centred text of image figures.
  assert.match(
    css,
    /#sphinx-myst-preview-content figure:has\(> pre\) \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*text-align: left;/u,
  );
  // The caption (after the code in the markup) is drawn above it, joined to the block.
  assert.match(
    css,
    /#sphinx-myst-preview-content figure:has\(> pre\) > figcaption \{[^}]*order: -1;[^}]*border-bottom: 0;[^}]*border-radius: 4px 4px 0 0;[^}]*font-family: var\(--studio-editor-font-family[^}]*font-style: normal;[^}]*text-align: left;/u,
  );
  assert.match(
    css,
    /#sphinx-myst-preview-content figure:has\(> pre\) > pre \{[^}]*margin: 0;[^}]*border-top-left-radius: 0;[^}]*border-top-right-radius: 0;/u,
  );
  assert.match(css, /figure:has\(> pre\) > figcaption > p \{[^}]*margin: 0;[^}]*font: inherit;/u);
});

test("the caption title bar takes its colours from theme variables only", () => {
  const rule = /figure:has\(> pre\) > figcaption \{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.notEqual(rule, "", "the title bar rule is missing");
  assert.match(rule, /color: var\(--studio-editor-foreground/u);
  assert.match(rule, /border: 1px solid var\(--sphinx-preview-border\)/u);
  assert.doesNotMatch(rule, /#[0-9a-fA-F]{3,8}\b/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-008
test("images never overflow the preview column", () => {
  assert.match(PREVIEW_THEME_CSS, /#sphinx-myst-preview-content img \{[^}]*max-width: 100%;/u);
});

test("floating preview toolbar supports forced dark and white palettes", () => {
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar\]\s*\{\s*position: fixed;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar\]\s*\{[^}]*display: flex;[^}]*border-radius: 14px;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="dark"\]\s*,\s*html\[data-sphinx-preview-theme-mode="dark"\] body\s*\{[^}]*--studio-editor-background: #1e1e1e;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\]\s*,\s*html\[data-sphinx-preview-theme-mode="white"\] body\s*\{[^}]*--studio-editor-background: #ffffff;/u,
  );
  assert.match(PREVIEW_THEME_CSS, /data-theme-mode="current"/u);
  assert.match(PREVIEW_THEME_CSS, /data-theme-mode="dark"/u);
  assert.match(PREVIEW_THEME_CSS, /data-theme-mode="white"/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /data-sphinx-preview-mode-controls/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001
// @tests_req SwRS-MDOKFSTUDIO-TRUST-001#S3
// @tests_req SwRS-MDOKFSTUDIO-TRUST-001#S4
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-054
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("preview toolbar has four rows of four buttons: main with the collapse button, navigation, view, review", () => {
  const toolbar = renderPreviewToolbar();
  assert.match(toolbar, /role="toolbar" aria-label="Preview controls"/u);
  // Every row holds four buttons: 16 buttons in all.
  assert.equal((toolbar.match(/<button\b/gu) ?? []).length, 16);
  const [mainRow, rest] = toolbar.split('<div data-sphinx-preview-toolbar-more id="sphinx-preview-toolbar-more">');
  const [navigationRow, afterNavigation] = rest.split('<div data-sphinx-preview-toolbar-row="view">');
  const [viewRow, reviewRow] = afterNavigation.split('<div data-sphinx-preview-toolbar-row="review">');
  const count = (row: string): number => (row.match(/<button\b/gu) ?? []).length;
  assert.match(mainRow, /data-sphinx-preview-toolbar-row="main"/u);
  assert.match(mainRow, /data-sphinx-preview-refresh[\s\S]*data-sphinx-preview-edit-toggle[\s\S]*data-sphinx-preview-export[\s\S]*data-sphinx-preview-toolbar-collapse/u);
  assert.match(mainRow, /data-sphinx-preview-export aria-label="Export to HTML" title="Export to HTML" data-tooltip="Export to HTML"/u);
  assert.equal(count(mainRow), 4);
  assert.match(mainRow, /data-sphinx-preview-toolbar-collapse[^>]*aria-expanded="true"[^>]*aria-controls="sphinx-preview-toolbar-more"[^>]*aria-label="Hide view controls"[^>]*title="Hide view controls"/u);
  assert.match(navigationRow, /^<div data-sphinx-preview-toolbar-row="navigation">/u);
  assert.equal(count(navigationRow), 4);
  assert.match(navigationRow, /data-sphinx-preview-anchor[\s\S]*data-sphinx-preview-theme-toggle[\s\S]*data-sphinx-preview-back[\s\S]*data-sphinx-preview-next/u);
  assert.equal(count(viewRow), 4);
  assert.match(viewRow, /data-sphinx-preview-width-toggle[\s\S]*data-sphinx-preview-fold-toggle aria-pressed="false"[\s\S]*data-sphinx-preview-zoom-out[\s\S]*data-sphinx-preview-zoom-in/u);
  assert.equal(count(reviewRow), 4);
  assert.match(reviewRow, /data-sphinx-preview-toc-toggle aria-pressed="false"[\s\S]*data-sphinx-preview-sbs-toggle aria-pressed="false"[\s\S]*data-sphinx-preview-diff-toggle aria-pressed="true"/u);
  assert.match(reviewRow, /data-sphinx-preview-diff-toggle[^>]*><svg[\s\S]*<\/svg><\/button><button[^>]*data-sphinx-preview-comments-toggle aria-pressed="true"[^>]*><svg[\s\S]*<\/svg><\/button><\/div><\/div><\/div>$/u);
  // Every row holds four buttons.
  for (const row of [mainRow, navigationRow, viewRow, reviewRow]) assert.equal(count(row), 4);
  // Tab order follows the rows, left to right and top to bottom.
  const order = [...toolbar.matchAll(/<button type="button" data-sphinx-preview-([a-z-]+)/gu)].map((match) => match[1]);
  assert.deepEqual(order, [
    "refresh", "edit-toggle", "export", "toolbar-collapse", "anchor", "theme-toggle", "back", "next",
    "width-toggle", "fold-toggle", "zoom-out", "zoom-in", "toc-toggle", "sbs-toggle", "diff-toggle", "comments-toggle",
  ]);
  // The Edit button is always enabled: trust never makes a document read-only. A button that needs
  // trust stays focusable and greyed (aria-disabled) with its reason as tooltip.
  assert.equal((toolbar.match(/<button\b/gu) ?? []).length, 16);
  assert.doesNotMatch(toolbar, /aria-disabled/u);
  assert.match(PREVIEW_THEME_CSS, /button\[aria-disabled="true"\]\s*\{[^}]*cursor: not-allowed;/u);
  assert.match(toolbar, /data-sphinx-preview-toolbar-row="main"[\s\S]*data-sphinx-preview-toolbar-collapse/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar-more\]\[hidden\]\s*\{[^}]*display: none;/u);
  assert.doesNotMatch(toolbar, /style=/u);
  assert.doesNotMatch(toolbar, /data-sphinx-preview-mode-controls|role="group"/u);
  for (const control of [
    'data-sphinx-preview-refresh aria-label="Refresh preview" title="Refresh preview" data-tooltip="Refresh preview"',
    'data-sphinx-preview-anchor data-anchor-mode="off" aria-pressed="false" aria-label="Anchor preview to text editor" title="Anchor preview to text editor" data-tooltip="Anchor preview to text editor"',
    'data-sphinx-preview-edit-toggle data-edit-mode="off" aria-pressed="false" aria-label="Toggle edit mode" title="Edit mode" data-tooltip="Edit mode"',
    'data-sphinx-preview-theme-toggle data-theme-mode="current"',
  ]) {
    assert.ok(toolbar.includes(control), `expected toolbar control ${control}`);
  }
  assert.equal((toolbar.match(/data-tooltip="/gu) ?? []).length, 16);
  assert.match(
    PREVIEW_THEME_CSS,
    /button\[data-tooltip\]::after\s*\{[^}]*content: attr\(data-tooltip\);[^}]*visibility: hidden;[^}]*opacity: 0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /button\[data-tooltip\]:hover::after,[\s\S]*?button\[data-tooltip\]:focus-visible::after\s*\{[^}]*visibility: visible;[^}]*opacity: 1;/u,
  );
});

test("toolbar tooltips stay opaque and anchored even on disabled controls", () => {
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar\] button:disabled\s*\{[^}]*opacity:/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar\] button:disabled > svg\s*\{[^}]*opacity: 0\.5;/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /button\[data-tooltip\]:focus-visible::after\s*\{[^}]*transform: translate/u);
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-025#S1
// @tests_req SwRS-MDOKFSTUDIO-THEME-025#S3
test("forced preview themes supply dropdown colors independently of the host", () => {
  for (const mode of ["dark", "white", "cream"]) {
    assert.match(PREVIEW_THEME_CSS, new RegExp(`html\\[data-sphinx-preview-theme-mode="${mode}"\\][^{}]*\\{[^}]*--studio-dropdown-background: var\\(--studio-editorWidget-background\\);[^}]*--studio-dropdown-foreground: var\\(--studio-editor-foreground\\);`, "u"));
  }
});

test("control tooltips retain their offset while sticky headings remain at the top", () => {
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-controls-height: 116px;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-sticky-headings\]\s*\{[^}]*position: fixed;[^}]*inset-block-start: 0;/u);
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-table-menu \{[^}]*flex-wrap: wrap;/u);
  assert.match(PREVIEW_THEME_CSS, /width: max-content;[\s\S]*max-width: min\(240px, calc\(100vw - 16px\)\);/u);
  assert.match(PREVIEW_THEME_CSS, /background: var\(--studio-editorHoverWidget-background, var\(--studio-editor-background, Canvas\)\);/u);
  assert.match(PREVIEW_THEME_CSS, /\.caption-number::after\s*\{\s*content: "\\00a0";/u);
});

test("white mode keeps code backgrounds soft and code text readable blue", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\][\s\S]*?--studio-textCodeBlock-background: #f0f0f0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content :not\(pre\) > code\s*\{[^}]*background: color-mix\(in srgb, currentColor \d+%, transparent\)/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content pre\s*\{[^}]*background: var\(--studio-textCodeBlock-background/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\] #sphinx-myst-preview-content :not\(pre\) > code\s*\{\s*color: var\(--studio-textLink-foreground/u,
  );
  // YAML blocks have Dark+ token colours like every language: no blue override on the code element.
  assert.doesNotMatch(PREVIEW_THEME_CSS, /pre > code\.language-yaml/u);
});

test("fenced code uses the editor foreground and one font scale", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content pre\s*\{[^}]*border-radius: 4px;[^}]*color: var\(--studio-editor-foreground, inherit\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content pre > code\s*\{[^}]*font-size: 1em;[^}]*color: inherit;/u,
  );
});

test("frontmatter properties label is inset, table-matched, and unboxed", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.okf-properties-title\s*\{[^}]*margin: 0\.75em 0 0\.5em;[^}]*font-family: inherit;[^}]*font-size: 1em;[^}]*font-weight: 600;[^}]*background: none;[^}]*color: var\(--studio-descriptionForeground, #6e6e6e\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.okf-properties thead th\s*\{[^}]*background: rgba\(128, 128, 128, 0\.12\);/u,
  );
});

test("frontmatter edit hover colors follow the selected preview theme", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="dark"\],[\s\S]*?--studio-list-hoverBackground: rgba\(255, 255, 255, 0\.1\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-theme-mode="white"\],[\s\S]*?--studio-list-hoverBackground: rgba\(0, 0, 0, 0\.08\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-okf-edit-cell\]:hover\s*\{\s*background: var\(--studio-list-hoverBackground,/u,
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
    /\.sphinx-preview-block-editor\s*\{[^}]*border: 1px solid var\(--studio-focusBorder, Highlight\);[^}]*padding: 6px 8px;[^}]*background: var\(--studio-editor-background, Canvas\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor textarea\s*\{[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor textarea\s*\{[^}]*resize: none;[^}]*padding: 0;[^}]*border: 0;[^}]*background: transparent;[^}]*font-family: var\(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\]\s*\{[^}]*margin: 0;[^}]*padding: 0;[^}]*border: 0;[^}]*background: transparent;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-frontmatter-editor \[role="status"\]\[data-visible="true"\]\[data-state="error"\]\s*\{[^}]*display: flex;[^}]*padding: 3px 6px;[^}]*background: var\(--studio-inputValidation-errorBackground,/u,
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

// @tests_req SwRS-MDOKFSTUDIO-TABLE-001
test("frontmatter and table editors keep the active cell surface without nested input frames", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-frontmatter-editor\] > input\[list\],[\s\S]*?\{[^}]*border: 0;[^}]*outline: none;[^}]*background: transparent;[^}]*color: var\(--studio-editor-foreground,/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-cell-editor\s*\{[^}]*background: transparent;[^}]*color: var\(--studio-editor-foreground,/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-cell-editor textarea\s*\{[^}]*border: 0;[^}]*outline: none;[^}]*background: transparent;[^}]*color: var\(--studio-editor-foreground,/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-table-cell-content="true"\]\s*\{[^}]*display: block;[^}]*visibility: hidden;/u);
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-table-cell-editor textarea\s*\{[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;[^}]*resize: none;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-002#S5
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-002#S6
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

// @tests_req SwRS-MDOKFSTUDIO-TABLE-064
test("CR 168: the table toolbar paints above the row and column handle layer", () => {
  const rule = /\.sphinx-preview-table-menu\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  const layer = /\[data-okf-row-handle-layer\]\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  const zIndex = (text: string): number => Number(/z-index: (\d+);/u.exec(text)?.[1] ?? Number.NaN);
  const positioned = /position: (?:relative|absolute|fixed|sticky);/u.test(rule);
  assert.ok(positioned, "z-index applies to the bar only when it is positioned");
  assert.ok(zIndex(rule) > zIndex(layer), `bar z-index ${zIndex(rule)} above handle layer ${zIndex(layer)}`);
});

test("table toolbar sits in the document flow above the table with labelled buttons", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-menu\s*\{\s*position: relative;\s*z-index: 3;[^}]*flex-wrap: wrap;[^}]*margin: 0 0 6px;/u,
  );
  const rule = /\.sphinx-preview-table-menu\s*\{[^}]*\}/u.exec(PREVIEW_THEME_CSS)?.[0] ?? "";
  assert.doesNotMatch(rule, /position: fixed|--sphinx-preview-table-menu-(top|left)|100vw/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-menu button\s*\{[^}]*display: inline-flex;[^}]*align-items: center;[^}]*width: auto;[^}]*gap: 4px;[^}]*padding: 0 8px;[^}]*border: 0;[^}]*border-radius: 14px;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-edit-mode="on"\] \[data-sphinx-preview-table-cell-selected="true"\]\s*\{\s*outline: 2px solid var\(--studio-focusBorder, Highlight\);\s*outline-offset: -2px;/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-048
test("the table bar draws one rule per group and the cell group carries its own rule", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-menu :is\(\[data-sphinx-table-group="row"\] \+ \[data-sphinx-table-group="column"\],\s*\[data-sphinx-table-group="column"\] \+ \[data-sphinx-table-group="table"\]\)::before\s*\{/u,
    "a rule before Col left and before List table, none before Col −",
  );
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\.sphinx-preview-table-menu :is\(\[data-sphinx-table-group="column"\], \[data-sphinx-table-group="table"\]\)/u);
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-table-menu-cell-group\s*\{[^}]*display: flex;[^}]*flex: 0 1 auto;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-032#S4
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-032#S5
// @tests_req SwRS-MDOKFSTUDIO-CORE-034
test("overflowing content tables keep short cells whole and show scroll shadows", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content table\[data-sphinx-table-overflow="true"\] :where\(th, td\)\[data-sphinx-short-cell="true"\]\s*\{[^}]*white-space: nowrap;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content table\[data-sphinx-table-overflow="true"\]\s*\{[^}]*linear-gradient\(to right[^}]*linear-gradient\(to left[^}]*radial-gradient\(farthest-side at 0 50%[^}]*radial-gradient\(farthest-side at 100% 50%, color-mix\(in srgb, var\(--studio-editor-foreground, var\(--studio-foreground/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-032#S3
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-032#S4
test("content table cells keep a 5em minimum width in the rendered view, the properties table keeps its own", () => {
  const rule = PREVIEW_THEME_CSS.match(/#sphinx-myst-preview-content table:not\(\.okf-properties\) :where\(th, td\) \{([^}]*)\}/u)?.[1] ?? "";
  assert.match(rule, /min-width: 5em;/u);
  // Edit mode keeps its larger cell minimum (it outranks the rendered-view rule by specificity).
  assert.match(PREVIEW_THEME_CSS, /html\[data-sphinx-preview-edit-mode="on"\] #sphinx-myst-preview-content table :where\(th, td\) \{[^}]*min-width: 8em;/u);
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
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-badge\]:focus-visible\s*\{[^}]*outline: 1px solid var\(--studio-focusBorder/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-issue-highlight="true"\]\s*\{[^}]*outline: 2px solid var\(--studio-errorForeground/u,
  );
});


/** The rules of the stylesheet as [selector, body] pairs, at-rule blocks flattened (CR 046). */
function cssRules(css: string): Array<[string, string]> {
  const rules: Array<[string, string]> = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/gu;
  for (const match of css.replace(/\/\*[\s\S]*?\*\//gu, "").matchAll(pattern)) {
    rules.push([match[1]!.replace(/^[\s\S]*@[^{]*$/u, "").trim().replace(/\s+/gu, " "), match[2]!]);
  }
  return rules;
}

/** The body of the `@media (prefers-reduced-motion: reduce)` block of the theme stylesheet. */
function reducedMotionBlock(css: string): string {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.ok(start >= 0, "the theme stylesheet has a reduced-motion block");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(css.indexOf("{", start) + 1, index);
  }
  return "";
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-050
test("CR 046: prefers-reduced-motion: reduce turns off every animation and transition of the motion layer", () => {
  // The page-wide rule ends every transition at once (a tiny duration would still start one).
  assert.match(reducedMotionBlock(PREVIEW_ACCESSIBILITY_CSS), /transition-duration: 0s !important;/u);
  const reduced = reducedMotionBlock(PREVIEW_THEME_CSS);
  assert.match(reduced, /animation: none !important;/u);
  assert.match(reduced, /transition: none !important;/u);
  const reducedSelectors = reduced.slice(0, reduced.indexOf("{")).replace(/\s+/gu, " ");
  const marks = [
    'html[data-sphinx-preview-motion="on"]',
    'html[data-sphinx-preview-theme-switching="true"] body *',
    '[data-sphinx-preview-edit-closed="true"]',
    '#sphinx-myst-preview-content [data-sphinx-preview-updated="true"]',
  ];
  for (const mark of marks) assert.ok(reducedSelectors.includes(mark), `reduced motion covers ${mark}`);
  // Every part that moves under the motion marks is listed in the reduced-motion rule.
  for (const part of [".sphinx-preview-block-editor", ".sphinx-preview-table-cell-editor", "[data-okf-frontmatter-editor]",
    ".sphinx-preview-edit-palette", ".sphinx-preview-table-menu", ".sphinx-preview-frontmatter-menu",
    ".sphinx-preview-edit-palette-menu", ".sphinx-preview-slash-menu", ".sphinx-preview-frontmatter-picker"]) {
    assert.match(reducedSelectors, new RegExp(part.replace(/[[\]().*+?^$|]/gu, "\\$&") + "[,)]", "u"), `reduced motion covers ${part}`);
  }
  const moving = cssRules(PREVIEW_THEME_CSS)
    .filter(([selector, body]) => /(?:^|;)\s*(?:animation|transition):/u.test(body)
      && /data-sphinx-preview-(?:motion|theme-switching|edit-closed|updated)/u.test(selector))
    .map(([selector]) => selector);
  assert.ok(moving.length >= 6, "the motion layer animates editors, menus, closing, theme switch and the update glow");
  for (const selector of moving) {
    for (const part of selector.split(/,(?![^(]*\))/u).map((entry) => entry.trim())) {
      assert.ok(reducedSelectors.includes(part.replace(/ :is\(.*$/u, "")), `${part} is turned off by reduced motion`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-050
test("CR 046: the motion layer is short and never animates layout or the table bar's transform", () => {
  const rules = cssRules(PREVIEW_THEME_CSS).filter(([selector]) =>
    /data-sphinx-preview-(?:motion|theme-switching|edit-closed|updated)/u.test(selector));
  for (const [selector, body] of rules) {
    const transition = /transition:([^;]*);/u.exec(body)?.[1];
    if (!transition || body.includes("none !important")) continue;
    assert.doesNotMatch(transition, /\b(?:all|transform|width|height|margin|padding|top|left|inset)\b/u, selector);
  }
  for (const name of ["fast", "", "theme"]) {
    const value = new RegExp(`--sphinx-preview-motion${name ? "-" + name : ""}: (\\d+)ms;`, "u").exec(PREVIEW_THEME_CSS)?.[1];
    assert.ok(value && Number(value) >= 100 && Number(value) <= 200, `--sphinx-preview-motion${name ? "-" + name : ""} is 100-200 ms`);
  }
  // Enter effects need a user action first: the starting styles all sit under the motion mark.
  const starting = /@starting-style \{([\s\S]*?)\n\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  for (const [selector] of cssRules(starting)) {
    assert.ok(selector.startsWith('html[data-sphinx-preview-motion="on"]'), selector);
  }
  assert.ok(cssRules(starting).length >= 3);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-028
test("a block quote is tinted with the theme block quote background", () => {
  const rule = /#sphinx-myst-preview-content blockquote\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.match(rule, /background: var\(--studio-textBlockQuote-background, /u);
  assert.match(rule, /border-inline-start: 4px solid/u);
  for (const mode of ["dark", "white", "cream"]) {
    const block = new RegExp(`html\\[data-sphinx-preview-theme-mode="${mode}"\\] body\\s*\\{([^}]*)\\}`, "u").exec(PREVIEW_THEME_CSS)?.[1] ?? "";
    assert.match(block, /--studio-textBlockQuote-background: #[0-9a-f]{6};/iu, `${mode} sets the block quote tint`);
  }
});

/**
 * The stylesheet VS Code injects at the top of every webview carries this rule, inside
 * `@layer vscode-default`. It paints the block quote with the dark host colour whatever the preview
 * theme is. It is the CR 107 evidence: a real VS Code window with the Dark Modern theme and the
 * Cream preview theme showed a near-black block quote while the preview set no background of its
 * own. An unlayered preview rule beats a layered default, and the specificity check below keeps the
 * preview rule winning even if the host ever drops the layer.
 */
const VSCODE_WEBVIEW_BLOCKQUOTE_RULE = "blockquote { background: var(--vscode-textBlockQuote-background); "
  + "border-color: var(--vscode-textBlockQuote-border); }";

/** Specificity of one selector as [ids, classes/attributes/pseudo-classes, types]; `:where` counts 0. */
function specificity(selector: string): [number, number, number] {
  const flat = selector.replace(/:where\([^)]*\)/gu, "").replace(/:(?:is|not|has)\(([^)]*)\)/gu, " $1 ");
  const ids = (flat.match(/#[\w-]+/gu) ?? []).length;
  const classes = (flat.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/gu) ?? []).length;
  const types = (flat.replace(/\[[^\]]*\]|[#.:][\w-]+/gu, " ").match(/(?:^|[\s>+~])[a-z][\w-]*/gu) ?? []).length;
  return [ids, classes, types];
}

function outranks(left: [number, number, number], right: [number, number, number]): boolean {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-028
test("CR 107: the preview block quote background outranks the VS Code webview default rule", () => {
  const defaults = /^(\S[^{]*)\{([^}]*)\}/u.exec(VSCODE_WEBVIEW_BLOCKQUOTE_RULE);
  assert.ok(defaults);
  const defaultSpecificity = specificity(defaults[1].trim());
  assert.deepEqual(defaultSpecificity, [0, 0, 1]);
  const previewBackgrounds: Array<[number, number, number]> = [];
  const css = PREVIEW_THEME_CSS.replace(/\/\*[\s\S]*?\*\//gu, "");
  for (const match of css.matchAll(/([^{}@]+)\{([^{}]*)\}/gu)) {
    if (!/(?:^|;|\s)background(?:-color)?\s*:/u.test(match[2])) continue;
    for (const selector of match[1].split(",")) {
      if (/(?:^|[\s>+~])blockquote\s*$/u.test(selector.trim())) previewBackgrounds.push(specificity(selector.trim()));
    }
  }
  assert.ok(previewBackgrounds.length > 0, "the preview sets a background on block quotes");
  assert.ok(previewBackgrounds.every((candidate) => outranks(candidate, defaultSpecificity)),
    "every preview block quote background beats the host default, so the host colour theme cannot show through");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-002
test("CR 112: the edit bar buttons share the floating toolbar's tooltip bubble and slide it in on hover", () => {
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-edit-palette > button\[data-tooltip\]::after[^{]*\{[^}]*content: attr\(data-tooltip\);/u);
  assert.match(PREVIEW_THEME_CSS, /\.sphinx-preview-edit-palette > button\[data-tooltip\]:hover::after[^{]*\{[^}]*visibility: visible;[^}]*opacity: 1;/u);
  // CR 162: the palette's own keyframes became the animation every tooltip shares.
  assert.match(PREVIEW_THEME_CSS, /@keyframes sphinx-preview-tooltip-in/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-129
test("CR 162: every tooltip bubble slides in from the left with one shared animation", () => {
  const keyframes = /@keyframes sphinx-preview-tooltip-in \{([^@]*?)\n\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.match(keyframes, /from \{[^}]*opacity: 0;[^}]*translate: -6px 0;/u);
  assert.match(keyframes, /to \{[^}]*opacity: 1;[^}]*translate: 0 0;/u);
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-motion-fast: 120ms;/u);
  const rules = cssRules(PREVIEW_THEME_CSS);
  for (const owner of [
    '[data-sphinx-preview-toolbar] button[data-tooltip]:hover::after',
    ".sphinx-preview-table-menu button[data-tooltip]:hover::after",
    ".sphinx-preview-edit-palette > button[data-tooltip]:hover::after",
  ]) {
    const animated = rules.filter(([selector, body]) => selector.split(",").map((part) => part.trim()).includes(owner)
      && /animation: sphinx-preview-tooltip-in var\(--sphinx-preview-motion-fast, 120ms\)/u.test(body));
    assert.ok(animated.length > 0, `${owner} plays the shared slide-in`);
  }
  assert.doesNotMatch(PREVIEW_THEME_CSS, /sphinx-preview-edit-tooltip-in/u, "no tooltip keeps an animation of its own");
  assert.doesNotMatch(PREVIEW_THEME_CSS, /button\[data-tooltip\]::after\s*\{[^}]*transition: opacity 100ms/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: the toolbar rows unroll as one block, only under the animating mark", () => {
  const mark = "[data-sphinx-preview-toolbar-more][data-sphinx-preview-toolbar-animating]";
  const rules = cssRules(PREVIEW_THEME_CSS);
  const body = (selector: string): string => rules.find(([entry]) => entry === selector)?.[1] ?? "";
  const rolling = body(mark);
  assert.match(rolling, /transition: height var\(--sphinx-preview-motion, 160ms\)/u);
  assert.match(rolling, /opacity var\(--sphinx-preview-motion, 160ms\)/u);
  assert.match(rolling, /display var\(--sphinx-preview-motion, 160ms\) allow-discrete/u);
  assert.match(rolling, /overflow: hidden;/u);
  assert.match(body(mark + "[hidden]"), /height: 0;[^}]*opacity: 0;/u);
  assert.match(body(mark + ":not([hidden])"), /animation: sphinx-preview-toolbar-unroll var\(--sphinx-preview-motion, 160ms\)/u);
  assert.match(PREVIEW_THEME_CSS, /@keyframes sphinx-preview-toolbar-unroll \{\s*from \{ height: 0; opacity: 0; \}/u);
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-motion: 160ms;/u);
  // At rest the rows have no transition or animation, so a page that loads open shows no motion.
  for (const [selector, rule] of rules) {
    if (!selector.includes("[data-sphinx-preview-toolbar-more]") || selector.includes("animating")) continue;
    assert.doesNotMatch(rule, /transition|animation/u, selector);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-129
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: reduced motion turns off the tooltip slide-in and the toolbar rows unroll", () => {
  const reduced = reducedMotionBlock(PREVIEW_THEME_CSS);
  const selectors = reduced.slice(reduced.lastIndexOf("/* The toolbar motion"));
  for (const part of [
    "[data-sphinx-preview-toolbar] button[data-tooltip]::after",
    ".sphinx-preview-table-menu button[data-tooltip]::after",
    ".sphinx-preview-edit-palette > button[data-tooltip]::after",
    "[data-sphinx-preview-toolbar-more][data-sphinx-preview-toolbar-animating]",
  ]) {
    assert.ok(selectors.includes(part), `reduced motion covers ${part}`);
  }
  assert.match(selectors, /animation: none !important;\s*transition: none !important;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("CR 112: a horizontal rule is 12px taller above and below than its line, with the spacing unchanged", () => {
  const rule = /#sphinx-myst-preview-content hr \{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.match(rule, /height: 1px;/u);
  assert.match(rule, /padding: 12px 0;/u);
  assert.match(rule, /box-sizing: content-box;/u);
  assert.match(rule, /background-clip: content-box;/u);
  assert.match(rule, /margin: calc\(2em - 12px\) 0;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-006
test("in edit mode table cells keep a minimum width and the edited cell is wider", () => {
  const edit = 'html\\[data-sphinx-preview-edit-mode="on"\\] #sphinx-myst-preview-content table';
  assert.match(PREVIEW_THEME_CSS, new RegExp(`${edit} :where\\(th, td\\) \\{[^}]*min-width: 8em;`, "u"));
  assert.match(
    PREVIEW_THEME_CSS,
    new RegExp(`${edit} :where\\(th, td\\)\\[data-sphinx-preview-table-cell-selected="true"\\] \\{[^}]*min-width: max\\(8em, min\\(300px, var\\(--sphinx-preview-cell-editor-room, 300px\\)\\)\\);`, "u"),
  );
  // The rendered (read) view has no such rule.
  assert.doesNotMatch(PREVIEW_THEME_CSS, /(?:^|\n)#sphinx-myst-preview-content table :where\(th, td\) \{[^}]*min-width/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("CR 143: the chevron shows on hover, focus and while folded, and a folded block drops its spacing", () => {
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-fold-toggle\] \{[^}]*position: absolute;[^}]*opacity: 0;/u);
  assert.match(PREVIEW_THEME_CSS,
    /:hover > \[data-okf-fold-toggle\],[^{]*:focus-within > \[data-okf-fold-toggle\],[^{]*\[data-okf-fold="closed"\] > \[data-okf-fold-toggle\] \{\s*opacity: 1;/u);
  assert.match(PREVIEW_THEME_CSS, /> \[data-okf-folded\] \{[^}]*margin: 0 !important;[^}]*padding: 0 !important;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("CR 143: the toolbar has a Fold button, off until a section is folded", () => {
  assert.match(renderPreviewToolbar(),
    /<button type="button" data-sphinx-preview-fold-toggle aria-pressed="false" aria-label="Fold all sections"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("the find bar and the match paint read the theme tokens, in forced colours as well", () => {
  assert.match(PREVIEW_THEME_CSS, /::highlight\(studio-find\)\s*\{[^}]*--studio-editor-findMatchHighlightBackground/u);
  assert.match(PREVIEW_THEME_CSS, /::highlight\(studio-find-current\)\s*\{[^}]*background-color/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-find\]\s*\{[^}]*position: fixed;[^}]*--studio-editorWidget-background/u);
  assert.match(PREVIEW_THEME_CSS, /@media \(forced-colors: active\)\s*\{\s*::highlight\(studio-find\)/u);
  assert.doesNotMatch(renderPreviewToolbar(), /data-sphinx-preview-find/u, "the bar is created by the page, not by the toolbar");});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-008
test("CR147: the toolbar offers a Side-by-side button in the review row after the Table of contents button, not pressed at first", () => {
  const toolbar = renderPreviewToolbar();
  assert.match(toolbar, /data-sphinx-preview-toc-toggle[\s\S]*data-sphinx-preview-sbs-toggle aria-pressed="false"[\s\S]*data-sphinx-preview-diff-toggle/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
test("CR147: the side-by-side cards are two columns, switch off with the page attribute and never show in edit mode", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /\[data-okf-sbs-card\] \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/u);
  assert.match(css, /html\[data-sphinx-preview-sbs="off"\] \[data-okf-sbs-card\]:not\(\[data-okf-sbs-single\]\),\s*html\[data-sphinx-preview-edit-mode="on"\] \[data-okf-sbs-card\] \{\s*display: none;/u);
  assert.match(css, /html\[data-sphinx-preview-sbs="on"\]:not\(\[data-sphinx-preview-edit-mode="on"\]\) \[data-okf-sbs-replaced\],\s*html:not\(\[data-sphinx-preview-edit-mode="on"\]\) \[data-okf-sbs-replaced="single"\] \{\s*display: none;/u);
  assert.match(css, /\[data-okf-sbs-word="removed"\] \{[^}]*text-decoration: line-through;/u);
  assert.match(css, /\[data-okf-sbs-word="added"\] \{[^}]*text-decoration: underline;/u);
  assert.match(css, /html\[data-okf-incoming-changes="false"\] \[data-sphinx-preview-sbs-toggle\] \{\s*display: none;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-007#S3
// @tests_req SwRS-MDOKFSTUDIO-CODE-007#S4
test("code blocks use one font scale, one box, and scroll a long line only when it does not fit", () => {
  const rule = (selector: string): string => {
    const start = PREVIEW_THEME_CSS.indexOf(`\n${selector} {`);
    assert.ok(start >= 0, `the rule ${selector} exists`);
    return PREVIEW_THEME_CSS.slice(start, PREVIEW_THEME_CSS.indexOf("}", start));
  };
  assert.match(rule("#sphinx-myst-preview-content :where(code, pre, samp, kbd)"), /font-size: 0\.92em;/u);
  const block = rule("#sphinx-myst-preview-content pre");
  for (const declaration of [
    "border: 1px solid var(--sphinx-preview-border);",
    "border-radius: 4px;",
    "background: var(--studio-textCodeBlock-background",
    "color: var(--studio-editor-foreground, inherit);",
    "overflow-x: auto;",
  ]) {
    assert.ok(block.includes(declaration), `the block declares ${declaration}`);
  }
  const code = rule("#sphinx-myst-preview-content pre > code");
  for (const declaration of ["padding: 0;", "border: 0;", "background: none;", "font-size: 1em;"]) {
    assert.ok(code.includes(declaration), `the inner code has no box of its own: ${declaration}`);
  }
  // A block nested in a directive keeps the same box: its own rule changes only the spacing and wrapping.
  const nested = rule("#sphinx-myst-preview-content .myst-directive pre");
  assert.doesNotMatch(nested, /border|background|font-size|color/u);
});
