export interface UpdatedRange {
  start: number;
  end: number;
}

/**
 * Light motion of the preview: the page side of the stylesheet's "Motion" section. Injected into
 * the page script with `.toString()`, so the body must not use anything defined outside it.
 *
 * Every effect is a class of attribute the stylesheet animates; nothing here sets a style.
 *
 * - `data-sphinx-preview-motion="on"` on `<html>` allows the soft appearance of editors, bars and
 *   menus. It is set by the first pointer or key press and taken back by `hold()` (a content
 *   patch), so a page that loads or is replaced never fades in what it restores on its own.
 * - `themeSwitch()` sets `data-sphinx-preview-theme-switching` for one colour transition; it is
 *   taken back when the body's background transition ends (or after a short fallback).
 * - `editorClosed(block)` marks the rendered block an editor gave back
 *   (`data-sphinx-preview-edit-closed`), so it fades back in.
 * - `glow(ranges)` marks the innermost mapped blocks (`data-line` with an optional
 *   `data-end-line`) whose lines meet a range with `data-sphinx-preview-updated`: the host sends
 *   the ranges with a content patch that follows a change made outside the preview, or an undo.
 *   A code block is marked on its `<pre>`. Included blocks and open editors are skipped.
 *
 * Marks are removed when their animation ends. With `prefers-reduced-motion: reduce` nothing is
 * marked and the stylesheet animates nothing.
 */
export function installMotion(
  document: Document,
  window: Window,
): {
  glow(ranges: unknown): Element[];
  themeSwitch(): void;
  editorClosed(block: Element | null | undefined): void;
  hold(): void;
} {
  const MOTION = "data-sphinx-preview-motion";
  const SWITCHING = "data-sphinx-preview-theme-switching";
  const CLOSED = "data-sphinx-preview-edit-closed";
  const UPDATED = "data-sphinx-preview-updated";
  // A bigger update (a checkout, a reload of the file) lights up nothing.
  const MAX_BLOCKS = 40;
  const MAX_RANGES = 50;
  const root = document.documentElement;

  const reduced = (): boolean => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    } catch {
      return false;
    }
  };

  // The mark goes when its animation ends; a cancelled animation (the element hidden) ends it too.
  const markUntilEnd = (element: Element, name: string): void => {
    const done = (event: Event): void => {
      if (event.target !== element) return;
      element.removeAttribute(name);
      element.removeEventListener?.("animationend", done);
      element.removeEventListener?.("animationcancel", done);
    };
    element.addEventListener("animationend", done);
    element.addEventListener("animationcancel", done);
    element.setAttribute(name, "true");
  };

  const allow = (): void => {
    if (root.getAttribute(MOTION) !== "on") root.setAttribute(MOTION, "on");
  };
  window.addEventListener("pointerdown", allow, true);
  window.addEventListener("keydown", allow, true);

  let switchTimer: number | undefined;
  let switchListener: ((event: Event) => void) | undefined;
  const endSwitch = (): void => {
    if (switchTimer !== undefined) window.clearTimeout(switchTimer);
    switchTimer = undefined;
    root.removeAttribute(SWITCHING);
  };

  return {
    glow(ranges) {
      if (!Array.isArray(ranges) || ranges.length === 0 || ranges.length > MAX_RANGES || reduced()) return [];
      const valid = ranges.filter((range): range is UpdatedRange => !!range
        && Number.isSafeInteger(range.start) && Number.isSafeInteger(range.end)
        && range.start >= 1 && range.end >= range.start);
      if (valid.length === 0) return [];
      const candidates: Element[] = [];
      document.querySelectorAll("[data-line]").forEach((element) => {
        const start = Number(element.getAttribute("data-line"));
        if (!Number.isFinite(start)) return;
        const endValue = Number(element.getAttribute("data-end-line"));
        const end = Number.isFinite(endValue) && endValue >= start ? endValue : start;
        if (!valid.some((range) => range.start <= end && range.end >= start)) return;
        if (element.closest("[data-sphinx-preview-block-editor], [data-sphinx-preview-editing], [data-sphinx-preview-included]")) return;
        candidates.push(element);
      });
      const outer = new Set<Element>();
      for (const element of candidates) {
        for (let node = element.parentElement; node; node = node.parentElement) outer.add(node);
      }
      const targets: Element[] = [];
      for (const element of candidates) {
        if (outer.has(element)) continue;
        const parent = element.parentElement;
        const target = element.tagName === "CODE" && parent && parent.tagName === "PRE" ? parent : element;
        if (!targets.includes(target)) targets.push(target);
      }
      if (targets.length > MAX_BLOCKS) return [];
      targets.forEach((target) => markUntilEnd(target, UPDATED));
      return targets;
    },
    themeSwitch() {
      if (reduced()) return;
      const body = document.body;
      if (body && !switchListener) {
        switchListener = (event) => {
          if (event.target === body && (event as TransitionEvent).propertyName === "background-color") endSwitch();
        };
        body.addEventListener("transitionend", switchListener);
      }
      root.setAttribute(SWITCHING, "true");
      if (switchTimer !== undefined) window.clearTimeout(switchTimer);
      // The fallback for a switch between two modes of the same background (no transition runs).
      switchTimer = window.setTimeout(endSwitch, 400);
    },
    editorClosed(block) {
      if (!block || reduced() || root.getAttribute(MOTION) !== "on") return;
      markUntilEnd(block, CLOSED);
    },
    hold() {
      root.removeAttribute(MOTION);
    },
  };
}
