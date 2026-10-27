"""Edition palette, table cell and preview edit mode checks of the screenshot campaign."""

from __future__ import annotations

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError

from capture_support import Failure, save_step


# @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
def check_edit_palette_clearance(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """CR 123: in a narrow pane the palette wraps onto several rows; the text box and the figure form
  inside the frame start below it, at the top of the page and slightly scrolled."""
  if not scenario.get("paletteClearance"):
    return
  page_name = scenario["page"]
  measure = """() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    };
    return {
      palette: box('.sphinx-preview-edit-palette'),
      frame: box('[data-sphinx-preview-block-editor]'),
      textarea: box('[data-sphinx-preview-block-editor] textarea'),
      dialog: box('[data-sphinx-preview-block-editor] [role=dialog]'),
      scrollY: window.scrollY,
    };
  }"""

  def close_editor() -> None:
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)
    if page.locator("[data-sphinx-preview-block-editor]").count():
      page.locator("[data-sphinx-preview-block-editor] [data-sphinx-block-cancel], [data-sphinx-preview-block-editor] button:has-text('Cancel')").first.click()
      page.wait_for_timeout(200)

  def check(name: str, step: str, first_line: str, shoot: bool) -> None:
    page.wait_for_timeout(500)
    geometry = page.evaluate(measure)
    if not geometry["palette"] or not geometry[first_line]:
      failures.append(Failure(page_name, f"{name}: no palette or no {first_line} was measured: {geometry}"))
      return
    if geometry["palette"]["height"] < 50:
      failures.append(Failure(page_name, f"{name}: the palette did not wrap ({geometry['palette']['height']} px)"))
    if geometry["palette"]["bottom"] > geometry[first_line]["top"] + 0.5:
      failures.append(Failure(
        page_name,
        f"{name}: the palette's bottom edge {geometry['palette']['bottom']:.1f} is below the top of the {first_line} "
        f"{geometry[first_line]['top']:.1f}: {geometry}",
      ))
    if geometry["frame"] and geometry["palette"]["bottom"] > geometry["frame"]["top"] + 0.5:
      failures.append(Failure(page_name, f"{name}: the palette covers the top of the frame: {geometry}"))
    if shoot:
      page.mouse.move(2, 2)
      save_step(page, scenario, step, caret="hide")

  def bring_to_top(locator, offset: int) -> None:
    """Scrolls the page so the block's top is `offset` px under the top of the viewport."""
    locator.evaluate("(element, offset) => window.scrollBy(0, element.getBoundingClientRect().top - offset)", offset)
    page.wait_for_timeout(150)

  if scenario["paletteClearance"] == "first-paragraph":
    # The user's case (CR 112 evidence): the paragraph under the title, opened at the top of the page.
    page.locator("main p").first.click()
    page.locator("[data-sphinx-preview-block-editor] textarea").wait_for(state="visible")
    check("text area (paragraph under the title)", "text", "textarea", True)
    close_editor()
    return

  check_tall_block_scrolled(page, scenario, failures, close_editor, bring_to_top)

  # The block sits 20, 60 and 140 px under the top of the pane: the palette's own place is above the
  # line under the toolbar, so it rides down over the frame unless the frame reserves that distance.
  # The figure also opens already scrolled (its top 100 px above the line: a tall block in the
  # middle of the page) and through the Edit figure button of the hovered figure.
  for offset in (20, 60, 140):
    paragraph = page.locator("main p", has_text="Wrapped paragraphs keep their caret")
    bring_to_top(paragraph, offset)
    paragraph.click()
    page.locator("[data-sphinx-preview-block-editor] textarea").wait_for(state="visible")
    check(f"text area (block at {offset})", "text", "textarea", offset == 20)
    close_editor()
  for offset, how in ((20, "palette"), (60, "palette"), (140, "palette"), (-100, "palette"), (20, "button"), (60, "button"), (140, "button")):
    figure = page.locator("figure").first
    bring_to_top(figure, offset)
    if how == "palette":
      figure.click()
      page.locator("[data-sphinx-preview-block-editor] textarea").wait_for(state="visible")
      page.locator(".sphinx-preview-edit-palette [data-edit-action='figure']").click()
    else:
      page.mouse.move(2, 2)
      page.wait_for_timeout(100)
      box = figure.bounding_box()
      page.mouse.move(box["x"] + box["width"] / 2, max(box["y"], 0) + 40, steps=4)
      page.wait_for_timeout(200)
      page.locator(".sphinx-preview-figure-edit-button:not([hidden])").click()
    try:
      page.locator("[data-sphinx-preview-block-editor] [role=dialog]").wait_for(state="visible", timeout=5000)
    except PlaywrightTimeoutError:
      failures.append(Failure(page_name, f"figure form via {how} (block at {offset}): the form did not open: "
        + str(page.evaluate("() => [document.querySelectorAll('[data-sphinx-preview-block-editor]').length, document.querySelectorAll('[role=dialog]').length, window.scrollY]"))))
      close_editor()
      continue
    first_line = "dialog"
    check(f"figure form via {how} (block at {offset})", "figure", first_line, offset == 20 and how == "palette")
    close_editor()


# The rendered rows of the tall code block: viewport top and bottom of each "Tall line NN".
TALL_ROWS = """(pre) => {
  const code = pre.querySelector('code') || pre;
  const rows = [];
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const pattern = /Tall line (\\d\\d)/g;
    let match;
    while ((match = pattern.exec(node.textContent))) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + 1);
      const r = range.getBoundingClientRect();
      rows.push({ index: Number(match[1]), top: r.top, bottom: r.bottom });
    }
  }
  return rows;
}"""

# The same row in the editor's text box: its viewport top, from the box's line height.
TALL_ROW_IN_EDITOR = """(index) => {
  const textarea = document.querySelector('[data-sphinx-preview-block-editor] textarea');
  const palette = document.querySelector('.sphinx-preview-edit-palette').getBoundingClientRect();
  const style = getComputedStyle(textarea);
  const row = textarea.value.split('\\n').findIndex((line) => line.startsWith('Tall line ' + String(index).padStart(2, '0')));
  const box = textarea.getBoundingClientRect();
  const lineHeight = parseFloat(style.lineHeight);
  const top = box.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop) + row * lineHeight - textarea.scrollTop;
  return { row, rowTop: top, lineHeight, paletteTop: palette.top, paletteBottom: palette.bottom,
    textareaTop: box.top, textareaHeight: box.height, textareaScroll: textarea.scrollTop, scrollY: window.scrollY };
}"""


# @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
def check_tall_block_scrolled(page: Page, scenario: dict, failures: list[Failure], close_editor, bring_to_top) -> None:
  """CR 123, the user's rule for a block taller than the pane: opened with its top scrolled above the
  viewport, the row the user clicked stays where it was (the bar sticks at the top of the pane and
  may cover the first lines), and scrolling down with the wheel never moves the page back up while
  the bar stays on its sticking line."""
  page_name = scenario["page"]
  tall = page.locator("main pre", has_text="Tall line 01").first
  bring_to_top(tall, -150)
  # The top of the reading area: under the sticky heading band.
  reading_top = page.evaluate("""() => {
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    return band && !band.hidden ? Math.max(0, band.getBoundingClientRect().bottom) : 0;
  }""")
  rows = [row for row in tall.evaluate(TALL_ROWS) if row["top"] >= reading_top + 150]
  if not rows:
    failures.append(Failure(page_name, "tall block: no rendered row was measured in the reading area"))
    return
  clicked = rows[0]
  box = tall.bounding_box()
  page.mouse.click(box["x"] + 60, (clicked["top"] + clicked["bottom"]) / 2)
  page.locator("[data-sphinx-preview-block-editor] textarea").wait_for(state="visible")
  page.wait_for_timeout(500)
  after = page.evaluate(TALL_ROW_IN_EDITOR, clicked["index"])
  bar_height = after["paletteBottom"] - after["paletteTop"]
  if after["row"] < 0 or abs(after["rowTop"] - clicked["top"]) >= bar_height or after["rowTop"] < after["paletteBottom"]:
    failures.append(Failure(
      page_name,
      f"tall block scrolled: the clicked row (Tall line {clicked['index']:02d}, at {clicked['top']:.1f} before "
      f"opening) moved to {after['rowTop']:.1f} (by a bar height or more, or under the bar): {after}",
    ))
  page.mouse.move(2, 2)
  save_step(page, scenario, "tall", caret="hide")
  page.mouse.move(box["x"] + 60, 400)
  previous = page.evaluate("() => window.scrollY")
  for step in range(1, 7):
    page.mouse.wheel(0, 120)
    page.wait_for_timeout(200)
    now = page.evaluate("""() => {
      const palette = document.querySelector('.sphinx-preview-edit-palette');
      const bar = palette.getBoundingClientRect();
      const frame = document.querySelector('[data-sphinx-preview-block-editor]').getBoundingClientRect();
      return { scrollY: window.scrollY, top: bar.top, stuckAt: parseFloat(getComputedStyle(palette).top),
        spans: frame.top < bar.top && frame.bottom > bar.bottom + 40 };
    }""")
    if now["scrollY"] < previous - 1:
      failures.append(Failure(page_name, f"tall block: wheel step {step} moved the page back up from {previous} to {now['scrollY']}"))
      break
    if now["spans"] and abs(now["top"] - now["stuckAt"]) > 2:
      failures.append(Failure(page_name, f"tall block: wheel step {step} left the bar off its sticking line: {now}"))
      break
    previous = now["scrollY"]
  close_editor()


