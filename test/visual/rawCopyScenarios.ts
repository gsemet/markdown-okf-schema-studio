/**
 * The raw copy of a native selection (CR-480): the clipboard gets the Markdown under the selection.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

export const RAW_COPY_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-273
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-275
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-277
    id: "block-editing/v55-raw-copy-light-900",
    fixture: "97-raw-copy",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: false,
    rawCopyChecks: true,
    description: "Light theme, 900 px pane, reading mode: a native selection copies the exact Markdown between the "
      + "characters under its edges (thematic break, table, nested admonitions, the diagram, the properties table), "
      + "Select all copies the whole source, the side-by-side card copies the current side only, and a text area, "
      + "a field, a comment popover or a render without source text stay native (the `selected` step shows a selection).",
  },
];
