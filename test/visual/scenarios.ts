/**
 * The screenshot campaign.
 *
 * Every entry names one thing a reader could notice going wrong: a colour that bleeds
 * past a block, a panel that disappears into the page, a scroll position that lands in
 * the wrong place. Each produces a PNG and a sidecar note explaining what to look at.
 */

import { DEFAULT_PREVIEW_CONFIGURATION } from "../../src/configuration/previewConfiguration";
import { isGroupId, type GroupId } from "../shared/e2eGroups";
import type { ScenarioRenderOptions } from "./renderOptions";
import { ASSERTION_ONLY_IDS, LOCKS_BY_ID, README_BY_ID, REMOVED_ALIASES, SCENARIO_ID_BY_LEGACY_ID, STEPS_BY_ID } from "./scenarioIds";

export type ScrollMode =
  | { kind: "top" }
  /** `extra`: scroll this many px further down than the last block plus 40 px (shows content placed in the bottom padding). */
  | { kind: "bottom"; extra?: number }
  | { kind: "fraction"; value: number }
  | { kind: "selector"; value: string; offset?: number }
  | { kind: "stickyHeading"; value: string };

/** `readme` metadata: the scenario PNG is the source of an `images/readme/*.png` (crop box in PNG pixels). */
export interface ReadmeSource {
  file: string;
  crop: [number, number, number, number];
  width: number;
  step?: string;
}

/**
 * A DOM assertion checked by `check_content_assertions` in capture.py. Every given condition must
 * hold; `message` names the behaviour in the failure text.
 */
export interface ContentAssertion {
  message: string;
  selector: string;
  /** Exactly this many matches. */
  count?: number;
  /** At least this many matches. */
  min?: number;
  /** The text content of the matches (joined) contains this text. */
  text?: string;
  /** ... does not contain this text. */
  notText?: string;
  /** Every match has a non-empty box and is not hidden. */
  visible?: true;
  /** Every match lies inside the pane horizontally (no horizontal overflow of that element). */
  insidePane?: true;
  /** Computed style of the first match, property name (camelCase) to expected value. */
  css?: Record<string, string>;
  /** Attribute of the first match. */
  attr?: { name: string; value: string };
  /** A JavaScript expression evaluated in the page (after the scroll); it must be true. */
  expr?: string;
}

