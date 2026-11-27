/**
 * Keeps the content root's aligned-float attribute (core/preview/alignedFloat.ts) up to date in the
 * page. The page arrives with the attribute as the host rendered it; afterwards the content changes
 * in place: a content patch calls {@link syncAlignedFloat} at once, and the page's own changes are
 * followed by an observer that looks only at images, figures and tables, so that a change of anything
 * else (a comment highlight, a typed character) costs no query of the document. The observer runs
 * before the next frame is drawn. Pure page module.
 */
import { ALIGNED_FLOAT_ATTRIBUTE, ALIGNED_FLOAT_SELECTOR } from "../../core/preview/alignedFloat";

/** The elements that can be an aligned float. */
const CANDIDATES = "img, figure, table";

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-043
/** Sets or removes the attribute on `content` after one look for an aligned float; true on a change. */
export function syncAlignedFloat(content: Element): boolean {
  const present = Boolean(content.querySelector(ALIGNED_FLOAT_SELECTOR));
  if (present === Boolean(content.hasAttribute(ALIGNED_FLOAT_ATTRIBUTE))) return false;
  if (present) content.setAttribute(ALIGNED_FLOAT_ATTRIBUTE, "");
  else content.removeAttribute(ALIGNED_FLOAT_ATTRIBUTE);
  return true;
}

/** Whether an added or removed node is, or holds, an element that can be an aligned float. */
function holdsCandidate(node: Node): boolean {
  if (node.nodeType !== 1) return false;
  const element = node as Element;
  return element.matches(CANDIDATES) || element.querySelector(CANDIDATES) !== null;
}

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-043
/**
 * Follows the changes of the rendered content; `changed` runs after one that added the first aligned
 * float or removed the last one (the page layout is another one then).
 */
export function installAlignedFloat(document: Document, changed: () => void): void {
  const content = document.getElementById?.("sphinx-myst-preview-content");
  if (!content || typeof MutationObserver === "undefined") return;
  new MutationObserver((records) => {
    const concerned = records.some((record) => record.type === "attributes"
      ? (record.target as Element).matches(CANDIDATES)
      : Array.from(record.addedNodes).some(holdsCandidate) || Array.from(record.removedNodes).some(holdsCandidate));
    if (concerned && syncAlignedFloat(content)) changed();
  }).observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "align"] });
}
