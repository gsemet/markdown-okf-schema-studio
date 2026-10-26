// @implements_req SwRS-MDOKFSTUDIO-CORE-050
// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-005
/**
 * The OKF frontmatter properties table and the motion rules (transitions, reduced motion).
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const PROPERTIES_CSS = `
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

/* The key column fits its keys (CR 109): a key never breaks inside a word, the column takes the
   width of the longest key up to 40% of the table, a longer key ends with an ellipsis (a key of
   more than 24 characters carries its full name as tooltip), the header label "Names" stays whole and the value column wraps in the
   rest. The preview-wide overflow-wrap: anywhere would otherwise shrink the column to one letter.
   The section is the size container that 40cqw measures (a table box cannot be one). */
[data-okf-properties] {
  container-type: inline-size;
}

[data-okf-properties] .okf-properties tbody th[scope="row"]:not([colspan]) {
  width: 1%;
}

#sphinx-myst-preview-content [data-okf-properties] .okf-properties tbody th:not([colspan]) .okf-name-cell {
  max-width: calc(40cqw - 2em);
}

#sphinx-myst-preview-content [data-okf-properties] .okf-properties .okf-name-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow-wrap: normal;
}

/* The key column is as wide as its longest key, which can be shorter than the "Names" label of the
   header: the label never breaks inside the word either. */
#sphinx-myst-preview-content [data-okf-properties] .okf-properties thead th:first-child {
  white-space: nowrap;
  overflow-wrap: normal;
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
`;
