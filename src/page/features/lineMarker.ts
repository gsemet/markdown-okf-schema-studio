/**
 * The line marker: when the host asks (`previewRevealLine`: Studio opened at a searched line, or at
 * a link's target line), the page unfolds what hides the line, scrolls it to the reading line
 * silently, and draws one decorative overlay on it: an arrow in the left margin and a light band
 * across the content column. The marker stays while the reader scrolls and is placed again after a
 * layout change or a content patch; it goes on a pointer press, when an edit starts, or when
 * another line is requested. See styles/lineMarkerStyles.ts for the look.
 */

import type { RevealScroll } from "../../core/protocol/hostToPage";
import { measureLineTops } from "../modules/lineTops";
import {
  frontmatterRowFor,
  isCodeBlockItself,
  markerSpanOf,
  panelsAround,
  tableRowFor,
  targetIn,
} from "./lineMarkerPlacement";
import { MAPPINGS_SELECTOR, type LayoutEntry, type PageRuntime } from "./pageRuntime";

/** The marker of a page. */
export interface LineMarker {
  /**
   * Places the marker on a 1-based source line, unfolding what hides it. `"reading-line"` always
   * scrolls the line to the reading line; `"if-off-screen"` scrolls only when the line's box is not
   * on screen below the sticky heading band.
   */
  reveal(line: number, scroll: RevealScroll): void;
  /** Removes the marker. */
  clear(): void;
  /** The line the marker is on, or undefined when there is none. */
  currentLine(): number | undefined;
}

/** The measured box of a source line, in document coordinates. */
interface LineBox {
  top: number;
  height: number;
}

const MARKER_CLASS = "sphinx-preview-line-marker";
const ARROW_CLASS = "sphinx-preview-line-marker-arrow";
const FALLBACK_LINE_HEIGHT = 22;

/** The page-to-host messages that change the document's source or open an editor on it (the editor
 * starts an edit, whatever opened it): posting one removes the marker. */
const SOURCE_EDIT_TYPES: ReadonlySet<string> = new Set([
  "previewEditSave", "previewFrontmatterSave", "previewCheckboxToggle", "previewLabelRename", "previewFindReplace",
  "previewBlockMove", "previewBlocksCut", "previewBlocksPaste", "previewDropFiles", "previewPasteImage",
  "previewPasteHtml", "previewEditOpen",
]);

/**
 * The index, among the `spanCount` line spans of a code block whose source ends at `endLine`, of the
 * span that shows source line `sourceLine`; counted back from the closing fence (the options, the
 * language and the opening fence come first), so a backtick fence, a tilde fence and a `{code-block}`
 * with options all map the same way. Undefined for a fence line or a line before the first span.
 */
export function codeSpanIndex(spanCount: number, endLine: number, sourceLine: number): number | undefined {
  const index = spanCount - (endLine - sourceLine);
  return sourceLine < endLine && index >= 0 && index < spanCount ? index : undefined;
}

