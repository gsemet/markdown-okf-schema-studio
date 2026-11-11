/**
 * Find in a table scrolled sideways (QA271-08): the hit text is brought into the table's box.
 */

import type { ScenarioDefinition } from "./scenarioAssertions";

export const FIND_WIDE_TABLE_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
    id: "toolbar-navigation/v41-find-hit-in-wide-table-light-393",
    fixture: "85-find-wide-table",
    theme: "light",
    width: 393,
    height: 800,
    scroll: { kind: "top" as const },
    editMode: true,
    findWideTableChecks: true,
    description: "Light theme, 393 px pane, edit mode: a wide table scrolled to its last column, then Find for a word "
      + "of its second column. The table scrolls back so the highlighted hit lies inside its box and the pane, and "
      + "the page does not scroll sideways (the `found` step).",
  },
];
