"""The bar of a hovered block: round +, move arrows, Delete block button, and the move status (CR-439)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

# The paragraphs of the fixture `91-delete-block-bar`: the bar of the middle one is the subject.
MIDDLE = "#sphinx-myst-preview-content p:nth-of-type(2)"

# The buttons of the bar that follows the middle paragraph, in DOM order, with their boxes.
BAR = """() => {
  const block = document.querySelector('#sphinx-myst-preview-content p:nth-of-type(2)');
  const point = block?.nextElementSibling;
  if (!point || !point.classList.contains('sphinx-preview-insert-point')) return { missing: true };
  const box = (element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  };
  const status = point.querySelector('.sphinx-preview-move-status');
  return {
    buttons: [...point.querySelectorAll('button')].map((button) => ({
      label: button.getAttribute('aria-label'),
      text: button.textContent.trim(),
      opacity: Number(getComputedStyle(button).opacity),
      disabled: button.disabled,
      box: box(button),
    })),
    status: status ? { text: status.textContent.trim(), box: box(status) } : null,
  };
}"""

REASON = "A block that comes from an included file cannot be moved."


def _read_bar(page: Page, scenario: dict, failures: list[Failure]) -> dict | None:
  bar = page.evaluate(BAR)
  if bar.get("missing"):
    failures.append(Failure(scenario["page"], "delete block bar: no bar after the middle paragraph"))
    return None
  if len(bar["buttons"]) != 4:
    labels = [button["label"] for button in bar["buttons"]]
    failures.append(Failure(scenario["page"], f"delete block bar: the buttons are {labels}, expected + up down delete"))
    return None
  return bar


def _check_buttons(scenario: dict, failures: list[Failure], bar: dict) -> None:
  page_name = scenario["page"]
  buttons = bar["buttons"]
  if buttons[3]["label"] != "Delete block" or buttons[3]["text"] != "×":
    failures.append(Failure(page_name, f"delete block bar: the last button is {buttons[3]['label']!r} {buttons[3]['text']!r}"))
  for button in buttons:
    if button["opacity"] < 0.99:
      failures.append(Failure(page_name, f"delete block bar: the {button['label']} button is not shown (opacity {button['opacity']})"))
  gap = buttons[3]["box"]["left"] - buttons[2]["box"]["right"]
  if abs(gap) > 1.5:
    failures.append(Failure(page_name, f"delete block bar: the Delete block button is {gap:.1f} px from the down arrow"))


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-265
def check_delete_block_bar(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """`bar`: hovering the middle paragraph shows + up down and the Delete block button, which touches
  the down arrow (`hover` step). `status`: a refused move shows its reason right of the Delete block
  button, which stays visible (`bar` step)."""
  mode = scenario.get("deleteBlockBarChecks")
  if not mode:
    return
  page_name = scenario["page"]
  page.locator(MIDDLE).hover(position={"x": 60, "y": 10})
  page.wait_for_timeout(250)
  bar = _read_bar(page, scenario, failures)
  if bar is None:
    return
  _check_buttons(scenario, failures, bar)
  if mode == "bar":
    save_step(page, scenario, "hover", caret="hide")
    return
  # A move the host refuses: the click marks the bar, the answer says why beside it.
  page.evaluate("window.visualMessages.length = 0")
  page.locator(f"{MIDDLE} + .sphinx-preview-insert-point .sphinx-preview-move--down").click()
  moves = page.evaluate("window.visualMessages.filter(m => m.type === 'previewBlockMove')")
  if len(moves) != 1:
    failures.append(Failure(page_name, f"delete block bar: the down arrow sent {len(moves)} move requests"))
    return
  page.evaluate("""(reason) => {
    const html = document.documentElement;
    window.dispatchEvent(new MessageEvent('message', { data: {
      type: 'previewBlockMoveResult',
      documentId: html.getAttribute('data-sphinx-preview-document-id'),
      revision: Number(html.getAttribute('data-sphinx-preview-document-version')),
      requestId: Number(html.getAttribute('data-sphinx-preview-request-id')),
      ok: false, reason,
    } }));
  }""", REASON)
  page.locator(MIDDLE).hover(position={"x": 60, "y": 10})
  page.wait_for_timeout(250)
  bar = _read_bar(page, scenario, failures)
  if bar is None:
    return
  _check_buttons(scenario, failures, bar)
  status = bar["status"]
  if status is None or status["text"] != REASON:
    failures.append(Failure(page_name, f"delete block bar: the move status is {status}"))
    return
  if status["box"]["left"] < bar["buttons"][3]["box"]["right"] - 0.5:
    failures.append(Failure(page_name, "delete block bar: the move status overlaps the Delete block button"))
  save_step(page, scenario, "bar", caret="hide")
