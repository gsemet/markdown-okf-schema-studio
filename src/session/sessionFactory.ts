/**
 * The session factory of the preview manager (`previewManager.ts`): it builds the session of a
 * panel and a document, with its roots, its first status page, its render queue, its dependency
 * watch and its panel subscriptions, then hands it to the manager.
 */

import * as path from "node:path";

import { FRONTMATTER_CONFIGURATION_SECTION, readFrontmatterConfiguration } from "../core/configuration/frontmatterConfiguration";
import {
  PLANTUML_CONFIGURATION_SECTION,
  readPlantUmlConfiguration,
  readPlantUmlEngineSettings,
} from "../core/configuration/plantUmlConfiguration";
import { PREVIEW_CONFIGURATION_SECTION, readPreviewConfiguration } from "../core/configuration/previewConfiguration";
import type { HostDocument } from "../host-api/documentStore";
import type { PreviewPanel } from "../host-api/previewPanel";
import type { WorkspaceFolderInfo } from "../host-api/workspaceInfo";
import { buildStatusWebviewHtml, type PreviewStatus } from "./webview";
import { renderPreviewDocument, type PreviewDocument, type RenderResult } from "../core/render/renderPipeline";
import { BoundedMap, MAX_DOCUMENT_STATES } from "../core/state/boundedState";
import type { PreviewPanelState } from "../core/state/previewState";
import type { PreviewManager } from "./previewManager";
import { PreviewSession } from "./previewSession";
import { isDocumentEligible } from "./sessionDocuments";

/** The render pipeline's view of a host document (a saved Markdown file). */
function previewDocumentOf(document: HostDocument, filePath: string): PreviewDocument {
  return {
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markdown",
    getText: () => document.getText(),
  };
}

/** What the factory needs from the manager beyond its public members. */
export interface SessionFactoryHooks {
  /** Adds the new session to the live sessions and makes it the active one. */
  adopt(session: PreviewSession): void;
  /** The session's panel went away: unlocks its group, if this extension locked it. */
  releaseGroupLock(session: PreviewSession): void;
}

/** Creates the sessions of a {@link PreviewManager}. */
export class SessionFactory {
  public constructor(
    private readonly manager: PreviewManager,
    private readonly hooks: SessionFactoryHooks,
  ) {}

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-049
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-038
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-001
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-007
  /**
   * Creates the session of `panel` for `document` (or, for a restored panel whose document could
   * not be opened, for the document `restoredState` names). The session renders nothing until
   * {@link PreviewManager.requestDocument}.
   */
  public createSession(
    panel: PreviewPanel,
    document: HostDocument | undefined,
    workspaceFolder: WorkspaceFolderInfo | undefined,
    restoredState?: PreviewPanelState,
    followsActiveEditor = true,
  ): PreviewSession {
    const { manager } = this;
    const { host } = manager;
    const documentUri = document?.id ?? restoredState?.documentId ?? "";
    const sourcePath = (document ? document.path : undefined) ?? restoredState?.sourceFile;
    if (!sourcePath) {
      throw new Error("The preview source path is unavailable.");
    }
    const savedDescriptions = manager.choices.collapsedDescriptionsOf(documentUri);
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
      && host.paths.sourceExists(manager.pathOf(document))
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
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-039
    session.queue = host.renderQueues.create<HostDocument, RenderResult>({
      debounceMs: 40,
      // The MyST render time alone: a worker start or the engine load does not slow typing down.
      durationOf: (result) => result.renderMs,
      revisionOf: (queued) => queued.revision,
      build: (request, signal) => manager.sharedRenders.acquire(
        {
          documentId: request.document.id,
          revision: request.document.revision,
          workspaceRoot: resourceRoot,
          readOnly,
          trusted: host.workspace.trusted,
          plantUmlJarPath: session.plantUmlConfiguration.jarPath,
          plantUmlEngine: manager.plantUml.engineFor(session),
        },
        request.requestId,
        signal,
        (sharedSignal) => renderPreviewDocument({
          document: previewDocumentOf(request.document, manager.pathOf(request.document)),
          revision: request.document.revision,
          workspaceRoot: resourceRoot,
          readOnly,
          requestId: request.requestId,
          documentIdentity: request.document.id,
          signal: sharedSignal,
          isWorkspaceTrusted: () => host.workspace.trusted,
          allowUntrusted: true,
          plantUmlJarPath: session.plantUmlConfiguration.jarPath,
          plantUmlEngine: manager.plantUml.engineFor(session),
          // @implements_req SwRS-MDOKFSTUDIO-LIFE-004
          // The host's renderer (a worker thread in VS Code), else in-process.
          renderSource: host.previewRenderer?.render,
        }),
      ),
      onState: (state) => manager.rendering.handleQueueState(session, state),
      disposeResult: (result) => result.stage.dispose(),
    });
    session.dependencyWatch = manager.sharedWatchers.acquire(resourceRoot, "**/*", {
      onDidChange: (changedPath) => {
        manager.events.refreshReferencedPath(session, changedPath);
      },
      onDidCreate: (createdPath) => {
        manager.events.refreshReferencedPath(session, createdPath);
        if (session.status === "missing-source") {
          manager.events.recoverMissingSource(session);
        }
      },
      onDidDelete: (deletedPath) => {
        if (manager.canonicalPath(deletedPath) === manager.canonicalPath(manager.activePathOf(session))) {
          manager.rendering.setMissingSource(session, "The active Markdown source was deleted.");
        } else {
          manager.events.refreshReferencedPath(session, deletedPath);
        }
      },
    });
    manager.rendering.setResourceRoots(session, []);
    manager.rendering.assignWebviewHtml(session, session.webview.html);
    panel.title = document ? manager.previewTitle(session, manager.pathOf(document)) : "Studio";
    this.hooks.adopt(session);
    // The view state also changes when the panel only gains or loses focus. Only a hidden panel
    // that becomes visible needs to catch up with the editor; a focus change keeps its anchor.
    let wasVisible = panel.visible;
    session.panelSubscriptions.push(
      panel.onDidReceiveMessage((message) => manager.handlePageMessage(session, message)),
      panel.onDidChangeViewState(() => {
        if (session.lockedColumn !== undefined && panel.column !== undefined) {
          // The column shifts when a group on the left closes, but the locked group is the same.
          session.lockedColumn = panel.column;
        }
        manager.syncEditingContext();
        const becameVisible = panel.visible && !wasVisible;
        wasVisible = panel.visible;
        if (becameVisible) {
          manager.scroll.restorePreviewState(session);
          // A render skipped while the panel was hidden runs now (one render, on show).
          manager.rendering.renderIfDirty(session);
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
        this.hooks.releaseGroupLock(session);
        manager.disposeSession(session, false);
      }),
    );
    return session;
  }
}
