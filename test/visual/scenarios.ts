/**
 * The screenshot campaign.
 *
 * Every entry names one thing a reader could notice going wrong: a colour that bleeds
 * past a block, a panel that disappears into the page, a scroll position that lands in
 * the wrong place. Each produces a PNG and a sidecar note explaining what to look at.
 */

import { DEFAULT_PREVIEW_CONFIGURATION } from "../../src/configuration/previewConfiguration";

export type ScrollMode =
  | { kind: "top" }
  | { kind: "bottom" }
  | { kind: "fraction"; value: number }
  | { kind: "selector"; value: string; offset?: number }
  | { kind: "stickyHeading"; value: string };

export interface Scenario {
  id: string;
  screenshotOf?: string;
  fixture: string;
  theme: string;
  plantumlExpectation?: "success" | "executable-not-found" | "unconfigured";
  linkDetailsChecks?: boolean;
  horizontalOverflow?: boolean;
  previewThemeMode?: "white";
  stickyHeadingDepth?: number;
  expectedStickyHeadings?: string;
  expectedContentWidth?: number;
  editMode?: boolean;
  editTarget?: "title" | "paragraph" | "admonition" | "list" | "table-cell" | "table-cell-wide" | "frontmatter-key" | "frontmatter-value" | "frontmatter-list" | "frontmatter-boolean";
  width: number;
  height: number;
  scroll: ScrollMode;
  fullPage?: boolean;
  scrollFeedbackStress?: boolean;
  scrollOscillationStress?: boolean;
  editActivationScroll?: boolean;
  editActivationSelector?: string;
  mathRenderingChecks?: boolean;
  frontmatterLinkState?: "loading" | "loaded";
  hideDescriptionColumn?: boolean;
  contextTagChecks?: boolean;
  listTypingChecks?: boolean;
  /** Real-keyboard checks in a wrapped paragraph editor: Up/Down on wrapped lines, marker wrapping, undo. */
  editorKeyboardChecks?: boolean;
  /** Hover outline, then an open paragraph editor with frame, hint and buttons (T15). */
  editAffordances?: boolean;
  /** Click the + after the final figure; the insertion message must carry the closing fence line. */
  insertAfterFigureChecks?: boolean;
  /** Last block of the fixture, the line the insertion must follow, and its selector. */
  insertAfterBlock?: { selector: string; line: number };
  expectStickyGrowth?: boolean;
  /** Geometry checks (test/shared/geometry-checks.js) that fail this scenario when applicable and failing. */
  machineChecks?: string[];
  description: string;
}

const WIDE = { width: 900, height: 1000 };
const NARROW = { width: 460, height: 900 };
const XLARGE = { width: 1600, height: 1100 };

export const SCENARIOS: Scenario[] = [
  {
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
  ...["dark", "light"].flatMap((theme) => [
    {
      id: `context-tags-${theme}-wide`,
      fixture: "15-context-tags",
      theme,
      ...WIDE,
      scroll: { kind: "top" as const },
      fullPage: true,
      contextTagChecks: true,
      description: `Desktop ${theme} capture of the exact adjacent YAML context form plus simple and snake_case tags. `
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
      description: `Narrow ${theme} side-panel capture of the exact adjacent YAML form plus simple and snake_case tags. `
        + "The panels must wrap without widening the page or hiding the YAML code.",
    },
  ]),
  {
    id: "mermaid-map-dark",
    fixture: "06-mermaid-map",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" },
    fullPage: true,
    description: "The OKF knowledge-base map in the dark preview.",
  },
  {
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
      "A sixteen-column table deliberately wider than the preview. The final capture is "
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
      "Edit mode on. A hovered list is outlined with a dashed line (a second PNG, -hover, is kept); "
      + "the final frame shows a paragraph editor with its frame, line-range hint, and the status line on one row with the Done and Cancel buttons "
      + "(status left, buttons right, smaller editor text).",
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
    id: "edit-insert-point-hover",
    fixture: "04-code-and-tables",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" },
    editMode: true,
    editAffordances: true,
    machineChecks: ["overlay-clipped"],
    description:
      "Edit mode on, light theme. Hovering a list reveals the round + insertion button in the left "
      + "gutter below it (the -hover PNG); the insertion points add no height to the page.",
  },
  {
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
      "Edit mode on a sixteen-column table wider than the preview. After pressing End in the "
      + "far-right cell editor (the -end PNG) the caret is at the end of the cell text and the "
      + "table has not shifted horizontally. Done and Cancel sit inside the cell without widening "
      + "the column and the toolbar status is centred with its buttons.",
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
      + "The -arrowdown PNG shows the editor moved to the cell below after ArrowDown.",
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
      + "Cancel under the field inside the cell and unchanged column widths; the -arrowdown PNG shows "
      + "the editor moved to the cell below.",
  }))),
  {
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
    id: "preview-sticky-headings-natural-growth",
    fixture: "10-sticky-heading-wrap",
    theme: "dark",
    stickyHeadingDepth: 3,
    expectStickyGrowth: true,
    ...NARROW,
    scroll: { kind: "stickyHeading", value: 'h3[data-line="5"]' },
    expectedStickyHeadings: "# Operating a cross-functional vehicle software verification programme across several engineering domains\n"
      + "## Maintaining evidence traceability while upstream and downstream requirements evolve continuously\n"
      + "### Checking the complete dependency graph after each asynchronous validation and review",
    description:
      "Long, wrapped heading ancestry grows the sticky band to its rendered content height.",
  },
  {
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
    id: "frontmatter-scroll-feedback",
    fixture: "08-okf-schema",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    scrollFeedbackStress: true,
    description:
      "Three scroll cycles reach both ends; the final capture returns to the top of the tall frontmatter table.",
  },
  {
    id: "frontmatter-scroll-feedback-edit",
    fixture: "08-okf-schema",
    theme: "dark",
    ...NARROW,
    scroll: { kind: "top" },
    editMode: true,
    scrollFeedbackStress: true,
    description:
      "Edit mode remains on after three scroll cycles; the field editor is closed and the final capture is at the top.",
  },
  {
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
  ...["white", "dark"].flatMap((mode) => [WIDE, NARROW].map((viewport) => ({
    id: `frontmatter-link-details-${mode}-${viewport.width}`,
    fixture: "14-frontmatter-links",
    theme: "dark",
    ...(mode === "white" ? { previewThemeMode: "white" as const } : {}),
    ...viewport,
    scroll: { kind: "top" as const },
    frontmatterLinkState: "loaded" as const,
    linkDetailsChecks: true,
    description: "Resolved links show fresh target metadata and a clipped long excerpt. Beta intentionally lacks the optional description. Inspect excerpt ellipsis, Alpha's line 9 label and the visible Refresh tooltip without page overflow; native link title metadata is DOM-asserted, not visible in the PNG.",
  }))),
];

export function scenarioGroup(scenario: Scenario): string {
  if (scenario.fixture === "14-frontmatter-links") return "05 Link details and loading";
  if (scenario.fixture === "15-context-tags") return "02 Context tag containers";
  if (scenario.editMode || scenario.editActivationScroll) return "06 Editing";
  if (scenario.expectedStickyHeadings || scenario.scrollFeedbackStress) return "07 Scrolling and sticky headings";
  if (/plantuml|mermaid/.test(scenario.fixture)) return "03 Diagrams";
  if (/frontmatter|okf-schema|schema-validation|SKILL/.test(scenario.fixture)) return "04 Properties and validation";
  if (/code|syntax|unresolved/.test(scenario.fixture)) return "02 Code and unresolved constructs";
  return "01 Documents and admonitions";
}
