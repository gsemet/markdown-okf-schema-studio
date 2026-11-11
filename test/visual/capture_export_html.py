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
  table that opens on a click, tabs that switch, links, the embedded image and no review or editing control.
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

    export.locator(SECOND_LABEL).click()
    export.check_trace = page.check_trace
    export.step_recorder = page.step_recorder
    save_step(export, scenario, "export")
  finally:
    context.close()
