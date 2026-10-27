import {
  DEFAULT_PREVIEW_CONTENT_WIDTH,
  normalizePreviewContentWidth,
} from "../configuration/previewConfiguration";
import { VSCODE_THEME_TOKEN_CSS } from "./themeTokens";
import { COMMENT_CSS } from "./styles/commentStyles";
import { CODE_BLOCK_CSS } from "./styles/codeBlockStyles";
import { CONTENT_BLOCK_CSS } from "./styles/contentBlockStyles";
import { CONTENT_LAYOUT_CSS } from "./styles/contentLayoutStyles";
import { EDIT_MODE_CSS } from "./styles/editModeStyles";
import { EDIT_PALETTE_CSS } from "./styles/editPaletteStyles";
import { HTML_BLOCK_CSS } from "./styles/htmlBlockStyles";
import { TOC_CSS } from "./styles/tocStyles";
import { FRONTMATTER_EDITOR_CSS } from "./styles/frontmatterEditorStyles";
import { PAGE_CHROME_CSS } from "./styles/pageChromeStyles";
import { PROPERTIES_CSS } from "./styles/propertiesStyles";

/**
 * Stylesheets injected into every preview webview.
 *
 * Kept free of `vscode` imports so the CSS contract can be unit tested directly. The rules read
 * the neutral `--studio-*` theme tokens only; the accessibility sheet, which every page loads
 * first, maps them to the host's variables (themeTokens.ts). The theme sheet is split by feature
 * under `styles/`, one module per part, joined here in cascade order.
 */

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-128
/**
 * The accessibility sheet: the theme token mapping, base colours, focus rings, status banners,
 * forced colours and reduced motion.
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
 * under the top heading, figure captions, and admonition callouts. The parts are joined in the
 * order of the former single sheet, so the cascade is unchanged.
 */
export const PREVIEW_THEME_CSS =
  PAGE_CHROME_CSS
  + EDIT_MODE_CSS
  + EDIT_PALETTE_CSS
  + FRONTMATTER_EDITOR_CSS
  + CONTENT_LAYOUT_CSS
  + COMMENT_CSS
  + HTML_BLOCK_CSS
  + TOC_CSS
  + CONTENT_BLOCK_CSS
  + CODE_BLOCK_CSS
  + PROPERTIES_CSS;

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-002
/** The per-render rule that sets the content column width (0 lifts the limit). */
export function previewContentWidthCss(maxContentWidth = DEFAULT_PREVIEW_CONTENT_WIDTH): string {
  const width = normalizePreviewContentWidth(maxContentWidth);
  const cssWidth = width === 0 ? "none" : `${width}px`;
  return `:root { --sphinx-preview-content-max-width: ${cssWidth}; }`;
}
