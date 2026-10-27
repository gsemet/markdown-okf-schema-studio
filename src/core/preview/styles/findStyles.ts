/**
 * The find bar (`modules/findBar.ts`) and the paint of its matches. The bar sits under the toolbar,
 * next to it in the Tab order, and reads the same neutral `--studio-*` tokens, so every theme mode
 * restyles it. The matches are painted with the CSS Custom Highlight API: no element wraps them.
 */
export const FIND_CSS = `
::highlight(studio-find) {
  background-color: var(--studio-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33));
}

::highlight(studio-find-current) {
  background-color: var(--sphinx-find-current-background, #f5a54d);
  color: #1b1b1b;
}

[data-sphinx-preview-find] {
  position: fixed;
  inset-block-start: var(--sphinx-find-top, 56px);
  inset-inline-end: 14px;
  z-index: 1090;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: min(420px, calc(100vw - 28px));
  padding: 6px;
  border: 1px solid var(--sphinx-preview-border, var(--studio-widget-border, rgba(128, 128, 128, 0.4)));
  border-radius: 8px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.25);
  font: 13px/1.4 var(--studio-font-family, system-ui, sans-serif);
}

[data-sphinx-preview-find][hidden] {
  display: none;
}

[data-sphinx-preview-find] [data-find-row] {
  display: flex;
  align-items: center;
  gap: 2px;
}

[data-sphinx-preview-find] [data-find-row][hidden] {
  display: none;
}

[data-sphinx-preview-find] [data-find-row="replace"] {
  padding-inline-start: 26px;
}

[data-sphinx-preview-find] input {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 0;
  height: 26px;
  padding: 2px 6px;
  border: 1px solid var(--studio-input-border, rgba(128, 128, 128, 0.5));
  border-radius: 4px;
  background: var(--studio-input-background, var(--studio-editor-background, Canvas));
  color: var(--studio-input-foreground, var(--studio-editor-foreground, CanvasText));
  font: inherit;
}

[data-sphinx-preview-find] input[aria-invalid="true"] {
  border-color: var(--studio-inputValidation-errorBorder, #be1100);
}

[data-sphinx-preview-find] input:disabled {
  opacity: 0.5;
}

[data-sphinx-preview-find] button {
  display: grid;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--studio-icon-foreground, inherit);
  cursor: pointer;
}

[data-sphinx-preview-find] button:hover {
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

[data-sphinx-preview-find] button[aria-pressed="true"] {
  background: var(--studio-button-background, #0e639c);
  color: var(--studio-button-foreground, #ffffff);
}

[data-sphinx-preview-find] button[aria-disabled="true"] {
  opacity: 0.45;
  cursor: not-allowed;
}

[data-sphinx-preview-find] button[aria-disabled="true"]:hover {
  background: transparent;
}

[data-sphinx-preview-find] button > svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

[data-sphinx-preview-find] [data-find-toggle-replace] > svg {
  transition: transform 0.12s ease;
}

[data-sphinx-preview-find][data-replace="open"] [data-find-toggle-replace] > svg {
  transform: rotate(90deg);
}

[data-sphinx-preview-find] [data-find-count] {
  flex: 0 0 auto;
  min-width: 64px;
  padding-inline: 4px;
  text-align: center;
  white-space: nowrap;
  color: var(--studio-descriptionForeground, inherit);
}

[data-sphinx-preview-find] [data-find-note] {
  padding-inline: 4px;
  color: var(--studio-descriptionForeground, inherit);
}

[data-sphinx-preview-find] [data-find-note]:empty {
  display: none;
}

@media (forced-colors: active) {
  ::highlight(studio-find) {
    background-color: Mark;
    color: MarkText;
  }

  ::highlight(studio-find-current) {
    background-color: Highlight;
    color: HighlightText;
  }
}
`;
