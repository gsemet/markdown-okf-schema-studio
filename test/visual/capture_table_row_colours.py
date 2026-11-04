"""Colours of a table's heading, even rows and hovered row."""

from __future__ import annotations

import re

from playwright.sync_api import Page

from capture_support import Failure, save_step

HEADING_ACCENT = 0.24
EVEN_ROW_FOREGROUND = 0.03
HOVERED_ROW_ACCENT = 0.12
MIN_TEXT_CONTRAST = 4.5
COLOUR_TOLERANCE = 0.01
TRANSPARENT = (0.0, 0.0, 0.0, 0.0)


def parse_colour(value: str) -> tuple[float, float, float, float]:
  """A computed colour as red, green, blue and alpha between 0 and 1."""
  numbers = [float(number) for number in re.findall(r"\d*\.?\d+(?:e-?\d+)?", value.replace("srgb", ""))]
  if value.startswith("color("):
    return (numbers[0], numbers[1], numbers[2], numbers[3] if len(numbers) > 3 else 1.0)
  return (numbers[0] / 255, numbers[1] / 255, numbers[2] / 255, numbers[3] if len(numbers) > 3 else 1.0)


def same_colour(actual: tuple[float, ...], expected: tuple[float, ...]) -> bool:
  return all(abs(left - right) <= COLOUR_TOLERANCE for left, right in zip(actual, expected))


def over(tint: tuple[float, float, float, float], page_colour: tuple[float, ...]) -> tuple[float, ...]:
  return tuple(tint[index] * tint[3] + page_colour[index] * (1 - tint[3]) for index in range(3))


def luminance(colour: tuple[float, ...]) -> float:
  red, green, blue = (
    channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in colour[:3]
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def contrast(first: tuple[float, ...], second: tuple[float, ...]) -> float:
  lighter, darker = sorted((luminance(first), luminance(second)), reverse=True)
  return (lighter + 0.05) / (darker + 0.05)


def token_colour(page: Page, token: str) -> tuple[float, float, float, float]:
  return parse_colour(page.evaluate("""(token) => {
    const probe = document.createElement('i');
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }""", token))


def background(locator) -> tuple[float, float, float, float]:
  return parse_colour(locator.evaluate("element => getComputedStyle(element).backgroundColor"))


def check_page_colours(page: Page, table, name: str, failures: list[Failure]) -> None:
  accent = token_colour(page, "--studio-focusBorder")
  foreground = token_colour(page, "--studio-editor-foreground")
  page.mouse.move(0, 0)
  heading = table.locator("thead th").first
  rows = table.locator("tbody tr")
  expected = {
    "heading": (heading, (*accent[:3], HEADING_ACCENT)),
    "odd row": (rows.nth(0), TRANSPARENT),
    "even row": (rows.nth(1), (*foreground[:3], EVEN_ROW_FOREGROUND)),
  }
  for label, (locator, colour) in expected.items():
    actual = background(locator)
    if not same_colour(actual, colour):
      failures.append(Failure(name, f"{label} background is {actual}, expected {colour}"))
  for label, row in (("odd", rows.nth(0)), ("even", rows.nth(1))):
    row.locator("td").first.hover()
    actual = background(row)
    if not same_colour(actual, (*accent[:3], HOVERED_ROW_ACCENT)):
      failures.append(Failure(name, f"hovered {label} row background is {actual}"))
  heading_text = parse_colour(heading.evaluate("element => getComputedStyle(element).color"))
  page_colour = token_colour(page, "--studio-editor-background")
  ratio = contrast(heading_text, over(background(heading), page_colour))
  if ratio < MIN_TEXT_CONTRAST:
    failures.append(Failure(name, f"heading text contrast is {ratio:.2f}, below {MIN_TEXT_CONTRAST}"))


def check_properties_table(page: Page, name: str, failures: list[Failure]) -> None:
  properties = page.locator("main table.okf-properties")
  if properties.count() != 1:
    failures.append(Failure(name, "no frontmatter properties table: its check would pass vacuously"))
    return
  rows = properties.locator("tbody tr")
  rows.first.hover()
  key_cell = rows.first.locator("th, td").first
  for label, locator in (("hovered row", rows.first), ("key cell", key_cell), ("even row", rows.nth(1))):
    actual = background(locator)
    if not same_colour(actual, TRANSPARENT):
      failures.append(Failure(name, f"properties {label} background is {actual}"))


def check_handles_above_row(page: Page, table, name: str, failures: list[Failure]) -> None:
  row = table.locator("tbody tr").nth(1)
  row.locator("td").first.click()
  page.wait_for_timeout(300)
  page.keyboard.press("Escape")
  row.locator("td").last.hover()
  accent = token_colour(page, "--studio-focusBorder")
  if not same_colour(background(row), (*accent[:3], HOVERED_ROW_ACCENT)):
    failures.append(Failure(name, f"hovered row background in edit mode is {background(row)}"))
  covered = page.evaluate("""() => {
    const handles = [...document.querySelectorAll('[data-okf-row-handle]')]
      .filter((handle) => handle.offsetWidth > 0 && handle.offsetHeight > 0);
    return { count: handles.length, covered: handles.filter((handle) => {
      const rect = handle.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !hit || !handle.contains(hit);
    }).length };
  }""")
  if covered["count"] == 0:
    failures.append(Failure(name, "no row handle has a size: the check would pass vacuously"))
  elif covered["covered"]:
    failures.append(Failure(name, f"{covered['covered']} row handles are covered in a hovered table"))


# @tests_req SwRS-MDOKFSTUDIO-CORE-077
def check_table_row_colours(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The heading, the even rows and the hovered row have their tints, tested with a real pointer."""
  kind = scenario.get("tableRowColourChecks")
  if not kind:
    return
  name = scenario["page"]
  if kind == "overflow":
    table = page.locator("main table[data-sphinx-table-overflow='true']").first
    if table.count() == 0:
      failures.append(Failure(name, "no table scrolls sideways: the overflow check would pass vacuously"))
      return
    if "gradient" not in table.evaluate("element => getComputedStyle(element).backgroundImage"):
      failures.append(Failure(name, "the table that scrolls sideways has lost its overflow shading"))
  else:
    table = page.locator("main table:not(.okf-properties)").first
  if kind == "edit":
    check_handles_above_row(page, table, name, failures)
    return
  if kind == "page":
    check_properties_table(page, name, failures)
  check_page_colours(page, table, name, failures)
  save_step(page, scenario, "hover")
