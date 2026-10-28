"""Check of the Edit figure button next to the five-row preview controls in a narrow pane (CR 161)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step


# @tests_req SwRS-MDOKFSTUDIO-PALETTE-153
def check_edit_figure_button(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """In a pane about 420 px wide a short figure near the top ends above the bottom of the preview
  controls: the press on the Edit figure button must reach the button, the form it opens must start
  below the palette."""
  if not scenario.get("figureButton"):
    return
  page_name = scenario["page"]
  probe = """() => {
    const button = document.querySelector('.sphinx-preview-figure-edit-button');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();
    const r = button.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const f = document.querySelector('figure').getBoundingClientRect();
    return {
      button: { top: r.top, left: r.left, right: r.right },
      toolbar: { top: toolbar.top, bottom: toolbar.bottom, left: toolbar.left },
      figure: { top: f.top, bottom: f.bottom },
      hit: hit ? (hit.hasAttribute('data-sphinx-figure-edit') ? 'edit-button' : hit.tagName + ':' + (hit.getAttribute('title') || '')) : null,
    };
  }"""
  for offset in (60, 140):
    figure = page.locator("figure").first
    figure.evaluate("(element, offset) => window.scrollBy(0, element.getBoundingClientRect().top - offset)", offset)
    page.wait_for_timeout(150)
    page.mouse.move(0, 0)
    page.wait_for_timeout(100)
    box = figure.bounding_box()
    page.mouse.move(box["x"] + 20, max(box["y"], 0) + 20, steps=4)
    page.wait_for_timeout(200)
    geometry = page.evaluate(probe)
    if offset == 60:
      save_step(page, scenario, "figure", caret="hide")
    if geometry["hit"] != "edit-button":
      failures.append(Failure(page_name, f"Edit figure button (figure at {offset}): the press lands on {geometry['hit']}, not on the button: {geometry}"))
      continue
    page.locator(".sphinx-preview-figure-edit-button:not([hidden])").click(timeout=5000)
    page.locator("[data-sphinx-preview-block-editor] [role=dialog]").wait_for(state="visible", timeout=5000)
    page.wait_for_timeout(500)
    rows = page.evaluate("""() => ({
      palette: document.querySelector('.sphinx-preview-edit-palette').getBoundingClientRect().bottom,
      dialog: document.querySelector('[data-sphinx-preview-block-editor] [role=dialog]').getBoundingClientRect().top,
    })""")
    if rows["palette"] > rows["dialog"] + 0.5:
      failures.append(Failure(page_name, f"figure form via the button (figure at {offset}): the palette's bottom {rows['palette']:.1f} is below the form's top {rows['dialog']:.1f}"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)
    if page.locator("[data-sphinx-preview-block-editor]").count():
      page.keyboard.press("Escape")
      page.wait_for_timeout(200)
