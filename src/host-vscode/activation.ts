/**
 * The VS Code activation: the composition root of the extension. It creates the VS Code host, the
 * editor-group lock and the {@link PreviewManager}, registers the commands, the custom editor and
 * the panel serializer, creates the webview panels, and forwards VS Code's events to the manager as
 * host-neutral data. Everything a preview does after that lives in `src/session/`.
 */

import * as path from "node:path";

import * as vscode from "vscode";

import {
  PREVIEW_EDIT_COMMANDS,
  PREVIEW_FOLD_COMMANDS,
  type PreviewEditCommandName,
  type PreviewFoldCommandName,
} from "../core/protocol/hostToPage";
import { preloadMystEngine } from "../core/render/mystRenderer";
import { buildStatusWebviewHtml } from "../session/webview";
import { PreviewManager } from "../session/previewManager";
import { isDocumentEligible, isPathWithin } from "../session/sessionDocuments";
import { parsePreviewPanelState } from "../core/state/previewState";
import { resetRenderHooksForTests } from "../core/render/renderPipeline";
import { createVscodePanelGroups, type VscodePanelGroups } from "./groupLock";
import { createVscodePreviewPanel, type VscodePreviewPanel } from "./previewPanel";
import { activeDiffInput, isDiffSide, realFileOfDiff, realSideOfDiff } from "./diffRealFile";
import { startKeystrokeTracking } from "./keystrokes";
import { createVscodeHost, type VscodeHost } from "./vscodeHost";
import { fireAndForget } from "../host-api/logger";
import { restoreEditorAssociation } from "../session/associationMigration";
import { FEATURE_INTRODUCTIONS, FeatureIntroductions } from "../session/featureIntroductions";
import { startEditorJumps, type EditorJumps } from "./editorJumps";
import { StudioSelections } from "./studioSelections";

// @implements_req SwRS-MDOKFSTUDIO-LIFE-001
/** The command that opens the side preview. */
export const COMMAND_ID = "markdown-okf-schema-studio.openPreview";
/** The command that renders the active preview again. */
export const REFRESH_COMMAND_ID = "markdown-okf-schema-studio.refreshPreview";
/** The commands VS Code's key bindings run on the text box being edited (CR 119). */
 const EDIT_COMMAND_IDS: Readonly<Record<PreviewEditCommandName, string>> = {
  undo: "markdown-okf-schema-studio.editUndo",
  redo: "markdown-okf-schema-studio.editRedo",
  selectAll: "markdown-okf-schema-studio.editSelectAll",
  deleteLine: "markdown-okf-schema-studio.editDeleteLine",
};
/** The palette commands that fold or unfold every section of the focused preview (CR 143). */
const FOLD_COMMAND_IDS: Readonly<Record<PreviewFoldCommandName, string>> = {
  foldAll: "markdown-okf-schema-studio.foldAll",
  unfoldAll: "markdown-okf-schema-studio.unfoldAll",
};
/** The command of the Cmd/Ctrl+F key binding on a focused preview (CR 144). */
const FIND_COMMAND_ID = "markdown-okf-schema-studio.find";
const SAVE_COMMAND_ID = "markdown-okf-schema-studio.saveDocument";
/** The command that exports the focused preview, or the preview of the active document, as one HTML file. */
export const EXPORT_HTML_COMMAND_ID = "markdown-okf-schema-studio.exportHtml";
/** The command that opens the text editor of the active Studio tab's file in place of the tab. */
export const OPEN_AS_TEXT_COMMAND_ID = "markdown-okf-schema-studio.openAsText";
/** The command that lets every feature introduction show once more. */
export const SHOW_INTRODUCTIONS_COMMAND_ID = "markdown-okf-schema-studio.showFeatureIntroductionsAgain";
/** The view type of the side preview panels (and of their serializer). */
export const PANEL_VIEW_TYPE = "markdown-okf-schema-studio.preview";
/** The view type of the custom editor (a fixed preview of one document). */
export const EDITOR_VIEW_TYPE = "markdown-okf-schema-studio.editor";

