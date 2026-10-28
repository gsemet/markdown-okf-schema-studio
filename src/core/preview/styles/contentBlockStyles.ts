import { directiveStyle } from "../../directives/registry";
import { gridColumnCss } from "../../render/mystGridToctree";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-002
// @implements_req SwRS-MDOKFSTUDIO-MYST-100
// @implements_req SwRS-MDOKFSTUDIO-MYST-098
// @implements_req SwRS-MDOKFSTUDIO-CODE-007
// @implements_req SwRS-MDOKFSTUDIO-CODE-008
// @implements_req SwRS-MDOKFSTUDIO-CODE-014
// @implements_req SwRS-MDOKFSTUDIO-CORE-028
// @implements_req SwRS-MDOKFSTUDIO-CORE-034
// @implements_req SwRS-MDOKFSTUDIO-CORE-022
// @implements_req SwRS-MDOKFSTUDIO-CORE-008
// @implements_req SwRS-MDOKFSTUDIO-DIAG-001
// @implements_req SwRS-MDOKFSTUDIO-DIAG-023
// @implements_req SwRS-MDOKFSTUDIO-DIAG-032
// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-032
/**
 * Rendered blocks: inline images, label anchors, figures, admonitions, code and highlighting,
 * diagrams, tables, project-only placeholders, grids, toctrees and math.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const CONTENT_BLOCK_CSS = `
/* CR 050: an image written inside a paragraph is part of its line of text: the line runs through
   its middle, so a tall image does not read as a picture above the text. A paragraph holding only
   an image is a figure (centred block, data-sphinx-preview-figure) and keeps the default. */
#sphinx-myst-preview-content p:not([data-sphinx-preview-figure]) img {
  vertical-align: middle;
}

${directiveStyle("figure")}
#sphinx-myst-preview-content > :is(h1, h2, h3, h4, h5, h6) {
  clear: both;
}

/* The anchor icon of a (label)= target: it hangs in the left margin of the labelled block, so the
   text does not move, and stays faint until hovered. Without a paragraph or heading to hold it, it
   sits in a zero-height row before the block. */
#sphinx-myst-preview-content .okf-anchor {
  display: inline-block;
  box-sizing: border-box;
  width: 1.1em;
  margin-inline: -1.5em 0.4em;
  color: var(--studio-descriptionForeground, #717171);
  font-size: 0.8em;
  font-style: normal;
  font-weight: 400;
  line-height: 1;
  text-align: center;
  vertical-align: baseline;
  opacity: 0.55;
  user-select: none;
}

#sphinx-myst-preview-content .okf-anchor::before {
  content: "\\2693\\FE0E";
}

#sphinx-myst-preview-content .okf-anchor:hover {
  opacity: 1;
}

/* In edit mode the icon renames its label. */
:root[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content .okf-anchor {
  cursor: pointer;
}

[data-okf-label-rename] {
  position: fixed;
  z-index: 1060;
  display: grid;
  gap: 4px;
  width: min(22em, calc(100vw - 16px));
  padding: 6px;
  border: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.45));
  border-radius: 4px;
  background: var(--studio-editorWidget-background, #252526);
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground, inherit));
  box-shadow: 0 2px 8px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
}

[data-okf-label-rename] > input {
  box-sizing: border-box;
  width: 100%;
  padding: 3px 6px;
  border: 1px solid var(--studio-input-border, rgba(128, 128, 128, 0.45));
  background: var(--studio-input-background, transparent);
  color: var(--studio-input-foreground, inherit);
  font: inherit;
}

[data-okf-label-rename] > input:focus {
  outline: 1px solid var(--studio-focusBorder, #007fd4);
  outline-offset: -1px;
}

[data-okf-label-rename-status][data-visible="false"] {
  display: none;
}

[data-okf-label-rename-status] {
  font-size: 0.9em;
  color: var(--studio-descriptionForeground, inherit);
}

#sphinx-myst-preview-content .okf-anchor-row {
  position: relative;
  height: 0;
  margin: 0;
}

#sphinx-myst-preview-content .okf-anchor-row > .okf-anchor {
  position: absolute;
  top: 0.7em;
  inset-inline-start: -1.5em;
  margin: 0;
}

/* The MyST writer emits figure captions as a trailing paragraph, not a figcaption. */
#sphinx-myst-preview-content figcaption,
#sphinx-myst-preview-content figure > p:last-child {
  margin-top: 0.6em;
  margin-bottom: 0;
  color: var(--studio-descriptionForeground, inherit);
  font-size: 0.9em;
  font-style: italic;
  text-align: center;
}

