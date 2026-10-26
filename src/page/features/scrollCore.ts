/**
 * Scroll sync and anchoring: the page measures its mapped blocks into a line ↔ y map, keeps one
 * scroll anchor (owned by the page or by the text editor), re-applies it after every layout change,
 * follows the text editor (`sourceScroll`), leads it on a user scroll (`previewScroll`), and saves
 * the panel state. See anchorPolicy.ts and docs/scroll-anchoring.md.
 */

import type { AnchorPoint } from "../../core/scroll/anchorPolicy";
import { normalizeSourcePath } from "./mappedBlocks";
import {
  MAPPINGS_SELECTOR,
  type BlockEdit,
  type LayoutEntry,
  type PageRuntime,
  type PanelStateSnapshot,
  type PinFields,
  type ScrollCore,
} from "./pageRuntime";

/** The scroll core of a page. */
export function installScrollCore(rt: PageRuntime): ScrollCore {
  const { document, window, context, host, settings, anchorPolicy, state } = rt;
  const parts = (): PageRuntime["parts"] => rt.parts;
  const readingOffset = (): number => rt.parts.stickyBand.readingOffset();
  let layout: LayoutEntry[] = [];
  let anchorMap: AnchorPoint[] = [];
  let expectedScroll: { top: number; until: number } | undefined;
  let lastPostedLine: number | undefined;
  let frame: number | undefined;
  let sourceScrollSequence = 0;

  function stateSnapshot(line: number | undefined, throttled = false): PanelStateSnapshot {
    const details = Array.from(document.querySelectorAll("details"))
      .map((element, index) => element.open ? index : undefined)
      .filter((index): index is number => index !== undefined);
    const active = document.activeElement;
    const focusedBlockId = active?.closest?.(MAPPINGS_SELECTOR)?.getAttribute(
      "data-sphinx-preview-block",
    ) || undefined;
    const selection = window.getSelection?.();
    const selectedText = selection?.toString?.().slice(0, 4096) || undefined;
    const { themeMode, anchorMode, viewControls, widthMode, tocColumn, chipToggle } = parts();
    const snapshot: PanelStateSnapshot = {
      documentId: context.documentId,
      sourceFile: context.activeSourceFile,
      sourceLine: line === undefined ? undefined : anchorPolicy.editorTopLine(line),
      scrollTop: Math.max(0, window.scrollY),
      ...(focusedBlockId ? { focusedBlockId } : {}),
      ...(selectedText ? { selectedText } : {}),
      ...(details.length ? { openDisclosures: details } : {}),
      ...(state.pendingBlockNavigation ? { pendingBlockNavigation: state.pendingBlockNavigation } : {}),
      ...(state.pendingMoveSelection ? { pendingMoveSelection: state.pendingMoveSelection } : {}),
      ...(state.pendingFrontmatterEdit ? { pendingFrontmatterEdit: state.pendingFrontmatterEdit } : {}),
      ...(state.pendingFrontmatterEdit && state.pendingEditOpenedIn !== undefined
        ? { pendingFrontmatterEditOpenedIn: state.pendingEditOpenedIn } : {}),
      previewThemeMode: themeMode.mode(),
      anchorToEditor: anchorMode.anchored(),
      editMode: state.editMode,
      paletteMode: state.paletteMode,
      descriptionsCollapsed: state.descriptionsCollapsed,
      viewZoom: viewControls.zoom(),
      viewWidthMode: widthMode.mode(),
      viewToc: tocColumn.open(),
      tocCollapsed: tocColumn.collapsed(),
      expandedChips: chipToggle.expanded(),
    };
    if (throttled) rt.pageHost.setStateThrottled(snapshot);
    else host.setState?.(snapshot);
    return snapshot;
  }

  function isVisible(element: Element, rectangle: DOMRect): boolean {
    const style = window.getComputedStyle?.(element);
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    const clientRects = element.getClientRects?.();
    if (clientRects && clientRects.length === 0) return false;
    return rectangle.height > 0;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-119
  // Document y where each soft-wrapped source line of a paragraph starts. Paragraph text keeps
  // the source line breaks as newline characters, so the line after each newline starts at the
  // first visible character that follows it.
  function measureLineTops(element: Element, line: number, endLine: number): number[] | undefined {
    if (endLine <= line || String(element.tagName || "").toUpperCase() !== "P"
      || typeof document.createTreeWalker !== "function"
      || typeof document.createRange !== "function") return undefined;
    const walker = document.createTreeWalker(element, 4);
    const range = document.createRange();
    const tops: number[] = [];
    let waiting = 0;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const text = String(node.data || "");
      for (let index = 0; index < text.length; index += 1) {
        const character = text[index]!;
        if (character === "\n") {
          waiting += 1;
          continue;
        }
        if (waiting === 0 || character.trim() === "") continue;
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rectangle = range.getClientRects?.()[0] ?? range.getBoundingClientRect?.();
        if (!rectangle || !Number.isFinite(rectangle.top)) return undefined;
        for (; waiting > 0; waiting -= 1) tops.push(rectangle.top + window.scrollY);
      }
    }
    return tops.length === endLine - line ? tops : undefined;
  }

  function parseMappings(): LayoutEntry[] {
    return Array.from(document.querySelectorAll<HTMLElement>(MAPPINGS_SELECTOR))
      .map((element, domOrder): LayoutEntry | undefined => {
        const sourceFile = element.getAttribute("data-sphinx-source-file");
        const sourceLine = element.getAttribute("data-sphinx-source-line");
        const documentId = element.getAttribute("data-sphinx-preview-document");
        const parsedSourceLine = sourceLine ? Number(sourceLine) : Number.NaN;
        if (!sourceFile || !sourceLine || !documentId || documentId !== context.documentId
          || normalizeSourcePath(sourceFile) !== normalizeSourcePath(context.activeSourceFile)
          || !/^[1-9]\d*$/.test(sourceLine)
          || !Number.isSafeInteger(parsedSourceLine)) {
          return undefined;
        }
        const rectangle = element.getBoundingClientRect();
        if (!isVisible(element, rectangle)) return undefined;
        const parsedEndLine = Number(element.getAttribute("data-sphinx-source-end-line"));
        const endLine = Number.isSafeInteger(parsedEndLine) && parsedEndLine > parsedSourceLine
          ? parsedEndLine
          : parsedSourceLine;
        const lineTops = measureLineTops(element, parsedSourceLine, endLine);
        return {
          element,
          sourceLine: parsedSourceLine,
          endLine,
          ...(lineTops ? { lineTops } : {}),
          top: rectangle.top + window.scrollY,
          height: rectangle.height,
          domOrder,
        };
      })
      .filter((mapping): mapping is LayoutEntry => mapping !== undefined)
      .sort((left, right) => left.top - right.top || left.sourceLine - right.sourceLine);
  }

  function clearMarkedSourceLine(): void {
    document.querySelectorAll(MAPPINGS_SELECTOR).forEach((element) => {
      element.removeAttribute?.("data-sphinx-preview-current");
      element.removeAttribute?.("aria-current");
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-128
  function markSourceLine(sourceLine: number): void {
    clearMarkedSourceLine();
    if (!settings.markEditorSelection || !Number.isFinite(sourceLine) || !layout.length) return;
    // The block that contains the line (the innermost one when blocks nest); a line between two
    // blocks takes the block with the nearest edge.
    const distance = (entry: LayoutEntry): number =>
      sourceLine < entry.sourceLine
        ? entry.sourceLine - sourceLine
        : Math.max(0, sourceLine - entry.endLine);
    const nearest = layout.reduce<LayoutEntry | undefined>((best, candidate) => {
      if (!best) return candidate;
      const gap = distance(candidate) - distance(best);
      return gap < 0 || (gap === 0 && candidate.sourceLine > best.sourceLine) ? candidate : best;
    }, undefined);
    nearest?.element?.setAttribute?.("data-sphinx-preview-current", "true");
    nearest?.element?.setAttribute?.("aria-current", "location");
  }

  function maxScrollTop(): number {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function lineAtScroll(scrollTop: number): number | undefined {
    return anchorPolicy.lineAtScrollTop(anchorMap, scrollTop, readingOffset());
  }

  function scrollAtLine(sourceLine: number): number | undefined {
    return anchorPolicy.scrollTopForLine(anchorMap, sourceLine, readingOffset(), maxScrollTop());
  }

  // Programmatic scrolls are silent: the resulting scroll event is recognized and dropped.
  function programmaticScroll(top: number): void {
    expectedScroll = { top, until: Date.now() + 500 };
    if (Math.abs(window.scrollY - top) >= 0.5) window.scrollTo({ top, behavior: "auto" });
  }

  // Re-applies the anchor after any layout change instead of re-deriving it from the scroll.
  function applyAnchor(): void {
    if (state.editAnchor?.element) {
      const viewportTop = state.editAnchor.element.getBoundingClientRect().top;
      if (!Number.isFinite(viewportTop)) return;
      const target = Math.max(0, Math.min(
        maxScrollTop(),
        window.scrollY + viewportTop - state.editAnchor.viewportTop,
      ));
      programmaticScroll(target);
      const line = lineAtScroll(target);
      if (line !== undefined) state.anchor = { line, owner: state.anchor?.owner ?? "preview" };
      // Re-check only when the toolbar first appears or changes size (a wrapping status line,
      // a resize), so a deliberate user scroll or a cell switch never makes the page jump.
      const editing = state.activeBlockEdit;
      if (editing?.tableMenu && editing.selectedCell) {
        const barHeight = editing.tableMenu.getBoundingClientRect?.()?.height;
        if (barHeight !== editing.tableMenuHeight) {
          editing.tableMenuHeight = barHeight;
          rt.editorChrome.revealTableToolbar(editing.tableMenu, editing.selectedCell);
        }
      } else if (editing?.palette && editing.textarea) {
        const barHeight = editing.palette.element.getBoundingClientRect?.()?.height;
        if (barHeight !== editing.paletteHeight) {
          editing.paletteHeight = barHeight;
          rt.editorChrome.syncPaletteSticky(editing);
          rt.editorChrome.revealTableToolbar(editing.palette.element, editing.textarea);
        }
      }
      return;
    }
    if (!state.anchor) return;
    // Past the last mapped block every scroll reads as the last line: keep the reader's scroll.
    const current = lineAtScroll(window.scrollY);
    if (current !== undefined && Math.abs(current - state.anchor.line) < 1e-3) return;
    const target = scrollAtLine(state.anchor.line);
    if (target !== undefined) programmaticScroll(target);
  }

  function beginEditAnchor(element: Element | undefined): void {
    const viewportTop = element?.getBoundingClientRect?.().top;
    state.editAnchor = element && viewportTop !== undefined && Number.isFinite(viewportTop)
      ? { element, viewportTop } : undefined;
  }

  function anchorField(): { anchorLine?: number } {
    return state.anchor ? { anchorLine: state.anchor.line } : {};
  }

  // Final saves carry the edited element's source line and viewport top, so the render that
  // follows can put the element back at the same screen position (rule R7). A hidden rendered
  // element has an empty rect; the editor element then stands in for it.
  function pinFields(line: number, element: Element | null | undefined, fallback?: Element,
    fallbackOffset = 0): PinFields {
    let rect = element?.getBoundingClientRect?.();
    let offset = 0;
    if (!rect || !(rect.height > 0)) {
      rect = fallback?.getBoundingClientRect?.();
      offset = fallbackOffset;
    }
    const top = (rect?.top as number) + offset;
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isFinite(top) || Math.abs(top) > 100000) {
      return {};
    }
    return { pinLine: line, pinViewportTop: top };
  }

  function frontmatterPinFields(cell: Element | undefined): PinFields {
    const properties = cell?.closest?.("[data-okf-properties]")
      || document.querySelector?.("[data-okf-properties]");
    return pinFields(1, properties);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-228
  function blockPinFields(edit: BlockEdit): PinFields {
    const line = edit.insertAfterLine !== undefined
      ? Math.max(1, edit.insertAfterLine + 1)
      : edit.line;
    const table = edit.selectedCell?.closest?.("table");
    // The edition palette pushed the frame up (paletteShift) to keep the text still: the
    // element comes back where the frame stood before that.
    return pinFields(line, table || edit.renderedTarget || edit.target, edit.host ?? edit.element, edit.paletteShift ?? 0);
  }

  function pinEntryFor(line: number): LayoutEntry | undefined {
    let best: LayoutEntry | undefined;
    for (const entry of layout) {
      if (entry.sourceLine === line) return entry;
      if (entry.sourceLine <= line && (!best || entry.sourceLine >= best.sourceLine)) best = entry;
    }
    return best;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-069
  function restoreState(): void {
    const initial = context.initialState;
    let disclosuresOpened = false;
    if (initial?.openDisclosures?.length) {
      Array.from(document.querySelectorAll("details")).forEach((element, index) => {
        if (initial.openDisclosures!.includes(index) && !element.open) {
          element.open = true;
          disclosuresOpened = true;
        }
      });
    }
    if (disclosuresOpened) measure();
    const pin = context.initialPin;
    const pinEntry = pin && Number.isFinite(pin.line) && Number.isFinite(pin.viewportTop)
      ? pinEntryFor(pin.line)
      : undefined;
    const initialLine = context.initialAnchor ?? initial?.sourceLine;
    if (pinEntry && pin) {
      const target = Math.max(0, Math.min(maxScrollTop(), pinEntry.top - pin.viewportTop));
      programmaticScroll(target);
      state.anchor = { line: lineAtScroll(target) ?? pinEntry.sourceLine, owner: "preview" };
      state.pinApplied = true;
    } else if (initialLine !== undefined) {
      state.anchor = { line: initialLine, owner: "preview" };
    } else if (initial?.scrollTop !== undefined) {
      const line = lineAtScroll(Math.max(0, Math.min(maxScrollTop(), initial.scrollTop)));
      if (line !== undefined) state.anchor = { line, owner: "preview" };
    }
    if (!pinEntry) applyAnchor();
    if (initial?.focusedBlockId) {
      const focused = Array.from(document.querySelectorAll<HTMLElement>(MAPPINGS_SELECTOR))
        .find((element) => element.getAttribute("data-sphinx-preview-block") === initial.focusedBlockId);
      focused?.focus?.({ preventScroll: true });
    }
  }

  function measure(): void {
    layout = parseMappings();
    anchorMap = anchorPolicy.buildAnchorMap(layout.map((entry) => ({
      top: entry.top,
      height: entry.height,
      line: entry.sourceLine,
      endLine: entry.endLine ?? entry.sourceLine,
      ...(entry.lineTops ? { lineTops: entry.lineTops } : {}),
    })));
    rt.parts.stickyBand.refreshReadingOffset();
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-108
  function postScroll(): void {
    frame = undefined;
    rt.parts.stickyBand.updateStickyHeadings(true);
    rt.parts.tocColumn.track();
    const scrollTop = window.scrollY;
    if (expectedScroll && Date.now() <= expectedScroll.until
      && Math.abs(scrollTop - expectedScroll.top) <= 2) return;
    expectedScroll = undefined;
    // User scroll: the preview now owns the anchor.
    const line = lineAtScroll(scrollTop);
    if (line === undefined) return;
    state.anchor = { line, owner: "preview" };
    if (state.editAnchor?.element) {
      const viewportTop = state.editAnchor.element.getBoundingClientRect().top;
      if (Number.isFinite(viewportTop)) state.editAnchor.viewportTop = viewportTop;
    }
    const snapshot = stateSnapshot(line, true);
    const sourceLine = anchorPolicy.editorTopLine(line);
    const leadsEditor = rt.parts.anchorMode.anchored() && settings.scrollEditorWithPreview && sourceLine !== lastPostedLine;
    if (leadsEditor) lastPostedLine = sourceLine;
    (leadsEditor ? host.postMessage : rt.pageHost.postStateMessageThrottled)({
      type: leadsEditor ? "previewScroll" : "previewState",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      line: sourceLine,
      anchorLine: line,
      scrollTop: snapshot.scrollTop,
      ...(snapshot.focusedBlockId ? { focusedBlockId: snapshot.focusedBlockId } : {}),
      ...(snapshot.selectedText ? { selectedText: snapshot.selectedText } : {}),
      ...(snapshot.openDisclosures ? { openDisclosures: snapshot.openDisclosures } : {}),
      descriptionsCollapsed: state.descriptionsCollapsed,
    });
  }

  function scheduleScroll(): void {
    // A layout pass may handle the scroll first (stabilizeLayout); the frame then has nothing to do.
    if (frame === undefined) frame = window.requestAnimationFrame(() => { if (frame !== undefined) postScroll(); });
  }

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-032
  // Keeps short identifiers whole in a table that scrolls sideways and flags the overflow so the
  // stylesheet can draw edge shadows. Attributes are written only when the value changes, so the
  // ResizeObserver never loops.
  function markWideTables(): void {
    document.querySelectorAll("#sphinx-myst-preview-content table").forEach((table) => {
      if (table.closest("[data-okf-properties]")) return;
      table.querySelectorAll("th, td").forEach((cell) => {
        if (cell.getAttribute("data-sphinx-short-cell") !== null) return;
        if (/^\S{1,24}$/u.test((cell.textContent ?? "").trim())) {
          cell.setAttribute("data-sphinx-short-cell", "true");
        }
      });
      const overflowing = table.scrollWidth > table.clientWidth + 1;
      if (overflowing !== (table.getAttribute("data-sphinx-table-overflow") === "true")) {
        if (overflowing) table.setAttribute("data-sphinx-table-overflow", "true");
        else table.removeAttribute("data-sphinx-table-overflow");
      }
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-023
  function stabilizeLayout(): void {
    window.requestAnimationFrame(() => {
      if (frame !== undefined) {
        const changed = layout.some((entry) => {
          const rectangle = entry.element.getBoundingClientRect();
          return Math.abs(rectangle.top + window.scrollY - entry.top) > 0.5
            || Math.abs(rectangle.height - entry.height) > 0.5;
        });
        if (changed) frame = undefined;
        else postScroll();
      }
      state.activeBlockEdit?.resizeTextarea?.();
      state.activeFrontmatterEdit?.resizeTextarea?.();
      markWideTables();
      rt.parts.widthMode.update();
      measure();
      applyAnchor();
      rt.parts.stickyBand.updateStickyHeadings();
      rt.parts.tocColumn.remeasure();
      rt.parts.incomingChanges.layout();
    });
  }

  // Zoom changes layout only: keep the source line at the reading line across it.
  function keepReadingLine(): void {
    if (!state.anchor) {
      const line = lineAtScroll(window.scrollY);
      if (line !== undefined) state.anchor = { line, owner: "preview" };
    }
    stabilizeLayout();
  }

  // Scrolls to a document position and takes it as the new anchor (navigation, TOC entries).
  function revealAt(targetTop: number): void {
    programmaticScroll(targetTop);
    const line = lineAtScroll(targetTop);
    if (line === undefined) return;
    state.anchor = { line, owner: "preview" };
    const sourceLine = anchorPolicy.editorTopLine(line);
    if (rt.parts.anchorMode.anchored() && settings.scrollEditorWithPreview && sourceLine !== lastPostedLine) {
      lastPostedLine = sourceLine;
      host.postMessage({
        type: "previewScroll",
        documentId: context.documentId,
        revision: context.revision,
        requestId: context.requestId,
        line: sourceLine,
        anchorLine: line,
        scrollTop: targetTop,
      });
    }
  }

  // Puts an element at the reading line, below the sticky heading band.
  function revealElement(target: Element): void {
    const rectangle = target.getBoundingClientRect?.();
    if (!rectangle) return;
    revealAt(anchorPolicy.scrollTopForY(rectangle.top + window.scrollY, readingOffset(), maxScrollTop()));
  }

  return {
    stateSnapshot,
    lineAtScroll,
    maxScrollTop,
    programmaticScroll,
    applyAnchor,
    beginEditAnchor,
    anchorField,
    frontmatterPinFields,
    blockPinFields,
    restoreState,
    measure,
    stabilizeLayout,
    markWideTables,
    keepReadingLine,
    revealElement,
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-097
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-100
    followSourceScroll(message) {
      markSourceLine(Number(message.selectionLine ?? message.line));
      if (!settings.scrollPreviewWithEditor && message.reveal !== true) return;
      const line = Number(message.line);
      if (!Number.isFinite(line) || line < 1) return;
      lastPostedLine = anchorPolicy.editorTopLine(line);
      // The editor leads: its first visible line is the anchor.
      state.anchor = { line, owner: "editor" };
      const sequence = ++sourceScrollSequence;
      window.requestAnimationFrame(() => {
        if (sequence !== sourceScrollSequence) return;
        if (state.editAnchor?.element) {
          measure();
          const target = scrollAtLine(line);
          if (target !== undefined) {
            programmaticScroll(target);
            state.editAnchor.viewportTop = state.editAnchor.element.getBoundingClientRect().top;
          }
          return;
        }
        applyAnchor();
      });
    },
    // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-117
    navigateToAnchor(message) {
      const value = typeof message.value === "string" ? message.value : "";
      const decodeFragment = (fragment: string): string | undefined => {
        let decoded = fragment;
        try {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const next = decodeURIComponent(decoded);
            if (next === decoded) return decoded;
            decoded = next;
          }
        } catch {
          return undefined;
        }
        return /%[\da-f]{2}/iu.test(decoded) ? undefined : decoded;
      };
      const fragmentSourceLine = Number(message.sourceLine ?? (message as { line?: unknown }).line);
      const mappedEntry = Number.isInteger(fragmentSourceLine) && fragmentSourceLine > 0
        ? layout.find((entry) => fragmentSourceLine >= entry.sourceLine
          && fragmentSourceLine <= (entry.endLine ?? entry.sourceLine))
        : undefined;
      const mappedTarget = mappedEntry?.element;
      const decodedValue = value.startsWith("#") ? decodeFragment(value.slice(1)) : undefined;
      if (!decodedValue && !mappedTarget) return;
      const target = mappedTarget
        ?? (decodedValue ? document.getElementById?.(decodedValue) : undefined)
        ?? (decodedValue?.startsWith("^")
          ? document.getElementById?.(decodedValue.slice(1))
          : undefined);
      if (!target) return;
      const rectangle = target.getBoundingClientRect?.();
      if (!rectangle) return;
      const mappedScrollTop = mappedEntry && Number.isInteger(fragmentSourceLine)
        ? anchorPolicy.scrollTopForLine(anchorMap, fragmentSourceLine, readingOffset(), maxScrollTop())
        : undefined;
      const targetTop = mappedScrollTop ?? anchorPolicy.scrollTopForY(
        rectangle.top + window.scrollY,
        readingOffset(),
        maxScrollTop(),
      );
      revealAt(targetTop);
    },
    bindWindow() {
      window.addEventListener("scroll", scheduleScroll, { passive: true });
      window.addEventListener("resize", stabilizeLayout, { passive: true });
      window.visualViewport?.addEventListener("resize", stabilizeLayout, { passive: true });
    },
    observeContent() {
      if (typeof ResizeObserver !== "undefined") {
        const previewContent = document.getElementById?.("sphinx-myst-preview-content");
        if (previewContent) new ResizeObserver(stabilizeLayout).observe(previewContent);
      }
    },
  };
}
