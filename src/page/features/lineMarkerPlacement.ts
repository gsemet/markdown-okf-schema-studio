/**
 * The finders of the line marker's placement (features/lineMarker.ts): which element of a mapped
 * block holds a source line (by `data-okf-marker-line`, a source line for the marker only, never a
 * block), the table row or front matter row of the line, the hidden tab panels around an element,
 * and the code block rule. Pure functions on the DOM they are given.
 */

import { MAPPINGS_SELECTOR } from "./pageRuntime";

const MARKER_LINE = "data-okf-marker-line";
const MARKER_END_LINE = "data-okf-marker-end-line";

/** The inclusive source line range of an element's marker lines, or undefined without them. */
export function markerSpanOf(element: Element): { start: number; end: number } | undefined {
  const start = Number(element.getAttribute(MARKER_LINE));
  if (!element.getAttribute(MARKER_LINE) || !Number.isSafeInteger(start) || start < 1) return undefined;
  const end = Number(element.getAttribute(MARKER_END_LINE));
  return { start, end: Number.isSafeInteger(end) && end > start ? end : start };
}

const markerElements = (scope: Element): Element[] => Array.from(scope.querySelectorAll(`[${MARKER_LINE}]`));
const isRow = (element: Element): boolean => String(element.tagName).toUpperCase() === "TR";
// A row and its cells carry the row's marker lines; none of them is a target of its own (the row is).
const isRowPart = (element: Element): boolean => /^(TR|TD|TH)$/.test(String(element.tagName).toUpperCase());

// @implements_req SwRS-MDOKFSTUDIO-LIFE-178
/**
 * The innermost element of `block` whose marker lines hold `line`, table rows excluded; undefined
 * when there is none (the block itself is then the target).
 */
export function targetIn(block: Element, line: number): Element | undefined {
  let best: Element | undefined;
  let bestSpan: { start: number; end: number } | undefined;
  for (const element of markerElements(block)) {
    const span = markerSpanOf(element);
    if (!span || isRowPart(element) || span.start > line || line > span.end) continue;
    if (!bestSpan || (span.start >= bestSpan.start && span.end <= bestSpan.end)) {
      best = element;
      bestSpan = span;
    }
  }
  return best;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-192
/**
 * The row of a pipe table that `line` marks, among the rows of `scope`: the row of that line, or the
 * header row for the line after it (the delimiter line). Undefined when no row fits.
 */
export function tableRowFor(scope: Element, line: number): Element | undefined {
  const rows = markerElements(scope).filter(isRow);
  const exact = rows.find((row) => markerSpanOf(row)?.start === line);
  if (exact) return exact;
  return rows.find((row, index) => {
    const isHeader = index === 0 || rows[index - 1]!.closest("table") !== row.closest("table");
    return isHeader && (markerSpanOf(row)?.start ?? 0) + 1 === line;
  });
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-194
/** The property row of the properties section `section` whose lines hold `line` (a multi-line value included). */
export function frontmatterRowFor(section: Element, line: number): Element | undefined {
  return Array.from(section.querySelectorAll("tr[data-okf-field]")).find((row) => {
    const start = Number(row.getAttribute("data-okf-line"));
    const parsedEnd = Number(row.getAttribute("data-okf-end-line"));
    return Number.isSafeInteger(start) && start <= line && line <= (Number.isSafeInteger(parsedEnd) ? Math.max(start, parsedEnd) : start);
  });
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-193
/** The tab panels around `element` (itself included), outermost first. */
export function panelsAround(element: Element): Element[] {
  const panels: Element[] = [];
  for (let panel = element.closest(".myst-tab-panel"); panel; panel = panel.parentElement?.closest(".myst-tab-panel") ?? null) {
    panels.unshift(panel);
  }
  return panels;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-178
/**
 * True when `element` is a code block itself: it holds line spans and no mapped block or marker line
 * element of its own (a tab panel around a code block, or a table, is not one).
 */
export function isCodeBlockItself(element: Element): boolean {
  return element.querySelectorAll(".myst-code-line").length > 0
    && element.querySelectorAll(MAPPINGS_SELECTOR).length === 0
    && element.querySelectorAll(`[${MARKER_LINE}]`).length === 0;
}
