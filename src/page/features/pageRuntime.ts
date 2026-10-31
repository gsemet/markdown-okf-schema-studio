/**
 * The contract between the feature modules of the page runtime (see `../runtime.ts`): the page
 * services every feature reads, the state several features share, the open editors, and the API of
 * each feature. A feature module receives the {@link PageRuntime} and reaches another feature only
 * through it (`rt.scroll.applyAnchor()`), never by importing it, so features can call each other in
 * both directions. The runtime fills every slot before it binds the first listener, and no feature
 * calls another one while it is being installed.
 */

import type { PreviewEditCommandName } from "../../core/protocol/hostToPage";
import type { PreviewRuntimeContext } from "../../core/protocol/bootContext";
import type {
  NavigateAnchorMessage,
  PreviewBlockMoveResultMessage,
  PreviewBlocksResultMessage,
  PreviewContentPatchMessage,
  PreviewEditSourceMessage,
  PreviewFrontmatterResultMessage,
  SourceScrollMessage,
} from "../../core/protocol/hostToPage";
import type { AnchorPolicy, ScrollAnchor } from "../../core/scroll/anchorPolicy";
import type { HostMessageRouter } from "../hostMessages";
import type { createBlockSelection } from "../modules/blockSelection";
import type { installChipToggle } from "../modules/chipToggle";
import type { installTabs } from "../modules/tabs";
import type { installCodeCopy } from "../modules/codeCopy";
import type { installCommentCompose } from "../modules/commentCompose";
import type { installCommentThreads } from "../modules/commentThreads";
import type { ContentMorph } from "../modules/contentMorph";
import type { EditActionRegistry } from "../modules/editActions";
import type { EditPalette } from "../modules/editPalette";
import type { FigureTools } from "../modules/figureDirective";
import type { FigureEditButton, FigurePanel } from "../modules/figurePanel";
import type { installFirstClearance } from "../modules/firstClearance";
import type { FindBar } from "../modules/findBar";
import type { HeadingFold } from "../modules/headingFold";
import type { installHistoryControls } from "../modules/historyControls";
import type { HostRequests } from "../modules/hostRequests";
import type { installIncomingChanges } from "../modules/incomingChanges";
import type { installInlineThreads } from "../modules/inlineThread";
import type { installLabelRename } from "../modules/labelRename";
import type { installLinkNavigation } from "../modules/linkNavigation";
import type { LinkPanel } from "../modules/linkPanel";
import type { MarkdownTableModel, MarkdownTableTools } from "../modules/markdownTable";
import type { installMotion } from "../modules/motion";
import type { PasteHtml } from "../modules/pasteHtml";
import type { PasteImage } from "../modules/pasteImage";
import type { PasteUrl } from "../modules/pasteUrl";
import type { SlashMenu } from "../modules/slashMenu";
import type { createTextEditingTools, TextEdit } from "../modules/textEditing";
import type { installTocColumn } from "../modules/tocColumn";
import type { installWarningBanner } from "../modules/warningBanner";
import type { installWidthMode } from "../modules/widthMode";
import type { installViewControls } from "../modules/viewControls";
import type { PageBus, PageEvents } from "../pageBus";
import type { PageDiagnostics } from "../pageDiagnostics";
import type { PageHost, PageHostApi } from "../pageHost";
import type { PageSettings } from "../pageSettings";
import type { AnchorMode } from "./anchorMode";
import type { Checkboxes } from "./checkboxes";
import type { LinkTooltip } from "./linkTooltip";
import type { StatusRegion } from "./statusRegion";
import type { StickyHeadings } from "./stickyHeadings";
import type { ThemeMode } from "./themeMode";

/** The palette modes of the block editor (see `PALETTE_MODES`). */
export type PaletteMode = "strict" | "gfm" | "myst" | "full";

/**
 * Where the caret goes in a text box that opens: its start, the end of its text, a text offset, or
 * the rendered text around a click (mapped back to the source by `mapRenderedCaret`).
 */
export type CaretPosition = "start" | "end" | CaretPoint;

/** A caret given by offset (`offset`) or by the rendered text around it (`before`, `after`). */
export interface CaretPoint {
  offset?: number;
  before?: string;
  after?: string;
}

