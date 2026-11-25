"""The reorder handles of list items in edit mode, and a real drag of one (CR 432)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure

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

# The bullet list of the drag: the list that holds `third-bullet-item`.
BULLET_LIST = """[...document.querySelectorAll('#sphinx-myst-preview-content li')]
    .find((item) => item.textContent.trim() === 'third-bullet-item')?.parentElement"""

# The texts of the bullet list's items, in page order.
BULLETS = f"""() => {{
  const list = {BULLET_LIST};
  return list ? [...list.children].map((item) => item.textContent.trim()) : [];
}}"""

# Where the marks of a held drag are in the bullet list: the index of the dimmed item, of the item
# with the drop line and the side of that line (-1 and null when absent).
HELD_MARKS = f"""() => {{
  const list = {BULLET_LIST};
  if (!list) return {{ missing: true }};
  const items = [...list.children];
  const drop = items.findIndex((item) => item.hasAttribute('data-okf-list-item-drop'));
  return {{
    dragging: items.findIndex((item) => item.getAttribute('data-okf-list-item-dragging') === 'true'),
    drop,
    side: drop < 0 ? null : items[drop].getAttribute('data-okf-list-item-drop'),
  }};
}}"""

# The render of the host after the save: the same page with the first bullet item moved last.
PATCH = f"""() => {{
  const root = document.getElementById('sphinx-myst-preview-content');
  const html = document.documentElement;
  const marker = 'data-okf-visual-bullet-list';
  const live = {BULLET_LIST};
  live.setAttribute(marker, '');
  const template = document.createElement('template');
  template.innerHTML = root.innerHTML;
  live.removeAttribute(marker);
  // A fresh render carries none of the marks of edit mode.
  template.content.querySelectorAll('[data-okf-list-shift]').forEach((block) => block.removeAttribute('data-okf-list-shift'));
  const list = template.content.querySelector(`[${{marker}}]`);
  list.removeAttribute(marker);
  list.append(list.firstElementChild);
  const version = Number(html.getAttribute('data-sphinx-preview-document-version'));
  const request = Number(html.getAttribute('data-sphinx-preview-request-id'));
  window.dispatchEvent(new MessageEvent('message', {{ data: {{
    type: 'previewContentPatch',
    documentId: html.getAttribute('data-sphinx-preview-document-id'),
    revision: version, requestId: request,
    next: {{ revision: version + 1, requestId: request + 1 }},
    contentHtml: template.innerHTML, status: 'success', label: 'Preview ready', diagnostics: [],
  }} }}));
}}"""


def _drag_first_over_third(page: Page, scenario: dict, failures: list[Failure], first: str) -> bool:
  """A real mouse drag of the handle of the bullet item `first` (the first of its list), held over
  the lower half of the third item of the list. The button stays pressed."""
  line = page.evaluate(f"""() => [...document.querySelectorAll('#sphinx-myst-preview-content li')]
    .find((item) => item.textContent.trim() === {first!r})?.getAttribute('data-sphinx-source-line') ?? ''""")
  handle = page.locator(f'{HANDLES}[data-okf-list-item-line="{line}"]').first
  target = page.locator(f"{CONTENT} li").filter(has_text="-bullet-item").nth(2)
  if not line or handle.count() == 0 or target.count() == 0:
    failures.append(Failure(scenario["page"], f"list item drag: the handle of {first} or the third bullet item is missing"))
    return False
  from_box = handle.bounding_box()
  to_box = target.bounding_box()
  page.mouse.move(from_box["x"] + from_box["width"] / 2, from_box["y"] + from_box["height"] / 2)
  page.mouse.down()
  page.mouse.move(from_box["x"] + 20, from_box["y"] + 10, steps=4)
  # The pointer ends in the lower half of the third item: the first lands after it.
  page.mouse.move(to_box["x"] + 60, to_box["y"] + to_box["height"] * 0.8, steps=12)
  page.wait_for_timeout(150)
  return True


def check_list_item_drag_held(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """At capture, the drag of a `drag` scenario is still held: the first bullet item dimmed and the
  drop line after the third."""
  if scenario.get("listItemHandleChecks") != "drag":
    return
  marks = page.evaluate(HELD_MARKS)
  if marks.get("dragging") != 0 or marks.get("drop") != 2 or marks.get("side") != "after":
    failures.append(Failure(scenario["page"], f"list item drag: at capture, the marks of the held drag are {marks}"))


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


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S1
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S3
def check_list_item_handles(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """`place`: every item of a list of two or more items has a handle left of its list (or of the
  outermost container), inside the pane, centred on its first line. `push`: the same in a pane with
  no room on the left, where a block is pushed right. `drag`: a real drag held over the third item
  dims the dragged one and draws the drop line, and the release saves the list once, reordered;
  once the host renders it, a second drag stays held for the capture (the scenario's PNG)."""
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
  # First a drag released over the third item: one save, in the new order, and no editor.
  page.evaluate("window.visualMessages.length = 0")
  if not _drag_first_over_third(page, scenario, failures, "first-bullet-item"):
    return
  marks = page.evaluate(HELD_MARKS)
  if marks.get("dragging") != 0 or marks.get("drop") != 2 or marks.get("side") != "after":
    failures.append(Failure(page_name, f"list item drag: held over the third item, the marks are {marks}"))
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
  # The page refuses a drag until the render of the saved list arrives: the host renders it.
  page.evaluate(PATCH)
  page.wait_for_timeout(400)
  rendered = page.evaluate(BULLETS)
  if rendered != ["second-bullet-item", "third-bullet-item", "first-bullet-item"]:
    failures.append(Failure(page_name, f"list item drag: the rendered list reads {rendered}"))
    return
  # Then a drag held down for the capture (the button stays pressed): the first item dimmed and the
  # drop line below the third. check_final_frame checks the marks again just before the screenshot.
  if not _drag_first_over_third(page, scenario, failures, "second-bullet-item"):
    return
  marks = page.evaluate(HELD_MARKS)
  if marks.get("dragging") != 0 or marks.get("drop") != 2 or marks.get("side") != "after":
    failures.append(Failure(page_name, f"list item drag: held for the capture, the marks are {marks}"))
