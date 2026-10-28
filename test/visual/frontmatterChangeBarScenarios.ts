/**
 * The front matter change bar scenarios (CR 155): a field changed since the last commit and a field
 * added since the last commit get their own bar in the properties table, like a changed body block.
 */

import { BARS, MAIN, NO_HORIZONTAL_SCROLL } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

/** Lines of fixture 69: `status` (changed, line 4), `reviewer` (added, line 6) and the last paragraph (line 13). */
const FRONTMATTER_CHANGES_MESSAGE = {
  data: { type: "previewIncomingChanges", enabled: true, ranges: [{ start: 4, end: 4 }, { start: 6, end: 6 }, { start: 13, end: 13 }] },
};

const ROW = (field: string): string => `${MAIN} table.okf-properties tr[data-okf-field='${field}']`;
const barOfRow = (field: string): string =>
  `(() => { const row = document.querySelector("#sphinx-myst-preview-content table.okf-properties tr[data-okf-field='${field}']"); `
  + "const r = row.getBoundingClientRect(); return [...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')]"
  + ".filter((bar) => !bar.hidden && Math.abs(bar.getBoundingClientRect().top - r.top) <= 1 && Math.abs(bar.getBoundingClientRect().height - r.height) <= 1).length === 1; })()";

const ASSERTIONS: ContentAssertion[] = [
  { message: "the changed field row and the added field row are marked", selector: `${MAIN} table.okf-properties [data-sphinx-preview-changed]`, count: 2 },
  { message: "the changed field (status) is marked and the unchanged fields are not", selector: ROW("status"), attr: { name: "data-sphinx-preview-changed", value: "true" } },
  { message: "the added field (reviewer) is marked", selector: ROW("reviewer"), attr: { name: "data-sphinx-preview-changed", value: "true" } },
  { message: "the unchanged field rows carry no mark", selector: `${MAIN} table.okf-properties tr[data-okf-field='title'], ${MAIN} table.okf-properties tr[data-okf-field='owner'], ${MAIN} table.okf-properties tr[data-okf-field='tags']`, count: 3,
    expr: "[...document.querySelectorAll('#sphinx-myst-preview-content table.okf-properties tr[data-okf-field]')].filter((row) => row.hasAttribute('data-sphinx-preview-changed')).map((row) => row.getAttribute('data-okf-field')).join() === 'status,reviewer'" },
  { message: "one bar is drawn per marked block (two field rows and the paragraph), 3 px wide in the added-line green", selector: BARS, count: 3,
    css: { width: "3px", backgroundColor: "rgb(46, 160, 67)" } },
  { message: "the bar of the changed field row has the top and the height of that row", selector: ROW("status"), expr: barOfRow("status") },
  { message: "the bar of the added field row has the top and the height of that row", selector: ROW("reviewer"), expr: barOfRow("reviewer") },
  { message: "the bars sit in one column at the left margin of the page and leave the table where it is", selector: BARS,
    expr: "(() => { const lefts = [...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')].map((b) => Math.round(b.getBoundingClientRect().left * 10)); const table = document.querySelector('#sphinx-myst-preview-content table.okf-properties').getBoundingClientRect(); return new Set(lefts).size === 1 && lefts[0] / 10 + 3 <= table.left + 1; })()" },
  { message: "the bars do not make the page scroll sideways", selector: "html", expr: NO_HORIZONTAL_SCROLL },
];

export const FRONTMATTER_CHANGE_BAR_SCENARIOS: ScenarioDefinition[] = (["light", "dark"] as const).map((theme, index) => ({
  // @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
  id: `review-annotations/v${27 + index}-frontmatter-change-bar-${theme}-900`,
  fixture: "69-frontmatter-change-bar",
  theme,
  width: 900,
  height: 800,
  scroll: { kind: "top" as const },
  render: { hostMessages: [FRONTMATTER_CHANGES_MESSAGE] },
  contentAssertions: ASSERTIONS,
  description: `A front matter with one field changed and one field added since the last commit, ${theme} theme: `
    + "each of the two field rows of the properties table gets its own 3 px green bar at the left margin, as a changed body block does, and the unchanged fields get none.",
}));