/** A measured mapped block of the page (see `parseMappings`). */
export interface LayoutEntry {
  element: HTMLElement;
  sourceLine: number;
  endLine: number;
  /** Document y of the soft-wrapped source lines after the first, when they could be measured. */
  lineTops?: number[];
  top: number;
  height: number;
  domOrder: number;
}

/** While an inline editor is open: the element kept still on screen, and its viewport top. */
export interface EditAnchor {
  element: Element;
  viewportTop: number;
}

/** A text box of an editor that takes a native text edit (the block text box or a cell box). */
export type TextControl = HTMLTextAreaElement | HTMLInputElement;

/** A text edit applied to a text box: the replaced range, its text and the selection after it. */
export type ControlTextEdit = TextEdit;

/**
 * The open block editor: a raw Markdown text box under a block, an insertion (`insertAfterLine`), or
 * the cell editor of a pipe table (`selectedCell`, with the row and column indices of the rendered
 * table). The fields after `initialCaretPosition` arrive with the source (`previewEditSource`) or as
 * the editor builds its parts. `tableRowIndex` and `tableColumnIndex` are set whenever
 * `selectedCell` is; the code that reads them has checked the cell editor first and asserts them.
 */
export interface BlockEdit {
  target: HTMLElement;
  renderedTarget: HTMLElement;
  element: HTMLElement;
  status: HTMLElement;
  editId: string;
  line: number;
  endLine: number;
  insertAfterLine?: number;
  selectedCell?: HTMLTableCellElement;
  renderedCellContent?: HTMLElement;
  tableRowIndex?: number;
  tableColumnIndex?: number;
  initialCaretPosition: CaretPosition;
  /** The element that held the focus when the editor opened (its source was not there yet). */
  focusAtOpen?: Element | null;
  /** The host refused to open this editor: the frame holds the reason and a way out. */
  openRefused?: boolean;
  originalText?: string;
  lastPostedText?: string;
  hasAutosavedChange?: boolean;
  finishing?: boolean;
  trailingLineEnding?: string;
  textarea?: HTMLTextAreaElement;
  tableInput?: HTMLTextAreaElement;
  tableModel?: MarkdownTableModel;
  /** The text of a table conversion waiting to be saved (any later change drops it). */
  convertedText?: string;
  resizeTextarea?: () => void;
  autosaveTimer?: number;
  tableMenu?: HTMLElement;
  tableMenuHeight?: number;
  tableMenuPositionListener?: () => void;
  actionButtons?: HTMLButtonElement[];
  palette?: EditPalette;
  paletteHeight?: number;
  cellPalette?: EditPalette;
  slashMenu?: SlashMenu;
  cellSlash?: SlashMenu;
  linkPanel?: LinkPanel;
  closeLinkPanel?: (restore?: boolean) => void;
  linkPanelShift?: number;
  figurePanel?: FigurePanel;
  closeFigurePanel?: (restore?: boolean) => void;
  figurePanelShift?: number;
  /** How far opening the palette and panels scrolled the page down (a close scrolls it back). */
  paletteShift?: number;
  /** The distance the frame reserves under the sticky palette riding down over it (px; 0 when none). */
  paletteReserve?: number;
  /** The pane, bar and tall state the tall frame's sticking line was measured for ("" when not tall). */
  paletteTopKey?: string;
  /** The element that holds the palette above the frame. */
  host?: HTMLElement;
  hintReplaced?: boolean;
  /** The host waits for `previewEditClosed` of this editor (STAB-03). */
  reportClose?: boolean;
  /** The Edit figure button opened this editor: show the figure form once the source is in. */
  openFigureForm?: boolean;
}

/**
 * The value control of a frontmatter editor: a select, a text area, an input, or the group element
 * of the list editor. The list editor's group is a `div` on which the editor sets `disabled` as a
 * plain property, as on the other controls; `value`, `checked`, `rows`, `type` and `step` are only
 * read on the controls that have them.
 */
export type FrontmatterControl = HTMLElement & {
  value: string;
  disabled: boolean;
  checked: boolean;
  rows: number;
  type: string;
  step: string;
};

