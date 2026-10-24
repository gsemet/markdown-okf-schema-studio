/**
 * The preview manager: the set of live preview sessions of one activation, the one that is active,
 * and the feature controllers that work on them. It creates a session for a panel and a document,
 * switches a session to another document, disposes it with its panel, and turns the host's events
 * (document changes, saves, renames, settings, editors, theme) into work on the sessions concerned.
 * Host-neutral: everything goes through the ports of `src/host-api/`; the VS Code activation
 * (`src/host-vscode/activation.ts`) creates the panels and forwards the events.
 */

import * as path from "node:path";

import { BuildQueue } from "../build/buildQueue";
import { FRONTMATTER_CONFIGURATION_SECTION, readFrontmatterConfiguration } from "../configuration/frontmatterConfiguration";
import {
  PLANTUML_CONFIGURATION_SECTION,
  readPlantUmlConfiguration,
  readPlantUmlEngineSettings,
} from "../configuration/plantUmlConfiguration";
import { PREVIEW_CONFIGURATION_SECTION, readPreviewConfiguration } from "../configuration/previewConfiguration";
import { invalidateStemIndex } from "../frontmatter/fileLinks";
import type { HostDocument } from "../host-api/documentStore";
import type { DocumentChange } from "../host-api/documentStore";
import type { Disposable } from "../host-api/events";
import type { HostServices } from "../host-api/index";
import type { PanelGroups, PreviewPanel } from "../host-api/previewPanel";
import type { SettingsChange } from "../host-api/settings";
import type { PairedEditor } from "../host-api/textEditors";
import type { FileWatcher } from "../host-api/watcher";
import type { WorkspaceFolderInfo } from "../host-api/workspaceInfo";
import { invalidateConfCache, locateConfFor } from "../myst/confLocator";
import { createPreviewNavigator, type PreviewNavigator } from "../navigation/previewNavigation";
import { canonicalPath, sourceExists } from "../node-services/paths";
import { LatestRequest } from "../preview/flushWait";
import { isOutsideChange } from "../preview/updatedRanges";
import { buildStatusWebviewHtml, type PreviewStatus } from "../preview/webview";
import { createMessageRouter } from "../protocol/router";
import type { PageToHostMessage } from "../protocol/pageToHost";
import type { Revision } from "../protocol/revision";
import { renderPreviewDocument, type PreviewDocument, type RenderResult } from "../render/renderPipeline";
import type { BlockRangeChange } from "../state/blockRange";
import { BoundedMap, MAX_DOCUMENT_STATES } from "../state/boundedState";
import { isUnchangedSave } from "../state/editLock";
import type { PreviewPanelState } from "../state/previewState";
import { BlockEditController } from "./features/blockEdits";
import { CommentsController } from "./features/comments";
import { DiagnosticsController } from "./features/diagnostics";
import { FrontmatterController } from "./features/frontmatter";
import { HistoryController } from "./features/history";
import { HostRequestController } from "./features/hostRequests";
import { IncomingChangesController } from "./features/incomingChanges";
import { LinkController } from "./features/links";
import { PlantUmlController } from "./features/plantUml";
import { RenderingController } from "./features/rendering";
import { ScrollSyncController } from "./features/scrollSync";
import { SourceEditController } from "./features/sourceEdits";
import { ViewStateController } from "./features/viewState";
import { PageMessageDispatcher, type PageMessageResult, type PageMessageRouter } from "./pageMessages";
import { PreviewSession } from "./previewSession";
import { isDocumentEligible, isPathWithin } from "./sessionDocuments";
import { WorkspaceChoices } from "./workspaceChoices";

/** A file the host renamed or moved; `local` when both paths are files of the local file system. */
export interface RenamedFile {
  oldPath: string;
  newPath: string;
  local: boolean;
}

/** The identity a page message names, as the render gate compares it. */
export interface PageMessageIdentity {
  type: string;
  documentId: string;
  revision: Revision;
  requestId: number;
  editId?: string;
}

// Directories that churn constantly during builds; watching them would cost far more
// than the preview could ever gain from them.
const IGNORED_WATCH_SEGMENTS = new Set([
  ".git",
  ".venv",
  ".vscode-test",
  "_build",
  "dist",
  "htmlcov",
  "node_modules",
  "out",
  "output",
  "public",
  "tmp",
]);

function isIgnoredWatchPath(filePath: string): boolean {
  return filePath.split(path.sep).some((segment) => IGNORED_WATCH_SEGMENTS.has(segment));
}

function sameFile(a: string | undefined, b: string): boolean {
  return a !== undefined && canonicalPath(a) === canonicalPath(b);
}

