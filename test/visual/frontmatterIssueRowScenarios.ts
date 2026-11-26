/**
 * The frontmatter rows that carry an issue (CR 513): a field row with an error or a warning, and the
 * warning row about the whole document.
 */

import { FIELD_ISSUE_ROW_ASSERTIONS, SCHEMA_WARNING_ROW_ASSERTIONS, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

export const FRONTMATTER_ISSUE_ROW_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S1
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S6
    id: "frontmatter-schema/v32-field-issue-rows-light-900",
    fixture: "98-field-issue-rows",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { strictAdditionalProperties: true as const },
    contentAssertions: FIELD_ISSUE_ROW_ASSERTIONS,
    description: "A schema-typed document with a value outside its list and an undeclared field, with the strict setting on, "
      + "light theme: the error row and the warning row each show the name in the colour of their severity on a light "
      + "background, with a wavy underline under the value.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S1
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S6
    id: "frontmatter-schema/v33-field-issue-rows-dark-900",
    fixture: "98-field-issue-rows",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { strictAdditionalProperties: true as const },
    contentAssertions: FIELD_ISSUE_ROW_ASSERTIONS,
    description: "A schema-typed document with a value outside its list and an undeclared field, with the strict setting on, "
      + "dark theme: the error row and the warning row each show the name in the colour of their severity on a light "
      + "background, with a wavy underline under the value.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023#S5
    id: "frontmatter-schema/v34-schema-warning-row-light-900",
    fixture: "99-unparsable-schema",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: SCHEMA_WARNING_ROW_ASSERTIONS,
    description: "A document whose schema cannot be parsed, light theme: one warning row in the warning colour on a light "
      + "background spans the table and wraps its message, and the badge counts one warning.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023#S5
    id: "frontmatter-schema/v35-schema-warning-row-dark-900",
    fixture: "99-unparsable-schema",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: SCHEMA_WARNING_ROW_ASSERTIONS,
    description: "A document whose schema cannot be parsed, dark theme: one warning row in the warning colour on a light "
      + "background spans the table and wraps its message, and the badge counts one warning.",
  },
];
