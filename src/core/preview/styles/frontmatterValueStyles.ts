/**
 * Front matter values in the body (see `render/frontmatterValues.ts`): the value of `= this.field`
 * reads as the sentence around it, and an inline code whose field has no value keeps its text and
 * takes the warning colour, so it is never mistaken for a value. Part of the preview theme
 * stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`).
 */
// @implements_req SwRS-MDOKFSTUDIO-CORE-079
export const FRONTMATTER_VALUE_CSS = `
#sphinx-myst-preview-content .okf-frontmatter-value {
  font: inherit;
  color: inherit;
}

#sphinx-myst-preview-content code.okf-frontmatter-missing {
  color: var(--studio-foreground, inherit);
  background: color-mix(in srgb, var(--studio-editorWarning-foreground, var(--studio-charts-yellow, #b89500)) 18%, transparent);
  border-bottom: 2px dashed var(--studio-editorWarning-foreground, var(--studio-charts-yellow, #b89500));
}
`;
