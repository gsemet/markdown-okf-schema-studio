/**
 * The preview manager: the set of live preview sessions of one activation, the one that is active,
 * and the feature controllers that work on them. It creates a session for a panel and a document,
 * switches a session to another document, and disposes it with its panel. Its `events`
 * (`hostEvents.ts`) turn the host's events (document changes, saves, renames, settings, editors,
 * theme) into work on the sessions concerned. Host-neutral: everything goes through the ports of `src/host-api/`; the VS Code activation
 * (`src/host-vscode/activation.ts`) creates the panels and forwards the events.
 */

import * as path from "node:path";

import type { HostDocument } from "../host-api/documentStore";
import type { HostServices } from "../host-api/index";
import type { PanelGroups, PreviewPanel } from "../host-api/previewPanel";
import type { WorkspaceFolderInfo } from "../host-api/workspaceInfo";
import { createPreviewNavigator, type PreviewNavigator } from "./previewNavigator";
import { LatestRequest } from "../core/preview/flushWait";
import { createMessageRouter } from "../core/protocol/router";
import type { PreviewEditCommandName } from "../core/protocol/hostToPage";
import type { PageToHostMessage } from "../core/protocol/pageToHost";
import type { Revision } from "../core/protocol/revision";
import type { PreviewPanelState } from "../core/state/previewState";
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
import { HostEvents } from "./hostEvents";
import type { PreviewSession } from "./previewSession";
import { SessionFactory } from "./sessionFactory";
import { isDocumentEligible, isPathWithin, revisionOfStage } from "./sessionDocuments";
import { SharedRenders } from "./sharedRenders";
import { SharedLinkedTargetWatches, SharedWatchers } from "./sharedWatchers";
import { WorkspaceChoices } from "./workspaceChoices";
import { fireAndForget } from "../host-api/logger";

/** The identity a page message names, as the render gate compares it. */
export interface PageMessageIdentity {
  type: string;
  documentId: string;
  revision: Revision;
  requestId: number;
  editId?: string;
}

/** The live previews of one activation and the controllers of their features. */
export class PreviewManager {
  /** Resolves the links of the pages under the navigation rules. */
  public readonly navigator: PreviewNavigator;
  /** The workspace choices of the pages (theme mode, view preferences, edit and palette modes). */
  public readonly choices: WorkspaceChoices;
  /** The host events (documents, files, editors, settings) and the watchers they feed. */
  public readonly events: HostEvents;
  /** Renders shared by the previews of one document (one render per document, revision, options). */
  public readonly sharedRenders = new SharedRenders();
  /** The host watchers shared by the previews (one per root and pattern). */
  public readonly sharedWatchers: SharedWatchers;
  /** The linked-target watches shared by the previews (one per target, capped). */
  public readonly linkedTargetWatches: SharedLinkedTargetWatches;

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
  private lastEditingContext = false;
  /** Document switches of a panel queue behind each other; only the latest request is applied. */
  private readonly switchChains = new WeakMap<PreviewPanel, Promise<void>>();
  private readonly latestSwitches = new WeakMap<PreviewPanel, LatestRequest<HostDocument>>();
  /** Builds the sessions; the manager keeps the live set and the active session. */
  private readonly factory: SessionFactory;

  /**
   * `host`: the ports. `groups`: the editor-group lock of side previews. Every feature controller
   * registers its page message handlers here.
   */
  public constructor(
    public readonly host: HostServices,
    private readonly groups: PanelGroups,
  ) {
    this.navigator = createPreviewNavigator(host.files);
    this.sharedWatchers = new SharedWatchers(host.watcher);
    this.linkedTargetWatches = new SharedLinkedTargetWatches(this.sharedWatchers, undefined, host.linkedTargets);
    this.events = new HostEvents(this);
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
    this.factory = new SessionFactory(this, {
      adopt: (session) => {
        this.live.add(session);
        this.activeSession = session;
      },
      releaseGroupLock: (session) => this.releaseGroupLock(session),
    });
  }

