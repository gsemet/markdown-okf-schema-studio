/**
 * The blank-lines block of edit mode (CR-444): a run of extra blank lines shows as a small block between
 * two paragraphs, shows its Delete block button when selected, and never shows in reading mode.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const FIXTURE = "92-blank-lines-block";
const LIST_FIXTURE = "93-blank-lines-in-lists";

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
    description: "Light theme, 900 px pane, edit mode: three blank lines between two paragraphs show as one "
      + "dashed blank-lines block labelled 'Blank lines (3)', as wide as the content column, with no Delete "
      + "block button shown yet (the `bar` step).",
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
    description: "Dark theme, 900 px pane, edit mode: the blank-lines block reached with the Down arrow from "
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
      + "blank-lines block between them (the `top` step).",
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
    description: "Light theme, 900 px pane, edit mode: a run of blank lines between two list items and one "
      + "between two paragraphs of an item each show one blank-lines block inside the item that holds it, as "
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
    description: "Dark theme, 900 px pane, edit mode: the blank-lines block between two items, reached with the "
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
    description: "Light theme, 900 px pane, reading mode of the same file: the list shows no blank-lines block (the `top` step).",
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
    description: "Light theme, 900 px pane, edit mode: the editor of the blank-lines block between two items opens "
      + "inside the first item, and stays inside an item of the list after text is typed and the autosave ran (the `text` step).",
  },
];
