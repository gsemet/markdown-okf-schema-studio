"""Frontmatter pinning, sticky heading, final frame, content contract and Mermaid theme checks
of the screenshot campaign."""

from __future__ import annotations

import re

from playwright.sync_api import Page

from capture_support import FIXTURE_DIR, Failure, GEOMETRY_SOURCE


def show_schema_key_suggestions(page: Page, scenario: dict, failures: list[Failure]) -> None:
    suggestions = page.evaluate("""() => {
      const input = document.querySelector('input[aria-label="Frontmatter key status"][list]');
      const datalist = input && document.getElementById(input.getAttribute("list"));
      if (!input || !datalist) return null;
      const query = input.value.trim().toLowerCase();
      const values = [...datalist.options]
        .map(option => option.value)
        .filter(value => value.toLowerCase().startsWith(query));
      if (values.length === 0) return values;

      const bounds = input.getBoundingClientRect();
      const popup = document.createElement("div");
      popup.setAttribute("role", "listbox");
      popup.setAttribute("aria-label", "Available JSON Schema frontmatter keys");
      popup.setAttribute("data-visual-capture-suggestions", "true");
      Object.assign(popup.style, {
        position: "fixed",
        top: `${bounds.bottom}px`,
        left: `${bounds.left}px`,
        width: `${bounds.width}px`,
        boxSizing: "border-box",
        zIndex: "99999",
        padding: "2px",
        border: "1px solid var(--vscode-widget-border, #454545)",
        borderRadius: "2px",
        background: "var(--vscode-editorWidget-background, var(--vscode-editor-background, #252526))",
        color: "var(--vscode-editor-foreground, #e5e5e5)",
        font: "inherit",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
      });
      for (const [index, value] of values.entries()) {
        const option = document.createElement("div");
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === 0));
        option.textContent = value;
        Object.assign(option.style, {
          padding: "3px 6px",
          lineHeight: "1.4",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          ...(index === 0 ? {
            background: "var(--vscode-list-activeSelectionBackground, #094771)",
            color: "var(--vscode-list-activeSelectionForeground, #ffffff)",
          } : {}),
        });
        popup.appendChild(option);
      }
      document.body.appendChild(popup);
      return values;
    }""")
    if not suggestions or "summary" not in suggestions:
        failures.append(
            Failure(scenario["page"], "expanded key suggestions omit the unused JSON Schema property")
        )


def pin_frontmatter_capture(page: Page, scenario: dict, failures: list[Failure]) -> None:
    page_name = scenario["page"]
    page.evaluate(
      """() => {
        const originalScrollTo = window.scrollTo.bind(window);
        window.scrollTo = (...args) => {
          const first = args[0];
          const top = first && typeof first === "object"
            ? first.top
            : args.length > 1 ? args[1] : first;
          if (Number(top) !== 0) return;
          originalScrollTo(...args);
        };
        originalScrollTo(0, 0);
      }"""
    )
    page.wait_for_timeout(120)

    if page.evaluate("window.scrollY") != 0:
      failures.append(Failure(page_name, "frontmatter screenshot is not at the top of the file"))

    table = page.locator("[data-okf-properties] table.okf-properties")
    if table.count() != 1 or not table.is_visible():
      failures.append(Failure(page_name, "frontmatter table is not visible in the screenshot"))
      return

    bounds = table.bounding_box()
    if (
      bounds is None
      or bounds["y"] < 0
      or bounds["y"] + bounds["height"] > page.viewport_size["height"]
    ):
      failures.append(Failure(page_name, "frontmatter table is clipped in the screenshot"))

    rendered_text = table.inner_text().lower()
    missing_labels = {
      label for label in ("name", "value", "description", "type", "title", "status", "owner")
      if label not in rendered_text
    }
    if missing_labels:
      failures.append(
        Failure(page_name, f"frontmatter table text is missing: {', '.join(sorted(missing_labels))}")
      )

    sticky_headings = page.locator("[data-sphinx-preview-sticky-headings]")
    if sticky_headings.count() == 1 and sticky_headings.is_visible() and sticky_headings.inner_text().strip():
      failures.append(Failure(page_name, "sticky heading is visible in the top-of-file screenshot"))

# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-018
# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-025
def check_sticky_headings(
  page: Page,
  scenario: dict,
  failures: list[Failure],
  initial_main_document_top: float,
) -> None:
    expected = scenario.get("expectedStickyHeadings")
    if not expected:
        return
    page_name = scenario["page"]
    sticky = page.locator("[data-sphinx-preview-sticky-headings]")
    if sticky.count() != 1:
        failures.append(Failure(page_name, "sticky heading overlay is missing or duplicated"))
        return
    if not sticky.is_visible():
        failures.append(Failure(page_name, "sticky heading overlay is hidden after scrolling"))
        return

    theme_button = page.locator("[data-sphinx-preview-theme-toggle]")
    button_count = theme_button.count()
    if button_count != 1:
        failures.append(
            Failure(page_name, f"expected one rightmost preview button, found {button_count}")
        )
    else:
        button_is_topmost = theme_button.evaluate("""button => {
          const sticky = document.querySelector("[data-sphinx-preview-sticky-headings]");
          if (!sticky) return false;
          const buttonBounds = button.getBoundingClientRect();
          const topmost = document.elementFromPoint(
            buttonBounds.left + buttonBounds.width / 2,
            buttonBounds.top + buttonBounds.height / 2,
          );
          const range = document.createRange();
          range.selectNodeContents(sticky);
          return (topmost === button || button.contains(topmost))
            && [...range.getClientRects()].every(bounds => bounds.right <= buttonBounds.left
              || bounds.left >= buttonBounds.right || bounds.bottom <= buttonBounds.top
              || bounds.top >= buttonBounds.bottom);
        }""")
        if not button_is_topmost:
            failures.append(
                Failure(page_name, "rightmost preview button is covered or overlaps the sticky heading text row")
            )

    actual = (sticky.text_content() or "").strip()
    if actual != expected:
        failures.append(
            Failure(page_name, f"sticky heading is {actual!r}, expected {expected!r}")
        )
    expected_depth = scenario["stickyHeadingDepth"]
    if len(actual.splitlines()) != expected_depth:
      failures.append(
        Failure(
          page_name,
          f"sticky heading shows {len(actual.splitlines())} levels, expected {expected_depth}",
        )
      )
    style = sticky.evaluate("""element => {
      const computed = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      const textLineCount = new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
      const main = document.getElementById('sphinx-myst-preview-content');
      const mainStyle = getComputedStyle(main);
      const mainBounds = main.getBoundingClientRect();
      const heading = main.querySelector('h1');
      return {
        position: computed.position,
        fontSize: Number.parseFloat(computed.fontSize),
        fontWeight: Number.parseInt(computed.fontWeight, 10),
        lineHeight: Number.parseFloat(computed.lineHeight),
        textLineCount,
        whiteSpace: computed.whiteSpace,
        overflowWrap: computed.overflowWrap,
        height: bounds.height,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        textLeft: bounds.left + Number.parseFloat(computed.borderLeftWidth)
          + Number.parseFloat(computed.paddingLeft),
        textRight: bounds.right - Number.parseFloat(computed.borderRightWidth)
          - Number.parseFloat(computed.paddingRight),
        contentLeft: mainBounds.left + Number.parseFloat(mainStyle.borderLeftWidth)
          + Number.parseFloat(mainStyle.paddingLeft),
        contentRight: mainBounds.right - Number.parseFloat(mainStyle.borderRightWidth)
          - Number.parseFloat(mainStyle.paddingRight),
        bodyFontSize: Number.parseFloat(getComputedStyle(document.body).fontSize),
        borderBottomWidth: Number.parseFloat(computed.borderBottomWidth),
        borderBottomColor: computed.borderBottomColor,
        headingBorderBottomColor: getComputedStyle(heading).borderBottomColor,
      margin: computed.margin,
        paddingBlockStart: Number.parseFloat(computed.paddingBlockStart),
        paddingBlockEnd: Number.parseFloat(computed.paddingBlockEnd),
      borderRadius: computed.borderRadius,
      boxShadow: computed.boxShadow,
        scrolledUnder: element.hasAttribute('data-scrolled-under'),
        mainDocumentTop: mainBounds.top + window.scrollY,
      };
    }""")
    if style["position"] != "fixed":
      failures.append(Failure(page_name, "sticky heading is not fixed to the viewport"))
    if abs(style["width"] - scenario["width"]) > 1 or abs(style["left"]) > 1:
      failures.append(Failure(page_name, "sticky heading does not span the full preview width"))
    toolbar_left = page.locator('[data-sphinx-preview-toolbar]').evaluate("element => element.getBoundingClientRect().left")
    if abs(style["top"]) > 1:
      failures.append(Failure(page_name, f"sticky heading has a top gap of {style['top']:.1f}px"))
    if style["margin"] != "0px" or style["paddingBlockStart"] != 0 or style["paddingBlockEnd"] != 4:
      failures.append(Failure(page_name, "sticky heading should have 4px bottom padding only"))
    expected_text_right = min(style["contentRight"], toolbar_left - 8)
    if abs(style["textLeft"] - style["contentLeft"]) > 1 or abs(style["textRight"] - expected_text_right) > 1:
      failures.append(Failure(page_name, "sticky heading text is not aligned with the article content"))
    # The only shadow is the soft one under the band while text scrolls under it (marked
    # data-scrolled-under); a card look (rounded corners, a shadow at rest) stays refused.
    if style["borderRadius"] != "0px" or (style["boxShadow"] != "none") != style["scrolledUnder"]:
      failures.append(Failure(page_name, "sticky heading still has floating-card styling"))
    if style["borderBottomWidth"] != 1 or style["borderBottomColor"] != style["headingBorderBottomColor"]:
      failures.append(Failure(page_name, "sticky heading divider does not match the article heading rule"))
    if style["fontSize"] <= style["bodyFontSize"]:
        failures.append(
        Failure(
          page_name,
          f"sticky heading uses {style['fontSize']}px text, expected larger than body size "
          f"{style['bodyFontSize']}px",
        )
        )
    if style["fontWeight"] < 600:
      failures.append(Failure(page_name, "sticky heading text is not bold"))
    expected_height = style["textLineCount"] * style["lineHeight"] \
      + style["paddingBlockStart"] + style["paddingBlockEnd"] + style["borderBottomWidth"]
    if abs(style["height"] - expected_height) > 2:
        failures.append(
        Failure(
          page_name,
          f"sticky heading is {style['height']:.1f}px tall for {style['textLineCount']} rendered lines; "
          f"expected about {expected_height:.1f}px",
        )
        )
    if scenario.get("expectStickyGrowth") and style["textLineCount"] <= expected_depth:
      failures.append(
        Failure(page_name, "long sticky headings did not expand beyond one line per heading level")
      )
    flow_shift = style["mainDocumentTop"] - initial_main_document_top
    if abs(flow_shift) > 1:
      failures.append(Failure(page_name, "fixed sticky heading unexpectedly shifts document flow"))