/** The open frontmatter editor: the value editor of a field, or the editor of its key. */
export interface FrontmatterEdit {
  row?: Element;
  valueCell: Element;
  displayElement: Element | null | undefined;
  editor: HTMLElement;
  /** The value control (see {@link FrontmatterControl}) or the key's text input. */
  control: HTMLElement & { disabled: boolean };
  status: HTMLElement;
  editId?: string;
  saving?: boolean;
  fieldName: string;
  fieldValue: unknown;
  setNullButton?: HTMLButtonElement;
  setDisabled?: (disabled: boolean) => void;
  cancel(): void;
  save?: () => void;
  resizeTextarea?: () => void;
  /** A plain save (Enter, blur) waits for its result; a navigation waits for it too (CR 025). */
  plainSavePending?: boolean;
  /** Runs once the result of the pending save arrives. */
  afterResult?: () => void;
  /**
   * The text the control held when the host refused its last save (CR 218). While the control
   * still holds it, a blur posts nothing again and a click on another field closes the editor.
   */
  refusedText?: string;
  /** Focuses the control of an editor that is not a single text control (the list editor). */
  focusControl?: () => void;
  frontmatterMenu?: HTMLElement;
  frontmatterMenuPositionListener?: undefined;
}

/** A block editor to open once the save of the current one is rendered. */
export interface PendingBlockNavigation {
  thenMove?: { direction: "up" | "down"; caretOffset: number };
  blockId?: string;
  sourceLine: number;
  caretPosition: CaretPosition;
  tableRowIndex?: number;
  tableColumnIndex?: number;
}

/** Where a moved block selection is restored, by ordinal among the body blocks. */
export interface PendingMoveSelection {
  anchor: number;
  target: number;
  count: number;
  documentId: string;
  version: number;
  at: number;
}

/** After a frontmatter field was added: the field whose editor the next render opens. */
export interface PendingFrontmatterEdit {
  fieldName: string;
  requestId?: number;
}

/** A block selection read by position: the index among the body blocks and the block count. */
export interface SelectionAnchor {
  index: number;
  count: number;
}

/** A block selection that waits for the save of the open editor. */
export interface PendingBlockSelection {
  anchor: SelectionAnchor | undefined;
  targetIndex: number;
  count: number;
  /** Select without scrolling the page (the block of an editor that closed by keyboard). */
  quiet?: boolean;
}

/** What the runtime reads from the saved state of the page at startup. */
export interface RuntimeSavedState {
  documentId?: string;
  descriptionsCollapsed?: boolean;
  editMode?: unknown;
  paletteMode?: string;
  pendingBlockNavigation?: PendingBlockNavigation;
  pendingMoveSelection?: PendingMoveSelection;
  pendingFrontmatterEdit?: PendingFrontmatterEdit;
  pendingFrontmatterEditOpenedIn?: number;
}

/** The state several features read and write. */
export interface PageRuntimeState {
  /** Clicks and keys edit the document. */
  editMode: boolean;
  paletteMode: PaletteMode;
  /** The Description column of the properties table is collapsed. */
  descriptionsCollapsed: boolean;
  activeBlockEdit: BlockEdit | undefined;
  activeFrontmatterEdit: FrontmatterEdit | undefined;
  /** Numbers the edit ids of this page. */
  editSequence: number;
  /** The single scroll anchor of this preview (see anchorPolicy.ts / docs/scroll-anchoring.md). */
  anchor: ScrollAnchor | undefined;
  /** While an inline editor is open, layout changes keep the edited block still on screen. */
  editAnchor: EditAnchor | undefined;
  /** True when this load restored the pinned position; previewReady then reports the pinned anchor. */
  pinApplied: boolean;
  /** True while the open editors are flushed: their saves keep the typed text as it is. */
  flushingEditors: boolean;
  /** True while a content patch closes the block editor. */
  applyingContentPatch: boolean;
  pendingBlockSelection: PendingBlockSelection | undefined;
  pendingBlockNavigation: PendingBlockNavigation | undefined;
  /**
   * After a move of a block selection: where the selection sits once the move is rendered. Kept in
   * the saved state so a full reload of the page (not only a content patch) restores it.
   */
  pendingMoveSelection: PendingMoveSelection | undefined;
  pendingFrontmatterEdit: PendingFrontmatterEdit | undefined;
  /** The requestId of the render whose load opened the editor for the pending edit. */
  pendingEditOpenedIn: number | undefined;
  /** Latest properties-table markup the host sent while a frontmatter editor was open (T30). */
  deferredPropertiesMarkup: string | undefined;
  deferredPropertiesSeq: number | undefined;
}

