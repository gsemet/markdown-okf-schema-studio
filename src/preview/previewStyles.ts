import {
  DEFAULT_PREVIEW_CONTENT_WIDTH,
  normalizePreviewContentWidth,
} from "../configuration/previewConfiguration";

/**
 * Stylesheets injected into every preview webview.
 *
 * Kept free of `vscode` imports so the CSS contract can be unit tested directly.
 */

export const PREVIEW_ACCESSIBILITY_CSS = `
:root {
  color-scheme: light dark;
}

body {
  background: var(--vscode-editor-background, Canvas);
  color: var(--vscode-editor-foreground, CanvasText);
  margin: 0;
}

a {
  color: var(--vscode-textLink-foreground, LinkText);
}

:where(a, button, input, select, textarea, summary, [tabindex="0"]):focus-visible {
  outline: 2px solid var(--vscode-focusBorder, Highlight);
  outline-offset: 2px;
}

[data-sphinx-preview-status="success"] {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Title and message on two lines on status pages and on every banner except the one-line pending one. */
[data-sphinx-preview-status-page] [data-sphinx-preview-status] > strong,
[data-sphinx-preview-status-page] [data-sphinx-preview-status-message],
[data-sphinx-preview-status]:not([data-sphinx-preview-status="pending"]) > strong,
[data-sphinx-preview-status]:not([data-sphinx-preview-status="pending"]) [data-sphinx-preview-status-message] {
  display: block;
}

[data-sphinx-preview-status-page] [data-sphinx-preview-status-message],
[data-sphinx-preview-status]:not([data-sphinx-preview-status="pending"]) [data-sphinx-preview-status-message] {
  margin-block-start: 0.25em;
}

[data-sphinx-preview-current="true"] {
  outline: 2px solid var(--vscode-editor-findMatchHighlightBackground, Highlight);
  outline-offset: 2px;
}

@media (forced-colors: active) {
  :where(a, button, input, select, textarea, summary, [tabindex="0"]):focus-visible,
  [data-sphinx-preview-current="true"] {
    outline: 2px solid Highlight;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/** Builds a mask image from a 16x16 path, so the badge inherits the callout accent. */
function icon(path: string): string {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23fff' fill-rule='evenodd' d='${path}'/%3E%3C/svg%3E")`;
}

const ICONS = {
  info: icon(
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM7.25 6.9h1.5v4.6h-1.5V6.9ZM8 4a.95.95 0 1 1 0 1.9A.95.95 0 0 1 8 4Z",
  ),
  bulb: icon(
    "M8 1a4.4 4.4 0 0 0-2.65 7.92c.35.27.55.63.55 1v.58h4.2v-.58c0-.37.2-.73.55-1A4.4 4.4 0 0 0 8 1ZM5.9 11.9h4.2v1.2H5.9v-1.2Zm.5 2.3h3.2a1.6 1.6 0 0 1-3.2 0Z",
  ),
  triangle: icon(
    "M8 1.1 15.5 14.6H.5L8 1.1Zm0 3.1L3.1 13.1h9.8L8 4.2ZM7.3 6.8h1.4v3.4H7.3V6.8Zm0 4.2h1.4v1.4H7.3V11Z",
  ),
  cross: icon(
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm2.6 1.84L8 6.94 5.4 4.34 4.34 5.4 6.94 8 4.34 10.6 5.4 11.66 8 9.06l2.6 2.6 1.06-1.06L9.06 8l2.6-2.6-1.06-1.06Z",
  ),
  star: icon(
    "M8 1.2 10.06 5.6 14.8 6.32l-3.44 3.42.82 4.86L8 12.3l-4.18 2.28.82-4.86L1.2 6.32 5.94 5.6 8 1.2Z",
  ),
  arrow: icon(
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM7.4 4.9 6.34 5.96 8.38 8l-2.04 2.04L7.4 11.1 10.5 8 7.4 4.9Z",
  ),
};

/**
 * Realigns the Sphinx theme with VS Code's built-in Markdown preview.
 *
 * The theme stylesheet still provides structure (tables, code, grids); this layer only
 * overrides the parts a reader compares side by side: typography, page gutters, the rule
 * under the top heading, figure captions, and admonition callouts.
 */
