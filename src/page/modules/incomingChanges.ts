export interface IncomingChangeRange {
  start: number;
  end: number;
}

/**
 * Incoming-change marks: a green bar on the blocks whose source lines changed since the last
 * commit.
 *
 * The host sends line ranges (1-based, whole file). The innermost mapped elements (`data-line`
 * with an optional `data-end-line`) whose lines meet a range get `data-sphinx-preview-changed`;
 * elements in or under an open inline editor are skipped. The last ranges are kept, so `apply()`
 * puts them on content that was replaced by a patch. `enabled` follows the setting (the toolbar
 * toggle of the marks is hidden when it is false).
 *
 * The bars themselves are `<span>`s of one layer after the content (`data-sphinx-preview-change-layer`
 * on the body), one per marked block, placed to the block's top and height by `layout()`. They sit
 * in one column whatever the indentation of the block, and no ancestor of the block can clip them.
 * `layout()` runs after every `apply()` and when the page is resized or the content changes size.
 */
export function installIncomingChanges(document: Document): {
  setRanges(ranges: unknown): void;
  apply(): void;
  layout(): void;
  setEnabled(enabled: boolean): void;
  enabled(): boolean;
} {
  const MARK = "data-sphinx-preview-changed";
  let ranges: IncomingChangeRange[] = [];
  let isEnabled = true;
  // The elements marked so far, so clearing never searches the page (and works after a patch).
  let marked: Element[] = [];

  let layer: HTMLElement | undefined;
  const bars: HTMLElement[] = [];

  /** Puts one bar on each marked block, at the top and with the height of its box. */
  const layout = (): void => {
    if (typeof document.createElement !== "function" || !document.body) return;
    const visible = marked.filter((element) => element.isConnected !== false);
    if (visible.length === 0 && !layer) return;
    if (!layer) {
      layer = document.createElement("div");
      layer.setAttribute("data-sphinx-preview-change-layer", "");
      layer.setAttribute("aria-hidden", "true");
      document.body.appendChild(layer);
    }
    const origin = document.documentElement.getBoundingClientRect().top;
    let used = 0;
    for (const element of visible) {
      // A code block is marked on its <code>, inside the padding of the <pre> box: the bar spans the box.
      const parent = element.parentElement;
      const target = element.tagName === "CODE" && parent && parent.tagName === "PRE" ? parent : element;
      const box = target.getBoundingClientRect();
      if (box.height <= 0) continue;
      let bar = bars[used];
      if (!bar) {
        bar = document.createElement("span");
        bars.push(bar);
        layer.appendChild(bar);
      }
      bar.style.setProperty("top", Math.round(box.top - origin) + "px");
      bar.style.setProperty("height", Math.round(box.height) + "px");
      bar.hidden = false;
      used += 1;
    }
    for (let index = used; index < bars.length; index += 1) bars[index].hidden = true;
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-207
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-208
  const apply = (): void => {
    marked.forEach((element) => element.removeAttribute(MARK));
    marked = [];
    if (ranges.length === 0) {
      layout();
      return;
    }
    const candidates: Element[] = [];
    document.querySelectorAll("[data-line]").forEach((element) => {
      const start = Number(element.getAttribute("data-line"));
      if (!Number.isFinite(start)) return;
      const endValue = Number(element.getAttribute("data-end-line"));
      const end = Number.isFinite(endValue) && endValue >= start ? endValue : start;
      if (!ranges.some((range) => range.start <= end && range.end >= start)) return;
      if (element.closest("[data-sphinx-preview-block-editor], [data-sphinx-preview-editing]")) return;
      // Included content carries the line of the directive, and its file is never diffed.
      if (element.closest("[data-sphinx-preview-included]")) return;
      candidates.push(element);
    });
    // A candidate with a candidate inside it is not innermost.
    const outer = new Set<Element>();
    for (const element of candidates) {
      for (let node = element.parentElement; node; node = node.parentElement) outer.add(node);
    }
    for (const element of candidates) {
      if (outer.has(element)) continue;
      element.setAttribute(MARK, "true");
      marked.push(element);
    }
    layout();
  };

  const resizeTarget = (document as Document).defaultView;
  resizeTarget?.addEventListener?.("resize", layout);

  return {
    setRanges(next) {
      ranges = Array.isArray(next)
        ? next.filter((range): range is IncomingChangeRange => !!range
          && Number.isSafeInteger(range.start) && Number.isSafeInteger(range.end)
          && range.start >= 1 && range.end >= range.start)
        : [];
      apply();
    },
    apply,
    layout,
    setEnabled(next) {
      isEnabled = next;
      document.documentElement.setAttribute("data-okf-incoming-changes", next ? "true" : "false");
    },
    enabled: () => isEnabled,
  };
}