/** The render pipeline's view of a host document (a saved Markdown file). */
function previewDocumentOf(document: HostDocument, filePath: string): PreviewDocument {
  return {
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markdown",
    getText: () => document.getText(),
  };
}

interface StemRootWatcher {
  watcher: FileWatcher;
  subscriptions: Disposable[];
}

/** The live previews of one activation and the controllers of their features. */
export class PreviewManager {
  /** Resolves the links of the pages under the navigation rules. */
  public readonly navigator: PreviewNavigator;
  /** The workspace choices of the pages (theme mode, view preferences, edit and palette modes). */
  public readonly choices: WorkspaceChoices;

  public readonly rendering: RenderingController;
  public readonly edits: BlockEditController;
  public readonly sourceEdits: SourceEditController;
  public readonly frontmatter: FrontmatterController;
  public readonly links: LinkController;
  public readonly history: HistoryController;
  public readonly incoming: IncomingChangesController;
  public readonly comments: CommentsController;
  public readonly diagnostics: DiagnosticsController;
  public readonly plantUml: PlantUmlController;
  public readonly requests: HostRequestController;
  public readonly scroll: ScrollSyncController;
  public readonly view: ViewStateController;

  /** The router every controller registers its page message handlers on. */
  private readonly router: PageMessageRouter;
  private readonly dispatcher: PageMessageDispatcher;
  /** The live sessions, oldest first. */
  private readonly live = new Set<PreviewSession>();
  private activeSession: PreviewSession | undefined;
  /** Document switches of a panel queue behind each other; only the latest request is applied. */
  private readonly switchChains = new WeakMap<PreviewPanel, Promise<void>>();
  private readonly latestSwitches = new WeakMap<PreviewPanel, LatestRequest<HostDocument>>();
  /** One `.md` watcher per workspace root: it keeps the filename-stem index of links current. */
  private readonly stemRootWatchers = new Map<string, StemRootWatcher>();

  /**
   * `host`: the ports. `groups`: the editor-group lock of side previews. Every feature controller
   * registers its page message handlers here.
   */
  public constructor(
    public readonly host: HostServices,
    private readonly groups: PanelGroups,
  ) {
    this.navigator = createPreviewNavigator(host.files);
    this.choices = new WorkspaceChoices(host);
    this.router = createMessageRouter<PageToHostMessage, [PreviewSession], PageMessageResult>();
    this.rendering = new RenderingController(this);
    this.edits = new BlockEditController(this);
    this.sourceEdits = new SourceEditController(this);
    this.frontmatter = new FrontmatterController(this);
    this.links = new LinkController(this);
    this.history = new HistoryController(this);
    this.incoming = new IncomingChangesController(this);
    this.comments = new CommentsController(this);
    this.diagnostics = new DiagnosticsController(this);
    this.plantUml = new PlantUmlController(this);
    this.requests = new HostRequestController(this);
    this.scroll = new ScrollSyncController(this);
    this.view = new ViewStateController(this);
    for (const controller of [
      this.requests, this.history, this.view, this.edits, this.sourceEdits, this.plantUml,
      this.comments, this.links, this.frontmatter, this.rendering, this.scroll,
    ]) {
      controller.register(this.router);
    }
    this.dispatcher = new PageMessageDispatcher(this, this.router);
  }

  // ---------------------------------------------------------------------------------------------
  // The set of sessions
  // ---------------------------------------------------------------------------------------------

  /** The session created or switched last that is still live; the target of the refresh command. */
  public get active(): PreviewSession | undefined {
    return this.activeSession;
  }

  /** True while `session` is one of the live sessions. */
  public has(session: PreviewSession): boolean {
    return this.live.has(session);
  }

  /** The live sessions, oldest first (the set itself: iterate, never keep). */
  public sessions(): ReadonlySet<PreviewSession> {
    return this.live;
  }

  /** The newest live session that `matches`. */
  public latest(matches: (session: PreviewSession) => boolean = () => true): PreviewSession | undefined {
    return [...this.live].reverse().find((session) => !session.disposed && matches(session));
  }

  /** True when a message names the render the session holds (document, revision and request). */
  public matchesCurrent(session: PreviewSession, message: PageMessageIdentity): boolean {
    const stage = session.stage;
    const activeBlockEdit = session.edits.active;
    const matchesActiveBlockEdit = activeBlockEdit !== undefined
      && (message.type === "previewEditSave" || message.type === "previewEditCancel")
      && message.editId === activeBlockEdit.editId
      && message.documentId === activeBlockEdit.documentId
      && message.revision === activeBlockEdit.revision
      && message.requestId === activeBlockEdit.requestId;
    return !session.disposed
      && this.live.has(session)
      && stage !== undefined
      && session.documentUri === stage.activeDocumentIdentity
      && message.documentId === stage.activeDocumentIdentity
      && (message.revision === stage.activeDocumentRevision || matchesActiveBlockEdit)
      && message.requestId === stage.requestId;
  }

