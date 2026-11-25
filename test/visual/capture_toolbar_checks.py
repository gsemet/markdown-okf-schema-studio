"""Toolbar checks of the screenshot campaign in Chromium: the place of the floating toolbar and
the text it covers, its tooltips on keyboard focus, the browser find inside a folded section, and
the end of the document under the sticky band. Each check leaves the page as it found it."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_page_checks import apply_scroll
from capture_support import Failure

TOOLBAR = "[data-sphinx-preview-toolbar][role='toolbar']"

TOOLTIP_STYLE_JS = r"""element => {
  const style = getComputedStyle(element, '::after');
  return {
    content: style.content, visibility: style.visibility, opacity: style.opacity,
    color: style.color, background: style.backgroundColor,
    focusVisible: element.matches(':focus-visible'), focused: document.activeElement === element,
  };
}"""

PLACE_JS = r"""() => {
  const box = document.querySelector("[data-sphinx-preview-toolbar]").getBoundingClientRect();
  return { top: box.top, end: document.documentElement.clientWidth - box.right, scrollY: window.scrollY };
}"""

# The first block of running text whose box crosses the toolbar's columns, scrolled so that its
# middle line sits at the toolbar's middle; then what the pointer would hit there.
COVER_JS = r"""() => {
  const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
  const bar = toolbar.getBoundingClientRect();
  const blocks = [...document.querySelectorAll("#sphinx-myst-preview-content p")]
    .filter(block => (block.textContent || "").trim().length > 40);
  for (const block of blocks) {
    const range = document.createRange();
    range.selectNodeContents(block);
    const line = [...range.getClientRects()].find(rect => rect.left < bar.right - 4 && rect.right > bar.left + 4 && rect.height > 0);
    if (!line) continue;
    const middle = (bar.top + bar.bottom) / 2;
    window.scrollBy(0, line.top + line.height / 2 - middle);
    const again = [...range.getClientRects()].find(rect => rect.left < bar.right - 4 && rect.right > bar.left + 4 && rect.height > 0);
    if (!again || again.top > middle || again.bottom < middle) continue;
    const x = Math.max(again.left, bar.left + 4);
    const hit = document.elementFromPoint(x + 1, middle);
    const under = document.elementsFromPoint(x + 1, middle);
    return { found: true, onTop: toolbar.contains(hit), textUnder: under.some(item => block.contains(item)) };
  }
  return { found: false };
}"""


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001#S4
def check_toolbar_place_and_focus(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """Every button's tooltip is its title; the toolbar sits 12 px from the top and 14 px from the
    end at the top of the page and once scrolled, covers the text under it, and shows the hover
    tooltip again, with the same colours, when a button is reached with the keyboard."""
    if not scenario.get("toolbarPlaceChecks"):
        return
    name = scenario["page"]
    toolbar = page.locator(TOOLBAR)
    if toolbar.count() != 1:
        failures.append(Failure(name, "toolbar place: the toolbar is missing or duplicated"))
        return
    mismatched = toolbar.evaluate("""element => [...element.querySelectorAll('button')]
      .filter(button => button.getAttribute('data-tooltip') !== button.getAttribute('title'))
      .map(button => button.outerHTML.slice(0, 80))""")
    count = toolbar.evaluate("element => element.querySelectorAll('button[data-tooltip]').length")
    if count != 16 or mismatched:
        failures.append(Failure(name, f"toolbar tooltips: {count} buttons with a tooltip, title differs on {mismatched}"))
    start = page.evaluate("window.scrollY")
    try:
        for moment in ("top", "scrolled"):
            if moment == "scrolled":
                page.evaluate("window.scrollBy(0, 600)")
                page.wait_for_timeout(100)
            place = page.evaluate(PLACE_JS)
            if abs(place["top"] - 12) > 0.5 or abs(place["end"] - 14) > 0.5:
                failures.append(Failure(name, f"toolbar place ({moment}): {place['top']:.1f} px from the top and {place['end']:.1f} px from the end, expected 12 and 14"))
        cover = page.evaluate(COVER_JS)
        page.wait_for_timeout(100)
        if cover["found"] and not (cover["onTop"] and cover["textUnder"]):
            failures.append(Failure(name, f"toolbar place: text under the toolbar is not covered by it: {cover}"))
        elif not cover["found"] and scenario["width"] <= 400:
            failures.append(Failure(name, "toolbar place: no line of text could be scrolled under the toolbar"))
    finally:
        page.evaluate(f"window.scrollTo(0, {start})")
        page.wait_for_timeout(100)
    refresh = toolbar.locator("[data-sphinx-preview-refresh]")
    refresh.hover()
    page.wait_for_timeout(250)
    hovered = refresh.evaluate(TOOLTIP_STYLE_JS)
    page.mouse.move(2, scenario["height"] - 2)
    page.wait_for_timeout(150)
    toolbar.locator("[data-sphinx-preview-edit-toggle]").evaluate("element => element.focus()")
    page.keyboard.press("Shift+Tab")
    page.wait_for_timeout(250)
    focused = refresh.evaluate(TOOLTIP_STYLE_JS)
    refresh.evaluate("element => element.blur()")
    page.wait_for_timeout(150)
    if not (focused["focused"] and focused["focusVisible"]):
        failures.append(Failure(name, f"keyboard focus: Shift+Tab from Edit does not give Refresh a visible focus: {focused}"))
    elif (focused["visibility"] != "visible" or float(focused["opacity"]) != 1 or focused["content"] != '"Refresh preview"'
          or (focused["color"], focused["background"]) != (hovered["color"], hovered["background"])):
        failures.append(Failure(name, f"keyboard focus: the tooltip differs from the hover tooltip: focus {focused}, hover {hovered}"))


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-006#S1
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-006#S2
def check_find_opens_folded_section(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """The browser's find-in-page reaches text hidden in a folded section: a text fragment
    (`#:~:text=`) runs Chromium's own search for hidden="until-found" blocks and fires
    beforematch, as Cmd/Ctrl+F does (Playwright cannot type into the browser's find bar), where
    window.find() fires nothing. The page unfolds the section that holds the match and shows it."""
    if not scenario.get("toolbarPlaceChecks"):
        return
    name = scenario["page"]
    button = page.locator(f"{TOOLBAR} [data-sphinx-preview-fold-toggle]")
    if button.count() != 1 or page.locator("#sphinx-myst-preview-content > [data-okf-fold]").count() == 0:
        failures.append(Failure(name, "browser find: no Fold button or no foldable section"))
        return
    start = page.evaluate("window.scrollY")
    url = page.url.split("#")[0]
    button.evaluate("element => element.click()")
    page.wait_for_timeout(150)
    # A folded paragraph whose first words appear once in the whole content, and in no other block.
    target = page.evaluate(r"""() => {
      const content = document.getElementById('sphinx-myst-preview-content');
      const all = content.textContent || '';
      for (const block of content.children) {
        if (!block.hasAttribute('data-okf-folded') || block.tagName !== 'P') continue;
        const words = (block.textContent || '').trim().split(/\s+/).filter(word => /^[A-Za-z]+$/.test(word));
        for (let index = 0; index + 4 <= words.length; index += 1) {
          const phrase = words.slice(index, index + 4).join(' ');
          if (all.split(phrase).length === 2 && (block.textContent || '').replace(/\s+/g, ' ').includes(phrase)) {
            block.setAttribute('data-visual-find-target', '');
            return phrase;
          }
        }
      }
      return null;
    }""")
    try:
        if not target:
            failures.append(Failure(name, "browser find: no folded paragraph with a unique phrase"))
            return
        page.goto(f"{url}#:~:text={target.replace(' ', '%20')}")
        page.wait_for_timeout(400)
        state = page.evaluate(r"""() => {
          const block = document.querySelector('[data-visual-find-target]');
          const box = block.getBoundingClientRect();
          const kids = [...document.getElementById('sphinx-myst-preview-content').children];
          let heading = null;
          for (const item of kids.slice(0, kids.indexOf(block)).reverse()) {
            if (/^H[1-6]$/.test(item.tagName)) { heading = item; break; }
          }
          return {
            folded: block.hasAttribute('data-okf-folded'),
            hidden: block.getAttribute('hidden'),
            heading: heading && heading.getAttribute('data-okf-fold'),
            shown: box.height > 0 && box.bottom > 0 && box.top < innerHeight,
          };
        }""")
        # The fixture has one section; which sections stay folded is the unit test's (headingFold).
        if state["folded"] or state["hidden"] is not None or state["heading"] == "closed" or not state["shown"]:
            failures.append(Failure(name, f"browser find: the match in a folded section was not unfolded and shown: {state}"))
    finally:
        page.evaluate("""() => {
          document.querySelector('[data-visual-find-target]')?.removeAttribute('data-visual-find-target');
          history.replaceState(history.state, '', location.href.split('#')[0]);
        }""")
        # Unfold what is left folded: the Fold button folds or unfolds every section.
        for _ in range(2):
            if page.evaluate("document.querySelectorAll('#sphinx-myst-preview-content > [data-okf-folded]').length") == 0:
                break
            button.evaluate("element => element.click()")
            page.wait_for_timeout(150)
        page.evaluate(f"window.scrollTo(0, {start})")
        page.wait_for_timeout(100)


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-030#S6
def check_scroll_at_end(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """At the end of the document, more wheel input down keeps the page at the end and the band
    makes no corrective scroll against the reader."""
    if not scenario.get("scrollOscillationStress"):
        return
    name = scenario["page"]
    page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
    page.wait_for_timeout(300)
    page.evaluate(r"""() => {
      window.__endCorrections = [];
      window.__endScrollTo = window.scrollTo.bind(window);
      window.scrollTo = (...args) => { window.__endCorrections.push(args.length > 1 ? args[1] : args[0]); window.__endScrollTo(...args); };
    }""")
    try:
        page.mouse.move(scenario["width"] / 2, scenario["height"] / 2)
        for _ in range(20):
            page.mouse.wheel(0, 200)
            page.wait_for_timeout(18)
        page.wait_for_timeout(650)
        result = page.evaluate(r"""() => ({
          end: Math.max(0, document.documentElement.scrollHeight - innerHeight),
          scrollY: window.scrollY,
          corrections: window.__endCorrections.length,
        })""")
        if result["end"] - result["scrollY"] > 2 or result["corrections"] != 0:
            failures.append(Failure(name, f"scroll to the end: the page left the end or was corrected: {result}"))
    finally:
        page.evaluate("() => { window.scrollTo = window.__endScrollTo; }")
        apply_scroll(page, scenario["scroll"])
        page.wait_for_timeout(120)
