"""A native selection copies as the raw Markdown under it (CR-480), proved in Chromium on real DOM Ranges."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import FIXTURE_DIR, Failure, save_step

# Sends the host's source text for the shown render (unless `source` is null), sets a real DOM Range from `start` to `end`, then copies. A point is a text (the
# nth text node holding it, at an offset or "end"), or an element's first ("start") or last ("end")
# text, or the place "before" / "after" an element. Returns what the page put on the clipboard.
COPY = """({ source, start, end }) => {
  const root = document.getElementById('sphinx-myst-preview-content');
  const html = document.documentElement;
  if (source !== null) {
    window.dispatchEvent(new MessageEvent('message', { data: {
      type: 'previewSourceText', text: source,
      documentId: html.getAttribute('data-sphinx-preview-document-id'),
      revision: Number(html.getAttribute('data-sphinx-preview-document-version')),
      requestId: Number(html.getAttribute('data-sphinx-preview-request-id')),
    } }));
  }
  const textsOf = (scope) => {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const found = [];
    while (walker.nextNode()) found.push(walker.currentNode);
    return found;
  };
  const resolve = (point) => {
    if (point.selector !== undefined) {
      const element = root.querySelectorAll(point.selector)[point.nth || 0];
      if (!element) throw new Error('no element ' + point.selector);
      if (point.at === 'before' || point.at === 'after') {
        const index = Array.prototype.indexOf.call(element.parentNode.childNodes, element);
        return { node: element.parentNode, offset: point.at === 'before' ? index : index + 1 };
      }
      if (point.at === 'in-start') return { node: element, offset: 0 };
      if (point.at === 'in-end') return { node: element, offset: element.childNodes.length };
      const texts = textsOf(element).filter((node) => node.data.trim() !== '');
      const node = point.at === 'start' ? texts[0] : texts[texts.length - 1];
      if (!node) throw new Error('no text in ' + point.selector + ': ' + element.outerHTML.slice(0, 300));
      return { node, offset: point.at === 'start' ? 0 : node.data.length };
    }
    const node = textsOf(root).filter((candidate) => candidate.data.includes(point.text))[point.nth || 0];
    if (!node) throw new Error('no text ' + point.text);
    const index = node.data.indexOf(point.text);
    return { node, offset: index + (point.at === 'end' ? point.text.length : point.at || 0) };
  };
  const range = document.createRange();
  const from = resolve(start);
  const to = resolve(end);
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  const clipboardData = new DataTransfer();
  const container = range.commonAncestorContainer;
  const event = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
  (container.nodeType === 1 ? container : container.parentElement).dispatchEvent(event);
  return { taken: event.defaultPrevented, plain: clipboardData.getData('text/plain'), html: clipboardData.getData('text/html') };
}"""

# Copies with the selection or the focus in a native surface made here: a text area of an open block
# editor, a field, a comment thread popover. Returns whether the page took the copy.
NATIVE = """({ kind, source }) => {
  const root = document.getElementById('sphinx-myst-preview-content');
  const html = document.documentElement;
  window.dispatchEvent(new MessageEvent('message', { data: {
    type: 'previewSourceText', text: source,
    documentId: html.getAttribute('data-sphinx-preview-document-id'),
    revision: Number(html.getAttribute('data-sphinx-preview-document-version')),
    requestId: Number(html.getAttribute('data-sphinx-preview-request-id')),
  } }));
  const holder = document.createElement('div');
  let target;
  if (kind === 'editor') {
    holder.setAttribute('data-sphinx-preview-block-editor', '');
    target = document.createElement('textarea');
    target.value = 'Edited **text** here';
    holder.append(target);
  } else if (kind === 'field') {
    target = document.createElement('input');
    target.value = 'A field value';
    holder.append(target);
  } else {
    holder.setAttribute('data-okf-comment-popover', '');
    target = document.createElement('span');
    target.textContent = 'Thread text of the popover';
    holder.append(target);
  }
  (kind === 'popover' ? document.body : root).append(holder);
  const clipboardData = new DataTransfer();
  const event = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
  if (kind === 'popover') {
    const range = document.createRange();
    range.selectNodeContents(target);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  } else {
    target.focus();
    target.select();
  }
  target.dispatchEvent(event);
  const taken = event.defaultPrevented;
  holder.remove();
  return taken;
}"""

# Records the copy event after the page has handled it, to read what a real Ctrl+C put on the clipboard.
RECORD = """() => {
  window.__rawCopy = null;
  window.addEventListener('copy', (event) => {
    window.__rawCopy = { taken: event.defaultPrevented, plain: event.clipboardData.getData('text/plain'),
      html: event.clipboardData.getData('text/html') };
  }, { once: true });
}"""

CHROME = ("data-okf-comment", "<button", "data-line-number")


def _source(scenario: dict) -> str:
  return (FIXTURE_DIR / f"{scenario['fixture']}.md").read_bytes().decode("utf-8")


def _copy(page: Page, source: str | None, start: dict, end: dict) -> dict:
  return page.evaluate(COPY, {"source": source, "start": start, "end": end})


def _text(text: str, at: int | str = 0, nth: int = 0) -> dict:
  return {"text": text, "at": at, "nth": nth}


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-272
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-273
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-274
def check_raw_copy(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Every case sets a real Range, dispatches a copy event and compares the text/plain with the
  source cut between the two characters under the edges; text/html holds the rendered elements
  and no chrome."""
  if not scenario.get("rawCopyChecks"):
    return
  name = scenario["page"]
  source = _source(scenario)

  # Before the host sent the source text of the shown render, the copy is the browser's own.
  unsent = _copy(page, None, _text("Intro with"), _text("second", "end"))
  if unsent["taken"]:
    failures.append(Failure(name, "a copy without the source text of the shown render was taken"))

  def at(text: str, offset: int = 0, nth: int = 0) -> int:
    position = -1
    for _ in range(nth + 1):
      position = source.index(text, position + 1)
    return position + offset

  def expect(label: str, start: dict, end: dict, first: int, last: int, markup: str | None = None) -> None:
    result = _copy(page, source, start, end)
    wanted = source[first:last]
    if not result["taken"]:
      failures.append(Failure(name, f"{label}: the copy was left to the browser"))
      return
    if result["plain"] != wanted:
      failures.append(Failure(name, f"{label}: the copied text is not the Markdown under the selection: {result['plain']!r} != {wanted!r}"))
    for mark in CHROME:
      if mark in result["html"]:
        failures.append(Failure(name, f"{label}: the copied HTML holds chrome ({mark})"))
    if markup is not None and markup not in result["html"]:
      failures.append(Failure(name, f"{label}: the copied HTML lacks {markup}: {result['html']!r}"))

  # From inside the bold word to inside the first table value: the thematic break and the table verbatim.
  expect("bold to table value", _text("bold", 1), _text("first", 3), at("old**"), at("first", 3), "<strong>")
  expect("thematic break and table", _text("Intro with"), _text("second", "end"), at("Intro with"), at("second |", 6), "<strong>")
  # The outer admonition whole (list, nested admonition, code fence), from after the table to the next block.
  expect("nested admonitions whole", _text("second", "end"), _text("Next body.", 0), at("second |", 6), at("Next body."))
  # From inside the outer admonition's list to inside the next admonition: the fences between are verbatim.
  expect("from one admonition into the next", _text("deeper", 2), _text("Next body.", 4), at("deeper", 2), at("Next body.", 4))
  # A table inside an admonition.
  expect("table in an admonition", _text("Next body."), _text("right", "end"), at("Next body."), at("right |", 5))
  # An edge inside the Mermaid diagram stands for the whole fence.
  expect("edge inside the diagram (end)", _text("Next body.", 7), {"selector": ".myst-mermaid-diagram", "at": "in-end"},
         at("Next body.", 7), at("```\n\nClosing") + 3)
  expect("edge inside the diagram (start)", {"selector": ".myst-mermaid-diagram", "at": "in-start"}, _text("Closing", 3),
         at("```mermaid"), at("Closing", 3))
  # A selection over the properties table copies the frontmatter block, delimiters included.
  expect("properties table", {"selector": "[data-okf-properties] th", "at": "start"}, {"selector": "[data-okf-properties] td", "at": "end", "nth": 1},
         0, at("---\n\n#") + 3)
  expect("properties table to the intro", {"selector": "[data-okf-properties] th", "at": "start"}, _text("Intro with", 5),
         0, at("Intro with", 5))
  save_step(page, scenario, "selected", caret="hide")

  # Select all, pressed as a real key chord: the whole source, final line break included.
  _copy(page, source, _text("Intro with"), _text("Intro with", 4))  # sends the source text of the shown render
  page.evaluate(RECORD)
  page.locator("#sphinx-myst-preview-content").click(position={"x": 2, "y": 2})
  page.keyboard.press("Control+A")
  page.keyboard.press("Control+C")
  recorded = page.evaluate("window.__rawCopy")
  if recorded is None or not recorded["taken"] or recorded["plain"] != source:
    failures.append(Failure(name, f"Select all then copy did not give the whole source exactly: {recorded!r}"))
  everything = page.evaluate(COPY, {
    "source": source,
    "start": {"selector": "[data-okf-properties] th", "at": "start"}, "end": {"selector": ".okf-comment", "at": "end"},
  })
  if not everything["taken"] or everything["plain"] != source:
    failures.append(Failure(name, f"a range from the first to the last text did not give the whole source: {everything['plain']!r}"))

  check_raw_copy_native(page, scenario, source, failures)
  check_raw_copy_side_by_side(page, scenario, source, failures)


