"""Figure anchor, comment, first-element gap, code copy, palette mode, slash menu and tall
palette checks of the screenshot campaign."""

from __future__ import annotations

import json
import re

from playwright.sync_api import Page

from capture_support import Failure, VISUAL_REPORT_DIR, report_path, save_step


def check_figure_anchors(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Figure width and alignment follow data-okf-width and the align class; label anchors are visible and targetable."""
  if not scenario.get("figureAnchorChecks"):
    return
  page_name = scenario["page"]
  found = page.evaluate("""() => {
    const root = document.querySelector('#sphinx-myst-preview-content');
    const rect = (element) => { const box = element.getBoundingClientRect(); return {left: box.left, right: box.right, top: box.top + scrollY, bottom: box.bottom + scrollY, width: box.width}; };
    const column = rect(root);
    const padding = parseFloat(getComputedStyle(root).paddingLeft) || 0;
    const content = {left: column.left + padding, right: column.right - (parseFloat(getComputedStyle(root).paddingRight) || 0)};
    const half = root.querySelector('figure#fig-half');
    const right = [...root.querySelectorAll('figure')].find(figure => figure.classList.contains('align-right'));
    const wrapped = right ? right.nextElementSibling : null;
    const anchor = (label) => {
      const span = root.querySelector('.okf-anchor[data-okf-label="' + label + '"]');
      if (!span) return null;
      const box = span.getBoundingClientRect();
      const style = getComputedStyle(span, '::before');
      return {
        visible: box.width > 0 && box.height > 0, left: box.left, right: box.right, top: box.top + scrollY,
        title: span.getAttribute('title'), id: span.id, icon: style.content,
        host: span.parentElement.tagName.toLowerCase() + (span.parentElement.className ? '.' + span.parentElement.className : ''),
        hostLeft: span.parentElement.getBoundingClientRect().left,
        hostTop: span.parentElement.getBoundingClientRect().top + scrollY,
        hostText: span.parentElement.textContent.trim().slice(0, 20),
        opacity: getComputedStyle(span).opacity,
      };
    };
    return {
      content,
      half: half ? {figure: rect(half), image: rect(half.querySelector('img')), width: half.querySelector('img').style.width} : null,
      right: right ? {figure: rect(right), image: rect(right.querySelector('img')), float: getComputedStyle(right).cssFloat, width: right.style.width} : null,
      wrapped: wrapped ? rect(wrapped) : null,
      anchors: {intro: anchor('intro'), sized: anchor('sized-title'), steps: anchor('steps'), code: anchor('note-code'), last: anchor('last-label')},
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ids: [...root.querySelectorAll('[id]')].map(e => e.id).filter((id, i, all) => all.indexOf(id) !== i),
      sizedHeading: root.querySelector('h2#sized-title') ? root.querySelector('h2#sized-title').textContent : null,
    };
  }""")
  content = found["content"]
  column_width = content["right"] - content["left"]
  half = found["half"]
  if not half or abs(half["image"]["width"] - column_width * 0.5) > 2:
    failures.append(Failure(page_name, f"the 50 % figure image is not half the column: {half and half['image']['width']} of {column_width}"))
  elif abs((half["image"]["left"] + half["image"]["right"]) / 2 - (content["left"] + content["right"]) / 2) > 2:
    failures.append(Failure(page_name, "the 50 % figure is not centred"))
  right = found["right"]
  if not right or right["float"] != "right":
    failures.append(Failure(page_name, f"the right-aligned figure does not float right: {right}"))
  else:
    if abs(right["figure"]["width"] - column_width * 0.4) > 2 or abs(right["image"]["width"] - right["figure"]["width"]) > 2:
      failures.append(Failure(page_name, f"the right figure is not 40 % of the column: {right['figure']['width']} of {column_width}"))
    if abs(right["figure"]["right"] - content["right"]) > 2:
      failures.append(Failure(page_name, "the right figure does not touch the right edge of the column"))
    wrapped = found["wrapped"]
    if not wrapped or wrapped["top"] > right["figure"]["bottom"] - 2:
      failures.append(Failure(page_name, "the paragraph after the right figure does not wrap beside it"))
  anchors = found["anchors"]
  for name, anchor in anchors.items():
    if not anchor or not anchor["visible"]:
      failures.append(Failure(page_name, f"the {name} anchor icon is missing or invisible: {anchor}"))
      continue
    if anchor["title"] != "Anchor: " + {"intro": "intro", "sized": "sized-title", "steps": "steps", "code": "note-code", "last": "last-label"}[name]:
      failures.append(Failure(page_name, f"the {name} anchor tooltip is {anchor['title']}"))
    if anchor["left"] < 0 or anchor["right"] > content["left"] + 1:
      failures.append(Failure(page_name, f"the {name} anchor is not in the left margin: {anchor}"))
    if "\u2693" not in anchor["icon"]:
      failures.append(Failure(page_name, f"the {name} anchor has no icon: {anchor['icon']}"))
  colours = page.evaluate("""() => [...document.querySelectorAll('#sphinx-myst-preview-content span[data-okf-color], #sphinx-myst-preview-content span[data-okf-background]')].map(span => {
    const style = getComputedStyle(span);
    return {text: span.textContent, color: style.color, background: style.backgroundColor, color_attr: span.getAttribute('data-okf-color'), background_attr: span.getAttribute('data-okf-background')};
  })""")
  if [entry["text"] for entry in colours] != ["red", "highlighted"]:
    failures.append(Failure(page_name, f"coloured spans are {colours}"))
  else:
    if colours[0]["color"] != "rgb(204, 0, 0)":
      failures.append(Failure(page_name, f"the span colour is {colours[0]['color']}, expected rgb(204, 0, 0)"))
    if colours[1]["background"] != "rgba(255, 220, 0, 0.45)":
      failures.append(Failure(page_name, f"the span background is {colours[1]['background']}"))
  intro = anchors["intro"]
  if intro and abs(intro["hostLeft"] - content["left"]) > 1:
    failures.append(Failure(page_name, "the anchor moved the labelled paragraph"))
  if found["overflow"] > 0:
    failures.append(Failure(page_name, f"the page scrolls horizontally by {found['overflow']}px"))
  if found["ids"]:
    failures.append(Failure(page_name, f"duplicate ids: {found['ids']}"))
  if found["sizedHeading"] is None or found["sizedHeading"].strip() != "A labelled heading":
    failures.append(Failure(page_name, f"the labelled heading text is {found['sizedHeading']!r}"))
  # A reference to a label is an in-page link; the host answers it with navigateAnchor, which
  # the page resolves by id, so the anchor icon is the scroll target.
  page.evaluate("window.scrollTo(0, 0)")
  page.wait_for_timeout(200)
  link = page.locator('#sphinx-myst-preview-content a[data-sphinx-preview-navigation="#steps"]').first
  if link.count() != 1:
    failures.append(Failure(page_name, "the reference to the steps label is not an in-page link"))
  page.evaluate("""() => {
    const root = document.documentElement;
    window.postMessage({
      type: 'navigateAnchor', value: '#steps',
      documentId: root.getAttribute('data-sphinx-preview-document-id'),
      revision: Number(root.getAttribute('data-sphinx-preview-document-version')),
      requestId: Number(root.getAttribute('data-sphinx-preview-request-id')),
    }, '*');
  }""")
  page.wait_for_timeout(700)
  target_top = page.evaluate("document.querySelector('#sphinx-myst-preview-content [id=\"steps\"]').getBoundingClientRect().top")
  if target_top < -2 or target_top > 400:
    failures.append(Failure(page_name, f"navigating to the steps label left the anchor at {target_top:.0f}px"))
  page.evaluate("window.scrollTo(0, 0)")
  page.wait_for_timeout(200)


def check_comment_chips(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Chips open into a box and close again; the reading line holds; the gray chips can be turned off."""
  if not scenario.get("commentChipChecks"):
    return
  page_name = scenario["page"]
  gray = "div.okf-comment[data-okf-comment-kind='comment'] > .okf-chip"
  todo_block = "div.okf-comment[data-okf-comment-kind='todo'] > .okf-chip"
  measure = """selector => {
    const chip = document.querySelector(selector);
    if (!chip) return null;
    const body = chip.parentElement.querySelector('.okf-comment-body');
    const box = body.getBoundingClientRect();
    const style = getComputedStyle(body);
    const shown = style.display !== 'none';
    const root = document.documentElement;
    return {
      expanded: chip.getAttribute('aria-expanded'),
      shown,
      title: shown ? getComputedStyle(body, '::before').content : null,
      top: box.top + window.scrollY,
      bottom: box.bottom + window.scrollY,
      chipBottom: chip.getBoundingClientRect().bottom + window.scrollY,
      background: style.backgroundColor,
      barWidth: style.borderInlineStartWidth,
      right: box.right,
      pane: root.clientWidth,
      overflowX: root.scrollWidth - root.clientWidth,
      text: body.textContent,
    };
  }"""
  visible = """selector => { const chip = document.querySelector(selector); return !!chip && chip.getClientRects().length > 0; }"""
  try:
    page.evaluate("window.scrollTo(0, 0)")
    closed = page.evaluate(measure, gray)
    if not closed or closed["shown"] or closed["expanded"] != "false":
      failures.append(Failure(page_name, f"a comment must start closed: {closed}"))
      return
    page.locator(gray).first.click()
    page.wait_for_timeout(150)
    opened = page.evaluate(measure, gray)
    if opened["expanded"] != "true" or not opened["shown"]:
      failures.append(Failure(page_name, "a click on the gray chip did not open the comment"))
      return
    if opened["title"] != '"Comment"':
      failures.append(Failure(page_name, f"the open comment must be titled Comment: {opened['title']}"))
    if opened["top"] < opened["chipBottom"] - 1:
      failures.append(Failure(page_name, "the open comment must sit under the chip line"))
    if opened["barWidth"] != "4px" or opened["background"] in ("rgba(0, 0, 0, 0)", "transparent"):
      failures.append(Failure(page_name, f"the open comment needs an accent bar and a panel: {opened['barWidth']} {opened['background']}"))
    if "Second line of the block comment." not in opened["text"] or opened["right"] > opened["pane"] or opened["overflowX"] > 0:
      failures.append(Failure(page_name, "the open comment overflows or lost its text"))
    page.locator(gray).first.click()
    page.wait_for_timeout(150)
    if page.evaluate(measure, gray)["shown"]:
      failures.append(Failure(page_name, "a second click did not close the comment"))
    page.locator(gray).first.focus()
    page.keyboard.press("Enter")
    page.wait_for_timeout(150)
    if not page.evaluate(measure, gray)["shown"]:
      failures.append(Failure(page_name, "Enter on the chip did not open the comment"))
    page.keyboard.press("Space")
    page.wait_for_timeout(150)
    if page.evaluate(measure, gray)["shown"]:
      failures.append(Failure(page_name, "Space on the chip did not close the comment"))

    # Reading line: the target stays where it is when a chip above it opens.
    page.evaluate("document.querySelectorAll('#sphinx-myst-preview-content h2')[1].scrollIntoView()")
    page.wait_for_timeout(500)
    target = "document.querySelectorAll('#sphinx-myst-preview-content h2')[1].getBoundingClientRect().top"
    before = page.evaluate(target)
    page.evaluate(f"document.querySelector(\"{gray}\").click()")
    page.wait_for_timeout(500)
    after = page.evaluate(target)
    if abs(after - before) > 2:
      failures.append(Failure(page_name, f"opening a chip above moved the reading line by {after - before:.0f}px"))
    page.evaluate(f"document.querySelector(\"{gray}\").click()")
    page.wait_for_timeout(500)
    if abs(page.evaluate(target) - before) > 2:
      failures.append(Failure(page_name, "closing a chip above moved the reading line"))

    # The setting: gray chips off, TODO chips stay, then on again, with no new render.
    send = """show => {
      const root = document.documentElement;
      window.postMessage({
        type: 'previewShowComments', showComments: show,
        documentId: root.getAttribute('data-sphinx-preview-document-id'),
        revision: Number(root.getAttribute('data-sphinx-preview-document-version')),
        requestId: Number(root.getAttribute('data-sphinx-preview-request-id')),
      }, '*');
    }"""
    page.evaluate("window.scrollTo(0, 0)")
    page.evaluate(send, False)
    page.wait_for_timeout(300)
    if page.evaluate(visible, gray) or page.evaluate("document.querySelectorAll('.okf-comment[data-okf-comment-kind=comment]').length && [...document.querySelectorAll('.okf-comment[data-okf-comment-kind=comment]')].some(e => e.getClientRects().length > 0)"):
      failures.append(Failure(page_name, "a gray comment chip is still visible with showComments off"))
    if not page.evaluate(visible, todo_block) or not page.evaluate("[...document.querySelectorAll('.okf-chip--todo')].every(e => e.getClientRects().length > 0)"):
      failures.append(Failure(page_name, "TODO chips must stay with showComments off"))
    page.evaluate(send, True)
    page.wait_for_timeout(300)
    if not page.evaluate(visible, gray):
      failures.append(Failure(page_name, "the gray chip did not come back with showComments on"))
  finally:
    page.evaluate("window.scrollTo(0, 0)")
  # The capture shows both boxes open.
  for selector in (gray, todo_block):
    if page.evaluate(measure, selector)["expanded"] != "true":
      page.locator(selector).first.click()
  page.wait_for_timeout(200)
  todo = page.evaluate(measure, todo_block)
  if todo["title"] != '"TODO"':
    failures.append(Failure(page_name, f"the open TODO comment must be titled TODO: {todo['title']}"))


def check_comment_toggle(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The toolbar Comments button hides and shows the gray chips in preview and in edit mode."""
  final = scenario.get("commentToggleChecks")
  if not final:
    return
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-comments-toggle]")
  gray_count = "[...document.querySelectorAll('.okf-comment[data-okf-comment-kind=comment] > .okf-chip')]"
  shown = f"{gray_count}.filter(e => e.getClientRects().length > 0).length"
  todo_shown = "[...document.querySelectorAll('.okf-comment[data-okf-comment-kind=todo] > .okf-chip')].filter(e => e.getClientRects().length > 0).length"
  root = "document.documentElement.getAttribute('data-sphinx-preview-comments')"
  labels = page.evaluate(f"{gray_count}.map(e => e.textContent)")
  if labels != ["comment", "comment"]:
    failures.append(Failure(page_name, f"the gray chips must be labelled comment: {labels}"))

  def cycle(where: str) -> None:
    if button.count() != 1 or not button.is_visible():
      failures.append(Failure(page_name, f"the Comments button is not visible in {where}"))
      return
    if button.get_attribute("aria-pressed") != "true" or page.evaluate(root) != "on" or page.evaluate(shown) != 2:
      failures.append(Failure(page_name, f"in {where} the Comments button must start pressed with both gray chips visible"))
    pressed = button.evaluate("element => getComputedStyle(element).backgroundColor")
    button.click()
    page.wait_for_timeout(150)
    if page.evaluate(shown) != 0 or page.evaluate(root) != "off" or button.get_attribute("aria-pressed") != "false":
      failures.append(Failure(page_name, f"in {where} the Comments button did not hide the gray chips"))
    if page.evaluate(todo_shown) != 1:
      failures.append(Failure(page_name, f"in {where} the TODO chip must stay when the comments are hidden"))
    if button.get_attribute("data-tooltip") != "Show comments":
      failures.append(Failure(page_name, f"in {where} the unpressed Comments button has the wrong tooltip"))
    if button.evaluate("element => getComputedStyle(element).backgroundColor") == pressed:
      failures.append(Failure(page_name, f"in {where} the Comments button looks the same pressed and unpressed"))
    button.click()
    page.wait_for_timeout(150)
    if page.evaluate(shown) != 2 or page.evaluate(root) != "on":
      failures.append(Failure(page_name, f"in {where} the Comments button did not bring the gray chips back"))

  edit = page.locator("[data-sphinx-preview-edit-toggle]")
  try:
    page.evaluate("window.scrollTo(0, 0)")
    cycle("preview mode")
    if edit.count() == 1:
      edit.click()
      page.wait_for_timeout(250)
      cycle("edit mode")
      edit.click()
      page.wait_for_timeout(250)
    # The open comment box has square corners.
    chip = page.locator(".okf-comment[data-okf-comment-kind=comment] > .okf-chip").first
    chip.click()
    page.wait_for_timeout(150)
    radius = page.evaluate("getComputedStyle(document.querySelector('.okf-comment-body:not([hidden])')).borderTopLeftRadius")
    if radius not in ("0px", "0"):
      failures.append(Failure(page_name, f"the open comment box has rounded corners: {radius}"))
    chip.click()
    page.wait_for_timeout(150)
  finally:
    if final == "hidden" and button.count() == 1 and button.get_attribute("aria-pressed") == "true":
      button.click()
      page.wait_for_timeout(200)
    page.evaluate("window.scrollTo(0, 0)")
  if page.evaluate(shown) != (0 if final == "hidden" else 2):
    failures.append(Failure(page_name, f"the final frame must have the gray chips {final}"))


def check_inline_thread(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """An inline comment thread: green chip with a bubble, a titled green box, reply and delete requests, the switch."""
  if not scenario.get("inlineThreadChecks"):
    return
  page_name = scenario["page"]
  chip = "div.okf-comment[data-okf-comment-kind='thread'] > .okf-chip"
  gray = "div.okf-comment[data-okf-comment-kind='comment'] > .okf-chip"
  measure = """selector => {
    const chip = document.querySelector(selector);
    if (!chip) return null;
    const wrapper = chip.parentElement;
    const body = wrapper.querySelector('.okf-comment-body');
    const box = body.getBoundingClientRect();
    const style = getComputedStyle(body);
    const shown = style.display !== 'none';
    const root = document.documentElement;
    const green = getComputedStyle(document.documentElement).getPropertyValue('--studio-charts-green').trim();
    const bubble = getComputedStyle(chip, '::before');
    return {
      expanded: chip.getAttribute('aria-expanded'),
      shown,
      title: shown ? getComputedStyle(body, '::before').content : null,
      top: box.top + window.scrollY,
      chipBottom: chip.getBoundingClientRect().bottom + window.scrollY,
      barWidth: style.borderInlineStartWidth,
      barColor: style.borderInlineStartColor,
      chipColor: getComputedStyle(chip).color,
      chipBorder: getComputedStyle(chip).borderTopColor,
      bubbleMask: bubble.maskImage || bubble.webkitMaskImage,
      bubbleWidth: bubble.width,
      label: chip.textContent,
      messages: body.querySelectorAll('.okf-thread-message').length,
      heads: [...body.querySelectorAll('.okf-thread-head')].map(h => h.textContent),
      replyBox: !!body.querySelector('textarea'),
      replyButton: !!body.querySelector('button[data-okf-thread-reply]'),
      deleteButton: !!body.querySelector('button[data-okf-thread-delete]'),
      right: box.right,
      pane: root.clientWidth,
      overflowX: root.scrollWidth - root.clientWidth,
    };
  }"""
  try:
    page.evaluate("window.scrollTo(0, 0)")
    closed = page.evaluate(measure, chip)
    if not closed or closed["shown"] or closed["expanded"] != "false":
      failures.append(Failure(page_name, f"a thread must start closed: {closed}"))
      return
    if closed["label"] != "Ada Lovelace (2)":
      failures.append(Failure(page_name, f"the thread chip shows the first author and the count: {closed['label']!r}"))
    if closed["bubbleMask"] in (None, "", "none") or closed["bubbleWidth"] in ("auto", "0px"):
      failures.append(Failure(page_name, f"the thread chip has no speech bubble: {closed['bubbleMask']!r} {closed['bubbleWidth']}"))
    if closed["chipColor"] == chip_color(page, gray):
      failures.append(Failure(page_name, "the thread chip must be green, not the gray comment color"))
    save_step(page, scenario, "collapsed", caret="hide")
    page.locator(chip).first.click()
    page.wait_for_timeout(150)
    opened = page.evaluate(measure, chip)
    if opened["expanded"] != "true" or not opened["shown"]:
      failures.append(Failure(page_name, "a click on the thread chip did not open the thread"))
      return
    if opened["title"] != '"Thread"':
      failures.append(Failure(page_name, f"the open thread must be titled Thread: {opened['title']}"))
    if opened["barWidth"] != "4px" or opened["barColor"] != opened["chipColor"]:
      failures.append(Failure(page_name, f"the open thread needs a green accent bar: {opened['barWidth']} {opened['barColor']} vs {opened['chipColor']}"))
    if opened["top"] < opened["chipBottom"] - 1:
      failures.append(Failure(page_name, "the open thread must sit under the chip line"))
    if opened["messages"] != 2 or "Grace Hopper" not in " ".join(opened["heads"]) or "2026-10-16 10:52" not in " ".join(opened["heads"]):
      failures.append(Failure(page_name, f"the open thread lists both messages with author and date: {opened['heads']}"))
    if not (opened["replyBox"] and opened["replyButton"] and opened["deleteButton"]):
      failures.append(Failure(page_name, f"the open thread needs a reply box, Reply and Delete thread: {opened}"))
    if opened["right"] > opened["pane"] or opened["overflowX"] > 0:
      failures.append(Failure(page_name, "the open thread overflows the pane"))

    # Reading line: the paragraph after the thread does not move when the thread above it closes and opens.
    target = "document.querySelectorAll('#sphinx-myst-preview-content h2')[0].getBoundingClientRect().top"
    page.evaluate("document.querySelectorAll('#sphinx-myst-preview-content h2')[0].scrollIntoView()")
    page.wait_for_timeout(400)
    before = page.evaluate(target)
    page.evaluate(f"document.querySelector(\"{chip}\").click()")
    page.wait_for_timeout(400)
    if abs(page.evaluate(target) - before) > 2:
      failures.append(Failure(page_name, "closing the thread above moved the reading line"))
    page.evaluate(f"document.querySelector(\"{chip}\").click()")
    page.wait_for_timeout(400)
    if abs(page.evaluate(target) - before) > 2:
      failures.append(Failure(page_name, "opening the thread above moved the reading line"))
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(200)

    # Reply and Delete talk to the host with the source lines; nothing is sent for an empty reply.
    body = "div.okf-comment[data-okf-comment-kind='thread'] > .okf-comment-body"
    page.evaluate("window.visualMessages.length = 0")
    page.locator(f"{body} button[data-okf-thread-reply]").click()
    page.wait_for_timeout(100)
    if page.evaluate("window.visualMessages.filter(m => m.type === 'previewThreadReply').length") != 0:
      failures.append(Failure(page_name, "an empty reply must not be sent"))
    page.locator(f"{body} textarea").fill("Thanks, resolved.")
    page.locator(f"{body} button[data-okf-thread-reply]").click()
    page.wait_for_timeout(100)
    sent = page.evaluate("window.visualMessages.filter(m => m.type === 'previewThreadReply')")
    if len(sent) != 1 or sent[0].get("line") != 5 or sent[0].get("endLine") != 11 or sent[0].get("text") != "Thanks, resolved.":
      failures.append(Failure(page_name, f"Reply must send the thread lines and the text: {sent}"))
    else:
      # The host answers: the box is emptied and the buttons are usable again.
      page.evaluate("""editId => window.dispatchEvent(new MessageEvent('message', { data: {
        type: 'previewThreadReplyResult', editId, ok: true } }))""", sent[0]["editId"])
      page.wait_for_timeout(100)
      if page.locator(f"{body} textarea").input_value() != "":
        failures.append(Failure(page_name, "the reply box must be emptied once the host saved the reply"))
    page.locator(f"{body} button[data-okf-thread-delete]").click()
    page.wait_for_timeout(100)
    removed = page.evaluate("window.visualMessages.filter(m => m.type === 'previewThreadDelete')")
    if len(removed) != 1 or removed[0].get("line") != 5 or removed[0].get("endLine") != 11:
      failures.append(Failure(page_name, f"Delete thread must send the thread lines: {removed}"))
    else:
      page.evaluate("""editId => window.dispatchEvent(new MessageEvent('message', { data: {
        type: 'previewThreadDeleteResult', editId, ok: true } }))""", removed[0]["editId"])
      page.wait_for_timeout(100)

    # The switch: the thread goes with the gray chips, the TODO chip stays.
    send = """show => {
      const root = document.documentElement;
      window.postMessage({
        type: 'previewShowComments', showComments: show,
        documentId: root.getAttribute('data-sphinx-preview-document-id'),
        revision: Number(root.getAttribute('data-sphinx-preview-document-version')),
        requestId: Number(root.getAttribute('data-sphinx-preview-request-id')),
      }, '*');
    }"""
    page.evaluate(send, False)
    page.wait_for_timeout(300)
    if page.evaluate("[...document.querySelectorAll('.okf-comment[data-okf-comment-kind=thread]')].some(e => e.getClientRects().length > 0)"):
      failures.append(Failure(page_name, "the thread is still visible with showComments off"))
    if not page.evaluate("[...document.querySelectorAll('.okf-chip--todo')].every(e => e.getClientRects().length > 0)"):
      failures.append(Failure(page_name, "TODO chips must stay with showComments off"))
    page.evaluate(send, True)
    page.wait_for_timeout(300)
    if not page.evaluate("[...document.querySelectorAll('.okf-comment[data-okf-comment-kind=thread]')].every(e => e.getClientRects().length > 0)"):
      failures.append(Failure(page_name, "the thread did not come back with showComments on"))
  finally:
    page.evaluate("window.scrollTo(0, 0)")
  # The capture shows the thread open with a reply being typed.
  if page.evaluate(measure, chip)["expanded"] != "true":
    page.locator(chip).first.click()
  page.locator("div.okf-comment[data-okf-comment-kind='thread'] > .okf-comment-body textarea").fill("Thanks, I will update the draft.")
  page.wait_for_timeout(200)


def chip_color(page: Page, selector: str) -> str | None:
  """The text color of a chip, or None when the page has none of that kind."""
  return page.evaluate("selector => { const e = document.querySelector(selector); return e ? getComputedStyle(e).color : null; }", selector)


FIRST_ELEMENT_GAP = 40
FIRST_ELEMENT_TOLERANCE = 4
FIRST_GAP_REPORT_DIR = VISUAL_REPORT_DIR / "first-gap"


# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-007
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-011
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-018
def check_first_element_gap(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P3: one uniform 40px gap above the first element, in every case, state and width mode.

  The rule: the first element (or the Start writing button, the open first-block editor, the
  controls of a leading properties table) starts 40 +-4px below the top. The only exception is an
  interactive element in a pane of 480px or less (the toolbar covers most of the width): it is then
  pushed just far enough that it clears the toolbar, and the report says so. Every measurement is
  written to out/reports/visual/first-gap/<group>/<scenario>.json.
  """
  mode = scenario.get("firstElementGap")
  if not mode:
    return
  page_name = scenario["page"]
  state_wanted = scenario.get("firstElementGapState", "edit")
  width_mode = scenario.get("firstElementGapWidth", "margin")
  records: list[dict] = []
  probe = """selector => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const barElement = document.querySelector('[data-sphinx-preview-toolbar]');
    const bar = barElement.getBoundingClientRect();
    const root = getComputedStyle(document.documentElement);
    const hit = r => r.width > 0 && r.height > 0 && r.left < bar.right && r.right > bar.left
      && r.top < bar.bottom && r.bottom > bar.top;
    return {
      viewportTop: rect.top, scrollY: window.scrollY, top: rect.top + window.scrollY, width: rect.width, left: rect.left, right: rect.right,
      overlaps: hit(rect),
      barBottom: bar.bottom, barLeft: bar.left,
      clearance: parseFloat(root.getPropertyValue('--sphinx-preview-first-clearance')) || 0,
      inset: parseFloat(root.getPropertyValue('--sphinx-preview-first-inset')) || 0,
    };
  }"""

  # Read-only snapshot added to the failure message and the record when a control or the element is
  # under the toolbar: it shows which input of the clearance moved. It never decides pass or fail.
  diagnostic_probe = """selector => {
    const box = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)];
    };
    const root = getComputedStyle(document.documentElement);
    const bar = document.querySelector('[data-sphinx-preview-toolbar]');
    const barRect = bar ? bar.getBoundingClientRect() : null;
    const section = document.querySelector('#sphinx-myst-preview-content > [data-okf-properties]');
    const controls = section ? [...section.querySelectorAll('button, a[href], [data-okf-description-toggle]')] : [];
    return {
      toolbar: box(bar), content: box(document.getElementById('sphinx-myst-preview-content')),
      section: box(section), element: box(document.querySelector(selector)),
      controls: controls.map(control => ({
        kind: control.hasAttribute('data-okf-description-toggle') ? 'toggle' : control.tagName.toLowerCase(),
        box: box(control),
        under: !!barRect && (r => r.width > 0 && r.height > 0 && r.left < barRect.right && r.right > barRect.left
          && r.top < barRect.bottom && r.bottom > barRect.top)(control.getBoundingClientRect()),
      })).filter(item => item.under),
      vars: {
        clearance: root.getPropertyValue('--sphinx-preview-first-clearance'),
        inset: root.getPropertyValue('--sphinx-preview-first-inset'),
        toolbarBottom: root.getPropertyValue('--sphinx-preview-toolbar-bottom'),
      },
      readyState: document.readyState, fonts: document.fonts.status,
      viewport: [window.innerWidth, window.innerHeight],
      // The page's own view: published values, what its layout gives now, the last trigger.
      firstClearance: window.__studioDiagnostics?.firstClearance?.() ?? null,
    };
  }"""

  def record(label: str, selector: str, controls: str | None = None, interactive: bool = False) -> None:
    got = page.evaluate(probe, selector)
    if not got:
      failures.append(Failure(page_name, f"[{label}] {selector} is not in the page"))
      return
    hits = 0
    if controls:
      hits = page.evaluate(
        """selector => {
          const bar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();
          return [...document.querySelectorAll(selector)].filter(e => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.left < bar.right && r.right > bar.left
              && r.top < bar.bottom && r.bottom > bar.top;
          }).length;
        }""",
        controls,
      )
    gap = got["top"]
    pushed = got["clearance"] > 0
    ok_uniform = abs(gap - FIRST_ELEMENT_GAP) <= FIRST_ELEMENT_TOLERANCE
    # Only a narrow pane (the toolbar covers most of the width) may push an interactive element down.
    ok_pushed = pushed and page.viewport_size["width"] <= 480 and gap > FIRST_ELEMENT_GAP
    records.append({
      "label": label, "selector": selector, "mode": mode, "state": label.split(":")[0],
      "pane": page.viewport_size["width"], "widthMode": width_mode,
      "gap": round(gap, 1), "viewportTop": round(got["viewportTop"], 1), "scrollY": got["scrollY"], "clearance": got["clearance"], "inset": got["inset"],
      "toolbarBottom": round(got["barBottom"], 1), "pushedBelowToolbar": pushed,
      "overlapsToolbar": got["overlaps"], "controlsUnderToolbar": hits,
    })
    if not (ok_uniform or ok_pushed):
      failures.append(Failure(
        page_name,
        f"[{label}] the gap is {gap:.1f}px, expected {FIRST_ELEMENT_GAP}px +-{FIRST_ELEMENT_TOLERANCE} "
        f"(or more in a pane of 480px or less, when an interactive element must sit below the toolbar; clearance {got['clearance']:.0f}px)"))
    diagnostic = ""
    if hits or (got["overlaps"] and interactive):
      diagnostic = " " + json.dumps(page.evaluate(diagnostic_probe, selector), separators=(",", ":"))
      records[-1]["diagnostic"] = json.loads(diagnostic)
    if got["overlaps"] and interactive:
      failures.append(Failure(page_name, f"[{label}] {selector} overlaps the floating toolbar{diagnostic}"))
    if hits:
      failures.append(Failure(page_name, f"[{label}] {hits} control(s) of {selector} sit under the toolbar{diagnostic}"))

  def finish() -> None:
    FIRST_GAP_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path(FIRST_GAP_REPORT_DIR, scenario["id"]).write_text(json.dumps(records, indent=2), encoding="utf-8")

  # Width mode: the Width button cycles margin -> auto -> full.
  for _ in range({"margin": 0, "auto": 1, "full": 2}[width_mode]):
    page.locator("[data-sphinx-preview-width-toggle]").click()
    page.wait_for_timeout(200)

  first = "#sphinx-myst-preview-content > :first-child"
  props_selector = "#sphinx-myst-preview-content > [data-okf-properties]"
  props_controls = ", ".join(props_selector + " " + part for part in ("button", "a[href]", "[data-okf-description-toggle]"))

  def measure_first(label: str) -> None:
    if mode == "properties":
      record(label + ":properties", props_selector, props_controls)
    else:
      record(label + ":" + mode, first)

  if mode != "empty":
    # The page settles its toolbar clearance through observers (ResizeObserver callbacks run in the
    # rendering steps of a frame). On a loaded runner a frame can take longer than the pause between
    # two readings, so a reading taken without a frame in between can repeat while an observer
    # update is still pending. Every reading therefore waits for two animation frames (and for the
    # fonts) first; two equal readings then mean that the observers had their turn.
    settle = """async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const root = getComputedStyle(document.documentElement);
      const first = document.querySelector('#sphinx-myst-preview-content > :first-child');
      const box = first ? first.getBoundingClientRect() : null;
      return [root.getPropertyValue('--sphinx-preview-first-clearance'), root.getPropertyValue('--sphinx-preview-first-inset'),
        box ? Math.round(box.top) + ':' + Math.round(box.width) + ':' + Math.round(box.height) : ''].join('|');
    }"""
    previous = None
    for _ in range(20):
      current_layout = page.evaluate(settle)
      if current_layout == previous:
        break
      previous = current_layout
      page.wait_for_timeout(100)
    measure_first("read")
    if state_wanted == "read":
      finish()
      return
  elif state_wanted == "read":
    # An empty document has no first element to look at; the report says so.
    finish()
    return
  page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.wait_for_timeout(200)
  if mode == "empty":
    record("edit:Start writing", ".sphinx-preview-insert-point--start button", interactive=True)
    finish()
    return
  measure_first("edit")
  if mode in {"table", "properties"} or page.evaluate(
    "selector => !!document.querySelector(selector).querySelector('table') || document.querySelector(selector).hasAttribute('data-okf-properties')", first
  ):
    finish()
    return
  page.locator(first).click(position={"x": 12, "y": 6})
  page.locator(".sphinx-preview-block-editor textarea").wait_for(state="visible", timeout=2000)
  page.wait_for_timeout(150)
  # P4: the palette on top of the frame is the first thing on the page; the host wraps both.
  record("editor:" + mode + " (frame with palette)", ".sphinx-preview-block-editor-host", interactive=True)
  # The palette is the first thing above the text box: it must sit in the same place, not lower.
  record("palette:" + mode + " (edition palette)", ".sphinx-preview-block-editor-host > .sphinx-preview-edit-palette", interactive=True)
  editor_gap = next((item["gap"] for item in records if item["label"].startswith("editor:")), None)
  palette_gap = next((item["gap"] for item in records if item["label"].startswith("palette:")), None)
  if editor_gap is not None and palette_gap is not None and abs(palette_gap - editor_gap) > FIRST_ELEMENT_TOLERANCE:
    failures.append(Failure(page_name, f"the palette starts {palette_gap:.1f}px from the top but its editor starts {editor_gap:.1f}px: it is displaced"))
  if mode == "wide-margin" and any(item["clearance"] != 0 for item in records):
    failures.append(Failure(page_name, "a wide pane needs no clearance"))
  finish()


def answer_code_copy(page: Page, ok: bool = True) -> None:
  """Plays the host's answer to the last copy request, as the extension host does."""
  page.evaluate("""([ok]) => {
    const request = window.visualMessages.filter(m => m.type === 'previewCopyText').at(-1);
    window.dispatchEvent(new MessageEvent('message', { data: {
      type: 'previewCopyTextResult', editId: request.editId, ok, ...(ok ? {} : { reason: 'Too large to copy.' }) } }));
  }""", [ok])


def check_code_copy(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The copy button follows the hovered code block and posts its raw code."""
  if scenario.get("codeCopyKeyboardChecks"):
    check_code_copy_keyboard(page, scenario, failures)
    return
  if not scenario.get("codeCopyChecks"):
    return
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-code-copy]")
  if button.count() != 0:
    failures.append(Failure(page_name, "a copy button exists before any block is hovered"))
  block = page.locator("#sphinx-myst-preview-content pre").first
  block.hover(position={"x": 120, "y": 40})
  page.wait_for_timeout(120)
  if button.count() != 1 or not button.is_visible():
    failures.append(Failure(page_name, "hovering a code block did not show the copy button"))
    return
  geometry = page.evaluate("""() => {
    const pre = document.querySelector('#sphinx-myst-preview-content pre').getBoundingClientRect();
    const rect = document.querySelector('[data-sphinx-preview-code-copy]').getBoundingClientRect();
    const bar = document.querySelector('[data-sphinx-preview-toolbar]')?.getBoundingClientRect();
    return {
      pre: { top: pre.top, right: pre.right, left: pre.left },
      rect: { top: rect.top, right: rect.right, width: rect.width, height: rect.height },
      overlaps: !!bar && rect.left < bar.right && rect.right > bar.left && rect.top < bar.bottom && rect.bottom > bar.top,
    };
  }""")
  rect, pre = geometry["rect"], geometry["pre"]
  if abs(rect["width"] - 26) > 1 or abs(rect["height"] - 26) > 1:
    failures.append(Failure(page_name, f"copy button is {rect['width']}x{rect['height']}, expected 26x26"))
  if abs((pre["right"] - rect["right"]) - 6) > 2 or abs((rect["top"] - pre["top"]) - 6) > 2:
    failures.append(Failure(page_name, f"copy button is not 6px inside the block's top right: {geometry}"))
  if geometry["overlaps"]:
    failures.append(Failure(page_name, "the copy button overlaps the floating toolbar"))
  save_step(page, scenario, "hover", caret="hide")
  expected = block.locator("code").evaluate("element => element.textContent")
  button.click()
  copied = page.evaluate(
    "window.visualMessages.filter(m => m.type === 'previewCopyText').at(-1)")
  if not copied or copied.get("text") != expected:
    failures.append(Failure(page_name, "clicking the copy button did not post the exact code text"))
  if button.get_attribute("aria-label") == "Copied":
    failures.append(Failure(page_name, "the copy button said Copied before the host answered"))
  answer_code_copy(page)
  if button.get_attribute("aria-label") != "Copied":
    failures.append(Failure(page_name, "the copy button did not show the check mark after the click"))
  if page.locator(".sphinx-preview-block-editor").count() != 0:
    failures.append(Failure(page_name, "clicking the copy button opened a block editor"))


def check_code_copy_keyboard(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The copy button is reached with the keyboard: Tab focuses the block, Tab again the button, Enter copies."""
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-code-copy]")
  if button.count() != 0:
    failures.append(Failure(page_name, "a copy button exists before any block is focused"))
  # Tab from the top of the page until the first code block holds the focus, like a keyboard reader.
  page.evaluate("() => { document.activeElement?.blur(); }")
  for _ in range(40):
    page.keyboard.press("Tab")
    if page.evaluate("document.activeElement === document.querySelector('#sphinx-myst-preview-content pre')"):
      break
  page.wait_for_timeout(120)
  if button.count() != 1 or not button.is_visible():
    failures.append(Failure(page_name, "focusing a code block did not show the copy button"))
    return
  ring = page.evaluate("""() => {
    const pre = document.querySelector('#sphinx-myst-preview-content pre');
    const style = getComputedStyle(pre);
    return { focused: document.activeElement === pre, width: style.outlineWidth, style: style.outlineStyle };
  }""")
  if not ring["focused"] or ring["style"] == "none" or ring["width"] == "0px":
    failures.append(Failure(page_name, f"the focused code block shows no focus ring: {ring}"))
  page.keyboard.press("Tab")
  focused = page.evaluate("document.activeElement && document.activeElement.hasAttribute('data-sphinx-preview-code-copy')")
  if not focused or not button.is_visible():
    failures.append(Failure(page_name, "Tab from the code block did not focus the visible copy button"))
    return
  outline = button.evaluate("element => getComputedStyle(element).outlineStyle")
  if outline == "none":
    failures.append(Failure(page_name, "the focused copy button shows no focus ring"))
  if button.get_attribute("aria-label") != "Copy code":
    failures.append(Failure(page_name, "the copy button has no Copy code label"))
  expected = page.locator("#sphinx-myst-preview-content pre").first.locator("code").evaluate("element => element.textContent")
  page.keyboard.press("Enter")
  copied = page.evaluate("window.visualMessages.filter(m => m.type === 'previewCopyText').at(-1)")
  if not copied or copied.get("text") != expected:
    failures.append(Failure(page_name, "Enter on the focused copy button did not post the exact code text"))
  answer_code_copy(page)
  if button.get_attribute("aria-label") != "Copied":
    failures.append(Failure(page_name, "the copy button did not show the check mark after Enter"))


def check_edit_affordances(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """T15: hover outline on a list, then a framed paragraph editor with hint and buttons."""
  if not scenario.get("editAffordances"):
    return
  page_name = scenario["page"]
  # The sticky heading band overlapping the toolbar row is a known baseline defect on every
  # scrolled page (see logs/visual-baseline-failures.txt); this scenario is about the editor.
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  item = page.locator("main ul > li").first
  item.scroll_into_view_if_needed()
  item.hover()
  hovered = page.locator('main [data-sphinx-preview-edit-hover="true"]')
  if hovered.count() != 1:
    failures.append(Failure(page_name, f"hovering a list item marked {hovered.count()} elements, expected 1"))
  elif hovered.evaluate("element => element.tagName") != "UL":
    failures.append(Failure(page_name, "hover did not mark the whole list"))
  elif hovered.evaluate("element => getComputedStyle(element).outlineStyle") != "dashed":
    failures.append(Failure(page_name, "hovered list has no dashed outline"))
  save_step(page, scenario, "hover", caret="hide")

  paragraph = page.locator("main > p[data-sphinx-source-line]").first
  paragraph.scroll_into_view_if_needed()
  paragraph.click()
  editor = page.locator(".sphinx-preview-block-editor")
  if editor.count() != 1 or not editor.is_visible():
    failures.append(Failure(page_name, "clicking a paragraph did not open its framed editor"))
    return
  if page.locator('main [data-sphinx-preview-edit-hover="true"]').count() != 0:
    failures.append(Failure(page_name, "hover outline stayed on while an editor opened"))
  frame = editor.evaluate("""element => {
    const style = getComputedStyle(element);
    const area = getComputedStyle(element.querySelector('textarea'));
    return { border: style.borderTopWidth, background: style.backgroundColor,
      family: area.fontFamily, tab: area.tabSize };
  }""")
  if frame["border"] != "1px" or frame["background"] in {"rgba(0, 0, 0, 0)", "transparent"}:
    failures.append(Failure(page_name, f"block editor has no visible frame: {frame}"))
  if "monospace" not in frame["family"].lower() and "mono" not in frame["family"].lower():
    failures.append(Failure(page_name, f"block editor textarea is not monospace: {frame['family']}"))
  if frame["tab"] != "4":
    failures.append(Failure(page_name, f"block editor tab-size is {frame['tab']}, expected 4"))
  status = editor.locator("[data-sphinx-preview-edit-status]").text_content() or ""
  if not re.match(r"^Lines? \d+(\u2013\d+)? \u00b7 Enter: new line \u00b7 Tab: indent \u00b7 Esc: cancel \u00b7 (\u2318\u21a9|Ctrl\+Enter): done$", status):
    failures.append(Failure(page_name, f"block editor hint is wrong: {status!r}"))
  done = editor.locator("button[aria-label='Done editing']")
  cancel = editor.locator("button[aria-label='Cancel editing and restore the original text']")
  if done.count() != 1 or cancel.count() != 1 or not done.is_visible() or not cancel.is_visible():
    failures.append(Failure(page_name, "Done and Cancel buttons are not both visible"))
  elif (cancel.text_content() or "").strip() != "Cancel":
    failures.append(Failure(page_name, "the second button is not labelled Cancel"))
  else:
    layout = editor.evaluate("""element => {
      const row = element.querySelector('.sphinx-preview-block-editor-actions');
      const status = row && row.querySelector('[data-sphinx-preview-edit-status]');
      const buttons = row && row.querySelector('.sphinx-preview-block-editor-buttons');
      if (!status || !buttons) return null;
      const s = status.getBoundingClientRect();
      const b = buttons.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const area = getComputedStyle(element.querySelector('textarea')).fontSize;
      const editorSize = parseFloat(getComputedStyle(document.body).fontSize);
      return { sTop: s.top, sBottom: s.bottom, sRight: s.right, sLeft: s.left, bTop: b.top,
        bBottom: b.bottom, bLeft: b.left, bRight: b.right, rRight: r.right, area: parseFloat(area),
        statusSize: parseFloat(getComputedStyle(status).fontSize),
        statusParentSize: parseFloat(getComputedStyle(status.parentElement).fontSize),
        body: editorSize };
    }""")
    if layout is None:
      failures.append(Failure(page_name, "status line is not inside the Done/Cancel row"))
    else:
      if abs(layout["statusSize"] / layout["statusParentSize"] - 0.75) > 0.01:
        failures.append(Failure(page_name, f"status text is not 75% of its parent font size: {layout}"))
      sideBySide = layout["sBottom"] > layout["bTop"] and layout["sTop"] < layout["bBottom"]
      if sideBySide and layout["sRight"] > layout["bLeft"] + 0.5:
        failures.append(Failure(page_name, f"status text overlaps the buttons: {layout}"))
      status_centre = (layout["sTop"] + layout["sBottom"]) / 2
      button_centre = (layout["bTop"] + layout["bBottom"]) / 2
      if sideBySide and abs(status_centre - button_centre) > 2:
        failures.append(Failure(
          page_name,
          f"status text centre is {button_centre - status_centre:.1f}px above the buttons' centre: {layout}",
        ))
      if layout["bRight"] > layout["rRight"] + 0.5:
        failures.append(Failure(page_name, f"buttons overflow the editor row: {layout}"))
      if layout["bLeft"] <= layout["sLeft"]:
        failures.append(Failure(page_name, f"buttons are not right of the status text: {layout}"))
      if not layout["area"] < layout["body"]:
        failures.append(Failure(page_name, f"editor text is not smaller than the body text: {layout}"))


def check_palette_mode(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P6: the palette buttons follow the mode, in a paragraph editor and in an insertion-point editor."""
  mode = scenario.get("paletteModeShot")
  if not mode:
    return
  page_name = scenario["page"]
  strict = ["heading", "bold", "italic", "strikethrough", "color", "colorCode", "link", "image", "codeFence", "quote", "rule", "table", "emoji", "todo", "thread"]
  gfm = strict + ["alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd"]
  myst = gfm + ["admonition", "deflist", "math", "sub", "sup", "label", "ref", "doc", "cite", "dropdown", "tableCaption", "listTable", "pipeTable", "figure", "roleKbd"]
  expected = {"strict": strict, "gfm": gfm, "myst": myst}[mode]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")

  def pick_and_check(label: str) -> None:
    editor = page.locator(".sphinx-preview-block-editor")
    editor.locator("textarea").wait_for(state="visible", timeout=2000)
    page.locator(".sphinx-preview-block-editor-host").locator("select[data-edit-palette-mode-select]").select_option(mode)
    page.wait_for_timeout(150)
    labels = page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette").evaluate(
      "bar => [...bar.querySelectorAll(':scope > button')].map((button) => button.dataset.editAction)"
    )
    if labels != expected:
      failures.append(Failure(page_name, f"{label}: palette buttons in {mode} mode are {labels}, expected {expected}"))
    if page.locator(".sphinx-preview-block-editor-host").locator(".sphinx-preview-edit-palette").get_attribute("data-palette-mode") != mode:
      failures.append(Failure(page_name, f"{label}: the palette is not in {mode} mode"))
    selected = page.locator(".sphinx-preview-block-editor-host").locator("select[data-edit-palette-mode-select] option:checked").text_content()
    if mode == "myst" and selected != "MyST":
      failures.append(Failure(page_name, f"{label}: the MyST option reads {selected!r}, expected 'MyST'"))
    page.mouse.move(2, 2)

  paragraph = page.locator("main > p[data-sphinx-source-line]").nth(3)
  paragraph.evaluate("element => element.scrollIntoView({ block: 'center' })")
  page.wait_for_timeout(150)
  paragraph.click()
  pick_and_check("paragraph editor")
  save_step(page, scenario, "palette", caret="hide")
  page.keyboard.press("Escape")
  page.wait_for_timeout(200)
  if page.locator(".sphinx-preview-block-editor").count() != 0:
    failures.append(Failure(page_name, "Escape did not close the paragraph editor"))
    return

  point = page.locator("main .sphinx-preview-insert-point:not(.sphinx-preview-insert-point--start) button").nth(3)
  point.evaluate("element => element.scrollIntoView({ block: 'center' })")
  point.click(force=True)
  pick_and_check("insertion point editor")
  save_step(page, scenario, "insert-point", caret="hide", unless_final_frame=True)
  # The editor stays open: the scenario's own PNG then shows this mode, not a mode-less page.


def check_slash_menu(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P11: the / command menu: contents per mode, placement, flip near the bottom, filter and no-match."""
  shot = scenario.get("slashMenuShot")
  if not shot:
    return
  mode = shot["mode"]
  page_name = scenario["page"]
  strict = ["heading", "bold", "italic", "strikethrough", "color", "link", "image", "codeFence", "quote", "rule", "table", "emoji", "todo", "thread"]
  gfm = strict + ["alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd"]
  myst = gfm + ["admonition", "deflist", "math", "sub", "sup", "label", "ref", "doc", "cite", "dropdown", "tableCaption", "figure", "roleKbd"]
  # The palette's buttons (minus the caret-dependent colour code and table conversions) plus the two menu-only list entries.
  expected = {"strict": strict, "gfm": gfm, "myst": myst}[mode] + ["bulletList", "numberedList"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  state_script = """() => {
    const menu = document.querySelector('[data-slash-menu]');
    if (!menu) return null;
    const r = menu.getBoundingClientRect();
    const area = document.querySelector('.sphinx-preview-block-editor textarea');
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(24, r.height / 2));
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const t = toolbar ? toolbar.getBoundingClientRect() : null;
    return {
      ids: [...menu.querySelectorAll('[data-slash-id]')].map((option) => option.dataset.slashId),
      none: Boolean(menu.querySelector('[data-slash-none]')),
      placement: menu.dataset.slashPlacement,
      rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      vw: innerWidth, vh: innerHeight,
      covered: !(hit && menu.contains(hit)),
      overToolbar: Boolean(t && r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top),
      expanded: area ? area.getAttribute('aria-expanded') : null,
      active: area ? area.getAttribute('aria-activedescendant') : null,
      activeExists: Boolean(area && area.getAttribute('aria-activedescendant') && document.getElementById(area.getAttribute('aria-activedescendant'))),
      live: (menu.querySelector('[aria-live]') || {}).textContent,
    };
  }"""

  def state() -> dict | None:
    return page.evaluate(state_script)

  def inside(label: str, found: dict) -> None:
    rect = found["rect"]
    if rect["left"] < 0 or rect["top"] < 0 or rect["right"] > found["vw"] or rect["bottom"] > found["vh"]:
      failures.append(Failure(page_name, f"{label}: the menu leaves the viewport: {rect} in {found['vw']}x{found['vh']}"))
    if found["covered"]:
      failures.append(Failure(page_name, f"{label}: something covers the menu"))
    if found["overToolbar"]:
      failures.append(Failure(page_name, f"{label}: the menu sits over the floating toolbar but is not above it"))

  def open_editor(index: int) -> "Locator":
    paragraph = page.locator("main > p[data-sphinx-source-line]").nth(index)
    paragraph.evaluate("element => element.scrollIntoView({ block: 'center' })")
    page.wait_for_timeout(150)
    paragraph.click()
    area = page.locator(".sphinx-preview-block-editor textarea")
    area.wait_for(state="visible", timeout=2000)
    return area

  # Phase A: an editor at the bottom of the viewport; the menu flips above the caret.
  area = open_editor(6)
  page.locator(".sphinx-preview-block-editor-host").locator("select[data-edit-palette-mode-select]").select_option(mode)
  page.wait_for_timeout(150)
  area.evaluate("""element => {
    element.focus();
    const bottom = element.getBoundingClientRect().bottom;
    window.scrollBy(0, bottom - (innerHeight - 56));
  }""")
  page.wait_for_timeout(150)
  area.press("End")
  area.press("Enter")
  page.keyboard.type("/")
  page.wait_for_timeout(200)
  flip = state()
  if flip is None:
    failures.append(Failure(page_name, "the menu did not open near the bottom of the viewport"))
  else:
    if flip["placement"] != "above":
      failures.append(Failure(page_name, f"near the bottom the menu is {flip['placement']}, expected above"))
    inside("near the bottom", flip)
    save_step(page, scenario, "flip", caret="hide")
  page.keyboard.press("Escape")
  page.keyboard.press("Escape")
  page.wait_for_timeout(250)
  if page.locator(".sphinx-preview-block-editor").count() != 0:
    failures.append(Failure(page_name, "Escape did not close the editor after the menu"))
    return

  # Phase B: a paragraph in the middle of the viewport.
  area = open_editor(3)
  area.press("End")
  area.press("Enter")
  page.keyboard.type("/")
  page.wait_for_timeout(200)
  opened = state()
  if opened is None:
    failures.append(Failure(page_name, "typing / did not open the menu"))
    return
  listed = []
  for key in opened["ids"]:
    base = key.split(":")[0]
    if base not in listed:
      listed.append(base)
  if sorted(listed) != sorted(expected):
    failures.append(Failure(page_name, f"menu commands in {mode} mode are {sorted(listed)}, expected {sorted(expected)}"))
  if opened["placement"] != "below":
    failures.append(Failure(page_name, f"menu placement {opened['placement']}, expected below the caret"))
  if opened["expanded"] != "true" or not opened["activeExists"]:
    failures.append(Failure(page_name, f"ARIA state of the text box: expanded={opened['expanded']} active={opened['active']}"))
  if not opened["live"] or "commands" not in opened["live"]:
    failures.append(Failure(page_name, f"live region reads {opened['live']!r}"))
  inside("open", opened)
  save_step(page, scenario, "open", caret="hide")

  page.keyboard.type("h")
  page.wait_for_timeout(120)
  filtered = state()
  if filtered is None or not (0 < len(filtered["ids"]) < len(opened["ids"])):
    failures.append(Failure(page_name, f"typing h did not narrow the list: {filtered and len(filtered['ids'])} of {len(opened['ids'])}"))
  else:
    inside("filtered", filtered)
    save_step(page, scenario, "filtered", caret="hide")

  page.keyboard.type("zz")
  page.wait_for_timeout(120)
  none = state()
  if none is None or not none["none"] or none["ids"]:
    failures.append(Failure(page_name, "no No command row for an unmatched query"))
  else:
    inside("no match", none)
    save_step(page, scenario, "nomatch", caret="hide")

  for _ in range(4):
    page.keyboard.press("Backspace")
  page.wait_for_timeout(120)
  if state() is not None:
    failures.append(Failure(page_name, "Backspace past the slash did not close the menu"))

  # The scenario PNG: the menu open with the final query.
  page.keyboard.type("/" + shot["finalQuery"])
  page.wait_for_timeout(200)
  if state() is None:
    failures.append(Failure(page_name, "the menu did not reopen for the scenario capture"))


def check_edit_palette_tall(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P4: a very tall edit box; the palette stays at the top of the viewport while the box scrolls."""
  if not scenario.get("editPaletteTall"):
    return
  page_name = scenario["page"]
  paragraph = page.locator("main > p[data-sphinx-source-line]").nth(3)
  paragraph.evaluate("element => element.scrollIntoView({ block: 'center' })")
  page.wait_for_timeout(150)
  paragraph.click()
  editor = page.locator(".sphinx-preview-block-editor")
  area = editor.locator("textarea")
  area.wait_for(state="visible")
  area.fill("\n".join(f"Line {number} of a very tall edit box that outgrows the viewport." for number in range(1, 141)))
  page.wait_for_timeout(300)
  measure = """() => {
    const frame = document.querySelector('.sphinx-preview-block-editor');
    const host = frame.parentElement;
    const bar = host.querySelector(':scope > .sphinx-preview-edit-palette');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };
    const b = bar.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + 40, b.top + b.height / 2);
    return {
      frame: rect(frame), host: rect(host), bar: rect(bar), toolbar: rect(toolbar),
      band: band && !band.hidden ? rect(band) : null,
      covered: !(hit && (hit === bar || bar.contains(hit))),
      viewport: window.innerHeight, docWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  }"""
  frame_page_top = editor.evaluate("element => element.getBoundingClientRect().top + window.scrollY")
  frame_height = editor.evaluate("element => element.getBoundingClientRect().height")
  viewport = page.evaluate("() => window.innerHeight")
  if frame_height < viewport * 1.5:
    failures.append(Failure(page_name, f"the edit box is not taller than the viewport: {frame_height} vs {viewport}"))
    return

  # Box top visible: the palette is attached on top of the box, outside its border. A tall (wrapped)
  # palette needs the room above the box to be clear of the preview controls: with the box top just
  # under them the bar has to ride over the box (the viewport limit), which is not the state shown here.
  # The clearance comes from the real layout, not from a constant: the room under the toolbar and the
  # sticky headings band (their height depends on the fonts, the number of levels and the heading text
  # at that scroll position), the bar's own height and a margin. The band changes with the scroll
  # position, so the scroll is repeated until the clearance it needs is the one it has.
  clearance_probe = """() => {
    const bar = document.querySelector('.sphinx-preview-block-editor-host > .sphinx-preview-edit-palette').getBoundingClientRect();
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const bottoms = [band && !band.hidden ? band.getBoundingClientRect().bottom : 0, toolbar ? toolbar.getBoundingClientRect().bottom : 0];
    return { needed: Math.max(220, Math.max(...bottoms) + 4 + bar.height + 24), frameTop: document.querySelector('.sphinx-preview-block-editor').getBoundingClientRect().top };
  }"""
  for _ in range(6):
    room = page.evaluate(clearance_probe)
    if room["frameTop"] >= room["needed"] and room["frameTop"] - room["needed"] <= 60:
      break
    page.evaluate("(delta) => window.scrollBy(0, delta)", room["frameTop"] - room["needed"] - 10)
    page.wait_for_timeout(200)
  page.wait_for_timeout(200)
  top = page.evaluate(measure)
  if not (0 <= top["frame"]["top"] - top["bar"]["bottom"] <= 6) or top["bar"]["bottom"] > top["frame"]["top"] + 0.5:
    failures.append(Failure(page_name, f"the palette is not attached on top of the box: {top}"))
  if top["covered"]:
    failures.append(Failure(page_name, f"the palette is covered at the box top: {top}"))
  save_step(page, scenario, "top", caret="hide")

  def check_stuck(label: str, state: dict) -> None:
    usable = 0.0
    if state["band"]:
      usable = max(usable, state["band"]["bottom"])
    toolbar = state["toolbar"]
    if toolbar and state["bar"]["left"] < toolbar["right"] and state["bar"]["right"] > toolbar["left"]:
      usable = max(usable, toolbar["bottom"])
    if state["frame"]["top"] > -40:
      failures.append(Failure(page_name, f"{label}: the box top is still in view: {state}"))
    if state["bar"]["top"] < usable - 0.5:
      failures.append(Failure(page_name, f"{label}: the palette is under the band or the toolbar ({usable}): {state}"))
    if state["bar"]["top"] > usable + 16 or state["bar"]["bottom"] > state["viewport"]:
      failures.append(Failure(page_name, f"{label}: the palette did not stay at the top of the viewport: {state}"))
    if state["bar"]["bottom"] > state["host"]["bottom"] + 0.5 or state["bar"]["top"] < state["host"]["top"] - 0.5:
      failures.append(Failure(page_name, f"{label}: the palette left its host: {state}"))
    if state["covered"]:
      failures.append(Failure(page_name, f"{label}: the palette is covered by something: {state}"))
    if state["docWidth"] > state["clientWidth"] + 1:
      failures.append(Failure(page_name, f"{label}: the page scrolls sideways: {state}"))
    # CR 034: the bar rides over the box, the box's text never moves (no layout shift).
    scrolled = page.evaluate("() => window.scrollY")
    if abs(state["frame"]["top"] + scrolled - frame_page_top) > 1.5:
      failures.append(Failure(page_name, f"{label}: the box moved while the palette stuck: {state}"))
    if state["bar"]["left"] < -0.5 or state["bar"]["right"] > state["clientWidth"] + 0.5:
      failures.append(Failure(page_name, f"{label}: the palette leaves the pane sideways: {state}"))

  # CR 034: wide or narrow, the palette stays in view while the box top is scrolled out: it sticks at
  # the top of the viewport (wrapping inside the pane when it is narrow), and leaves with the box end.
  # Box top out of view: the palette stuck to the top of the viewport, buttons still usable.
  for offset, label in ((700, "box scrolled 700px"), (1500, "box scrolled 1500px")):
    page.evaluate("(y) => window.scrollTo(0, y)", frame_page_top + offset)
    page.wait_for_timeout(200)
    check_stuck(label, page.evaluate(measure))
  page.locator(".sphinx-preview-edit-palette button[data-edit-action='bold']").click()
  page.wait_for_timeout(150)
  if area.count() != 1:
    failures.append(Failure(page_name, "clicking Bold in the stuck palette closed the editor"))
    return
  if not area.evaluate("element => document.activeElement === element"):
    failures.append(Failure(page_name, "clicking Bold in the stuck palette took the focus out of the box"))
  # P4 r2: the caret must not end under the stuck palette. Start on line 12, scroll so the first
  # lines are under the bar, then press ArrowUp past the bar's lower edge.
  page.evaluate("(y) => window.scrollTo(0, y)", frame_page_top + 60)
  page.wait_for_timeout(200)
  area.evaluate("""element => {
    element.focus({ preventScroll: true });
    const offset = element.value.split('\\n').slice(0, 11).join('\\n').length + 1;
    element.setSelectionRange(offset, offset);
  }""")
  wide = scenario["width"] > 480
  for _ in range(9 if wide else 80):
    page.keyboard.press("ArrowUp")
    page.wait_for_timeout(60)
    # A narrow pane wraps the lines: go up to the first rows, where the bar would hide the caret.
    if not wide and area.evaluate("element => element.selectionEnd < 30"):
      break
  page.wait_for_timeout(200)
  caret = area.evaluate("""element => {
    const r = element.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    const line = element.value.slice(0, element.selectionEnd).split('\\n').length;
    const bar = document.querySelector('.sphinx-preview-block-editor-host > .sphinx-preview-edit-palette').getBoundingClientRect();
    return { line, top: r.top + (line - 1) * lineHeight, bottom: r.top + line * lineHeight, barBottom: bar.bottom };
  }""")
  if (wide and caret["line"] != 3) or caret["top"] < caret["barBottom"] - 1:
    failures.append(Failure(page_name, f"the caret ended under the stuck palette after ArrowUp: {caret}"))
  page.evaluate("(y) => window.scrollTo(0, y)", frame_page_top + 700)
  page.wait_for_timeout(200)
  page.mouse.move(2, 2)

  # The box end in view: the palette left with the box, never below it.
  page.evaluate("(y) => window.scrollTo(0, y)", frame_page_top + frame_height - viewport + 120)
  page.wait_for_timeout(200)
  end = page.evaluate(measure)
  if end["bar"]["bottom"] > end["host"]["bottom"] + 0.5:
    failures.append(Failure(page_name, f"the palette is below the end of the box: {end}"))
  save_step(page, scenario, "end", caret="hide")
  # The scenario PNG shows the stuck palette mid-box.
  page.evaluate("(y) => window.scrollTo(0, y)", frame_page_top + 700)
  page.wait_for_timeout(200)


def check_table_toolbar_tall(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """CR 034: the table toolbar stays above its table, then rides down with a tall table and leaves with it."""
  if not scenario.get("tableToolbarTall"):
    return
  page_name = scenario["page"]
  table = page.locator("main > table").first
  table.evaluate("element => element.scrollIntoView({ block: 'start' })")
  page.wait_for_timeout(150)
  cell = table.locator("tbody tr").nth(2).locator("td").nth(1)
  cell.click()
  page.wait_for_timeout(300)
  # The table top goes 24 px below the bar's own height under the preview controls, so the bar is in its
  # place above the table (a table top just under the controls makes the bar ride over it by design).
  # The room above the table comes from the real layout (toolbar and sticky band bottoms, which depend
  # on the fonts and on the scroll position), so the scroll is repeated until the table has it.
  room_probe = """() => {
    const bar = document.querySelector('[data-sphinx-table-menu]').getBoundingClientRect();
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const bottoms = [band && !band.hidden ? band.getBoundingClientRect().bottom : 0, toolbar ? toolbar.getBoundingClientRect().bottom : 0];
    return { needed: Math.max(220, Math.max(...bottoms) + 4 + bar.height + 24), tableTop: document.querySelector('main > table').getBoundingClientRect().top };
  }"""
  for _ in range(6):
    room = page.evaluate(room_probe)
    if room["tableTop"] >= room["needed"] and room["tableTop"] - room["needed"] <= 60:
      break
    page.evaluate("(delta) => window.scrollBy(0, delta)", room["tableTop"] - room["needed"] - 10)
    page.wait_for_timeout(250)
  page.wait_for_timeout(250)
  measure = """() => {
    const table = document.querySelector('main > table');
    const menu = document.querySelector('[data-sphinx-table-menu]');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };
    const bar = menu && menu.getBoundingClientRect();
    const hit = bar && document.elementFromPoint(bar.left + 20, bar.top + bar.height / 2);
    return {
      table: rect(table), bar: rect(menu), toolbar: rect(toolbar),
      band: band && !band.hidden ? rect(band) : null,
      stuck: menu ? menu.getAttribute('data-sphinx-table-menu-stuck') : null,
      covered: !(hit && menu && (hit === menu || menu.contains(hit))),
      scrollY: window.scrollY, viewport: window.innerHeight,
      focusInCell: Boolean(document.activeElement && document.activeElement.closest('td, th')),
      docWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
    };
  }"""
  top = page.evaluate(measure)
  if top["bar"] is None:
    failures.append(Failure(page_name, "clicking a table cell opened no table toolbar"))
    return
  table_page_top = top["table"]["top"] + top["scrollY"]
  table_height = top["table"]["height"]
  if table_height < top["viewport"] * 1.5:
    failures.append(Failure(page_name, f"the table is not taller than the viewport: {table_height} vs {top['viewport']}"))
    return
  if top["bar"]["bottom"] > top["table"]["top"] + 0.5:
    failures.append(Failure(page_name, f"the table toolbar covers the table top: {top}"))
  if top["stuck"] is not None:
    failures.append(Failure(page_name, f"the table toolbar is shifted while the table top is in view: {top}"))
  save_step(page, scenario, "top", caret="hide")

  def usable_top(state: dict) -> float:
    usable = 0.0
    if state["band"]:
      usable = max(usable, state["band"]["bottom"])
    toolbar = state["toolbar"]
    if toolbar and state["bar"]["left"] < toolbar["right"] and state["bar"]["right"] > toolbar["left"]:
      usable = max(usable, toolbar["bottom"])
    return usable

  for offset, label in ((700, "table scrolled 700px"), (1500, "table scrolled 1500px")):
    page.evaluate("(y) => window.scrollTo(0, y)", table_page_top + offset)
    page.wait_for_timeout(200)
    state = page.evaluate(measure)
    usable = usable_top(state)
    if state["stuck"] != "true":
      failures.append(Failure(page_name, f"{label}: the table toolbar did not follow the table: {state}"))
    if state["bar"]["top"] < usable - 0.5 or state["bar"]["top"] > usable + 16:
      failures.append(Failure(page_name, f"{label}: the table toolbar is not at the top of the viewport ({usable}): {state}"))
    if state["bar"]["bottom"] > state["table"]["bottom"] + 0.5 or state["bar"]["bottom"] > state["viewport"]:
      failures.append(Failure(page_name, f"{label}: the table toolbar left the table or the viewport: {state}"))
    if state["covered"]:
      failures.append(Failure(page_name, f"{label}: the table toolbar is covered by something: {state}"))
    if abs(state["table"]["top"] + state["scrollY"] - table_page_top) > 1.5:
      failures.append(Failure(page_name, f"{label}: the table moved while the toolbar followed: {state}"))
    if state["bar"]["right"] > state["clientWidth"] + 0.5 or state["docWidth"] > state["clientWidth"] + 1:
      failures.append(Failure(page_name, f"{label}: the table toolbar leaves the pane sideways: {state}"))
    if not state["focusInCell"]:
      failures.append(Failure(page_name, f"{label}: the focus left the cell editor: {state}"))

  # The table end in view: the toolbar left with the table, never below it.
  page.evaluate("(y) => window.scrollTo(0, y)", table_page_top + table_height - top["viewport"] + 120)
  page.wait_for_timeout(200)
  end = page.evaluate(measure)
  if end["bar"]["bottom"] > end["table"]["bottom"] + 0.5:
    failures.append(Failure(page_name, f"the table toolbar is below the end of the table: {end}"))
  save_step(page, scenario, "end", caret="hide")
  page.evaluate("(y) => window.scrollTo(0, y)", table_page_top + 700)
  page.wait_for_timeout(200)
  page.mouse.move(2, 2)


