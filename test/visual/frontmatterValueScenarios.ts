/**
 * Front matter values in the body (CR 273): inline code `= this.field` shows the value of the
 * field, and an inline code whose field has no value keeps its text with a warning style.
 */

import { WIDE, type ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const MAIN = "#sphinx-myst-preview-content";

const VALUE_ASSERTIONS: ContentAssertion[] = [
  { message: "the heading, the status, the tags, the owner name, the team and the owner show a value", selector: `${MAIN} .okf-frontmatter-value`, count: 6, visible: true },
  { message: "the heading shows the title", selector: `${MAIN} h1 .okf-frontmatter-value`, text: "Quarterly export plan" },
  { message: "the list shows its items joined with commas", selector: `${MAIN} .okf-frontmatter-value[data-okf-this-field='tags']`, text: "export, csv, nightly" },
  { message: "the object shows as YAML on one line", selector: `${MAIN} .okf-frontmatter-value[data-okf-this-field='owner']`, text: "{ name: Ada, team: core }" },
  { message: "a value is set in the text, not in the monospace of code", selector: `${MAIN} .okf-frontmatter-value`, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content .okf-frontmatter-value')].every((span) => getComputedStyle(span).fontFamily === getComputedStyle(span.closest('p, h1')).fontFamily)" },
  { message: "the missing field keeps its code as written", selector: `${MAIN} code.okf-frontmatter-missing`, count: 1, text: "= this.reviewer", visible: true },
  {
    message: "the missing field has a dashed warning underline and a tinted background",
    selector: `${MAIN} code.okf-frontmatter-missing`,
    expr: "(() => { const style = getComputedStyle(document.querySelector('#sphinx-myst-preview-content code.okf-frontmatter-missing')); return style.borderBottomStyle === 'dashed' && style.borderBottomWidth === '2px' && style.backgroundColor !== 'rgba(0, 0, 0, 0)'; })()",
  },
  { message: "the code block keeps the expression", selector: `${MAIN} > pre`, count: 1, text: "= this.title" },
];

export const FRONTMATTER_VALUE_SCENARIOS: ScenarioDefinition[] = [
  ...([
    ["v32", "light", "white", "White"],
    ["v33", "dark", "dark", "Dark"],
  ] as const).map(([version, theme, mode, label]) => ({
    // @tests_req SwRS-MDOKFSTUDIO-CORE-079
    id: `rendering-core/${version}-frontmatter-this-field-${mode}-900`,
    fixture: "83-frontmatter-this-field",
    theme,
    previewThemeMode: mode,
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: VALUE_ASSERTIONS,
    description: `${label} theme, 900 px pane: inline code = this.field shows the value of a front matter field `
      + "(string, list, object, nested field), and a field the front matter lacks keeps its code with a warning style.",
  })),
];
