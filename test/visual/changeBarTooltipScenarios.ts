/**
 * The tooltip of a green change bar (CR 463): hovering the bar itself shows the changed source lines
 * of its block in the page's tooltip style, and hovering the block shows nothing.
 */

import { BARS, INCOMING_CHANGES_MESSAGE, MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const bubble = "getComputedStyle(document.querySelector('[data-sphinx-preview-change-layer] > span:hover'), '::after')";

const ASSERTIONS: ContentAssertion[] = [
  { message: "every bar carries its tooltip text, the changed lines of its block, in one line or a range with an en dash", selector: BARS, min: 8,
    expr: "[...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')].every((bar) => new RegExp('^Changed lines? [0-9]+(' + String.fromCharCode(8211) + '[0-9]+)? since last commit$').test(bar.getAttribute('data-tooltip')))" },
  { message: "the first bar (the heading of line 7) reads Changed line 7 since last commit", selector: BARS, min: 1,
    expr: "document.querySelector('[data-sphinx-preview-change-layer] > span').getAttribute('data-tooltip') === 'Changed line 7 since last commit'" },
  { message: "the table bar (lines 26 to 28) reads Changed lines 26\u201328 since last commit", selector: BARS, min: 1,
    expr: "[...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')].some((bar) => bar.getAttribute('data-tooltip') === 'Changed lines 26' + String.fromCharCode(8211) + '28 since last commit')" },
  { message: "the hovered bar shows its bubble, fully opaque", selector: BARS, min: 1,
    expr: `(() => { const style = ${bubble}; return style.opacity === '1' && style.visibility === 'visible' && style.content.includes('Changed line 7 since last commit'); })()` },
  { message: "the bubble sits above the bar, never over the first line of its block, and inside the pane", selector: BARS, min: 1,
    expr: "(() => { const bar = document.querySelector('[data-sphinx-preview-change-layer] > span:hover'); const style = getComputedStyle(bar, '::after'); const box = bar.getBoundingClientRect(); return parseFloat(style.width) > 40 && parseFloat(style.bottom) >= box.height && parseFloat(style.left) >= 0 && box.left + parseFloat(style.width) <= window.innerWidth && box.top - parseFloat(style.bottom) - parseFloat(style.height) >= 0; })()" },
  { message: "no other bar shows a bubble", selector: BARS, min: 2,
    expr: "[...document.querySelectorAll('[data-sphinx-preview-change-layer] > span:not(:hover)')].every((bar) => getComputedStyle(bar, '::after').visibility === 'hidden')" },
  { message: "the marked block next to the bar stays untouched", selector: `${MAIN} [data-sphinx-preview-changed]`, min: 8 },
];

export const CHANGE_BAR_TOOLTIP_SCENARIOS: ScenarioDefinition[] = (["light", "dark"] as const).map((theme, index) => ({
  // @tests_req SwRS-MDOKFSTUDIO-REVIEW-220
  id: `review-annotations/v${31 + index}-change-bar-tooltip-${theme}-900`,
  fixture: "44-change-bar",
  theme,
  ...WIDE,
  scroll: { kind: "top" as const },
  render: { hostMessages: [INCOMING_CHANGES_MESSAGE] },
  pageActions: [{ hover: BARS, waitMs: 500 }],
  contentAssertions: ASSERTIONS,
  description: `The pointer over the first green change bar, ${theme} theme: a bubble in the page's tooltip style reads `
    + "Changed line 7 since last commit above the bar (the first line of the block stays readable), the other bars show none, and every bar carries the text of its own lines.",
}));
