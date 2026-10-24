/**
 * The figure edit button, the frontmatter menu and the inline frontmatter editors (values, booleans,
 * lists, pickers, status line).
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const FRONTMATTER_EDITOR_CSS = `
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
`;
