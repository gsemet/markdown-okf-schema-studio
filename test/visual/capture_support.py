"""Shared state of the screenshot campaign: paths, fixture counters, the in-page check scripts,
the step PNG registry and the per-check interaction trace."""

from __future__ import annotations

import hashlib
import pathlib
import re
from dataclasses import dataclass

from playwright.sync_api import Page


HERE = pathlib.Path(__file__).resolve().parent
EXTENSION_ROOT = HERE.parent.parent
VISUAL_REPORT_DIR = EXTENSION_ROOT / "out" / "reports" / "visual"
MANIFEST = VISUAL_REPORT_DIR / "manifest.json"
SCREENSHOT_DIR = EXTENSION_ROOT / "out" / "reports" / "e2e" / "screenshots"
# Scenario ids are `<group>/vNN-<slug>-<theme>-<width>`: PNG and sidecar live in visual/<group>/.
VISUAL_SCREENSHOT_DIR = SCREENSHOT_DIR / "visual"


# Exact aliases removed in P9 B2a (legacy id -> legacy id of the scenario they mirrored).
REMOVED_ALIAS_CANONICAL = {
  "syntax-light-shell": "diff-light-preview",
  "preview-toolbar-dark": "okf-schema-dark",
  "edit-mode-dark": "edit-paragraph-dark",
  "edit-table-cell-dark": "edit-table-wrapped-dark-900",
}


def scenario_png(scenario_id: str) -> pathlib.Path:
  return VISUAL_SCREENSHOT_DIR / f"{scenario_id}.png"


def step_png(scenario_id: str, step: str) -> pathlib.Path:
  return VISUAL_SCREENSHOT_DIR / f"{scenario_id}--{step}.png"


def report_path(directory: pathlib.Path, scenario_id: str) -> pathlib.Path:
  """`<directory>/<group>/vNN-....json`; the parent folder is created."""
  path = directory / f"{scenario_id}.json"
  path.parent.mkdir(parents=True, exist_ok=True)
  return path


def relative_to_screenshots(path: pathlib.Path) -> str:
  return path.relative_to(SCREENSHOT_DIR).as_posix()
FIXTURE_DIR = HERE / "fixtures"
# Plain browser JavaScript shared with the real-input harness; it declares studioGeometryChecks.
GEOMETRY_SOURCE = (EXTENSION_ROOT / "test" / "shared" / "geometry-checks.js").read_text(encoding="utf-8")

# Relative luminance gap below which two colours read as "the same grey".
MIN_PANEL_CONTRAST = 0.012

ADMONITION_DIRECTIVE = re.compile(
    r"^[ \t]*(?:`{3,}|:{3,})\{(admonition|attention|caution|danger|error|hint|important|note|seealso|tip|warning|versionadded|versionchanged|deprecated)\}",
    re.MULTILINE,
)
GFM_ALERT = re.compile(r"^>[ \t]*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]", re.MULTILINE)
FIGURE_DIRECTIVE = re.compile(r"^(?:`{3,}|:{3,})\{figure\}\s+\S+", re.MULTILINE)
MERMAID_BLOCK = re.compile(r"^`{3,}(?:\{)?mermaid(?:\})?(?:\s|$)", re.MULTILINE)
# `{uml} path.puml` (sphinxcontrib-plantuml) is a PlantUML diagram too.
PLANTUML_BLOCK = re.compile(r"^`{3,}(?:\{)?plantuml(?:\})?(?:\s|$)|^`{3,}\{uml\}(?:\s|$)", re.MULTILINE)
CONTEXT_TAG_OPEN = re.compile(
  r"^[ \t]*<[a-z][a-z0-9_-]*>[ \t]*$",
    re.MULTILINE,
)


