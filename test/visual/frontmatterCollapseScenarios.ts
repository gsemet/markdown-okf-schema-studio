/**
 * The frontmatter collapse scenarios (CR 237): the toggle next to the "Frontmatter properties" title
 * folds the table under its header and a second press shows it again.
 */

import { MAIN, NO_HORIZONTAL_SCROLL } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const SECTION = `${MAIN} [data-okf-properties]`;
const TOGGLE = `${SECTION} .okf-properties-title [data-okf-frontmatter-toggle]`;
const TABLE = `${SECTION} table.okf-properties`;

const COLLAPSED: ContentAssertion[] = [
  { message: "the toggle sits in the title of the properties section and is a button", selector: TOGGLE, count: 1, visible: true },
  { message: "the toggle reports the table as collapsed", selector: TOGGLE, attr: { name: "aria-expanded", value: "false" } },
  { message: "the toggle is labelled Expand frontmatter properties", selector: TOGGLE, attr: { name: "aria-label", value: "Expand frontmatter properties" } },
  { message: "the title stays visible", selector: `${SECTION} .okf-properties-title`, visible: true, text: "Frontmatter properties" },
  { message: "the table is hidden", selector: TABLE, count: 1, css: { display: "none" } },
  { message: "the page does not scroll sideways", selector: "html", expr: NO_HORIZONTAL_SCROLL },
];

const EXPANDED: ContentAssertion[] = [
  { message: "the toggle reports the table as expanded", selector: TOGGLE, attr: { name: "aria-expanded", value: "true" } },
  { message: "the table is shown again", selector: TABLE, count: 1, visible: true },
  { message: "the page does not scroll sideways", selector: "html", expr: NO_HORIZONTAL_SCROLL },
];

export const FRONTMATTER_COLLAPSE_SCENARIOS: ScenarioDefinition[] = (["light", "dark"] as const).flatMap((theme, index) => [
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-090
    id: `frontmatter-schema/v${28 + index * 2}-frontmatter-collapsed-${theme}-900`,
    fixture: "07-frontmatter",
    theme,
    width: 900,
    height: 600,
    scroll: { kind: "top" as const },
    pageActions: [{ click: TOGGLE, waitMs: 300 }],
    contentAssertions: COLLAPSED,
    description: `The frontmatter properties table after a press on the toggle next to its title, ${theme} theme: `
      + "the title and the toggle stay, the table is hidden and the toggle is labelled Expand frontmatter properties.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-090
    id: `frontmatter-schema/v${29 + index * 2}-frontmatter-expanded-again-${theme}-900`,
    fixture: "07-frontmatter",
    theme,
    width: 900,
    height: 600,
    scroll: { kind: "top" as const },
    pageActions: [{ click: TOGGLE, waitMs: 200 }, { click: TOGGLE, waitMs: 300 }],
    contentAssertions: EXPANDED,
    description: `The frontmatter properties table after two presses on the toggle next to its title, ${theme} theme: `
      + "the table is shown again and the toggle reports it as expanded.",
  },
]);
