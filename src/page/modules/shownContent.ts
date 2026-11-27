/**
 * Tells when what the rendered content shows under an unmoved selection may have changed: a change of
 * the content, or a switch of the page root that shows or hides parts of it. The browser announces no
 * selection change for most of them. The observer looks at no record, so being told costs the same in
 * a large document as in a small one. Pure page module.
 */

/** The content attributes that show or hide a block, or say where its text comes from. */
const CONTENT_ATTRIBUTES = [
  "hidden", "open", "class", "style", "data-line", "data-end-line", "data-okf-folded", "data-okf-sbs-replaced",
  "data-sphinx-preview-editing", "data-sphinx-preview-included",
];

/** The page root attributes that show or hide content. Its style, which a scroll changes, is not one. */
const ROOT_ATTRIBUTES = [
  "data-okf-descriptions-collapsed", "data-okf-frontmatter-collapsed", "data-okf-show-comments",
  "data-sphinx-preview-comments", "data-okf-incoming-changes", "data-sphinx-preview-incoming",
  "data-sphinx-preview-edit-mode", "data-sphinx-preview-sbs",
];

/** Runs `changed` after each such change, before the next frame is drawn. */
// @implements_req SwRS-MDOKFSTUDIO-LIFE-108
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-038
export function watchShownContent(document: Document, changed: () => void): void {
  const content = document.getElementById?.("sphinx-myst-preview-content");
  if (!content || typeof MutationObserver === "undefined") return;
  const observer = new MutationObserver(() => changed());
  observer.observe(content, {
    childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: CONTENT_ATTRIBUTES,
  });
  observer.observe(document.documentElement, { attributeFilter: ROOT_ATTRIBUTES });
}
