/**
 * The "Export to HTML" scenarios (CR 288): the preview of the export fixture in the cream and dark
 * themes, plus the exported file of each (written by `renderFixtures.ts`, opened with JavaScript
 * off by `check_export_html` in capture_export_html.py). The Mermaid diagram of the fixture is drawn
 * in a browser before the file is built (`drawnContent.ts`), as the webview does on Export (CR 299).
 * v44 exports a page whose table cell editor is open and checks the cell's text shows in the file (CR 310).
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

export const EXPORT_HTML_SCENARIOS: ScenarioDefinition[] = ([
  { name: "cream", theme: "light", mode: "cream", number: 42 },
  { name: "dark", theme: "dark", mode: undefined, number: 43 },
] as const).map((variant) => ({
  // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
  // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
  // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
  // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-091
  id: `toolbar-navigation/v${variant.number}-export-html-${variant.name}-900`,
  fixture: "87-export-html",
  theme: variant.theme,
  ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
  ...WIDE,
  scroll: { kind: "top" as const },
  fullPage: true,
  exportHtml: true as const,
  description: `The export fixture in the ${variant.name} preview, 900 px pane, and its exported file opened with JavaScript off: `
    + "one file with no script, the page colours and width of the preview, a closed properties table that opens on a click, working tabs, "
    + "the external link kept and the link to another file as text, an embedded image, the Mermaid diagram drawn as an image with its source folded, and no comment or editing control.",
}));

export const EXPORT_EDITED_CELL_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
    id: "toolbar-navigation/v44-export-html-edited-cell-light-900",
    fixture: "88-export-edited-cell",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    exportHtml: true as const,
    exportEditedCell: "Compiler pioneer",
    description: "A table whose cell editor is open when the page is exported, and the exported file opened with JavaScript off: "
      + "the edited cell shows its text as last rendered, with no editor control and no hidden wrapper around it. "
      + "The content of the file is the real DOM of the page with the cell editor open, read in headless Chromium.",
  },
];
