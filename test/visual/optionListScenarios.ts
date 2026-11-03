/**
 * Writing an option list in a block editor (CR 241): the Option toolbar button turns a paragraph
 * into an option item `- ( ) `, Enter at the end of the item starts the next option, and Enter on
 * the empty option ends the list.
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const EDITOR_TEXT = "document.querySelector('.sphinx-preview-block-editor textarea[aria-label=\"Raw Markdown block\"]')?.value ?? ''";
const OPTION_BUTTON = ".sphinx-preview-edit-palette [data-edit-action='option']";
const OPEN_PARAGRAPH = { click: `${MAIN} p:first-of-type`, waitMs: 400 };
const TOGGLE_OPTION = { click: OPTION_BUTTON, waitMs: 200 };

const BUTTON_ASSERTIONS: ContentAssertion[] = [
  { message: "the palette shows the Toggle option button, titled for it", selector: OPTION_BUTTON, count: 1, visible: true, expr: "document.querySelector(\".sphinx-preview-edit-palette [data-edit-action='option']\").title.startsWith('Toggle option')" },
  { message: "the paragraph is an option item in its editor", selector: MAIN, expr: `(${EDITOR_TEXT}) === '- ( ) Cache the rendered page between sessions'` },
];

const ENTER_ASSERTIONS: ContentAssertion[] = [
  { message: "Enter at the end of the option item starts the next option and leaves the caret after it", selector: MAIN, expr: `(${EDITOR_TEXT}) === '- ( ) Cache the rendered page between sessions\\n- ( ) '` },
];

const EXIT_ASSERTIONS: ContentAssertion[] = [
  { message: "Enter on the empty option ends the list: the empty option is gone", selector: MAIN, expr: `(${EDITOR_TEXT}) === '- ( ) Cache the rendered page between sessions\\n'` },
];

const VARIANTS = [
  { name: "cream", theme: "light", mode: "cream" },
  { name: "dark", theme: "dark", mode: undefined },
] as const;

export const OPTION_LIST_SCENARIOS: ScenarioDefinition[] = [
  ...VARIANTS.map((variant, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-061
    id: `palette-slash/v${30 + index}-option-list-enter-${variant.name}-900`,
    fixture: "77-option-list-editing",
    theme: variant.theme,
    ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [OPEN_PARAGRAPH, TOGGLE_OPTION, { press: "End" }, { press: "Enter", waitMs: 200 }],
    contentAssertions: [...BUTTON_ASSERTIONS.slice(0, 1), ...ENTER_ASSERTIONS],
    description: `Edit mode, ${variant.name} preview, 900 px: the Option button turns the opened paragraph into an option item, then Enter at its end starts the next option with ( ) already typed.`,
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-061
    id: "palette-slash/v32-option-list-exit-dark-900",
    fixture: "77-option-list-editing",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [OPEN_PARAGRAPH, TOGGLE_OPTION, { press: "End" }, { press: "Enter" }, { press: "Enter", waitMs: 200 }],
    contentAssertions: EXIT_ASSERTIONS,
    description: "Edit mode, dark preview, 900 px: the Option button turns the opened paragraph into an option item, Enter starts the next option and a second Enter on that empty option ends the list.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
    id: "palette-slash/v33-option-list-button-cream-900",
    fixture: "77-option-list-editing",
    theme: "light",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [OPEN_PARAGRAPH, TOGGLE_OPTION],
    contentAssertions: BUTTON_ASSERTIONS,
    description: "Edit mode, cream preview, 900 px: the Option button turns the opened paragraph into an option item with the caret kept on the text.",
  },
];
