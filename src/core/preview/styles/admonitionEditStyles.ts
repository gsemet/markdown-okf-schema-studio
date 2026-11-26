// @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
/**
 * A block editor open on one block inside an admonition: a paragraph, a list item or another block
 * of its body.
 *
 * An admonition of a directive scrolls its own overflow, so the sticky edition palette would be
 * placed from the admonition's box and ride down over the text box. The admonition stops scrolling
 * while it holds the editor.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), after the
 * admonition rules it overrides.
 */
export const ADMONITION_EDIT_CSS = `
#sphinx-myst-preview-content .admonition:has(.sphinx-preview-block-editor-host) {
  overflow: visible;
}
`;
