/**
 * Links in edit mode (CR 217): a plain click, Enter or Space on a link inside a mapped block edits
 * that block instead of following the link; Cmd/Ctrl+click, Cmd/Ctrl+Enter and a middle click still
 * follow it. Such a link carries a second tooltip line that says how to follow it. Links outside a
 * mapped block (properties table values, comment threads, label anchors) keep their own behaviour.
 */

import { setLinkFollowHint } from "../modules/linkNavigation";
import { isApplePlatform } from "../pageSettings";
import { MAPPINGS_SELECTOR } from "./pageRuntime";

const LINKS_SELECTOR = "a[data-sphinx-preview-navigation]";

/**
 * Marker on each link a plain edit-mode click edits (set by `syncLinkFollowHints`): the stylesheet
 * gives the text cursor to these links only, so every other link keeps its pointer.
 */
const LINK_EDITS_ATTRIBUTE = "data-sphinx-preview-link-edits";

/**
 * The mapped block a plain edit-mode click at `element` edits when `element` is inside a link (or
 * the block is itself inside a link), or undefined when the link keeps its own behaviour.
 */
function linkEditTarget(element: Element): HTMLElement | undefined {
  if (element.closest('a[data-sphinx-preview-navigation^="okf-link:"]')
    || element.closest("[data-okf-properties]")
    || element.closest("[data-sphinx-preview-block-editor]")
    || element.closest(".okf-comment-body")
    || element.closest(".okf-chip")
    || element.closest(".okf-anchor")) return undefined;
  return element.closest<HTMLElement>(MAPPINGS_SELECTOR) ?? undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-017
/**
 * True when `element` is inside a link that keeps its own behaviour in edit mode: a link outside a
 * mapped block, in a comment thread, in the properties table, in an open editor. Such a link gets
 * neither the edit hover outline nor the text cursor. The same rule as `linkActivationEdits`.
 */
export function inLinkThatKeepsItsBehaviour(element: Element): boolean {
  return Boolean(element.closest("a")) && !linkEditTarget(element);
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-077
/**
 * True when this click, Enter or Space on a link edits the block that holds it instead of following
 * the link: edit mode on, no Cmd or Ctrl key, not a middle click, a link inside a mapped block.
 */
export function linkActivationEdits(editMode: boolean, event: Event): boolean {
  if (!editMode || event.type === "auxclick") return false;
  const { metaKey, ctrlKey } = event as MouseEvent;
  if (metaKey || ctrlKey) return false;
  const element = event.target instanceof Element ? event.target : undefined;
  return Boolean(element && element.closest("a") && !inLinkThatKeepsItsBehaviour(element));
}

/** The second tooltip line of a link in edit mode. */
function linkFollowHintText(): string {
  return `${isApplePlatform() ? "Cmd" : "Ctrl"}+click to follow`;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-017
/**
 * Adds the "Cmd/Ctrl+click to follow" line to the tooltip and the text cursor marker of every link
 * a plain click edits (edit mode on), or takes both away (edit mode off). Runs again after each
 * content render.
 */
export function syncLinkFollowHints(document: Document, editMode: boolean): void {
  const hint = editMode ? linkFollowHintText() : undefined;
  const links = document.querySelectorAll?.(LINKS_SELECTOR);
  if (!links) return;
  Array.from(links).forEach((link) => {
    const edits = hint !== undefined && Boolean(linkEditTarget(link));
    setLinkFollowHint(link, edits ? hint : undefined);
    if (edits) link.setAttribute(LINK_EDITS_ATTRIBUTE, "true");
    else link.removeAttribute(LINK_EDITS_ATTRIBUTE);
  });
}
