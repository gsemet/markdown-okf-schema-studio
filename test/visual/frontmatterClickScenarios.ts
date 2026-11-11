/**
 * A click on a properties field below an open, unchanged field editor (CR 281, QA271-07): closing the
 * editor on the press moves the rows up, and the same click still opens the clicked field.
 */

import { WIDE, type ScenarioDefinition } from "./scenarioAssertions";

export const FRONTMATTER_CLICK_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
    id: "frontmatter-editing/v09-click-field-below-open-editor-light-900",
    fixture: "08-okf-schema",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    frontmatterClickChecks: true,
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description: "Light theme, 900 px pane, edit mode: the title editor is open and unchanged, then a real mouse "
      + "press and release on the priority value below it. The final frame shows the priority editor open and "
      + "no title editor, although closing the title editor moved priority up between the press and the release.",
  },
];
