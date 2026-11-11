/**
 * The "Tab: new row" hint in the last cell of a table (QA271-13): the cell editor opened in the last
 * cell of the last row shows it next to Done and Cancel, light at 900 px and dark at 360 px.
 */

import { NARROW360, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const LAST_CELL = "main table:not(.okf-properties) tbody tr:last-child td:last-child";
// v30 scrolls to the table itself, not to the last cell. The capture opens the first body cell, presses
// Escape (the bar leaves and the table moves up by the bar's height), then opens the last cell, whose bar again
// sits above the table. That bar keeps its place only while there is room for it between the table top and
// the toolbar; below that it floats over the rows (CR 034) and the machine check rightly reports it. The
// room left after Escape depended on the font metrics of the machine (CI wrapped the page above the table
// differently), so the table starts well below the toolbar: room for the bar plus a wide margin.
const TABLE = "main table:not(.okf-properties)";
const BAR_ROOM = 300;

export const TABLE_TAB_HINT_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-035
    id: "table-editing/v30-cell-tab-hint-light-900",
    fixture: "08-okf-schema",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector" as const, value: TABLE, offset: BAR_ROOM },
    editMode: true,
    tabHintChecks: true,
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description: "Light theme, 900 px pane, edit mode: the cell editor opened in the last cell of the last row shows "
      + "the hint \"Tab: new row\" next to Done and Cancel (the first body cell shows none). The hint lies inside "
      + "the editor and the pane, and Done and Cancel stay fully in view (the `open` step keeps the opened editor).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-035
    id: "table-editing/v31-cell-tab-hint-dark-360",
    fixture: "08-okf-schema",
    theme: "dark",
    ...NARROW360,
    scroll: { kind: "selector" as const, value: LAST_CELL, offset: 200 },
    editMode: true,
    tabHintChecks: true,
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description: "Dark theme, 360 px pane, edit mode: the cell editor opened in the last cell of the last row shows "
      + "the hint \"Tab: new row\" next to Done and Cancel, wrapping instead of pushing them out of view. The hint "
      + "lies inside the editor and the pane (the `open` step keeps the opened editor).",
  },
];
