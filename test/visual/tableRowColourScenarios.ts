/**
 * The colours of a table: tinted heading, even rows and hovered row. Each scenario hovers real rows;
 * the hovered row is in the `hover` step shot.
 */

import { NARROW, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const PAGE_THEMES = [
  ["v28", "cream", "light", "Cream"],
  ["v29", "white", "light", "White"],
  ["v30", "dark", "dark", "Dark"],
] as const;

export const TABLE_ROW_COLOUR_SCENARIOS: ScenarioDefinition[] = [
  ...PAGE_THEMES.map(([version, mode, theme, label]) => ({
    // @tests_req SwRS-MDOKFSTUDIO-CORE-077
    id: `rendering-core/${version}-table-row-colours-${mode}-900`,
    fixture: "81-table-row-colours",
    theme,
    previewThemeMode: mode,
    ...WIDE,
    scroll: { kind: "top" as const },
    tableRowColourChecks: "page" as const,
    description: `${label} theme, 900 px pane: a table has a tinted heading and even rows, and the row under the `
      + "pointer takes the accent tint; the heading text keeps a readable contrast and the frontmatter properties "
      + "table stays without backgrounds.",
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-CORE-077
    id: "rendering-core/v31-table-row-colours-overflow-dark-460",
    fixture: "81-table-row-colours",
    theme: "dark",
    previewThemeMode: "dark",
    ...NARROW,
    scroll: { kind: "selector" as const, value: "main table[data-sphinx-table-overflow='true']", offset: 120 },
    tableRowColourChecks: "overflow",
    description: "Dark theme, 460 px pane: a table that scrolls sideways keeps its overflow shading, visible through "
      + "the translucent heading, even rows and hovered row.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CORE-077
    id: "table-editing/v28-table-row-hover-below-handles-light-900",
    fixture: "81-table-row-colours",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    tableRowColourChecks: "edit",
    description: "Edit mode, light theme, 900 px pane: the tint of the hovered row stays below the row handles, which "
      + "still take the press.",
  },
];
