/**
 * The floating toolbar over the first lines (CR 226): where the toolbar overlaps the text column, the
 * text of the first heading and paragraph wraps around it, and a box (here a table) starts below it,
 * centred. Headings still clear tables (and images) aligned with the HTML align attribute.
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

/**
 * The text rectangles of an element (one per line box piece) that intersect the toolbar, the ones
 * left of the column's content box (the heading's anchor icon in the margin) excluded.
 */
const hitsUnderToolbar = (selector: string): string => "(() => {"
  + " const bar = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect();"
  + ` const main = document.querySelector('${MAIN}');`
  + " const left = main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft);"
  + ` const element = document.querySelector('${selector}');`
  + " const range = document.createRange(); range.selectNodeContents(element);"
  + " const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0 && r.right > left + 1);"
  + " const hits = rects.filter((r) => r.left < bar.right && r.right > bar.left && r.top < bar.bottom && r.bottom > bar.top)"
  + "   .map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)].join(','));"
  + " return hits.length === 0 ? true : 'under the toolbar ' + [bar.left, bar.top, bar.right, bar.bottom].map(Math.round).join(',') + ': ' + hits.join(' | ');"
  + " })()";

const FLOAT_ASSERTIONS: ContentAssertion[] = [
  { message: "the toolbar is expanded and the page is at its top", selector: "[data-sphinx-preview-toolbar-more]", visible: true, expr: "window.scrollY === 0 && document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect().height > 120" },
  { message: "the first paragraph starts above the toolbar's bottom edge, beside it", selector: `${MAIN} > p`, min: 2, expr: `document.querySelector('${MAIN} > p').getBoundingClientRect().top < document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect().bottom` },
  { message: "no line of the first paragraph runs under the toolbar", selector: `${MAIN} > p`, expr: hitsUnderToolbar(`${MAIN} > p`) },
  { message: "no line of the heading runs under the toolbar", selector: `${MAIN} > h1`, count: 1, expr: hitsUnderToolbar(`${MAIN} > h1`) },
  { message: "the heading keeps the 40px gap above it", selector: `${MAIN} > h1`, expr: `Math.round(document.querySelector('${MAIN} > h1').getBoundingClientRect().top - document.querySelector('${MAIN}').getBoundingClientRect().top) === 40` },
  { message: "the text stays inside the pane", selector: `${MAIN} > p`, insidePane: true },
];

const BAR = "document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect()";
const SMALL_TABLE = `document.querySelector('${MAIN} > :is(table, .table-wrapper)')`;

/** The small table of the width-modes fixture: below the toolbar's reach, centred on the column. */
const BOX_ASSERTIONS: ContentAssertion[] = [
  { message: "the width mode is Auto and the toolbar overlaps the column (a float is published)", selector: MAIN, expr: "document.documentElement.getAttribute('data-sphinx-preview-width') === 'auto' && window.scrollY === 0 && parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sphinx-preview-toolbar-float-width')) > 0" },
  { message: "the first paragraph still starts beside the toolbar", selector: `${MAIN} > p`, expr: `document.querySelector('${MAIN} > p').getBoundingClientRect().top < ${BAR}.bottom` },
  { message: "the small table starts at or below the toolbar's bottom edge", selector: `${MAIN} > :is(table, .table-wrapper)`, min: 2, expr: `(() => { const t = ${SMALL_TABLE}.getBoundingClientRect(); const b = ${BAR}; return t.top >= b.bottom - 0.5 ? true : 'table top ' + t.top + ' above the toolbar bottom ' + b.bottom; })()` },
  { message: "the small table is centred on the column", selector: `${MAIN} > :is(table, .table-wrapper)`, expr: `(() => { const main = document.querySelector('${MAIN}'); const m = main.getBoundingClientRect(); const s = getComputedStyle(main); const centre = (m.left + parseFloat(s.paddingLeft) + m.right - parseFloat(s.paddingRight)) / 2; const t = ${SMALL_TABLE}.getBoundingClientRect(); const off = (t.left + t.right) / 2 - centre; return Math.abs(off) <= 2 ? true : 'off-centre by ' + off.toFixed(1) + ' px'; })()` },
];

/** The top of a heading against the bottom of the aligned element before it (the n-th h2). */
const headingBelow = (index: number, aligned: string): string => `(() => {`
  + ` const h = document.querySelectorAll('${MAIN} > h2')[${index}].getBoundingClientRect();`
  + ` const a = document.querySelector('${MAIN} ${aligned}').getBoundingClientRect();`
  + " return h.top >= a.bottom - 0.5 ? true : 'heading top ' + h.top + ' beside the element ending at ' + a.bottom; })()";

const HEADING_ASSERTIONS: ContentAssertion[] = [
  { message: "the two tables float with the align attribute", selector: `${MAIN} :is(table[align="right"], table[align="left"])`, count: 2, expr: `getComputedStyle(document.querySelector('${MAIN} table[align="right"]')).float === 'right' && getComputedStyle(document.querySelector('${MAIN} table[align="left"]')).float === 'left'` },
  { message: "the paragraph after the right-aligned table wraps beside it", selector: `${MAIN} > p`, expr: `document.querySelectorAll('${MAIN} > p')[0].getBoundingClientRect().top < document.querySelector('${MAIN} table[align="right"]').getBoundingClientRect().bottom` },
  { message: "the heading after the right-aligned table starts below it", selector: `${MAIN} > h2`, count: 2, expr: headingBelow(0, 'table[align="right"]') },
  { message: "the heading after the left-aligned table starts below it", selector: `${MAIN} > h2`, expr: headingBelow(1, 'table[align="left"]') },
];

export const TOOLBAR_FLOAT_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043
    id: "layout-width/v88-toolbar-float-first-lines-cream-393",
    fixture: "75-toolbar-float",
    theme: "light",
    previewThemeMode: "cream",
    width: 393,
    height: 500,
    scroll: { kind: "top" as const },
    contentAssertions: FLOAT_ASSERTIONS,
    description: "A chapter opening (heading, paragraph, note) in a 393 px cream pane with the toolbar expanded: the heading and "
      + "the first paragraph wrap around the toolbar, no line of their text runs under it, and the heading keeps its 40px gap.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043
    id: "layout-width/v89-toolbar-float-box-below-reach-cream-900",
    fixture: "29-width-modes",
    theme: "light",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" as const },
    widthModeSwitch: "auto" as const,
    contentAssertions: BOX_ASSERTIONS,
    description: "Auto width mode in a 900 px cream pane, where the toolbar overlaps the column: the first paragraph wraps "
      + "beside the toolbar, and the small table under it starts below the toolbar's reach, centred on the column.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043
    id: "layout-width/v90-heading-clears-raw-align-light-900",
    fixture: "76-heading-clears-align",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: HEADING_ASSERTIONS,
    description: "A table with align=\"right\" and one with align=\"left\" (raw HTML) in a 900 px light pane: the paragraph "
      + "after each wraps beside it, and the heading after each starts below it.",
  },
];