  /** Every message of a session's page arrives here (see {@link PageMessageDispatcher}). */
  public handlePageMessage(session: PreviewSession, value: unknown): PromiseLike<void> | undefined {
    return this.dispatcher.handle(session, value);
  }

  // ---------------------------------------------------------------------------------------------
  // Paths
  // ---------------------------------------------------------------------------------------------

  /** The file system path of a document (for a document that is not a file, the path of its id). */
  public pathOf(document: HostDocument): string {
    return document.path ?? this.host.documents.pathOf(document.id);
  }

  /** The file system path of the document the session shows. */
  public activePathOf(session: PreviewSession): string {
    return session.document ? this.pathOf(session.document) : this.host.documents.pathOf(session.documentUri);
  }

  /** The path with its symbolic links resolved; the resolved path when the file does not exist. */
  public readonly canonicalPath = canonicalPath;

  /** True when the session's source is an existing Markdown file inside its root. */
  public sourceAvailable(session: PreviewSession): boolean {
    const sourcePath = this.activePathOf(session);
    return (!session.document || isDocumentEligible(session.document))
      && isPathWithin(canonicalPath(session.workspaceRoot), canonicalPath(sourcePath))
      && sourceExists(sourcePath);
  }

  /** The panel title: the side preview that follows the editor says so. */
  public previewTitle(session: { followsActiveEditor: boolean }, filePath: string): string {
    const name = path.basename(filePath);
    return session.followsActiveEditor ? `Studio · ${name}` : name;
  }

  // ---------------------------------------------------------------------------------------------
  // Lifecycle of a session
  // ---------------------------------------------------------------------------------------------

