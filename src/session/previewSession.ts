/**
 * One preview page and what the host knows about it: the document it shows, the render on screen,
 * and the state of each feature, grouped by the controller that owns it. A session is created for
 * a panel and a document, and disposed when the panel closes or the document moves to another root
 * (the panel then gets a new session). Host-neutral: the page, the editors and the files are
 * reached through the ports of `src/host-api/`.
 */

import type { BuildQueue } from "../build/buildQueue";
import type { FrontmatterConfiguration } from "../configuration/frontmatterConfiguration";
import type { PlantUmlConfiguration, PlantUmlEngineSettings } from "../configuration/plantUmlConfiguration";
import type { PreviewConfiguration } from "../configuration/previewConfiguration";
import type { CommentThread } from "../comments/commentModel";
import type { HostDocument } from "../host-api/documentStore";
import type { Disposable } from "../host-api/events";
import type { PreviewPanel } from "../host-api/previewPanel";
import type { FileWatcher } from "../host-api/watcher";
import type { WorkspaceFolderInfo } from "../host-api/workspaceInfo";
import type { PreviewStatus, PreviewWebviewResult } from "../preview/webview";
import type { HostToPageMessage } from "../protocol/hostToPage";
import type { RenderResult, RenderStage } from "../render/renderPipeline";
import type { BoundedMap } from "../state/boundedState";
import type { PreviewPanelState } from "../state/previewState";
import { createEditState, type EditState } from "./features/blockEdits";
import { createCommentsState, type CommentsState } from "./features/comments";
import { createFrontmatterState, type FrontmatterState } from "./features/frontmatter";
import { createIncomingState, type IncomingState } from "./features/incomingChanges";
import { createLinkState, type LinkState } from "./features/links";
import { createPlantUmlState, type PlantUmlState } from "./features/plantUml";
import { createOverlayState, createPageLoadState, type OverlayState, type PageLoadState } from "./features/rendering";
import { createScrollState, type ScrollState } from "./features/scrollSync";

/**
 * Counters and last values the integration tests read (`getActivePreviewForTests`), and the render
 * churn budget. The product never reads them.
 */
export interface SessionProbe {
  /** How many watcher events for the active document refreshReferencedPath saw. */
  activePathChanges: number;
  /** How many events the per-target watchers of linked files delivered. */
  linkedTargetEvents: number;
  /** How many times the view-state restore ran for this preview. */
  restoreCalls: number;
  /** Number of webview document replacements, i.e. assignments of a changed string. */
  htmlAssignments: number;
  /** How many finished renders the session applied. */
  renderedStages: number;
  /** How many renders (and deferred updates) were applied as a content patch. */
  contentPatches: number;
  /** The last content patches posted, with the line ranges they asked to glow (CR 046). */
  updateGlowPatches: { fromVersion: number; toVersion: number; ranges: { start: number; end: number }[] }[];
  /** How many times the pending overlay was shown. */
  pendingOverlayShown: number;
  /** How many previewIncomingChanges messages were posted, and the last one. */
  incomingPosts: number;
  lastIncomingChanges?: { enabled: boolean; ranges: { start: number; end: number }[] };
  /** How many previewComments messages were posted, the last threads and the last result. */
  commentPosts: number;
  lastComments?: Array<CommentThread & { orphaned?: boolean }>;
  lastCommentResult?: { ok: boolean; reason?: string; kind: string; threadId?: string };
  /** The last previewHistoryState posted to the page. */
  lastHistoryState?: { canBack: boolean; canForward: boolean };
}

/** What a session is created with; the manager computes it (see PreviewManager.createSession). */
export interface PreviewSessionInit {
  panel: PreviewPanel;
  followsActiveEditor: boolean;
  document: HostDocument | undefined;
  documentUri: string;
  workspaceRoot: string;
  sessionRoots: string[];
  navigationRoots: string[];
  workspaceFolder: WorkspaceFolderInfo | undefined;
  readOnly: boolean;
  webview: PreviewWebviewResult;
  states: BoundedMap<PreviewPanelState>;
  state: PreviewPanelState | undefined;
  status: PreviewStatus;
  configuration: PreviewConfiguration;
  plantUmlConfiguration: PlantUmlConfiguration;
  plantUmlEngineSettings: PlantUmlEngineSettings;
  frontmatterConfiguration: FrontmatterConfiguration;
}

