/**
 * The room the cell editor has in a narrow pane. In edit mode the edited cell is at least 300 px
 * wide; the style rule reads `--sphinx-preview-cell-editor-room` (written on the cell) to give it
 * less when the table's box is narrower, so the cell, its field and its buttons stay in view.
 */

/** The cell's custom property read by the edit-mode style rule. */
const CELL_EDITOR_ROOM_PROPERTY = "--sphinx-preview-cell-editor-room";

/** The gap kept between a revealed cell and the side edges of its table's scroll box. */
export const CELL_REVEAL_MARGIN = 16;

// @implements_req SwRS-MDOKFSTUDIO-TABLE-006
// The room is the widest the table's scroll box can be (the content width of its column, less the
// row-handle shift of its inline-start margin) less the reveal margin on both sides and the cell's
// own horizontal padding and borders: the start alignment of the reveal then fits the whole cell.
// It does not depend on the cell width, so a layout pass can measure it again without feedback.
// Without a measurable column the property is removed and the style keeps its 300 px.
export function fitCellToRoom(
  window: Pick<Window, "getComputedStyle">,
  cell: HTMLTableCellElement,
): void {
  const table = cell.closest?.("table");
  const column = table?.parentElement;
  const columnWidth = column?.clientWidth ?? 0;
  if (!table || !column || !(columnWidth > 0)) {
    clearCellEditorRoom(cell);
    return;
  }
  const px = (value: string | undefined): number => Number.parseFloat(value ?? "") || 0;
  const columnStyle = window.getComputedStyle(column);
  const tableStyle = window.getComputedStyle(table);
  const cellStyle = window.getComputedStyle(cell);
  const room = columnWidth - px(columnStyle.paddingLeft) - px(columnStyle.paddingRight)
    - px(tableStyle.marginInlineStart) - 2 * CELL_REVEAL_MARGIN
    - px(cellStyle.paddingLeft) - px(cellStyle.paddingRight)
    - px(cellStyle.borderLeftWidth) - px(cellStyle.borderRightWidth);
  cell.style.setProperty(CELL_EDITOR_ROOM_PROPERTY, String(Math.max(0, Math.floor(room * 100) / 100)) + "px");
}

/** Removes the room from a cell that is no longer edited. */
export function clearCellEditorRoom(cell: HTMLElement): void {
  cell.style.removeProperty?.(CELL_EDITOR_ROOM_PROPERTY);
}