export interface Scenario {
  id: string;
  /** Feature group (see `test/shared/e2eGroups.ts`): the prefix of the id. */
  group: GroupId;
  /** The id this scenario had before P9 B2a (`--scenario` still accepts it). */
  legacyId?: string;
  /** One present-tense, observable sentence of what the scenario locks (raw material for the requirements); from `LOCKS_BY_ID`. */
  locks: string;
  /** `false`: assertion-only. Every check runs, no PNG, no step PNG, no sidecar. */
  capture?: false;
  /** Step PNGs to write (names in `STEP_NAMES` of capture.py). Omitted: every step the checks produce. */
  steps?: string[];
  /** Followup id of a product defect this scenario exposes: its failures are reported, not gating. */
  knownIssue?: string;
  /** Runs the Mermaid theme-switch check (cycles dark, white and cream and compares node colours). */
  mermaidThemeSwitch?: true;
  /** K3: cycles the theme modes of an invalid diagram and asserts it keeps exactly one error with one parser-message details. */
  mermaidErrorThemeSwitch?: true;
  /** Shown first in its group page and in the index thumbnails. */
  gallery?: "key";
  readme?: ReadmeSource;
  screenshotOf?: string;
  /** Declarative DOM assertions on top of the standard page checks (P9 B4 gap fill). */
  contentAssertions?: ContentAssertion[];
  /** "error": every Mermaid diagram must show its error message and no image (invalid syntax). */
  mermaidExpectation?: "error";
  fixture: string;
  theme: string;
  /** Options of the static page (read-only, strict fields, content width, ...). Default: the standard page. */
  render?: ScenarioRenderOptions;
  plantumlExpectation?: "success" | "executable-not-found" | "unconfigured";
  linkDetailsChecks?: boolean;
  horizontalOverflow?: boolean;
  previewThemeMode?: "white" | "cream";
  /** P8: leave the floating toolbar collapsed (rows 2-3 hidden) for the checks and the capture. */
  toolbarState?: "collapsed";
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
  /** Bare URLs in a paragraph, list item and table cell are links; the one in inline code is not. */
  bareUrlChecks?: boolean;
  /** Inline code geometry: no line-height jump, rounded corners, translucent tint. */
  inlineCodeChecks?: boolean;
  /** Table-cell identifiers stay on one line; the long paragraph identifier wraps without overflow. */
  inlineCodeNarrowChecks?: boolean;
  /** T44: the Orphaned comments box adds no scroll height inside the bottom padding; a taller one extends it. */
  orphanBoxChecks?: boolean;
  frontmatterLinkState?: "loading" | "loaded";
  hideDescriptionColumn?: boolean;
  contextTagChecks?: boolean;
  listTypingChecks?: boolean;
  /** Real-keyboard checks in a wrapped paragraph editor: Up/Down on wrapped lines, marker wrapping, undo. */
  editorKeyboardChecks?: boolean;
  /** Hover outline, then an open paragraph editor with frame, hint and buttons (T15). */
  editAffordances?: boolean;
  /**
   * Edition palette (T21): a paragraph deep in the page is opened in edit mode. The bar sits above
   * the text box and not under the toolbar, the clicked text stays put, a button keeps the editor
   * open and the `menu` step keeps the heading list open.
   */
  editPalette?: boolean;
  /**
   * P4: a paragraph editor filled with a very tall text (taller than the viewport). The palette sits
   * on top of the edit box; scrolled so the box top is out of view it stays at the top of the
   * viewport, below the sticky band and the floating toolbar, and it leaves with the box's end.
   * Steps: `top` (box top visible), `end` (box end visible); the final frame is scrolled mid-box.
   */
  editPaletteTall?: boolean;
  /**
   * CR 034: a table cell of a table taller than the viewport is open in its editor. The table
   * toolbar sits above the table; with the table top scrolled out it rides down to the top of the
   * viewport, stays inside the table and leaves with the table's end. Steps: `top`, `end`.
   */
  tableToolbarTall?: boolean;
  /**
   * P6: the palette mode select is set to this mode in an open paragraph editor; the buttons are
   * checked against the mode, in a paragraph editor (`palette` step) and in an insertion
   * point editor (`insert-point` step, dropped when equal to the final frame).
   */
  paletteModeShot?: "strict" | "gfm" | "myst";
  /**
   * P11: the slash command menu in a paragraph editor of this palette mode. Steps: `open` (all
   * commands), `filtered`, `nomatch` (No command row), `flip` (editor near the viewport bottom: the
   * menu opens above the caret). The final frame keeps the menu open with `finalQuery` typed.
   */
  slashMenuShot?: { mode: "strict" | "gfm" | "myst"; finalQuery: string };
  /** Click the + after the final figure; the insertion message must carry the closing fence line. */
  insertAfterFigureChecks?: boolean;
  /** Last block of the fixture, the line the insertion must follow, and its selector. */
  insertAfterBlock?: { selector: string; line: number };
  /**
   * Top-spacing geometry (T-top): "first-block" an open editor on the document's first block,
   * "empty-start" the Start writing button, "empty-open" the editor after pressing Enter.
   */
  topSpacingChecks?: "first-block" | "empty-start" | "empty-open";
  /**
   * First-element gap (T09): in the preview the first element sits 40 px below the top; in edit
   * mode an open first-block editor and the Start writing button are never under the toolbar.
   */
  /** Cycles the Width button through margin, auto and full width and measures the column and the wide elements. */
  widthModeChecks?: boolean;
  /** Switches the Width button to Auto before the screenshot (README capture of the margin break). */
  widthModeShot?: "auto";
  /** P2/P7: sets this width mode, records the side margins of text, table, code and figure, asserts the break-out geometry. */
  widthModeBreak?: "margin" | "auto" | "full";
  /** Opens the TOC column and measures it against the toolbar, the content, the width modes and zoom. */
  tocChecks?: boolean;
  /** P1: leaves the TOC open (opened with the toolbar button) in this width mode for the screenshot. */
  tocShot?: "margin" | "auto" | "full";
  /** Opens and closes the comment chips, keeps the reading line, and turns the gray chips off and on. */
  commentChipChecks?: boolean;
  /**
   * The toolbar Comments button (preview and edit mode) hides and shows the gray comment chips (TODO
   * chips stay) and is pressed again at the end; the open comment box has square corners. The value
   * is the state left for the screenshot.
   */
  commentToggleChecks?: "visible" | "hidden";
  /** Sends the "changed" blocks of the fixture as incoming changes and checks every bar sits in one column at the page margin, square, as tall as its block, and nothing moves. */
  changeBarChecks?: boolean;
  /** Figure width and alignment, and the anchor icon of a (label)= target (T27). */
  figureAnchorChecks?: boolean;
  firstElementGap?: "element" | "table" | "empty" | "wide-margin" | "properties";
  /** P3: "read" measures the preview only (default "edit": preview, edit mode, first editor open). */
  firstElementGapState?: "read" | "edit";
  /** P3: Width button state measured (default margin). */
  firstElementGapWidth?: "margin" | "auto" | "full";
  /** Hovering the first code block shows the copy button in its top right; a click posts the code. */
  codeCopyChecks?: boolean;
  expectStickyGrowth?: boolean;
  /** Geometry checks (test/shared/geometry-checks.js) that fail this scenario when applicable and failing. */
  machineChecks?: string[];
  description: string;
}

