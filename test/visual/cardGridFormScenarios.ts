/**
 * The Card and Grid forms of the MyST edit bar (CR 245): the palette is set to MyST in an opened
 * paragraph editor, the Card or Grid button opens its form under the bar, and the fields are
 * filled (the Grid form with a header, footer and link for its cards).
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";
import type { PageAction } from "./scenarios";

const BLOCK_EDITOR = ".sphinx-preview-block-editor-host";
const FIELD = (name: string): string => `${BLOCK_EDITOR} [data-directive-field='${name}']`;
const OPEN_PARAGRAPH: PageAction = { click: `${MAIN} p:first-of-type`, waitMs: 400 };
const MYST_MODE: PageAction = { select: `${BLOCK_EDITOR} select[data-edit-palette-mode-select]`, value: "myst", waitMs: 200 };

const fieldValue = (name: string): string => `document.querySelector("[data-directive-field='${name}']")?.value`;
const panelAssertion = (kind: string, fields: number): ContentAssertion => ({
  message: `the ${kind} form is open under the palette with its ${fields} fields and the Insert and Cancel buttons`,
  selector: MAIN,
  expr: `(() => { const panel = document.querySelector("[data-sphinx-directive-panel='${kind}']"); `
    + "const bar = document.querySelector('.sphinx-preview-edit-palette'); "
    + `return !!panel && !!bar && panel.querySelectorAll('input').length === ${fields} `
    + "&& panel.querySelectorAll('button').length === 2 "
    + "&& bar.getBoundingClientRect().bottom <= panel.getBoundingClientRect().top + 0.5; })()",
});

const CARD_ACTIONS: PageAction[] = [
  OPEN_PARAGRAPH,
  MYST_MODE,
  { click: `${BLOCK_EDITOR} .sphinx-preview-edit-palette [data-edit-action='card']`, waitMs: 300 },
  { fill: FIELD("title"), value: "Highlights" },
  { fill: FIELD("header"), value: "Release 1.3" },
  { fill: FIELD("footer"), value: "Read the changelog" },
  { fill: FIELD("link"), value: "https://example.org/changelog" },
];

const GRID_ACTIONS: PageAction[] = [
  OPEN_PARAGRAPH,
  MYST_MODE,
  { click: `${BLOCK_EDITOR} .sphinx-preview-edit-palette [data-edit-action='grid']`, waitMs: 300 },
  { fill: FIELD("columns"), value: "1 2 2 3" },
  { fill: FIELD("cards"), value: "2" },
  { fill: FIELD("headers"), value: "Editor|Preview" },
  { fill: FIELD("footers"), value: "|See the guide" },
  { fill: FIELD("links"), value: "https://example.org/editor|https://example.org/preview" },
];

const VARIANTS = [
  { name: "light", theme: "light" },
  { name: "dark", theme: "dark" },
] as const;

export const CARD_GRID_FORM_SCENARIOS: ScenarioDefinition[] = VARIANTS.flatMap((variant, index) => [
  {
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-270
    id: `palette-slash/v${40 + index * 2}-card-form-${variant.name}-900`,
    fixture: "78-card-grid-forms",
    theme: variant.theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: CARD_ACTIONS,
    contentAssertions: [
      panelAssertion("card", 4),
      { message: "the filled values are in the fields", selector: MAIN, expr: `${fieldValue("title")} === 'Highlights' && ${fieldValue("header")} === 'Release 1.3' && ${fieldValue("link")} === 'https://example.org/changelog'` },
    ],
    description: `Edit mode, ${variant.name} preview, 900 px: the Card button of the MyST edit bar opens the card form (title, header, footer, link) under the bar, filled in.`,
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-271
    id: `palette-slash/v${41 + index * 2}-grid-form-${variant.name}-900`,
    fixture: "78-card-grid-forms",
    theme: variant.theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: GRID_ACTIONS,
    contentAssertions: [
      panelAssertion("grid", 6),
      { message: "the filled per-card values are in the fields", selector: MAIN, expr: `${fieldValue("columns")} === '1 2 2 3' && ${fieldValue("headers")} === 'Editor|Preview' && ${fieldValue("footers")} === '|See the guide'` },
    ],
    description: `Edit mode, ${variant.name} preview, 900 px: the Grid button of the MyST edit bar opens the grid form (columns, gutter, cards and the header, footer and link of each card) under the bar, filled in.`,
  },
]);
