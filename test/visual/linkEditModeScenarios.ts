/**
 * CR 217: in edit mode a plain click on a link inside a mapped block opens the editor of that block
 * (the link is not followed), and the hover outlines the block under the pointer as for any text: a
 * link-only paragraph, the part of a `:link:` card under the pointer. Each frame is taken right
 * after the pointer action.
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const CARD = `${MAIN} .myst-grid-card`;

const cases = [
  {
    part: "linkonly-click", fixture: "75-link-only-paragraph", action: { click: `${MAIN} p a`, waitMs: 500 },
    what: "a click on the link of the link-only paragraph opens the editor of that paragraph",
    assertion: { message: "one block editor is open, on the link-only paragraph", selector: `${MAIN} [data-sphinx-preview-block-editor]`, count: 1 },
  },
  {
    part: "linkonly-hover", fixture: "75-link-only-paragraph", action: { hover: `${MAIN} p a`, waitMs: 500 },
    what: "the pointer over the link of the link-only paragraph outlines that paragraph",
    assertion: { message: "the link-only paragraph is outlined", selector: `${MAIN} p[data-sphinx-preview-edit-hover="true"]`, count: 1 },
  },
  {
    part: "card-click", fixture: "46-grid-cards", action: { click: `${CARD} .myst-grid-card-footer`, waitMs: 500 },
    what: "a click on the footer of the linked card opens the editor on the footer line, inside the card",
    assertion: { message: "one block editor is open inside the linked card", selector: `${CARD} [data-sphinx-preview-block-editor]`, count: 1 },
  },
  {
    part: "card-hover", fixture: "46-grid-cards", action: { hover: `${CARD} .myst-grid-card-body`, waitMs: 500 },
    what: "the pointer over the body of the linked card outlines the body text only, not the whole card",
    // Scoped to the body: an outline on the whole card would not match.
    assertion: { message: "only the body paragraph of the linked card is outlined", selector: `${CARD} .myst-grid-card-body p[data-sphinx-preview-edit-hover="true"]`, count: 1, text: "The body of the card" },
  },
] as const;

export const LINK_EDIT_MODE_SCENARIOS: ScenarioDefinition[] = cases.flatMap((entry, partIndex) =>
  ([
    { name: "cream", theme: "light", mode: "cream" },
    { name: "dark", theme: "dark", mode: undefined },
  ] as const).map((theme, themeIndex) => ({
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
    id: `block-editing/v${27 + partIndex * 2 + themeIndex}-link-edit-mode-${entry.part}-${theme.name}-900`,
    fixture: entry.fixture,
    theme: theme.theme,
    ...(theme.mode ? { previewThemeMode: theme.mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [entry.action],
    description: `Edit mode, ${theme.name} preview, 900 px pane: ${entry.what}, as the frame stands right after it.`,
    contentAssertions: [entry.assertion],
  })));
