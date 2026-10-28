"""Toolbar, editor input, paste, width, table of contents, change bar and update glow checks of
the screenshot campaign."""

from __future__ import annotations

import base64
import json
import sys

from playwright.sync_api import Page

from capture_find_checks import check_find_bar
from capture_sbs_checks import check_side_by_side
from capture_start_hint import check_start_hint
from capture_support import Failure, HERE, VISUAL_REPORT_DIR, report_path, save_step


def check_diff_toggle(page: Page, toolbar, page_name: str, failures: list[Failure], starts_pressed: bool = True) -> None:
    """The Diff button is second to last in row 5 (Comments is last), shows both states, and hides with the setting. It starts pressed unless the scenario starts with the view preference off."""
    diff = toolbar.locator('[data-sphinx-preview-diff-toggle]')
    if diff.count() != 1:
        return
    order = toolbar.evaluate(
        """element => [...element.querySelector('[data-sphinx-preview-toolbar-row="content"]').children]
          .map(item => item.getAttribute('aria-label'))"""
    )
    hide_label, show_label = "Hide changes since last commit", "Show changes since last commit"
    if not order or order[-2:] != [hide_label if starts_pressed else show_label, "Hide comments"]:
        failures.append(Failure(page_name, f"the Diff and Comments buttons are not the last two of row 5: {order}"))
    root = "document.documentElement.getAttribute('data-sphinx-preview-incoming')"
    try:
        if diff.get_attribute("aria-pressed") != ("true" if starts_pressed else "false") or page.evaluate(root) != ("on" if starts_pressed else "off"):
            failures.append(Failure(page_name, "the Diff button must start pressed" if starts_pressed else "the Diff button must start unpressed"))
        pressed = diff.evaluate("element => getComputedStyle(element).backgroundColor")
        diff.click()
        page.wait_for_timeout(100)
        if diff.get_attribute("aria-pressed") != ("false" if starts_pressed else "true") or page.evaluate(root) != ("off" if starts_pressed else "on"):
            failures.append(Failure(page_name, "the Diff button did not switch the marks off" if starts_pressed else "the Diff button did not switch the marks on"))
        if diff.get_attribute("data-tooltip") != (show_label if starts_pressed else hide_label):
            failures.append(Failure(page_name, "the unpressed Diff button has the wrong tooltip" if starts_pressed else "the pressed Diff button has the wrong tooltip"))
        unpressed = diff.evaluate("element => getComputedStyle(element).backgroundColor")
        if pressed == unpressed:
            failures.append(Failure(page_name, "the Diff button looks the same pressed and unpressed"))
        hidden = page.evaluate(
            """() => {
              document.documentElement.setAttribute('data-okf-incoming-changes', 'false');
              const hidden = getComputedStyle(document.querySelector('[data-sphinx-preview-diff-toggle]')).display === 'none';
              document.documentElement.removeAttribute('data-okf-incoming-changes');
              return hidden;
            }"""
        )
        if not hidden:
            failures.append(Failure(page_name, "the Diff button stays visible when the setting is off"))
    finally:
        if diff.get_attribute("aria-pressed") != ("true" if starts_pressed else "false"):
            diff.click()
            page.wait_for_timeout(100)


def toolbar_probe(page: Page) -> dict:
    return page.evaluate(
        """() => {
          const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
          const bar = toolbar.getBoundingClientRect();
          const more = toolbar.querySelector('[data-sphinx-preview-toolbar-more]');
          const visible = element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          const buttons = [...toolbar.querySelectorAll('button')];
          const focusable = buttons.filter(button => visible(button) && getComputedStyle(button).visibility !== 'hidden');
          return {
            top: bar.top, bottom: bar.bottom, left: bar.left, right: bar.right, height: bar.height,
            width: bar.width, viewport: innerWidth,
            moreHidden: more.hidden, moreVisible: visible(more),
            tabOrder: focusable.map(button => button.getAttribute('aria-label')),
            expanded: toolbar.querySelector('[data-sphinx-preview-toolbar-collapse]').getAttribute('aria-expanded'),
            html: document.documentElement.getAttribute('data-sphinx-preview-toolbar-state'),
            toolbarBottomVar: document.documentElement.style.getPropertyValue('--sphinx-preview-toolbar-bottom'),
            overlapsViewport: bar.left < 0 || bar.right > innerWidth,
          };
        }"""
    )


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-007
def check_toolbar_collapse(page: Page, toolbar, page_name: str, failures: list[Failure]) -> None:
    """P8: the collapse button hides rows 2 to 5 (not focusable), shrinks the toolbar and restores it."""
    button = toolbar.locator('[data-sphinx-preview-toolbar-collapse]')
    if button.count() != 1:
        failures.append(Failure(page_name, "the toolbar collapse button is missing"))
        return
    start = toolbar_probe(page)
    was_collapsed = start["moreHidden"]
    try:
        if was_collapsed:
            button.click()
            page.wait_for_timeout(150)
            start = toolbar_probe(page)
        if start["expanded"] != "true" or start["html"] != "expanded" or not start["moreVisible"]:
            failures.append(Failure(page_name, f"expanded toolbar state is wrong: {start}"))
        labels = start["tabOrder"]
        collapse = labels.index("Hide view controls") if "Hide view controls" in labels else -1
        row_one = [name for name in labels[:collapse] if name in ("Refresh preview", "Toggle edit mode")]
        after = labels[collapse + 1:]
        if collapse < 1 or len(row_one) != collapse or after[:3] != ["Anchor preview to text editor", "Back", "Next"]:
            failures.append(Failure(page_name, f"toolbar Tab order does not follow the rows: {labels}"))
        elif len(after) < 10 or not after[3].startswith("Preview theme") or after[4:6] != ["Zoom out", "Zoom in"]:
            failures.append(Failure(page_name, f"toolbar row 3 is not Theme, Zoom out, Zoom in: {labels}"))
        elif not after[6].startswith("Width") or after[7] != "Show table of contents" or "side-by-side" not in after[8].lower():
            failures.append(Failure(page_name, f"toolbar row 4 is not Width, TOC, Side-by-side: {labels}"))
        elif after[9] not in ("Fold all sections", "Unfold all sections"):
            failures.append(Failure(page_name, f"toolbar row 5 does not start with the Fold button: {labels}"))
        if start["overlapsViewport"]:
            failures.append(Failure(page_name, f"toolbar leaves the pane: {start}"))
        button.click()
        page.wait_for_timeout(200)
        collapsed = toolbar_probe(page)
        if collapsed["expanded"] != "false" or collapsed["html"] != "collapsed" or not collapsed["moreHidden"] or collapsed["moreVisible"]:
            failures.append(Failure(page_name, f"collapsed toolbar state is wrong: {collapsed}"))
        if collapsed["tabOrder"] != labels[:collapse] + ["Show view controls"]:
            failures.append(Failure(page_name, f"collapsed toolbar keeps rows 2 to 5 focusable: {collapsed['tabOrder']}"))
        # No row holds more buttons than a full row 1 (3): the expanded toolbar is then as wide as the collapsed one.
        if collapse == 2 and abs(start["width"] - collapsed["width"]) > 0.5:
            failures.append(Failure(page_name, f"the expanded toolbar is not as wide as row 1: {start['width']} vs {collapsed['width']}"))
        if collapsed["height"] >= start["height"] - 40:
            failures.append(Failure(page_name, f"collapsing did not shrink the toolbar: {start['height']} -> {collapsed['height']}"))
        if collapsed["top"] != start["top"] or collapsed["right"] != start["right"]:
            failures.append(Failure(page_name, "the toolbar moved when collapsed"))
        # The variable is 0 while the toolbar does not overlap the text column; compare only when it is set.
        unset = ("", "0px")
        if start["toolbarBottomVar"] not in unset and collapsed["toolbarBottomVar"] == start["toolbarBottomVar"]:
            failures.append(Failure(page_name, "--sphinx-preview-toolbar-bottom was not re-measured on collapse"))
        if collapsed["overlapsViewport"]:
            failures.append(Failure(page_name, f"collapsed toolbar leaves the pane: {collapsed}"))
        button.click()
        page.wait_for_timeout(200)
        again = toolbar_probe(page)
        if again["moreHidden"] or abs(again["height"] - start["height"]) > 0.5 or again["tabOrder"] != labels:
            failures.append(Failure(page_name, f"expanding did not restore the toolbar: {again}"))
    finally:
        now = toolbar_probe(page)
        if now["moreHidden"] != was_collapsed:
            button.click()
            page.wait_for_timeout(200)


