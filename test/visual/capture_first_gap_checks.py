"""Visual check of the first-element gap (P3), split from capture_comment_checks.py."""
from __future__ import annotations

import json

from playwright.sync_api import Page

from capture_support import Failure, VISUAL_REPORT_DIR, report_path


FIRST_ELEMENT_GAP = 40
FIRST_ELEMENT_TOLERANCE = 4
# The fixture `20-empty-document.md` is one newline, not a 0-byte file: a file of only blank lines shows
# every line (spec rules 2 and 3), so edit mode draws one blank-line block, then the Start writing button.
# Measured in the real page (900px pane): the block sits at the top (~3.6px, no gap of its own) and the
# button, which carries the 40px gap, starts FIRST_ELEMENT_GAP below the block.
BLANK_BLOCK_SELECTOR = ".sphinx-preview-blank-lines"
START_BUTTON_SELECTOR = ".sphinx-preview-insert-point--start button"
BLANK_BLOCK_TOP = 4
START_BUTTON_GAP_BELOW_BLOCK = FIRST_ELEMENT_GAP
FIRST_GAP_REPORT_DIR = VISUAL_REPORT_DIR / "first-gap"


# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-007#S2
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-007#S4
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-011#S2
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-011#S4
def check_first_element_gap(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P3: one uniform 40px gap above the first element, in every case, state and width mode.

  The rule: the first element (or the Start writing button, the open first-block editor, the
  controls of a leading properties table) starts 40 +-4px below the top. The only exception is an
  interactive element in a pane of 480px or less (the toolbar covers most of the width): it is then
  pushed just far enough that it clears the toolbar, and the report says so. Mode "empty" is a
  document of one blank line (`20-empty-document.md` is one newline): its blank-line block is the
  first element (at the top of the pane) and the Start writing button starts 40 +-4px below the block.
  Every measurement is written to out/reports/visual/first-gap/<group>/<scenario>.json.
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
      viewportTop: rect.top, scrollY: window.scrollY, top: rect.top + window.scrollY, height: rect.height, width: rect.width, left: rect.left, right: rect.right,
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

  def record(label: str, selector: str, controls: str | None = None, interactive: bool = False, below: float | None = None, at: float | None = None) -> float | None:
    """Records one element's top gap. `at` replaces the 40px expectation by that top; `below` (the bottom of
    the element above it) by that bottom plus START_BUTTON_GAP_BELOW_BLOCK. Returns the element's bottom."""
    got = page.evaluate(probe, selector)
    if not got:
      failures.append(Failure(page_name, f"[{label}] {selector} is not in the page"))
      return None
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
    if below is not None or at is not None:
      expected = at if at is not None else (below or 0) + START_BUTTON_GAP_BELOW_BLOCK
      if abs(gap - expected) > FIRST_ELEMENT_TOLERANCE:
        failures.append(Failure(page_name, f"[{label}] the top is {gap:.1f}px, expected {expected:.1f}px +-{FIRST_ELEMENT_TOLERANCE} (an empty document is one blank line: its block, then the button {START_BUTTON_GAP_BELOW_BLOCK}px below)"))
    # Only a narrow pane (the toolbar covers most of the width) may push an interactive element down.
    ok_pushed = pushed and page.viewport_size["width"] <= 480 and gap > FIRST_ELEMENT_GAP
    if below is not None or at is not None:
      ok_uniform = True  # judged against the element above instead of the 40px gap
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
    return gap + got["height"]

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
    # The document is one blank line: the block comes first, the button right below it.
    block_bottom = record("edit:blank-line block", BLANK_BLOCK_SELECTOR, at=BLANK_BLOCK_TOP)
    record("edit:Start writing", START_BUTTON_SELECTOR, interactive=True, below=block_bottom)
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
