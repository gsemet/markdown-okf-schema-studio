/**
 * The VS Code host: every port of `src/host-api/` on the VS Code API. The extension reaches VS
 * Code through this adapter for documents and edits, files, settings, trust and folders, the
 * clipboard and notifications, Git, diagnostics, watchers, navigation, text editors, the color
 * theme and webview assets. Each
 * port reads the VS Code API when it is called, never at creation, so the adapter can be created
 * when the extension module loads.
 */

import * as vscode from "vscode";

import { createHeadBaseline, type GitExtensionLike } from "./headBaseline";
import type { AssetResolver } from "../host-api/assetResolver";
import type { DiagnosticEntry, DiagnosticSeverity, Diagnostics } from "../host-api/diagnostics";
import type { TextRange } from "../host-api/documentStore";
import type { FileKind, FileSystem } from "../host-api/fileSystem";
import type { HostUi } from "../host-api/hostUi";
import { describeError, fireAndForget, type Logger } from "../host-api/logger";
import type { HostServices } from "../host-api/index";
import type { ColorTheme } from "../host-api/colorTheme";
import type { Navigation } from "../host-api/navigation";
import type { Settings } from "../host-api/settings";
import type { PairedEditor, TextEditors } from "../host-api/textEditors";
import type { VcsInfo } from "../host-api/vcsInfo";
import type { FileWatcher, Watcher } from "../host-api/watcher";
import type { WorkspaceFolderInfo, WorkspaceInfo } from "../host-api/workspaceInfo";
import { createNodeFileSystem } from "../node-services/nodeFileSystem";
import { createNodeProcessRunner } from "../node-services/processRunner";
import { createWorkerRenderer } from "../node-services/renderWorker";
import { nodeSchemaFiles } from "../node-services/schemaFiles";
import { createVscodeDocumentStore, type VscodeDocumentStore } from "./documents";

/** The VS Code host's ports, with the VS Code-only parts of its document store and its assets. */
export interface VscodeHost extends HostServices {
  readonly documents: VscodeDocumentStore;
  /**
   * The asset resolver of one webview: workspace files and the extension bundle as webview URIs.
   * Without `extensionUri` the page gets no bundle URLs.
   */
  assets(webview: Pick<vscode.Webview, "asWebviewUri" | "cspSource">, extensionUri: vscode.Uri | undefined): AssetResolver;
  /** The port's view of a VS Code text editor. */
  editorOf(editor: vscode.TextEditor): PairedEditor;
}

/** A VS Code range from a host-neutral one. */
 function toVscodeRange(range: TextRange): vscode.Range {
  return new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);
}

function kindOf(type: vscode.FileType): FileKind {
  if (type & vscode.FileType.Directory) return "directory";
  return type & vscode.FileType.File ? "file" : "other";
}

/**
 * Files through `workspace.fs`, which honours VS Code's file system providers. `realpath` has no
 * VS Code API: the extension host runs in Node, so it is Node's.
 */
function createVscodeFileSystem(): FileSystem {
  const node = createNodeFileSystem();
  return {
    async stat(path) {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path));
      return { kind: kindOf(stat.type), size: stat.size, mtimeMs: stat.mtime };
    },
    async readFile(path) {
      return vscode.workspace.fs.readFile(vscode.Uri.file(path));
    },
    async writeFile(path, data) {
      await vscode.workspace.fs.writeFile(vscode.Uri.file(path), data);
    },
    async readDirectory(path) {
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(path));
      return entries.map(([name, type]): [string, FileKind] => [name, kindOf(type)]);
    },
    async rename(from, to, options) {
      await vscode.workspace.fs.rename(vscode.Uri.file(from), vscode.Uri.file(to), { overwrite: options?.overwrite === true });
    },
    async delete(path) {
      await vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: false, useTrash: false });
    },
    isSymbolicLink: (path) => node.isSymbolicLink(path),
    realpath: (path) => node.realpath(path),
  };
}

function folderInfo(folder: vscode.WorkspaceFolder): WorkspaceFolderInfo {
  return { id: folder.uri.toString(), path: folder.uri.fsPath, name: folder.name };
}

