/**
 * The VS Code activation: the composition root of the extension. It creates the VS Code host, the
 * editor-group lock and the {@link PreviewManager}, registers the commands, the custom editor and
 * the panel serializer, creates the webview panels, and forwards VS Code's events to the manager as
 * host-neutral data. Everything a preview does after that lives in `src/session/`.
 */

import * as path from "node:path";

import * as vscode from "vscode";

import { preloadMystEngine } from "../render/mystRenderer";
import { buildStatusWebviewHtml } from "../preview/webview";
import { PreviewManager } from "../session/previewManager";
import { isDocumentEligible, isPathWithin } from "../session/sessionDocuments";
import { parsePreviewPanelState } from "../state/previewState";
import { resetRenderHooksForTests } from "../render/renderPipeline";
import { createVscodePanelGroups, type VscodePanelGroups } from "./groupLock";
import { createVscodePreviewPanel, type VscodePreviewPanel } from "./previewPanel";
import { createVscodeHost, type VscodeHost } from "./vscodeHost";

/** The command that opens the side preview. */
export const COMMAND_ID = "markdown-okf-schema-studio.openPreview";
/** The command that renders the active preview again. */
export const REFRESH_COMMAND_ID = "markdown-okf-schema-studio.refreshPreview";
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
    manager.choices.load(context.workspaceState);
    for (const folder of host.workspace.folders()) {
      manager.watchStemRoot(folder.path);
    }
    const diagnostics = manager.diagnostics.start();
    // The single conf.py watcher: it also sees the workspace-root fallbacks of decision D29.
    const confWatcher = host.watcher.watch(undefined, "**/conf.py");
    const onConfFileEvent = (filePath: string): void => manager.onConfFileEvent(filePath);
    context.subscriptions.push(
      diagnostics,
      confWatcher,
      confWatcher.onDidChange(onConfFileEvent),
      confWatcher.onDidCreate(onConfFileEvent),
      confWatcher.onDidDelete(onConfFileEvent),
      vscode.workspace.onDidCloseTextDocument((document) => manager.onDocumentClosed(document.uri.toString())),
      vscode.commands.registerCommand(COMMAND_ID, (uri?: unknown) => this.openPreview(uri)),
      vscode.window.registerCustomEditorProvider(EDITOR_VIEW_TYPE, {
        resolveCustomTextEditor: (document, panel) => this.resolvePreviewEditor(document, panel),
      }, { webviewOptions: { enableFindWidget: true, retainContextWhenHidden: true } }),
      vscode.commands.registerCommand(REFRESH_COMMAND_ID, async () => {
        const active = vscode.window.activeTextEditor?.document;
        await manager.refreshActive(active ? host.documents.of(active) : undefined);
      }),
      vscode.window.registerWebviewPanelSerializer(PANEL_VIEW_TYPE, {
        deserializeWebviewPanel: (panel, state) => this.deserializePreviewPanel(panel, state),
      }),
      host.documents.onDidChange((event) => manager.onDocumentChanged(event)),
      vscode.workspace.onDidSaveTextDocument((document) => manager.onDocumentSaved(host.documents.of(document))),
      host.workspace.onDidGrantTrust(() => manager.onTrustGranted()),
      host.settings.onDidChange((event) => manager.onSettingsChanged(event)),
      vscode.window.onDidChangeActiveTextEditor((editor) =>
        manager.onActiveEditorChanged(editor ? host.editorOf(editor) : undefined)),
      vscode.window.onDidChangeVisibleTextEditors(() => manager.onVisibleEditorsChanged()),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) =>
        manager.onVisibleRangesChanged(host.editorOf(event.textEditor))),
      vscode.window.onDidChangeActiveColorTheme(() => manager.onThemeChanged()),
      vscode.workspace.onDidRenameFiles((event) => manager.onFilesRenamed(event.files.map((file) => ({
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
        manager.onFoldersChanged(event.added.map(info), event.removed.map(info));
      }),
    );
  }

  /** Disposes the sessions (not their panels) and what the activation holds. */
  public stop(): void {
    const { manager } = this;
    manager.disposeAll(false);
    manager.diagnostics.stop();
    manager.disposeStemRootWatchers();
    manager.choices.unload();
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
        void host.ui.showError(
          "Cannot open " + uri.fsPath + ": " + (error instanceof Error ? error.message : String(error)),
        );
        return;
      }
    }
    const textDocument = vscode.window.activeTextEditor?.document;
    const document = textDocument ? host.documents.of(textDocument) : undefined;
    if (!document || document.path === undefined || !isDocumentEligible(document)) {
      void host.ui.showInformation(
        "Open a Markdown file to use Markdown OKF-Schema Studio.",
      );
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

    const panel = vscode.window.createWebviewPanel(
      PANEL_VIEW_TYPE,
      "Studio",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        enableFindWidget: true,
        retainContextWhenHidden: true,
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