def check_final_frame(page: Page, scenario: dict, failures: list[Failure]) -> dict:
    result = page.evaluate(r"""(tallEditor) => {
      const main = document.getElementById('sphinx-myst-preview-content');
      const errors = [];
      const visible = element => {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
      };
      if (!main || !main.textContent.trim()) errors.push('final frame has no content');
      if (document.documentElement.scrollWidth > innerWidth + 1) errors.push('final frame has page horizontal overflow');
      const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
      const sticky = document.querySelector('[data-sphinx-preview-sticky-headings]');
      if (toolbar && sticky && visible(sticky) && sticky.textContent.trim()) {
        if (Math.abs(sticky.getBoundingClientRect().top) > 1) {
          errors.push('sticky heading has an empty top gap');
        }
        const range = document.createRange();
        range.selectNodeContents(sticky);
        const controls = toolbar.getBoundingClientRect();
        if ([...range.getClientRects()].some(bounds => bounds.left < controls.right
          && bounds.right > controls.left && bounds.top < controls.bottom && bounds.bottom > controls.top)) {
          errors.push('sticky heading text overlaps the floating controls');
        }
      }
      const editors = [...document.querySelectorAll('textarea, [data-okf-frontmatter-editor] select, [data-okf-frontmatter-editor] input')]
        .filter(visible);
      for (const element of editors) {
        const bounds = element.getBoundingClientRect();
        // P4: the very tall edit box outgrows the viewport by design; only its sides are checked
        // (the palette's position is asserted by check_edit_palette_tall).
        const sidesClipped = bounds.left < -1 || bounds.right > innerWidth + 1;
        if (sidesClipped || (!tallEditor && (bounds.top < 0 || bounds.bottom > innerHeight + 1))) {
          errors.push(`final editor is clipped: ${element.getAttribute('aria-label')}`);
        }
        // The toolbar only reserves room for text that shares horizontal space with it.
        const reserved = Math.max(0, ...[toolbar, sticky].filter(item => item && visible(item))
          .map(item => item.getBoundingClientRect())
          .filter(box => bounds.left < box.right && bounds.right > box.left)
          .map(box => box.bottom));
        if (!tallEditor && bounds.top < reserved - 1) errors.push('final editor text collides with toolbar/sticky overlay');
      }
      const visibleContent = [...(main?.querySelectorAll('p, pre, figure, table, textarea, .sphinx-preview-insert-point--start button') || [])].filter(visible);
      if (!visibleContent.length) errors.push('final viewport contains no visible content landmark');
      return {
        errors, scrollY: Math.round(scrollY), editMode: document.documentElement.dataset.sphinxPreviewEditMode || 'off',
        previewTheme: document.documentElement.dataset.sphinxPreviewThemeMode || 'current',
        editors: editors.map(element => ({ label: element.getAttribute('aria-label'), value: element.value })),
        savedMessages: (window.visualMessages || []).filter(message => /Save$/.test(message.type)),
        mockHostResults: (window.visualMessages || []).filter(message => message.type === 'previewFrontmatterResult'),
        visiblePropertyColumns: [...document.querySelectorAll('table.okf-properties thead th')]
          .filter(element => visible(element) && getComputedStyle(element).display !== 'none').map(element => element.textContent.trim()),
        uncheckedBooleans: [...document.querySelectorAll('[data-okf-field] input[type="checkbox"]')]
          .filter(element => !element.checked).map(element => element.closest('[data-okf-field]').dataset.okfField),
        visibleContent: visibleContent.map(element => element.textContent.trim().slice(0, 100)),
      };
    }""", bool(scenario.get("editPaletteTall")))
    for detail in result.pop("errors"):
        failures.append(Failure(scenario["page"], detail))
    try:
        geometry = page.evaluate("(options) => {" + GEOMETRY_SOURCE + "\nreturn studioGeometryChecks(options);}", {})
    except Exception as error:
        # A broken geometry script must not discard the rest of the final frame.
        result["machineChecks"] = None
        if scenario.get("machineChecks"):
            failures.append(Failure(scenario["page"], f"machine checks not run: {error}"))
    else:
        result["machineChecks"] = geometry["checks"]
        for check in geometry["checks"]:
            if check["id"] in scenario.get("machineChecks", []) and check["applicable"] and not check["pass"]:
                failures.append(Failure(scenario["page"], f"machine check {check['id']}: {check['detail']}"))
    if scenario["scroll"]["kind"] == "bottom":
      last = page.locator('#sphinx-myst-preview-content > :last-child').bounding_box()
      if not last or last["y"] + last["height"] > scenario["height"] - 30 or last["y"] + last["height"] <= 0:
        failures.append(Failure(scenario["page"], f"last content or bottom padding is missing from final frame: {last}"))
    if scenario["scroll"]["kind"] == "selector" and not (scenario.get("editMode") or scenario.get("editActivationScroll")):
      landmark = page.locator(scenario["scroll"]["value"]).first.bounding_box()
      if not landmark or landmark["y"] < 0 or landmark["y"] >= scenario["height"]:
        failures.append(Failure(scenario["page"], f"named scroll landmark is not in final viewport: {landmark}"))
    return result