function createVscodeWorkspaceInfo(): WorkspaceInfo {
  return {
    get trusted() {
      return vscode.workspace.isTrusted;
    },
    onDidGrantTrust: (listener) => vscode.workspace.onDidGrantWorkspaceTrust(() => listener()),
    folders: () => (vscode.workspace.workspaceFolders ?? []).map(folderInfo),
    folderOf(path) {
      const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(path));
      return folder ? folderInfo(folder) : undefined;
    },
    async findFiles(search) {
      const cancellation = search.signal ? new vscode.CancellationTokenSource() : undefined;
      const cancel = (): void => cancellation?.cancel();
      if (search.signal?.aborted) cancel();
      search.signal?.addEventListener("abort", cancel, { once: true });
      try {
        const uris = await vscode.workspace.findFiles(
          new vscode.RelativePattern(vscode.Uri.file(search.base), search.pattern),
          search.exclude,
          search.maxResults,
          cancellation?.token,
        );
        return uris.map((uri) => uri.fsPath);
      } finally {
        search.signal?.removeEventListener("abort", cancel);
        cancellation?.dispose();
      }
    },
  };
}

function createVscodeSettings(): Settings {
  return {
    section: (name, resource) => vscode.workspace.getConfiguration(name, resource === undefined ? undefined : vscode.Uri.parse(resource)),
    onDidChange: (listener) => vscode.workspace.onDidChangeConfiguration((event) => listener({
      affects: (section) => event.affectsConfiguration(section),
    })),
  };
}

function createVscodeUi(logger: Logger): HostUi {
  return {
    showInformation: (message) => vscode.window.showInformationMessage(message),
    showWarning: (message) => vscode.window.showWarningMessage(message),
    showError: (message) => vscode.window.showErrorMessage(message),
    pickFile: (options) => Promise.resolve(vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      defaultUri: vscode.Uri.file(options.defaultDirectory),
      filters: options.filters,
      openLabel: options.openLabel,
    })).then((picked) => {
      const file = picked?.[0];
      return file ? { path: file.fsPath, local: file.scheme === "file" } : undefined;
    }),
    showProblems: () => vscode.commands.executeCommand<void>("workbench.actions.view.problems"),
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
    setPreviewEditing: (editing) => {
      fireAndForget(
        logger,
        vscode.commands.executeCommand("setContext", "markdownOkfSchemaStudio.previewEditing", editing),
        "Setting the previewEditing context",
      );
    },
    readClipboard: () => vscode.env.clipboard.readText(),
    writeClipboard: (text) => vscode.env.clipboard.writeText(text),
  };
}

/** Git through the optional built-in Git extension (no process is spawned). */
function createVscodeVcsInfo(): VcsInfo {
  const headBaseline = createHeadBaseline<vscode.Uri>(() =>
    vscode.extensions.getExtension("vscode.git") as unknown as GitExtensionLike<vscode.Uri> | undefined);
  return {
    headText: (documentId, currentLength) => headBaseline.read(vscode.Uri.parse(documentId), currentLength),
    userName: (documentId) => headBaseline.userName(vscode.Uri.parse(documentId)),
    watchHead: (documentId, listener) => headBaseline.watch(vscode.Uri.parse(documentId), listener),
  };
}

const SEVERITIES: Readonly<Record<DiagnosticSeverity, vscode.DiagnosticSeverity>> = {
  get error() {
    return vscode.DiagnosticSeverity.Error;
  },
  get warning() {
    return vscode.DiagnosticSeverity.Warning;
  },
  get information() {
    return vscode.DiagnosticSeverity.Information;
  },
  get hint() {
    return vscode.DiagnosticSeverity.Hint;
  },
};

function toDiagnostic(entry: DiagnosticEntry): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(toVscodeRange(entry.range), entry.message, SEVERITIES[entry.severity]);
  if (entry.source !== undefined) diagnostic.source = entry.source;
  if (entry.code !== undefined) diagnostic.code = entry.code;
  return diagnostic;
}

function createVscodeDiagnostics(): Diagnostics {
  return {
    create(name) {
      const collection = vscode.languages.createDiagnosticCollection(name);
      return {
        set: (documentId, entries) => collection.set(vscode.Uri.parse(documentId), entries.map(toDiagnostic)),
        has: (documentId) => collection.has(vscode.Uri.parse(documentId)),
        delete: (documentId) => collection.delete(vscode.Uri.parse(documentId)),
        dispose: () => collection.dispose(),
      };
    },
  };
}

function createVscodeWatcher(): Watcher {
  return {
    watch(base, pattern): FileWatcher {
      const watcher = vscode.workspace.createFileSystemWatcher(base === undefined
        ? pattern
        : new vscode.RelativePattern(vscode.Uri.file(base), pattern));
      return {
        onDidCreate: (listener) => watcher.onDidCreate((uri) => listener(uri.fsPath)),
        onDidChange: (listener) => watcher.onDidChange((uri) => listener(uri.fsPath)),
        onDidDelete: (listener) => watcher.onDidDelete((uri) => listener(uri.fsPath)),
        dispose: () => watcher.dispose(),
      };
    },
  };
}

