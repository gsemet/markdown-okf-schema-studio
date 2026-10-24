"""Page-level checks of the screenshot campaign: scroll positions, sidecars, forced themes and
the frontmatter and OKF schema rendering."""

from __future__ import annotations

import json
import os
import re

from playwright.sync_api import Page

from capture_support import (
  DEFERRED_FRONTMATTER_LINK_CHECKS,
  FORCED_WHITE_CHECKS,
  FRONTMATTER_CHECKS,
  Failure,
  OKF_SCHEMA_CHECKS,
  SKILL_FRONTMATTER_CHECKS,
)


def apply_scroll(page: Page, scroll: dict) -> str:
    kind = scroll["kind"]
    if kind == "top":
        page.evaluate("() => window.scrollTo(0, 0)")
        return "pinned to the top of the document"
    if kind == "fraction":
        value = float(scroll["value"])
        page.evaluate(
            "(f) => window.scrollTo(0, (document.body.scrollHeight - window.innerHeight) * f)",
            value,
        )
        return f"scrolled to {round(value * 100)}% of the scrollable height"
    if kind == "bottom":
        # The preview keeps 80vh of trailing padding so scroll sync can align the last
        # line to the top; scrolling to the raw bottom would frame only that padding.
        page.evaluate(
            """(extra) => {
              const main = document.getElementById('sphinx-myst-preview-content');
              const last = main.lastElementChild;
              if (last) { last.scrollIntoView({ block: 'end' }); window.scrollBy(0, 40 + extra); }
            }""",
            int(scroll.get("extra", 0)),
        )
        return "last content element visible with 40px trailing padding below it"
    if kind == "selector":
        selector = scroll["value"]
        offset = float(scroll.get("offset", 24))
        page.evaluate(
            """async ({ selector, offset }) => {
              const target = document.querySelector(selector);
              if (!target) throw new Error(`Missing scroll landmark: ${selector}`);
              const reserved = () => Math.max(0, ...[...document.querySelectorAll(
                '[data-sphinx-preview-toolbar], [data-sphinx-preview-sticky-headings]'
              )].filter(element => getComputedStyle(element).display !== 'none')
                .map(element => element.getBoundingClientRect().bottom));
              target.scrollIntoView({ block: 'start' });
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              window.scrollBy(0, -(reserved() + offset));
            }""",
            {"selector": selector, "offset": offset},
        )
        return f"first `{selector}` positioned below toolbar/sticky overlays plus {offset:g}px"
    if kind == "stickyHeading":
        selector = scroll["value"]
        page.evaluate(
            """async (sel) => {
              const target = document.querySelector(sel);
              if (target) {
                target.scrollIntoView({ block: 'start' });
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
                const bottom = band && !band.hidden ? band.getBoundingClientRect().bottom : 0;
                window.scrollBy(0, target === document.querySelector('h1, h2, h3, h4, h5, h6')
                  ? 4 : target.getBoundingClientRect().top - bottom + 4);
              }
            }""",
            selector,
        )
        return f"positioned `{selector}` just inside the sticky band to show its heading ancestry"
    raise ValueError(f"unknown scroll mode: {kind}")


