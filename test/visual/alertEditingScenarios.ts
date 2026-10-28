/**
 * Editing a GitHub alert: a click in the body of an alert opens the whole alert, from its marker
 * line to its last quoted line, in one block editor.
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const EDITOR_TEXT = "document.querySelector('.sphinx-preview-block-editor textarea[aria-label=\"Raw Markdown block\"]')?.value ?? ''";
const OPENED_RANGES = "(window.visualMessages || []).filter((message) => message.type === 'previewEditOpen')"
  + ".map((message) => message.line + '-' + message.endLine).join(',')";

export const ALERT_EDITING_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-GFM-009
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
    id: "gfm/v09-alert-body-opens-whole-alert-dark-900",
    fixture: "71-gfm-alert-editing",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [{ click: `${MAIN} aside.admonition.note > p:last-child`, waitMs: 400 }],
    description: "Edit mode, dark theme, 900 px: a click on the second paragraph of a two-paragraph note alert opens "
      + "one editor on the whole alert, from the [!NOTE] marker line to its last quoted line; the tip and the "
      + "warning right after it stay rendered.",
    contentAssertions: [
      {
        message: "the page asks the host for the lines of the whole note alert (5 to 8), and only once",
        selector: MAIN,
        expr: `(${OPENED_RANGES}) === '5-8'`,
      },
      {
        message: "the editor holds the note alert from its marker line to its last quoted line",
        selector: MAIN,
        expr: `(${EDITOR_TEXT}) === '> [!NOTE]\\n> The first paragraph of the note.\\n>\\n> The second paragraph of the note.'`,
      },
      { message: "the note alert is hidden while its editor is open", selector: `${MAIN} aside.admonition.note[data-sphinx-preview-editing="true"]`, count: 1 },
      { message: "the tip and the warning after the note stay rendered", selector: `${MAIN} aside.admonition.tip, ${MAIN} aside.admonition.warning`, count: 2, visible: true },
    ],
  },
];