/** The only schemes handed to the operating system. */
const EXTERNAL_URI_SCHEMES: ReadonlySet<string> = new Set(["http", "https", "mailto"]);

function createVscodeNavigation(): Navigation {
  return {
    async showDocument(documentId, selection) {
      const targetUri = vscode.Uri.parse(documentId);
      const existingGroup = vscode.window.tabGroups.all.find((group) => group.tabs.some((tab) =>
        tab.input instanceof vscode.TabInputText && tab.input.uri.fsPath === targetUri.fsPath));
      await vscode.commands.executeCommand("vscode.open", targetUri, {
        viewColumn: existingGroup?.viewColumn ?? vscode.ViewColumn.One,
        preview: false,
        ...(selection ? { selection: toVscodeRange(selection) } : {}),
      });
    },
    // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-090
    openExternal: async (url) => {
      // Last line of defence: the parsed URI, not the raw string, decides what the OS opens.
      let uri: vscode.Uri;
      try {
        uri = vscode.Uri.parse(url, true);
      } catch {
        return false;
      }
      if (!EXTERNAL_URI_SCHEMES.has(uri.scheme.toLowerCase())) return false;
      return vscode.env.openExternal(uri);
    },
  };
}

/** A VS Code text editor as a {@link PairedEditor}: every read goes to the live editor. */
function pairedEditor(editor: vscode.TextEditor, documents: VscodeDocumentStore): PairedEditor {
  return {
    document: documents.of(editor.document),
    get fsPath() {
      return editor.document.uri.fsPath;
    },
    get firstVisibleLine() {
      return editor.visibleRanges[0]?.start.line;
    },
    isLineVisible: (line) => editor.visibleRanges[0]?.contains(new vscode.Position(line, 0)) ?? false,
    get selectionLine() {
      return editor.selection.active.line;
    },
    get column() {
      return editor.viewColumn;
    },
    revealLine(line, position) {
      const at = new vscode.Position(line, 0);
      editor.revealRange(
        new vscode.Range(at, at),
        position === "top" ? vscode.TextEditorRevealType.AtTop : vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );
    },
  };
}

function createVscodeEditors(documents: VscodeDocumentStore): TextEditors {
  return {
    active: () => {
      const editor = vscode.window.activeTextEditor;
      return editor ? pairedEditor(editor, documents) : undefined;
    },
    visible: () => vscode.window.visibleTextEditors.map((editor) => pairedEditor(editor, documents)),
  };
}

function createVscodeTheme(): ColorTheme {
  return {
    get kind() {
      return vscode.window.activeColorTheme.kind;
    },
  };
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-002
/** The log lines go to one output channel, created when the first line is written. */
function createVscodeLogger(): Logger {
  let channel: vscode.OutputChannel | undefined;
  const write = (level: string, message: string): void => {
    channel ??= vscode.window.createOutputChannel("Markdown OKF-Schema Studio");
    channel.appendLine(`${new Date().toISOString()} [${level}] ${message}`);
  };
  return {
    error: (message, error) => write("error", error === undefined ? message : `${message} ${describeError(error)}`),
    warn: (message) => write("warn", message),
    info: (message) => write("info", message),
  };
}

/** Creates the VS Code host. */
export function createVscodeHost(): VscodeHost {
  const documents = createVscodeDocumentStore();
  const logger = createVscodeLogger();
  return {
    capabilities: {
      undo: true,
      save: true,
      processes: true,
      watch: true,
      editorPairing: true,
      trust: true,
    },
    documents,
    files: createVscodeFileSystem(),
    // The extension host runs in Node: the synchronous schema lookup reads the disk directly.
    schemaFiles: nodeSchemaFiles,
    settings: createVscodeSettings(),
    workspace: createVscodeWorkspaceInfo(),
    ui: createVscodeUi(logger),
    vcs: createVscodeVcsInfo(),
    diagnostics: createVscodeDiagnostics(),
    logger,
    watcher: createVscodeWatcher(),
    processes: createNodeProcessRunner(),
    navigation: createVscodeNavigation(),
    editors: createVscodeEditors(documents),
    theme: createVscodeTheme(),
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-004
    // The source renders run in a worker thread: the extension host stays free while one runs.
    previewRenderer: createWorkerRenderer(),
    editorOf: (editor) => pairedEditor(editor, documents),
    assets: (webview, extensionUri) => ({
      get cspSource() {
        return webview.cspSource;
      },
      resourceUri: (path) => webview.asWebviewUri(vscode.Uri.file(path)).toString(),
      bundleUri: (...segments) => extensionUri
        ? webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "out", "bundle", ...segments)).toString()
        : undefined,
    }),
  };
}
