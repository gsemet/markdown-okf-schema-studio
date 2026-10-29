/**
 * A small in-memory stand-in for the `vscode` module, enough to activate the extension in a unit
 * test, open a preview and talk to its webview: documents, editors, one workspace folder, settings
 * at their defaults, watchers and webview panels that record what the extension does with them.
 * Every member the extension reads at activation or on the preview path exists. A member it starts
 * to use that is missing here is recorded in `missingMembers` (the extension swallows some errors,
 * so a TypeError alone could go unnoticed); the host harness fails a test that touched one.
 */
import * as fs from "node:fs";
import * as path from "node:path";

type Listener<T> = (value: T) => unknown;

/** Names of fake members the extension read although the fake does not define them. */
export const missingMembers = new Set<string>();

const IGNORED_MEMBERS = new Set(["then", "toJSON", "__esModule", "default", "constructor", "inspect", "asymmetricMatch"]);

/** `target`, recording every read of a member it does not have under `name.member`. */
function strict<T extends object>(target: T, name: string): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      if (typeof property === "string" && !(property in object) && !IGNORED_MEMBERS.has(property)) {
        missingMembers.add(`${name}.${property}`);
      }
      return Reflect.get(object, property, receiver);
    },
  });
}

/** A disposable subscription, like `vscode.Disposable`. */
export class Disposable {
  public static from(...items: Array<{ dispose(): unknown }>): Disposable {
    return new Disposable(() => items.forEach((item) => item.dispose()));
  }

  private disposed = false;

  public constructor(private readonly callOnDispose: () => unknown) {}

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.callOnDispose();
  }
}

/** An event source with the `vscode.Event` shape (`event(listener)` returns a disposable). */
export class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>();

  public readonly event = (listener: Listener<T>): Disposable => {
    this.listeners.add(listener);
    return new Disposable(() => this.listeners.delete(listener));
  };

  public fire(value: T): unknown[] {
    return [...this.listeners].map((listener) => listener(value));
  }

  public get size(): number {
    return this.listeners.size;
  }
}

/** `vscode.Uri` for `file:` paths (the only scheme the preview path uses here). */
export class Uri {
  public static file(fsPath: string): Uri {
    return new Uri("file", path.resolve(fsPath));
  }

  public static parse(value: string): Uri {
    const match = /^([a-z][\w+.-]*):(?:\/\/[^/]*)?(.*)$/iu.exec(value);
    if (!match) return new Uri("file", value);
    return new Uri(match[1]!, decodeURIComponent(match[2] ?? ""));
  }

  public static joinPath(base: Uri, ...parts: string[]): Uri {
    return new Uri(base.scheme, path.join(base.fsPath, ...parts));
  }

  public readonly authority = "";
  public readonly query = "";
  public readonly fragment = "";

  public constructor(public readonly scheme: string, public readonly fsPath: string) {}

  public get path(): string {
    return this.fsPath;
  }

  public with(change: { scheme?: string; path?: string }): Uri {
    return new Uri(change.scheme ?? this.scheme, change.path ?? this.fsPath);
  }

  public toString(): string {
    return `${this.scheme}://${encodeURI(this.fsPath)}`;
  }

  public toJSON(): unknown {
    return { scheme: this.scheme, path: this.fsPath };
  }
}

export class Position {
  public constructor(public readonly line: number, public readonly character: number) {}

  public isBefore(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character);
  }

  public isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  public constructor(start: Position | number, end: Position | number, endLine?: number, endCharacter?: number) {
    if (typeof start === "number") {
      this.start = new Position(start, end as number);
      this.end = new Position(endLine ?? start, endCharacter ?? (end as number));
    } else {
      this.start = start;
      this.end = end as Position;
    }
  }

  public get isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }
}

export class Selection extends Range {
  public get active(): Position {
    return this.end;
  }

  public get anchor(): Position {
    return this.start;
  }
}

/** A text document whose text the test changes; the change fires `onDidChangeTextDocument`. */
export class FakeTextDocument {
  public version = 1;
  public isDirty = false;
  public readonly isUntitled = false;
  public readonly isClosed = false;
  public readonly languageId = "markdown";
  public readonly eol = 1;

  public constructor(public readonly uri: Uri, private text: string) {}

  public get fileName(): string {
    return this.uri.fsPath;
  }

  public get lineCount(): number {
    return this.text.split("\n").length;
  }

  public getText(range?: Range): string {
    if (!range) return this.text;
    return this.text.slice(this.offsetAt(range.start), this.offsetAt(range.end));
  }

