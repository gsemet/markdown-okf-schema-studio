// @implements_req SwRS-MDOKFSTUDIO-CORE-072
/**
 * The `[TOC]` / `[[_TOC_]]` / `{contents}` table of contents (`mystToc.ts`): a plain nested list in read mode, and in edit
 * mode an admonition-like box titled with the literal marker that hides the generated list.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`).
 */
const CONTENT = "#sphinx-myst-preview-content";

export const TOC_CSS = `
/* Read mode: the nested list of links; a document without headings shows nothing. */
${CONTENT} nav.okf-toc { margin: 0.6em 0; }
${CONTENT} nav.okf-toc ul { margin: 0.2em 0; padding-inline-start: 1.4em; }
${CONTENT} nav.okf-toc.okf-toc--empty { display: none; }

/* Edit mode shows the block like an admonition, titled with its literal marker; the list is not
   shown, only the marker is the source. */
html[data-sphinx-preview-edit-mode="on"] ${CONTENT} nav.okf-toc[data-okf-tag] {
  --sphinx-preview-accent: var(--studio-descriptionForeground, #717171);
  display: block;
  margin: 0.4em 0;
  padding: 0.6em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-inline-start: 4px solid var(--sphinx-preview-accent);
  background: color-mix(in srgb, var(--sphinx-preview-accent) 14%, var(--studio-editor-background, Canvas));
}

html[data-sphinx-preview-edit-mode="on"] ${CONTENT} nav.okf-toc[data-okf-tag]::before {
  content: attr(data-okf-tag);
  display: block;
  color: var(--sphinx-preview-accent);
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
  font-weight: 600;
  text-align: start;
}

html[data-sphinx-preview-edit-mode="on"] ${CONTENT} nav.okf-toc > ul { display: none; }
`;
