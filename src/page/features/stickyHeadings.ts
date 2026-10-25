/**
 * The sticky heading band at the top of the page (the active heading and its parents, up to the
 * configured depth) and the reading offset it defines: the strip reserved at the top of the
 * viewport for the band. The offset only grows for a given width, so the reading line never moves
 * while the band changes content.
 */

import type { AnchorPolicy } from "../../core/scroll/anchorPolicy";

/** The sticky heading band and reading offset of a page. */
export interface StickyHeadings {
  /** The band element, absent on pages without it. */
  readonly element: HTMLElement | null | undefined;
  /** The reading offset in pixels (0 without a band). */
  readingOffset(): number;
  /** Measures the reading offset again and writes it to `--sphinx-preview-reading-offset`. */
  refreshReadingOffset(): void;
  /** Leaves room for the toolbar on the band's line (`--sphinx-preview-toolbar-width`). */
  refreshStickyHeadingPosition(): void;
  /**
   * Shows the active heading and its parents. `fromScroll`: only the scroll position changed since
   * the last layout update, so the measured heading tops still hold; every other caller measures
   * them again.
   */
  updateStickyHeadings(fromScroll?: boolean): void;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-022
/** The sticky heading band of a page; `depth` is the number of heading levels it shows. */
export function installStickyHeadings(
  document: Document,
  window: Window & typeof globalThis,
  anchorPolicy: Pick<AnchorPolicy, "readingOffset">,
  depth: number,
): StickyHeadings {
  const stickyHeadings = document.querySelector?.<HTMLElement>("[data-sphinx-preview-sticky-headings]");
  let readingOffsetValue = 0;
  let observedBandHeight = 0;
  let observedWidth: number | undefined;

  function visibleStickyHeadingHeight(): number {
    if (!stickyHeadings || stickyHeadings.hidden) return 0;
    return Math.max(0, stickyHeadings.getBoundingClientRect().height);
  }

  function visibleStickyHeadingBottom(): number {
    if (!stickyHeadings || stickyHeadings.hidden) return 0;
    const rectangle = stickyHeadings.getBoundingClientRect?.();
    return rectangle && Number.isFinite(rectangle.bottom) ? Math.max(0, rectangle.bottom) : 0;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-025
  function refreshStickyHeadingPosition(): void {
    if (!stickyHeadings) return;
    const toolbar = document.querySelector?.("[data-sphinx-preview-toolbar]");
    const toolbarBounds = toolbar?.getBoundingClientRect?.();
    const toolbarWidth = toolbarBounds && Number.isFinite(toolbarBounds.width)
      ? Math.max(0, toolbarBounds.width) + 22
      : 0;
    stickyHeadings.style?.setProperty?.("--sphinx-preview-toolbar-width", toolbarWidth + "px");
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-030
  function refreshReadingOffset(): void {
    if (!stickyHeadings) {
      readingOffsetValue = 0;
      return;
    }
    refreshStickyHeadingPosition();
    const width = document.documentElement?.clientWidth;
    if (width !== observedWidth) {
      observedWidth = width;
      observedBandHeight = 0;
    }
    observedBandHeight = Math.max(observedBandHeight, visibleStickyHeadingHeight());
    const style = window.getComputedStyle?.(stickyHeadings);
    const rawLineHeight = String(style?.lineHeight ?? "");
    const fontSize = Number.parseFloat(style?.fontSize as string);
    let lineHeight = 20;
    if (rawLineHeight.endsWith("px") && Number.parseFloat(rawLineHeight) > 0) {
      lineHeight = Number.parseFloat(rawLineHeight);
    } else if (fontSize > 0) {
      lineHeight = fontSize * 1.5;
    }
    readingOffsetValue = Math.max(
      anchorPolicy.readingOffset(depth, lineHeight, 5),
      observedBandHeight,
      visibleStickyHeadingBottom(),
    );
    document.documentElement.style?.setProperty?.("--sphinx-preview-reading-offset", readingOffsetValue + "px");
  }

  // A comment chip and its hidden body are not part of a heading's wording.
  function headingLabel(heading: Element): string {
    if (typeof heading.cloneNode !== "function" || !heading.querySelector?.(".okf-comment")) {
      return heading.textContent as string;
    }
    const copy = heading.cloneNode(true) as Element;
    copy.querySelectorAll(".okf-comment").forEach((comment) => comment.remove());
    return copy.textContent as string;
  }

  // Heading tops in document coordinates, measured on every layout update; a scroll frame reads
  // no heading geometry and finds the active heading by binary search (PERF-08).
  let headingList: Element[] = [];
  let headingTops: Array<{ index: number; top: number }> = [];

  function measureHeadings(): void {
    headingList = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const scrollY = window.scrollY;
    headingTops = [];
    headingList.forEach((heading, index) => {
      const bounds = heading.getBoundingClientRect();
      if (bounds.height > 0) headingTops.push({ index, top: bounds.top + scrollY });
    });
    headingTops.sort((left, right) => left.top - right.top || left.index - right.index);
  }

  // The visible heading with the greatest top at or above the threshold (viewport y), the first one
  // in document order on a tie; -1 when there is none.
  function activeHeadingIndex(threshold: number): number {
    const scrollY = window.scrollY;
    let low = 0;
    let high = headingTops.length - 1;
    let found = -1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (headingTops[middle]!.top - scrollY <= threshold) {
        found = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    if (found < 0) return -1;
    while (found > 0 && headingTops[found - 1]!.top === headingTops[found]!.top) found -= 1;
    return headingTops[found]!.index;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-018
  function updateStickyHeadings(fromScroll = false): void {
    if (!stickyHeadings) return;
    refreshStickyHeadingPosition();
    if (fromScroll && headingList.length === 0) measureHeadings();
    let previousActiveIndex = -2;
    for (let pass = 0; pass < 3; pass += 1) {
      if (!fromScroll) measureHeadings();
      const headings = headingList;
      const activeThreshold = stickyHeadings.hidden || window.scrollY <= 1
        ? 0
        : stickyHeadings.getBoundingClientRect().bottom;
      const activeIndex = activeHeadingIndex(activeThreshold);
      if (activeIndex === previousActiveIndex) return;
      previousActiveIndex = activeIndex;
      const readingOffsetBefore = readingOffsetValue;
      if (activeIndex < 0) {
        if (!stickyHeadings.hidden || stickyHeadings.textContent !== "") {
          stickyHeadings.hidden = true;
          stickyHeadings.textContent = "";
        }
        if (document.body) document.body.removeAttribute("data-sphinx-preview-sticky-headings-active");
        continue;
      }

      const active = headings[activeIndex]!;
      const activeLevel = Number(active.tagName.slice(1));
      const labels: string[] = [];
      let childLevel = activeLevel;
      for (
        let index = activeIndex - 1;
        index >= 0 && labels.length < depth - 1;
        index -= 1
      ) {
        const heading = headings[index]!;
        const level = Number(heading.tagName.slice(1));
        const text = headingLabel(heading).trim();
        if (level < childLevel && text) {
          labels.unshift("#".repeat(level) + " " + text);
          childLevel = level;
        }
      }
      const activeText = headingLabel(active).trim();
      if (activeText) labels.push("#".repeat(activeLevel) + " " + activeText);
      // Written only when it changes: rewriting the same text would dirty the layout every frame.
      const bandText = labels.join("\n");
      if (stickyHeadings.textContent !== bandText) stickyHeadings.textContent = bandText;
      if (stickyHeadings.hidden !== (labels.length === 0)) stickyHeadings.hidden = labels.length === 0;
      if (visibleStickyHeadingHeight() > observedBandHeight) refreshReadingOffset();
      if (document.body) {
        if (labels.length > 0) {
          document.body.setAttribute("data-sphinx-preview-sticky-headings-active", "true");
        } else {
          document.body.removeAttribute("data-sphinx-preview-sticky-headings-active");
        }
      }
      // A new reading offset can move the content: the next pass measures the headings again.
      if (readingOffsetValue !== readingOffsetBefore) measureHeadings();
    }
  }

  return {
    element: stickyHeadings,
    readingOffset: () => readingOffsetValue,
    refreshReadingOffset,
    refreshStickyHeadingPosition,
    updateStickyHeadings,
  };
}
