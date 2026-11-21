"""The blank-lines block of edit mode: its look, its selection and its Delete block button, and its absence in reading mode (CR-444), and the blocks of runs inside a list (CR-448)."""

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
  if mode.startswith("list-"):
    check_blank_lines_in_lists(page, scenario, failures, mode)
    return
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


READ_LIST = """() => {
  const content = document.querySelector('#sphinx-myst-preview-content');
  const box = (element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  };
  const blocks = [...content.querySelectorAll('.sphinx-preview-blank-lines')];
  const first = (item) => (item ? item.firstElementChild.textContent.trim() : null);
  return {
    count: blocks.length,
    inFence: blocks.filter((block) => block.closest('pre')).length,
    blocks: blocks.map((block) => {
      const item = block.closest('li');
      const text = [...item.children].find((child) => child.tagName === 'P');
      const button = block.querySelector('button.sphinx-preview-delete');
      return {
        item: first(item),
        directChild: block.parentElement === item,
        box: box(block),
        paragraph: text ? box(text) : null,
        selected: block.getAttribute('data-sphinx-preview-block-selected'),
        button: button ? { box: box(button), opacity: Number(getComputedStyle(button).opacity) } : null,
      };
    }),
    handles: [...document.querySelectorAll('.okf-list-item-handle')].map(box),
  };
}"""

EDITOR_HOME = """() => {
  const frame = document.querySelector('[data-sphinx-preview-block-editor]');
  const item = frame ? frame.closest('li') : null;
  const list = item ? item.parentElement : null;
  return {
    open: Boolean(frame && frame.querySelector('textarea')),
    item: item ? item.firstElementChild.textContent.trim() : null,
    topLevelList: Boolean(list && list.parentElement && list.parentElement.id === 'sphinx-myst-preview-content'),
    lists: document.querySelectorAll('#sphinx-myst-preview-content > ul').length,
  };
}"""


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
def check_blank_lines_in_lists(page: Page, scenario: dict, failures: list[Failure], mode: str) -> None:
  """The fixture `93-blank-lines-in-lists`: a run between the first two items and a run between the two
  paragraphs of the second item each show one block inside their item, as wide as the item's text (the first may stop short of the
  floating toolbar), and the blank lines of the fence in the third item show none. `list-selected`: Down from the title steps
  onto the list, then onto the first block, whose Delete block button is at its left edge and clear of
  the item handles. `list-reading`: none. `list-typing`: the editor opens in the first item and is still
  in an item of the list once text is typed and the autosave ran."""
  name = scenario["page"]
  state = page.evaluate(READ_LIST)
  if mode == "list-reading":
    if state["count"] != 0:
      failures.append(Failure(name, f"blank lines in lists: reading mode shows {state['count']} blank-lines block(s)"))
    save_step(page, scenario, "top", caret="hide")
    return
  if state["count"] != 2 or state["inFence"] != 0:
    failures.append(Failure(name, f"blank lines in lists: {state['count']} blocks ({state['inFence']} in the fence), expected 2 and none in the fence"))
    return
  expected = ["First item", "Second item"]
  for block, item in zip(state["blocks"], expected):
    if block["item"] != item or not block["directChild"]:
      failures.append(Failure(name, f"blank lines in lists: a block is in {block['item']!r}, expected a child of {item!r}"))
    # The first block may stop short of the floating toolbar, as the content does; it never exceeds the item's text.
    width, text_width = block["box"]["width"], block["paragraph"]["width"] if block["paragraph"] else None
    if text_width is not None and not (0.8 * text_width <= width <= text_width + 6):
      failures.append(Failure(name, f"blank lines in lists: a block is {block['box']['width']:.0f} px wide, its item's text {text_width:.0f} px"))
    if block["box"]["height"] < 16:
      failures.append(Failure(name, f"blank lines in lists: a block is {block['box']['height']:.0f} px high"))
  if mode == "list-edit":
    save_step(page, scenario, "bar", caret="hide")
    return
  if mode == "list-selected":
    page.locator(f"{CONTENT} h1").first.click(modifiers=["Shift"])
    page.keyboard.press("ArrowDown")
    page.keyboard.press("ArrowDown")
    page.wait_for_timeout(250)
    state = page.evaluate(READ_LIST)
    block = state["blocks"][0]
    button = block["button"]
    if block["selected"] != "true":
      failures.append(Failure(name, "blank lines in lists: Down twice from the title did not select the first block"))
    if button is None or button["opacity"] < 0.99:
      failures.append(Failure(name, "blank lines in lists: the selected block shows no Delete block button"))
      return
    if button["box"]["left"] - block["box"]["left"] > 12:
      failures.append(Failure(name, "blank lines in lists: the Delete block button is not at the block's left edge"))
    for handle in state["handles"]:
      if handle["left"] < button["box"]["right"] and button["box"]["left"] < handle["right"]           and handle["top"] < button["box"]["bottom"] and button["box"]["top"] < handle["bottom"]:
        failures.append(Failure(name, "blank lines in lists: the Delete block button overlaps a list item handle"))
        break
    save_step(page, scenario, "selected", caret="hide")
    return
  # list-typing
  page.locator(f"{CONTENT} .sphinx-preview-blank-lines").first.click()
  page.locator("[data-sphinx-preview-block-editor] textarea").wait_for(state="visible")
  home = page.evaluate(EDITOR_HOME)
  if home["item"] != "First item":
    failures.append(Failure(name, f"blank lines in lists: the editor opened in {home['item']!r}, expected the first item"))
  page.keyboard.type("More")
  page.wait_for_timeout(1500)
  home = page.evaluate(EDITOR_HOME)
  if not home["open"] or home["item"] is None or not home["topLevelList"] or home["lists"] != 1:
    failures.append(Failure(name, f"blank lines in lists: after the autosave the editor is {home}, expected open inside an item of the one list"))
  save_step(page, scenario, "text", caret="hide")
