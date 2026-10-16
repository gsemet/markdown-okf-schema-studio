export interface IncomingChangeRange {
  start: number;
  end: number;
}

/**
 * Incoming-change marks: a green bar on the blocks whose source lines changed since the last
 * commit. Injected into the page script with `.toString()`, so the body must not use anything
 * defined outside it.
 *
 * The host sends line ranges (1-based, whole file). The innermost mapped elements (`data-line`
 * with an optional `data-end-line`) whose lines meet a range get `data-sphinx-preview-changed`;
 * elements in or under an open inline editor are skipped. The last ranges are kept, so `apply()`
 * puts them on content that was replaced by a patch. `enabled` follows the setting (the toolbar
 * toggle of the marks is hidden when it is false).
 */
export function installIncomingChanges(document: Document): {
  setRanges(ranges: unknown): void;
  apply(): void;
  setEnabled(enabled: boolean): void;
  enabled(): boolean;
} {
  const MARK = "data-sphinx-preview-changed";
  let ranges: IncomingChangeRange[] = [];
  let isEnabled = true;
  // The elements marked so far, so clearing never searches the page (and works after a patch).
  let marked: Element[] = [];

  const apply = (): void => {
    marked.forEach((element) => element.removeAttribute(MARK));
    marked = [];
    if (ranges.length === 0) return;
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
  };

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
    setEnabled(next) {
      isEnabled = next;
      document.documentElement.setAttribute("data-okf-incoming-changes", next ? "true" : "false");
    },
    enabled: () => isEnabled,
  };
}
