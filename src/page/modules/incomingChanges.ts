export interface IncomingChangeRange {
  start: number;
  end: number;
}

/** A run of lines removed since the last commit: the base lines `baseStart..baseEnd`, gone before line `start`. */
export interface RemovedLines {
  baseStart: number;
  baseEnd: number;
  start: number;
}

/** What a click on a bar or a removed-lines marker asks the diff card to show (CR 463). */
export type ChangeTarget = { element: Element } | { removed: RemovedLines };

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-221
/** The tooltip of a removed-lines marker: the lines at the last commit. */
export function removedLinesLabel(removed: RemovedLines): string {
  return removed.baseEnd === removed.baseStart
    ? `Removed line ${removed.baseStart} since last commit`
    : `Removed lines ${removed.baseStart}–${removed.baseEnd} since last commit`;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-220
/** The tooltip of a bar: the changed lines of a block that spans `start`..`end`, from the ranges. */
export function changedLinesLabel(ranges: IncomingChangeRange[], start: number, end: number): string {
  let first = Infinity;
  let last = -Infinity;
  for (const range of ranges) {
    if (range.start > end || range.end < start) continue;
    first = Math.min(first, Math.max(range.start, start));
    last = Math.max(last, Math.min(range.end, end));
  }
  return first === last
    ? `Changed line ${first} since last commit`
    : `Changed lines ${first}–${last} since last commit`;
}

/**
 * Incoming-change marks: a green bar on the blocks whose source lines changed since the last
 * commit.
 *
 * The host sends line ranges (1-based, whole file). The innermost mapped elements (`data-line`
 * with an optional `data-end-line`; a properties table row has `data-okf-line` and
 * `data-okf-end-line`, the lines of its field) whose lines meet a range get `data-sphinx-preview-changed`;
 * elements in or under an open inline editor are skipped. The last ranges are kept, so `apply()`
 * puts them on content that was replaced by a patch. `enabled` follows the setting (the toolbar
 * toggle of the marks is hidden when it is false).
 *
 * The bars themselves are `<span>`s of one layer after the content (`data-sphinx-preview-change-layer`
 * on the body), one per marked block, placed to the block's top and height by `layout()`. They sit
 * in one column whatever the indentation of the block, and no ancestor of the block can clip them.
 * Each bar carries `data-tooltip` (`Changed lines 12–14 since last commit`), shown by the stylesheet
 * while the pointer is over the bar itself. `layout()` runs after every `apply()` and when the page is resized or the content changes size.
 */
export function installIncomingChanges(document: Document, onActivate?: (target: ChangeTarget) => void): {
  setRanges(ranges: unknown, removed?: unknown): void;
  apply(): void;
  layout(): void;
  setEnabled(enabled: boolean): void;
  enabled(): boolean;
} {
  const MARK = "data-sphinx-preview-changed";
  const MARKER_HEIGHT = 12;
  const EXCLUDED_BLOCKS = "[data-sphinx-preview-block-editor], [data-sphinx-preview-editing], [data-sphinx-preview-included], [data-okf-sbs-card]";
  let ranges: IncomingChangeRange[] = [];
  let isEnabled = true;
  // The elements marked so far, so clearing never searches the page (and works after a patch).
  let marked: Element[] = [];
  // The tooltip text of each marked element (same index): its changed source lines.
  let labels: string[] = [];
  // The runs of removed lines and the first mapped element at or after each (undefined: at the end).
  let removedLines: RemovedLines[] = [];
  let anchors: (Element | undefined)[] = [];
  // What a click on each bar asks for.
  const targets = new WeakMap<Element, ChangeTarget>();

  let layer: HTMLElement | undefined;
  const bars: HTMLElement[] = [];

  const editing = (): boolean => document.documentElement.getAttribute("data-sphinx-preview-edit-mode") === "on";

  /** The box a block's bar spans: its card while the block's single diff card replaces it. */
  const boxOf = (target: Element): { top: number; height: number; bottom?: number } => {
    const box = target.getBoundingClientRect();
    const card = target.previousElementSibling;
    if (box.height <= 0 && target.getAttribute("data-okf-sbs-replaced") === "single" && card?.hasAttribute("data-okf-sbs-card")) {
      return card.getBoundingClientRect();
    }
    return box;
  };

  const barAt = (index: number): HTMLElement => {
    let bar = bars[index];
    if (!bar) {
      bar = document.createElement("span");
      bars.push(bar);
      (layer as HTMLElement).appendChild(bar);
    }
    return bar;
  };

  /** The last mapped element of the page a diff may mark (a removal at the end of the page sits below it). */
  const lastMapped = (): Element | undefined => {
    const all = Array.from(document.querySelectorAll("[data-line]")).filter((element) => !element.closest(EXCLUDED_BLOCKS));
    return all[all.length - 1];
  };

  /** Puts one bar on each marked block, at the top and with the height of its box, and one marker on each removal. */
  const layout = (): void => {
    if (typeof document.createElement !== "function" || !document.body) return;
    const visible = marked.filter((element) => element.isConnected !== false);
    if (visible.length === 0 && removedLines.length === 0 && !layer) return;
    if (!layer) {
      layer = document.createElement("div");
      layer.setAttribute("data-sphinx-preview-change-layer", "");
      layer.setAttribute("aria-hidden", "true");
      // @implements_req SwRS-MDOKFSTUDIO-REVIEW-222
      layer.addEventListener?.("click", (event) => {
        const bar = (event.target as Element | null)?.closest?.("[data-sphinx-preview-change-layer] > span");
        const target = bar ? targets.get(bar) : undefined;
        if (target && !editing()) onActivate?.(target);
      });
      document.body.appendChild(layer);
    }
    const origin = document.documentElement.getBoundingClientRect().top;
    let used = 0;
    for (const element of visible) {
      // A code block is marked on its <code>, inside the padding of the <pre> box: the bar spans the box.
      const parent = element.parentElement;
      const target = element.tagName === "CODE" && parent && parent.tagName === "PRE" ? parent : element;
      const box = boxOf(target);
      if (box.height <= 0) continue;
      const bar = barAt(used);
      bar.removeAttribute("data-removed");
      bar.style.setProperty("top", Math.round(box.top - origin) + "px");
      bar.style.setProperty("height", Math.round(box.height) + "px");
      bar.setAttribute("data-tooltip", labels[marked.indexOf(element)] ?? "");
      targets.set(bar, { element });
      bar.hidden = false;
      used += 1;
    }
    // A removed-lines marker sits just above the block that follows the removal (or its card), or just
    // below the last block when the removal was at the end.
    removedLines.forEach((removed, index) => {
      const anchor = anchors[index];
      let top: number;
      if (anchor) {
        let first: Element = anchor;
        while (first.previousElementSibling?.hasAttribute("data-okf-sbs-card")) first = first.previousElementSibling;
        const box = first.getBoundingClientRect();
        if (first.isConnected === false || box.height <= 0) return;
        top = box.top - origin - MARKER_HEIGHT - 2;
      } else {
        const box = lastMapped()?.getBoundingClientRect();
        if (!box) return;
        top = box.bottom - origin + 2;
      }
      const bar = barAt(used);
      bar.setAttribute("data-removed", "");
      bar.style.setProperty("top", Math.round(top) + "px");
      bar.style.setProperty("height", MARKER_HEIGHT + "px");
      bar.setAttribute("data-tooltip", removedLinesLabel(removed));
      targets.set(bar, { removed });
      bar.hidden = false;
      used += 1;
    });
    for (let index = used; index < bars.length; index += 1) bars[index].hidden = true;
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-207
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-215
  const apply = (): void => {
    marked.forEach((element) => element.removeAttribute(MARK));
    marked = [];
    labels = [];
    anchors = removedLines.map((removed) => Array.from(document.querySelectorAll("[data-line]")).find((element) =>
      Number(element.getAttribute("data-line")) >= removed.start && !element.closest(EXCLUDED_BLOCKS)));
    if (ranges.length === 0) {
      layout();
      return;
    }
    const candidates: Element[] = [];
    const spans = new Map<Element, [number, number]>();
    // A properties table row carries the lines of its field (`data-okf-line`); the table itself is
    // the block of line 1, so a row is innermost and the table is marked only when no row is.
    document.querySelectorAll("[data-line], [data-okf-line]").forEach((element) => {
      const field = element.getAttribute("data-okf-line") !== null;
      const start = Number(element.getAttribute(field ? "data-okf-line" : "data-line"));
      if (!Number.isFinite(start)) return;
      const endValue = Number(element.getAttribute(field ? "data-okf-end-line" : "data-end-line"));
      const end = Number.isFinite(endValue) && endValue >= start ? endValue : start;
      if (!ranges.some((range) => range.start <= end && range.end >= start)) return;
      if (element.closest("[data-sphinx-preview-block-editor], [data-sphinx-preview-editing]")) return;
      // Included content carries the line of the directive, and its file is never diffed.
      if (element.closest("[data-sphinx-preview-included]")) return;
      candidates.push(element);
      spans.set(element, [start, end]);
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
      const [start, end] = spans.get(element) as [number, number];
      labels.push(changedLinesLabel(ranges, start, end));
    }
    layout();
  };

  const resizeTarget = (document as Document).defaultView;
  resizeTarget?.addEventListener?.("resize", layout);

  return {
    setRanges(next, nextRemoved) {
      ranges = Array.isArray(next)
        ? next.filter((range): range is IncomingChangeRange => !!range
          && Number.isSafeInteger(range.start) && Number.isSafeInteger(range.end)
          && range.start >= 1 && range.end >= range.start)
        : [];
      removedLines = Array.isArray(nextRemoved)
        ? nextRemoved.filter((hunk): hunk is RemovedLines => !!hunk
          && [hunk.baseStart, hunk.baseEnd, hunk.start].every((value) => Number.isSafeInteger(value) && value >= 1)
          && hunk.baseEnd >= hunk.baseStart)
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
