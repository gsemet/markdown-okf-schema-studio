/**
 * The line marker (CR 445): the page opened at a searched line draws an arrow in the left margin and
 * a light band across the column on that line, in the light and the dark theme, and in edit mode
 * the marker covers no handle. The host message is `previewRevealLine`, the one a Studio tab
 * receives when it opens at a search result or at a link's target line. The harness delivers it as a
 * `hostMessage` page action, after its pre-checks (a check that edits the source would clear the marker).
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const FIXTURE = "91-line-marker";
const MARKER = ".sphinx-preview-line-marker";
const reveal = (line: number) => ({ pageActions: [{ hostMessage: { type: "previewRevealLine", line } }] });

/** Line 22 of the fixture is `value_15 = 15`, inside the long numbered code block. */
const CODE_LINE_ASSERTIONS: ContentAssertion[] = [
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  {
    message: "the marker sits on the requested code line, as high as one line",
    selector: MARKER,
    expr: "(() => { const marker = document.querySelector('.sphinx-preview-line-marker').getBoundingClientRect(); const line = [...document.querySelectorAll('.myst-code-line')].find((span) => span.textContent.includes('value_15 =')).getBoundingClientRect(); return Math.abs(marker.top - line.top) <= 3 && marker.height <= line.height * 1.6; })()",
  },
  {
    message: "the marked line is inside the viewport",
    selector: MARKER,
    expr: "(() => { const box = document.querySelector('.sphinx-preview-line-marker').getBoundingClientRect(); return box.top >= 0 && box.bottom <= window.innerHeight; })()",
  },
  { message: "the marked block is announced as the current location", selector: "[aria-current='location']", count: 1 },
];

/** Line 43 of the fixture is a table row; in edit mode no handle or block action touches the marker. */
const EDIT_MODE_ASSERTIONS: ContentAssertion[] = [
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  {
    message: "the marker overlaps no table handle, list handle or block action",
    selector: MARKER,
    expr: "(() => { const marker = document.querySelector('.sphinx-preview-line-marker'); const arrow = marker.firstElementChild.getBoundingClientRect(); const handles = [...document.querySelectorAll('[data-okf-row-handle-layer] *, .okf-table-row-handle, .okf-table-col-handle, .okf-list-item-handle, [data-okf-block-handle]')]; return handles.every((handle) => { const box = handle.getBoundingClientRect(); return box.width === 0 || box.height === 0 || box.right <= arrow.left || box.left >= arrow.right || box.bottom <= arrow.top || box.top >= arrow.bottom; }); })()",
  },
  { message: "no block editor opened", selector: "textarea", count: 0 },
];

/** The marker sits on the top of the mapped block holding the line. */
const blockTopAssertion = (message: string, blockExpr: string): ContentAssertion => ({
  message,
  selector: MARKER,
  expr: `(() => { const marker = document.querySelector('.sphinx-preview-line-marker').getBoundingClientRect(); const block = ${blockExpr}.getBoundingClientRect(); return Math.abs(marker.top - block.top) <= 3; })()`,
});

const IN_VIEWPORT: ContentAssertion = {
  message: "the marked line is inside the viewport",
  selector: MARKER,
  expr: "(() => { const box = document.querySelector('.sphinx-preview-line-marker').getBoundingClientRect(); return box.top >= 0 && box.bottom <= window.innerHeight; })()",
};

/** Line 5 is the third source line of a soft-wrapped paragraph: the marker uses the measured top of that wrapped line, not of the block. */
const SOFT_WRAP_ASSERTIONS: ContentAssertion[] = [
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  {
    message: "the marker sits on the third source line of the wrapped paragraph, not at the paragraph top",
    selector: MARKER,
    expr: "(() => { const marker = document.querySelector('.sphinx-preview-line-marker').getBoundingClientRect(); const paragraph = document.querySelector(\"p[aria-current='location']\").getBoundingClientRect(); const walker = document.createTreeWalker(document.querySelector(\"p[aria-current='location']\"), NodeFilter.SHOW_TEXT); let node = walker.nextNode(); while (node && !node.textContent.includes('The third source line')) node = walker.nextNode(); if (!node) return false; const range = document.createRange(); const start = node.textContent.indexOf('The third source line'); range.setStart(node, start); range.setEnd(node, start + 1); const line = range.getBoundingClientRect(); return Math.abs(marker.top - line.top) <= 3 && Math.abs(marker.top - paragraph.top) > 10; })()",
  },
  { message: "the paragraph is announced as the current location", selector: "p[aria-current='location']", count: 1 },
  IN_VIEWPORT,
];

const TABLE_ASSERTIONS: ContentAssertion[] = [
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  blockTopAssertion("the marker sits on the top of the table", "document.querySelector('table')"),
  { message: "the table is announced as the current location", selector: "table[aria-current='location']", count: 1 },
];

const FOLDED_ASSERTIONS: ContentAssertion[] = [
  { message: "the section the reader folded is open again", selector: "[data-okf-folded]", count: 0 },
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  IN_VIEWPORT,
];

