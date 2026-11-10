"""Escape in a table cell after a cell was left with ArrowDown (CR 274)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure


# @tests_req SwRS-MDOKFSTUDIO-TABLE-025
def check_cell_escape_keeps_cells_left(page: Page, page_name: str, failures: list[Failure]) -> None:
  """Escape in the open cell drops only that cell's typed text: the table is saved (final) with
  the cell left with ArrowDown, no cancel is posted, and the editor closes on the host's render.
  (The plain cancel of an untouched session is covered by the page unit tests.)"""
  cell_input = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
  cell_input.press("Escape")
  if not page.evaluate("""() => {
    const saves = window.visualMessages.filter(message => message.type === "previewEditSave");
    const last = saves[saves.length - 1];
    return Boolean(last) && last.final === true && last.editedText.includes(" updated")
      && !window.visualMessages.some(message => message.type === "previewEditCancel");
  }"""):
    failures.append(Failure(page_name, "Escape in a table cell did not keep the cell left and save the table"))
  # The host answers the final save with a render of the page; without it the editor stays
  # in its saving state. Answer with the page as it is, minus the editor and the table bar.
  page.evaluate("""() => {
    const root = document.getElementById('sphinx-myst-preview-content');
    const html = document.documentElement;
    const template = document.createElement('template');
    template.innerHTML = root.innerHTML;
    const content = template.content;
    // The cell editor and the table bar (in the flow, above the table) are page chrome.
    content.querySelectorAll('[data-sphinx-preview-table-cell-editor], [data-sphinx-table-menu]')
      .forEach(element => element.remove());
    content.querySelectorAll('[data-sphinx-table-cell-content]').forEach(span => span.replaceWith(...span.childNodes));
    content.querySelectorAll('[data-sphinx-preview-table-cell-selected]')
      .forEach(cell => cell.removeAttribute('data-sphinx-preview-table-cell-selected'));
    // A fresh render carries neither the marks of edit mode nor those of the width mode.
    content.querySelectorAll('table').forEach(table => {
      for (const name of ['data-okf-row-handles', 'data-okf-col-handles', 'data-sphinx-preview-wide']) {
        table.removeAttribute(name);
      }
    });
    const version = Number(html.getAttribute('data-sphinx-preview-document-version'));
    const request = Number(html.getAttribute('data-sphinx-preview-request-id'));
    window.dispatchEvent(new MessageEvent('message', { data: {
      type: 'previewContentPatch',
      documentId: html.getAttribute('data-sphinx-preview-document-id'),
      revision: version, requestId: request,
      next: { revision: version + 1, requestId: request + 1 },
      contentHtml: template.innerHTML, status: 'success', label: 'Preview ready', diagnostics: [],
    } }));
  }""")
  page.wait_for_timeout(500)
  if page.locator("[data-sphinx-preview-table-cell-editor]").count() != 0 \
      or page.locator("[data-sphinx-table-menu]").count() != 0:
    failures.append(Failure(page_name, "the table cell editor or its bar stayed after Escape and the host render"))