/* A captioned MyST code-block is a figure around the code: the code stays left-aligned like a
   plain fence and the caption becomes a title bar joined to the top of the block (same width and
   border, square joint). The caption follows the code in the markup; order draws it first. */
#sphinx-myst-preview-content figure:has(> pre) {
  display: flex;
  flex-direction: column;
  margin: 1em 0;
  text-align: left;
}

#sphinx-myst-preview-content figure:has(> pre) > figcaption {
  order: -1;
  margin: 0;
  padding: 0.35em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(rgba(128, 128, 128, 0.12), rgba(128, 128, 128, 0.12)), var(--studio-textCodeBlock-background, rgba(128, 128, 128, 0.15));
  color: var(--studio-editor-foreground, inherit);
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.85em;
  font-style: normal;
  text-align: left;
  overflow-wrap: anywhere;
}

#sphinx-myst-preview-content figure:has(> pre) > figcaption > p {
  margin: 0;
  font: inherit;
}

#sphinx-myst-preview-content figure:has(> pre) > pre {
  margin: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

${directiveStyle("admonition")}
#sphinx-myst-preview-content blockquote {
  margin: 1em 0;
  padding: 0.25em 1em;
  border-inline-start: 4px solid var(--sphinx-preview-border);
  border-radius: 0 4px 4px 0;
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  color: var(--studio-descriptionForeground, inherit);
}

/*
 * Structural styling for code, tables and rules.
 *
 * These used to come from the Sphinx theme stylesheet. The preview renders the buffer
 * on its own now, so the only stylesheet in the page is this one.
 */
#sphinx-myst-preview-content :where(code, pre, samp, kbd) {
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.92em;
}

/* A keyboard key (kbd element): a hairline cap derived from the text colour. */
#sphinx-myst-preview-content kbd {
  padding: 0.05em 0.4em;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  border-bottom-width: 2px;
  border-radius: 0.3em;
}

/*
 * Inline code is a quiet pill: a tint and a hairline derived from the text colour, so it sits on
 * any page colour (current theme, dark, white, cream) without a hard-coded box. Sizes are in em
 * so the span scales inside headings, and vertical padding never grows the line box.
 */
#sphinx-myst-preview-content :not(pre) > code {
  padding: 0.1em 0.35em;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.14);
  background: color-mix(in srgb, currentColor 8%, transparent);
  font-size: 0.875em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  overflow-wrap: break-word;
}

#sphinx-myst-preview-content :is(td, th) > code {
  padding: 0.05em 0.3em;
}

html[data-sphinx-preview-theme-mode="cream"] #sphinx-myst-preview-content :not(pre) > code,
html[data-sphinx-preview-theme-mode="white"] #sphinx-myst-preview-content :not(pre) > code {
  color: var(--studio-textLink-foreground, #006ab1);
}

#sphinx-myst-preview-content pre {
  margin: 1em 0;
  padding: 0.9em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  background: var(--studio-textCodeBlock-background, rgba(128, 128, 128, 0.15));
  color: var(--studio-editor-foreground, inherit);
  overflow-x: auto;
  line-height: 1.45;
}

#sphinx-myst-preview-content pre > code {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  font-size: 1em;
  color: inherit;
  white-space: pre;
}

#sphinx-myst-preview-content pre.myst-code-block-diff {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

#sphinx-myst-preview-content .myst-code-filename {
  display: block;
  margin-bottom: 0.65em;
  color: var(--studio-descriptionForeground, inherit);
  font-size: 0.85em;
  white-space: normal;
}

#sphinx-myst-preview-content .myst-code-line {
  position: relative;
  display: block;
  min-height: 1.45em;
}

#sphinx-myst-preview-content .myst-code-line-emphasized {
  background: color-mix(in srgb, var(--studio-editor-findMatchHighlightBackground, #ea5c0055) 35%, transparent);
}

#sphinx-myst-preview-content :where(.myst-diff-line-addition, .myst-diff-line-deletion) {
  box-sizing: border-box;
  width: 100%;
}

#sphinx-myst-preview-content .myst-diff-line-addition {
  border-inline-start: 3px solid var(--sphinx-preview-diff-addition);
  background: color-mix(in srgb, var(--sphinx-preview-diff-addition) 18%, transparent);
}

#sphinx-myst-preview-content .myst-diff-line-deletion {
  border-inline-start: 3px solid var(--sphinx-preview-diff-deletion);
  background: color-mix(in srgb, var(--sphinx-preview-diff-deletion) 18%, transparent);
}