/** The pure tools of the page (no DOM state of their own). */
export interface PageTools {
  readonly tableTools: MarkdownTableTools;
  readonly textEditing: ReturnType<typeof createTextEditingTools>;
  readonly blockSelection: ReturnType<typeof createBlockSelection>;
  readonly editActions: EditActionRegistry;
  readonly figureTools: FigureTools;
}

/** The page modules the runtime installed (toolbar, comments, motion, layout helpers). */
export interface PageParts {
  contentMorph: ContentMorph;
  stickyBand: StickyHeadings;
  statusRegion: StatusRegion;
  commentThreads: ReturnType<typeof installCommentThreads>;
  commentCompose: ReturnType<typeof installCommentCompose> | undefined;
  linkNavigation: ReturnType<typeof installLinkNavigation>;
  firstClearance: ReturnType<typeof installFirstClearance>;
  codeCopy: ReturnType<typeof installCodeCopy>;
  labelRename: ReturnType<typeof installLabelRename>;
  hostRequests: HostRequests;
  plantUmlFileRequests: HostRequests;
  pasteImage: PasteImage;
  pasteHtml: PasteHtml;
  pasteUrl: PasteUrl;
  warningBanner: ReturnType<typeof installWarningBanner>;
  figureEditButton: FigureEditButton;
  chipToggle: ReturnType<typeof installChipToggle>;
  tabs: ReturnType<typeof installTabs>;
  incomingChanges: ReturnType<typeof installIncomingChanges>;
  motion: ReturnType<typeof installMotion>;
  historyControls: ReturnType<typeof installHistoryControls>;
  viewControls: ReturnType<typeof installViewControls>;
  widthMode: ReturnType<typeof installWidthMode>;
  tocColumn: ReturnType<typeof installTocColumn>;
  headingFold: HeadingFold;
  find: FindBar;
  themeMode: ThemeMode;
  anchorMode: AnchorMode;
  checkboxes: Checkboxes;
  inlineThreads: ReturnType<typeof installInlineThreads>;
  linkTooltip: LinkTooltip;
}

/** Reads the mapped blocks of the page (`features/mappedBlocks.ts`). */
export interface MappedBlocks {
  /** The mapped blocks of this document that no other mapped block contains, by source line. */
  topLevelMappedBlocks(): HTMLElement[];
  /** The mapped blocks one level inside `block` (its nearest mapped descendants), by source line. */
  mappedChildren(block: Element): HTMLElement[];
  /** The top-level blocks without the properties section. */
  selectableBlocks(): HTMLElement[];
  /** The first and last source line of a block. */
  blockRange(block: Element): { line: number; endLine: number };
  /** True for a block that comes from an included file. */
  isIncludedBlock(block: Element): boolean;
  /** The body block that starts at `line`. */
  bodyBlockAtLine(line: number): HTMLElement | undefined;
  /** The properties section (frontmatter table), if the page shows one. */
  propertiesSection(): HTMLElement | null | undefined;
  /** The element an edit of `target` opens on: its whole list, with the list's source range. */
  editingElementFor(target: HTMLElement): { element: HTMLElement; sourceRange: { line: number; endLine: number } | undefined };
  /** True when the page shows a rendered preview (not a status page). */
  hasRenderedPreview(): boolean;
}

/** Scroll sync, anchoring and layout (`features/scrollCore.ts`). */
export interface ScrollCore {
  /** Saves the panel state (throttled while scrolling) and returns it. */
  stateSnapshot(line: number | undefined, throttled?: boolean): PanelStateSnapshot;
  /** The source line at a scroll position. */
  lineAtScroll(scrollTop: number): number | undefined;
  maxScrollTop(): number;
  /** Scrolls without the scroll event being taken as a user scroll. */
  programmaticScroll(top: number): void;
  /** Re-applies the anchor after a layout change. */
  applyAnchor(): void;
  /** Keeps `element` still on screen while an inline editor is open. */
  beginEditAnchor(element: Element | undefined): void;
  /** The anchor line every edit message carries. */
  anchorField(): { anchorLine?: number };
  /** The pin of a frontmatter save (the properties section). */
  frontmatterPinFields(cell: Element | undefined): PinFields;
  /** The pin of a final block save. */
  blockPinFields(edit: BlockEdit): PinFields;
  restoreState(): void;
  /** Measures the mapped blocks and rebuilds the anchor map. */
  measure(): void;
  /** Re-measures on the next frame and re-applies the anchor. */
  stabilizeLayout(): void;
  markWideTables(): void;
  /** Keeps the source line at the reading line across a layout change (zoom, chips, width). */
  keepReadingLine(): void;
  /** Puts an element at the reading line, below the sticky heading band. */
  revealElement(target: Element): void;
  /** `sourceScroll`: the text editor scrolled or its selection moved. */
  followSourceScroll(message: SourceScrollMessage): void;
  /** `navigateAnchor`: a same-page link. */
  navigateToAnchor(message: NavigateAnchorMessage): void;
  /** Binds the window scroll and resize listeners. */
  bindWindow(): void;
  /** Re-measures when the content changes size. */
  observeContent(): void;
}

