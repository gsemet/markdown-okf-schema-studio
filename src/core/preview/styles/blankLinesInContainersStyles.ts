// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * The blank-line block inside a container (a quote, an alert, an admonition, a context-tag panel, a
 * figure, a card, a grid item, a definition, a footnote, a list item): it sits in the container's
 * content box, as wide as the text around it, so it never reaches over a quote border, an alert
 * icon or title, or the container's padding. The Delete button stays inside the block, at its left
 * edge.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), after the rules
 * of the block (`editModeStyles.ts`).
 */
export const BLANK_LINES_IN_CONTAINERS_CSS = `
:is(blockquote, aside, details, figure, dd, li, .myst-card, .myst-grid-item, .admonition) > .sphinx-preview-blank-lines {
  box-sizing: border-box;
  width: auto;
  min-width: 0;
  max-width: 100%;
  margin-left: 0;
  margin-right: 0;
}

:is(blockquote, aside, details, figure, dd, li, .myst-card, .myst-grid-item, .admonition) > .sphinx-preview-blank-lines:first-child {
  margin-top: 0.3em;
}

:is(blockquote, aside, details, figure, dd, li, .myst-card, .myst-grid-item, .admonition) > .sphinx-preview-blank-lines:last-child {
  margin-bottom: 0.3em;
}
`;
