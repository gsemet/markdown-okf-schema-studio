"""Screenshot campaign for the MyST live preview.

Opens each rendered page from ``out/reports/visual/manifest.json``, drives it to the
scroll position the scenario asks for, and writes a PNG plus a sidecar note describing
what the frame is meant to prove.

A small set of DOM assertions runs once per page. They encode the regressions that
prompted the campaign: duplicated admonition titles, citation groups breaking a
paragraph in two, admonition colours leaking into following text, and panels that are
indistinguishable from the page background.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import sys
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from dataclasses import dataclass

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
EXTENSION_ROOT = HERE.parent.parent
VISUAL_REPORT_DIR = EXTENSION_ROOT / "out" / "reports" / "visual"
MANIFEST = VISUAL_REPORT_DIR / "manifest.json"
SCREENSHOT_DIR = EXTENSION_ROOT / "out" / "reports" / "e2e" / "screenshots"
FIXTURE_DIR = HERE / "fixtures"
# Plain browser JavaScript shared with the real-input harness; it declares studioGeometryChecks.
GEOMETRY_SOURCE = (EXTENSION_ROOT / "test" / "shared" / "geometry-checks.js").read_text(encoding="utf-8")

# Relative luminance gap below which two colours read as "the same grey".
MIN_PANEL_CONTRAST = 0.012

ADMONITION_DIRECTIVE = re.compile(
    r"^[ \t]*(?:`{3,}|:{3,})\{(admonition|attention|caution|danger|error|hint|important|note|seealso|tip|warning|versionadded|versionchanged|deprecated)\}",
    re.MULTILINE,
)
FIGURE_DIRECTIVE = re.compile(r"^(?:`{3,}|:{3,})\{figure\}\s+\S+", re.MULTILINE)
MERMAID_BLOCK = re.compile(r"^`{3,}(?:\{)?mermaid(?:\})?(?:\s|$)", re.MULTILINE)
PLANTUML_BLOCK = re.compile(r"^`{3,}(?:\{)?plantuml(?:\})?(?:\s|$)", re.MULTILINE)
CONTEXT_TAG_OPEN = re.compile(
  r"^[ \t]*<[a-z][a-z0-9_-]*>[ \t]*$",
    re.MULTILINE,
)


def count_admonitions(fixture: str) -> int:
    """Count admonition directives in the fixture source.

    The campaign once passed with every admonition silently stripped from the output,
    because the per-element assertions had nothing to iterate over. Comparing against the
    source makes that failure mode loud.
    """
    source = (FIXTURE_DIR / f"{fixture}.md").read_text(encoding="utf-8")
    return len(ADMONITION_DIRECTIVE.findall(source))


def count_figures(fixture: str) -> int:
    """Count source figure directives so missing rendered figures fail loudly."""
    source = (FIXTURE_DIR / f"{fixture}.md").read_text(encoding="utf-8")
    return len(FIGURE_DIRECTIVE.findall(source))


def count_mermaid_blocks(fixture: str) -> int:
    """Count Mermaid code fences and directives so missing diagrams fail loudly."""
    source = (FIXTURE_DIR / f"{fixture}.md").read_text(encoding="utf-8")
    return len(MERMAID_BLOCK.findall(source))


def count_plantuml_blocks(fixture: str) -> int:
    """Count PlantUML fences and directives so optional diagrams are still checked."""
    source = (FIXTURE_DIR / f"{fixture}.md").read_text(encoding="utf-8")
    return len(PLANTUML_BLOCK.findall(source))


def count_context_tags(fixture: str) -> int:
    """Count supported context-tag openings outside Markdown fences."""
    source = (FIXTURE_DIR / f"{fixture}.md").read_text(encoding="utf-8")
    fence: tuple[str, int] | None = None
    count = 0
    for line in source.splitlines():
        marker = re.match(r"^[ \t]*(`{3,}|~{3,})", line)
        if fence:
            if marker and marker.group(1)[0] == fence[0] and len(marker.group(1)) >= fence[1]:
                fence = None
            continue
        if marker:
            fence = (marker.group(1)[0], len(marker.group(1)))
        elif CONTEXT_TAG_OPEN.fullmatch(line):
            count += 1
    return count


@dataclass
class Failure:
    page: str
    detail: str


PAGE_CHECKS = """
() => {
  const main = document.getElementById('sphinx-myst-preview-content');
  const failures = [];
  if (!main) {
    return ['preview content wrapper is missing'];
  }

  for (const block of main.querySelectorAll('pre')) {
    const code = block.querySelector(':scope > code');
    if (!code) continue;
    const blockStyle = getComputedStyle(block);
    const codeStyle = getComputedStyle(code);
    const isDiff = code.classList.contains('language-diff') || code.classList.contains('language-patch');
    const blockSize = parseFloat(blockStyle.fontSize);
    const codeSize = parseFloat(codeStyle.fontSize);
    if (Math.abs(blockSize - codeSize) > 0.5) {
      failures.push(`fenced code is ${codeSize}px inside a ${blockSize}px pre block`);
    }
    const expectedRadius = isDiff ? '0px' : '4px';
    if (blockStyle.borderTopLeftRadius !== expectedRadius) {
      failures.push(`fenced code panel radius is ${blockStyle.borderTopLeftRadius}, expected ${expectedRadius}`);
    }
    const forcedWhiteYaml = ['white', 'cream'].includes(document.documentElement.dataset.sphinxPreviewThemeMode)
      && code.classList.contains('language-yaml');
    if (!forcedWhiteYaml && codeStyle.color !== blockStyle.color) {
      failures.push('fenced code does not inherit the editor foreground');
    }
  }

  const figureImages = [...main.querySelectorAll('figure:not(.myst-mermaid-figure):not(.myst-plantuml-figure) img')];
  if (figureImages.length !== __EXPECTED_FIGURES__) {
    failures.push(`expected __EXPECTED_FIGURES__ figure image(s), found ${figureImages.length}`);
  }
  for (const [index, image] of figureImages.entries()) {
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      failures.push(`figure image ${index + 1} did not load: ${image.getAttribute('src') || '(no src)'}`);
    }
  }

  const mermaidFigures = [...main.querySelectorAll('.myst-mermaid-figure')];
  if (mermaidFigures.length !== __EXPECTED_MERMAID__) {
    failures.push(`expected __EXPECTED_MERMAID__ Mermaid diagram(s), found ${mermaidFigures.length}`);
  }
  for (const [index, figure] of mermaidFigures.entries()) {
    const image = figure.querySelector('img.myst-mermaid-image');
    if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      failures.push(`Mermaid diagram ${index + 1} did not render to a loaded SVG image`);
    }
    if (image && image.complete && image.naturalWidth > 0) {
      const displayedWidth = image.getBoundingClientRect().width;
      if (displayedWidth > image.naturalWidth + 1) {
        failures.push(
          `Mermaid diagram ${index + 1} is enlarged (${displayedWidth}px displayed, ${image.naturalWidth}px natural)`,
        );
      }
    }
  }

  const plantumlFigures = [...main.querySelectorAll('.myst-plantuml-figure')];
  if (plantumlFigures.length !== __EXPECTED_PLANTUML__) {
    failures.push(`expected __EXPECTED_PLANTUML__ PlantUML diagram(s), found ${plantumlFigures.length}`);
  }
  for (const [index, figure] of plantumlFigures.entries()) {
    const image = figure.querySelector('img.myst-plantuml-image');
    const message = figure.querySelector('.myst-plantuml-error');
    if (__PLANTUML_EXPECTATION__ === 'executable-not-found') {
      if (image) {
        failures.push(`PlantUML diagram ${index + 1} rendered despite a missing executable`);
      }
      if (!message || !message.textContent.includes('PlantUML executable "plantuml-screenshot-executable-not-found" was not found')) {
        failures.push(`PlantUML diagram ${index + 1} did not show the executable-not-found message`);
      }
    } else if (__PLANTUML_EXPECTATION__ === 'success') {
      if (message || !image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        failures.push(`PlantUML diagram ${index + 1} requires a loaded image without an error; install PlantUML for success coverage`);
      }
    } else if (__PLANTUML_EXPECTATION__ === 'unconfigured') {
      if (image || !message || !message.textContent.includes('Set markdownOkfSchemaStudio.plantuml.jarPath')) {
        failures.push(`PlantUML fallback ${index + 1} must show explicit configuration guidance without an image`);
      }
    }
    if (!figure.querySelector('details.myst-plantuml-source')) {
      failures.push(`PlantUML diagram ${index + 1} lost its expandable source`);
    }
  }

  const luminance = (value) => {
    const parts = value.match(/[\\d.]+/g) ?? [];
    const [r, g, b] = parts.slice(0, 3).map((n) => {
      const c = Number(n) / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  if (main.querySelectorAll('.admonition').length !== __EXPECTED_ADMONITIONS__) {
    failures.push(`expected __EXPECTED_ADMONITIONS__ admonitions, found ${main.querySelectorAll('.admonition').length}`);
  }
  for (const block of main.querySelectorAll('.admonition')) {
    const titles = [...block.children].filter((child) =>
      child.classList.contains('admonition-title'));
    if (titles.length !== 1) {
      failures.push(`admonition "${block.className}" has ${titles.length} title lines`);
    }
    if (!block.hasAttribute('data-line')) {
      failures.push(`admonition "${block.className}" has no data-line for scroll sync`);
    }
    const panel = getComputedStyle(block).backgroundColor;
    const page = getComputedStyle(document.body).backgroundColor;
    if (Math.abs(luminance(panel) - luminance(page)) < __MIN_CONTRAST__) {
      failures.push(`admonition "${block.className}" background is indistinguishable from the page`);
    }
  }

  if (__CONTEXT_TAG_CHECKS__) {
    const contextBlocks = [...main.querySelectorAll('.myst-context-admonition')];
    if (contextBlocks.length !== __EXPECTED_CONTEXT_TAGS__) {
      failures.push(`expected __EXPECTED_CONTEXT_TAGS__ context tag panel(s), found ${contextBlocks.length}`);
    }
    const contextTitles = contextBlocks.map((block) =>
      block.querySelector(':scope > .admonition-title')?.textContent?.trim() || '');
    for (const expectedTitle of ['<fullcycle-model-allocation>', '<context>', '<model_allocation>']) {
      if (!contextTitles.includes(expectedTitle)) {
        failures.push(`context tag title ${expectedTitle} is missing or was not shown literally`);
      }
    }
    const mainBounds = main.getBoundingClientRect();
    for (const block of contextBlocks) {
      const title = block.querySelector(':scope > .admonition-title');
      const bounds = block.getBoundingClientRect();
      if (!title || !/^<[a-z][a-z0-9_-]*>$/.test(title.textContent?.trim() || '')) {
        failures.push('context tag title is missing or was not shown literally');
      } else if (!title.getBoundingClientRect().width || getComputedStyle(title).visibility === 'hidden') {
        failures.push('context tag title is not visible');
      }
      if (bounds.width <= 0 || bounds.height <= 0 || bounds.left < mainBounds.left - 1 || bounds.right > mainBounds.right + 1) {
        failures.push(`context tag panel is blank or overflows its content column: ${JSON.stringify(bounds)}`);
      }
    }
    const contextBody = contextBlocks.map((block) => block.textContent || '').join(' ');
    if (!contextBody.includes('allocation body')) {
      failures.push('context tag Markdown body is missing');
    }
    const originalContext = contextBlocks.find((block) =>
      block.querySelector(':scope > .admonition-title')?.textContent?.trim() === '<fullcycle-model-allocation>');
    if (!originalContext
      || originalContext.getAttribute('data-line') !== '6'
      || originalContext.getAttribute('data-end-line') !== '12') {
      failures.push('original context tag source range is not mapped from opening through closing tag');
    }
    const yaml = originalContext?.querySelector('pre code.language-yaml');
    const yamlBounds = yaml?.getBoundingClientRect();
    if (!yaml || !yaml.textContent?.includes('planner: gpt-5.6')
      || yaml.getAttribute('data-line') !== '7'
      || yaml.getAttribute('data-end-line') !== '11'
      || !yamlBounds?.width || !yamlBounds.height) {
      failures.push('context tag YAML code is missing, blank, or not visible');
    }
  }

  for (const group of main.querySelectorAll('.myst-cite-group')) {
    if (!group.closest('p')) {
      failures.push('a citation group escaped its paragraph');
    }
  }

  const baseline = main.querySelector('p:not(.admonition-title)');
  if (baseline) {
    const expected = getComputedStyle(baseline).color;
    for (const block of main.querySelectorAll('.admonition')) {
      let sibling = block.nextElementSibling;
      while (sibling && sibling.tagName !== 'P') {
        sibling = sibling.nextElementSibling;
      }
      if (sibling && getComputedStyle(sibling).color !== expected) {
        failures.push(`paragraph after "${block.className}" inherited a different colour`);
      }
    }
  }

  if (document.documentElement.scrollWidth > window.innerWidth + 1) {
    failures.push(`page scrolls horizontally (${document.documentElement.scrollWidth}px wide)`);
  }

  return failures;
}
"""

FORCED_WHITE_CHECKS = """
() => {
  const body = document.body;
  const note = document.querySelector('#sphinx-myst-preview-content .admonition');
  return {
    pageBackground: getComputedStyle(body).backgroundColor,
    pageForeground: getComputedStyle(body).color,
    noteBackground: note ? getComputedStyle(note).backgroundColor : null,
    noteForeground: note ? getComputedStyle(note).color : null,
  };
}
"""

FRONTMATTER_CHECKS = """
() => {
  const main = document.getElementById('sphinx-myst-preview-content');
  const table = main?.querySelector('[data-okf-properties]');
  const rows = table ? [...table.querySelectorAll('tbody tr')] : [];
  const field = (name) =>
    rows.find((row) => row.querySelector('th')?.textContent === name)
      ?.querySelector('[data-okf-value-display]')?.textContent || '';
  const heading = main?.querySelector('h1');
  const inlineCode = main?.querySelector('p code');
  return {
    tablePresent: Boolean(table),
    titleField: field('title'),
    gridWidth: table?.querySelector('thead tr')?.getBoundingClientRect().width || 0,
    sectionWidth: table?.getBoundingClientRect().width || 0,
    ownerField: field('owner'),
    statusField: field('status'),
    heading: heading?.textContent || '',
    inlineCodeText: inlineCode?.textContent || '',
    inlineCodeColor: inlineCode ? getComputedStyle(inlineCode).color : null,
  };
}
"""

DEFERRED_FRONTMATTER_LINK_CHECKS = """
() => {
  const section = document.querySelector('[data-okf-properties]');
  return {
    state: window.visualFrontmatterLinksState || 'missing',
    pending: section ? section.querySelectorAll('[data-okf-link-status="pending"]').length : 0,
    spinners: section ? section.querySelectorAll('.okf-link-spinner').length : 0,
    valid: section ? section.querySelectorAll('[data-okf-link-status="valid"]').length : 0,
    references: section ? section.querySelectorAll('[data-okf-field="references"] .okf-list-preview li').length : 0,
  };
}
"""

SKILL_FRONTMATTER_CHECKS = """
() => {
  const main = document.getElementById('sphinx-myst-preview-content');
  const section = main?.querySelector('[data-okf-properties]');
  const table = section?.querySelector('table.okf-properties');
  const headers = table
    ? [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim())
    : [];
  const metadata = table?.querySelector('tr[data-okf-field="metadata"]');
  const yaml = metadata?.querySelector('pre.okf-value-yaml > code.language-yaml');
  const bounds = table?.getBoundingClientRect();
  const sectionBounds = section?.getBoundingClientRect();
  return {
    tablePresent: Boolean(table),
    schemaFound: section?.getAttribute('data-okf-schema-found') || '',
    headers,
    hasSchemaControls: Boolean(table?.querySelector('select, datalist, [data-okf-enums]')),
    metadataDisplayTag: metadata?.querySelector('[data-okf-value-display]')?.tagName || '',
    metadataCodeClass: yaml?.className || '',
    metadataText: yaml?.textContent || '',
    hasTypeIcons: Boolean(table?.querySelector('.okf-type-icon')),
    metadataEditable: metadata?.getAttribute('data-okf-editable') || '',
    metadataEditCell: Boolean(
      metadata?.querySelector('td[data-okf-value-cell][data-okf-edit-cell="value"]'),
    ),
    heading: main?.querySelector('h1')?.textContent.trim() || '',
    tableBounds: bounds ? { top: bounds.top, bottom: bounds.bottom, width: bounds.width } : null,
    sectionWidth: sectionBounds?.width || null,
  };
}
"""

OKF_SCHEMA_CHECKS = """
() => {
  const main = document.getElementById('sphinx-myst-preview-content');
  const section = main?.querySelector('[data-okf-properties]');
  const schemaFound = section?.getAttribute('data-okf-schema-found');
  const order = section?.getAttribute('data-okf-order');
  const table = section?.querySelector('table.okf-properties');
  const rows = table ? [...table.querySelectorAll('tbody tr')] : [];
  const fields = rows.map((row) => {
    const cells = [...row.querySelectorAll('th, td')];
    const checkbox = cells[1]?.querySelector('input.okf-value-checkbox[type="checkbox"]');
    return {
      name: row.getAttribute('data-okf-field') || cells[0]?.textContent || '',
      value: checkbox ? String(checkbox.checked) : cells[1]?.querySelector('[data-okf-value-display]')?.textContent
        || cells[1]?.textContent || '',
      doc: cells[2]?.textContent || '',
      type: row.getAttribute('data-okf-type') || '',
      icon: Boolean(row.querySelector('.okf-type-icon svg')),
      checkbox: checkbox ? {
        checked: checkbox.checked,
        ariaDisabled: checkbox.getAttribute('aria-disabled'),
      } : null,
      iconSize: (() => {
        const svg = row.querySelector('.okf-type-icon svg');
        if (!svg) return null;
        const r = svg.getBoundingClientRect();
        const th = row.querySelector('th');
        const thR = th ? th.getBoundingClientRect() : null;
        return {
          w: r.width,
          h: r.height,
          em: parseFloat(getComputedStyle(svg).fontSize),
          nameH: thR ? thR.height : null,
        };
      })(),
    };
  }).filter((f) => f.name);
  const titleEl = section?.querySelector('.okf-properties-title');
  const listItem = section?.querySelector('[data-okf-field="derives_from"] .okf-list-preview li');
  const headerCells = table ? [...table.querySelectorAll('thead th')] : [];
  const descriptionHeader = table?.querySelector('thead th:last-child');
  const descriptionCells = table ? [...table.querySelectorAll('tbody td.okf-doc')] : [];
  const docCell = table?.querySelector('td.okf-doc');
  const valueCell = table?.querySelector('tbody td:not(.okf-doc)');
  const missingRequired = section?.querySelector('[data-okf-missing-required]');
  return {
    sectionPresent: Boolean(section),
    schemaFound,
    order,
    fieldCount: fields.length,
    fields,
    titleBackground: titleEl ? getComputedStyle(titleEl).backgroundColor : null,
    listMarker: listItem ? getComputedStyle(listItem, '::before').content : null,
    visibleHeaders: headerCells
      .filter((cell) => getComputedStyle(cell).display !== 'none')
      .map((cell) => {
        const copy = cell.cloneNode(true);
        copy.querySelectorAll('button').forEach((button) => button.remove());
        return copy.textContent?.trim() || '';
      }),
    descriptionHeaderDisplay: descriptionHeader ? getComputedStyle(descriptionHeader).display : null,
    descriptionCellDisplays: descriptionCells.map((cell) => getComputedStyle(cell).display),
    headerBackgrounds: headerCells.map((cell) => getComputedStyle(cell).backgroundColor),
    missingRequiredText: missingRequired?.textContent || null,
    missingRequiredColor: missingRequired ? getComputedStyle(missingRequired).color : null,
    missingRequiredAfterTable: Boolean(
      table && missingRequired
      && (table.compareDocumentPosition(missingRequired) & Node.DOCUMENT_POSITION_FOLLOWING),
    ),
    lean: section ? {
      outerBorder: getComputedStyle(section).borderTopWidth !== '0px' || getComputedStyle(section).borderTopStyle !== 'none',
      outerBackground: getComputedStyle(section).backgroundColor,
      tableBackground: table ? getComputedStyle(table).backgroundColor : null,
      cellBackground: docCell ? getComputedStyle(docCell).backgroundColor : null,
    } : null,
    contrast: titleEl && docCell && valueCell ? {
      titleColor: getComputedStyle(titleEl).color,
      titleBackground: getComputedStyle(titleEl).backgroundColor,
      titleSize: getComputedStyle(titleEl).fontSize,
      docColor: getComputedStyle(docCell).color,
      valueColor: getComputedStyle(valueCell).color,
      docSize: getComputedStyle(docCell).fontSize,
      valueSize: getComputedStyle(valueCell).fontSize,
    } : null,
  };
}
"""


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
            """() => {
              const main = document.getElementById('sphinx-myst-preview-content');
              const last = main.lastElementChild;
              if (last) { last.scrollIntoView({ block: 'end' }); window.scrollBy(0, 40); }
            }"""
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
              data: { type: "sourceScroll", documentId, documentVersion: 1, requestId: 1, line },
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
      const bar = frame.querySelector('.sphinx-preview-edit-palette');
      const barBox = bar ? bar.getBoundingClientRect() : null;
      const margin = bar ? parseFloat(getComputedStyle(bar).marginBottom) || 0 : 0;
      return {
        inset: area.getBoundingClientRect().top - frame.getBoundingClientRect().top
          - (barBox ? barBox.height + margin : 0),
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

def check_diff_toggle(page: Page, toolbar, page_name: str, failures: list[Failure]) -> None:
    """The Diff button is last in row 2, shows both states, and hides with the setting."""
    diff = toolbar.locator('[data-sphinx-preview-diff-toggle]')
    if diff.count() != 1:
        return
    order = toolbar.evaluate(
        """element => [...element.querySelector('[data-sphinx-preview-toolbar-row="view"]').children]
          .map(item => item.getAttribute('aria-label'))"""
    )
    if not order or order[-1] != "Hide changes since last commit":
        failures.append(Failure(page_name, f"the Diff button is not the last of row 2: {order}"))
    root = "document.documentElement.getAttribute('data-sphinx-preview-incoming')"
    try:
        if diff.get_attribute("aria-pressed") != "true" or page.evaluate(root) != "on":
            failures.append(Failure(page_name, "the Diff button must start pressed"))
        pressed = diff.evaluate("element => getComputedStyle(element).backgroundColor")
        diff.click()
        page.wait_for_timeout(100)
        if diff.get_attribute("aria-pressed") != "false" or page.evaluate(root) != "off":
            failures.append(Failure(page_name, "the Diff button did not switch the marks off"))
        if diff.get_attribute("data-tooltip") != "Show changes since last commit":
            failures.append(Failure(page_name, "the unpressed Diff button has the wrong tooltip"))
        unpressed = diff.evaluate("element => getComputedStyle(element).backgroundColor")
        if pressed == unpressed:
            failures.append(Failure(page_name, "the Diff button looks the same pressed and unpressed"))
        hidden = page.evaluate(
            """() => {
              document.documentElement.setAttribute('data-okf-incoming-changes', 'false');
              const hidden = getComputedStyle(document.querySelector('[data-sphinx-preview-diff-toggle]')).display === 'none';
              document.documentElement.removeAttribute('data-okf-incoming-changes');
              return hidden;
            }"""
        )
        if not hidden:
            failures.append(Failure(page_name, "the Diff button stays visible when the setting is off"))
    finally:
        if diff.get_attribute("aria-pressed") != "true":
            diff.click()
            page.wait_for_timeout(100)


def check_preview_toolbar(page: Page, scenario: dict, failures: list[Failure]) -> None:
    page_name = scenario["page"]
    toolbar = page.locator('[data-sphinx-preview-toolbar][role="toolbar"]')
    if toolbar.count() != 1:
        failures.append(Failure(page_name, "preview toolbar is missing or duplicated"))
        return
    controls = (
        ('[data-sphinx-preview-refresh]', "Refresh preview"),
        ('[data-sphinx-preview-anchor]', "Anchor preview to text editor"),
        ('[data-sphinx-preview-edit-toggle]', "Toggle edit mode"),
        ('[data-sphinx-preview-theme-toggle]',
         "Preview theme: Cream theme" if scenario.get("previewThemeMode") == "cream"
         else "Preview theme: Current theme"),
    )
    for selector, label in controls:
        button = toolbar.locator(selector)
        if button.count() != 1 or button.get_attribute("aria-label") != label:
            failures.append(Failure(page_name, f"toolbar control is missing or mislabeled: {label}"))
        elif button.is_hidden():
            failures.append(Failure(page_name, f"toolbar control is hidden: {label}"))
    for selector, label in (
        ('[data-sphinx-preview-zoom-out]', "Zoom out"),
        ('[data-sphinx-preview-zoom-in]', "Zoom in"),
        ('[data-sphinx-preview-width-toggle]', "Width: Margin"),
        ('[data-sphinx-preview-diff-toggle]', "Hide changes since last commit"),
    ):
        button = toolbar.locator(selector)
        if button.count() != 1 or button.get_attribute("aria-label") != label:
            failures.append(Failure(page_name, f"toolbar control is missing or mislabeled: {label}"))
        elif button.is_hidden():
            failures.append(Failure(page_name, f"toolbar control is hidden: {label}"))
    rows = toolbar.evaluate(
        """element => [...element.children].map(child => ({
          row: child.getAttribute('data-sphinx-preview-toolbar-row'),
          buttons: [...child.children].filter(item => item.tagName === 'BUTTON').length,
          rect: (({top, bottom, left, right}) => ({top, bottom, left, right}))(child.getBoundingClientRect()),
        }))"""
    )
    expected_main = 4 if toolbar.locator('[data-sphinx-preview-edit-toggle]').count() else 3
    if [row["row"] for row in rows] != ["main", "view"]:
        failures.append(Failure(page_name, f"toolbar is not two rows (main, view): {rows}"))
        return
    if rows[0]["buttons"] != expected_main:
        failures.append(Failure(page_name, f"toolbar row 1 does not hold {expected_main} buttons: {rows[0]['buttons']}"))
    if rows[1]["buttons"] != 7:
        failures.append(Failure(page_name, f"toolbar row 2 does not hold 7 buttons: {rows[1]['buttons']}"))
    check_diff_toggle(page, toolbar, page_name, failures)
    if rows[0]["rect"]["bottom"] > rows[1]["rect"]["top"] + 0.5:
        failures.append(Failure(page_name, "toolbar rows overlap"))
    # At the zoom limits the toolbar stays put and covers neither the sticky band text nor the page.
    zoom_in = toolbar.locator('[data-sphinx-preview-zoom-in]')
    zoom_out = toolbar.locator('[data-sphinx-preview-zoom-out]')
    try:
        for target, button in ((70, zoom_out), (200, zoom_in)):
            for _ in range(14):
                if button.is_disabled():
                    break
                button.click()
            # Let the runtime re-apply the reading line before the next click or scroll.
            page.wait_for_timeout(150)
            zoom = page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-zoom')")
            if zoom != str(target):
                failures.append(Failure(page_name, f"zoom did not reach {target} %: {zoom}"))
                continue
            if not button.is_disabled():
                failures.append(Failure(page_name, f"the zoom button is not disabled at {target} %"))
            geometry = page.evaluate(
                """() => {
                  const toolbar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();
                  const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
                  let bandOverlap = false;
                  if (band && !band.hidden) {
                    const range = document.createRange();
                    range.selectNodeContents(band);
                    for (const rect of range.getClientRects()) {
                      if (rect.width > 0 && rect.left < toolbar.right && rect.right > toolbar.left
                        && rect.top < toolbar.bottom && rect.bottom > toolbar.top) bandOverlap = true;
                    }
                  }
                  return {
                    bandOverlap,
                    inside: toolbar.left >= 0 && toolbar.right <= innerWidth && toolbar.top >= 0,
                  };
                }"""
            )
            if geometry["bandOverlap"]:
                failures.append(Failure(page_name, f"toolbar overlaps the sticky heading band at {target} %"))
            if not geometry["inside"]:
                failures.append(Failure(page_name, f"toolbar leaves the viewport at {target} %"))
    finally:
        for _ in range(14):
            current = int(page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-zoom')"))
            if current == 100:
                break
            (zoom_out if current > 100 else zoom_in).click()
        page.wait_for_timeout(150)

def check_nested_list_typing(page: Page, scenario: dict, failures: list[Failure]) -> None:
  if not scenario.get("listTypingChecks"):
    return
  page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.get_by_text("jira-skill", exact=True).click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  original = editor.input_value()
  editor.evaluate("element => element.setSelectionRange(element.value.length, element.value.length)")
  expected = original
  for _ in range(6):
    editor.press("Space")
    expected += " "
    if editor.input_value() != expected:
      failures.append(Failure(scenario["page"], "repeated Space changed or replaced literal Markdown spaces"))
      return
  editor.press("Enter")
  expected += "\n  - "
  if editor.input_value() != expected:
    failures.append(Failure(scenario["page"], "Enter did not continue the current list line with its indentation and marker"))
  editor.press_sequentially("`new-skill`")
  expected += "`new-skill`"
  if editor.input_value() != expected:
    failures.append(Failure(scenario["page"], "Enter or subsequent typing did not preserve exact Markdown"))
  state = editor.evaluate("""element => ({
    focused: document.activeElement === element,
    start: element.selectionStart, end: element.selectionEnd,
    autocorrect: element.getAttribute('autocorrect'),
  })""")
  if not state["focused"] or state["start"] != len(expected) or state["end"] != len(expected):
    failures.append(Failure(scenario["page"], "list typing lost focus or moved the caret unexpectedly"))
  if state["autocorrect"] != "off":
    failures.append(Failure(scenario["page"], "Markdown editor did not disable text autocorrection"))
  page.wait_for_timeout(600)  # autosave is debounced (400 ms)
  saved = page.evaluate("window.visualMessages.filter(message => message.type === 'previewEditSave').at(-1)?.editedText")
  if saved != expected + "\n":
    failures.append(Failure(scenario["page"], "nested list autosave did not retain spaces and newline exactly"))


def check_editor_keyboard(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Up/Down on wrapped lines stay in the editor, * wraps a selection, and native undo works."""
  if not scenario.get("editorKeyboardChecks"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  if page.locator("html").get_attribute("data-sphinx-preview-edit-mode") != "on":
    page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.locator("main p", has_text="Wrapped paragraphs keep").click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  original = editor.input_value()
  opens = lambda: page.evaluate("window.visualMessages.filter(m => m.type === 'previewEditOpen').length")
  opened = opens()
  # A: put the caret on the second visual line with a real click, then press ArrowUp.
  metrics = editor.evaluate("""element => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { x: box.x, y: box.y, paddingTop: parseFloat(style.paddingTop),
      paddingLeft: parseFloat(style.paddingLeft),
      lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
      height: box.height };
  }""")
  if metrics["height"] < metrics["lineHeight"] * 3:
    failures.append(Failure(page_name, f"the long paragraph does not wrap onto 3+ lines: {metrics}"))
    return
  page.mouse.click(metrics["x"] + metrics["paddingLeft"] + 30,
                   metrics["y"] + metrics["paddingTop"] + metrics["lineHeight"] * 1.5)
  second_line_caret = editor.evaluate("element => element.selectionStart")
  if second_line_caret <= 0:
    failures.append(Failure(page_name, "clicking the second visual line left the caret at the start"))
  page.keyboard.press("ArrowUp")
  first_line_caret = editor.evaluate("element => element.selectionStart")
  if page.locator('textarea[aria-label="Raw Markdown block"]').count() != 1 or opens() != opened:
    failures.append(Failure(page_name, "ArrowUp on the second visual line left the block editor"))
  elif editor.input_value() != original or not (0 <= first_line_caret < second_line_caret):
    failures.append(Failure(page_name, f"ArrowUp did not move the caret up a visual line: {second_line_caret} -> {first_line_caret}"))
  else:
    page.keyboard.press("ArrowDown")
    if editor.evaluate("element => element.selectionStart") <= first_line_caret or opens() != opened:
      failures.append(Failure(page_name, "ArrowDown on the first visual line did not move down within the editor"))
  # Real-layout probe checks: a word that wraps whole onto line 2 must not make the caret look
  # like it is on line 1, and a caret on a trailing empty line is on the last visual line only.
  line_two = page.evaluate("""() => {
    const element = document.querySelector('textarea[aria-label="Raw Markdown block"]');
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return { x: box.x + parseFloat(style.paddingLeft) + 1,
      y: box.y + parseFloat(style.paddingTop) + (parseFloat(style.lineHeight) || 20) * 1.5 };
  }""")
  page.mouse.click(line_two["x"], line_two["y"])
  line_two_start = editor.evaluate("element => element.selectionStart")
  word_end = original.find(" ", line_two_start)
  if line_two_start <= 0 or word_end - line_two_start < 4:
    failures.append(Failure(page_name, f"could not find a word starting line 2: {line_two_start}, {word_end}"))
  else:
    for offset in (1, 2, word_end - line_two_start - 1):
      editor.evaluate("(element, at) => element.setSelectionRange(at, at)", line_two_start + offset)
      page.keyboard.press("ArrowUp")
      stayed = page.locator('textarea[aria-label="Raw Markdown block"]').count() == 1 and opens() == opened
      moved = editor.evaluate("element => element.selectionStart") < line_two_start + offset
      if not (stayed and moved):
        failures.append(Failure(page_name, f"ArrowUp inside the first word of line 2 (+{offset}) left the editor or did not move the caret"))
  editor.evaluate("element => element.setSelectionRange(element.value.length, element.value.length)")
  page.keyboard.press("Enter")
  page.keyboard.press("ArrowUp")
  if (page.locator('textarea[aria-label="Raw Markdown block"]').count() != 1 or opens() != opened
      or editor.evaluate("element => element.selectionStart") >= len(original) + 1):
    failures.append(Failure(page_name, "ArrowUp from the empty line after a trailing newline left the editor"))
  page.keyboard.press("Escape")
  page.locator("main p", has_text="Wrapped paragraphs keep").click()
  editor.wait_for(state="visible")
  if editor.input_value() != original:
    failures.append(Failure(page_name, "Escape after the probe checks did not restore the paragraph"))
    return
  # The first visual line still hands over to the previous block.
  editor.evaluate("element => element.setSelectionRange(0, 0)")
  page.keyboard.press("ArrowUp")
  page.wait_for_function(
    "count => window.visualMessages.filter(m => m.type === 'previewEditOpen').length > count", arg=opened)
  if "earlier paragraph" not in page.locator('textarea[aria-label="Raw Markdown block"]').input_value():
    failures.append(Failure(page_name, "ArrowUp on the first visual line did not open the previous block"))
  page.keyboard.press("Escape")
  page.locator("main p", has_text="Wrapped paragraphs keep").click()
  editor = page.locator('textarea[aria-label="Raw Markdown block"]')
  editor.wait_for(state="visible")
  if editor.input_value() != original:
    failures.append(Failure(page_name, "reopening the long paragraph did not restore its text"))
    return
  # C: select the first word and type * twice with the real keyboard.
  editor.evaluate("element => { element.focus(); element.setSelectionRange(0, 7); }")
  page.keyboard.type("*")
  page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-selected.png"), caret="hide")
  if not editor.input_value().startswith("*Wrapped* "):
    failures.append(Failure(page_name, f"typing * on a selection did not wrap it: {editor.input_value()[:20]!r}"))
  page.keyboard.type("*")
  value = editor.input_value()
  selection = editor.evaluate("element => [element.selectionStart, element.selectionEnd]")
  if not value.startswith("**Wrapped** ") or selection != [2, 9]:
    failures.append(Failure(page_name, f"second * did not give **Wrapped** with the word selected: {value[:20]!r} {selection}"))
  # B: the native undo reverts the two wraps, redo applies them again.
  undo = "Meta+Z" if sys.platform == "darwin" else "Control+Z"
  redo = "Meta+Shift+Z" if sys.platform == "darwin" else "Control+Shift+Z"
  page.keyboard.press(undo)
  page.keyboard.press(undo)
  if editor.input_value() != original:
    failures.append(Failure(page_name, f"undo did not restore the paragraph text: {editor.input_value()[:24]!r}"))
  page.keyboard.press(redo)
  page.keyboard.press(redo)
  if not editor.input_value().startswith("**Wrapped** "):
    failures.append(Failure(page_name, f"redo did not reapply the wraps: {editor.input_value()[:24]!r}"))


def check_insert_after_figure(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The + after a figure that ends the document opens an empty editor after the closing fence."""
  if not scenario.get("insertAfterFigureChecks"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  block = scenario.get("insertAfterBlock") or {"selector": "main figure[data-sphinx-source-line]", "line": 9}
  figure = page.locator(block["selector"])
  if figure.count() != 1:
    failures.append(Failure(page_name, f"expected one mapped block, found {figure.count()}"))
    return
  figure.scroll_into_view_if_needed()
  figure.hover()
  point = figure.locator("xpath=following-sibling::*[1][contains(@class, 'sphinx-preview-insert-point')]")
  if point.count() != 1:
    failures.append(Failure(page_name, "no insertion point follows the final figure"))
    return
  point.locator("button[aria-label='Insert a block here']").click()
  editor = page.locator(".sphinx-preview-block-editor textarea")
  editor.wait_for(state="visible")
  opened = page.evaluate(
    "window.visualMessages.filter(m => m.type === 'previewEditOpen' && m.insertAfterLine !== undefined).at(-1)")
  # Figure fixture: lines 5-9, line 9 is the closing colon fence; image fixture: line 5.
  if not opened or opened.get("insertAfterLine") != block["line"]:
    failures.append(Failure(page_name, f"insertion did not carry the block's last line {block['line']}: {opened}"))
  if editor.input_value() != "":
    failures.append(Failure(page_name, "the new block editor is not empty"))
  below = page.evaluate("""selector => {
    const figure = document.querySelector(selector).getBoundingClientRect();
    const editor = document.querySelector('.sphinx-preview-block-editor').getBoundingClientRect();
    return editor.top >= figure.bottom - 1;
  }""", block["selector"])
  if not below:
    failures.append(Failure(page_name, "the new block editor is not below the figure"))


TOP_SPACING_MINIMUM = 20


def check_top_spacing(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The first block's editor frame and the Start writing button keep room above them."""
  mode = scenario.get("topSpacingChecks")
  if not mode:
    return
  page_name = scenario["page"]
  if mode == "empty-open":
    if page.locator(".sphinx-preview-block-editor").count() != 0:
      failures.append(Failure(page_name, "an editor was open before Enter was pressed"))
    # The edit toggle holds the focus after it was clicked; Enter belongs to the preview itself.
    page.mouse.click(300, 700)
    page.keyboard.press("Enter")
    page.locator(".sphinx-preview-block-editor textarea").wait_for(state="visible", timeout=2000)
    opened = page.evaluate(
      "window.visualMessages.filter(m => m.type === 'previewEditOpen').at(-1)")
    if not opened or opened.get("insertAfterLine") != 0:
      failures.append(Failure(page_name, f"Enter did not open the new-block editor: {opened}"))
    if page.locator(".sphinx-preview-insert-point--start button").is_visible():
      failures.append(Failure(page_name, "Start writing is still visible under the open editor"))
    if not page.evaluate(
      "() => document.activeElement === document.querySelector('.sphinx-preview-block-editor textarea')"
    ):
      failures.append(Failure(page_name, "the new-block editor does not hold the focus"))
    selector = ".sphinx-preview-block-editor"
  elif mode == "empty-start":
    selector = ".sphinx-preview-insert-point--start button"
  else:
    selector = ".sphinx-preview-block-editor"
  target = page.locator(selector)
  if target.count() != 1 or not target.is_visible():
    failures.append(Failure(page_name, f"{selector} is not visible exactly once"))
    return
  geometry = target.evaluate("""element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const outline = style.outlineStyle === 'none' ? 0
      : (parseFloat(style.outlineWidth) || 0) + (parseFloat(style.outlineOffset) || 0);
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const bar = toolbar ? toolbar.getBoundingClientRect() : null;
    const overlaps = bar !== null
      && rect.left < bar.right && rect.right > bar.left && rect.top < bar.bottom && rect.bottom > bar.top;
    return { top: rect.top + window.scrollY - Math.max(0, outline), overlaps };
  }""")
  if geometry["top"] < TOP_SPACING_MINIMUM:
    failures.append(Failure(
      page_name,
      f"{selector} starts {geometry['top']:.1f}px from the top, expected at least {TOP_SPACING_MINIMUM}px",
    ))
  if geometry["overlaps"]:
    failures.append(Failure(page_name, f"{selector} overlaps the floating toolbar"))


def check_width_modes(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The Width button cycles margin, auto and full; only Auto lets wide blocks leave the column."""
  if not scenario.get("widthModeChecks"):
    return
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-width-toggle]")
  if button.count() != 1:
    failures.append(Failure(page_name, "the Width button is missing"))
    return
  measure = """() => {
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    const columnLeft = box.left + parseFloat(style.paddingLeft);
    const columnRight = box.right - parseFloat(style.paddingRight);
    const pane = document.documentElement.clientWidth;
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; };
    const tables = [...content.querySelectorAll(':scope > table')].map(rect);
    const figures = [...content.querySelectorAll(':scope > figure')];
    const figure = figures[0];
    const narrow = figures[1];
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    const captionOf = box => {
      const caption = box && box.querySelector('figcaption p, figcaption, :scope > p:last-child');
      if (!caption) return null;
      const range = document.createRange();
      range.selectNodeContents(caption);
      const r = range.getBoundingClientRect();
      return { centre: (r.left + r.right) / 2, align: getComputedStyle(caption).textAlign };
    };
    const imageOf = box => { const i = box && box.querySelector('img'); return i ? rect(i) : null; };
    return {
      narrowFigure: narrow ? { ...rect(narrow), image: imageOf(narrow), caption: captionOf(narrow) } : null,
      mode: document.documentElement.getAttribute('data-sphinx-preview-width'),
      columnLeft, columnRight, pane,
      tables,
      figure: figure ? rect(figure) : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bandPadding: band ? parseFloat(getComputedStyle(band).paddingLeft) : 0,
    };
  }"""
  def settle() -> None:
    page.wait_for_timeout(250)
  try:
    seen = {}
    for expected in ("margin", "auto", "full"):
      for _ in range(3):
        if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == expected:
          break
        button.click()
        settle()
      state = page.evaluate(measure)
      seen[expected] = state
      if state["mode"] != expected:
        failures.append(Failure(page_name, f"the Width button did not reach {expected}: {state['mode']}"))
        continue
      if state["overflowX"] > 1:
        failures.append(Failure(page_name, f"{expected}: horizontal page scroll of {state['overflowX']}px"))
      if len(state["tables"]) < 2:
        failures.append(Failure(page_name, "the fixture tables are missing"))
        continue
      small, wide = state["tables"][0], state["tables"][1]
      column = state["columnRight"] - state["columnLeft"]
      inside = lambda r: r["left"] >= state["columnLeft"] - 1.5 and r["right"] <= state["columnRight"] + 1.5
      if not inside(small):
        failures.append(Failure(page_name, f"{expected}: the small table leaves the column"))
      gutter_ok = lambda r: r["left"] >= 15 and r["right"] <= state["pane"] - 15
      # U22: a table or figure narrower than the column is centred on it, at its own width.
      column_centre = (state["columnLeft"] + state["columnRight"]) / 2
      if small["width"] < column - 20 and abs((small["left"] + small["right"]) / 2 - column_centre) > 2:
        failures.append(Failure(page_name, f"{expected}: the narrow table is not centred in the column"))
      narrow_figure = state["narrowFigure"]
      if not narrow_figure or not narrow_figure["image"]:
        failures.append(Failure(page_name, "the narrow figure is missing"))
      else:
        picture = narrow_figure["image"]
        if picture["width"] > column - 20:
          failures.append(Failure(page_name, f"{expected}: the narrow figure fills the column ({picture['width']:.0f}px)"))
        elif abs(picture["left"] - state["columnLeft"] - (state["columnRight"] - picture["right"])) > 2:
          failures.append(Failure(page_name, f"{expected}: the narrow figure is not centred (gaps {picture['left'] - state['columnLeft']:.1f} and {state['columnRight'] - picture['right']:.1f}px)"))
        caption = narrow_figure["caption"]
        if not caption or caption["align"] != "center" or abs(caption["centre"] - (picture["left"] + picture["right"]) / 2) > 2:
          failures.append(Failure(page_name, f"{expected}: the narrow figure caption is not centred under it"))
      if expected == "margin":
        if not inside(wide):
          failures.append(Failure(page_name, "margin: the wide table leaves the column"))
        if state["figure"] and not inside(state["figure"]):
          failures.append(Failure(page_name, "margin: the figure leaves the column"))
      if expected == "auto":
        if state["pane"] - 32 > column + 4:
          if wide["width"] <= column + 4:
            failures.append(Failure(page_name, f"auto: the wide table did not break out ({wide['width']:.0f}px, column {column:.0f}px)"))
          if not gutter_ok(wide):
            failures.append(Failure(page_name, "auto: the wide table leaves the pane gutters"))
          if abs((wide["left"] + wide["right"]) / 2 - state["pane"] / 2) > 3:
            failures.append(Failure(page_name, "auto: the wide table is not centred on the pane"))
          if state["figure"] and state["figure"]["width"] <= column + 4:
            failures.append(Failure(page_name, "auto: the wide figure did not break out"))
          if state["figure"] and not gutter_ok(state["figure"]):
            failures.append(Failure(page_name, "auto: the wide figure leaves the pane gutters"))
      if expected == "full":
        if abs(column - (state["pane"] - 2 * (state["columnLeft"] - 0))) > 40 and column < state["pane"] - 80:
          failures.append(Failure(page_name, f"full: the column ({column:.0f}px) does not span the pane ({state['pane']}px)"))
    margin, full = seen.get("margin"), seen.get("full")
    if margin and full and (full["columnRight"] - full["columnLeft"]) + 1 < (margin["columnRight"] - margin["columnLeft"]):
      failures.append(Failure(page_name, "full: the column is narrower than in margin"))
  finally:
    for _ in range(3):
      if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == "margin":
        break
      button.click()
      page.wait_for_timeout(150)


def apply_width_shot(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Leaves the page in the width mode the screenshot is meant to show (README capture)."""
  wanted = scenario.get("widthModeShot")
  if not wanted:
    return
  button = page.locator("[data-sphinx-preview-width-toggle]")
  for _ in range(3):
    if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == wanted:
      break
    button.click()
    page.wait_for_timeout(250)
  state = page.evaluate("""() => {
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    const column = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; };
    return { column, pane: document.documentElement.clientWidth,
      table: rect(content.querySelector(':scope > table')), figure: rect(content.querySelector(':scope > figure')) };
  }""")
  wrapped = page.evaluate("""() => [...document.querySelectorAll('#sphinx-myst-preview-content > table :where(th, td)')].filter(cell => {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const style = getComputedStyle(cell);
    const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
    return range.getBoundingClientRect().height > line * 1.4;
  }).map(cell => cell.textContent)""")
  if wrapped:
    failures.append(Failure(scenario["page"], f"{wanted}: the table fits the pane but cells wrap: {wrapped[:4]}"))
  for name in ("table", "figure"):
    item = state[name]
    if item["width"] <= state["column"] + 4:
      failures.append(Failure(scenario["page"], f"{wanted}: the {name} did not break out of the column"))
    if abs((item["left"] + item["right"]) / 2 - state["pane"] / 2) > 3:
      failures.append(Failure(scenario["page"], f"{wanted}: the {name} is not centred on the pane"))


def check_toc_column(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The TOC button opens a right column below the toolbar; wide panes only."""
  if not scenario.get("tocChecks"):
    return
  page_name = scenario["page"]
  toggle = page.locator("[data-sphinx-preview-toc-toggle]")
  if toggle.count() != 1:
    failures.append(Failure(page_name, "the TOC button is missing"))
    return
  measure = """() => {
    const root = document.documentElement;
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
    const nav = document.querySelector('nav[data-sphinx-preview-toc]');
    const content = document.getElementById('sphinx-myst-preview-content');
    const style = getComputedStyle(content);
    const box = content.getBoundingClientRect();
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
    return {
      state: root.getAttribute('data-sphinx-preview-toc'),
      shown: !!nav && getComputedStyle(nav).display !== 'none',
      nav: nav ? rect(nav) : null,
      toolbar: rect(toolbar),
      contentRight: box.right,
      pane: root.clientWidth,
      columnLeft: box.left + parseFloat(style.paddingLeft),
      columnRight: box.right - parseFloat(style.paddingRight),
      tables: [...content.querySelectorAll(':scope > table')].map(rect),
      entries: [...document.querySelectorAll('nav[data-sphinx-preview-toc] li[data-level]')].map(item => ({ level: item.getAttribute('data-level'), text: item.textContent })),
      bandRight: band && !band.hidden ? band.getBoundingClientRect().right : null,
      overflowX: root.scrollWidth - root.clientWidth,
      scrollY: window.scrollY,
    };
  }"""
  wide_pane = scenario["width"] >= 760
  try:
    page.evaluate("window.scrollTo(0, 0)")
    closed = page.evaluate(measure)
    if closed["state"] != "closed" or closed["shown"]:
      failures.append(Failure(page_name, f"the TOC must start closed: {closed['state']}"))
    toggle.click()
    page.wait_for_timeout(300)
    opened = page.evaluate(measure)
    if opened["state"] != "open":
      failures.append(Failure(page_name, "the TOC button did not open the column"))
      return
    if not wide_pane:
      if opened["shown"]:
        failures.append(Failure(page_name, "the TOC column must be hidden on a pane under 760px"))
      if abs(opened["contentRight"] - closed["contentRight"]) > 1:
        failures.append(Failure(page_name, "a hidden TOC column must not narrow the content"))
      if toggle.get_attribute("aria-pressed") != "true":
        failures.append(Failure(page_name, "the TOC button must still reflect the preference"))
      return
    if not opened["shown"] or not opened["nav"]:
      failures.append(Failure(page_name, "the TOC column is not shown on a wide pane"))
      return
    nav = opened["nav"]
    if nav["top"] < opened["toolbar"]["bottom"] + 7:
      failures.append(Failure(page_name, f"the TOC column starts at {nav['top']:.0f}px, under the toolbar bottom {opened['toolbar']['bottom']:.0f}px"))
    if nav["right"] > opened["pane"] + 1 or nav["left"] < opened["columnRight"]:
      failures.append(Failure(page_name, "the TOC column overlaps the content column"))
    for table in opened["tables"]:
      if table["right"] > nav["left"] + 1:
        failures.append(Failure(page_name, "the TOC column overlaps a table"))
    if opened["bandRight"] is not None and opened["bandRight"] > nav["left"] + 1:
      failures.append(Failure(page_name, "the sticky heading band runs under the TOC column"))
    if opened["overflowX"] > 1:
      failures.append(Failure(page_name, f"horizontal page scroll of {opened['overflowX']}px with the TOC open"))
    levels = sorted({entry["level"] for entry in opened["entries"]})
    if levels != ["1", "2", "3", "4"]:
      failures.append(Failure(page_name, f"the TOC lists levels {levels}, expected 1 to 4"))
    if any("Too deep" in entry["text"] for entry in opened["entries"]):
      failures.append(Failure(page_name, "the TOC lists an h5"))
    width_button = page.locator("[data-sphinx-preview-width-toggle]")
    for expected in ("auto", "full"):
      for _ in range(3):
        if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == expected:
          break
        width_button.click()
        page.wait_for_timeout(250)
      state = page.evaluate(measure)
      nav = state["nav"]
      if state["overflowX"] > 1:
        failures.append(Failure(page_name, f"{expected}: horizontal page scroll of {state['overflowX']}px with the TOC open"))
      if state["columnRight"] > nav["left"] + 1:
        failures.append(Failure(page_name, f"{expected}: the content column runs under the TOC column"))
      for table in state["tables"]:
        if table["right"] > nav["left"] + 1:
          failures.append(Failure(page_name, f"{expected}: a table runs under the TOC column"))
        # U22: in Auto a table wider than the column is centred on the area left of the TOC column.
        if expected == "auto" and table["width"] > state["columnRight"] - state["columnLeft"] + 4:
          if abs((table["left"] + table["right"]) / 2 - nav["left"] / 2) > 3:
            failures.append(Failure(page_name, "auto: the wide table is not centred on the area left of the TOC column"))
          if table["left"] < 15:
            failures.append(Failure(page_name, "auto: the wide table leaves the pane on the left"))
    for _ in range(3):
      if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == "margin":
        break
      width_button.click()
      page.wait_for_timeout(150)
    zoom_in = page.locator("[data-sphinx-preview-zoom-in]")
    for _ in range(10):
      if zoom_in.is_enabled():
        zoom_in.click()
    page.wait_for_timeout(300)
    zoomed = page.evaluate(measure)
    if zoomed["nav"] and (zoomed["columnRight"] > zoomed["nav"]["left"] + 1 or zoomed["overflowX"] > 1):
      failures.append(Failure(page_name, "zoom 200%: the content overlaps the TOC column or scrolls horizontally"))
    zoom_out = page.locator("[data-sphinx-preview-zoom-out]")
    for _ in range(10):
      if zoom_out.is_enabled():
        zoom_out.click()
    page.wait_for_timeout(200)
    for _ in range(3):
      if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-zoom')") == "100":
        break
      zoom_in.click()
    page.wait_for_timeout(200)
    page.evaluate("window.scrollTo(0, 0)")
    before = page.evaluate("window.scrollY")
    page.locator("nav[data-sphinx-preview-toc] li[data-level] button:not([data-sphinx-preview-toc-twisty])").nth(8).click()
    page.wait_for_timeout(400)
    after = page.evaluate(measure)
    if after["scrollY"] <= before + 50:
      failures.append(Failure(page_name, "clicking a TOC entry did not scroll to its heading"))
    current = page.evaluate("""() => {
      const nav = document.querySelector('nav[data-sphinx-preview-toc]');
      const marked = [...nav.querySelectorAll('[aria-current="location"]')];
      if (marked.length !== 1) return { count: marked.length };
      const button = marked[0];
      const parse = value => (value.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = rgb => {
        const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const text = parse(getComputedStyle(button).color);
      const base = parse(getComputedStyle(nav).backgroundColor);
      // The highlight is a 14 % tint of the text colour over the column background.
      const tinted = base.map((v, i) => v * 0.86 + text[i] * 0.14);
      const hi = Math.max(luminance(text), luminance(tinted)) + 0.05;
      const lo = Math.min(luminance(text), luminance(tinted)) + 0.05;
      const box = button.getBoundingClientRect();
      const area = nav.getBoundingClientRect();
      return { count: 1, contrast: hi / lo, visible: box.top >= area.top - 1 && box.bottom <= area.bottom + 1 };
    }""")
    if current["count"] != 1:
      failures.append(Failure(page_name, f"the TOC must mark exactly one current entry, found {current['count']}"))
    else:
      if current["contrast"] < 4.5:
        failures.append(Failure(page_name, f"the current TOC entry contrast is {current['contrast']:.2f}, expected at least 4.5"))
      if not current["visible"]:
        failures.append(Failure(page_name, "the current TOC entry is scrolled out of the TOC column"))
    twisty = page.locator("nav[data-sphinx-preview-toc] button[data-sphinx-preview-toc-twisty]").first
    if twisty.count():
      twisty.click()
      page.wait_for_timeout(100)
      folded = page.evaluate("document.querySelectorAll('nav[data-sphinx-preview-toc] li[hidden]').length")
      twisty.click()
      page.wait_for_timeout(100)
      unfolded = page.evaluate("document.querySelectorAll('nav[data-sphinx-preview-toc] li[hidden]').length")
      if folded < 1 or unfolded != 0:
        failures.append(Failure(page_name, f"a TOC twisty must hide and show its sub-entries ({folded} hidden, then {unfolded})"))
  finally:
    if toggle.get_attribute("aria-pressed") == "true":
      toggle.click()
      page.wait_for_timeout(150)
    page.evaluate("window.scrollTo(0, 0)")


def check_figure_anchors(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Figure width and alignment follow data-okf-width and the align class; label anchors are visible and targetable."""
  if not scenario.get("figureAnchorChecks"):
    return
  page_name = scenario["page"]
  found = page.evaluate("""() => {
    const root = document.querySelector('#sphinx-myst-preview-content');
    const rect = (element) => { const box = element.getBoundingClientRect(); return {left: box.left, right: box.right, top: box.top + scrollY, bottom: box.bottom + scrollY, width: box.width}; };
    const column = rect(root);
    const padding = parseFloat(getComputedStyle(root).paddingLeft) || 0;
    const content = {left: column.left + padding, right: column.right - (parseFloat(getComputedStyle(root).paddingRight) || 0)};
    const half = root.querySelector('figure#fig-half');
    const right = [...root.querySelectorAll('figure')].find(figure => figure.classList.contains('align-right'));
    const wrapped = right ? right.nextElementSibling : null;
    const anchor = (label) => {
      const span = root.querySelector('.okf-anchor[data-okf-label="' + label + '"]');
      if (!span) return null;
      const box = span.getBoundingClientRect();
      const style = getComputedStyle(span, '::before');
      return {
        visible: box.width > 0 && box.height > 0, left: box.left, right: box.right, top: box.top + scrollY,
        title: span.getAttribute('title'), id: span.id, icon: style.content,
        host: span.parentElement.tagName.toLowerCase() + (span.parentElement.className ? '.' + span.parentElement.className : ''),
        hostLeft: span.parentElement.getBoundingClientRect().left,
        hostTop: span.parentElement.getBoundingClientRect().top + scrollY,
        hostText: span.parentElement.textContent.trim().slice(0, 20),
        opacity: getComputedStyle(span).opacity,
      };
    };
    return {
      content,
      half: half ? {figure: rect(half), image: rect(half.querySelector('img')), width: half.querySelector('img').style.width} : null,
      right: right ? {figure: rect(right), image: rect(right.querySelector('img')), float: getComputedStyle(right).cssFloat, width: right.style.width} : null,
      wrapped: wrapped ? rect(wrapped) : null,
      anchors: {intro: anchor('intro'), sized: anchor('sized-title'), steps: anchor('steps'), code: anchor('note-code'), last: anchor('last-label')},
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ids: [...root.querySelectorAll('[id]')].map(e => e.id).filter((id, i, all) => all.indexOf(id) !== i),
      sizedHeading: root.querySelector('h2#sized-title') ? root.querySelector('h2#sized-title').textContent : null,
    };
  }""")
  content = found["content"]
  column_width = content["right"] - content["left"]
  half = found["half"]
  if not half or abs(half["image"]["width"] - column_width * 0.5) > 2:
    failures.append(Failure(page_name, f"the 50 % figure image is not half the column: {half and half['image']['width']} of {column_width}"))
  elif abs((half["image"]["left"] + half["image"]["right"]) / 2 - (content["left"] + content["right"]) / 2) > 2:
    failures.append(Failure(page_name, "the 50 % figure is not centred"))
  right = found["right"]
  if not right or right["float"] != "right":
    failures.append(Failure(page_name, f"the right-aligned figure does not float right: {right}"))
  else:
    if abs(right["figure"]["width"] - column_width * 0.4) > 2 or abs(right["image"]["width"] - right["figure"]["width"]) > 2:
      failures.append(Failure(page_name, f"the right figure is not 40 % of the column: {right['figure']['width']} of {column_width}"))
    if abs(right["figure"]["right"] - content["right"]) > 2:
      failures.append(Failure(page_name, "the right figure does not touch the right edge of the column"))
    wrapped = found["wrapped"]
    if not wrapped or wrapped["top"] > right["figure"]["bottom"] - 2:
      failures.append(Failure(page_name, "the paragraph after the right figure does not wrap beside it"))
  anchors = found["anchors"]
  for name, anchor in anchors.items():
    if not anchor or not anchor["visible"]:
      failures.append(Failure(page_name, f"the {name} anchor icon is missing or invisible: {anchor}"))
      continue
    if anchor["title"] != "Anchor: " + {"intro": "intro", "sized": "sized-title", "steps": "steps", "code": "note-code", "last": "last-label"}[name]:
      failures.append(Failure(page_name, f"the {name} anchor tooltip is {anchor['title']}"))
    if anchor["left"] < 0 or anchor["right"] > content["left"] + 1:
      failures.append(Failure(page_name, f"the {name} anchor is not in the left margin: {anchor}"))
    if "\u2693" not in anchor["icon"]:
      failures.append(Failure(page_name, f"the {name} anchor has no icon: {anchor['icon']}"))
  colours = page.evaluate("""() => [...document.querySelectorAll('#sphinx-myst-preview-content span[data-okf-color], #sphinx-myst-preview-content span[data-okf-background]')].map(span => {
    const style = getComputedStyle(span);
    return {text: span.textContent, color: style.color, background: style.backgroundColor, color_attr: span.getAttribute('data-okf-color'), background_attr: span.getAttribute('data-okf-background')};
  })""")
  if [entry["text"] for entry in colours] != ["red", "highlighted"]:
    failures.append(Failure(page_name, f"coloured spans are {colours}"))
  else:
    if colours[0]["color"] != "rgb(204, 0, 0)":
      failures.append(Failure(page_name, f"the span colour is {colours[0]['color']}, expected rgb(204, 0, 0)"))
    if colours[1]["background"] != "rgba(255, 220, 0, 0.45)":
      failures.append(Failure(page_name, f"the span background is {colours[1]['background']}"))
  intro = anchors["intro"]
  if intro and abs(intro["hostLeft"] - content["left"]) > 1:
    failures.append(Failure(page_name, "the anchor moved the labelled paragraph"))
  if found["overflow"] > 0:
    failures.append(Failure(page_name, f"the page scrolls horizontally by {found['overflow']}px"))
  if found["ids"]:
    failures.append(Failure(page_name, f"duplicate ids: {found['ids']}"))
  if found["sizedHeading"] is None or found["sizedHeading"].strip() != "A labelled heading":
    failures.append(Failure(page_name, f"the labelled heading text is {found['sizedHeading']!r}"))
  # A reference to a label is an in-page link; the host answers it with navigateAnchor, which
  # the page resolves by id, so the anchor icon is the scroll target.
  page.evaluate("window.scrollTo(0, 0)")
  page.wait_for_timeout(200)
  link = page.locator('#sphinx-myst-preview-content a[data-sphinx-preview-navigation="#steps"]').first
  if link.count() != 1:
    failures.append(Failure(page_name, "the reference to the steps label is not an in-page link"))
  page.evaluate("""() => {
    const root = document.documentElement;
    window.postMessage({
      type: 'navigateAnchor', value: '#steps',
      documentId: root.getAttribute('data-sphinx-preview-document-id'),
      documentVersion: Number(root.getAttribute('data-sphinx-preview-document-version')),
      requestId: Number(root.getAttribute('data-sphinx-preview-request-id')),
    }, '*');
  }""")
  page.wait_for_timeout(700)
  target_top = page.evaluate("document.querySelector('#sphinx-myst-preview-content [id=\"steps\"]').getBoundingClientRect().top")
  if target_top < -2 or target_top > 400:
    failures.append(Failure(page_name, f"navigating to the steps label left the anchor at {target_top:.0f}px"))
  page.evaluate("window.scrollTo(0, 0)")
  page.wait_for_timeout(200)


def check_comment_chips(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Chips open into a box and close again; the reading line holds; the gray chips can be turned off."""
  if not scenario.get("commentChipChecks"):
    return
  page_name = scenario["page"]
  gray = "div.okf-comment[data-okf-comment-kind='comment'] > .okf-chip"
  todo_block = "div.okf-comment[data-okf-comment-kind='todo'] > .okf-chip"
  measure = """selector => {
    const chip = document.querySelector(selector);
    if (!chip) return null;
    const body = chip.parentElement.querySelector('.okf-comment-body');
    const box = body.getBoundingClientRect();
    const style = getComputedStyle(body);
    const shown = style.display !== 'none';
    const root = document.documentElement;
    return {
      expanded: chip.getAttribute('aria-expanded'),
      shown,
      title: shown ? getComputedStyle(body, '::before').content : null,
      top: box.top + window.scrollY,
      bottom: box.bottom + window.scrollY,
      chipBottom: chip.getBoundingClientRect().bottom + window.scrollY,
      background: style.backgroundColor,
      barWidth: style.borderInlineStartWidth,
      right: box.right,
      pane: root.clientWidth,
      overflowX: root.scrollWidth - root.clientWidth,
      text: body.textContent,
    };
  }"""
  visible = """selector => { const chip = document.querySelector(selector); return !!chip && chip.getClientRects().length > 0; }"""
  try:
    page.evaluate("window.scrollTo(0, 0)")
    closed = page.evaluate(measure, gray)
    if not closed or closed["shown"] or closed["expanded"] != "false":
      failures.append(Failure(page_name, f"a comment must start closed: {closed}"))
      return
    page.locator(gray).first.click()
    page.wait_for_timeout(150)
    opened = page.evaluate(measure, gray)
    if opened["expanded"] != "true" or not opened["shown"]:
      failures.append(Failure(page_name, "a click on the gray chip did not open the comment"))
      return
    if opened["title"] != '"Comment"':
      failures.append(Failure(page_name, f"the open comment must be titled Comment: {opened['title']}"))
    if opened["top"] < opened["chipBottom"] - 1:
      failures.append(Failure(page_name, "the open comment must sit under the chip line"))
    if opened["barWidth"] != "4px" or opened["background"] in ("rgba(0, 0, 0, 0)", "transparent"):
      failures.append(Failure(page_name, f"the open comment needs an accent bar and a panel: {opened['barWidth']} {opened['background']}"))
    if "Second line of the block comment." not in opened["text"] or opened["right"] > opened["pane"] or opened["overflowX"] > 0:
      failures.append(Failure(page_name, "the open comment overflows or lost its text"))
    page.locator(gray).first.click()
    page.wait_for_timeout(150)
    if page.evaluate(measure, gray)["shown"]:
      failures.append(Failure(page_name, "a second click did not close the comment"))
    page.locator(gray).first.focus()
    page.keyboard.press("Enter")
    page.wait_for_timeout(150)
    if not page.evaluate(measure, gray)["shown"]:
      failures.append(Failure(page_name, "Enter on the chip did not open the comment"))
    page.keyboard.press("Space")
    page.wait_for_timeout(150)
    if page.evaluate(measure, gray)["shown"]:
      failures.append(Failure(page_name, "Space on the chip did not close the comment"))

    # Reading line: the target stays where it is when a chip above it opens.
    page.evaluate("document.querySelectorAll('#sphinx-myst-preview-content h2')[1].scrollIntoView()")
    page.wait_for_timeout(500)
    target = "document.querySelectorAll('#sphinx-myst-preview-content h2')[1].getBoundingClientRect().top"
    before = page.evaluate(target)
    page.evaluate(f"document.querySelector(\"{gray}\").click()")
    page.wait_for_timeout(500)
    after = page.evaluate(target)
    if abs(after - before) > 2:
      failures.append(Failure(page_name, f"opening a chip above moved the reading line by {after - before:.0f}px"))
    page.evaluate(f"document.querySelector(\"{gray}\").click()")
    page.wait_for_timeout(500)
    if abs(page.evaluate(target) - before) > 2:
      failures.append(Failure(page_name, "closing a chip above moved the reading line"))

    # The setting: gray chips off, TODO chips stay, then on again, with no new render.
    send = """show => {
      const root = document.documentElement;
      window.postMessage({
        type: 'previewShowComments', showComments: show,
        documentId: root.getAttribute('data-sphinx-preview-document-id'),
        documentVersion: Number(root.getAttribute('data-sphinx-preview-document-version')),
        requestId: Number(root.getAttribute('data-sphinx-preview-request-id')),
      }, '*');
    }"""
    page.evaluate("window.scrollTo(0, 0)")
    page.evaluate(send, False)
    page.wait_for_timeout(300)
    if page.evaluate(visible, gray) or page.evaluate("document.querySelectorAll('.okf-comment[data-okf-comment-kind=comment]').length && [...document.querySelectorAll('.okf-comment[data-okf-comment-kind=comment]')].some(e => e.getClientRects().length > 0)"):
      failures.append(Failure(page_name, "a gray comment chip is still visible with showComments off"))
    if not page.evaluate(visible, todo_block) or not page.evaluate("[...document.querySelectorAll('.okf-chip--todo')].every(e => e.getClientRects().length > 0)"):
      failures.append(Failure(page_name, "TODO chips must stay with showComments off"))
    page.evaluate(send, True)
    page.wait_for_timeout(300)
    if not page.evaluate(visible, gray):
      failures.append(Failure(page_name, "the gray chip did not come back with showComments on"))
  finally:
    page.evaluate("window.scrollTo(0, 0)")
  # The capture shows both boxes open.
  for selector in (gray, todo_block):
    if page.evaluate(measure, selector)["expanded"] != "true":
      page.locator(selector).first.click()
  page.wait_for_timeout(200)
  todo = page.evaluate(measure, todo_block)
  if todo["title"] != '"TODO"':
    failures.append(Failure(page_name, f"the open TODO comment must be titled TODO: {todo['title']}"))


FIRST_ELEMENT_GAP = 40
FIRST_ELEMENT_TOLERANCE = 2


def check_first_element_gap(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Every page starts its first element 40px below the top; open editors clear the toolbar."""
  mode = scenario.get("firstElementGap")
  if not mode:
    return
  page_name = scenario["page"]
  measure = """selector => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const bar = document.querySelector('[data-sphinx-preview-toolbar]')?.getBoundingClientRect();
    const overlaps = !!bar && rect.left < bar.right && rect.right > bar.left
      && rect.top < bar.bottom && rect.bottom > bar.top;
    const clearance = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--sphinx-preview-first-clearance')) || 0;
    return { top: rect.top + window.scrollY, overlaps, clearance };
  }"""
  first = "#sphinx-myst-preview-content > :first-child"
  if mode == "properties":
    props = """() => {
      const section = document.querySelector('#sphinx-myst-preview-content > [data-okf-properties]');
      if (!section) return null;
      const bar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();
      const hit = r => r.width > 0 && r.height > 0 && r.left < bar.right && r.right > bar.left
        && r.top < bar.bottom && r.bottom > bar.top;
      const controls = [...section.querySelectorAll('thead th, [data-okf-description-toggle], .okf-column-heading')]
        .filter(e => e.getBoundingClientRect().width > 0 && hit(e.getBoundingClientRect()));
      const clearance = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--sphinx-preview-first-clearance')) || 0;
      return { top: section.getBoundingClientRect().top + window.scrollY, hits: controls.length, clearance };
    }"""
    for state in ("preview", "edit"):
      if state == "edit":
        page.locator("[data-sphinx-preview-edit-toggle]").click()
        page.wait_for_timeout(150)
      got = page.evaluate(props)
      if not got:
        failures.append(Failure(page_name, "no properties table is first"))
        return
      expected = FIRST_ELEMENT_GAP + got["clearance"]
      if abs(got["top"] - expected) > FIRST_ELEMENT_TOLERANCE:
        failures.append(Failure(
          page_name,
          f"[{state}] the properties table starts {got['top']:.1f}px from the top, expected {expected:.1f}px "
          f"(40px + clearance {got['clearance']:.1f}px)"))
      if got["hits"]:
        failures.append(Failure(page_name, f"[{state}] the properties header or Description toggle sits under the toolbar"))
      if page.viewport_size["width"] >= 1600 and (got["clearance"] != 0 or abs(got["top"] - FIRST_ELEMENT_GAP) > FIRST_ELEMENT_TOLERANCE):
        failures.append(Failure(page_name, f"[{state}] wide pane: expected exactly 40px and no clearance, got {got}"))
    return
  if mode != "empty":
    preview = page.evaluate(measure, first)
    if not preview:
      failures.append(Failure(page_name, "the preview has no first element"))
      return
    if abs(preview["top"] - FIRST_ELEMENT_GAP) > FIRST_ELEMENT_TOLERANCE:
      failures.append(Failure(
        page_name,
        f"the first element starts {preview['top']:.1f}px from the top in the preview, expected {FIRST_ELEMENT_GAP}px",
      ))
  page.locator("[data-sphinx-preview-edit-toggle]").click()
  page.wait_for_timeout(150)
  if mode == "empty":
    selector = ".sphinx-preview-insert-point--start button"
  else:
    selector = first
    after = page.evaluate(measure, first)
    if abs(after["top"] - FIRST_ELEMENT_GAP) > FIRST_ELEMENT_TOLERANCE:
      failures.append(Failure(
        page_name,
        f"the first element moved to {after['top']:.1f}px when edit mode was switched on",
      ))
    tag = page.evaluate("selector => document.querySelector(selector).tagName", first)
    kind = page.evaluate("selector => document.querySelector(selector).hasAttribute('data-okf-properties')", first)
    if tag in {"TABLE"} or kind or page.evaluate(
      "selector => !!document.querySelector(selector).querySelector('table')", first
    ):
      return
    page.locator(first).click(position={"x": 12, "y": 6})
    page.locator(".sphinx-preview-block-editor textarea").wait_for(state="visible", timeout=2000)
    selector = ".sphinx-preview-block-editor"
  geometry = page.evaluate(measure, selector)
  if not geometry:
    failures.append(Failure(page_name, f"{selector} is not in the page"))
    return
  if geometry["overlaps"]:
    failures.append(Failure(page_name, f"{selector} overlaps the floating toolbar"))
  if geometry["top"] < FIRST_ELEMENT_GAP - FIRST_ELEMENT_TOLERANCE:
    failures.append(Failure(page_name, f"{selector} starts {geometry['top']:.1f}px from the top, expected at least {FIRST_ELEMENT_GAP}px"))
  expected = FIRST_ELEMENT_GAP + geometry["clearance"]
  if abs(geometry["top"] - expected) > FIRST_ELEMENT_TOLERANCE:
    failures.append(Failure(
      page_name,
      f"{selector} starts {geometry['top']:.1f}px from the top, expected {expected:.1f}px "
      f"(40px + clearance {geometry['clearance']:.1f}px)",
    ))
  if mode == "wide-margin" and geometry["clearance"] != 0:
    failures.append(Failure(page_name, f"a wide pane needs no clearance, found {geometry['clearance']}px"))


def check_code_copy(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """The copy button follows the hovered code block and posts its raw code."""
  if not scenario.get("codeCopyChecks"):
    return
  page_name = scenario["page"]
  button = page.locator("[data-sphinx-preview-code-copy]")
  if button.count() != 0:
    failures.append(Failure(page_name, "a copy button exists before any block is hovered"))
  block = page.locator("#sphinx-myst-preview-content pre").first
  block.hover(position={"x": 120, "y": 40})
  page.wait_for_timeout(120)
  if button.count() != 1 or not button.is_visible():
    failures.append(Failure(page_name, "hovering a code block did not show the copy button"))
    return
  geometry = page.evaluate("""() => {
    const pre = document.querySelector('#sphinx-myst-preview-content pre').getBoundingClientRect();
    const rect = document.querySelector('[data-sphinx-preview-code-copy]').getBoundingClientRect();
    const bar = document.querySelector('[data-sphinx-preview-toolbar]')?.getBoundingClientRect();
    return {
      pre: { top: pre.top, right: pre.right, left: pre.left },
      rect: { top: rect.top, right: rect.right, width: rect.width, height: rect.height },
      overlaps: !!bar && rect.left < bar.right && rect.right > bar.left && rect.top < bar.bottom && rect.bottom > bar.top,
    };
  }""")
  rect, pre = geometry["rect"], geometry["pre"]
  if abs(rect["width"] - 26) > 1 or abs(rect["height"] - 26) > 1:
    failures.append(Failure(page_name, f"copy button is {rect['width']}x{rect['height']}, expected 26x26"))
  if abs((pre["right"] - rect["right"]) - 6) > 2 or abs((rect["top"] - pre["top"]) - 6) > 2:
    failures.append(Failure(page_name, f"copy button is not 6px inside the block's top right: {geometry}"))
  if geometry["overlaps"]:
    failures.append(Failure(page_name, "the copy button overlaps the floating toolbar"))
  page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-hover.png"), caret="hide")
  expected = block.locator("code").evaluate("element => element.textContent")
  button.click()
  copied = page.evaluate(
    "window.visualMessages.filter(m => m.type === 'previewCopyText').at(-1)")
  if not copied or copied.get("text") != expected:
    failures.append(Failure(page_name, "clicking the copy button did not post the exact code text"))
  if button.get_attribute("aria-label") != "Copied":
    failures.append(Failure(page_name, "the copy button did not show the check mark after the click"))
  if page.locator(".sphinx-preview-block-editor").count() != 0:
    failures.append(Failure(page_name, "clicking the copy button opened a block editor"))


def check_edit_affordances(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """T15: hover outline on a list, then a framed paragraph editor with hint and buttons."""
  if not scenario.get("editAffordances"):
    return
  page_name = scenario["page"]
  # The sticky heading band overlapping the toolbar row is a known baseline defect on every
  # scrolled page (see logs/visual-baseline-failures.txt); this scenario is about the editor.
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  item = page.locator("main ul > li").first
  item.scroll_into_view_if_needed()
  item.hover()
  hovered = page.locator('main [data-sphinx-preview-edit-hover="true"]')
  if hovered.count() != 1:
    failures.append(Failure(page_name, f"hovering a list item marked {hovered.count()} elements, expected 1"))
  elif hovered.evaluate("element => element.tagName") != "UL":
    failures.append(Failure(page_name, "hover did not mark the whole list"))
  elif hovered.evaluate("element => getComputedStyle(element).outlineStyle") != "dashed":
    failures.append(Failure(page_name, "hovered list has no dashed outline"))
  page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-hover.png"), caret="hide")

  paragraph = page.locator("main > p[data-sphinx-source-line]").first
  paragraph.scroll_into_view_if_needed()
  paragraph.click()
  editor = page.locator(".sphinx-preview-block-editor")
  if editor.count() != 1 or not editor.is_visible():
    failures.append(Failure(page_name, "clicking a paragraph did not open its framed editor"))
    return
  if page.locator('main [data-sphinx-preview-edit-hover="true"]').count() != 0:
    failures.append(Failure(page_name, "hover outline stayed on while an editor opened"))
  frame = editor.evaluate("""element => {
    const style = getComputedStyle(element);
    const area = getComputedStyle(element.querySelector('textarea'));
    return { border: style.borderTopWidth, background: style.backgroundColor,
      family: area.fontFamily, tab: area.tabSize };
  }""")
  if frame["border"] != "1px" or frame["background"] in {"rgba(0, 0, 0, 0)", "transparent"}:
    failures.append(Failure(page_name, f"block editor has no visible frame: {frame}"))
  if "monospace" not in frame["family"].lower() and "mono" not in frame["family"].lower():
    failures.append(Failure(page_name, f"block editor textarea is not monospace: {frame['family']}"))
  if frame["tab"] != "4":
    failures.append(Failure(page_name, f"block editor tab-size is {frame['tab']}, expected 4"))
  status = editor.locator("[data-sphinx-preview-edit-status]").text_content() or ""
  if not re.match(r"^Lines? \d+(\u2013\d+)? \u00b7 Enter: new line \u00b7 Tab: indent \u00b7 Esc: cancel \u00b7 (\u2318\u21a9|Ctrl\+Enter): done$", status):
    failures.append(Failure(page_name, f"block editor hint is wrong: {status!r}"))
  done = editor.locator("button[aria-label='Done editing']")
  cancel = editor.locator("button[aria-label='Cancel editing and restore the original text']")
  if done.count() != 1 or cancel.count() != 1 or not done.is_visible() or not cancel.is_visible():
    failures.append(Failure(page_name, "Done and Cancel buttons are not both visible"))
  elif (cancel.text_content() or "").strip() != "Cancel":
    failures.append(Failure(page_name, "the second button is not labelled Cancel"))
  else:
    layout = editor.evaluate("""element => {
      const row = element.querySelector('.sphinx-preview-block-editor-actions');
      const status = row && row.querySelector('[data-sphinx-preview-edit-status]');
      const buttons = row && row.querySelector('.sphinx-preview-block-editor-buttons');
      if (!status || !buttons) return null;
      const s = status.getBoundingClientRect();
      const b = buttons.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const area = getComputedStyle(element.querySelector('textarea')).fontSize;
      const editorSize = parseFloat(getComputedStyle(document.body).fontSize);
      return { sTop: s.top, sBottom: s.bottom, sRight: s.right, sLeft: s.left, bTop: b.top,
        bBottom: b.bottom, bLeft: b.left, bRight: b.right, rRight: r.right, area: parseFloat(area),
        statusSize: parseFloat(getComputedStyle(status).fontSize),
        statusParentSize: parseFloat(getComputedStyle(status.parentElement).fontSize),
        body: editorSize };
    }""")
    if layout is None:
      failures.append(Failure(page_name, "status line is not inside the Done/Cancel row"))
    else:
      if abs(layout["statusSize"] / layout["statusParentSize"] - 0.75) > 0.01:
        failures.append(Failure(page_name, f"status text is not 75% of its parent font size: {layout}"))
      sideBySide = layout["sBottom"] > layout["bTop"] and layout["sTop"] < layout["bBottom"]
      if sideBySide and layout["sRight"] > layout["bLeft"] + 0.5:
        failures.append(Failure(page_name, f"status text overlaps the buttons: {layout}"))
      status_centre = (layout["sTop"] + layout["sBottom"]) / 2
      button_centre = (layout["bTop"] + layout["bBottom"]) / 2
      if sideBySide and abs(status_centre - button_centre) > 2:
        failures.append(Failure(
          page_name,
          f"status text centre is {button_centre - status_centre:.1f}px above the buttons' centre: {layout}",
        ))
      if layout["bRight"] > layout["rRight"] + 0.5:
        failures.append(Failure(page_name, f"buttons overflow the editor row: {layout}"))
      if layout["bLeft"] <= layout["sLeft"]:
        failures.append(Failure(page_name, f"buttons are not right of the status text: {layout}"))
      if not layout["area"] < layout["body"]:
        failures.append(Failure(page_name, f"editor text is not smaller than the body text: {layout}"))


def check_edit_palette(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """T21: the edition palette above an open block editor."""
  if not scenario.get("editPalette"):
    return
  page_name = scenario["page"]
  page.add_style_tag(content="[data-sphinx-preview-sticky-headings] { display: none !important; }")
  paragraph = page.locator("main > p[data-sphinx-source-line]").nth(3)
  paragraph.evaluate("element => element.scrollIntoView({ block: 'center' })")
  page.wait_for_timeout(150)
  before = paragraph.evaluate("element => element.getBoundingClientRect().top")
  paragraph.click()
  editor = page.locator(".sphinx-preview-block-editor")
  page.wait_for_timeout(250)
  if editor.count() != 1 or not editor.is_visible():
    failures.append(Failure(page_name, "clicking a paragraph did not open its framed editor"))
    return
  palette = editor.locator(".sphinx-preview-edit-palette")
  if palette.count() != 1 or not palette.is_visible():
    failures.append(Failure(page_name, "the open editor shows no edition palette"))
    return
  geometry = editor.evaluate("""element => {
    const bar = element.querySelector('.sphinx-preview-edit-palette');
    const area = element.querySelector('textarea');
    const toolbar = document.querySelector('[data-sphinx-preview-toolbar]');
    const frame = element.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    const t = toolbar ? toolbar.getBoundingClientRect() : null;
    // The colour-code swatch button is hidden unless the caret is in a colour code.
    const buttons = [...bar.querySelectorAll(':scope > button:not([hidden])')].map((button) => {
      const r = button.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    return {
      first: element.firstElementChild === bar,
      barTop: b.top, barBottom: b.bottom, barLeft: b.left, barRight: b.right, barHeight: b.height,
      areaTop: a.top, frameLeft: frame.left, frameRight: frame.right, frameTop: frame.top,
      toolbarBottom: t ? t.bottom : 0, toolbarLeft: t ? t.left : 0, toolbarRight: t ? t.right : 0,
      buttons, scrollWidth: bar.scrollWidth, clientWidth: bar.clientWidth,
      labels: [...bar.querySelectorAll(':scope > button')].map((button) => button.dataset.editAction),
    };
  }""")
  if not geometry["first"]:
    failures.append(Failure(page_name, "the palette is not the first child of the editor frame"))
  expected = ["heading", "bold", "italic", "strikethrough", "color", "colorCode", "link", "image", "codeFence", "quote", "rule", "table", "emoji", "todo", "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd", "admonition", "deflist", "math", "sub", "sup", "label", "ref", "doc", "cite", "dropdown", "tableCaption", "figure", "roleKbd"]
  if geometry["labels"] != expected:
    failures.append(Failure(page_name, f"palette buttons are {geometry['labels']}, expected {expected}"))
  if geometry["barBottom"] > geometry["areaTop"] + 0.5:
    failures.append(Failure(page_name, f"the palette is not above the text box: {geometry}"))
  overlaps_toolbar_row = (
    geometry["barLeft"] < geometry["toolbarRight"] and geometry["barRight"] > geometry["toolbarLeft"]
  )
  if overlaps_toolbar_row and geometry["barTop"] < geometry["toolbarBottom"] - 0.5:
    failures.append(Failure(page_name, f"the palette is under the toolbar: {geometry}"))
  if geometry["barRight"] > geometry["frameRight"] + 0.5 or geometry["scrollWidth"] > geometry["clientWidth"] + 1:
    failures.append(Failure(page_name, f"the palette overflows the editor frame: {geometry}"))
  for button in geometry["buttons"]:
    if button["right"] > geometry["frameRight"] + 0.5 or button["left"] < geometry["frameLeft"] - 0.5:
      failures.append(Failure(page_name, f"a palette button leaves the frame: {button}"))
      break
  if scenario["width"] <= 400:
    rows = {round(button["top"]) for button in geometry["buttons"]}
    if len(rows) < 2:
      failures.append(Failure(page_name, f"the palette did not wrap at {scenario['width']} px: {geometry}"))
  # The clicked text keeps its place: only the frame border and padding separate it from the
  # old paragraph top, never the height of the bar.
  moved = geometry["areaTop"] - before
  if abs(moved) > 12:
    failures.append(Failure(
      page_name,
      f"opening the editor moved the text by {moved:.1f}px (bar height {geometry['barHeight']:.1f}px)",
    ))

  # A press on the bar's own padding keeps the editor open.
  palette.click(position={"x": 1.5, "y": geometry["barHeight"] / 2})
  page.wait_for_timeout(150)
  if editor.count() != 1 or not editor.locator("textarea").is_visible():
    failures.append(Failure(page_name, "clicking the palette's edge closed the editor"))
    return

  # A button keeps the editor open and the focus in the text box.
  area = editor.locator("textarea")
  area.focus()
  area.press("ControlOrMeta+a")
  palette.locator("button[data-edit-action='bold']").click()
  page.wait_for_timeout(150)
  state = page.evaluate("""() => {
    const area = document.querySelector('.sphinx-preview-block-editor textarea');
    return { open: Boolean(area), focused: document.activeElement === area,
      value: area ? area.value : '' };
  }""")
  if not state["open"] or not state["focused"]:
    failures.append(Failure(page_name, f"clicking Bold closed the editor or lost the focus: {state}"))
  elif not (state["value"].startswith("**") and state["value"].rstrip().endswith("**")):
    failures.append(Failure(page_name, f"clicking Bold did not wrap the text: {state['value'][:60]!r}"))
  area.press("ControlOrMeta+z")
  page.wait_for_timeout(100)
  if editor.locator("textarea").input_value().startswith("**"):
    failures.append(Failure(page_name, "Undo after Bold did not restore the text"))
  page.mouse.move(2, 2)
  page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-bar.png"), caret="hide")

  # The heading list opens inside the frame, Escape closes it and leaves the editor open.
  palette.locator("button[data-edit-action='heading']").click()
  menu = editor.locator(".sphinx-preview-edit-palette-menu")
  page.wait_for_timeout(150)
  if menu.count() != 1 or not menu.is_visible():
    failures.append(Failure(page_name, "the heading list did not open"))
  else:
    box = menu.evaluate("""element => {
      const r = element.getBoundingClientRect();
      const f = element.closest('[data-sphinx-preview-block-editor]').getBoundingClientRect();
      return { left: r.left, right: r.right, frameLeft: f.left, frameRight: f.right };
    }""")
    if box["left"] < box["frameLeft"] - 0.5 or box["right"] > box["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the heading list leaves the editor frame: {box}"))
  page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-menu.png"), caret="hide")
  page.keyboard.press("Escape")
  page.wait_for_timeout(100)
  if editor.locator(".sphinx-preview-edit-palette-menu").count() != 0:
    failures.append(Failure(page_name, "Escape did not close the heading list"))
  if editor.count() != 1:
    failures.append(Failure(page_name, "Escape with a heading list open closed the editor"))
    return

  # T24: the Table button opens a 9 x 9 grid; hovering 3 x 4 lights 12 cells and shows the size.
  palette.locator("button[data-edit-action='table']").click()
  grid = editor.locator(".sphinx-preview-edit-palette-menu[data-edit-popover='grid']")
  page.wait_for_timeout(150)
  if grid.count() != 1 or not grid.is_visible():
    failures.append(Failure(page_name, "the table grid did not open"))
  else:
    grid.locator("[data-grid-row='3'][data-grid-col='4']").hover()
    page.wait_for_timeout(100)
    grid_state = grid.evaluate("""element => {
      const f = element.closest('[data-sphinx-preview-block-editor]').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const lit = [...element.querySelectorAll('[data-grid-on]')];
      const off = element.querySelector('[data-grid-row="4"][data-grid-col="1"]');
      const on = element.querySelector('[data-grid-row="3"][data-grid-col="4"]');
      return {
        cells: element.querySelectorAll('[data-grid-row]').length, lit: lit.length,
        label: element.querySelector('.sphinx-preview-edit-grid-label').textContent,
        onColor: getComputedStyle(on).backgroundColor, offColor: getComputedStyle(off).backgroundColor,
        left: r.left, right: r.right, frameLeft: f.left, frameRight: f.right,
      };
    }""")
    if grid_state["cells"] != 81 or grid_state["lit"] != 12 or grid_state["label"] != "3 \u00d7 4":
      failures.append(Failure(page_name, f"hovering 3 x 4 did not light 12 of 81 cells: {grid_state}"))
    if grid_state["onColor"] == grid_state["offColor"]:
      failures.append(Failure(page_name, f"a lit grid cell looks like an unlit one: {grid_state}"))
    if grid_state["left"] < grid_state["frameLeft"] - 0.5 or grid_state["right"] > grid_state["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the table grid leaves the editor frame: {grid_state}"))
    page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-grid.png"), caret="hide")
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    if editor.locator(".sphinx-preview-edit-palette-menu").count() != 0 or editor.count() != 1:
      failures.append(Failure(page_name, "Escape did not close only the table grid"))
      return

  # The emoji picker takes the focus for its filter; Escape gives it back to the text box.
  palette.locator("button[data-edit-action='emoji']").click()
  picker = editor.locator(".sphinx-preview-edit-palette-menu[data-edit-popover='emoji']")
  page.wait_for_timeout(150)
  if picker.count() != 1 or not picker.is_visible():
    failures.append(Failure(page_name, "the emoji picker did not open"))
  else:
    picker_state = picker.evaluate("""element => {
      const f = element.closest('[data-sphinx-preview-block-editor]').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const field = element.querySelector('input');
      return { focused: document.activeElement === field, left: r.left, right: r.right,
        frameLeft: f.left, frameRight: f.right, count: element.querySelectorAll('[data-emoji]').length };
    }""")
    if not picker_state["focused"] or picker_state["count"] < 140:
      failures.append(Failure(page_name, f"the emoji picker is not ready: {picker_state}"))
    if picker_state["left"] < picker_state["frameLeft"] - 0.5 or picker_state["right"] > picker_state["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the emoji picker leaves the editor frame: {picker_state}"))
    page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-emoji.png"), caret="hide")
    page.keyboard.type("warning")
    page.wait_for_timeout(100)
    shown = picker.locator("[data-emoji]:not([hidden])").count()
    if shown != 1:
      failures.append(Failure(page_name, f"filtering 'warning' left {shown} emoji, expected 1"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    refocused = page.evaluate("() => document.activeElement && document.activeElement.tagName")
    if editor.count() != 1 or refocused != "TEXTAREA" or editor.locator(".sphinx-preview-edit-palette-menu").count() != 0:
      failures.append(Failure(page_name, f"Escape in the emoji filter left the editor in a bad state: {refocused}"))
      return

  # T25: the Alert button writes the alert and opens its type list at the caret, inside the frame.
  area.focus()
  palette.locator("button[data-edit-action='alert']").click()
  alert_list = editor.locator(".sphinx-preview-edit-palette-menu[data-edit-popover='alert']")
  page.wait_for_timeout(150)
  if alert_list.count() != 1 or not alert_list.is_visible():
    failures.append(Failure(page_name, "the alert type list did not open"))
  else:
    alert_state = alert_list.evaluate("""element => {
      const f = element.closest('[data-sphinx-preview-block-editor]').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      return { options: [...element.querySelectorAll('[data-edit-option]')].map((o) => o.textContent),
        left: r.left, right: r.right, top: r.top, frameLeft: f.left, frameRight: f.right,
        areaTop: t.getBoundingClientRect().top, focused: document.activeElement === t,
        value: t.value.split('\\n')[0] };
    }""")
    if alert_state["options"] != ["Note", "Tip", "Important", "Warning", "Caution"]:
      failures.append(Failure(page_name, f"the alert type list is wrong: {alert_state}"))
    if alert_state["value"] != "> [!NOTE]" or not alert_state["focused"]:
      failures.append(Failure(page_name, f"the alert was not written with the focus kept: {alert_state}"))
    if alert_state["left"] < alert_state["frameLeft"] - 0.5 or alert_state["top"] < alert_state["areaTop"]:
      failures.append(Failure(page_name, f"the alert type list is not next to the text: {alert_state}"))
    page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-alert.png"), caret="hide")
    alert_list.locator("[data-edit-option='WARNING']").click()
    page.wait_for_timeout(100)
    changed = page.evaluate("""() => {
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      return { head: t ? t.value.split('\\n')[0] : '', focused: document.activeElement === t };
    }""")
    if changed["head"] != "> [!WARNING]" or not changed["focused"] or editor.locator(".sphinx-preview-edit-palette-menu").count() != 0:
      failures.append(Failure(page_name, f"choosing Warning did not change the head: {changed}"))

  # T34: the Colour picker opens inside the frame, a swatch colours the selection, and the code
  # swatch button follows the caret.
  area.focus()
  area.evaluate("t => { t.setSelectionRange(2, 6); }")
  palette.locator("button[data-edit-action='color']").click()
  colour_menu = editor.locator(".sphinx-preview-edit-palette-menu[data-edit-popover='color']")
  page.wait_for_timeout(150)
  if colour_menu.count() != 1 or not colour_menu.is_visible():
    failures.append(Failure(page_name, "the colour picker did not open"))
  else:
    colour_state = colour_menu.evaluate("""element => {
      const f = element.closest('[data-sphinx-preview-block-editor]').getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      const swatch = element.querySelector('[data-color-swatch]').getBoundingClientRect();
      return { swatches: element.querySelectorAll('[data-color-swatch]').length,
        tabs: element.querySelectorAll('[data-color-tab]').length, left: r.left, right: r.right,
        frameLeft: f.left, frameRight: f.right, swatchWidth: swatch.width, swatchHeight: swatch.height,
        focused: document.activeElement === t };
    }""")
    if colour_state["swatches"] != 16 or colour_state["tabs"] != 2 or not colour_state["focused"]:
      failures.append(Failure(page_name, f"the colour picker is not ready: {colour_state}"))
    if colour_state["left"] < colour_state["frameLeft"] - 0.5 or colour_state["right"] > colour_state["frameRight"] + 0.5:
      failures.append(Failure(page_name, f"the colour picker leaves the editor frame: {colour_state}"))
    if colour_state["swatchWidth"] < 12 or colour_state["swatchHeight"] < 12:
      failures.append(Failure(page_name, f"the colour swatches are too small: {colour_state}"))
    page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-colour.png"), caret="hide")
    colour_menu.locator("[data-color-swatch]").nth(0).click()
    page.wait_for_timeout(100)
    coloured = page.evaluate("""() => {
      const t = document.querySelector('.sphinx-preview-block-editor textarea');
      return { value: t ? t.value : '', focused: document.activeElement === t };
    }""")
    if '<span style="color:#e53935">' not in coloured["value"] or not coloured["focused"]:
      failures.append(Failure(page_name, f"a colour swatch did not colour the selection: {coloured}"))
    if editor.locator(".sphinx-preview-edit-palette-menu").count() != 0 or editor.count() != 1:
      failures.append(Failure(page_name, "choosing a colour left the picker open or closed the editor"))
  code_button = palette.locator("button[data-edit-action='colorCode']")
  if code_button.is_visible():
    failures.append(Failure(page_name, "the colour-code swatch is shown with the caret outside a colour code"))
  area.evaluate("""t => {
    t.focus(); t.setSelectionRange(t.value.length, t.value.length);
    document.execCommand('insertText', false, ' #1e88e5');
  }""")
  page.keyboard.press("ArrowLeft")
  page.wait_for_timeout(100)
  if not code_button.is_visible():
    failures.append(Failure(page_name, "the colour-code swatch is hidden with the caret in a colour code"))
  else:
    page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-colour-code.png"), caret="hide")

  # Closing puts the block back where it was before the editor opened (no jump by the bar height).
  page.keyboard.press("Escape")
  page.wait_for_timeout(500)
  if page.locator(".sphinx-preview-block-editor").count() != 0:
    failures.append(Failure(page_name, "Escape did not close the editor"))
    return
  after = page.locator("main > p[data-sphinx-source-line]").nth(3).evaluate(
    "element => element.getBoundingClientRect().top"
  )
  if abs(after - before) > 2:
    failures.append(Failure(
      page_name,
      f"closing the editor moved the paragraph from {before:.1f}px to {after:.1f}px",
    ))
  # Reopen so the scenario's own screenshot shows the editor.
  page.locator("main > p[data-sphinx-source-line]").nth(3).click()
  page.wait_for_timeout(250)


def check_cell_bar_formatting(page: Page, page_name: str, scenario: dict, toolbar, failures: list[Failure]) -> None:
  """T35: the inline palette group inside the table cell bar."""
  group = toolbar.locator("[data-sphinx-edit-palette='cell']")
  if group.count() != 1 or not group.is_visible():
    failures.append(Failure(page_name, "the table cell bar shows no inline formatting group"))
    return
  geometry = toolbar.evaluate("""bar => {
    const group = bar.querySelector("[data-sphinx-edit-palette='cell']");
    const box = bar.getBoundingClientRect();
    const buttons = [...group.querySelectorAll(':scope > button:not([hidden])')];
    const rects = buttons.map((button) => button.getBoundingClientRect());
    const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
    const cellRect = cell.getBoundingClientRect();
    const table = cell.closest('table').getBoundingClientRect();
    const separator = bar.querySelector(':scope > [role=separator]');
    return {
      ids: buttons.map((button) => button.dataset.editAction),
      operations: bar.querySelectorAll(':scope > [data-sphinx-table-operation]').length,
      hasSeparator: Boolean(separator),
      mode: Boolean(group.querySelector('select')),
      barLeft: box.left, barRight: box.right, barBottom: box.bottom, barHeight: box.height,
      tableTop: table.top, viewport: document.documentElement.clientWidth,
      outside: rects.filter((r) => r.left < box.left - 0.5 || r.right > box.right + 0.5
        || r.width < 8 || r.height < 8).length,
      rows: new Set(rects.map((r) => Math.round(r.top))).size,
      scrollWidth: bar.scrollWidth, clientWidth: bar.clientWidth,
    };
  }""")
  for required in ("bold", "italic", "link"):
    if required not in geometry["ids"]:
      failures.append(Failure(page_name, f"the cell bar lacks the {required} button: {geometry['ids']}"))
  for block_only in ("heading", "quote", "table", "image", "codeFence"):
    if block_only in geometry["ids"]:
      failures.append(Failure(page_name, f"the cell bar shows the block action {block_only}"))
  if geometry["operations"] != 4 or not geometry["hasSeparator"] or geometry["mode"]:
    failures.append(Failure(page_name, f"the cell bar structure is wrong: {geometry}"))
  if geometry["outside"] or geometry["scrollWidth"] > geometry["clientWidth"] + 1 or geometry["barRight"] > geometry["viewport"] + 0.5:
    failures.append(Failure(page_name, f"the cell bar buttons overflow the bar: {geometry}"))
  if geometry["barBottom"] > geometry["tableTop"] + 0.5:
    failures.append(Failure(page_name, f"the merged cell bar covers the table: {geometry}"))
  if scenario["width"] <= 400 and geometry["rows"] < 2:
    failures.append(Failure(page_name, f"the cell bar did not wrap at {scenario['width']} px: {geometry}"))
  page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-cell-bar.png"), caret="hide")
  # A formatting button keeps the cell editor open and focused, and the text changes in the cell.
  area = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
  area.focus()
  area.press("ControlOrMeta+a")
  group.locator("button[data-edit-action='bold']").click()
  page.wait_for_timeout(120)
  state = page.evaluate("""() => {
    const area = document.querySelector('[data-sphinx-preview-table-cell-editor] textarea');
    return { open: Boolean(area), focused: document.activeElement === area, value: area ? area.value : '' };
  }""")
  if not state["open"] or not state["focused"] or not state["value"].startswith("**"):
    failures.append(Failure(page_name, f"Bold in the cell bar closed the cell, lost the focus or did nothing: {state}"))
  area.press("ControlOrMeta+z")
  page.wait_for_timeout(100)
  # The emoji picker opens under the group and keeps the cell open.
  group.locator("button[data-edit-action='emoji']").click()
  page.wait_for_timeout(150)
  picker = group.locator(".sphinx-preview-edit-palette-menu")
  if picker.count() != 1 or not picker.is_visible():
    failures.append(Failure(page_name, "the emoji picker did not open from the cell bar"))
  else:
    box = picker.evaluate("""element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, viewport: document.documentElement.clientWidth };
    }""")
    if box["left"] < -0.5 or box["right"] > box["viewport"] + 0.5:
      failures.append(Failure(page_name, f"the emoji picker leaves the viewport: {box}"))
    page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-cell-emoji.png"), caret="hide")
  page.keyboard.press("Escape")
  page.wait_for_timeout(100)
  if group.locator(".sphinx-preview-edit-palette-menu").count() != 0 or page.locator("[data-sphinx-preview-table-cell-editor]").count() != 1:
    failures.append(Failure(page_name, "Escape did not close only the emoji picker in the cell bar"))
  area = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
  area.focus()


def check_cell_editor_chrome(page: Page, page_name: str, target, original_bounds, failures: list[Failure]) -> None:
    """Done/Cancel live inside the cell, the columns keep their width, the toolbar status is centred."""
    info = page.evaluate("""() => {
      const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
      const editor = cell && cell.querySelector('[data-sphinx-preview-table-cell-editor]');
      const menu = document.querySelector('[data-sphinx-table-menu]');
      if (!cell || !editor || !menu) return null;
      const cellRect = cell.getBoundingClientRect();
      const buttons = Array.from(editor.querySelectorAll('button')).map(button => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.textContent,
          visible: rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility !== 'hidden',
          inside: rect.left >= cellRect.left - 1 && rect.right <= cellRect.right + 1
            && rect.top >= cellRect.top - 1 && rect.bottom <= cellRect.bottom + 1,
          top: rect.top,
        };
      });
      const textarea = editor.querySelector('textarea');
      const reference = document.createElement('div');
      reference.className = 'sphinx-preview-block-editor';
      reference.innerHTML = '<textarea></textarea>';
      document.body.appendChild(reference);
      const referenceStyle = getComputedStyle(reference.querySelector('textarea'));
      const cellStyle = getComputedStyle(textarea);
      const font = {
        same: cellStyle.fontFamily === referenceStyle.fontFamily
          && cellStyle.fontSize === referenceStyle.fontSize
          && cellStyle.lineHeight === referenceStyle.lineHeight,
        cell: [cellStyle.fontFamily, cellStyle.fontSize, cellStyle.lineHeight],
        block: [referenceStyle.fontFamily, referenceStyle.fontSize, referenceStyle.lineHeight],
      };
      reference.remove();
      const status = menu.querySelector('[data-sphinx-preview-edit-status]');
      const centre = rect => rect.top + rect.height / 2;
      const operation = menu.querySelector('[data-sphinx-table-operation]');
      const area = textarea.getBoundingClientRect();
      return {
        buttons,
        font,
        cellStatus: editor.querySelectorAll('[data-sphinx-preview-edit-status]').length,
        fieldAboveButtons: buttons.every(button => button.top >= area.bottom - 1),
        // A status that wrapped onto its own line (narrow widths) has no button row to centre on.
        statusDelta: status && operation
          ? (status.getBoundingClientRect().top >= operation.getBoundingClientRect().bottom - 1
            ? 0
            : Math.abs(centre(status.getBoundingClientRect()) - centre(operation.getBoundingClientRect())))
          : null,
        cellWidth: cellRect.width,
        cellHeight: cellRect.height,
      };
    }""")
    if info is None:
        failures.append(Failure(page_name, "table cell editor, cell or toolbar missing for the chrome checks"))
        return
    if [button["text"] for button in info["buttons"]] != ["Done", "Cancel"]:
        failures.append(Failure(page_name, f"table cell editor buttons are not Done and Cancel: {info['buttons']}"))
    elif not all(button["visible"] and button["inside"] for button in info["buttons"]):
        failures.append(Failure(page_name, f"table cell Done/Cancel are hidden or outside the cell: {info}"))
    if not info["fieldAboveButtons"]:
        failures.append(Failure(page_name, f"table cell buttons are not under the field: {info}"))
    if info["cellStatus"] != 0:
        failures.append(Failure(page_name, "table cell editor still shows the status hint"))
    if not info["font"]["same"]:
        failures.append(Failure(page_name, f"table cell font differs from the block editor: {info['font']}"))
    if info["statusDelta"] is None or info["statusDelta"] > 2:
        failures.append(Failure(page_name, f"toolbar status is not vertically centred with the buttons: {info['statusDelta']}"))
    if original_bounds and abs(info["cellWidth"] - original_bounds["width"]) > 1:
        failures.append(Failure(
            page_name,
            f"table column width changed while editing: {original_bounds['width']} -> {info['cellWidth']}",
        ))
    if original_bounds and info["cellHeight"] < original_bounds["height"] - 1:
        failures.append(Failure(page_name, f"table cell shrank while editing: {original_bounds['height']} -> {info['cellHeight']}"))


def check_cell_end_key(page: Page, page_name: str, cell_input, failures: list[Failure]) -> None:
    """Real End key in a focused table-cell editor: caret to the end, default prevented, no scroll.

    On macOS the native End scrolls the preview or shifts a wide table horizontally; headless
    Chromium on Linux moves the caret natively, so the scroll assertions only bite on macOS while
    the defaultPrevented assertion is platform independent.
    """
    cell_input.evaluate("""element => {
      element.focus({ preventScroll: true });
      element.setSelectionRange(0, 0);
      window.__okfEndKey = undefined;
      element.addEventListener("keydown", event => {
        if (event.key === "End") window.__okfEndKey = event.defaultPrevented;
      }, { once: true });
      // Capture-phase listener on window runs first; read defaultPrevented after the editor ran.
      window.addEventListener("keydown", event => {
        if (event.key !== "End") return;
        setTimeout(() => { window.__okfEndPrevented = event.defaultPrevented; }, 0);
      }, { capture: true, once: true });
    }""")
    measure = """() => {
      const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
      const lefts = [];
      for (let node = cell.closest('table'); node; node = node.parentElement) lefts.push(node.scrollLeft);
      return { y: window.scrollY, lefts };
    }"""
    before = page.evaluate(measure)
    page.keyboard.press("End")
    page.wait_for_function("() => window.__okfEndPrevented !== undefined", timeout=2000)
    after = page.evaluate(measure)
    prevented = page.evaluate("() => window.__okfEndPrevented")
    caret_at_end = cell_input.evaluate(
      "element => element.selectionStart === element.selectionEnd"
      " && element.selectionEnd === element.value.replace(/[\\r\\n]+$/, '').length"
    )
    if not prevented or not caret_at_end or after != before:
      failures.append(Failure(
        page_name,
        f"End in a table cell did not move the caret to the end without scrolling: "
        f"prevented={prevented} caret_at_end={caret_at_end} {before} -> {after}",
      ))


def check_preview_edit_mode(page: Page, scenario: dict, failures: list[Failure]) -> None:
    if not scenario.get("editMode"):
        return
    page_name = scenario["page"]
    button = page.locator("[data-sphinx-preview-edit-toggle]")
    button.click()
    if button.get_attribute("aria-pressed") != "true":
        failures.append(Failure(page_name, "edit mode toggle did not become active"))
    if page.locator("html").get_attribute("data-sphinx-preview-edit-mode") != "on":
        failures.append(Failure(page_name, "edit mode state was not applied to the preview"))
    if scenario.get("topSpacingChecks") in {"empty-start", "empty-open"}:
      return
    if scenario.get("fixture") == "08-okf-schema":
      edit_buttons = page.locator("[data-okf-edit-field], [data-okf-properties] tbody button")
      if edit_buttons.count() > 0:
        failures.append(Failure(page_name, "frontmatter properties still contain Edit buttons"))
      name_cells = page.locator(
        '[data-okf-properties] tbody [data-okf-edit-cell="name"]'
      )
      value_cells = page.locator(
        '[data-okf-properties] tbody td[data-okf-edit-cell="value"]'
      )
      if name_cells.count() == 0:
        failures.append(Failure(page_name, "edit mode exposes no clickable frontmatter key cells"))
      if value_cells.count() == 0:
        failures.append(Failure(page_name, "edit mode exposes no clickable frontmatter value cells"))
      for cell in (name_cells.first, value_cells.first):
        if cell.count() > 0 and cell.get_attribute("tabindex") != "0":
          failures.append(Failure(page_name, "frontmatter cells are not keyboard accessible"))

    edit_target = scenario.get("editTarget")
    if edit_target in {None, "paragraph"}:
      if page.locator("[data-sphinx-preview-block-editor], [data-okf-frontmatter-editor]").count():
        failures.append(Failure(page_name, "page-wide edit mode unexpectedly opened a single-field editor"))
      paragraph_styles = page.locator(
        "#sphinx-myst-preview-content p[data-sphinx-source-line]"
      ).evaluate_all(
        """elements => elements
          .filter(element => !element.closest('table'))
          .map(element => {
            const style = getComputedStyle(element);
            return {
              whiteSpace: style.whiteSpace,
              overflowWrap: style.overflowWrap,
              hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
            };
          })"""
      )
      if not paragraph_styles:
        failures.append(Failure(page_name, "edit mode found no source-mapped paragraphs"))
      elif any(
        style["whiteSpace"] == "pre-wrap" for style in paragraph_styles
      ):
        failures.append(Failure(page_name, "edit mode shows source line breaks in rendered paragraphs"))
      elif any(style["hasHorizontalOverflow"] for style in paragraph_styles):
        failures.append(Failure(page_name, "edit-mode paragraphs clip continuation text horizontally"))

      if scenario.get("fixture") == "08-okf-schema":
        warning_body = page.locator(
          "#sphinx-myst-preview-content aside.admonition.warning p[data-sphinx-source-line]"
        )
        if warning_body.count() != 1:
          failures.append(Failure(page_name, "warning body paragraph is missing from edit mode"))
        else:
          if warning_body.evaluate("element => getComputedStyle(element).whiteSpace") == "pre-wrap":
            failures.append(Failure(page_name, "warning paragraph shows source line breaks in edit mode"))

        table = page.locator("#sphinx-myst-preview-content table:not(.okf-properties)")
        if table.count() != 1 or not table.is_visible():
          failures.append(Failure(page_name, "rendered content table is missing from edit mode"))
        elif table.locator("td").count() == 0 or table.locator("td").first.evaluate(
          "element => getComputedStyle(element).whiteSpace"
        ) == "pre":
          failures.append(Failure(page_name, "content table was changed to source-line wrapping"))
      if edit_target is None:
        return

    if edit_target == "title":
      target = page.locator("main > h1").first
    elif edit_target == "paragraph":
      target = page.locator("main > p").first
    elif edit_target == "admonition":
      target = page.get_by_text("Calibration gate", exact=True)
    elif edit_target == "list":
      target = page.locator("main ul > li").nth(1)
    elif edit_target == "table-cell":
      target = page.locator("main table:not(.okf-properties) tbody td:nth-child(3)").first
    elif edit_target == "table-cell-wide":
      target = page.locator("main table:not(.okf-properties) tbody td:last-child").first
    elif edit_target == "frontmatter-key":
      target = page.locator('[data-okf-field="status"] th[data-okf-edit-cell="name"]')
    elif edit_target == "frontmatter-value":
      target = page.locator('[data-okf-field="status"] td[data-okf-edit-cell="value"]')
    elif edit_target == "frontmatter-list":
      target = page.locator('[data-okf-field="derives_from"] td[data-okf-edit-cell="value"]')
    elif edit_target == "frontmatter-boolean":
      target = page.locator('[data-okf-field="annotation_exemption"] td[data-okf-edit-cell="value"]')
    else:
      failures.append(Failure(page_name, f"unknown edit target {edit_target!r}"))
      return

    if target.count() == 0:
      failures.append(Failure(page_name, f"edit target {edit_target!r} is missing"))
      return
    if edit_target == "frontmatter-list":
      preview_items = page.locator('[data-okf-field="derives_from"] .okf-list-preview li')
      if preview_items.count() != 4:
        failures.append(Failure(page_name, f"frontmatter list preview shows {preview_items.count()} items, expected 4"))
      if page.locator('[data-okf-field="derives_from"] .okf-list-more').count() != 0:
        failures.append(Failure(page_name, "frontmatter list preview truncates a list below the 20-item cap"))
    original_cell_bounds = target.bounding_box() if edit_target in {"table-cell", "table-cell-wide"} else None
    original_cell_html = target.inner_html() if edit_target == "table-cell" else None
    clicked_word = None
    click_offset = None
    if edit_target in {"title", "paragraph", "admonition", "list"}:
      target.scroll_into_view_if_needed()
      # The centre of the block, unless the floating toolbar covers it (a 460 px pane): then the
      # point moves left, out from under the toolbar. The word probe and the click share it.
      click_offset = target.evaluate("""element => {
        const box = element.getBoundingClientRect();
        const bar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();
        const y = box.height / 2;
        let x = box.width / 2;
        const covered = box.left + x >= bar.left && box.top + y >= bar.top && box.top + y <= bar.bottom;
        if (covered) x = Math.max(4, Math.min(x, bar.left - box.left - 8) / 2);
        return { x, y };
      }""")
      clicked_word = target.evaluate("""(element, point) => {
        const box = element.getBoundingClientRect();
        const x = box.left + point.x;
        const y = box.top + point.y;
        const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
        const node = range && range.startContainer;
        if (!node || node.nodeType !== 3 || !element.contains(node)) return null;
        // Offset of the caret in the element's whole text, so a word split across inline
        // elements (for example a code span next to plain text) is found.
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let offset = 0;
        for (let current = walker.nextNode(); current && current !== node; current = walker.nextNode()) {
          offset += (current.nodeValue || "").length;
        }
        offset += range.startOffset;
        const text = element.textContent || "";
        const isWord = character => /[\\p{L}\\p{N}_-]/u.test(character);
        let start = offset;
        let end = offset;
        while (start > 0 && isWord(text.charAt(start - 1))) start -= 1;
        while (end < text.length && isWord(text.charAt(end))) end += 1;
        const word = text.slice(start, end);
        return word.length >= 3 ? word : null;
      }""", click_offset)
    if edit_target == "frontmatter-boolean":
      # A click toggles a boolean directly (T20); the keyboard opens the editor.
      target.focus()
      page.keyboard.press("Enter")
    elif click_offset is not None:
      target.click(position=click_offset)
    else:
      target.click()

    if edit_target == "frontmatter-list":
      editor = page.locator("[data-okf-frontmatter-editor]")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, "clicking the frontmatter list did not open its editor"))
        return
      if not editor.evaluate("element => element.parentElement?.matches('td[data-okf-value-cell]') === true"):
        failures.append(Failure(page_name, "frontmatter list editor is not inside its value cell"))
      if page.locator('[data-okf-field="derives_from"] [data-okf-value-display]').is_visible():
        failures.append(Failure(page_name, "frontmatter list preview remains visible under its editor"))
      button_texts = [text.strip().lower() for text in editor.locator("button").all_text_contents()]
      if any(text in {"save", "cancel"} for text in button_texts):
        failures.append(Failure(page_name, "frontmatter list editor exposes Save or Cancel controls"))
      list_editor = editor.locator(".okf-list-editor")
      rows = list_editor.locator(".okf-list-editor-item")
      if rows.count() != 4:
        failures.append(Failure(page_name, f"frontmatter list editor opened {rows.count()} items, expected 4"))
      handles = rows.locator(".okf-list-editor-handle")
      if handles.count() != rows.count() or not handles.evaluate_all(
        "items => items.every(handle => handle.getAttribute('draggable') === 'true')"
      ):
        failures.append(Failure(page_name, "frontmatter list items are missing draggable anchor handles"))
      if rows.locator(".okf-list-editor-remove[aria-label='Remove list item']").count() != rows.count():
        failures.append(Failure(page_name, "frontmatter list items are missing X removal controls"))
      inputs = rows.locator(".okf-list-editor-input")
      add_button = editor.locator("button[aria-label='Add list item']")
      set_null_button = editor.locator("button[data-okf-list-set-null='true']")
      if set_null_button.count() != 1 or not set_null_button.is_visible():
        failures.append(Failure(page_name, "nullable list editor is missing its set-as-null link"))
      if inputs.count() == 4 and add_button.count() == 1:
        input_colors = inputs.first.evaluate("""element => {
          const inputStyle = getComputedStyle(element);
          const cell = element.closest('td[data-okf-value-cell]');
          return {
            input: inputStyle.color,
            cell: cell ? getComputedStyle(cell).color : null,
          };
        }""")
        if input_colors["input"] != input_colors["cell"]:
          failures.append(
            Failure(
              page_name,
              f"frontmatter list input color {input_colors['input']} differs from its cell color {input_colors['cell']}",
            )
          )
        inputs.first.fill("StRS-CORE-001 updated")
        handles.first.focus()
        handles.first.press("ArrowDown")
        reordered = rows.locator(".okf-list-editor-input").evaluate_all(
          "items => items.map(input => input.value)"
        )
        if reordered != ["StRS-CORE-002", "StRS-CORE-001 updated", "StRS-CORE-003", "StRS-CORE-004"]:
          failures.append(Failure(page_name, f"frontmatter list reorder produced {reordered!r}"))
        add_button.click()
        if rows.count() != 5:
          failures.append(Failure(page_name, "Add item did not append a fifth list row"))
        else:
          rows.locator(".okf-list-editor-input").last.fill("StRS-CORE-005")
          rows.locator(".okf-list-editor-remove").last.click()
          if rows.count() != 4:
            failures.append(Failure(page_name, "X removal did not remove the added list row"))
          remaining = rows.locator(".okf-list-editor-input").evaluate_all(
            "items => items.map(input => input.value)"
          )
          if remaining != ["StRS-CORE-002", "StRS-CORE-001 updated", "StRS-CORE-003", "StRS-CORE-004"]:
            failures.append(Failure(page_name, f"X removal changed the wrong list row: {remaining!r}"))
          rows.locator(".okf-list-editor-remove").first.click()
          if rows.count() != 3:
            failures.append(Failure(page_name, "X removal did not remove an existing list row"))
          else:
            remaining = rows.locator(".okf-list-editor-input").evaluate_all(
              "items => items.map(input => input.value)"
            )
            if remaining != ["StRS-CORE-001 updated", "StRS-CORE-003", "StRS-CORE-004"]:
              failures.append(Failure(page_name, f"X removal changed the wrong existing row: {remaining!r}"))
      if set_null_button.count() == 1:
        set_null_button.click()
        saved_as_null = page.evaluate(
          "() => window.visualMessages.some(message => message.type === 'previewFrontmatterSave' "
          "&& message.fieldName === 'derives_from' && message.fieldValue === null)"
        )
        if not saved_as_null:
          failures.append(Failure(page_name, "set-as-null link did not post a null frontmatter save"))
      label = page.locator('[data-okf-field="derives_from"] .okf-type-label')
      if label.count() != 1 or label.text_content() != "(list)":
        failures.append(Failure(page_name, "list type label is missing from the frontmatter name cell"))
      if "(list)" in (page.locator('[data-okf-field="derives_from"] .okf-doc').text_content() or ""):
        failures.append(Failure(page_name, "list type label still appears in the description cell"))
      return

    if edit_target == "frontmatter-boolean":
      editor = page.locator("[data-okf-frontmatter-editor]")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, "clicking the boolean frontmatter value did not open its editor"))
        return
      checkbox = editor.locator('input[type="checkbox"]')
      if checkbox.count() != 1 or not checkbox.is_visible():
        failures.append(Failure(page_name, "boolean frontmatter editor did not expose a visible checkbox"))
        return
      if not checkbox.is_checked():
        failures.append(Failure(page_name, "boolean frontmatter checkbox did not start checked"))
      if checkbox.get_attribute("class") != "okf-value-checkbox":
        failures.append(Failure(page_name, "boolean frontmatter editor checkbox does not use the preview checkbox style"))
      checkbox.click()
      if checkbox.is_checked():
        failures.append(Failure(page_name, "boolean frontmatter checkbox did not toggle when clicked"))
      saved = page.evaluate(
        "() => window.visualMessages.some(message => message.type === 'previewFrontmatterSave' "
        "&& message.fieldName === 'annotation_exemption' && message.fieldValue === false)"
      )
      if not saved:
        failures.append(Failure(page_name, "boolean checkbox click did not post a false frontmatter save"))
      return

    if edit_target in {"title", "paragraph", "admonition", "list"}:
      editor = page.locator(".sphinx-preview-block-editor textarea")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, f"clicking {edit_target} did not open its Markdown editor"))
      elif page.locator(
        '[aria-label="Save Markdown block"], [aria-label="Cancel Markdown edit"]'
      ).count():
        failures.append(Failure(page_name, "raw block editor still exposes Save or Cancel buttons"))
      elif editor.evaluate("element => getComputedStyle(element.parentElement).borderTopWidth") != "1px":
        failures.append(Failure(page_name, "raw block editor has no visible surrounding frame"))
      elif not editor.evaluate("""(element, word) => {
        const position = element.selectionStart;
        const nearCaret = word === null
          ? position === element.value.trimEnd().length
          : element.value.slice(Math.max(0, position - 40), position + 40).includes(word);
        return document.activeElement === element
          && element.selectionStart === element.selectionEnd
          && nearCaret
          && getComputedStyle(element).caretColor !== "transparent";
      }""", clicked_word):
        caret_start = editor.evaluate("element => element.selectionStart")
        failures.append(Failure(
          page_name,
          f"{edit_target} editor caret is not at the clicked word "
          f"(selectionStart={caret_start}, clicked_word={clicked_word!r})",
        ))
      elif edit_target == "admonition":
        source = editor.input_value()
        if not source.startswith("```{warning}") or not source.rstrip().endswith("```"):
          failures.append(Failure(page_name, "admonition editor does not contain both fences"))
      elif edit_target == "list":
        expected_lines = [
          "- Method: automated CLI tests over fixed knowledge-base fixtures.",
          "- Criteria: repeated operations are stable and failed operations leave authored",
          "  fixture content intact.",
        ]
        if editor.input_value().splitlines() != expected_lines:
          failures.append(Failure(page_name, "list editor does not contain every item and continuation line"))
        mapped_list = page.locator('main ul[data-sphinx-preview-editing="true"]')
        if mapped_list.count() != 1 or mapped_list.is_visible():
          failures.append(Failure(page_name, "editing one list item did not replace the whole list"))
        elif not editor.evaluate("""element => element.parentElement?.previousElementSibling
          ?.matches('ul[data-sphinx-preview-editing="true"]') === true"""):
          failures.append(Failure(page_name, "list editor is not positioned after the hidden whole list"))
        elif editor.evaluate("""element => element.scrollHeight > element.clientHeight + 1
          || element.scrollWidth > element.clientWidth + 1
          || element.scrollTop > 0 || element.scrollLeft > 0"""):
          failures.append(Failure(page_name, "wrapped list source is clipped when the editor opens"))
      return

    if edit_target == "table-cell-wide":
      # The table is wider than its wrapper: End must not shift it horizontally.
      target.scroll_into_view_if_needed()
      if not target.evaluate("""cell => {
        for (let node = cell.closest('table'); node; node = node.parentElement) {
          if (node.scrollWidth > node.clientWidth + 1
            && ['auto', 'scroll'].includes(getComputedStyle(node).overflowX)) return true;
        }
        return false;
      }"""):
        failures.append(Failure(page_name, "wide-table fixture does not overflow its wrapper"))
      target.click()
      wide_input = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
      if wide_input.count() != 1:
        failures.append(Failure(page_name, "clicking a far-right table cell did not open its editor"))
        return
      check_cell_editor_chrome(page, page_name, target, original_cell_bounds, failures)
      check_cell_end_key(page, page_name, wide_input, failures)
      page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-end.png"), caret="initial")
      wide_input.press("Escape")
      return

    if edit_target == "table-cell":
      editor = page.locator("[data-sphinx-preview-table-cell-editor]")
      if editor.count() != 1 or not editor.is_visible():
        failures.append(Failure(page_name, "clicking a table cell did not open its cell editor"))
        return
      if not editor.evaluate("element => element.parentElement?.matches('td, th') === true"):
        failures.append(Failure(page_name, "table cell editor is not placed inside its selected cell"))
      if editor.locator("textarea[aria-label='Markdown table cell']").count() != 1:
        failures.append(Failure(page_name, "table cell editor has no selected-cell input"))
      elif not editor.locator("textarea[aria-label='Markdown table cell']").evaluate("""element => {
        const position = element.value.trimEnd().length;
        return document.activeElement === element
          && element.selectionStart === position
          && element.selectionEnd === position
          && getComputedStyle(element).caretColor !== "transparent";
      }"""):
        failures.append(Failure(page_name, "table cell input has no caret at the end of its content"))
      elif not editor.locator("textarea[aria-label='Markdown table cell']").evaluate("""element =>
        getComputedStyle(element).borderWidth === "0px"
        && getComputedStyle(element).outlineStyle === "none"
      """):
        failures.append(Failure(page_name, "table cell input has a focus box that differs from inline frontmatter editing"))
      cell_content = target.locator("[data-sphinx-table-cell-content]")
      if cell_content.count() != 1 or not cell_content.evaluate("""element =>
        getComputedStyle(element).visibility === "hidden" && element.getAttribute("aria-hidden") === "true"
      """):
        failures.append(Failure(page_name, "rendered table-cell text remains visible beneath the editor"))
      check_cell_editor_chrome(page, page_name, target, original_cell_bounds, failures)
      if not editor.locator("textarea").evaluate("""element => {
        const style = getComputedStyle(element);
        const input = element.getBoundingClientRect();
        const cell = element.closest('td, th').getBoundingClientRect();
        return style.whiteSpace === "pre-wrap" && style.overflowWrap === "anywhere"
          && input.left >= cell.left - 1 && input.right <= cell.right + 1
          && input.top >= cell.top - 1 && input.bottom <= cell.bottom + 1;
      }"""):
        failures.append(Failure(page_name, "table-cell textarea does not wrap inside its cell bounds"))
      toolbar = page.locator("[data-sphinx-table-menu]")
      if toolbar.count() != 1 or not toolbar.is_visible():
        failures.append(Failure(page_name, "table action bar is missing or hidden"))
      elif toolbar.evaluate("element => getComputedStyle(element).position") != "static":
        failures.append(Failure(page_name, "table action bar is not in the document flow"))
      elif not toolbar.evaluate("""element => {
        const table = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]').closest('table');
        const next = element.nextElementSibling;
        return next === table || (next !== null && next.contains(table));
      }"""):
        failures.append(Failure(page_name, "table action bar does not directly precede its table"))
      anchor_layout = page.evaluate("""() => {
        const toolbar = document.querySelector('[data-sphinx-table-menu]');
        const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
        if (!toolbar || !cell) return null;
        const bar = toolbar.getBoundingClientRect();
        const table = cell.closest('table').getBoundingClientRect();
        const band = document.querySelector('[data-sphinx-preview-sticky-headings]');
        const bandRect = band && !band.hidden ? band.getBoundingClientRect() : null;
        const usableTop = bandRect && bandRect.height > 0 ? bandRect.bottom : 0;
        const unreachable = Array.from(toolbar.querySelectorAll('[data-sphinx-table-operation]')).filter(button => {
          const rect = button.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return !hit || !toolbar.contains(hit);
        }).length;
        const covered = Array.from(cell.closest('table').querySelectorAll('th, td')).filter(other => {
          const rect = other.getBoundingClientRect();
          return Math.min(bar.right, rect.right) - Math.max(bar.left, rect.left) > 1
            && Math.min(bar.bottom, rect.bottom) - Math.max(bar.top, rect.top) > 1;
        }).length;
        return {
          barLeft: bar.left,
          barTop: bar.top,
          barBottom: bar.bottom,
          tableTop: table.top,
          covered,
          controlsBottom: document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect().bottom,
          usableTop,
          unreachable,
        };
      }""")
      if (
        not anchor_layout
        or anchor_layout["barBottom"] > anchor_layout["tableTop"] + 1
        or anchor_layout["covered"] != 0
      ):
        failures.append(Failure(page_name, f"table action bar is not above the table or covers cells: {anchor_layout}"))
      if (
        anchor_layout
        and (anchor_layout["barTop"] < anchor_layout["usableTop"] - 1 or anchor_layout["unreachable"] != 0)
      ):
        failures.append(Failure(page_name, f"table action bar is hidden under the sticky band or preview controls: {anchor_layout}"))
      toolbar_bounds = toolbar.bounding_box()
      if (
        toolbar_bounds is None
        or toolbar_bounds["x"] < 0
        or toolbar_bounds["y"] < 0
        or toolbar_bounds["x"] + toolbar_bounds["width"] > page.viewport_size["width"]
        or toolbar_bounds["y"] + toolbar_bounds["height"] > page.viewport_size["height"]
      ):
        failures.append(Failure(page_name, f"table action bar is outside the screenshot viewport: {toolbar_bounds}"))
      operations = toolbar.locator("[data-sphinx-table-operation]")
      if operations.count() != 4:
        failures.append(Failure(page_name, f"table action bar has {operations.count()} row/column actions, expected 4"))
      elif not operations.first.is_visible():
        failures.append(Failure(page_name, "table row/column actions are hidden while the cell editor has focus"))
      if toolbar.locator("[data-sphinx-preview-table-save], [data-sphinx-preview-table-cancel]").count() != 0:
        failures.append(Failure(page_name, "table action bar still contains Save or Cancel controls"))
      # The four row and column buttons are the bar's own children; the inline group is checked apart (T35).
      buttons = toolbar.locator(":scope > button")
      if buttons.count() != 4 or not buttons.evaluate_all("""items => items.every(button =>
        button.getAttribute("aria-label")
        && button.title
        && button.querySelector("svg")
      )"""):
        failures.append(Failure(page_name, "table action chips are missing accessible SVG icons or tooltips"))
      selected_cell = page.locator('[data-sphinx-preview-table-cell-selected="true"]')
      selected_cell_state = selected_cell.evaluate("""element => {
        const style = getComputedStyle(element);
        return {
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          editMode: document.documentElement.getAttribute('data-sphinx-preview-edit-mode'),
          editableCell: element.getAttribute('data-okf-edit-cell'),
          tabIndex: element.getAttribute('tabindex'),
          focusVisible: element.matches(':focus-visible'),
          focused: document.activeElement === element,
        };
      }""") if selected_cell.count() == 1 else None
      if (
        not selected_cell_state
        or selected_cell_state["outlineStyle"] != "solid"
        or selected_cell_state["outlineWidth"] != "2px"
      ):
        failures.append(Failure(page_name, f"selected table cell has no visible focus outline: {selected_cell_state}"))
      label_texts = toolbar.locator(".sphinx-preview-table-menu-label").all_text_contents()
      if label_texts != ["Row +", "Row \u2212", "Col +", "Col \u2212"]:
        failures.append(Failure(page_name, f"table action bar labels are wrong: {label_texts}"))
      check_cell_bar_formatting(page, page_name, scenario, toolbar, failures)
      cell_input = editor.locator("textarea[aria-label='Markdown table cell']")
      original_value = cell_input.input_value()
      cell_input.fill(original_value + " updated")
      try:
        # Autosave is debounced (400 ms).
        page.wait_for_function("""() => window.visualMessages.some(message =>
          message.type === "previewEditSave" && message.final === false
          && message.editedText.includes(" updated")
        )""", timeout=2000)
      except PlaywrightTimeoutError:
        failures.append(Failure(page_name, "wrapped table-cell edit did not autosave its updated Markdown"))
      table = target.locator("xpath=ancestor::table")
      destinations = [
        table.locator("tbody tr").first.locator("td").nth(3),
        table.locator("tbody tr").nth(1).locator("td").nth(2),
        table.locator("thead th").first,
        target,
      ]
      for index, destination in enumerate(destinations):
        destination.click()
        active_editor = destination.locator("[data-sphinx-preview-table-cell-editor]")
        if active_editor.count() != 1 or not active_editor.is_visible():
          failures.append(Failure(page_name, f"table editing got stuck switching to destination {index + 1}"))
          return
        if page.locator("[data-sphinx-preview-table-cell-editor]").count() != 1:
          failures.append(Failure(page_name, "switching table cells left multiple editors open"))
        cell_input = active_editor.locator("textarea")
        if page.locator("[data-sphinx-table-cell-content]").count() != 1 or page.locator(
          '[data-sphinx-preview-table-cell-selected="true"]'
        ).count() != 1:
          failures.append(Failure(page_name, "switching table cells left stale hidden content or selected cells"))
        if not cell_input.evaluate("element => document.activeElement === element"):
          failures.append(Failure(page_name, "switching table cells did not focus the destination editor"))
        if index == len(destinations) - 1:
          if cell_input.input_value() != original_value + " updated":
            failures.append(Failure(page_name, "returning to the first cell lost its edited value"))
        else:
          cell_input.fill(cell_input.input_value() + f" journey-{index + 1}")
      if not page.evaluate("""() => {
        const saves = window.visualMessages.filter(message => message.type === "previewEditSave");
        const latest = saves[saves.length - 1];
        return latest && [" updated", "journey-1", "journey-2", "journey-3"]
          .every(value => latest.editedText.includes(value))
          && new Set(saves.map(message => message.editId)).size === 1;
      }"""):
        failures.append(Failure(page_name, "multi-cell autosave did not preserve all changes in one table edit session"))
      check_cell_end_key(page, page_name, cell_input, failures)
      page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-end.png"), caret="initial")
      # The scenario's final frame is taken after Escape closed the editor; keep the open state too.
      page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-open.png"), caret="initial")
      # ArrowDown on the last line moves the editor to the cell below in the same column.
      before = cell_input.evaluate("""element => {
        const cell = element.closest('td, th');
        const end = element.value.length;
        element.setSelectionRange(end, end);
        return { row: cell.parentElement.rowIndex, column: cell.cellIndex };
      }""")
      cell_input.press("ArrowDown")
      moved = page.evaluate("""() => {
        const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
        return cell ? {
          row: cell.parentElement.rowIndex,
          column: cell.cellIndex,
          editors: document.querySelectorAll('[data-sphinx-preview-table-cell-editor]').length,
          focused: document.activeElement === cell.querySelector('textarea'),
        } : null;
      }""")
      if not moved or moved["row"] != before["row"] + 1 or moved["column"] != before["column"] \
          or moved["editors"] != 1 or not moved["focused"]:
        failures.append(Failure(page_name, f"ArrowDown did not move the cell editor to the cell below: {before} -> {moved}"))
      else:
        check_cell_editor_chrome(page, page_name, None, None, failures)
      page.screenshot(path=str(SCREENSHOT_DIR / f"{scenario['id']}-arrowdown.png"), caret="initial")
      cell_input = page.locator("[data-sphinx-preview-table-cell-editor] textarea")
      cell_input.press("Escape")
      if not page.evaluate("""() => {
        const saves = window.visualMessages.filter(message => message.type === "previewEditSave");
        return saves.length > 0 && saves.every(message => message.final !== true)
          && window.visualMessages.some(message => message.type === "previewEditCancel");
      }"""):
        failures.append(Failure(page_name, "Escape in a table cell did not cancel the edit"))
      return

    editor = page.locator("[data-okf-frontmatter-editor]")
    if editor.count() != 1 or not editor.is_visible():
      failures.append(Failure(page_name, f"clicking a frontmatter {edit_target.removeprefix('frontmatter-')} cell did not open its editor"))
      return
    expected_cell = "th[data-okf-edit-cell='name']" if edit_target == "frontmatter-key" else "td[data-okf-value-cell]"
    if not editor.evaluate("(element, selector) => element.parentElement?.matches(selector) === true", expected_cell):
      failures.append(Failure(page_name, "frontmatter editor is not rendered inside its activated cell"))
    display_selector = ".okf-name-cell" if edit_target == "frontmatter-key" else "[data-okf-value-display]"
    active_cell = page.locator(f'[data-okf-field="status"] {expected_cell}')
    if active_cell.locator(display_selector).is_visible():
      failures.append(Failure(page_name, "original frontmatter text remains visible under its editor"))
    if editor.locator("button:not([data-okf-frontmatter-menu] button)").count() != 0:
      failures.append(Failure(page_name, "frontmatter editor still has action buttons outside the field action menu"))
    editor_style = editor.evaluate("""element => {
      const style = getComputedStyle(element);
      return {
        border: style.borderWidth,
        padding: style.padding,
        background: style.backgroundColor,
      };
    }""")
    if editor_style != {"border": "0px", "padding": "0px", "background": "rgba(0, 0, 0, 0)"}:
      failures.append(Failure(page_name, f"frontmatter editor still has a frame: {editor_style}"))
    if edit_target == "frontmatter-key":
      control = editor.locator('input[aria-label="Frontmatter key status"][list]')
      expected_value = "status"
      editing_attribute = "data-okf-key-editing"
      options = control.evaluate("""input => {
        const datalist = document.getElementById(input.getAttribute("list"));
        return datalist ? [...datalist.options].map(option => option.value) : [];
      }""") if control.count() == 1 else []
      if "summary" not in options:
        failures.append(Failure(page_name, "frontmatter key dropdown omits the unused schema key"))
    else:
      control = editor.locator('select[aria-label="Frontmatter status"]')
      expected_value = "active"
      editing_attribute = "data-okf-editing"
    if control.count() != 1 or not control.is_visible():
      failures.append(Failure(page_name, "the expected frontmatter field control is not visible"))
      return
    control.scroll_into_view_if_needed()
    if control.input_value() != expected_value:
      failures.append(Failure(page_name, f"frontmatter editor does not show {expected_value!r}"))
    if not control.evaluate("element => document.activeElement === element"):
      failures.append(Failure(page_name, "frontmatter field control is not focused for editing"))
    if edit_target == "frontmatter-key" and not control.evaluate("""element => {
      const position = element.value.trimEnd().length;
      return document.activeElement === element
        && element.selectionStart === position
        && element.selectionEnd === position
        && getComputedStyle(element).caretColor !== "transparent";
    }"""):
      failures.append(Failure(page_name, "frontmatter key input has no caret at the end of its content"))
    bounds = control.evaluate("""element => {
      const cell = element.closest('[data-okf-edit-cell]');
      if (!cell) return null;
      const control = element.getBoundingClientRect();
      const cellBounds = cell.getBoundingClientRect();
      return {
        controlLeft: control.left,
        controlRight: control.right,
        cellLeft: cellBounds.left,
        cellRight: cellBounds.right,
      };
    }""")
    if (
      not bounds
      or bounds["controlLeft"] < bounds["cellLeft"] - 1
      or bounds["controlRight"] > bounds["cellRight"] + 1
    ):
      failures.append(Failure(page_name, f"frontmatter control is not aligned within its cell: {bounds}"))
    if not editor.evaluate(
      "(element, attribute) => element.parentElement?.getAttribute(attribute) === 'true'",
      editing_attribute,
    ):
      failures.append(Failure(page_name, "the target frontmatter cell is not marked as editing"))
    page.evaluate("window.scrollTo(0, 0)")
    if page.evaluate("window.scrollY") != 0:
      failures.append(Failure(page_name, "frontmatter screenshot is not at the top of the file"))
    properties = page.locator("[data-okf-properties] table.okf-properties")
    if properties.count() != 1:
      failures.append(Failure(page_name, "frontmatter properties table is missing or duplicated"))
    else:
      properties_bounds = properties.bounding_box()
      if (
        properties_bounds is None
        or properties_bounds["y"] < 0
        or properties_bounds["y"] + properties_bounds["height"] > page.viewport_size["height"]
      ):
        failures.append(Failure(
          page_name,
          f"frontmatter properties table is outside the screenshot viewport: {properties_bounds}",
        ))
    bounds = control.bounding_box()
    if (
      bounds is None
      or bounds["y"] < 0
      or bounds["y"] + bounds["height"] > page.viewport_size["height"]
    ):
      failures.append(Failure(
        page_name,
        f"frontmatter field is outside the screenshot viewport: {bounds}",
      ))
    if edit_target == "frontmatter-value":
      def reject_mock_save() -> None:
        page.evaluate("""() => {
          const save = window.visualMessages.filter(message => message.type === 'previewFrontmatterSave').at(-1);
          if (!save) throw new Error('No save message to acknowledge');
          const result = { ...save, type: 'previewFrontmatterResult', saved: false,
            error: 'Static mock host does not persist frontmatter; cancel and reopen.' };
          window.visualMessages.push(result);
          window.dispatchEvent(new MessageEvent('message', { data: result }));
        }""")
      menu = page.locator("[data-okf-frontmatter-menu]")
      if menu.count() != 1 or not menu.is_visible():
        failures.append(Failure(page_name, "frontmatter field action menu is missing or hidden"))
      else:
        placement = menu.evaluate("""element => {
          const editor = element.closest('[data-okf-frontmatter-editor]');
          const bounds = element.getBoundingClientRect();
          return {
            inEditor: Boolean(editor) && element.parentElement === editor,
            position: getComputedStyle(element).position,
            left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
            viewportWidth: document.documentElement.clientWidth,
            viewportHeight: window.innerHeight,
            labels: [...element.querySelectorAll('button')].map(button => button.textContent.trim()),
            clippedButtons: [...element.querySelectorAll('button')].filter(button => {
              const box = button.getBoundingClientRect();
              return box.left < 0 || box.right > document.documentElement.clientWidth;
            }).length,
          };
        }""")
        if not placement["inEditor"] or placement["position"] != "static":
          failures.append(Failure(page_name, f"frontmatter field actions are not inside the editing cell in normal flow: {placement}"))
        if placement["left"] < 0 or placement["right"] > placement["viewportWidth"] or placement["clippedButtons"]:
          failures.append(Failure(page_name, f"frontmatter field actions are clipped horizontally: {placement}"))
        if placement["labels"][:2] != ["Add field", "Remove field"]:
          failures.append(Failure(page_name, f"frontmatter field action labels are missing: {placement['labels']}"))
        add_button = menu.locator("button[data-okf-frontmatter-operation='add']")
        if add_button.count() != 1 or not add_button.is_visible():
          failures.append(Failure(page_name, "frontmatter Add field button is missing or hidden"))
        else:
          hit_target = add_button.evaluate("""button => {
            const bounds = button.getBoundingClientRect();
            const target = document.elementFromPoint(
              bounds.left + bounds.width / 2,
              bounds.top + bounds.height / 2,
            );
            return target === button || button.contains(target);
          }""")
          if not hit_target:
            failures.append(Failure(page_name, "frontmatter Add field button is covered at its click point"))
          add_button.click()
          picker = menu.locator(".sphinx-preview-frontmatter-picker")
          if picker.count() != 1 or not picker.is_visible():
            failures.append(Failure(page_name, "clicking the frontmatter Add field button did not open the field picker"))
          else:
            field_picker = picker.locator("select[aria-label='Frontmatter field to add']")
            values = field_picker.locator("option").evaluate_all(
              "options => options.map(option => option.value).filter(Boolean)"
            ) if field_picker.count() == 1 else []
            if not values:
              failures.append(Failure(page_name, "frontmatter field picker has no available schema fields"))
            else:
              field_picker.select_option(values[0])
              try:
                page.wait_for_function(
                  "(fieldName) => window.visualMessages.some(message => message.type === 'previewFrontmatterSave' "
                  "&& message.frontmatterAction === 'add' && message.fieldName === fieldName "
                  "&& message.afterField === 'status')",
                  arg=values[0],
                  timeout=2000,
                )
              except Exception:
                failures.append(Failure(page_name, "frontmatter Add field selection did not post an add save after the open field"))
              confirm_add = picker.locator("button[data-okf-frontmatter-operation='confirm-add']")
              if confirm_add.count() != 0 and confirm_add.is_visible():
                failures.append(Failure(page_name, "frontmatter Add confirmation is still shown for the select picker"))
      reject_mock_save()
      control.press("Escape")
      if page.locator('[data-okf-frontmatter-editor]').count():
        failures.append(Failure(page_name, "Escape did not close the enum/Add-field edit session"))
      page.locator('[data-okf-field="status"] td[data-okf-edit-cell="value"]').click()
      enum = page.locator('select[aria-label="Frontmatter status"]')
      if enum.count() != 1 or not enum.is_visible():
        failures.append(Failure(page_name, "final enum capture does not show the status select"))
      elif not {"active", "draft", "retired"}.issubset(set(enum.locator("option").evaluate_all("options => options.map(option => option.value)"))):
        failures.append(Failure(page_name, "status enum options differ from the schema"))
      else:
        enum.select_option("draft")
        enum.press("Enter")
        saved = page.evaluate("""() => window.visualMessages.some(message =>
          message.type === 'previewFrontmatterSave' && message.fieldName === 'status'
          && message.fieldValue === 'draft')""")
        if not saved:
          failures.append(Failure(page_name, "enum selection did not post a draft save"))
        reject_mock_save()
        enum.press("Escape")
        if page.locator('[data-okf-frontmatter-editor]').count():
          failures.append(Failure(page_name, "Escape did not cancel the enum editor"))
        page.locator('[data-okf-field="status"] td[data-okf-edit-cell="value"]').click()
        if page.locator('.sphinx-preview-frontmatter-picker:visible').count():
          failures.append(Failure(page_name, "final enum screenshot still contains the Add-field picker"))

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
    if style["borderRadius"] != "0px" or style["boxShadow"] != "none":
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
    result = page.evaluate(r"""() => {
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
        if (bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.top < 0 || bounds.bottom > innerHeight + 1) {
          errors.push(`final editor is clipped: ${element.getAttribute('aria-label')}`);
        }
        // The toolbar only reserves room for text that shares horizontal space with it.
        const reserved = Math.max(0, ...[toolbar, sticky].filter(item => item && visible(item))
          .map(item => item.getBoundingClientRect())
          .filter(box => bounds.left < box.right && bounds.right > box.left)
          .map(box => box.bottom));
        if (bounds.top < reserved - 1) errors.push('final editor text collides with toolbar/sticky overlay');
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
    }""")
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
            if (!code.querySelector('[class*="hljs-"]')) errors.push(`${language} has no syntax token scopes`);
          }
          for (const [language, scopes] of Object.entries({
            rust: ['keyword', 'string', 'number', 'comment'],
            python: ['keyword', 'string', 'number', 'comment'],
          })) {
            const code = document.querySelector(`code.language-${language}`);
            for (const scope of scopes) {
              if (!code?.querySelector(`.hljs-${scope}`)) errors.push(`${language} lacks ${scope} scope`);
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


def check_tooltip_contrast(page: Page, scenario: dict, failures: list[Failure]) -> None:
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


def check_mermaid_theme_switch(page: Page, scenario: dict, failures: list[Failure]) -> None:
  if scenario["id"] != "mermaid-map-dark":
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
      expected.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--vscode-textCodeBlock-background');
      host.appendChild(expected);
      const state = {
        expected: getComputedStyle(expected).backgroundColor,
        fills: [...host.querySelectorAll('.node rect, .node polygon, .node circle, .node path')]
          .filter(node => !node.style.fill).map(node => getComputedStyle(node).fill),
        labels: [...host.querySelectorAll('.nodeLabel')].map(node => node.textContent),
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


def run_scenario(page: Page, scenario: dict, failures: list[Failure], result: dict) -> str:
  expected_mermaid = count_mermaid_blocks(scenario["fixture"])
  if expected_mermaid:
    page.wait_for_function(
      "expected => { const diagrams = [...document.querySelectorAll('.myst-mermaid-diagram')]; "
      "return diagrams.length === expected && diagrams.every(diagram => diagram.dataset.renderState); }",
      arg=expected_mermaid,
    )
    contrast_errors = page.evaluate(r"""async () => {
      const errors = [];
      const luminance = color => {
        const channels = (color.match(/[\d.]+/g) || []).slice(0, 3).map(value => {
          const channel = Number(value) / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      for (const image of document.querySelectorAll('img.myst-mermaid-image')) {
        const svg = new DOMParser().parseFromString(await (await fetch(image.src)).text(), 'image/svg+xml').documentElement;
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-10000px;visibility:hidden';
        host.appendChild(document.importNode(svg, true));
        document.body.appendChild(host);
        const labels = [...host.querySelectorAll('.edgeLabel p, .edgeLabel text')];
        const source = image.closest('.myst-mermaid-diagram')?.querySelector('.myst-mermaid-source')?.textContent || '';
        if (!labels.length && /\|[^|]+\|/.test(source)) errors.push('Mermaid SVG lost expected internal edge labels');
        for (const label of labels) {
          const foreground = getComputedStyle(label).color;
          let background = 'rgba(0, 0, 0, 0)';
          for (let ancestor = label; ancestor && ancestor !== host; ancestor = ancestor.parentElement) {
            const candidate = getComputedStyle(ancestor).backgroundColor;
            if (candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') {
              background = candidate;
              break;
            }
          }
          if (background === 'rgba(0, 0, 0, 0)') background = getComputedStyle(document.body).backgroundColor;
          const values = [luminance(foreground), luminance(background)].sort((first, second) => second - first);
          const ratio = (values[0] + .05) / (values[1] + .05);
          if (!Number.isFinite(ratio) || ratio < 4.5) errors.push(`Mermaid edge label "${label.textContent}" contrast is ${ratio.toFixed(2)}:1`);
        }
        host.remove();
      }
      return errors;
    }""")
    for detail in contrast_errors:
      failures.append(Failure(scenario['page'], detail))
  expected_width = scenario.get("expectedContentWidth")
  if expected_width is not None:
    geometry = page.locator("#sphinx-myst-preview-content").bounding_box()
    if not geometry or abs(geometry["width"] - expected_width) > 1 or abs(geometry["x"] - (scenario["width"] - expected_width) / 2) > 1:
      failures.append(Failure(scenario["page"], f"content is not centered at expected width {expected_width}: {geometry}"))
  checks = PAGE_CHECKS.replace("__MIN_CONTRAST__", str(MIN_PANEL_CONTRAST))
  for placeholder, value in (
    ("__EXPECTED_ADMONITIONS__", count_admonitions(scenario["fixture"]) + count_context_tags(scenario["fixture"])),
    ("__EXPECTED_FIGURES__", count_figures(scenario["fixture"])),
    ("__EXPECTED_MERMAID__", expected_mermaid),
    ("__EXPECTED_PLANTUML__", count_plantuml_blocks(scenario["fixture"])),
    ("__EXPECTED_CONTEXT_TAGS__", count_context_tags(scenario["fixture"])),
    ("__CONTEXT_TAG_CHECKS__", json.dumps(bool(scenario.get("contextTagChecks")))),
    ("__PLANTUML_EXPECTATION__", json.dumps(scenario.get("plantumlExpectation", "none"))),
  ):
    checks = checks.replace(placeholder, str(value))
  for check in (
    check_mermaid_theme_switch, check_forced_white_theme, check_forced_cream_theme, check_frontmatter_rendering, check_deferred_frontmatter_links,
    check_generic_skill_frontmatter, check_okf_schema_rendering, check_preview_toolbar,
    check_math_rendering, check_bare_urls, check_inline_code, check_inline_code_narrow, check_content_contracts,
  ):
    try:
      check(page, scenario, failures)
    except Exception as error:
      failures.append(Failure(scenario["page"], f"{check.__name__}: {error}"))
  for detail in page.evaluate(checks):
    failures.append(Failure(scenario["page"], detail))
  initial_top = page.locator("#sphinx-myst-preview-content").evaluate(
    "element => element.getBoundingClientRect().top + scrollY"
  )
  if scenario.get("fullPage"):
    page.add_style_tag(content="#sphinx-myst-preview-content { padding-bottom: 40px !important; }")
  position = apply_scroll(page, scenario["scroll"])
  result["actions"].append(position)
  for check in (
    check_edit_activation_scroll, check_preview_edit_mode, check_top_spacing, check_first_element_gap, check_width_modes, apply_width_shot, check_toc_column, check_figure_anchors, check_comment_chips, check_code_copy, check_edit_affordances, check_edit_palette, check_insert_after_figure, check_nested_list_typing, check_editor_keyboard, stress_frontmatter_scroll,
    stress_sticky_heading_scroll, check_horizontal_access, check_link_details,
  ):
    try:
      check(page, scenario, failures)
      result["actions"].append(check.__name__)
    except Exception as error:
      failures.append(Failure(scenario["page"], f"{check.__name__}: {error}"))
  page.wait_for_timeout(120)
  if scenario.get("editTarget") in {"frontmatter-key", "frontmatter-value"}:
    pin_frontmatter_capture(page, scenario, failures)
  if scenario.get("editTarget") == "frontmatter-key":
    key_input = page.locator('input[aria-label="Frontmatter key status"][list]')
    if key_input.count() != 1:
      failures.append(Failure(scenario["page"], "frontmatter key suggestion input is missing"))
    else:
      key_input.fill("s")
      key_input.press("ArrowDown")
      page.wait_for_timeout(100)
      show_schema_key_suggestions(page, scenario, failures)
  if scenario.get("expectedStickyHeadings"):
    check_sticky_headings(page, scenario, failures, initial_top)
  check_tooltip_contrast(page, scenario, failures)
  return position


def capture_scenarios(page_directory: pathlib.Path, scenarios: list[dict]) -> tuple[list[dict], list[Failure]]:
    failures: list[Failure] = []
    results: list[dict] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            for scenario in scenarios:
                start_failures = len(failures)
                result = {"id": scenario["id"], "sequence": scenario.get("sequence"),
                          "group": scenario.get("group", "Review"), "screenshotOf": scenario.get("screenshotOf"),
                          "expectedContent": scenario["description"],
                          "actions": [], "finalState": {}}
                context = browser.new_context(
                    viewport={"width": scenario["width"], "height": scenario["height"]},
                    device_scale_factor=2,
                )
                if scenario.get("mathRenderingChecks"):
                    context.set_offline(True)
                page = context.new_page()
                position = "setup failed before scrolling"
                try:
                    page.goto((page_directory / scenario["page"]).as_uri())
                    page.wait_for_load_state("networkidle")
                    position = run_scenario(page, scenario, failures, result)
                except Exception as error:
                    failures.append(Failure(scenario["page"], f"scenario exception: {error}"))
                try:
                  if scenario.get('frontmatterLinkState'):
                    check_deferred_frontmatter_links(page, scenario, failures)
                  result["finalState"] = check_final_frame(page, scenario, failures)
                except Exception as error:
                    failures.append(Failure(scenario["page"], f"final frame unavailable: {error}"))
                result["failures"] = [failure.detail for failure in failures[start_failures:]]
                result["status"] = "failed" if result["failures"] else "passed"
                target = SCREENSHOT_DIR / f"{scenario['id']}.png"
                if not scenario.get("screenshotOf"):
                  try:
                    page.screenshot(
                      path=str(target),
                      full_page=bool(scenario.get("fullPage")),
                      caret="initial" if scenario.get("editTarget") else "hide",
                    )
                    result["capture"] = target.name
                  except Exception as error:
                    detail = f"screenshot unavailable: {error}"
                    failures.append(Failure(scenario["page"], detail))
                    result["failures"].append(detail)
                    result["status"] = "failed"
                  target.with_suffix(".json").write_text(
                    sidecar_json(scenario, f"final y={result['finalState'].get('scrollY', 'unknown')}; {position}", result), encoding="utf-8"
                  )
                results.append(result)
                print(f"{result['status']}: {scenario['id']}" + (f" (alias of {scenario['screenshotOf']})" if scenario.get("screenshotOf") else ""), flush=True)
                context.close()
        finally:
            browser.close()
    return results, failures


def main() -> int:
    visual_started_at = datetime.now(timezone.utc).isoformat()
    parser = argparse.ArgumentParser(description="Capture the MyST preview screenshot scenarios.")
    parser.add_argument(
        "--scenario",
        action="append",
        dest="scenario_ids",
        help="Capture only this scenario ID; may be specified more than once.",
    )
    parser.add_argument(
        "--workers", type=int, choices=range(1, 5), default=4,
        help="Number of independent screenshot threads (default: 4).",
    )
    arguments = parser.parse_args()

    if not MANIFEST.exists():
        print(f"missing {MANIFEST}; run `npm run visual:render` first", file=sys.stderr)
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    page_directory = pathlib.Path(manifest["pageDirectory"])
    all_scenarios = manifest["scenarios"]
    requested_ids = set(arguments.scenario_ids or [])
    known_ids = {scenario["id"] for scenario in all_scenarios}
    unknown_ids = requested_ids - known_ids
    if unknown_ids:
        print(f"unknown scenario ID(s): {', '.join(sorted(unknown_ids))}", file=sys.stderr)
        return 2
    scenarios = [
        scenario for scenario in all_scenarios
        if not requested_ids or scenario["id"] in requested_ids
    ]
    canonical_ids = {scenario["screenshotOf"] for scenario in scenarios if scenario.get("screenshotOf")}
    scenarios = [scenario for scenario in all_scenarios if scenario in scenarios or scenario["id"] in canonical_ids]

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    if requested_ids:
        for scenario in scenarios:
            for extension in (".png", ".txt", ".json"):
                (SCREENSHOT_DIR / f"{scenario['id']}{extension}").unlink(missing_ok=True)
    else:
        for stale in [*SCREENSHOT_DIR.glob("*.png"), *SCREENSHOT_DIR.glob("*.txt"), *SCREENSHOT_DIR.glob("*.json")]:
            stale.unlink()

    failures: list[Failure] = []
    results: list[dict] = []
    worker_count = min(arguments.workers, len(scenarios))
    if worker_count:
        batches = [scenarios[index::worker_count] for index in range(worker_count)]
        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            futures = [executor.submit(capture_scenarios, page_directory, batch) for batch in batches]
            for future in futures:
                batch_results, batch_failures = future.result()
                results.extend(batch_results)
                failures.extend(batch_failures)
    scenario_order = {scenario["id"]: index for index, scenario in enumerate(scenarios)}
    results.sort(key=lambda result: scenario_order[result["id"]])

    image_hashes: dict[str, list[str]] = {}
    for result in results:
      if result.get('capture'):
        digest = hashlib.sha256((SCREENSHOT_DIR / result['capture']).read_bytes()).hexdigest()
        image_hashes.setdefault(digest, []).append(result['id'])
    duplicate_images = [identifiers for identifiers in image_hashes.values() if len(identifiers) > 1]
    for identifiers in duplicate_images:
      detail = f"unintended identical PNGs: {', '.join(identifiers)}"
      failures.append(Failure('campaign', detail))
      for result in results:
        if result['id'] in identifiers:
          result['failures'].append(detail)
          result['status'] = 'failed'
    run_manifest = {
      "runId": os.environ.get("STUDIO_E2E_RUN_ID"),
      "campaignStartedAt": os.environ.get("STUDIO_E2E_STARTED_AT"),
      "campaignCommand": os.environ.get("STUDIO_E2E_COMMAND"),
      "startedAt": visual_started_at,
      "revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=EXTENSION_ROOT, text=True).strip(),
      "worktreeStatus": subprocess.check_output(["git", "status", "--short"], cwd=EXTENSION_ROOT, text=True).strip(),
      "sourceCommand": sys.orig_argv,
      "renderCommand": manifest.get("sourceCommand"),
      "renderRevision": manifest.get("revision"),
      "renderRunId": manifest.get("runId"),
      "renderCampaignStartedAt": manifest.get("campaignStartedAt"),
      "limitations": manifest.get("limitations"),
      "status": "failed" if failures else "passed",
      "scenarioCount": len(results),
      "workerCount": worker_count,
      "screenshotCount": sum(bool(result.get("capture")) for result in results),
      "passedScenarioCount": sum(result['status'] == 'passed' for result in results),
      "failedScenarioCount": sum(result['status'] == 'failed' for result in results),
      "failureCount": len(failures),
      "failures": [{"page": failure.page, "detail": failure.detail} for failure in failures],
      "duplicateImages": duplicate_images,
      "results": results,
      "completedAt": datetime.now(timezone.utc).isoformat(),
    }
    (SCREENSHOT_DIR / "run-manifest.json").write_text(json.dumps(run_manifest, indent=2) + "\n", encoding="utf-8")
    scenario_by_id = {scenario["id"]: scenario for scenario in all_scenarios}
    machine_rows = []
    for result in results:
      for check in result.get("finalState", {}).get("machineChecks") or []:
        if check["applicable"] and not check["pass"]:
          mode = "required" if check["id"] in scenario_by_id[result["id"]].get("machineChecks", []) else "report-only"
          machine_rows.append(f"| {result['id']} | {check['id']} | {mode} | {check['detail'].replace('|', '/')} |")
    machine_report = ["# Machine checks", "",
         "Failing applicable geometry checks per scenario. `required` checks fail the run; "
         "`report-only` checks are recorded and do not.", "",
         f"Scenarios: {len(results)}; failing applicable checks: {len(machine_rows)}.", ""]
    if machine_rows:
      machine_report.extend(["| Scenario | Check | Mode | Detail |", "| --- | --- | --- | --- |", *machine_rows])
    else:
      machine_report.append("No failing applicable checks.")
    (SCREENSHOT_DIR / "MACHINE-CHECKS.md").write_text("\n".join(machine_report) + "\n", encoding="utf-8")
    index = ["# Visual Review", "", f"Run status: **{run_manifest['status']}**", "",
         "Machine checks: [MACHINE-CHECKS.md](MACHINE-CHECKS.md) (failing applicable geometry checks)", "",
         f"Revision: `{run_manifest['revision']}`", "", "See [run manifest](run-manifest.json) for command, dirty status and assertions.",
         "", str(manifest.get("limitations", "Static generated HTML with mock host.")), ""]
    group = None
    for result in results:
      if result["group"] != group:
        group = result["group"]
        index.extend([f"## {group}", ""])
      canonical = result.get("screenshotOf") or result["id"]
      alias = f" (alias of {canonical}; assertions retained)" if result.get("screenshotOf") else ""
      index.append(f"{result['sequence']}. **{result['status']}** [{result['id']}]({canonical}.png) [notes]({canonical}.json){alias}")
      index.append(f"   {result['expectedContent']}")
      for detail in result["failures"]:
        index.append(f"   Failure: {detail}")
    (SCREENSHOT_DIR / "INDEX.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    if failures:
        print("\nrendering checks failed:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure.page}: {failure.detail}", file=sys.stderr)
        return 1

    print(f"\n{run_manifest['screenshotCount']} screenshots in {SCREENSHOT_DIR}")
    print(json.dumps({
      "status": "passed",
      "scenario_count": len(scenarios),
      "screenshot_count": run_manifest["screenshotCount"],
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
