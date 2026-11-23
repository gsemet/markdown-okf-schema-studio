/**
 * The blank-line block of edit mode (CR-444): each shown blank line is its own small block (CR-476), shows its Delete block button when selected, and never shows in reading mode.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const FIXTURE = "92-blank-lines-block";
const LIST_FIXTURE = "93-blank-lines-in-lists";
const CONTAINERS_FIXTURE = "95-blank-lines-in-containers";
const SIX_FIXTURE = "96-blank-lines-six";

export const BLANK_LINES_BLOCK_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
    id: "block-editing/v44-blank-lines-block-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "edit" as const,
    description: "Light theme, 900 px pane, edit mode: three blank lines between two paragraphs show as two "
      + "dashed blank-line blocks (the first line is the hidden separator) labelled 'Blank line', each as wide "
      + "as the content column, with no Delete block button shown yet (the `bar` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
    id: "block-editing/v45-blank-lines-block-selected-dark-900",
    fixture: FIXTURE,
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "selected" as const,
    description: "Dark theme, 900 px pane, edit mode: the blank-line block reached with the Down arrow from "
      + "the first paragraph takes the selection look and shows its Delete block button at its left edge, "
      + "before the label (the `selected` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
    id: "block-editing/v46-blank-lines-block-reading-light-900",
    fixture: FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    blankLinesChecks: "reading" as const,
    description: "Light theme, 900 px pane, reading mode of the same file: the two paragraphs have no "
      + "blank-line block between them (the `top` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
    id: "block-editing/v47-blank-lines-in-lists-light-900",
    fixture: LIST_FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "list-edit" as const,
    description: "Light theme, 900 px pane, edit mode: a run of three blank lines between two list items and one "
      + "between two paragraphs of an item each show two blank-line blocks inside the item that holds them, as "
      + "wide as the item's content, and the blank lines of the fence in the third item show none (the `bar` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
    id: "block-editing/v48-blank-lines-in-lists-selected-dark-900",
    fixture: LIST_FIXTURE,
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "list-selected" as const,
    description: "Dark theme, 900 px pane, edit mode: the blank-line block between two items, reached with the "
      + "Down arrow, shows its Delete block button at its left edge, clear of the list item handles (the `selected` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
    id: "block-editing/v49-blank-lines-in-lists-reading-light-900",
    fixture: LIST_FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    blankLinesChecks: "list-reading" as const,
    description: "Light theme, 900 px pane, reading mode of the same file: the list shows no blank-line block (the `top` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
    id: "block-editing/v50-blank-lines-in-lists-typing-light-900",
    fixture: LIST_FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "list-typing" as const,
    description: "Light theme, 900 px pane, edit mode: the editor of the blank-line block between two items opens "
      + "inside the first item, and stays inside an item of the list after text is typed and the autosave ran (the `text` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
    id: "block-editing/v51-blank-lines-in-containers-light-900",
    fixture: CONTAINERS_FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "containers-edit" as const,
    description: "Light theme, 900 px pane, edit mode: a run of empty lines in a quote, in an alert, in an admonition, "
      + "in a context-tag panel, in a definition and in a footnote each show two blank-line blocks inside the container "
      + "that holds them, as wide as its content box, clear of the quote border and the alert icon, with the Delete block "
      + "button at the block's left edge (the `bar` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
    id: "block-editing/v52-blank-lines-in-containers-reading-dark-900",
    fixture: CONTAINERS_FIXTURE,
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    blankLinesChecks: "containers-reading" as const,
    description: "Dark theme, 900 px pane, reading mode of the same file: the containers show no blank-line block (the `top` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
    id: "block-editing/v53-blank-lines-in-containers-typing-light-900",
    fixture: CONTAINERS_FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "containers-typing" as const,
    description: "Light theme, 900 px pane, edit mode: the editor of the blank-line block of the quote opens inside "
      + "the quote, and stays inside the one re-rendered quote after text is typed and the autosave ran (the `text` step).",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
    id: "block-editing/v54-blank-lines-six-light-900",
    fixture: SIX_FIXTURE,
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    blankLinesChecks: "six" as const,
    description: "Light theme, 900 px pane, edit mode: a line of text then six blank lines at the end of the "
      + "document show six blank-line blocks in a row, one for each blank line, each labelled 'Blank line' (the `bar` step).",
  },
];