def apply_toolbar_state(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Leaves the toolbar collapsed when the scenario shows (or measures) that state."""
  if scenario.get("toolbarState") != "collapsed":
    return
  button = page.locator("[data-sphinx-preview-toolbar-collapse]")
  if button.get_attribute("aria-expanded") == "true":
    button.click()
    page.wait_for_timeout(250)
  if page.locator("[data-sphinx-preview-toolbar-more]").evaluate("element => element.getBoundingClientRect().height") > 0:
    failures.append(Failure(scenario["page"], "the toolbar is not collapsed for the collapsed screenshot"))


FRESH_WORKSPACE_STATE_JS = """() => {
  const html = document.documentElement;
  const more = document.querySelector('[data-sphinx-preview-toolbar-more]');
  return {
    themeMode: html.getAttribute('data-sphinx-preview-theme-mode'),
    themeButton: document.querySelector('[data-sphinx-preview-theme-toggle]')?.getAttribute('aria-label') ?? null,
    toolbarState: html.getAttribute('data-sphinx-preview-toolbar-state'),
    collapseExpanded: document.querySelector('[data-sphinx-preview-toolbar-collapse]')?.getAttribute('aria-expanded') ?? null,
    rowsHidden: more !== null && more.hidden && more.getBoundingClientRect().height === 0,
    posted: (window.visualMessages || []).filter(message =>
      message.type === 'previewThemeModeChanged' || message.type === 'previewViewPreferenceChanged').length,
  };
}"""


# @tests_req SwRS-MDOKFSTUDIO-LIFE-170
def check_fresh_workspace(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """A workspace that stored nothing opens in the cream theme mode with rows 2 to 5 of the toolbar hidden, before any click."""
    if not (scenario.get("render") or {}).get("freshWorkspace"):
        return
    state = page.evaluate(FRESH_WORKSPACE_STATE_JS)
    for key, expected in (
        ("themeMode", "cream"),
        ("themeButton", "Preview theme: Cream theme"),
        ("toolbarState", "collapsed"),
        ("collapseExpanded", "false"),
        ("rowsHidden", True),
        ("posted", 0),
    ):
        if state[key] != expected:
            failures.append(Failure(scenario["page"], f"fresh workspace: {key} is {state[key]!r}, expected {expected!r}"))


def check_preview_toolbar(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """The toolbar controls and rows; a toolbar that starts collapsed is shown for the checks and collapsed again."""
    toolbar = page.locator('[data-sphinx-preview-toolbar][role="toolbar"]')
    started_collapsed = toolbar.count() == 1 and page.evaluate(
        "document.documentElement.getAttribute('data-sphinx-preview-toolbar-state')") == "collapsed"
    if started_collapsed:
        toolbar.locator('[data-sphinx-preview-toolbar-collapse]').click()
        page.wait_for_timeout(200)
    try:
        check_preview_toolbar_rows(page, scenario, failures)
    finally:
        if started_collapsed and page.evaluate(
            "document.documentElement.getAttribute('data-sphinx-preview-toolbar-state')") != "collapsed":
            toolbar.locator('[data-sphinx-preview-toolbar-collapse]').click()
            page.wait_for_timeout(200)


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-005
def check_heading_fold(page: Page, toolbar, page_name: str, failures: list[Failure]) -> None:
    """In Chromium the Fold button folds every section with content, a folded block keeps no height, and a chevron folds one section."""
    button = toolbar.locator("[data-sphinx-preview-fold-toggle]")
    if button.count() != 1:
        failures.append(Failure(page_name, "the Fold button is missing or duplicated"))
        return
    headings = page.locator("#sphinx-myst-preview-content > :is(h1, h2, h3, h4, h5, h6)[data-okf-fold]")
    if headings.count() == 0:
        return
    measure = """() => {
      const kids = [...document.getElementById('sphinx-myst-preview-content').children];
      const folded = kids.filter(item => item.hasAttribute('data-okf-folded'));
      const shownHeadings = kids.filter(item => /^H[1-6]$/.test(item.tagName) && !item.hasAttribute('data-okf-folded'));
      return {
        folded: folded.length,
        untilFound: folded.every(item => item.getAttribute('hidden') === 'until-found'),
        tall: folded.filter(item => item.getBoundingClientRect().height > 0.5).length,
        closed: kids.filter(item => item.getAttribute('data-okf-fold') === 'closed').length,
        headingsTall: shownHeadings.every(item => item.getBoundingClientRect().height > 0),
        text: kids.map(item => item.textContent).join(''),
        scrollY: window.scrollY,
      };
    }"""
    scroll = page.evaluate("window.scrollY")
    before = page.evaluate(measure)
    if before["folded"] != 0:
        failures.append(Failure(page_name, f"{before['folded']} blocks are folded before any fold"))
    button.evaluate("element => element.click()")
    page.wait_for_timeout(150)
    folded = page.evaluate(measure)
    if folded["folded"] == 0 or folded["closed"] == 0 or button.get_attribute("aria-pressed") != "true":
        failures.append(Failure(page_name, f"the Fold button did not fold the sections: {folded}"))
    elif folded["tall"] != 0 or not folded["untilFound"] or not folded["headingsTall"]:
        failures.append(Failure(page_name, f"folded blocks must be hidden until found without height, headings shown: {folded}"))
    elif folded["text"] != before["text"]:
        failures.append(Failure(page_name, "folding changed the text of the content"))
    button.evaluate("element => element.click()")
    page.wait_for_timeout(150)
    opened = page.evaluate(measure)
    if opened["folded"] != 0 or opened["closed"] != 0 or button.get_attribute("aria-pressed") != "false":
        failures.append(Failure(page_name, f"the Fold button did not unfold the sections: {opened}"))
    first = headings.first
    chevron = first.locator("[data-okf-fold-toggle]")
    if chevron.count() == 1:
        chevron.evaluate("element => element.click()")
        page.wait_for_timeout(100)
        if chevron.get_attribute("aria-expanded") != "false" or page.evaluate(measure)["folded"] == 0:
            failures.append(Failure(page_name, "the chevron did not fold its section"))
        chevron.evaluate("element => element.click()")
        page.wait_for_timeout(100)
        if page.evaluate(measure)["folded"] != 0:
            failures.append(Failure(page_name, "the chevron did not unfold its section"))
    page.evaluate(f"window.scrollTo(0, {scroll})")
    page.wait_for_timeout(100)


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001
# @tests_req SwRS-MDOKFSTUDIO-TRUST-001
def check_preview_toolbar_rows(page: Page, scenario: dict, failures: list[Failure]) -> None:
    page_name = scenario["page"]
    toolbar = page.locator('[data-sphinx-preview-toolbar][role="toolbar"]')
    if toolbar.count() != 1:
        failures.append(Failure(page_name, "preview toolbar is missing or duplicated"))
        return
    render_options = scenario.get("render") or {}
    theme_labels = {"cream": "Preview theme: Cream theme", "dark": "Preview theme: Dark theme"}
    controls = (
        ('[data-sphinx-preview-refresh]', "Refresh preview"),
        ('[data-sphinx-preview-anchor]', "Anchor preview to text editor"),
        ('[data-sphinx-preview-edit-toggle]', "Toggle edit mode"),
        ('[data-sphinx-preview-theme-toggle]',
         theme_labels.get(scenario.get("previewThemeMode"), "Preview theme: Current theme")),
    )
    for selector, label in controls:
        if selector == '[data-sphinx-preview-edit-toggle]' and render_options.get("readOnly"):
            # A read-only preview keeps the Edit button, greyed, with the reason as tooltip.
            greyed = toolbar.locator(selector)
            if greyed.count() != 1 or greyed.get_attribute("aria-disabled") != "true":
                failures.append(Failure(page_name, "the read-only toolbar has no greyed Edit button"))
            elif "Editing is unavailable" not in (greyed.get_attribute("data-tooltip") or ""):
                failures.append(Failure(page_name, "the greyed Edit button does not say why"))
            continue
        button = toolbar.locator(selector)
        if button.count() != 1 or button.get_attribute("aria-label") != label:
            failures.append(Failure(page_name, f"toolbar control is missing or mislabeled: {label}"))
        elif button.is_hidden():
            failures.append(Failure(page_name, f"toolbar control is hidden: {label}"))
    comments_setting_off = page.evaluate("document.documentElement.getAttribute('data-okf-show-comments')") == "false"
    for selector, label in (
        ('[data-sphinx-preview-zoom-out]', "Zoom out"),
        ('[data-sphinx-preview-zoom-in]', "Zoom in"),
        ('[data-sphinx-preview-width-toggle]', "Width: Margin"),
        ('[data-sphinx-preview-diff-toggle]',
         "Show changes since last commit" if render_options.get("incomingChanges") is False else "Hide changes since last commit"),
        ('[data-sphinx-preview-comments-toggle]', "Hide comments"),
    ):
        button = toolbar.locator(selector)
        if selector == '[data-sphinx-preview-comments-toggle]' and comments_setting_off:
            # preview.showComments off is the master switch: the markup stays but the button is not offered.
            if button.count() != 1 or button.is_visible():
                failures.append(Failure(page_name, "the Comments button must be hidden when preview.showComments is off"))
            continue
        if button.count() != 1 or button.get_attribute("aria-label") != label:
            failures.append(Failure(page_name, f"toolbar control is missing or mislabeled: {label}"))
        elif button.is_hidden():
            failures.append(Failure(page_name, f"toolbar control is hidden: {label}"))
    rows = toolbar.evaluate(
        """element => [...element.querySelectorAll('[data-sphinx-preview-toolbar-row]')].map(child => ({
          row: child.getAttribute('data-sphinx-preview-toolbar-row'),
          buttons: [...child.children].filter(item => item.tagName === 'BUTTON').length,
          rect: (({top, bottom, left, right}) => ({top, bottom, left, right}))(child.getBoundingClientRect()),
        }))"""
    )
    expected_main = 3 if toolbar.locator('[data-sphinx-preview-edit-toggle]').count() else 2
    if [row["row"] for row in rows] != ["main", "navigation", "appearance", "layout", "content"]:
        failures.append(Failure(page_name, f"toolbar is not five rows (main, navigation, appearance, layout, content): {rows}"))
        return
    if rows[0]["buttons"] != expected_main:
        failures.append(Failure(page_name, f"toolbar row 1 does not hold {expected_main} buttons: {rows[0]['buttons']}"))
    failures.extend(Failure(page_name, f"toolbar row {index + 1} does not hold 3 buttons: {rows[index]['buttons']}") for index in range(1, 5) if rows[index]["buttons"] != 3)
    for check in (check_heading_fold, check_find_bar, check_side_by_side):
        check(page, toolbar, page_name, failures)
    check_diff_toggle(page, toolbar, page_name, failures, starts_pressed=render_options.get("incomingChanges") is not False)
    if any(upper["rect"]["bottom"] > lower["rect"]["top"] + 0.5 for upper, lower in zip(rows, rows[1:])):
        failures.append(Failure(page_name, "toolbar rows overlap"))
    # CR 153: the toolbar stays no wider than 134 px, so it never covers the table handle strip of a 1400 px window.
    toolbar_width = toolbar.evaluate("element => element.getBoundingClientRect().width")
    if toolbar_width > 134.5:
        failures.append(Failure(page_name, f"the toolbar is wider than 134 px: {toolbar_width}"))
    if toolbar.evaluate("element => element.getBoundingClientRect().left") < 0:
        failures.append(Failure(page_name, "toolbar leaves the pane on the left"))
    check_toolbar_collapse(page, toolbar, page_name, failures)
    # At the zoom limits the toolbar stays put and covers neither the sticky band text nor the page.
    zoom_in = toolbar.locator('[data-sphinx-preview-zoom-in]')
    zoom_out = toolbar.locator('[data-sphinx-preview-zoom-out]')
    starting_zoom = int(page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-zoom')"))
    try:
        for target, button in ((70, zoom_out), (200, zoom_in)):
            for _ in range(14):
                if button.is_disabled():
                    break
                button.click()
            # Let the runtime re-apply the reading line before the next click or scroll.
            page.wait_for_timeout(150)
            zoom = page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-zoom')")
            if zoom != str(target):
                failures.append(Failure(page_name, f"zoom did not reach {target} %: {zoom}"))
                continue
            if not button.is_disabled():
                failures.append(Failure(page_name, f"the zoom button is not disabled at {target} %"))
            geometry = page.evaluate(
                """() => {
                  const toolbar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();
                  const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
                  let bandOverlap = false;
                  if (band && !band.hidden) {
                    const range = document.createRange();
                    range.selectNodeContents(band);
                    for (const rect of range.getClientRects()) {
                      if (rect.width > 0 && rect.left < toolbar.right && rect.right > toolbar.left
                        && rect.top < toolbar.bottom && rect.bottom > toolbar.top) bandOverlap = true;
                    }
                  }
                  return {
                    bandOverlap,
                    inside: toolbar.left >= 0 && toolbar.right <= innerWidth && toolbar.top >= 0,
                  };
                }"""
            )
            if geometry["bandOverlap"]:
                failures.append(Failure(page_name, f"toolbar overlaps the sticky heading band at {target} %"))
            if not geometry["inside"]:
                failures.append(Failure(page_name, f"toolbar leaves the viewport at {target} %"))
    finally:
        for _ in range(14):
            current = int(page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-zoom')"))
            if current == starting_zoom:
                break
            (zoom_out if current > starting_zoom else zoom_in).click()
        page.wait_for_timeout(150)

def check_nested_list_typing(page: Page, scenario: dict, failures: list[Failure]) -> None:
  if not scenario.get("listTypingChecks"):
    return
  page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.get_by_text("jira-skill", exact=True).click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  original = editor.input_value()
  editor.evaluate("element => element.setSelectionRange(element.value.length, element.value.length)")
  expected = original
  for _ in range(6):
    editor.press("Space")
    expected += " "
    if editor.input_value() != expected:
      failures.append(Failure(scenario["page"], "repeated Space changed or replaced literal Markdown spaces"))
      return
  editor.press("Enter")
  expected += "\n  - "
  if editor.input_value() != expected:
    failures.append(Failure(scenario["page"], "Enter did not continue the current list line with its indentation and marker"))
  editor.press_sequentially("`new-skill`")
  expected += "`new-skill`"
  if editor.input_value() != expected:
    failures.append(Failure(scenario["page"], "Enter or subsequent typing did not preserve exact Markdown"))
  state = editor.evaluate("""element => ({
    focused: document.activeElement === element,
    start: element.selectionStart, end: element.selectionEnd,
    autocorrect: element.getAttribute('autocorrect'),
  })""")
  if not state["focused"] or state["start"] != len(expected) or state["end"] != len(expected):
    failures.append(Failure(scenario["page"], "list typing lost focus or moved the caret unexpectedly"))
  if state["autocorrect"] != "off":
    failures.append(Failure(scenario["page"], "Markdown editor did not disable text autocorrection"))
  page.wait_for_timeout(600)  # autosave is debounced (400 ms)
  saved = page.evaluate("window.visualMessages.filter(message => message.type === 'previewEditSave').at(-1)?.editedText")
  if saved != expected + "\n":
    failures.append(Failure(scenario["page"], "nested list autosave did not retain spaces and newline exactly"))


def check_editor_keyboard(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Up/Down on wrapped lines stay in the editor, * wraps a selection, and native undo works."""
  if not scenario.get("editorKeyboardChecks"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  if page.locator("html").get_attribute("data-sphinx-preview-edit-mode") != "on":
    page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.locator("main p", has_text="Wrapped paragraphs keep").click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  original = editor.input_value()
  opens = lambda: page.evaluate("window.visualMessages.filter(m => m.type === 'previewEditOpen').length")
  opened = opens()
  # A: put the caret on the second visual line with a real click, then press ArrowUp.
  metrics = editor.evaluate("""element => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { x: box.x, y: box.y, paddingTop: parseFloat(style.paddingTop),
      paddingLeft: parseFloat(style.paddingLeft),
      lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
      height: box.height };
  }""")
  if metrics["height"] < metrics["lineHeight"] * 3:
    failures.append(Failure(page_name, f"the long paragraph does not wrap onto 3+ lines: {metrics}"))
    return
  page.mouse.click(metrics["x"] + metrics["paddingLeft"] + 30,
                   metrics["y"] + metrics["paddingTop"] + metrics["lineHeight"] * 1.5)
  second_line_caret = editor.evaluate("element => element.selectionStart")
  if second_line_caret <= 0:
    failures.append(Failure(page_name, "clicking the second visual line left the caret at the start"))
  page.keyboard.press("ArrowUp")
  first_line_caret = editor.evaluate("element => element.selectionStart")
  if page.locator('textarea[aria-label="Raw Markdown block"]').count() != 1 or opens() != opened:
    failures.append(Failure(page_name, "ArrowUp on the second visual line left the block editor"))
  elif editor.input_value() != original or not (0 <= first_line_caret < second_line_caret):
    failures.append(Failure(page_name, f"ArrowUp did not move the caret up a visual line: {second_line_caret} -> {first_line_caret}"))
  else:
    page.keyboard.press("ArrowDown")
    if editor.evaluate("element => element.selectionStart") <= first_line_caret or opens() != opened:
      failures.append(Failure(page_name, "ArrowDown on the first visual line did not move down within the editor"))
  # Real-layout probe checks: a word that wraps whole onto line 2 must not make the caret look
  # like it is on line 1, and a caret on a trailing empty line is on the last visual line only.
  line_two = page.evaluate("""() => {
    const element = document.querySelector('textarea[aria-label="Raw Markdown block"]');
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return { x: box.x + parseFloat(style.paddingLeft) + 1,
      y: box.y + parseFloat(style.paddingTop) + (parseFloat(style.lineHeight) || 20) * 1.5 };
  }""")
  page.mouse.click(line_two["x"], line_two["y"])
  line_two_start = editor.evaluate("element => element.selectionStart")
  word_end = original.find(" ", line_two_start)
  if line_two_start <= 0 or word_end - line_two_start < 4:
    failures.append(Failure(page_name, f"could not find a word starting line 2: {line_two_start}, {word_end}"))
  else:
    for offset in (1, 2, word_end - line_two_start - 1):
      editor.evaluate("(element, at) => element.setSelectionRange(at, at)", line_two_start + offset)
      page.keyboard.press("ArrowUp")
      stayed = page.locator('textarea[aria-label="Raw Markdown block"]').count() == 1 and opens() == opened
      moved = editor.evaluate("element => element.selectionStart") < line_two_start + offset
      if not (stayed and moved):
        failures.append(Failure(page_name, f"ArrowUp inside the first word of line 2 (+{offset}) left the editor or did not move the caret"))
  editor.evaluate("element => element.setSelectionRange(element.value.length, element.value.length)")
  page.keyboard.press("Enter")
  page.keyboard.press("ArrowUp")
  if (page.locator('textarea[aria-label="Raw Markdown block"]').count() != 1 or opens() != opened
      or editor.evaluate("element => element.selectionStart") >= len(original) + 1):
    failures.append(Failure(page_name, "ArrowUp from the empty line after a trailing newline left the editor"))
  page.keyboard.press("Escape")
  page.locator("main p", has_text="Wrapped paragraphs keep").click()
  editor.wait_for(state="visible")
  if editor.input_value() != original:
    failures.append(Failure(page_name, "Escape after the probe checks did not restore the paragraph"))
    return
  # The first visual line still hands over to the previous block.
  editor.evaluate("element => element.setSelectionRange(0, 0)")
  page.keyboard.press("ArrowUp")
  page.wait_for_function(
    "count => window.visualMessages.filter(m => m.type === 'previewEditOpen').length > count", arg=opened)
  if "earlier paragraph" not in page.locator('textarea[aria-label="Raw Markdown block"]').input_value():
    failures.append(Failure(page_name, "ArrowUp on the first visual line did not open the previous block"))
  page.keyboard.press("Escape")
  page.locator("main p", has_text="Wrapped paragraphs keep").click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  if editor.input_value() != original:
    failures.append(Failure(page_name, "reopening the long paragraph did not restore its text"))
    return
  # C: select the first word and type * twice with the real keyboard.
  editor.evaluate("element => { element.focus(); element.setSelectionRange(0, 7); }")
  page.keyboard.type("*")
  save_step(page, scenario, "selected", caret="hide")
  if not editor.input_value().startswith("*Wrapped* "):
    failures.append(Failure(page_name, f"typing * on a selection did not wrap it: {editor.input_value()[:20]!r}"))
  page.keyboard.type("*")
  value = editor.input_value()
  selection = editor.evaluate("element => [element.selectionStart, element.selectionEnd]")
  if not value.startswith("**Wrapped** ") or selection != [2, 9]:
    failures.append(Failure(page_name, f"second * did not give **Wrapped** with the word selected: {value[:20]!r} {selection}"))
  # B: the native undo reverts the two wraps, redo applies them again.
  undo = "Meta+Z" if sys.platform == "darwin" else "Control+Z"
  redo = "Meta+Shift+Z" if sys.platform == "darwin" else "Control+Shift+Z"
  page.keyboard.press(undo)
  page.keyboard.press(undo)
  if editor.input_value() != original:
    failures.append(Failure(page_name, f"undo did not restore the paragraph text: {editor.input_value()[:24]!r}"))
  page.keyboard.press(redo)
  page.keyboard.press(redo)
  if not editor.input_value().startswith("**Wrapped** "):
    failures.append(Failure(page_name, f"redo did not reapply the wraps: {editor.input_value()[:24]!r}"))


def check_paste_rich_text(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Rich text pasted in a paragraph editor goes to the host as HTML and comes back as Markdown."""
  if not scenario.get("pasteRichTextChecks"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  if page.locator("html").get_attribute("data-sphinx-preview-edit-mode") != "on":
    page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.locator("main p", has_text="Wrapped paragraphs keep").click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  original = editor.input_value()
  html = ("<h2>Plan</h2><p>Read <b>the</b> <a href=\"https://example.com/doc\">doc</a></p>"
          "<ul><li>One<ul><li>Nested</li></ul></li></ul>")
  markdown = "## Plan\n\nRead **the** [doc](https://example.com/doc)\n\n- One\n  - Nested"
  paste = """(args) => {
    const element = document.querySelector('textarea[aria-label="Raw Markdown block"]');
    const data = new DataTransfer();
    data.setData('text/html', args.html);
    data.setData('text/plain', args.plain);
    const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }"""
  editor.evaluate("element => { element.focus(); element.select(); }")
  if not page.evaluate(paste, {"html": html, "plain": "Plan Read the doc One Nested"}):
    failures.append(Failure(page_name, "a rich-text paste was not taken over by the editor"))
    return
  page.wait_for_function("() => window.visualMessages.some(m => m.type === 'previewPasteHtml')")
  if editor.input_value() != original:
    failures.append(Failure(page_name, "the editor changed before the host answered the rich-text paste"))
  page.evaluate("""(markdown) => {
    const request = window.visualMessages.filter(m => m.type === 'previewPasteHtml').at(-1);
    const result = { type: 'previewPasteHtmlResult', editId: request.editId, ok: true, markdown };
    window.dispatchEvent(new MessageEvent('message', { data: result }));
  }""", markdown)
  if editor.input_value() != markdown:
    failures.append(Failure(page_name, f"the pasted Markdown did not replace the selection: {editor.input_value()[:60]!r}"))
  save_step(page, scenario, "pasted", caret="hide")
  undo = "Meta+Z" if sys.platform == "darwin" else "Control+Z"
  page.keyboard.press(undo)
  if editor.input_value() != original:
    failures.append(Failure(page_name, f"one undo did not remove the whole paste: {editor.input_value()[:60]!r}"))
  # Cmd/Ctrl+Shift+V: the keydown marks the next paste as plain text, which the editor leaves alone.
  editor.evaluate("element => { element.focus(); element.setSelectionRange(0, 0); }")
  editor.evaluate("""element => element.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'V', shiftKey: true, metaKey: true, ctrlKey: true, bubbles: true, cancelable: true }))""")
  before = page.evaluate("window.visualMessages.filter(m => m.type === 'previewPasteHtml').length")
  plain_prevented = page.evaluate(paste, {"html": html, "plain": "Plan"})
  after = page.evaluate("window.visualMessages.filter(m => m.type === 'previewPasteHtml').length")
  if plain_prevented or after != before:
    failures.append(Failure(page_name, "a paste right after Cmd/Ctrl+Shift+V was converted instead of left plain"))


def check_paste_image(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """CR 050: an image pasted in a paragraph editor goes on a paragraph of its own (mid-line, then at the end).

  CR 118: Enter on the selected alt text keeps it and moves the caret after the image.
  """
  if not scenario.get("pasteImageChecks"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  if page.locator("html").get_attribute("data-sphinx-preview-edit-mode") != "on":
    page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.locator("main p", has_text="A paragraph after the standalone image.").click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  original = editor.input_value()
  if original != "A paragraph after the standalone image.":
    failures.append(Failure(page_name, f"unexpected paragraph source {original!r}"))
    return
  png = base64.b64encode((HERE / "external-img" / "markdown-logo.png").read_bytes()).decode("ascii")
  paste = """(base64) => {
    const element = document.querySelector('textarea[aria-label="Raw Markdown block"]');
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], 'clipboard.png', { type: 'image/png' }));
    const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }"""

  def paste_image(file_name: str) -> bool:
    before = page.evaluate("window.visualMessages.filter(m => m.type === 'previewPasteImage').length")
    if not page.evaluate(paste, png):
      failures.append(Failure(page_name, "an image paste was not taken over by the editor"))
      return False
    page.wait_for_function(
      "(count) => window.visualMessages.filter(m => m.type === 'previewPasteImage').length > count", arg=before)
    page.evaluate("""(fileName) => {
      const request = window.visualMessages.filter(m => m.type === 'previewPasteImage').at(-1);
      const result = { type: 'previewPasteImageResult', editId: request.editId, ok: true, fileName };
      window.dispatchEvent(new MessageEvent('message', { data: result }));
    }""", file_name)
    return True

  def selected() -> str:
    return editor.evaluate("element => element.value.slice(element.selectionStart, element.selectionEnd)")

  # In the middle of the text: the paragraph is split around the image.
  editor.evaluate("element => { element.focus(); const at = element.value.indexOf(' after'); element.setSelectionRange(at, at); }")
  if not paste_image("image.png"):
    return
  expected = "A paragraph\n\n![image.png](image.png)\n\nafter the standalone image."
  if editor.input_value() != expected:
    failures.append(Failure(page_name, f"a mid-line paste is not a paragraph of its own: {editor.input_value()!r}"))
  if selected() != "image.png":
    failures.append(Failure(page_name, f"the pasted file name is not selected: {selected()!r}"))
  undo = "Meta+Z" if sys.platform == "darwin" else "Control+Z"
  page.keyboard.press(undo)
  if editor.input_value() != original:
    failures.append(Failure(page_name, f"one undo did not remove the whole image paste: {editor.input_value()!r}"))
  # At the end, after a typed space (as in the real-window capture): no image glued to the line.
  editor.evaluate("element => { element.focus(); element.setSelectionRange(element.value.length, element.value.length); }")
  page.keyboard.type(" ")
  if not paste_image("image-1.png"):
    return
  expected = original + "\n\n![image-1.png](image-1.png)"
  if editor.input_value() != expected:
    failures.append(Failure(page_name, f"a paste at the end of the line is not a paragraph of its own: {editor.input_value()!r}"))
  if selected() != "image-1.png":
    failures.append(Failure(page_name, f"the pasted file name is not selected: {selected()!r}"))
  # CR 118: Enter on the selected alt text validates it and puts the caret just after the image.
  text_before_enter = editor.input_value()
  page.keyboard.press("Enter")
  if editor.input_value() != text_before_enter:
    failures.append(Failure(page_name, f"Enter on the selected alt text changed the text: {editor.input_value()!r}"))
  caret = editor.evaluate("element => [element.selectionStart, element.selectionEnd]")
  if caret != [len(text_before_enter), len(text_before_enter)]:
    failures.append(Failure(page_name, f"Enter on the alt text did not move the caret after the image: {caret!r}"))


def check_insert_after_figure(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The + after a figure that ends the document opens an empty editor after the closing fence."""
  if not scenario.get("insertAfterFigureChecks"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  block = scenario.get("insertAfterBlock") or {"selector": "main figure[data-sphinx-source-line]", "line": 9}
  figure = page.locator(block["selector"])
  if figure.count() != 1:
    failures.append(Failure(page_name, f"expected one mapped block, found {figure.count()}"))
    return
  figure.scroll_into_view_if_needed()
  figure.hover()
  point = figure.locator("xpath=following-sibling::*[1][contains(@class, 'sphinx-preview-insert-point')]")
  if point.count() != 1:
    failures.append(Failure(page_name, "no insertion point follows the final figure"))
    return
  point.locator("button[aria-label='Insert a block here']").click()
  editor = page.locator(".sphinx-preview-block-editor textarea")
  editor.wait_for(state="visible")
  opened = page.evaluate(
    "window.visualMessages.filter(m => m.type === 'previewEditOpen' && m.insertAfterLine !== undefined).at(-1)")
  # Figure fixture: lines 5-9, line 9 is the closing colon fence; image fixture: line 5.
  if not opened or opened.get("insertAfterLine") != block["line"]:
    failures.append(Failure(page_name, f"insertion did not carry the block's last line {block['line']}: {opened}"))
  if editor.input_value() != "":
    failures.append(Failure(page_name, "the new block editor is not empty"))
  below = page.evaluate("""selector => {
    const figure = document.querySelector(selector).getBoundingClientRect();
    const editor = document.querySelector('.sphinx-preview-block-editor').getBoundingClientRect();
    return editor.top >= figure.bottom - 1;
  }""", block["selector"])
  if not below:
    failures.append(Failure(page_name, "the new block editor is not below the figure"))


TOP_SPACING_MINIMUM = 20


def check_top_spacing(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The first block's editor frame and the Start writing button keep room above them."""
  mode = scenario.get("topSpacingChecks")
  if not mode:
    return
  page_name = scenario["page"]
  if mode == "empty-open":
    if page.locator(".sphinx-preview-block-editor").count() != 0:
      failures.append(Failure(page_name, "an editor was open before Enter was pressed"))
    # The edit toggle holds the focus after it was clicked; Enter belongs to the preview itself.
    page.mouse.click(300, 700)
    page.keyboard.press("Enter")
    page.locator(".sphinx-preview-block-editor textarea").wait_for(state="visible", timeout=2000)
    opened = page.evaluate(
      "window.visualMessages.filter(m => m.type === 'previewEditOpen').at(-1)")
    if not opened or opened.get("insertAfterLine") != 0:
      failures.append(Failure(page_name, f"Enter did not open the new-block editor: {opened}"))
    if page.locator(".sphinx-preview-insert-point--start button").is_visible():
      failures.append(Failure(page_name, "Start writing is still visible under the open editor"))
    if not page.evaluate(
      "() => document.activeElement === document.querySelector('.sphinx-preview-block-editor textarea')"
    ):
      failures.append(Failure(page_name, "the new-block editor does not hold the focus"))
    selector = ".sphinx-preview-block-editor-host"  # P4: the palette on top of the frame is the first thing on the page
  elif mode == "empty-start":
    selector = ".sphinx-preview-insert-point--start button"
    check_start_hint(page, page_name, failures)
  else:
    selector = ".sphinx-preview-block-editor-host"  # P4: the palette on top of the frame is the first thing on the page
  target = page.locator(selector)
  if target.count() != 1 or not target.is_visible():
    failures.append(Failure(page_name, f"{selector} is not visible exactly once"))
    return
  geometry = target.evaluate("""element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const outline = style.outlineStyle === 'none' ? 0
      : (parseFloat(style.outlineWidth) || 0) + (parseFloat(style.outlineOffset) || 0);
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const bar = toolbar ? toolbar.getBoundingClientRect() : null;
    const overlaps = bar !== null
      && rect.left < bar.right && rect.right > bar.left && rect.top < bar.bottom && rect.bottom > bar.top;
    return { top: rect.top + window.scrollY - Math.max(0, outline), overlaps };
  }""")
  if geometry["top"] < TOP_SPACING_MINIMUM:
    failures.append(Failure(
      page_name,
      f"{selector} starts {geometry['top']:.1f}px from the top, expected at least {TOP_SPACING_MINIMUM}px",
    ))
  if geometry["overlaps"]:
    failures.append(Failure(page_name, f"{selector} overlaps the floating toolbar"))


# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-020
def check_width_modes(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The Width button cycles margin, auto and full; only Auto lets wide blocks leave the column."""
  if not scenario.get("widthModeChecks"):
    return
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-width-toggle]")
  if button.count() != 1:
    failures.append(Failure(page_name, "the Width button is missing"))
    return
  measure = """() => {
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    const columnLeft = box.left + parseFloat(style.paddingLeft);
    const columnRight = box.right - parseFloat(style.paddingRight);
    const pane = document.documentElement.clientWidth;
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; };
    const tables = [...content.querySelectorAll(':scope > table')].map(rect);
    const figures = [...content.querySelectorAll(':scope > figure')];
    const figure = figures[0];
    const narrow = figures[1];
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    const captionOf = box => {
      const caption = box && box.querySelector('figcaption p, figcaption, :scope > p:last-child');
      if (!caption) return null;
      const range = document.createRange();
      range.selectNodeContents(caption);
      const r = range.getBoundingClientRect();
      return { centre: (r.left + r.right) / 2, align: getComputedStyle(caption).textAlign };
    };
    const imageOf = box => { const i = box && box.querySelector('img'); return i ? rect(i) : null; };
    return {
      narrowFigure: narrow ? { ...rect(narrow), image: imageOf(narrow), caption: captionOf(narrow) } : null,
      mode: document.documentElement.getAttribute('data-sphinx-preview-width'),
      columnLeft, columnRight, pane,
      tables,
      figure: figure ? rect(figure) : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bandPadding: band ? parseFloat(getComputedStyle(band).paddingLeft) : 0,
    };
  }"""
  def settle() -> None:
    page.wait_for_timeout(250)
  try:
    seen = {}
    for expected in ("margin", "auto", "full"):
      for _ in range(3):
        if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == expected:
          break
        button.click()
        settle()
      state = page.evaluate(measure)
      seen[expected] = state
      if state["mode"] != expected:
        failures.append(Failure(page_name, f"the Width button did not reach {expected}: {state['mode']}"))
        continue
      if state["overflowX"] > 1:
        failures.append(Failure(page_name, f"{expected}: horizontal page scroll of {state['overflowX']}px"))
      if len(state["tables"]) < 2:
        failures.append(Failure(page_name, "the fixture tables are missing"))
        continue
      small, wide = state["tables"][0], state["tables"][1]
      column = state["columnRight"] - state["columnLeft"]
      inside = lambda r: r["left"] >= state["columnLeft"] - 1.5 and r["right"] <= state["columnRight"] + 1.5
      if not inside(small):
        failures.append(Failure(page_name, f"{expected}: the small table leaves the column"))
      gutter_ok = lambda r: r["left"] >= 15 and r["right"] <= state["pane"] - 15
      # U22: a table or figure narrower than the column is centred on it, at its own width.
      column_centre = (state["columnLeft"] + state["columnRight"]) / 2
      if small["width"] < column - 20 and abs((small["left"] + small["right"]) / 2 - column_centre) > 2:
        failures.append(Failure(page_name, f"{expected}: the narrow table is not centred in the column"))
      narrow_figure = state["narrowFigure"]
      if not narrow_figure or not narrow_figure["image"]:
        failures.append(Failure(page_name, "the narrow figure is missing"))
      else:
        picture = narrow_figure["image"]
        if picture["width"] > column - 20:
          failures.append(Failure(page_name, f"{expected}: the narrow figure fills the column ({picture['width']:.0f}px)"))
        elif abs(picture["left"] - state["columnLeft"] - (state["columnRight"] - picture["right"])) > 2:
          failures.append(Failure(page_name, f"{expected}: the narrow figure is not centred (gaps {picture['left'] - state['columnLeft']:.1f} and {state['columnRight'] - picture['right']:.1f}px)"))
        caption = narrow_figure["caption"]
        if not caption or caption["align"] != "center" or abs(caption["centre"] - (picture["left"] + picture["right"]) / 2) > 2:
          failures.append(Failure(page_name, f"{expected}: the narrow figure caption is not centred under it"))
      if expected == "margin":
        if not inside(wide):
          failures.append(Failure(page_name, "margin: the wide table leaves the column"))
        if state["figure"] and not inside(state["figure"]):
          failures.append(Failure(page_name, "margin: the figure leaves the column"))
      if expected == "auto":
        if state["pane"] - 32 > column + 4:
          if wide["width"] <= column + 4:
            failures.append(Failure(page_name, f"auto: the wide table did not break out ({wide['width']:.0f}px, column {column:.0f}px)"))
          if not gutter_ok(wide):
            failures.append(Failure(page_name, "auto: the wide table leaves the pane gutters"))
          if abs((wide["left"] + wide["right"]) / 2 - state["pane"] / 2) > 3:
            failures.append(Failure(page_name, "auto: the wide table is not centred on the pane"))
          if state["figure"] and state["figure"]["width"] <= column + 4:
            failures.append(Failure(page_name, "auto: the wide figure did not break out"))
          if state["figure"] and not gutter_ok(state["figure"]):
            failures.append(Failure(page_name, "auto: the wide figure leaves the pane gutters"))
      if expected == "full":
        if abs(column - (state["pane"] - 2 * (state["columnLeft"] - 0))) > 40 and column < state["pane"] - 80:
          failures.append(Failure(page_name, f"full: the column ({column:.0f}px) does not span the pane ({state['pane']}px)"))
    margin, full = seen.get("margin"), seen.get("full")
    if margin and full and (full["columnRight"] - full["columnLeft"]) + 1 < (margin["columnRight"] - margin["columnLeft"]):
      failures.append(Failure(page_name, "full: the column is narrower than in margin"))
  finally:
    for _ in range(3):
      if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == "margin":
        break
      button.click()
      page.wait_for_timeout(150)


def apply_width_shot(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Leaves the page in the width mode the screenshot is meant to show (README capture)."""
  wanted = scenario.get("widthModeShot")
  if not wanted:
    return
  button = page.locator("[data-sphinx-preview-width-toggle]")
  for _ in range(3):
    if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == wanted:
      break
    button.click()
    page.wait_for_timeout(250)
  state = page.evaluate("""() => {
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    const column = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; };
    return { column, pane: document.documentElement.clientWidth,
      table: rect(content.querySelector(':scope > table')), figure: rect(content.querySelector(':scope > figure')) };
  }""")
  # Only single-word cells must stay whole: the 5em column floor (SwRS-MDOKFSTUDIO-LAYOUT-032) can push a
  # many-column table past the pane, and a multi-word header then wraps between words.
  wrapped = page.evaluate("""() => [...document.querySelectorAll('#sphinx-myst-preview-content > table :where(th, td)')].filter(cell => {
    if (/\\s/u.test((cell.textContent || '').trim())) return false;
    const range = document.createRange();
    range.selectNodeContents(cell);
    const style = getComputedStyle(cell);
    const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
    return range.getBoundingClientRect().height > line * 1.4;
  }).map(cell => cell.textContent)""")
  if wrapped:
    failures.append(Failure(scenario["page"], f"{wanted}: the table fits the pane but cells wrap: {wrapped[:4]}"))
  for name in ("table", "figure"):
    item = state[name]
    if item["width"] <= state["column"] + 4:
      failures.append(Failure(scenario["page"], f"{wanted}: the {name} did not break out of the column"))
    if abs((item["left"] + item["right"]) / 2 - state["pane"] / 2) > 3:
      failures.append(Failure(scenario["page"], f"{wanted}: the {name} is not centred on the pane"))


WIDTH_BREAK_REPORT_DIR = VISUAL_REPORT_DIR / "width-margins"


# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-001
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-022
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
def check_width_mode_break(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P2/P7: side margins of text, table, code block and figure in one width mode.

  Auto and Full width both leave 16 px between a wide block and the pane edge; Full width gives the
  prose the same side margin. Numbers go to out/reports/visual/width-margins/<group>/<scenario>.json.
  """
  wanted = scenario.get("widthModeBreak")
  if not wanted:
    return
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-width-toggle]")
  for _ in range(3):
    if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == wanted:
      break
    button.click()
    page.wait_for_timeout(250)
  page.wait_for_timeout(250)
  state = page.evaluate("""() => {
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    const pane = document.documentElement.clientWidth;
    const rect = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, top: r.top }; };
    const text = [...content.querySelectorAll(':scope > p')].map(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return rect(element);
    });
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    return {
      mode: document.documentElement.getAttribute('data-sphinx-preview-width'),
      pane,
      columnLeft: box.left + parseFloat(style.paddingLeft),
      columnRight: box.right - parseFloat(style.paddingRight),
      text: text[0],
      table: rect(content.querySelector(':scope > table')),
      code: rect(content.querySelector(':scope > pre, :scope > .highlight, :scope > div.highlight')),
      figure: rect(content.querySelector(':scope > figure, :scope > p[data-sphinx-preview-figure]')),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollY: window.scrollY,
    };
  }""")
  pane = state["pane"]
  margins = {}
  for name in ("text", "table", "code", "figure"):
    item = state[name]
    margins[name] = None if item is None else {"left": round(item["left"], 1), "right": round(pane - item["right"], 1), "width": round(item["width"], 1)}
  column = state["columnRight"] - state["columnLeft"]
  report = {"scenario": scenario["id"], "mode": state["mode"], "pane": pane, "column": round(column, 1),
    "margins": margins, "overflowX": state["overflowX"], "scrollY": state["scrollY"]}
  WIDTH_BREAK_REPORT_DIR.mkdir(parents=True, exist_ok=True)
  report_path(WIDTH_BREAK_REPORT_DIR, scenario["id"]).write_text(json.dumps(report, indent=2), encoding="utf-8")
  if state["mode"] != wanted:
    failures.append(Failure(page_name, f"the Width button did not reach {wanted}: {state['mode']}"))
    return
  if state["overflowX"] > 1:
    failures.append(Failure(page_name, f"{wanted}: horizontal page scroll of {state['overflowX']}px"))
  for name in ("text", "table", "code", "figure"):
    if margins[name] is None:
      failures.append(Failure(page_name, f"{wanted}: the {name} block is missing"))
      return
  inside = lambda item: item["left"] >= state["columnLeft"] - 1.5 and item["right"] <= state["columnRight"] + 1.5
  if wanted == "margin":
    for name in ("table", "code", "figure"):
      if not inside(state[name]):
        failures.append(Failure(page_name, f"margin: the {name} leaves the column ({margins[name]})"))
  else:
    for name in ("table", "code", "figure"):
      item = state[name]
      if item["left"] < 15 or item["right"] > pane - 15:
        failures.append(Failure(page_name, f"{wanted}: the {name} leaves the 16 px pane gutters ({margins[name]})"))
      if item["width"] <= column + 4 and column < pane - 60 and wanted == "auto":
        failures.append(Failure(page_name, f"auto: the {name} did not break out ({item['width']:.0f}px, column {column:.0f}px)"))
      if abs((item["left"] + item["right"]) / 2 - pane / 2) > 3:
        failures.append(Failure(page_name, f"{wanted}: the {name} is not centred on the pane ({margins[name]})"))
  if wanted == "auto":
    # The table is wider than the pane, so it takes everything except the gutters.
    table = margins["table"]
    if abs(table["left"] - 16) > 2 or abs(table["right"] - 16) > 2:
      failures.append(Failure(page_name, f"auto: the table edge is not 16 px from the pane edge ({table})"))
  if wanted == "full":
    text = margins["text"]
    if abs(text["left"] - 16) > 2 or abs(text["right"] - 16) > 2:
      failures.append(Failure(page_name, f"full: the text margins are {text['left']}/{text['right']}px, expected 16 px like a broken-out table in Auto"))


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-033
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-040
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-045
def check_toc_column(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The TOC button opens a right column below the toolbar; wide panes only."""
  if not scenario.get("tocChecks"):
    return
  page_name = scenario["page"]
  toggle = page.locator("[data-sphinx-preview-toc-toggle]")
  if toggle.count() != 1:
    failures.append(Failure(page_name, "the TOC button is missing"))
    return
  measure = """() => {
    const root = document.documentElement;
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
    const nav = document.querySelector('nav[data-sphinx-preview-toc]');
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    return {
      state: root.getAttribute('data-sphinx-preview-toc'),
      shown: !!nav && getComputedStyle(nav).display !== 'none',
      nav: nav ? rect(nav) : null,
      toolbar: rect(toolbar),
      contentRight: box.right,
      pane: root.clientWidth,
      columnLeft: box.left + parseFloat(style.paddingLeft),
      columnRight: box.right - parseFloat(style.paddingRight),
      tables: [...content.querySelectorAll(':scope > table')].map(rect),
      entries: [...document.querySelectorAll('nav[data-sphinx-preview-toc] li[data-level]')].map(item => ({ level: item.getAttribute('data-level'), text: item.textContent })),
      bandRight: band && !band.hidden ? band.getBoundingClientRect().right : null,
      overflowX: root.scrollWidth - root.clientWidth,
      scrollY: window.scrollY,
    };
  }"""
  wide_pane = scenario["width"] >= 760
  try:
    page.evaluate("window.scrollTo(0, 0)")
    closed = page.evaluate(measure)
    if closed["state"] != "closed" or closed["shown"]:
      failures.append(Failure(page_name, f"the TOC must start closed: {closed['state']}"))
    toggle.click()
    page.wait_for_timeout(300)
    opened = page.evaluate(measure)
    if opened["state"] != "open":
      failures.append(Failure(page_name, "the TOC button did not open the column"))
      return
    if not wide_pane:
      if opened["shown"]:
        failures.append(Failure(page_name, "the TOC column must be hidden on a pane under 760px"))
      if abs(opened["contentRight"] - closed["contentRight"]) > 1:
        failures.append(Failure(page_name, "a hidden TOC column must not narrow the content"))
      if toggle.get_attribute("aria-pressed") != "true":
        failures.append(Failure(page_name, "the TOC button must still reflect the preference"))
      return
    if not opened["shown"] or not opened["nav"]:
      failures.append(Failure(page_name, "the TOC column is not shown on a wide pane"))
      return
    nav = opened["nav"]
    if nav["top"] < opened["toolbar"]["bottom"] + 7:
      failures.append(Failure(page_name, f"the TOC column starts at {nav['top']:.0f}px, under the toolbar bottom {opened['toolbar']['bottom']:.0f}px"))
    if nav["right"] > opened["pane"] + 1 or nav["left"] < opened["columnRight"]:
      failures.append(Failure(page_name, "the TOC column overlaps the content column"))
    for table in opened["tables"]:
      if table["right"] > nav["left"] + 1:
        failures.append(Failure(page_name, "the TOC column overlaps a table"))
    if opened["bandRight"] is not None and opened["bandRight"] > nav["left"] + 1:
      failures.append(Failure(page_name, "the sticky heading band runs under the TOC column"))
    if opened["overflowX"] > 1:
      failures.append(Failure(page_name, f"horizontal page scroll of {opened['overflowX']}px with the TOC open"))
    levels = sorted({entry["level"] for entry in opened["entries"]})
    if levels != ["1", "2", "3", "4"]:
      failures.append(Failure(page_name, f"the TOC lists levels {levels}, expected 1 to 4"))
    if any("Too deep" in entry["text"] for entry in opened["entries"]):
      failures.append(Failure(page_name, "the TOC lists an h5"))
    width_button = page.locator("[data-sphinx-preview-width-toggle]")
    for expected in ("auto", "full"):
      for _ in range(3):
        if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == expected:
          break
        width_button.click()
        page.wait_for_timeout(250)
      state = page.evaluate(measure)
      nav = state["nav"]
      if state["overflowX"] > 1:
        failures.append(Failure(page_name, f"{expected}: horizontal page scroll of {state['overflowX']}px with the TOC open"))
      if state["columnRight"] > nav["left"] + 1:
        failures.append(Failure(page_name, f"{expected}: the content column runs under the TOC column"))
      for table in state["tables"]:
        if table["right"] > nav["left"] + 1:
          failures.append(Failure(page_name, f"{expected}: a table runs under the TOC column"))
        # U22: in Auto a table wider than the column is centred on the area left of the TOC column.
        if expected == "auto" and table["width"] > state["columnRight"] - state["columnLeft"] + 4:
          if abs((table["left"] + table["right"]) / 2 - nav["left"] / 2) > 3:
            failures.append(Failure(page_name, "auto: the wide table is not centred on the area left of the TOC column"))
          if table["left"] < 15:
            failures.append(Failure(page_name, "auto: the wide table leaves the pane on the left"))
    for _ in range(3):
      if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == "margin":
        break
      width_button.click()
      page.wait_for_timeout(150)
    zoom_in = page.locator("[data-sphinx-preview-zoom-in]")
    for _ in range(10):
      if zoom_in.is_enabled():
        zoom_in.click()
    page.wait_for_timeout(300)
    zoomed = page.evaluate(measure)
    if zoomed["nav"] and (zoomed["columnRight"] > zoomed["nav"]["left"] + 1 or zoomed["overflowX"] > 1):
      failures.append(Failure(page_name, "zoom 200%: the content overlaps the TOC column or scrolls horizontally"))
    zoom_out = page.locator("[data-sphinx-preview-zoom-out]")
    for _ in range(10):
      if zoom_out.is_enabled():
        zoom_out.click()
    page.wait_for_timeout(200)
    for _ in range(3):
      if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-zoom')") == "100":
        break
      zoom_in.click()
    page.wait_for_timeout(200)
    page.evaluate("window.scrollTo(0, 0)")
    before = page.evaluate("window.scrollY")
    page.locator("nav[data-sphinx-preview-toc] li[data-level] button:not([data-sphinx-preview-toc-twisty])").nth(8).click()
    page.wait_for_timeout(400)
    after = page.evaluate(measure)
    if after["scrollY"] <= before + 50:
      failures.append(Failure(page_name, "clicking a TOC entry did not scroll to its heading"))
    current = page.evaluate("""() => {
      const nav = document.querySelector('nav[data-sphinx-preview-toc]');
      const marked = [...nav.querySelectorAll('[aria-current="location"]')];
      if (marked.length !== 1) return { count: marked.length };
      const button = marked[0];
      const parse = value => (value.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = rgb => {
        const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const text = parse(getComputedStyle(button).color);
      const base = parse(getComputedStyle(nav).backgroundColor);
      // The highlight is a 14 % tint of the text colour over the column background.
      const tinted = base.map((v, i) => v * 0.86 + text[i] * 0.14);
      const hi = Math.max(luminance(text), luminance(tinted)) + 0.05;
      const lo = Math.min(luminance(text), luminance(tinted)) + 0.05;
      const box = button.getBoundingClientRect();
      const area = nav.getBoundingClientRect();
      return { count: 1, contrast: hi / lo, visible: box.top >= area.top - 1 && box.bottom <= area.bottom + 1 };
    }""")
    if current["count"] != 1:
      failures.append(Failure(page_name, f"the TOC must mark exactly one current entry, found {current['count']}"))
    else:
      if current["contrast"] < 4.5:
        failures.append(Failure(page_name, f"the current TOC entry contrast is {current['contrast']:.2f}, expected at least 4.5"))
      if not current["visible"]:
        failures.append(Failure(page_name, "the current TOC entry is scrolled out of the TOC column"))
    twisty = page.locator("nav[data-sphinx-preview-toc] button[data-sphinx-preview-toc-twisty]").first
    if twisty.count():
      twisty.click()
      page.wait_for_timeout(100)
      folded = page.evaluate("document.querySelectorAll('nav[data-sphinx-preview-toc] li[hidden]').length")
      twisty.click()
      page.wait_for_timeout(100)
      unfolded = page.evaluate("document.querySelectorAll('nav[data-sphinx-preview-toc] li[hidden]').length")
      if folded < 1 or unfolded != 0:
        failures.append(Failure(page_name, f"a TOC twisty must hide and show its sub-entries ({folded} hidden, then {unfolded})"))
  finally:
    if toggle.get_attribute("aria-pressed") == "true":
      toggle.click()
      page.wait_for_timeout(150)
    page.evaluate("window.scrollTo(0, 0)")


