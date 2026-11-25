/**
 * The reorder handles of list items in edit mode (CR 432): placed left of each item's marker, or
 * outside the outermost container, centred on the item's first line; pushed in a narrow pane; and a
 * real mouse drag held over a sibling.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const FIXTURE = "90-list-item-handles";
const PHONE = { width: 360, height: 900 };

const PLACED = [
  ["v36", "light", undefined, "Light"],
  ["v37", "dark", undefined, "Dark"],
  ["v38", "light", "cream", "Cream"],
] as const;

export const LIST_ITEM_HANDLE_SCENARIOS: ScenarioDefinition[] = [
  ...PLACED.map(([version, theme, mode, label]) => ({
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S1
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S5
    id: `block-editing/${version}-list-item-handles-${mode ?? theme}-900`,
    fixture: FIXTURE,
    theme,
    ...(mode === undefined ? {} : { previewThemeMode: mode }),
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    listItemHandleChecks: "place" as const,
    description: `${label} theme, 900 px pane, edit mode: every item of a bullet, ordered, nested, task, alert and `
      + "nested admonition list shows its handle left of its marker, centred on its first line, and the handles of "
      + "the container lists sit outside the outermost box.",
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S1
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S3
    id: "block-editing/v39-list-item-handles-pushed-light-360",
    fixture: FIXTURE,
    theme: "light",
    ...PHONE,
    scroll: { kind: "top" as const },
    editMode: true,
    listItemHandleChecks: "push",
    description: "Light theme, 360 px pane, edit mode: with no room left of the lists, the blocks are pushed right "
      + "and every handle stays inside the pane, centred on its item's first line.",
  },
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S1
    id: `block-editing/v${40 + index}-list-item-drag-${theme}-900`,
    fixture: FIXTURE,
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    listItemHandleChecks: "drag" as const,
    description: `${theme === "light" ? "Light" : "Dark"} theme, 900 px pane, edit mode: a real mouse drag of the `
      + "first bullet item released over the lower half of the third saves the list once in the new order, with "
      + "no editor; once the host renders it, a second drag held down for the capture dims the dragged item and "
      + "draws the drop line below the third.",
  })),
];