#sphinx-myst-preview-content .myst-code-cell-output {
  margin: 0 0 1em;
  padding: 0.55em 0.8em;
  border-inline-start: 3px solid var(--studio-descriptionForeground, #808080);
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  color: var(--studio-descriptionForeground, inherit);
  font-style: italic;
}

#sphinx-myst-preview-content .myst-mermaid-diagram {
  min-height: 1.5em;
  overflow-x: auto;
  font-family: var(--studio-editor-font-family, monospace);
  text-align: start;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .myst-mermaid-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
}

#sphinx-myst-preview-content details.myst-mermaid-source {
  margin-top: 0.75em;
  text-align: start;
}

#sphinx-myst-preview-content .myst-mermaid-source summary {
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-mermaid-error {
  color: var(--studio-errorForeground, #f14c4c);
  text-align: start;
}

#sphinx-myst-preview-content .myst-mermaid-error > p {
  margin: 0 0 0.25em;
  font-style: italic;
}

#sphinx-myst-preview-content .myst-mermaid-error-details {
  margin-bottom: 0.5em;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-mermaid-error-details summary {
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
}

#sphinx-myst-preview-content .myst-mermaid-error-details pre {
  margin: 0.4em 0 0;
  padding: 0.5em 0.75em;
  overflow-x: auto;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  background: var(--studio-textCodeBlock-background);
  color: var(--studio-editor-foreground);
  font-family: var(--studio-editor-font-family, monospace);
  font-style: normal;
  white-space: pre-wrap;
}

/* Charts (Vega-Lite, Vega) are drawn like Mermaid diagrams: one contained picture, the source and
   the error in place. */
#sphinx-myst-preview-content .myst-vega-diagram {
  min-height: 1.5em;
  overflow-x: auto;
  font-family: var(--studio-editor-font-family, monospace);
  text-align: start;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .myst-vega-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
}

#sphinx-myst-preview-content details.myst-vega-source {
  margin-top: 0.75em;
  text-align: start;
}

#sphinx-myst-preview-content .myst-vega-source summary {
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-vega-error {
  color: var(--studio-errorForeground, #f14c4c);
  text-align: start;
}

#sphinx-myst-preview-content .myst-vega-error > p {
  margin: 0 0 0.25em;
  font-style: italic;
}

#sphinx-myst-preview-content .myst-vega-error-details {
  margin-bottom: 0.5em;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-vega-error-details summary {
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
}

#sphinx-myst-preview-content .myst-vega-error-details pre {
  margin: 0.4em 0 0;
  padding: 0.5em 0.75em;
  overflow-x: auto;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 4px;
  background: var(--studio-textCodeBlock-background);
  color: var(--studio-editor-foreground);
  font-family: var(--studio-editor-font-family, monospace);
  font-style: normal;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .myst-plantuml-diagram {
  min-height: 1.5em;
  overflow-x: auto;
  font-family: var(--studio-editor-font-family, monospace);
  text-align: start;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .myst-plantuml-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
}

#sphinx-myst-preview-content details.myst-plantuml-source {
  margin-top: 0.75em;
  text-align: start;
}

#sphinx-myst-preview-content .myst-plantuml-source summary {
  color: var(--studio-descriptionForeground, inherit);
  cursor: pointer;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-plantuml-error {
  color: var(--studio-errorForeground, #f14c4c);
  font-style: italic;
}

@media (forced-colors: active) {
  #sphinx-myst-preview-content .myst-diff-line-addition {
    border-inline-start-color: Highlight;
    background: Highlight;
    color: HighlightText;
  }

  #sphinx-myst-preview-content .myst-diff-line-deletion {
    border-inline-start-color: Mark;
    background: Mark;
    color: MarkText;
  }

  #sphinx-myst-preview-content :where(.myst-diff-line-addition, .myst-diff-line-deletion) :where(*) {
    color: inherit;
  }
}

/* A wide table scrolls inside its own box instead of widening the whole preview. */
#sphinx-myst-preview-content :where(table, .table-wrapper) {
  display: block;
  width: max-content;
  max-width: 100%;
  margin: 1.2em 0;
  border-collapse: collapse;
  overflow-x: auto;
}

/* A table that scrolls sideways keeps short identifiers whole and shades the overflow edges. */
#sphinx-myst-preview-content table[data-sphinx-table-overflow="true"] :where(th, td)[data-sphinx-short-cell="true"] {
  white-space: nowrap;
}

