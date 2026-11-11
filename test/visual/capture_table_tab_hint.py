"""The "Tab: new row" hint in the last cell of a table (QA271-13): it shows there, inside the cell
editor and the viewport, with Done and Cancel still fully in view, and in no other cell."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

TOLERANCE = 1.0
HINT = "[data-sphinx-preview-table-cell-hint]"
EDITOR = "[data-sphinx-preview-table-cell-editor]"


# @tests_req SwRS-MDOKFSTUDIO-TABLE-035
def check_table_tab_hint(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Opened in the first body cell the editor has no hint; opened in the last cell of the last row
  it shows "Tab: new row" inside the editor and the viewport, and Done and Cancel stay in view."""
  if not scenario.get("tabHintChecks"):
    return
  name = scenario["page"]
  table = "main table:not(.okf-properties)"
  page.locator(f"{table} tbody tr").first.locator("td").first.click()
  page.wait_for_selector(EDITOR, timeout=5000)
  if page.locator(HINT).count() != 0:
    failures.append(Failure(name, "the Tab hint shows in the first body cell"))
  page.keyboard.press("Escape")
  page.wait_for_selector(EDITOR, state="detached", timeout=5000)
  last = page.locator(f"{table} tbody tr").last.locator("td").last
  last.scroll_into_view_if_needed()
  last.click()
  page.wait_for_selector(EDITOR, timeout=5000)
  page.wait_for_timeout(300)
  geometry = page.evaluate("""() => {
    const editor = document.querySelector('[data-sphinx-preview-table-cell-editor]');
    const hint = editor && editor.querySelector('[data-sphinx-preview-table-cell-hint]');
    if (!editor || !hint) return null;
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const table = editor.closest('table');
    const tableRect = table.getBoundingClientRect();
    return {
      box: { left: tableRect.left + table.clientLeft, right: tableRect.left + table.clientLeft + table.clientWidth },
      text: hint.textContent,
      describedBy: editor.querySelector('textarea').getAttribute('aria-describedby') === hint.id,
      editor: rect(editor),
      viewport: { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight },
      parts: Object.fromEntries([
        ['hint', hint],
        ...Array.from(editor.querySelectorAll('button')).map(button => [button.textContent, button]),
      ].map(([label, element]) => [label, rect(element)])),
    };
  }""")
  if geometry is None:
    failures.append(Failure(name, "the last cell editor has no Tab hint"))
    return
  if geometry["text"] != "Tab: new row":
    failures.append(Failure(name, f"the Tab hint reads {geometry['text']!r}"))
  if not geometry["describedBy"]:
    failures.append(Failure(name, "the cell text box is not described by the Tab hint"))
  for label in ("Done", "Cancel"):
    if label not in geometry["parts"]:
      failures.append(Failure(name, f"the {label} button is missing next to the Tab hint"))
  for label, rect in geometry["parts"].items():
    inside = geometry["editor"]
    if rect["left"] < inside["left"] - TOLERANCE or rect["right"] > inside["right"] + TOLERANCE \
        or rect["bottom"] > inside["bottom"] + TOLERANCE:
      failures.append(Failure(name, f"the {label} of the cell editor lies outside the editor: {rect} vs {inside}"))
    box = geometry["box"]
    if rect["left"] < box["left"] - TOLERANCE or rect["right"] > box["right"] + TOLERANCE:
      failures.append(Failure(name, f"the {label} of the cell editor is outside the table's box: {rect} vs {box}"))
    view = geometry["viewport"]
    if rect["left"] < view["left"] - TOLERANCE or rect["right"] > view["right"] + TOLERANCE \
        or rect["top"] < view["top"] - TOLERANCE or rect["bottom"] > view["bottom"] + TOLERANCE:
      failures.append(Failure(name, f"the {label} of the cell editor is outside the viewport: {rect} vs {view}"))
  save_step(page, scenario, "open")
