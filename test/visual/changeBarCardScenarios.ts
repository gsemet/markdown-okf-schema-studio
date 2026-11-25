/**
 * The removed-lines marker and the click-to-diff card of the green change bars (CR 463): lines removed
 * since the last commit get a red marker between the blocks around them, and a click on a bar shows the
 * side-by-side diff card of that block only, in place.
 */

import { BARS, CHANGE_BAR_LINES, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const MARKER = "[data-sphinx-preview-change-layer] > span[data-removed]";
const LAYER_BAR = "[data-sphinx-preview-change-layer] > span:not([data-removed])";

/** Lines 21 to 23 of the last commit are gone, between the changed quotation (line 20) and the table (line 22). */
const REMOVED_MESSAGE = {
  data: {
    type: "previewIncomingChanges",
    enabled: true,
    ranges: CHANGE_BAR_LINES.map(([start, end]) => ({ start, end })),
    removed: [{ baseStart: 21, baseEnd: 23, start: 22 }],
  },
};

const MARKER_ASSERTIONS: ContentAssertion[] = [
  { message: "one red removed-lines marker sits in the change column beside the 10 green bars", selector: MARKER, min: 1,
    expr: `document.querySelectorAll('${MARKER}').length === 1 && document.querySelectorAll('${LAYER_BAR}').length === 10` },
  { message: "the marker tooltip reads Removed lines 21-23 since last commit, with an en dash", selector: MARKER, min: 1,
    expr: `document.querySelector('${MARKER}').getAttribute('data-tooltip') === 'Removed lines 21' + String.fromCharCode(8211) + '23 since last commit'` },
  { message: "the marker triangle is red, not green", selector: MARKER, min: 1,
    expr: `(() => { const c = getComputedStyle(document.querySelector('${MARKER}'), '::before').backgroundColor.match(/[0-9.]+/g).map(Number); return c[0] > 180 && c[1] < 120 && c[2] < 120; })()` },
  { message: "the marker sits between the changed quotation and the table of line 22", selector: MARKER, min: 1,
    expr: `(() => { const marker = document.querySelector('${MARKER}').getBoundingClientRect(); const table = document.querySelector('#sphinx-myst-preview-content table[data-line="22"]'); const quote = document.querySelector('#sphinx-myst-preview-content blockquote[data-line="20"]'); if (!table || !quote) return false; return marker.top >= quote.getBoundingClientRect().bottom - 2 && marker.bottom <= table.getBoundingClientRect().top + 14; })()` },
  { message: "the hovered marker shows its Removed tooltip bubble", selector: MARKER, min: 1,
    expr: `(() => { const style = getComputedStyle(document.querySelector('${MARKER}'), '::after'); return style.visibility === 'visible' && style.content.includes('Removed lines 21'); })()` },
  { message: "the marker bubble sits beside the marker, in the gap, and covers no text of the page", selector: MARKER, min: 1,
    expr: `(() => { const marker = document.querySelector('${MARKER}'); const style = getComputedStyle(marker, '::after'); const box = marker.getBoundingClientRect(); const pad = style.boxSizing === 'border-box' ? 0 : parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2; const padY = style.boxSizing === 'border-box' ? 0 : parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 2; const left = box.left + parseFloat(style.left); const top = box.top + parseFloat(style.top) + parseFloat(style.marginTop); const right = left + parseFloat(style.width) + pad; const bottom = top + parseFloat(style.height) + padY; if (left < box.right || left < 0 || right > innerWidth) return false; const walker = document.createTreeWalker(document.getElementById('sphinx-myst-preview-content'), NodeFilter.SHOW_TEXT); for (let node = walker.nextNode(); node; node = walker.nextNode()) { if (!node.textContent.trim()) continue; const range = document.createRange(); range.selectNodeContents(node); for (const rect of range.getClientRects()) { if (rect.width > 0 && rect.height > 0 && rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) return false; } } return true; })()` },
];

const CARD_ASSERTIONS: ContentAssertion[] = [
  { message: "one click on the bar of the heading of line 7 shows one side-by-side card, in place", selector: "[data-okf-sbs-card]", min: 1,
    expr: "document.querySelectorAll('[data-okf-sbs-card]').length === 1 && document.querySelector('[data-okf-sbs-card]').nextElementSibling.getAttribute('data-line') === '7'" },
  { message: "the card is a two-column grid holding the last commit left and the text now right", selector: "[data-okf-sbs-card]", min: 1,
    expr: "(() => { const card = document.querySelector('[data-okf-sbs-card]'); const base = card.querySelector('[data-okf-sbs-side=base]'); const now = card.querySelector('[data-okf-sbs-side=current]'); return getComputedStyle(card).display === 'grid' && base.getBoundingClientRect().right <= now.getBoundingClientRect().left + 1 && base.textContent.includes('Heading of the last commit'); })()" },
  { message: "the original heading is hidden behind its card, and the other changed blocks stay as they were", selector: "[data-okf-sbs-replaced]", min: 1,
    expr: "(() => { const hidden = document.querySelector('[data-okf-sbs-replaced]'); return getComputedStyle(hidden).display === 'none' && document.querySelectorAll('[data-okf-sbs-replaced]').length === 1 && getComputedStyle(document.querySelector('#sphinx-myst-preview-content [data-line=\"9\"]')).display !== 'none'; })()" },
  { message: "the Side-by-side button stays off: only this block shows its card", selector: BARS, min: 1,
    expr: "document.documentElement.getAttribute('data-sphinx-preview-sbs') === 'off'" },
  { message: "the page does not scroll sideways", selector: BARS, min: 1,
    expr: "document.documentElement.scrollWidth - innerWidth <= 1" },
];

export const CHANGE_BAR_CARD_SCENARIOS: ScenarioDefinition[] = (["light", "dark"] as const).flatMap((theme, index) => [
  {
    // @tests_req SwRS-MDOKFSTUDIO-REVIEW-221#S1
    // @tests_req SwRS-MDOKFSTUDIO-REVIEW-221#S2
    id: `review-annotations/v${33 + index}-removed-marker-${theme}-900`,
    fixture: "44-change-bar",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { hostMessages: [REMOVED_MESSAGE] },
    pageActions: [{ hover: MARKER, waitMs: 500 }],
    contentAssertions: MARKER_ASSERTIONS,
    description: `Lines removed since the last commit, ${theme} theme: a red marker sits between the changed quotation and the table, `
      + "and the pointer over it shows Removed lines 21–23 since last commit in a bubble beside the marker, in the gap, over no text.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-REVIEW-222#S1
    id: `review-annotations/v${35 + index}-change-bar-card-${theme}-900`,
    fixture: "44-change-bar",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { hostMessages: [REMOVED_MESSAGE] },
    pageActions: [
      { click: BARS, waitMs: 300 },
      {
        hostMessage: {
          type: "previewBaselineDiff",
          html: "<h2 data-line=\"7\">Heading of the last commit</h2>",
          hunks: [{ baseStart: 7, baseEnd: 7, start: 7, end: 7 }],
        },
        waitMs: 400,
      },
    ],
    contentAssertions: CARD_ASSERTIONS,
    description: `A click on the first green change bar, ${theme} theme: the side-by-side card of that heading only opens in place, `
      + "the last commit left and the text now right, and the other blocks keep their original.",
  },
]);