/** The pin fields of a final save (rule R7), or none. */
export type PinFields = { pinLine: number; pinViewportTop: number } | Record<string, never>;

/** The panel state the page saves and reports. */
export interface PanelStateSnapshot {
  documentId: string;
  sourceFile: string;
  sourceLine: number | undefined;
  scrollTop: number;
  focusedBlockId?: string;
  selectedText?: string;
  openDisclosures?: number[];
  [key: string]: unknown;
}

/** Keyboard and text helpers of the editor text boxes (`features/textControls.ts`). */
export interface TextControls {
  /** The block-to-block move of an arrow key at the edge of a text box. */
  boundaryNavigation(control: TextControl, event: KeyboardEvent): { step: number; caretPosition: "start" | "end" } | undefined;
  homeEndInControl(event: KeyboardEvent, control: TextControl): boolean;
  /** Keeps Cmd/Ctrl+Z and +Y in the text box (the host editor never sees them). */
  keepUndoInControl(event: KeyboardEvent): boolean;
  /** Cancels the native action of the VS Code undo, redo, select-all and delete-line keys; they reach VS Code. */
  hostEditKey(event: KeyboardEvent): boolean;
  /** Applies a command VS Code's key binding ran to the focused text box; false when none has the focus. */
  runEditCommand(command: PreviewEditCommandName): boolean;
  wrapSelectionInControl(event: KeyboardEvent, control: TextControl, onFallbackInput: () => void): boolean;
  paletteShortcut(event: KeyboardEvent, control: TextControl, onFallbackInput: () => void): boolean;
  applyTextEdit(control: TextControl, rawEdit: ControlTextEdit, onFallbackInput: () => void): void;
  focusTextControlAtLastContent(control: HTMLElement, caretPosition?: CaretPosition): void;
  /** A text field outside the editor frame took the focus after the editor opened (the find field). */
  focusMovedToAnotherField(edit: { element: HTMLElement; focusAtOpen?: Element | null }): boolean;
}

/** The block editor: open, save, autosave, close, flush (`features/blockEditor.ts`). */
export interface BlockEditor {
  openBlockEditor(target: HTMLElement, selectedCell: HTMLTableCellElement | undefined,
    sourceRange: { line: number; endLine: number; insertAfterLine?: number } | undefined,
    initialCaretPosition?: CaretPosition): void;
  closeBlockEdit(cancel?: boolean): void;
  postEditClosed(editId: string): void;
  postBlockEditSave(final: boolean): boolean | undefined;
  autosaveBlockEdit(): void;
  saveBlockEdit(): void;
  cancelBlockEdit(): void;
  flushOpenEditorsThen(navigate: (flushed: boolean) => void): void;
  clearPendingBlockNavigation(): void;
  rememberPendingBlockNavigation(target: Element, caretPosition: CaretPosition, selectedCell?: HTMLTableCellElement,
    explicitIndices?: { tableRowIndex: number; tableColumnIndex: number },
    thenMove?: { direction: "up" | "down"; caretOffset: number }): void;
  createEditorButtons(edit: BlockEdit): HTMLElement;
  blockEditHint(edit: BlockEdit): string;
  moveBlockFromEditor(event: KeyboardEvent, control: TextControl): boolean;
  navigateBlockEdit(event: KeyboardEvent, control: TextControl): boolean;
  hideTableCellContent(cell: HTMLTableCellElement): HTMLElement;
  restoreTableCellContent(edit: BlockEdit): void;
  /** Saves pending work when the page is hidden or goes away. */
  bindPageHide(): void;
}

/** The text box of the block editor, built when the source arrives (`features/blockSourceEditor.ts`). */
export interface BlockSourceEditor {
  receiveBlockEditSource(message: PreviewEditSourceMessage): void;
}

