/**
 * The Rename label field of a table's label (CR 290, QA271-09): it opens above the anchor icon, so it
 * hides no cell of the table below, even in a narrow pane.
 */

import type { ScenarioDefinition } from "./scenarioAssertions";

export const LABEL_RENAME_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-MYST-038
    id: "myst/v46-label-rename-above-table-light-290",
    fixture: "84-label-above-table",
    theme: "light",
    width: 290,
    height: 800,
    scroll: { kind: "top" as const },
    editMode: true,
    labelRenameChecks: true,
    description: "Light theme, 290 px pane, edit mode: a click on the anchor icon of a labelled table opens the "
      + "Rename label field above the icon. The field is fully inside the pane and covers no cell of the table "
      + "(the `open` step keeps the opened field).",
  },
];
