import { DEFAULT_PREVIEW_CONTENT_WIDTH } from "../../configuration/previewConfiguration";

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-007
/** The first element of the page starts 40px below the top (read and edit mode). */
const FIRST_ELEMENT_GAP_CSS = `/*
 * The first-element gap: whatever opens the page starts 40px below the top. This is a margin on
 * the first child, not padding on the column, so the column's own top never moves. It follows
 * every rule above that sets a top margin (headings, the properties table, blocks).
 */
#sphinx-myst-preview-content > :first-child {
  margin-top: 40px;
}`;

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-007
/** The first-block editor, the Start writing button and a leading properties table keep the 40px under the toolbar. */
const FIRST_ELEMENT_CLEARANCE_CSS = `/*
 * Every first element starts 40px below the top. Only an interactive first element that sits under
 * the floating toolbar moves: an open first-block editor gives up the width the toolbar covers
 * (--sphinx-preview-first-inset, its inline-end margin) and keeps the 40px; the Start writing
 * button, a leading properties table, and a first-block editor in a pane too narrow to be narrowed
 * add the runtime's clearance, which is 0 whenever nothing overlaps.
 */
#sphinx-myst-preview-content > [data-okf-properties]:first-child,
#sphinx-myst-preview-content .sphinx-preview-block-editor--first,
#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor--first,
#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor-host.sphinx-preview-block-editor--first,
#sphinx-myst-preview-content .sphinx-preview-insert-point--first {
  margin-top: calc(40px + var(--sphinx-preview-first-clearance, 0px));
}

#sphinx-myst-preview-content > [data-okf-properties]:first-child,
#sphinx-myst-preview-content .sphinx-preview-block-editor--first,
#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor--first,
#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor-host.sphinx-preview-block-editor--first {
  margin-inline-end: var(--sphinx-preview-first-inset, 0px);
}`;

// @implements_req SwRS-MDOKFSTUDIO-CORE-028
// @implements_req SwRS-MDOKFSTUDIO-CORE-034
// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-001
// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-022
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
// @implements_req SwRS-MDOKFSTUDIO-THEME-001
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-025
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-037
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-045
/**
 * The toolbar toggle icons, the TOC column, the width modes and the content typography (wrapping,
 * paragraphs, lists, checkboxes).
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const CONTENT_LAYOUT_CSS = `
[data-sphinx-preview-theme-toggle] svg {
  display: none;
}

[data-sphinx-preview-theme-toggle][data-theme-mode="current"] [data-theme-icon="current"],
[data-sphinx-preview-theme-toggle][data-theme-mode="dark"] [data-theme-icon="dark"],
[data-sphinx-preview-theme-toggle][data-theme-mode="white"] [data-theme-icon="white"],
[data-sphinx-preview-theme-toggle][data-theme-mode="cream"] [data-theme-icon="cream"] {
  display: block;
}

[data-sphinx-preview-toolbar-collapse] svg {
  display: none;
}

[data-sphinx-preview-toolbar-collapse][aria-expanded="true"] [data-collapse-icon="hide"],
[data-sphinx-preview-toolbar-collapse][aria-expanded="false"] [data-collapse-icon="show"] {
  display: block;
}

[data-sphinx-preview-width-toggle] svg {
  display: none;
}

[data-sphinx-preview-width-toggle][data-width-mode="margin"] [data-width-icon="margin"],
[data-sphinx-preview-width-toggle][data-width-mode="auto"] [data-width-icon="auto"],
[data-sphinx-preview-width-toggle][data-width-mode="full"] [data-width-icon="full"] {
  display: block;
}

/* TOC column (runtime-created nav, filled by the page script). Off by default; when open and the
   pane is at least 760px wide it takes 240px plus a 16px gap from the right of the pane, so the
   content and the sticky band narrow by 256px. Narrower panes hide it whatever the preference. */
nav[data-sphinx-preview-toc] {
  display: none;
}

@media (min-width: 760px) {
  html[data-sphinx-preview-toc="open"] {
    --sphinx-preview-toc-reserve: 256px;
  }

  html[data-sphinx-preview-toc="open"] body {
    padding-inline-end: var(--sphinx-preview-toc-reserve);
  }

  html[data-sphinx-preview-toc="open"] nav[data-sphinx-preview-toc] {
    position: fixed;
    inset-block-start: var(--sphinx-preview-toc-top, 96px);
    inset-block-end: 16px;
    inset-inline-end: 16px;
    z-index: 1000;
    box-sizing: border-box;
    display: block;
    width: 240px;
    overflow-y: auto;
    padding: 8px 6px;
    border: 1px solid var(--sphinx-preview-border);
    border-radius: 8px;
    background: var(--studio-editor-background, Canvas);
    color: var(--studio-editor-foreground, CanvasText);
    font-family: var(--sphinx-preview-font);
    font-size: 13px;
    line-height: 1.35;
  }
}

nav[data-sphinx-preview-toc] ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