#sphinx-myst-preview-content table[data-sphinx-table-overflow="true"] {
  background:
    linear-gradient(to right, var(--studio-editor-background, Canvas) 30%, transparent) left center / 2rem 100% no-repeat local,
    linear-gradient(to left, var(--studio-editor-background, Canvas) 30%, transparent) right center / 2rem 100% no-repeat local,
    radial-gradient(farthest-side at 0 50%, color-mix(in srgb, var(--studio-editor-foreground, var(--studio-foreground, CanvasText)) 35%, transparent), transparent) left center / 1rem 100% no-repeat scroll,
    radial-gradient(farthest-side at 100% 50%, color-mix(in srgb, var(--studio-editor-foreground, var(--studio-foreground, CanvasText)) 35%, transparent), transparent) right center / 1rem 100% no-repeat scroll;
}

#sphinx-myst-preview-content :where(th, td) {
  padding: 0.4em 0.8em;
  border: 1px solid var(--sphinx-preview-border);
  text-align: start;
  vertical-align: top;
}

/* A column never narrows below 5em of text, so a table with many columns keeps whole words in its
   cells ("document", "parse") instead of breaking them letter by letter. A table that then no
   longer fits the column uses the wide-table behaviour (breakout in Auto, scroll otherwise). The
   frontmatter properties table sizes its own columns. In edit mode the larger cell minimum below
   (8em) wins. */
#sphinx-myst-preview-content table:not(.okf-properties) :where(th, td) {
  min-width: 5em;
}

/* A short identifier (one word, up to 24 characters) never splits inside a cell, wide table or not:
   the global overflow-wrap: anywhere would otherwise break "Coverage" or "OPS-1042" letter by letter
   when the columns are squeezed. The cell keeps the word whole, so the table grows and then breaks
   out in Auto or scrolls. */
#sphinx-myst-preview-content table :where(th, td)[data-sphinx-short-cell="true"] {
  white-space: nowrap;
}

#sphinx-myst-preview-content th {
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.12));
  font-weight: 600;
}

#sphinx-myst-preview-content :where(th, td)[align="left"] { text-align: left; }
#sphinx-myst-preview-content :where(th, td)[align="center"] { text-align: center; }
#sphinx-myst-preview-content :where(th, td)[align="right"] { text-align: right; }
#sphinx-myst-preview-content table[align="center"] { margin-inline: auto; }
#sphinx-myst-preview-content table[align="right"] {
  margin-inline-start: auto;
  margin-inline-end: 0;
}

${directiveStyle("tables")}
/* The line is 1px, but the box is 25px tall (12px of padding on each side, painted transparent), so a
   click near the line lands on the rule and opens its editor. The margin gives the padding back. */
#sphinx-myst-preview-content hr {
  box-sizing: content-box;
  height: 1px;
  margin: calc(2em - 12px) 0;
  padding: 12px 0;
  border: 0;
  background: var(--sphinx-preview-border);
  background-clip: content-box;
}

#sphinx-myst-preview-content dt {
  margin-top: 1em;
  font-weight: 600;
}

#sphinx-myst-preview-content dd {
  margin: 0.3em 0 0 1.5em;
}

#sphinx-myst-preview-content :where(cite, .citation-reference, a.reference.internal) {
  font-style: normal;
}

/* Constructs that only a project-wide build can resolve, shown as inert placeholders. */
#sphinx-myst-preview-content .myst-unresolved {
  color: var(--studio-descriptionForeground, inherit);
}

#sphinx-myst-preview-content .myst-notebook-output {
  display: inline-block;
  max-width: 100%;
  padding: 0.1em 0.3em;
  border: 1px dashed var(--sphinx-preview-border);
  overflow-wrap: anywhere;
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-cite {
  padding: 0 0.15em;
  border-bottom: 1px dotted currentColor;
  cursor: help;
}

/* MyST {grid}: the column count follows the pane width (container queries), one column when narrow. */
#sphinx-myst-preview-content .myst-grid {
  container-type: inline-size;
  margin: 1.2em 0;
}

#sphinx-myst-preview-content .myst-grid-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1em;
}

${gridColumnCss()}

#sphinx-myst-preview-content .myst-grid-item {
  min-width: 0;
}

#sphinx-myst-preview-content .myst-grid-item > :first-child {
  margin-top: 0;
}

#sphinx-myst-preview-content .myst-grid-item > :last-child {
  margin-bottom: 0;
}

#sphinx-myst-preview-content .myst-grid-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 6px;
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  color: var(--studio-editor-foreground, inherit);
}

#sphinx-myst-preview-content .myst-grid-card-title {
  padding: 0.7em 1em 0;
  font-weight: 600;
}