/** One preview page, its document and its features' state. */
export class PreviewSession {
  /** The surface of the page. A document switch to another root moves it to a new session. */
  public readonly panel: PreviewPanel;
  /** True for the side preview that follows the active editor; false for a fixed preview. */
  public followsActiveEditor: boolean;
  /** Column of the editor group the host locked for the preview; undefined if none. */
  public lockedColumn?: number;
  /** The render queue of the document (set right after creation, see PreviewManager). */
  public queue!: BuildQueue<HostDocument, RenderResult>;
  /** The watch on every file below the resource root (includes, images, linked targets). */
  public dependencyWatcher!: FileWatcher;
  public dependencyWatcherSubscriptions: Disposable[] = [];
  /** Subscriptions to the panel's events. */
  public readonly panelSubscriptions: Disposable[] = [];
  /** The document shown; undefined for a restored panel whose document could not be opened. */
  public document?: HostDocument;
  /** The id of the document shown. */
  public documentUri: string;
  public readonly workspaceRoot: string;
  public readonly sessionRoots: string[];
  public readonly navigationRoots: string[];
  public readonly workspaceFolder?: WorkspaceFolderInfo;
  /** Untrusted workspace or no folder: the page offers no edit, the host refuses them. */
  public readonly readOnly: boolean;
  /** The render the page shows (or will once loaded). */
  public stage?: RenderStage;
  /** The host's record of the page: its html, diagnostics and nonce. */
  public webview: PreviewWebviewResult;
  public status: PreviewStatus;
  /** Status the loaded page shows while `status` is "pending" over a rendered page (D-22). */
  public shownStatus?: PreviewStatus;
  public hadFailure = false;
  /** The page's scroll and disclosure state per document, and the one of the shown document. */
  public readonly states: BoundedMap<PreviewPanelState>;
  public state?: PreviewPanelState;
  public configuration: PreviewConfiguration;
  public plantUmlConfiguration: PlantUmlConfiguration;
  /** `useJar` off (default): the bundled engine draws in the webview, also in Restricted Mode. */
  public plantUmlEngineSettings: PlantUmlEngineSettings;
  public frontmatterConfiguration: FrontmatterConfiguration;
  public disposed = false;

  /** Loads, patches and acknowledgements of the page (rendering controller). */
  public readonly page: PageLoadState = createPageLoadState();
  /** The floating "pending" overlay (rendering controller). */
  public readonly overlay: OverlayState = createOverlayState();
  /** The inline block edit, its lock and the saves in flight (block edit controller). */
  public readonly edits: EditState = createEditState();
  /** Scroll anchor, editor reveal echo and pins (scroll sync controller). */
  public readonly scroll: ScrollState = createScrollState();
  /** Frontmatter analysis, link enrichment and linked-target watches (frontmatter controller). */
  public readonly frontmatter: FrontmatterState = createFrontmatterState();
  /** Includes of the built-in PlantUML engine (PlantUML controller). */
  public readonly plantUml: PlantUmlState = createPlantUmlState();
  /** Marks of the lines that differ from HEAD (incoming changes controller). */
  public readonly incoming: IncomingState = createIncomingState();
  /** Review comment threads of the sidecar (comments controller). */
  public readonly comments: CommentsState = createCommentsState();
  /** Link discoveries in flight (links controller). */
  public readonly links: LinkState = createLinkState();
  public readonly probe: SessionProbe = {
    activePathChanges: 0,
    linkedTargetEvents: 0,
    restoreCalls: 0,
    htmlAssignments: 0,
    renderedStages: 0,
    contentPatches: 0,
    updateGlowPatches: [],
    pendingOverlayShown: 0,
    incomingPosts: 0,
    commentPosts: 0,
  };

  public constructor(init: PreviewSessionInit) {
    this.panel = init.panel;
    this.followsActiveEditor = init.followsActiveEditor;
    this.document = init.document;
    this.documentUri = init.documentUri;
    this.workspaceRoot = init.workspaceRoot;
    this.sessionRoots = init.sessionRoots;
    this.navigationRoots = init.navigationRoots;
    this.workspaceFolder = init.workspaceFolder;
    this.readOnly = init.readOnly;
    this.webview = init.webview;
    this.states = init.states;
    this.state = init.state;
    this.status = init.status;
    this.configuration = init.configuration;
    this.plantUmlConfiguration = init.plantUmlConfiguration;
    this.plantUmlEngineSettings = init.plantUmlEngineSettings;
    this.frontmatterConfiguration = init.frontmatterConfiguration;
  }

  /** Sends a protocol message to the page; resolves to false when it was not delivered. */
  public postToPage(message: HostToPageMessage): PromiseLike<boolean> {
    return this.panel.postMessage(message);
  }
}
