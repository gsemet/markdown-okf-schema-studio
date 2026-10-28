// @implements_req SwRS-MDOKFSTUDIO-PALETTE-002
import { CALLOUT_ICONS } from "../calloutIcons";
import { DEFAULT_PREVIEW_CONTENT_WIDTH } from "../../configuration/previewConfiguration";

// @implements_req SwRS-MDOKFSTUDIO-THEME-025
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-002
/** The Dark, White and Cream palettes: each forced mode sets the whole `--studio-*` palette itself. */
const FORCED_THEME_MODES_CSS = `html[data-sphinx-preview-theme-mode="dark"],
html[data-sphinx-preview-theme-mode="dark"] body {
  color-scheme: dark;
  --sphinx-preview-band-shadow: rgba(0, 0, 0, 0.6);
  --sphinx-preview-scrollbar-thumb: #686868;
  --sphinx-preview-scrollbar-hover: #9e9e9e;
  --studio-editor-background: #1e1e1e;
  --studio-editor-foreground: #d4d4d4;
  --studio-foreground: #d4d4d4;
  --studio-editorWidget-background: #252526;
  --studio-editorWidget-foreground: #d4d4d4;
  --studio-editorWidget-border: #454545;
  --studio-dropdown-background: var(--studio-editorWidget-background);
  --studio-dropdown-foreground: var(--studio-editor-foreground);
  --studio-dropdown-border: var(--studio-editorWidget-border);
  --studio-icon-foreground: #d4d4d4;
  --studio-toolbar-hoverBackground: rgba(255, 255, 255, 0.1);
  --studio-input-background: #3c3c3c;
  --studio-input-foreground: #d4d4d4;
  --studio-input-border: #454545;
  --studio-button-background: #0e639c;
  --studio-button-foreground: #ffffff;
  --studio-errorForeground: #f48771;
  --studio-descriptionForeground: #a8a8a8;
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
  --sphinx-preview-band-shadow: rgba(0, 0, 0, 0.18);
  color-scheme: light;
  --sphinx-preview-scrollbar-thumb: #b3b3b3;
  --sphinx-preview-scrollbar-hover: #808080;
  --studio-editor-background: #ffffff;
  --studio-editor-foreground: #1f1f1f;
  --studio-foreground: #1f1f1f;
  --studio-editorWidget-background: #f3f3f3;
  --studio-editorWidget-foreground: #1f1f1f;
  --studio-editorWidget-border: #c8c8c8;
  --studio-dropdown-background: var(--studio-editorWidget-background);
  --studio-dropdown-foreground: var(--studio-editor-foreground);
  --studio-dropdown-border: var(--studio-editorWidget-border);
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
  --sphinx-preview-band-shadow: rgba(43, 42, 39, 0.2);
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
  --studio-editorWidget-foreground: #2b2a27;
  --studio-editorWidget-border: #d6cdbd;
  --studio-dropdown-background: var(--studio-editorWidget-background);
  --studio-dropdown-foreground: var(--studio-editor-foreground);
  --studio-dropdown-border: var(--studio-editorWidget-border);
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
}`;

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-002
// @implements_req SwRS-MDOKFSTUDIO-LIFE-049
// @implements_req SwRS-MDOKFSTUDIO-MYST-081
// @implements_req SwRS-MDOKFSTUDIO-THEME-031
// @implements_req SwRS-MDOKFSTUDIO-THEME-043
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-001
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-025
/**
 * The page chrome: layout variables, the theme modes, the toolbar and its menus, the status banners,
 * the sticky heading band and the tooltips.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const PAGE_CHROME_CSS = `
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

${FORCED_THEME_MODES_CSS}

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

/* Rows 2 to 5: the collapse button of row 1 hides them (the hidden attribute removes them from
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
  inset-block-start: 192px;
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

/* Below the toolbar: five rows, or one row when rows 2 to 5 are collapsed. */
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
  /* Widest toolbar row, expanded or collapsed (3 buttons of 30px, 2px gaps, 3px padding, 1px border)
     + 14px margin + 4px clearance + 4px slack. */
  --sphinx-preview-warning-banner-reserve: calc(3 * 30px + 2 * 2px + 8px + 14px + 8px);
  --sphinx-preview-warning-accent: color-mix(in srgb, var(--studio-charts-yellow, #bf8803) 75%, var(--studio-editor-foreground, CanvasText));
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

[data-sphinx-preview-code-copy]:focus-visible,
#sphinx-myst-preview-content pre[tabindex]:focus-visible {
  outline: 2px solid var(--studio-focusBorder, #007fd4);
  outline-offset: 1px;
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
}

/* A button that stays focusable but unavailable (the Edit button of a read-only preview). */
[data-sphinx-preview-toolbar] button[aria-disabled="true"] {
  cursor: not-allowed;
}

[data-sphinx-preview-toolbar] button[aria-disabled="true"]:hover {
  background: transparent;
}

[data-sphinx-preview-toolbar] button[aria-disabled="true"] > svg {
  opacity: 0.5;
}

[data-sphinx-preview-toolbar] button:disabled > svg {
  opacity: 0.5;
}

[data-sphinx-preview-toolbar] button[data-tooltip],
.sphinx-preview-table-menu button[data-tooltip],
.sphinx-preview-edit-palette > button[data-tooltip] {
  position: relative;
}

[data-sphinx-preview-toolbar] button[data-tooltip]::after,
.sphinx-preview-table-menu button[data-tooltip]::after,
.sphinx-preview-edit-palette > button[data-tooltip]::after {
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
.sphinx-preview-table-menu button[data-tooltip]:focus-visible::after,
.sphinx-preview-edit-palette > button[data-tooltip]:hover::after,
.sphinx-preview-edit-palette > button[data-tooltip]:focus-visible::after {
  visibility: visible;
  opacity: 1;
}

/* Tooltip bubble (shared rules in pageChromeStyles): centred under the button and sliding in like the
   floating toolbar's. It is not rendered until the button is hovered or focused (a hidden bubble would
   still widen the page near the bar's right edge); the first buttons align to the bar's start edge so
   the bubble stays inside. */
.sphinx-preview-edit-palette > button[data-tooltip] {
  --sphinx-preview-edit-tooltip-x: -50%;
}

.sphinx-preview-edit-palette > button[data-tooltip]:nth-child(-n+4) {
  --sphinx-preview-edit-tooltip-x: 0px;
}

.sphinx-preview-edit-palette > button[data-tooltip]::after {
  display: none;
  transform: translate(var(--sphinx-preview-edit-tooltip-x), 0);
  transition: none;
}

.sphinx-preview-edit-palette > button[data-tooltip]:nth-child(-n+4)::after {
  inset-inline-start: 0;
}

.sphinx-preview-edit-palette > button[data-tooltip]:hover::after,
.sphinx-preview-edit-palette > button[data-tooltip]:focus-visible::after {
  display: block;
  animation: sphinx-preview-edit-tooltip-in 100ms ease;
}

@keyframes sphinx-preview-edit-tooltip-in {
  from { opacity: 0; transform: translate(var(--sphinx-preview-edit-tooltip-x), -3px); }
  to { opacity: 1; transform: translate(var(--sphinx-preview-edit-tooltip-x), 0); }
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

/* A soft shadow under the band while content scrolls under it. A box-shadow takes no layout space
   (no shift of the content or the reading offset) and the band is below the toolbar (z-index). It
   appears and disappears at once, so there is no motion to reduce. */
[data-sphinx-preview-sticky-headings][data-scrolled-under] {
  box-shadow: 0 6px 8px -5px var(--sphinx-preview-band-shadow, rgba(0, 0, 0, 0.28));
}
`;