def check_toc_shot(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P1: leaves the TOC open (real toolbar button) in the scenario's width mode and asserts it is visible."""
  wanted = scenario.get("tocShot")
  if not wanted:
    return
  page_name = scenario["page"]
  toggle = page.locator("[data-sphinx-preview-toc-toggle]")
  page.evaluate("window.scrollTo(0, 0)")
  if toggle.get_attribute("aria-pressed") != "true":
    toggle.click()
    page.wait_for_timeout(300)
  width_button = page.locator("[data-sphinx-preview-width-toggle]")
  for _ in range(3):
    if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == wanted:
      break
    width_button.click()
    page.wait_for_timeout(250)
  page.evaluate("window.scrollTo(0, 0)")
  page.wait_for_timeout(200)
  state = page.evaluate("""() => {
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const nav = document.querySelector('nav[data-sphinx-preview-toc]');
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    return {
      width: document.documentElement.getAttribute('data-sphinx-preview-width'),
      toc: document.documentElement.getAttribute('data-sphinx-preview-toc'),
      pressed: document.querySelector('[data-sphinx-preview-toc-toggle]').getAttribute('aria-pressed'),
      shown: !!nav && getComputedStyle(nav).display !== 'none' && getComputedStyle(nav).visibility !== 'hidden',
      nav: nav ? rect(nav) : null,
      toolbar: rect(document.querySelector('[data-sphinx-preview-toolbar]')),
      columnRight: box.right - parseFloat(style.paddingRight),
      tables: [...content.querySelectorAll(':scope > table')].map(rect),
      entries: [...document.querySelectorAll('nav[data-sphinx-preview-toc] li[data-level]')].length,
      current: [...document.querySelectorAll('nav[data-sphinx-preview-toc] [aria-current="location"]')].map(item => item.textContent.trim()),
      viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
    };
  }""")
  if state["toc"] != "open" or state["pressed"] != "true":
    failures.append(Failure(page_name, f"the TOC button did not leave the column open ({state['toc']}, pressed {state['pressed']})"))
    return
  if scenario["width"] < 760:
    # Intended narrow behaviour: the column is hidden, the preference stays on.
    if state["shown"]:
      failures.append(Failure(page_name, "the TOC column must stay hidden on a pane under 760px"))
    return
  nav = state["nav"]
  if not state["shown"] or not nav or nav["width"] < 100 or nav["height"] < 100:
    failures.append(Failure(page_name, f"the TOC column is not visible after opening it: {nav}"))
    return
  view = state["viewport"]
  if nav["left"] < 0 or nav["right"] > view["width"] + 1 or nav["top"] < 0 or nav["bottom"] > view["height"] + 1:
    failures.append(Failure(page_name, f"{wanted}: the TOC column leaves the viewport: {nav}"))
  if state["entries"] < 8:
    failures.append(Failure(page_name, f"{wanted}: the TOC lists only {state['entries']} entries"))
  if len(state["current"]) != 1:
    failures.append(Failure(page_name, f"{wanted}: the TOC must highlight one current heading, found {state['current']}"))
  radii = page.evaluate("""() => {
    const corners = element => { const style = getComputedStyle(element); return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]; };
    const current = document.querySelector('nav[data-sphinx-preview-toc] li[data-sphinx-preview-toc-current] > button:not([data-sphinx-preview-toc-twisty])');
    const other = document.querySelector('nav[data-sphinx-preview-toc] li:not([data-sphinx-preview-toc-current]) > button:not([data-sphinx-preview-toc-twisty])');
    return { current: current ? corners(current) : null, other: other ? corners(other) : null };
  }""")
  if not radii["current"] or any(corner != "0px" for corner in radii["current"]):
    failures.append(Failure(page_name, f"{wanted}: the current TOC entry must have square corners, got {radii['current']}"))
  if not radii["other"] or any(corner != "4px" for corner in radii["other"]):
    failures.append(Failure(page_name, f"{wanted}: the other TOC entries keep their 4px corners, got {radii['other']}"))
  toolbar = state["toolbar"]
  if nav["top"] < toolbar["bottom"] + 7:
    failures.append(Failure(page_name, f"{wanted}: the TOC column touches the floating toolbar"))
  if state["columnRight"] > nav["left"] + 1:
    failures.append(Failure(page_name, f"{wanted}: the content column overlaps the TOC column"))
  for table in state["tables"]:
    if table["right"] > nav["left"] + 1:
      failures.append(Failure(page_name, f"{wanted}: a table overlaps the TOC column"))


def check_change_bar(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Incoming-change bars: one column at the page margin, square, full block height; nothing moves."""
  if not scenario.get("changeBarChecks"):
    return
  page_name = scenario["page"]
  probe = """() => {
    const root = document.getElementById('sphinx-myst-preview-content');
    const html = document.documentElement;
    const pick = {
      heading: [...root.querySelectorAll('h2')].find(h => h.textContent.startsWith('Changed')),
      paragraph: [...root.querySelectorAll('p')].find(p => p.textContent.startsWith('A changed paragraph')),
      bullet: [...root.querySelectorAll('li')].find(li => li.textContent.trim().startsWith('A changed bullet')),
      nested: [...root.querySelectorAll('li')].find(li => li.textContent.trim().startsWith('A changed nested')),
      number: [...root.querySelectorAll('ol > li')].find(li => li.textContent.trim().startsWith('A changed number')),
      quotation: [...root.querySelectorAll('blockquote')].find(q => q.textContent.includes('A changed quotation')),
      table: root.querySelectorAll('table')[1],
      code: root.querySelectorAll('pre')[1],
      admonition: root.querySelectorAll('.admonition')[1],
      image: root.querySelectorAll('img')[1],
    };
    const twins = {
      heading: [...root.querySelectorAll('h2')].find(h => h.textContent.startsWith('Unchanged')),
      paragraph: [...root.querySelectorAll('p')].find(p => p.textContent.startsWith('An unchanged paragraph')),
    };
    const textLeft = element => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, { acceptNode: node => (node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
      const node = walker.nextNode();
      if (!node) return element.getBoundingClientRect().left;
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects()[0].left;
    };
    const snapshot = () => [...root.querySelectorAll('*')].map(element => {
      const r = element.getBoundingClientRect();
      return [r.left, r.top, r.width, r.height];
    });
    const missing = Object.entries(pick).filter(([, element]) => !element).map(([kind]) => kind);
    if (missing.length) return { missing };
    const ranges = Object.values(pick).map(element => {
      const mapped = element.closest('[data-line]') || element.querySelector('[data-line]') || element;
      const start = Number(mapped.getAttribute('data-line'));
      const end = Number(mapped.getAttribute('data-end-line'));
      return { start, end: Number.isFinite(end) && end >= start ? end : start };
    });
    const before = snapshot();
    window.postMessage({
      type: 'previewIncomingChanges', enabled: true, ranges,
      documentId: html.getAttribute('data-sphinx-preview-document-id'),
      revision: Number(html.getAttribute('data-sphinx-preview-document-version')),
      requestId: Number(html.getAttribute('data-sphinx-preview-request-id')),
    }, '*');
    return { before: before.length, ranges, snapshot: before };
  }"""
  started = page.evaluate(probe)
  if started.get("missing"):
    failures.append(Failure(page_name, f"change bar: the fixture lacks {started['missing']}"))
    return
  page.wait_for_timeout(300)
  state = page.evaluate("""(before) => {
    const root = document.getElementById('sphinx-myst-preview-content');
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top + scrollY, height: r.height, width: r.width }; };
    const textLeft = element => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, { acceptNode: node => (node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
      const node = walker.nextNode();
      if (!node) return element.getBoundingClientRect().left;
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects()[0].left;
    };
    const layer = document.querySelector('[data-sphinx-preview-change-layer]');
    const marked = [...root.querySelectorAll('[data-sphinx-preview-changed]')];
    const bars = layer ? [...layer.children].filter(bar => !bar.hidden) : [];
    const after = [...root.querySelectorAll('*')].map(element => { const r = element.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    let moved = before.length === after.length ? 0 : -1;
    if (moved === 0) for (let index = 0; index < after.length; index += 1) {
      if (after[index].some((value, at) => Math.abs(value - before[index][at]) > 0.5)) moved += 1;
    }
    const clipped = [];
    for (const bar of bars) {
      for (let node = bar; node && node !== document.documentElement; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX !== 'visible' || style.overflowY !== 'visible') { clipped.push(node.tagName); break; }
      }
    }
    return {
      layerPosition: layer ? getComputedStyle(layer).position : null,
      marked: marked.map(element => ({ tag: element.tagName, box: rect(element.tagName === 'CODE' && element.parentElement.tagName === 'PRE' ? element.parentElement : element), text: textLeft(element) })),
      bars: bars.map(bar => ({ box: rect(bar), radius: getComputedStyle(bar).borderTopLeftRadius, color: getComputedStyle(bar).backgroundColor, display: getComputedStyle(bar).display })),
      moved, clipped,
      anchors: [...root.querySelectorAll('.okf-anchor')].map(rect),
      scrollWidth: document.documentElement.scrollWidth, innerWidth,
    };
  }""", started["snapshot"])
  marked, bars = state["marked"], state["bars"]
  if len(marked) != 10:
    failures.append(Failure(page_name, f"change bar: expected 10 marked blocks, got {len(marked)} {[m['tag'] for m in marked]} ranges {started['ranges']}"))
  if len(bars) != len(marked):
    failures.append(Failure(page_name, f"change bar: {len(bars)} bars for {len(marked)} marked blocks"))
    return
  if state["moved"] != 0:
    failures.append(Failure(page_name, f"change bar: marking moved {state['moved']} elements"))
  if state["clipped"]:
    failures.append(Failure(page_name, f"change bar: an ancestor clips the bars: {state['clipped']}"))
  if state["scrollWidth"] > state["innerWidth"] + 1:
    failures.append(Failure(page_name, "change bar: the bars make the page scroll horizontally"))
  lefts = {round(bar["box"]["left"], 1) for bar in bars}
  if len(lefts) != 1:
    failures.append(Failure(page_name, f"change bar: the bars are not in one column ({sorted(lefts)})"))
  for block, bar in zip(marked, bars):
    kind = block["tag"]
    if abs(bar["box"]["width"] - 3) > 0.5:
      failures.append(Failure(page_name, f"change bar {kind}: the bar is {bar['box']['width']}px wide, expected 3px"))
    if bar["radius"] != "0px":
      failures.append(Failure(page_name, f"change bar {kind}: the bar ends are rounded ({bar['radius']})"))
    if abs(bar["box"]["top"] - block["box"]["top"]) > 1 or abs(bar["box"]["height"] - block["box"]["height"]) > 1:
      failures.append(Failure(page_name, f"change bar {kind}: the bar does not span the block ({bar['box']} vs {block['box']})"))
    if bar["box"]["left"] < 0 or bar["box"]["left"] > 16:
      failures.append(Failure(page_name, f"change bar {kind}: the bar is not at the page's left margin ({bar['box']['left']})"))
    if block["tag"] != "IMG" and bar["box"]["right"] + 4 > block["text"]:
      failures.append(Failure(page_name, f"change bar {kind}: the bar touches the text ({bar['box']['right']} vs {block['text']})"))
    for anchor in state["anchors"]:
      if bar["box"]["right"] > anchor["left"] and bar["box"]["left"] < anchor["right"] and bar["box"]["top"] < anchor["top"] + anchor["height"] and bar["box"]["top"] + bar["box"]["height"] > anchor["top"]:
        failures.append(Failure(page_name, f"change bar {kind}: the bar overlaps an anchor icon"))
  # The Diff toggle hides the bars again, and showing it restores them.
  diff = page.locator("[data-sphinx-preview-diff-toggle]")
  if diff.count() == 1:
    shown = page.evaluate("() => getComputedStyle(document.querySelector('[data-sphinx-preview-change-layer]')).display")
    diff.click()
    page.wait_for_timeout(100)
    hidden = page.evaluate("() => getComputedStyle(document.querySelector('[data-sphinx-preview-change-layer]')).display")
    diff.click()
    page.wait_for_timeout(100)
    if shown == "none" or hidden != "none":
      failures.append(Failure(page_name, f"change bar: the Diff toggle must hide the bars (shown {shown}, hidden {hidden})"))
  page.evaluate("window.scrollTo(0, 0)")


# @tests_req SwRS-MDOKFSTUDIO-LIFE-094
def check_update_glow(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """CR 046: a content patch that carries updated ranges makes exactly those blocks glow, readable and
  without moving anything; with prefers-reduced-motion: reduce nothing glows. The glow is paused at its
  start through the Web Animations API (no sleep), so the final frame shows it."""
  if not scenario.get("updateGlowChecks"):
    return
  page_name = scenario["page"]
  patch = """(word) => {
    const root = document.getElementById('sphinx-myst-preview-content');
    const html = document.documentElement;
    const pick = [
      [...root.querySelectorAll('p')].find(p => p.textContent.startsWith('A changed paragraph')),
      [...root.querySelectorAll('li')].find(li => li.textContent.trim().startsWith('A changed bullet')),
    ].map(element => element && (element.closest('[data-line]') || element));
    if (pick.some(element => !element)) return { missing: true };
    const lines = pick.map(element => Number(element.getAttribute('data-line')));
    const version = Number(html.getAttribute('data-sphinx-preview-document-version'));
    const request = Number(html.getAttribute('data-sphinx-preview-request-id'));
    const contentHtml = root.innerHTML
      .replace('A changed paragraph', word + ' paragraph')
      .replace('A changed bullet', word + ' bullet');
    // Synchronous, like the host's message: the glow exists when this returns.
    window.dispatchEvent(new MessageEvent('message', { data: {
      type: 'previewContentPatch',
      documentId: html.getAttribute('data-sphinx-preview-document-id'),
      revision: version, requestId: request,
      next: { revision: version + 1, requestId: request + 1 },
      contentHtml, status: 'success', label: 'Preview ready', diagnostics: [],
      updatedRanges: lines.map(line => ({ start: line, end: line })),
    } }));
    const glows = document.getAnimations().filter(animation => animation.animationName === 'sphinx-preview-update-glow');
    glows.forEach(animation => { animation.pause(); animation.currentTime = 0; });
    return {
      lines,
      marked: [...root.querySelectorAll('[data-sphinx-preview-updated]')].map(element => element.textContent.trim().slice(0, 40)),
      animations: glows.length,
      duration: glows.length ? Number(glows[0].effect.getTiming().duration) : 0,
    };
  }"""
  # Reduced motion first: the same patch marks and animates nothing.
  page.emulate_media(reduced_motion="reduce")
  reduced = page.evaluate(patch, "A changed")
  if reduced.get("missing"):
    failures.append(Failure(page_name, "update glow: the fixture lacks the changed paragraph or bullet"))
    return
  if reduced["marked"] or reduced["animations"]:
    failures.append(Failure(page_name, f"update glow: reduced motion still glows {reduced['marked']} ({reduced['animations']} animations)"))
  page.emulate_media(reduced_motion="no-preference")
  glow = page.evaluate(patch, "An updated")
  if len(glow["marked"]) != 2 or not all(text.startswith("An updated") for text in glow["marked"]):
    failures.append(Failure(page_name, f"update glow: expected the updated paragraph and bullet to glow, got {glow['marked']}"))
  if glow["animations"] != 2:
    failures.append(Failure(page_name, f"update glow: expected 2 glow animations, got {glow['animations']}"))
  if not 300 <= glow["duration"] <= 1000:
    failures.append(Failure(page_name, f"update glow: the glow lasts {glow['duration']} ms, expected a brief one"))
  state = page.evaluate("""() => {
    const root = document.getElementById('sphinx-myst-preview-content');
    const glows = document.getAnimations().filter(animation => animation.animationName === 'sphinx-preview-update-glow');
    const boxes = () => [...root.querySelectorAll('*')].map(element => { const r = element.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    const parse = color => { const v = (color.match(/[\\d.]+/g) || []).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const luminance = c => [c.r, c.g, c.b].map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; })
      .reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
    const page = parse(getComputedStyle(document.body).backgroundColor);
    const glowing = [...root.querySelectorAll('[data-sphinx-preview-updated]')].map(element => {
      const style = getComputedStyle(element);
      const wash = parse(style.backgroundColor);
      const mixed = { r: wash.r * wash.a + page.r * (1 - wash.a), g: wash.g * wash.a + page.g * (1 - wash.a), b: wash.b * wash.a + page.b * (1 - wash.a) };
      const values = [luminance(parse(style.color)), luminance(mixed)].sort((a, b) => b - a);
      return { tag: element.tagName, alpha: wash.a, shadow: style.boxShadow, contrast: (values[0] + .05) / (values[1] + .05) };
    });
    const peak = boxes();
    // The end of the glow (still paused, so the mark stays): nothing may have moved.
    glows.forEach(animation => { animation.currentTime = Number(animation.effect.getTiming().duration) - 1; });
    const end = boxes();
    glows.forEach(animation => { animation.currentTime = 0; });
    let moved = peak.length === end.length ? 0 : -1;
    if (moved === 0) peak.forEach((box, index) => { if (box.some((value, at) => Math.abs(value - end[index][at]) > 0.5)) moved += 1; });
    return { glowing, moved, scrollWidth: document.documentElement.scrollWidth, innerWidth };
  }""")
  for block in state["glowing"]:
    if block["alpha"] <= 0 or block["shadow"] in ("none", ""):
      failures.append(Failure(page_name, f"update glow {block['tag']}: no visible glow at its start ({block})"))
    if block["contrast"] < 4.5:
      failures.append(Failure(page_name, f"update glow {block['tag']}: the text contrast drops to {block['contrast']:.2f}:1 under the glow"))
  if state["moved"] != 0:
    failures.append(Failure(page_name, f"update glow: the glow moved {state['moved']} elements"))
  if state["scrollWidth"] > state["innerWidth"] + 1:
    failures.append(Failure(page_name, "update glow: the glow makes the page scroll horizontally"))
  save_step(page, scenario, "glow")
  # Back to the campaign's reduced motion, so the rest of the scenario reads a settled page like
  # the others: the glow is cancelled and its mark removed.
  page.emulate_media(reduced_motion="reduce")
  page.wait_for_function("""() => !document.querySelector('[data-sphinx-preview-updated]')
    && !document.getAnimations().some(animation => animation.animationName === 'sphinx-preview-update-glow')""", timeout=5000)


