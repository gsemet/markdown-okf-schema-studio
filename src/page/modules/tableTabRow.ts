/**
 * The Tab-adds-a-row helpers of the cell editor: which cell the "Tab: new row" hint belongs to, the
 * hint element, and the test of an added row that is still empty.
 */

/** The text of the hint shown in the last cell of a table. */
const TAB_HINT_TEXT = "Tab: new row";

// @implements_req SwRS-MDOKFSTUDIO-TABLE-035
/** True for the last cell of the last rendered row of its table, where Tab adds a row. */
export function isTabNewRowCell(cell: HTMLTableCellElement): boolean {
  const rows = cell.closest?.("table")?.rows;
  const row = cell.parentElement as HTMLTableRowElement | null;
  if (!rows || typeof rows.length !== "number" || !row || rows.length === 0) return false;
  return rows[rows.length - 1] === row && cell.cellIndex === (row.cells?.length ?? 0) - 1;
}

// @implements_req SwRS-MDOKFSTUDIO-TABLE-035
/** The hint of the last cell: a small description-coloured text the text box is described by. */
export function createTabHint(document: Document, id: string): HTMLElement {
  const hint = document.createElement("span");
  hint.setAttribute("id", id);
  hint.setAttribute("data-sphinx-preview-table-cell-hint", "true");
  hint.textContent = TAB_HINT_TEXT;
  return hint;
}

// @implements_req SwRS-MDOKFSTUDIO-TABLE-025
/** True when every cell of the model row holds nothing but spaces. */
export function isEmptyModelRow(row: readonly string[] | undefined): boolean {
  return Boolean(row) && row!.every((text) => text.trim() === "");
}