/** What one activation of the extension holds; disposed by `deactivate`. */
export class StudioActivation {
  public readonly host: VscodeHost;
  public readonly groups: VscodePanelGroups;
  public readonly manager: PreviewManager;
  /** The selections Studio itself makes in a text editor: the jump signal does not read them as jumps. */
  public readonly studioSelections = new StudioSelections();
  /** The jumps of the text editors, set by {@link start}. */
  public editorJumps: EditorJumps | undefined;
  /** The extension context of this activation, set by {@link start}. */
  private context: vscode.ExtensionContext | undefined;
  /** True once {@link ensureServicesStarted} ran: the engine warm-up, the watchers and the diagnostics. */
  private started = false;

  public constructor(public readonly extensionUri: vscode.Uri) {
    this.host = createVscodeHost(this.studioSelections);
    this.groups = createVscodePanelGroups(PANEL_VIEW_TYPE, (column) => this.manager.hasLivePanelIn(column));
    this.manager = new PreviewManager(this.host, this.groups);
  }

  /** The port's view of a webview panel of this extension. */
  public wrapPanel(panel: vscode.WebviewPanel): VscodePreviewPanel {
    return createVscodePreviewPanel(panel, this.host.assets(panel.webview, this.extensionUri), this.extensionUri);
  }

