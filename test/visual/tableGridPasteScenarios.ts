/**
 * A spreadsheet paste into a table cell (CR 292, QA271-12): two tab-separated lines pasted into the
 * last cell of the last body row fill four cells and add one row and one column.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

export const TABLE_GRID_PASTE_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-120
    id: "table-editing/v32-grid-paste-light-900",
    fixture: "08-okf-schema",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector" as const, value: "main table:not(.okf-properties)", offset: 72 },
    editMode: true,
    tableGridPasteChecks: true,
    description: "Light theme, 900 px, edit mode: two spreadsheet lines pasted into the last cell of the last row "
      + "of the review table fill four cells, add one row and one column in one save, and the cell editor reopens "
      + "in the start cell (the `pasted` step shows the table after the paste).",
  },
];
