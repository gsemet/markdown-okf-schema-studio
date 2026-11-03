/**
 * Table handles on a table that breaks out of the margin (CR 240): in edit mode the Width button
 * (pressed by the first assertion) switches to Auto after the handles were placed, the table breaks out, and the handles must sit on
 * its real left edge (rows) and top (columns).
 */

import { BREAKOUT_HANDLE_ASSERTIONS, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

export const BREAKOUT_HANDLE_SCENARIOS: ScenarioDefinition[] = [{
  // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
  // @tests_req SwRS-MDOKFSTUDIO-TABLE-007
  id: "table-editing/v26-handles-breakout-table-auto-light-900",
  fixture: "63-breakout-table-handles",
  theme: "light",
  ...WIDE,
  scroll: { kind: "top" as const },
  editMode: true,
  contentAssertions: BREAKOUT_HANDLE_ASSERTIONS,
  description: "Edit mode, Auto width, light theme, 900 px pane: a pipe table that breaks out of the margin keeps the "
    + "handle of each body row on its real left edge, centred on its row, and the handle of each column on the top "
    + "of its column.",
}, {
  // CR 252: the row is dragged, saved, and the host renders the page again.
  // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
  // @tests_req SwRS-MDOKFSTUDIO-TABLE-007
  id: "table-editing/v27-row-move-breakout-table-auto-light-900",
  fixture: "63-breakout-table-handles",
  theme: "light",
  ...WIDE,
  scroll: { kind: "top" as const },
  editMode: true,
  tableMoveChecks: true,
  description: "Edit mode, Auto width, light theme, 900 px pane: the first body row of a pipe table that breaks out of "
    + "the margin is dragged below the last one; the saved table has its rows in the new order, and once the host "
    + "renders the page again the table breaks out anew with every row and column handle on its real edges.",
}];
