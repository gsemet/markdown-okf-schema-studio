"""The cell editor stays inside a narrow pane (QA271-14): the edited cell is clamped to its table's box."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure

TOLERANCE = 1.0


# @tests_req SwRS-MDOKFSTUDIO-TABLE-006
def check_cell_clamped_to_pane(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """At 280 px the edited cell, its field and Done and Cancel are inside the table's scroll box and
  the viewport; the cell is at least 8em wide and narrower than its 300 px minimum (the clamp bites)."""
  if not scenario.get("cellRoomChecks"):
    return
  name = scenario["page"]
  geometry = page.evaluate("""() => {
    const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
    const editor = cell && cell.querySelector('[data-sphinx-preview-table-cell-editor]');
    if (!cell || !editor) return null;
    const table = cell.closest('table');
    const tableRect = table.getBoundingClientRect();
    const box = { left: tableRect.left + table.clientLeft, right: tableRect.left + table.clientLeft + table.clientWidth };
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right };
    };
    return {
      box,
      viewport: { left: 0, right: window.innerWidth },
      cell: rect(cell),
      parts: Object.fromEntries([
        ['textarea', editor.querySelector('textarea')],
        ...Array.from(editor.querySelectorAll('button')).map(button => [button.textContent, button]),
      ].map(([label, element]) => [label, rect(element)])),
      cellWidth: cell.getBoundingClientRect().width,
      em: parseFloat(getComputedStyle(cell).fontSize),
    };
  }""")
  if geometry is None:
    failures.append(Failure(name, "no open cell editor to check against the pane"))
    return
  for label, rect in {"cell": geometry["cell"], **geometry["parts"]}.items():
    for bound, edge in (("box", geometry["box"]), ("viewport", geometry["viewport"])):
      if rect["left"] < edge["left"] - TOLERANCE or rect["right"] > edge["right"] + TOLERANCE:
        failures.append(Failure(name, f"the {label} of the cell editor is outside the table's {bound}: {rect} vs {edge}"))
  if geometry["cellWidth"] < 8 * geometry["em"] - TOLERANCE:
    failures.append(Failure(name, f"the edited cell is narrower than 8em: {geometry['cellWidth']}"))
  if geometry["cellWidth"] >= 300 - TOLERANCE:
    failures.append(Failure(name, f"the edited cell kept its 300 px minimum in a narrow pane: {geometry['cellWidth']}"))
