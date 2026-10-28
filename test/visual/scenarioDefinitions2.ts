/**
 * The screenshot scenarios, second part, in campaign order (after `scenarioDefinitions1.ts`).
 */

import { RELEASE_SHOWCASE_SCENARIOS } from "./releaseShowcaseScenarios";
import {
  BACK_ENABLED_ASSERTIONS,
  BLOCK_SELECTION_ASSERTIONS,
  CHIPS_HIDDEN_ASSERTIONS,
  CJK_RTL_ASSERTIONS,
  CODE_BLOCK_CAPTION_ASSERTIONS,
  COMMENT_LIST_ASSERTIONS,
  FIRST_GAP_SCENARIOS,
  FORCED_DARK_ASSERTIONS,
  FRESH_WORKSPACE_ASSERTIONS,
  GFM_GALLERY_ASSERTIONS,
  GRID_ASSERTIONS,
  HUGE_DOCUMENT_ASSERTIONS,
  INCOMING_BARS_ASSERTIONS,
  INCOMING_CHANGES_MESSAGE,
  README_SHOWCASE_CHANGES_MESSAGE,
  INCOMING_DIFF_OFF_ASSERTIONS,
  INCOMING_RANGES_MESSAGE,
  INLINE_IMAGE_ASSERTIONS,
  INVALID_YAML_ASSERTIONS,
  DOLLAR_PRICES_ASSERTIONS,
  RAW_TABLE_COLOUR_SPANS_ASSERTIONS,
  LINK_WARNING_ASSERTIONS,
  LIST_TABLE_ASSERTIONS,
  LONG_WORDS_ASSERTIONS,
  MAIN,
  MARK_EDITOR_SELECTION_ASSERTIONS,
  STICKY_SHADOW_ASSERTIONS,
  MAX_WIDTH_ASSERTIONS,
  MERMAID_ERROR_ASSERTIONS,
  MISSING_IMAGE_ASSERTIONS,
  MYST_GALLERY_ASSERTIONS,
  NARROW,
  NARROW360,
  ORPHAN_LIST_ASSERTIONS,
  LIST_ROW_HANDLE_ASSERTIONS,
  NARROW_ROW_HANDLE_ASSERTIONS,
  WIDE_ROW_HANDLE_ASSERTIONS,
  ROW_DRAG_ASSERTIONS,
  ROW_HANDLE_ASSERTIONS,
  ORPHAN_THREADS_MESSAGE,
  PLANTUML_UNSUPPORTED_ASSERTIONS,
  plantUmlBuiltinAssertions,
  plantUmlFileAssertions,
  PLANTUML_THEME_SPRITE_ASSERTIONS,
  plantUmlIncludeAssertions,
  PROPERTIES_HIDDEN_ASSERTIONS,
  READ_ONLY_ASSERTIONS,
  READ_ONLY_NO_HOVER_ASSERTIONS,
  REVIEW_THREAD_OPEN_ASSERTIONS,
  REVIEW_THREAD_RESOLVED_ASSERTIONS,
  type ScenarioDefinition,
  STRICT_FIELD_ASSERTIONS,
  THREADS_MESSAGE,
  TOCTREE_ASSERTIONS,
  WARNING_BANNER_ASSERTIONS,
  WARNING_BANNER_CLOSED_ASSERTIONS,
  WIDE,
  XLARGE,
  zoomAssertions,
} from "./scenarioAssertions";

