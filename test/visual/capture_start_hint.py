"""Check of the hint line under the Start writing button of an empty document."""

from playwright.sync_api import Page

from capture_support import Failure


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-253
def check_start_hint(page: Page, page_name: str, failures: list[Failure]) -> None:
  """The hint line is visible under the Start writing button, in the typography of the editor hint."""
  hint = page.locator(".sphinx-preview-insert-point--start [data-sphinx-preview-start-hint]")
  if hint.count() != 1 or not hint.is_visible():
    failures.append(Failure(page_name, "the Start writing hint line is not visible exactly once"))
    return
  if hint.inner_text().strip() != "Enter to create a new block":
    failures.append(Failure(page_name, f"unexpected hint text: {hint.inner_text()!r}"))
  geometry = page.evaluate("""() => {
    const button = document.querySelector('.sphinx-preview-insert-point--start button');
    const hint = document.querySelector('[data-sphinx-preview-start-hint]');
    const b = button.getBoundingClientRect();
    const h = hint.getBoundingClientRect();
    const style = getComputedStyle(hint);
    const body = parseFloat(getComputedStyle(document.getElementById('sphinx-myst-preview-content')).fontSize);
    return {
      below: h.top >= b.bottom - 0.5,
      size: parseFloat(style.fontSize) / body,
      color: style.color,
      background: getComputedStyle(document.documentElement).backgroundColor,
      ring: getComputedStyle(button).outlineStyle,
    };
  }""")
  if not geometry["below"]:
    failures.append(Failure(page_name, "the hint line is not under the Start writing button"))
  if abs(geometry["size"] - 0.75) > 0.02:
    failures.append(Failure(page_name, f"the hint font size is {geometry['size']:.2f} of the body, expected 0.75"))
  if geometry["color"] == geometry["background"]:
    failures.append(Failure(page_name, "the hint text has the colour of the background"))
  if geometry["ring"] == "none":
    failures.append(Failure(page_name, "the Start writing button shows no selection ring"))
