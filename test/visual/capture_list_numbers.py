"""The numbers of an ordered list while one of its items is edited (CR 424)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure


def rendered_list_numbers(page: Page) -> list[str]:
  """The list markers the browser draws, in page order, read from Chromium's accessibility tree:
  a hidden item has no marker there, so the numbers are the ones a reader sees."""
  session = page.context.new_cdp_session(page)
  try:
    nodes = session.send("Accessibility.getFullAXTree")["nodes"]
  finally:
    session.detach()
  return [
    str(node.get("name", {}).get("value", "")).strip()
    for node in nodes
    if not node.get("ignored") and node.get("role", {}).get("value") == "ListMarker"
    and str(node.get("name", {}).get("value", "")).strip()[:1].isdigit()
  ]


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
def check_ordered_item_keeps_numbers(page: Page, page_name: str, failures: list[Failure]) -> None:
  """A click on the second item of a four-item ordered list opens its editor; the items left in
  the list keep their source numbers 1, 3 and 4 in the rendered page, then Escape closes the
  editor and the list reads 1 to 4 again."""
  items = page.locator("main ol > li")
  if items.count() != 4:
    failures.append(Failure(page_name, f"the ordered list of the fixture has {items.count()} items, expected 4"))
    return
  before = rendered_list_numbers(page)
  if before != ["1.", "2.", "3.", "4."]:
    failures.append(Failure(page_name, f"the ordered list reads {before!r} before any edit, expected 1. to 4."))
    return
  second = items.nth(1)
  second.scroll_into_view_if_needed()
  second.click()
  editor = page.locator(".sphinx-preview-block-editor textarea")
  if editor.count() != 1 or editor.input_value().strip() != "2. Run the operations.":
    failures.append(Failure(page_name, "a click on the second ordered item did not open that item alone"))
    return
  during = rendered_list_numbers(page)
  if during != ["1.", "3.", "4."]:
    failures.append(Failure(
      page_name,
      f"while its second item is edited the ordered list reads {during!r}, expected ['1.', '3.', '4.']",
    ))
  editor.press("Escape")
  page.wait_for_timeout(200)
  if page.locator(".sphinx-preview-block-editor").count():
    failures.append(Failure(page_name, "Escape did not close the ordered item editor"))
    return
  after = rendered_list_numbers(page)
  if after != ["1.", "2.", "3.", "4."]:
    failures.append(Failure(page_name, f"after Escape the ordered list reads {after!r}, expected 1. to 4."))
