"""Narrow-pane checks of the table of contents rail, for the screenshot campaign (CR 239, CR 250)."""

from __future__ import annotations

from playwright.sync_api import Page


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
def check_toc_rail(page: Page) -> list[str]:
  """Narrow pane, TOC on: a rail at the right edge with one tick per heading; hover opens the overlay, Escape closes it."""
  problems: list[str] = []
  rail = page.locator("[data-sphinx-preview-toc-rail]")
  state = page.evaluate("""() => {
    const rail = document.querySelector('[data-sphinx-preview-toc-rail]');
    const nav = document.querySelector('nav[data-sphinx-preview-toc]');
    const r = rail.getBoundingClientRect();
    const content = document.getElementById('sphinx-myst-preview-content').getBoundingClientRect();
    return { shown: getComputedStyle(rail).display !== 'none', right: r.right, width: r.width, contentRight: content.right, ticks: rail.querySelectorAll('button').length,
             entries: nav.querySelectorAll('li[data-level]').length, view: document.documentElement.clientWidth };
  }""")
  if not state["shown"] or state["width"] < 8 or state["right"] > state["view"] + 1:
    problems.append(f"the TOC rail is not displayed on a pane under 760px: {state}")
    return problems
  if state["contentRight"] > state["view"] - state["width"] + 1:
    problems.append(f"the content is not padded for the TOC rail: {state}")
  if state["ticks"] < 1 or state["ticks"] != state["entries"]:
    problems.append(f"the TOC rail has {state['ticks']} ticks for {state['entries']} headings")
  rail.hover()
  page.wait_for_timeout(200)
  if page.evaluate("getComputedStyle(document.querySelector('nav[data-sphinx-preview-toc]')).display") == "none":
    problems.append("hovering the TOC rail did not open the overlay")
  page.keyboard.press("Escape")
  page.wait_for_timeout(100)
  if page.evaluate("getComputedStyle(document.querySelector('nav[data-sphinx-preview-toc]')).display") != "none":
    problems.append("Escape did not close the TOC overlay")
  page.mouse.move(5, 5)
  return problems


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-133
def check_toc_overlay(page: Page, shown_at_rest: bool) -> list[str]:
  """Hovers the rail and leaves the overlay open for the screenshot; it must stay inside the pane."""
  if shown_at_rest:
    return ["the TOC column must stay hidden on a narrow pane until the rail is hovered"]
  page.locator("[data-sphinx-preview-toc-rail]").hover()
  page.wait_for_timeout(200)
  overlay = page.evaluate("""() => {
    const nav = document.querySelector('nav[data-sphinx-preview-toc]');
    const r = nav.getBoundingClientRect();
    // The lowest tooltip bubble of the toolbar: its button bottom, the 8px gap, the bubble height.
    const tooltipBottom = Math.max(...[...document.querySelectorAll('[data-sphinx-preview-toolbar] button[data-tooltip]')].map(button =>
      button.getBoundingClientRect().bottom + 8 + (parseFloat(getComputedStyle(button, '::after').height) || 0)));
    return { shown: getComputedStyle(nav).display !== 'none', left: r.left, right: r.right, top: r.top, bottom: r.bottom,
             tooltipBottom,
             view: { width: document.documentElement.clientWidth, height: window.innerHeight } };
  }""")
  if not overlay["shown"] or overlay["left"] < 0 or overlay["right"] > overlay["view"]["width"] + 1 or overlay["bottom"] > overlay["view"]["height"] + 1:
    return [f"hovering the TOC rail must open the overlay inside the pane: {overlay}"]
  if overlay["top"] < overlay["tooltipBottom"] + 1:
    return [f"the TOC overlay must stay clear of the toolbar tooltips: {overlay}"]
  return []
