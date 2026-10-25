/** Where the caret of a text box is on screen, in viewport coordinates. */
export interface CaretRect {
  left: number;
  top: number;
  bottom: number;
}

/**
 * Measures the caret (the end of the selection) of a textarea with a hidden mirror element that
 * copies the text box's text styles, wraps the same way and ends in a marker. Returns `undefined`
 * where the page cannot measure (no layout), so callers fall back to another anchor. The mirror
 * is styled through the CSSOM and always removed again.
 */
export function caretRectOf(
  document: Document,
  window: Window,
  control: HTMLTextAreaElement,
): CaretRect | undefined {
  const mirror = document.createElement("div");
  try {
    const body = document.body;
    const box = control.getBoundingClientRect?.();
    const view = window.getComputedStyle?.(control);
    if (!body || !box || !view || typeof view.getPropertyValue !== "function") return undefined;
    for (const name of [
      "box-sizing", "width", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "font-family", "font-size", "font-style", "font-weight", "font-variant", "letter-spacing",
      "line-height", "tab-size", "text-indent", "text-transform", "word-spacing", "text-align",
    ]) {
      mirror.style.setProperty(name, view.getPropertyValue(name));
    }
    mirror.style.setProperty("position", "absolute");
    mirror.style.setProperty("visibility", "hidden");
    mirror.style.setProperty("top", "0");
    mirror.style.setProperty("left", "0");
    mirror.style.setProperty("height", "auto");
    mirror.style.setProperty("overflow", "hidden");
    mirror.style.setProperty("white-space", "pre-wrap");
    mirror.style.setProperty("overflow-wrap", "break-word");
    const value = String(control.value ?? "");
    const caret = Math.min(Number(control.selectionEnd), value.length);
    mirror.textContent = value.slice(0, caret);
    const marker = document.createElement("span");
    // The rest of the text (or a dot) keeps the marker on the line the caret is on.
    marker.textContent = value.slice(caret) || ".";
    mirror.appendChild(marker);
    body.appendChild(mirror);
    const border = (name: string): number => Number.parseFloat(view.getPropertyValue(name)) || 0;
    const left = box.left + border("border-left-width") + marker.offsetLeft - (control.scrollLeft || 0);
    const top = box.top + border("border-top-width") + marker.offsetTop - (control.scrollTop || 0);
    // The marker holds the rest of the text, so it can span many lines: the caret line is the
    // height of its first line box only.
    const firstLine = typeof marker.getClientRects === "function" ? marker.getClientRects()[0] : undefined;
    const bottom = top + (firstLine && firstLine.height > 0 ? firstLine.height : marker.offsetHeight);
    return [left, top, bottom].every((number) => Number.isFinite(number))
      ? { left, top, bottom }
      : undefined;
  } catch {
    return undefined;
  } finally {
    mirror.remove?.();
  }
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
/**
 * How far to scroll (positive: down) so the caret is neither under the stuck edition palette nor
 * below the viewport. 0 when the palette is not stuck (it is still above the frame) or when the
 * caret is already clear.
 */
export function caretRevealDelta(
  caret: { top: number; bottom: number },
  bar: { bottom: number },
  frame: { top: number },
  viewportHeight: number,
): number {
  const gap = 8;
  if (![caret.top, caret.bottom, bar.bottom, frame.top, viewportHeight].every(Number.isFinite)) return 0;
  if (!(bar.bottom > frame.top + 0.5)) return 0;
  // The caret line may touch the bar's lower edge; only a hidden caret moves the page.
  const limit = bar.bottom;
  if (caret.top < limit) return caret.top - limit;
  if (caret.bottom > viewportHeight - gap) return caret.bottom - (viewportHeight - gap);
  return 0;
}