  /**
   * Creates the session of `panel` for `document` (or, for a restored panel whose document could
   * not be opened, for the document `restoredState` names). The session renders nothing until
   * {@link requestDocument}.
   */
  public createSession(
    panel: PreviewPanel,
    document: HostDocument | undefined,
    workspaceFolder: WorkspaceFolderInfo | undefined,
    restoredState?: PreviewPanelState,
    followsActiveEditor = true,
  ): PreviewSession {
    const { host } = this;
    const documentUri = document?.id ?? restoredState?.documentId ?? "";
    const sourcePath = (document ? document.path : undefined) ?? restoredState?.sourceFile;
    if (!sourcePath) {
      throw new Error("The preview source path is unavailable.");
    }
    const savedDescriptions = this.choices.collapsedDescriptionsOf(documentUri);
    if (restoredState?.descriptionsCollapsed === undefined && typeof savedDescriptions === "boolean") {
      restoredState = { ...restoredState, documentId: documentUri, sourceFile: sourcePath,
        descriptionsCollapsed: savedDescriptions };
    }
    const documentDirectory = path.dirname(path.resolve(sourcePath));
    const readOnly = workspaceFolder === undefined || !host.workspace.trusted;
    const resourceRoot = readOnly ? documentDirectory : workspaceFolder.path;
    const sessionRoots = readOnly ? [] : host.workspace.folders().map((folder) => folder.path);
    const navigationRoots = readOnly
      ? [documentDirectory]
      : [...new Set([resourceRoot, ...sessionRoots])];
    const initialStatus: PreviewStatus = document
      && isDocumentEligible(document)
      && sourceExists(this.pathOf(document))
      ? "pending"
      : "missing-source";
    const initialMessage = initialStatus === "pending"
      ? "Waiting for the first render."
      : "The active Markdown source is unavailable.";
    const session = new PreviewSession({
      panel,
      followsActiveEditor,
      document,
      documentUri,
      workspaceRoot: resourceRoot,
      sessionRoots,
      navigationRoots,
      workspaceFolder,
      readOnly,
      webview: {
        html: buildStatusWebviewHtml(initialStatus, panel.cspSource, initialMessage),
        diagnostics: [],
        nonce: "",
      },
      states: new BoundedMap<PreviewPanelState>(
        MAX_DOCUMENT_STATES,
        restoredState ? [[documentUri, restoredState]] : [],
      ),
      state: restoredState,
      status: initialStatus,
      configuration: readPreviewConfiguration(host.settings.section(PREVIEW_CONFIGURATION_SECTION)),
      plantUmlConfiguration: readPlantUmlConfiguration(host.settings.section(PLANTUML_CONFIGURATION_SECTION)),
      plantUmlEngineSettings: readPlantUmlEngineSettings(host.settings.section(PLANTUML_CONFIGURATION_SECTION)),
      frontmatterConfiguration: readFrontmatterConfiguration(host.settings.section(FRONTMATTER_CONFIGURATION_SECTION)),
    });
    session.queue = new BuildQueue<HostDocument, RenderResult>({
      debounceMs: 40,
      revisionOf: (queued) => queued.revision,
      build: (request, signal) => renderPreviewDocument({
        document: previewDocumentOf(request.document, this.pathOf(request.document)),
        revision: request.document.revision,
        workspaceRoot: resourceRoot,
        requestId: request.requestId,
        documentIdentity: request.document.id,
        signal,
        isWorkspaceTrusted: () => host.workspace.trusted,
        allowUntrusted: true,
        plantUmlJarPath: session.plantUmlConfiguration.jarPath,
        plantUmlEngine: this.plantUml.engineFor(session),
      }),
      onState: (state) => this.rendering.handleQueueState(session, state),
      disposeResult: (result) => result.stage.dispose(),
    });
    const dependencyWatcher = host.watcher.watch(resourceRoot, "**/*");
    session.dependencyWatcher = dependencyWatcher;
    session.dependencyWatcherSubscriptions = [
      dependencyWatcher.onDidChange((changedPath) => {
        this.refreshReferencedPath(session, changedPath);
      }),
      dependencyWatcher.onDidCreate((createdPath) => {
        this.refreshReferencedPath(session, createdPath);
        if (session.status === "missing-source") {
          this.recoverMissingSource(session);
        }
      }),
      dependencyWatcher.onDidDelete((deletedPath) => {
        if (canonicalPath(deletedPath) === canonicalPath(this.activePathOf(session))) {
          this.rendering.setMissingSource(session, "The active Markdown source was deleted.");
        } else {
          this.refreshReferencedPath(session, deletedPath);
        }
      }),
    ];
    this.rendering.setResourceRoots(session, []);
    this.rendering.assignWebviewHtml(session, session.webview.html);
    panel.title = document ? this.previewTitle(session, this.pathOf(document)) : "Studio";
    this.live.add(session);
    this.activeSession = session;
    // The view state also changes when the panel only gains or loses focus. Only a hidden panel
    // that becomes visible needs to catch up with the editor; a focus change keeps its anchor.
    let wasVisible = panel.visible;
    session.panelSubscriptions.push(
      panel.onDidReceiveMessage((message) => this.handlePageMessage(session, message)),
      panel.onDidChangeViewState(() => {
        if (session.lockedColumn !== undefined && panel.column !== undefined) {
          // The column shifts when a group on the left closes, but the locked group is the same.
          session.lockedColumn = panel.column;
        }
        const becameVisible = panel.visible && !wasVisible;
        wasVisible = panel.visible;
        if (becameVisible) {
          this.scroll.restorePreviewState(session);
        }
      }),
      panel.onDidChangeLayout(() => {
        // Closing a group on the left shifts the column of the locked group without a view-state event.
        if (session.lockedColumn === undefined || session.disposed) return;
        try {
          if (panel.column !== undefined) session.lockedColumn = panel.column;
        } catch {
          // The panel is already gone.
        }
      }),
      panel.onDidDispose(() => {
        this.releaseGroupLock(session);
        this.disposeSession(session, false);
      }),
    );
    return session;
  }

  /** Locks the group of a new side preview (see {@link PanelGroups.lockNewPanelGroup}). */
  public async lockNewGroup(session: PreviewSession): Promise<void> {
    const locked = await this.groups.lockNewPanelGroup(session.panel);
    if (locked && !session.disposed && session.panel.column !== undefined) {
      session.lockedColumn = session.panel.column;
    }
  }

  /** The session's panel goes away: unlock its group one tick later, if this extension locked it. */
  private releaseGroupLock(session: PreviewSession): void {
    const lockedColumn = session.lockedColumn;
    if (lockedColumn === undefined) return;
    session.lockedColumn = undefined;
    this.groups.release(lockedColumn);
  }

  /** True when a live session's panel is in the group at `column`. */
  public hasLivePanelIn(column: number): boolean {
    return [...this.live].some((candidate) => !candidate.disposed && candidate.panel.column === column);
  }

  /** Renders `document` in the session, or shows why it cannot. */
  public async requestDocument(session: PreviewSession, document: HostDocument): Promise<void> {
    if (session.disposed || !this.live.has(session)) {
      return;
    }
    if (!isDocumentEligible(document)) {
      this.rendering.setMissingSource(session, "The restored or active source is not a Markdown file.");
      return;
    }
    if (!this.sourceAvailable(session)) {
      this.rendering.setMissingSource(session);
      return;
    }
    session.document = document;
    const outcome = await session.queue.request(document);
    if (outcome.status === "failed" && this.live.has(session) && !session.stage) {
      this.rendering.setStatus(session, "error", outcome.error instanceof Error ? outcome.error.message : "The render failed.");
    }
  }