  // ---------------------------------------------------------------------------------------------
  // The set of sessions
  // ---------------------------------------------------------------------------------------------

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-032
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

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-065
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
    const result = this.dispatcher.handle(session, value);
    this.syncEditingContext();
    return result;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
  /**
   * Tells the host whether a focused preview has an editor open, so the key bindings for undo,
   * redo, select all and delete line apply to it and to no other editor. Cheap: the host hears
   * only a change.
   */
  public syncEditingContext(): void {
    const editing = [...this.live].some((candidate) =>
      !candidate.disposed && candidate.panel.active && candidate.edits.lock.pageEditorOpen);
    if (editing === this.lastEditingContext) return;
    this.lastEditingContext = editing;
    this.host.ui.setPreviewEditing(editing);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
  /**
   * A key binding ran an editing command: the focused preview with an open editor gets it. False
   * when no preview qualifies (the context lagged behind a focus change).
   */
  public runEditCommand(command: PreviewEditCommandName): boolean {
    const session = [...this.live].find((candidate) =>
      !candidate.disposed && candidate.panel.active && candidate.edits.lock.pageEditorOpen);
    const stage = session?.stage;
    if (!session || !stage) return false;
    fireAndForget(this.host.logger, session.postToPage({
      type: "previewEditCommand",
      command,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    }), "postToPage");
    return true;
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
  public readonly canonicalPath = (filePath: string): string => this.host.paths.canonicalPath(filePath);

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-062
  /** True when the session's source is an existing Markdown file inside its root. */
  public sourceAvailable(session: PreviewSession): boolean {
    const sourcePath = this.activePathOf(session);
    return (!session.document || isDocumentEligible(session.document))
      && isPathWithin(this.canonicalPath(session.workspaceRoot), this.canonicalPath(sourcePath))
      && this.host.paths.sourceExists(sourcePath);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-024
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
   * {@link requestDocument}. Built by the {@link SessionFactory}.
   */
  public createSession(
    panel: PreviewPanel,
    document: HostDocument | undefined,
    workspaceFolder: WorkspaceFolderInfo | undefined,
    restoredState?: PreviewPanelState,
    followsActiveEditor = true,
  ): PreviewSession {
    return this.factory.createSession(panel, document, workspaceFolder, restoredState, followsActiveEditor);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-151
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
    if (this.rendering.deferWhileHidden(session)) {
      return;
    }
    const outcome = await session.queue.request(document);
    if (outcome.status === "failed" && this.live.has(session) && !session.stage) {
      this.rendering.setStatus(session, "error", outcome.error instanceof Error ? outcome.error.message : "The render failed.");
    }
  }

  /** Renders `document` in the session; a failure shows the error status. */
  public startRender(session: PreviewSession, document: HostDocument): void {
    fireAndForget(this.host.logger, this.requestDocument(session, document).catch((error: unknown) => {
      if (this.live.has(session) && !session.disposed) {
        this.rendering.setStatus(session, "error", error instanceof Error ? error.message : String(error));
      }
    }), "requestDocument");
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
      .catch((error: unknown) => this.host.logger.error("Failed to flush the open editor before the switch.", error))
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

  /**
   * Replaces the session by a new one on the same panel, which then renders `document`: the root
   * or the trust state the session was created with no longer fits. `restoredState` is the page
   * state the new page starts from.
   */
  private replaceSession(
    session: PreviewSession,
    document: HostDocument,
    workspaceFolder: WorkspaceFolderInfo | undefined,
    restoredState?: PreviewPanelState,
  ): PreviewSession {
    const panel = session.panel;
    const followsActiveEditor = session.followsActiveEditor;
    const lockedColumn = session.lockedColumn;
    this.disposeSession(session, false);
    const replacement = this.createSession(panel, document, workspaceFolder, restoredState, followsActiveEditor);
    // The panel, and so the locked group, lives on with the replacement.
    replacement.lockedColumn = lockedColumn;
    this.startRender(replacement, document);
    return replacement;
  }

  /**
   * The user granted trust: a preview that was read-only only because the workspace was untrusted
   * moves to a trusted session (editing, palette, workspace resource and navigation roots) and
   * renders once, keeping its reading state. Previews that stay read-only are left alone.
   */
  public refreshTrust(): void {
    const { host } = this;
    const active = this.activeSession;
    let activeAfter = active;
    for (const session of [...this.live]) {
      const document = session.document;
      if (session.disposed || !session.readOnly || !document || !isDocumentEligible(document)) continue;
      const workspaceFolder = host.workspace.folderOf(this.pathOf(document));
      if (workspaceFolder === undefined || !host.workspace.trusted) continue;
      const replacement = this.replaceSession(session, document, workspaceFolder, session.state);
      if (session === active) activeAfter = replacement;
    }
    // Replacing a preview makes it the active one: the reader's active preview stays the same.
    if (activeAfter && this.live.has(activeAfter)) this.activeSession = activeAfter;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-125
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
      this.replaceSession(session, document, workspaceFolder);
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
    // @implements_req SwRS-MDOKFSTUDIO-DIAG-053
    session.plantUml.includeWatch.clear();
    session.plantUml.issuedIds.clear();
    this.diagnostics.clear(previousDocumentUri);
    session.document = document;
    session.panel.title = this.previewTitle(session, documentPath);
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-026
    this.rendering.showPending(session, true, "Following the active Markdown editor.");
    // After the pending page, which clears the state: the render of the returned-to document reads it.
    session.state = session.states.get(session.documentUri);
    fireAndForget(this.host.logger, this.rendering.refreshPreviewDocument(session, document), "refreshPreviewDocument");
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-143
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
    session.dependencyWatch.dispose();
    session.queue.dispose();
    this.diagnostics.clear(session.documentUri);
    if (disposePanel) {
      session.panel.dispose();
    }
    this.syncEditingContext();
  }

  /** Disposes every session (their panels too when `disposePanels`). */
  public disposeAll(disposePanels: boolean): void {
    for (const session of [...this.live]) {
      this.disposeSession(session, disposePanels);
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-032
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-039
  /** A refresh was asked (command or page button): the result replaces the page and no earlier shared render is joined. */
  public prepareRefresh(session: PreviewSession): void {
    session.edits.forceNextResult = true;
    this.sharedRenders.invalidate();
  }

  /** The reader asked for a refresh: the render replaces the page even over an open inline editor. */
  public async refreshActive(activeDocument: HostDocument | undefined): Promise<void> {
    const session = this.activeSession;
    const document = activeDocument ?? session?.document;
    if (session && document && document.id === session.documentUri) {
      this.prepareRefresh(session);
      await this.requestDocument(session, document);
    }
  }
}