const DROPDOWN_ASSERTIONS: ContentAssertion[] = [
  { message: "the dropdown holding the line is open", selector: "details[open]", count: 1 },
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  IN_VIEWPORT,
];

/** Forced colours: the band is transparent and the arrow reads a visible system colour. */
const HIGH_CONTRAST_ASSERTIONS: ContentAssertion[] = [
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  {
    message: "in forced colours the band is transparent and the arrow keeps a visible system colour",
    selector: MARKER,
    expr: "(() => { const marker = getComputedStyle(document.querySelector('.sphinx-preview-line-marker')); const arrow = getComputedStyle(document.querySelector('.sphinx-preview-line-marker-arrow')); return (/, 0\\)$/.test(marker.backgroundColor) || marker.backgroundColor === 'transparent') && arrow.borderInlineStartColor !== 'rgba(0, 0, 0, 0)' && arrow.borderInlineStartColor !== 'transparent'; })()",
  },
];

/** A jump into a line already on screen: the marker is drawn and the page has not scrolled. */
const JUMP_ON_SCREEN_ASSERTIONS: ContentAssertion[] = [
  { message: "one marker is drawn", selector: MARKER, count: 1 },
  {
    message: "the page stayed at the top: the line was on screen",
    selector: MARKER,
    expr: "window.scrollY === 0",
  },
  IN_VIEWPORT,
];

export const LINE_MARKER_SCENARIOS: ScenarioDefinition[] = [
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-178
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-179
    id: `lifecycle-sync/v0${4 + index}-line-marker-code-line-${theme}-900`,
    fixture: FIXTURE,
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    ...reveal(22),
    contentAssertions: CODE_LINE_ASSERTIONS,
    description: `${theme === "light" ? "Light" : "Dark"} theme, 900 px pane: the page asked to show line 20, a line of a `
      + "long numbered code block, scrolls that line to the reading position and draws the arrow and the band on exactly "
      + "that line.",
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-180
    id: "lifecycle-sync/v06-line-marker-edit-mode-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    ...reveal(43),
    contentAssertions: EDIT_MODE_ASSERTIONS,
    description: "Light theme, 900 px pane, edit mode: the page asked to show a table row draws the marker, and its "
      + "arrow overlaps no table handle, list handle or block action and opens no editor.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-178
    id: "lifecycle-sync/v07-line-marker-soft-wrapped-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    ...reveal(5),
    contentAssertions: SOFT_WRAP_ASSERTIONS,
    description: "Light theme, 900 px pane: the page asked to show the third source line of a soft-wrapped paragraph "
      + "marks that wrapped line (not the top of the paragraph) with the arrow and the band, inside the viewport.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-178
    id: "lifecycle-sync/v08-line-marker-table-line-dark-900",
    fixture: FIXTURE,
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    ...reveal(43),
    contentAssertions: TABLE_ASSERTIONS,
    description: "Dark theme, 900 px pane: the page asked to show a row of a table marks the top of the table.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-179
    id: "lifecycle-sync/v09-line-marker-folded-section-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    // The reader folds the section first; the request comes later and opens it.
    pageActions: [
      { click: "h2:has-text('Folded section') [data-okf-fold-toggle]", waitMs: 300 },
      { hostMessage: { type: "previewRevealLine", line: 54 } },
    ],
    contentAssertions: FOLDED_ASSERTIONS,
    description: "Light theme, 900 px pane: a line under a heading the reader folded opens that section, then the "
      + "marker is drawn on the line.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-179
    id: "lifecycle-sync/v10-line-marker-closed-dropdown-dark-900",
    fixture: FIXTURE,
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    ...reveal(61),
    contentAssertions: DROPDOWN_ASSERTIONS,
    description: "Dark theme, 900 px pane: a line inside a dropdown that starts closed opens the dropdown, then the "
      + "marker is drawn on the line.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-180
    id: "lifecycle-sync/v11-line-marker-edit-mode-list-dark-900",
    fixture: FIXTURE,
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    ...reveal(47),
    contentAssertions: EDIT_MODE_ASSERTIONS,
    description: "Dark theme, 900 px pane, edit mode: the page asked to show a list item draws the marker, and its "
      + "arrow overlaps no list item handle, row handle or block action and opens no editor.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-178
    id: "lifecycle-sync/v12-line-marker-high-contrast-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    forcedColors: true,
    ...reveal(22),
    contentAssertions: HIGH_CONTRAST_ASSERTIONS,
    description: "High contrast (forced colours), 900 px pane: the marker keeps a visible arrow and band lines in the "
      + "system highlight colour, with no fill.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-188
    id: "lifecycle-sync/v13-line-marker-jump-if-off-screen-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    // A jump into a line the side preview already shows, with scroll sync on: the editor leads, the page stays.
    pageActions: [{ hostMessage: { type: "previewRevealLine", line: 5, scroll: "if-off-screen" } }],
    contentAssertions: JUMP_ON_SCREEN_ASSERTIONS,
    description: "Light theme, 900 px pane: a jump to a line that is already on screen, asked with the if-off-screen "
      + "scroll, draws the arrow and the band on that line and leaves the page scrolled where it was.",
  },
];