/** True when `message` is a page-to-host message that edits the source (the marker's lifetime, 4.7). */
export function postsASourceEdit(message: unknown): boolean {
  const type = typeof message === "object" && message !== null ? (message as { type?: unknown }).type : undefined;
  return typeof type === "string" && SOURCE_EDIT_TYPES.has(type);
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-178
// @implements_req SwRS-MDOKFSTUDIO-LIFE-179
// @implements_req SwRS-MDOKFSTUDIO-LIFE-180
/** The line marker of a page. */
export function installLineMarker(rt: PageRuntime): LineMarker {
  const { document, window, context, state } = rt;
  let line: number | undefined;
  // The document the marker belongs to: a page that shows another one draws no marker.
  let markedDocumentId: string | undefined;
  let overlay: HTMLElement | undefined;
  let marked: Element | undefined;

  const lineHeightOf = (element: Element): number => {
    const parsed = Number.parseFloat(window.getComputedStyle?.(element)?.lineHeight ?? "");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_LINE_HEIGHT;
  };

  // The innermost mapped block holding the line, folded or not (the layout lists visible ones only).
  function containingBlock(sourceLine: number): HTMLElement | undefined {
    let best: HTMLElement | undefined;
    let bestStart = 0;
    for (const element of Array.from(document.querySelectorAll<HTMLElement>(MAPPINGS_SELECTOR))) {
      if (element.getAttribute("data-sphinx-preview-document") !== context.documentId) continue;
      const start = Number(element.getAttribute("data-sphinx-source-line"));
      const parsedEnd = Number(element.getAttribute("data-sphinx-source-end-line"));
      // The properties section is mapped from line 1 only: its closing fence ends it.
      const frontmatterEnd = Number(element.getAttribute("data-okf-frontmatter-end-line"));
      const end = Math.max(
        Number.isSafeInteger(parsedEnd) && parsedEnd > start ? parsedEnd : start,
        Number.isSafeInteger(frontmatterEnd) ? frontmatterEnd : 0,
      );
      if (start <= sourceLine && sourceLine <= end && start > bestStart) {
        best = element;
        bestStart = start;
      }
    }
    return best;
  }

  // Unfolds the heading section and the closed dropdowns around the block; true when one opened.
  function unfold(block: Element): boolean {
    let changed = rt.parts.headingFold.reveal(block);
    let details = block.closest("details");
    while (details) {
      if (!details.open) {
        details.open = true;
        changed = true;
      }
      details = details.parentElement?.closest("details") ?? null;
    }
    return changed;
  }

  const rowBox = (row: Element): LineBox => {
    const rectangle = row.getBoundingClientRect();
    return { top: rectangle.top + window.scrollY, height: rectangle.height || lineHeightOf(row) };
  };

  // The exact line's top and height inside `entry`: a table row, a front matter row, a code line, a
  // wrapped paragraph line, the top of the target; else the top of the block and its first line.
  function lineBox(entry: LayoutEntry, target: Element, sourceLine: number): LineBox {
    const height = lineHeightOf(entry.element);
    const fallback = { top: entry.top, height: Math.min(height, entry.height || height) };
    const isBlock = target === entry.element;
    const row = entry.element.getAttribute("data-okf-properties") === null
      ? tableRowFor(target, sourceLine)
      : frontmatterRowFor(entry.element, sourceLine);
    if (row) return rowBox(row);
    if (entry.element.getAttribute("data-okf-properties") !== null) return fallback;
    const span = isBlock ? { start: entry.sourceLine, end: entry.endLine } : markerSpanOf(target);
    if (!span || sourceLine <= span.start || sourceLine > span.end) {
      return isBlock || !span ? fallback : targetTop(target, height);
    }
    // A code block itself: the span of the line, counted back from the closing fence.
    if (isCodeBlockItself(target)) {
      const spans = Array.from(target.querySelectorAll(".myst-code-line"));
      const index = codeSpanIndex(spans.length, span.end, sourceLine);
      const rectangle = index === undefined ? undefined : spans[index]?.getBoundingClientRect();
      return rectangle
        ? { top: rectangle.top + window.scrollY, height: rectangle.height || height }
        : isBlock ? fallback : targetTop(target, height);
    }
    // A paragraph: the measured tops of its soft-wrapped lines.
    const tops = isBlock ? entry.lineTops : measureLineTops(document, window, target, span.start, span.end);
    const top = tops?.[sourceLine - span.start - 1];
    if (top !== undefined) return { top, height };
    return isBlock ? fallback : targetTop(target, height);
  }

  const targetTop = (target: Element, height: number): LineBox => {
    const rectangle = target.getBoundingClientRect();
    return { top: rectangle.top + window.scrollY, height: Math.min(height, rectangle.height || height) };
  };

  // `aria-current` is shared with `markSourceLine` (the editor selection mark): each owns its own
  // marker attribute, and an element keeps `aria-current` while the other still marks it.
  function mark(element: Element | undefined): void {
    if (marked && marked !== element) {
      marked.removeAttribute("data-sphinx-line-marker");
      if (!marked.getAttribute("data-sphinx-preview-current")) marked.removeAttribute("aria-current");
    }
    marked = element;
    element?.setAttribute("data-sphinx-line-marker", "true");
    element?.setAttribute("aria-current", "location");
  }

  function draw(box: LineBox): void {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = MARKER_CLASS;
      overlay.setAttribute("aria-hidden", "true");
      const arrow = document.createElement("span");
      arrow.className = ARROW_CLASS;
      overlay.appendChild(arrow);
    }
    if (!overlay.parentElement) document.body.appendChild(overlay);
    const column = document.getElementById("sphinx-myst-preview-content")?.getBoundingClientRect();
    overlay.style.setProperty("top", `${box.top}px`);
    overlay.style.setProperty("height", `${box.height}px`);
    overlay.style.setProperty("left", `${(column?.left ?? 0) + (window.scrollX ?? 0)}px`);
    overlay.style.setProperty("width", column?.width ? `${column.width}px` : "100%");
  }

  function hide(): void {
    overlay?.remove();
    mark(undefined);
  }

  // Opens what hides the target: the heading section and closed dropdowns, then each hidden tab panel
  // around it (outermost first), then a collapsed properties table on a property row. True when
  // something opened. `reveal` makes the tabs call `onChange` (`stabilizeLayout`), which only asks for
  // an animation frame: the `layoutMeasured` placement (`place(false)`) runs after this request is
  // done, never inside it (a runtime test pins it).
  function openWhatHides(block: Element, target: Element, onPropertyRow: boolean): boolean {
    let changed = unfold(block);
    if (target !== block && unfold(target)) changed = true;
    for (const panel of panelsAround(target)) {
      if ((panel as HTMLElement).hidden && rt.parts.tabs.reveal(panel)) changed = true;
    }
    if (onPropertyRow && state.frontmatterCollapsed) {
      state.frontmatterCollapsed = false;
      rt.input.applyFrontmatterVisibility();
      changed = true;
    }
    return changed;
  }

  // The entry of the properties section: its layout entry ends at its first line, so it is built here.
  function frontmatterEntry(section: HTMLElement): LayoutEntry | undefined {
    const rectangle = section.getBoundingClientRect();
    if (!(rectangle.height > 0)) return undefined;
    const end = Number(section.getAttribute("data-okf-frontmatter-end-line"));
    return {
      element: section,
      sourceLine: 1,
      endLine: Number.isSafeInteger(end) ? end : 1,
      top: rectangle.top + window.scrollY,
      height: rectangle.height,
      domOrder: 0,
    };
  }

  // Draws the marker on its line. `unfoldFirst` (a request) opens what hides it; a later placement
  // never undoes a fold the reader made, nor shows a tab: the marker is just not drawn while its line
  // is hidden.
  function place(unfoldFirst: boolean): LineBox | undefined {
    if (line === undefined) return undefined;
    const block = containingBlock(line);
    const isFrontmatter = block?.getAttribute("data-okf-properties") !== null && block !== undefined;
    const target = block ? targetIn(block, line) ?? block : undefined;
    const propertyRow = isFrontmatter && block ? frontmatterRowFor(block, line) : undefined;
    if (unfoldFirst && block && target && openWhatHides(block, target, propertyRow !== undefined)) rt.scroll.measure();
    const entry = isFrontmatter && block ? frontmatterEntry(block) : rt.scroll.entryForLine(line);
    const hidden = block !== undefined && target !== undefined && (
      entry === undefined
      || !(entry.sourceLine <= line && line <= entry.endLine)
      || panelsAround(target).some((panel) => (panel as HTMLElement).hidden)
      || (propertyRow !== undefined && state.frontmatterCollapsed)
    );
    if (!entry || hidden) {
      hide();
      return undefined;
    }
    const box = lineBox(entry, target && entry.element.contains(target) ? target : entry.element, line);
    draw(box);
    mark(entry.element);
    return box;
  }

  // True when the whole box is inside the viewport, below the sticky heading band.
  function isOnScreen(box: LineBox): boolean {
    const top = window.scrollY + rt.parts.stickyBand.readingOffset();
    return box.top >= top && box.top + box.height <= window.scrollY + window.innerHeight;
  }

  function clear(): void {
    line = undefined;
    hide();
  }

  const startsAnEdit = (): boolean => Boolean(state.activeBlockEdit || state.activeFrontmatterEdit);

  document.addEventListener("pointerdown", () => {
    if (line !== undefined) clear();
  }, true);
  document.addEventListener("focusin", () => {
    if (line !== undefined && startsAnEdit()) clear();
  });
  rt.bus.on("layoutMeasured", () => {
    if (line === undefined) return;
    if (startsAnEdit() || context.documentId !== markedDocumentId) clear();
    else place(false);
  });
  rt.bus.on("contentReplaced", () => {
    if (line !== undefined) rt.scroll.stabilizeLayout();
  });

  return {
    reveal(requested, scroll) {
      line = requested;
      markedDocumentId = context.documentId;
      const box = place(true);
      if (box && (scroll === "reading-line" || !isOnScreen(box))) rt.scroll.revealPositionSilently(box.top, requested);
      // The scroll moved nothing in the document: the box stays right. Measure again on the frame.
      rt.scroll.stabilizeLayout();
    },
    clear,
    currentLine: () => line,
  };
}