  public offsetAt(position: Position): number {
    const lines = this.text.split("\n");
    let offset = 0;
    for (let line = 0; line < Math.min(position.line, lines.length); line += 1) offset += lines[line]!.length + 1;
    return Math.min(this.text.length, offset + position.character);
  }

  public positionAt(offset: number): Position {
    const before = this.text.slice(0, Math.max(0, Math.min(offset, this.text.length)));
    const lines = before.split("\n");
    return new Position(lines.length - 1, lines.at(-1)!.length);
  }

  public lineAt(line: number | Position): { text: string; range: Range; lineNumber: number } {
    const index = typeof line === "number" ? line : line.line;
    const text = this.text.split("\n")[index] ?? "";
    return { text, range: new Range(index, 0, index, text.length), lineNumber: index };
  }

  public validateRange(range: Range): Range {
    return range;
  }

  public save(): Promise<boolean> {
    fs.writeFileSync(this.uri.fsPath, this.text, "utf8");
    this.isDirty = false;
    return Promise.resolve(true);
  }

  /** Replaces the whole text (a new version); returns the change event the editor would send. */
  public replaceText(text: string): { document: FakeTextDocument; contentChanges: unknown[]; reason: undefined } {
    const end = this.positionAt(this.text.length);
    const previousLength = this.text.length;
    this.text = text;
    this.version += 1;
    this.isDirty = true;
    return {
      document: this,
      contentChanges: [{
        range: new Range(new Position(0, 0), end),
        rangeOffset: 0,
        rangeLength: previousLength,
        text,
      }],
      reason: undefined,
    };
  }
}

/** A webview panel that records the documents assigned to it and the messages posted to it. */
export class FakeWebviewPanel {
  public readonly htmlAssignments: string[] = [];
  public readonly posted: Array<Record<string, unknown>> = [];
  /** Messages and documents the extension tried to give the panel after it was disposed. */
  public readonly afterDispose: Array<{ kind: "message" | "html"; value: unknown }> = [];
  public readonly fromPage = new Emitter<unknown>();
  public readonly onDispose = new Emitter<void>();
  public readonly onViewState = new Emitter<unknown>();
  public disposed = false;
  public visible = true;
  public active = false;
  public viewColumn: number | undefined = 2;
  public title: string;
  public iconPath: unknown;
  private html = "";

  public readonly webview: {
    html: string;
    cspSource: string;
    options: Record<string, unknown>;
    asWebviewUri(uri: Uri): Uri;
    onDidReceiveMessage: Emitter<unknown>["event"];
    postMessage(message: Record<string, unknown>): Promise<boolean>;
  };

  public readonly onDidDispose = this.onDispose.event;
  public readonly onDidChangeViewState = this.onViewState.event;

  public constructor(public readonly viewType: string, title: string) {
    this.title = title;
    const panel = this;
    this.webview = strict({
      cspSource: "vscode-webview://fake-csp",
      options: {},
      asWebviewUri: (uri) => uri,
      onDidReceiveMessage: this.fromPage.event,
      postMessage: (message) => {
        if (panel.disposed) {
          panel.afterDispose.push({ kind: "message", value: message });
          return Promise.resolve(false);
        }
        panel.posted.push(message);
        return Promise.resolve(true);
      },
      get html(): string {
        return panel.html;
      },
      set html(value: string) {
        if (panel.disposed) {
          panel.afterDispose.push({ kind: "html", value });
          throw new Error("Webview is disposed");
        }
        panel.html = value;
        panel.htmlAssignments.push(value);
      },
    }, "Webview");
  }

  public reveal(column?: number): void {
    if (column !== undefined && column > 0) this.viewColumn = column;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.onDispose.fire();
  }
}

class FakeWatcher {
  public readonly changed = new Emitter<Uri>();
  public readonly created = new Emitter<Uri>();
  public readonly deleted = new Emitter<Uri>();
  public readonly onDidChange = this.changed.event;
  public readonly onDidCreate = this.created.event;
  public readonly onDidDelete = this.deleted.event;
  public disposed = false;

  public dispose(): void {
    this.disposed = true;
  }
}

class WorkspaceEdit {
  private readonly edits: Array<{ uri: Uri; range: Range; text: string }> = [];

  public replace(uri: Uri, range: Range, text: string): void {
    this.edits.push({ uri, range, text });
  }

  public insert(uri: Uri, position: Position, text: string): void {
    this.edits.push({ uri, range: new Range(position, position), text });
  }

  public delete(uri: Uri, range: Range): void {
    this.edits.push({ uri, range, text: "" });
  }