def check_content_contracts(page: Page, scenario: dict, failures: list[Failure]) -> None:
    fixture = scenario["fixture"]
    if fixture == "06-syntax-highlighting":
        rendered = page.evaluate(r"""() => {
          const errors = [];
          const expected = {
            markdown: ['```bash', '| Step | Owner | Timeout |', '[the escalation policy]'],
            rust: ['pub enum Role', '#[derive', '750'],
            python: ['@dataclass', 'async def elect', 'yield once'],
            bash: ['set -euo pipefail', '${depot}'],
            json: ['"depot"', '"arbiter"'],
          };
          for (const [language, fragments] of Object.entries(expected)) {
            const code = document.querySelector(`pre > code.language-${language}`);
            if (!code || !fragments.every(text => code.textContent.includes(text))) {
              errors.push(`${language} source content is missing or parsed as markup`);
              continue;
            }
            if (!code.querySelector('[class*="sd-"]')) errors.push(`${language} has no syntax token scopes`);
          }
          for (const [language, scopes] of Object.entries({
            rust: ['keyword', 'string', 'number', 'comment'],
            python: ['keyword', 'string', 'number', 'comment'],
          })) {
            const code = document.querySelector(`code.language-${language}`);
            // Dark+ token colours (see src/core/render/codeTheme.ts): the class names the colour.
            const colours = { keyword: 'sd-569cd6', string: 'sd-ce9178', number: 'sd-b5cea8', comment: 'sd-6a9955' };
            for (const scope of scopes) {
              if (!code?.querySelector(`.${colours[scope]}`)) errors.push(`${language} lacks ${scope} scope`);
            }
          }
          const diff = document.querySelector('code.language-diff');
          const added = diff?.querySelector('.myst-diff-line-addition');
          const removed = diff?.querySelector('.myst-diff-line-deletion');
          if (!added || !removed || !added.textContent.startsWith('+') || !removed.textContent.startsWith('-')) {
            errors.push('diff addition/deletion line scopes or patch markers missing');
          }
          return errors;
        }""")
        for detail in rendered:
            failures.append(Failure(scenario["page"], detail))
    source = (FIXTURE_DIR / f"{fixture}.md").read_text(encoding="utf-8")
    citations = re.findall(r"\{cite(?::[^}]+)?\}`([^`]+)`", source)
    if citations:
        counts = page.evaluate("""() => ({
          groups: document.querySelectorAll('.myst-cite-group').length,
          placeholders: document.querySelectorAll('.myst-cite').length,
          text: document.getElementById('sphinx-myst-preview-content').textContent,
        })""")
        expected_groups = sum("," in keys for keys in citations)
        expected_placeholders = sum(len(keys.split(",")) for keys in citations)
        if counts["groups"] != expected_groups or counts["placeholders"] != expected_placeholders:
          failures.append(Failure(scenario["page"], f"expected {expected_groups} citation groups/{expected_placeholders} placeholders, found {counts['groups']}/{counts['placeholders']}"))
        for keys in citations:
            for key in keys.split(","):
                if key.strip() not in counts["text"]:
                    failures.append(Failure(scenario["page"], f"citation placeholder lost {key.strip()}"))


