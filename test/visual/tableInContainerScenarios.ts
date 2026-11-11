/**
 * A pipe table inside a quote, a GitHub alert or a MyST admonition (CR 291): a click on a cell opens
 * the cell editor and the table bar, not the raw block editor.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

export const TABLE_IN_CONTAINER_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-121
    id: "table-editing/v33-cell-editor-in-quote-light-900",
    fixture: "86-table-in-quote-and-admonition",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    tableInContainerChecks: "quote",
    description: "Light theme, 900 px pane, edit mode: a click on a cell of the table inside a quote opens the cell "
      + "editor and the table bar, not the raw Markdown editor, and the cell of a GitHub alert and of a MyST "
      + "admonition do the same (the `open` step keeps the editor of the quote).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-121
    id: "table-editing/v34-cell-editor-in-note-dark-900",
    fixture: "86-table-in-quote-and-admonition",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    tableInContainerChecks: "note",
    description: "Dark theme, 900 px pane, edit mode: a click on a cell of the table inside a GitHub alert opens the "
      + "cell editor and the table bar, and typing then Enter saves the table with the `>` prefix kept on every "
      + "line (the `open` step keeps the editor of the alert).",
  },
];
