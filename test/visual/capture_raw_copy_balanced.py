"""With preview.rawCopy.balanceEdges on (CR-481), a native selection copies balanced Markdown, proved in Chromium on real DOM Ranges."""

from __future__ import annotations

from collections.abc import Callable

from playwright.sync_api import Page

from capture_raw_copy_support import RECORD, _copy, _source, _text
from capture_support import Failure, save_step

Expect = Callable[[str, dict, dict, str], None]


def _lines(*values: str) -> str:
  return "\n".join(values)


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-278
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-279
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-280
def check_raw_copy_balanced(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Every case sets a real Range and compares the balanced text/plain with the exact expected Markdown."""
  name = scenario["page"]
  source = _source(scenario)

  def expect(label: str, start: dict, end: dict, wanted: str) -> None:
    result = _copy(page, source, start, end)
    if not result["taken"]:
      failures.append(Failure(name, f"{label}: the copy was left to the browser"))
    elif result["plain"] != wanted:
      failures.append(Failure(name, f"{label}: the balanced copy is {result['plain']!r}, not {wanted!r}"))

  def at(text: str, offset: int = 0) -> int:
    return source.index(text) + offset

  # Inline constructs: crossed at the start, inside only, bold crossed inside a link, bold and link crossed.
  expect("start inside bold", _text("world", 2), _text(" again", "end"), "**rld** again")
  expect("start inside bold, with the period", _text("world", 1), _text(" again.", "end"), "**orld** again.")
  expect("inside one paragraph", _text("world", 1), _text("world", 4), "orl")
  expect("end inside an admonition", _text("Closing line.", 3), _text("world", 3),
         "sing line.\n\n:::{note} Edge\nEdge **wor**\n:::")
  expect("bold crossed, link inside only", _text("sturdy", 4), _text(" text", "end"), "**dy** text")
  expect("bold and link crossed", _text("sturdy", 4), _text(" ending.", "end"), "[**dy** text](https://example.com/link) ending.")
  # Containers: two admonitions, a tab set with a list in a tab item, and the nesting grid.
  expect("across two admonitions", _text("Left body words.", 5), _text("Right body words.", 5),
         ":::{note} Left\nbody words.\n:::\n\n:::{tip} Right\nRight\n:::")
  expect("a list inside a tab item", _text("tab list bravo", 9), _text("Tabs after.", 3),
         "::::{tab-set}\n:::{tab-item} Tab two\n- bravo\n:::\n::::\n\nTab")
  check_nesting_grid(expect, source)
  # A clean selection (two whole paragraphs) is the verbatim slice, and so is the whole document.
  expect("a clean selection", _text("Clean one.", 0), _text("Clean two.", "end"), source[at("Clean one."):at("Clean two.", 10)])
  check_balanced_blocks(page, scenario, failures)
  check_balanced_lists(expect)
  # An end inside bold inside a link closes both, so the pasted line is well formed (and the screenshot shows the selection).
  expect("an end inside bold inside a link", _text("Intro with"), _text("strong", 3),
         "Intro with **bold** and a [link with **str**](https://example.com/page)")
  save_step(page, scenario, "selected", caret="hide")

  _copy(page, source, _text("Intro with"), _text("Intro with", 4))  # sends the source text of the shown render
  page.evaluate(RECORD)
  page.locator("#sphinx-myst-preview-content").click(position={"x": 2, "y": 2})
  page.keyboard.press("Control+A")
  page.keyboard.press("Control+C")
  recorded = page.evaluate("window.__rawCopy")
  if recorded is None or not recorded["taken"] or recorded["plain"] != source:
    failures.append(Failure(name, f"Select all then copy with the setting on did not give the whole source exactly: {recorded!r}"))


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-280
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
def check_nesting_grid(expect: Expect, source: str) -> None:
  """An admonition, a list item and an admonition: a start at each level 0 to 3 by an end at each level 0 to 3."""
  starts = [("Before.", 1), ("Outer a.", 1), ("item a", 1), ("Inner text.", 1)]
  ends = [("After.", 3), ("Outer z.", 3), ("Item tail.", 3), ("Inner text.", 3)]
  s = [source.index(text) + offset for text, offset in starts]
  e = [source.index(text) + offset for text, offset in ends]
  on = [
    [source[s[0]:e[0]], source[s[0]:e[1]] + "\n::::", source[s[0]:e[2]] + "\n::::", source[s[0]:e[3]] + "\n  :::\n::::"],
    ["::::{note}\n" + source[s[1]:e[0]], source[s[1]:e[1]], source[s[1]:e[2]], source[s[1]:e[3]] + "\n  :::"],
    [
      _lines("::::{note}", "- tem a", "", "  :::{warning}", "  Inner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Outer z.", "::::", "", "Aft"),
      _lines("- tem a", "", "  :::{warning}", "  Inner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Out"),
      _lines("tem a", "", ":::{warning}", "Inner text.", ":::", "", "Ite"),
      _lines("tem a", "", ":::{warning}", "Inn", ":::"),
    ],
    [
      _lines("::::{note}", "- :::{warning}", "  nner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Outer z.", "::::", "", "Aft"),
      _lines("- :::{warning}", "  nner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Out"),
      _lines(":::{warning}", "nner text.", ":::", "", "Ite"),
      "nn",
    ],
  ]
  for row, (start, offset) in enumerate(starts):
    for column, (end, end_offset) in enumerate(ends):
      expect(f"nesting grid, start level {row}, end level {column}", _text(start, offset), _text(end, end_offset), on[row][column])


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-281
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-282
# @tests_req SwRS-MDOKFSTUDIO-BLOCK-284
def check_balanced_blocks(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Code blocks, tables, headings and definition lists."""
  name = scenario["page"]
  source = _source(scenario)

  def expect(label: str, start: dict, end: dict, wanted: str) -> None:
    result = _copy(page, source, start, end)
    if not result["taken"]:
      failures.append(Failure(name, f"{label}: the copy was left to the browser"))
    elif result["plain"] != wanted:
      failures.append(Failure(name, f"{label}: the balanced copy is {result['plain']!r}, not {wanted!r}"))

  # A word of a code line in a list item: the word alone, and over two lines no indentation; to after the list, the fences.
  expect("a word of a code line in a list item", _text("run_now()", 1), _text("run_now()", 5), "un_n")
  expect("two code lines in a list item", _text("run_now()", 1), _text("then_go()", 4), "un_now()\nthen")
  expect("from the code to after the list item", _text("run_now()", 1), _text("Code after.", 3),
         "- ```\n  un_now()\n  then_go()\n  ```\n\nCod")
  # A table row in an admonition, from a bold word of the row to after the admonition.
  expect("a table in an admonition", _text("robust", 2), _text("Table after.", 3),
         ":::{note} Grid table\n| head a | head b |\n| ------ | ------ |\n| cell **robust** | cell c |\n| cell d | cell e |\n\n:::\n\nTab")
  # An ATX heading keeps its marker; a definition keeps its term line.
  expect("a heading text", _text("Hello", 2), _text("Hello", "end"), "## llo")
  expect("a definition crossed at the start", _text("definition words here", 11), _text("Definition after.", 3),
         "Term one\n: words here\n\nTerm two\n: other def\n\nDef")


# @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
def check_balanced_lists(expect: Expect) -> None:
  """A nested list crossed at the start keeps the start item's marker at its own level (m = 0)."""
  expect("a nested list, m = 0", _text("mighty", 2), _text("next", "end"), "  - **ghty**\n  - sibling\n- next")