export const PREVIEW_THEME_CSS = `
:root {
  --sphinx-preview-font: var(--vscode-markdown-font-family, var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, sans-serif));
  --sphinx-preview-font-size: var(--vscode-markdown-font-size, 14px);
  --sphinx-preview-line-height: var(--vscode-markdown-line-height, 1.6);
  --sphinx-preview-content-max-width: ${DEFAULT_PREVIEW_CONTENT_WIDTH}px;
  /* Set by the runtime (toolbar Zoom - / +); text and column scale together. */
  --sphinx-preview-zoom: 1;
  --sphinx-preview-zoomed-font-size: calc(var(--sphinx-preview-font-size) * var(--sphinx-preview-zoom, 1));
  --sphinx-preview-column-width: calc(var(--sphinx-preview-content-max-width) * var(--sphinx-preview-zoom, 1));
  --sphinx-preview-controls-height: 116px;
  --sphinx-preview-content-gutter: clamp(16px, 8vw, 78px);
  --sphinx-preview-diff-addition: var(--vscode-charts-green, #2da44e);
  --sphinx-preview-diff-deletion: var(--vscode-charts-red, #cf222e);
  --sphinx-preview-scrollbar-thumb: var(--vscode-scrollbarSlider-background, rgba(128, 128, 128, 0.4));
  --sphinx-preview-scrollbar-hover: var(--vscode-scrollbarSlider-hoverBackground, rgba(128, 128, 128, 0.7));
}

body {
  --sphinx-preview-border: var(--vscode-widget-border, var(--vscode-panel-border, rgba(128, 128, 128, 0.35)));
}

* {
  scrollbar-color: var(--sphinx-preview-scrollbar-thumb) var(--vscode-editor-background, Canvas);
}

::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background: var(--vscode-editor-background, Canvas);
}

::-webkit-scrollbar-thumb {
  background: var(--sphinx-preview-scrollbar-thumb);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--sphinx-preview-scrollbar-hover);
}

html[data-sphinx-preview-theme-mode="dark"],
html[data-sphinx-preview-theme-mode="dark"] body {
  color-scheme: dark;
  --sphinx-preview-scrollbar-thumb: #686868;
  --sphinx-preview-scrollbar-hover: #9e9e9e;
  --vscode-editor-background: #1e1e1e;
  --vscode-editor-foreground: #d4d4d4;
  --vscode-foreground: #d4d4d4;
  --vscode-editorWidget-background: #252526;
  --vscode-editorWidget-border: #454545;
  --vscode-icon-foreground: #d4d4d4;
  --vscode-toolbar-hoverBackground: rgba(255, 255, 255, 0.1);
  --vscode-input-background: #3c3c3c;
  --vscode-input-foreground: #d4d4d4;
  --vscode-input-border: #454545;
  --vscode-button-background: #0e639c;
  --vscode-button-foreground: #ffffff;
  --vscode-errorForeground: #f48771;
  --vscode-descriptionForeground: #9d9d9d;
  --vscode-textLink-foreground: #3794ff;
  --vscode-focusBorder: #007fd4;
  --vscode-editor-findMatchHighlightBackground: #ea5c0055;
  --vscode-list-hoverBackground: rgba(255, 255, 255, 0.1);
  --vscode-widget-border: #454545;
  --vscode-editorHoverWidget-background: #252526;
  --vscode-editorHoverWidget-foreground: #d4d4d4;
  --vscode-editorHoverWidget-border: #454545;
  --vscode-panel-border: #454545;
  --vscode-textBlockQuote-background: #292929;
  --vscode-textCodeBlock-background: #292929;
  --vscode-button-secondaryBackground: #3a3d41;
  --vscode-button-secondaryForeground: #d4d4d4;
  --vscode-charts-blue: #75beff;
  --vscode-charts-green: #89d185;
  --vscode-charts-purple: #d3a0ff;
  --vscode-charts-yellow: #e2c08d;
  --vscode-charts-red: #f48771;
  --vscode-charts-orange: #d18616;
}

html[data-sphinx-preview-theme-mode="white"],
html[data-sphinx-preview-theme-mode="white"] body {
  color-scheme: light;
  --sphinx-preview-scrollbar-thumb: #b3b3b3;
  --sphinx-preview-scrollbar-hover: #808080;
  --vscode-editor-background: #ffffff;
  --vscode-editor-foreground: #1f1f1f;
  --vscode-foreground: #1f1f1f;
  --vscode-editorWidget-background: #f3f3f3;
  --vscode-editorWidget-border: #c8c8c8;
  --vscode-icon-foreground: #333333;
  --vscode-toolbar-hoverBackground: rgba(0, 0, 0, 0.08);
  --vscode-input-background: #ffffff;
  --vscode-input-foreground: #1f1f1f;
  --vscode-input-border: #c8c8c8;
  --vscode-button-background: #005fb8;
  --vscode-button-foreground: #ffffff;
  --vscode-errorForeground: #b5200d;
  --vscode-descriptionForeground: #5f5f5f;
  --vscode-textLink-foreground: #006ab1;
  --vscode-focusBorder: #005fb8;
  --vscode-editor-findMatchHighlightBackground: #ffdf5d80;
  --vscode-list-hoverBackground: rgba(0, 0, 0, 0.08);
  --vscode-widget-border: #c8c8c8;
  --vscode-editorHoverWidget-background: #f3f3f3;
  --vscode-editorHoverWidget-foreground: #1f1f1f;
  --vscode-editorHoverWidget-border: #c8c8c8;
  --vscode-panel-border: #e5e5e5;
  --vscode-textBlockQuote-background: #f3f3f3;
  --vscode-textCodeBlock-background: #f0f0f0;
  --vscode-button-secondaryBackground: #ededed;
  --vscode-button-secondaryForeground: #333333;
  --vscode-charts-blue: #005fb8;
  --vscode-charts-green: #16825d;
  --vscode-charts-purple: #652d90;
  --vscode-charts-yellow: #8f6100;
  --vscode-charts-red: #b5200d;
  --vscode-charts-orange: #a65e00;
}

html[data-sphinx-preview-theme-mode="cream"],
html[data-sphinx-preview-theme-mode="cream"] body {
  color-scheme: light;
  --sphinx-preview-scrollbar-thumb: #cfc5b2;
  --sphinx-preview-scrollbar-hover: #a89d89;
  --vscode-editor-background: #f5f1e8;
  --vscode-editor-foreground: #2b2a27;
  --vscode-foreground: #2b2a27;
  --vscode-descriptionForeground: #5e5850;
  --vscode-textLink-foreground: #a14e32;
  --vscode-focusBorder: #b05a3c;
  --vscode-editor-findMatchHighlightBackground: #e6c36a80;
  --vscode-list-hoverBackground: rgba(43, 42, 39, 0.07);
  --vscode-widget-border: #d6cdbd;
  --vscode-editorWidget-background: #fbf8f1;
  --vscode-editorWidget-border: #d6cdbd;
  --vscode-editorHoverWidget-background: #ede6da;
  --vscode-editorHoverWidget-foreground: #2b2a27;
  --vscode-editorHoverWidget-border: #d6cdbd;
  --vscode-panel-border: #e2dacb;
  --vscode-textBlockQuote-background: #efe9dd;
  --vscode-textCodeBlock-background: #ede6da;
  --vscode-icon-foreground: #4a463d;
  --vscode-toolbar-hoverBackground: rgba(43, 42, 39, 0.09);
  --vscode-input-background: #fbf8f1;
  --vscode-input-foreground: #2b2a27;
  --vscode-input-border: #cfc5b2;
  --vscode-button-background: #9a4a2a;
  --vscode-button-foreground: #ffffff;
  --vscode-button-secondaryBackground: #e8e0d2;
  --vscode-button-secondaryForeground: #3a372f;
  --vscode-errorForeground: #b3261e;
  --vscode-charts-blue: #2f6690;
  --vscode-charts-green: #34703f;
  --vscode-charts-purple: #6b4a8a;
  --vscode-charts-yellow: #7d5500;
  --vscode-charts-red: #ae3a2a;
  --vscode-charts-orange: #94500c;
}

[data-sphinx-preview-toolbar] {
  position: fixed;
  inset-block-start: 12px;
  inset-inline-end: 14px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 14px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-icon-foreground, var(--vscode-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
}

[data-sphinx-preview-toolbar-row] {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Shown by the runtime when a render stays pending; fixed and pointer-transparent, so no content moves. */
[data-sphinx-preview-pending-overlay] {
  position: fixed;
  inset-block-start: 96px;
  inset-inline-end: 14px;
  z-index: 1099;
  box-sizing: border-box;
  max-width: min(320px, calc(100vw - 28px));
  padding: 6px 10px;
  border: 1px solid var(--vscode-editorWidget-border, var(--sphinx-preview-border));
  border-radius: 6px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-foreground, var(--vscode-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
}

[data-sphinx-preview-pending-overlay] > strong,
[data-sphinx-preview-pending-overlay] > span {
  display: block;
  overflow-wrap: anywhere;
}

[data-sphinx-preview-toolbar] button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

[data-sphinx-preview-toolbar] button:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

[data-sphinx-preview-toolbar] button[aria-pressed="true"] {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

[data-sphinx-preview-toolbar] button[aria-pressed="true"]:focus-visible {
  outline: none;
}

[data-sphinx-preview-toolbar] button > svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

[data-sphinx-preview-code-copy] {
  position: fixed;
  z-index: 1050;
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.45));
  border-radius: 4px;
  background: var(--vscode-editorWidget-background, #252526);
  color: var(--vscode-icon-foreground, var(--vscode-editor-foreground, inherit));
  cursor: pointer;
}

[data-sphinx-preview-code-copy][hidden] {
  display: none;
}

[data-sphinx-preview-code-copy]:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

[data-sphinx-preview-code-copy] > svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

[data-sphinx-preview-toolbar] button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

[data-sphinx-preview-toolbar] button[data-tooltip],
.sphinx-preview-table-menu button[data-tooltip] {
  position: relative;
}

[data-sphinx-preview-toolbar] button[data-tooltip]::after,
.sphinx-preview-table-menu button[data-tooltip]::after {
  position: absolute;
  inset-block-start: calc(100% + 8px);
  inset-inline-start: 50%;
  z-index: 1300;
  width: max-content;
  max-width: min(240px, calc(100vw - 16px));
  padding: 5px 8px;
  border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-widget-border, currentColor));
  border-radius: 4px;
  background: var(--vscode-editorHoverWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-editorHoverWidget-foreground, var(--vscode-editor-foreground, CanvasText));
  content: attr(data-tooltip);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.3;
  text-align: start;
  white-space: normal;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -3px);
  transition: opacity 100ms ease, transform 100ms ease;
}

[data-sphinx-preview-toolbar] button[data-tooltip]::after {
  inset-inline-start: auto;
  inset-inline-end: 0;
  transform: none;
}

[data-sphinx-preview-toolbar] button[data-tooltip]:hover::after,
[data-sphinx-preview-toolbar] button[data-tooltip]:focus-visible::after {
  transform: none;
}

.sphinx-preview-table-menu button[data-tooltip]::after,
.sphinx-preview-table-menu button[data-tooltip]:hover::after,
.sphinx-preview-table-menu button[data-tooltip]:focus-visible::after {
  position: fixed;
  inset-block-start: var(--sphinx-preview-controls-height);
  inset-inline-start: 8px;
  transform: none;
}

[data-sphinx-preview-toolbar] button[data-tooltip]:hover::after,
[data-sphinx-preview-toolbar] button[data-tooltip]:focus-visible::after,
.sphinx-preview-table-menu button[data-tooltip]:hover::after,
.sphinx-preview-table-menu button[data-tooltip]:focus-visible::after {
  visibility: visible;
  opacity: 1;
  transform: translate(-50%, 0);
}

/* Fixed, out of flow: showing or resizing the band never moves the content (scroll anchoring R8). */
[data-sphinx-preview-sticky-headings] {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  z-index: 999;
  box-sizing: border-box;
  width: 100%;
  max-width: calc(100% - var(--sphinx-preview-toc-reserve, 0px));
  margin: 0;
  padding-block: 0 4px;
  padding-inline: max(var(--sphinx-preview-content-gutter), calc((100% - var(--sphinx-preview-toc-reserve, 0px) - var(--sphinx-preview-column-width)) / 2 + var(--sphinx-preview-content-gutter)));
  padding-inline-end: max(var(--sphinx-preview-content-gutter), calc((100% - var(--sphinx-preview-toc-reserve, 0px) - var(--sphinx-preview-column-width)) / 2 + var(--sphinx-preview-content-gutter)), calc(var(--sphinx-preview-toolbar-width, 0px) - var(--sphinx-preview-toc-reserve, 0px)));
  border: 0;
  border-bottom: 1px solid var(--sphinx-preview-border);
  border-radius: 0;
  background: var(--vscode-editor-background, Canvas);
  color: var(--vscode-editor-foreground, CanvasText);
  font-family: var(--sphinx-preview-font);
  font-size: calc(var(--sphinx-preview-zoomed-font-size) + 2px);
  font-weight: 700;
  line-height: var(--sphinx-preview-line-height);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  pointer-events: none;
}

/* The runtime owns scroll anchoring; browser scroll anchoring would fight it. */
html,
body {
  overflow-anchor: none;
}

[data-sphinx-preview-sticky-headings][hidden] {
  display: none;
}

html[data-sphinx-preview-edit-mode="on"] [data-sphinx-source-file][data-sphinx-source-line] {
  cursor: text;
}

[data-sphinx-preview-editing="true"] {
  display: none !important;
}

html[data-sphinx-preview-edit-mode="on"] [data-sphinx-preview-edit-hover="true"] {
  outline: 1px dashed var(--vscode-focusBorder, Highlight);
  outline-offset: 3px;
}

.sphinx-preview-insert-point {
  position: relative;
  height: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

html:not([data-sphinx-preview-edit-mode="on"]) .sphinx-preview-insert-point {
  display: none;
}

.sphinx-preview-insert-point button {
  position: absolute;
  left: -1.6em;
  top: -0.8em;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 1.4em;
  height: 1.4em;
  padding: 0;
  border: 1px solid var(--vscode-focusBorder, Highlight);
  border-radius: 50%;
  background: var(--vscode-button-background, Highlight);
  color: var(--vscode-button-foreground, HighlightText);
  font: inherit;
  font-size: 0.9em;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
}

[data-sphinx-source-line]:hover + .sphinx-preview-insert-point button,
.sphinx-preview-insert-point button:hover,
.sphinx-preview-insert-point button:focus-visible {
  opacity: 1;
}

.sphinx-preview-insert-point--start {
  height: auto;
  margin: 0 0 1em;
}

.sphinx-preview-insert-point--start button {
  position: static;
  display: inline-flex;
  width: auto;
  height: auto;
  padding: 4px 12px;
  border-radius: 3px;
  font-size: 1em;
  opacity: 1;
}

.sphinx-preview-block-editor {
  position: relative;
  z-index: 1;
  margin: 0;
  border: 1px solid var(--vscode-focusBorder, Highlight);
  border-radius: 4px;
  padding: 6px 8px;
  background: var(--vscode-editor-background, Canvas);
  color: inherit;
}

.sphinx-preview-table-cell-editor textarea,
.sphinx-preview-block-editor textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 1.5em;
  max-height: none;
  resize: none;
  padding: 0;
  border: 0;
  border-radius: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: calc(var(--vscode-editor-font-size, 0.95em) - 1px);
  tab-size: 4;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
}

.sphinx-preview-block-editor [data-sphinx-preview-edit-status]:empty {
  display: none;
}

.sphinx-preview-block-editor-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  margin-block-start: 8px;
}

.sphinx-preview-block-editor-buttons {
  display: flex;
  flex: none;
  gap: 6px;
  margin-inline-start: auto;
}

/* The id selector beats the "#sphinx-myst-preview-content p" rule, whose bottom margin pushed the text up. */
#sphinx-myst-preview-content .sphinx-preview-block-editor .sphinx-preview-block-editor-actions [data-sphinx-preview-edit-status] {
  flex: 1 1 14em;
  align-self: center;
  min-width: 0;
  margin: 0;
  font-size: 0.75em;
  line-height: 1.4;
}

.sphinx-preview-block-editor-buttons button {
  min-width: 64px;
  padding: 4px 10px;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 3px;
  background: var(--vscode-button-secondaryBackground, ButtonFace);
  color: var(--vscode-button-secondaryForeground, ButtonText);
  cursor: pointer;
}

.sphinx-preview-block-editor-buttons button:first-child {
  border-color: transparent;
  background: var(--vscode-button-background, Highlight);
  color: var(--vscode-button-foreground, HighlightText);
}

.sphinx-preview-block-editor [data-sphinx-preview-edit-status] {
  margin: 6px 0 0;
  color: var(--vscode-descriptionForeground, GrayText);
  font-size: 0.75em;
}

[data-sphinx-preview-table-cell-selected="true"] {
  position: relative;
  z-index: 2;
}

/* The rendered cell content keeps its width (so columns do not move) but no height: the editor
   below is in the flow and the cell grows with the field and its buttons. */
[data-sphinx-table-cell-content="true"] {
  display: block;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}

/* contain: inline-size keeps the editor out of the column width calculation. */
.sphinx-preview-table-cell-editor {
  position: relative;
  z-index: 3;
  display: block;
  contain: inline-size;
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--vscode-editor-foreground, CanvasText);
}

/* Font family, size and line-height come from the block editor rule above. */
.sphinx-preview-table-cell-editor textarea {
  height: auto;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--vscode-editor-foreground, CanvasText);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
  resize: none;
}

.sphinx-preview-table-cell-editor .sphinx-preview-block-editor-actions {
  margin-block-start: 4px;
  gap: 4px;
}

.sphinx-preview-table-cell-editor .sphinx-preview-block-editor-buttons {
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  margin-inline-start: 0;
}

.sphinx-preview-table-cell-editor .sphinx-preview-block-editor-buttons button {
  min-width: 0;
  max-width: 100%;
  padding: 1px 6px;
  overflow: hidden;
  font-size: 0.8em;
  line-height: 1.4;
}

.sphinx-preview-table-menu {
  position: static;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin: 0 0 6px;
  padding: 3px;
  width: max-content;
  max-width: 100%;
  border: 1px solid var(--vscode-widget-border, var(--sphinx-preview-border));
  border-radius: 18px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-icon-foreground, var(--vscode-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
}

.sphinx-preview-table-menu button {
  display: inline-flex;
  align-items: center;
  width: auto;
  height: 30px;
  min-height: 30px;
  gap: 4px;
  padding: 0 8px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  font-size: 0.85em;
  cursor: pointer;
}

.sphinx-preview-table-menu button:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-table-menu button:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, Highlight);
  outline-offset: -2px;
}

.sphinx-preview-table-menu button > svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.sphinx-preview-table-menu [data-sphinx-table-group="column"] {
  position: relative;
  margin-inline-start: 4px;
}

.sphinx-preview-table-menu [data-sphinx-table-group="column"]::before {
  position: absolute;
  inset-block: 6px;
  inset-inline-start: -4px;
  width: 1px;
  background: var(--sphinx-preview-border);
  content: "";
}

/* The id selector beats the paragraph margin, which would push the text above the buttons' centre. */
#sphinx-myst-preview-content .sphinx-preview-table-menu [data-sphinx-preview-edit-status] {
  align-self: center;
  margin: 0 4px;
  line-height: 1.2;
  color: var(--vscode-descriptionForeground, GrayText);
  font-size: 0.85em;
}

.sphinx-preview-table-menu [data-sphinx-preview-edit-status]:empty {
  display: none;
}

.sphinx-preview-table-menu button:disabled {
  cursor: default;
  opacity: 0.55;
}

/* Edition palette: the pill bar above an open block editor, first child of the editor frame. */
.sphinx-preview-edit-palette {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  box-sizing: border-box;
  width: max-content;
  max-width: 100%;
  margin: 0 0 6px;
  padding: 3px;
  border: 1px solid var(--vscode-widget-border, var(--sphinx-preview-border));
  border-radius: 18px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-icon-foreground, var(--vscode-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
  font-family: var(--vscode-font-family, system-ui, sans-serif);
  line-height: 1.2;
}

.sphinx-preview-edit-palette > select.sphinx-preview-edit-palette-mode {
  flex-shrink: 0;
  box-sizing: border-box;
  height: 26px;
  margin-inline: 2px 6px;
  padding: 0 4px;
  border: 1px solid var(--vscode-dropdown-border, var(--sphinx-preview-border));
  border-radius: 13px;
  background: var(--vscode-dropdown-background, transparent);
  color: var(--vscode-dropdown-foreground, inherit);
  font: inherit;
  font-size: 0.8em;
  cursor: pointer;
}

.sphinx-preview-edit-palette > button {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 30px;
  height: 30px;
  min-height: 30px;
  gap: 2px;
  padding: 0 7px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  font-size: 0.85em;
  cursor: pointer;
}

.sphinx-preview-edit-palette > button:hover,
.sphinx-preview-edit-palette-menu > button:hover,
.sphinx-preview-edit-palette-menu > button[data-active="true"] {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-edit-palette > button:active {
  background: var(--vscode-toolbar-activeBackground, rgba(128, 128, 128, 0.35));
}

.sphinx-preview-edit-palette > button[aria-expanded="true"] {
  background: var(--vscode-toolbar-activeBackground, rgba(128, 128, 128, 0.35));
}

.sphinx-preview-edit-palette > button[data-edit-group-start="true"] {
  margin-inline-start: 4px;
}

.sphinx-preview-edit-palette > button[data-edit-group-start="true"]::before {
  position: absolute;
  inset-block: 6px;
  inset-inline-start: -4px;
  width: 1px;
  background: var(--sphinx-preview-border);
  content: "";
}

.sphinx-preview-edit-palette > button > svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.sphinx-preview-edit-palette > button > svg.sphinx-preview-edit-palette-caret {
  width: 10px;
  height: 10px;
}

.sphinx-preview-edit-palette-glyph {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.15em;
  line-height: 1;
}

.sphinx-preview-edit-palette-glyph[data-glyph="bold"] {
  font-weight: 800;
}

.sphinx-preview-edit-palette-glyph[data-glyph="italic"] {
  font-style: italic;
}

.sphinx-preview-edit-palette-glyph[data-glyph="strikethrough"] {
  text-decoration: line-through;
}

.sphinx-preview-edit-palette-menu {
  position: absolute;
  inset-block-start: calc(100% + 4px);
  inset-inline-start: 0;
  z-index: 1300;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 9em;
  max-width: 100%;
  max-height: 15em;
  overflow-y: auto;
  padding: 3px;
  border: 1px solid var(--vscode-widget-border, var(--sphinx-preview-border));
  border-radius: 8px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-editor-foreground, CanvasText);
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.25);
}

.sphinx-preview-edit-palette-menu[data-edit-popover-at="caret"] {
  max-width: none;
}

.sphinx-preview-edit-palette-menu > button {
  display: block;
  flex: none;
  width: 100%;
  padding: 4px 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font-size: 0.85em;
  text-align: start;
  white-space: nowrap;
  cursor: pointer;
}

/* Size grid of the Table button: 9 x 9 cells, the hovered rectangle from the top left is lit. */
.sphinx-preview-edit-palette-menu[data-edit-popover="grid"] {
  min-width: 0;
  padding: 6px;
  overflow: visible;
}

.sphinx-preview-edit-grid {
  display: grid;
  grid-template-columns: repeat(9, 16px);
  gap: 2px;
}

.sphinx-preview-edit-grid-cell {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
}

.sphinx-preview-edit-grid-cell[data-grid-on="true"] {
  border-color: var(--vscode-focusBorder, #007fd4);
  background: color-mix(in srgb, var(--vscode-focusBorder, #007fd4) 45%, transparent);
}

.sphinx-preview-edit-grid-label {
  margin-top: 5px;
  font-size: 0.8em;
  text-align: center;
  color: var(--vscode-descriptionForeground, inherit);
}

/* Emoji picker: filter field and categories as button grids, inside the frame. */
.sphinx-preview-edit-palette-menu[data-edit-popover="emoji"] {
  width: 19em;
  max-height: 18em;
  padding: 6px;
  overflow: hidden;
}

.sphinx-preview-edit-emoji-filter {
  box-sizing: border-box;
  flex: none;
  width: 100%;
  margin: 0 0 4px;
  padding: 3px 6px;
  border: 1px solid var(--vscode-input-border, var(--sphinx-preview-border));
  border-radius: 5px;
  background: var(--vscode-input-background, transparent);
  color: var(--vscode-input-foreground, inherit);
  font: inherit;
  font-size: 0.85em;
}

.sphinx-preview-edit-emoji-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.sphinx-preview-edit-emoji-heading {
  margin: 4px 2px 2px;
  font-size: 0.72em;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground, inherit);
}

.sphinx-preview-edit-emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 1px;
}

.sphinx-preview-edit-emoji-grid > button {
  padding: 2px 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font-size: 1.15em;
  line-height: 1.4;
  cursor: pointer;
}

.sphinx-preview-edit-emoji-grid > button:hover,
.sphinx-preview-edit-emoji-grid > button:focus-visible {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-edit-emoji-grid > button[hidden],
.sphinx-preview-edit-emoji-heading[hidden] {
  display: none;
}

/* Link panel: Text and URL fields under the palette, in the flow of the editor frame. */
.sphinx-preview-link-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 6px 8px;
  box-sizing: border-box;
  width: max-content;
  max-width: 100%;
  margin: 0 0 6px;
  padding: 6px 8px;
  border: 1px solid var(--vscode-widget-border, var(--sphinx-preview-border));
  border-radius: 8px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-editor-foreground, CanvasText);
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
  font-family: var(--vscode-font-family, system-ui, sans-serif);
  font-size: 0.85em;
}

.sphinx-preview-link-panel-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sphinx-preview-link-panel-row > input {
  box-sizing: border-box;
  width: 16em;
  max-width: 100%;
  padding: 3px 6px;
  border: 1px solid var(--vscode-input-border, var(--sphinx-preview-border));
  border-radius: 4px;
  background: var(--vscode-input-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-input-foreground, var(--vscode-editor-foreground, CanvasText));
  font: inherit;
}

.sphinx-preview-link-panel-row > input:focus {
  outline: 1px solid var(--vscode-focusBorder, Highlight);
  outline-offset: -1px;
}

.sphinx-preview-link-panel-actions {
  display: flex;
  gap: 4px;
}

.sphinx-preview-link-panel-actions > button {
  padding: 3px 10px;
  border: 1px solid var(--vscode-button-border, var(--sphinx-preview-border));
  border-radius: 4px;
  background: var(--vscode-button-secondaryBackground, transparent);
  color: var(--vscode-button-secondaryForeground, inherit);
  font: inherit;
  cursor: pointer;
}

.sphinx-preview-link-panel-actions > button[data-link-action="insert"] {
  background: var(--vscode-button-background, Highlight);
  color: var(--vscode-button-foreground, HighlightText);
}

.sphinx-preview-link-panel-actions > button:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, Highlight);
  outline-offset: 1px;
}

.sphinx-preview-frontmatter-menu {
  position: static;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  width: auto;
  max-width: 100%;
  margin: 4px 0 0;
  padding: 3px;
  overflow: visible;
  border: 1px solid var(--vscode-widget-border, var(--sphinx-preview-border));
  border-radius: 18px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-icon-foreground, var(--vscode-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
}

.sphinx-preview-frontmatter-menu button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: auto;
  height: 30px;
  min-height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.sphinx-preview-frontmatter-menu button:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-frontmatter-menu button:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, Highlight);
  outline-offset: -2px;
}

.sphinx-preview-frontmatter-menu button > svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.sphinx-preview-frontmatter-menu button:disabled {
  cursor: default;
  opacity: 0.55;
}

.sphinx-preview-frontmatter-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: 4px;
  padding-inline-start: 4px;
  border-inline-start: 1px solid var(--sphinx-preview-border);
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
}

.sphinx-preview-frontmatter-menu button > .sphinx-preview-frontmatter-menu-label {
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.sphinx-preview-frontmatter-picker[hidden] {
  display: none;
}

.sphinx-preview-frontmatter-picker select,
.sphinx-preview-frontmatter-picker input {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  height: 30px;
  padding: 2px 6px;
  border: 1px solid var(--vscode-input-border, var(--sphinx-preview-border));
  border-radius: 3px;
  background: var(--vscode-input-background, var(--vscode-editor-background, Canvas));
  color: var(--vscode-input-foreground, var(--vscode-editor-foreground, CanvasText));
  font: inherit;
}

[data-okf-frontmatter-editor] > select[data-okf-empty-select="true"] {
  color: var(--vscode-descriptionForeground, GrayText);
}

html[data-sphinx-preview-edit-mode="on"] [data-okf-edit-cell] {
  cursor: pointer;
}

html[data-sphinx-preview-edit-mode="on"] [data-okf-edit-cell]:hover {
  background: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.12));
}

html[data-sphinx-preview-edit-mode="on"] [data-okf-edit-cell]:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, Highlight);
  outline-offset: -2px;
}

html[data-sphinx-preview-edit-mode="on"] [data-sphinx-preview-table-cell-selected="true"] {
  outline: 2px solid var(--vscode-focusBorder, Highlight);
  outline-offset: -2px;
}

[data-okf-frontmatter-editor] {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--vscode-editor-foreground, CanvasText);
}

[data-okf-editing="true"] {
  vertical-align: top;
}

[data-okf-key-editing="true"] {
  min-width: 0;
}

[data-okf-key-editing="true"] > .okf-name-cell,
[data-okf-editing="true"] > [data-okf-value-display] {
  display: none !important;
}

[data-okf-frontmatter-editor] > input[list],
[data-okf-frontmatter-editor] > input:not([type="checkbox"]),
[data-okf-frontmatter-editor] > select,
[data-okf-frontmatter-editor] > textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 2px 4px;
  border: 0;
  border-radius: 0;
  outline: none;
  background: transparent;
  color: var(--vscode-editor-foreground, CanvasText);
  font: inherit;
}

[data-okf-frontmatter-editor] > input[type="checkbox"] {
  margin: 0;
}

.okf-value-checkbox {
  margin: 0;
  vertical-align: middle;
  accent-color: var(--vscode-checkbox-background, var(--vscode-focusBorder, currentColor));
}

.okf-boolean-value {
  margin-left: 0.35em;
  vertical-align: middle;
}

.okf-value-checkbox[aria-disabled="true"] {
  pointer-events: none;
}

.okf-list-editor {
  display: block;
  padding: 0.2em 0;
  font: inherit;
  line-height: inherit;
}

.okf-list-editor-items {
  display: grid;
  gap: 0.2em;
}

.okf-list-editor-item {
  position: relative;
  display: grid;
  grid-template-columns: 1.5em minmax(0, 1fr) 1.5em;
  align-items: center;
  gap: 0.4em;
  min-height: 1.8em;
  padding-inline: 0.2em;
}

.okf-list-editor-item[data-okf-list-dragging="true"] {
  opacity: 0.45;
}

.okf-list-editor-item[data-okf-list-drop]::after {
  position: absolute;
  inset-inline: 0;
  height: 2px;
  background: var(--vscode-focusBorder, Highlight);
  pointer-events: none;
  content: "";
}

.okf-list-editor-item[data-okf-list-drop="before"]::after {
  top: -0.1em;
}

.okf-list-editor-item[data-okf-list-drop="after"]::after {
  bottom: -0.1em;
}

.okf-list-editor-handle,
.okf-list-editor-remove,
.okf-list-editor-add {
  box-sizing: border-box;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--vscode-descriptionForeground, GrayText);
  font: inherit;
}

.okf-list-editor-null,
.okf-frontmatter-null {
  display: block;
  padding: 0.1em 0.25em;
  border: 0;
  background: transparent;
  color: var(--vscode-textLink-foreground, var(--vscode-descriptionForeground, GrayText));
  cursor: pointer;
  font: inherit;
  font-size: 0.88em;
  text-align: left;
  text-decoration: underline;
}

.okf-list-editor-null {
  margin: 0.1em 0 0 1.45em;
}

.okf-frontmatter-null {
  margin: 0.15em 0 0 0.25em;
}

.okf-list-editor-handle,
.okf-list-editor-remove {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 1.5em;
  height: 1.5em;
  padding: 0;
  cursor: grab;
}

.okf-list-editor-handle::before {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 5px 0 currentColor, 0 5px currentColor, 5px 5px currentColor,
    0 10px currentColor, 5px 10px currentColor;
  content: "";
}

.okf-list-editor-handle:active {
  cursor: grabbing;
}

.okf-list-editor-remove {
  cursor: pointer;
}

.okf-list-editor-remove::before,
.okf-list-editor-remove::after {
  position: absolute;
  width: 0.8em;
  height: 1px;
  background: currentColor;
  content: "";
}

.okf-list-editor-remove::before {
  transform: rotate(45deg);
}

.okf-list-editor-remove::after {
  transform: rotate(-45deg);
}

.okf-list-editor-handle:hover,
.okf-list-editor-remove:hover,
.okf-list-editor-add:hover,
.okf-list-editor-null:hover,
.okf-frontmatter-null:hover {
  color: var(--vscode-foreground, currentColor);
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.12));
}

.okf-list-editor-handle:focus-visible,
.okf-list-editor-remove:focus-visible,
.okf-list-editor-add:focus-visible,
.okf-list-editor-null:focus-visible,
.okf-frontmatter-null:focus-visible,
.okf-list-editor-input:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, Highlight);
  outline-offset: -1px;
}

.okf-list-editor-input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 1.8em;
  padding: 0.15em 0.35em;
  border: 1px solid var(--vscode-input-border, var(--sphinx-preview-border));
  border-radius: 2px;
  outline: none;
  background: var(--vscode-editor-background, Canvas);
  color: var(--vscode-editor-foreground, CanvasText);
  font: inherit;
  line-height: inherit;
}

.okf-list-editor-input:focus {
  border-color: var(--vscode-focusBorder, Highlight);
}

.okf-list-editor-add {
  margin: 0.25em 0 0 1.45em;
  padding: 0.1em 0.25em;
  color: var(--vscode-textLink-foreground, var(--vscode-descriptionForeground, GrayText));
  cursor: pointer;
  font-size: 0.88em;
  text-align: left;
}

.okf-list-editor [disabled] {
  cursor: default;
  opacity: 0.65;
}

[data-okf-frontmatter-key-status]:empty {
  display: none;
}

[data-okf-frontmatter-editor] > textarea {
  min-height: 1.6em;
  max-height: none;
  resize: none;
  font-family: var(--vscode-editor-font-family, monospace);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
}

[data-okf-frontmatter-editor] > textarea:not([data-okf-text-value]) {
  font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--vscode-editor-font-size, 0.95em);
  tab-size: 4;
}

[data-okf-frontmatter-editor] > textarea[data-okf-text-value] {
  font-family: inherit;
}

.sphinx-preview-frontmatter-editor [role="status"] {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.sphinx-preview-frontmatter-editor [role="status"][data-visible="true"] {
  position: static;
  width: auto;
  height: auto;
  margin: 4px 0 0;
  overflow: visible;
  clip-path: none;
  white-space: normal;
  color: var(--vscode-descriptionForeground, GrayText);
  font-size: 0.9em;
}

.sphinx-preview-frontmatter-editor [role="status"][data-visible="true"][data-state="error"] {
  display: flex;
  align-items: flex-start;
  gap: 0.4em;
  margin: 3px 0 0;
  padding: 3px 6px;
  border: 1px solid var(--vscode-inputValidation-errorBorder, rgba(190, 45, 45, 0.55));
  border-radius: 3px;
  background: var(--vscode-inputValidation-errorBackground, rgba(235, 80, 80, 0.12));
  color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground, #a12626));
  font-size: 0.78em;
  line-height: 1.3;
}

.sphinx-preview-frontmatter-editor [role="status"][data-visible="true"][data-state="error"]::before {
  content: "!";
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 1.25em;
  height: 1.25em;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 0.85em;
  font-weight: 700;
  line-height: 1;
}

.sphinx-preview-frontmatter-editor [role="status"][data-visible="true"][data-state="warning"] {
  color: var(--vscode-editorWarning-foreground, #bf8803);
  font-size: 0.78em;
  line-height: 1.3;
}

[data-sphinx-preview-theme-toggle] svg {
  display: none;
}

[data-sphinx-preview-theme-toggle][data-theme-mode="current"] [data-theme-icon="current"],
[data-sphinx-preview-theme-toggle][data-theme-mode="dark"] [data-theme-icon="dark"],
[data-sphinx-preview-theme-toggle][data-theme-mode="white"] [data-theme-icon="white"],
[data-sphinx-preview-theme-toggle][data-theme-mode="cream"] [data-theme-icon="cream"] {
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
    background: var(--vscode-editor-background, Canvas);
    color: var(--vscode-editor-foreground, CanvasText);
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
  box-shadow: inset 3px 0 0 var(--vscode-focusBorder, Highlight);
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
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.18));
}

nav[data-sphinx-preview-toc] [data-sphinx-preview-toc-empty] {
  margin: 0;
  padding: 3px 6px;
  opacity: 0.7;
}

/* Full width: no column limit. A large pixel width keeps the sticky band padding math valid. */
html[data-sphinx-preview-width="full"] {
  --sphinx-preview-column-width: 100000px;
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

/* The runtime lifts the column cap for a moment to read the natural width of a wide table. */
html[data-sphinx-preview-width="auto"] #sphinx-myst-preview-content > :where(table, .table-wrapper)[data-sphinx-preview-measuring] {
  max-width: none;
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
  color: var(--vscode-editor-foreground, CanvasText);
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

/*
 * The first-element gap: whatever opens the page starts 40px below the top. This is a margin on
 * the first child, not padding on the column, so the column's own top never moves. It follows
 * every rule above that sets a top margin (headings, the properties table, blocks).
 */
#sphinx-myst-preview-content > :first-child {
  margin-top: 40px;
}

#sphinx-myst-preview-content p,
#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor {
  margin: 0 0 1em;
}

/*
 * An open first-block editor, the Start writing button and a leading properties table (it has
 * clickable controls) add the runtime's clearance, measured
 * only where the floating toolbar and the column share horizontal space (0 otherwise).
 */
#sphinx-myst-preview-content > [data-okf-properties]:first-child,
#sphinx-myst-preview-content .sphinx-preview-block-editor--first,
#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor--first,
#sphinx-myst-preview-content .sphinx-preview-insert-point--first {
  margin-top: calc(40px + var(--sphinx-preview-first-clearance, 0px));
}

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
  accent-color: var(--vscode-focusBorder, #007fd4);
  cursor: pointer;
}

#sphinx-myst-preview-content input.myst-checkbox:disabled {
  cursor: default;
}

#sphinx-myst-preview-content input.myst-checkbox[aria-busy="true"] {
  cursor: progress;
}

#sphinx-myst-preview-content input.myst-checkbox:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, #007fd4);
  outline-offset: 2px;
}

/* Task list items show the checkbox in the bullet gutter, as GitHub does. */
#sphinx-myst-preview-content li.task-list-item {
  list-style: none;
}

#sphinx-myst-preview-content li.task-list-item > p:first-child > input.myst-checkbox:first-child {
  margin-inline-start: -1.4em;
}

/* Comment and TODO chips: gray for an HTML comment, green for TODO. The chip never changes the line
   height; the comment text lives in a hidden body that expansion reveals. */
#sphinx-myst-preview-content .okf-chip {
  display: inline-block;
  box-sizing: border-box;
  margin: 0 0.15em;
  padding: 0 0.5em;
  border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.4));
  border-radius: 0.75em;
  background: var(--vscode-editorWidget-background, rgba(128, 128, 128, 0.12));
  color: var(--vscode-descriptionForeground, #717171);
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 0.78em;
  font-weight: 600;
  line-height: 1.4;
  vertical-align: baseline;
  white-space: nowrap;
  cursor: pointer;
}

#sphinx-myst-preview-content .okf-chip--todo {
  border-color: var(--vscode-charts-green, #16825d);
  background: color-mix(in srgb, var(--vscode-charts-green, #16825d) 16%, transparent);
  color: var(--vscode-charts-green, #16825d);
}

#sphinx-myst-preview-content .okf-chip:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, #007fd4);
  outline-offset: 1px;
}

#sphinx-myst-preview-content div.okf-comment {
  margin: 0.4em 0;
  line-height: 1.4;
}

#sphinx-myst-preview-content .okf-comment-body[hidden] {
  display: none;
}

/* An opened comment reads like an admonition: accent bar, tinted panel and a title (Comment or
   TODO) taken from the comment kind. The text is a plain text node, so line breaks are kept. */
#sphinx-myst-preview-content .okf-comment > .okf-comment-body:not([hidden]) {
  --sphinx-preview-accent: var(--vscode-descriptionForeground, #717171);
  display: block;
  margin: 0.4em 0;
  padding: 0.6em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-inline-start: 4px solid var(--sphinx-preview-accent);
  background: var(--vscode-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  background: color-mix(in srgb, var(--sphinx-preview-accent) 14%, var(--vscode-editor-background, Canvas));
  color: var(--vscode-editor-foreground, CanvasText);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="todo"] > .okf-comment-body:not([hidden]) {
  --sphinx-preview-accent: var(--vscode-charts-green, #16825d);
}

#sphinx-myst-preview-content .okf-comment > .okf-comment-body:not([hidden])::before {
  content: "Comment";
  display: block;
  margin-bottom: 0.3em;
  color: var(--sphinx-preview-accent);
  font-weight: 600;
  white-space: normal;
}

#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="todo"] > .okf-comment-body:not([hidden])::before {
  content: "TODO";
}

/* Incoming-change mark: a green bar on the left edge of a block changed since the last commit,
   drawn inside the box so nothing moves. */
#sphinx-myst-preview-content [data-sphinx-preview-changed] {
  box-shadow: inset 3px 0 0 var(--vscode-editorGutter-addedBackground, #2ea043);
}

/* Toolbar Diff button off: the marks go away at once; the host stops sending ranges. */
html[data-sphinx-preview-incoming="off"] #sphinx-myst-preview-content [data-sphinx-preview-changed] {
  box-shadow: none;
}

/* preview.showIncomingChanges off: the Diff button is not offered. The markup stays the same. */
html[data-okf-incoming-changes="false"] [data-sphinx-preview-diff-toggle] {
  display: none;
}

/* preview.showComments off: the gray comment chips go away at once, without a new render. TODO
   chips stay. */
html[data-okf-show-comments="false"] #sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="comment"] {
  display: none;
}

#sphinx-myst-preview-content img {
  max-width: 100%;
  height: auto;
}

#sphinx-myst-preview-content figure {
  margin: 1.4em 0;
  text-align: center;
}

/* The MyST writer emits figure captions as a trailing paragraph, not a figcaption. */
#sphinx-myst-preview-content figcaption,
#sphinx-myst-preview-content figure > p:last-child {
  margin-top: 0.6em;
  margin-bottom: 0;
  color: var(--vscode-descriptionForeground, inherit);
  font-size: 0.9em;
  font-style: italic;
  text-align: center;
}

/* Admonitions: tinted panel with a thick accent bar, matching VS Code alert styling. */
#sphinx-myst-preview-content :where(.admonition, div[class*="admonition-"], .attention, .caution, .danger, .error, .hint, .important, .note, .seealso, .tip, .tips, .warning) {
  --sphinx-preview-accent: var(--vscode-textLink-foreground, #4488dd);
  --sphinx-preview-icon: ${ICONS.info};
  display: block;
  margin: 1.2em 0;
  padding: 0.85em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-inline-start: 4px solid var(--sphinx-preview-accent);
  /* Fallback first: themes without color-mix still get a panel distinct from the page. */
  background: var(--vscode-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  background: color-mix(in srgb, var(--sphinx-preview-accent) 14%, var(--vscode-editor-background, Canvas));
  color: var(--vscode-editor-foreground, CanvasText);
  overflow: auto;
}

#sphinx-myst-preview-content :where(.admonition, .attention, .caution, .danger, .error, .hint, .important, .note, .seealso, .tip, .tips, .warning) > :where(.admonition-title, p.admonition-title) {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0 0 0.5em;
  padding: 0;
  border: 0;
  background: none;
  color: var(--sphinx-preview-accent);
  font-weight: 600;
  font-size: 1em;
  line-height: var(--sphinx-preview-line-height);
}

/* The badge is a mask, not an image, so it takes the accent colour of its callout. */
#sphinx-myst-preview-content :where(.admonition-title, p.admonition-title)::before {
  content: "";
  flex: none;
  width: 1.05em;
  height: 1.05em;
  background-color: currentColor;
  -webkit-mask: var(--sphinx-preview-icon) no-repeat center / contain;
  mask: var(--sphinx-preview-icon) no-repeat center / contain;
}

#sphinx-myst-preview-content :where(.admonition, .attention, .caution, .danger, .error, .hint, .important, .note, .seealso, .tip, .tips, .warning) > :last-child {
  margin-bottom: 0;
}

#sphinx-myst-preview-content .admonition.simple {
  padding: 0.45em 0 0.45em 1em;
  border: 0;
  border-inline-start: 3px solid var(--sphinx-preview-accent);
  background: none;
  overflow: visible;
}

#sphinx-myst-preview-content .admonition.no-icon > :where(.admonition-title, p.admonition-title)::before {
  display: none;
}

#sphinx-myst-preview-content .note {
  --sphinx-preview-accent: var(--vscode-charts-blue, #3794ff);
}

#sphinx-myst-preview-content .seealso {
  --sphinx-preview-accent: var(--vscode-charts-blue, #3794ff);
  --sphinx-preview-icon: ${ICONS.arrow};
}

#sphinx-myst-preview-content :where(.tip, .tips, .hint, .versionadded) {
  --sphinx-preview-accent: var(--vscode-charts-green, #89d185);
  --sphinx-preview-icon: ${ICONS.bulb};
}

#sphinx-myst-preview-content .important {
  --sphinx-preview-accent: var(--vscode-charts-purple, #b180d7);
  --sphinx-preview-icon: ${ICONS.star};
}

#sphinx-myst-preview-content :where(.warning, .attention, .caution, .versionchanged) {
  --sphinx-preview-accent: var(--vscode-charts-yellow, #cca700);
  --sphinx-preview-icon: ${ICONS.triangle};
}

#sphinx-myst-preview-content :where(.danger, .error, .deprecated) {
  --sphinx-preview-accent: var(--vscode-charts-red, #f14c4c);
  --sphinx-preview-icon: ${ICONS.cross};
}

#sphinx-myst-preview-content blockquote {
  margin: 1em 0;
  padding: 0 1em;
  border-inline-start: 4px solid var(--sphinx-preview-border);
  color: var(--vscode-descriptionForeground, inherit);
}

/*
 * Structural styling for code, tables and rules.
 *
 * These used to come from the Sphinx theme stylesheet. The preview renders the buffer
 * on its own now, so the only stylesheet in the page is this one.
 */
#sphinx-myst-preview-content :where(code, pre, samp, kbd) {
  font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.92em;
}

/* A keyboard key (kbd element): a hairline cap derived from the text colour. */
#sphinx-myst-preview-content kbd {
  padding: 0.05em 0.4em;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  border-bottom-width: 2px;
  border-radius: 0.3em;
}

/*
 * Inline code is a quiet pill: a tint and a hairline derived from the text colour, so it sits on
 * any page colour (current theme, dark, white, cream) without a hard-coded box. Sizes are in em
 * so the span scales inside headings, and vertical padding never grows the line box.
 */
#sphinx-myst-preview-content :not(pre) > code {
  padding: 0.1em 0.35em;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.14);
  background: color-mix(in srgb, currentColor 8%, transparent);
  font-size: 0.875em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  overflow-wrap: break-word;
}

#sphinx-myst-preview-content :is(td, th) > code {
  padding: 0.05em 0.3em;
}

html[data-sphinx-preview-theme-mode="cream"] #sphinx-myst-preview-content :not(pre) > code,
html[data-sphinx-preview-theme-mode="white"] #sphinx-myst-preview-content :not(pre) > code {
  color: var(--vscode-textLink-foreground, #006ab1);
}

#sphinx-myst-preview-content pre {
  margin: 1em 0;
  padding: 0.9em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  background: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.15));
  color: var(--vscode-editor-foreground, inherit);
  overflow-x: auto;
  line-height: 1.45;
}

#sphinx-myst-preview-content pre > code {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  font-size: 1em;
  color: inherit;
  white-space: pre;
}

#sphinx-myst-preview-content pre.myst-code-block-diff {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

#sphinx-myst-preview-content .myst-code-filename {
  display: block;
  margin-bottom: 0.65em;
  color: var(--vscode-descriptionForeground, inherit);
  font-size: 0.85em;
  white-space: normal;
}

#sphinx-myst-preview-content .myst-code-line {
  position: relative;
  display: block;
  min-height: 1.45em;
}

#sphinx-myst-preview-content code[data-myst-line-numbers="true"] .myst-code-line {
  padding-inline-start: 4ch;
}

#sphinx-myst-preview-content code[data-myst-line-numbers="true"] .myst-code-line::before {
  position: absolute;
  inset-inline-start: 0;
  width: 3ch;
  color: var(--vscode-descriptionForeground, #808080);
  content: attr(data-line-number);
  text-align: end;
  user-select: none;
}

#sphinx-myst-preview-content .myst-code-line-emphasized {
  background: color-mix(in srgb, var(--vscode-editor-findMatchHighlightBackground, #ea5c0055) 35%, transparent);
}

#sphinx-myst-preview-content :where(.myst-diff-line-addition, .myst-diff-line-deletion) {
  box-sizing: border-box;
  width: 100%;
}

#sphinx-myst-preview-content .myst-diff-line-addition {
  border-inline-start: 3px solid var(--sphinx-preview-diff-addition);
  background: color-mix(in srgb, var(--sphinx-preview-diff-addition) 18%, transparent);
}

#sphinx-myst-preview-content .myst-diff-line-deletion {
  border-inline-start: 3px solid var(--sphinx-preview-diff-deletion);
  background: color-mix(in srgb, var(--sphinx-preview-diff-deletion) 18%, transparent);
}

#sphinx-myst-preview-content .myst-code-cell-output {
  margin: 0 0 1em;
  padding: 0.55em 0.8em;
  border-inline-start: 3px solid var(--vscode-descriptionForeground, #808080);
  background: var(--vscode-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  color: var(--vscode-descriptionForeground, inherit);
  font-style: italic;
}

#sphinx-myst-preview-content .myst-mermaid-diagram {
  min-height: 1.5em;
  overflow-x: auto;
  font-family: var(--vscode-editor-font-family, monospace);
  text-align: start;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .myst-mermaid-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
}

#sphinx-myst-preview-content details.myst-mermaid-source {
  margin-top: 0.75em;
  text-align: start;
}

#sphinx-myst-preview-content .myst-mermaid-source summary {
  color: var(--vscode-descriptionForeground, inherit);
  cursor: pointer;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-mermaid-error {
  color: var(--vscode-errorForeground, #f14c4c);
  font-style: italic;
}

#sphinx-myst-preview-content .myst-plantuml-diagram {
  min-height: 1.5em;
  overflow-x: auto;
  font-family: var(--vscode-editor-font-family, monospace);
  text-align: start;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .myst-plantuml-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
}

#sphinx-myst-preview-content details.myst-plantuml-source {
  margin-top: 0.75em;
  text-align: start;
}

#sphinx-myst-preview-content .myst-plantuml-source summary {
  color: var(--vscode-descriptionForeground, inherit);
  cursor: pointer;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-plantuml-error {
  color: var(--vscode-errorForeground, #f14c4c);
  font-style: italic;
}

html[data-sphinx-preview-theme-mode="white"] #sphinx-myst-preview-content pre > code.language-yaml,
html[data-sphinx-preview-theme-mode="white"] #sphinx-myst-preview-content pre > code.language-yaml *,
html[data-sphinx-preview-theme-mode="cream"] #sphinx-myst-preview-content pre > code.language-yaml,
html[data-sphinx-preview-theme-mode="cream"] #sphinx-myst-preview-content pre > code.language-yaml * {
  color: var(--vscode-textLink-foreground, #006ab1);
}

/*
 * Syntax highlighting tokens emitted by highlight.js.
 *
 * A webview cannot read the editor's TextMate token colours, so the palette is built from
 * the chart colours instead: those are defined by every theme and already track light and
 * dark variants.
 */
#sphinx-myst-preview-content :where(.hljs-comment, .hljs-quote) {
  color: var(--vscode-descriptionForeground, #808080);
  font-style: italic;
}

#sphinx-myst-preview-content :where(.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-type, .hljs-built_in, .hljs-name, .hljs-tag) {
  color: var(--vscode-charts-blue, #3794ff);
}

#sphinx-myst-preview-content :where(.hljs-string, .hljs-meta .hljs-string, .hljs-regexp, .hljs-char.escape_, .hljs-selector-attr, .hljs-selector-pseudo) {
  color: var(--vscode-charts-orange, #d18616);
}

#sphinx-myst-preview-content :where(.hljs-number, .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-addition) {
  color: var(--vscode-charts-green, #89d185);
}

#sphinx-myst-preview-content :where(.hljs-title, .hljs-title.function_, .hljs-title.class_, .hljs-section, .hljs-doctag, .hljs-meta, .hljs-meta .hljs-keyword) {
  color: var(--vscode-charts-purple, #b180d7);
}

#sphinx-myst-preview-content :where(.hljs-attr, .hljs-attribute, .hljs-property, .hljs-variable, .hljs-template-variable, .hljs-params, .hljs-selector-id, .hljs-selector-class) {
  color: var(--vscode-charts-yellow, #cca700);
}

#sphinx-myst-preview-content :where(.hljs-deletion, .hljs-formula) {
  color: var(--vscode-charts-red, #f14c4c);
}

#sphinx-myst-preview-content .hljs-emphasis { font-style: italic; }
#sphinx-myst-preview-content .hljs-strong { font-weight: 600; }

@media (forced-colors: active) {
  #sphinx-myst-preview-content .myst-diff-line-addition {
    border-inline-start-color: Highlight;
    background: Highlight;
    color: HighlightText;
  }

  #sphinx-myst-preview-content .myst-diff-line-deletion {
    border-inline-start-color: Mark;
    background: Mark;
    color: MarkText;
  }

  #sphinx-myst-preview-content :where(.myst-diff-line-addition, .myst-diff-line-deletion) :where(*) {
    color: inherit;
  }
}

/* A wide table scrolls inside its own box instead of widening the whole preview. */
#sphinx-myst-preview-content :where(table, .table-wrapper) {
  display: block;
  width: max-content;
  max-width: 100%;
  margin: 1.2em 0;
  border-collapse: collapse;
  overflow-x: auto;
}

/* A table that scrolls sideways keeps short identifiers whole and shades the overflow edges. */
#sphinx-myst-preview-content table[data-sphinx-table-overflow="true"] :where(th, td)[data-sphinx-short-cell="true"] {
  white-space: nowrap;
}

#sphinx-myst-preview-content table[data-sphinx-table-overflow="true"] {
  background:
    linear-gradient(to right, var(--vscode-editor-background, Canvas) 30%, transparent) left center / 2rem 100% no-repeat local,
    linear-gradient(to left, var(--vscode-editor-background, Canvas) 30%, transparent) right center / 2rem 100% no-repeat local,
    radial-gradient(farthest-side at 0 50%, color-mix(in srgb, var(--vscode-editor-foreground, var(--vscode-foreground, CanvasText)) 35%, transparent), transparent) left center / 1rem 100% no-repeat scroll,
    radial-gradient(farthest-side at 100% 50%, color-mix(in srgb, var(--vscode-editor-foreground, var(--vscode-foreground, CanvasText)) 35%, transparent), transparent) right center / 1rem 100% no-repeat scroll;
}

#sphinx-myst-preview-content :where(th, td) {
  padding: 0.4em 0.8em;
  border: 1px solid var(--sphinx-preview-border);
  text-align: start;
  vertical-align: top;
}

#sphinx-myst-preview-content th {
  background: var(--vscode-textBlockQuote-background, rgba(128, 128, 128, 0.12));
  font-weight: 600;
}

#sphinx-myst-preview-content :where(th, td)[align="left"] { text-align: left; }
#sphinx-myst-preview-content :where(th, td)[align="center"] { text-align: center; }
#sphinx-myst-preview-content :where(th, td)[align="right"] { text-align: right; }
#sphinx-myst-preview-content table[align="center"] { margin-inline: auto; }
#sphinx-myst-preview-content table[align="right"] {
  margin-inline-start: auto;
  margin-inline-end: 0;
}

#sphinx-myst-preview-content hr {
  height: 1px;
  margin: 2em 0;
  border: 0;
  background: var(--sphinx-preview-border);
}

#sphinx-myst-preview-content dt {
  margin-top: 1em;
  font-weight: 600;
}

#sphinx-myst-preview-content dd {
  margin: 0.3em 0 0 1.5em;
}

#sphinx-myst-preview-content :where(cite, .citation-reference, a.reference.internal) {
  font-style: normal;
}

/* Constructs that only a project-wide build can resolve, shown as inert placeholders. */
#sphinx-myst-preview-content .myst-unresolved {
  color: var(--vscode-descriptionForeground, inherit);
}

#sphinx-myst-preview-content .myst-notebook-output {
  display: inline-block;
  max-width: 100%;
  padding: 0.1em 0.3em;
  border: 1px dashed var(--sphinx-preview-border);
  overflow-wrap: anywhere;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-cite {
  padding: 0 0.15em;
  border-bottom: 1px dotted currentColor;
  cursor: help;
}

#sphinx-myst-preview-content .myst-directive {
  margin: 1.2em 0;
  padding: 0.6em 0.9em;
  border: 1px dashed var(--sphinx-preview-border);
  background: var(--vscode-textBlockQuote-background, rgba(128, 128, 128, 0.08));
}

#sphinx-myst-preview-content .myst-directive-name {
  margin: 0;
  font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-directive pre {
  margin: 0.5em 0 0;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content :where(.math-inline, .math-display) {
  font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
}

#sphinx-myst-preview-content .math-display {
  margin: 1em 0;
  text-align: center;
}

/* OKF frontmatter properties table (Obsidian-like, 2 or 3 columns). Lean:
   no outer border, no backgrounds, all cells transparent except the title.
   Id-scoped so it outranks the preview-wide :where() font reset above. */
#sphinx-myst-preview-content [data-okf-properties] .okf-properties td,
#sphinx-myst-preview-content [data-okf-properties] .okf-properties th {
  font-size: inherit;
  line-height: var(--sphinx-preview-line-height);
}

[data-okf-properties] .okf-properties-title {
  display: block;
  margin: 0.75em 0 0.5em;
  padding: 0;
  font-family: inherit;
  font-size: 1em;
  font-weight: 600;
  background: none;
  color: var(--vscode-descriptionForeground, #6e6e6e);
}

[data-okf-properties] [data-okf-badge] {
  margin-inline-start: 0.5em;
  font-size: 0.85em;
  font-weight: normal;
  color: inherit;
}

[data-okf-properties] button[data-okf-badge] {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.85em;
  font-weight: normal;
  color: inherit;
  cursor: pointer;
}

[data-okf-properties] [data-okf-badge]:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, currentColor);
  outline-offset: 2px;
}

#sphinx-myst-preview-content [data-okf-properties] [data-okf-issue-highlight="true"] {
  outline: 2px solid var(--vscode-errorForeground, #f14c4c);
  outline-offset: -2px;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-properties {
  display: table;
  width: 100%;
  border-collapse: collapse;
  background: none;
}

@media (max-width: 640px) {
  #sphinx-myst-preview-content,
  #sphinx-myst-preview-content [data-okf-properties] {
    min-width: 0;
    max-width: 100%;
  }

  #sphinx-myst-preview-content [data-okf-properties] .okf-properties {
    table-layout: fixed;
  }

  #sphinx-myst-preview-content [data-okf-properties] .okf-properties th,
  #sphinx-myst-preview-content [data-okf-properties] .okf-properties td,
  #sphinx-myst-preview-content [data-okf-properties] .okf-frontmatter-link,
  #sphinx-myst-preview-content [data-okf-properties] .okf-type-label {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  #sphinx-myst-preview-content [data-okf-properties] .okf-name-cell {
    min-width: 0;
    max-width: 100%;
    flex-wrap: wrap;
  }

  #sphinx-myst-preview-content [data-okf-properties] .okf-link-with-details {
    flex-wrap: wrap;
  }
}

[data-okf-properties] .okf-properties th {
  text-align: left;
  vertical-align: top;
  font-weight: 500;
  padding: 0.25em 0.5em;
  border: none;
  background: none;
}

[data-okf-properties] .okf-properties td {
  padding: 0.25em 0.5em;
  border: none;
  background: none;
}

[data-okf-properties] .okf-properties-docs th,
[data-okf-properties] .okf-properties-docs td.okf-doc {
  color: var(--vscode-descriptionForeground, inherit);
}

[data-okf-properties] .okf-properties-docs th {
  white-space: nowrap;
}

/* Description cells: smaller text than name/value, but a consistent header. */
#sphinx-myst-preview-content [data-okf-properties] td.okf-doc {
  font-size: 0.88em;
  line-height: 1.45;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-missing-required {
  margin: 0.5em 0 0;
  color: var(--vscode-errorForeground, #f14c4c);
  font-size: 0.9em;
  font-weight: 600;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-info-row.okf-error th {
  color: var(--vscode-errorForeground, #f14c4c);
  background: var(--vscode-inputValidation-errorBackground, rgba(235, 80, 80, 0.12));
  white-space: normal;
  overflow-wrap: anywhere;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-properties thead th {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--vscode-descriptionForeground, inherit);
  border-bottom: 1px solid var(--sphinx-preview-border);
  padding-bottom: 0.4em;
  background: rgba(128, 128, 128, 0.12);
}

#sphinx-myst-preview-content [data-okf-properties] .okf-properties thead th:last-child {
  /* Keep the header labels aligned with the shrunken description column. */
  font-size: 0.88em;
}

html[data-okf-descriptions-collapsed="true"] #sphinx-myst-preview-content [data-okf-properties] .okf-properties-docs thead th:last-child,
html[data-okf-descriptions-collapsed="true"] #sphinx-myst-preview-content [data-okf-properties] .okf-properties-docs tbody td.okf-doc {
  display: none;
}

[data-okf-properties] .okf-column-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
}

[data-okf-properties] .okf-description-restore {
  display: none;
}

html[data-okf-descriptions-collapsed="true"] [data-okf-properties] .okf-description-restore {
  display: inline-flex;
}

[data-okf-description-toggle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  vertical-align: middle;
}

[data-okf-description-toggle]:hover {
  background: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.12));
}

[data-okf-description-toggle] .okf-description-expand,
html[data-okf-descriptions-collapsed="true"] .okf-description-collapse {
  display: none;
}

html[data-okf-descriptions-collapsed="true"] [data-okf-description-toggle] .okf-description-expand {
  display: inline;
}

/* Type icon at the left of the name cell; a fixed-width slot keeps every
   field name vertically aligned even for unknown or missing types. */
#sphinx-myst-preview-content [data-okf-properties] .okf-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-type-label {
  color: var(--vscode-descriptionForeground, GrayText);
  font-size: 0.84em;
  font-weight: 400;
  white-space: nowrap;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-list-display {
  display: block;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-list-preview {
  display: grid;
  gap: 0.08em;
  margin: 0;
  padding: 0;
  list-style: none;
  font: inherit;
  line-height: inherit;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-list-preview li {
  position: relative;
  padding-inline-start: 1em;
  overflow-wrap: anywhere;
  font: inherit;
  line-height: inherit;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-list-preview li::before {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  color: var(--vscode-descriptionForeground, GrayText);
  content: "-";
  font-weight: 600;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-list-more,
#sphinx-myst-preview-content [data-okf-properties] .okf-list-empty {
  color: var(--vscode-descriptionForeground, GrayText);
  font-size: 0.88em;
}

.sphinx-preview-link-tooltip {
  position: fixed;
  z-index: 10000;
  box-sizing: border-box;
  width: max-content;
  max-width: min(480px, calc(100vw - 16px));
  padding: 8px 10px;
  border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-widget-border, #808080));
  border-radius: 3px;
  background: var(--vscode-editorHoverWidget-background, var(--vscode-editor-background, #f3f3f3));
  color: var(--vscode-editorHoverWidget-foreground, var(--vscode-editor-foreground, #333333));
  box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.2));
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: auto;
  pointer-events: none;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-frontmatter-link {
  border-bottom: 1px solid currentColor;
  cursor: pointer;
  text-decoration: none;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-with-details {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  min-width: 0;
  max-width: 100%;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-excerpt,
#sphinx-myst-preview-content [data-okf-properties] .okf-link-line {
  color: var(--vscode-descriptionForeground, GrayText);
  font-style: italic;
  font-size: 0.9em;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-line {
  flex: none;
  white-space: nowrap;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-excerpt {
  flex: 1;
  width: 0;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-invalid {
  border-bottom-style: wavy;
  color: var(--vscode-errorForeground, #f14c4c);
  cursor: help;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-unavailable {
  border-bottom-style: dotted;
  color: var(--vscode-descriptionForeground, GrayText);
  cursor: help;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-frontmatter-link.okf-link-pending {
  border-bottom: 0;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-pending-text {
  border-bottom: 1px solid currentColor;
  text-decoration: none;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-spinner {
  display: inline-block;
  width: 0.72em;
  height: 0.72em;
  margin-inline-start: 0.35em;
  border: 0.12em solid currentColor;
  border-inline-end-color: transparent;
  border-radius: 50%;
  vertical-align: -0.08em;
  animation: okf-link-spin 0.7s linear infinite;
  text-decoration: none;
}

@keyframes okf-link-spin {
  to { transform: rotate(360deg); }
}

#sphinx-myst-preview-content [data-okf-properties] .okf-frontmatter-link:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, currentColor);
  outline-offset: 2px;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-list-more {
  display: inline-block;
  margin-top: 0.1em;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-type-icon {
  flex: 0 0 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  line-height: 1;
  overflow: hidden;
  color: var(--vscode-descriptionForeground, inherit);
  opacity: 0.85;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-type-icon svg {
  display: block;
  width: 1em;
  height: 1em;
  min-width: 1em;
  min-height: 1em;
  max-width: 1em;
  max-height: 1em;
}
`; // end of PREVIEW_THEME_CSS

export function previewContentWidthCss(maxContentWidth = DEFAULT_PREVIEW_CONTENT_WIDTH): string {
  const width = normalizePreviewContentWidth(maxContentWidth);
  const cssWidth = width === 0 ? "none" : `${width}px`;
  return `:root { --sphinx-preview-content-max-width: ${cssWidth}; }`;
}
