/**
 * The MyST slash menu lists every admonition directive with its icon (CR 243): the final frame shows
 * the menu filtered on "admonition" and scrolled to its last entries, so the version admonitions sit in the list with the others.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const THEMES = ["light", "dark"] as const;

export const SLASH_ADMONITION_SCENARIOS: ScenarioDefinition[] = THEMES.map((theme, index) => ({
  // @tests_req SwRS-MDOKFSTUDIO-PALETTE-268
  id: `palette-slash/v${34 + index}-slash-myst-admonitions-${theme}-900`,
  fixture: "05-long-chapter",
  theme,
  ...WIDE,
  scroll: { kind: "top" as const },
  editMode: true,
  slashMenuShot: { mode: "myst" as const, finalQuery: "admonition", scrollToEnd: true as const },
  machineChecks: ["overlay-clipped" as const],
  description: `Slash command menu, palette mode myst, ${theme} theme: /admonition lists the note, tip, hint, important, warning, caution, attention, danger, error, seealso, versionadded, versionchanged and deprecated admonitions and the custom one, each with the icon of its preview callout.`,
}));
