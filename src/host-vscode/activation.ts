/**
 * The VS Code activation: the composition root of the extension. It creates the VS Code host, the
 * editor-group lock and the {@link PreviewManager}, registers the commands, the custom editor and
 * the panel serializer, creates the webview panels, and forwards VS Code's events to the manager as
 * host-neutral data. Everything a preview does after that lives in `src/session/`.
 */

import * as path from "node:path";

import * as vscode from "vscode";

import { PREVIEW_EDIT_COMMANDS, type PreviewEditCommandName } from "../core/protocol/hostToPage";
import { preloadMystEngine } from "../core/render/mystRenderer";
import { buildStatusWebviewHtml } from "../session/webview";
import { PreviewManager } from "../session/previewManager";
import { isDocumentEligible, isPathWithin } from "../session/sessionDocuments";
import { parsePreviewPanelState } from "../core/state/previewState";
import { resetRenderHooksForTests } from "../core/render/renderPipeline";
import { createVscodePanelGroups, type VscodePanelGroups } from "./groupLock";
import { createVscodePreviewPanel, type VscodePreviewPanel } from "./previewPanel";
import { createVscodeHost, type VscodeHost } from "./vscodeHost";
import { fireAndForget } from "../host-api/logger";

// @implements_req SwRS-MDOKFSTUDIO-LIFE-001
/** The command that opens the side preview. */
export const COMMAND_ID = "markdown-okf-schema-studio.openPreview";
/** The command that renders the active preview again. */
export const REFRESH_COMMAND_ID = "markdown-okf-schema-studio.refreshPreview";
/** The commands VS Code's key bindings run on the text box being edited (CR 119). */
export const EDIT_COMMAND_IDS: Readonly<Record<PreviewEditCommandName, string>> = {
  undo: "markdown-okf-schema-studio.editUndo",
  redo: "markdown-okf-schema-studio.editRedo",
  selectAll: "markdown-okf-schema-studio.editSelectAll",
  deleteLine: "markdown-okf-schema-studio.editDeleteLine",
};
/** The view type of the side preview panels (and of their serializer). */
export const PANEL_VIEW_TYPE = "markdown-okf-schema-studio.preview";
/** The view type of the custom editor (a fixed preview of one document). */
export const EDITOR_VIEW_TYPE = "markdown-okf-schema-studio.editor";

/** What one activation of the extension holds; disposed by `deactivate`. */
export class StudioActivation {
  public readonly host: VscodeHost;
  public readonly groups: VscodePanelGroups;
  public readonly manager: PreviewManager;

  public constructor(public readonly extensionUri: vscode.Uri) {
    this.host = createVscodeHost();
    this.groups = createVscodePanelGroups(PANEL_VIEW_TYPE, (column) => this.manager.hasLivePanelIn(column));
    this.manager = new PreviewManager(this.host, this.groups);
  }

  /** The port's view of a webview panel of this extension. */
  public wrapPanel(panel: vscode.WebviewPanel): VscodePreviewPanel {
    return createVscodePreviewPanel(panel, this.host.assets(panel.webview, this.extensionUri), this.extensionUri);
  }

  /** Registers everything the extension contributes; the subscriptions go to `context`. */
  public start(context: vscode.ExtensionContext): void {
    const { host, manager } = this;
    manager.choices.refreshThreadAuthor(host.workspace.folders()[0]?.id);
    preloadMystEngine();
    host.previewRenderer?.warm();
    manager.choices.load(context.workspaceState);
    for (const folder of host.workspace.folders()) {
      manager.events.watchStemRoot(folder.path);
    }
    const diagnostics = manager.diagnostics.start();
    // The single conf.py watcher: it also sees the workspace-root fallbacks of decision D29.
    const confWatcher = host.watcher.watch(undefined, "**/conf.py");
    const onConfFileEvent = (filePath: string): void => manager.events.onConfFileEvent(filePath);
    context.subscriptions.push(
      diagnostics,
      confWatcher,
      confWatcher.onDidChange(onConfFileEvent),
      confWatcher.onDidCreate(onConfFileEvent),
      confWatcher.onDidDelete(onConfFileEvent),
      vscode.workspace.onDidCloseTextDocument((document) => manager.events.onDocumentClosed(document.uri.toString())),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-003
      vscode.commands.registerCommand(COMMAND_ID, (uri?: unknown) => this.openPreview(uri)),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-018
      vscode.window.registerCustomEditorProvider(EDITOR_VIEW_TYPE, {
        resolveCustomTextEditor: (document, panel) => this.resolvePreviewEditor(document, panel),
      }, { webviewOptions: { enableFindWidget: true } }),
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-032
      vscode.commands.registerCommand(REFRESH_COMMAND_ID, async () => {
        const active = vscode.window.activeTextEditor?.document;
        await manager.refreshActive(active ? host.documents.of(active) : undefined);
      }),
      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
      ...PREVIEW_EDIT_COMMANDS.map((command) =>
        vscode.commands.registerCommand(EDIT_COMMAND_IDS[command], () => manager.runEditCommand(command))),
      vscode.window.registerWebviewPanelSerializer(PANEL_VIEW_TYPE, {
        deserializeWebviewPanel: (panel, state) => this.deserializePreviewPanel(panel, state),
      }),
      host.documents.onDidChange((event) => manager.events.onDocumentChanged(event)),
      vscode.workspace.onDidSaveTextDocument((document) => manager.events.onDocumentSaved(host.documents.of(document))),
      host.workspace.onDidGrantTrust(() => manager.events.onTrustGranted()),
      host.settings.onDidChange((event) => manager.events.onSettingsChanged(event)),
      vscode.window.onDidChangeActiveTextEditor((editor) =>
        manager.events.onActiveEditorChanged(editor ? host.editorOf(editor) : undefined)),
      vscode.window.onDidChangeVisibleTextEditors(() => manager.events.onVisibleEditorsChanged()),
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

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-143
  /** Disposes the sessions (not their panels) and what the activation holds. */
  public stop(): void {
    const { manager } = this;
    manager.disposeAll(false);
    manager.diagnostics.stop();
    manager.events.disposeStemRootWatchers();
    manager.choices.unload();
    this.host.previewRenderer?.dispose();
    resetRenderHooksForTests();
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

  // @implements_req SwRS-MDOKFSTUDIO-CORE-043
  /** The open-preview command: the side preview of the active (or given) Markdown file. */
  public async openPreview(uri?: unknown): Promise<void> {
    const { host, manager } = this;
    // Menus pass the resource URI; the palette and keybinding pass nothing. Ignore other arguments.
    if (
      uri instanceof vscode.Uri
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
    const textDocument = vscode.window.activeTextEditor?.document ?? (await this.openStudioTabDocument());
    const document = textDocument ? host.documents.of(textDocument) : undefined;
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-010
    if (!document || document.path === undefined || !isDocumentEligible(document)) {
      fireAndForget(host.logger, host.ui.showInformation(
        "Open a Markdown file to use Markdown OKF-Schema Studio.",
      ), "showInformation");
      return;
    }
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
