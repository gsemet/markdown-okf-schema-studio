/**
 * Moves the items of a list among their sibling items in edit mode, the way the body rows of a
 * table move (`tableRowMove.ts`). Each item of a list of two items or more shows the handle of the
 * frontmatter list editor just left of its list, on the item's first line; a list inside GitHub
 * alerts, quotes or MyST admonitions has its handles left of the outermost container's box. Dragging
 * a handle onto a sibling item (anywhere over the list or its handle strip: the marker shows on the
 * nearest gap and follows the pointer), or Alt+Up and Alt+Down on the focused handle, moves the item
 * with its sub-items and blocks. The handles live in a layer of their own over the page, placed from
 * the rectangles of the items; a block that leaves no room on its left is pushed right. The page
 * asks the host for the lines of the item's own list, moves the item on that text
 * (`modules/listItemMove.ts`) and saves the whole list as one edit (one undo step), without opening
 * an editor.
 */

import type { PreviewEditSourceMessage } from "../../core/protocol/hostToPage";
import { moveListItem } from "../modules/listItemMove";
import type { ListItemMove, PageRuntime } from "./pageRuntime";
import { editInFlight } from "./detachedSaveState";

/** How long a move waits for the host source before the handle is usable again. */
const MOVE_TIMEOUT_MS = 5000;

/** The lists of the content. */
const LIST_SELECTOR = "#sphinx-myst-preview-content ul, #sphinx-myst-preview-content ol";

/** The containers whose box the handles of a list inside them stay out of. */
const CONTAINER_SELECTOR = "[data-okf-github-alert], aside.admonition, details.admonition, blockquote";

/** The room a handle needs left of its list or container: its width and a gap. */
const HANDLE_SPACE = 32;

/** A move waiting for the source of its list. */
interface PendingMove {
  editId: string;
  line: number;
  endLine: number;
  count: number;
  from: number;
  to: number;
  timer: number;
}

/** The handle of one item, with what it moves and what it is placed from. */
interface Entry {
  handle: HTMLElement;
  item: HTMLElement;
  list: HTMLElement;
  index: number;
  /** The first source line of the list: it names the list across a render. */
  listLine: number;
  /** The element whose left edge the handle sits beside: the list, or its outermost container. */
  column: Element;
  /** The top block pushed right when it leaves no room: the outermost list or container. */
  block: Element;
}

/** The items of a list, in order: its `li` children. */
function itemsOf(list: Element | null | undefined): HTMLElement[] {
  return Array.from(list?.children ?? []).filter((child): child is HTMLElement => child.tagName === "LI");
}

/** The first text of an element with something other than spaces in it, in document order. */
function firstText(element: Node): Node | undefined {
  for (const child of Array.from(element.childNodes ?? [])) {
    if (child.nodeType === 3) {
      if ((child.textContent ?? "").trim() !== "") return child;
    } else if (child.nodeType === 1) {
      const found = firstText(child);
      if (found) return found;
    }
  }
  return undefined;
}

