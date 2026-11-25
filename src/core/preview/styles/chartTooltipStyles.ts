/**
 * The hover detail of the charts (`page/modules/chartTooltip.ts`): one box at body level, in the
 * colours, font and text size of the page. Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`,
 * `../previewStyles.ts`).
 */
// A dark page: the forced dark mode, or the current mode over a dark VS Code theme.
const DARK_PAGE = [
  'html[data-sphinx-preview-theme-mode="dark"]',
  'html[data-sphinx-preview-theme-mode="current"] body:is(.vscode-dark, .vscode-high-contrast)',
];
const darkBox = DARK_PAGE.map((scope) => `${scope} .myst-vega-tooltip`).join(",\n");

export const CHART_TOOLTIP_CSS = `
/* The hover detail of a chart mark: the legend label size (0.93em of the body), the editor colours. */
.myst-vega-tooltip {
  position: fixed;
  z-index: 1070;
  box-sizing: border-box;
  max-width: min(32em, 90vw);
  padding: 4px 8px;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  background: var(--studio-editor-background);
  color: var(--studio-editor-foreground);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  font-family: var(--sphinx-preview-font);
  font-size: 0.93em;
  line-height: 1.35;
  pointer-events: none;
  overflow-wrap: anywhere;
}

.myst-vega-tooltip[hidden] {
  display: none;
}

.myst-vega-tooltip-key {
  margin-inline-end: 0.5em;
  color: var(--studio-descriptionForeground);
}

.myst-vega-tooltip-value {
  font-weight: bold;
}

${darkBox} {
  border-color: var(--studio-descriptionForeground);
}
`;
