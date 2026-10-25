/**
 * The screenshot scenarios, first part, in campaign order (the second part is
 * `scenarioDefinitions2.ts`; the two files only keep each under the test file size limit).
 */

import { DEFAULT_PREVIEW_CONFIGURATION } from "../../src/core/configuration/previewConfiguration";
import {
  NARROW,
  type ScenarioDefinition,
  WIDE,
  XLARGE,
} from "./scenarioAssertions";

export const SCENARIO_DEFINITIONS_1: ScenarioDefinition[] = [
  {
    // @tests_req StRS-MDOKFSTUDIO-CORE-001
    id: "handbook-dark-top",
    fixture: "01-handbook-overview",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Top of a long mixed document on a dark theme. Checks the h1 rule, the first note "
      + "admonition, and that the paragraph following it returns to body colour.",
  },
  {
    id: "handbook-dark-third",
    fixture: "01-handbook-overview",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "pre" },
    description:
      "The first code landmark in the same document. Mid-scroll rendering of an ordered "
      + "list, a fenced Python block, and a titled warning admonition.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CORE-028
    id: "handbook-dark-bottom",
    fixture: "01-handbook-overview",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "bottom" },
    description:
      "Bottom of the document. The trailing padding must keep the last paragraph "
      + "reachable and visible rather than pinned against the viewport edge.",
  },
  {
    id: "handbook-light-top",
    fixture: "01-handbook-overview",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Same opening on a light theme. This is where a near-white admonition background "
      + "on a white page would be invisible.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-THEME-002
    // @tests_req SwRS-MDOKFSTUDIO-THEME-025
    id: "handbook-forced-white",
    fixture: "01-handbook-overview",
    theme: "dark",
    previewThemeMode: "white",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Forced white preview while the VS Code host remains dark. The page, text and note panel "
      + "must all use the light palette.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-THEME-001
    id: "handbook-forced-cream",
    fixture: "01-handbook-overview",
    theme: "dark",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Forced cream preview while the VS Code host remains dark. Warm light paper page, "
      + "warm near-black text, clay-coloured links and a note panel that stays distinct from "
      + "the page. Nothing may look dark, yellow or washed out.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-THEME-031
    id: "admonitions-forced-cream-full",
    fixture: "02-admonition-gallery",
    theme: "dark",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "Every admonition variant on the cream page. Each accent must stay distinguishable from "
      + "its neighbours and every title and body must stay readable on its tinted panel.",
  },
  {
    id: "code-tables-forced-cream",
    fixture: "04-code-and-tables",
    theme: "dark",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "Code blocks, inline code and tables on cream. Code sits on a slightly darker cream with "
      + "a warm border, syntax colours use the light palette and table borders and header bands "
      + "are warm grey rather than cold grey.",
  },
  {
    id: "frontmatter-forced-cream",
    fixture: "07-frontmatter",
    theme: "dark",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "The OKF properties table at the top of a cream page. Field names, values and the header "
      + "band are readable and inline code uses clay text on the darker cream code background; "
      + "the toolbar theme button shows a steaming coffee cup icon.",
  },
  {
    id: "edit-paragraph-forced-cream",
    fixture: "08-okf-schema",
    theme: "dark",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "paragraph",
    description:
      "An open paragraph editor in edit mode on the cream page: the editor frame, textarea, "
      + "caret, hint and Save/Cancel buttons all use the cream palette and stay readable.",
  },
  {
    id: "handbook-light-failures",
    fixture: "01-handbook-overview",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector", value: "aside.danger" },
    description:
      "The run of danger, caution, error, hint, seealso and attention blocks on a light "
      + "theme. Every accent must be distinguishable from its neighbours.",
  },
  {
    id: "handbook-narrow-top",
    fixture: "01-handbook-overview",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    description:
      "Narrow side-panel width, the width most users actually preview at. Checks gutters "
      + "and that admonition padding does not eat the usable column.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-LAYOUT-001
    // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-001
    // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-032
    id: "handbook-narrow-table",
    horizontalOverflow: true,
    fixture: "01-handbook-overview",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "selector", value: "table" },
    description:
      "The service level table at panel width, captured after internal scrolling to its "
      + "far-right Audit column. The page itself must not widen.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-MYST-001
    // @tests_req SwRS-MDOKFSTUDIO-MYST-001
    id: "admonitions-dark-full",
    fixture: "02-admonition-gallery",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "Full-page dark capture of every admonition variant. The reference for colour "
      + "bleed: each paragraph between blocks must match the baseline paragraph at the top.",
  },
  {
    id: "admonitions-light-full",
    fixture: "02-admonition-gallery",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "Full-page light capture of every admonition variant, including the accent used "
      + "for a generic admonition carrying an author-supplied class.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-MYST-006
    id: "admonitions-dark-titled",
    fixture: "02-admonition-gallery",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "h2" },
    description:
      "Titled admonitions close up. Exactly one title line per block; two means the "
      + "default heading is being printed above the author's title.",
  },
  {
    id: "admonitions-dark-nested",
    fixture: "02-admonition-gallery",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "bottom" },
    description:
      "An admonition containing a list, a code block, a table and a blockquote. Nested "
      + "elements keep their own spacing and the last child has no trailing margin.",
  },
  {
    id: "admonitions-narrow-full",
    fixture: "02-admonition-gallery",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    fullPage: true,
    description: "The same gallery at panel width, to catch wrapping inside tinted panels.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-CORE-003
    // @tests_req StRS-MDOKFSTUDIO-MYST-005
    // @tests_req SwRS-MDOKFSTUDIO-CORE-022
    id: "unresolved-dark-full",
    fixture: "03-unresolved-constructs",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "Citations, citation groups, build-only directives and both Mermaid syntaxes. "
      + "Citation groups stay inline and both diagrams render as SVG.",
  },
  {
    id: "unresolved-light-full",
    fixture: "03-unresolved-constructs",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "The same constructs on a light theme, including both rendered Mermaid diagrams.",
  },
  ...["dark", "light"].flatMap((theme) => [{
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
    id: `nested-list-typing-${theme}`,
    fixture: "16-nested-list-editing",
    theme,
    ...(theme === "dark" ? NARROW : WIDE),
    scroll: { kind: "top" as const },
    fullPage: true,
    listTypingChecks: true,
    description: "Edit the user's nested plugin list with six literal spaces, Enter, and a new list item. "
      + "Check exact text, caret, focus, and autosave without period substitution or blocked newlines.",
  }]),
  {
    id: "editor-keyboard-wrapped-narrow",
    fixture: "17-wrapped-editing",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    editorKeyboardChecks: true,
    description:
      "460 px preview with a long wrapping paragraph open in its editor. ArrowUp on the second wrapped "
      + "line moved the caret to the first line without leaving the editor; typing * twice on the selected "
      + "word Wrapped shows **Wrapped** in the textarea, and undo and redo restored the text.",
  },
  ...([["dark", 460], ["light", 900]] as const).map(([theme, width], index) => ({
    // @tests_req StRS-MDOKFSTUDIO-PALETTE-018
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-213
    id: `block-editing/v1${index + 5}-paste-rich-text-${theme}-${width}`,
    fixture: "17-wrapped-editing",
    theme,
    ...(width === 900 ? WIDE : NARROW),
    scroll: { kind: "top" as const },
    editMode: true,
    pasteRichTextChecks: true,
    description: `Rich text (HTML with a heading, bold, a link and a list) pasted into a paragraph editor in the ${theme} theme at ${width} px: `
      + "the editor shows the Markdown, one undo restores the text, and Cmd/Ctrl+Shift+V pastes the plain text.",
  })),
  ...["dark", "light"].flatMap((theme) => [
    {
      // @tests_req SwRS-MDOKFSTUDIO-MYST-013
      id: `context-tags-${theme}-wide`,
      fixture: "15-context-tags",
      theme,
      ...WIDE,
      scroll: { kind: "top" as const },
      fullPage: true,
      contextTagChecks: true,
      description: `Desktop ${theme} render of the exact adjacent YAML context form plus simple and snake_case tags. `
        + "Literal titles, Markdown body, mapped ranges, and YAML code must remain visible.",
    },
    {
      id: `context-tags-${theme}-narrow`,
      fixture: "15-context-tags",
      theme,
      ...NARROW,
      scroll: { kind: "top" as const },
      fullPage: true,
      contextTagChecks: true,
      description: `Narrow ${theme} side-panel render of the exact adjacent YAML form plus simple and snake_case tags. `
        + "The panels must wrap without widening the page or hiding the YAML code.",
    },
  ]),
  {
    // @tests_req StRS-MDOKFSTUDIO-DIAG-001
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-005
    id: "mermaid-map-dark",
    mermaidThemeSwitch: true,
    fixture: "06-mermaid-map",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description: "The OKF knowledge-base map in the dark preview.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-001
    id: "mermaid-map-light",
    fixture: "06-mermaid-map",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description: "The OKF knowledge-base map in the light preview.",
  },
  {
    id: "mermaid-map-fallback",
    fixture: "06-mermaid-map",
    theme: "fallback",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description: "The OKF knowledge-base map without host color variables.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-DIAG-007
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-105
    id: "plantuml-success-light",
    fixture: "12-plantuml-optional",
    theme: "light",
    plantumlExpectation: "success",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "A successful PlantUML render on a white preview background when plantuml is available on PATH.",
  },
  {
    id: "plantuml-success-dark",
    fixture: "12-plantuml-optional",
    theme: "dark",
    plantumlExpectation: "success",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "A successful PlantUML render on a dark preview background when plantuml is available on PATH.",
  },
  {
    id: "plantuml-unconfigured",
    fixture: "12-plantuml-optional",
    theme: "light",
    plantumlExpectation: "unconfigured",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description: "Intentionally unconfigured PlantUML shows the JAR-path guidance and expandable source, not a successful diagram.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-DIAG-089
    id: "plantuml-executable-not-found",
    fixture: "13-plantuml-executable-not-found",
    theme: "light",
    plantumlExpectation: "executable-not-found",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "A missing PlantUML executable shows an actionable settings message and preserves the source.",
  },
  ...(["light", "dark", "cream"] as const).map((mode) => ({
    // @tests_req StRS-MDOKFSTUDIO-CODE-004
    // @tests_req SwRS-MDOKFSTUDIO-CODE-017
    id: `code-copy-button-${mode}`,
    fixture: "04-code-and-tables",
    theme: mode === "light" ? "light" : "dark",
    ...(mode === "cream" ? { previewThemeMode: "cream" as const } : {}),
    ...WIDE,
    height: 900,
    scroll: { kind: "top" as const },
    codeCopyChecks: true,
    description:
      "Pointing at the first code block shows a 26 px copy button inside its top right corner, clear of "
      + "the floating toolbar; clicking it posts the raw code and turns the icon into a check mark.",
  })),
  {
    id: "code-dark-top",
    fixture: "04-code-and-tables",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description: "A long TypeScript block. Checks monospace selection, padding and radius.",
  },
  {
    id: "code-dark-table",
    horizontalOverflow: true,
    fixture: "04-code-and-tables",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "table" },
    description:
      "A sixteen-column table deliberately wider than the preview. The final frame is "
      + "scrolled to its FAR-RIGHT-ACCESS column without a horizontal page scrollbar.",
  },
  {
    id: "code-dark-table-narrow",
    fixture: "04-code-and-tables",
    theme: "dark",
    width: 640,
    height: 900,
    scroll: { kind: "top" },
    fullPage: true,
    machineChecks: ["identifier-split"],
    description:
      "The sixteen-column table at 640 px, whole page, not scrolled. Short identifiers such as nw-02 and North stay on "
      + "one line, and a shadow on the overflow edge shows that the table scrolls.",
  },
  {
    id: "code-light-table-narrow",
    fixture: "04-code-and-tables",
    theme: "light",
    width: 640,
    height: 900,
    scroll: { kind: "top" },
    fullPage: true,
    machineChecks: ["identifier-split"],
    description:
      "The sixteen-column table at 640 px on a light theme, whole page, not scrolled. Short identifiers such as nw-02 and North stay on "
      + "one line, and a shadow on the overflow edge shows that the table scrolls.",
  },
  {
    id: "code-light-full",
    fixture: "04-code-and-tables",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "Whole document on a light theme: code, wide table, four-level nested list and "
      + "definition list in one frame.",
  },
  {
    id: "chapter-dark-top",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Opening of a realistic chapter: note, prose, then a loaded figure with caption text. "
      + "The caption has no generated figure number; inspect its separation from body text.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-MYST-031
    id: "chapter-figure-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "figure" },
    description:
      "Close-up of a chapter figure referenced from a sibling external-img directory. "
      + "The SVG must load and the caption must remain visible beneath it.",
  },
  {
    id: "chapter-dark-quarter",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "aside.important" },
    description: "The important-block landmark and following body-colour paragraph.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-MYST-024
    id: "chapter-dark-half",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: ".math-display" },
    description: "The typeset display-equation landmark with surrounding shift-change content.",
  },
  {
    id: "chapter-dark-three-quarters",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: 'h2[data-line="110"]' },
    description: "Incident patterns landmark with back-to-back admonitions.",
  },
  {
    id: "chapter-dark-bottom",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "bottom" },
    description:
      "True end of the chapter. The final paragraph names itself, so a screenshot that "
      + "does not show it means the scroll stopped short.",
  },
  {
    id: "chapter-light-top",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    description: "Same chapter opening on a light theme, for side-by-side contrast review.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-LAYOUT-003
    // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-002
    id: "chapter-max-width-dark-full",
    fixture: "05-long-chapter",
    theme: "dark",
    ...XLARGE,
    expectedContentWidth: DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "The full long chapter in a 1600px dark preview. Its content column stays centered "
      + `at the configured ${DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth}px maximum.`,
  },
  {
    id: "chapter-max-width-light-full",
    fixture: "05-long-chapter",
    theme: "light",
    ...XLARGE,
    expectedContentWidth: DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth,
    scroll: { kind: "top" },
    fullPage: true,
    description:
      "The full long chapter in a 1600px light preview. The readable column stays centered "
      + `at the configured ${DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth}px maximum.`,
  },
  {
    id: "syntax-dark-markdown",
    fixture: "06-syntax-highlighting",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(1)" },
    description:
      "A quadruple-backtick Markdown fence on a dark theme. The inner triple fences, the "
      + "table and the link must appear as literal highlighted Markdown, not as rendered "
      + "content that escaped the block.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-CODE-001
    // @tests_req SwRS-MDOKFSTUDIO-CODE-001
    id: "syntax-dark-rust",
    fixture: "06-syntax-highlighting",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(2)" },
    description:
      "Rust on a dark theme. Keywords, the attribute macro, the doc comment, the string "
      + "literals and the numeric literal must each take a distinct colour.",
  },
  {
    id: "syntax-dark-python",
    fixture: "06-syntax-highlighting",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(3)" },
    description:
      "Python on a dark theme. Decorator, docstring, f-string and trailing comment are "
      + "the tokens most likely to be mis-scoped by a highlighter.",
  },
  {
    id: "syntax-light-rust",
    fixture: "06-syntax-highlighting",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(2)" },
    description:
      "The same Rust block on a light theme. Token colours drawn from the chart palette "
      + "must stay legible against the pale code-block background.",
  },
  {
    id: "syntax-light-shell",
    screenshotOf: "diff-light-preview",
    fixture: "06-syntax-highlighting",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(4)" },
    description:
      "Shell, JSON and diff blocks on a light theme, followed by a fence labelled with an "
      + "unregistered grammar that must degrade to plain monospace text.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CODE-008
    id: "diff-dark-preview",
    fixture: "06-syntax-highlighting",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(4)" },
    description:
      "A fenced diff block in readonly preview on a dark theme. Added and removed lines "
      + "must use distinct full-width treatments while the patch markers remain visible.",
  },
  {
    id: "diff-light-preview",
    fixture: "06-syntax-highlighting",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(4)" },
    description:
      "A fenced diff block in readonly preview on a light theme. Green and red line "
      + "treatments must remain legible against the code panel.",
  },
  {
    id: "diff-dark-edit",
    fixture: "06-syntax-highlighting",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(4)" },
    editMode: true,
    description:
      "The same diff block in page-wide edit mode on a dark theme. Rendered line styling "
      + "must remain visible while the preview is editable.",
  },
  {
    id: "diff-light-edit",
    fixture: "06-syntax-highlighting",
    theme: "light",
    ...WIDE,
    scroll: { kind: "selector", value: "h2:nth-of-type(4)" },
    editMode: true,
    description:
      "The same diff block in page-wide edit mode on a light theme. The rendered preview "
      + "must retain its green and red line treatments.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CODE-007
    id: "syntax-narrow-python",
    horizontalOverflow: true,
    fixture: "06-syntax-highlighting",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "selector", value: "h2:nth-of-type(3)" },
    description:
      "Python in a narrow pane, captured at the code block's far-right scroll position. "
      + "Long signatures scroll internally without widening the page.",
  },
  {
    id: "frontmatter-forced-white",
    fixture: "07-frontmatter",
    theme: "dark",
    previewThemeMode: "white",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "YAML frontmatter rendered at the top of the document. Metadata and inline code use "
      + "readable link-blue text against the soft white-mode code background.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-001
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-006
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-006
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-029
    id: "okf-schema-table",
    fixture: "08-okf-schema",
    theme: "dark",
    previewThemeMode: "white",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "OKF frontmatter with a matching schema. The three-column properties "
      + "table shows name, value, and the schema description of each field.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-014
    id: "okf-schema-narrow",
    screenshotOf: "frontmatter-scroll-feedback",
    fixture: "08-okf-schema",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    hideDescriptionColumn: true,
    description:
      "The OKF schema table at narrow side-panel width. The description column is hidden so "
      + "the name and value columns remain readable without horizontal crowding.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
    id: "frontmatter-links-loading",
    fixture: "14-frontmatter-links",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    frontmatterLinkState: "loading",
    description:
      "The properties table while filesystem-backed links are being inspected. Each linked value "
      + "keeps its text and shows a small spinner immediately after it.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-FMSCHEMA-014
    id: "frontmatter-links-loaded",
    fixture: "14-frontmatter-links",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    frontmatterLinkState: "loaded",
    description:
      "The same properties table after deferred link inspection. The spinners are gone and both "
      + "resolved values are rendered as links.",
  },
  {
    id: "preview-toolbar-dark",
    screenshotOf: "okf-schema-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    description:
      "Four preview actions share one compact toolbar chip without covering the schema properties table.",
  },
  {
    id: "edit-mode-dark",
    screenshotOf: "edit-paragraph-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "paragraph",
    description:
      "Whole-page edit mode preserves source layout while a focused paragraph editor shows its caret.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-029
    id: "edit-paragraph-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "paragraph",
    description:
      "Clicking a body paragraph opens its source editor while retaining the hard source lines.",
  },
  {
    id: "edit-admonition-dark",
    fixture: "08-okf-schema",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "admonition",
    description:
      "Clicking an admonition title opens the complete mapped directive source.",
  },
  {
    id: "edit-affordances-hover-and-open",
    fixture: "04-code-and-tables",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editAffordances: true,
    machineChecks: ["overlay-clipped"],
    description:
      "Edit mode on. A hovered list is outlined with a dashed line (the `hover` step keeps that frame); the final frame shows a paragraph editor with its frame, line-range hint, and the status line on one row with the Done and Cancel buttons (status left, buttons right, smaller editor text).",
  },
  {
    id: "edit-affordances-narrow",
    fixture: "04-code-and-tables",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    editAffordances: true,
    machineChecks: ["overlay-clipped"],
    description:
      "460 px preview: the paragraph editor's status line wraps onto its own lines without "
      + "overlapping the Done and Cancel buttons, which stay right-aligned on the same row or below.",
  },
  {
    id: "edit-palette-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editPalette: true,
    machineChecks: ["overlay-clipped"],
    description:
      "Edit mode on, light theme, a paragraph in the middle of the chapter open in its editor: the edition palette (heading, bold, italic, strikethrough, link, code, quote, rule, table, emoji, TODO) sits on top of the edit box, outside its border and attached to it, and the clicked text keeps its screen position. The steps `bar`, `menu`, `grid`, `emoji`, `alert`, `colour` and `colour-code` keep the palette after Bold and undo, the heading list, the table grid, the emoji picker, the alert type list, the colour picker and the colour-code swatch.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
    id: "edit-palette-tall-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editPaletteTall: true,
    description:
      "Light theme, a paragraph editor filled with a very tall text and scrolled so the top of the edit box is out of view: the edition palette stays at the top of the viewport, below the sticky heading band and the floating toolbar. The `top` step shows the palette on top of the box, the `end` step the bottom of the box with its Done/Cancel row (the palette is still stuck at the top until the box end reaches it). Pressing ArrowUp on the first lines keeps the caret below the palette.",
  },
  {
    id: "edit-palette-tall-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editPaletteTall: true,
    description:
      "Dark theme, the same very tall paragraph editor scrolled mid-box: the palette stays visible at the top of the viewport. The checks of the light scenario run too; only the final frame is kept.",
  },
  {
    id: "edit-palette-tall-narrow-360",
    fixture: "05-long-chapter",
    theme: "dark",
    width: 360,
    height: 800,
    scroll: { kind: "top" },
    editMode: true,
    editPaletteTall: true,
    description:
      "360 px preview, a very tall paragraph editor scrolled mid-box: the five-row palette stays stuck to the top of the viewport inside the pane (CR 034) and leaves with the box end. The `end` step keeps the bottom of the box.",
  },
  {
    id: "palette-slash/v18-palette-sticky-tall-editor-light-460",
    fixture: "05-long-chapter",
    theme: "light",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    editPaletteTall: true,
    description:
      "460 px preview, light theme, a very tall paragraph editor: the palette sits on top of the box with the box top in view, and with the box top scrolled out it sticks to the top of the viewport inside the pane (wrapping onto several rows), keeps the focus in the box and leaves with the box end. The `top` step shows the palette on top of the box, the `end` step the bottom of the box, the final frame the stuck palette mid-box.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-TABLE-008
    id: "palette-slash/v19-table-toolbar-sticky-tall-table-light-900",
    fixture: "46-tall-table",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    tableToolbarTall: true,
    description:
      "900 px preview, light theme, a cell of a table taller than the viewport open in its editor: the table toolbar sits on top of the table without covering a row; with the table top scrolled out it stays at the top of the viewport below the preview controls, inside the table, and the table never moves. The `top` step shows the toolbar on top of the table, the `end` step the end of the table, the final frame the toolbar riding mid-table.",
  },
  {
    id: "palette-slash/v20-table-toolbar-sticky-tall-table-light-460",
    fixture: "46-tall-table",
    theme: "light",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    tableToolbarTall: true,
    description:
      "460 px preview, light theme, a cell of a table taller than the viewport open in its editor: the table toolbar wraps inside the pane, sits on top of the table and, with the table top scrolled out, stays at the top of the viewport inside the table. The `top` step shows the toolbar on top of the table, the `end` step the end of the table, the final frame the toolbar riding mid-table.",
  },
  {
    id: "palette-mode-strict-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    paletteModeShot: "strict",
    machineChecks: ["overlay-clipped"],
    description:
      "Palette mode Strict, light theme: plain Markdown buttons only. The `palette` step is the bar above a paragraph editor; the final frame is the bar in the editor opened from a + insertion point.",
  },
  {
    id: "palette-mode-strict-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    paletteModeShot: "strict",
    machineChecks: ["overlay-clipped"],
    description:
      "Palette mode Strict, dark theme: plain Markdown buttons only. The bar above a paragraph editor and the bar in the editor opened from a + insertion point are both checked; no PNG is kept.",
  },
  {
    id: "palette-mode-gfm-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    paletteModeShot: "gfm",
    machineChecks: ["overlay-clipped"],
    description:
      "Palette mode GFM, light theme: strict plus the GitHub buttons. The `palette` step is the bar above a paragraph editor; the final frame is the bar in the editor opened from a + insertion point.",
  },
  {
    id: "palette-mode-gfm-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    paletteModeShot: "gfm",
    machineChecks: ["overlay-clipped"],
    description:
      "Palette mode GFM, dark theme: strict plus the GitHub buttons. The bar above a paragraph editor and the bar in the editor opened from a + insertion point are both checked; no PNG is kept.",
  },
  {
    id: "palette-mode-myst-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    paletteModeShot: "myst",
    machineChecks: ["overlay-clipped"],
    description:
      "Palette mode MyST, light theme: GFM plus the MyST buttons: admonition, definition list, math, sub/sup, label, ref, doc, cite, dropdown, table caption, figure, {kbd} role. The final frame shows the bar in the editor opened from a + insertion point; the bar above a paragraph editor is checked too and looks the same as in the edition palette scenarios.",
  },
  {
    id: "palette-mode-myst-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    paletteModeShot: "myst",
    machineChecks: ["overlay-clipped"],
    description:
      "Palette mode MyST, dark theme: GFM plus the MyST buttons: admonition, definition list, math, sub/sup, label, ref, doc, cite, dropdown, table caption, figure, {kbd} role. The bar above a paragraph editor and the bar in the editor opened from a + insertion point are both checked; no PNG is kept.",
  },
  {
    id: "slash-menu-strict-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    slashMenuShot: { mode: "strict", finalQuery: "" },
    machineChecks: ["overlay-clipped"],
    description:
      "Slash command menu, palette mode strict, light theme: / at a line start opens the menu at the caret with the palette's commands grouped by category; the filtered, no-match and flip states are checked without step PNGs; the final frame shows the menu with only the slash typed.",
  },
  {
    id: "slash-menu-gfm-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    slashMenuShot: { mode: "gfm", finalQuery: "tab" },
    machineChecks: ["overlay-clipped"],
    description:
      "Slash command menu, palette mode gfm, light theme: / at a line start opens the menu at the caret with the palette's commands grouped by category; the `open`, `filtered`, `nomatch` and `flip` steps show the states, the final frame the menu with /tab typed.",
  },
  {
    id: "slash-menu-myst-light",
    fixture: "05-long-chapter",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    slashMenuShot: { mode: "myst", finalQuery: "" },
    machineChecks: ["overlay-clipped"],
    description:
      "Slash command menu, palette mode myst, light theme: / at a line start opens the menu at the caret with the palette's commands grouped by category; the filtered, no-match and flip states are checked without step PNGs; the final frame shows the menu with only the slash typed.",
  },
  {
    id: "slash-menu-myst-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    slashMenuShot: { mode: "myst", finalQuery: "no" },
    machineChecks: ["overlay-clipped"],
    description:
      "Slash command menu, palette mode myst, dark theme: / at a line start opens the menu at the caret with the palette's commands grouped by category; the filtered, no-match and flip states are checked without step PNGs; the final frame shows the menu with /no typed.",
  },
  {
    id: "edit-palette-dark",
    fixture: "05-long-chapter",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editPalette: true,
    machineChecks: ["overlay-clipped"],
    description: "The edition palette above an open paragraph editor on a dark theme.",
  },
  {
    id: "edit-palette-cream",
    fixture: "05-long-chapter",
    theme: "dark",
    previewThemeMode: "cream",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editPalette: true,
    machineChecks: ["overlay-clipped"],
    description: "The edition palette above an open paragraph editor on the cream page.",
  },
  {
    id: "edit-palette-narrow-360",
    fixture: "05-long-chapter",
    theme: "dark",
    width: 360,
    height: 800,
    scroll: { kind: "top" },
    editMode: true,
    editPalette: true,
    machineChecks: ["overlay-clipped"],
    description:
      "360 px preview: the palette on top of the edit box wraps onto more rows instead of "
      + "overflowing it, and its heading list stays inside the box's width.",
  },
  {
    id: "edit-insert-point-hover",
    fixture: "04-code-and-tables",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editAffordances: true,
    machineChecks: ["overlay-clipped"],
    description:
      "Edit mode on, light theme. A hovered list is outlined with a dashed line (the `hover` step, which also shows the round + insertion button in the left gutter), then a paragraph editor opens with its frame and Done/Cancel row.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-087
    id: "edit-insert-after-final-figure",
    fixture: "18-figure-at-end",
    theme: "light",
    ...WIDE,
    scroll: { kind: "bottom" },
    editMode: true,
    insertAfterFigureChecks: true,
    machineChecks: ["overlay-clipped"],
    description:
      "Edit mode on, light theme, a document that ends with a figure. After hovering the figure "
      + "and clicking the round + below it, an empty block editor is open directly under the "
      + "figure caption; the insertion message carried the line of the closing fence.",
  },
  {
    id: "edit-insert-after-final-image",
    fixture: "19-image-at-end",
    theme: "light",
    ...WIDE,
    scroll: { kind: "bottom" },
    editMode: true,
    insertAfterFigureChecks: true,
    insertAfterBlock: { selector: "main p[data-sphinx-source-line]:has(img)", line: 5 },
    machineChecks: ["overlay-clipped"],
    description:
      "Edit mode on, light theme, a document that ends with a plain Markdown image. After hovering "
      + "the image and clicking the round + below it, an empty block editor is open directly under "
      + "the image; the insertion message carried the image's line (5).",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-BLOCK-003
    // @tests_req StRS-MDOKFSTUDIO-LAYOUT-004
    id: "edit-first-block-top-wide",
    fixture: "17-wrapped-editing",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "title",
    topSpacingChecks: "first-block",
    description:
      "Edit mode on, light theme, a document without frontmatter whose first block is the heading. "
      + "The heading's editor is open and its frame sits at least 20 px below the top edge of the "
      + "preview, clear of the floating toolbar; the paragraph below it is still visible.",
  },
  {
    id: "edit-first-block-top-narrow",
    fixture: "17-wrapped-editing",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    editTarget: "title",
    topSpacingChecks: "first-block",
    description:
      "Same as the wide first-block case on a narrow dark preview: the open heading editor keeps a "
      + "visible gap above its frame and does not touch the floating toolbar.",
  },
  {
    id: "edit-empty-document-start-writing",
    fixture: "20-empty-document",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    topSpacingChecks: "empty-start",
    description:
      "Edit mode on with an empty file: the Start writing button is shown at least 20 px below the "
      + "top edge of the preview, not stuck against it.",
  },
  {
    // @tests_req StRS-MDOKFSTUDIO-BLOCK-011
    id: "edit-empty-document-enter-opens-editor",
    fixture: "20-empty-document",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    topSpacingChecks: "empty-open",
    description:
      "Edit mode on with an empty file after pressing Enter in the preview: the new-block editor is "
      + "open with its caret in it, replacing the Start writing button, with at least 20 px above its frame.",
  },
];