def check_horizontal_access(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("horizontalOverflow"):
        return
    result = page.evaluate("""() => {
      const candidates = [...document.querySelectorAll('main pre, main table, main div')]
        .filter(element => element.scrollWidth > element.clientWidth + 1
          && ['auto', 'scroll'].includes(getComputedStyle(element).overflowX));
      const target = candidates.find(element => {
        const bounds = element.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < innerHeight;
      });
      if (!target) return { error: 'no visible internal horizontal overflow; fixture does not exercise scrolling' };
      target.scrollLeft = target.scrollWidth;
      const maximum = target.scrollWidth - target.clientWidth;
      const last = target.querySelector('tr > :last-child') || target.querySelector('code .myst-code-line:last-child') || target;
      const bounds = target.getBoundingClientRect();
      const end = last.getBoundingClientRect();
      return { scrollLeft: target.scrollLeft, maximum,
        reachable: target.scrollLeft > 0 && Math.abs(target.scrollLeft - maximum) <= 2
          && (target.tagName === 'PRE' || end.right <= bounds.right + 2) };
    }""")
    if result.get("error") or not result.get("reachable"):
        failures.append(Failure(scenario["page"], f"far-right content is not reachable: {result}"))


def check_link_details(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("linkDetailsChecks"):
        return
    result = page.evaluate("""() => {
      const links = [...document.querySelectorAll('[data-okf-link-status="valid"]')];
      const excerpt = document.querySelector('.okf-link-excerpt');
      const style = excerpt && getComputedStyle(excerpt);
      return {
        count: links.length, alpha: links[0]?.title || '', beta: links[1]?.title || '',
        excerpt: excerpt?.textContent || '', clipped: Boolean(excerpt && excerpt.scrollWidth > excerpt.clientWidth),
        ellipsis: style?.textOverflow, overflow: style?.overflowX,
        lineLabel: document.querySelector('.okf-link-line')?.textContent || '',
      };
    }""")
    if result["count"] != 2 or "description:" not in result["alpha"] or "description:" in result["beta"]:
        failures.append(Failure(scenario["page"], f"link-detail metadata contract failed: {result}"))
    if not result["excerpt"] or not result["clipped"] or result["ellipsis"] != "ellipsis" or result["overflow"] != "hidden":
        failures.append(Failure(scenario["page"], f"long link excerpt is not ellipsis-clipped: {result}"))
    target_lines = (FIXTURE_DIR / "targets" / "alpha.md").read_text(encoding="utf-8").splitlines()
    expected_line = next(index for index, line in enumerate(target_lines, 1) if line == "@tests_req 14-frontmatter-links")
    if result["lineLabel"] != f"line {expected_line}":
      failures.append(Failure(scenario["page"], f"link marker line label is incorrect: {result['lineLabel']}"))


# @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001
def check_tooltip_contrast(page: Page, scenario: dict, failures: list[Failure]) -> None:
    # A drag held down for the capture keeps the pointer button pressed: no hover (and no tooltip) then.
    if any(action.get("hold") for action in scenario.get("pageActions") or []):
        return
    button = page.locator('[data-sphinx-preview-refresh]')
    button.hover()
    page.wait_for_timeout(200)
    result = button.evaluate(r"""element => {
      const style = getComputedStyle(element, '::after');
      const luminance = color => {
        const values = (color.match(/[\d.]+/g) || []).slice(0, 3).map(value => {
          const channel = Number(value) / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
      };
      const values = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
      return { ratio: (values[0] + .05) / (values[1] + .05), content: style.content, opacity: style.opacity };
    }""")
    if result["ratio"] < 4.5 or result["content"] in {"none", '""'} or float(result["opacity"]) == 0:
        failures.append(Failure(scenario["page"], f"toolbar tooltip unreadable or hidden: {result}"))
    if not scenario.get("linkDetailsChecks"):
        page.mouse.move(scenario["width"] - 1, scenario["height"] - 1)


CONTENT_ASSERTIONS_JS = r"""(list) => {
  const errors = [];
  for (const a of list) {
    const els = [...document.querySelectorAll(a.selector)];
    const fail = (detail) => errors.push(`${a.message}: ${detail} (${a.selector})`);
    if (a.count !== undefined && els.length !== a.count) fail(`expected ${a.count} match(es), found ${els.length}`);
    if (a.min !== undefined && els.length < a.min) fail(`expected at least ${a.min} match(es), found ${els.length}`);
    const text = els.map(el => el.textContent || '').join(' ');
    if (a.text !== undefined && !text.includes(a.text)) fail(`text "${a.text}" not found`);
    if (a.notText !== undefined && text.includes(a.notText)) fail(`text "${a.notText}" must not be present`);
    if (a.visible) {
      if (els.length === 0) fail('no element');
      for (const el of els) {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (box.width <= 0 || box.height <= 0 || style.visibility === 'hidden' || style.display === 'none') fail('an element is not visible');
      }
    }
    if (a.insidePane) {
      for (const el of els) {
        const box = el.getBoundingClientRect();
        if (box.left < -1 || box.right > window.innerWidth + 1) fail(`an element leaves the pane (${Math.round(box.left)}..${Math.round(box.right)} of ${window.innerWidth})`);
      }
    }
    if (a.css) {
      if (els.length === 0) fail('no element for the style check');
      else for (const [name, value] of Object.entries(a.css)) {
        const actual = getComputedStyle(els[0])[name];
        if (actual !== value) fail(`${name} is "${actual}", expected "${value}"`);
      }
    }
    if (a.attr) {
      if (els.length === 0 || els[0].getAttribute(a.attr.name) !== a.attr.value) fail(`attribute ${a.attr.name} is not "${a.attr.value}"`);
    }
    if (a.expr) {
      let result;
      try { result = (new Function(`return (${a.expr});`))(); } catch (error) { result = `threw ${error}`; }
      if (result !== true) fail(`expression is ${JSON.stringify(result)}: ${a.expr}`);
    }
  }
  return errors;
}"""


def check_content_assertions(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """P9 B4: the scenario's declarative DOM assertions (after the scroll)."""
  assertions = scenario.get("contentAssertions")
  if not assertions:
    return
  for detail in page.evaluate(CONTENT_ASSERTIONS_JS, assertions):
    failures.append(Failure(scenario["page"], detail))


def check_forced_dark_theme(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """The preview forced to dark on a light host: the real toolbar button is driven until it shows the dark mode."""
    if scenario.get("previewThemeMode") != "dark":
        return

    page_name = scenario["page"]
    for _ in range(4):
        if page.evaluate(
            'document.querySelector("[data-sphinx-preview-theme-toggle]")?.dataset.themeMode'
        ) == "dark":
            break
        page.evaluate('document.querySelector("[data-sphinx-preview-theme-toggle]").click()')
    state = page.evaluate(
        """() => ({
          mode: document.documentElement.dataset.sphinxPreviewThemeMode,
          icons: [...document.querySelectorAll('[data-sphinx-preview-theme-toggle] [data-theme-icon]')]
            .filter((icon) => getComputedStyle(icon).display !== 'none')
            .map((icon) => icon.dataset.themeIcon),
        })"""
    )
    if state["mode"] != "dark":
        failures.append(Failure(page_name, f"forced dark: the preview theme mode is {state['mode']}, expected dark"))
    if state["icons"] != ["dark"]:
        failures.append(Failure(page_name, f"forced dark: visible theme icons are {state['icons']}, expected ['dark']"))


def check_page_actions(page: Page, scenario: dict, failures: list[Failure]) -> None:
    """The scenario's `pageActions`: real clicks and hovers on the page, in order, before the content assertions."""
    for action in scenario.get("pageActions") or []:
        if "drag" in action:
            source = page.locator(action["drag"]).first
            destination = page.locator(action["over"]).first
            if source.count() == 0 or destination.count() == 0:
                failures.append(Failure(scenario["page"], f"page action: drag {action['drag']} over {action['over']} matches nothing"))
                return
            source.scroll_into_view_if_needed()
            from_box = source.bounding_box()
            to_box = destination.bounding_box()
            page.mouse.move(from_box["x"] + from_box["width"] / 2, from_box["y"] + from_box["height"] / 2)
            page.mouse.down()
            # The pointer ends in the lower quarter of the destination: the drop line goes below it.
            page.mouse.move(from_box["x"] + 20, from_box["y"] + 20, steps=4)
            page.mouse.move(to_box["x"] + 40, to_box["y"] + to_box["height"] * 0.8, steps=12)
            if not action.get("hold"):
                page.mouse.up()
            page.wait_for_timeout(action.get("waitMs", 200))
            continue
        if "press" in action:
            page.keyboard.press(action["press"])
            page.wait_for_timeout(action.get("waitMs", 200))
            continue
        selector = action.get("click") or action.get("hover")
        target = page.locator(selector).first
        if target.count() == 0:
            failures.append(Failure(scenario["page"], f"page action: {selector} matches nothing"))
            return
        target.scroll_into_view_if_needed()
        if "click" in action:
            target.click(modifiers=action.get("modifiers") or [])
        else:
            target.hover()
        page.wait_for_timeout(action.get("waitMs", 200))


def check_mermaid_theme_switch(page: Page, scenario: dict, failures: list[Failure]) -> None:
  if not scenario.get("mermaidThemeSwitch"):
    return
  original_mode = page.locator("html").get_attribute("data-sphinx-preview-theme-mode")
  original_labels = None
  for mode in ("dark", "white", "cream", original_mode):
    previous = page.locator("img.myst-mermaid-image").first.get_attribute("src")
    page.evaluate("mode => document.documentElement.setAttribute('data-sphinx-preview-theme-mode', mode)", mode)
    page.wait_for_function(
      "previous => { const image = document.querySelector('img.myst-mermaid-image'); "
      "return image && image.src !== previous && image.complete && image.naturalWidth > 0; }",
      arg=previous,
    )
    state = page.evaluate("""() => {
      const image = document.querySelector('img.myst-mermaid-image');
      const svg = new DOMParser().parseFromString(decodeURIComponent(image.src.split(',')[1]), 'image/svg+xml');
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-10000px;visibility:hidden';
      host.appendChild(document.importNode(svg.documentElement, true));
      document.body.appendChild(host);
      const expected = document.createElement('span');
      expected.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--studio-textCodeBlock-background');
      host.appendChild(expected);
      const state = {
        expected: getComputedStyle(expected).backgroundColor,
        // The theme reaches every node shape through the diagram's own style sheet: a probe node,
        // with no inline fill of its own, shows the fill that style sheet gives a plain node
        // (a classDef or style line sets an inline fill and would hide it).
        fills: [...['rect', 'polygon', 'circle', 'path'].map(tag => {
          const probe = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          probe.setAttribute('class', 'node');
          probe.appendChild(document.createElementNS('http://www.w3.org/2000/svg', tag));
          host.querySelector('svg').appendChild(probe);
          return getComputedStyle(probe.firstChild).fill;
        })],
        labels: [...host.querySelectorAll('.nodeLabel, .node .label text')].map(node => node.textContent),
      };
      host.remove();
      return state;
    }""")
    if not state["fills"] or any(fill != state["expected"] for fill in state["fills"]):
      failures.append(Failure(scenario["page"], f"Mermaid theme {mode} node colors do not match preview: {state}"))
    if original_labels is None:
      original_labels = state["labels"]
    if not state["labels"] or state["labels"] != original_labels:
      failures.append(Failure(scenario["page"], f"Mermaid theme {mode} lost diagram labels"))


def check_mermaid_error_theme_switch(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """K3: re-rendering an invalid diagram after each theme change keeps one error with one details."""
  if not scenario.get("mermaidErrorThemeSwitch"):
    return
  original_mode = page.locator("html").get_attribute("data-sphinx-preview-theme-mode")
  for mode in ("dark", "white", "cream", original_mode):
    page.evaluate(
      "mode => { const d = document.querySelector('.myst-mermaid-diagram'); d.dataset.renderState = 'pending'; "
      "mode === null ? document.documentElement.removeAttribute('data-sphinx-preview-theme-mode') "
      ": document.documentElement.setAttribute('data-sphinx-preview-theme-mode', mode); }",
      mode,
    )
    page.wait_for_function("() => document.querySelector('.myst-mermaid-diagram').dataset.renderState === 'error'")
    counts = page.evaluate("""() => ({
      errors: document.querySelectorAll('.myst-mermaid-error').length,
      details: document.querySelectorAll('.myst-mermaid-error details').length,
    })""")
    if counts != {"errors": 1, "details": 1}:
      failures.append(Failure(scenario["page"], f"Mermaid error after switching to theme {mode}: {counts}, expected one error and one details"))

