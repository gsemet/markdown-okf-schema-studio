"""The `exportHtml` scenario step (CR 288): the "Export to HTML" file of the scenario's page, opened with JavaScript off."""

from __future__ import annotations

import pathlib
import re
import urllib.parse
import urllib.request

from playwright.sync_api import Page

from capture_support import Failure, save_step

# What the file must not contain (script, external sheet, import, VS Code names, script URL, event handler).
FORBIDDEN = re.compile(r"<script|<link|@import|vscode-|javascript:| on[a-z]+=")

BACKGROUND = "() => getComputedStyle(document.body).backgroundColor"
CONTENT_WIDTH = "() => document.querySelector('#sphinx-myst-preview-content').getBoundingClientRect().width"

PROPERTIES = "#sphinx-myst-preview-content > details[data-okf-properties]"
TAB_SET = "#sphinx-myst-preview-content .myst-tab-set"
SECOND_LABEL = f"{TAB_SET} label.myst-tab[data-export-tab='2']"
FIRST_PANEL = f"{TAB_SET} .myst-tab-panel[data-export-tab='1']"
SECOND_PANEL = f"{TAB_SET} .myst-tab-panel[data-export-tab='2']"


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
# @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-091
def check_export_html(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Opens `<scenario>.export.html` (next to the page) in a context with JavaScript disabled and checks what
  a reader of the single file gets: no script, the preview's page colour and column width, a properties
  table that opens on a click, tabs that switch, links, the embedded image, the drawn Mermaid diagram with
  its folded source and no review or editing control.
  Saves a full-page shot as the `export` step."""
  export_file = scenario.get("exportFile")
  if not export_file:
    return
  name = scenario["id"]

  def fail(detail: str) -> None:
    failures.append(Failure(scenario["page"], f"{name} export: {detail}"))

  directory = pathlib.Path(urllib.request.url2pathname(urllib.parse.urlparse(page.url).path)).parent
  path = directory / export_file
  if not path.exists():
    fail(f"{export_file} was not written")
    return
  text = path.read_text(encoding="utf-8")
  for match in sorted({found.group(0) for found in FORBIDDEN.finditer(text)}):
    fail(f"the file contains {match!r}")

  preview_background = page.evaluate(BACKGROUND)
  preview_width = page.evaluate(CONTENT_WIDTH)
  context = page.context.browser.new_context(
    viewport={"width": scenario["width"], "height": scenario["height"]},
    device_scale_factor=2,
    java_script_enabled=False,
    reduced_motion="reduce",
  )
  try:
    export = context.new_page()
    export.goto(path.as_uri())
    if export.locator("script").count() != 0:
      fail("a script element is left")
    background = export.evaluate(BACKGROUND)
    if background in ("rgba(0, 0, 0, 0)", "transparent") or background != preview_background:
      fail(f"the page background is {background}, the preview's is {preview_background}")
    width = export.evaluate(CONTENT_WIDTH)
    if abs(width - preview_width) > 1:
      fail(f"the content column is {width:.1f} px wide, the preview's is {preview_width:.1f} px")

    edited_cell = scenario.get("exportEditedCell")
    if edited_cell:
      check_edited_cell(export, edited_cell, fail)
    else:
      check_export_fixture(export, fail)
    export.check_trace = page.check_trace
    export.step_recorder = page.step_recorder
    save_step(export, scenario, "export")
  finally:
    context.close()


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
def check_edited_cell(export: Page, cell_text: str, fail) -> None:
  """CR 310: the file of a page exported while a table cell editor was open shows the cell's text (visible,
  with a height), wrapped in nothing that hides it, with no editor control or hidden wrapper left."""
  cell = export.locator("#sphinx-myst-preview-content td", has_text=cell_text)
  if cell.count() != 1:
    fail(f"expected one table cell with {cell_text!r}, found {cell.count()}")
    return
  box = cell.first.bounding_box()
  if not cell.first.is_visible() or box is None or box["height"] <= 0:
    fail(f"the edited cell {cell_text!r} is not visible in the file")
  text = cell.first.locator("xpath=descendant-or-self::*[normalize-space(text())]", has_text=cell_text)
  if text.count() == 0 or not text.last.is_visible():
    fail(f"the text {cell_text!r} of the edited cell is hidden")
  if export.locator("[data-sphinx-table-cell-content], [aria-hidden='true'], textarea, button, [data-sphinx-preview-block-editor]").count() != 0:
    fail("an editor control or a hidden wrapper is left in the file")


def check_export_fixture(export: Page, fail) -> None:
  """The checks written for the export fixture (87): properties, tabs, links, image, Mermaid, no control."""
  properties = export.locator(PROPERTIES)
  if properties.count() != 1:
    fail(f"expected one properties details, found {properties.count()}")
  else:
    if export.evaluate(f"() => document.querySelector({PROPERTIES!r}).open"):
      fail("the properties details starts open")
    export.locator(f"{PROPERTIES} > summary").click()
    if not export.evaluate(f"() => document.querySelector({PROPERTIES!r}).open"):
      fail("a click on the properties summary does not open it")
    if not export.locator(f"{PROPERTIES} thead th", has_text="Description").first.is_visible():
      fail("the opened properties table shows no Description column")

  if export.locator(FIRST_PANEL).count() != 1 or export.locator(SECOND_PANEL).count() != 1:
    fail("the tab set does not have its two panels")
  else:
    if not export.locator(FIRST_PANEL).is_visible() or export.locator(SECOND_PANEL).is_visible():
      fail("the first tab is not the only one shown when the file opens")
    export.locator(SECOND_LABEL).click()
    if export.locator(FIRST_PANEL).is_visible() or not export.locator(SECOND_PANEL).is_visible():
      fail("a click on the second tab label does not show the second panel in place of the first")

  if export.locator("a[href='https://example.com/guide']").count() != 1:
    fail("the external link lost its address")
  if export.locator("a[href$='.md']").count() != 0 or export.locator("a", has_text="link to another page").count() != 0:
    fail("the link to another file is still a link")
  if export.locator("p", has_text="link to another page").count() != 1:
    fail("the text of the link to another file is gone")
  if export.locator("[data-okf-comment-kind]").count() != 0 or "confirm the checklist" in export.content():
    fail("a review comment is left")
  if export.locator("button").count() != 0:
    fail(f"{export.locator('button').count()} button elements are left")
  sources = export.locator("img").evaluate_all("images => images.map((image) => image.getAttribute('src') || '')")
  if not sources or not all(source.startswith("data:") for source in sources):
    fail(f"the images are not all embedded data: {[source[:30] for source in sources]}")

  diagram = export.locator("img.myst-mermaid-image")
  if diagram.count() != 1:
    fail(f"expected one drawn Mermaid image, found {diagram.count()}")
  else:
    if not (diagram.get_attribute("src") or "").startswith("data:image/svg+xml"):
      fail("the Mermaid image is not an embedded SVG")
    if not diagram.is_visible() or diagram.evaluate("image => image.naturalWidth") == 0:
      fail("the Mermaid image does not show")
  source = export.locator("details.myst-mermaid-source")
  if source.count() != 1 or export.evaluate("() => document.querySelector('details.myst-mermaid-source').open"):
    fail("the Mermaid source is not in one closed details")
  elif "flowchart LR" not in (source.text_content() or ""):
    fail("the folded Mermaid source lost its text")
  if export.locator(".myst-mermaid-diagram", has_text="flowchart LR").count() != 0:
    fail("the Mermaid source is shown in the diagram")

  export.locator(SECOND_LABEL).click()