/** The list item moves of a page. */
export function installListItemMove(rt: PageRuntime): ListItemMove {
  const { document, window, context, host, state } = rt;
  const entries: Entry[] = [];
  // The blocks the last placement pushed right: the push goes when they have room again or edit
  // mode goes off.
  const shifted = new Set<Element>();
  let layer: HTMLElement | undefined;
  let positionFrame = false;
  let observing = false;
  let zoneBound = false;
  let pending: PendingMove | undefined;
  let dragged: { list: HTMLElement; column: Element; index: number; item: HTMLElement } | undefined;
  let dropTarget: HTMLElement | undefined;
  // The save is posted: the items on the page are stale until the render of the edit arrives.
  let settleTimer: number | undefined;
  // After a move the page renders anew: the handle of the moved item takes the focus back, so the
  // keyboard move can be repeated.
  let focusAfterRender: { line: number; index: number } | undefined;

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  // The column of the handles of `list` and the block pushed for them: inside alerts, quotes and
  // admonitions, the outermost container; the block is the outermost list or container around it.
  function frameOf(list: HTMLElement): { column: Element; block: Element } {
    const content = document.getElementById?.("sphinx-myst-preview-content");
    let column: Element | undefined;
    let block: Element = list;
    for (let at = list.parentElement; at && at !== content; at = at.parentElement) {
      if (at.tagName === "UL" || at.tagName === "OL") {
        block = at;
      } else if (at.closest?.(CONTAINER_SELECTOR) === at) {
        block = at;
        column = at;
      }
    }
    return { column: column ?? list, block };
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  // A mapped list of two items or more, outside an include and the properties table.
  function movableList(list: HTMLElement): { line: number; endLine: number } | undefined {
    if (itemsOf(list).length < 2) return undefined;
    if (list.closest?.("[data-okf-properties]") || rt.blocks.isIncludedBlock(list)) return undefined;
    const range = rt.blocks.listRange(list);
    if (!range || !Number.isSafeInteger(range.line) || !Number.isSafeInteger(range.endLine)
      || range.line < 1 || range.endLine < range.line) return undefined;
    return range;
  }

  function busy(): boolean {
    return !state.editMode || Boolean(state.activeFrontmatterEdit) || editInFlight(state)
      || pending !== undefined || settleTimer !== undefined;
  }

  function endPending(): void {
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pending = undefined;
  }

  function armSettle(): void {
    settleTimer = window.setTimeout(() => {
      settleTimer = undefined;
    }, MOVE_TIMEOUT_MS);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  // Asks the host for the lines of the list; the move happens when they arrive.
  function requestMove(list: HTMLElement, from: number, to: number): boolean {
    const count = itemsOf(list).length;
    if (from < 0 || to < 0 || from >= count || to >= count || from === to || busy()) return false;
    const range = movableList(list);
    if (!range) return false;
    const { line, endLine } = range;
    const editId = context.requestId + "-" + (++state.editSequence);
    pending = {
      editId, line, endLine, count, from, to,
      timer: window.setTimeout(() => {
        if (pending?.editId === editId) {
          pending = undefined;
          rt.blockEditor.postEditClosed(editId);
        }
      }, MOVE_TIMEOUT_MS),
    };
    host.postMessage({
      type: "previewEditOpen",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      line,
      endLine,
    });
    return true;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  function receiveSource(message: PreviewEditSourceMessage): boolean {
    const move = pending;
    if (!move || message.editId !== move.editId) return false;
    endPending();
    if (typeof message.error === "string" || typeof message.originalText !== "string") {
      rt.blockEditor.postEditClosed(move.editId);
      return true;
    }
    const editedText = moveListItem(message.originalText, move.count, move.from, move.to);
    if (editedText === undefined || editedText === message.originalText) {
      rt.blockEditor.postEditClosed(move.editId);
      return true;
    }
    focusAfterRender = { line: move.line, index: move.to };
    armSettle();
    host.postMessage({
      type: "previewEditSave",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId: move.editId,
      line: move.line,
      endLine: move.endLine,
      originalText: message.originalText,
      editedText,
      final: true,
      ...rt.scroll.anchorField(),
    });
    // The page holds no editor for this edit: page updates need not wait for it to close.
    rt.blockEditor.postEditClosed(move.editId);
    return true;
  }

  function clearDropIndicator(): void {
    dropTarget?.removeAttribute("data-okf-list-item-drop");
    dropTarget = undefined;
  }

  function finishDrag(): void {
    dragged?.item.removeAttribute("data-okf-list-item-dragging");
    dragged = undefined;
    clearDropIndicator();
  }

  // Shows the line before or after the sibling `index`: where the dragged item would land. None
  // where the item would stay in place.
  function showDrop(index: number, before: boolean): void {
    clearDropIndicator();
    if (!dragged) return;
    const from = dragged.index;
    if (index === from || (index === from - 1 && !before) || (index === from + 1 && before)) return;
    const target = itemsOf(dragged.list)[index];
    if (!target) return;
    dropTarget = target;
    target.setAttribute("data-okf-list-item-drop", before ? "before" : "after");
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  // The sibling of the dragged item that the pointer is over, anywhere over its list or the handle
  // strip at the list's height (from the handle column to the list): the drop zone of a handle.
  // Over a nested item, the sibling that holds it. The half of the sibling decides before or after.
  // Undefined outside the zone or when the event carries no pointer position.
  function zoneTarget(event: DragEvent): { index: number; before: boolean } | undefined {
    if (!dragged || typeof event.clientX !== "number" || typeof event.clientY !== "number") return undefined;
    const box = dragged.list.getBoundingClientRect();
    const columnLeft = dragged.column === dragged.list ? box.left : dragged.column.getBoundingClientRect().left;
    const x = event.clientX;
    const y = event.clientY;
    const left = Math.min(box.left, columnLeft) - HANDLE_SPACE;
    if (x < left || x > box.left + (box.width ?? 0) || y < box.top || y > box.top + (box.height ?? 0)) return undefined;
    const boxes = itemsOf(dragged.list).map((item) => item.getBoundingClientRect());
    // The last sibling that starts at or before the pointer.
    let found = -1;
    boxes.forEach((rectangle, order) => {
      if (rectangle.top <= y) found = order;
    });
    if (found < 0) return undefined;
    const rectangle = boxes[found]!;
    return { index: found, before: y < rectangle.top + rectangle.height / 2 };
  }

  function dragOverZone(event: DragEvent): void {
    if (!dragged) return;
    const target = zoneTarget(event);
    if (!target) {
      clearDropIndicator();
      return;
    }
    event.preventDefault?.();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    showDrop(target.index, target.before);
  }

  // Ends the drag and, when a marker shows, moves the dragged item to it.
  function dropInZone(event: DragEvent): void {
    if (!dragged) return;
    const target = zoneTarget(event);
    const moved = dragged;
    if (target) {
      event.preventDefault?.();
      showDrop(target.index, target.before);
    }
    const shown = target && dropTarget ? target : undefined;
    finishDrag();
    if (!shown) return;
    // The index the item has once it left its place and sits before or after the target.
    let to = shown.index + (shown.before ? 0 : 1);
    if (moved.index < to) to -= 1;
    requestMove(moved.list, moved.index, to);
  }

  function startDrag(event: DragEvent, entry: Entry): void {
    const index = itemsOf(entry.item.parentElement).indexOf(entry.item);
    if (busy() || index < 0) {
      event.preventDefault?.();
      return;
    }
    dragged = { list: entry.list, column: entry.column, index, item: entry.item };
    entry.item.setAttribute("data-okf-list-item-dragging", "true");
    event.dataTransfer?.setData?.("text/plain", "list-item");
    event.dataTransfer?.setDragImage?.(entry.item, 12, 12);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function addHandle(entry: Omit<Entry, "handle">, parent: HTMLElement): void {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "okf-list-editor-handle okf-list-item-handle";
    handle.setAttribute("data-okf-list-item-handle", "true");
    handle.setAttribute("contenteditable", "false");
    handle.setAttribute("aria-label", "Move list item");
    handle.setAttribute("title", "Drag to move item (Alt+Up, Alt+Down)");
    handle.setAttribute("draggable", "true");
    handle.setAttribute("data-okf-list-item-line", entry.item.getAttribute("data-sphinx-source-line") ?? "");
    const full: Entry = { ...entry, handle };
    handle.addEventListener("keydown", (event) => {
      const direction = rt.blockMoves.moveChordDirection(event, false);
      if (direction === undefined) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      if (event.repeat && pending) return;
      // The index of the item now: a render can have changed its place since the handle was made.
      const from = itemsOf(full.item.parentElement).indexOf(full.item);
      if (from < 0) return;
      requestMove(full.list, from, from + (direction === "up" ? -1 : 1));
    });
    handle.addEventListener("dragstart", (event) => startDrag(event, full));
    handle.addEventListener("dragend", finishDrag);
    parent.appendChild(handle);
    entries.push(full);
  }

  // The middle of the item's first line, in viewport coordinates: the first line box of its first
  // text, else its top plus half its line height.
  function firstLineMiddle(item: HTMLElement, box: DOMRect): number {
    const text = firstText(item);
    if (text && typeof document.createRange === "function") {
      const range = document.createRange();
      range.selectNodeContents(text);
      const line = range.getClientRects?.()[0];
      if (line && line.height > 0) return line.top + line.height / 2;
    }
    const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(item) : undefined;
    let lineHeight = Number.parseFloat(style?.lineHeight ?? "");
    if (!Number.isFinite(lineHeight)) {
      const fontSize = Number.parseFloat(style?.fontSize ?? "");
      lineHeight = Number.isFinite(fontSize) ? fontSize * 1.2 : 20;
    }
    return box.top + Math.min(box.height, lineHeight) / 2;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  // Puts every handle just left of its column (its list, or the outermost container), on its item's
  // first line. A block that leaves less room than a handle needs is pushed right (an attribute the
  // stylesheet reads), so the handle never leaves the pane. A hidden item (its list or container is
  // edited as raw Markdown) shows no handle. Absolute page coordinates: the layer sits at the page
  // origin. Every box is read before any handle is written (issue 420).
  function position(): void {
    positionFrame = false;
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const blocks = new Set(entries.map((entry) => entry.block));
    shifted.forEach((block) => {
      if (block.getAttribute("data-okf-list-shift") !== null) block.removeAttribute("data-okf-list-shift");
    });
    shifted.clear();
    const pushed = Array.from(blocks).filter((block) => block.getBoundingClientRect().left < HANDLE_SPACE);
    pushed.forEach((block) => {
      block.setAttribute("data-okf-list-shift", "true");
      shifted.add(block);
    });
    const columnBoxes = new Map<Element, DOMRect>();
    const boxes = entries.map(({ item, column }) => {
      let columnBox = columnBoxes.get(column);
      if (!columnBox) {
        columnBox = column.getBoundingClientRect();
        columnBoxes.set(column, columnBox);
      }
      const box = item.getBoundingClientRect();
      return { columnBox, box, middle: box.height > 0 ? firstLineMiddle(item, box) : 0 };
    });
    entries.forEach(({ handle }, at) => {
      const { columnBox, box, middle } = boxes[at]!;
      const hidden = box.height === 0;
      handle.style.setProperty("display", hidden ? "none" : "");
      if (hidden) return;
      handle.style.setProperty("left", Math.round(columnBox.left + scrollX - 4) + "px");
      handle.style.setProperty("top", Math.round(middle + scrollY) + "px");
    });
  }

  function schedulePosition(): void {
    if (positionFrame || entries.length === 0) return;
    positionFrame = true;
    window.requestAnimationFrame(position);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  // Rebuilds the handles of the page: none when edit mode is off.
  function refresh(): void {
    if (settleTimer !== undefined) {
      window.clearTimeout(settleTimer);
      settleTimer = undefined;
    }
    layer?.remove();
    layer = undefined;
    entries.length = 0;
    shifted.forEach((block) => block.removeAttribute("data-okf-list-shift"));
    shifted.clear();
    if (state.editMode) {
      document.querySelectorAll<HTMLElement>(LIST_SELECTOR).forEach((list) => {
        const range = movableList(list);
        if (!range) return;
        if (!layer) {
          layer = document.createElement("div");
          layer.setAttribute("data-okf-list-handle-layer", "true");
          document.body.appendChild(layer);
        }
        const { column, block } = frameOf(list);
        itemsOf(list).forEach((item, index) =>
          addHandle({ item, list, index, listLine: range.line, column, block }, layer!));
      });
    }
    if (entries.length > 0) {
      if (!zoneBound) {
        zoneBound = true;
        document.addEventListener("dragover", dragOverZone);
        document.addEventListener("drop", dropInZone);
      }
      // In the next frame, with the page's other layout work (issue 423).
      schedulePosition();
      const content = document.getElementById?.("sphinx-myst-preview-content");
      if (!observing && content && typeof ResizeObserver !== "undefined") {
        observing = true;
        new ResizeObserver(schedulePosition).observe(content);
        window.addEventListener("resize", schedulePosition, { passive: true });
      }
    }
    if (focusAfterRender && state.editMode) {
      const { line, index } = focusAfterRender;
      focusAfterRender = undefined;
      entries.find((entry) => entry.listLine === line && entry.index === index)?.handle.focus?.({ preventScroll: true });
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
  // The width mode moves the lists after the handles were placed: they follow them again, at once.
  function reposition(): void {
    if (entries.length > 0) position();
  }

  function itemOf(node: Element): Element | undefined {
    const handle = node.closest?.("[data-okf-list-item-handle]");
    return handle ? entries.find((entry) => entry.handle === handle)?.item : undefined;
  }

  return { refresh, reposition, receiveSource, itemOf };
}