  /** Renders `document` in the session; a failure shows the error status. */
  public startRender(session: PreviewSession, document: HostDocument): void {
    void this.requestDocument(session, document).catch((error: unknown) => {
      if (this.live.has(session) && !session.disposed) {
        this.rendering.setStatus(session, "error", error instanceof Error ? error.message : String(error));
      }
    });
  }

  /**
   * The side preview follows the active editor: before it switches document, the page saves and
   * closes its open editors (CR 025). Switches queue behind each other and only the latest request
   * is applied, so A -> B -> A during the flush ends on A.
   */
  public switchAfterFlush(session: PreviewSession, document: HostDocument): void {
    if (!isDocumentEligible(document)) {
      return;
    }
    const panel = session.panel;
    let latest = this.latestSwitches.get(panel);
    if (!latest) {
      latest = new LatestRequest<HostDocument>();
      this.latestSwitches.set(panel, latest);
    }
    if (latest.idle && document.id === session.documentUri) {
      return;
    }
    latest.request(document);
    const queue = latest;
    const chain = (this.switchChains.get(panel) ?? Promise.resolve())
      .then(() => this.edits.flushPageEdits(session))
      .catch((error: unknown) => console.error("Failed to flush the open editor before the switch.", error))
      .then(() => {
        const target = queue.settle();
        if (session.disposed || !this.live.has(session)) {
          return;
        }
        if (target && target.id !== session.documentUri) {
          this.switchDocument(session, target);
        } else if (session.edits.lock.pageEditorOpen) {
          // The reader came back before the switch ran. The flush closed the page editor, which
          // tells the host nothing when its text was unchanged: ask the page again. It answers at
          // once when the editor is gone, and on its close when it is still open (a refused save).
          session.edits.watchedPageEditorId = undefined;
          this.edits.watchPageEditor(session);
        }
      });
    this.switchChains.set(panel, chain);
  }

  private switchDocument(session: PreviewSession, document: HostDocument): void {
    const { host } = this;
    if (!isDocumentEligible(document) || document.id === session.documentUri) {
      return;
    }
    const documentPath = this.pathOf(document);
    const workspaceFolder = host.workspace.folderOf(documentPath);
    const readOnly = workspaceFolder === undefined || !host.workspace.trusted;
    const resourceRoot = readOnly
      ? path.dirname(path.resolve(documentPath))
      : workspaceFolder.path;
    if (resourceRoot !== session.workspaceRoot || readOnly !== session.readOnly) {
      const panel = session.panel;
      const followsActiveEditor = session.followsActiveEditor;
      const lockedColumn = session.lockedColumn;
      this.disposeSession(session, false);
      const replacement = this.createSession(panel, document, workspaceFolder, undefined, followsActiveEditor);
      // The panel, and so the locked group, lives on with the replacement.
      replacement.lockedColumn = lockedColumn;
      this.startRender(replacement, document);
      return;
    }
    // The flush before the switch saved and closed the page's editors; an editor closed unchanged
    // tells the host nothing. The page work that waited for it belongs to the old document (its
    // render, its theme render, its diagrams): it is dropped, and the new document renders at once
    // instead of waiting for an editor that is gone (STAB-03).
    session.edits.lock.forgetPage();
    session.edits.watchedPageEditorId = undefined;
    if (session.state) {
      session.states.set(session.documentUri, session.state);
    }
    session.queue.cancel();
    session.queue.clearLastGood();
    const previousDocumentUri = session.documentUri;
    session.documentUri = document.id;
    session.plantUml.includeWatch.clear();
    this.diagnostics.clear(previousDocumentUri);
    session.document = document;
    session.state = session.states.get(session.documentUri);
    session.panel.title = this.previewTitle(session, documentPath);
    this.rendering.showPending(session, true, "Following the active Markdown editor.");
    void this.rendering.refreshPreviewDocument(session, document);
  }

