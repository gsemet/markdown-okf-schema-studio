/**
 * What the comment editors share: the new comment box and the thread popover with its reply box.
 *
 * - `floatingTop` gives the vertical position of an editor next to the text it is anchored to: below
 *   the text, above it when there is no room below, inside the window when the text is in view, and
 *   next to the text (so out of view with it) when the text itself is out of view.
 * - `discardQuestion` builds the small inline question "Discard / Keep editing" that replaces
 *   `window.confirm`, which a webview does not offer. Every string is set with `textContent`.
 */

export const DISCARD = "data-okf-comment-discard";
export const DISCARD_YES = "data-okf-comment-discard-yes";
export const DISCARD_KEEP = "data-okf-comment-discard-keep";

const GAP = 6;
const EDGE = 8;

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-217
export function floatingTop(
  editor: Element,
  anchor: { top: number; bottom: number },
  viewportHeight: number,
): number {
  const height = editor.getBoundingClientRect?.().height ?? 0;
  const below = anchor.bottom + GAP;
  // The text is out of view: the editor stays attached to it and leaves with it.
  if (anchor.bottom < 0 || anchor.top > viewportHeight) return below;
  if (below + height <= viewportHeight - EDGE) return below;
  const above = anchor.top - GAP - height;
  if (above >= EDGE) return above;
  return Math.max(EDGE, viewportHeight - height - EDGE);
}

/** True when the rectangle is empty at the origin: a range whose text left the page. */
export const isGone = (rect: { left: number; top: number; right: number; bottom: number }): boolean =>
  rect.left === 0 && rect.top === 0 && rect.right === 0 && rect.bottom === 0;

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-218
export function discardQuestion(document: Document, label: string): Element {
  const row = document.createElement("div");
  row.setAttribute(DISCARD, "true");
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", label);
  const ask = document.createElement("span");
  ask.textContent = label;
  row.appendChild(ask);
  for (const [attribute, text] of [[DISCARD_YES, "Discard"], [DISCARD_KEEP, "Keep editing"]]) {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute(attribute, "true");
    button.textContent = text;
    row.appendChild(button);
  }
  return row;
}