  public entries(): Array<[Uri, Array<{ range: Range; newText: string }>]> {
    return this.edits.map((edit) => [edit.uri, [{ range: edit.range, newText: edit.text }]]);
  }

  public get size(): number {
    return this.edits.length;
  }
}

export interface FakeVscodeOptions {
  /** The single workspace folder. */
  workspaceRoot: string;
}

/** Builds a fresh fake `vscode` module; `controls` lets the test drive it. */
export function createFakeVscode(options: FakeVscodeOptions) {
  const folderUri = Uri.file(options.workspaceRoot);
  const workspaceFolder = { uri: folderUri, name: path.basename(options.workspaceRoot), index: 0 };
  const textDocuments: FakeTextDocument[] = [];
  const panels: FakeWebviewPanel[] = [];
  const watchers: FakeWatcher[] = [];
  const commands = new Map<string, (...args: unknown[]) => unknown>();
  const executedCommands: Array<{ id: string; args: unknown[] }> = [];
  const shownMessages: Array<{ kind: string; text: string }> = [];
  const outputLines: string[] = [];
  /** The targets `workspace.fs.rename` deleted before renaming onto them (see its `overwrite`). */
  const targetsDeletedByRename: string[] = [];
  const events = {
    changeTextDocument: new Emitter<unknown>(),
    saveTextDocument: new Emitter<unknown>(),
    closeTextDocument: new Emitter<unknown>(),
    grantTrust: new Emitter<void>(),
    changeConfiguration: new Emitter<unknown>(),
    changeActiveEditor: new Emitter<unknown>(),
    changeVisibleEditors: new Emitter<unknown>(),
    changeVisibleRanges: new Emitter<unknown>(),
    changeColorTheme: new Emitter<unknown>(),
    renameFiles: new Emitter<unknown>(),
    changeWorkspaceFolders: new Emitter<unknown>(),
    changeTabGroups: new Emitter<unknown>(),
    changeTabs: new Emitter<unknown>(),
  };

  const editorFor = (document: FakeTextDocument) => strict({
    document,
    selection: new Selection(new Position(0, 0), new Position(0, 0)),
    selections: [new Selection(new Position(0, 0), new Position(0, 0))],
    visibleRanges: [new Range(0, 0, 40, 0)],
    viewColumn: 1,
    options: {},
    revealRange: (): void => undefined,
    setDecorations: (): void => undefined,
    edit: (): Promise<boolean> => Promise.resolve(true),
  }, "TextEditor");

  /** The active tab when it is a custom editor (set by a test); undefined otherwise. */
  let activeCustomTab: { uri: Uri; viewType: string } | undefined;

  const window = {
    activeTextEditor: undefined as ReturnType<typeof editorFor> | undefined,
    visibleTextEditors: [] as Array<ReturnType<typeof editorFor>>,
    activeColorTheme: { kind: 2 },
    tabGroups: strict({
      get all() {
        const columns = new Set<number>([1, ...panels.filter((panel) => !panel.disposed)
          .map((panel) => panel.viewColumn ?? 1)]);
        return [...columns].map((viewColumn) => ({
          viewColumn,
          isActive: viewColumn === 1,
          tabs: panels.filter((panel) => !panel.disposed && panel.viewColumn === viewColumn)
            .map((panel) => ({ label: panel.title, input: new TabInputWebview(panel.viewType), isActive: true })),
        }));
      },
      get activeTabGroup() {
        const group = this.all[0]!;
        return {
          ...group,
          activeTab: activeCustomTab
            ? { label: "Studio", input: new TabInputCustom(activeCustomTab.uri, activeCustomTab.viewType), isActive: true }
            : undefined,
        };
      },
      onDidChangeTabGroups: events.changeTabGroups.event,
      onDidChangeTabs: events.changeTabs.event,
      close: (): Promise<boolean> => Promise.resolve(true),
    }, "tabGroups"),
    createWebviewPanel: (viewType: string, title: string, column: unknown): FakeWebviewPanel => {
      const panel = new FakeWebviewPanel(viewType, title);
      panel.viewColumn = typeof column === "number" && column > 0 ? column : 2;
      panels.push(panel);
      return strict(panel, "WebviewPanel");
    },
    showTextDocument: (document: FakeTextDocument) => {
      const editor = editorFor(document);
      window.activeTextEditor = editor;
      window.visibleTextEditors = [editor];
      return Promise.resolve(editor);
    },
    createOutputChannel: () => ({ appendLine: (line: string) => void outputLines.push(line) }),
    showInformationMessage: (text: string) => {
      shownMessages.push({ kind: "information", text });
      return Promise.resolve(undefined);
    },
    showWarningMessage: (text: string) => {
      shownMessages.push({ kind: "warning", text });
      return Promise.resolve(undefined);
    },
    showErrorMessage: (text: string) => {
      shownMessages.push({ kind: "error", text });
      return Promise.resolve(undefined);
    },
    showOpenDialog: () => Promise.resolve(undefined),
    registerCustomEditorProvider: () => new Disposable(() => undefined),
    registerWebviewPanelSerializer: () => new Disposable(() => undefined),
    createTextEditorDecorationType: () => ({ key: "decoration", dispose: (): void => undefined }),
    onDidChangeActiveTextEditor: events.changeActiveEditor.event,
    onDidChangeVisibleTextEditors: events.changeVisibleEditors.event,
    onDidChangeTextEditorVisibleRanges: events.changeVisibleRanges.event,
    onDidChangeTextEditorSelection: new Emitter<unknown>().event,
    onDidChangeActiveColorTheme: events.changeColorTheme.event,
  };

  const workspace = {
    workspaceFolders: [workspaceFolder],
    isTrusted: true,
    textDocuments,
    getWorkspaceFolder: (uri: Uri) => (
      uri.fsPath === folderUri.fsPath || uri.fsPath.startsWith(folderUri.fsPath + path.sep) ? workspaceFolder : undefined
    ),
    getConfiguration: () => ({
      get: <T>(_key: string, defaultValue?: T): T | undefined => defaultValue,
      has: (): boolean => false,
      inspect: (): undefined => undefined,
      update: (): Promise<void> => Promise.resolve(),
    }),
    openTextDocument: (uri: Uri) => {
      const existing = textDocuments.find((document) => document.uri.fsPath === uri.fsPath);
      if (existing) return Promise.resolve(existing);
      const document = new FakeTextDocument(uri, fs.readFileSync(uri.fsPath, "utf8"));
      textDocuments.push(document);
      return Promise.resolve(document);
    },
    createFileSystemWatcher: () => {
      const watcher = new FakeWatcher();
      watchers.push(watcher);
      return watcher;
    },
    findFiles: () => Promise.resolve([]),
    applyEdit: () => Promise.resolve(false),
    fs: strict({
      readFile: (uri: Uri) => fs.promises.readFile(uri.fsPath).then((data) => new Uint8Array(data)),
      writeFile: (uri: Uri, data: Uint8Array) => fs.promises.writeFile(uri.fsPath, data),
      stat: (uri: Uri) => fs.promises.stat(uri.fsPath).then((stat) => ({
        type: stat.isDirectory() ? 2 : 1, size: stat.size, mtime: stat.mtimeMs, ctime: stat.ctimeMs,
      })),
      readDirectory: () => Promise.resolve([]),
      // Like VS Code's FileService.move: with `overwrite`, an existing target is DELETED first and
      // the source renamed after, so the target is missing in between; without it, refused.
      rename: async (from: Uri, to: Uri, renameOptions?: { overwrite?: boolean }) => {
        const exists = await fs.promises.stat(to.fsPath).then(() => true, () => false);
        if (exists && renameOptions?.overwrite !== true) {
          throw Object.assign(new Error(`EntryExists: ${to.fsPath}`), { code: "FileExists" });
        }
        if (exists) {
          await fs.promises.rm(to.fsPath, { recursive: true });
          targetsDeletedByRename.push(to.fsPath);
        }
        await fs.promises.rename(from.fsPath, to.fsPath);
      },
      delete: () => Promise.resolve(),
      createDirectory: (uri: Uri) => fs.promises.mkdir(uri.fsPath, { recursive: true }).then(() => undefined),
    }, "workspace.fs"),
    onDidChangeTextDocument: events.changeTextDocument.event,
    onDidSaveTextDocument: events.saveTextDocument.event,
    onDidCloseTextDocument: events.closeTextDocument.event,
    onDidOpenTextDocument: new Emitter<unknown>().event,
    onDidGrantWorkspaceTrust: events.grantTrust.event,
    onDidChangeConfiguration: events.changeConfiguration.event,
    onDidRenameFiles: events.renameFiles.event,
    onDidChangeWorkspaceFolders: events.changeWorkspaceFolders.event,
  };

  class TabInputWebview {
    public constructor(public readonly viewType: string) {}
  }

  class TabInputCustom {
    public constructor(public readonly uri: Uri, public readonly viewType: string) {}
  }

  class TabInputText {
    public constructor(public readonly uri: Uri) {}
  }

  const vscode = {
    Uri,
    Position,
    Range,
    Selection,
    Disposable,
    EventEmitter: Emitter,
    RelativePattern: class {
      public constructor(public readonly base: unknown, public readonly pattern: string) {}
    },
    WorkspaceEdit,
    TabInputWebview,
    TabInputText,
    TabInputCustom,
    Diagnostic: class {
      public source?: string;
      public code?: unknown;
      public constructor(public readonly range: Range, public readonly message: string, public readonly severity: number) {}
    },
    CancellationTokenSource: class {
      public readonly token = { isCancellationRequested: false, onCancellationRequested: new Emitter<void>().event };
      public cancel(): void {
        this.token.isCancellationRequested = true;
      }

      public dispose(): void {}
    },
    FileSystemError: class extends Error {
      public static FileNotFound(): Error {
        return new Error("FileNotFound");
      }
    },
    ViewColumn: { Active: -1, Beside: -2, One: 1, Two: 2, Three: 3 },
    TextEditorRevealType: { Default: 0, InCenter: 1, InCenterIfOutsideViewport: 2, AtTop: 3 },
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
    FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
    EndOfLine: { LF: 1, CRLF: 2 },
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
    window: strict(window, "window"),
    workspace: strict(workspace, "workspace"),
    commands: {
      registerCommand: (id: string, callback: (...args: unknown[]) => unknown) => {
        commands.set(id, callback);
        return new Disposable(() => commands.delete(id));
      },
      executeCommand: (id: string, ...args: unknown[]) => {
        executedCommands.push({ id, args });
        const command = commands.get(id);
        return Promise.resolve(command ? command(...args) : undefined);
      },
    },
    languages: {
      createDiagnosticCollection: () => {
        const entries = new Map<string, unknown>();
        return strict({
          set: (uri: Uri, diagnostics: unknown) => entries.set(uri.toString(), diagnostics),
          delete: (uri: Uri) => entries.delete(uri.toString()),
          get: (uri: Uri) => entries.get(uri.toString()),
          has: (uri: Uri) => entries.has(uri.toString()),
          clear: () => entries.clear(),
          forEach: () => undefined,
          dispose: () => entries.clear(),
        }, "DiagnosticCollection");
      },
    },
    env: {
      clipboard: { readText: () => Promise.resolve(""), writeText: () => Promise.resolve() },
      openExternal: () => Promise.resolve(true),
      appName: "Fake Code",
      language: "en",
    },
    extensions: { getExtension: (): undefined => undefined },
  };

  /** Opens `filePath` in the (only) text editor, as the active and visible editor. */
  const showDocument = async (filePath: string): Promise<FakeTextDocument> => {
    const document = await workspace.openTextDocument(Uri.file(filePath));
    activeCustomTab = undefined;
    await window.showTextDocument(document);
    return document;
  };

  return {
    vscode: strict({
      ...vscode,
      commands: strict(vscode.commands, "commands"),
      languages: strict(vscode.languages, "languages"),
      env: strict(vscode.env, "env"),
      extensions: strict(vscode.extensions, "extensions"),
    }, "vscode"),
    controls: {
      panels,
      watchers,
      commands,
      executedCommands,
      shownMessages,
      outputLines,
      targetsDeletedByRename,
      events,
      showDocument,
      /** Makes a custom editor tab of `filePath` the active tab (no text editor is active then). */
      activateCustomEditorTab: (filePath: string | undefined, viewType = "markdown-okf-schema-studio.editor"): void => {
        activeCustomTab = filePath === undefined ? undefined : { uri: Uri.file(filePath), viewType };
        if (filePath !== undefined) window.activeTextEditor = undefined;
      },
      /** Changes the document text as typing would, and tells the extension. */
      changeDocument: (document: FakeTextDocument, text: string): void => {
        events.changeTextDocument.fire(document.replaceText(text));
      },
      context: () => {
        const state = new Map<string, unknown>();
        const memento = {
          get: <T>(key: string, defaultValue?: T): T | undefined => (state.has(key) ? state.get(key) as T : defaultValue),
          update: (key: string, value: unknown) => {
            if (value === undefined) state.delete(key);
            else state.set(key, value);
            return Promise.resolve();
          },
          keys: () => [...state.keys()],
          setKeysForSync: (): void => undefined,
        };
        const extensionRoot = path.resolve(__dirname, "../../..");
        return {
          subscriptions: [] as Array<{ dispose(): unknown }>,
          extensionUri: Uri.file(extensionRoot),
          extensionPath: extensionRoot,
          workspaceState: memento,
          globalState: memento,
          asAbsolutePath: (relative: string) => path.join(extensionRoot, relative),
        };
      },
    },
  };
}

export type FakeVscode = ReturnType<typeof createFakeVscode>;