  /**
   * Registers everything the extension contributes; the subscriptions go to `context`. The preview
   * engine warm-up, the watchers and the diagnostics wait for the first Studio preview
   * ({@link ensureServicesStarted}): a Markdown file alone activates the extension too.
   */
  public start(context: vscode.ExtensionContext): void {
    const { host, manager } = this;
    this.context = context;
    manager.choices.refreshThreadAuthor(host.workspace.folders()[0]?.id);
    manager.choices.load(context.workspaceState);
    const introductions = new FeatureIntroductions(FEATURE_INTRODUCTIONS, context.globalState, host.ui, host.logger);
    const migration = restoreEditorAssociation({
      settingScopes: host.settingScopes,
      globalState: context.globalState,
      workspaceState: context.workspaceState,
      logger: host.logger,
    });
    fireAndForget(host.logger, migration, "Restoring the editor association");
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-187
    // The only reader of the selection event for jumps: the side preview marker reads it.
    const editorJumps = startEditorJumps({ selections: this.studioSelections });
    this.editorJumps = editorJumps;
    context.subscriptions.push(
      editorJumps,
      editorJumps.onJump((jump) => manager.events.onEditorJumped(jump.uri.toString(), jump.line)),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-176
      vscode.commands.registerCommand(SHOW_INTRODUCTIONS_COMMAND_ID, async () => {
        await introductions.resetAll();
        fireAndForget(host.logger, host.ui.showInformation(
          "Markdown OKF-Schema Studio will show its feature introductions again.",
        ), "showInformation");
      }),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-177
      vscode.commands.registerCommand(OPEN_AS_TEXT_COMMAND_ID, () => this.openAsText()),
      vscode.workspace.onDidCloseTextDocument((document) => manager.events.onDocumentClosed(document.uri.toString())),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-003
      vscode.commands.registerCommand(COMMAND_ID, (uri?: unknown) => this.openPreview(uri)),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-018
      vscode.window.registerCustomEditorProvider(EDITOR_VIEW_TYPE, {
        resolveCustomTextEditor: (document, panel) => this.resolvePreviewEditor(document, panel),
      }, {
        // @implements_req SwRS-MDOKFSTUDIO-CORE-043
        webviewOptions: { enableFindWidget: true },
      }),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-032
      vscode.commands.registerCommand(REFRESH_COMMAND_ID, async () => {
        const active = vscode.window.activeTextEditor?.document;
        await manager.refreshActive(active ? host.documents.of(active) : undefined);
      }),
      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
      ...PREVIEW_EDIT_COMMANDS.map((command) =>
        vscode.commands.registerCommand(EDIT_COMMAND_IDS[command], () => manager.runEditCommand(command))),
      // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-003
      ...PREVIEW_FOLD_COMMANDS.map((command) =>
        vscode.commands.registerCommand(FOLD_COMMAND_IDS[command], () => manager.runFoldCommand(command))),
      // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-009
      vscode.commands.registerCommand(FIND_COMMAND_ID, () => manager.runFindCommand()),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-173
      vscode.commands.registerCommand(SAVE_COMMAND_ID, () => manager.runSaveCommand()),
      // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-134
      vscode.commands.registerCommand(EXPORT_HTML_COMMAND_ID, () => {
        const active = vscode.window.activeTextEditor?.document;
        if (!manager.runExportCommand(active ? host.documents.of(active) : undefined)) {
          fireAndForget(host.logger, host.ui.showInformation("Open the preview of this file to export it."), "showInformation");
        }
      }),
      vscode.window.registerWebviewPanelSerializer(PANEL_VIEW_TYPE, {
        deserializeWebviewPanel: (panel, state) => this.deserializePreviewPanel(panel, state),
      }),
      host.documents.onDidChange((event) => manager.events.onDocumentChanged(event)),
      vscode.workspace.onDidSaveTextDocument((document) => manager.events.onDocumentSaved(host.documents.of(document))),
      host.workspace.onDidGrantTrust(() => manager.events.onTrustGranted()),
      host.settings.onDidChange((event) => manager.events.onSettingsChanged(event)),
      vscode.window.onDidChangeActiveTextEditor((editor) =>
        manager.events.onActiveEditorChanged(editor ? host.editorOf(editor) : undefined)),
      vscode.window.tabGroups.onDidChangeTabs((event) => {
        if ([...event.opened, ...event.changed].some((tab) => tab.isActive && tab.input instanceof vscode.TabInputTextDiff)) {
          this.followActiveDiff();
        }
      }),
      vscode.window.onDidChangeVisibleTextEditors(() => manager.events.onVisibleEditorsChanged()),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-094
      startKeystrokeTracking(),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) =>
        manager.events.onVisibleRangesChanged(host.editorOf(event.textEditor))),
      vscode.window.onDidChangeActiveColorTheme(() => manager.events.onThemeChanged()),
      vscode.workspace.onDidRenameFiles((event) => manager.events.onFilesRenamed(event.files.map((file) => ({
        oldPath: file.oldUri.fsPath,
        newPath: file.newUri.fsPath,
        local: file.oldUri.scheme === "file" && file.newUri.scheme === "file",
      })))),
      vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        const info = (folder: vscode.WorkspaceFolder) => ({
          id: folder.uri.toString(),
          path: folder.uri.fsPath,
          name: folder.name,
        });
        manager.events.onFoldersChanged(event.added.map(info), event.removed.map(info));
      }),
    );
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-004
  /**
   * Starts, once, what a Studio preview needs and a Markdown file alone does not: the MyST engine
   * warm-up, the render worker, the stem-root watchers, the Problems collection and the `conf.py`
   * watcher. Run by the first preview (the side preview, an Open With tab, a restored panel).
   */
  private ensureServicesStarted(): void {
    const context = this.context;
    if (this.started || !context) return;
    this.started = true;
    const { host, manager } = this;
    try {
      preloadMystEngine();
      host.previewRenderer?.warm();
      for (const folder of host.workspace.folders()) {
        manager.events.watchStemRoot(folder.path);
      }
      const diagnostics = manager.diagnostics.start();
      // The single conf.py watcher: it also sees the workspace-root fallbacks of decision D29.
      const confWatcher = host.watcher.watch(undefined, "**/conf.py");
      const onConfFileEvent = (filePath: string): void => {
        fireAndForget(host.logger, manager.events.onConfFileEvent(filePath), "Refreshing the previews of a conf.py");
      };
      context.subscriptions.push(
        diagnostics,
        confWatcher,
        confWatcher.onDidChange(onConfFileEvent),
        confWatcher.onDidCreate(onConfFileEvent),
        confWatcher.onDidDelete(onConfFileEvent),
      );
    } catch (error) {
      // A service that cannot start is logged; the preview that asked for it still opens and shows its own failure.
      host.logger.error("Could not start the preview services.", error);
    }
  }

  /** True once the first Studio preview started the services (see {@link ensureServicesStarted}). */
  public get servicesStarted(): boolean {
    return this.started;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-143
  /** Disposes the sessions (not their panels) and what the activation holds; stops only what was started. */
  public stop(): void {
    const { manager } = this;
    manager.disposeAll(false);
    manager.events.disposeStemRootWatchers();
    manager.choices.unload();
    if (this.started) {
      manager.diagnostics.stop();
      this.host.previewRenderer?.dispose();
    }
    this.started = false;
    this.context = undefined;
    resetRenderHooksForTests();
  }

  /** The Open as Text command: the text editor of the active Studio tab's file takes the tab's place. */
  private async openAsText(): Promise<void> {
    const { host, manager } = this;
    const group = vscode.window.tabGroups.activeTabGroup;
    const tab = group?.activeTab;
    const input = tab?.input;
    if (!group || !tab || !(input instanceof vscode.TabInputCustom) || input.viewType !== EDITOR_VIEW_TYPE) {
      fireAndForget(host.logger, host.ui.showInformation(
        "Open a Markdown file in Studio to open it as text.",
      ), "showInformation");
      return;
    }
    const documentUri = input.uri.toString();
    const line = manager.latest((preview) => !preview.followsActiveEditor && preview.documentUri === documentUri)
      ?.state?.sourceLine;
    // Studio's own selection: a jump to this very line is not one.
    this.studioSelections.expect(documentUri, line === undefined ? 0 : line - 1, "no-mark");
    try {
      const document = await vscode.workspace.openTextDocument(input.uri);
      const at = new vscode.Position(line === undefined ? 0 : line - 1, 0);
      await vscode.window.showTextDocument(document, {
        viewColumn: group.viewColumn,
        preview: false,
        selection: new vscode.Range(at, at),
      });
      await vscode.window.tabGroups.close(tab, true);
    } catch (error) {
      fireAndForget(host.logger, host.ui.showError(
        "Cannot open " + input.uri.fsPath + " as text: " + (error instanceof Error ? error.message : String(error)),
      ), "showError");
    }
  }

  /** Where to open a file so it does not cover the side preview. */
  private columnOutsideSidePreview(sidePreviewColumn: vscode.ViewColumn | undefined): vscode.ViewColumn {
    const editor = vscode.window.visibleTextEditors.find(
      (candidate) => candidate.viewColumn !== undefined && candidate.viewColumn !== sidePreviewColumn,
    );
    if (editor?.viewColumn !== undefined) return editor.viewColumn;
    const group = vscode.window.tabGroups.all.find((candidate) => candidate.viewColumn !== sidePreviewColumn);
    return group?.viewColumn ?? vscode.ViewColumn.Beside;
  }

  /** The document of the active tab when that tab is a Studio Open With editor (no text editor is active then). */
  private async openStudioTabDocument(): Promise<vscode.TextDocument | undefined> {
    const input = vscode.window.tabGroups.activeTabGroup?.activeTab?.input;
    if (!(input instanceof vscode.TabInputCustom) || input.viewType !== EDITOR_VIEW_TYPE) return undefined;
    try {
      return await vscode.workspace.openTextDocument(input.uri);
    } catch {
      return undefined;
    }
  }

  /** The text document of a diff's real file, read without showing it in an editor; undefined when it cannot be read. */
  private async openDiffFileDocument(uri: vscode.Uri | undefined): Promise<vscode.TextDocument | undefined> {
    if (!uri) return undefined;
    try {
      return await vscode.workspace.openTextDocument(uri);
    } catch {
      return undefined;
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-026
  /**
   * The active tab became a text diff: the side preview follows the diff's real file (a side that is
   * an eligible file; never the working-tree stand-in). The active text editor of a diff may be a
   * side that is not a file, so the active editor event alone does not see it.
   */
  private followActiveDiff(): void {
    const { host, manager } = this;
    const diff = activeDiffInput();
    if (!diff || !manager.latest((candidate) => candidate.followsActiveEditor)) return;
    const side = realSideOfDiff(diff, vscode.window.activeTextEditor?.document.uri);
    if (!side) return;
    void this.openDiffFileDocument(side).then((textDocument) => {
      if (textDocument) manager.events.onActiveDocumentChanged(host.documents.of(textDocument));
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-CORE-043
  /** The open-preview command: the side preview of the active (or given) Markdown file. */
  public async openPreview(uri?: unknown): Promise<void> {
    const { host, manager } = this;
    // Menus pass the resource URI; the palette and keybinding pass nothing. Ignore other arguments.
    // A text diff is the active tab and the command comes without a URI or from the title button
    // (a URI of one of its sides): the diff's real file is previewed, and no text editor opens.
    const diff = activeDiffInput();
    const fromDiff = diff !== undefined && (uri === undefined || (uri instanceof vscode.Uri && isDiffSide(diff, uri)));
    let diffFile: Awaited<ReturnType<typeof realFileOfDiff>>;
    if (diff && fromDiff) {
      diffFile = await realFileOfDiff(diff, vscode.window.activeTextEditor?.document.uri);
    }
    if (
      !fromDiff
      && uri instanceof vscode.Uri
      && uri.scheme === "file"
      && vscode.window.activeTextEditor?.document.uri.toString() !== uri.toString()
    ) {
      try {
        const opened = await vscode.workspace.openTextDocument(uri);
        const sidePreviewForOpen = manager.latest((candidate) => candidate.followsActiveEditor);
        await vscode.window.showTextDocument(opened, sidePreviewForOpen
          ? { preview: false, viewColumn: this.columnOutsideSidePreview(sidePreviewForOpen.panel.column) }
          : { preview: false });
      } catch (error) {
        fireAndForget(host.logger, host.ui.showError(
          "Cannot open " + uri.fsPath + ": " + (error instanceof Error ? error.message : String(error)),
        ), "showError");
        return;
      }
    }
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-003
    const textDocument = fromDiff
      ? await this.openDiffFileDocument(diffFile?.uri)
      : vscode.window.activeTextEditor?.document ?? (await this.openStudioTabDocument());
    const document = textDocument ? host.documents.of(textDocument) : undefined;
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-003
    if (!document || document.path === undefined || !isDocumentEligible(document)) {
      fireAndForget(host.logger, host.ui.showInformation(
        "Open a Markdown file to use Markdown OKF-Schema Studio.",
      ), "showInformation");
      return;
    }
    this.ensureServicesStarted();
    const workspaceFolder = host.workspace.folderOf(document.path);
    const sidePreview = manager.latest((preview) => preview.followsActiveEditor);
    if (sidePreview) {
      sidePreview.panel.reveal();
      if (document.id !== sidePreview.documentUri) {
        manager.switchAfterFlush(sidePreview, document);
      } else {
        await manager.requestDocument(sidePreview, document);
      }
      return;
    }

    // @implements_req SwRS-MDOKFSTUDIO-LIFE-149
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-007
    const panel = vscode.window.createWebviewPanel(
      PANEL_VIEW_TYPE,
      "Studio",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        // @implements_req SwRS-MDOKFSTUDIO-CORE-043
        enableFindWidget: true,
        localResourceRoots: [],
      },
    );
    const preview = manager.createSession(this.wrapPanel(panel), document, workspaceFolder);
    await manager.lockNewGroup(preview);
    try {
      await manager.requestDocument(preview, document);
    } catch (error) {
      if (manager.has(preview) && !preview.disposed) {
        manager.rendering.setStatus(preview, "error", error instanceof Error ? error.message : String(error));
      }
    }
  }

  /** The custom editor: a fixed preview of one document. */
  public async resolvePreviewEditor(textDocument: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    const { host, manager } = this;
    this.ensureServicesStarted();
    const panel = this.wrapPanel(webviewPanel);
    const document = host.documents.of(textDocument);
    let preview: ReturnType<PreviewManager["createSession"]> | undefined;
    try {
      if (document.path === undefined || !isDocumentEligible(document)) {
        panel.html = buildStatusWebviewHtml(
          "missing-source",
          panel.cspSource,
          "Markdown OKF-Schema Studio requires a Markdown file.",
        );
        return;
      }
      const workspaceFolder = host.workspace.folderOf(document.path);
      preview = manager.createSession(panel, document, workspaceFolder, undefined, false);
      manager.startRender(preview, document);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (preview && !preview.disposed) {
        manager.rendering.setStatus(preview, "error", message);
      } else {
        panel.html = buildStatusWebviewHtml("error", panel.cspSource, message);
      }
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-127
  /** A side preview restored with the window: it shows the document its saved state names. */
  public async deserializePreviewPanel(webviewPanel: vscode.WebviewPanel, rawState: unknown): Promise<void> {
    const { host, manager } = this;
    this.ensureServicesStarted();
    const panel = this.wrapPanel(webviewPanel);
    const restoredState = parsePreviewPanelState(rawState);
    if (!restoredState) {
      panel.html = buildStatusWebviewHtml(
        "missing-source",
        panel.cspSource,
        "The previous preview identity could not be restored safely.",
      );
      return;
    }
    let uri: vscode.Uri;
    try {
      uri = vscode.Uri.parse(restoredState.documentId);
    } catch {
      panel.html = buildStatusWebviewHtml(
        "missing-source",
        panel.cspSource,
        "The previous preview source URI is invalid.",
      );
      return;
    }
    const folder = uri.scheme === "file" ? host.workspace.folderOf(uri.fsPath) : undefined;
    const workspaceFolder = folder && isPathWithin(folder.path, uri.fsPath) ? folder : undefined;
    if (uri.scheme !== "file" || path.extname(uri.fsPath).toLowerCase() !== ".md") {
      panel.html = buildStatusWebviewHtml(
        "missing-source",
        panel.cspSource,
        "The previous preview source is not a Markdown file.",
      );
      return;
    }
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-038
    // Earlier restored panels stay open with their live session; only the newest one follows the
    // active editor, so each older one becomes a fixed preview of the document it shows.
    for (const earlier of manager.sessions()) {
      if (earlier.followsActiveEditor && !earlier.disposed) {
        earlier.followsActiveEditor = false;
        earlier.panel.title = manager.previewTitle(earlier, manager.activePathOf(earlier));
      }
    }
    let document;
    try {
      document = await host.documents.open(uri.toString());
    } catch {
      document = undefined;
    }
    const preview = manager.createSession(panel, document, workspaceFolder, {
      ...restoredState,
      documentId: uri.toString(),
      sourceFile: uri.fsPath,
    });
    if (preview.followsActiveEditor && panel.column !== undefined) {
      // The workbench restores the group's lock state; own it so closing the preview releases it.
      preview.lockedColumn = panel.column;
    }
    if (!document || !isDocumentEligible(document) || !manager.sourceAvailable(preview)) {
      manager.rendering.setMissingSource(preview, "The restored Markdown source is unavailable.");
      return;
    }
    await manager.requestDocument(preview, document);
  }
}
