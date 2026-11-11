"""A click on a field below an open, unchanged field editor opens that field (CR 281, QA271-07)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure

TITLE_CELL = 'tr[data-okf-field="title"] [data-okf-edit-cell="value"]'
PRIORITY_CELL = 'tr[data-okf-field="priority"] [data-okf-edit-cell="value"]'
EDITORS = "[data-okf-frontmatter-editor]"


# @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
def check_frontmatter_click_below_editor(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """With the unchanged title editor open, a real press and release at one point on the priority value
  below it closes the title editor (the rows shift up on the press) and leaves the priority editor open."""
  if not scenario.get("frontmatterClickChecks"):
    return
  name = scenario["page"]
  title = page.locator(TITLE_CELL).first
  priority = page.locator(PRIORITY_CELL).first
  if title.count() == 0 or priority.count() == 0:
    failures.append(Failure(name, "frontmatter click: the title or priority value cell is missing"))
    return
  title.click()
  page.wait_for_selector(f"{EDITORS} textarea", timeout=3000)
  before = priority.bounding_box()
  x = before["x"] + before["width"] / 2
  y = before["y"] + before["height"] / 2
  page.mouse.move(x, y)
  page.mouse.down()
  page.mouse.up()
  page.wait_for_timeout(300)
  after = page.locator(PRIORITY_CELL).first.bounding_box()
  if after is None or before["y"] - after["y"] <= 20:
    failures.append(Failure(name, f"frontmatter click: closing the title editor did not move priority up (from {before['y']} to {after and after['y']}), the click crossed no shift"))
  rows = page.evaluate(f"""() => [...document.querySelectorAll('{EDITORS}')].map(editor => {{
    const row = editor.closest('tr[data-okf-field]');
    return row ? row.getAttribute('data-okf-field') : null;
  }})""")
  if rows != ["priority"]:
    failures.append(Failure(name, f"frontmatter click: after one click on the priority value below the open title editor, the open editors are on the fields {rows}, expected only ['priority']; the click was lost"))