/** The palette, panels and toolbars around an open editor (`features/editorChrome.ts`). */
export interface EditorChrome {
  toolbarUsableTop(bar: { top: number; left: number; right?: number; width: number }, content?: Element): number;
  revealTableToolbar(menu: HTMLElement, cell: Element): void;
  placePaletteAboveFrame(edit: BlockEdit, paletteElement: HTMLElement): void;
  syncPaletteSticky(edit: BlockEdit): void;
  reservePaletteClearance(edit: BlockEdit): void;
  revealCaretBelowPalette(edit: BlockEdit, textarea: HTMLTextAreaElement): void;
  frameContains(edit: BlockEdit, node: Node | null | undefined): boolean;
  keepTextInPlaceBelowPalette(edit: BlockEdit, textTopBefore: number | undefined): number;
  openLinkPanel(control: TextControl, onFallbackInput: () => void): void;
  openFigurePanel(control: HTMLTextAreaElement, onFallbackInput: () => void, first?: boolean, focus?: "caption"): void;
  openFigureEditor(figure: HTMLElement): void;
  /** Keeps the palette sticky state right on resize and scroll. */
  bindPaletteSticky(): void;
}

/** The cell editor of a pipe table (`features/tableCellEditor.ts`). */
export interface TableCellEditor {
  switchTableCell(edit: BlockEdit, selectedCell: HTMLTableCellElement, caretPosition: CaretPosition): void;
  renderTableCellEditor(edit: BlockEdit): void;
  /** Binds the pointer tracking and the Escape key of the cell editor. */
  bindKeys(): void;
}

/** The frontmatter editors of the properties table (`features/frontmatterEditor.ts`). */
export interface FrontmatterEditor {
  openFrontmatterEditor(row: Element, options?: { newField?: boolean; toggleBoolean?: boolean }): void;
  openFrontmatterKeyEditor(row: Element, nameCell: Element): void;
  closeFrontmatterEditor(reason?: string): void;
  applyPropertiesMarkup(markup: string, seq: number | undefined): void;
  receiveFrontmatterResult(message: PreviewFrontmatterResultMessage): void;
  setFrontmatterEditCells(enabled: boolean): void;
  /** Posts an add or remove of a field from the field menu. */
  postFrontmatterAction(edit: FrontmatterEdit, action: "add" | "remove", fieldName: string, fieldValue: unknown,
    afterField?: string): void;
  consumePendingFrontmatterEdit(): void;
  resumePendingFrontmatterEdit(): void;
  /** Saves the open frontmatter editor as a flush; true when a save was posted. */
  flushFrontmatterEditor(): boolean;
  /** True while the open editor is idle and still holds the text of its refused save (CR 218). */
  holdsRefusedText(): boolean;
  /**
   * Closes, without a save, an editor that still holds its refused text when another field's
   * cell is clicked (CR 218); true when it closed.
   */
  closeRefusedEditorFor(cell: Element): boolean;
  /** Binds Escape inside the properties section. */
  bindKeys(): void;
}

/** Block selection, and copy, cut and paste of blocks (`features/blockSelectionView.ts`). */
export interface BlockSelectionView {
  syncSelectionModel(): HTMLElement[];
  renderBlockSelection(blocks: HTMLElement[]): void;
  clearBlockSelection(keepPending?: boolean): void;
  rememberSelectionAnchor(block: Element | undefined): void;
  selectBlocksNow(anchor: SelectionAnchor | undefined, targetIndex: number, scroll?: boolean): void;
  selectBlocksTo(node: Element): void;
  applyPendingBlockSelection(): void;
  /**
   * Runs `action` (cancel or save of the open block editor) and leaves the edited block selected,
   * so the arrow keys carry on from it (keyboard-only editing).
   */
  finishEditorWithSelection(kind: "cancel" | "save", action: () => void): void;
  receiveBlocksResult(message: PreviewBlocksResultMessage): void;
  bindKeys(): void;
}

/** One move of the insertion bar under a body block. */
export interface InsertMove {
  block: HTMLElement;
  previous: HTMLElement | undefined;
  next: HTMLElement | undefined;
}