def stress_frontmatter_scroll(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("scrollFeedbackStress"):
        return
    page_name = scenario["page"]
    mappings = page.locator("[data-sphinx-source-file][data-sphinx-source-line]")
    if mappings.count() == 0:
        failures.append(Failure(page_name, "scroll stress fixture has no mapped body content"))
        return

    first_mapping = mappings.first
    document_id = first_mapping.get_attribute("data-sphinx-preview-document")
    last_mapping = mappings.last
    last_line = int(
        last_mapping.get_attribute("data-sphinx-source-end-line")
        or last_mapping.get_attribute("data-sphinx-source-line")
        or "1"
    )
    if not document_id:
        failures.append(Failure(page_name, "scroll stress fixture has no preview document identity"))
        return

    def source_scroll(line: int) -> None:
        page.evaluate(
            """({ documentId, line }) => window.dispatchEvent(new MessageEvent("message", {
              data: { type: "sourceScroll", documentId, revision: 1, requestId: 1, line },
            }))""",
            {"documentId": document_id, "line": line},
        )
        page.wait_for_timeout(80)

    def check_top(action: str) -> None:
        position = page.evaluate("window.scrollY")
        if position > 1:
            failures.append(
                Failure(page_name, f"{action} left the preview at y={position:.1f}, not at the top")
            )

    if scenario.get("editMode"):
        status_cell = page.locator('[data-okf-field="status"] td[data-okf-edit-cell="value"]')
        status_cell.click()
        editor = page.locator('select[aria-label="Frontmatter status"]')
        if editor.count() != 1 or not editor.is_visible():
            failures.append(Failure(page_name, "frontmatter status editor is unavailable during scroll stress"))
        else:
            editor.press("Escape")
        page.evaluate("window.scrollTo(0, 0)")

    maximum = page.evaluate(
        "Math.max(0, document.documentElement.scrollHeight - window.innerHeight)"
    )
    if maximum <= 0:
        failures.append(Failure(page_name, "scroll stress fixture has no vertical overflow"))
        return

    for cycle in range(3):
        source_scroll(1)
        check_top(f"source-to-preview top sync in cycle {cycle + 1}")

        for _ in range(40):
            page.evaluate("window.scrollBy(0, 600)")
            page.wait_for_timeout(20)
        page.wait_for_timeout(100)
        bottom = page.evaluate("""() => {
          const mappings = [...document.querySelectorAll(
            "[data-sphinx-source-file][data-sphinx-source-line]",
          )];
          const last = mappings.at(-1)?.getBoundingClientRect();
          return {
            scrollY: window.scrollY,
            maximum: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
            lastVisible: Boolean(last && last.bottom > 0 && last.top < window.innerHeight),
          };
        }""")
        if abs(bottom["scrollY"] - bottom["maximum"]) > 2:
            failures.append(Failure(page_name, f"downward scroll did not reach the bottom: {bottom}"))
        if not bottom["lastVisible"]:
            failures.append(Failure(page_name, "last source-mapped content is not reachable at the bottom"))

        source_scroll(last_line)
        last_visible = page.evaluate("""() => {
          const mappings = [...document.querySelectorAll(
            "[data-sphinx-source-file][data-sphinx-source-line]",
          )];
          const last = mappings.at(-1)?.getBoundingClientRect();
          return Boolean(last && last.bottom > 0 && last.top < window.innerHeight);
        }""")
        if not last_visible:
            failures.append(Failure(page_name, "source-to-preview sync did not reveal the last mapped block"))

        for _ in range(40):
            page.evaluate("window.scrollBy(0, -600)")
            page.wait_for_timeout(20)
        page.wait_for_timeout(100)
        check_top(f"preview-to-top scroll in cycle {cycle + 1}")

        source_scroll(1)
        check_top(f"source-to-preview top sync after scrolling in cycle {cycle + 1}")

    preview_lines = page.evaluate(
        "window.visualMessages.filter(message => message.type === 'previewScroll').map(message => message.line)"
    )
    if 1 not in preview_lines:
      failures.append(
        Failure(page_name, f"preview scrolling to the top did not report source line 1: {preview_lines}")
      )


def stress_sticky_heading_scroll(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("scrollOscillationStress"):
        return
    page_name = scenario["page"]
    result = page.evaluate(
      """async () => {
        const originalScrollTo = window.scrollTo.bind(window);
        const originalScrollBy = window.scrollBy.bind(window);
        const corrections = [];
        const started = performance.now();
        window.scrollTo = (...args) => {
          const first = args[0];
          const requested = first && typeof first === "object"
            ? Number(first.top)
            : Number(args.length > 1 ? args[1] : first);
          originalScrollTo(...args);
          corrections.push({
            at: performance.now() - started,
            requested,
            actual: window.scrollY,
          });
        };
        let seed = 0x41c64e6d;
        const next = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed;
        };
        try {
          for (let index = 0; index < 180; index += 1) {
            const maximum = Math.max(
              0,
              document.documentElement.scrollHeight - window.innerHeight,
            );
            const current = window.scrollY;
            let direction = (next() & 1) === 0 ? 1 : -1;
            if (current <= 40) direction = 1;
            if (current >= maximum - 40) direction = -1;
            originalScrollBy(0, direction * (40 + (next() % 180)));
            await new Promise((resolve) => setTimeout(resolve, 18));
          }
          const inputFinished = performance.now() - started;
          const positionBeforeQuiet = window.scrollY;
          await new Promise((resolve) => setTimeout(resolve, 650));
          const lateCorrections = corrections.filter(({ at }) => at >= inputFinished);
          return {
            lateCorrections: lateCorrections.length,
            positionBeforeQuiet,
            positionAfterQuiet: window.scrollY,
            tail: lateCorrections.slice(-12),
          };
        } finally {
          window.scrollTo = originalScrollTo;
          window.scrollBy = originalScrollBy;
        }
      }"""
    )
    if result["lateCorrections"] > 2:
        failures.append(
          Failure(
            page_name,
            "scroll feedback did not settle after input: "
            f"{result['lateCorrections']} corrective scrolls, tail={result['tail']}",
          )
        )
    if abs(result["positionAfterQuiet"] - result["positionBeforeQuiet"]) > 2:
        failures.append(
          Failure(
            page_name,
            "scroll position continued moving after input: "
            f"{result['positionBeforeQuiet']:.1f} -> {result['positionAfterQuiet']:.1f}",
          )
        )
    apply_scroll(page, scenario["scroll"])
    page.wait_for_timeout(120)


def check_edit_activation_scroll(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("editActivationScroll"):
        return
    selector = scenario.get("editActivationSelector", "main > p[data-sphinx-source-line]")
    target = page.locator(selector).evaluate_all(
        """elements => elements.reduce((nearest, element) => {
          const distance = Math.abs(element.getBoundingClientRect().top - innerHeight / 2);
          return !nearest || distance < nearest.distance
            ? { line: element.getAttribute('data-sphinx-source-line'), distance }
            : nearest;
        }, null)"""
    )
    if not target:
        failures.append(Failure(scenario["page"], "no paragraph available for scroll activation test"))
        return
    paragraph = page.locator(f'{selector}[data-sphinx-source-line="{target["line"]}"]')
    paragraph.evaluate("element => element.scrollIntoView({ block: 'center' })")
    page.locator("[data-sphinx-preview-edit-toggle]").click()
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
    paragraph.evaluate("element => element.scrollIntoView({ block: 'center' })")
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
    page.evaluate("""() => {
      window.editActivationPositions = [window.scrollY];
      window.editActivationRecording = true;
      const record = () => {
        if (!window.editActivationRecording) return;
        window.editActivationPositions.push(window.scrollY);
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
      window.addEventListener('scroll', () => {
        if (window.editActivationRecording) window.editActivationPositions.push(window.scrollY);
      });
      const dispatch = window.dispatchEvent.bind(window);
      window.dispatchEvent = event => {
        if (event.type === 'message' && event.data?.type === 'previewEditSource') {
          setTimeout(() => dispatch(event), 150);
          return true;
        }
        return dispatch(event);
      };
    }""")
    text_before = paragraph.evaluate("element => element.getBoundingClientRect().top")
    paragraph.click()
    editor = page.locator(".sphinx-preview-block-editor textarea")
    editor.wait_for(state="visible")
    if scenario.get("editActivationSelector") and not editor.input_value().strip().startswith("$$"):
      failures.append(Failure(scenario["page"], "equation editor lost the original Markdown delimiters"))
    if not editor.evaluate("element => document.activeElement === element"):
        failures.append(Failure(scenario["page"], "paragraph editor did not receive focus"))
    positions = page.evaluate("""() => new Promise(resolve => setTimeout(() => {
      window.editActivationRecording = false;
      window.editActivationPositions.push(window.scrollY);
      resolve(window.editActivationPositions);
    }, 2500))""")
    # The edition palette adds its height above the text box, so the page scrolls by exactly that
    # much to keep the clicked text where it was (T21). It must do so once and settle: no scroll
    # beyond the compensation, no overshoot and no oscillation while the layout stabilises.
    geometry = page.evaluate("""() => {
      const area = document.querySelector('.sphinx-preview-block-editor textarea');
      const frame = area.closest('.sphinx-preview-block-editor');
      // P4: the palette sits above the frame, in the frame's host.
      const bar = frame.parentElement.querySelector(':scope > .sphinx-preview-edit-palette');
      const barBox = bar ? bar.getBoundingClientRect() : null;
      const margin = bar ? parseFloat(getComputedStyle(bar).marginBottom) || 0 : 0;
      return {
        inset: area.getBoundingClientRect().top - frame.getBoundingClientRect().top,
        barHeight: barBox ? barBox.height + margin : 0,
        textTop: area.getBoundingClientRect().top,
      };
    }""")
    compensation = positions[-1] - positions[0]
    low, high = min(positions[0], positions[-1]) - 2, max(positions[0], positions[-1]) + 2
    text_moved = geometry["textTop"] - geometry["inset"] - text_before
    if (
        positions[0] <= 0
        or compensation < -2
        or compensation > geometry["barHeight"] + 2
        or any(position < low or position > high for position in positions)
        or abs(text_moved) > 2
    ):
        failures.append(Failure(
            scenario["page"],
            f"opening paragraph editor changed scroll by {compensation:.1f}px "
            f"(initial={positions[0]:.1f}, final={positions[-1]:.1f}, bar={geometry['barHeight']:.1f}px) "
            f"and moved the text by {text_moved:.1f}px",
        ))


def check_math_rendering(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("mathRenderingChecks"):
        return
    result = page.evaluate("""async () => {
      await document.fonts.ready;
      const fonts = await document.fonts.load('16px "KaTeX_Main"', 'H');
      const mathFonts = await document.fonts.load('16px "KaTeX_Math"', 'm');
      const equations = [...document.querySelectorAll('.math-display, .math-inline')];
      const stylesheet = document.querySelector('link[data-studio-math-stylesheet]');
      return {
        count: equations.length,
        rendered: equations.every(element => element.dataset.studioMathRendered === 'true'
          && element.querySelector('.katex-html') && element.querySelector('math')),
        stylesheetLoaded: Boolean(stylesheet?.sheet),
        fontsLoaded: fonts.length > 0 && mathFonts.length > 0
          && [...fonts, ...mathFonts].every(font => font.status === 'loaded'),
        inlineStyles: document.querySelectorAll('.katex [style]').length,
        fractionWidth: document.querySelector('.katex .frac-line')?.getBoundingClientRect().width || 0,
      };
    }""")
    if result["count"] == 0 or not result["rendered"]:
        failures.append(Failure(scenario["page"], "inline or display math was not typeset"))
    if not result["stylesheetLoaded"] or not result["fontsLoaded"]:
        failures.append(Failure(scenario["page"], "bundled KaTeX stylesheet or fonts failed to load offline"))
    if result["inlineStyles"] or result["fractionWidth"] <= 0:
        failures.append(Failure(scenario["page"], "KaTeX layout styles are missing or require unsafe inline CSS"))


def check_bare_urls(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("bareUrlChecks"):
        return
    found = page.evaluate("""() => ({
      links: [...document.querySelectorAll('#sphinx-myst-preview-content a')].map(a => ({
        text: a.textContent,
        target: a.getAttribute('data-sphinx-preview-navigation') || a.getAttribute('href'),
        underline: getComputedStyle(a).textDecorationLine,
      })),
      code: [...document.querySelectorAll('#sphinx-myst-preview-content code')].map(code => ({
        text: code.textContent, inLink: Boolean(code.closest('a')),
      })),
    })""")
    expected = {
        "https://example.com/docs?q=1#top": "https://example.com/docs?q=1#top",
        "www.example.org/guide": "https://www.example.org/guide",
        "https://example.com/end": "https://example.com/end",
        "http://example.net/list-item": "http://example.net/list-item",
        "https://example.com/table-cell": "https://example.com/table-cell",
    }
    actual = {link["text"]: link["target"] for link in found["links"]}
    if actual != expected:
        failures.append(Failure(scenario["page"], f"bare URL links are {actual}, expected {expected}"))
    if any(link["text"] == "https://example.com/in-code" for link in found["links"]) or not any(
        code["text"] == "https://example.com/in-code" and not code["inLink"] for code in found["code"]
    ):
        failures.append(Failure(scenario["page"], "the URL in inline code was linkified"))


def check_inline_code(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("inlineCodeChecks"):
        return
    found = page.evaluate("""() => {
      const root = document.querySelector('#sphinx-myst-preview-content');
      const paragraph = (start) => [...root.querySelectorAll('p')].find(p => p.textContent.startsWith(start));
      const plain = paragraph('Control line without');
      const withCode = paragraph('Control line with ');
      const code = withCode.querySelector('code');
      const style = getComputedStyle(code);
      const inLink = root.querySelector('a code');
      const heading = root.querySelector('h1 code');
      return {
        plainHeight: plain.getBoundingClientRect().height,
        codeHeight: withCode.getBoundingClientRect().height,
        radius: parseFloat(style.borderTopLeftRadius),
        background: style.backgroundColor,
        linkColor: inLink ? [getComputedStyle(inLink).color, getComputedStyle(inLink.closest('a')).color] : null,
        headingRatio: heading ? parseFloat(getComputedStyle(heading).fontSize) / parseFloat(getComputedStyle(heading.parentElement).fontSize) : null,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    }""")
    page_name = scenario["page"]
    if abs(found["plainHeight"] - found["codeHeight"]) > 1:
        failures.append(Failure(page_name, f"a line with inline code is {found['codeHeight']}px tall, a line without {found['plainHeight']}px"))
    if found["radius"] < 3:
        failures.append(Failure(page_name, f"inline code border radius is {found['radius']}px, expected at least 3px"))
    alpha = re.match(r"rgba?\(([^)]*)\)", found["background"])
    parts = [part.strip() for part in alpha.group(1).split(",")] if alpha else []
    if len(parts) < 4 and "color(" not in found["background"] and "/" not in found["background"]:
        failures.append(Failure(page_name, f"inline code background {found['background']} is opaque"))
    if found["linkColor"] and found["linkColor"][0] != found["linkColor"][1]:
        failures.append(Failure(page_name, f"code in a link is {found['linkColor'][0]}, link is {found['linkColor'][1]}"))
    if found["overflow"]:
        failures.append(Failure(page_name, "a long inline identifier overflows the page horizontally"))


def check_inline_code_narrow(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("inlineCodeNarrowChecks"):
        return
    found = page.evaluate("""() => {
      const root = document.querySelector('#sphinx-myst-preview-content');
      const cells = [...root.querySelectorAll('td code, th code')].map(code => ({
        text: code.textContent, rects: code.getClientRects().length }));
      const long = [...root.querySelectorAll('p code')].find(code => code.textContent.startsWith('REGIONAL_ARBITER'));
      return {
        cells,
        longRects: long.getClientRects().length,
        longRight: Math.max(...[...long.getClientRects()].map(rect => rect.right)),
        viewport: document.documentElement.clientWidth,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    }""")
    page_name = scenario["page"]
    split = [cell["text"] for cell in found["cells"] if cell["rects"] != 1]
    if split or not found["cells"]:
        failures.append(Failure(page_name, f"table-cell inline code split across lines: {split}"))
    if found["longRects"] < 2 or found["longRight"] > found["viewport"] or found["overflow"]:
        failures.append(Failure(page_name, f"long identifier did not wrap cleanly: {found}"))


def check_orphan_box(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """T44: the Orphaned comments box adds no scroll height while it is shorter than the content's bottom padding."""
    if not scenario.get("orphanBoxChecks"):
        return
    found = page.evaluate("""() => {
      const content = document.getElementById('sphinx-myst-preview-content');
      const height = () => document.documentElement.scrollHeight;
      const padding = parseFloat(getComputedStyle(content).paddingBottom);
      const before = height();
      const make = (entries) => {
        const box = document.createElement('div');
        box.setAttribute('data-okf-orphans', 'true');
        const title = document.createElement('div');
        title.setAttribute('data-okf-orphans-title', 'true');
        title.textContent = 'Orphaned comments';
        box.appendChild(title);
        for (let index = 0; index < entries; index += 1) {
          const item = document.createElement('button');
          item.setAttribute('data-okf-comment-orphan', 't' + index);
          item.textContent = 'A quote that is no longer in the document ' + index;
          box.appendChild(item);
        }
        content.after(box);
        return box;
      };
      const short = make(1);
      const shortHeight = height();
      const shortBox = short.getBoundingClientRect().height;
      const shortTop = short.getBoundingClientRect().top + scrollY;
      const contentBottom = content.getBoundingClientRect().bottom + scrollY;
      short.remove();
      const tall = make(Math.ceil((padding + 400) / 30));
      const tallHeight = height();
      const tallBox = tall.getBoundingClientRect().height;
      tall.remove();
      const after = height();
      // P9 B2b: every assertion ran; put the short box back so the capture shows it in the bottom padding.
      make(1);
      return { before, shortHeight, shortBox, shortTop, contentBottom, tallHeight, tallBox, padding, after };
    }""")
    page_name = scenario["page"]
    if found["padding"] < 40 or found["shortBox"] >= found["padding"]:
        failures.append(Failure(page_name, f"orphan box check needs a short box inside the padding: {found}"))
    if found["shortHeight"] != found["before"]:
        failures.append(Failure(page_name, f"a short orphan box changed the scroll height: {found}"))
    if found["shortTop"] >= found["contentBottom"]:
        failures.append(Failure(page_name, f"the orphan box does not start inside the bottom padding: {found}"))
    if not found["tallHeight"] > found["before"] or found["tallBox"] <= found["padding"]:
        failures.append(Failure(page_name, f"a tall orphan box did not extend the page: {found}"))
    if found["after"] != found["before"]:
        failures.append(Failure(page_name, f"removing the orphan box did not restore the height: {found}"))


def machine_check_lines(checks: list[dict] | None) -> list[str]:
    """One PASS, FAIL or n/a line per geometry check; says so when the final frame was unavailable."""
    if checks is None:
        return ["not run: the final frame was unavailable"]
    return [
        f"{'n/a' if not check['applicable'] else 'PASS' if check['pass'] else 'FAIL'} {check['id']}: {check['detail']}"
        for check in checks
    ]


def sidecar_text(scenario: dict, position: str, result: dict) -> str:
    scroll = scenario["scroll"]
    detail = scroll["kind"]
    if "value" in scroll:
        detail = f"{detail} ({scroll['value']})"
    preview_mode = scenario.get("previewThemeMode")
    if (scenario.get("render") or {}).get("freshWorkspace"):
        preview_label = f"fresh workspace default ({preview_mode or 'cream'})"
    else:
        preview_label = f"forced {preview_mode}" if preview_mode else "current"
    lines = [
        scenario["id"],
        "=" * len(scenario["id"]),
        "",
        f"Fixture:  {scenario['fixture']}.md",
        f"Theme:    {scenario['themeLabel']}",
        f"Preview:  {preview_label}",
        f"Viewport: {scenario['width']}x{scenario['height']}"
        + (" (full page capture)" if scenario.get("fullPage") else ""),
        f"Scroll:   {detail} - {position}",
        f"Status:   {result['status']}",
        "",
        "Setup",
        "-----",
        "Static renderer output with fixture source mappings and mock VS Code message host.",
        f"Edit mode requested: {bool(scenario.get('editMode') or scenario.get('editActivationScroll'))}; "
        f"target: {scenario.get('editTarget') or scenario.get('editActivationSelector') or 'none'}.",
        "",
        "Actions before capture",
        "----------------------",
        f"Open the named fixture at the specified viewport and select the {preview_label} preview theme.",
        f"Scroll to the requested {detail} position.",
        *([f"Activate editing for {scenario.get('editTarget') or scenario.get('editActivationSelector')}."]
          if scenario.get('editTarget') or scenario.get('editActivationSelector') else []),
        *(["Resolve deferred target metadata before capturing the loaded state."]
          if scenario.get('deferredLinksState') == 'loaded' else []),
        "",
        "Captured state",
        "--------------",
        f"The preview is scrolled to {result.get('finalState', {}).get('scrollY', 'unknown')} pixels. "
        f"Edit mode is {result.get('finalState', {}).get('editMode', 'unknown')}.",
        *[f"The visible {editor['label'] or 'editor'} contains: {editor['value']}"
          for editor in result.get('finalState', {}).get('editors', [])],
        "Visible content: " + "; ".join(result.get('finalState', {}).get('visibleContent', [])),
        "",
        "Expected content and stakeholder visual checks",
        "---------------------------------------------",
        scenario["description"],
        "Check the named landmark/editor is visible, text does not collide with the toolbar or sticky band, "
        "and foreground text remains readable. Reject clipped controls or unintended whole-page horizontal overflow; "
        "internal horizontal scrolling is intentional in wide-table and diagram cases.",
        "",
        "Machine checks",
        "--------------",
        *machine_check_lines(result.get('finalState', {}).get('machineChecks')),
        "",
        "Limitations",
        "-----------",
        "Static generated HTML, not an installed extension: mock saves are recorded but do not rerender. "
        "Native browser popups are not captured.",
        *(["Key suggestions use a synthetic capture overlay."]
          if scenario.get('editTarget') == 'frontmatter-key' else []),
        *[f"Assertion failure: {detail}" for detail in result['failures']],
        "",
    ]
    return "\n".join(line.rstrip() for line in "\n".join(lines).split("\n"))

def sidecar_json(scenario: dict, position: str, result: dict) -> str:
    return json.dumps({
      "summary": scenario["description"],
      **({"locks": scenario["locks"]} if scenario.get("locks") else {}),
      "info": {
        "id": scenario["id"],
        "fixture": scenario["fixture"] + ".md",
        "theme": scenario["themeLabel"],
        "viewport": {"width": scenario["width"], "height": scenario["height"]},
        "scroll": position,
        "status": result["status"],
        "runId": os.environ.get("STUDIO_E2E_RUN_ID"),
      },
      "actions": result.get("actions", []),
      "capturedState": result.get("finalState", {}),
      "checks": result.get("finalState", {}).get("machineChecks", []),
      "failures": result["failures"],
      "notes": sidecar_text(scenario, position, result),
    }, indent=2) + "\n"


def check_forced_white_theme(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if scenario.get("previewThemeMode") != "white":
        return

    page.evaluate(
        'document.documentElement.setAttribute("data-sphinx-preview-theme-mode", "white")'
    )
    colors = page.evaluate(FORCED_WHITE_CHECKS)
    page_name = scenario["page"]
    for key, expected in (
      ("pageBackground", "rgb(255, 255, 255)"),
      ("pageForeground", "rgb(31, 31, 31)"),
    ):
        if colors[key] != expected:
            failures.append(
                Failure(page_name, f"forced white {key} is {colors[key]}, expected {expected}")
            )
    if colors["noteForeground"] is not None and colors["noteForeground"] != "rgb(31, 31, 31)":
      failures.append(
        Failure(
          page_name,
          f"forced white noteForeground is {colors['noteForeground']}, expected rgb(31, 31, 31)",
        )
      )

    note_background = colors["noteBackground"]
    if note_background is None:
      return
    channels = [
        float(value)
        for value in re.findall(r"\d+(?:\.\d+)?", note_background or "")[:3]
    ]
    scale = 255 if channels and max(channels) <= 1 else 1
    if len(channels) != 3 or min(channels) * scale < 180:
        failures.append(
            Failure(page_name, f"forced white note panel is not light: {note_background}")
        )


def _rgb_channels(value: str | None, backdrop: list[float] | None = None) -> list[float]:
    """Parse rgb()/rgba()/color(srgb ...) to 0-255 channels, flattened over a backdrop if translucent."""
    numbers = [float(item) for item in re.findall(r"\d+(?:\.\d+)?", value or "")]
    channels = numbers[:3]
    if (value or "").startswith("color(srgb"):
        channels = [item * 255 for item in channels]
    alpha = numbers[3] if len(numbers) > 3 else 1.0
    if backdrop is not None and len(channels) == 3 and alpha < 1:
        channels = [c * alpha + b * (1 - alpha) for c, b in zip(channels, backdrop)]
    return channels


def _relative_luminance(channels: list[float]) -> float:
    linear = [
        (v / 255 / 12.92) if v / 255 <= 0.03928 else (((v / 255) + 0.055) / 1.055) ** 2.4
        for v in channels
    ]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def _contrast_ratio(first: list[float], second: list[float]) -> float:
    high, low = sorted((_relative_luminance(first), _relative_luminance(second)), reverse=True)
    return (high + 0.05) / (low + 0.05)


FORCED_CREAM_CHECKS = """
() => {
  const body = document.body;
  const main = document.getElementById('sphinx-myst-preview-content');
  const style = (element) => (element ? getComputedStyle(element) : null);
  const note = main?.querySelector('.admonition');
  const code = main?.querySelector('p code, li code');
  const block = main?.querySelector('pre');
  const link = main?.querySelector('p a[href]');
  const table = main?.querySelector('table th, table td');
  const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
  return {
    mode: document.documentElement.dataset.sphinxPreviewThemeMode,
    pageBackground: style(body).backgroundColor,
    pageForeground: style(body).color,
    noteBackground: style(note)?.backgroundColor ?? null,
    noteForeground: style(note)?.color ?? null,
    codeBackground: style(code)?.backgroundColor ?? null,
    codeForeground: style(code)?.color ?? null,
    blockBackground: style(block)?.backgroundColor ?? null,
    blockForeground: style(block)?.color ?? null,
    linkForeground: style(link)?.color ?? null,
    tableForeground: style(table)?.color ?? null,
    toolbarBackground: style(toolbar)?.backgroundColor ?? null,
    toolbarForeground: style(toolbar)?.color ?? null,
    colorScheme: style(document.documentElement).colorScheme,
  };
}
"""


def check_forced_cream_theme(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if scenario.get("previewThemeMode") != "cream":
        return

    page_name = scenario["page"]
    # Drive the real toolbar button so the mode, tooltip and icon match what a user sees.
    for _ in range(4):
        if page.evaluate(
            'document.querySelector("[data-sphinx-preview-theme-toggle]")?.dataset.themeMode'
        ) == "cream":
            break
        page.evaluate('document.querySelector("[data-sphinx-preview-theme-toggle]").click()')
    icons = page.evaluate(
        """() => [...document.querySelectorAll('[data-sphinx-preview-theme-toggle] [data-theme-icon]')]
          .filter((icon) => getComputedStyle(icon).display !== 'none')
          .map((icon) => icon.dataset.themeIcon)"""
    )
    if icons != ["cream"]:
        failures.append(Failure(page_name, f"forced cream visible theme icons are {icons}, expected ['cream']"))
    colors = page.evaluate(FORCED_CREAM_CHECKS)
    for key, expected in (
      ("pageBackground", "rgb(245, 241, 232)"),
      ("pageForeground", "rgb(43, 42, 39)"),
      ("noteForeground", "rgb(43, 42, 39)"),
      ("codeForeground", "rgb(161, 78, 50)"),
      ("blockBackground", "rgb(237, 230, 218)"),
      ("linkForeground", "rgb(161, 78, 50)"),
    ):
        if colors[key] is not None and colors[key] != expected:
            failures.append(
                Failure(page_name, f"forced cream {key} is {colors[key]}, expected {expected}")
            )
    # Inline code is a translucent tint of its own (clay) text colour, not an opaque paper box.
    code_tint = _rgb_channels(colors["codeBackground"]) if colors["codeBackground"] else None
    if code_tint is not None and (len(re.findall(r"\d+(?:\.\d+)?", colors["codeBackground"])) < 4
                                  or any(abs(a - b) > 1 for a, b in zip(code_tint, [161, 78, 50]))):
        failures.append(Failure(page_name, f"forced cream codeBackground is {colors['codeBackground']}, expected a translucent clay tint"))
    if colors["colorScheme"] != "light":
        failures.append(Failure(page_name, f"forced cream color-scheme is {colors['colorScheme']}"))
    for foreground, background in (
      ("pageForeground", "pageBackground"),
      ("noteForeground", "noteBackground"),
      ("codeForeground", "codeBackground"),
      ("blockForeground", "blockBackground"),
      ("linkForeground", "pageBackground"),
      ("toolbarForeground", "toolbarBackground"),
    ):
        if colors[foreground] is None or colors[background] is None:
            continue
        page_bg = _rgb_channels(colors["pageBackground"])
        bg = _rgb_channels(colors[background], page_bg)
        fg = _rgb_channels(colors[foreground], bg)
        if len(fg) != 3 or len(bg) != 3:
            continue
        ratio = _contrast_ratio(fg, bg)
        if ratio < 4.5:
            failures.append(
                Failure(
                    page_name,
                    f"forced cream {foreground} on {background} contrast is {ratio:.2f}:1, expected >= 4.5:1",
                )
            )


def check_frontmatter_rendering(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if scenario.get("fixture") != "07-frontmatter":
        return

    page_name = scenario["page"]
    rendered = page.evaluate(FRONTMATTER_CHECKS)
    if not rendered["tablePresent"]:
        failures.append(Failure(page_name, "OKF properties table was not rendered"))
        return
    if not rendered["gridWidth"] or abs(rendered["gridWidth"] - rendered["sectionWidth"]) > 2:
      failures.append(Failure(page_name, "frontmatter grid does not fill the available width"))
    if rendered["titleField"] != "Frontmatter Rendering":
        failures.append(Failure(page_name, "properties table is missing the title field"))
    if rendered["ownerField"] != "Preview Team":
        failures.append(Failure(page_name, "properties table is missing the owner field"))
    if rendered["statusField"] not in ("active", "draft", "retired"):
        failures.append(Failure(page_name, "properties table is missing the status field"))
    if rendered["heading"] != "Frontmatter Rendering":
        failures.append(Failure(page_name, "document heading after frontmatter is missing"))
    if rendered["inlineCodeText"] != "plugin.yml":
        failures.append(Failure(page_name, "inline code after frontmatter is missing"))
    expected_code_color = "rgb(0, 106, 177)"
    if scenario.get("previewThemeMode") == "cream":
      expected_code_color = "rgb(161, 78, 50)"
    elif scenario.get("previewThemeMode") != "white":
      expected_code_color = page.evaluate("() => getComputedStyle(document.body).color")
    if rendered["inlineCodeColor"] != expected_code_color:
        failures.append(
            Failure(
                page_name,
          f"inlineCodeColor is {rendered['inlineCodeColor']}, expected {expected_code_color} for this theme",
            )
        )

def check_deferred_frontmatter_links(page: Page, scenario: dict, failures: list[Failure]) -> None:
    state = scenario.get("frontmatterLinkState")
    if not state:
        return

    page_name = scenario["page"]
    if state == "loaded":
        page.evaluate("() => window.resolveVisualFrontmatterLinks()")
        try:
            page.wait_for_function(
                "() => window.visualFrontmatterLinksState === 'loaded'",
                timeout=5000,
            )
        except Exception as error:
            failures.append(Failure(page_name, f"deferred link loading did not finish: {error}"))
            return
    else:
        page.wait_for_timeout(100)

    rendered = page.evaluate(DEFERRED_FRONTMATTER_LINK_CHECKS)
    if rendered["references"] != 2:
        failures.append(Failure(page_name, f"deferred-link fixture rendered {rendered['references']} references"))
    if state == "loading":
        if rendered["state"] != "loading":
            failures.append(Failure(page_name, f"loading screenshot captured state {rendered['state']!r}"))
        if rendered["pending"] != 2 or rendered["spinners"] != 2:
            failures.append(
                Failure(
                    page_name,
                    f"loading state has {rendered['pending']} pending links and {rendered['spinners']} spinners",
                )
            )
        if rendered["valid"] != 0:
            failures.append(Failure(page_name, "loading state already contains resolved links"))
    else:
        if rendered["state"] != "loaded":
            failures.append(Failure(page_name, f"loaded screenshot captured state {rendered['state']!r}"))
        if rendered["pending"] != 0 or rendered["spinners"] != 0:
            failures.append(
                Failure(
                    page_name,
                    f"loaded state retains {rendered['pending']} pending links and {rendered['spinners']} spinners",
                )
            )
        if rendered["valid"] != 2:
            failures.append(Failure(page_name, f"loaded state has {rendered['valid']} resolved links"))


def check_generic_skill_frontmatter(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if scenario.get("fixture") != "SKILL":
        return

    page_name = scenario["page"]
    rendered = page.evaluate(SKILL_FRONTMATTER_CHECKS)
    if not rendered["tablePresent"]:
        failures.append(Failure(page_name, "generic SKILL.md properties table was not rendered"))
        return
    if rendered["schemaFound"] != "false":
        failures.append(Failure(page_name, "standalone SKILL.md unexpectedly matched an OKF schema"))
    if rendered["headers"] != ["Names", "Values"]:
        failures.append(Failure(page_name, f"generic frontmatter headers are {rendered['headers']!r}"))
    if rendered["hasSchemaControls"]:
        failures.append(Failure(page_name, "generic frontmatter exposes schema-only controls"))
    if rendered["hasTypeIcons"]:
      failures.append(Failure(page_name, "generic frontmatter renders schema type icons"))
    if rendered["metadataDisplayTag"] != "PRE" or rendered["metadataCodeClass"] != "language-yaml":
        failures.append(Failure(page_name, "nested metadata is not displayed in a YAML code block"))
    if rendered["metadataText"].lstrip().startswith("{"):
        failures.append(Failure(page_name, "nested metadata is displayed as JSON instead of YAML"))
    for line in (
        "owner: Developer Experience",
        "review:",
        "  required: false",
        "  attempts: 3",
    ):
        if line not in rendered["metadataText"]:
            failures.append(Failure(page_name, f"nested YAML is missing {line!r}"))
    if rendered["metadataEditable"] != "true" or not rendered["metadataEditCell"]:
        failures.append(Failure(page_name, "nested metadata lost its frontmatter edit hooks"))
    if rendered["heading"] != "Local tooling guide":
        failures.append(Failure(page_name, "Markdown body after SKILL.md frontmatter is missing"))
    bounds = rendered["tableBounds"]
    if not bounds or bounds["top"] < 0 or bounds["bottom"] > scenario["height"]:
        failures.append(Failure(page_name, f"generic frontmatter table is clipped: {bounds}"))
    if (
      not bounds
      or not rendered["sectionWidth"]
      or abs(bounds["width"] - rendered["sectionWidth"]) > 2
    ):
      failures.append(
        Failure(
          page_name,
          "generic frontmatter table does not fill its section: "
          f"table={bounds}, sectionWidth={rendered['sectionWidth']}",
        )
      )


def check_okf_schema_rendering(page: Page, scenario: dict, failures: list[Failure]) -> None:
    fixture = scenario.get("fixture")
    if fixture == "10-schema-validation-error":
        rendered = page.evaluate("""() => {
          const section = document.querySelector('[data-okf-properties]');
          const table = section?.querySelector('table.okf-properties');
          const cell = table?.querySelector('.okf-info-row.okf-error th');
          const style = cell ? getComputedStyle(cell) : null;
          return {
            text: cell?.textContent || '',
            span: cell?.colSpan,
            columns: [...(table?.querySelectorAll('thead th') || [])]
              .filter(element => getComputedStyle(element).display !== 'none').length,
            role: cell?.getAttribute('role'),
            width: cell?.getBoundingClientRect().width || 0,
            tableWidth: table?.getBoundingClientRect().width || 0,
            color: style?.color || '',
            background: style?.backgroundColor || '',
            overflow: cell ? cell.scrollWidth > cell.clientWidth + 1 : true,
            errorCount: section?.querySelector('[data-okf-badge]')?.getAttribute('data-okf-errors'),
          };
        }""")
        page_name = scenario["page"]
        if "Schema validation failed to run" not in rendered["text"] or "data/type" not in rendered["text"]:
          failures.append(Failure(page_name, "the real invalid-schema diagnostic is missing"))
        if rendered["span"] != rendered["columns"] or not rendered["width"] or abs(rendered["width"] - rendered["tableWidth"]) > 2:
          failures.append(Failure(page_name, f"schema diagnostic does not span the whole table: span={rendered['span']}, columns={rendered['columns']}, width={rendered['width']}, table width={rendered['tableWidth']}"))
        if rendered["role"] != "alert" or rendered["errorCount"] != "1":
            failures.append(Failure(page_name, "schema failure does not expose its error severity"))
        for name in ("color", "background"):
            channels = [float(value) for value in re.findall(r"[\d.]+", rendered[name])]
            if len(channels) < 3 or channels[0] <= channels[1] * 1.25 or channels[0] <= channels[2] * 1.25 or (len(channels) == 4 and channels[3] == 0):
                failures.append(Failure(page_name, f"schema diagnostic {name} is not red: {rendered[name]}"))
        if rendered["overflow"]:
            failures.append(Failure(page_name, "schema diagnostic text overflows its cell"))
        return
    if fixture not in ("08-okf-schema", "09-okf-schema-missing-required"):
        return

    page_name = scenario["page"]
    rendered = page.evaluate(OKF_SCHEMA_CHECKS)
    if not rendered["sectionPresent"]:
        failures.append(Failure(page_name, "OKF properties section was not rendered"))
        return
    if rendered["schemaFound"] != "true":
        failures.append(Failure(page_name, "OKF schema was not discovered for type: swrs"))
    if rendered["order"] != "schema":
        failures.append(Failure(page_name, f"row order is {rendered['order']}, expected schema order"))
    if rendered.get("listMarker") != '"-"':
      failures.append(Failure(page_name, f"list marker is {rendered.get('listMarker')!r}, expected '-'"))
    if scenario.get("hideDescriptionColumn"):
      if rendered.get("visibleHeaders") != ["Name", "Value"]:
        failures.append(
          Failure(page_name, f"narrow schema headers are {rendered.get('visibleHeaders')!r}, expected Name/Value")
        )
      if rendered.get("descriptionHeaderDisplay") != "none":
        failures.append(Failure(page_name, "narrow schema description header is still visible"))
      if any(display != "none" for display in rendered.get("descriptionCellDisplays", [])):
        failures.append(Failure(page_name, "narrow schema description cells are still visible"))
    if rendered.get("titleBackground") not in ("rgba(0, 0, 0, 0)", "transparent"):
      failures.append(Failure(page_name, "Properties title still has a background"))
    header_backgrounds = rendered.get("headerBackgrounds") or []
    if not header_backgrounds or any(
      background in ("rgba(0, 0, 0, 0)", "transparent")
      for background in header_backgrounds
    ):
      failures.append(Failure(page_name, "table heading cells do not have a gray background"))
    fields = {field["name"]: field for field in rendered["fields"]}
    if "type" not in fields or fields["type"].get("value") != "swrs":
        failures.append(Failure(page_name, "properties table is missing the type=swrs field"))
    if fixture == "08-okf-schema":
      boolean_field = fields.get("annotation_exemption", {})
      boolean_checkbox = boolean_field.get("checkbox")
      if boolean_field.get("value") != "true" or not boolean_checkbox:
        failures.append(Failure(page_name, "boolean frontmatter preview is missing its checkbox"))
      elif not boolean_checkbox.get("checked") or boolean_checkbox.get("ariaDisabled") != "true":
        failures.append(Failure(page_name, "boolean frontmatter preview checkbox has the wrong state"))
    for expected in ("title", "status", "owner"):
        if expected not in fields:
            failures.append(Failure(page_name, f"properties table is missing the {expected} field"))
    docs = [field for field in rendered["fields"] if field.get("doc")]
    if len(docs) < 4:
        failures.append(
            Failure(page_name, f"only {len(docs)} fields carry schema descriptions; expected >= 4")
        )
    if any(" · required" in field.get("doc", "") for field in rendered["fields"]):
        failures.append(Failure(page_name, "schema required annotations remain in descriptions"))
    if fixture == "09-okf-schema-missing-required":
        expected_missing = "Missing required fields: title, status, owner, annotation_exemption, exemption_reason"
        if rendered.get("missingRequiredText") != expected_missing:
            failures.append(
                Failure(
                    page_name,
                    f"missing-required line is {rendered.get('missingRequiredText')!r}, "
                    f"expected {expected_missing!r}",
                )
            )
        if not rendered.get("missingRequiredAfterTable"):
            failures.append(Failure(page_name, "missing-required line is not below the properties table"))
        channels = [
            int(value)
            for value in re.findall(r"\d+", rendered.get("missingRequiredColor") or "")[:3]
        ]
        if len(channels) != 3 or channels[0] <= channels[1] * 1.25 or channels[0] <= channels[2] * 1.25:
            failures.append(
                Failure(
                    page_name,
                    f"missing-required line is not red: {rendered.get('missingRequiredColor')}",
                )
            )
    elif rendered.get("missingRequiredText") is not None:
        failures.append(Failure(page_name, "complete OKF fixture unexpectedly reports missing fields"))
    icons = {field["name"]: field for field in rendered["fields"] if field["icon"]}
    for expected_name, expected_type in (
        ("status", "enum"),
        ("annotation_exemption", "checkbox"),
        ("derives_from", "list"),
        ("reviewed_on", "date"),
        ("priority", "number"),
    ):
        icon = icons.get(expected_name)
        if not icon:
            failures.append(Failure(page_name, f"{expected_name} lacks a type icon"))
        elif icon["type"] != expected_type:
            failures.append(
                Failure(page_name, f"{expected_name} icon type is {icon['type']}, expected {expected_type}")
            )
        elif icon.get("iconSize"):
            size = icon["iconSize"]
            # Icons must render small (em-based), not at the default replaced
            # size (300x150) that unstyled SVGs fall back to.
            max_icon_size = size["em"] * 1.5
            if size["w"] > max_icon_size or size["h"] > max_icon_size:
                failures.append(
                    Failure(
                        page_name,
                  f"{expected_name} type icon renders at {size['w']:.0f}x{size['h']:.0f}px; "
                  f"expected no larger than {max_icon_size:.0f}px (1.5em)",
                    )
                )
            if size.get("nameH") and size["h"] > size["nameH"] * 1.6:
                failures.append(
                    Failure(
                        page_name,
                        f"{expected_name} type icon ({size['h']:.0f}px) dwarfs its name row ({size['nameH']:.0f}px)",
                    )
                )
    lean = rendered.get("lean") or {}
    if lean:
        if lean["outerBorder"]:
            failures.append(Failure(page_name, "properties section still has an outer border"))
        for key, color in (("outerBackground", lean.get("outerBackground")),
                           ("tableBackground", lean.get("tableBackground")),
                           ("cellBackground", lean.get("cellBackground"))):
            value = color or ""
            if value not in ("rgba(0, 0, 0, 0)", "transparent"):
                failures.append(Failure(page_name, f"{key} is {value}, expected fully transparent"))
    contrast = rendered.get("contrast")
    if contrast:

        def luminance(css: str) -> float:
            import re as _re
            parts = [float(x) / 255.0 for x in _re.findall(r"[\d.]+", css)[:3]]
            if not parts:
                return 0.0
            linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in parts]
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

        def contrast_ratio(first: str, second: str) -> float:
            brightest, darkest = sorted((luminance(first), luminance(second)), reverse=True)
            return (brightest + 0.05) / (darkest + 0.05)

        page_bg = page.evaluate("() => getComputedStyle(document.body).backgroundColor")
        ratio = contrast_ratio(contrast["titleColor"], page_bg)
        if ratio < 2.5:
            failures.append(
                Failure(page_name, f"title badge contrast is {ratio:.2f}, expected >= 2.5")
            )
        doc_ratio = contrast_ratio(contrast["docColor"], page_bg)
        value_ratio = contrast_ratio(contrast["valueColor"], page_bg)
        if doc_ratio < 2.2:
            failures.append(
                Failure(page_name, f"description text contrast is {doc_ratio:.2f}, expected >= 2.2")
            )
        if value_ratio < 4.0:
            failures.append(
                Failure(page_name, f"value text contrast is {value_ratio:.2f}, expected >= 4.0")
            )
        # Header stays consistent with the shrunken description column.
        if contrast["docSize"] >= contrast["valueSize"]:
            failures.append(
                Failure(page_name, "description text is not smaller than value text")
            )