/** A scenario as written below: id (legacy) and group are resolved through `scenarioIds.ts`. */
type ScenarioDefinition = Omit<Scenario, "group" | "legacyId" | "locks">;

/** P9 B4 assertion lists (see the scenarios at the end of SCENARIO_DEFINITIONS). */
const MAIN = "#sphinx-myst-preview-content";

const CJK_RTL_ASSERTIONS: ContentAssertion[] = [
  { message: "the CJK, bidirectional and unbroken-string paragraphs are rendered", selector: `${MAIN} p`, count: 7 },
  { message: "the CJK text is present", selector: MAIN, text: "日本語の段落です" },
  { message: "the Chinese and Korean paragraphs wrap inside the pane", selector: `${MAIN} p:nth-of-type(-n+3)`, insidePane: true },
  {
    message: "the Hebrew and Arabic paragraphs are right-aligned (their text ends at the right edge of the column)",
    selector: MAIN,
    expr: "(() => { const rtl = [...document.querySelectorAll('#sphinx-myst-preview-content p')].filter(p => /[\\u0590-\\u06FF]/.test(p.textContent)); if (rtl.length !== 2) return false; return rtl.every(p => { const range = document.createRange(); range.selectNodeContents(p); const right = Math.max(...[...range.getClientRects()].map(box => box.right)); return p.getBoundingClientRect().right - right < 4; }); })()",
  },
  {
    message: "every paragraph and heading carries dir=auto, and the Hebrew and Arabic paragraphs resolve to right-to-left",
    selector: MAIN,
    expr: "(() => { const blocks = [...document.querySelectorAll('#sphinx-myst-preview-content p, #sphinx-myst-preview-content h1, #sphinx-myst-preview-content h2')]; if (!blocks.every(b => b.getAttribute('dir') === 'auto')) return false; const rtl = blocks.filter(b => /[\\u0590-\\u06FF]/.test(b.textContent)); return rtl.length === 2 && rtl.every(b => getComputedStyle(b).direction === 'rtl'); })()",
  },
  {
    message: "the CJK and Latin paragraphs stay left-to-right and start at the left edge of the column",
    selector: MAIN,
    expr: "(() => { const main = document.querySelector('#sphinx-myst-preview-content'); const ltr = [...main.querySelectorAll('p')].filter(p => !/[\\u0590-\\u06FF]/.test(p.textContent)); return ltr.length === 5 && ltr.every(p => getComputedStyle(p).direction === 'ltr' && getComputedStyle(p).textAlign !== 'right' && getComputedStyle(p).textAlign !== 'end'); })()",
  },
  { message: "the page does not scroll horizontally", selector: MAIN, expr: "document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth" },
  { message: "the unbroken word and the long URL wrap inside their paragraphs", selector: `${MAIN} p:nth-of-type(n+6)`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content p:nth-of-type(n+6)')].every(p => p.scrollWidth <= p.clientWidth + 1)" },
  { message: "the long URL link stays inside the pane", selector: `${MAIN} p:nth-of-type(7) a`, insidePane: true },
];

const COMMENT_LIST_ASSERTIONS: ContentAssertion[] = [
  { message: "every comment shows as a chip (two gray, one TODO), none as a <!-- label", selector: ".okf-comment > .okf-chip", count: 3, notText: "<!--" },
  { message: "the gray comment chips are labelled comment", selector: ".okf-comment[data-okf-comment-kind='comment'] > .okf-chip", count: 2, text: "comment comment" },
  { message: "the TODO comment is a green TODO chip", selector: ".okf-comment[data-okf-comment-kind='todo'] > .okf-chip--todo", count: 1, text: "TODO" },
  { message: "the list keeps its four items", selector: "ul > li", count: 4 },
  { message: "the toolbar offers the Comments button", selector: "[data-sphinx-preview-comments-toggle]", count: 1, visible: true },
];

const LONG_WORDS_ASSERTIONS: ContentAssertion[] = [
  { message: "the long words, URLs, list and quote are rendered", selector: `${MAIN} p, ${MAIN} li, ${MAIN} blockquote`, min: 7 },
  { message: "the page does not scroll horizontally", selector: MAIN, expr: "document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth" },
  { message: "no paragraph, list item or quote is wider than its box", selector: MAIN, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content p, #sphinx-myst-preview-content li, #sphinx-myst-preview-content blockquote')].every(e => e.scrollWidth <= e.clientWidth + 1)" },
  { message: "the links stay inside the pane", selector: `${MAIN} a`, min: 3, insidePane: true },
  { message: "the text after them continues", selector: `${MAIN} > p`, text: "continues normally" },
];

const CODE_BLOCK_CAPTION_ASSERTIONS: ContentAssertion[] = [
  { message: "the two captioned code blocks and the plain fence are rendered", selector: `${MAIN} pre`, count: 3 },
  { message: "each caption is a title bar of its own code figure", selector: `${MAIN} figure > figcaption`, count: 2 },
  { message: "the plain fence keeps its left-aligned code", selector: `${MAIN} > pre`, count: 1, expr: "['left', 'start'].includes(getComputedStyle(document.querySelector('#sphinx-myst-preview-content > pre')).textAlign)" },
  { message: "the code of a captioned block is left-aligned, not centred", selector: `${MAIN} figure > pre`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure > pre')].every(e => ['left', 'start'].includes(getComputedStyle(e).textAlign) && ['left', 'start'].includes(getComputedStyle(e.querySelector('.myst-code-line, code')).textAlign))" },
  { message: "the caption text is left-aligned and upright", selector: `${MAIN} figure > figcaption`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure > figcaption')].every(e => ['left', 'start'].includes(getComputedStyle(e).textAlign) && getComputedStyle(e).fontStyle === 'normal')" },
  { message: "the caption sits above its code and has the same left edge and width", selector: `${MAIN} figure > figcaption`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure')].every(f => { const c = f.querySelector(':scope > figcaption').getBoundingClientRect(); const p = f.querySelector(':scope > pre').getBoundingClientRect(); return c.bottom <= p.top + 1.5 && Math.abs(c.left - p.left) < 1 && Math.abs(c.right - p.right) < 1; })" },
  { message: "the caption and the code join with a square top edge on the code and rounded top corners on the bar", selector: `${MAIN} figure > pre`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure')].every(f => { const c = getComputedStyle(f.querySelector(':scope > figcaption')); const p = getComputedStyle(f.querySelector(':scope > pre')); return p.borderTopLeftRadius === '0px' && p.borderTopRightRadius === '0px' && c.borderTopLeftRadius === '4px' && c.borderBottomLeftRadius === '0px'; })" },
  { message: "the numbered block keeps its line numbers and its emphasized line", selector: `${MAIN} figure .myst-code-line[data-line-number]`, min: 6 },
  { message: "the emphasized line is still marked", selector: `${MAIN} figure .myst-code-line-emphasized`, count: 1 },
  { message: "the caption text is present", selector: `${MAIN} figure > figcaption`, text: "src/export.py" },
];

const MISSING_IMAGE_ASSERTIONS: ContentAssertion[] = [
  { message: "both image elements stay in the page", selector: `${MAIN} img`, count: 2 },
  { message: "the images keep their alt text", selector: `${MAIN} img`, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content img')].map(i => i.alt).join('|') === 'Diagram of the missing depot loop|Second missing picture'" },
  {
    message: "the paragraph after a missing image follows it in the document order",
    selector: `${MAIN} p`,
    expr: "(() => { const texts = [...document.querySelectorAll('#sphinx-myst-preview-content p')].map(p => p.textContent); return texts.findIndex(t => t.includes('Before the image')) < texts.findIndex(t => t.includes('After the image')); })()",
  },
  { message: "the images do not leave the pane", selector: `${MAIN} img`, insidePane: true },
];

const HUGE_DOCUMENT_ASSERTIONS: ContentAssertion[] = [
  { message: "all 336 sections are rendered", selector: `${MAIN} h2`, count: 336 },
  { message: "the last paragraph is visible after scrolling to the end", selector: `${MAIN} p:last-of-type`, text: "End of the huge document", visible: true },
  {
    message: "the last paragraph lies inside the viewport above its bottom padding",
    selector: `${MAIN} p:last-of-type`,
    expr: "(() => { const box = [...document.querySelectorAll('#sphinx-myst-preview-content p')].pop().getBoundingClientRect(); return box.top >= 0 && box.bottom <= window.innerHeight - 20; })()",
  },
];

const GFM_GALLERY_ASSERTIONS: ContentAssertion[] = [
  { message: "five alerts with their type titles", selector: `${MAIN} aside.admonition`, count: 5, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content aside.admonition > .admonition-title')].map(t => t.textContent.trim()).join(',') === 'Note,Tip,Important,Warning,Caution'" },
  {
    message: "the Caution alert is red like the danger colour and differs from the Warning amber",
    selector: `${MAIN} aside.admonition.caution`,
    count: 1,
    expr: "(() => { const q = (s) => getComputedStyle(document.querySelector('#sphinx-myst-preview-content aside.admonition.' + s + ' > .admonition-title')).color; const probe = document.createElement('span'); probe.style.color = 'var(--vscode-charts-red)'; document.body.append(probe); const red = getComputedStyle(probe).color; probe.remove(); return q('caution') === red && q('caution') !== q('warning'); })()",
  },
  { message: "strikethrough text", selector: `${MAIN} del`, count: 1, text: "struck text" },
  { message: "two footnote references and their texts", selector: `${MAIN} a[data-footnote-ref]`, count: 2, expr: "document.querySelector('#sphinx-myst-preview-content section.footnotes').textContent.includes('Second footnote text.')" },
  { message: "three task list checkboxes, one checked", selector: `${MAIN} input.myst-checkbox`, count: 3, expr: "document.querySelectorAll('#sphinx-myst-preview-content input.myst-checkbox:checked').length === 1" },
  { message: "the table honours column alignment", selector: `${MAIN} table:not(.myst-raw-html-table table) th:nth-child(3)`, css: { textAlign: "right" } },
  { message: "the raw HTML table is rendered", selector: `${MAIN} .myst-raw-html-table`, count: 1, text: "cell two" },
  { message: "the raw details block is rendered", selector: `${MAIN} details`, count: 1, text: "Raw details" },
  { message: "the autolink is a link", selector: `${MAIN} a[data-sphinx-preview-navigation='https://example.com/gfm']`, count: 1 },
];

const MYST_GALLERY_ASSERTIONS: ContentAssertion[] = [
  { message: "a reference links to its label", selector: `${MAIN} a[data-sphinx-preview-navigation='#gallery-target']`, count: 1, text: "Labels and references" },
  { message: "the dropdown is a closed details block with its summary", selector: `${MAIN} details`, count: 1, text: "Read more", expr: "document.querySelector('#sphinx-myst-preview-content details').open === false" },
  { message: "the definition list has two terms", selector: `${MAIN} dl dt`, count: 2 },
  { message: "subscript and superscript", selector: `${MAIN} sub, ${MAIN} sup:not(.footnote-ref):not([data-footnote-ref])`, min: 2 },
  { message: "the kbd role", selector: `${MAIN} kbd`, count: 1, text: "Ctrl+S" },
  { message: "the abbreviation keeps its expansion", selector: `${MAIN} abbr`, count: 1, attr: { name: "title", value: "Heart Rate" } },
  { message: "the footnote text", selector: `${MAIN} section.footnotes`, text: "The MyST footnote text." },
  { message: "the inline math is typeset", selector: `${MAIN} .katex`, min: 1 },
];

const MERMAID_ERROR_ASSERTIONS: ContentAssertion[] = [
  { message: "exactly one visible error message replaces the picture", selector: ".myst-mermaid-error", count: 1, visible: true, text: "Unable to render Mermaid diagram" },
  { message: "the error holds one closed details block with the parser message", selector: ".myst-mermaid-error details.myst-mermaid-error-details", count: 1, expr: "(() => { const d = document.querySelector('.myst-mermaid-error details'); return d.open === false && d.querySelector('pre').textContent.trim().length > 0; })()" },
  { message: "no rendered picture", selector: "img.myst-mermaid-image", count: 0 },
  { message: "the source stays available", selector: "details.myst-mermaid-source", count: 1, text: "flowchart TD" },
  { message: "the text after the diagram continues", selector: `${MAIN} > p`, text: "continues normally" },
];

const INVALID_YAML_ASSERTIONS: ContentAssertion[] = [
  { message: "the parse error is shown as an alert row", selector: "[data-okf-properties] tr.okf-error[role=alert], [data-okf-properties] .okf-error [role=alert]", count: 1, text: "Invalid frontmatter YAML" },
  { message: "the badge counts one error", selector: "[data-okf-badge]", count: 1, attr: { name: "data-okf-errors", value: "1" } },
  { message: "the body is still rendered", selector: `${MAIN} h1`, text: "Body after broken frontmatter" },
  { message: "the body paragraph is rendered", selector: `${MAIN} > p`, text: "still rendered below the parse error" },
];

const STRICT_FIELD_ASSERTIONS: ContentAssertion[] = [
  { message: "the properties table is shown", selector: "[data-okf-properties]", count: 1 },
  { message: "the badge counts one warning", selector: "[data-okf-badge]", count: 1, attr: { name: "data-okf-warnings", value: "1" } },
  { message: "the undeclared field is listed", selector: "[data-okf-properties]", text: "bonus_field" },
];

const PROPERTIES_HIDDEN_ASSERTIONS: ContentAssertion[] = [
  { message: "no properties table", selector: "[data-okf-properties]", count: 0 },
  { message: "the heading still renders", selector: `${MAIN} h1`, text: "Frontmatter Rendering" },
  { message: "the raw YAML is not shown", selector: MAIN, notText: "Preview Team" },
];

const WIDE = { width: 900, height: 1000 };
const NARROW = { width: 460, height: 900 };
const XLARGE = { width: 1600, height: 1100 };

const NARROW360 = { width: 360, height: 800 };

/**
 * P3: the same 40 px gap above the first element in every case. One scenario per case, state and
 * pane width; each writes its measurements to out/reports/visual/first-gap/<id>.json.
 */
const FIRST_GAP_CASES = [
  ["paragraph", "23-first-paragraph", "element"],
  ["h1", "17-wrapped-editing", "element"],
  ["h2", "24-first-h2", "element"],
  ["h3", "25-first-h3", "element"],
  ["table", "26-first-table", "table"],
  ["image", "27-first-image", "element"],
  ["admonition", "28-first-admonition", "element"],
  ["properties", "07-frontmatter", "properties"],
  ["properties-docs", "08-okf-schema", "properties"],
  ["properties-issues", "09-okf-schema-missing-required", "properties"],
  ["empty", "20-empty-document", "empty"],
] as const;

const FIRST_GAP_SCENARIOS: ScenarioDefinition[] = [
  // Edit mode (first block editor open, Start writing) in the three pane widths.
  // (h3 at 460 px renders exactly like h2: the harness rejects identical screenshots.)
  ...FIRST_GAP_CASES.flatMap(([name, fixture, kind]) => [WIDE, NARROW, XLARGE]
    .filter((viewport) => !(name === "h3" && viewport.width === NARROW.width)).map((viewport) => ({
    id: `first-element-gap-${name}-${viewport.width}`,
    fixture,
    theme: (name === "empty" ? "dark" : "light") as "light" | "dark",
    ...viewport,
    scroll: { kind: "top" as const },
    firstElementGap: (viewport.width === 1600 && kind === "element" ? "wide-margin" : kind) as Scenario["firstElementGap"],
    description: `First element: ${name}, edit mode, ${viewport.width}px pane. It starts 40 px below the top `
      + "(preview, edit mode and the open first-block editor with its palette); only a pane of 460 px or "
      + "less may push an interactive element below the toolbar.",
  }))),
  // Read mode, 900 px.
  // (The 07 and 09 read-mode screenshots already exist as frontmatter-light and okf-schema-missing-required-light.)
  ...FIRST_GAP_CASES.filter(([name, , kind]) => kind !== "empty" && !["properties", "properties-issues"].includes(name)).map(([name, fixture, kind]) => ({
    id: `first-element-gap-${name}-read-900`,
    fixture,
    theme: "light" as const,
    ...WIDE,
    scroll: { kind: "top" as const },
    firstElementGap: kind as Scenario["firstElementGap"],
    firstElementGapState: "read" as const,
    description: `Read mode, first element: ${name}. It starts exactly 40 px below the top.`,
  })),
  // A 360 px pane.
  ...FIRST_GAP_CASES.filter(([name]) => ["paragraph", "h1", "table", "properties", "empty"].includes(name))
    .map(([name, fixture, kind]) => ({
      id: `first-element-gap-${name}-360`,
      fixture,
      theme: (name === "empty" ? "dark" : "light") as "light" | "dark",
      ...NARROW360,
      scroll: { kind: "top" as const },
      firstElementGap: kind as Scenario["firstElementGap"],
      description: `First element: ${name}, edit mode, 360 px pane.`,
    })),
  // P8: the floating toolbar on three rows, expanded and collapsed, in every preview theme, wide
  // and at 360 px. The expanded 360 px captures also prove the rows never overlap the text.
  ...(([
    ["light", undefined],
    ["dark", undefined],
    ["light", "white" as const],
    ["light", "cream" as const],
  ] as const).flatMap(([theme, mode]) => ([
    ["expanded", WIDE, "900"],
    ["collapsed", WIDE, "900"],
    ["expanded", NARROW360, "360"],
    ["collapsed", NARROW360, "360"],
  ] as const).map(([state, viewport, label]) => ({
    id: `toolbar-rows-${state}-${mode ?? theme}-${label}`,
    fixture: "32-readme-margin-break",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...viewport,
    scroll: { kind: "top" as const },
    ...(state === "collapsed" ? { toolbarState: "collapsed" as const } : {}),
    description: `Floating toolbar, ${state}, ${mode ?? theme} theme, ${viewport.width} px pane: row 1 Refresh, `
      + "Anchor, Edit and the collapse button; row 2 Back, Next, Zoom -, Zoom +; row 3 Theme, Width, TOC, Diff. "
      + (state === "collapsed" ? "Rows 2 and 3 are hidden." : "No row overlaps the text or another row."),
  })))),
  // Collapsed toolbar: the first element clears the shorter toolbar (P3) at 360 px.
  ...FIRST_GAP_CASES.filter(([name]) => ["paragraph", "table"].includes(name))
    .map(([name, fixture, kind]) => ({
      id: `first-element-gap-${name}-360-collapsed`,
      fixture,
      theme: "light" as const,
      ...NARROW360,
      scroll: { kind: "top" as const },
      toolbarState: "collapsed" as const,
      firstElementGap: kind as Scenario["firstElementGap"],
      description: `First element: ${name}, edit mode, 360 px pane, toolbar collapsed.`,
    })),
  // Auto and Full width modes at 900 px.
  ...(["auto", "full"] as const).flatMap((widthMode) => FIRST_GAP_CASES
    .filter(([name]) => ["paragraph", "properties", "empty"].includes(name))
    .map(([name, fixture, kind]) => ({
      id: `first-element-gap-${name}-${widthMode}-900`,
      fixture,
      theme: (name === "empty" ? "dark" : "light") as "light" | "dark",
      ...WIDE,
      scroll: { kind: "top" as const },
      firstElementGap: kind as Scenario["firstElementGap"],
      firstElementGapWidth: widthMode,
      description: `First element: ${name}, ${widthMode} width mode, 900 px pane: the same 40 px gap.`,
    }))),
  // Dark theme.
  ...(["paragraph", "properties", "table"] as const).map((name) => {
    const [, fixture, kind] = FIRST_GAP_CASES.find(([candidate]) => candidate === name)!;
    return {
      id: `first-element-gap-${name}-dark-900`,
      fixture,
      theme: "dark" as const,
      ...WIDE,
      scroll: { kind: "top" as const },
      firstElementGap: kind as Scenario["firstElementGap"],
      description: `First element: ${name}, dark theme, edit mode, 900 px pane: the same 40 px gap.`,
    };
  }),
];

const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
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
  ...(["light", "dark", "cream"] as const).map((mode) => ({
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
    scroll: { kind: "stickyHeading", value: 'h3[data-line="21"]' },
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
      "Three scroll cycles reach both ends; the final frame returns to the top of the tall frontmatter table.",
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
      "Edit mode remains on after three scroll cycles; the field editor is closed and the final frame is at the top.",
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
  ...([
    ["light", WIDE],
    ["dark", XLARGE],
    ["light", NARROW],
    ["dark", NARROW],
  ] as const).flatMap(([theme, viewport]) => (viewport.width >= 760
    ? (["margin", "auto", "full"] as const)
    : (["margin"] as const)).map((mode) => ({
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
    id: `myst/v${20 + index}-myst-gallery-full-${theme}-900`,
    fixture: "38-myst-gallery",
    theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    fullPage: true,
    contentAssertions: MYST_GALLERY_ASSERTIONS,
    description: `Every MyST construct on one page (label and references, dropdown, definition list, sub and sup, kbd and abbr roles, footnote, math, glossary), ${theme}, 900 px pane.`,
  })),
  ...(["light", "dark"] as const).map((theme, index) => ({
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
  {
    id: "frontmatter-schema/v20-invalid-yaml-dark-900",
    fixture: "41-invalid-yaml",
    theme: "dark",
    ...WIDE,
    scroll: { kind: "top" as const },
    contentAssertions: INVALID_YAML_ASSERTIONS,
    description: "Frontmatter with broken YAML: the preview reports the parse problem and still renders the Markdown body.",
  },
  {
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
    id: "frontmatter-schema/v22-properties-hidden-light-900",
    fixture: "43-properties-hidden",
    theme: "light",
    ...WIDE,
    scroll: { kind: "top" as const },
    render: { propertiesTable: false as const },
    contentAssertions: PROPERTIES_HIDDEN_ASSERTIONS,
    description: "Frontmatter with the properties table setting off: no table is shown and the raw YAML block is not shown either.",
  },
];

/**
 * Every scenario with its permanent id and group. A definition whose id is not a legacy id must
 * already be written as `<group>/vNN-...`; an unknown id or group is an error.
 */
export const SCENARIOS: Scenario[] = SCENARIO_DEFINITIONS
  .filter((definition) => !REMOVED_ALIASES.includes(definition.id))
  .map((definition) => {
    const id = SCENARIO_ID_BY_LEGACY_ID[definition.id] ?? definition.id;
    const group = id.split("/")[0] ?? "";
    if (!isGroupId(group) || id === group) {
      throw new Error(`scenario ${definition.id} has no permanent id <group>/vNN-... in test/visual/scenarioIds.ts`);
    }
    const locks = LOCKS_BY_ID[id];
    if (locks === undefined || locks.trim() === "") {
      throw new Error(`scenario ${id} has no locks statement in LOCKS_BY_ID (test/visual/scenarioIds.ts)`);
    }
    const screenshotOf = definition.screenshotOf === undefined
      ? undefined
      : SCENARIO_ID_BY_LEGACY_ID[definition.screenshotOf] ?? definition.screenshotOf;
    return {
      ...definition,
      id,
      group,
      locks,
      ...(id !== definition.id ? { legacyId: definition.id } : {}),
      ...(ASSERTION_ONLY_IDS.has(id) ? { capture: false as const } : {}),
      ...(STEPS_BY_ID[id] === undefined ? {} : { steps: [...STEPS_BY_ID[id]!] }),
      ...(screenshotOf === undefined ? {} : { screenshotOf }),
      ...(README_BY_ID[id] === undefined ? {} : { readme: { ...README_BY_ID[id]!, crop: [...README_BY_ID[id]!.crop] as ReadmeSource["crop"] } }),
    };
  });
