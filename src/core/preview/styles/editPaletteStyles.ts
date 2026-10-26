// @implements_req SwRS-MDOKFSTUDIO-PALETTE-252
/**
 * The edition palette: the pill bar, its popovers and pickers (table grid, emoji, references,
 * colours), the table cell bar, the `/` menu and the link and figure panels.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const EDIT_PALETTE_CSS = `
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

/* The rule and the cell formatting group form one flex item, so they wrap together. */
.sphinx-preview-table-menu-cell-group {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  min-width: 0;
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
`;