def check_raw_copy_native(page: Page, scenario: dict, source: str, failures: list[Failure]) -> None:
  """The copy stays the browser's own in a text control, a field and a comment thread popover."""
  name = scenario["page"]
  for kind in ("editor", "field", "popover"):
    if page.evaluate(NATIVE, {"kind": kind, "source": source}):
      failures.append(Failure(name, f"the copy in a native surface ({kind}) was taken by the raw copy"))


def check_raw_copy_side_by_side(page: Page, scenario: dict, source: str, failures: list[Failure]) -> None:
  """With a changed block shown as a card: the copy holds the current source only, its HTML no
  old-side text; an edge in the old side leaves the copy native."""
  name = scenario["page"]
  button = page.locator("[data-sphinx-preview-sbs-toggle]")
  block = page.locator("#sphinx-myst-preview-content p[data-line]").first
  if button.count() != 1 or button.is_hidden() or block.count() != 1:
    failures.append(Failure(name, "the Side-by-side button is not there"))
    return
  start, end = block.evaluate("element => [element.getAttribute('data-line'), element.getAttribute('data-end-line') || element.getAttribute('data-line')].map(Number)")
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
          html: `<p data-line="${start}" data-end-line="${end}">Words of the last commit only</p>`,
          hunks: [{ baseStart: start, baseEnd: end, start, end }],
        }, '*');
      }""",
      [start, end],
    )
    page.wait_for_timeout(200)
    if page.locator("[data-okf-sbs-card]").count() != 1:
      failures.append(Failure(name, "the Side-by-side button made no card for the changed block"))
      return
    across = _copy(page, source, {"selector": "h1", "at": "end"}, _text("second", "end"))
    first = source.index("\n\nIntro with")
    wanted = source[first:source.index("second |") + 6]
    if not across["taken"] or across["plain"] != wanted:
      failures.append(Failure(name, f"a selection across a card did not copy the current source only: {across['plain']!r} != {wanted!r}"))
    if "Words of the last commit" in across["html"] or "data-okf-sbs-side=\"base\"" in across["html"]:
      failures.append(Failure(name, f"the copied HTML holds the old side of a card: {across['html']!r}"))
    if "<strong>" not in across["html"]:
      failures.append(Failure(name, "the copied HTML lost the rendered bold of the current side"))
    old = _copy(page, source, {"selector": "[data-okf-sbs-side=base]", "at": "start"}, _text("second", "end"))
    if old["taken"]:
      failures.append(Failure(name, "a selection with an edge in the old side was taken by the raw copy"))
  finally:
    button.click()
    page.wait_for_timeout(100)