export const SCENARIO_DEFINITIONS_2: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
    id: "edit-list-narrow",
    fixture: "11-list-editing",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "list",
    description:
      "Clicking one item opens the complete list, including a wrapped continuation line, in the editor.",
  },
  {
    id: "edit-table-wide-end-dark",
    fixture: "04-code-and-tables",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "table", offset: 72 },
    editMode: true,
    editTarget: "table-cell-wide",
    description:
      "Edit mode on a sixteen-column table wider than the preview. After pressing End in the far-right cell editor (the `end` step) the caret is at the end of the cell text and the table has not shifted horizontally. Done and Cancel sit inside the cell without widening the column and the toolbar status is centred with its buttons.",
  },
  {
    id: "edit-table-cell-dark",
    screenshotOf: "edit-table-wrapped-dark-900",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    scroll: {
      kind: "selector",
      value: "main table:not(.okf-properties) tbody td:nth-child(3)",
      offset: 72,
    },
    editMode: true,
    editTarget: "table-cell",
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description:
      "The selected table cell is edited in place with a row and column action bar above the table. "
      + "The cell editor uses the block editor font, shows Done and Cancel under the field inside "
      + "the cell (no status hint), and the toolbar status is vertically centred with its buttons. "
      + "ArrowDown moves the editor to the cell below.",
  },
  ...["light", "dark"].flatMap((theme) => [WIDE, NARROW].map((viewport) => ({
    id: `edit-table-wrapped-${theme}-${viewport.width}`,
    fixture: "08-okf-schema",
    theme,
    ...viewport,
    scroll: { kind: "selector" as const, value: "main table:not(.okf-properties) tbody td:nth-child(3)", offset: 72 },
    editMode: true,
    editTarget: "table-cell" as const,
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description: "Long table-cell source wraps inside the cell in the block editor font, with Done and "
      + "Cancel under the field inside the cell and unchanged column widths; ArrowDown moves the editor to "
      + "the cell below"
      + (theme === "light" && viewport.width === 900
        ? " (steps `open`, `cell-bar`, `cell-emoji` and `arrowdown` keep the editor, the cell bar, its emoji picker and the moved editor)."
        : (viewport.width === 900 || theme === "light" ? " (the `open` step keeps the opened editor)." : ".")),
  }))),
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-024
    id: "edit-frontmatter-key-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    height: 1200,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "frontmatter-key",
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description:
      "The expanded key suggestions show an unused property from the matching JSON Schema.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-003
    // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
    // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-028
    id: "edit-frontmatter-value-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    height: 1200,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "frontmatter-value",
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description:
      "The final frame shows only the active status enum control, with the Add-field picker closed. Add and draft-save messages are checked; a simulated mock-host rejection re-enables Escape cancellation before reopening the original active value. No real persistence is claimed.",
  },
  {
    id: "edit-frontmatter-list-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    height: 1200,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "frontmatter-list",
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description:
      "List reorder, addition and removal are exercised; the final set-as-null save is pending with the editor disabled. The mock host does not persist or rerender values.",
  },
  {
    id: "edit-frontmatter-list-light",
    fixture: "08-okf-schema",
    theme: "light",
    ...WIDE,
    height: 1200,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "frontmatter-list",
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description:
      "Light-theme list reorder/add/remove checks end with a pending set-as-null save and disabled editor; the mock host does not persist or rerender values.",
  },
  {
    id: "edit-frontmatter-boolean-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    previewThemeMode: "white",
    ...WIDE,
    height: 1200,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "frontmatter-boolean",
    machineChecks: ["overlay-covers-text", "overlay-clipped"],
    description:
      "The checkbox starts checked, is clicked once, and is captured unchecked after posting a false save to the mock host.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-228
    id: "preview-edit-activation-scroll-wide",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "fraction", value: 0.5 },
    editActivationScroll: true,
    mathRenderingChecks: true,
    description:
      "A centered paragraph keeps its scroll position when its editor loads asynchronously, "
      + "without transient jumps or delayed anchor corrections.",
  },
  {
    id: "preview-edit-activation-scroll-narrow",
    fixture: "05-long-chapter",
    theme: "light",
    ...NARROW,
    scroll: { kind: "fraction", value: 0.5 },
    editActivationScroll: true,
    mathRenderingChecks: true,
    description:
      "Opening a centered paragraph editor in a narrow preview preserves scroll throughout "
      + "source loading and layout stabilization.",
  },
  {
    id: "math-edit-offline-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: ".math-display" },
    mathRenderingChecks: true,
    editActivationScroll: true,
    editActivationSelector: ".math-display[data-sphinx-source-line]",
    description:
      "KaTeX rendering is checked before interaction. The final frame shows the original $$ Markdown "
      + "in the focused equation editor, not the pre-edit typeset equation.",
  },
  {
    id: "math-edit-offline-light-narrow",
    fixture: "05-long-chapter",
    theme: "light",
    ...NARROW,
    scroll: { kind: "selector", value: ".math-display" },
    mathRenderingChecks: true,
    editActivationScroll: true,
    editActivationSelector: ".math-display[data-sphinx-source-line]",
    description:
      "Offline KaTeX fonts are checked before interaction. The final narrow frame shows "
      + "the original $$ Markdown editor after activation without a scroll jump.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-TOOLBAR-004
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-022
    id: "preview-sticky-headings-1",
    fixture: "05-long-chapter",
    theme: "dark",
    stickyHeadingDepth: 1,
    ...WIDE,
    scroll: { kind: "stickyHeading", value: 'h1[data-line="1"]' },
    expectedStickyHeadings: "# Operating the fleet",
    description:
      "Depth one keeps only the current Markdown heading visible at the top of the preview.",
  },
  {
    id: "preview-sticky-headings-2",
    fixture: "05-long-chapter",
    theme: "dark",
    stickyHeadingDepth: 2,
    ...WIDE,
    scroll: { kind: "stickyHeading", value: 'h2[data-line="110"]' },
    expectedStickyHeadings: "# Operating the fleet\n## Incident patterns",
    description:
      "Depth two keeps the current heading and its parent visible at the top of the preview.",
  },
  {
    id: "preview-sticky-headings-3",
    fixture: "05-long-chapter",
    theme: "dark",
    stickyHeadingDepth: 3,
    scrollOscillationStress: true,
    ...WIDE,
    scroll: { kind: "stickyHeading", value: 'h3[data-line="136"]' },
    expectedStickyHeadings: "# Operating the fleet\n## Incident patterns\n### Graph drift",
    description:
      "Depth three keeps the current heading and two parent levels visible in the preview.",
  },
  {
    id: "preview-sticky-headings-3-light-narrow",
    fixture: "05-long-chapter",
    theme: "light",
    stickyHeadingDepth: 3,
    ...NARROW,
    scroll: { kind: "stickyHeading", value: 'h3[data-line="136"]' },
    expectedStickyHeadings: "# Operating the fleet\n## Incident patterns\n### Graph drift",
    description:
      "Depth three remains legible in a narrow preview at the normal text size.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-025
    id: "preview-sticky-headings-natural-growth",
    fixture: "10-sticky-heading-wrap",
    theme: "dark",
    stickyHeadingDepth: 3,
    expectStickyGrowth: true,
    ...NARROW,
    scroll: { kind: "stickyHeading", value: 'h3[data-line="21"]' },
    expectedStickyHeadings: "# Operating a cross-functional vehicle software verification programme across several engineering domains\n"
      + "## Maintaining evidence traceability while upstream and downstream requirements evolve continuously\n"
      + "### Checking the complete dependency graph after each asynchronous validation and review",
    description:
      "Long, wrapped heading ancestry grows the sticky band to its rendered content height.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-010
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-006
    id: "okf-schema-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "OKF schema table on the dark theme itself (preview mode auto): lean "
      + "transparent cells with grid separators, description text smaller than name/value, and "
      + "title badge with readable contrast.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
    id: "okf-schema-missing-required-dark",
    fixture: "09-okf-schema-missing-required",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "An OKF schema table with missing required fields. The descriptions remain plain prose, "
      + "and a red summary below the table names every missing field.",
  },
  {
    id: "okf-schema-missing-required-light",
    fixture: "09-okf-schema-missing-required",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "The same incomplete OKF schema in a light theme, showing the red missing-required "
      + "summary below the last property row.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-006
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023
    id: "schema-validation-error-dark",
    fixture: "10-schema-validation-error",
    theme: "dark",
    ...WIDE,
    height: 500,
    scroll: { kind: "top" },
    description:
      "An unsupported schema keyword produces a red diagnostic across all three table columns.",
  },
  {
    id: "schema-validation-error-light",
    fixture: "10-schema-validation-error",
    theme: "light",
    ...WIDE,
    height: 500,
    scroll: { kind: "top" },
    description:
      "The schema-compilation failure uses the same full-width red treatment in a light theme.",
  },
  {
    id: "schema-validation-error-narrow",
    fixture: "10-schema-validation-error",
    theme: "light",
    ...NARROW,
    height: 650,
    scroll: { kind: "top" },
    description:
      "The full-width schema diagnostic wraps on a narrow viewport without overflowing its cell.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-005
    id: "frontmatter-scroll-feedback",
    fixture: "08-okf-schema",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    scrollFeedbackStress: true,
    description:
      "Three scroll cycles reach both ends; the final frame returns to the top of the tall frontmatter table.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-001
    id: "frontmatter-scroll-feedback-edit",
    fixture: "08-okf-schema",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    scrollFeedbackStress: true,
    description:
      "Edit mode remains on after three scroll cycles; the field editor is closed and the final frame is at the top.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-001
    id: "frontmatter-dark",
    fixture: "07-frontmatter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Plain two-column frontmatter table on the dark theme: lean, no "
      + "outer frame or cell backgrounds, grid separators retained and values readable on the editor background.",
  },
  {
    id: "frontmatter-light",
    fixture: "07-frontmatter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Plain two-column frontmatter table on the light theme: transparent "
      + "cells keep body-text contrast against the white page.",
  },
  {
    id: "standalone-frontmatter-dark",
    fixture: "SKILL",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Standalone SKILL.md metadata on a dark theme. Generic fields stay in two columns, "
      + "and nested object values appear as YAML code rather than JSON.",
  },
  {
    id: "standalone-frontmatter-light",
    fixture: "SKILL",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "The same standalone SKILL.md metadata on a light theme, with the nested YAML "
      + "code block and generic two-column table remaining legible.",
  },
  {
    id: "bare-urls-light-wide",
    fixture: "21-bare-urls",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    bareUrlChecks: true,
    description: "Bare URLs typed without Markdown link syntax in a paragraph, a list item and a table cell "
      + "are rendered as ordinary underlined links (trailing punctuation left outside the link); the URL "
      + "inside inline code stays plain code text.",
  },
  ...(["dark", "light", "white", "cream"] as const).map((mode) => ({
    id: `inline-code-${mode}`,
    fixture: "22-inline-code",
    theme: mode === "light" ? "light" : "dark",
    ...(mode === "white" || mode === "cream" ? { previewThemeMode: mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    inlineCodeChecks: true,
    description: "Inline code in a heading, paragraphs, a wrapped long identifier, links, a list, an "
      + "admonition and a table. Each span is a subtle tinted pill with a hairline border and rounded "
      + "corners, slightly smaller than the text, never a heavy black box; paragraph lines with code are "
      + "as tall as lines without; code inside links keeps the link colour and underline.",
  })),
  {
    id: "orphan-box-document-end",
    fixture: "22-inline-code",
    theme: "dark",
    width: 900,
    height: 400,
    // The box sits in the padding below the last block; scroll on until it is fully in the frame.
    scroll: { kind: "bottom", extra: 120 },
    orphanBoxChecks: true,
    description: "End of the document with the Orphaned comments box added after the content. A box "
      + "shorter than the bottom padding leaves the scrollable height unchanged and sits right under "
      + "the last block; a taller one extends the page by the excess; removing it restores the height.",
  },
  {
    id: "inline-code-narrow",
    fixture: "22-inline-code",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    fullPage: true,
    inlineCodeChecks: true,
    inlineCodeNarrowChecks: true,
    description: "Inline code at 460px. Identifiers in the squeezed table cells are not split mid-word "
      + "(the table scrolls or widens instead), while the long REGIONAL_ARBITER identifier in the "
      + "paragraph wraps without causing horizontal page overflow.",
  },
  ...FIRST_GAP_SCENARIOS,
  ...([
    ["light", undefined],
    ["dark", undefined],
    ["light", "cream" as const],
  ] as const).flatMap(([theme, mode]) => [WIDE, XLARGE].map((viewport) => ({
    id: `width-modes-${mode ?? theme}-${viewport.width}`,
    fixture: "29-width-modes",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...viewport,
    scroll: { kind: "top" as const },
    widthModeChecks: true,
    description: "The Width button cycles Margin, Auto and Full width. Margin keeps every block in the "
      + "column; Auto lets the wide table and the wide image break out, centred on the pane, while the "
      + "small table keeps the column; Full width removes the column limit. No horizontal page scroll.",
  }))),
  ...([
    ["light", WIDE], ["light", XLARGE], ["light", NARROW], ["dark", WIDE],
  ] as const).flatMap(([theme, viewport]) => (["margin", "auto", "full"] as const).map((mode) => ({
    id: `width-mode-break-${mode}-${theme === "dark" ? "dark-" : ""}${viewport.width}`,
    fixture: "34-width-mode-break",
    theme,
    ...viewport,
    scroll: { kind: "top" as const },
    widthModeBreak: mode,
    description: `Width mode ${mode}, ${theme}, ${viewport.width} px pane: the same document with a table, `
      + "a code block and a figure wider than the column. Margin keeps them in the column; Auto lets them "
      + "break out to 16 px from the pane edge; Full width gives the text the same 16 px side margins.",
  }))),
  {
    id: "readme-margin-break-cream",
    fixture: "32-readme-margin-break",
    theme: "light",
    previewThemeMode: "cream",
    width: 1200,
    height: 1000,
    scroll: { kind: "top" as const },
    widthModeShot: "auto" as const,
    description: "README capture, cream theme, Auto width: the reading column stays narrow while the wide "
      + "table and the wide figure break out of it, centred on the pane.",
  },
  // CR 090: README showcase captures of one polished demo document, Cream theme.
  {
    // @tests_req StRS-MDOKFSTUDIO-CORE-001
    id: "rendering-core/v25-readme-showcase-hero-cream-1200",
    fixture: "54-readme-showcase",
    theme: "light",
    previewThemeMode: "cream",
    width: 1200,
    height: 1000,
    scroll: { kind: "selector" as const, value: "main h1", offset: -100 },
    description: "README hero capture, cream theme, 1200 px: the properties table, the title, the card grid, the nested admonition and the figure of the demo handbook.",
  },
  ...RELEASE_SHOWCASE_SCENARIOS,
  {
    // @tests_req StRS-MDOKFSTUDIO-MYST-001
    id: "myst/v34-readme-showcase-edit-cream-1000",
    fixture: "54-readme-showcase",
    theme: "light",
    previewThemeMode: "cream",
    width: 1000,
    height: 900,
    scroll: { kind: "selector" as const, value: "main .myst-grid", offset: 24 },
    editMode: true,
    toolbarState: "collapsed" as const,
    pageActions: [{ click: "main .admonition-title" }],
    description: "README capture, cream theme, edit mode: the card grid and the figure of the demo handbook stay rendered while the clicked admonition is open in its Markdown editor.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-001
    id: "frontmatter-schema/v23-readme-showcase-schema-cream-1000",
    fixture: "54-readme-showcase",
    theme: "light",
    previewThemeMode: "cream",
    width: 1000,
    height: 760,
    scroll: { kind: "top" as const },
    description: "README capture, cream theme: the OKF properties table of the demo handbook, resolved from its handbook schema, with type icons and field descriptions.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-REVIEW-207
    id: "review-annotations/v21-readme-showcase-diff-cream-1000",
    fixture: "54-readme-showcase",
    theme: "light",
    previewThemeMode: "cream",
    toolbarState: "collapsed" as const,
    width: 1000,
    height: 900,
    scroll: { kind: "selector" as const, value: "main .myst-grid", offset: 24 },
    render: { hostMessages: [README_SHOWCASE_CHANGES_MESSAGE] },
    description: "README capture, cream theme: the blocks changed since the last commit (intro paragraph, one card, the admonition and the figure) carry the green bar at the left margin.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-001
    id: "diagrams/v17-readme-showcase-diagrams-cream-1000",
    fixture: "54-readme-showcase",
    theme: "light",
    previewThemeMode: "cream",
    toolbarState: "collapsed" as const,
    width: 1000,
    height: 1000,
    scroll: { kind: "selector" as const, value: ".myst-mermaid-diagram", offset: 60 },
    plantumlExpectation: "builtin" as const,
    description: "README capture, cream theme: a Mermaid flowchart and a PlantUML sequence diagram, both rendered inline without Java, under the Escalation paths heading.",
  },
  ...([
    ["light", WIDE],
    ["dark", XLARGE],
    ["light", NARROW],
    ["dark", NARROW],
  ] as const).flatMap(([theme, viewport]) => (viewport.width >= 760
    ? (["margin", "auto", "full"] as const)
    : (["margin"] as const)).map((mode) => ({
    // @tests_req StRS-MDOKFSTUDIO-TOOLBAR-006
    id: `toc-column-${theme}-${viewport.width}${mode === "margin" ? "" : `-${mode}`}`,
    fixture: "30-toc",
    theme,
    ...viewport,
    scroll: { kind: "top" as const },
    tocChecks: true,
    tocShot: mode,
    description: "The TOC button opens a column of h1-h4 headings right of the content and below the "
      + "toolbar. It never overlaps the content, the table or the floating toolbar, Auto and Full "
      + "width respect it, zoom 200 % keeps it usable, a click scrolls to the heading, and a pane "
      + "under 760 px hides it (the button then only records the preference). The final frame is "
      + `taken with the column open in ${mode === "margin" ? "Margin" : mode === "auto" ? "Auto" : "Full width"} mode`
      + " (narrow panes: column hidden by design).",
  }))),
  ...([
    ["light", undefined],
    ["dark", undefined],
    ["dark", "cream"],
  ] as const).map(([theme, mode]) => ({
    id: `comment-chips-${theme}-${mode ?? "theme"}`,
    fixture: "31-comments",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    commentChipChecks: true,
    description: "Gray comment chips and a green TODO chip. A click opens the comment as a box with "
      + "an accent bar and a Comment or TODO title, a second click closes it, opening a chip above "
      + "the reading line does not move the text being read, and turning preview.showComments off "
      + "hides the gray chips (not the TODO chips) without a new render. The final frame has both "
      + "boxes open.",
  })),
  ...([
    ["light", "visible", 7],
    ["dark", "visible", 8],
    ["light", "hidden", 9],
    ["dark", "hidden", 10],
  ] as const).map(([theme, state, number]) => ({
    // @tests_req StRS-MDOKFSTUDIO-REVIEW-012
    id: `review-annotations/v${String(number).padStart(2, "0")}-comment-list-chips-${state}-${theme}-900`,
    fixture: "46-comment-list",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    commentToggleChecks: state,
    contentAssertions: COMMENT_LIST_ASSERTIONS,
    description: "A list of requirements with HTML comments before and after it, two of them one after the other: "
      + "each comment is a chip labelled comment (a green TODO chip for the TODO comment), never a `<!--` label. "
      + "The toolbar Comments button, in preview and in edit mode, hides the gray chips and brings them back "
      + `(TODO stays). The final frame has the gray chips ${state}.`,
  })),
  ...([
    ["light", undefined, "11"],
    ["dark", undefined, "12"],
    ["dark", "cream", "13"],
  ] as const).map(([theme, mode, number]) => ({
    id: `review-annotations/v${number}-inline-thread-${mode ?? theme}-900`,
    fixture: "46-inline-thread",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    inlineThreadChecks: true,
    description: "An inline comment thread next to a gray comment chip and a TODO chip. The thread is a "
      + "green chip led by a speech bubble and the first author. A click opens a green box titled Thread "
      + "with one entry per message (author, date, text), a reply box and a Delete thread button; a second "
      + "click closes it. Reply and Delete send the host the source lines of the thread; an empty reply is "
      + "not sent. Turning preview.showComments off hides the thread with the gray chips. The final frame "
      + "has the thread open with a reply being typed.",
  })),
  ...(["light", "dark"] as const).map((theme) => ({
    id: `review-annotations/v0${theme === "light" ? 5 : 6}-change-bar-${theme}-900`,
    fixture: "44-change-bar",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    changeBarChecks: true,
    description: "Blocks changed since the last commit (heading, paragraph, bullet, nested bullet, "
      + "number, quotation, table, code block, admonition, image) are sent as incoming changes. "
      + "Every green bar is drawn in one column at the left margin of the page, whatever the "
      + "indentation of its block, with square ends and the full height of the block; no block "
      + "and no text edge moves, no ancestor clips a bar and none touches an anchor icon. The Diff "
      + "toggle hides the bars.",
  })),
  ...([
    ["light", undefined],
    ["dark", undefined],
    ["dark", "cream"],
  ] as const).map(([theme, mode]) => ({
    // @tests_req StRS-MDOKFSTUDIO-MYST-001
    // @tests_req StRS-MDOKFSTUDIO-MYST-009
    // @tests_req SwRS-MDOKFSTUDIO-MYST-036
    id: `figure-anchors-${theme}-${mode ?? "theme"}`,
    fixture: "33-figures-anchors",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    figureAnchorChecks: true,
    description: "Book-style figures: one at 50 % of the column and centred, one at 40 % floating right "
      + "with text wrapping beside it. Labels show a faint anchor icon hanging in the left margin of "
      + "the labelled paragraph, heading, list or code block (tooltip 'Anchor: name'); a reference "
      + "to a label scrolls to it.",
  })),
  ...["white", "dark"].flatMap((mode) => [WIDE, NARROW].map((viewport) => ({
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
    id: `frontmatter-link-details-${mode}-${viewport.width}`,
    fixture: "14-frontmatter-links",
    theme: "dark",
    ...(mode === "white" ? { previewThemeMode: "white" as const } : {}),
    ...viewport,
    scroll: { kind: "top" as const },
    frontmatterLinkState: "loaded" as const,
    linkDetailsChecks: true,
    description: "Resolved links show fresh target metadata and a clipped long excerpt. Beta intentionally lacks the optional description. The excerpt ellipsis, Alpha's line 9 label and the visible Refresh tooltip are asserted without page overflow; native link title metadata is DOM-asserted, not visible in a screenshot.",
  }))),
  // P9 B4: content and error states (gap fill). Ids are final; see scenarioIds.ts for their locks.
  ...([WIDE, NARROW] as const).map((viewport) => ({
    // @tests_req StRS-MDOKFSTUDIO-CORE-001
    id: `rendering-core/v${viewport === WIDE ? "17" : "18"}-cjk-rtl-light-${viewport.width}`,
    fixture: "35-cjk-rtl",
    theme: "light",
    ...viewport,
    scroll: { kind: "top" as const },
    contentAssertions: CJK_RTL_ASSERTIONS,
    description: `CJK paragraphs, Hebrew and Arabic right-to-left paragraphs and two unbroken strings, ${viewport.width} px pane: `
      + "the text wraps inside the column, the right-to-left paragraphs stay right-aligned and nothing scrolls horizontally.",
  })),
  ...([WIDE, NARROW] as const).map((viewport) => ({
    id: `rendering-core/v${viewport === WIDE ? "21" : "22"}-long-words-light-${viewport.width}`,
    fixture: "45-long-words",
    theme: "light",
    ...viewport,
    scroll: { kind: "top" as const },
    contentAssertions: LONG_WORDS_ASSERTIONS,
    description: `Long unbroken words and bare URLs in paragraphs, a list and a quote, ${viewport.width} px pane: they wrap inside their block and the page never scrolls horizontally.`,
  })),
  ...([
    { n: "14", theme: "light" },
    { n: "15", theme: "dark" },
    { n: "16", theme: "cream" },
  ] as const).map(({ n, theme }) => ({
    // @tests_req StRS-MDOKFSTUDIO-CODE-001
    id: `code-blocks/v${n}-code-block-caption-${theme}-900`,
    fixture: "46-code-block-caption",
    theme: theme === "cream" ? "dark" : theme,
    ...(theme === "cream" ? { previewThemeMode: "cream" as const } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: CODE_BLOCK_CAPTION_ASSERTIONS,
    description: `A MyST code-block with a caption, line numbers and an emphasized line next to a plain fence, ${theme} theme: `
      + "the code is left-aligned like the plain fence and the caption is a left-aligned monospace title bar joined to the top of the block.",
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-CORE-008
    id: "rendering-core/v19-missing-image-dark-900",
    fixture: "36-missing-image",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: MISSING_IMAGE_ASSERTIONS,
    description: "Two images whose files do not exist: the page keeps its layout, the text before and after stays in order "
      + "and the broken pictures do not push the content outside the column.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CORE-001
    id: "rendering-core/v20-huge-document-bottom-dark-900",
    fixture: "gen-huge-document",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "bottom" as const },
    contentAssertions: HUGE_DOCUMENT_ASSERTIONS,
    description: "A generated document of about 6000 lines (335 sections with a list, a code block and a table each), scrolled to the end: "
      + "the last paragraph is reachable inside the frame with its bottom padding.",
  },
  ...([["dark", 900], ["light", 900], ["light", 460]] as const).map(([theme, width], index) => ({
    // @tests_req StRS-MDOKFSTUDIO-GFM-002
    id: `gfm/v0${index + 2}-gfm-gallery-full-${theme}-${width}`,
    fixture: "37-gfm-gallery",
    theme,
    ...(width === 900 ? WIDE : NARROW),
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: GFM_GALLERY_ASSERTIONS,
    description: `Every GFM construct on one page (five alerts, strikethrough, footnotes, task list, aligned table, raw HTML table and details, colour span, autolink), ${theme}, ${width} px pane.`,
  })),
  ...(["dark", "light"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-MYST-006
    // @tests_req SwRS-MDOKFSTUDIO-MYST-001
    id: `myst/v${20 + index}-myst-gallery-full-${theme}-900`,
    fixture: "38-myst-gallery",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: MYST_GALLERY_ASSERTIONS,
    description: `Every MyST construct on one page (label and references, dropdown, definition list, sub and sup, kbd and abbr roles, footnote, math, glossary), ${theme}, 900 px pane.`,
  })),
  ...([["light", 900, 2], ["dark", 900, 2], ["light", 460, 1]] as const).map(([theme, width, columns], index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-MYST-053
    id: `myst/v${22 + index}-grid-cards-full-${theme}-${width}`,
    fixture: "46-grid-cards",
    theme,
    ...(width === 900 ? WIDE : NARROW),
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: GRID_ASSERTIONS(columns),
    description: `A {grid} of items and cards with header, body, footer, link and a nested grid, ${theme}, ${width} px pane (${columns} column${columns === 1 ? "" : "s"}).`,
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req StRS-MDOKFSTUDIO-MYST-012
    id: `myst/v${25 + index}-toctree-caption-full-${theme}-900`,
    fixture: "47-toctree",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: TOCTREE_ASSERTIONS,
    description: `Three {toctree} lists: with caption and a missing target, a glob and a hidden one, ${theme}, 900 px pane.`,
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-MYST-063
    id: `myst/v${27 + index}-list-table-full-${theme}-900`,
    fixture: "46-list-table",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: LIST_TABLE_ASSERTIONS,
    description: `A pipe table and two {list-table} directives (a titled one with :widths: and a centred table, one with two header rows), ${theme}, 900 px pane: the list-tables use the pipe table's cell, header and border styles.`,
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req StRS-MDOKFSTUDIO-DIAG-001
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-015
    id: `diagrams/v0${8 + index}-mermaid-syntax-error-${theme}-900`,
    fixture: "40-mermaid-error",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    mermaidExpectation: "error" as const,
    mermaidErrorThemeSwitch: true as const,
    contentAssertions: MERMAID_ERROR_ASSERTIONS,
    description: `An invalid Mermaid diagram in the ${theme} theme: the error message replaces the picture, the source stays available and the text after it continues.`,
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req StRS-MDOKFSTUDIO-DIAG-006
    // @tests_req StRS-MDOKFSTUDIO-DIAG-007
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-024
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-023
    id: `diagrams/v${10 + index}-plantuml-builtin-${theme}-900`,
    fixture: "48-plantuml-builtin",
    theme,
    plantumlExpectation: "builtin" as const,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: plantUmlBuiltinAssertions(theme === "dark"),
    description: `A sequence and a class diagram in the ${theme} preview, drawn by the PlantUML engine bundled in the extension `
      + "(no Java, no plantuml command, no network): two pictures in the theme colours and the sources below them.",
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-032
    id: "diagrams/v12-plantuml-builtin-unsupported-light-900",
    fixture: "49-plantuml-unsupported",
    theme: "light",
    plantumlExpectation: "builtin-unsupported" as const,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: PLANTUML_UNSUPPORTED_ASSERTIONS,
    description: "A diagram with a standard-library !include in the built-in engine: instead of a broken picture, one message "
      + "names the directive and its line and says to tick markdownOkfSchemaStudio.plantuml.useJar; the host is never asked "
      + "for a file and the source stays available.",
  },
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-068
    id: `diagrams/v${13 + index}-plantuml-file-${theme}-900`,
    fixture: "50-plantuml-file",
    theme,
    plantumlExpectation: "builtin" as const,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: plantUmlFileAssertions(theme === "dark"),
    description: `A {uml} directive and a body-less {plantuml} directive naming .puml files in the ${theme} preview: the host `
      + "reads the files like {include} and the built-in engine draws both, with the file text as the source below them.",
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req StRS-MDOKFSTUDIO-DIAG-009
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-039
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-046
    id: `diagrams/v${15 + index}-plantuml-include-${theme}-900`,
    fixture: "51-plantuml-include",
    theme,
    plantumlExpectation: "builtin" as const,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: plantUmlIncludeAssertions(theme === "dark"),
    description: `A diagram with a local !include whose file includes another one, in the ${theme} preview: the page asks `
      + "the host for both files (the nested one next to the including file) and the built-in engine draws the result.",
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-024
    id: "diagrams/v18-plantuml-theme-sprite-light-900",
    fixture: "63-plantuml-theme-sprite",
    theme: "light",
    plantumlExpectation: "builtin" as const,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: PLANTUML_THEME_SPRITE_ASSERTIONS,
    description: "A class diagram that selects a bundled !theme and uses an OpenIconic icon, in the light preview: the built-in "
      + "engine draws it with the Smetana layout, the theme colours and the icon, without a request.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-002
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-001
    id: "frontmatter-schema/v20-invalid-yaml-dark-900",
    fixture: "41-invalid-yaml",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: INVALID_YAML_ASSERTIONS,
    description: "Frontmatter with broken YAML: the preview reports the parse problem and still renders the Markdown body.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084
    id: "frontmatter-schema/v21-unknown-field-strict-light-900",
    fixture: "42-strict-unknown-field",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { strictAdditionalProperties: true as const },
    contentAssertions: STRICT_FIELD_ASSERTIONS,
    description: "A schema-typed document with a field the schema does not declare, with the strict setting on: the field gets a warning and the badge counts it.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-004
    id: "frontmatter-schema/v22-properties-hidden-light-900",
    fixture: "43-properties-hidden",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { propertiesTable: false as const },
    contentAssertions: PROPERTIES_HIDDEN_ASSERTIONS,
    description: "Frontmatter with the properties table setting off: no table is shown and the raw YAML block is not shown either.",
  },
  // P9 B5 (a): theme, zoom, trust, layout, toolbar, block and palette states of the extension.
  {
    // @tests_req StRS-MDOKFSTUDIO-THEME-002
    // @tests_req SwRS-MDOKFSTUDIO-THEME-025
    id: "theme-zoom/v08-forced-dark-handbook-light-900",
    fixture: "01-handbook-overview",
    theme: "light",
    previewThemeMode: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: FORCED_DARK_ASSERTIONS,
    description: "The handbook forced to the dark preview theme while the VS Code host stays light: the toolbar button shows the dark icon, "
      + "the page, text, note panels and headings all use the dark palette.",
  },
  ...([[70, WIDE, "900"], [200, WIDE, "900"], [150, NARROW, "460"]] as const).map(([zoom, viewport, width], index) => ({
    // @tests_req StRS-MDOKFSTUDIO-THEME-011
    // @tests_req SwRS-MDOKFSTUDIO-THEME-043
    id: `theme-zoom/v${String(9 + index).padStart(2, "0")}-zoom-${zoom}-light-${width}`,
    fixture: "01-handbook-overview",
    theme: "light",
    ...viewport,
    scroll: { kind: "top" as const },
    render: { zoom },
    contentAssertions: zoomAssertions(zoom),
    description: `The handbook at ${zoom} % zoom in a ${width} px pane: the text size and the content column scale together `
      + "and the page does not scroll sideways.",
  })),
  // CR 047: a workspace that stored no choice opens with the built-in defaults, on a light and on a
  // dark host (the cream page hides the host theme, so the dark one uses a narrow pane to differ).
  ...([["light", 12, WIDE, "900"], ["dark", 13, NARROW, "460"]] as const).map(([theme, number, viewport, width]) => ({
    // @tests_req StRS-MDOKFSTUDIO-THEME-004
    id: `theme-zoom/v${number}-fresh-workspace-${theme}-${width}`,
    fixture: "01-handbook-overview",
    theme,
    previewThemeMode: "cream" as const,
    toolbarState: "collapsed" as const,
    ...viewport,
    scroll: { kind: "top" as const },
    render: { freshWorkspace: true as const },
    contentAssertions: FRESH_WORKSPACE_ASSERTIONS,
    description: `The handbook in a fresh workspace (no stored theme, toolbar state or palette mode) on a ${theme} host, ${width} px pane: `
      + "the preview opens in the cream theme and the floating toolbar shows only its first row, without any click.",
  })),
  ...([["dark", WIDE, "900", 1], ["light", NARROW, "460", 2]] as const).map(([theme, viewport, width, number]) => ({
    // @tests_req SwRS-MDOKFSTUDIO-TRUST-001
    id: `trust-security/v0${number}-read-only-page-${theme}-${width}`,
    fixture: "08-okf-schema",
    theme,
    ...viewport,
    scroll: { kind: "top" as const },
    render: { readOnly: true as const },
    contentAssertions: READ_ONLY_ASSERTIONS,
    description: `A read-only preview (restricted workspace or file outside the workspace), ${theme} theme, ${width} px pane: `
      + "the toolbar has no Edit (pencil) button and the frontmatter table offers no editable cell.",
  })),
  {
    id: "trust-security/v03-read-only-no-hover-outline-light-900",
    fixture: "08-okf-schema",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { readOnly: true as const },
    pageActions: [{ hover: "main > p" }, { click: "main > p" }],
    contentAssertions: READ_ONLY_NO_HOVER_ASSERTIONS,
    description: "A read-only preview with the pointer resting on a paragraph and a click on it: no dashed edit outline, no editor, no Edit button.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-054
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-117
    id: "toolbar-navigation/v30-back-enabled-after-anchor-light-900",
    fixture: "01-handbook-overview",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector" as const, value: 'h2[data-line="146"]' },
    render: {
      hostMessages: [
        { data: { type: "navigateAnchor", value: "#deployment", line: 146 } },
        { delayMs: 50, data: { type: "previewHistoryState", canBack: true, canForward: false } },
      ],
    },
    contentAssertions: [
      ...BACK_ENABLED_ASSERTIONS,
      { message: "the Deployment heading is at the top of the pane after the jump", selector: `${MAIN} h2[data-line="146"]`, count: 1,
        expr: "(() => { const top = document.querySelector('#sphinx-myst-preview-content h2[data-line=\"146\"]').getBoundingClientRect().top; return top >= 0 && top < 300; })()" },
    ],
    description: "After an in-page jump to the Deployment heading the host reports a history entry: Back is enabled, Next stays disabled "
      + "and the target heading sits at the top of the pane.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-TOOLBAR-013
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-128
    id: "toolbar-navigation/v31-mark-editor-selection-light-900",
    fixture: "01-handbook-overview",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: {
      markEditorSelection: true as const,
      hostMessages: [{ delayMs: 50, data: { type: "sourceScroll", line: 1, selectionLine: 12 } }],
    },
    contentAssertions: MARK_EDITOR_SELECTION_ASSERTIONS,
    description: "With the mark-editor-selection setting on, the text editor's selection on line 12 outlines the paragraph that holds it "
      + "(the dispatch path sentence) in the preview, and only that block.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-TOOLBAR-004
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-002
    id: "toolbar-navigation/v32-sticky-shadow-light-900",
    fixture: "05-long-chapter",
    theme: "light",
    stickyHeadingDepth: 3,
    ...WIDE,
    scroll: { kind: "stickyHeading", value: 'h3[data-line="125"]' },
    expectedStickyHeadings: "# Operating the fleet\n## Incident patterns\n### Split arbiter",
    contentAssertions: STICKY_SHADOW_ASSERTIONS,
    description: "In the light preview scrolled under three pinned headings, a soft shadow separates the sticky band from the text "
      + "that scrolls under it, the band keeps its place and the toolbar stays above it.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-TOOLBAR-004
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-002
    id: "toolbar-navigation/v33-sticky-shadow-dark-900",
    fixture: "05-long-chapter",
    theme: "dark",
    stickyHeadingDepth: 3,
    ...WIDE,
    scroll: { kind: "stickyHeading", value: 'h3[data-line="125"]' },
    expectedStickyHeadings: "# Operating the fleet\n## Incident patterns\n### Split arbiter",
    contentAssertions: STICKY_SHADOW_ASSERTIONS,
    description: "In the dark preview scrolled under three pinned headings, a soft shadow separates the sticky band from the text "
      + "that scrolls under it, the band keeps its place and the toolbar stays above it.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-TOOLBAR-004
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-002
    id: "toolbar-navigation/v34-sticky-shadow-cream-900",
    fixture: "05-long-chapter",
    theme: "dark",
    previewThemeMode: "cream",
    stickyHeadingDepth: 3,
    ...WIDE,
    scroll: { kind: "stickyHeading", value: 'h3[data-line="125"]' },
    expectedStickyHeadings: "# Operating the fleet\n## Incident patterns\n### Split arbiter",
    contentAssertions: STICKY_SHADOW_ASSERTIONS,
    description: "In the cream preview scrolled under three pinned headings, a soft shadow separates the sticky band from the text "
      + "that scrolls under it, the band keeps its place and the toolbar stays above it.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-BLOCK-016
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-140
    id: "block-editing/v17-block-selection-light-900",
    fixture: "01-handbook-overview",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    pageActions: [
      { click: "[data-sphinx-preview-edit-toggle]" },
      { click: "main > p:nth-of-type(1)", modifiers: ["Shift"] },
      { click: "main > .admonition", modifiers: ["Shift"] },
    ],
    contentAssertions: BLOCK_SELECTION_ASSERTIONS,
    description: "Edit mode on, Shift+click on the first paragraph and then on the note: both blocks are outlined as selected, "
      + "the selection is announced and no editor is open.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-PALETTE-015
    id: "palette-slash/v21-slash-gfm-light-360",
    fixture: "05-long-chapter",
    theme: "light",
    width: NARROW360.width,
    height: 1000,
    scroll: { kind: "top" as const },
    editMode: true,
    slashMenuShot: { mode: "gfm", finalQuery: "tab" },
    machineChecks: ["overlay-clipped"],
    description: "Slash command menu, palette mode gfm, light theme, 360 px pane: the menu opens at the caret, stays inside the pane, "
      + "is not covered by anything and flips above the caret near the bottom; the final frame shows it with /tab typed.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-LAYOUT-003
    // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-002
    id: "layout-width/v85-max-width-setting-light-2000",
    fixture: "05-long-chapter",
    theme: "light",
    width: 2000,
    height: 1100,
    expectedContentWidth: 1400,
    scroll: { kind: "top" as const },
    render: { maxContentWidth: 1400 },
    contentAssertions: MAX_WIDTH_ASSERTIONS,
    description: "The maximum content width set to 1400 px (not the 960 px default) in a 2000 px pane: the column is exactly 1400 px wide and centred.",
  },
  // P9 B5 (b): review annotations (incoming changes, review threads, orphans, comment chips).
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req StRS-MDOKFSTUDIO-REVIEW-017
    id: `review-annotations/v${14 + index}-incoming-bars-${theme}-900`,
    fixture: "44-change-bar",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { hostMessages: [INCOMING_RANGES_MESSAGE] },
    contentAssertions: INCOMING_BARS_ASSERTIONS,
    description: `Three line ranges reported by the host, each crossing several blocks (heading to bullets, table to code block, image), ${theme} theme: `
      + "one 3 px green bar per block they meet, all in one column at the left margin, square ends, the full height of their block and clear of the text.",
  })),
  {
    id: "review-annotations/v16-incoming-diff-off-light-900",
    fixture: "44-change-bar",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { incomingChanges: false as const, hostMessages: [INCOMING_CHANGES_MESSAGE] },
    contentAssertions: INCOMING_DIFF_OFF_ASSERTIONS,
    description: "The Diff toggle off from the start while the host still reports ten changed blocks: the bar layer is hidden and no bar shows.",
  },
  {
    id: "review-annotations/v17-review-thread-open-light-900",
    fixture: "45-review-threads",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { hostMessages: [THREADS_MESSAGE] },
    pageActions: [{ click: 'mark[data-okf-comment-thread="thread-open"]' }],
    contentAssertions: REVIEW_THREAD_OPEN_ASSERTIONS,
    description: "Two review threads on a short page, a click on the open one: its popover lists both comments in order, "
      + "shows no Resolved state and stays inside the pane.",
  },
  {
    id: "review-annotations/v18-review-thread-resolved-light-900",
    fixture: "45-review-threads",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { hostMessages: [THREADS_MESSAGE] },
    pageActions: [{ click: 'mark[data-okf-comment-thread="thread-resolved"]' }],
    contentAssertions: REVIEW_THREAD_RESOLVED_ASSERTIONS,
    description: "The same two review threads, a click on the resolved one: its popover says Resolved, and its quote in the text "
      + "is drawn differently from the open thread's.",
  },
  {
    id: "review-annotations/v19-orphaned-list-light-900",
    fixture: "45-review-threads",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { hostMessages: [ORPHAN_THREADS_MESSAGE] },
    contentAssertions: ORPHAN_LIST_ASSERTIONS,
    description: "One anchored thread and two threads whose text is gone (one of them resolved): the Orphaned comments box after the content "
      + "lists both with their quote, first comment and comment count.",
  },
  {
    id: "review-annotations/v20-comment-chips-hidden-light-900",
    fixture: "31-comments",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { hostMessages: [{ data: { type: "previewShowComments", showComments: false } }] },
    contentAssertions: CHIPS_HIDDEN_ASSERTIONS,
    description: "The show-comments setting off: the gray comment chips are in the document but not displayed, and the TODO chips stay visible.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
    id: "review-annotations/v22-comments-button-hides-thread-light-900",
    fixture: "46-inline-thread",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    commentButtonThreadChecks: true,
    description: "A page with a gray comment chip, a green thread chip and a TODO chip: the toolbar Comments button hides the gray "
      + "and the thread chips at once, the TODO chip stays, and a second press brings them back.",
  },
  ...(["light", "dark"] as const).map((theme, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-GFM-021
    id: `gfm/v0${5 + index}-checkbox-refusal-${theme}-900`,
    fixture: "37-gfm-gallery",
    theme,
    ...WIDE,
    scroll: { kind: "selector" as const, value: "#sphinx-myst-preview-content input.myst-checkbox", offset: 200 },
    checkboxRefusalChecks: true,
    description: `The host refuses a checkbox toggle: the box goes back to unchecked and the reason shows in a note next to it, ${theme}, 900 px pane.`,
  })),
  // CR 046: the update glow of a content patch that follows an outside change or an undo.
  ...([
    ["light", undefined, 1],
    ["dark", undefined, 2],
    ["dark", "cream", 3],
  ] as const).map(([theme, mode, number]) => ({
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-094
    id: `lifecycle-sync/v0${number}-update-glow-${mode ?? theme}-900`,
    fixture: "44-change-bar",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    updateGlowChecks: true as const,
    description: `A content patch after an outside change, ${mode ?? theme} ${mode ? "page" : "theme"}: the host's updated ranges `
      + "make exactly the updated paragraph and bullet glow with a translucent wash of the focus colour; the text stays "
      + "readable (4.5:1), nothing moves and nothing scrolls sideways. With reduced motion the same patch glows nowhere. "
      + "The `glow` step shows the glow at its start (paused through the Web Animations API); reduced motion then "
      + "comes back, so the final frame is the settled page.",
  })),
  // CR 050: the conf.py warning banner of a successful render.
  ...([
    ["light", undefined, 29],
    ["dark", undefined, 30],
    ["light", "cream", 31],
  ] as const).map(([theme, mode, number]) => ({
    // @tests_req StRS-MDOKFSTUDIO-MYST-007
    // @tests_req SwRS-MDOKFSTUDIO-MYST-081
    id: `myst/v${number}-conf-warning-banner-${mode ?? theme}-900`,
    fixture: "53-conf-warnings",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { mystExtensions: [] },
    contentAssertions: WARNING_BANNER_ASSERTIONS,
    description: `A page whose conf.py enables no MyST extension uses dollar math and a colon fence, ${mode ?? theme} ${mode ? "page" : "theme"}: `
      + "the render succeeds and a one-line banner above the first heading, left of the floating toolbar, says "
      + "\"2 MyST syntax warnings from conf.py\" with a warning icon, an Open Problems button and a close button. "
      + "It is readable, covers neither the toolbar nor the heading and moves no content.",
  })),
  {
    id: "myst/v32-conf-warning-banner-narrow-dark-460",
    fixture: "53-conf-warnings",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" as const },
    render: { mystExtensions: [] },
    contentAssertions: WARNING_BANNER_ASSERTIONS,
    description: "The conf.py warning banner in a 460 px dark pane: still one line left of the toolbar, above the first heading, "
      + "with its icon, text and both buttons.",
  },
  {
    id: "myst/v33-conf-warning-banner-closed-light-900",
    fixture: "53-conf-warnings",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { mystExtensions: [] },
    pageActions: [{ click: "[data-sphinx-preview-warning-close]" }],
    contentAssertions: WARNING_BANNER_CLOSED_ASSERTIONS,
    description: "The conf.py warning banner after a click on its close button: the banner is gone, nothing moved, "
      + "the page told the host which set of warnings was closed (so it stays closed for this document), "
      + "and the warnings stay in the status region.",
  },
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
    // @tests_req SwRS-MDOKFSTUDIO-GFM-034
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
    // @tests_req SwRS-MDOKFSTUDIO-MYST-024
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
