"""The blank-line block inside a quote, an alert, an admonition, a context-tag panel, a definition and a footnote (CR-462)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

CONTENT = "#sphinx-myst-preview-content"

# The container of each expected block, in page order: a selector the block's parent must match.
EXPECTED = [
  ("quote", "blockquote:not([data-okf-github-alert])"),
  ("alert", "[data-okf-github-alert]"),
  ("admonition", ".admonition:not(.myst-context-admonition)"),
  ("panel", ".myst-context-admonition"),
  ("definition", "dd"),
  ("footnote", "li[data-okf-footnote-line]"),
]

READ_CONTAINERS = """(expected) => {
  const content = document.querySelector('#sphinx-myst-preview-content');
  const box = (element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  };
  const blocks = [...content.querySelectorAll('.sphinx-preview-blank-lines')];
  const inner = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const right = rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    return { left, right, width: right - left };
  };
  return {
    shown: blocks.filter((block) => getComputedStyle(block).display !== 'none').length,
    count: blocks.length,
    blocks: blocks.map((block) => {
      const parent = block.parentElement;
      const button = block.querySelector('button.sphinx-preview-delete');
      return {
        kind: (expected.find(([, selector]) => parent.matches(selector)) || [null])[0],
        box: box(block),
        inner: inner(parent),
        parentBox: box(parent),
        button: button ? { box: box(button), opacity: Number(getComputedStyle(button).opacity) } : null,
      };
    }),
  };
}"""

EDITOR_HOME = """() => {
  const frame = document.querySelector('[data-sphinx-preview-block-editor]');
  return {
    open: Boolean(frame && frame.querySelector('textarea')),
    inQuote: Boolean(frame && frame.closest('blockquote:not([data-okf-github-alert])')),
    quotes: document.querySelectorAll('#sphinx-myst-preview-content > blockquote').length,
  };
}"""


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S1
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S3
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
def check_blank_lines_in_containers(page: Page, scenario: dict, failures: list[Failure], mode: str) -> None:
  """The fixture `95-blank-lines-in-containers`: one run of three empty lines in each of a quote, an alert, an admonition, a
  context-tag panel, a definition and a footnote. `containers-edit`: two blocks in each container (the first line is the separator), as wide as
  the container's content box and clear of its border, the Delete block button at the block's left edge
  (`bar` step). `containers-reading`: none (`top` step). `containers-typing`: the editor opens inside the
  quote and is still inside the re-rendered quote once text is typed and the autosave ran (`text` step)."""
  name = scenario["page"]
  state = page.evaluate(READ_CONTAINERS, EXPECTED)
  if mode == "containers-reading":
    if state["count"] != 0:
      failures.append(Failure(name, f"blank lines in containers: reading mode shows {state['count']} blank-line block(s)"))
    save_step(page, scenario, "top", caret="hide")
    return
  kinds = [block["kind"] for block in state["blocks"]]
  wanted = [kind for kind, _ in EXPECTED for _ in range(2)]
  if kinds != wanted or state["shown"] != len(wanted):
    failures.append(Failure(name, f"blank lines in containers: blocks in {kinds} ({state['shown']} shown), expected two in each of {[kind for kind, _ in EXPECTED]}"))
    return
  for block in state["blocks"]:
    width, inner = block["box"]["width"], block["inner"]
    if abs(width - inner["width"]) > 4:
      failures.append(Failure(name, f"blank lines in containers: the {block['kind']} block is {width:.0f} px wide, its content box {inner['width']:.0f} px"))
    if block["box"]["left"] < inner["left"] - 1 or block["box"]["right"] > inner["right"] + 1:
      failures.append(Failure(name, f"blank lines in containers: the {block['kind']} block reaches outside its content box"))
    if block["box"]["height"] < 16:
      failures.append(Failure(name, f"blank lines in containers: the {block['kind']} block is {block['box']['height']:.0f} px high"))
    button = block["button"]
    if button is None:
      failures.append(Failure(name, f"blank lines in containers: the {block['kind']} block has no Delete block button"))
    elif button["box"]["left"] - block["box"]["left"] > 12 or button["box"]["left"] < block["inner"]["left"] - 1:
      failures.append(Failure(name, f"blank lines in containers: the {block['kind']} Delete block button is not at the block's left edge"))
  if mode == "containers-edit":
    save_step(page, scenario, "bar", caret="hide")
    return
  # containers-typing
  page.locator(f"{CONTENT} blockquote:not([data-okf-github-alert]) .sphinx-preview-blank-lines").first.click()
  page.locator("[data-sphinx-preview-block-editor] textarea").wait_for(state="visible")
  home = page.evaluate(EDITOR_HOME)
  if not home["inQuote"]:
    failures.append(Failure(name, f"blank lines in containers: the editor opened outside the quote: {home}"))
  page.keyboard.type("More")
  page.wait_for_timeout(1500)
  home = page.evaluate(EDITOR_HOME)
  if not home["open"] or not home["inQuote"] or home["quotes"] != 1:
    failures.append(Failure(name, f"blank lines in containers: after the autosave the editor is {home}, expected open inside the one quote"))
  save_step(page, scenario, "text", caret="hide")
