"""Find scrolls a table that was scrolled sideways to its hit (QA271-08)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

MARGIN = 16
TOLERANCE = 1.0


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
def check_find_hit_in_wide_table(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """With the table scrolled to its end, Find for `needle` and Enter bring the hit text inside the
  table's box (less the 16 px margin) and the viewport, and the page does not scroll sideways."""
  if not scenario.get("findWideTableChecks"):
    return
  name = scenario["page"]
  scrollable = page.evaluate("""() => {
    const table = document.querySelector('main table:not(.okf-properties)');
    if (!table) return false;
    table.scrollLeft = table.scrollWidth;
    return table.scrollWidth > table.clientWidth && table.scrollLeft > 100;
  }""")
  if not scrollable:
    failures.append(Failure(name, "the table does not scroll sideways, so the scenario proves nothing"))
    return
  page.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()")
  page.keyboard.press("ControlOrMeta+F")
  page.wait_for_timeout(100)
  page.keyboard.type("needle")
  page.wait_for_timeout(200)
  page.keyboard.press("Enter")
  page.wait_for_timeout(200)
  count = page.locator("[data-find-count]").inner_text()
  if count != "1 of 1":
    failures.append(Failure(name, f"the find bar counts {count!r} for needle, expected '1 of 1'"))
  geometry = page.evaluate("""() => {
    const table = document.querySelector('main table:not(.okf-properties)');
    const cell = Array.from(table.querySelectorAll('td')).find(td => td.textContent.includes('needle'));
    const range = document.createRange();
    range.setStart(cell.firstChild, cell.firstChild.textContent.indexOf('needle'));
    range.setEnd(cell.firstChild, cell.firstChild.textContent.indexOf('needle') + 6);
    const r = range.getBoundingClientRect();
    const t = table.getBoundingClientRect();
    return {
      range: { left: r.left, right: r.right },
      box: { left: t.left + table.clientLeft, right: t.left + table.clientLeft + table.clientWidth },
      viewport: { left: 0, right: window.innerWidth },
      scrollX: window.scrollX,
    };
  }""")
  for label, edge, margin in (("table box", geometry["box"], MARGIN), ("viewport", geometry["viewport"], 0)):
    if geometry["range"]["left"] < edge["left"] + margin - TOLERANCE or geometry["range"]["right"] > edge["right"] - margin + TOLERANCE:
      failures.append(Failure(name, f"the found text is outside the {label}: {geometry['range']} vs {edge}"))
  if geometry["scrollX"] != 0:
    failures.append(Failure(name, f"the page scrolled sideways: {geometry['scrollX']}"))
  save_step(page, scenario, "found")
