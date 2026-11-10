/**
 * SVG pictures (CR 272): an `svg` fence and a raw `<svg>` block are drawn inline in the colours of
 * the theme (Cream, White, Dark), and a click in edit mode opens the source editor of the block.
 */

import { WIDE, type ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const THEMES = [
  ["v19", "cream", "light", "Cream"],
  ["v20", "white", "light", "White"],
  ["v21", "dark", "dark", "Dark"],
] as const;

const PICTURE_ASSERTIONS: ContentAssertion[] = [
  { message: "the fence and the raw block are two pictures", selector: "main figure.myst-svg-figure > svg", count: 2, visible: true },
  { message: "no picture is left as a code block", selector: "main pre", count: 0 },
  {
    message: "a surface fill resolves to the theme's block colour, not black",
    selector: "main figure.myst-svg-figure rect[fill='var(--surface)']",
    expr: "(() => { const rect = document.querySelector(\"main figure.myst-svg-figure rect[fill='var(--surface)']\"); "
      + "const fill = getComputedStyle(rect).fill; return fill.startsWith('rgb') && fill !== 'rgb(0, 0, 0)'; })()",
  },
  {
    message: "an unknown variable without a fallback takes the text colour",
    selector: "main figure.myst-svg-figure circle[fill='var(--text)']",
    count: 1,
    expr: "(() => { const circle = document.querySelector(\"main figure.myst-svg-figure circle[fill='var(--text)']\"); "
      + "return getComputedStyle(circle).fill === getComputedStyle(document.querySelector('main figure.myst-svg-figure text')).fill; })()",
  },
  {
    message: "the picture keeps its declared width, capped at the column",
    selector: "main figure.myst-svg-figure > svg",
    expr: "[...document.querySelectorAll('main figure.myst-svg-figure > svg')].every((svg) => svg.getBoundingClientRect().width <= 360.5 && svg.getBoundingClientRect().width > 100)",
  },
];

export const SVG_PICTURE_SCENARIOS: ScenarioDefinition[] = [
  ...THEMES.map(([version, mode, theme, label]) => ({
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-125
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-126
    id: `diagrams/${version}-svg-picture-${mode}-900`,
    fixture: "82-svg-picture",
    theme,
    previewThemeMode: mode,
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: PICTURE_ASSERTIONS,
    description: `${label} theme, 900 px pane: an svg fence and a raw svg block are drawn inline as pictures `
      + "in the theme's colours, with an unknown variable in the text colour.",
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-127
    id: "diagrams/v22-svg-picture-edit-light-900",
    fixture: "82-svg-picture",
    theme: "light",
    previewThemeMode: "white",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: [{ click: "main figure.myst-svg-figure", waitMs: 400 }],
    contentAssertions: [
      { message: "a click on a picture opens its source editor", selector: "main [data-sphinx-preview-block-editor] textarea", min: 1 },
    ],
    description: "Edit mode, 900 px pane: a click on a picture opens the source editor of its block, as for a Mermaid diagram.",
  },
];
