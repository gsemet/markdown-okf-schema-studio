"""Table of contents checks of the screenshot campaign: the column on a wide pane, the rail and
overlay on a narrow one (moved out of capture_layout_checks.py to keep it under the size limit)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure
from capture_toc_rail import check_toc_overlay, check_toc_rail


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
def check_toc_follows_toolbar(page: Page) -> list[str]:
  """The open column or rail stays 8px below the toolbar each time the toolbar opens or closes."""
  chevron = page.locator("[data-sphinx-preview-toolbar-collapse]")
  measure = """() => {
    const shown = [...document.querySelectorAll('nav[data-sphinx-preview-toc], [data-sphinx-preview-toc-rail]')]
      .find(element => getComputedStyle(element).display !== 'none');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    return shown ? shown.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom : null;
  }"""
  problems = []
  # An even number of clicks gives the toolbar back as it was; the bug showed from the second click.
  for click in range(1, 5):
    chevron.click()
    page.wait_for_timeout(350)
    gap = page.evaluate(measure)
    if gap is None or abs(gap - 8) > 1:
      problems.append(f"toolbar click {click}: the TOC is {gap}px below the toolbar, expected 8px")
  return problems


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-033
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-040
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-045
def check_toc_column(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The TOC button opens a right column below the toolbar (wide panes) or a rail (narrow)."""
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
    failures.extend(Failure(page_name, text) for text in check_toc_follows_toolbar(page))
    if not wide_pane:
      if opened["shown"]:
        failures.append(Failure(page_name, "the TOC column must be hidden on a pane under 760px"))
      # Only the 16px of the rail is reserved (CR 250); the hidden column itself takes nothing.
      if abs((closed["contentRight"] - opened["contentRight"]) - 16) > 1:
        failures.append(Failure(page_name, f"a hidden TOC column must narrow the content by the 16px rail only: {closed['contentRight']} -> {opened['contentRight']}"))
      if toggle.get_attribute("aria-pressed") != "true":
        failures.append(Failure(page_name, "the TOC button must still reflect the preference"))
      failures.extend(Failure(page_name, text) for text in check_toc_rail(page))
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
    failures.extend(Failure(page_name, text) for text in check_toc_overlay(page, state["shown"]))
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
