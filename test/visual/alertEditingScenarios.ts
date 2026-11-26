/**
 * Editing inside a GitHub alert or a MyST admonition: a click or Enter on a block of the body opens
 * that block alone in its editor, the alert or directive staying rendered around it; a click on the
 * title opens the whole alert or directive, from its first line to its last.
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const EDITOR_TEXT = "document.querySelector('.sphinx-preview-block-editor textarea[aria-label=\"Raw Markdown block\"]')?.value ?? ''";
const OPENED_RANGES = "(window.visualMessages || []).filter((message) => message.type === 'previewEditOpen')"
  + ".map((message) => message.line + '-' + message.endLine).join(',')";
const NOTE = `${MAIN} aside.admonition.note`;
/** The open editor's palette ends above its text box: it covers none of the text. */
const BAR_ABOVE_TEXT = {
  message: "the palette of the open editor ends above its text box",
  selector: MAIN,
  expr: "(() => { const host = document.querySelector('.sphinx-preview-block-editor-host'); "
    + "const bar = host?.querySelector(':scope > .sphinx-preview-edit-palette'); const box = host?.querySelector('textarea'); "
    + "return !!bar && !!box && bar.getBoundingClientRect().bottom <= box.getBoundingClientRect().top + 1; })()",
};

export const ALERT_EDITING_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
    id: "gfm/v14-alert-body-opens-pointed-paragraph-dark-900",
    fixture: "71-gfm-alert-editing",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [{ click: `${NOTE} > p:last-child`, waitMs: 400 }],
    description: "Edit mode, dark theme, 900 px: a click on the second paragraph of a two-paragraph note alert opens "
      + "one editor on that paragraph only, with its quote marker, inside the alert, which stays rendered with its "
      + "title and first paragraph.",
    contentAssertions: [
      {
        message: "the page asks the host for the line of the second paragraph (8) only, and only once",
        selector: MAIN,
        expr: `(${OPENED_RANGES}) === '8-8'`,
      },
      {
        message: "the editor holds the quoted line of the second paragraph and nothing else",
        selector: MAIN,
        expr: `(${EDITOR_TEXT}) === '> The second paragraph of the note.'`,
      },
      { message: "the second paragraph is hidden while its editor is open", selector: `${NOTE} > p[data-sphinx-preview-editing="true"]`, count: 1 },
      { message: "the editor is inside the note alert", selector: `${NOTE} .sphinx-preview-block-editor`, count: 1, visible: true },
      { message: "the title and the first paragraph of the note stay rendered", selector: `${NOTE} > .admonition-title, ${NOTE} > p[data-line="6"]`, count: 2, visible: true },
      BAR_ABOVE_TEXT,
    ],
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S1
    id: "gfm/v15-alert-title-opens-whole-alert-dark-900",
    fixture: "71-gfm-alert-editing",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [{ click: `${NOTE} > .admonition-title`, waitMs: 400 }],
    description: "Edit mode, dark theme, 900 px: a click on the title of a two-paragraph note alert opens one editor "
      + "on the whole alert, from the [!NOTE] marker line to its last quoted line; the tip and the warning right "
      + "after it stay rendered.",
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
      { message: "the note alert is hidden while its editor is open", selector: `${NOTE}[data-sphinx-preview-editing="true"]`, count: 1 },
      { message: "the tip and the warning after the note stay rendered", selector: `${MAIN} aside.admonition.tip, ${MAIN} aside.admonition.warning`, count: 2, visible: true },
    ],
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-021#S9
    id: "block-editing/v57-admonition-body-opens-pointed-paragraph-dark-900",
    fixture: "72-myst-admonition-editing",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [{ click: `${NOTE} > p:last-child`, waitMs: 400 }],
    description: "Edit mode, dark theme, 900 px: a click on the second paragraph of a two-paragraph note directive "
      + "opens one editor on that paragraph only, inside the note, which stays rendered with its title and first "
      + "paragraph.",
    contentAssertions: [
      {
        message: "the page asks the host for the line of the second paragraph (8) only, and only once",
        selector: MAIN,
        expr: `(${OPENED_RANGES}) === '8-8'`,
      },
      {
        message: "the editor holds the second paragraph and no fence",
        selector: MAIN,
        expr: `(${EDITOR_TEXT}) === 'The second paragraph of the note.'`,
      },
      { message: "the second paragraph is hidden while its editor is open", selector: `${NOTE} > p[data-sphinx-preview-editing="true"]`, count: 1 },
      { message: "the editor is inside the note directive", selector: `${NOTE} .sphinx-preview-block-editor`, count: 1, visible: true },
      { message: "the title and the first paragraph of the note stay rendered", selector: `${NOTE} > .admonition-title, ${NOTE} > p[data-line="6"]`, count: 2, visible: true },
      BAR_ABOVE_TEXT,
    ],
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S1
    id: "block-editing/v58-admonition-title-opens-whole-directive-dark-900",
    fixture: "72-myst-admonition-editing",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [{ click: `${NOTE} > .admonition-title`, waitMs: 400 }],
    description: "Edit mode, dark theme, 900 px: a click on the title of a two-paragraph note directive opens one "
      + "editor on the whole directive, from the opening to the closing fence; the tip right after it stays "
      + "rendered.",
    contentAssertions: [
      {
        message: "the page asks the host for the lines of the whole note directive (5 to 9), and only once",
        selector: MAIN,
        expr: `(${OPENED_RANGES}) === '5-9'`,
      },
      {
        message: "the editor holds the note directive from its opening fence to its closing fence",
        selector: MAIN,
        expr: `(${EDITOR_TEXT}) === '\`\`\`{note}\\nThe first paragraph of the note.\\n\\nThe second paragraph of the note.\\n\`\`\`'`,
      },
      { message: "the note directive is hidden while its editor is open", selector: `${NOTE}[data-sphinx-preview-editing="true"]`, count: 1 },
      { message: "the tip after the note stays rendered", selector: `${MAIN} aside.admonition.tip`, count: 1, visible: true },
    ],
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S5
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-021#S9
    id: "block-editing/v59-admonition-keyboard-opens-first-item-dark-900",
    fixture: "98-admonition-keyboard-open",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    pageActions: [
      { click: "[data-sphinx-preview-edit-toggle]" },
      { press: "ArrowDown" },
      { press: "ArrowDown" },
      { press: "ArrowRight" },
      { press: "ArrowDown" },
      { press: "ArrowRight" },
      { press: "Enter" },
    ],
    description: "Edit mode, dark theme, 900 px, keyboard: Down to the note, Right into it, Down to its list, Right "
      + "to the first item and Enter open one editor on that item only, inside the note, which stays rendered with "
      + "its paragraph and second item.",
    contentAssertions: [
      {
        message: "the page asks the host for the line of the first item (6) only, and only once",
        selector: MAIN,
        expr: `(${OPENED_RANGES}) === '6-6'`,
      },
      {
        message: "the editor holds the first item and nothing else",
        selector: MAIN,
        expr: `(${EDITOR_TEXT}) === '- The first item of the note.'`,
      },
      { message: "the first item is hidden while its editor is open", selector: `${NOTE} li[data-sphinx-preview-editing="true"]`, count: 1 },
      { message: "the paragraph and the second item of the note stay rendered", selector: `${NOTE} > p[data-line="4"], ${NOTE} li[data-line="7"]`, count: 2, visible: true },
      BAR_ABOVE_TEXT,
    ],
  },
];
