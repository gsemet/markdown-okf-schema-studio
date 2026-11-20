"""The reorder handles of list items in edit mode, and a real drag of one (CR 432)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

HANDLES = "[data-okf-list-handle-layer] .okf-list-item-handle"
CONTENT = "#sphinx-myst-preview-content"

# Each handle against its item and the box it must stay left of: the list, or the outermost quote,
# alert or admonition that holds it. The middle of the item's first line is read on its first text.
PLACEMENT = """() => {
  const content = document.getElementById('sphinx-myst-preview-content');
  const containers = '[data-okf-github-alert], aside.admonition, details.admonition, blockquote';
  const middleOfFirstLine = (item) => {
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
    const text = walker.nextNode();
    if (!text) return undefined;
    const range = document.createRange();
    range.selectNodeContents(text);
    const first = range.getClientRects()[0];
    return first ? first.top + first.height / 2 : undefined;
  };
  return [...document.querySelectorAll('[data-okf-list-handle-layer] .okf-list-item-handle')].map((handle) => {
    const line = handle.getAttribute('data-okf-list-item-line');
    const item = content.querySelector(`li[data-sphinx-source-line="${line}"]`);
    if (!item) return { line, missing: true };
    let column = item.parentElement;
    for (let at = column.parentElement; at && at !== content; at = at.parentElement) {
      if (at.matches(containers)) column = at;
    }
    const own = handle.getBoundingClientRect();
    const middle = middleOfFirstLine(item);
    return {
      line,
      text: item.textContent.trim().split(/\\s+/u)[0],
      gap: column.getBoundingClientRect().left - own.right,
      left: own.left,
      right: own.right,
      centre: middle === undefined ? 99 : Math.abs((own.top + own.height / 2) - middle),
    };
  });
}"""

# The items whose list gets handles in the fixture `90-list-item-handles`: every list has two items
# or more, none is included or in the properties table.
EXPECTED_HANDLES = 15


def _check_placement(page: Page, scenario: dict, failures: list[Failure]) -> None:
  page_name = scenario["page"]
  handles = page.evaluate(PLACEMENT)
  if len(handles) != EXPECTED_HANDLES:
    failures.append(Failure(page_name, f"list item handles: {len(handles)} handles, {EXPECTED_HANDLES} expected"))
  width = page.evaluate("document.documentElement.clientWidth")
  for handle in handles:
    if handle.get("missing"):
      failures.append(Failure(page_name, f"list item handles: no item on line {handle['line']}"))
      continue
    where = f"the handle of {handle['text']}"
    if handle["gap"] < -0.5:
      failures.append(Failure(page_name, f"list item handles: {where} overlaps its list or container by {-handle['gap']:.1f} px"))
    if handle["left"] < 0 or handle["right"] > width:
      failures.append(Failure(page_name, f"list item handles: {where} leaves the pane ({handle['left']:.1f}..{handle['right']:.1f})"))
    if handle["centre"] > 2:
      failures.append(Failure(page_name, f"list item handles: {where} is {handle['centre']:.1f} px off its first line"))


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
def check_list_item_handles(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """`place`: every item of a list of two or more items has a handle left of its list (or of the
  outermost container), inside the pane, centred on its first line. `push`: the same in a pane with
  no room on the left, where a block is pushed right. `drag`: a real drag held over the third item
  dims the dragged one and draws the drop line, and the release saves the list once, reordered."""
  mode = scenario.get("listItemHandleChecks")
  if not mode:
    return
  page_name = scenario["page"]
  page.wait_for_timeout(200)
  _check_placement(page, scenario, failures)
  if mode == "push":
    if page.locator(f'{CONTENT} [data-okf-list-shift="true"]').count() == 0:
      failures.append(Failure(page_name, "list item handles: no block is pushed right in a pane with no room on the left"))
    return
  if mode != "drag":
    return
  page.evaluate("window.visualMessages.length = 0")
  line = page.evaluate("""() => [...document.querySelectorAll('#sphinx-myst-preview-content li')]
    .find((item) => item.textContent.trim() === 'first-bullet-item')?.getAttribute('data-sphinx-source-line') ?? ''""")
  handle = page.locator(f'{HANDLES}[data-okf-list-item-line="{line}"]').first
  target = page.locator(f"{CONTENT} li", has_text="third-bullet-item").first
  if handle.count() == 0 or target.count() == 0:
    failures.append(Failure(page_name, "list item drag: the first handle or the third bullet item is missing"))
    return
  from_box = handle.bounding_box()
  to_box = target.bounding_box()
  page.mouse.move(from_box["x"] + from_box["width"] / 2, from_box["y"] + from_box["height"] / 2)
  page.mouse.down()
  page.mouse.move(from_box["x"] + 20, from_box["y"] + 10, steps=4)
  # The pointer ends in the lower half of the third item: the first lands after it.
  page.mouse.move(to_box["x"] + 60, to_box["y"] + to_box["height"] * 0.8, steps=12)
  page.wait_for_timeout(150)
  held = page.evaluate("""() => {
    const first = [...document.querySelectorAll('#sphinx-myst-preview-content li')]
      .find((item) => item.textContent.trim() === 'first-bullet-item');
    if (!first) return [];
    const items = [...first.parentElement.children];
    return items.map((item) => [item.getAttribute('data-okf-list-item-dragging'), item.getAttribute('data-okf-list-item-drop')]);
  }""")
  save_step(page, scenario, "drag")
  if not held or held[0][0] != "true" or held[2][1] != "after":
    failures.append(Failure(page_name, f"list item drag: held over the third item, the marks are {held}"))
  page.mouse.up()
  page.wait_for_timeout(300)
  saves = page.evaluate("window.visualMessages.filter(m => m.type === 'previewEditSave')")
  if len(saves) != 1:
    failures.append(Failure(page_name, f"list item drag: the drop must save the list once, saved {len(saves)}"))
    return
  order = [line.strip() for line in saves[0]["editedText"].splitlines() if line.strip()]
  if order != ["- second-bullet-item", "- third-bullet-item", "- first-bullet-item"]:
    failures.append(Failure(page_name, f"list item drag: the saved list reads {order}"))
  if page.locator(".sphinx-preview-block-editor").count() != 0:
    failures.append(Failure(page_name, "list item drag: the drag opened a block editor"))
