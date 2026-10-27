/**
 * Moves the body rows and the columns of a pipe table or a MyST list-table in edit mode. Each body
 * row shows the handle of the frontmatter list editor just left of the table, outside it and
 * centred on its row; each column shows the same mark, turned, just above the table, outside its
 * cells and centred on its column. Dragging a handle onto another row or column (anywhere over the
 * table or its handle strip: the marker shows on the nearest gap and follows the pointer), or Alt+Up
 * and Alt+Down (Alt+Left and Alt+Right for a column) on the focused handle, moves it. The handles live
 * in a layer of their own over the page (a table scrolls sideways and would clip a handle placed
 * inside it), placed from the rectangles of the rows and header cells; a table that leaves no room
 * on its left is pushed right. The page asks the host for the table source, moves the row or the
 * column on the source and saves the whole table as one edit (one undo step), without opening a
 * cell editor. While a cell editor of the same pipe table is open, the move is made on its model
 * and saved with it, so a handle never refuses a drag.
 */

import type { PreviewEditSourceMessage } from "../../core/protocol/hostToPage";
import type { BlockEdit, PageRuntime, TableRowMove } from "./pageRuntime";

/** How long a move waits for the host source before the handle is usable again. */
const MOVE_TIMEOUT_MS = 5000;

/** What a handle moves: a body row of the table, or a column of it. */
type Axis = "row" | "column";

/** A move waiting for the source of its table. */
interface PendingMove {
  editId: string;
  line: number;
  endLine: number;
  axis: Axis;
  from: number;
  to: number;
  listTable: boolean;
  timer: number;
}