def count_admonitions(fixture: str) -> int:
    """Count admonition directives and GFM alerts in the fixture source.

    The campaign once passed with every admonition silently stripped from the output,
    because the per-element assertions had nothing to iterate over. Comparing against the
    source makes that failure mode loud.
    """
    source = (FIXTURE_DIR / f"{fixture}.md").read_text(encoding="utf-8")
    return len(ADMONITION_DIRECTIVE.findall(source)) + len(GFM_ALERT.findall(source))


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
    // A diff panel is square; so is the top of a block joined to its caption title bar.
    const joinedToCaption = block.parentElement && block.parentElement.tagName === 'FIGURE'
      && block.parentElement.querySelector(':scope > figcaption');
    const expectedRadius = isDiff || joinedToCaption ? '0px' : '4px';
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
    if (__MERMAID_EXPECTATION__ === 'error') {
      if (figure.querySelector('img.myst-mermaid-image')) {
        failures.push(`Mermaid diagram ${index + 1} rendered an image despite invalid syntax`);
      }
      if (!figure.querySelector('.myst-mermaid-error')) {
        failures.push(`Mermaid diagram ${index + 1} shows no error message`);
      }
      continue;
    }
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
    } else if (__PLANTUML_EXPECTATION__ === 'builtin') {
      if (message || !image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        failures.push(`PlantUML diagram ${index + 1} was not drawn by the built-in engine as a loaded image without an error`);
      }
    } else if (__PLANTUML_EXPECTATION__ === 'builtin-unsupported') {
      if (image || !message || !message.textContent.includes('markdownOkfSchemaStudio.plantuml.useJar')) {
        failures.push(`PlantUML diagram ${index + 1} must show the built-in engine limit with the useJar hint and no image`);
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



# Every step PNG a check can write (`<scenario id>-<step>.png`). A scenario's `steps` list selects
# which of them are written; the other steps are skipped silently (their check still runs) and a
# name that is not in this registry fails the check that asks for it.
STEP_NAMES = frozenset({"alert", "arrowdown", "bar", "cell-bar", "cell-emoji", "collapsed", "colour", "colour-code", "emoji", "end", "figure", "filtered", "flip", "glow", "grid", "hover", "insert-point", "menu", "nomatch", "open", "palette", "pasted", "selected", "tall", "text", "top"})


def save_step(page: Page, scenario: dict, step: str, caret: str = "hide",
              unless_same_as: str | None = None, unless_final_frame: bool = False) -> str | None:
  """Write one step PNG of the scenario, or skip it. Returns the file name when written.

  Skipped: alias scenarios (`screenshotOf`, same page as their canonical scenario), scenarios
  with `capture: false`, steps missing from the scenario's `steps` list, a step byte-identical to
  the step named by `unless_same_as`, and (decided after the final frame) a step identical to the
  scenario's own PNG when `unless_final_frame` is set.
  """
  if step not in STEP_NAMES:
    raise ValueError(f"unknown step name {step!r}: register it in STEP_NAMES")
  allowed = scenario.get("steps")
  if scenario.get("screenshotOf") or scenario.get("capture") is False or (allowed is not None and step not in allowed):
    page.check_trace.bump()  # the check still counts as having worked on the page
    return None
  recorder: StepRecorder = page.step_recorder
  data = page.screenshot(caret=caret)
  digest = hashlib.sha256(data).hexdigest()
  recorder.digests[step] = digest
  if unless_same_as is not None and recorder.digests.get(unless_same_as) == digest:
    recorder.skipped.append({"step": step, "reason": f"identical to {unless_same_as}"})
    return None
  path = step_png(scenario["id"], step)
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_bytes(data)
  recorder.written.append({"file": relative_to_screenshots(path), "step": step, "dropIfFinal": unless_final_frame})
  return relative_to_screenshots(path)


class StepRecorder:
  """Step PNGs of one scenario run: digests of what was taken, files written, steps skipped."""

  def __init__(self) -> None:
    self.digests: dict[str, str] = {}
    self.written: list[dict] = []
    self.skipped: list[dict] = []

  def settle(self, final_png: pathlib.Path | None) -> None:
    """Drop the `unless_final_frame` steps that equal the scenario's own PNG."""
    final = hashlib.sha256(final_png.read_bytes()).hexdigest() if final_png and final_png.exists() else None
    kept = []
    for entry in self.written:
      if entry["dropIfFinal"] and final is not None and self.digests.get(entry["step"]) == final:
        (SCREENSHOT_DIR / entry["file"]).unlink(missing_ok=True)
        self.skipped.append({"step": entry["step"], "reason": "identical to the scenario PNG"})
      else:
        kept.append({"file": entry["file"], "step": entry["step"]})
    self.written = kept


TRACED_PAGE_METHODS = ("evaluate", "locator", "wait_for_function", "add_style_tag", "screenshot", "wait_for_selector")


class CheckTrace:
  """Counts the browser interactions each check performs: a check that returns early counts 0."""

  def __init__(self) -> None:
    self.current: str | None = None
    self.counts: dict[str, int] = {}

  def bump(self) -> None:
    if self.current is not None:
      self.counts[self.current] = self.counts.get(self.current, 0) + 1

  def attach(self, page: Page) -> None:
    for method in TRACED_PAGE_METHODS:
      original = getattr(page, method)

      def traced(*args, _original=original, **kwargs):
        self.bump()
        return _original(*args, **kwargs)

      setattr(page, method, traced)

  def run(self, name: str, call):
    self.counts.setdefault(name, 0)
    previous, self.current = self.current, name
    try:
      return call()
    finally:
      self.current = previous


