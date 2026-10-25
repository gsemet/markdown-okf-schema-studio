/**
 * The preview page runtime: scroll sync, block and frontmatter editing, toolbar, comments, TOC and
 * content patches. {@link startPreviewRuntime} runs once per page load with the boot context the
 * host wrote into the page and the transport to the host (see `./main.ts`).
 *
 * This file only composes the page: it installs the page modules (`./modules/`) and the features
 * (`./features/`), then binds their listeners. The features share one {@link PageRuntime} (see
 * `./features/pageRuntime.ts`). The order of the steps below is part of the behaviour:
 *   - listeners of the same event on the same target run in the order they were added, and some
 *     stop the others (a checkbox or badge click never edits its block, an edit-mode click on a
 *     link value edits it instead of navigating), so every `install…` and `bind…` call keeps its
 *     place;
 *   - the saved state is read after the page modules that write it at install;
 *   - no feature runs before every slot of the runtime is filled.
 */

import { DEFAULT_EDITING_CONFIGURATION, PALETTE_MODES } from "../core/configuration/editingConfiguration";
import type { PreviewRuntimeContext } from "../core/protocol/bootContext";
import { createAnchorPolicy } from "../core/scroll/anchorPolicy";
import { HIGHLIGHT_LANGUAGES } from "./buildConstants";
import { installAnchorMode } from "./features/anchorMode";
import { installBlockEditor } from "./features/blockEditor";
import { installBlockMoves } from "./features/blockMoves";
import { installBlockSelectionView } from "./features/blockSelectionView";
import { installBlockSourceEditor } from "./features/blockSourceEditor";
import { installCheckboxes } from "./features/checkboxes";
import { installContentPatch } from "./features/contentPatch";
import { installEditMode } from "./features/editMode";
import { installEditorChrome } from "./features/editorChrome";
import { installFrontmatterEditor } from "./features/frontmatterEditor";
import { registerHostHandlers } from "./features/hostHandlers";
import { installInsertPoints } from "./features/insertPoints";
import { installLinkTooltip } from "./features/linkTooltip";
import { createMappedBlocks } from "./features/mappedBlocks";
import { bindEditModeCaptureClicks, installPageInput } from "./features/pageInput";
import type { PageRuntime, PageRuntimeState, PaletteMode, RuntimeSavedState } from "./features/pageRuntime";
import { installRendererBridge } from "./features/rendererBridge";
import { installScrollCore } from "./features/scrollCore";
import { installStatusRegion } from "./features/statusRegion";
import { installStickyHeadings } from "./features/stickyHeadings";
import { installTableCellEditor } from "./features/tableCellEditor";
import { installTableRowMove } from "./features/tableRowMove";
import { installTextControls } from "./features/textControls";
import { installThemeMode } from "./features/themeMode";
import { createPageHostMessages } from "./hostMessages";
import type { HostTransport } from "./hostTransport";
import { createBlockSelection } from "./modules/blockSelection";
import { installChipToggle } from "./modules/chipToggle";
import { installCodeCopy } from "./modules/codeCopy";
import { installCommentCompose } from "./modules/commentCompose";
import { installCommentThreads } from "./modules/commentThreads";
import { installCommentsToggle } from "./modules/commentsToggle";
import { installContentMorph, morphKey, planKeyedMorph } from "./modules/contentMorph";
import { createEditActions } from "./modules/editActions";
import { createFigureTools } from "./modules/figureDirective";
import { installFigureEditButton } from "./modules/figurePanel";
import { installFirstClearance } from "./modules/firstClearance";
import { installHistoryControls } from "./modules/historyControls";
import { installHostRequests, type HostResult } from "./modules/hostRequests";
import { installIncomingChanges } from "./modules/incomingChanges";
import { installIncomingToggle } from "./modules/incomingToggle";
import { installInlineThreads } from "./modules/inlineThread";
import { installLabelRename } from "./modules/labelRename";
import { installLinkNavigation } from "./modules/linkNavigation";
import { createMarkdownTableTools } from "./modules/markdownTable";
import { installMotion } from "./modules/motion";
import { installPasteHtml } from "./modules/pasteHtml";
import { installPasteImage } from "./modules/pasteImage";
import { installPlantUmlFileRequests, PLANTUML_FILE_REQUEST_TIMEOUT_MS } from "./modules/plantumlFileRequests";
import { isSafeOkfColor } from "./modules/spanColors";
import { createTextEditingTools } from "./modules/textEditing";
import { installTocColumn } from "./modules/tocColumn";
import { installToolbarCollapse } from "./modules/toolbarCollapse";
import { installViewControls } from "./modules/viewControls";
import { installWarningBanner, warningBannerState, warningBannerText } from "./modules/warningBanner";
import { installWidthMode } from "./modules/widthMode";
import { createPageBus, type PageEvents } from "./pageBus";
import { installPageDiagnostics } from "./pageDiagnostics";
import { createPageHost } from "./pageHost";
import { pageSettings, stickyHeadingDepthOf } from "./pageSettings";

