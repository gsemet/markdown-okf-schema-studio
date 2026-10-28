"""The side-by-side diff check of the screenshot campaign (CR 147): the layout and CSS part that
the unit test (test/page/sideBySideCards.test.ts, on a DOM stand-in) cannot see, in Chromium."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure


# @tests_req SwRS-MDOKFSTUDIO-REVIEW-008
# @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
def check_side_by_side(page: Page, toolbar, page_name: str, failures: list[Failure]) -> None:
    """The Side-by-side button turns a changed block into a two-column card (HEAD left, now right) and hides the original; turning it off, or entering edit mode, shows the original again."""
    button = toolbar.locator("[data-sphinx-preview-sbs-toggle]")
    block = page.locator("#sphinx-myst-preview-content p[data-line]").first
    if button.count() != 1 or button.is_hidden() or block.count() != 1:
        return
    span = block.evaluate("element => [element.getAttribute('data-line'), element.getAttribute('data-end-line') || element.getAttribute('data-line')].map(Number)")
    start, end = span
    html_before = page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-sbs')")
    if html_before != "off":
        return
    button.click()
    try:
        page.evaluate(
            """([start, end]) => {
              const root = document.documentElement;
              window.postMessage({
                type: 'previewBaselineDiff',
                documentId: root.getAttribute('data-sphinx-preview-document-id'),
                revision: Number(root.getAttribute('data-sphinx-preview-document-version')),
                requestId: Number(root.getAttribute('data-sphinx-preview-request-id')),
                html: `<p data-line="${start}" data-end-line="${end}">Text of the last commit</p>`,
                hunks: [{ baseStart: start, baseEnd: end, start, end }],
              }, '*');
            }""",
            [start, end],
        )
        page.wait_for_timeout(150)
        card = page.locator("[data-okf-sbs-card]").first
        if card.count() != 1:
            failures.append(Failure(page_name, "the Side-by-side button made no card for a changed block"))
            return
        layout = card.evaluate(
            """element => {
              const base = element.querySelector('[data-okf-sbs-side="base"]').getBoundingClientRect();
              const current = element.querySelector('[data-okf-sbs-side="current"]').getBoundingClientRect();
              const next = element.nextElementSibling;
              return {
                display: getComputedStyle(element).display,
                baseRight: base.right, currentLeft: current.left, baseTop: base.top, currentTop: current.top,
                baseWidth: base.width, currentWidth: current.width,
                originalDisplay: next ? getComputedStyle(next).display : null,
                originalReplaced: next ? next.hasAttribute('data-okf-sbs-replaced') : null,
                overflow: document.documentElement.scrollWidth - innerWidth,
              };
            }"""
        )
        if layout["display"] != "grid":
            failures.append(Failure(page_name, f"the card is not a grid: {layout['display']}"))
        if page.viewport_size and page.viewport_size["width"] > 560:
            if abs(layout["baseTop"] - layout["currentTop"]) > 1 or layout["baseRight"] > layout["currentLeft"] + 1:
                failures.append(Failure(page_name, f"the card does not show HEAD left of now: {layout}"))
            if abs(layout["baseWidth"] - layout["currentWidth"]) > 2:
                failures.append(Failure(page_name, f"the two sides of the card differ in width: {layout}"))
        if not layout["originalReplaced"] or layout["originalDisplay"] != "none":
            failures.append(Failure(page_name, f"the original of the changed block stays visible beside its card: {layout}"))
        if layout["overflow"] > 1:
            failures.append(Failure(page_name, f"the card makes the page scroll horizontally by {layout['overflow']}px"))
        page.evaluate("document.documentElement.setAttribute('data-sphinx-preview-edit-mode', 'on')")
        edit = page.evaluate(
            """() => ({
              card: getComputedStyle(document.querySelector('[data-okf-sbs-card]')).display,
              original: getComputedStyle(document.querySelector('[data-okf-sbs-replaced]')).display,
            })"""
        )
        page.evaluate("document.documentElement.removeAttribute('data-sphinx-preview-edit-mode')")
        if edit["card"] != "none" or edit["original"] == "none":
            failures.append(Failure(page_name, f"edit mode must hide the card and show the original: {edit}"))
    finally:
        button.click()
        page.wait_for_timeout(100)
    gone = page.evaluate(
        """() => ({
          cards: document.querySelectorAll('[data-okf-sbs-card]').length,
          replaced: document.querySelectorAll('[data-okf-sbs-replaced]').length,
        })"""
    )
    if gone["cards"] or gone["replaced"]:
        failures.append(Failure(page_name, f"turning the diff off left cards or hidden originals behind: {gone}"))
