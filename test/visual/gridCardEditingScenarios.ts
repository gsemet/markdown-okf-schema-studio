/**
 * Editing the body or the title of a `{grid-item-card}` in a 3-column grid: the card widens and
 * pushes its neighbours aside, the edition palette sits above the text box (it may be wider than
 * the card, with a maximum height) and the text box keeps a readable minimum width.
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const CARD = `${MAIN} .myst-grid-row > .myst-grid-item:nth-child(2)`;
const MIN_TEXT_BOX = 240;
const MIN_CARD = 320;

/** The open editor of the second card and its three cards, then one condition on their boxes. */
const measure = (condition: string): string => `(() => {
  const palette = document.querySelector('.sphinx-preview-block-editor-host > .sphinx-preview-edit-palette');
  const box = document.querySelector('.sphinx-preview-block-editor textarea');
  const items = [...document.querySelectorAll('#sphinx-myst-preview-content .myst-grid-row > .myst-grid-item')];
  if (!palette || !box || items.length !== 3) return false;
  const bar = palette.getBoundingClientRect(), text = box.getBoundingClientRect();
  const [one, card, three] = items.map((item) => item.getBoundingClientRect());
  const style = getComputedStyle(palette);
  return ${condition};
})()`;

const LAYOUT_ASSERTIONS: ContentAssertion[] = [
  { message: "the palette and the text box are there and the palette is above the text box (its bottom is not below the text box top)", selector: MAIN, expr: measure("bar.bottom <= text.top + 0.5") },
  { message: `the text box is at least ${MIN_TEXT_BOX}px wide`, selector: MAIN, expr: measure(`text.width >= ${MIN_TEXT_BOX}`) },
  { message: `the card is at least ${MIN_CARD}px wide while its editor is open`, selector: MAIN, expr: measure(`card.width >= ${MIN_CARD}`) },
  { message: "the first card ends before the second starts (the neighbour is pushed, not overlapped)", selector: MAIN, expr: measure("one.right <= card.left + 0.5") },
  { message: "the second card ends before the third starts (the neighbour is pushed, not overlapped)", selector: MAIN, expr: measure("card.right <= three.left + 0.5") },
  { message: "the palette has a maximum height, at least its own height, and scrolls vertically", selector: MAIN, expr: measure("style.maxHeight !== 'none' && bar.height <= parseFloat(style.maxHeight) + 0.5 && style.overflowY === 'auto'") },
];

const variants = [
  { part: "body", click: `${CARD} .myst-grid-card-body p`, what: "the body of the second card" },
  { part: "title", click: `${CARD} .myst-grid-card-title`, what: "the title of the second card" },
] as const;

export const GRID_CARD_EDITING_SCENARIOS: ScenarioDefinition[] = variants.flatMap((variant, partIndex) =>
  ([
    { name: "cream", theme: "light", mode: "cream" },
    { name: "dark", theme: "dark", mode: undefined },
  ] as const).map((theme, themeIndex) => ({
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-257
    id: `block-editing/v${23 + partIndex * 2 + themeIndex}-grid-card-${variant.part}-editor-layout-${theme.name}-900`,
    fixture: "73-grid-card-editing",
    theme: theme.theme,
    ...(theme.mode ? { previewThemeMode: theme.mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [{ click: variant.click, waitMs: 500 }],
    description: `Edit mode, ${theme.name} preview, 900 px pane: a click on ${variant.what} opens the block editor; the card widens and pushes its neighbours aside, `
      + "the edition palette sits above the text box and the text box keeps a readable width.",
    contentAssertions: [
      { message: "exactly one block editor is open", selector: "[data-sphinx-preview-block-editor]", count: 1 },
      { message: "the editor sits inside the second card", selector: `${CARD} [data-sphinx-preview-block-editor]`, count: 1 },
      ...LAYOUT_ASSERTIONS,
    ],
  })));