/** Starts the page runtime of one page load. */
export function startPreviewRuntime(context: PreviewRuntimeContext, transport: HostTransport): void {
  document.documentElement.setAttribute("data-sphinx-preview-document-id", context.documentId);
  document.documentElement.setAttribute("data-sphinx-preview-document-version", String(context.revision));
  document.documentElement.setAttribute("data-sphinx-preview-request-id", String(context.requestId));
  // Keyed content updates (PERF-05): the host HTML of every block, recorded before anything changes it.
  const contentMorph = installContentMorph(document, planKeyedMorph, morphKey);
  const initialContent = document.getElementById?.("sphinx-myst-preview-content");
  if (initialContent) contentMorph.record(initialContent);
  const tableTools = createMarkdownTableTools();
  const textEditing = createTextEditingTools();
  const blockSelection = createBlockSelection();
  const editActions = createEditActions(HIGHLIGHT_LANGUAGES, tableTools, isSafeOkfColor, context.threadAuthor);
  const figureTools = createFigureTools();
  const anchorPolicy = createAnchorPolicy();
  // Diagnostics only (they change nothing in the page): the editor trace, read by the tests through
  // window.__studioDiagnostics, and the key containment of controls and editors (pageDiagnostics.ts).
  const pageDiagnostics = installPageDiagnostics(document, window, context);
  const settings = pageSettings(context);
  // The sticky heading band and the reading offset it reserves (features/stickyHeadings.ts).
  const stickyBand = installStickyHeadings(document, window, anchorPolicy, stickyHeadingDepthOf(context));
  // Messages and the saved state, with the state write throttle of PERF-08 (see pageHost.ts).
  const pageHost = createPageHost(transport, window);
  const vscode = pageHost.api;
  // Host messages: features register their handlers on this router (see hostMessages.ts).
  const pageHostMessages = createPageHostMessages();
  const hostMessages = pageHostMessages.router;
  const bus = createPageBus<PageEvents>();
  installRendererBridge(document, bus);
  // The pending overlay and the status region (features/statusRegion.ts).
  const statusRegion = installStatusRegion(document, hostMessages);
  const state: PageRuntimeState = {
    editMode: false,
    paletteMode: DEFAULT_EDITING_CONFIGURATION.defaultPaletteMode,
    descriptionsCollapsed: false,
    activeBlockEdit: undefined,
    activeFrontmatterEdit: undefined,
    editSequence: 0,
    anchor: undefined,
    editAnchor: undefined,
    pinApplied: false,
    flushingEditors: false,
    applyingContentPatch: false,
    pendingBlockSelection: undefined,
    pendingBlockNavigation: undefined,
    pendingMoveSelection: undefined,
    pendingFrontmatterEdit: undefined,
    pendingEditOpenedIn: undefined,
    deferredPropertiesMarkup: undefined,
    deferredPropertiesSeq: undefined,
  };
  // The features fill the remaining slots below, before any of them runs.
  const rt = {
    document,
    window,
    context,
    host: vscode,
    pageHost,
    settings,
    anchorPolicy,
    diagnostics: pageDiagnostics,
    bus,
    hostMessages,
    tools: { tableTools, textEditing, blockSelection, editActions, figureTools },
    state,
    refreshButton: undefined,
    editModeButton: undefined,
  } as Partial<PageRuntime> as PageRuntime;
  // Review comments. Installed before every click handler below: a click on a highlight or badge
  // opens the popover and must not edit the block, follow a link or reveal the source.
  const postCommentMessage = (type: string, fields: Record<string, unknown>): void => vscode.postMessage({
    type,
    documentId: context.documentId,
    revision: context.revision,
    requestId: context.requestId,
    ...fields,
  });
  const commentsEnabled = context.commentsEnabled === true;
  const commentThreads = installCommentThreads(document, window, commentsEnabled
    ? {
      reply: (threadId, body) => postCommentMessage("previewCommentReply", { threadId, body }),
      resolve: (threadId, resolved) => postCommentMessage("previewCommentResolve", { threadId, resolved }),
      remove: (threadId) => postCommentMessage("previewCommentDelete", { threadId }),
    }
    : undefined);
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-001
  // The Comment button of a text selection (writable previews only, T43). Not shown while a block
  // editor is open or blocks are selected; it never changes the selection.
  const commentCompose = commentsEnabled ? installCommentCompose(document, window, {
    post: postCommentMessage,
    busy: () => Boolean(state.activeBlockEdit || state.activeFrontmatterEdit || blockSelection.isActive()),
    beforeOpen: () => commentThreads.close(),
  }) : undefined;
  bindEditModeCaptureClicks(rt);
  const linkNavigation = installLinkNavigation(document, window, vscode, context,
    (navigate) => rt.blockEditor.flushOpenEditorsThen(navigate));
  const firstClearance = installFirstClearance(document, window);
  pageDiagnostics.expose(firstClearance);
  // The button follows the host's answer (`hostRequests` is created below, before any click).
  const codeCopy = installCodeCopy(document, window, (text, done) =>
    hostRequests.ask("previewCopyText", { text }, {}, done));
  // Edit mode: the anchor icon of a label renames it. The result is matched by edit id: the edit
  // itself moves the document version before the answer arrives.
  const labelRename = installLabelRename(document, window, {
    isEditMode: () => state.editMode,
    blockedReason: () => state.activeBlockEdit || state.activeFrontmatterEdit
      ? "Save or cancel the open edit before renaming a label." : undefined,
    nextEditId: () => "label-" + context.requestId + "-" + (++state.editSequence),
    post: (rename, editId) => vscode.postMessage({
      type: "previewLabelRename",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      editId,
      ...rename,
    }),
  });
  // Host round trips of the MyST palette (labels, citation keys, the {doc} file dialog). The answer
  // is matched by edit id. While a native dialog is open the editor's blur handlers stand down:
  // the dialog takes the focus, which is not leaving the editor.
  const hostRequests = installHostRequests(window, {
    nextEditId: () => "host-" + context.requestId + "-" + (++state.editSequence),
    post: (request) => vscode.postMessage({
      ...request,
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
    }),
  });
  // Local files of PlantUML `!include` lines, read by the host for the built-in engine (its bundle
  // asks through a document event). Requests of their own: closing an editor must not cancel them.
  let plantUmlFileSequence = 0;
  const plantUmlFileRequests = installHostRequests(window, {
    nextEditId: () => "plantuml-" + (++plantUmlFileSequence),
    post: (request) => vscode.postMessage({
      ...request,
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
    }),
  });
  installPlantUmlFileRequests(document, plantUmlFileRequests, PLANTUML_FILE_REQUEST_TIMEOUT_MS);
  // Pasting an image into the text box: the host saves it next to the document and names it.
  const pasteImage = installPasteImage(window);
  const pasteHtml = installPasteHtml();
  // CR 050: the conf.py warnings of a successful render, as a closable banner over the top of the page.
  const warningBanner = installWarningBanner(document, vscode, context,
    warningBannerState, warningBannerText);
  // Edit mode: the "Edit figure" button over a hovered figure opens its block editor with the form.
  const figureEditButton = installFigureEditButton(document, window, {
    isEditMode: () => state.editMode,
    open: (figure) => rt.editorChrome.openFigureEditor(figure as HTMLElement),
  });
  // Zoom changes layout only: keep the source line at the reading line across it.
  const keepReadingLine = (): void => rt.scroll.keepReadingLine();
  // Expanding a chip changes the height of the content: keep the reading line like zoom does.
  const chipToggle = installChipToggle(document, vscode, context, keepReadingLine);
  // Green bars on blocks changed since the last commit; the host sends the ranges (T16).
  const incomingChanges = installIncomingChanges(document);
  // Light motion (CR 046): soft appearance after a user action, the theme colour transition, the
  // fade of a block an editor gives back and the glow of blocks an outside change or an undo updated.
  const motion = installMotion(document, window);
  installIncomingToggle(document, vscode, context);
  // Toolbar Comments button: hides the gray chips, which moves the content like expanding one does.
  installCommentsToggle(document, vscode, context, keepReadingLine);
  const historyControls = installHistoryControls(document, vscode, context,
    (navigate) => rt.blockEditor.flushOpenEditorsThen(navigate));
  const viewControls = installViewControls(document, vscode, context, keepReadingLine);
  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-018
  // The toolbar changes size when rows 2-3 are collapsed: re-measure everything placed around it.
  installToolbarCollapse(document, vscode, context, () => {
    firstClearance.update();
    stickyBand.refreshStickyHeadingPosition();
    tocColumn.layout();
    widthMode.update();
  });
  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-020
  // The width mode changes layout only as well; Auto re-measures wide elements on every layout pass.
  const widthMode = installWidthMode(document, window, vscode, context, () => {
    firstClearance.update();
    keepReadingLine();
  });
  // The TOC column changes the available width: re-measure Auto and keep the reading line.
  const tocColumn = installTocColumn(document, window, vscode, context, (heading) => rt.scroll.revealElement(heading), () => {
    firstClearance.update();
    widthMode.update();
    keepReadingLine();
  }, () => stickyBand.readingOffset());
  rt.refreshButton = document.querySelector?.<HTMLButtonElement>("[data-sphinx-preview-refresh]");
  rt.editModeButton = document.querySelector?.<HTMLElement>("[data-sphinx-preview-edit-toggle]");
  const savedState = vscode.getState?.();
  const saved = savedState as RuntimeSavedState | undefined;
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-014
  state.descriptionsCollapsed = (saved?.documentId === context.documentId ? saved.descriptionsCollapsed : undefined)
    ?? context.initialState?.descriptionsCollapsed
    ?? (window.innerWidth <= 640);
  // The preview theme mode and the host theme kind (features/themeMode.ts).
  const themeMode = installThemeMode(document, window, hostMessages, {
    host: vscode,
    context,
    savedState,
    themeSwitch: () => motion.themeSwitch(),
  });
  // Whether the page and the text editor scroll together (features/anchorMode.ts).
  const anchorMode = installAnchorMode(document, hostMessages, { host: vscode, context, settings, savedState });
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-170
  state.editMode = rt.editModeButton
    ? (typeof saved?.editMode === "boolean" ? saved.editMode : context.initialEditMode === true)
    : false;
  const paletteModes: readonly string[] = PALETTE_MODES;
  state.paletteMode = (paletteModes.includes(saved?.paletteMode as string)
    ? saved!.paletteMode
    : paletteModes.includes(context.initialPaletteMode as string) ? context.initialPaletteMode
      : DEFAULT_EDITING_CONFIGURATION.defaultPaletteMode) as PaletteMode;
  state.pendingBlockNavigation = saved?.pendingBlockNavigation;
  // After a move of a block selection: where the selection sits once the move is rendered (it
  // survives a full reload of the page; a changed block count restores nothing).
  state.pendingMoveSelection = saved?.pendingMoveSelection;
  // After an add, the re-rendered preview opens the editor of the new field.
  state.pendingFrontmatterEdit = saved?.pendingFrontmatterEdit;
  state.pendingEditOpenedIn = saved?.pendingFrontmatterEditOpenedIn;
  // The edit toggle is only rendered when the document may be edited (trusted workspace).
  const checkboxEditingEnabled = Boolean(rt.editModeButton);
  // Task list checkboxes (features/checkboxes.ts).
  const checkboxes = installCheckboxes(document, hostMessages, {
    host: vscode,
    context,
    editingEnabled: checkboxEditingEnabled,
    openEdit: () => state.activeBlockEdit || state.activeFrontmatterEdit,
    nextEditSequence: () => ++state.editSequence,
    anchorField: () => rt.scroll.anchorField(),
  });
  // Inline threads (<!-- THREAD): the reply box and Delete of an open thread; the host edits the file.
  const inlineThreads = installInlineThreads(document, {
    enabled: checkboxEditingEnabled,
    blockedReason: () => state.activeBlockEdit || state.activeFrontmatterEdit
      ? "Save or cancel the open edit before changing a thread." : undefined,
    ask: (type, payload, done) => hostRequests.ask(type, payload, {}, done),
  });

  // The features (no listener yet: they are bound below, in order).
  rt.blocks = createMappedBlocks(document, context);
  rt.scroll = installScrollCore(rt);
  rt.textControls = installTextControls(rt);
  rt.blockEditor = installBlockEditor(rt);
  rt.blockSourceEditor = installBlockSourceEditor(rt);
  rt.editorChrome = installEditorChrome(rt);
  rt.tableCellEditor = installTableCellEditor(rt);
  rt.frontmatter = installFrontmatterEditor(rt);
  rt.selection = installBlockSelectionView(rt);
  rt.insertPoints = installInsertPoints(rt);
  rt.blockMoves = installBlockMoves(rt);
  rt.tableRowMove = installTableRowMove(rt);
  rt.editMode = installEditMode(rt);
  rt.contentPatch = installContentPatch(rt);
  rt.input = installPageInput(rt);

  rt.blockEditor.bindPageHide();
  rt.frontmatter.bindKeys();
  rt.tableCellEditor.bindKeys();
  rt.insertPoints.bindKeys();
  rt.selection.bindKeys();
  rt.blockMoves.bindKeys();
  // The tooltip of frontmatter links (features/linkTooltip.ts).
  const linkTooltip = installLinkTooltip(document, window);
  rt.parts = {
    contentMorph, stickyBand, statusRegion, commentThreads, commentCompose, linkNavigation, firstClearance,
    codeCopy, labelRename, hostRequests, plantUmlFileRequests, pasteImage, pasteHtml, warningBanner,
    figureEditButton, chipToggle, incomingChanges, motion, historyControls, viewControls, widthMode,
    tocColumn, themeMode, anchorMode, checkboxes, inlineThreads, linkTooltip,
  };
  rt.editorChrome.bindPaletteSticky();

  themeMode.applyPreviewThemeMode(themeMode.mode());
  anchorMode.applyAnchorMode(anchorMode.anchored());
  anchorMode.applyPairing(context.pairedTextEditor !== false);
  themeMode.bindButton();
  rt.refreshButton?.addEventListener?.("click", rt.input.refreshPreview);
  anchorMode.start();
  rt.editMode.bindButton();
  themeMode.applyTheme(context.themeKind);

  rt.scroll.bindWindow();
  registerHostHandlers(rt);
  pageHostMessages.listen(transport, context, (message) => {
    // Every other answer may close a host round trip of the palette: matched by edit id.
    const answer = message as HostResult | null | undefined;
    if (answer && typeof answer.type === "string" && answer.type.endsWith("Result")) {
      hostRequests.receive(answer);
    }
  });
  rt.input.bindClicks();
  rt.scroll.observeContent();
  rt.contentPatch.initializeContent({ restore: true });
  rt.contentPatch.postPreviewReady();
}
