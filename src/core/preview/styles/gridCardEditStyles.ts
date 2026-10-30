// @implements_req SwRS-MDOKFSTUDIO-BLOCK-257
/**
 * A block editor open in a `{grid-item-card}` or a `{card}` (body, title, header or footer).
 *
 * The card item gets a minimum width and pushes its neighbours aside, like the table cell editor
 * does for its column: the row's tracks take the item's minimum width into account while an editor
 * is open (`--myst-grid-track-min: auto`, see `gridColumnCss`). The edition palette is not sticky
 * there, sits above the text box in one row that may be wider than the card, and scrolls
 * vertically past its maximum height. The text box keeps a readable minimum width.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), after the
 * content block rules it overrides.
 */
export const GRID_CARD_EDIT_CSS = `
/* The card being edited keeps room for its text box; the other cards of the row give way. */
#sphinx-myst-preview-content .myst-grid-row:has(.myst-grid-item .sphinx-preview-block-editor) {
  --myst-grid-track-min: auto;
}

#sphinx-myst-preview-content .myst-grid-item:has(.sphinx-preview-block-editor) {
  min-width: 24em;
}

/* The palette may leave the card: it must not be clipped by the card's rounded border. */
#sphinx-myst-preview-content .myst-grid-card:has(.sphinx-preview-block-editor-host) {
  overflow: visible;
}

#sphinx-myst-preview-content .myst-grid-card .sphinx-preview-block-editor {
  min-width: min(100%, 18em);
}

/* In a card the palette stays in the flow, above the text box (a stuck bar would ride down over it),
   so the frame needs no room for a bar that rides down. */
#sphinx-myst-preview-content .myst-grid-card .sphinx-preview-block-editor-host > .sphinx-preview-edit-palette {
  position: relative;
  inset-block-start: auto;
  z-index: 3;
  max-width: min(100cqw, calc(100% + 4em));
  max-height: min(9em, 30vh);
  margin: 0 0 4px;
}

#sphinx-myst-preview-content .myst-grid-card .sphinx-preview-block-editor-host > .sphinx-preview-edit-palette:not(:has(> .sphinx-preview-edit-palette-menu)) {
  overflow-y: auto;
}

#sphinx-myst-preview-content .myst-grid-card .sphinx-preview-block-editor-host > .sphinx-preview-block-editor {
  margin-top: 0;
}
`;