nav[data-sphinx-preview-toc] li {
  display: flex;
  align-items: flex-start;
  margin: 0;
  padding-inline-start: calc(var(--sphinx-preview-toc-depth, 0) * 12px);
}

nav[data-sphinx-preview-toc] li[hidden] {
  display: none;
}

/* Entries without sub-entries line up with the ones that have a twisty. */
nav[data-sphinx-preview-toc] li:not([data-sphinx-preview-toc-parent]) {
  padding-inline-start: calc(var(--sphinx-preview-toc-depth, 0) * 12px + 20px);
}

nav[data-sphinx-preview-toc] li button[data-sphinx-preview-toc-twisty] {
  flex: none;
  width: 20px;
  padding: 3px 0;
  text-align: center;
  opacity: 0.75;
}

nav[data-sphinx-preview-toc] li button[data-sphinx-preview-toc-twisty]::before {
  content: "\\25BE";
}

nav[data-sphinx-preview-toc] li button[data-sphinx-preview-toc-twisty][aria-expanded="false"]::before {
  content: "\\25B8";
}

/* The section at the reading line: a tint of the text colour plus a bar, readable in the light,
   dark and cream themes alike. */
nav[data-sphinx-preview-toc] li[data-sphinx-preview-toc-current] > button:not([data-sphinx-preview-toc-twisty]) {
  background: color-mix(in srgb, currentColor 14%, transparent);
  border-radius: 0;
  box-shadow: inset 3px 0 0 var(--studio-focusBorder, Highlight);
  font-weight: 600;
}

nav[data-sphinx-preview-toc] li button {
  display: block;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 3px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
}

nav[data-sphinx-preview-toc] li button:hover,
nav[data-sphinx-preview-toc] li button:focus-visible {
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.18));
}

nav[data-sphinx-preview-toc] [data-sphinx-preview-toc-empty] {
  margin: 0;
  padding: 3px 6px;
  opacity: 0.7;
}

/* Full width: no column limit. A large pixel width keeps the sticky band padding math valid. The side
   margin is the 16 px gutter a table keeps when it breaks out in Auto, so both modes line up. */
html[data-sphinx-preview-width="full"] {
  --sphinx-preview-column-width: 100000px;
  --sphinx-preview-content-gutter: 16px;
}

/* Auto: a table, figure, image or code block wider than the column breaks out, centred on the
   available area (pane minus the TOC column and gutters), never wider than it. The runtime sets the extra width and the centring shift; an element under
   edit keeps the column width. */
html[data-sphinx-preview-width="auto"] #sphinx-myst-preview-content > [data-sphinx-preview-wide]:not([data-sphinx-preview-editing="true"]) {
  box-sizing: border-box;
  width: calc(100% + var(--sphinx-preview-breakout, 0px));
  max-width: none;
  margin-inline-start: calc(var(--sphinx-preview-breakout, 0px) / -2 + var(--sphinx-preview-breakout-shift, 0px));
  margin-inline-end: 0;
}

/* The runtime lifts the column cap for a moment to read the natural width of a wide table; it also
   lifts the row-handle cap (edit mode), else the measure would depend on its own result. */
html[data-sphinx-preview-width="auto"] #sphinx-myst-preview-content > :where(table, .table-wrapper)[data-sphinx-preview-measuring] {
  max-width: none !important;
}

/* Tables and figures narrower than the column are centred in every width mode, at their own
   width. The caption is a centred paragraph inside the figure; code blocks stay left. */
#sphinx-myst-preview-content > table,
#sphinx-myst-preview-content > .table-wrapper {
  margin-inline: auto;
}

#sphinx-myst-preview-content > p[data-sphinx-preview-figure] {
  text-align: center;
}

html, body {
  font-family: var(--sphinx-preview-font);
  font-size: var(--sphinx-preview-zoomed-font-size);
  line-height: var(--sphinx-preview-line-height);
}

/* Shibuya centres content in a narrow column; the preview pane is already narrow. */
body :where(.sy-page, .sy-container, .sy-main, .sy-body, article) {
  display: block;
  max-width: none;
  width: auto;
  min-height: 0;
  margin: 0;
  padding-inline: 0;
  grid-template-columns: none;
}

#sphinx-myst-preview-content {
  /* Contains the first element's top margin, so the column itself never moves. */
  display: flow-root;
  box-sizing: border-box;
  width: 100%;
  max-width: var(--sphinx-preview-column-width, ${DEFAULT_PREVIEW_CONTENT_WIDTH}px);
  margin-inline: auto;
  padding: 0 var(--sphinx-preview-content-gutter) min(80vh, max(24px, calc(100vh - var(--sphinx-preview-reading-offset, 0px) - 40px)));
}

/* The content root takes the focus (tabindex -1) when the margin is clicked or the window comes back;
   the page as a whole never shows a focus ring, the selected block does. */
#sphinx-myst-preview-content:focus,
#sphinx-myst-preview-content:focus-visible {
  outline: none;
}

