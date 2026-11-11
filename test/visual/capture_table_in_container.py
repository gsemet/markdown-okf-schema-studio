"""A table inside a quote, a GitHub alert or a MyST admonition opens the cell editor (CR 291)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

CELL_EDITOR = "[data-sphinx-preview-table-cell-editor]"
TABLE_BAR = "[data-sphinx-table-menu]"
RAW_EDITOR = ".sphinx-preview-block-editor"
TABLES = "#sphinx-myst-preview-content table"
NAMES = ("quote", "alert", "admonition")


def _open_first_cell(page: Page, rank: int, label: str, page_name: str, failures: list[Failure]) -> bool:
  """Click the first body cell of the table of `rank`: the cell editor and the table bar must open."""
  cell = page.locator(TABLES).nth(rank).locator("tbody td").first
  if cell.count() == 0:
    failures.append(Failure(page_name, f"table in container: the table of the {label} has no body cell"))
    return False
  cell.click()
  page.wait_for_timeout(300)
  if page.locator(CELL_EDITOR).count() != 1 or page.locator(TABLE_BAR).count() == 0:
    failures.append(Failure(page_name, f"table in container: a click on the {label} table did not open the cell editor and the table bar"))
    return False
  if page.locator(RAW_EDITOR).count() != 0:
    failures.append(Failure(page_name, f"table in container: the {label} table opened the raw Markdown editor"))
    return False
  return True


# @tests_req SwRS-MDOKFSTUDIO-TABLE-121
def check_table_in_container(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """`quote`: the cell editor and the bar open on the table of a quote, of an alert and of a MyST
  admonition. `note`: a typed letter and Enter save the alert's table with its prefixes kept."""
  mode = scenario.get("tableInContainerChecks")
  if not mode:
    return
  page_name = scenario["page"]
  if mode == "quote":
    for rank, label in enumerate(NAMES):
      if not _open_first_cell(page, rank, label, page_name, failures):
        return
      if rank == 0:
        save_step(page, scenario, "open", caret="initial")
      page.locator(f"{CELL_EDITOR} textarea").press("Escape")
      page.wait_for_timeout(300)
    return
  page.evaluate("window.visualMessages.length = 0")
  if not _open_first_cell(page, 1, "alert", page_name, failures):
    return
  area = page.locator(f"{CELL_EDITOR} textarea")
  area.press("End")
  area.type("X")
  save_step(page, scenario, "open", caret="initial")
  area.press("Enter")
  page.wait_for_timeout(300)
  saves = page.evaluate("window.visualMessages.filter(m => m.type === 'previewEditSave')")
  if not saves:
    failures.append(Failure(page_name, "table in container: Enter in the alert's cell saved nothing"))
    return
  lines = saves[-1]["editedText"].splitlines()
  table_lines = [line for line in lines if "|" in line]
  # The source of the click is the table itself (the renderer maps it): only its lines are sent back.
  if len(lines) != len(table_lines):
    failures.append(Failure(page_name, f"table in container: the saved text holds lines that are not table lines: {lines}"))
  if len(table_lines) != 4 or not all(line.startswith("> |") for line in table_lines):
    failures.append(Failure(page_name, f"table in container: the saved table lines lost their prefix: {table_lines}"))
  elif not table_lines[2].startswith("> | GenevaX |"):
    failures.append(Failure(page_name, f"table in container: the typed letter is not in the saved cell: {table_lines[2]}"))
