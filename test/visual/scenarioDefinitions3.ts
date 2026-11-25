/**
 * The screenshot scenarios, third part, in campaign order (after `scenarioDefinitions2.ts`).
 */
import { INLINE_IMAGE_ASSERTIONS, DOLLAR_PRICES_ASSERTIONS, RAW_TABLE_COLOUR_SPANS_ASSERTIONS, LINK_WARNING_ASSERTIONS, MAIN, NARROW360, LIST_ROW_HANDLE_ASSERTIONS, NARROW_ROW_HANDLE_ASSERTIONS, WIDE_ROW_HANDLE_ASSERTIONS, ROW_DRAG_ASSERTIONS, ROW_HANDLE_ASSERTIONS, WIDE, type ScenarioDefinition } from "./scenarioAssertions";

export const SCENARIO_DEFINITIONS_3: ScenarioDefinition[] = [
  // CR 050: an image inside a paragraph stays in the text; a standalone image stays a figure.
  {
    id: "rendering-core/v23-inline-image-in-text-light-900",
    fixture: "52-inline-image",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: INLINE_IMAGE_ASSERTIONS,
    description: "A paragraph with an image between two pieces of text, then an image on its own: the first image is drawn "
      + "in the line of text, after \"Text before the logo\" and before \"and text after it\"; the standalone image stays a "
      + "centred block of its own.",
  },
  {
    id: "rendering-core/v24-inline-image-in-text-edit-dark-900",
    fixture: "52-inline-image",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    contentAssertions: INLINE_IMAGE_ASSERTIONS,
    description: "The same page in edit mode, dark theme: the inline image stays in its line of text and the standalone image "
      + "stays a centred figure.",
  },
  // CR 050: an image pasted into a paragraph editor becomes a paragraph of its own.
  {
    // @tests_req StRS-MDOKFSTUDIO-PALETTE-018
    id: "palette-slash/v22-pasted-image-paragraph-light-900",
    fixture: "52-inline-image",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pasteImageChecks: true,
    description: "An image pasted at the end of a paragraph editor (after a typed space) and in the middle of its text: "
      + "each time the reference goes on a paragraph of its own, with a blank line before and after it, and its name is "
      + "selected. The final frame shows the editor after the paste at the end.",
  },
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-085
    id: `toolbar-navigation/v${35 + index}-link-warning-${theme}-900`,
    fixture: "61-link-warnings",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    render: {
      hostMessages: [{ delayMs: 50, data: { type: "previewLinkTargets", targets: [
        { request: "guide.md", kind: "local", path: "/workspace/guide.md" },
        { request: "docs/guid.md", kind: "blocked", reason: "File not found: docs/guid.md" },
        { request: "../private/notes.md", kind: "blocked", reason: "The navigation target is outside the workspace." },
      ] } }],
    },
    contentAssertions: LINK_WARNING_ASSERTIONS,
    description: `Three links, one valid and two to a missing or blocked file, ${theme}, 900 px pane: the links keep their text and colour and `
      + "a small warning icon follows each of the two that cannot be opened.",
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-GFM-034#S1
    // @tests_req SwRS-MDOKFSTUDIO-GFM-034#S4
    id: `gfm/v0${7 + index}-raw-table-colour-spans-${theme}-900`,
    fixture: "59-raw-table-colour-spans",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: RAW_TABLE_COLOUR_SPANS_ASSERTIONS,
    description: `Coloured spans in a raw HTML table (a named colour, hsl(), a hex colour on an rgba() background, and a var()/url() value that is dropped), ${theme}, 900 px pane.`,
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-MYST-102#S1
    // @tests_req SwRS-MDOKFSTUDIO-MYST-102#S2
    id: `myst/v${35 + index}-dollar-prices-full-${theme}-900`,
    fixture: "55-dollar-prices",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: DOLLAR_PRICES_ASSERTIONS,
    description: `Three price sentences (\`$19 ... ($200)\`, \`$5 and $6\`, \`$100–$380\`), three real math spans and four bold prices, ${theme}, 900 px pane: the preview keeps prices as text and typesets only valid math.`,
  })),
  ...([
    { name: "light", theme: "light", mode: undefined },
    { name: "dark", theme: "dark", mode: undefined },
    { name: "cream", theme: "dark", mode: "cream" },
  ] as const).flatMap((variant, index) => [
    {
      // @tests_req StRS-MDOKFSTUDIO-TABLE-002
      // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
      id: `table-editing/v0${6 + index}-row-handles-${variant.name}-900`,
      fixture: "56-table-row-handles",
      theme: variant.theme,
      ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
      ...WIDE,
      scroll: { kind: "top" as const },
      editMode: true,
      contentAssertions: ROW_HANDLE_ASSERTIONS,
      description: `Edit mode, ${variant.name} preview, 900 px pane: each body row of two pipe tables shows the list editor's handle just left of the table, centred on its row, the header rows show none, and the table that fills the column keeps its handles in the pane, unclipped.`,
    },
    {
      // @tests_req StRS-MDOKFSTUDIO-TABLE-002
      // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
      id: `table-editing/v${String(9 + index).padStart(2, "0")}-row-dragging-${variant.name}-900`,
      fixture: "56-table-row-handles",
      theme: variant.theme,
      ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
      ...WIDE,
      scroll: { kind: "top" as const },
      editMode: true,
      pageActions: [{
        drag: `[data-okf-row-handle-layer] .okf-table-row-handle[data-okf-row="1"]`,
        over: `${MAIN} table:nth-of-type(1) tbody tr:nth-child(3)`,
        hold: true as const,
      }],
      contentAssertions: ROW_DRAG_ASSERTIONS,
      description: `Edit mode, ${variant.name} preview, 900 px pane, the first handle of the short table dragged over the third row with the button still down: the dragged row is dimmed and a line under the third row shows where it would land.`,
    },
  ]),
  ...([
    { name: "light", theme: "light", mode: undefined },
    { name: "dark", theme: "dark", mode: undefined },
    { name: "cream", theme: "dark", mode: "cream" },
  ] as const).map((variant, index) => ({
    // @tests_req StRS-MDOKFSTUDIO-TABLE-002
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
    id: `table-editing/v${12 + index}-list-table-row-handles-${variant.name}-900`,
    fixture: "57-list-table-row-handles",
    theme: variant.theme,
    ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    contentAssertions: LIST_ROW_HANDLE_ASSERTIONS,
    description: `Edit mode, ${variant.name} preview, 900 px pane: each body row of two {list-table} directives (one header row, then two header rows) shows the list editor's handle just left of the table, centred on its row, the header rows show none, and no handle is clipped.`,
  })),
  ...([
    { name: "light", theme: "light", mode: undefined },
    { name: "dark", theme: "dark", mode: undefined },
    { name: "cream", theme: "dark", mode: "cream" },
  ] as const).flatMap((variant, index) => [
    {
      // @tests_req StRS-MDOKFSTUDIO-TABLE-002
      // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
      id: `table-editing/v${15 + index}-row-handles-narrow-${variant.name}-360`,
      fixture: "56-table-row-handles",
      theme: variant.theme,
      ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
      width: NARROW360.width,
      height: 1000,
      scroll: { kind: "top" as const },
      editMode: true,
      contentAssertions: NARROW_ROW_HANDLE_ASSERTIONS,
      description: `Edit mode, ${variant.name} preview, 360 px pane: the tables leave no room on their left, so they are pushed right by a handle's width; the handles stay in the pane, left of the tables and centred on their rows, even where a table scrolls sideways.`,
    },
    {
      // @tests_req StRS-MDOKFSTUDIO-TABLE-002
      // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
      id: `table-editing/v${18 + index}-list-table-row-handles-narrow-${variant.name}-360`,
      fixture: "57-list-table-row-handles",
      theme: variant.theme,
      ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
      width: NARROW360.width,
      height: 1000,
      scroll: { kind: "top" as const },
      editMode: true,
      contentAssertions: LIST_ROW_HANDLE_ASSERTIONS,
      description: `Edit mode, ${variant.name} preview, 360 px pane: the two {list-table} directives keep their handles in the pane, left of the tables and centred on their rows.`,
    },
  ]),
  ...([
    { name: "light", theme: "light", mode: undefined },
    { name: "dark", theme: "dark", mode: undefined },
    { name: "cream", theme: "dark", mode: "cream" },
  ] as const).map((variant, index) => ({
    // @tests_req StRS-MDOKFSTUDIO-TABLE-002
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-002
    id: `table-editing/v${21 + index}-row-handles-scrolling-table-${variant.name}-900`,
    fixture: "58-wide-table-row-handles",
    theme: variant.theme,
    ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    contentAssertions: WIDE_ROW_HANDLE_ASSERTIONS,
    description: `Edit mode, ${variant.name} preview, 900 px pane: a pipe table of fourteen columns, wider than the pane and scrolled sideways, keeps the handle of each body row left of the table, outside its scrolling box, visible and centred on its row.`,
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-TABLE-048
    id: `table-editing/v${24 + index}-table-bar-groups-${theme}-360`,
    fixture: "60-table-bar-groups",
    theme,
    width: NARROW360.width,
    height: 800,
    scroll: { kind: "selector" as const, value: "main table:not(.okf-properties) tbody td:nth-child(3)", offset: 72 },
    editMode: true,
    editTarget: "table-cell" as const,
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description: `The table bar of a cell editor, ${theme}, 360 px pane: a rule before Col left and before List table but none between Col left and Col right and Col \u2212, and the rule of the cell formatting group goes with the group onto its own line.`,
  })),
];
