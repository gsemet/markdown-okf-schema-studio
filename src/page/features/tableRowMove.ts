/**
 * Moves the body rows of a pipe table or a MyST list-table in edit mode. Each body row shows the
 * handle of the frontmatter list editor just left of the table, outside it and centred on its row;
 * dragging it onto another row, or Alt+Up and Alt+Down on the focused handle, moves the row. The
 * handles live in a layer of their own over the page (a table scrolls sideways and would clip a
 * handle placed inside it), placed from the rectangles of the rows; a table that leaves no room on
 * its left is pushed right. The page asks the host for the table source, moves the row on the
 * source and saves the whole table as one edit (one undo step), without opening a cell editor.
 */

import type { PreviewEditSourceMessage } from "../../core/protocol/hostToPage";
import type { PageRuntime, TableRowMove } from "./pageRuntime";

/** How long a move waits for the host source before the handle is usable again. */
const MOVE_TIMEOUT_MS = 5000;

/** A move waiting for the source of its table. */
interface PendingRowMove {
  editId: string;
  line: number;
  endLine: number;
  from: number;
  to: number;
  listTable: boolean;
  timer: number;
}

/** The row moves of a page. */
export function installTableRowMove(rt: PageRuntime): TableRowMove {
  const { document, window, context, host, state } = rt;
  // The handle of each body row, with the row and the table it moves.
  const entries: Array<{ handle: HTMLElement; row: HTMLTableRowElement; table: HTMLTableElement }> = [];
  let layer: HTMLElement | undefined;
  let positionFrame = false;
  let observing = false;
  let pending: PendingRowMove | undefined;
  let draggedRow: HTMLTableRowElement | undefined;
  let dropRow: HTMLTableRowElement | undefined;
  let dropBefore = false;
  // After a move the page renders anew: the handle of the moved row takes the focus back, so the
  // keyboard move can be repeated.
  // The save is posted: the rows on the page are stale until the render of the edit arrives.
  let settleTimer: number | undefined;
  let focusAfterRender: { line: number; row: number } | undefined;

  // The table is a {list-table}: inside a figure, its cells hold paragraphs.
  function isListTable(table: HTMLTableElement, headerCount: number): boolean {
    if (table.parentElement?.tagName !== "FIGURE") return false;
    // The first child of the cell that is not a row handle.
    const content = Array.from(table.rows?.[headerCount]?.cells?.[0]?.children ?? [])
      .find((child) => child.getAttribute("data-okf-row-handle") === null);
    return content?.tagName === "P";
  }

  // The rows that never move: the header rows of the rendered table (one for a pipe table).
  function headerCount(table: HTMLTableElement): number {
    const head = table.tHead?.rows?.length;
    return typeof head === "number" && head > 0 ? head : 1;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-002
  // A pipe table or a {list-table} that is a mapped block of its own, outside an include and the
  // properties table, with at least two body rows. An HTML table and a captioned {table} are not
  // offered.
  function movable(table: HTMLTableElement): boolean {
    if (table.getAttribute("data-sphinx-source-line") === null) return false;
    if (table.closest("[data-okf-properties]") || rt.blocks.isIncludedBlock(table)) return false;
    const rows = table.rows;
    const header = headerCount(table);
    if (!rows || rows.length < header + 2) return false;
    const listTable = isListTable(table, header);
    if (table.parentElement?.tagName === "FIGURE") return listTable;
    return !Array.from(rows[header]?.cells?.[0]?.children ?? []).some((child) => child.tagName === "P");
  }

  function bodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
    return Array.from(table.rows).slice(headerCount(table));
  }

  function clearDropIndicator(): void {
    dropRow?.removeAttribute("data-okf-row-drop");
    dropRow = undefined;
  }

  function finishDrag(): void {
    draggedRow?.removeAttribute("data-okf-row-dragging");
    draggedRow = undefined;
    clearDropIndicator();
  }

  function busy(): boolean {
    return !state.editMode || Boolean(state.activeBlockEdit) || Boolean(state.activeFrontmatterEdit)
      || pending !== undefined || settleTimer !== undefined;
  }

  function postEditClosed(editId: string): void {
    rt.blockEditor.postEditClosed(editId);
  }

  function endPending(): void {
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pending = undefined;
  }

  // Asks the host for the source of the table; the move happens when it arrives.
  function requestMove(table: HTMLTableElement, from: number, to: number): boolean {
    const header = headerCount(table);
    if (from < header || to < header || to >= table.rows.length) return false;
    if (busy() || from === to) return false;
    const { line, endLine } = rt.blocks.blockRange(table);
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(endLine) || endLine < line) return false;
    const editId = context.requestId + "-" + (++state.editSequence);
    pending = {
      editId, line, endLine, from, to, listTable: isListTable(table, header),
      timer: window.setTimeout(() => {
        if (pending?.editId === editId) {
          pending = undefined;
          postEditClosed(editId);
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

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-002
  function receiveSource(message: PreviewEditSourceMessage): boolean {
    const move = pending;
    if (!move || message.editId !== move.editId) return false;
    endPending();
    if (typeof message.error === "string" || typeof message.originalText !== "string") {
      postEditClosed(move.editId);
      return true;
    }
    const tools = rt.tools.tableTools;
    let editedText: string | undefined;
    if (move.listTable) {
      editedText = tools.moveListTableRow(message.originalText, move.from, move.to);
    } else {
      const model = tools.parse(message.originalText);
      editedText = model && tools.moveRow(model, move.from, move.to) !== undefined
        ? tools.serialize(model) : undefined;
    }
    if (editedText === undefined || editedText === message.originalText) {
      postEditClosed(move.editId);
      return true;
    }
    focusAfterRender = { line: move.line, row: move.to };
    settleTimer = window.setTimeout(() => {
      settleTimer = undefined;
    }, MOVE_TIMEOUT_MS);
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
    postEditClosed(move.editId);
    return true;
  }

  function updateDropIndicator(event: DragEvent, table: HTMLTableElement, targetRow: HTMLTableRowElement): void {
    if (!draggedRow) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    clearDropIndicator();
    if (targetRow === draggedRow || targetRow.rowIndex < headerCount(table)) return;
    const rectangle = targetRow.getBoundingClientRect();
    dropBefore = typeof event.clientY === "number"
      ? event.clientY < rectangle.top + rectangle.height / 2
      : draggedRow.rowIndex > targetRow.rowIndex;
    dropRow = targetRow;
    dropRow.setAttribute("data-okf-row-drop", dropBefore ? "before" : "after");
  }

  function dropOnRow(event: DragEvent, table: HTMLTableElement, targetRow: HTMLTableRowElement): void {
    if (!draggedRow) return;
    updateDropIndicator(event, table, targetRow);
    const moved = draggedRow;
    const target = dropRow;
    const before = dropBefore;
    finishDrag();
    if (!target) return;
    const from = moved.rowIndex;
    // The index the row has once it left its place and sits before or after the target.
    let to = target.rowIndex + (before ? 0 : 1);
    if (from < to) to -= 1;
    requestMove(table, from, to);
  }

  function moveByKey(table: HTMLTableElement, row: HTMLTableRowElement, direction: "up" | "down"): void {
    const from = row.rowIndex;
    const to = from + (direction === "up" ? -1 : 1);
    if (to < headerCount(table) || to >= table.rows.length) return;
    requestMove(table, from, to);
  }

  function addHandle(table: HTMLTableElement, row: HTMLTableRowElement, parent: HTMLElement): void {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "okf-list-editor-handle okf-table-row-handle";
    handle.setAttribute("data-okf-row-handle", "true");
    handle.setAttribute("contenteditable", "false");
    handle.setAttribute("aria-label", "Move table row");
    handle.setAttribute("title", "Drag to move row (Alt+Up, Alt+Down)");
    handle.setAttribute("draggable", "true");
    handle.setAttribute("data-okf-row", String(row.rowIndex));
    handle.setAttribute("data-okf-row-table", table.getAttribute("data-sphinx-source-line") ?? "");
    handle.addEventListener("keydown", (event) => {
      const direction = rt.blockMoves.moveChordDirection(event, false);
      if (!direction) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      if (event.repeat && pending) return;
      moveByKey(table, row, direction);
    });
    handle.addEventListener("dragstart", (event) => {
      if (busy()) {
        event.preventDefault?.();
        return;
      }
      draggedRow = row;
      row.setAttribute("data-okf-row-dragging", "true");
      event.dataTransfer?.setData?.("text/plain", "table-row");
      event.dataTransfer?.setDragImage?.(row, 12, 12);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    handle.addEventListener("dragend", finishDrag);
    row.addEventListener("dragover", (event) => updateDropIndicator(event, table, row));
    row.addEventListener("drop", (event) => dropOnRow(event, table, row));
    parent.appendChild(handle);
    entries.push({ handle, row, table });
  }

  // The room a handle needs left of its table: its width and a gap.
  const HANDLE_SPACE = 32;

  // Puts every handle just left of its table, centred on its row. A table that leaves less room
  // than a handle needs is pushed right (an attribute the stylesheet reads), so the handle never
  // leaves the pane. Absolute page coordinates: the layer sits at the page origin.
  function position(): void {
    positionFrame = false;
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const tables = new Set(entries.map((entry) => entry.table));
    tables.forEach((table) => {
      if (table.getAttribute("data-okf-row-shift") !== null) table.removeAttribute("data-okf-row-shift");
      if (table.getBoundingClientRect().left < HANDLE_SPACE) table.setAttribute("data-okf-row-shift", "true");
    });
    entries.forEach(({ handle, row, table }) => {
      const tableBox = table.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      handle.style.setProperty("left", Math.round(tableBox.left + scrollX - 4) + "px");
      handle.style.setProperty("top", Math.round(rowBox.top + scrollY + rowBox.height / 2) + "px");
    });
  }

  function schedulePosition(): void {
    if (positionFrame || entries.length === 0) return;
    positionFrame = true;
    window.requestAnimationFrame(position);
  }

  // Rebuilds the handles of the page: none when edit mode is off.
  function refresh(): void {
    if (settleTimer !== undefined) {
      window.clearTimeout(settleTimer);
      settleTimer = undefined;
    }
    layer?.remove();
    layer = undefined;
    entries.length = 0;
    const content = document.getElementById?.("sphinx-myst-preview-content");
    document.querySelectorAll<HTMLTableElement>("#sphinx-myst-preview-content table").forEach((table) => {
      if (state.editMode && movable(table)) {
        if (!layer) {
          layer = document.createElement("div");
          layer.setAttribute("data-okf-row-handle-layer", "true");
          document.body.appendChild(layer);
        }
        table.setAttribute("data-okf-row-handles", "true");
        bodyRows(table).forEach((row) => addHandle(table, row, layer!));
        return;
      }
      if (table.getAttribute("data-okf-row-handles") !== null) table.removeAttribute("data-okf-row-handles");
      if (table.getAttribute("data-okf-row-shift") !== null) table.removeAttribute("data-okf-row-shift");
    });
    if (entries.length > 0) {
      position();
      if (!observing && content && typeof ResizeObserver !== "undefined") {
        observing = true;
        new ResizeObserver(schedulePosition).observe(content);
        window.addEventListener("resize", schedulePosition, { passive: true });
      }
    }
    if (focusAfterRender && state.editMode) {
      const { line, row } = focusAfterRender;
      focusAfterRender = undefined;
      entries.find((entry) => Number(entry.table.getAttribute("data-sphinx-source-line")) === line
        && entry.row.rowIndex === row)?.handle.focus?.({ preventScroll: true });
    }
  }

  return { refresh, receiveSource };
}
