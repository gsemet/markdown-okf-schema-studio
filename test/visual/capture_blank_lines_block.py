"""The blank-lines block of edit mode: its look, its selection and its Delete block button, and its absence in reading mode (CR-444)."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure, save_step

CONTENT = "#sphinx-myst-preview-content"

READ = """() => {
  const content = document.querySelector('#sphinx-myst-preview-content');
  const blocks = [...content.querySelectorAll('.sphinx-preview-blank-lines')];
  const box = (element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  };
  const paragraphs = [...content.querySelectorAll('p')];
  return {
    shown: blocks.filter((block) => getComputedStyle(block).display !== 'none').length,
    paragraphs: paragraphs.map(box),
    content: box(content),
    block: blocks[0] ? {
      box: box(blocks[0]),
      label: getComputedStyle(blocks[0], '::before').content,
      text: [...blocks[0].childNodes].filter((node) => node.nodeType === 3 || node.tagName !== 'BUTTON').map((node) => node.textContent).join('').trim(),
      selected: blocks[0].getAttribute('data-sphinx-preview-block-selected'),
      button: (() => {
        const button = blocks[0].querySelector('button.sphinx-preview-delete');
        return button ? { box: box(button), opacity: Number(getComputedStyle(button).opacity), label: button.getAttribute('aria-label') } : null;
      })(),
    } : null,
  };
}"""


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
def check_blank_lines_block(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """`edit`: one blank-lines block between the paragraphs, its label drawn by CSS, its button hidden
  (`bar` step). `selected`: Down from the first paragraph selects it and shows the Delete block
  button at its left edge (`selected` step). `reading`: no blank-lines block is shown (`top` step)."""
  mode = scenario.get("blankLinesChecks")
  if not mode:
    return
  name = scenario["page"]
  if mode == "reading":
    state = page.evaluate(READ)
    if state["shown"] != 0 or state["block"] is not None:
      failures.append(Failure(name, f"blank lines block: reading mode shows {state['shown']} blank-lines block(s)"))
    save_step(page, scenario, "top", caret="hide")
    return
  if mode == "selected":
    # Shift+click on the first paragraph starts a block selection; Down then steps onto the blank-lines block.
    page.locator(f"{CONTENT} p").first.click(modifiers=["Shift"])
    page.keyboard.press("ArrowDown")
    page.wait_for_timeout(250)
  state = page.evaluate(READ)
  block = state["block"]
  if block is None or state["shown"] != 1:
    failures.append(Failure(name, f"blank lines block: {state['shown']} shown, expected 1"))
    return
  box = block["box"]
  first, second = state["paragraphs"][0], state["paragraphs"][1]
  if not (first["bottom"] <= box["top"] + 0.5 and box["bottom"] <= second["top"] + 0.5):
    failures.append(Failure(name, "blank lines block: it is not between the two paragraphs"))
  if box["height"] < 16:
    failures.append(Failure(name, f"blank lines block: it is {box['height']:.0f} px high"))
  if abs(box["width"] - first["width"]) > 4 and abs(box["width"] - state["content"]["width"]) > 4:
    failures.append(Failure(name, f"blank lines block: it is {box['width']:.0f} px wide, not the content column"))
  if "Blank lines (3)" not in block["label"]:
    failures.append(Failure(name, f"blank lines block: the drawn label is {block['label']}"))
  if block["text"] != "":
    failures.append(Failure(name, f"blank lines block: its text outside the button is {block['text']!r}, the label must be CSS only"))
  button = block["button"]
  if button is None or button["label"] != "Delete block":
    failures.append(Failure(name, "blank lines block: no Delete block button"))
    return
  if mode == "edit":
    if button["opacity"] > 0.01:
      failures.append(Failure(name, "blank lines block: the Delete block button shows before any selection"))
    save_step(page, scenario, "bar", caret="hide")
    return
  if block["selected"] != "true":
    failures.append(Failure(name, "blank lines block: Down did not select it"))
  if button["opacity"] < 0.99:
    failures.append(Failure(name, f"blank lines block: the Delete block button is not shown (opacity {button['opacity']})"))
  if button["box"]["left"] - box["left"] > 12:
    failures.append(Failure(name, "blank lines block: the Delete block button is not at its left edge"))
  save_step(page, scenario, "selected", caret="hide")
