"""Stacking of the table bar above the row handles (CR 168)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure


# @tests_req SwRS-MDOKFSTUDIO-TABLE-064
def check_table_menu_above_handles(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """A row handle that lands on a button of the table bar (a handle placed before the bar grew or
  wrapped, or a table pushed right of the bar) must not take the press: the bar paints above the
  handle layer, so every button hit-tests as itself."""
  if scenario.get("editTarget") != "table-cell" or scenario.get("screenshotOf"):
    return
  page_name = scenario["page"]
  page.keyboard.press("Escape")
  page.locator("main table:not(.okf-properties) tbody td").first.click()
  page.wait_for_timeout(300)
  if page.locator("[data-okf-row-handle]").count() == 0 or page.locator("[data-sphinx-table-menu]").count() != 1:
    failures.append(Failure(page_name, "table bar or row handles missing for the stacking check"))
    return
  if not page.evaluate("""() => [...document.querySelectorAll('[data-okf-row-handle]')]
      .some((handle) => handle.offsetWidth > 0 && handle.offsetHeight > 0)"""):
    failures.append(Failure(page_name, "no row handle has a size: the stacking check would pass vacuously"))
    return
  covered = page.evaluate("""() => {
    const menu = document.querySelector('[data-sphinx-table-menu]');
    const handle = [...document.querySelectorAll('[data-okf-row-handle]')]
      .find((candidate) => candidate.offsetWidth > 0 && candidate.offsetHeight > 0);
    const saved = [handle.style.left, handle.style.top];
    const result = [];
    for (const button of menu.querySelectorAll('[data-sphinx-table-operation]')) {
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      // The handle is translated by (-100%, -50%) from its left/top, in page coordinates.
      handle.style.left = Math.round(x + handle.offsetWidth / 2 + window.scrollX) + 'px';
      handle.style.top = Math.round(y + window.scrollY) + 'px';
      const hit = document.elementFromPoint(x, y);
      if (!hit || !button.contains(hit)) {
        result.push(button.dataset.sphinxTableOperation + ' -> ' + (hit ? hit.tagName + ':' + (hit.getAttribute('aria-label') || hit.className) : 'nothing'));
      }
    }
    [handle.style.left, handle.style.top] = saved;
    return result;
  }""")
  if covered:
    failures.append(Failure(page_name, f"a row handle takes the press meant for table bar buttons: {covered}"))
  page.keyboard.press("Escape")
