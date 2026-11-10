/**
 * The cell editor in a pane narrower than its 300 px minimum (QA271-14): the edited cell, its field and
 * Done and Cancel stay inside the table's box and the pane.
 */

import type { ScenarioDefinition } from "./scenarioAssertions";

export const NARROW280 = { width: 280, height: 800 };

export const TABLE_CELL_ROOM_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-006
    id: "table-editing/v29-cell-editor-clamped-light-280",
    fixture: "08-okf-schema",
    theme: "light",
    ...NARROW280,
    scroll: { kind: "selector" as const, value: "main table:not(.okf-properties) tbody td:nth-child(3)", offset: 72 },
    editMode: true,
    editTarget: "table-cell" as const,
    cellRoomChecks: true,
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description: "Light theme, 280 px pane, edit mode: the cell editor opened in a table with row handles stays inside "
      + "the table's box and the pane. The cell, its field and Done and Cancel are fully in view, the cell is at "
      + "least 8em wide and narrower than its 300 px minimum (the `open` step keeps the opened editor).",
  },
];
