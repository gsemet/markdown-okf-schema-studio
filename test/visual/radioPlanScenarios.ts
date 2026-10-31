/**
 * The radio choice plan scenarios (CR 214): a short plan with a bulleted and an ordered radio group
 * (the recommended option preselected) and a task list, in the cream and dark previews (the README
 * images "Decide in the page").
 */

import { MAIN } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const GROUPS = `${MAIN} [role='radiogroup']`;
const FIX = `${MAIN} > ul[role='radiogroup']`;
const ROLLOUT = `${MAIN} > ol[role='radiogroup']`;
const checkedLabels = "[...document.querySelectorAll('#sphinx-myst-preview-content [role=\"radio\"][aria-checked=\"true\"]')]"
  + ".map((radio) => radio.parentElement.textContent.trim()).join('|')";

const PLAN_ASSERTIONS: ContentAssertion[] = [
  { message: "the plan holds two radio groups, each named by the paragraph above it", selector: GROUPS, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content [role=\"radiogroup\"]')].map((group) => document.getElementById(group.getAttribute('aria-labelledby')).textContent.trim()).join('|') === 'Fix direction:|Rollout:'" },
  { message: "the fix direction offers three options and the rollout two", selector: `${MAIN} [role='radio']`, count: 5, visible: true },
  { message: "the recommended option of each group is the selected one", selector: GROUPS, expr: `${checkedLabels} === 'A click in the margin around the block opens its editor|Ship on by default in the next release'` },
  { message: "the markers are replaced by the controls", selector: GROUPS, notText: "(x)" },
  { message: "the bulleted group shows the radios in place of the bullets", selector: `${FIX} > li`, count: 3, css: { listStyleType: "none" } },
  { message: "the ordered group keeps its numbers", selector: `${ROLLOUT} > li`, count: 2, css: { listStyleType: "decimal" } },
  { message: "a selected radio draws its dot and an unselected one does not", selector: `${FIX} [role='radio']`, expr: "(() => { const [on, off] = document.querySelectorAll('#sphinx-myst-preview-content > ul[role=\"radiogroup\"] [role=\"radio\"]'); return getComputedStyle(on).backgroundImage.includes('radial-gradient') && !getComputedStyle(off).backgroundImage.includes('radial-gradient'); })()" },
  { message: "each group has one tab stop, its selected option", selector: GROUPS, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content [role=\"radio\"]')].map((radio) => radio.getAttribute('tabindex')).join() === '0,-1,-1,-1,0'" },
  { message: "the task list keeps its three checkboxes, one checked", selector: `${MAIN} input.myst-checkbox`, count: 3, expr: "document.querySelectorAll('#sphinx-myst-preview-content input.myst-checkbox:checked').length === 1" },
  { message: "the controls are editable, not read-only", selector: `${MAIN} [role='radio'][aria-disabled]`, count: 0 },
  { message: "the plan stays inside the pane", selector: FIX, insidePane: true },
];

export const RADIO_PLAN_SCENARIOS: ScenarioDefinition[] = ([
  { name: "cream", theme: "light", mode: "cream" },
  { name: "dark", theme: "dark", mode: undefined },
] as const).map((variant, index) => ({
  // @tests_req SwRS-MDOKFSTUDIO-GFM-039
  id: `gfm/v${10 + index}-radio-plan-${variant.name}-900`,
  fixture: "74-radio-plan",
  theme: variant.theme,
  ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
  width: 900,
  height: 1000,
  scroll: { kind: "top" as const },
  toolbarState: "collapsed" as const,
  contentAssertions: PLAN_ASSERTIONS,
  description: `A plan with a bulleted and an ordered radio group (the recommended options selected) and a task list, ${variant.name} preview, 900 px pane, toolbar collapsed.`,
}));
