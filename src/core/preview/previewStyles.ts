import {
  DEFAULT_PREVIEW_CONTENT_WIDTH,
  normalizePreviewContentWidth,
} from "../configuration/previewConfiguration";
import { directiveStyle } from "../directives/registry";
import { gridColumnCss } from "../render/mystGridToctree";
import { CALLOUT_ICONS } from "./calloutIcons";
import { VSCODE_THEME_TOKEN_CSS } from "./themeTokens";

/**
 * Stylesheets injected into every preview webview.
 *
 * Kept free of `vscode` imports so the CSS contract can be unit tested directly. The rules read
 * the neutral `--studio-*` theme tokens only; the accessibility sheet, which every page loads
 * first, maps them to the host's variables (themeTokens.ts).
 */

export const PREVIEW_ACCESSIBILITY_CSS = `${VSCODE_THEME_TOKEN_CSS}
:root {
  color-scheme: light dark;
}

body {
  background: var(--studio-editor-background, Canvas);
  color: var(--studio-editor-foreground, CanvasText);
  margin: 0;
}

a {
  color: var(--studio-textLink-foreground, LinkText);
}

:where(a, button, input, select, textarea, summary, [tabindex="0"]):focus-visible {
  outline: 2px solid var(--studio-focusBorder, Highlight);
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
  outline: 2px solid var(--studio-editor-findMatchHighlightBackground, Highlight);
  outline-offset: 2px;
}

@media (forced-colors: active) {
  :where(a, button, input, select, textarea, summary, [tabindex="0"]):focus-visible,
  [data-sphinx-preview-current="true"] {
    outline: 2px solid Highlight;
  }
}

/* No transition at all (0s, not a tiny duration): with the default transition-property "all", a
   tiny duration would still start a transition on every style change, a theme switch included. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
  }
}
`;

/**
 * Realigns the Sphinx theme with VS Code's built-in Markdown preview.
 *
 * The theme stylesheet still provides structure (tables, code, grids); this layer only
 * overrides the parts a reader compares side by side: typography, page gutters, the rule
 * under the top heading, figure captions, and admonition callouts.
 */