/* Long words and bare URLs wrap instead of widening the page; code blocks keep their own scroll. */
#sphinx-myst-preview-content :is(p, li, dd, dt, td, th, blockquote, h1, h2, h3, h4, h5, h6, figcaption, summary, a) {
  overflow-wrap: anywhere;
}

.sphinx-preview-table-menu button,
.sphinx-preview-frontmatter-menu button {
  flex-shrink: 0;
}

.sphinx-preview-frontmatter-menu button[data-tooltip]::after {
  content: none;
}

.sphinx-preview-table-menu,
.sphinx-preview-frontmatter-menu {
  box-sizing: border-box;
  white-space: nowrap;
}

#sphinx-myst-preview-content .caption-number::after {
  content: "\\00a0";
}

/* Match the preview-wide font reset's ID specificity so it cannot override
  the OKF table sizing rules. */
#sphinx-myst-preview-content [data-okf-properties] {
  margin: 0 0 1.5em;
  padding: 0;
  border: none;
  background: none;
  font-size: 0.85em;
}

#sphinx-myst-preview-content :where(p, li, dd, dt, td, th, blockquote, figcaption, .caption-text) {
  font-family: var(--sphinx-preview-font);
  font-size: var(--sphinx-preview-zoomed-font-size);
  line-height: var(--sphinx-preview-line-height);
}

#sphinx-myst-preview-content :where(h1, h2, h3, h4, h5, h6) {
  font-family: var(--sphinx-preview-font);
  font-weight: 600;
  line-height: 1.25;
  margin: 1.6em 0 0.6em;
  color: var(--studio-editor-foreground, CanvasText);
}

#sphinx-myst-preview-content h1 {
  font-size: 2em;
  margin-top: 0.6em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--sphinx-preview-border);
}

#sphinx-myst-preview-content h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--sphinx-preview-border);
}

#sphinx-myst-preview-content h3 { font-size: 1.25em; }
#sphinx-myst-preview-content h4 { font-size: 1em; }

${FIRST_ELEMENT_GAP_CSS}

#sphinx-myst-preview-content p,
#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor {
  margin: 0 0 1em;
}

#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor-host {
  margin: 0 0 1em;
}

/* The host carries the spacing (and the first-element clearance) of the frame it wraps. */
#sphinx-myst-preview-content .sphinx-preview-block-editor-host > .sphinx-preview-block-editor {
  margin: 0;
}

/* The frame reserves the distance the sticky palette rides down (a block near the top of the page):
   its top margin collapses with the bar's 3px, so the first lines start below the bar. */
#sphinx-myst-preview-content .sphinx-preview-block-editor-host > .sphinx-preview-block-editor {
  margin-top: var(--sphinx-preview-palette-reserve, 0px);
}

${FIRST_ELEMENT_CLEARANCE_CSS}

#sphinx-myst-preview-content :where(ul, ol) {
  padding-inline-start: 2em;
}

#sphinx-myst-preview-content li {
  margin: 0.2em 0;
}

/* List items wrap their content in paragraphs, whose body margin would double-space them. */
#sphinx-myst-preview-content li > p {
  margin-bottom: 0.3em;
}

#sphinx-myst-preview-content li > p:last-child {
  margin-bottom: 0;
}

/* Checkbox markers ([ ] / [x]) render as real checkboxes that toggle the source. */
#sphinx-myst-preview-content input.myst-checkbox {
  width: 1em;
  height: 1em;
  margin: 0 0.35em 0 0;
  vertical-align: -0.125em;
  accent-color: var(--studio-focusBorder, #007fd4);
  cursor: pointer;
}

#sphinx-myst-preview-content input.myst-checkbox:disabled {
  cursor: default;
}

#sphinx-myst-preview-content input.myst-checkbox[aria-busy="true"] {
  cursor: progress;
}

#sphinx-myst-preview-content input.myst-checkbox:focus-visible {
  outline: 1px solid var(--studio-focusBorder, #007fd4);
  outline-offset: 2px;
}

/* The reason of a refused toggle, shown next to its box for a few seconds. */
#sphinx-myst-preview-content .myst-checkbox-refusal {
  margin-inline-end: 0.5em;
  padding: 1px 6px;
  border: 1px solid var(--studio-editorWarning-foreground, var(--studio-charts-yellow, #b89500));
  border-radius: 3px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground, CanvasText));
  font-size: 0.85em;
}

/* A link to a missing or blocked target keeps its look; this small icon follows it. */
#sphinx-myst-preview-content .sphinx-preview-link-warning {
  margin-inline-start: 0.25em;
  color: var(--studio-editorWarning-foreground, var(--studio-charts-yellow, #b89500));
  font-size: 0.85em;
  cursor: help;
  user-select: none;
}

#sphinx-myst-preview-content .sphinx-preview-link-warning::before {
  content: "\\26A0";
}

/* Task list items show the checkbox in the bullet gutter, as GitHub does. */
#sphinx-myst-preview-content li.task-list-item {
  list-style: none;
}

#sphinx-myst-preview-content li.task-list-item > p:first-child > input.myst-checkbox:first-child {
  margin-inline-start: -1.4em;
}
`;