  /** Disposes a session (its panel too when `disposePanel`); idempotent. */
  public disposeSession(session: PreviewSession, disposePanel: boolean): void {
    if (session.disposed) {
      if (disposePanel) {
        session.panel.dispose();
      }
      return;
    }
    session.disposed = true;
    this.rendering.clearPendingOverlay(session);
    this.rendering.clearContentPatchTimer(session);
    this.incoming.clear(session);
    this.comments.clear(session);
    session.edits.active = undefined;
    // A render result that waited for an open editor frees its stage with the preview.
    session.edits.lock.drop("render-result");
    session.edits.lock.release();
    if (disposePanel) {
      this.releaseGroupLock(session);
    }
    this.frontmatter.disposeWatchers(session);
    this.frontmatter.cancelPending(session);
    this.live.delete(session);
    if (this.activeSession === session) {
      this.activeSession = this.latest();
    }
    for (const subscription of session.panelSubscriptions) {
      subscription.dispose();
    }
    for (const subscription of session.dependencyWatcherSubscriptions) {
      subscription.dispose();
    }
    session.dependencyWatcher.dispose();
    session.queue.dispose();
    this.diagnostics.clear(session.documentUri);
    if (disposePanel) {
      session.panel.dispose();
    }
  }

  /** Disposes every session (their panels too when `disposePanels`). */
  public disposeAll(disposePanels: boolean): void {
    for (const session of [...this.live]) {
      this.disposeSession(session, disposePanels);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Files and dependencies
  // ---------------------------------------------------------------------------------------------

  /** A file below the session's root changed: re-render when the page shows or depends on it. */
  public refreshReferencedPath(session: PreviewSession, filePath: string): void {
    if (session.disposed || isIgnoredWatchPath(filePath)) {
      return;
    }
    const candidate = canonicalPath(filePath);
    if (candidate === canonicalPath(this.activePathOf(session))) {
      session.probe.activePathChanges += 1;
      if (session.document
        && session.status !== "missing-source"
        && this.sourceAvailable(session)
        && ["success", "recovery"].includes(
          (session.status === "pending" ? session.shownStatus : session.status) ?? "")
        && isUnchangedSave({
          isActiveDocument: true,
          documentVersion: session.document.revision,
          stageVersion: session.stage?.activeDocumentIdentity === session.documentUri
            ? session.stage.activeDocumentRevision
            : undefined,
        })) {
        // A save of the buffer that is already rendered changes nothing on screen (PERF-06).
        return;
      }
      if (this.sourceAvailable(session) && session.document) {
        this.edits.deferWhileEditing(session, "render", () => this.rendering.refreshOpenDocument(session));
      } else {
        this.rendering.setMissingSource(session);
      }
      return;
    }
    if (session.document && this.frontmatter.watchesLinkedTarget(session, candidate)) {
      // Per-target watchers arm asynchronously; the preview-wide watcher backs them up (debounced).
      this.frontmatter.scheduleLinkEnrichment(session, session.documentUri, session.document.revision);
    }
    if (session.plantUml.includeWatch.has(candidate)) {
      // The page draws its built-in PlantUML diagrams itself: tell it to read their files again.
      this.edits.deferWhileEditing(session, "plantuml-includes", () => this.plantUml.notifyIncludesChanged(session));
    }
    if (!session.queue.dependsOn(filePath) || !session.document || !this.sourceAvailable(session)) {
      return;
    }
    this.edits.deferWhileEditing(session, "render", () => this.rendering.refreshOpenDocument(session, true));
  }

  /** The missing source came back: render it again. */
  private recoverMissingSource(session: PreviewSession): void {
    if (!this.sourceAvailable(session)) {
      return;
    }
    const document = session.document ?? this.host.documents.get(session.documentUri);
    if (document) {
      session.document = document;
      void this.rendering.refreshPreviewDocument(session, document);
    }
  }

  /**
   * A conf.py event refreshes only the previews whose governing conf.py is that file, before or
   * after the event (a created or deleted file can change which one governs). Other previews and
   * unrelated conf.py files are left alone; an open block edit defers the refresh.
   */
  public onConfFileEvent(filePath: string): void {
    if (isIgnoredWatchPath(filePath)) {
      return;
    }
    const candidates = [...this.live].filter((session) => session.document && !session.disposed);
    const locate = (session: PreviewSession): string | undefined =>
      locateConfFor(this.pathOf(session.document!), session.workspaceRoot);
    const before = new Map(candidates.map((session) => [session, locate(session)]));
    invalidateConfCache();
    for (const session of candidates) {
      if (sameFile(before.get(session), filePath) || sameFile(locate(session), filePath)) {
        this.edits.deferWhileEditing(session, "render", () => this.rendering.refreshOpenDocument(session, true));
      }
    }
  }

  /** Watches the Markdown files of a workspace root for the filename-stem index of links. */
  public watchStemRoot(root: string): void {
    const canonicalRoot = canonicalPath(root);
    if (this.stemRootWatchers.has(canonicalRoot)) return;
    const watcher = this.host.watcher.watch(canonicalRoot, "**/*.md");
    const invalidate = (): void => invalidateStemIndex(canonicalRoot);
    const subscriptions = [
      watcher.onDidCreate(invalidate),
      watcher.onDidChange(invalidate),
      watcher.onDidDelete(invalidate),
    ];
    this.stemRootWatchers.set(canonicalRoot, { watcher, subscriptions });
  }

  /** Stops watching a workspace root (see {@link watchStemRoot}). */
  public unwatchStemRoot(root: string): void {
    const canonicalRoot = canonicalPath(root);
    const entry = this.stemRootWatchers.get(canonicalRoot);
    if (!entry) return;
    for (const subscription of entry.subscriptions) {
      subscription.dispose();
    }
    entry.watcher.dispose();
    this.stemRootWatchers.delete(canonicalRoot);
  }

  /** Stops watching every workspace root. */
  public disposeStemRootWatchers(): void {
    for (const root of this.stemRootWatchers.keys()) {
      this.unwatchStemRoot(root);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Host events
  // ---------------------------------------------------------------------------------------------

  /** The text of a document changed (any document, any change: the store's own edits included). */
  public onDocumentChanged(event: DocumentChange): void {
    if (event.changes.length === 0) {
      return;
    }
    this.noteOutsideChange(event);
    this.scroll.shiftAnchorsForEdits(event);
    this.comments.shiftForEdits(event);
    this.refreshPreview(event.document, event.changes.map((change) => ({
      rangeOffset: change.start,
      rangeLength: change.length,
      text: change.text,
    })));
  }

  /**
   * Records a change made outside the preview (or an undo / redo) on the previews of its document. A
   * change of the active text editor's document is the user typing there: it does not glow.
   */
  private noteOutsideChange(event: DocumentChange): void {
    const key = event.document.id;
    const activeDocument = this.host.editors.active()?.document;
    const inActiveEditor = activeDocument !== undefined && activeDocument.id === key;
    const reason = event.reason === "undo" ? 1 : event.reason === "redo" ? 2 : undefined;
    if (!isOutsideChange(reason as 1 | 2, this.host.documents.isApplying(key), inActiveEditor)) return;
    for (const session of this.live) {
      if (session.documentUri === key) session.page.outsideChangeVersion = event.document.revision;
    }
  }

  private refreshPreview(document: HostDocument, changes?: readonly BlockRangeChange[]): void {
    for (const session of this.live) {
      if (document.id === session.documentUri) {
        const edit = session.edits.active;
        if (edit) {
          if (edit.applying) {
            continue;
          }
          if (changes && this.sourceAvailable(session) && this.edits.trackOutsideChange(session, edit, changes)) {
            // The block moved with the change, or the conflict was reported: the editor stays open
            // and the render waits for it (STAB-03, STAB-06).
            this.frontmatter.refresh(session, document);
            this.edits.deferWhileEditing(session, "render", () => this.rendering.refreshOpenDocument(session));
            continue;
          }
          this.edits.releaseActiveBlockEdit(session, true);
        }
        if (this.sourceAvailable(session)) {
          this.frontmatter.refresh(session, document);
          void this.rendering.refreshPreviewDocument(session, document);
        } else {
          this.rendering.setMissingSource(session);
        }
      } else {
        this.refreshReferencedPath(session, this.pathOf(document));
      }
    }
  }

  /**
   * A document was saved. A linked target saved in the editor: the refresh its edits triggered read
   * the file before the save wrote it, and the file watchers can lag behind or miss the write. Only
   * the link enrichment is scheduled; a dependency (an include) is re-rendered by its watcher as before.
   */
  public onDocumentSaved(document: HostDocument): void {
    const saved = canonicalPath(this.pathOf(document));
    for (const session of this.live) {
      if (!session.disposed && session.document && document.id !== session.documentUri
        && this.frontmatter.watchesLinkedTarget(session, saved)) {
        this.frontmatter.scheduleLinkEnrichment(session, session.documentUri, session.document.revision);
      }
    }
    void this.comments.persistAnchors(document).catch((error: unknown) => {
      console.error("Failed to save the moved review comment anchors.", error);
    });
  }

  /** A document was closed: its problems go unless a live preview still shows it. */
  public onDocumentClosed(documentId: string): void {
    this.diagnostics.clear(documentId);
  }

  /** Files were renamed or moved: comments files follow, previews of a renamed source stop. */
  public onFilesRenamed(files: readonly RenamedFile[]): void {
    void this.comments.moveSidecars(files);
    for (const session of this.live) {
      const activePath = this.activePathOf(session);
      for (const file of files) {
        if (canonicalPath(file.oldPath) === canonicalPath(activePath)) {
          this.rendering.setMissingSource(session, "The active Markdown source was renamed or deleted.");
          continue;
        }
      }
      if (!session.document || !this.sourceAvailable(session)) {
        continue;
      }
      const dependencyRenamed = files.some((file) =>
        session.queue.dependsOn(file.oldPath)
        || session.queue.dependsOn(file.newPath));
      if (dependencyRenamed) {
        void this.rendering.refreshPreviewDocument(session, session.document);
      }
    }
  }

  /** Workspace folders were added or removed: stem watchers follow, previews of a removed folder close. */
  public onFoldersChanged(added: readonly WorkspaceFolderInfo[], removed: readonly WorkspaceFolderInfo[]): void {
    for (const folder of added) {
      this.watchStemRoot(folder.path);
    }
    for (const folder of removed) {
      this.unwatchStemRoot(folder.path);
    }
    for (const session of [...this.live]) {
      const folderRemoved = removed.some(
        (folder) => session.workspaceFolder !== undefined && folder.id === session.workspaceFolder.id,
      );
      if (folderRemoved) {
        this.disposeSession(session, true);
      }
    }
  }

  /** The user granted trust: the incoming changes can be read now. */
  public onTrustGranted(): void {
    for (const session of this.live) this.incoming.schedule(session, 0);
  }

  /** Settings changed: the previews read theirs again and update the page. */
  public onSettingsChanged(event: SettingsChange): void {
    const { host } = this;
    if (this.live.size === 0
      || (!event.affects(PREVIEW_CONFIGURATION_SECTION)
        && !event.affects(PLANTUML_CONFIGURATION_SECTION)
        && !event.affects(FRONTMATTER_CONFIGURATION_SECTION))) {
      return;
    }
    for (const session of this.live) {
      const plantUmlConfigurationChanged = event.affects(PLANTUML_CONFIGURATION_SECTION);
      if (event.affects(PREVIEW_CONFIGURATION_SECTION)) {
        session.configuration = readPreviewConfiguration(host.settings.section(PREVIEW_CONFIGURATION_SECTION));
        // The switch needs no re-render: the open page follows it at once.
        this.view.postShowComments(session);
        this.incoming.schedule(session, 0);
      }
      if (plantUmlConfigurationChanged) {
        session.plantUmlConfiguration = readPlantUmlConfiguration(host.settings.section(PLANTUML_CONFIGURATION_SECTION));
        session.plantUmlEngineSettings = readPlantUmlEngineSettings(host.settings.section(PLANTUML_CONFIGURATION_SECTION));
      }
      if (event.affects(FRONTMATTER_CONFIGURATION_SECTION)) {
        session.frontmatterConfiguration = readFrontmatterConfiguration(
          host.settings.section(FRONTMATTER_CONFIGURATION_SECTION),
        );
      }
      // Re-run the whole pipeline so the table reflects state and settings.
      const document = host.editors.active()?.document ?? session.document;
      if (document && document.id === session.documentUri) {
        this.frontmatter.refresh(session, document);
      }
      if (plantUmlConfigurationChanged && document && document.id === session.documentUri) {
        void this.rendering.refreshPreviewDocument(session, document);
      } else {
        const lastGood = session.queue.getState().lastGood;
        if (lastGood) {
          this.rendering.updatePreview(session, lastGood);
        }
      }
    }
  }

  /** The active editor changed: the side preview follows a Markdown document. */
  public onActiveEditorChanged(editor: PairedEditor | undefined): void {
    const session = this.latest((candidate) => candidate.followsActiveEditor);
    const document = editor?.document;
    if (!session || !session.followsActiveEditor || !document) {
      return;
    }
    if (!isDocumentEligible(document)) {
      // Like the built-in Markdown preview: keep the last Markdown document while another kind of
      // editor is active.
      return;
    }
    this.switchAfterFlush(session, document);
  }

  /** The visible editors changed: each page learns whether its document has an editor beside it. */
  public onVisibleEditorsChanged(): void {
    for (const session of this.live) {
      this.scroll.notifyPairing(session);
    }
  }

  /** An editor scrolled: its pages follow (see {@link ScrollSyncController.syncEditorToPreview}). */
  public onVisibleRangesChanged(editor: PairedEditor): void {
    this.scroll.syncEditorToPreview(editor);
  }

  /** The color theme changed: each page learns its kind. */
  public onThemeChanged(): void {
    for (const session of this.live) {
      this.view.notifyTheme(session);
    }
  }

  /** The reader asked for a refresh: the render replaces the page even over an open inline editor. */
  public async refreshActive(activeDocument: HostDocument | undefined): Promise<void> {
    const session = this.activeSession;
    const document = activeDocument ?? session?.document;
    if (session && document && document.id === session.documentUri) {
      session.edits.forceNextResult = true;
      await this.requestDocument(session, document);
    }
  }
}
