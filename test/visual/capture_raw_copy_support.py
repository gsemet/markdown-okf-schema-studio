"""Shared helpers of the raw copy checks: the copy that sets a real DOM Range and dispatches a copy event."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import FIXTURE_DIR

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

# Records the copy event after the page has handled it, to read what a real Ctrl+C put on the clipboard.
RECORD = """() => {
  window.__rawCopy = null;
  window.addEventListener('copy', (event) => {
    window.__rawCopy = { taken: event.defaultPrevented, plain: event.clipboardData.getData('text/plain'),
      html: event.clipboardData.getData('text/html') };
  }, { once: true });
}"""

def _source(scenario: dict) -> str:
  return (FIXTURE_DIR / f"{scenario['fixture']}.md").read_bytes().decode("utf-8")


def _copy(page: Page, source: str | None, start: dict, end: dict) -> dict:
  return page.evaluate(COPY, {"source": source, "start": start, "end": end})


def _text(text: str, at: int | str = 0, nth: int = 0) -> dict:
  return {"text": text, "at": at, "nth": nth}
