"""The `widthModeScrollChecks` scenario step: in Auto width a wide table keeps its sideways scroll across a layout pass."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure

TABLE = "#sphinx-myst-preview-content > table"

STATE = """() => {
  const table = document.querySelector('%s');
  return { left: Math.round(table.scrollLeft), max: table.scrollWidth - table.clientWidth,
    wide: table.getAttribute('data-sphinx-preview-wide') !== null };
}""" % TABLE

# Scrolls the table to its end at the moment the cell editor leaves the page, before the layout
# pass that the content resize of the close schedules for the next frame, then reads ten frames.
SCROLL_ON_CLOSE = """() => { window.__widthScrollFrames = new Promise((resolve) => {
  const observer = new MutationObserver(async () => {
    if (document.querySelector('[data-sphinx-preview-table-cell-editor]')) return;
    observer.disconnect();
    const table = document.querySelector('%s');
    table.scrollLeft = table.scrollWidth;
    const set = Math.round(table.scrollLeft);
    const frames = [];
    for (let index = 0; index < 10; index += 1) {
      await new Promise((next) => requestAnimationFrame(next));
      frames.push(Math.round(table.scrollLeft));
    }
    resolve({ set, frames });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}); }""" % TABLE


# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
def check_width_mode_scroll(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Auto width, edit mode: a table wider than the pane, scrolled sideways, keeps its scrollLeft when a
  layout pass measures it again: after a cell editor closes (Escape) and after a 3 px pane resize."""
  if not scenario.get("widthModeScrollChecks"):
    return
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-width-toggle]")
  for _ in range(3):
    if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == "auto":
      break
    button.click()
    page.wait_for_timeout(250)
  if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") != "auto":
    failures.append(Failure(page_name, "the Width button did not reach the auto mode"))
    return
  page.wait_for_timeout(300)
  if not page.evaluate(STATE)["wide"]:
    failures.append(Failure(page_name, "auto: the wide table did not break out"))
    return
  # Pass 1: the cell editor closes with Escape and the table is scrolled to its end right away.
  cell = page.locator(f"{TABLE} tbody tr:first-child td:nth-child(1)")
  cell.scroll_into_view_if_needed()
  cell.click()
  page.wait_for_selector("[data-sphinx-preview-table-cell-editor] textarea")
  page.wait_for_timeout(200)
  page.evaluate(SCROLL_ON_CLOSE)
  page.keyboard.press("Escape")
  closed = page.evaluate("window.__widthScrollFrames")
  page.wait_for_timeout(300)
  state = page.evaluate(STATE)
  if closed["set"] <= 0:
    failures.append(Failure(page_name, f"auto: the table did not scroll sideways after the cell editor closed ({closed})"))
  elif state["left"] < min(closed["set"], state["max"]) - 2:
    failures.append(Failure(page_name, f"auto: the wide table lost its sideways scroll after the cell editor closed: "
      f"scrollLeft {closed['set']} -> {state['left']} (max {state['max']}, frames {closed['frames']})"))
  # Pass 2: the table scrolled to its end, then the pane is 3 px narrower (window and content resize).
  page.evaluate("() => { const table = document.querySelector('%s'); table.scrollLeft = table.scrollWidth; }" % TABLE)
  page.wait_for_timeout(200)
  before = page.evaluate(STATE)
  viewport = page.viewport_size
  page.set_viewport_size({"width": viewport["width"] - 3, "height": viewport["height"]})
  page.wait_for_timeout(400)
  after = page.evaluate(STATE)
  page.set_viewport_size(viewport)
  page.wait_for_timeout(400)
  if before["left"] <= 0:
    failures.append(Failure(page_name, f"auto: the table did not scroll sideways ({before})"))
  elif after["left"] < min(before["left"], after["max"]) - 2:
    failures.append(Failure(page_name, f"auto: the wide table lost its sideways scroll after a 3 px pane resize: "
      f"scrollLeft {before['left']} -> {after['left']} (max {after['max']})"))
  # The screenshot shows the table scrolled to its end.
  page.evaluate("() => { const table = document.querySelector('%s'); table.scrollLeft = table.scrollWidth; }" % TABLE)
  page.wait_for_timeout(200)
