/**
 * What marks an element of the preview as UI chrome (controls, review comments, editing chrome):
 * shared by the HTML export (parsed content) and the page's raw copy (live DOM). Pure module: the
 * element is read through a {@link ChromeProbe}, so no DOM and no parser type is needed here.
 */

/** The elements that never belong in an exported file: controls, scripts and everything that loads. */
const REMOVED_TAGS = new Set([
  "button", "textarea", "select", "script", "link", "iframe", "object", "embed", "base", "frame", "frameset",
]);

/** Classes of review comments and editing chrome. The element goes with its content. */
const REMOVED_CLASSES = [
  "okf-comment", "okf-chip", "okf-comment-body", "sphinx-preview-insert-point", "sphinx-preview-edit-palette",
  "sphinx-preview-link-panel", "okf-fold-toggle",
];

/** Attributes that mark editing chrome. The element goes with its content. */
const REMOVED_BY_ATTRIBUTE = [
  "data-sphinx-preview-block-editor", "data-sphinx-preview-block-editor-host", "data-sphinx-preview-edit-status",
  "data-okf-row-handle", "data-okf-col-handle", "data-okf-frontmatter-editor", "data-okf-frontmatter-menu",
  "data-okf-fold-toggle", "data-okf-comment-kind", "data-okf-blank-runs", "data-okf-blank-lines",
];

/** The comment attributes that only mark text or a block (the text stays; the element goes only if it is a wrapper). */
export const COMMENT_MARKS = [
  "data-okf-comment-thread", "data-okf-comment-resolved", "data-okf-comment-badged", "data-okf-comment-badge-after",
];

/** What the chrome rule reads of an element. */
export interface ChromeProbe {
  /** The lower-case tag name. */
  readonly tagName: string;
  hasClass(name: string): boolean;
  /** The names of the element's attributes. */
  attributeNames(): readonly string[];
}

/** True when any of `names` is an attribute of the probed element. */
function hasAnyAttributeOf(probe: ChromeProbe, names: readonly string[]): boolean {
  const own = probe.attributeNames();
  return names.some((name) => own.includes(name));
}

/** True for an element of review or editing chrome that goes with its whole content. */
export function isChromeProbe(probe: ChromeProbe): boolean {
  if (REMOVED_TAGS.has(probe.tagName)) return true;
  if (REMOVED_CLASSES.some((name) => probe.hasClass(name))) return true;
  if (hasAnyAttributeOf(probe, REMOVED_BY_ATTRIBUTE)) return true;
  // Any other comment attribute (popover, badge, compose box, orphan entry, actions) is chrome; a highlight is not.
  return probe.attributeNames().some((name) => (name.startsWith("data-okf-comment") || name.startsWith("data-okf-thread"))
    && !COMMENT_MARKS.includes(name) && name !== "data-okf-thread-count");
}
