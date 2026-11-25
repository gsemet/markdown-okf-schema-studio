/**
 * The bar of a hovered block in edit mode (CR-439): the round +, the move arrows and the Delete block
 * button touch one another, and the move status shown beside the bar leaves them all visible.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const FIXTURE = "91-delete-block-bar";

export const DELETE_BLOCK_BAR_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
    id: "block-editing/v42-delete-block-bar-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    deleteBlockBarChecks: "bar" as const,
    description: "Light theme, 900 px pane, edit mode: the hovered middle paragraph shows the bar with the round "
      + "+, the up and down arrows and the Delete block button, in that order, all visible, the Delete block "
      + "button touching the down arrow (the `hover` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
    id: "block-editing/v43-delete-block-bar-status-dark-900",
    fixture: FIXTURE,
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    deleteBlockBarChecks: "status" as const,
    description: "Dark theme, 900 px pane, edit mode: a refused move of the middle paragraph shows its reason "
      + "beside the bar, right of the Delete block button, which stays visible and clickable (the `bar` step).",
  },
];