/** Block insertion points of edit mode (`features/insertPoints.ts`). */
export interface InsertPoints {
  /** The insertion bars of the page, in document order. */
  points(): HTMLElement[];
  /** The move of each insertion bar that has one. */
  readonly moves: Map<Element, InsertMove>;
  refreshInsertPoints(): void;
  /** The top-level block a focused or clicked node belongs to (the block of a bar's buttons too). */
  blockOfTarget(target: Element): HTMLElement | undefined;
  bindKeys(): void;
}

/** Moves of blocks and block selections (`features/blockMoves.ts`). */
export interface BlockMoves {
  /** True while a keyboard move waits for its result and render. */
  inFlight(): boolean;
  requestBlockMove(block: HTMLElement, direction: "up" | "down", mode: "edit" | "focus", caretOffset?: number): boolean;
  bodyBlockNeighbour(block: HTMLElement, direction: "up" | "down"): HTMLElement | undefined;
  moveChordDirection(event: KeyboardEvent, inEditor: boolean): "up" | "down" | undefined;
  updateMoveLabels(blocks: HTMLElement[]): void;
  addMoveButtons(point: HTMLElement, move: InsertMove): void;
  resumeBlockMove(): void;
  resumeMoveSelection(): void;
  receiveBlockMoveResult(message: PreviewBlockMoveResultMessage): void;
  bindKeys(): void;
}

/** The row and column handles of pipe tables and list-tables and their moves (`features/tableRowMove.ts`). */
export interface TableRowMove {
  /**
   * Rebuilds the handles: one per body row and one per column of a movable table in edit mode,
   * none otherwise.
   */
  refresh(): void;
  /** Takes the table source a move asked for; false when the message is not for a move. */
  receiveSource(message: PreviewEditSourceMessage): boolean;
}

/** Edit mode, the edit hover, and opening the editor of a clicked block (`features/editMode.ts`). */
export interface EditMode {
  applyEditMode(enabled: boolean): void;
  setEditHover(element: Element | undefined): void;
  openMappedEditor(target: HTMLElement, eventTarget: Element, initialCaretPosition?: CaretPosition, reveal?: boolean): void;
  clickCaretContext(target: HTMLElement, eventTarget: Element, x: number, y: number): CaretPoint | undefined;
  resumePendingBlockNavigation(): void;
  /** The edit mode toggle of the toolbar. */
  bindButton(): void;
  /** The edit hover follows the pointer and the focus. */
  bindHover(): void;
}

/** Content patches, content initialization and `previewReady` (`features/contentPatch.ts`). */
export interface ContentPatch {
  applyContentPatch(message: PreviewContentPatchMessage): void;
  initializeContent(options: { restore: boolean }): void;
  postPreviewReady(): void;
}

/** The document clicks and keys that reveal or edit blocks (`features/pageInput.ts`). */
export interface PageInput {
  refreshPreview(): void;
  applyDescriptionVisibility(): void;
  bindClicks(): void;
}

/** The page runtime: services, shared state and features. */
export interface PageRuntime {
  readonly document: Document;
  readonly window: Window & typeof globalThis;
  /** The boot context; a content patch moves its render identity. */
  readonly context: PreviewRuntimeContext;
  /** Messages and saved state (the webview API in VS Code). */
  readonly host: PageHostApi;
  readonly pageHost: PageHost;
  readonly settings: PageSettings;
  readonly anchorPolicy: AnchorPolicy;
  readonly diagnostics: PageDiagnostics;
  readonly bus: PageBus<PageEvents>;
  readonly hostMessages: HostMessageRouter;
  readonly tools: PageTools;
  readonly state: PageRuntimeState;
  refreshButton: HTMLButtonElement | null | undefined;
  editModeButton: HTMLElement | null | undefined;
  parts: PageParts;
  blocks: MappedBlocks;
  scroll: ScrollCore;
  textControls: TextControls;
  blockEditor: BlockEditor;
  blockSourceEditor: BlockSourceEditor;
  editorChrome: EditorChrome;
  tableCellEditor: TableCellEditor;
  frontmatter: FrontmatterEditor;
  selection: BlockSelectionView;
  insertPoints: InsertPoints;
  blockMoves: BlockMoves;
  tableRowMove: TableRowMove;
  editMode: EditMode;
  contentPatch: ContentPatch;
  input: PageInput;
}

/** The selector of the mapped blocks of the rendered content. */
export const MAPPINGS_SELECTOR = "[data-sphinx-source-file][data-sphinx-source-line]";
