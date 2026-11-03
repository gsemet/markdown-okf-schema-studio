"""Drag of a table row, then the render the host sends back (CR 252)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure

ROW_HANDLES = "[data-okf-row-handle-layer] .okf-table-row-handle"

# What the page shows once the move is rendered: the rows in the new order, the table out of the
# margin, and every handle on the real edges of the table as laid out now.
RENDERED_STATE = """() => {
  const table = document.querySelector('#sphinx-myst-preview-content table[data-okf-row-handles]');
  if (!table) return { missing: true };
  const box = table.getBoundingClientRect();
  const rows = [...table.tBodies[0].rows].map((row) => row.cells[0].textContent.trim());
  const rowHandles = [...document.querySelectorAll('[data-okf-row-handle-layer] .okf-table-row-handle')].map((handle) => {
    const handleBox = handle.getBoundingClientRect();
    const rowBox = table.rows[Number(handle.dataset.okfRow)].getBoundingClientRect();
    return { gap: Math.abs(handleBox.right - box.left), centre: Math.abs((handleBox.top + handleBox.height / 2) - (rowBox.top + rowBox.height / 2)) };
  });
  const columnHandles = [...document.querySelectorAll('[data-okf-row-handle-layer] .okf-table-col-handle')].map((handle) => {
    const handleBox = handle.getBoundingClientRect();
    const cell = table.rows[0].cells[Number(handle.dataset.okfCol)].getBoundingClientRect();
    return { centre: Math.abs((handleBox.left + handleBox.width / 2) - (cell.left + cell.width / 2)), above: handleBox.bottom - box.top };
  });
  return { rows, wide: table.hasAttribute('data-sphinx-preview-wide'), rowHandles, columnHandles };
}"""

# The render of the host after the save: the same page with the first body row moved after the third.
PATCH = """() => {
  const root = document.getElementById('sphinx-myst-preview-content');
  const html = document.documentElement;
  const template = document.createElement('template');
  template.innerHTML = root.innerHTML;
  const table = template.content.querySelector('table');
  // A fresh render carries neither the marks of edit mode nor those of the width mode.
  table.removeAttribute('data-okf-row-handles');
  table.removeAttribute('data-okf-col-handles');
  table.removeAttribute('data-sphinx-preview-wide');
  const body = table.tBodies[0];
  body.append(body.rows[0]);
  const version = Number(html.getAttribute('data-sphinx-preview-document-version'));
  const request = Number(html.getAttribute('data-sphinx-preview-request-id'));
  window.dispatchEvent(new MessageEvent('message', { data: {
    type: 'previewContentPatch',
    documentId: html.getAttribute('data-sphinx-preview-document-id'),
    revision: version, requestId: request,
    next: { revision: version + 1, requestId: request + 1 },
    contentHtml: template.innerHTML, status: 'success', label: 'Preview ready', diagnostics: [],
  } }));
}"""


# @tests_req SwRS-MDOKFSTUDIO-TABLE-002
# @tests_req SwRS-MDOKFSTUDIO-TABLE-007
def check_table_move(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """A body row dragged below the last one is saved in the new order; when the host renders the
  page again, the table breaks out of the margin anew and every handle sits on its real edges."""
  if not scenario.get("tableMoveChecks"):
    return
  page_name = scenario["page"]
  for _ in range(3):
    if page.locator("html").get_attribute("data-sphinx-preview-width") == "auto":
      break
    page.locator("[data-sphinx-preview-width-toggle]").click()
  page.wait_for_timeout(200)
  if page.locator("html").get_attribute("data-sphinx-preview-width") != "auto":
    failures.append(Failure(page_name, "table move: the Width button did not reach Auto"))
    return
  page.evaluate("window.visualMessages.length = 0")
  handle = page.locator(f'{ROW_HANDLES}[data-okf-row="1"]').first
  destination = page.locator("main table tbody tr:nth-child(3)").first
  if handle.count() == 0 or destination.count() == 0:
    failures.append(Failure(page_name, "table move: the first row handle or the third row is missing"))
    return
  from_box = handle.bounding_box()
  to_box = destination.bounding_box()
  page.mouse.move(from_box["x"] + from_box["width"] / 2, from_box["y"] + from_box["height"] / 2)
  page.mouse.down()
  page.mouse.move(from_box["x"] + 20, from_box["y"] + 20, steps=4)
  # The pointer ends in the lower half of the third row: the row lands after it.
  page.mouse.move(to_box["x"] + 40, to_box["y"] + to_box["height"] * 0.8, steps=12)
  page.mouse.up()
  page.wait_for_timeout(300)
  saves = page.evaluate("window.visualMessages.filter(m => m.type === 'previewEditSave')")
  if len(saves) != 1:
    failures.append(Failure(page_name, f"table move: the drop must save the table once, saved {len(saves)}"))
    return
  order = [line.split("|")[1].strip() for line in saves[0]["editedText"].splitlines()[2:]]
  if order != ["second-identifier-0002", "third-identifier-0003", "first-identifier-0001"]:
    failures.append(Failure(page_name, f"table move: the saved table has its rows in the order {order}"))
  page.evaluate(PATCH)
  page.wait_for_timeout(500)
  state = page.evaluate(RENDERED_STATE)
  if state.get("missing"):
    failures.append(Failure(page_name, "table move: the rendered table has no row handles"))
    return
  if state["rows"] != ["second-identifier-0002", "third-identifier-0003", "first-identifier-0001"]:
    failures.append(Failure(page_name, f"table move: the rendered rows are {state['rows']}"))
  if not state["wide"]:
    failures.append(Failure(page_name, "table move: the rendered table did not break out of the margin in Auto width"))
  if len(state["rowHandles"]) != 3 or any(h["gap"] > 12 or h["centre"] > 2 for h in state["rowHandles"]):
    failures.append(Failure(page_name, f"table move: the row handles are off the table's left edge or their rows: {state['rowHandles']}"))
  if len(state["columnHandles"]) != 5 or any(h["centre"] > 2 or h["above"] > 1 for h in state["columnHandles"]):
    failures.append(Failure(page_name, f"table move: the column handles are off their columns or the top of the table: {state['columnHandles']}"))