#sphinx-myst-preview-content .myst-grid-card-header,
#sphinx-myst-preview-content .myst-grid-card-footer {
  padding: 0.5em 1em;
  border-color: var(--sphinx-preview-border);
  border-style: solid;
  border-width: 0;
  color: var(--studio-descriptionForeground, inherit);
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-grid-card-header {
  border-bottom-width: 1px;
}

#sphinx-myst-preview-content .myst-grid-card-footer {
  border-top-width: 1px;
}

#sphinx-myst-preview-content .myst-grid-card-body {
  flex: 1 1 auto;
  padding: 0.7em 1em;
}

#sphinx-myst-preview-content .myst-grid-card-body > :first-child,
#sphinx-myst-preview-content .myst-grid-card-header > :first-child,
#sphinx-myst-preview-content .myst-grid-card-footer > :first-child {
  margin-top: 0;
}

#sphinx-myst-preview-content .myst-grid-card-body > :last-child,
#sphinx-myst-preview-content .myst-grid-card-header > :last-child,
#sphinx-myst-preview-content .myst-grid-card-footer > :last-child {
  margin-bottom: 0;
}

/* The whole card is the click target of its link. */
#sphinx-myst-preview-content .myst-grid-card-link::after {
  content: "";
  position: absolute;
  inset: 0;
}

/* MyST standalone {card}: the grid card look, in the flow of the page. */
#sphinx-myst-preview-content .myst-card {
  margin: 1.2em 0;
}

/* MyST {tab-set}: a tab bar, one panel shown at a time. */
#sphinx-myst-preview-content .myst-tab-set {
  margin: 1.2em 0;
}

#sphinx-myst-preview-content .myst-tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2em;
  border-bottom: 1px solid var(--sphinx-preview-border);
}

#sphinx-myst-preview-content .myst-tab {
  margin: 0 0 -1px;
  padding: 0.45em 0.9em;
  border: 1px solid transparent;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--studio-descriptionForeground, inherit);
  font: inherit;
  font-size: 0.95em;
  cursor: pointer;
}

#sphinx-myst-preview-content .myst-tab:hover {
  color: var(--studio-editor-foreground, inherit);
}

#sphinx-myst-preview-content .myst-tab[aria-selected="true"] {
  border-color: var(--sphinx-preview-border);
  border-bottom-color: var(--studio-editor-background, Canvas);
  color: var(--studio-editor-foreground, inherit);
  font-weight: 600;
}

#sphinx-myst-preview-content .myst-tab:focus-visible {
  outline: 2px solid var(--studio-focusBorder, currentColor);
  outline-offset: -2px;
}

#sphinx-myst-preview-content .myst-tab-panel {
  padding: 0.8em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-top: 0;
  border-radius: 0 0 6px 6px;
}

#sphinx-myst-preview-content .myst-tab-panel[hidden] {
  display: none;
}

#sphinx-myst-preview-content .myst-tab-panel > :first-child {
  margin-top: 0;
}

#sphinx-myst-preview-content .myst-tab-panel > :last-child {
  margin-bottom: 0;
}

/* MyST {toctree}: a list of links to the referenced documents. */
#sphinx-myst-preview-content .myst-toctree {
  margin: 1.2em 0;
}

#sphinx-myst-preview-content .myst-toctree-hidden {
  display: none;
}

#sphinx-myst-preview-content .myst-toctree-caption {
  margin: 0 0 0.4em;
  font-size: 0.85em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--studio-descriptionForeground, inherit);
}

#sphinx-myst-preview-content .myst-toctree-list {
  margin: 0;
  padding-left: 1.4em;
}

#sphinx-myst-preview-content .myst-toctree-missing {
  border-bottom: 1px dashed var(--studio-charts-orange, #d18616);
  color: var(--studio-charts-orange, #d18616);
  cursor: help;
}

#sphinx-myst-preview-content .myst-toctree-missing::before {
  content: "\\26A0\\FE0E\\00A0";
}

#sphinx-myst-preview-content .myst-directive {
  margin: 1.2em 0;
  padding: 0.6em 0.9em;
  border: 1px dashed var(--sphinx-preview-border);
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
}

#sphinx-myst-preview-content .myst-directive-name {
  margin: 0;
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
}

#sphinx-myst-preview-content .myst-directive pre {
  margin: 0.5em 0 0;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content :where(.math-inline, .math-display) {
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
}

#sphinx-myst-preview-content .math-display {
  margin: 1em 0;
  text-align: center;
}
`;
