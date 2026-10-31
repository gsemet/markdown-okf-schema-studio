"""The find bar check of the screenshot campaign (CR 144): Ctrl/Cmd+F, the painted matches, Enter,
Escape and the replace request, in Chromium."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-011
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
def check_find_bar(page: Page, toolbar, page_name: str, failures: list[Failure]) -> None:
    """In Chromium Ctrl+F opens the find bar over the page, the matches are painted with the Custom Highlight API, Enter walks them, Escape closes the bar, and Replace all asks the host for the mapped matches only."""
    if page.locator("#sphinx-myst-preview-content").count() != 1:
        return
    text = page.evaluate("document.getElementById('sphinx-myst-preview-content').innerText")
    before = page.evaluate("document.getElementById('sphinx-myst-preview-content').textContent")
    scroll = page.evaluate("window.scrollY")
    page.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()")
    page.keyboard.press("ControlOrMeta+F")
    page.wait_for_timeout(100)
    bar = page.locator("[data-sphinx-preview-find]")
    if bar.count() != 1 or not bar.is_visible():
        failures.append(Failure(page_name, "Ctrl/Cmd+F did not open the find bar"))
        return
    if page.evaluate("document.activeElement && document.activeElement.hasAttribute('data-find-input')") is not True:
        failures.append(Failure(page_name, "the find field does not have the focus"))
    page.keyboard.type("the")
    page.wait_for_timeout(150)
    count = page.locator("[data-find-count]").inner_text()
    painted = page.evaluate("CSS.highlights.get('studio-find') ? CSS.highlights.get('studio-find').size : 0")
    if count == "No results":
        if "the" in text.lower():
            failures.append(Failure(page_name, "the find bar found nothing for 'the' in a page that holds it"))
        painted = 0
    else:
        total = count.split(" of ")[-1].rstrip("+")
        if not count.startswith("1 of ") or not total.isdigit() or int(total) != painted:
            failures.append(Failure(page_name, f"the match count {count!r} does not match the painted ranges ({painted})"))
        elif int(total) > 1:
            page.keyboard.press("Enter")
            page.wait_for_timeout(100)
            if page.locator("[data-find-count]").inner_text() != f"2 of {total}":
                failures.append(Failure(page_name, "Enter did not move to the second match"))
        if page.evaluate("CSS.highlights.get('studio-find-current') ? CSS.highlights.get('studio-find-current').size : 0") != 1:
            failures.append(Failure(page_name, "the current match is not painted"))
    if page.evaluate("document.getElementById('sphinx-myst-preview-content').textContent") != before:
        failures.append(Failure(page_name, "finding changed the text of the content"))
    rect = bar.evaluate("element => { const r = element.getBoundingClientRect(); const t = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, toolbarBottom: t.bottom, width: innerWidth }; }")
    if rect["top"] < rect["toolbarBottom"] - 0.5 or rect["left"] < 0 or rect["right"] > rect["width"] + 0.5:
        failures.append(Failure(page_name, f"the find bar overlaps the toolbar or leaves the pane: {rect}"))
    if painted:
        # Only the replace requests are dropped: other scenarios assert on the messages sent on load.
        page.evaluate("window.visualMessages = window.visualMessages.filter(item => item.type !== 'previewFindReplace')")
        page.locator("[data-find-toggle-replace]").evaluate("element => element.click()")
        read_only = page.locator("[data-find-replace-all]").get_attribute("aria-disabled") == "true"
        page.locator("[data-find-replace-input]").evaluate("element => { element.value = 'THE-REPLACEMENT'; element.dispatchEvent(new Event('input')); }")
        page.locator("[data-find-replace-all]").evaluate("element => element.click()")
        page.wait_for_timeout(100)
        # The replace row's dry run (`dryRun: true`, sent 150 ms after a search) is no replace request.
        sent = page.evaluate("window.visualMessages.filter(item => item.type === 'previewFindReplace' && !item.dryRun)")
        note = page.locator("[data-find-note]").inner_text()
        if read_only:
            if sent or not note:
                failures.append(Failure(page_name, f"a read-only preview must refuse the replacement with its reason: sent={len(sent)} note={note!r}"))
        elif sent:
            items = sent[0]["items"]
            if not items or any(item["replacement"] != "THE-REPLACEMENT" or item["occurrence"] >= item["occurrences"] for item in items):
                failures.append(Failure(page_name, f"the replace request is malformed: {items[:2]}"))
        elif "cannot be replaced from the preview" not in note:
            failures.append(Failure(page_name, f"nothing was sent and the note does not say why: {note!r}"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    if bar.is_visible() or page.evaluate("CSS.highlights.has('studio-find')"):
        failures.append(Failure(page_name, "Escape did not close the find bar and clear the matches"))
    page.evaluate(f"window.scrollTo(0, {scroll})")
    page.wait_for_timeout(100)
