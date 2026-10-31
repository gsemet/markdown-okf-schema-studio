/**
 * Auto width keeps the sideways scroll of a wide table (CR 230): in edit mode, a pipe table wider
 * than the pane is scrolled to its end, then a layout pass measures it again (the close of a cell
 * editor with Escape, and a 3 px pane resize). The check of `capture_width_scroll.py` asserts the
 * table keeps its scrollLeft each time; the screenshot shows it scrolled to its end.
 */

import type { ScenarioDefinition } from "./scenarioAssertions";

export const WIDTH_SCROLL_SCENARIOS: ScenarioDefinition[] = [{
  // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
  id: "layout-width/v91-auto-wide-table-keeps-scroll-light-656",
  fixture: "58-wide-table-row-handles",
  theme: "light",
  width: 656,
  height: 850,
  scroll: { kind: "top" as const },
  editMode: true,
  widthModeScrollChecks: true,
  description: "Edit mode, Auto width, light theme, 656 px pane: a pipe table of fourteen columns, wider than the pane "
    + "and scrolled to its end, keeps its sideways scroll when a cell editor closes with Escape and when the pane "
    + "is resized by 3 px.",
}];
