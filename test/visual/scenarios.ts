/**
 * The screenshot campaign.
 *
 * Every entry names one thing a reader could notice going wrong: a colour that bleeds
 * past a block, a panel that disappears into the page, a scroll position that lands in
 * the wrong place. Each produces a PNG and a sidecar note explaining what to look at.
 */

import { isGroupId, type GroupId } from "../shared/e2eGroups";
import type { ScenarioRenderOptions } from "./renderOptions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import { SCENARIO_DEFINITIONS_1 } from "./scenarioDefinitions1";
import { SCENARIO_DEFINITIONS_2 } from "./scenarioDefinitions2";
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
 * A DOM assertion checked by `check_content_assertions` in capture_final_checks.py. Every given condition must
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

/** A user action `check_page_actions` performs: click (optionally with held keys), hover or drag the first match. */
export type PageAction =
  | { click: string; modifiers?: string[]; waitMs?: number }
  | { hover: string; waitMs?: number }
  /** Presses a keyboard key (Playwright name, such as "ArrowDown") on the page, with no element focused by the script. */
  | { press: string; waitMs?: number }
  /** Presses the mouse on `drag` and moves it over `over`; with `hold` the button stays down (a drag in progress). */
  | { drag: string; over: string; hold?: true; waitMs?: number };

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
  /** Step PNGs to write (names in `STEP_NAMES` of capture_support.py). Omitted: every step the checks produce. */
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
  /** Real clicks and hovers on the page, in order, before the content assertions (P9 B5): `modifiers` are Playwright key names such as "Shift". */
  pageActions?: PageAction[];
  /** Declarative DOM assertions on top of the standard page checks (P9 B4 gap fill). */
  contentAssertions?: ContentAssertion[];
  /** "error": every Mermaid diagram must show its error message and no image (invalid syntax). */
  mermaidExpectation?: "error";
  fixture: string;
  theme: string;
  /** Options of the static page (read-only, strict fields, content width, ...). Default: the standard page. */
  render?: ScenarioRenderOptions;
  /**
   * The PlantUML outcome the page checks. "success", "executable-not-found" and "unconfigured" are
   * rendered by the host through the JAR/PATH pipeline (useJar on); "builtin" and
   * "builtin-unsupported" by the engine bundled into the webview (the default).
   */
  plantumlExpectation?: "success" | "executable-not-found" | "unconfigured" | "builtin" | "builtin-unsupported";
  linkDetailsChecks?: boolean;
  horizontalOverflow?: boolean;
  previewThemeMode?: "white" | "cream" | "dark";
  /** P8: leave the floating toolbar collapsed (rows 2 to 5 hidden) for the checks and the capture. */
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
  /** CR 036: a rich-text (HTML) paste in a paragraph editor becomes Markdown in one undo step; Cmd/Ctrl+Shift+V stays plain. */
  pasteRichTextChecks?: boolean;
  /** CR 050: an image pasted in a paragraph editor (at the end, then mid-line) becomes a paragraph of its own. */
  pasteImageChecks?: boolean;
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
   * CR 123: in a narrow pane the palette wraps onto several rows and takes its real height above
   * the frame: the text box and the figure form start below it, at the top of the page and
   * slightly scrolled, and a tall block opened scrolled keeps its first seen row visible under the
   * stuck bar. `first-paragraph`: only the first paragraph, opened at the top. Steps: `text`,
   * `figure`, `tall` (v28 writes none: its open editor is the CR 112 tooltip scenario's frame).
   */
  paletteClearance?: boolean | "first-paragraph";
  /**
   * CR 161: in a 420 px pane the Edit figure button of a short figure takes the press next to the
   * five-row preview controls and the form it opens starts below the palette. Step: `figure`.
   */
  figureButton?: boolean;
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
  paletteModeShot?: "strict" | "gfm" | "myst" | "full";
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
  /** Switches the Width button to this mode and nothing else; the scenario's content assertions measure the result. */
  widthModeSwitch?: "auto";
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
  /** The toolbar Comments button hides the gray and the thread chips (TODO stays) and brings them back. */
  commentButtonThreadChecks?: boolean;
  /** A refused checkbox toggle puts the box back and shows the reason next to it. */
  checkboxRefusalChecks?: boolean;
  /** Opens and closes an inline comment thread, checks its box, the reply and delete controls and the show-comments switch. */
  inlineThreadChecks?: boolean;
  /**
   * CR 046: sends a content patch with updated ranges (reduced motion first, then motion on), checks
   * that exactly the updated blocks glow, readable and without moving anything, and leaves the glow
   * paused at its start for the screenshot.
   */
  updateGlowChecks?: true;
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
  /** The copy button is reached with the keyboard: focus on the first code block reveals it, Tab focuses it, Enter copies. */
  codeCopyKeyboardChecks?: boolean;
  expectStickyGrowth?: boolean;
  /** Geometry checks (test/shared/geometry-checks.js) that fail this scenario when applicable and failing. */
  machineChecks?: string[];
  description: string;
}

/** Every scenario as written, in campaign order. */
const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [...SCENARIO_DEFINITIONS_1, ...SCENARIO_DEFINITIONS_2];

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