# @tests_req SwRS-MDOKFSTUDIO-PALETTE-031
def check_edit_palette(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """T21: the edition palette above an open block editor."""
  if not scenario.get("editPalette"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  paragraph = page.locator("main > p[data-sphinx-source-line]").nth(3)
  paragraph.evaluate("element => element.scrollIntoView({ block: 'center' })")
  page.wait_for_timeout(150)
  before = paragraph.evaluate("element => element.getBoundingClientRect().top")
  paragraph.click()
  editor = page.locator(".sphinx-preview-block-editor")
  page.wait_for_timeout(250)
  if editor.count() != 1 or not editor.is_visible():
    failures.append(Failure(page_name, "clicking a paragraph did not open its framed editor"))
    return
  palette = page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette")
  if palette.count() != 1 or not palette.is_visible():
    failures.append(Failure(page_name, "the open editor shows no edition palette"))
    return
  geometry = editor.evaluate("""element => {
    // P4: the palette is the frame's previous sibling, in the same host, outside the edit box.
    const bar = element.parentElement.querySelector(':scope > .sphinx-preview-edit-palette');
    const area = element.querySelector('textarea');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const frame = element.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    const t = toolbar ? toolbar.getBoundingClientRect() : null;
    // The colour-code swatch button is hidden unless the caret is in a colour code.
    const buttons = [...bar.querySelectorAll(':scope > button:not([hidden])')].map((button) => {
      const r = button.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    return {
      first: element.previousElementSibling === bar && !element.contains(bar),
      barTop: b.top, barBottom: b.bottom, barLeft: b.left, barRight: b.right, barHeight: b.height,
      areaTop: a.top, frameLeft: frame.left, frameRight: frame.right, frameTop: frame.top,
      toolbarBottom: t ? t.bottom : 0, toolbarLeft: t ? t.left : 0, toolbarRight: t ? t.right : 0,
      buttons, scrollWidth: bar.scrollWidth, clientWidth: bar.clientWidth,
      labels: [...bar.querySelectorAll(':scope > button')].map((button) => button.dataset.editAction),
    };
  }""")
  if not geometry["first"]:
    failures.append(Failure(page_name, "the palette is not on top of the edit box (previous sibling, outside the frame)"))
  expected = ["heading", "bold", "italic", "strikethrough", "color", "colorCode", "link", "image", "codeFence", "quote", "rule", "table", "emoji", "todo", "thread", "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd", "admonition", "deflist", "math", "sub", "sup", "label", "ref", "doc", "cite", "dropdown", "tableCaption", "listTable", "pipeTable", "figure", "roleKbd"]
  if geometry["labels"] != expected:
    failures.append(Failure(page_name, f"palette buttons are {geometry['labels']}, expected {expected}"))
  if geometry["barBottom"] > geometry["frameTop"] + 0.5 or geometry["frameTop"] - geometry["barBottom"] > 6:
    failures.append(Failure(page_name, f"the palette is not attached on top of the edit box: {geometry}"))
  overlaps_toolbar_row = (
    geometry["barLeft"] < geometry["toolbarRight"] and geometry["barRight"] > geometry["toolbarLeft"]
  )
  if overlaps_toolbar_row and geometry["barTop"] < geometry["toolbarBottom"] - 0.5:
    failures.append(Failure(page_name, f"the palette is under the toolbar: {geometry}"))
  if geometry["barRight"] > geometry["frameRight"] + 0.5 or geometry["scrollWidth"] > geometry["clientWidth"] + 1:
    failures.append(Failure(page_name, f"the palette overflows the editor frame: {geometry}"))
  for button in geometry["buttons"]:
    if button["right"] > geometry["frameRight"] + 0.5 or button["left"] < geometry["frameLeft"] - 0.5:
      failures.append(Failure(page_name, f"a palette button leaves the frame: {button}"))
      break
  if scenario["width"] <= 400:
    rows = {round(button["top"]) for button in geometry["buttons"]}
    if len(rows) < 2:
      failures.append(Failure(page_name, f"the palette did not wrap at {scenario['width']} px: {geometry}"))
  # The clicked text keeps its place: only the frame border and padding separate it from the
  # old paragraph top, never the height of the bar.
  moved = geometry["areaTop"] - before
  if abs(moved) > 12:
    failures.append(Failure(
      page_name,
      f"opening the editor moved the text by {moved:.1f}px (bar height {geometry['barHeight']:.1f}px)",
    ))

  # A press on the bar's own padding keeps the editor open.
  palette.click(position={"x": 1.5, "y": geometry["barHeight"] / 2})
  page.wait_for_timeout(150)
  if editor.count() != 1 or not editor.locator("textarea").is_visible():
    failures.append(Failure(page_name, "clicking the palette's edge closed the editor"))
    return

  # A button keeps the editor open and the focus in the text box.
  area = editor.locator("textarea")
  area.focus()
  area.press("ControlOrMeta+a")
  palette.locator("button[data-edit-action='bold']").click()
  page.wait_for_timeout(150)
  state = page.evaluate("""() => {
    const area = document.querySelector('.sphinx-preview-block-editor textarea');
    return { open: Boolean(area), focused: document.activeElement === area,
      value: area ? area.value : '' };
  }""")
  if not state["open"] or not state["focused"]:
    failures.append(Failure(page_name, f"clicking Bold closed the editor or lost the focus: {state}"))
  elif not (state["value"].startswith("**") and state["value"].rstrip().endswith("**")):
    failures.append(Failure(page_name, f"clicking Bold did not wrap the text: {state['value'][:60]!r}"))
  area.press("ControlOrMeta+z")
  page.wait_for_timeout(100)
  if editor.locator("textarea").input_value().startswith("**"):
    failures.append(Failure(page_name, "Undo after Bold did not restore the text"))
  page.mouse.move(2, 2)
  save_step(page, scenario, "bar", caret="hide")

  # The heading list opens inside the frame, Escape closes it and leaves the editor open.
  palette.locator("button[data-edit-action='heading']").click()
  menu = page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu")
  page.wait_for_timeout(150)
  if menu.count() != 1 or not menu.is_visible():
    failures.append(Failure(page_name, "the heading list did not open"))
  else:
    box = menu.evaluate("""element => {
      const r = element.getBoundingClientRect();
      const f = element.closest('.sphinx-preview-block-editor-host').getBoundingClientRect();
      return { left: r.left, right: r.right, frameLeft: f.left, frameRight: f.right };
    }""")
    if box["left"] < box["frameLeft"] - 0.5 or box["right"] > box["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the heading list leaves the editor frame: {box}"))
  save_step(page, scenario, "menu", caret="hide")
  page.keyboard.press("Escape")
  page.wait_for_timeout(100)
  if page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu").count() != 0:
    failures.append(Failure(page_name, "Escape did not close the heading list"))
  if editor.count() != 1:
    failures.append(Failure(page_name, "Escape with a heading list open closed the editor"))
    return

  # T24: the Table button opens a 9 x 9 grid; hovering 3 x 4 lights 12 cells and shows the size.
  palette.locator("button[data-edit-action='table']").click()
  grid = page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu[data-edit-popover='grid']")
  page.wait_for_timeout(150)
  if grid.count() != 1 or not grid.is_visible():
    failures.append(Failure(page_name, "the table grid did not open"))
  else:
    grid.locator("[data-grid-row='3'][data-grid-col='4']").hover()
    page.wait_for_timeout(100)
    grid_state = grid.evaluate("""element => {
      const f = element.closest('.sphinx-preview-block-editor-host').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const lit = [...element.querySelectorAll('[data-grid-on]')];
      const off = element.querySelector('[data-grid-row="4"][data-grid-col="1"]');
      const on = element.querySelector('[data-grid-row="3"][data-grid-col="4"]');
      return {
        cells: element.querySelectorAll('[data-grid-row]').length, lit: lit.length,
        label: element.querySelector('.sphinx-preview-edit-grid-label').textContent,
        onColor: getComputedStyle(on).backgroundColor, offColor: getComputedStyle(off).backgroundColor,
        left: r.left, right: r.right, frameLeft: f.left, frameRight: f.right,
      };
    }""")
    if grid_state["cells"] != 81 or grid_state["lit"] != 12 or grid_state["label"] != "3 \u00d7 4":
      failures.append(Failure(page_name, f"hovering 3 x 4 did not light 12 of 81 cells: {grid_state}"))
    if grid_state["onColor"] == grid_state["offColor"]:
      failures.append(Failure(page_name, f"a lit grid cell looks like an unlit one: {grid_state}"))
    if grid_state["left"] < grid_state["frameLeft"] - 0.5 or grid_state["right"] > grid_state["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the table grid leaves the editor frame: {grid_state}"))
    save_step(page, scenario, "grid", caret="hide")
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    if page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu").count() != 0 or editor.count() != 1:
      failures.append(Failure(page_name, "Escape did not close only the table grid"))
      return

  # The emoji picker takes the focus for its filter; Escape gives it back to the text box.
  palette.locator("button[data-edit-action='emoji']").click()
  picker = page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu[data-edit-popover='emoji']")
  page.wait_for_timeout(150)
  if picker.count() != 1 or not picker.is_visible():
    failures.append(Failure(page_name, "the emoji picker did not open"))
  else:
    picker_state = picker.evaluate("""element => {
      const f = element.closest('.sphinx-preview-block-editor-host').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const field = element.querySelector('input');
      return { focused: document.activeElement === field, left: r.left, right: r.right,
        frameLeft: f.left, frameRight: f.right, count: element.querySelectorAll('[data-emoji]').length };
    }""")
    if not picker_state["focused"] or picker_state["count"] < 140:
      failures.append(Failure(page_name, f"the emoji picker is not ready: {picker_state}"))
    if picker_state["left"] < picker_state["frameLeft"] - 0.5 or picker_state["right"] > picker_state["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the emoji picker leaves the editor frame: {picker_state}"))
    save_step(page, scenario, "emoji", caret="hide")
    page.keyboard.type("warning")
    page.wait_for_timeout(100)
    shown = picker.locator("[data-emoji]:not([hidden])").count()
    if shown != 1:
      failures.append(Failure(page_name, f"filtering 'warning' left {shown} emoji, expected 1"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    refocused = page.evaluate("() => document.activeElement && document.activeElement.tagName")
    if editor.count() != 1 or refocused != "TEXTAREA" or page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu").count() != 0:
      failures.append(Failure(page_name, f"Escape in the emoji filter left the editor in a bad state: {refocused}"))
      return

  # T25: the Alert button writes the alert and opens its type list at the caret, inside the frame.
  area.focus()
  palette.locator("button[data-edit-action='alert']").click()
  alert_list = page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu[data-edit-popover='alert']")
  page.wait_for_timeout(150)
  if alert_list.count() != 1 or not alert_list.is_visible():
    failures.append(Failure(page_name, "the alert type list did not open"))
  else:
    alert_state = alert_list.evaluate("""element => {
      const f = element.closest('.sphinx-preview-block-editor-host').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      return { options: [...element.querySelectorAll('[data-edit-option]')].map((o) => o.textContent),
        left: r.left, right: r.right, top: r.top, frameLeft: f.left, frameRight: f.right,
        areaTop: t.getBoundingClientRect().top, focused: document.activeElement === t,
        value: t.value.split('\\n')[0] };
    }""")
    if alert_state["options"] != ["Note", "Tip", "Important", "Warning", "Caution"]:
      failures.append(Failure(page_name, f"the alert type list is wrong: {alert_state}"))
    if alert_state["value"] != "> [!NOTE]" or not alert_state["focused"]:
      failures.append(Failure(page_name, f"the alert was not written with the focus kept: {alert_state}"))
    if alert_state["left"] < alert_state["frameLeft"] - 0.5 or alert_state["top"] < alert_state["areaTop"]:
      failures.append(Failure(page_name, f"the alert type list is not next to the text: {alert_state}"))
    save_step(page, scenario, "alert", caret="hide")
    alert_list.locator("[data-edit-option='WARNING']").click()
    page.wait_for_timeout(100)
    changed = page.evaluate("""() => {
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      return { head: t ? t.value.split('\\n')[0] : '', focused: document.activeElement === t };
    }""")
    if changed["head"] != "> [!WARNING]" or not changed["focused"] or page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu").count() != 0:
      failures.append(Failure(page_name, f"choosing Warning did not change the head: {changed}"))

  # T34: the Colour picker opens inside the frame, a swatch colours the selection, and the code
  # swatch button follows the caret.
  area.focus()
  area.evaluate("t => { t.setSelectionRange(2, 6); }")
  palette.locator("button[data-edit-action='color']").click()
  colour_menu = page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu[data-edit-popover='color']")
  page.wait_for_timeout(150)
  if colour_menu.count() != 1 or not colour_menu.is_visible():
    failures.append(Failure(page_name, "the colour picker did not open"))
  else:
    colour_state = colour_menu.evaluate("""element => {
      const f = element.closest('.sphinx-preview-block-editor-host').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      const swatch = element.querySelector('[data-color-swatch]').getBoundingClientRect();
      return { swatches: element.querySelectorAll('[data-color-swatch]').length,
        tabs: element.querySelectorAll('[data-color-tab]').length, left: r.left, right: r.right,
        frameLeft: f.left, frameRight: f.right, swatchWidth: swatch.width, swatchHeight: swatch.height,
        focused: document.activeElement === t };
    }""")
    if colour_state["swatches"] != 16 or colour_state["tabs"] != 2 or not colour_state["focused"]:
      failures.append(Failure(page_name, f"the colour picker is not ready: {colour_state}"))
    if colour_state["left"] < colour_state["frameLeft"] - 0.5 or colour_state["right"] > colour_state["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the colour picker leaves the editor frame: {colour_state}"))
    if colour_state["swatchWidth"] < 12 or colour_state["swatchHeight"] < 12:
      failures.append(Failure(page_name, f"the colour swatches are too small: {colour_state}"))
    save_step(page, scenario, "colour", caret="hide")
    colour_menu.locator("[data-color-swatch]").nth(0).click()
    page.wait_for_timeout(100)
    coloured = page.evaluate("""() => {
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      return { value: t ? t.value : '', focused: document.activeElement === t };
    }""")
    if '<span style="color:#e53935">' not in coloured["value"] or not coloured["focused"]:
      failures.append(Failure(page_name, f"a colour swatch did not colour the selection: {coloured}"))
    if page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette-menu").count() != 0 or editor.count() != 1:
      failures.append(Failure(page_name, "choosing a colour left the picker open or closed the editor"))
  code_button = palette.locator("button[data-edit-action='colorCode']")
  if code_button.is_visible():
    failures.append(Failure(page_name, "the colour-code swatch is shown with the caret outside a colour code"))
  area.evaluate("""t => {
    t.focus(); t.setSelectionRange(t.value.length, t.value.length);
    document.execCommand('insertText', false, ' #1e88e5');
  }""")
  page.keyboard.press("ArrowLeft")
  page.wait_for_timeout(100)
  if not code_button.is_visible():
    failures.append(Failure(page_name, "the colour-code swatch is hidden with the caret in a colour code"))
  else:
    save_step(page, scenario, "colour-code", caret="hide")

  # Closing puts the block back where it was before the editor opened (no jump by the bar height).
  page.keyboard.press("Escape")
  page.wait_for_timeout(500)
  if page.locator(".sphinx-preview-block-editor").count() != 0:
    failures.append(Failure(page_name, "Escape did not close the editor"))
    return
  after = page.locator("main > p[data-sphinx-source-line]").nth(3).evaluate(
    "element => element.getBoundingClientRect().top"
  )
  if abs(after - before) > 2:
    failures.append(Failure(
      page_name,
      f"closing the editor moved the paragraph from {before:.1f}px to {after:.1f}px",
    ))
  # Reopen so the scenario's own screenshot shows the editor.
  page.locator("main > p[data-sphinx-source-line]").nth(3).click()
  page.wait_for_timeout(250)


# @tests_req SwRS-MDOKFSTUDIO-TABLE-048
# @tests_req SwRS-MDOKFSTUDIO-TABLE-085
def check_cell_bar_formatting(page: Page, page_name: str, scenario: dict, toolbar, failures: list[Failure]) -> None:
  """T35: the inline palette group inside the table cell bar."""
  group = toolbar.locator("[data-sphinx-edit-palette='cell']")
  if group.count() != 1 or not group.is_visible():
    failures.append(Failure(page_name, "the table cell bar shows no inline formatting group"))
    return
  geometry = toolbar.evaluate("""bar => {
    const group = bar.querySelector("[data-sphinx-edit-palette='cell']");
    const box = bar.getBoundingClientRect();
    const buttons = [...group.querySelectorAll(':scope > button:not([hidden])')];
    const rects = buttons.map((button) => button.getBoundingClientRect());
    const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
    const cellRect = cell.getBoundingClientRect();
    const table = cell.closest('table').getBoundingClientRect();
    const separator = bar.querySelector(':scope > .sphinx-preview-table-menu-cell-group > [role=separator]');
    return {
      ids: buttons.map((button) => button.dataset.editAction),
      operations: bar.querySelectorAll(':scope > [data-sphinx-table-operation]').length,
      hasSeparator: Boolean(separator),
      mode: Boolean(group.querySelector('select')),
      barLeft: box.left, barRight: box.right, barBottom: box.bottom, barHeight: box.height,
      tableTop: table.top, viewport: document.documentElement.clientWidth,
      outside: rects.filter((r) => r.left < box.left - 0.5 || r.right > box.right + 0.5
        || r.width < 8 || r.height < 8).length,
      rows: new Set(rects.map((r) => Math.round(r.top))).size,
      scrollWidth: bar.scrollWidth, clientWidth: bar.clientWidth,
    };
  }""")
  for required in ("bold", "italic", "link"):
    if required not in geometry["ids"]:
      failures.append(Failure(page_name, f"the cell bar lacks the {required} button: {geometry['ids']}"))
  for block_only in ("heading", "quote", "table", "image", "codeFence"):
    if block_only in geometry["ids"]:
      failures.append(Failure(page_name, f"the cell bar shows the block action {block_only}"))
  if geometry["operations"] != 7 or not geometry["hasSeparator"] or geometry["mode"]:
    failures.append(Failure(page_name, f"the cell bar structure is wrong: {geometry}"))
  rules = toolbar.evaluate("""bar => {
    const has = (name) => {
      const button = bar.querySelector(`:scope > [data-sphinx-table-operation="${name}"]`);
      return getComputedStyle(button, '::before').content === '""';
    };
    const separator = bar.querySelector('.sphinx-preview-table-menu-cell-group > [role=separator]').getBoundingClientRect();
    const first = bar.querySelector("[data-sphinx-edit-palette='cell'] > button:not([hidden])").getBoundingClientRect();
    return {
      rowPlus: has('Insert row before selected row') || has('Insert row after selected row'),
      rowMinus: has('Delete selected row'),
      colPlus: has('Insert column before selected column'),
      colMinus: has('Insert column after selected column') || has('Delete selected column'),
      table: has('Convert to list-table'),
      separatorTop: separator.top, separatorBottom: separator.bottom, firstTop: first.top, firstBottom: first.bottom,
    };
  }""")
  if rules["rowPlus"] or rules["rowMinus"] or not rules["colPlus"] or rules["colMinus"] or not rules["table"]:
    failures.append(Failure(page_name, f"the rules of the table bar are not one per group: {rules}"))
  if rules["separatorTop"] > rules["firstBottom"] or rules["separatorBottom"] < rules["firstTop"]:
    failures.append(Failure(page_name, f"the rule of the cell group is not level with the group's first line: {rules}"))
  if geometry["outside"] or geometry["scrollWidth"] > geometry["clientWidth"] + 1 or geometry["barRight"] > geometry["viewport"] + 0.5:
    failures.append(Failure(page_name, f"the cell bar buttons overflow the bar: {geometry}"))
  if geometry["barBottom"] > geometry["tableTop"] + 0.5:
    failures.append(Failure(page_name, f"the merged cell bar covers the table: {geometry}"))
  if scenario["width"] <= 400 and geometry["rows"] < 2:
    failures.append(Failure(page_name, f"the cell bar did not wrap at {scenario['width']} px: {geometry}"))
  save_step(page, scenario, "cell-bar", caret="hide")
  # A formatting button keeps the cell editor open and focused, and the text changes in the cell.
  area = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
  area.focus()
  area.press("ControlOrMeta+a")
  group.locator("button[data-edit-action='bold']").click()
  page.wait_for_timeout(120)
  state = page.evaluate("""() => {
    const area = document.querySelector('[data-sphinx-preview-table-cell-editor] textarea');
    return { open: Boolean(area), focused: document.activeElement === area, value: area ? area.value : '' };
  }""")
  if not state["open"] or not state["focused"] or not state["value"].startswith("**"):
    failures.append(Failure(page_name, f"Bold in the cell bar closed the cell, lost the focus or did nothing: {state}"))
  area.press("ControlOrMeta+z")
  page.wait_for_timeout(100)
  # The emoji picker opens under the group and keeps the cell open.
  group.locator("button[data-edit-action='emoji']").click()
  page.wait_for_timeout(150)
  picker = group.locator(".sphinx-preview-edit-palette-menu")
  if picker.count() != 1 or not picker.is_visible():
    failures.append(Failure(page_name, "the emoji picker did not open from the cell bar"))
  else:
    box = picker.evaluate("""element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, viewport: document.documentElement.clientWidth };
    }""")
    if box["left"] < -0.5 or box["right"] > box["viewport"] + 0.5:
      failures.append(Failure(page_name, f"the emoji picker leaves the viewport: {box}"))
    save_step(page, scenario, "cell-emoji", caret="hide")
  page.keyboard.press("Escape")
  page.wait_for_timeout(100)
  if group.locator(".sphinx-preview-edit-palette-menu").count() != 0 or page.locator("[data-sphinx-preview-table-cell-editor]").count() != 1:
    failures.append(Failure(page_name, "Escape did not close only the emoji picker in the cell bar"))
  area = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
  area.focus()


# @tests_req SwRS-MDOKFSTUDIO-TABLE-006
def check_cell_editor_chrome(page: Page, page_name: str, target, original_bounds, failures: list[Failure]) -> None:
    """Done/Cancel live inside the cell, the columns keep their width, the toolbar status is centred."""
    info = page.evaluate("""() => {
      const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
      const editor = cell && cell.querySelector('[data-sphinx-preview-table-cell-editor]');
      const menu = document.querySelector('[data-sphinx-table-menu]');
      if (!cell || !editor || !menu) return null;
      const cellRect = cell.getBoundingClientRect();
      const buttons = Array.from(editor.querySelectorAll('button')).map(button => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.textContent,
          visible: rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility !== 'hidden',
          inside: rect.left >= cellRect.left - 1 && rect.right <= cellRect.right + 1
            && rect.top >= cellRect.top - 1 && rect.bottom <= cellRect.bottom + 1,
          top: rect.top,
        };
      });
      const textarea = editor.querySelector('textarea');
      const reference = document.createElement('div');
      reference.className = 'sphinx-preview-block-editor';
      reference.innerHTML = '<textarea></textarea>';
      document.body.appendChild(reference);
      const referenceStyle = getComputedStyle(reference.querySelector('textarea'));
      const cellStyle = getComputedStyle(textarea);
      const font = {
        same: cellStyle.fontFamily === referenceStyle.fontFamily
          && cellStyle.fontSize === referenceStyle.fontSize
          && cellStyle.lineHeight === referenceStyle.lineHeight,
        cell: [cellStyle.fontFamily, cellStyle.fontSize, cellStyle.lineHeight],
        block: [referenceStyle.fontFamily, referenceStyle.fontSize, referenceStyle.lineHeight],
      };
      reference.remove();
      const status = menu.querySelector('[data-sphinx-preview-edit-status]');
      const centre = rect => rect.top + rect.height / 2;
      const operation = menu.querySelector('[data-sphinx-table-operation]');
      const area = textarea.getBoundingClientRect();
      return {
        buttons,
        font,
        cellStatus: editor.querySelectorAll('[data-sphinx-preview-edit-status]').length,
        fieldAboveButtons: buttons.every(button => button.top >= area.bottom - 1),
        // A status that wrapped onto its own line (narrow widths) has no button row to centre on.
        statusDelta: status && operation
          ? (status.getBoundingClientRect().top >= operation.getBoundingClientRect().bottom - 1
            ? 0
            : Math.abs(centre(status.getBoundingClientRect()) - centre(operation.getBoundingClientRect())))
          : null,
        cellWidth: cellRect.width,
        cellHeight: cellRect.height,
      };
    }""")
    if info is None:
        failures.append(Failure(page_name, "table cell editor, cell or toolbar missing for the chrome checks"))
        return
    if [button["text"] for button in info["buttons"]] != ["Done", "Cancel"]:
        failures.append(Failure(page_name, f"table cell editor buttons are not Done and Cancel: {info['buttons']}"))
    elif not all(button["visible"] and button["inside"] for button in info["buttons"]):
        failures.append(Failure(page_name, f"table cell Done/Cancel are hidden or outside the cell: {info}"))
    if not info["fieldAboveButtons"]:
        failures.append(Failure(page_name, f"table cell buttons are not under the field: {info}"))
    if info["cellStatus"] != 0:
        failures.append(Failure(page_name, "table cell editor still shows the status hint"))
    if not info["font"]["same"]:
        failures.append(Failure(page_name, f"table cell font differs from the block editor: {info['font']}"))
    if info["statusDelta"] is None or info["statusDelta"] > 2:
        failures.append(Failure(page_name, f"toolbar status is not vertically centred with the buttons: {info['statusDelta']}"))
    if info["cellWidth"] < 299:
        failures.append(Failure(page_name, f"edited table cell is narrower than 300 px: {info['cellWidth']}"))
    if original_bounds and original_bounds["width"] < 299:
        pass  # the edited cell grew to its 300 px minimum
    elif original_bounds and abs(info["cellWidth"] - original_bounds["width"]) > 1:
        failures.append(Failure(
            page_name,
            f"table column width changed while editing: {original_bounds['width']} -> {info['cellWidth']}",
        ))
    # A cell that grew to 300 px wraps its text on fewer lines, so it may be shorter.
    grew = original_bounds and info["cellWidth"] > original_bounds["width"] + 1
    if original_bounds and not grew and info["cellHeight"] < original_bounds["height"] - 1:
        failures.append(Failure(page_name, f"table cell shrank while editing: {original_bounds['height']} -> {info['cellHeight']}"))


# @tests_req SwRS-MDOKFSTUDIO-TABLE-035
def check_cell_end_key(page: Page, page_name: str, cell_input, failures: list[Failure]) -> None:
    """Real End key in a focused table-cell editor: caret to the end, default prevented, no scroll.

    On macOS the native End scrolls the preview or shifts a wide table horizontally; headless
    Chromium on Linux moves the caret natively, so the scroll assertions only bite on macOS while
    the defaultPrevented assertion is platform independent.
    """
    cell_input.evaluate("""element => {
      element.focus({ preventScroll: true });
      element.setSelectionRange(0, 0);
      window.__okfEndKey = undefined;
      element.addEventListener("keydown", event => {
        if (event.key === "End") window.__okfEndKey = event.defaultPrevented;
      }, { once: true });
      // Capture-phase listener on window runs first; read defaultPrevented after the editor ran.
      window.addEventListener("keydown", event => {
        if (event.key !== "End") return;
        setTimeout(() => { window.__okfEndPrevented = event.defaultPrevented; }, 0);
      }, { capture: true, once: true });
    }""")
    measure = """() => {
      const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
      const lefts = [];
      for (let node = cell.closest('table'); node; node = node.parentElement) lefts.push(node.scrollLeft);
      return { y: window.scrollY, lefts };
    }"""
    before = page.evaluate(measure)
    page.keyboard.press("End")
    page.wait_for_function("() => window.__okfEndPrevented !== undefined", timeout=2000)
    after = page.evaluate(measure)
    prevented = page.evaluate("() => window.__okfEndPrevented")
    caret_at_end = cell_input.evaluate(
      "element => element.selectionStart === element.selectionEnd"
      " && element.selectionEnd === element.value.replace(/[\\r\\n]+$/, '').length"
    )
    if not prevented or not caret_at_end or after != before:
      failures.append(Failure(
        page_name,
        f"End in a table cell did not move the caret to the end without scrolling: "
        f"prevented={prevented} caret_at_end={caret_at_end} {before} -> {after}",
      ))


def check_preview_edit_mode(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("editMode"):
        return
    page_name = scenario["page"]
    button = page.locator("[data-sphinx-preview-edit-toggle]")
    button.click()
    # Edit mode puts a handle gutter in front of the first column of a pipe table, which re-lays the page out;
    # two frames let the resize observer and the reading-line anchor settle before a check scrolls.
    page.evaluate("() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
    if button.get_attribute("aria-pressed") != "true":
        failures.append(Failure(page_name, "edit mode toggle did not become active"))
    if page.locator("html").get_attribute("data-sphinx-preview-edit-mode") != "on":
        failures.append(Failure(page_name, "edit mode state was not applied to the preview"))
    if scenario.get("topSpacingChecks") in {"empty-start", "empty-open"}:
      return
    if scenario.get("fixture") == "08-okf-schema":
      edit_buttons = page.locator("[data-okf-edit-field], [data-okf-properties] tbody button")
      if edit_buttons.count() > 0:
        failures.append(Failure(page_name, "frontmatter properties still contain Edit buttons"))
      name_cells = page.locator(
        '[data-okf-properties] tbody [data-okf-edit-cell="name"]'
      )
      value_cells = page.locator(
        '[data-okf-properties] tbody td[data-okf-edit-cell="value"]'
      )
      if name_cells.count() == 0:
        failures.append(Failure(page_name, "edit mode exposes no clickable frontmatter key cells"))
      if value_cells.count() == 0:
        failures.append(Failure(page_name, "edit mode exposes no clickable frontmatter value cells"))
      for cell in (name_cells.first, value_cells.first):
        if cell.count() > 0 and cell.get_attribute("tabindex") != "0":
          failures.append(Failure(page_name, "frontmatter cells are not keyboard accessible"))

    edit_target = scenario.get("editTarget")
    if edit_target in {None, "paragraph"}:
      if page.locator("[data-sphinx-preview-block-editor], [data-okf-frontmatter-editor]").count():
        failures.append(Failure(page_name, "page-wide edit mode unexpectedly opened a single-field editor"))
      paragraph_styles = page.locator(
        "#sphinx-myst-preview-content p[data-sphinx-source-line]"
      ).evaluate_all(
        """elements => elements
          .filter(element => !element.closest('table'))
          .map(element => {
            const style = getComputedStyle(element);
            return {
              whiteSpace: style.whiteSpace,
              overflowWrap: style.overflowWrap,
              hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
            };
          })"""
      )
      if not paragraph_styles:
        failures.append(Failure(page_name, "edit mode found no source-mapped paragraphs"))
      elif any(
        style["whiteSpace"] == "pre-wrap" for style in paragraph_styles
      ):
        failures.append(Failure(page_name, "edit mode shows source line breaks in rendered paragraphs"))
      elif any(style["hasHorizontalOverflow"] for style in paragraph_styles):
        failures.append(Failure(page_name, "edit-mode paragraphs clip continuation text horizontally"))

      if scenario.get("fixture") == "08-okf-schema":
        warning_body = page.locator(
          "#sphinx-myst-preview-content aside.admonition.warning p[data-sphinx-source-line]"
        )
        if warning_body.count() != 1:
          failures.append(Failure(page_name, "warning body paragraph is missing from edit mode"))
        else:
          if warning_body.evaluate("element => getComputedStyle(element).whiteSpace") == "pre-wrap":
            failures.append(Failure(page_name, "warning paragraph shows source line breaks in edit mode"))

        table = page.locator("#sphinx-myst-preview-content table:not(.okf-properties)")
        if table.count() != 1 or not table.is_visible():
          failures.append(Failure(page_name, "rendered content table is missing from edit mode"))
        elif table.locator("td").count() == 0 or table.locator("td").first.evaluate(
          "element => getComputedStyle(element).whiteSpace"
        ) == "pre":
          failures.append(Failure(page_name, "content table was changed to source-line wrapping"))
      if edit_target is None:
        return

    if edit_target == "title":
      target = page.locator("main > h1").first
    elif edit_target == "paragraph":
      target = page.locator("main > p").first
    elif edit_target == "admonition":
      target = page.get_by_text("Calibration gate", exact=True)
    elif edit_target == "list":
      target = page.locator("main ul > li").nth(1)
    elif edit_target == "table-cell":
      target = page.locator("main table:not(.okf-properties) tbody td:nth-child(3)").first
    elif edit_target == "table-cell-wide":
      target = page.locator("main table:not(.okf-properties) tbody td:last-child").first
    elif edit_target == "frontmatter-key":
      target = page.locator('[data-okf-field="status"] th[data-okf-edit-cell="name"]')
    elif edit_target == "frontmatter-value":
      target = page.locator('[data-okf-field="status"] td[data-okf-edit-cell="value"]')
    elif edit_target == "frontmatter-list":
      target = page.locator('[data-okf-field="derives_from"] td[data-okf-edit-cell="value"]')
    elif edit_target == "frontmatter-boolean":
      target = page.locator('[data-okf-field="annotation_exemption"] td[data-okf-edit-cell="value"]')
    else:
      failures.append(Failure(page_name, f"unknown edit target {edit_target!r}"))
      return

    if target.count() == 0:
      failures.append(Failure(page_name, f"edit target {edit_target!r} is missing"))
      return
    if edit_target == "frontmatter-list":
      preview_items = page.locator('[data-okf-field="derives_from"] .okf-list-preview li')
      if preview_items.count() != 4:
        failures.append(Failure(page_name, f"frontmatter list preview shows {preview_items.count()} items, expected 4"))
      if page.locator('[data-okf-field="derives_from"] .okf-list-more').count() != 0:
        failures.append(Failure(page_name, "frontmatter list preview truncates a list below the 20-item cap"))
    original_cell_bounds = target.bounding_box() if edit_target in {"table-cell", "table-cell-wide"} else None
    original_cell_html = target.inner_html() if edit_target == "table-cell" else None
    clicked_word = None
    click_offset = None
    if edit_target in {"title", "paragraph", "admonition", "list"}:
      target.scroll_into_view_if_needed()
      # The centre of the block, unless the floating toolbar covers it (a 460 px pane): then the
      # point moves left, out from under the toolbar. The word probe and the click share it.
      click_offset = target.evaluate("""element => {
        const box = element.getBoundingClientRect();
        const bar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();
        const y = box.height / 2;
        let x = box.width / 2;
        const covered = box.left + x >= bar.left && box.top + y >= bar.top && box.top + y <= bar.bottom;
        if (covered) x = Math.max(4, Math.min(x, bar.left - box.left - 8) / 2);
        return { x, y };
      }""")
      clicked_word = target.evaluate("""(element, point) => {
        const box = element.getBoundingClientRect();
        const x = box.left + point.x;
        const y = box.top + point.y;
        const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
        const node = range && range.startContainer;
        if (!node || node.nodeType !== 3 || !element.contains(node)) return null;
        // Offset of the caret in the element's whole text, so a word split across inline
        // elements (for example a code span next to plain text) is found.
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let offset = 0;
        for (let current = walker.nextNode(); current && current !== node; current = walker.nextNode()) {
          offset += (current.nodeValue || "").length;
        }
        offset += range.startOffset;
        const text = element.textContent || "";
        const isWord = character => /[\\p{L}\\p{N}_-]/u.test(character);
        let start = offset;
        let end = offset;
        while (start > 0 && isWord(text.charAt(start - 1))) start -= 1;
        while (end < text.length && isWord(text.charAt(end))) end += 1;
        const word = text.slice(start, end);
        return word.length >= 3 ? word : null;
      }""", click_offset)
    if edit_target == "frontmatter-boolean":
      # A click toggles a boolean directly (T20); the keyboard opens the editor.
      target.focus()
      page.keyboard.press("Enter")
    elif click_offset is not None:
      target.click(position=click_offset)
    else:
      target.click()

    if edit_target == "frontmatter-list":
      editor = page.locator("[data-okf-frontmatter-editor]")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, "clicking the frontmatter list did not open its editor"))
        return
      if not editor.evaluate("element => element.parentElement?.matches('td[data-okf-value-cell]') === true"):
        failures.append(Failure(page_name, "frontmatter list editor is not inside its value cell"))
      if page.locator('[data-okf-field="derives_from"] [data-okf-value-display]').is_visible():
        failures.append(Failure(page_name, "frontmatter list preview remains visible under its editor"))
      button_texts = [text.strip().lower() for text in editor.locator("button").all_text_contents()]
      if any(text in {"save", "cancel"} for text in button_texts):
        failures.append(Failure(page_name, "frontmatter list editor exposes Save or Cancel controls"))
      list_editor = editor.locator(".okf-list-editor")
      rows = list_editor.locator(".okf-list-editor-item")
      if rows.count() != 4:
        failures.append(Failure(page_name, f"frontmatter list editor opened {rows.count()} items, expected 4"))
      handles = rows.locator(".okf-list-editor-handle")
      if handles.count() != rows.count() or not handles.evaluate_all(
        "items => items.every(handle => handle.getAttribute('draggable') === 'true')"
      ):
        failures.append(Failure(page_name, "frontmatter list items are missing draggable anchor handles"))
      if rows.locator(".okf-list-editor-remove[aria-label='Remove list item']").count() != rows.count():
        failures.append(Failure(page_name, "frontmatter list items are missing X removal controls"))
      inputs = rows.locator(".okf-list-editor-input")
      add_button = editor.locator("button[aria-label='Add list item']")
      set_null_button = editor.locator("button[data-okf-list-set-null='true']")
      if set_null_button.count() != 1 or not set_null_button.is_visible():
        failures.append(Failure(page_name, "nullable list editor is missing its set-as-null link"))
      if inputs.count() == 4 and add_button.count() == 1:
        input_colors = inputs.first.evaluate("""element => {
          const inputStyle = getComputedStyle(element);
          const cell = element.closest('td[data-okf-value-cell]');
          return {
            input: inputStyle.color,
            cell: cell ? getComputedStyle(cell).color : null,
          };
        }""")
        if input_colors["input"] != input_colors["cell"]:
          failures.append(
            Failure(
              page_name,
              f"frontmatter list input color {input_colors['input']} differs from its cell color {input_colors['cell']}",
            )
          )
        inputs.first.fill("StRS-CORE-001 updated")
        handles.first.focus()
        handles.first.press("ArrowDown")
        reordered = rows.locator(".okf-list-editor-input").evaluate_all(
          "items => items.map(input => input.value)"
        )
        if reordered != ["StRS-CORE-002", "StRS-CORE-001 updated", "StRS-CORE-003", "StRS-CORE-004"]:
          failures.append(Failure(page_name, f"frontmatter list reorder produced {reordered!r}"))
        add_button.click()
        if rows.count() != 5:
          failures.append(Failure(page_name, "Add item did not append a fifth list row"))
        else:
          rows.locator(".okf-list-editor-input").last.fill("StRS-CORE-005")
          rows.locator(".okf-list-editor-remove").last.click()
          if rows.count() != 4:
            failures.append(Failure(page_name, "X removal did not remove the added list row"))
          remaining = rows.locator(".okf-list-editor-input").evaluate_all(
            "items => items.map(input => input.value)"
          )
          if remaining != ["StRS-CORE-002", "StRS-CORE-001 updated", "StRS-CORE-003", "StRS-CORE-004"]:
            failures.append(Failure(page_name, f"X removal changed the wrong list row: {remaining!r}"))
          rows.locator(".okf-list-editor-remove").first.click()
          if rows.count() != 3:
            failures.append(Failure(page_name, "X removal did not remove an existing list row"))
          else:
            remaining = rows.locator(".okf-list-editor-input").evaluate_all(
              "items => items.map(input => input.value)"
            )
            if remaining != ["StRS-CORE-001 updated", "StRS-CORE-003", "StRS-CORE-004"]:
              failures.append(Failure(page_name, f"X removal changed the wrong existing row: {remaining!r}"))
      if set_null_button.count() == 1:
        set_null_button.click()
        saved_as_null = page.evaluate(
          "() => window.visualMessages.some(message => message.type === 'previewFrontmatterSave' "
          "&& message.fieldName === 'derives_from' && message.fieldValue === null)"
        )
        if not saved_as_null:
          failures.append(Failure(page_name, "set-as-null link did not post a null frontmatter save"))
      label = page.locator('[data-okf-field="derives_from"] .okf-type-label')
      if label.count() != 1 or label.text_content() != "(list)":
        failures.append(Failure(page_name, "list type label is missing from the frontmatter name cell"))
      if "(list)" in (page.locator('[data-okf-field="derives_from"] .okf-doc').text_content() or ""):
        failures.append(Failure(page_name, "list type label still appears in the description cell"))
      return

    if edit_target == "frontmatter-boolean":
      editor = page.locator("[data-okf-frontmatter-editor]")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, "clicking the boolean frontmatter value did not open its editor"))
        return
      checkbox = editor.locator('input[type="checkbox"]')
      if checkbox.count() != 1 or not checkbox.is_visible():
        failures.append(Failure(page_name, "boolean frontmatter editor did not expose a visible checkbox"))
        return
      if not checkbox.is_checked():
        failures.append(Failure(page_name, "boolean frontmatter checkbox did not start checked"))
      if checkbox.get_attribute("class") != "okf-value-checkbox":
        failures.append(Failure(page_name, "boolean frontmatter editor checkbox does not use the preview checkbox style"))
      checkbox.click()
      if checkbox.is_checked():
        failures.append(Failure(page_name, "boolean frontmatter checkbox did not toggle when clicked"))
      saved = page.evaluate(
        "() => window.visualMessages.some(message => message.type === 'previewFrontmatterSave' "
        "&& message.fieldName === 'annotation_exemption' && message.fieldValue === false)"
      )
      if not saved:
        failures.append(Failure(page_name, "boolean checkbox click did not post a false frontmatter save"))
      return

    if edit_target in {"title", "paragraph", "admonition", "list"}:
      editor = page.locator(".sphinx-preview-block-editor textarea")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, f"clicking {edit_target} did not open its Markdown editor"))
      elif page.locator(
        '[aria-label="Save Markdown block"], [aria-label="Cancel Markdown edit"]'
      ).count():
        failures.append(Failure(page_name, "raw block editor still exposes Save or Cancel buttons"))
      elif editor.evaluate("element => getComputedStyle(element.parentElement).borderTopWidth") != "1px":
        failures.append(Failure(page_name, "raw block editor has no visible surrounding frame"))
      elif not editor.evaluate("""(element, word) => {
        const position = element.selectionStart;
        const nearCaret = word === null
          ? position === element.value.trimEnd().length
          : element.value.slice(Math.max(0, position - 40), position + 40).includes(word);
        return document.activeElement === element
          && element.selectionStart === element.selectionEnd
          && nearCaret
          && getComputedStyle(element).caretColor !== "transparent";
      }""", clicked_word):
        caret_start = editor.evaluate("element => element.selectionStart")
        failures.append(Failure(
          page_name,
          f"{edit_target} editor caret is not at the clicked word "
          f"(selectionStart={caret_start}, clicked_word={clicked_word!r})",
        ))
      elif edit_target == "admonition":
        source = editor.input_value()
        if not source.startswith("```{warning}") or not source.rstrip().endswith("```"):
          failures.append(Failure(page_name, "admonition editor does not contain both fences"))
      elif edit_target == "list":
        expected_lines = [
          "- Method: automated CLI tests over fixed knowledge-base fixtures.",
          "- Criteria: repeated operations are stable and failed operations leave authored",
          "  fixture content intact.",
        ]
        if editor.input_value().splitlines() != expected_lines:
          failures.append(Failure(page_name, "list editor does not contain every item and continuation line"))
        mapped_list = page.locator('main ul[data-sphinx-preview-editing="true"]')
        if mapped_list.count() != 1 or mapped_list.is_visible():
          failures.append(Failure(page_name, "editing one list item did not replace the whole list"))
        elif not editor.evaluate("""element => (element.closest('.sphinx-preview-block-editor-host') ?? element.parentElement)
          ?.previousElementSibling?.matches('ul[data-sphinx-preview-editing="true"]') === true"""):
          failures.append(Failure(page_name, "list editor is not positioned after the hidden whole list"))
        elif editor.evaluate("""element => element.scrollHeight > element.clientHeight + 1
          || element.scrollWidth > element.clientWidth + 1
          || element.scrollTop > 0 || element.scrollLeft > 0"""):
          failures.append(Failure(page_name, "wrapped list source is clipped when the editor opens"))
      return

    if edit_target == "table-cell-wide":
      # The table is wider than its wrapper: End must not shift it horizontally.
      target.scroll_into_view_if_needed()
      if not target.evaluate("""cell => {
        for (let node = cell.closest('table'); node; node = node.parentElement) {
          if (node.scrollWidth > node.clientWidth + 1
            && ['auto', 'scroll'].includes(getComputedStyle(node).overflowX)) return true;
        }
        return false;
      }"""):
        failures.append(Failure(page_name, "wide-table fixture does not overflow its wrapper"))
      target.click()
      wide_input = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
      if wide_input.count() != 1:
        failures.append(Failure(page_name, "clicking a far-right table cell did not open its editor"))
        return
      check_cell_editor_chrome(page, page_name, target, original_cell_bounds, failures)
      check_cell_end_key(page, page_name, wide_input, failures)
      save_step(page, scenario, "end", caret="initial")
      wide_input.press("Escape")
      return

    if edit_target == "table-cell":
      editor = page.locator("[data-sphinx-preview-table-cell-editor]")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, "clicking a table cell did not open its cell editor"))
        return
      if not editor.evaluate("element => element.parentElement?.matches('td, th') === true"):
        failures.append(Failure(page_name, "table cell editor is not placed inside its selected cell"))
      if editor.locator("textarea[aria-label='Markdown table cell']").count() != 1:
        failures.append(Failure(page_name, "table cell editor has no selected-cell input"))
      elif not editor.locator("textarea[aria-label='Markdown table cell']").evaluate("""element => {
        const position = element.value.trimEnd().length;
        return document.activeElement === element
          && element.selectionStart === position
          && element.selectionEnd === position
          && getComputedStyle(element).caretColor !== "transparent";
      }"""):
        failures.append(Failure(page_name, "table cell input has no caret at the end of its content"))
      elif not editor.locator("textarea[aria-label='Markdown table cell']").evaluate("""element =>
        getComputedStyle(element).borderWidth === "0px"
        && getComputedStyle(element).outlineStyle === "none"
      """):
        failures.append(Failure(page_name, "table cell input has a focus box that differs from inline frontmatter editing"))
      cell_content = target.locator("[data-sphinx-table-cell-content]")
      if cell_content.count() != 1 or not cell_content.evaluate("""element =>
        getComputedStyle(element).visibility === "hidden" && element.getAttribute("aria-hidden") === "true"
      """):
        failures.append(Failure(page_name, "rendered table-cell text remains visible beneath the editor"))
      check_cell_editor_chrome(page, page_name, target, original_cell_bounds, failures)
      if not editor.locator("textarea").evaluate("""element => {
        const style = getComputedStyle(element);
        const input = element.getBoundingClientRect();
        const cell = element.closest('td, th').getBoundingClientRect();
        return style.whiteSpace === "pre-wrap" && style.overflowWrap === "anywhere"
          && input.left >= cell.left - 1 && input.right <= cell.right + 1
          && input.top >= cell.top - 1 && input.bottom <= cell.bottom + 1;
      }"""):
        failures.append(Failure(page_name, "table-cell textarea does not wrap inside its cell bounds"))
      toolbar = page.locator("[data-sphinx-table-menu]")
      if toolbar.count() != 1 or not toolbar.is_visible():
        failures.append(Failure(page_name, "table action bar is missing or hidden"))
      elif toolbar.evaluate("element => getComputedStyle(element).position") != "static":
        failures.append(Failure(page_name, "table action bar is not in the document flow"))
      elif not toolbar.evaluate("""element => {
        const table = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]').closest('table');
        const next = element.nextElementSibling;
        return next === table || (next !== null && next.contains(table));
      }"""):
        failures.append(Failure(page_name, "table action bar does not directly precede its table"))
      anchor_layout = page.evaluate("""() => {
        const toolbar = document.querySelector('[data-sphinx-table-menu]');
        const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
        if (!toolbar || !cell) return null;
        const bar = toolbar.getBoundingClientRect();
        const table = cell.closest('table').getBoundingClientRect();
        const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
        const bandRect = band && !band.hidden ? band.getBoundingClientRect() : null;
        const usableTop = bandRect && bandRect.height > 0 ? bandRect.bottom : 0;
        const unreachable = Array.from(toolbar.querySelectorAll('[data-sphinx-table-operation]')).filter(button => {
          const rect = button.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return !hit || !toolbar.contains(hit);
        }).length;
        const covered = Array.from(cell.closest('table').querySelectorAll('th, td')).filter(other => {
          const rect = other.getBoundingClientRect();
          return Math.min(bar.right, rect.right) - Math.max(bar.left, rect.left) > 1
            && Math.min(bar.bottom, rect.bottom) - Math.max(bar.top, rect.top) > 1;
        }).length;
        return {
          barLeft: bar.left,
          barTop: bar.top,
          barBottom: bar.bottom,
          tableTop: table.top,
          covered,
          controlsBottom: document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect().bottom,
          usableTop,
          unreachable,
        };
      }""")
      if (
        not anchor_layout
        or anchor_layout["barBottom"] > anchor_layout["tableTop"] + 1
        or anchor_layout["covered"] != 0
      ):
        failures.append(Failure(page_name, f"table action bar is not above the table or covers cells: {anchor_layout}"))
      if (
        anchor_layout
        and (anchor_layout["barTop"] < anchor_layout["usableTop"] - 1 or anchor_layout["unreachable"] != 0)
      ):
        failures.append(Failure(page_name, f"table action bar is hidden under the sticky band or preview controls: {anchor_layout}"))
      toolbar_bounds = toolbar.bounding_box()
      if (
        toolbar_bounds is None
        or toolbar_bounds["x"] < 0
        or toolbar_bounds["y"] < 0
        or toolbar_bounds["x"] + toolbar_bounds["width"] > page.viewport_size["width"]
        or toolbar_bounds["y"] + toolbar_bounds["height"] > page.viewport_size["height"]
      ):
        failures.append(Failure(page_name, f"table action bar is outside the screenshot viewport: {toolbar_bounds}"))
      operations = toolbar.locator("[data-sphinx-table-operation]")
      if operations.count() != 7:
        failures.append(Failure(page_name, f"table action bar has {operations.count()} row/column/table actions, expected 7"))
      elif not operations.first.is_visible():
        failures.append(Failure(page_name, "table row/column actions are hidden while the cell editor has focus"))
      if toolbar.locator("[data-sphinx-preview-table-save], [data-sphinx-preview-table-cancel]").count() != 0:
        failures.append(Failure(page_name, "table action bar still contains Save or Cancel controls"))
      # The six row and column buttons and the table conversion are the bar's own children; the inline group is checked apart (T35).
      buttons = toolbar.locator(":scope > button")
      if buttons.count() != 7 or not buttons.evaluate_all("""items => items.every(button =>
        button.getAttribute("aria-label")
        && button.title
        && button.querySelector("svg")
      )"""):
        failures.append(Failure(page_name, "table action chips are missing accessible SVG icons or tooltips"))
      selected_cell = page.locator('[data-sphinx-preview-table-cell-selected="true"]')
      selected_cell_state = selected_cell.evaluate("""element => {
        const style = getComputedStyle(element);
        return {
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          editMode: document.documentElement.getAttribute('data-sphinx-preview-edit-mode'),
          editableCell: element.getAttribute('data-okf-edit-cell'),
          tabIndex: element.getAttribute('tabindex'),
          focusVisible: element.matches(':focus-visible'),
          focused: document.activeElement === element,
        };
      }""") if selected_cell.count() == 1 else None
      if (
        not selected_cell_state
        or selected_cell_state["outlineStyle"] != "solid"
        or selected_cell_state["outlineWidth"] != "2px"
      ):
        failures.append(Failure(page_name, f"selected table cell has no visible focus outline: {selected_cell_state}"))
      label_texts = toolbar.locator(".sphinx-preview-table-menu-label").all_text_contents()
      if label_texts != ["Row above", "Row below", "Row \u2212", "Col left", "Col right", "Col \u2212", "List table"]:
        failures.append(Failure(page_name, f"table action bar labels are wrong: {label_texts}"))
      check_cell_bar_formatting(page, page_name, scenario, toolbar, failures)
      cell_input = editor.locator("textarea[aria-label='Markdown table cell']")
      original_value = cell_input.input_value()
      cell_input.fill(original_value + " updated")
      try:
        # Autosave is debounced (400 ms).
        page.wait_for_function("""() => window.visualMessages.some(message =>
          message.type === "previewEditSave" && message.final === false
          && message.editedText.includes(" updated")
        )""", timeout=2000)
      except PlaywrightTimeoutError:
        failures.append(Failure(page_name, "wrapped table-cell edit did not autosave its updated Markdown"))
      table = target.locator("xpath=ancestor::table")
      destinations = [
        table.locator("tbody tr").first.locator("td").nth(3),
        table.locator("tbody tr").nth(1).locator("td").nth(2),
        table.locator("thead th").first,
        target,
      ]
      for index, destination in enumerate(destinations):
        destination.click()
        active_editor = destination.locator("[data-sphinx-preview-table-cell-editor]")
        if active_editor.count() != 1 or not active_editor.is_visible():
          failures.append(Failure(page_name, f"table editing got stuck switching to destination {index + 1}"))
          return
        if page.locator("[data-sphinx-preview-table-cell-editor]").count() != 1:
          failures.append(Failure(page_name, "switching table cells left multiple editors open"))
        cell_input = active_editor.locator("textarea")
        if page.locator("[data-sphinx-table-cell-content]").count() != 1 or page.locator(
          '[data-sphinx-preview-table-cell-selected="true"]'
        ).count() != 1:
          failures.append(Failure(page_name, "switching table cells left stale hidden content or selected cells"))
        if not cell_input.evaluate("element => document.activeElement === element"):
          failures.append(Failure(page_name, "switching table cells did not focus the destination editor"))
        if index == len(destinations) - 1:
          if cell_input.input_value() != original_value + " updated":
            failures.append(Failure(page_name, "returning to the first cell lost its edited value"))
        else:
          cell_input.fill(cell_input.input_value() + f" journey-{index + 1}")
      if not page.evaluate("""() => {
        const saves = window.visualMessages.filter(message => message.type === "previewEditSave");
        const latest = saves[saves.length - 1];
        return latest && [" updated", "journey-1", "journey-2", "journey-3"]
          .every(value => latest.editedText.includes(value))
          && new Set(saves.map(message => message.editId)).size === 1;
      }"""):
        failures.append(Failure(page_name, "multi-cell autosave did not preserve all changes in one table edit session"))
      check_cell_end_key(page, page_name, cell_input, failures)
      # The scenario's final frame is taken after Escape closed the editor; keep the open state too.
      # The End key moves the caret inside the cell and changes nothing visible: -end is kept only
      # when it differs from -open (the End-key assertion above runs either way).
      save_step(page, scenario, "open", caret="initial")
      save_step(page, scenario, "end", caret="initial", unless_same_as="open")
      # ArrowDown on the last line moves the editor to the cell below in the same column.
      before = cell_input.evaluate("""element => {
        const cell = element.closest('td, th');
        const end = element.value.length;
        element.setSelectionRange(end, end);
        return { row: cell.parentElement.rowIndex, column: cell.cellIndex };
      }""")
      cell_input.press("ArrowDown")
      moved = page.evaluate("""() => {
        const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
        return cell ? {
          row: cell.parentElement.rowIndex,
          column: cell.cellIndex,
          editors: document.querySelectorAll('[data-sphinx-preview-table-cell-editor]').length,
          focused: document.activeElement === cell.querySelector('textarea'),
        } : null;
      }""")
      if not moved or moved["row"] != before["row"] + 1 or moved["column"] != before["column"] \
          or moved["editors"] != 1 or not moved["focused"]:
        failures.append(Failure(page_name, f"ArrowDown did not move the cell editor to the cell below: {before} -> {moved}"))
      else:
        check_cell_editor_chrome(page, page_name, None, None, failures)
      save_step(page, scenario, "arrowdown", caret="initial")
      cell_input = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
      cell_input.press("Escape")
      if not page.evaluate("""() => {
        const saves = window.visualMessages.filter(message => message.type === "previewEditSave");
        return saves.length > 0 && saves.every(message => message.final !== true)
          && window.visualMessages.some(message => message.type === "previewEditCancel");
      }"""):
        failures.append(Failure(page_name, "Escape in a table cell did not cancel the edit"))
      return

    editor = page.locator("[data-okf-frontmatter-editor]")
    if editor.count() != 1 or not editor.is_visible():
      failures.append(Failure(page_name, f"clicking a frontmatter {edit_target.removeprefix('frontmatter-')} cell did not open its editor"))
      return
    expected_cell = "th[data-okf-edit-cell='name']" if edit_target == "frontmatter-key" else "td[data-okf-value-cell]"
    if not editor.evaluate("(element, selector) => element.parentElement?.matches(selector) === true", expected_cell):
      failures.append(Failure(page_name, "frontmatter editor is not rendered inside its activated cell"))
    display_selector = ".okf-name-cell" if edit_target == "frontmatter-key" else "[data-okf-value-display]"
    active_cell = page.locator(f'[data-okf-field="status"] {expected_cell}')
    if active_cell.locator(display_selector).is_visible():
      failures.append(Failure(page_name, "original frontmatter text remains visible under its editor"))
    if editor.locator("button:not([data-okf-frontmatter-menu] button)").count() != 0:
      failures.append(Failure(page_name, "frontmatter editor still has action buttons outside the field action menu"))
    editor_style = editor.evaluate("""element => {
      const style = getComputedStyle(element);
      return {
        border: style.borderWidth,
        padding: style.padding,
        background: style.backgroundColor,
      };
    }""")
    if editor_style != {"border": "0px", "padding": "0px", "background": "rgba(0, 0, 0, 0)"}:
      failures.append(Failure(page_name, f"frontmatter editor still has a frame: {editor_style}"))
    if edit_target == "frontmatter-key":
      control = editor.locator('input[aria-label="Frontmatter key status"][list]')
      expected_value = "status"
      editing_attribute = "data-okf-key-editing"
      options = control.evaluate("""input => {
        const datalist = document.getElementById(input.getAttribute("list"));
        return datalist ? [...datalist.options].map(option => option.value) : [];
      }""") if control.count() == 1 else []
      if "summary" not in options:
        failures.append(Failure(page_name, "frontmatter key dropdown omits the unused schema key"))
    else:
      control = editor.locator('select[aria-label="Frontmatter status"]')
      expected_value = "active"
      editing_attribute = "data-okf-editing"
    if control.count() != 1 or not control.is_visible():
      failures.append(Failure(page_name, "the expected frontmatter field control is not visible"))
      return
    control.scroll_into_view_if_needed()
    if control.input_value() != expected_value:
      failures.append(Failure(page_name, f"frontmatter editor does not show {expected_value!r}"))
    if not control.evaluate("element => document.activeElement === element"):
      failures.append(Failure(page_name, "frontmatter field control is not focused for editing"))
    if edit_target == "frontmatter-key" and not control.evaluate("""element => {
      const position = element.value.trimEnd().length;
      return document.activeElement === element
        && element.selectionStart === position
        && element.selectionEnd === position
        && getComputedStyle(element).caretColor !== "transparent";
    }"""):
      failures.append(Failure(page_name, "frontmatter key input has no caret at the end of its content"))
    bounds = control.evaluate("""element => {
      const cell = element.closest('[data-okf-edit-cell]');
      if (!cell) return null;
      const control = element.getBoundingClientRect();
      const cellBounds = cell.getBoundingClientRect();
      return {
        controlLeft: control.left,
        controlRight: control.right,
        cellLeft: cellBounds.left,
        cellRight: cellBounds.right,
      };
    }""")
    if (
      not bounds
      or bounds["controlLeft"] < bounds["cellLeft"] - 1
      or bounds["controlRight"] > bounds["cellRight"] + 1
    ):
      failures.append(Failure(page_name, f"frontmatter control is not aligned within its cell: {bounds}"))
    if not editor.evaluate(
      "(element, attribute) => element.parentElement?.getAttribute(attribute) === 'true'",
      editing_attribute,
    ):
      failures.append(Failure(page_name, "the target frontmatter cell is not marked as editing"))
    page.evaluate("window.scrollTo(0, 0)")
    if page.evaluate("window.scrollY") != 0:
      failures.append(Failure(page_name, "frontmatter screenshot is not at the top of the file"))
    properties = page.locator("[data-okf-properties] table.okf-properties")
    if properties.count() != 1:
      failures.append(Failure(page_name, "frontmatter properties table is missing or duplicated"))
    else:
      properties_bounds = properties.bounding_box()
      if (
        properties_bounds is None
        or properties_bounds["y"] < 0
        or properties_bounds["y"] + properties_bounds["height"] > page.viewport_size["height"]
      ):
        failures.append(Failure(
          page_name,
          f"frontmatter properties table is outside the screenshot viewport: {properties_bounds}",
        ))
    bounds = control.bounding_box()
    if (
      bounds is None
      or bounds["y"] < 0
      or bounds["y"] + bounds["height"] > page.viewport_size["height"]
    ):
      failures.append(Failure(
        page_name,
        f"frontmatter field is outside the screenshot viewport: {bounds}",
      ))
    if edit_target == "frontmatter-value":
      def reject_mock_save() -> None:
        page.evaluate("""() => {
          const save = window.visualMessages.filter(message => message.type === 'previewFrontmatterSave').at(-1);
          if (!save) throw new Error('No save message to acknowledge');
          const result = { ...save, type: 'previewFrontmatterResult', saved: false,
            error: 'Static mock host does not persist frontmatter; cancel and reopen.' };
          window.visualMessages.push(result);
          window.dispatchEvent(new MessageEvent('message', { data: result }));
        }""")
      menu = page.locator("[data-okf-frontmatter-menu]")
      if menu.count() != 1 or not menu.is_visible():
        failures.append(Failure(page_name, "frontmatter field action menu is missing or hidden"))
      else:
        placement = menu.evaluate("""element => {
          const editor = element.closest('[data-okf-frontmatter-editor]');
          const bounds = element.getBoundingClientRect();
          return {
            inEditor: Boolean(editor) && element.parentElement === editor,
            position: getComputedStyle(element).position,
            left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
            viewportWidth: document.documentElement.clientWidth,
            viewportHeight: window.innerHeight,
            labels: [...element.querySelectorAll('button')].map(button => button.textContent.trim()),
            clippedButtons: [...element.querySelectorAll('button')].filter(button => {
              const box = button.getBoundingClientRect();
              return box.left < 0 || box.right > document.documentElement.clientWidth;
            }).length,
          };
        }""")
        if not placement["inEditor"] or placement["position"] != "static":
          failures.append(Failure(page_name, f"frontmatter field actions are not inside the editing cell in normal flow: {placement}"))
        if placement["left"] < 0 or placement["right"] > placement["viewportWidth"] or placement["clippedButtons"]:
          failures.append(Failure(page_name, f"frontmatter field actions are clipped horizontally: {placement}"))
        if placement["labels"][:2] != ["Add field", "Remove field"]:
          failures.append(Failure(page_name, f"frontmatter field action labels are missing: {placement['labels']}"))
        add_button = menu.locator("button[data-okf-frontmatter-operation='add']")
        if add_button.count() != 1 or not add_button.is_visible():
          failures.append(Failure(page_name, "frontmatter Add field button is missing or hidden"))
        else:
          hit_target = add_button.evaluate("""button => {
            const bounds = button.getBoundingClientRect();
            const target = document.elementFromPoint(
              bounds.left + bounds.width / 2,
              bounds.top + bounds.height / 2,
            );
            return target === button || button.contains(target);
          }""")
          if not hit_target:
            failures.append(Failure(page_name, "frontmatter Add field button is covered at its click point"))
          add_button.click()
          picker = menu.locator(".sphinx-preview-frontmatter-picker")
          if picker.count() != 1 or not picker.is_visible():
            failures.append(Failure(page_name, "clicking the frontmatter Add field button did not open the field picker"))
          else:
            field_picker = picker.locator("select[aria-label='Frontmatter field to add']")
            values = field_picker.locator("option").evaluate_all(
              "options => options.map(option => option.value).filter(Boolean)"
            ) if field_picker.count() == 1 else []
            if not values:
              failures.append(Failure(page_name, "frontmatter field picker has no available schema fields"))
            else:
              field_picker.select_option(values[0])
              try:
                page.wait_for_function(
                  "(fieldName) => window.visualMessages.some(message => message.type === 'previewFrontmatterSave' "
                  "&& message.frontmatterAction === 'add' && message.fieldName === fieldName "
                  "&& message.afterField === 'status')",
                  arg=values[0],
                  timeout=2000,
                )
              except Exception:
                failures.append(Failure(page_name, "frontmatter Add field selection did not post an add save after the open field"))
              confirm_add = picker.locator("button[data-okf-frontmatter-operation='confirm-add']")
              if confirm_add.count() != 0 and confirm_add.is_visible():
                failures.append(Failure(page_name, "frontmatter Add confirmation is still shown for the select picker"))
      reject_mock_save()
      control.press("Escape")
      if page.locator('[data-okf-frontmatter-editor]').count():
        failures.append(Failure(page_name, "Escape did not close the enum/Add-field edit session"))
      page.locator('[data-okf-field="status"] td[data-okf-edit-cell="value"]').click()
      enum = page.locator('select[aria-label="Frontmatter status"]')
      if enum.count() != 1 or not enum.is_visible():
        failures.append(Failure(page_name, "final enum capture does not show the status select"))
      elif not {"active", "draft", "retired"}.issubset(set(enum.locator("option").evaluate_all("options => options.map(option => option.value)"))):
        failures.append(Failure(page_name, "status enum options differ from the schema"))
      else:
        enum.select_option("draft")
        enum.press("Enter")
        saved = page.evaluate("""() => window.visualMessages.some(message =>
          message.type === 'previewFrontmatterSave' && message.fieldName === 'status'
          && message.fieldValue === 'draft')""")
        if not saved:
          failures.append(Failure(page_name, "enum selection did not post a draft save"))
        reject_mock_save()
        enum.press("Escape")
        if page.locator('[data-okf-frontmatter-editor]').count():
          failures.append(Failure(page_name, "Escape did not cancel the enum editor"))
        page.locator('[data-okf-field="status"] td[data-okf-edit-cell="value"]').click()
        if page.locator('.sphinx-preview-frontmatter-picker:visible').count():
          failures.append(Failure(page_name, "final enum screenshot still contains the Add-field picker"))

