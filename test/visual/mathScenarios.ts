/**
 * Maths in the preview (CR 348): inline and display maths are typeset with the local KaTeX bundle,
 * and a formula KaTeX cannot parse stays readable as its source, marked as an error.
 */

import { MAIN } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const MATH_ASSERTIONS: ContentAssertion[] = [
  { message: "the inline and the display formula are typeset, and nothing else", selector: `${MAIN} .katex`, count: 2, visible: true },
  { message: "the dollar prices stay text", selector: `${MAIN} p`, text: "the coffee costs $4 and the cake costs $5." },
  { message: "the dollar prices hold no typeset maths", selector: `${MAIN} .katex`, notText: "coffee" },
  { message: "the display formula has its own block", selector: `${MAIN} .katex-display`, count: 1 },
  { message: "the bad formula is marked as an error and keeps its source", selector: `${MAIN} [data-studio-math-error]`, count: 1, text: "\\notARealCommand{x}" },
  { message: "the bad formula holds no typeset maths", selector: `${MAIN} [data-studio-math-error] .katex`, count: 0 },
  { message: "the text around the formulas renders", selector: `${MAIN} p`, min: 2, text: "sits in the text line" },
];

export const MATH_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-MYST-024#S1
    // @tests_req SwRS-MDOKFSTUDIO-MYST-024#S3
    id: "myst/v47-maths-offline-light-900",
    fixture: "89-maths-offline",
    theme: "light",
    width: 900,
    height: 800,
    scroll: { kind: "top" as const },
    contentAssertions: MATH_ASSERTIONS,
    description: "Light theme, 900 px pane: an inline and a display formula are typeset with the local KaTeX bundle, "
      + "dollar prices stay text, and a formula with an unknown command stays readable as its source, marked as a maths error.",
  },
];
