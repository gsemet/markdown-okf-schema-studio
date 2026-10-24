/**
 * Edit mode: scroll anchoring, editable blocks, insert points and move buttons, the block and table
 * cell editors and the table menu.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const EDIT_MODE_CSS = `
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
`;
