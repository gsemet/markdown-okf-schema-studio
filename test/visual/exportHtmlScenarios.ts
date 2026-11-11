/**
 * The "Export to HTML" scenarios (CR 288): the preview of the export fixture in the cream and dark
 * themes, plus the exported file of each (written by `renderFixtures.ts`, opened with JavaScript
 * off by `check_export_html` in capture_export_html.py). Mermaid is not drawn in the static export
 * of the campaign: the page script that draws it does not run when the file is built.
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
    + "the external link kept and the link to another file as text, an embedded image and no comment or editing control.",
}));