/** The row moves of a page. */
export function installTableRowMove(rt: PageRuntime): TableRowMove {
  const { document, window, context, host, state } = rt;
  // The handle of each body row and of each column, with the table it moves and the row or header
  // cell it is centred on.
  const entries: Array<{
    handle: HTMLElement; axis: Axis; index: number; element: HTMLElement; table: HTMLTableElement;
  }> = [];
  // The rows and cells that already carry the drag listeners: a table the page kept in place across
  // a render must not get them twice.
  const bound = new WeakSet<Element>();
  let layer: HTMLElement | undefined;
  let positionFrame = false;
  let observing = false;
  let zoneBound = false;
  let pending: PendingMove | undefined;
  let dragged: { axis: Axis; index: number; table: HTMLTableElement } | undefined;
  let dropTarget: { axis: Axis; index: number; table: HTMLTableElement } | undefined;
  let dropBefore = false;
  // After a move the page renders anew: the handle of the moved row or column takes the focus
  // back, so the keyboard move can be repeated.
  // The save is posted: the rows on the page are stale until the render of the edit arrives.
  let settleTimer: number | undefined;
  let focusAfterRender: { line: number; axis: Axis; index: number } | undefined;

  const cellOf = (row: Element | undefined, column: number): HTMLTableCellElement | undefined =>
    (row as HTMLTableRowElement | undefined)?.cells?.[column];

  // The table is a {list-table}: inside a figure, its cells hold paragraphs.
  function isListTable(table: HTMLTableElement, headerCount: number): boolean {
    if (table.parentElement?.tagName !== "FIGURE") return false;
    // The first child of the cell that is not a row handle.
    const content = Array.from(cellOf(table.rows?.[headerCount] ?? table.rows?.[0], 0)?.children ?? [])
      .find((child) => child.getAttribute("data-okf-row-handle") === null);
    return content?.tagName === "P";
  }

  // The rows that never move: the header rows of the rendered table (one for a pipe table).
  function headerCount(table: HTMLTableElement): number {
    const head = table.tHead?.rows?.length;
    return typeof head === "number" && head > 0 ? head : 1;
  }

  // A pipe table or a {list-table} that is a mapped block of its own, outside an include and the
  // properties table. An HTML table and a captioned {table} are not offered.
  function mappedTable(table: HTMLTableElement): boolean {
    if (table.getAttribute("data-sphinx-source-line") === null) return false;
    if (table.closest("[data-okf-properties]") || rt.blocks.isIncludedBlock(table)) return false;
    const rows = table.rows;
    if (!rows || rows.length < 1) return false;
    const header = headerCount(table);
    if (table.parentElement?.tagName === "FIGURE") return isListTable(table, header);
    return !Array.from(cellOf(rows[header], 0)?.children ?? []).some((child) => child.tagName === "P");
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-002
  // With at least two body rows.
  function movableRows(table: HTMLTableElement): boolean {
    return mappedTable(table) && table.rows.length >= headerCount(table) + 2;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-007
  // With at least two columns.
  function movableColumns(table: HTMLTableElement): boolean {
    return mappedTable(table) && (table.rows[0]?.cells?.length ?? 0) >= 2;
  }

  function bodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
    return Array.from(table.rows).slice(headerCount(table));
  }

  function columnCells(table: HTMLTableElement, column: number): HTMLTableCellElement[] {
    return Array.from(table.rows).map((row) => cellOf(row, column)).filter((cell) => cell !== undefined);
  }

  const dropAttribute = (axis: Axis): string => (axis === "row" ? "data-okf-row-drop" : "data-okf-col-drop");
  const dragAttribute = (axis: Axis): string => (axis === "row" ? "data-okf-row-dragging" : "data-okf-col-dragging");

  // The elements that show a drag of `axis` at `index`: the row, or the cells of the column.
  function dragElements(axis: Axis, table: HTMLTableElement, index: number): Element[] {
    if (axis === "row") return table.rows[index] ? [table.rows[index]!] : [];
    return columnCells(table, index);
  }

  function clearDropIndicator(): void {
    if (dropTarget) {
      dragElements(dropTarget.axis, dropTarget.table, dropTarget.index)
        .forEach((element) => element.removeAttribute(dropAttribute(dropTarget!.axis)));
    }
    dropTarget = undefined;
  }

  function finishDrag(): void {
    if (dragged) {
      dragElements(dragged.axis, dragged.table, dragged.index)
        .forEach((element) => element.removeAttribute(dragAttribute(dragged!.axis)));
    }
    dragged = undefined;
    clearDropIndicator();
  }

  // The open cell editor of this table, when it has its table model: a move then edits that model
  // and saves it with the editor's own text, instead of asking the host for the source.
  function cellEditOf(table: HTMLTableElement): BlockEdit | undefined {
    const edit = state.activeBlockEdit;
    if (!edit || edit.finishing || !edit.tableModel || !edit.selectedCell || typeof edit.originalText !== "string") {
      return undefined;
    }
    return edit.selectedCell.closest?.("table") === table ? edit : undefined;
  }

  function busy(table?: HTMLTableElement): boolean {
    if (!state.editMode || state.activeFrontmatterEdit || pending !== undefined || settleTimer !== undefined) {
      return true;
    }
    return Boolean(state.activeBlockEdit) && !(table && cellEditOf(table));
  }

  function postEditClosed(editId: string): void {
    rt.blockEditor.postEditClosed(editId);
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

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-002
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-007
  // The move inside the open cell editor: its model is moved and the whole editor is saved (final).
  function moveInCellEditor(edit: BlockEdit, axis: Axis, from: number, to: number): boolean {
    const tools = rt.tools.tableTools;
    const model = edit.tableModel!;
    // The text typed in the cell is part of the table that moves.
    if (edit.tableInput && edit.tableRowIndex !== undefined && edit.tableColumnIndex !== undefined) {
      const modelRow = model.rows[edit.tableRowIndex === 0 ? 0 : edit.tableRowIndex + 1];
      if (modelRow) modelRow[edit.tableColumnIndex] = edit.tableInput.value;
    }
    edit.convertedText = undefined;
    const moved = axis === "row" ? tools.moveRow(model, from, to) : tools.moveColumn(model, from, to);
    if (moved === undefined) return false;
    focusAfterRender = { line: edit.line, axis, index: to };
    armSettle();
    rt.blockEditor.postBlockEditSave(true);
    return true;
  }

  // Asks the host for the source of the table; the move happens when it arrives.
  function requestMove(table: HTMLTableElement, axis: Axis, from: number, to: number): boolean {
    const header = headerCount(table);
    const limit = axis === "row" ? table.rows.length : (table.rows[0]?.cells?.length ?? 0);
    if (from < (axis === "row" ? header : 0) || to < (axis === "row" ? header : 0) || to >= limit || from >= limit) {
      return false;
    }
    if (busy(table) || from === to) return false;
    const cellEdit = cellEditOf(table);
    if (cellEdit) return moveInCellEditor(cellEdit, axis, from, to);
    const { line, endLine } = rt.blocks.blockRange(table);
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(endLine) || endLine < line) return false;
    const editId = context.requestId + "-" + (++state.editSequence);
    pending = {
      editId, line, endLine, axis, from, to, listTable: isListTable(table, header),
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

  // The text of the table once the move is done, or undefined when the source is refused.
  function movedText(move: PendingMove, original: string): string | undefined {
    const tools = rt.tools.tableTools;
    if (move.listTable) {
      return move.axis === "row"
        ? tools.moveListTableRow(original, move.from, move.to)
        : tools.moveListTableColumn(original, move.from, move.to);
    }
    const model = tools.parse(original);
    if (!model) return undefined;
    const moved = move.axis === "row"
      ? tools.moveRow(model, move.from, move.to)
      : tools.moveColumn(model, move.from, move.to);
    return moved === undefined ? undefined : tools.serialize(model);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-002
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-007
  function receiveSource(message: PreviewEditSourceMessage): boolean {
    const move = pending;
    if (!move || message.editId !== move.editId) return false;
    endPending();
    if (typeof message.error === "string" || typeof message.originalText !== "string") {
      postEditClosed(move.editId);
      return true;
    }
    const editedText = movedText(move, message.originalText);
    if (editedText === undefined || editedText === message.originalText) {
      postEditClosed(move.editId);
      return true;
    }
    focusAfterRender = { line: move.line, axis: move.axis, index: move.to };
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
    postEditClosed(move.editId);
    return true;
  }

  // Shows the line before or after the row or column `index`: where the dragged one would land.
  function showDrop(table: HTMLTableElement, axis: Axis, index: number, before: boolean): void {
    clearDropIndicator();
    if (!dragged || index === dragged.index || (axis === "row" && index < headerCount(table))) return;
    if (dragElements(axis, table, index).length === 0) return;
    dropBefore = before;
    dropTarget = { axis, index, table };
    dragElements(axis, table, index).forEach((element) =>
      element.setAttribute(dropAttribute(axis), before ? "before" : "after"));
  }

  // Marks where the dragged row or column would land: a line before or after the target.
  function updateDropIndicator(event: DragEvent, table: HTMLTableElement, axis: Axis, index: number): void {
    if (!dragged || dragged.axis !== axis || dragged.table !== table) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const target = dragElements(axis, table, index)[0];
    if (!target) {
      clearDropIndicator();
      return;
    }
    const rectangle = target.getBoundingClientRect();
    let before: boolean;
    if (axis === "row") {
      before = typeof event.clientY === "number"
        ? event.clientY < rectangle.top + rectangle.height / 2
        : dragged.index > index;
    } else {
      before = typeof event.clientX === "number"
        ? event.clientX < (rectangle.left ?? 0) + (rectangle.width ?? 0) / 2
        : dragged.index > index;
    }
    showDrop(table, axis, index, before);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-002
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-007
  // The row or column of the dragged table that the pointer is nearest, anywhere over the table or
  // its handle strip (left of the table for a row, above it for a column): the drop zone of a
  // handle. A row is read on the vertical axis, a column on the horizontal one; the half of the
  // row or column decides before or after. Undefined outside the zone, over the header rows (a row
  // never lands in them) or when the event carries no pointer position.
  function zoneTarget(event: DragEvent): { index: number; before: boolean } | undefined {
    if (!dragged || typeof event.clientX !== "number" || typeof event.clientY !== "number") return undefined;
    const { axis, table } = dragged;
    const box = table.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    const within = axis === "row"
      ? x >= box.left - HANDLE_SPACE && x <= box.left + (box.width ?? 0) && y >= box.top && y <= box.top + (box.height ?? 0)
      : x >= box.left && x <= box.left + (box.width ?? 0) && y >= box.top - HANDLE_SPACE && y <= box.top + (box.height ?? 0);
    if (!within) return undefined;
    const elements = axis === "row" ? bodyRows(table) : Array.from(table.rows[0]?.cells ?? []);
    const start = (rectangle: DOMRect): number => (axis === "row" ? rectangle.top : rectangle.left);
    const size = (rectangle: DOMRect): number => (axis === "row" ? rectangle.height : rectangle.width) ?? 0;
    const position = axis === "row" ? y : x;
    // The last row or cell that starts at or before the pointer; the first one when it is before all.
    let found = -1;
    elements.forEach((element, order) => {
      if (start(element.getBoundingClientRect()) <= position) found = order;
    });
    if (found < 0) {
      if (axis === "row") return undefined;
      found = 0;
    }
    const element = elements[found]!;
    const rectangle = element.getBoundingClientRect();
    const index = axis === "row" ? (element as HTMLTableRowElement).rowIndex : (element as HTMLTableCellElement).cellIndex;
    return { index, before: position < start(rectangle) + size(rectangle) / 2 };
  }

  // The drag over the page outside the rows and cells that handle it themselves: the marker follows
  // the pointer over the handle strip and the gaps of the table, and goes when the pointer leaves.
  function dragOverZone(event: DragEvent): void {
    if (!dragged) return;
    const target = zoneTarget(event);
    if (!target) {
      clearDropIndicator();
      return;
    }
    event.preventDefault?.();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    showDrop(dragged.table, dragged.axis, target.index, target.before);
  }

  function dropInZone(event: DragEvent): void {
    if (!dragged) return;
    const target = zoneTarget(event);
    if (!target) return;
    event.preventDefault?.();
    commitDrop(dragged.table, dragged.axis, target.index, target.before);
  }

  function drop(event: DragEvent, table: HTMLTableElement, axis: Axis, index: number): void {
    if (!dragged || dragged.axis !== axis || dragged.table !== table) return;
    updateDropIndicator(event, table, axis, index);
    commitDrop(table, axis, index, dropBefore);
  }

  // Ends the drag and, when a marker shows, moves the dragged row or column to it.
  function commitDrop(table: HTMLTableElement, axis: Axis, index: number, before: boolean): void {
    if (!dragged) return;
    showDrop(table, axis, index, before);
    const moved = dragged;
    const target = dropTarget;
    finishDrag();
    if (!target) return;
    // The index the row or column has once it left its place and sits before or after the target.
    let to = target.index + (before ? 0 : 1);
    if (moved.index < to) to -= 1;
    requestMove(table, axis, moved.index, to);
  }

  function moveByKey(table: HTMLTableElement, axis: Axis, from: number, step: number): void {
    const to = from + step;
    if (axis === "row" && to < headerCount(table)) return;
    requestMove(table, axis, from, to);
  }

  // Alt+Left and Alt+Right on the handle of a column (the row handle reads Alt+Up and Alt+Down).
  function columnChordStep(event: KeyboardEvent): number | undefined {
    if (event.isComposing || event.shiftKey || !event.altKey || event.ctrlKey || event.metaKey) return undefined;
    if (event.getModifierState?.("AltGraph") === true) return undefined;
    return event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : undefined;
  }

  function startDrag(event: DragEvent, table: HTMLTableElement, axis: Axis, element: HTMLElement): void {
    if (busy(table)) {
      event.preventDefault?.();
      return;
    }
    const index = axis === "row"
      ? (element as HTMLTableRowElement).rowIndex
      : (element as HTMLTableCellElement).cellIndex;
    dragged = { axis, index, table };
    dragElements(axis, table, index).forEach((item) => item.setAttribute(dragAttribute(axis), "true"));
    event.dataTransfer?.setData?.("text/plain", axis === "row" ? "table-row" : "table-column");
    event.dataTransfer?.setDragImage?.(element, 12, 12);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function addHandle(
    table: HTMLTableElement, axis: Axis, element: HTMLElement, index: number, parent: HTMLElement,
  ): void {
    const row = axis === "row";
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "okf-list-editor-handle " + (row ? "okf-table-row-handle" : "okf-table-col-handle");
    handle.setAttribute(row ? "data-okf-row-handle" : "data-okf-col-handle", "true");
    handle.setAttribute("contenteditable", "false");
    handle.setAttribute("aria-label", row ? "Move table row" : "Move table column");
    handle.setAttribute("title", row
      ? "Drag to move row (Alt+Up, Alt+Down)" : "Drag to move column (Alt+Left, Alt+Right)");
    handle.setAttribute("draggable", "true");
    handle.setAttribute(row ? "data-okf-row" : "data-okf-col", String(index));
    handle.setAttribute(row ? "data-okf-row-table" : "data-okf-col-table",
      table.getAttribute("data-sphinx-source-line") ?? "");
    handle.addEventListener("keydown", (event) => {
      const direction = row ? rt.blockMoves.moveChordDirection(event, false) : undefined;
      const step = row ? (direction === undefined ? undefined : direction === "up" ? -1 : 1) : columnChordStep(event);
      if (step === undefined) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      if (event.repeat && pending) return;
      // The element can have been replaced by a render since: the handle moves what it was made for.
      moveByKey(table, axis, row ? (element as HTMLTableRowElement).rowIndex : (element as HTMLTableCellElement).cellIndex, step);
    });
    handle.addEventListener("dragstart", (event) => startDrag(event, table, axis, element));
    handle.addEventListener("dragend", finishDrag);
    parent.appendChild(handle);
    entries.push({ handle, axis, index, element, table });
  }

  // The drop targets: every row for a row move, every cell for a column move, bound once; and the
  // page, for the pointer over the handle strip or a gap of the table.
  function bindDropTargets(table: HTMLTableElement): void {
    // The drop zone of a handle: the whole table and its handle strip, not only its rows and cells.
    if (!zoneBound) {
      zoneBound = true;
      document.addEventListener("dragover", dragOverZone);
      document.addEventListener("drop", dropInZone);
    }
    for (const row of Array.from(table.rows)) {
      if (!bound.has(row)) {
        bound.add(row);
        row.addEventListener("dragover", (event) => updateDropIndicator(event, table, "row", row.rowIndex));
        row.addEventListener("drop", (event) => drop(event, table, "row", row.rowIndex));
      }
      for (const cell of Array.from(row.cells ?? [])) {
        if (bound.has(cell)) continue;
        bound.add(cell);
        cell.addEventListener("dragover", (event) => updateDropIndicator(event, table, "column", cell.cellIndex));
        cell.addEventListener("drop", (event) => drop(event, table, "column", cell.cellIndex));
      }
    }
  }

  // The room a handle needs left of its table: its width and a gap.
  const HANDLE_SPACE = 32;
  // Half the width of a column handle: its centre stays this far inside the visible box of the table.
  const COLUMN_HANDLE_MARGIN = 11;

  // Puts every row handle just left of its table, centred on its row, and every column handle just
  // above its table, centred on its column. A table that leaves less room than a handle needs is
  // pushed right (an attribute the stylesheet reads), so the handle never leaves the pane. A table
  // that is hidden (it is being edited as raw Markdown) shows no handle. Absolute page coordinates:
  // the layer sits at the page origin.
  function position(): void {
    positionFrame = false;
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const tables = new Set(entries.filter((entry) => entry.axis === "row").map((entry) => entry.table));
    tables.forEach((table) => {
      if (table.getAttribute("data-okf-row-shift") !== null) table.removeAttribute("data-okf-row-shift");
      if (table.getBoundingClientRect().left < HANDLE_SPACE) table.setAttribute("data-okf-row-shift", "true");
    });
    entries.forEach(({ handle, axis, index, element, table }) => {
      const tableBox = table.getBoundingClientRect();
      const box = (axis === "column" ? cellOf(table.rows[0], index) : element)?.getBoundingClientRect();
      const hidden = !box || tableBox.height === 0;
      handle.style.setProperty("display", hidden ? "none" : "");
      if (!box) return;
      if (axis === "row") {
        handle.style.setProperty("left", Math.round(tableBox.left + scrollX - 4) + "px");
        handle.style.setProperty("top", Math.round(box.top + scrollY + box.height / 2) + "px");
      } else {
        // A table wider than the pane scrolls sideways: the handle of a column that has scrolled out
        // of the visible box is hidden, and one half in view stays inside it (never beyond the pane).
        const visibleLeft = tableBox.left;
        const visibleRight = tableBox.left + (tableBox.width ?? 0);
        const cellLeft = box.left ?? 0;
        const cellRight = cellLeft + (box.width ?? 0);
        if (cellRight <= visibleLeft + COLUMN_HANDLE_MARGIN || cellLeft >= visibleRight - COLUMN_HANDLE_MARGIN) {
          handle.style.setProperty("display", "none");
          return;
        }
        const centre = Math.max(visibleLeft + COLUMN_HANDLE_MARGIN,
          Math.min((cellLeft + cellRight) / 2, visibleRight - COLUMN_HANDLE_MARGIN));
        handle.style.setProperty("left", Math.round(centre + scrollX) + "px");
        handle.style.setProperty("top", Math.round(box.top + scrollY - 2) + "px");
      }
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
      const rowHandles = state.editMode && movableRows(table);
      const columnHandles = state.editMode && movableColumns(table);
      if (rowHandles || columnHandles) {
        if (!layer) {
          layer = document.createElement("div");
          layer.setAttribute("data-okf-row-handle-layer", "true");
          document.body.appendChild(layer);
        }
        bindDropTargets(table);
      }
      if (rowHandles) {
        table.setAttribute("data-okf-row-handles", "true");
        bodyRows(table).forEach((row) => addHandle(table, "row", row, row.rowIndex, layer!));
      } else {
        if (table.getAttribute("data-okf-row-handles") !== null) table.removeAttribute("data-okf-row-handles");
        if (table.getAttribute("data-okf-row-shift") !== null) table.removeAttribute("data-okf-row-shift");
      }
      if (columnHandles) {
        table.setAttribute("data-okf-col-handles", "true");
        Array.from(table.rows[0]!.cells).forEach((cell, column) => addHandle(table, "column", cell, column, layer!));
      } else if (table.getAttribute("data-okf-col-handles") !== null) {
        table.removeAttribute("data-okf-col-handles");
      }
    });
    if (entries.length > 0) {
      position();
      if (!observing && content && typeof ResizeObserver !== "undefined") {
        observing = true;
        new ResizeObserver(schedulePosition).observe(content);
        window.addEventListener("resize", schedulePosition, { passive: true });
        // A table that scrolls sideways moves its header cells under the column handles.
        document.addEventListener("scroll", (event) => {
          if ((event.target as Element | null)?.tagName === "TABLE") schedulePosition();
        }, { capture: true, passive: true });
      }
    }
    if (focusAfterRender && state.editMode) {
      const { line, axis, index } = focusAfterRender;
      focusAfterRender = undefined;
      entries.find((entry) => Number(entry.table.getAttribute("data-sphinx-source-line")) === line
        && entry.axis === axis && entry.index === index)?.handle.focus?.({ preventScroll: true });
    }
  }

  return { refresh, receiveSource };
}
