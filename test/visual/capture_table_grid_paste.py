"""A spreadsheet paste into a table cell fills the cells from it (CR 292, QA271-12)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

CELL_EDITOR = "[data-sphinx-preview-table-cell-editor]"
LAST_CELL = "main table:not(.okf-properties) tbody tr:last-child td:last-child"
GRID = [["g1", "g2"], ["g3", "g4"]]

# A paste event whose clipboard holds `text` as plain text; returns whether the page took it over.
PASTE = """(text) => {
  const area = document.querySelector('[data-sphinx-preview-table-cell-editor] textarea');
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  const event = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true });
  area.dispatchEvent(event);
  return event.defaultPrevented;
}"""

# The cells of the saved table, by line: the trimmed texts between its unescaped pipes.
SAVED_TABLE = """() => {
  const saves = window.visualMessages.filter(message => message.type === 'previewEditSave');
  const cells = line => line.trim().replace(/^\\||\\|$/g, '').split(/(?<!\\\\)\\|/).map(cell => cell.trim());
  return {
    count: saves.length,
    finals: saves.filter(message => message.final === true).length,
    rows: saves.length ? saves[saves.length - 1].editedText.split('\\n').filter(line => line.trim()).map(cells) : [],
    tab: saves.some(message => message.editedText.includes('\\t')),
  };
}"""

# The render of the host after the save: the table with the column and the row the paste added and
# the four pasted values (the page does not render by itself in this harness).
PATCH = """(grid) => {
  const root = document.getElementById('sphinx-myst-preview-content');
  const html = document.documentElement;
  const template = document.createElement('template');
  template.innerHTML = root.innerHTML;
  const content = template.content;
  content.querySelectorAll('[data-sphinx-preview-table-cell-editor], [data-sphinx-table-menu]')
    .forEach(element => element.remove());
  content.querySelectorAll('[data-sphinx-table-cell-content]').forEach(span => span.replaceWith(...span.childNodes));
  content.querySelectorAll('[data-sphinx-preview-table-cell-selected]')
    .forEach(cell => cell.removeAttribute('data-sphinx-preview-table-cell-selected'));
  const table = [...content.querySelectorAll('table:not(.okf-properties)')].pop();
  for (const name of ['data-okf-row-handles', 'data-okf-col-handles', 'data-sphinx-preview-wide']) {
    table.removeAttribute(name);
  }
  const blank = cell => { const copy = cell.cloneNode(false); copy.textContent = ''; return copy; };
  for (const row of table.rows) row.append(blank(row.cells[row.cells.length - 1]));
  const body = table.tBodies[0];
  const last = body.rows[body.rows.length - 1];
  const added = last.cloneNode(false);
  for (const cell of last.cells) added.append(blank(cell));
  body.append(added);
  const startRow = body.rows.length - 2;
  const startColumn = last.cells.length - 2;
  grid.forEach((line, y) => line.forEach((value, x) => {
    body.rows[startRow + y].cells[startColumn + x].textContent = value;
  }));
  // The host reads the saved table when the editor reopens: the stand-in answers with the saved text.
  const saves = window.visualMessages.filter(message => message.type === 'previewEditSave');
  const saved = saves[saves.length - 1].editedText;
  const dispatch = window.dispatchEvent.bind(window);
  window.dispatchEvent = event => (event.type === 'message' && event.data?.type === 'previewEditSource'
    ? dispatch(new MessageEvent('message', { data: { ...event.data, originalText: saved } }))
    : dispatch(event));
  const version = Number(html.getAttribute('data-sphinx-preview-document-version'));
  const request = Number(html.getAttribute('data-sphinx-preview-request-id'));
  dispatch(new MessageEvent('message', { data: {
    type: 'previewContentPatch',
    documentId: html.getAttribute('data-sphinx-preview-document-id'),
    revision: version, requestId: request,
    next: { revision: version + 1, requestId: request + 1 },
    contentHtml: template.innerHTML, status: 'success', label: 'Preview ready', diagnostics: [],
  } }));
}"""

TABLE_SHAPE = """() => {
  const table = [...document.querySelectorAll('main table:not(.okf-properties)')].pop();
  const body = table.tBodies[0];
  return {
    columns: table.rows[0].cells.length,
    bodyRows: body.rows.length,
    cells: [...body.rows].slice(-2).map(row => [...row.cells].slice(-2).map(cell => cell.textContent.trim())),
    editorText: (document.querySelector('[data-sphinx-preview-table-cell-editor] textarea') || {}).value,
    editorCell: (() => {
      const editor = document.querySelector('[data-sphinx-preview-table-cell-editor]');
      const cell = editor && editor.closest('td, th');
      return cell ? { row: cell.parentElement.rowIndex, column: cell.cellIndex } : null;
    })(),
  };
}"""


# @tests_req SwRS-MDOKFSTUDIO-TABLE-120
def check_table_grid_paste(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Two spreadsheet lines pasted into the last cell of the last row send one final save that fills
  four cells and adds one column and one row; once the host renders the table, the cell editor is
  open in the start cell and the table shows the pasted values."""
  if not scenario.get("tableGridPasteChecks"):
    return
  page_name = scenario["page"]
  cell = page.locator(LAST_CELL)
  if cell.count() != 1:
    failures.append(Failure(page_name, "the last cell of the last row of the table is missing"))
    return
  cell.scroll_into_view_if_needed()
  cell.click()
  page.locator(f"{CELL_EDITOR} textarea").wait_for(state="visible")
  before = page.evaluate(TABLE_SHAPE)
  start = before["editorCell"]
  taken = page.evaluate(PASTE, "\t".join(GRID[0]) + "\r\n" + "\t".join(GRID[1]) + "\r\n")
  if not taken:
    failures.append(Failure(page_name, "the grid paste was left to the native paste"))
    return
  saved = page.evaluate(SAVED_TABLE)
  if saved["finals"] != 1 or saved["count"] != 1:
    failures.append(Failure(page_name, f"the grid paste did not save once: {saved['count']} saves, {saved['finals']} final"))
    return
  if saved["tab"]:
    failures.append(Failure(page_name, "the saved table holds a tab character"))
  rows = saved["rows"]
  columns = before["columns"] + 1
  if len(rows) != before["bodyRows"] + 3 or any(len(row) != columns for row in rows):
    failures.append(Failure(page_name, f"the saved table is not one column and one row larger: {rows}"))
    return
  if rows[0][-1] != "" or rows[-2][-2:] != GRID[0] or rows[-1][-2:] != GRID[1] or rows[-1][0] != "":
    failures.append(Failure(page_name, f"the pasted values are not in the four cells from the start cell: {rows[-2:]}"))
  page.evaluate(PATCH, GRID)
  page.wait_for_function(
    "() => document.querySelectorAll('[data-sphinx-preview-table-cell-editor]').length === 1",
    timeout=5000,
  )
  after = page.evaluate(TABLE_SHAPE)
  if after["columns"] != columns or after["bodyRows"] != before["bodyRows"] + 1 or after["cells"][0][-1:] != [GRID[0][1]]:
    failures.append(Failure(page_name, f"the rendered table does not show the pasted grid: {after}"))
  if after["editorText"] != GRID[0][0]:
    failures.append(Failure(page_name, f"the reopened cell editor does not show the pasted text: {after['editorText']!r}"))
  if after["editorCell"] != start:
    failures.append(Failure(page_name, f"the cell editor did not reopen in the start cell {start}: {after['editorCell']}"))
  save_step(page, scenario, "pasted", caret="hide")
