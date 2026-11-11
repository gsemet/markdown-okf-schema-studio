"""The Rename label field of a table's label opens above the icon and covers no cell (CR 290, QA271-09)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

TOLERANCE = 1.0
ANCHOR = '.okf-anchor[data-okf-label="table-label"]'
POPOVER = "[data-okf-label-rename]"


# @tests_req SwRS-MDOKFSTUDIO-MYST-038
def check_label_rename_above_table(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """A real click on the anchor icon of `table-label` opens the field: its box is inside the viewport
  and does not intersect (1 px tolerance) the box of any table cell."""
  if not scenario.get("labelRenameChecks"):
    return
  name = scenario["page"]
  anchor = page.locator(ANCHOR).first
  if anchor.count() == 0:
    failures.append(Failure(name, "label rename: the anchor icon of table-label is missing"))
    return
  anchor.click()
  try:
    page.wait_for_selector(POPOVER, timeout=3000)
  except Exception:
    failures.append(Failure(name, "label rename: the click on the anchor icon opened no rename field"))
    return
  page.wait_for_timeout(200)
  geometry = page.evaluate("""() => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    return {
      popover: rect(document.querySelector('[data-okf-label-rename]')),
      icon: rect(document.querySelector('.okf-anchor[data-okf-label="table-label"]')),
      side: document.querySelector('[data-okf-label-rename]').getAttribute('data-okf-label-rename-side'),
      cells: Array.from(document.querySelectorAll('table td, table th')).map(cell => ({ text: cell.textContent.trim(), ...rect(cell) })),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  }""")
  save_step(page, scenario, "open", caret="hide")
  box = geometry["popover"]
  view = geometry["viewport"]
  if box["left"] < -TOLERANCE or box["top"] < -TOLERANCE \
      or box["right"] > view["width"] + TOLERANCE or box["bottom"] > view["height"] + TOLERANCE:
    failures.append(Failure(name, f"label rename: the field is not fully inside the viewport: {box} in {view}"))
  if geometry["side"] != "above" or box["bottom"] > geometry["icon"]["top"] + TOLERANCE:
    failures.append(Failure(name, f"label rename: the field is not above the icon: {box} vs icon {geometry['icon']}"))
  for cell in geometry["cells"]:
    if cell["left"] < box["right"] - TOLERANCE and cell["right"] > box["left"] + TOLERANCE \
        and cell["top"] < box["bottom"] - TOLERANCE and cell["bottom"] > box["top"] + TOLERANCE:
      failures.append(Failure(name, f"label rename: the field covers the cell {cell['text']!r}: {box} vs {cell}"))