export const PREVIEW_THEME_CSS = `
:root {
  --sphinx-preview-font: var(--studio-markdown-font-family, var(--studio-font-family, -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, sans-serif));
  --sphinx-preview-font-size: var(--studio-markdown-font-size, 14px);
  --sphinx-preview-line-height: var(--studio-markdown-line-height, 1.6);
  --sphinx-preview-content-max-width: ${DEFAULT_PREVIEW_CONTENT_WIDTH}px;
  /* Set by the runtime (toolbar Zoom - / +); text and column scale together. */
  --sphinx-preview-zoom: 1;
  --sphinx-preview-zoomed-font-size: calc(var(--sphinx-preview-font-size) * var(--sphinx-preview-zoom, 1));
  --sphinx-preview-column-width: calc(var(--sphinx-preview-content-max-width) * var(--sphinx-preview-zoom, 1));
  --sphinx-preview-controls-height: 116px;
  --sphinx-preview-content-gutter: clamp(16px, 8vw, 78px);
  --sphinx-preview-diff-addition: var(--studio-charts-green, #2da44e);
  --sphinx-preview-diff-deletion: var(--studio-charts-red, #cf222e);
  --sphinx-preview-scrollbar-thumb: var(--studio-scrollbarSlider-background, rgba(128, 128, 128, 0.4));
  --sphinx-preview-scrollbar-hover: var(--studio-scrollbarSlider-hoverBackground, rgba(128, 128, 128, 0.7));
}

body {
  --sphinx-preview-border: var(--studio-widget-border, var(--studio-panel-border, rgba(128, 128, 128, 0.35)));
}

* {
  scrollbar-color: var(--sphinx-preview-scrollbar-thumb) var(--studio-editor-background, Canvas);
}

::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background: var(--studio-editor-background, Canvas);
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
  --studio-editor-background: #1e1e1e;
  --studio-editor-foreground: #d4d4d4;
  --studio-foreground: #d4d4d4;
  --studio-editorWidget-background: #252526;
  --studio-editorWidget-border: #454545;
  --studio-icon-foreground: #d4d4d4;
  --studio-toolbar-hoverBackground: rgba(255, 255, 255, 0.1);
  --studio-input-background: #3c3c3c;
  --studio-input-foreground: #d4d4d4;
  --studio-input-border: #454545;
  --studio-button-background: #0e639c;
  --studio-button-foreground: #ffffff;
  --studio-errorForeground: #f48771;
  --studio-descriptionForeground: #9d9d9d;
  --studio-textLink-foreground: #3794ff;
  --studio-focusBorder: #007fd4;
  --studio-editor-findMatchHighlightBackground: #ea5c0055;
  --studio-list-hoverBackground: rgba(255, 255, 255, 0.1);
  --studio-widget-border: #454545;
  --studio-editorHoverWidget-background: #252526;
  --studio-editorHoverWidget-foreground: #d4d4d4;
  --studio-editorHoverWidget-border: #454545;
  --studio-panel-border: #454545;
  --studio-textBlockQuote-background: #292929;
  --studio-textCodeBlock-background: #292929;
  --studio-button-secondaryBackground: #3a3d41;
  --studio-button-secondaryForeground: #d4d4d4;
  --studio-charts-blue: #75beff;
  --studio-charts-green: #89d185;
  --studio-charts-purple: #d3a0ff;
  --studio-charts-yellow: #e2c08d;
  --studio-charts-red: #f48771;
  --studio-charts-orange: #d18616;
}

html[data-sphinx-preview-theme-mode="white"],
html[data-sphinx-preview-theme-mode="white"] body {
  color-scheme: light;
  --sphinx-preview-scrollbar-thumb: #b3b3b3;
  --sphinx-preview-scrollbar-hover: #808080;
  --studio-editor-background: #ffffff;
  --studio-editor-foreground: #1f1f1f;
  --studio-foreground: #1f1f1f;
  --studio-editorWidget-background: #f3f3f3;
  --studio-editorWidget-border: #c8c8c8;
  --studio-icon-foreground: #333333;
  --studio-toolbar-hoverBackground: rgba(0, 0, 0, 0.08);
  --studio-input-background: #ffffff;
  --studio-input-foreground: #1f1f1f;
  --studio-input-border: #c8c8c8;
  --studio-button-background: #005fb8;
  --studio-button-foreground: #ffffff;
  --studio-errorForeground: #b5200d;
  --studio-descriptionForeground: #5f5f5f;
  --studio-textLink-foreground: #006ab1;
  --studio-focusBorder: #005fb8;
  --studio-editor-findMatchHighlightBackground: #ffdf5d80;
  --studio-list-hoverBackground: rgba(0, 0, 0, 0.08);
  --studio-widget-border: #c8c8c8;
  --studio-editorHoverWidget-background: #f3f3f3;
  --studio-editorHoverWidget-foreground: #1f1f1f;
  --studio-editorHoverWidget-border: #c8c8c8;
  --studio-panel-border: #e5e5e5;
  --studio-textBlockQuote-background: #f3f3f3;
  --studio-textCodeBlock-background: #f0f0f0;
  --studio-button-secondaryBackground: #ededed;
  --studio-button-secondaryForeground: #333333;
  --studio-charts-blue: #005fb8;
  --studio-charts-green: #16825d;
  --studio-charts-purple: #652d90;
  --studio-charts-yellow: #8f6100;
  --studio-charts-red: #b5200d;
  --studio-charts-orange: #a65e00;
}

html[data-sphinx-preview-theme-mode="cream"],
html[data-sphinx-preview-theme-mode="cream"] body {
  color-scheme: light;
  --sphinx-preview-scrollbar-thumb: #cfc5b2;
  --sphinx-preview-scrollbar-hover: #a89d89;
  --studio-editor-background: #f5f1e8;
  --studio-editor-foreground: #2b2a27;
  --studio-foreground: #2b2a27;
  --studio-descriptionForeground: #5e5850;
  --studio-textLink-foreground: #a14e32;
  --studio-focusBorder: #b05a3c;
  --studio-editor-findMatchHighlightBackground: #e6c36a80;
  --studio-list-hoverBackground: rgba(43, 42, 39, 0.07);
  --studio-widget-border: #d6cdbd;
  --studio-editorWidget-background: #fbf8f1;
  --studio-editorWidget-border: #d6cdbd;
  --studio-editorHoverWidget-background: #ede6da;
  --studio-editorHoverWidget-foreground: #2b2a27;
  --studio-editorHoverWidget-border: #d6cdbd;
  --studio-panel-border: #e2dacb;
  --studio-textBlockQuote-background: #efe9dd;
  --studio-textCodeBlock-background: #ede6da;
  --studio-icon-foreground: #4a463d;
  --studio-toolbar-hoverBackground: rgba(43, 42, 39, 0.09);
  --studio-input-background: #fbf8f1;
  --studio-input-foreground: #2b2a27;
  --studio-input-border: #cfc5b2;
  --studio-button-background: #9a4a2a;
  --studio-button-foreground: #ffffff;
  --studio-button-secondaryBackground: #e8e0d2;
  --studio-button-secondaryForeground: #3a372f;
  --studio-errorForeground: #b3261e;
  --studio-charts-blue: #2f6690;
  --studio-charts-green: #34703f;
  --studio-charts-purple: #6b4a8a;
  --studio-charts-yellow: #7d5500;
  --studio-charts-red: #ae3a2a;
  --studio-charts-orange: #94500c;
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
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-icon-foreground, var(--studio-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
}

[data-sphinx-preview-toolbar-row] {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Rows 2 and 3: the collapse button of row 1 hides them (the hidden attribute removes them from
   the Tab order as well). */
[data-sphinx-preview-toolbar-more] {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

[data-sphinx-preview-toolbar-more][hidden] {
  display: none;
}

/* Shown by the runtime when a render stays pending; fixed and pointer-transparent, so no content moves. */
[data-sphinx-preview-pending-overlay] {
  position: fixed;
  inset-block-start: 128px;
  inset-inline-end: 14px;
  z-index: 1099;
  box-sizing: border-box;
  max-width: min(320px, calc(100vw - 28px));
  padding: 6px 10px;
  border: 1px solid var(--studio-editorWidget-border, var(--sphinx-preview-border));
  border-radius: 6px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-foreground, var(--studio-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
}

/* Below the toolbar: three rows, or one row when rows 2-3 are collapsed. */
html[data-sphinx-preview-toolbar-state="collapsed"] [data-sphinx-preview-pending-overlay] {
  inset-block-start: 62px;
}

[data-sphinx-preview-pending-overlay] > strong,
[data-sphinx-preview-pending-overlay] > span {
  display: block;
  overflow-wrap: anywhere;
}

/* CR 050: the conf.py warnings of a successful render. Absolute in the 40px gap above the first
   element, left of the floating toolbar: it takes no room in the flow, so showing or closing it
   moves no content and no scroll-sync anchor, and it scrolls away with the top of the page (the
   sticky band is never covered). One line; the text ends in an ellipsis in a very narrow pane. */
[data-sphinx-preview-warning-banner] {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-start: 14px;
  z-index: 1098;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 14px - var(--sphinx-preview-warning-banner-reserve));
  height: 30px;
  padding-block: 0;
  padding-inline: 8px 2px;
  border: 1px solid var(--studio-editorWidget-border, var(--sphinx-preview-border));
  border-inline-start: 3px solid var(--sphinx-preview-warning-accent);
  border-radius: 6px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-foreground, var(--studio-editor-foreground, CanvasText));
  font-family: var(--studio-font-family, var(--sphinx-preview-font));
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  --sphinx-preview-warning-banner-reserve: 196px;
  --sphinx-preview-warning-accent: color-mix(in srgb, var(--studio-charts-yellow, #bf8803) 75%, var(--studio-editor-foreground, CanvasText));
}

/* Rows 2-3 collapsed: the toolbar is one row of at most four buttons. */
html[data-sphinx-preview-toolbar-state="collapsed"] [data-sphinx-preview-warning-banner] {
  --sphinx-preview-warning-banner-reserve: 164px;
}

[data-sphinx-preview-warning-icon] {
  flex: none;
  width: 14px;
  height: 14px;
  background: var(--sphinx-preview-warning-accent);
  -webkit-mask: ${CALLOUT_ICONS.triangle} center / contain no-repeat;
  mask: ${CALLOUT_ICONS.triangle} center / contain no-repeat;
}

[data-sphinx-preview-warning-text] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-sphinx-preview-warning-banner] button {
  flex: none;
  height: 24px;
  margin: 0;
  padding-block: 0;
  padding-inline: 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--studio-textLink-foreground, LinkText);
  font: inherit;
  cursor: pointer;
}

[data-sphinx-preview-warning-banner] button:hover {
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.16));
}

[data-sphinx-preview-warning-banner] [data-sphinx-preview-warning-close] {
  width: 24px;
  padding: 0;
  color: inherit;
  font-size: 16px;
  line-height: 1;
}

@media (forced-colors: active) {
  [data-sphinx-preview-warning-banner] {
    border-color: CanvasText;
  }

  [data-sphinx-preview-warning-icon] {
    background: CanvasText;
  }
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
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

[data-sphinx-preview-toolbar] button[aria-pressed="true"] {
  background: var(--studio-button-background, #0e639c);
  color: var(--studio-button-foreground, #ffffff);
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
  border: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.45));
  border-radius: 4px;
  background: var(--studio-editorWidget-background, #252526);
  color: var(--studio-icon-foreground, var(--studio-editor-foreground, inherit));
  cursor: pointer;
}

[data-sphinx-preview-code-copy][hidden] {
  display: none;
}

[data-sphinx-preview-code-copy]:hover {
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
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
  border: 1px solid var(--studio-editorHoverWidget-border, var(--studio-widget-border, currentColor));
  border-radius: 4px;
  background: var(--studio-editorHoverWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-editorHoverWidget-foreground, var(--studio-editor-foreground, CanvasText));
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
  background: var(--studio-editor-background, Canvas);
  color: var(--studio-editor-foreground, CanvasText);
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
  outline: 1px dashed var(--studio-focusBorder, Highlight);
  outline-offset: 3px;
}

html[data-sphinx-preview-edit-mode="on"] [data-sphinx-preview-block-selected="true"] {
  outline: 2px solid var(--studio-focusBorder, Highlight);
  outline-offset: 3px;
}

.sphinx-preview-selection-status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
  border: 1px solid var(--studio-focusBorder, Highlight);
  border-radius: 50%;
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
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

/* The move buttons sit right of the "+", touching it so the pointer never loses the bar. */
.sphinx-preview-insert-point button.sphinx-preview-move--up {
  left: -0.2em;
}

.sphinx-preview-insert-point button.sphinx-preview-move--down {
  left: 1.2em;
}

.sphinx-preview-insert-point button.sphinx-preview-move:disabled {
  cursor: default;
  background: var(--studio-button-secondaryBackground, GrayText);
  color: var(--studio-button-secondaryForeground, Canvas);
}

[data-sphinx-source-line]:hover + .sphinx-preview-insert-point button.sphinx-preview-move:disabled,
.sphinx-preview-insert-point button.sphinx-preview-move:disabled:hover {
  opacity: 0.5;
}

html[data-sphinx-preview-block-editing="true"] .sphinx-preview-insert-point .sphinx-preview-move {
  display: none;
}

.sphinx-preview-move-status {
  position: absolute;
  left: 2.8em;
  top: -0.9em;
  z-index: 2;
  max-width: 24em;
  padding: 2px 8px;
  border: 1px solid var(--studio-focusBorder, Highlight);
  border-radius: 3px;
  background: var(--studio-editorWidget-background, Canvas);
  color: var(--studio-editorWidget-foreground, CanvasText);
  font-size: 0.85em;
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
  border: 1px solid var(--studio-focusBorder, Highlight);
  border-radius: 4px;
  padding: 6px 8px;
  background: var(--studio-editor-background, Canvas);
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
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: calc(var(--studio-editor-font-size, 0.95em) - 1px);
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
  background: var(--studio-button-secondaryBackground, ButtonFace);
  color: var(--studio-button-secondaryForeground, ButtonText);
  cursor: pointer;
}

.sphinx-preview-block-editor-buttons button:first-child {
  border-color: transparent;
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
}

.sphinx-preview-block-editor [data-sphinx-preview-edit-status] {
  margin: 6px 0 0;
  color: var(--studio-descriptionForeground, GrayText);
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
  color: var(--studio-editor-foreground, CanvasText);
}

/* Font family, size and line-height come from the block editor rule above. */
.sphinx-preview-table-cell-editor textarea {
  height: auto;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--studio-editor-foreground, CanvasText);
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
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 18px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-icon-foreground, var(--studio-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
}

/* CR 034: while its table scrolls, the runtime translates the bar down to just under the sticky band
   or the preview controls (never past the table's bottom); nothing is laid out again, so the text
   stays where it is. The menu is static otherwise. */
.sphinx-preview-table-menu[data-sphinx-table-menu-stuck="true"] {
  position: relative;
  z-index: 3;
  transform: translateY(var(--sphinx-preview-table-menu-shift, 0px));
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
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-table-menu button:focus-visible {
  outline: 1px solid var(--studio-focusBorder, Highlight);
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

.sphinx-preview-table-menu :is([data-sphinx-table-group="column"], [data-sphinx-table-group="table"]) {
  position: relative;
  margin-inline-start: 4px;
}

.sphinx-preview-table-menu :is([data-sphinx-table-group="column"], [data-sphinx-table-group="table"])::before {
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
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.85em;
}

.sphinx-preview-table-menu [data-sphinx-preview-edit-status]:empty {
  display: none;
}

.sphinx-preview-table-menu button:disabled {
  cursor: default;
  opacity: 0.55;
}

/* Edition palette: the pill bar of an open block editor (placed on top of the frame, see below). */
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
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 18px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-icon-foreground, var(--studio-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
  font-family: var(--studio-font-family, system-ui, sans-serif);
  line-height: 1.2;
}

/*
 * Edition palette: the pill bar on top of an open block editor, attached to the frame's top edge.
 * The host holds the bar and the frame; the bar sticks to the top of the viewport (below the sticky
 * band and, where it overlaps the bar, the floating toolbar) while a tall frame scrolls, and stays
 * inside the host, so it leaves with the frame. The host takes the margins the bare frame had.
 */
.sphinx-preview-block-editor-host {
  margin: 0;
}

.sphinx-preview-block-editor-host > .sphinx-preview-edit-palette {
  position: sticky;
  inset-block-start: calc(max(var(--sphinx-preview-reading-offset, 0px), var(--sphinx-preview-toolbar-bottom, 0px)) + 4px);
  z-index: 3;
  margin: 0 0 3px;
}

/* The first block's editor keeps its palette in the 40px place: nothing is above it, so the sticky
   band's reading offset does not apply, and the toolbar's edge only when the frame did not give up
   the width under the toolbar (the variable is 0 then). */
.sphinx-preview-block-editor-host.sphinx-preview-block-editor--first > .sphinx-preview-edit-palette {
  inset-block-start: calc(var(--sphinx-preview-first-bar-bottom, var(--sphinx-preview-toolbar-bottom, 0px)) + 4px);
}

/* Short panes, and a palette that would take over 40% of the viewport (set by the runtime), keep
   the bar in the flow (relative: its popovers stay anchored to it): a stuck bar would cover the text.
   A narrow pane keeps the sticky bar: it wraps onto more rows inside the pane (CR 034). */
@media (max-height: 520px) {
  .sphinx-preview-block-editor-host > .sphinx-preview-edit-palette {
    position: relative;
    inset-block-start: auto;
  }
}

.sphinx-preview-block-editor-host[data-sphinx-palette-static="true"] > .sphinx-preview-edit-palette {
  position: relative;
  inset-block-start: auto;
}

/* The first block's own rule above is more specific: the short-pane and static cases win again. */
@media (max-height: 520px) {
  .sphinx-preview-block-editor-host.sphinx-preview-block-editor--first > .sphinx-preview-edit-palette {
    inset-block-start: auto;
  }
}

.sphinx-preview-block-editor-host.sphinx-preview-block-editor--first[data-sphinx-palette-static="true"] > .sphinx-preview-edit-palette {
  inset-block-start: auto;
}

.sphinx-preview-edit-palette > select.sphinx-preview-edit-palette-mode {
  flex-shrink: 0;
  box-sizing: border-box;
  height: 26px;
  margin-inline: 2px 6px;
  padding: 0 4px;
  border: 1px solid var(--studio-dropdown-border, var(--sphinx-preview-border));
  border-radius: 13px;
  background: var(--studio-dropdown-background, transparent);
  color: var(--studio-dropdown-foreground, inherit);
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
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-edit-palette > button:active {
  background: var(--studio-toolbar-activeBackground, rgba(128, 128, 128, 0.35));
}

.sphinx-preview-edit-palette > button[aria-expanded="true"] {
  background: var(--studio-toolbar-activeBackground, rgba(128, 128, 128, 0.35));
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
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 8px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-editor-foreground, CanvasText);
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
  border-color: var(--studio-focusBorder, #007fd4);
  background: color-mix(in srgb, var(--studio-focusBorder, #007fd4) 45%, transparent);
}

.sphinx-preview-edit-grid-label {
  margin-top: 5px;
  font-size: 0.8em;
  text-align: center;
  color: var(--studio-descriptionForeground, inherit);
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
  border: 1px solid var(--studio-input-border, var(--sphinx-preview-border));
  border-radius: 5px;
  background: var(--studio-input-background, transparent);
  color: var(--studio-input-foreground, inherit);
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
  color: var(--studio-descriptionForeground, inherit);
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
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-edit-emoji-grid > button[hidden],
.sphinx-preview-edit-emoji-heading[hidden] {
  display: none;
}

/* Reference and citation lists: a filter field and the host's entries, inside the frame. */
.sphinx-preview-edit-palette-menu[data-edit-popover="choices"] {
  width: 22em;
  max-width: 100%;
  max-height: 16em;
  padding: 6px;
  overflow: hidden;
}

.sphinx-preview-edit-choice-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.sphinx-preview-edit-choice-list > button {
  padding: 3px 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.85em;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.sphinx-preview-edit-choice-list > button:hover,
.sphinx-preview-edit-choice-list > button:focus-visible {
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-edit-choice-list > button[hidden] {
  display: none;
}

.sphinx-preview-edit-choice-note {
  padding: 3px 6px;
  font-size: 0.8em;
  color: var(--studio-descriptionForeground, inherit);
}

/* Colour picker (Colour button) and the colour-code swatch button. */
.sphinx-preview-edit-palette > button[hidden] {
  display: none;
}

.sphinx-preview-edit-palette-swatch {
  display: inline-block;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 1px solid var(--studio-icon-foreground, currentColor);
  border-radius: 4px;
}

.sphinx-preview-edit-palette-menu[data-edit-popover="color"] {
  width: 15em;
  max-width: 100%;
  max-height: none;
  padding: 6px;
  overflow: visible;
}

.sphinx-preview-edit-color-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 6px;
}

.sphinx-preview-edit-color-tabs > button,
.sphinx-preview-edit-color-remove {
  flex: 1 1 0;
  padding: 3px 6px;
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.8em;
  cursor: pointer;
}

.sphinx-preview-edit-color-tabs > button[aria-selected="true"] {
  border-color: var(--studio-focusBorder, #007fd4);
  background: color-mix(in srgb, var(--studio-focusBorder, #007fd4) 25%, transparent);
}

.sphinx-preview-edit-color-tabs > button:hover,
.sphinx-preview-edit-color-remove:hover {
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-edit-color-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
  margin-bottom: 6px;
}

.sphinx-preview-edit-color-grid > button {
  box-sizing: border-box;
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  cursor: pointer;
}

.sphinx-preview-edit-color-grid > button:hover,
.sphinx-preview-edit-color-grid > button:focus-visible {
  outline: 2px solid var(--studio-focusBorder, #007fd4);
  outline-offset: 1px;
}

.sphinx-preview-edit-color-hex[aria-invalid="true"] {
  border-color: var(--studio-inputValidation-errorBorder, #be1100);
}

.sphinx-preview-edit-color-remove {
  width: 100%;
  margin-top: 2px;
}

/* Table cell bar: the inline buttons of the palette join the row and column buttons. */
.sphinx-preview-table-menu-separator {
  align-self: stretch;
  flex: none;
  width: 1px;
  margin: 6px 4px;
  background: var(--sphinx-preview-border);
}

.sphinx-preview-edit-palette.sphinx-preview-edit-palette-in-bar {
  flex: 0 1 auto;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.sphinx-preview-edit-palette-in-bar .sphinx-preview-edit-palette-menu {
  max-width: min(22em, calc(100vw - 32px));
}

.sphinx-preview-edit-palette-in-bar .sphinx-preview-edit-palette-menu > button {
  height: auto;
  min-height: 0;
}

/* The / command menu: a floating list at the caret, above the toolbar (1100) and the palette
   popovers (1300). Positioned by the runtime (top/left/max-height from the caret rectangle). */
.sphinx-preview-slash-menu {
  position: fixed;
  z-index: 1400;
  box-sizing: border-box;
  width: min(23em, calc(100vw - 16px));
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 8px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-editor-foreground, CanvasText);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  font-family: var(--studio-font-family, system-ui, sans-serif);
  font-size: 13px;
  line-height: 1.3;
}

.sphinx-preview-slash-heading {
  padding: 6px 8px 2px;
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.82em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sphinx-preview-slash-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
}

.sphinx-preview-slash-option[data-active="true"] {
  background: var(--studio-list-activeSelectionBackground, rgba(128, 128, 128, 0.3));
  color: var(--studio-list-activeSelectionForeground, inherit);
}

.sphinx-preview-slash-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.sphinx-preview-slash-icon > svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.sphinx-preview-slash-icon > svg.sphinx-preview-edit-palette-caret {
  display: none;
}

.sphinx-preview-slash-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sphinx-preview-slash-category,
.sphinx-preview-slash-shortcut {
  flex: none;
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.85em;
  white-space: nowrap;
}

.sphinx-preview-slash-none {
  padding: 6px 8px;
  color: var(--studio-descriptionForeground, GrayText);
}

.sphinx-preview-slash-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (forced-colors: active) {
  .sphinx-preview-slash-menu {
    border: 1px solid CanvasText;
    background: Canvas;
    color: CanvasText;
  }

  .sphinx-preview-slash-option[data-active="true"] {
    outline: 2px solid Highlight;
    background: Highlight;
    color: HighlightText;
  }

  .sphinx-preview-slash-option[data-active="true"] .sphinx-preview-slash-category,
  .sphinx-preview-slash-option[data-active="true"] .sphinx-preview-slash-shortcut {
    color: HighlightText;
  }
}

.sphinx-preview-table-menu > .sphinx-preview-link-panel {
  flex: 1 1 100%;
  margin: 2px 0 0;
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
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 8px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-editor-foreground, CanvasText);
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
  font-family: var(--studio-font-family, system-ui, sans-serif);
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
  border: 1px solid var(--studio-input-border, var(--sphinx-preview-border));
  border-radius: 4px;
  background: var(--studio-input-background, var(--studio-editor-background, Canvas));
  color: var(--studio-input-foreground, var(--studio-editor-foreground, CanvasText));
  font: inherit;
}

.sphinx-preview-link-panel-row > input:focus {
  outline: 1px solid var(--studio-focusBorder, Highlight);
  outline-offset: -1px;
}

.sphinx-preview-link-panel-actions {
  display: flex;
  gap: 4px;
}

.sphinx-preview-link-panel-actions > button {
  padding: 3px 10px;
  border: 1px solid var(--studio-button-border, var(--sphinx-preview-border));
  border-radius: 4px;
  background: var(--studio-button-secondaryBackground, transparent);
  color: var(--studio-button-secondaryForeground, inherit);
  font: inherit;
  cursor: pointer;
}

.sphinx-preview-link-panel-actions > button[data-link-action="insert"] {
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
}

.sphinx-preview-link-panel-actions > button:focus-visible {
  outline: 1px solid var(--studio-focusBorder, Highlight);
  outline-offset: 1px;
}

/* Figure form: the figure's options under the palette, in the flow of the editor frame. */
.sphinx-preview-figure-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14em, 1fr));
  align-items: start;
  gap: 6px 10px;
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 6px;
  padding: 8px;
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 8px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-editor-foreground, CanvasText);
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
  font-family: var(--studio-font-family, system-ui, sans-serif);
  font-size: 0.85em;
}

.sphinx-preview-figure-panel-title {
  grid-column: 1 / -1;
  font-weight: 600;
}

.sphinx-preview-figure-panel-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sphinx-preview-figure-panel-row[data-figure-row="source"],
.sphinx-preview-figure-panel-row[data-figure-row="caption"],
.sphinx-preview-figure-panel-row[data-figure-row="legend"] {
  grid-column: 1 / -1;
}

.sphinx-preview-figure-panel-control {
  display: flex;
  gap: 4px;
  min-width: 0;
}

.sphinx-preview-figure-panel-control > :first-child {
  flex: 1 1 auto;
}

.sphinx-preview-figure-panel input,
.sphinx-preview-figure-panel textarea,
.sphinx-preview-figure-panel select {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  padding: 3px 6px;
  border: 1px solid var(--studio-input-border, var(--sphinx-preview-border));
  border-radius: 4px;
  background: var(--studio-input-background, var(--studio-editor-background, Canvas));
  color: var(--studio-input-foreground, var(--studio-editor-foreground, CanvasText));
  font: inherit;
}

.sphinx-preview-figure-panel textarea {
  resize: vertical;
}

.sphinx-preview-figure-panel [aria-invalid="true"] {
  border-color: var(--studio-inputValidation-errorBorder, #be1100);
}

.sphinx-preview-figure-panel input:focus,
.sphinx-preview-figure-panel textarea:focus,
.sphinx-preview-figure-panel select:focus {
  outline: 1px solid var(--studio-focusBorder, Highlight);
  outline-offset: -1px;
}

.sphinx-preview-figure-panel-error {
  color: var(--studio-errorForeground, #be1100);
}

.sphinx-preview-figure-panel-error[hidden] {
  display: none;
}

.sphinx-preview-figure-panel-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 4px;
}

.sphinx-preview-figure-panel button {
  padding: 3px 10px;
  border: 1px solid var(--studio-button-border, var(--sphinx-preview-border));
  border-radius: 4px;
  background: var(--studio-button-secondaryBackground, transparent);
  color: var(--studio-button-secondaryForeground, inherit);
  font: inherit;
  cursor: pointer;
}

.sphinx-preview-figure-panel button[data-figure-action="apply"] {
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
}

.sphinx-preview-figure-panel button:focus-visible {
  outline: 1px solid var(--studio-focusBorder, Highlight);
  outline-offset: 1px;
}

/* The Edit figure button floats over the hovered figure in edit mode (placed by the page script). */
.sphinx-preview-figure-edit-button {
  position: fixed;
  z-index: 20;
  padding: 2px 8px;
  border: 1px solid var(--studio-button-border, var(--sphinx-preview-border));
  border-radius: 4px;
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
  font: 0.8em var(--studio-font-family, system-ui, sans-serif);
  cursor: pointer;
}

.sphinx-preview-figure-edit-button[hidden] {
  display: none;
}

html:not([data-sphinx-preview-edit-mode="on"]) .sphinx-preview-figure-edit-button {
  display: none;
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
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 18px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-icon-foreground, var(--studio-editor-foreground, CanvasText));
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
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-frontmatter-menu button:focus-visible {
  outline: 1px solid var(--studio-focusBorder, Highlight);
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
  border: 1px solid var(--studio-input-border, var(--sphinx-preview-border));
  border-radius: 3px;
  background: var(--studio-input-background, var(--studio-editor-background, Canvas));
  color: var(--studio-input-foreground, var(--studio-editor-foreground, CanvasText));
  font: inherit;
}

[data-okf-frontmatter-editor] > select[data-okf-empty-select="true"] {
  color: var(--studio-descriptionForeground, GrayText);
}

html[data-sphinx-preview-edit-mode="on"] [data-okf-edit-cell] {
  cursor: pointer;
}

html[data-sphinx-preview-edit-mode="on"] [data-okf-edit-cell]:hover {
  background: var(--studio-list-hoverBackground, rgba(128, 128, 128, 0.12));
}

html[data-sphinx-preview-edit-mode="on"] [data-okf-edit-cell]:focus-visible {
  outline: 1px solid var(--studio-focusBorder, Highlight);
  outline-offset: -2px;
}

html[data-sphinx-preview-edit-mode="on"] [data-sphinx-preview-table-cell-selected="true"] {
  outline: 2px solid var(--studio-focusBorder, Highlight);
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
  color: var(--studio-editor-foreground, CanvasText);
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
  color: var(--studio-editor-foreground, CanvasText);
  font: inherit;
}

[data-okf-frontmatter-editor] > input[type="checkbox"] {
  margin: 0;
}

.okf-value-checkbox {
  margin: 0;
  vertical-align: middle;
  accent-color: var(--studio-checkbox-background, var(--studio-focusBorder, currentColor));
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
  background: var(--studio-focusBorder, Highlight);
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
  color: var(--studio-descriptionForeground, GrayText);
  font: inherit;
}

.okf-list-editor-null,
.okf-frontmatter-null {
  display: block;
  padding: 0.1em 0.25em;
  border: 0;
  background: transparent;
  color: var(--studio-textLink-foreground, var(--studio-descriptionForeground, GrayText));
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
  color: var(--studio-foreground, currentColor);
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.12));
}

.okf-list-editor-handle:focus-visible,
.okf-list-editor-remove:focus-visible,
.okf-list-editor-add:focus-visible,
.okf-list-editor-null:focus-visible,
.okf-frontmatter-null:focus-visible,
.okf-list-editor-input:focus-visible {
  outline: 1px solid var(--studio-focusBorder, Highlight);
  outline-offset: -1px;
}

.okf-list-editor-input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 1.8em;
  padding: 0.15em 0.35em;
  border: 1px solid var(--studio-input-border, var(--sphinx-preview-border));
  border-radius: 2px;
  outline: none;
  background: var(--studio-editor-background, Canvas);
  color: var(--studio-editor-foreground, CanvasText);
  font: inherit;
  line-height: inherit;
}

.okf-list-editor-input:focus {
  border-color: var(--studio-focusBorder, Highlight);
}

.okf-list-editor-add {
  margin: 0.25em 0 0 1.45em;
  padding: 0.1em 0.25em;
  color: var(--studio-textLink-foreground, var(--studio-descriptionForeground, GrayText));
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
  font-family: var(--studio-editor-font-family, monospace);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
}

[data-okf-frontmatter-editor] > textarea:not([data-okf-text-value]) {
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--studio-editor-font-size, 0.95em);
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
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.9em;
}

.sphinx-preview-frontmatter-editor [role="status"][data-visible="true"][data-state="error"] {
  display: flex;
  align-items: flex-start;
  gap: 0.4em;
  margin: 3px 0 0;
  padding: 3px 6px;
  border: 1px solid var(--studio-inputValidation-errorBorder, rgba(190, 45, 45, 0.55));
  border-radius: 3px;
  background: var(--studio-inputValidation-errorBackground, rgba(235, 80, 80, 0.12));
  color: var(--studio-inputValidation-errorForeground, var(--studio-errorForeground, #a12626));
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
  color: var(--studio-editorWarning-foreground, #bf8803);
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

#sphinx-myst-preview-content p[data-sphinx-preview-editing="true"] + .sphinx-preview-block-editor-host {
  margin: 0 0 1em;
}

/* The host carries the spacing (and the first-element clearance) of the frame it wraps. */
#sphinx-myst-preview-content .sphinx-preview-block-editor-host > .sphinx-preview-block-editor {
  margin: 0;
}

/*
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
  border: 1px solid var(--studio-widget-border, rgba(128, 128, 128, 0.4));
  border-radius: 0.75em;
  background: var(--studio-editorWidget-background, rgba(128, 128, 128, 0.12));
  color: var(--studio-descriptionForeground, #717171);
  font-family: var(--studio-editor-font-family, monospace);
  font-size: 0.78em;
  font-weight: 600;
  line-height: 1.4;
  vertical-align: baseline;
  white-space: nowrap;
  cursor: pointer;
}

#sphinx-myst-preview-content .okf-chip--todo {
  border-color: var(--studio-charts-green, #16825d);
  background: color-mix(in srgb, var(--studio-charts-green, #16825d) 16%, transparent);
  color: var(--studio-charts-green, #16825d);
}

/* Inline thread: a green chip led by a speech bubble; the bubble is a mask, so it takes the chip
   color in every theme. */
#sphinx-myst-preview-content .okf-chip--thread {
  border-color: var(--studio-charts-green, #16825d);
  background: color-mix(in srgb, var(--studio-charts-green, #16825d) 16%, transparent);
  color: var(--studio-charts-green, #16825d);
}

#sphinx-myst-preview-content .okf-chip--thread::before {
  content: "";
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-inline-end: 0.35em;
  vertical-align: -0.15em;
  background-color: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Cpath d='M4 4h16v12H10l-5 4v-4H4z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Cpath d='M4 4h16v12H10l-5 4v-4H4z'/%3E%3C/svg%3E") center / contain no-repeat;
}

#sphinx-myst-preview-content .okf-chip:focus-visible {
  outline: 1px solid var(--studio-focusBorder, #007fd4);
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
  --sphinx-preview-accent: var(--studio-descriptionForeground, #717171);
  display: block;
  margin: 0.4em 0;
  padding: 0.6em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-inline-start: 4px solid var(--sphinx-preview-accent);
  border-radius: 0;
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  background: color-mix(in srgb, var(--sphinx-preview-accent) 14%, var(--studio-editor-background, Canvas));
  color: var(--studio-editor-foreground, CanvasText);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="todo"] > .okf-comment-body:not([hidden]) {
  --sphinx-preview-accent: var(--studio-charts-green, #16825d);
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

/* An open thread: one entry per message, then the reply box and Delete. The message text is a text
   node, so its line breaks are kept; the body itself wraps normally. */
#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="thread"] > .okf-comment-body:not([hidden]) {
  --sphinx-preview-accent: var(--studio-charts-green, #16825d);
  white-space: normal;
}

#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="thread"] > .okf-comment-body:not([hidden])::before {
  content: "Thread";
}

#sphinx-myst-preview-content .okf-thread-message + .okf-thread-message {
  margin-top: 0.6em;
  padding-top: 0.5em;
  border-top: 1px solid var(--sphinx-preview-border);
}

#sphinx-myst-preview-content .okf-thread-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2em 0.8em;
  align-items: baseline;
}

#sphinx-myst-preview-content .okf-thread-author {
  font-weight: 600;
}

#sphinx-myst-preview-content .okf-thread-date {
  color: var(--studio-descriptionForeground, #717171);
  font-size: 0.85em;
}

#sphinx-myst-preview-content .okf-thread-text {
  margin-top: 0.2em;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .okf-thread-actions {
  margin-top: 0.8em;
  padding-top: 0.6em;
  border-top: 1px solid var(--sphinx-preview-border);
}

#sphinx-myst-preview-content .okf-thread-actions textarea {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-height: 3.6em;
  padding: 0.4em 0.5em;
  border: 1px solid var(--studio-input-border, var(--sphinx-preview-border));
  border-radius: 3px;
  background: var(--studio-input-background, transparent);
  color: var(--studio-input-foreground, inherit);
  font: inherit;
  resize: vertical;
}

#sphinx-myst-preview-content .okf-thread-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  align-items: center;
  margin-top: 0.5em;
}

#sphinx-myst-preview-content .okf-thread-buttons button {
  padding: 0.25em 0.8em;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 2px;
  background: var(--studio-button-background, #0e639c);
  color: var(--studio-button-foreground, #fff);
  font: inherit;
  cursor: pointer;
}

#sphinx-myst-preview-content .okf-thread-buttons button[data-okf-thread-delete] {
  background: var(--studio-button-secondaryBackground, rgba(128, 128, 128, 0.2));
  color: var(--studio-button-secondaryForeground, inherit);
}

#sphinx-myst-preview-content .okf-thread-buttons button:disabled {
  opacity: 0.5;
  cursor: default;
}

#sphinx-myst-preview-content .okf-thread-buttons button:focus-visible,
#sphinx-myst-preview-content .okf-thread-actions textarea:focus-visible {
  outline: 1px solid var(--studio-focusBorder, #007fd4);
  outline-offset: 1px;
}

#sphinx-myst-preview-content .okf-thread-status {
  color: var(--studio-errorForeground, #f14c4c);
  font-size: 0.9em;
}

/* Incoming-change mark: a green bar for each block changed since the last commit. All bars sit in
   one column at the inline start of the page, whatever the indentation of the block, with square
   ends and the full height of the block. They are drawn in a layer after the content (placed by the
   page script from the block boxes), so no block, neighbour or text edge moves and no ancestor
   clips a bar. */
[data-sphinx-preview-change-layer] {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  height: 0;
  margin: 0;
  padding: 0;
  pointer-events: none;
  user-select: none;
}

[data-sphinx-preview-change-layer] > span {
  position: absolute;
  inset-inline-start: 8px;
  width: 3px;
  border-radius: 0;
  background: var(--studio-editorGutter-addedBackground, #2ea043);
}

/* Review comments: a highlighted quote (or a badge on its block) opens a popover with the thread.
   Marks only paint; badges and the popover are out of the flow, so nothing moves. */
#sphinx-myst-preview-content mark[data-okf-comment-thread] {
  background: var(--studio-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33));
  color: inherit;
  border-radius: 2px;
  cursor: pointer;
}

#sphinx-myst-preview-content mark[data-okf-comment-thread][data-okf-comment-resolved="true"] {
  background: transparent;
  text-decoration: underline dotted;
  text-decoration-color: var(--studio-descriptionForeground, currentColor);
}

#sphinx-myst-preview-content [data-okf-comment-badged] {
  position: relative;
}

#sphinx-myst-preview-content button[data-okf-comment-badge] {
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  padding: 0;
  margin: 0;
  border: 1px solid var(--studio-focusBorder, #007fd4);
  border-radius: 7px 7px 7px 0;
  background: var(--studio-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33));
  cursor: pointer;
}

#sphinx-myst-preview-content button[data-okf-comment-badge][data-okf-comment-badge-after] {
  position: static;
  display: block;
  margin-left: auto;
}

#sphinx-myst-preview-content button[data-okf-comment-badge][data-okf-comment-resolved="true"] {
  opacity: 0.4;
}

[data-okf-comment-popover] {
  position: fixed;
  z-index: 50;
  box-sizing: border-box;
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px 10px;
  border: 1px solid var(--studio-editorWidget-border, var(--studio-focusBorder, #454545));
  border-radius: 0;
  background: var(--studio-editorWidget-background, var(--studio-editor-background));
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground));
  box-shadow: 0 2px 8px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
  font-size: 0.9em;
}

[data-okf-comment-popover][data-okf-comment-resolved="true"] {
  opacity: 0.75;
}

[data-okf-comment-popover] [data-okf-comment-state] {
  margin-bottom: 6px;
  font-style: italic;
}

[data-okf-comment-popover] [data-okf-comment-entry] + [data-okf-comment-entry] {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
}

[data-okf-comment-popover] [data-okf-comment-head] {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

[data-okf-comment-popover] [data-okf-comment-head] span {
  opacity: 0.7;
}

[data-okf-comment-popover] [data-okf-comment-body] {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* Comment button of a text selection, the box that writes a comment, and the reply box (T43). */
button[data-okf-comment-create] {
  position: fixed;
  z-index: 50;
  padding: 2px 10px;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 3px;
  background: var(--studio-button-background);
  color: var(--studio-button-foreground);
  box-shadow: 0 2px 6px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
}

button[data-okf-comment-create]:hover {
  background: var(--studio-button-hoverBackground, var(--studio-button-background));
}

[data-okf-comment-compose] {
  position: fixed;
  z-index: 51;
  box-sizing: border-box;
  width: min(320px, calc(100vw - 16px));
  padding: 8px 10px;
  border: 1px solid var(--studio-editorWidget-border, var(--studio-focusBorder, #454545));
  border-radius: 0;
  background: var(--studio-editorWidget-background, var(--studio-editor-background));
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground));
  box-shadow: 0 2px 8px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
  font-size: 0.9em;
}

[data-okf-comment-compose] [data-okf-comment-quote] {
  max-height: 4.5em;
  margin-bottom: 6px;
  overflow: hidden;
  opacity: 0.7;
  font-style: italic;
  overflow-wrap: anywhere;
}

[data-okf-comment-compose] textarea,
[data-okf-comment-popover] textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 3.2em;
  resize: vertical;
  padding: 4px 6px;
  border: 1px solid var(--studio-input-border, rgba(128, 128, 128, 0.5));
  background: var(--studio-input-background);
  color: var(--studio-input-foreground);
  font: inherit;
}

[data-okf-comment-compose] textarea:focus,
[data-okf-comment-popover] textarea:focus {
  outline: 1px solid var(--studio-focusBorder);
  outline-offset: -1px;
}

[data-okf-comment-compose] [data-okf-comment-actions],
[data-okf-comment-popover] [data-okf-comment-reply] {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

[data-okf-comment-popover] [data-okf-comment-reply] {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
}

[data-okf-comment-popover] [data-okf-comment-reply] textarea {
  flex: 1 1 100%;
}

[data-okf-comment-compose] button,
[data-okf-comment-popover] [data-okf-comment-reply] button {
  padding: 2px 10px;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 3px;
  background: var(--studio-button-secondaryBackground, rgba(128, 128, 128, 0.25));
  color: var(--studio-button-secondaryForeground, inherit);
  font: inherit;
  cursor: pointer;
}

[data-okf-comment-compose] button[data-okf-comment-compose-save],
[data-okf-comment-popover] button[data-okf-comment-reply-send] {
  background: var(--studio-button-background);
  color: var(--studio-button-foreground);
}

/* Resolve / Reopen, Delete and its question in the thread popover (T44). */
[data-okf-comment-popover] [data-okf-comment-thread-actions] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
}

[data-okf-comment-popover] [data-okf-comment-thread-actions] button {
  padding: 2px 10px;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 3px;
  background: var(--studio-button-secondaryBackground, rgba(128, 128, 128, 0.25));
  color: var(--studio-button-secondaryForeground, inherit);
  font: inherit;
  cursor: pointer;
}

[data-okf-comment-popover] [data-okf-comment-thread-actions] button[disabled] {
  opacity: 0.5;
  cursor: default;
}

[data-okf-comment-popover] [data-okf-comment-thread-actions] button[data-okf-comment-delete-yes] {
  background: var(--studio-button-background);
  color: var(--studio-button-foreground);
}

[data-okf-comment-popover] [data-okf-comment-action-error],
[data-okf-comment-popover] [data-okf-comment-error] {
  flex: 1 1 100%;
  color: var(--studio-errorForeground, #f48771);
  overflow-wrap: anywhere;
}

/* The "Orphaned comments" box (T44) follows the content element, outside the patched HTML. Its top
   margin cancels the content's bottom padding, so it sits in that empty space: the scrollable
   height of the page only grows when the box is taller than the padding, and the end of the
   document, the first-element gap and the insert points of the content are untouched. The box
   passes pointer events through; only its entries take them. */
[data-okf-orphans] {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--sphinx-preview-column-width, ${DEFAULT_PREVIEW_CONTENT_WIDTH}px);
  margin: calc(-1 * min(80vh, max(24px, calc(100vh - var(--sphinx-preview-reading-offset, 0px) - 40px)))) auto 0;
  padding: 0 var(--sphinx-preview-content-gutter) 16px;
  pointer-events: none;
}

[data-okf-orphans] [data-okf-orphans-title] {
  margin-bottom: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
  font-weight: 600;
  opacity: 0.8;
}

[data-okf-orphans] button[data-okf-comment-orphan] {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin-top: 4px;
  padding: 4px 8px;
  border: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  pointer-events: auto;
}

[data-okf-orphans] button[data-okf-comment-orphan][data-okf-comment-resolved="true"] {
  opacity: 0.6;
}

[data-okf-orphans] [data-okf-orphan-quote] {
  display: block;
  font-style: italic;
  overflow-wrap: anywhere;
}

[data-okf-orphans] [data-okf-orphan-meta] {
  display: block;
  opacity: 0.7;
  font-size: 0.9em;
  overflow-wrap: anywhere;
}

/* Toolbar Diff button off: the marks go away at once; the host stops sending ranges. */
html[data-sphinx-preview-incoming="off"] [data-sphinx-preview-change-layer] {
  display: none;
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

/* Toolbar Comments button off: same hiding as the setting, kept per workspace. The button itself is
   not offered when the setting is off. */
html[data-sphinx-preview-comments="off"] #sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="comment"] {
  display: none;
}

html[data-okf-show-comments="false"] [data-sphinx-preview-comments-toggle] {
  display: none;
}

/* The thread chips are hidden with the gray ones. */
html[data-okf-show-comments="false"] #sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="thread"] {
  display: none;
}

#sphinx-myst-preview-content img {
  max-width: 100%;
  height: auto;
}

/* CR 050: an image written inside a paragraph is part of its line of text: the line runs through
   its middle, so a tall image does not read as a picture above the text. A paragraph holding only
   an image is a figure (centred block, data-sphinx-preview-figure) and keeps the default. */
#sphinx-myst-preview-content p:not([data-sphinx-preview-figure]) img {
  vertical-align: middle;
}

${directiveStyle("figure")}
#sphinx-myst-preview-content > :is(h1, h2, h3, h4, h5, h6) {
  clear: both;
}

/* The anchor icon of a (label)= target: it hangs in the left margin of the labelled block, so the
   text does not move, and stays faint until hovered. Without a paragraph or heading to hold it, it
   sits in a zero-height row before the block. */
#sphinx-myst-preview-content .okf-anchor {
  display: inline-block;
  box-sizing: border-box;
  width: 1.1em;
  margin-inline: -1.5em 0.4em;
  color: var(--studio-descriptionForeground, #717171);
  font-size: 0.8em;
  font-style: normal;
  font-weight: 400;
  line-height: 1;
  text-align: center;
  vertical-align: baseline;
  opacity: 0.55;
  user-select: none;
}

#sphinx-myst-preview-content .okf-anchor::before {
  content: "\\2693\\FE0E";
}

#sphinx-myst-preview-content .okf-anchor:hover {
  opacity: 1;
}

/* In edit mode the icon renames its label. */
:root[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content .okf-anchor {
  cursor: pointer;
}

[data-okf-label-rename] {
  position: fixed;
  z-index: 1060;
  display: grid;
  gap: 4px;
  width: min(22em, calc(100vw - 16px));
  padding: 6px;
  border: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.45));
  border-radius: 4px;
  background: var(--studio-editorWidget-background, #252526);
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground, inherit));
  box-shadow: 0 2px 8px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
}

[data-okf-label-rename] > input {
  box-sizing: border-box;
  width: 100%;
  padding: 3px 6px;
  border: 1px solid var(--studio-input-border, rgba(128, 128, 128, 0.45));
  background: var(--studio-input-background, transparent);
  color: var(--studio-input-foreground, inherit);
  font: inherit;
}

[data-okf-label-rename] > input:focus {
  outline: 1px solid var(--studio-focusBorder, #007fd4);
  outline-offset: -1px;
}

[data-okf-label-rename-status][data-visible="false"] {
  display: none;
}

[data-okf-label-rename-status] {
  font-size: 0.9em;
  color: var(--studio-descriptionForeground, inherit);
}

#sphinx-myst-preview-content .okf-anchor-row {
  position: relative;
  height: 0;
  margin: 0;
}

#sphinx-myst-preview-content .okf-anchor-row > .okf-anchor {
  position: absolute;
  top: 0.7em;
  inset-inline-start: -1.5em;
  margin: 0;
}

/* The MyST writer emits figure captions as a trailing paragraph, not a figcaption. */
#sphinx-myst-preview-content figcaption,
#sphinx-myst-preview-content figure > p:last-child {
  margin-top: 0.6em;
  margin-bottom: 0;
  color: var(--studio-descriptionForeground, inherit);
  font-size: 0.9em;
  font-style: italic;
  text-align: center;
}

/* A captioned MyST code-block is a figure around the code: the code stays left-aligned like a
   plain fence and the caption becomes a title bar joined to the top of the block (same width and
   border, square joint). The caption follows the code in the markup; order draws it first. */
#sphinx-myst-preview-content figure:has(> pre) {
  display: flex;
  flex-direction: column;
  margin: 1em 0;
  text-align: left;
}

#sphinx-myst-preview-content figure:has(> pre) > figcaption {
  order: -1;
  margin: 0;
  padding: 0.35em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(rgba(128, 128, 128, 0.12), rgba(128, 128, 128, 0.12)), var(--studio-textCodeBlock-background, rgba(128, 128, 128, 0.15));
  color: var(--studio-editor-foreground, inherit);
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.85em;
  font-style: normal;
  text-align: left;
  overflow-wrap: anywhere;
}

#sphinx-myst-preview-content figure:has(> pre) > figcaption > p {
  margin: 0;
  font: inherit;
}

#sphinx-myst-preview-content figure:has(> pre) > pre {
  margin: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

${directiveStyle("admonition")}
#sphinx-myst-preview-content blockquote {
  margin: 1em 0;
  padding: 0 1em;
  border-inline-start: 4px solid var(--sphinx-preview-border);
  color: var(--studio-descriptionForeground, inherit);
}

/*
 * Structural styling for code, tables and rules.
 *
 * These used to come from the Sphinx theme stylesheet. The preview renders the buffer
 * on its own now, so the only stylesheet in the page is this one.
 */
#sphinx-myst-preview-content :where(code, pre, samp, kbd) {
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
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
  color: var(--studio-textLink-foreground, #006ab1);
}

#sphinx-myst-preview-content pre {
  margin: 1em 0;
  padding: 0.9em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  background: var(--studio-textCodeBlock-background, rgba(128, 128, 128, 0.15));
  color: var(--studio-editor-foreground, inherit);
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
  color: var(--studio-descriptionForeground, inherit);
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
  color: var(--studio-descriptionForeground, #808080);
  content: attr(data-line-number);
  text-align: end;
  user-select: none;
}

#sphinx-myst-preview-content .myst-code-line-emphasized {
  background: color-mix(in srgb, var(--studio-editor-findMatchHighlightBackground, #ea5c0055) 35%, transparent);
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
  border-inline-start: 3px solid var(--studio-descriptionForeground, #808080);
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  color: var(--studio-descriptionForeground, inherit);
  font-style: italic;
}

#sphinx-myst-preview-content .myst-mermaid-diagram {
  min-height: 1.5em;
  overflow-x: auto;
  font-family: var(--studio-editor-font-family, monospace);
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
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-mermaid-error {
  color: var(--studio-errorForeground, #f14c4c);
  text-align: start;
}

#sphinx-myst-preview-content .myst-mermaid-error > p {
  margin: 0 0 0.25em;
  font-style: italic;
}

#sphinx-myst-preview-content .myst-mermaid-error-details {
  margin-bottom: 0.5em;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-mermaid-error-details summary {
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
}

#sphinx-myst-preview-content .myst-mermaid-error-details pre {
  margin: 0.4em 0 0;
  padding: 0.5em 0.75em;
  overflow-x: auto;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  background: var(--studio-textCodeBlock-background);
  color: var(--studio-editor-foreground);
  font-family: var(--studio-editor-font-family, monospace);
  font-style: normal;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .myst-plantuml-diagram {
  min-height: 1.5em;
  overflow-x: auto;
  font-family: var(--studio-editor-font-family, monospace);
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
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-plantuml-error {
  color: var(--studio-errorForeground, #f14c4c);
  font-style: italic;
}

html[data-sphinx-preview-theme-mode="white"] #sphinx-myst-preview-content pre > code.language-yaml,
html[data-sphinx-preview-theme-mode="white"] #sphinx-myst-preview-content pre > code.language-yaml *,
html[data-sphinx-preview-theme-mode="cream"] #sphinx-myst-preview-content pre > code.language-yaml,
html[data-sphinx-preview-theme-mode="cream"] #sphinx-myst-preview-content pre > code.language-yaml * {
  color: var(--studio-textLink-foreground, #006ab1);
}

/*
 * Syntax highlighting tokens emitted by highlight.js.
 *
 * A webview cannot read the editor's TextMate token colours, so the palette is built from
 * the chart colours instead: those are defined by every theme and already track light and
 * dark variants.
 */
#sphinx-myst-preview-content :where(.hljs-comment, .hljs-quote) {
  color: var(--studio-descriptionForeground, #808080);
  font-style: italic;
}

#sphinx-myst-preview-content :where(.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-type, .hljs-built_in, .hljs-name, .hljs-tag) {
  color: var(--studio-charts-blue, #3794ff);
}

#sphinx-myst-preview-content :where(.hljs-string, .hljs-meta .hljs-string, .hljs-regexp, .hljs-char.escape_, .hljs-selector-attr, .hljs-selector-pseudo) {
  color: var(--studio-charts-orange, #d18616);
}

#sphinx-myst-preview-content :where(.hljs-number, .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-addition) {
  color: var(--studio-charts-green, #89d185);
}

#sphinx-myst-preview-content :where(.hljs-title, .hljs-title.function_, .hljs-title.class_, .hljs-section, .hljs-doctag, .hljs-meta, .hljs-meta .hljs-keyword) {
  color: var(--studio-charts-purple, #b180d7);
}

#sphinx-myst-preview-content :where(.hljs-attr, .hljs-attribute, .hljs-property, .hljs-variable, .hljs-template-variable, .hljs-params, .hljs-selector-id, .hljs-selector-class) {
  color: var(--studio-charts-yellow, #cca700);
}

#sphinx-myst-preview-content :where(.hljs-deletion, .hljs-formula) {
  color: var(--studio-charts-red, #f14c4c);
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
    linear-gradient(to right, var(--studio-editor-background, Canvas) 30%, transparent) left center / 2rem 100% no-repeat local,
    linear-gradient(to left, var(--studio-editor-background, Canvas) 30%, transparent) right center / 2rem 100% no-repeat local,
    radial-gradient(farthest-side at 0 50%, color-mix(in srgb, var(--studio-editor-foreground, var(--studio-foreground, CanvasText)) 35%, transparent), transparent) left center / 1rem 100% no-repeat scroll,
    radial-gradient(farthest-side at 100% 50%, color-mix(in srgb, var(--studio-editor-foreground, var(--studio-foreground, CanvasText)) 35%, transparent), transparent) right center / 1rem 100% no-repeat scroll;
}

#sphinx-myst-preview-content :where(th, td) {
  padding: 0.4em 0.8em;
  border: 1px solid var(--sphinx-preview-border);
  text-align: start;
  vertical-align: top;
}

#sphinx-myst-preview-content th {
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.12));
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

${directiveStyle("tables")}
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
  color: var(--studio-descriptionForeground, inherit);
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

/* MyST {grid}: the column count follows the pane width (container queries), one column when narrow. */
#sphinx-myst-preview-content .myst-grid {
  container-type: inline-size;
  margin: 1.2em 0;
}

#sphinx-myst-preview-content .myst-grid-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1em;
}

${gridColumnCss()}

#sphinx-myst-preview-content .myst-grid-item {
  min-width: 0;
}

#sphinx-myst-preview-content .myst-grid-item > :first-child {
  margin-top: 0;
}

#sphinx-myst-preview-content .myst-grid-item > :last-child {
  margin-bottom: 0;
}

#sphinx-myst-preview-content .myst-grid-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 6px;
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  color: var(--studio-editor-foreground, inherit);
}

#sphinx-myst-preview-content .myst-grid-card-title {
  padding: 0.7em 1em 0;
  font-weight: 600;
}

#sphinx-myst-preview-content .myst-grid-card-header,
#sphinx-myst-preview-content .myst-grid-card-footer {
  padding: 0.5em 1em;
  border-color: var(--sphinx-preview-border);
  border-style: solid;
  border-width: 0;
  color: var(--studio-descriptionForeground, inherit);
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-grid-card-header {
  border-bottom-width: 1px;
}

#sphinx-myst-preview-content .myst-grid-card-footer {
  border-top-width: 1px;
}

#sphinx-myst-preview-content .myst-grid-card-body {
  flex: 1 1 auto;
  padding: 0.7em 1em;
}

#sphinx-myst-preview-content .myst-grid-card-body > :first-child,
#sphinx-myst-preview-content .myst-grid-card-header > :first-child,
#sphinx-myst-preview-content .myst-grid-card-footer > :first-child {
  margin-top: 0;
}

#sphinx-myst-preview-content .myst-grid-card-body > :last-child,
#sphinx-myst-preview-content .myst-grid-card-header > :last-child,
#sphinx-myst-preview-content .myst-grid-card-footer > :last-child {
  margin-bottom: 0;
}

/* The whole card is the click target of its link. */
#sphinx-myst-preview-content .myst-grid-card-link::after {
  content: "";
  position: absolute;
  inset: 0;
}

/* MyST {toctree}: a list of links to the referenced documents. */
#sphinx-myst-preview-content .myst-toctree {
  margin: 1.2em 0;
}

#sphinx-myst-preview-content .myst-toctree-hidden {
  display: none;
}

#sphinx-myst-preview-content .myst-toctree-caption {
  margin: 0 0 0.4em;
  font-size: 0.85em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--studio-descriptionForeground, inherit);
}

#sphinx-myst-preview-content .myst-toctree-list {
  margin: 0;
  padding-left: 1.4em;
}

#sphinx-myst-preview-content .myst-toctree-missing {
  border-bottom: 1px dashed var(--studio-charts-orange, #d18616);
  color: var(--studio-charts-orange, #d18616);
  cursor: help;
}

#sphinx-myst-preview-content .myst-toctree-missing::before {
  content: "\\26A0\\FE0E\\00A0";
}

#sphinx-myst-preview-content .myst-directive {
  margin: 1.2em 0;
  padding: 0.6em 0.9em;
  border: 1px dashed var(--sphinx-preview-border);
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
}

#sphinx-myst-preview-content .myst-directive-name {
  margin: 0;
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-directive pre {
  margin: 0.5em 0 0;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content :where(.math-inline, .math-display) {
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
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
  color: var(--studio-descriptionForeground, #6e6e6e);
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
  outline: 1px solid var(--studio-focusBorder, currentColor);
  outline-offset: 2px;
}

#sphinx-myst-preview-content [data-okf-properties] [data-okf-issue-highlight="true"] {
  outline: 2px solid var(--studio-errorForeground, #f14c4c);
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
  color: var(--studio-descriptionForeground, inherit);
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
  color: var(--studio-errorForeground, #f14c4c);
  font-size: 0.9em;
  font-weight: 600;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-info-row.okf-error th {
  color: var(--studio-errorForeground, #f14c4c);
  background: var(--studio-inputValidation-errorBackground, rgba(235, 80, 80, 0.12));
  white-space: normal;
  overflow-wrap: anywhere;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-properties thead th {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--studio-descriptionForeground, inherit);
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
  background: var(--studio-list-hoverBackground, rgba(128, 128, 128, 0.12));
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
  color: var(--studio-descriptionForeground, GrayText);
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
  color: var(--studio-descriptionForeground, GrayText);
  content: "-";
  font-weight: 600;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-list-more,
#sphinx-myst-preview-content [data-okf-properties] .okf-list-empty {
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.88em;
}

.sphinx-preview-link-tooltip {
  position: fixed;
  z-index: 10000;
  box-sizing: border-box;
  width: max-content;
  max-width: min(480px, calc(100vw - 16px));
  padding: 8px 10px;
  border: 1px solid var(--studio-editorHoverWidget-border, var(--studio-widget-border, #808080));
  border-radius: 3px;
  background: var(--studio-editorHoverWidget-background, var(--studio-editor-background, #f3f3f3));
  color: var(--studio-editorHoverWidget-foreground, var(--studio-editor-foreground, #333333));
  box-shadow: 0 2px 8px var(--studio-widget-shadow, rgba(0, 0, 0, 0.2));
  font-family: var(--studio-font-family, sans-serif);
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
  color: var(--studio-descriptionForeground, GrayText);
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
  color: var(--studio-errorForeground, #f14c4c);
  cursor: help;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-link-unavailable {
  border-bottom-style: dotted;
  color: var(--studio-descriptionForeground, GrayText);
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
  outline: 1px solid var(--studio-focusBorder, currentColor);
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
  color: var(--studio-descriptionForeground, inherit);
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

/*
 * Motion (CR 046): short, opacity-led effects that never move the layout.
 * - Editors, bars and menus appear softly (@starting-style), only after a pointer or key press:
 *   the runtime sets data-sphinx-preview-motion="on" then and takes it back for a content patch,
 *   so a page that loads, restores an editor or follows the editor's scrolling shows no motion.
 * - A block an editor gives back fades back in (data-sphinx-preview-edit-closed).
 * - A theme switch from the toolbar fades the colours (data-sphinx-preview-theme-switching).
 * - Blocks an outside change or an undo updated glow once (data-sphinx-preview-updated).
 * The table bar never transitions transform: it moves with transform while its table scrolls.
 * prefers-reduced-motion: reduce turns every one of them off (end of this section).
 */
:root {
  --sphinx-preview-motion-fast: 120ms;
  --sphinx-preview-motion: 160ms;
  --sphinx-preview-motion-theme: 200ms;
  --sphinx-preview-motion-glow: 600ms;
  --sphinx-preview-motion-ease: cubic-bezier(0.2, 0, 0, 1);
}

html[data-sphinx-preview-motion="on"] :is(.sphinx-preview-block-editor, .sphinx-preview-table-cell-editor, [data-okf-frontmatter-editor]) {
  transition: opacity var(--sphinx-preview-motion) var(--sphinx-preview-motion-ease);
}

html[data-sphinx-preview-motion="on"] :is(.sphinx-preview-edit-palette, .sphinx-preview-table-menu, .sphinx-preview-frontmatter-menu) {
  transition: opacity var(--sphinx-preview-motion-fast) var(--sphinx-preview-motion-ease);
}

html[data-sphinx-preview-motion="on"] :is(.sphinx-preview-edit-palette-menu, .sphinx-preview-slash-menu, .sphinx-preview-frontmatter-picker) {
  transition: opacity var(--sphinx-preview-motion-fast) var(--sphinx-preview-motion-ease),
    translate var(--sphinx-preview-motion-fast) var(--sphinx-preview-motion-ease);
}

@starting-style {
  html[data-sphinx-preview-motion="on"] :is(.sphinx-preview-block-editor, .sphinx-preview-table-cell-editor, [data-okf-frontmatter-editor]) {
    opacity: 0.35;
  }

  html[data-sphinx-preview-motion="on"] :is(.sphinx-preview-edit-palette, .sphinx-preview-table-menu, .sphinx-preview-frontmatter-menu) {
    opacity: 0;
  }

  html[data-sphinx-preview-motion="on"] :is(.sphinx-preview-edit-palette-menu, .sphinx-preview-slash-menu, .sphinx-preview-frontmatter-picker) {
    opacity: 0;
    translate: 0 -3px;
  }
}

[data-sphinx-preview-edit-closed="true"] {
  animation: sphinx-preview-edit-closed var(--sphinx-preview-motion) var(--sphinx-preview-motion-ease);
}

@keyframes sphinx-preview-edit-closed {
  from { opacity: 0.35; }
}

html[data-sphinx-preview-theme-switching="true"],
html[data-sphinx-preview-theme-switching="true"] body,
html[data-sphinx-preview-theme-switching="true"] body * {
  transition: background-color var(--sphinx-preview-motion-theme) ease,
    color var(--sphinx-preview-motion-theme) ease,
    border-color var(--sphinx-preview-motion-theme) ease,
    outline-color var(--sphinx-preview-motion-theme) ease,
    fill var(--sphinx-preview-motion-theme) ease,
    stroke var(--sphinx-preview-motion-theme) ease;
}

/* A translucent wash of the focus colour: the text stays readable on every theme mode, and the
   block's own background (code, tables, callouts) comes back as the glow fades. */
#sphinx-myst-preview-content [data-sphinx-preview-updated="true"] {
  --sphinx-preview-update-glow: color-mix(in srgb, var(--studio-focusBorder, Highlight) 24%, transparent);
  animation: sphinx-preview-update-glow var(--sphinx-preview-motion-glow) ease-out;
}

@keyframes sphinx-preview-update-glow {
  from {
    background-color: var(--sphinx-preview-update-glow);
    box-shadow: 0 0 0 4px var(--sphinx-preview-update-glow);
  }
}

@media (prefers-reduced-motion: reduce) {
  html[data-sphinx-preview-motion="on"] :is(.sphinx-preview-block-editor, .sphinx-preview-table-cell-editor, [data-okf-frontmatter-editor], .sphinx-preview-edit-palette, .sphinx-preview-table-menu, .sphinx-preview-frontmatter-menu, .sphinx-preview-edit-palette-menu, .sphinx-preview-slash-menu, .sphinx-preview-frontmatter-picker),
  html[data-sphinx-preview-theme-switching="true"],
  html[data-sphinx-preview-theme-switching="true"] body,
  html[data-sphinx-preview-theme-switching="true"] body *,
  [data-sphinx-preview-edit-closed="true"],
  #sphinx-myst-preview-content [data-sphinx-preview-updated="true"] {
    animation: none !important;
    transition: none !important;
  }
}
`; // end of PREVIEW_THEME_CSS

export function previewContentWidthCss(maxContentWidth = DEFAULT_PREVIEW_CONTENT_WIDTH): string {
  const width = normalizePreviewContentWidth(maxContentWidth);
  const cssWidth = width === 0 ? "none" : `${width}px`;
  return `:root { --sphinx-preview-content-max-width: ${cssWidth}; }`;
}
