// @implements_req SwRS-MDOKFSTUDIO-CORE-071
/**
 * README-style raw HTML (`mystRawHtml.ts`): the `align` of `div`, `p` and headings, the images a
 * `<picture>` shows per preview theme, and the edit-mode frame of an HTML block, an
 * admonition-like box titled with the literal opening tag.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`).
 */
const CONTENT = "#sphinx-myst-preview-content";
// A dark page: the forced dark mode, or the current mode over a dark VS Code theme.
const DARK_PAGE = [
  'html[data-sphinx-preview-theme-mode="dark"]',
  'html[data-sphinx-preview-theme-mode="current"] body:is(.vscode-dark, .vscode-high-contrast)',
];
const darkScope = (selector: string): string => DARK_PAGE.map((scope) => `${scope} ${CONTENT} ${selector}`).join(",\n");

export const HTML_BLOCK_CSS = `
/* The align attribute GitHub honours on README blocks. */
${CONTENT} :is(div, p, center, h1, h2, h3, h4, h5, h6)[align="center"], ${CONTENT} center { text-align: center; }
${CONTENT} :is(div, p, h1, h2, h3, h4, h5, h6)[align="left"] { text-align: left; }
${CONTENT} :is(div, p, h1, h2, h3, h4, h5, h6)[align="right"] { text-align: right; }
${CONTENT} :is(div, p, h1, h2, h3, h4, h5, h6)[align="justify"] { text-align: justify; }

/* A picture with colour-scheme sources follows the preview theme: the light image and the fallback
   in a light page, the dark image in a dark page. */
${CONTENT} img.okf-theme-dark { display: none; }
${CONTENT} picture[data-okf-themes~="light"] img.okf-theme-fallback { display: none; }
${darkScope("img.okf-theme-light")} { display: none; }
${darkScope("img.okf-theme-dark")} { display: inline; }
${darkScope("picture[data-okf-themes~=\"light\"] img.okf-theme-fallback")} { display: inline; }
${darkScope("picture[data-okf-themes~=\"dark\"] img.okf-theme-fallback")} { display: none; }

/* Edit mode shows an HTML block like an admonition, titled with its literal opening tag. */
html[data-sphinx-preview-edit-mode="on"] ${CONTENT} .okf-html-block[data-okf-tag] {
  --sphinx-preview-accent: var(--studio-descriptionForeground, #717171);
  margin: 0.4em 0;
  padding: 0.6em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-inline-start: 4px solid var(--sphinx-preview-accent);
  background: color-mix(in srgb, var(--sphinx-preview-accent) 14%, var(--studio-editor-background, Canvas));
}

html[data-sphinx-preview-edit-mode="on"] ${CONTENT} .okf-html-block[data-okf-tag]::before {
  content: attr(data-okf-tag);
  display: block;
  margin-bottom: 0.3em;
  color: var(--sphinx-preview-accent);
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
  font-weight: 600;
  text-align: start;
  overflow-wrap: anywhere;
}
`;
