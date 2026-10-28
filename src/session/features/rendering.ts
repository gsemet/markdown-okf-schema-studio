/**
 * The rendering controller: what the page shows and how it gets there. It turns finished renders
 * into a new page document or an in-place content patch (T34), keeps the host's record of the page
 * (html, nonce, status), shows the pending overlay of a slow render (D-22), loads the full document
 * when a patched page does not acknowledge it, and answers the page's ready report. The page
 * document and the host's record of it are in its base class, `PageDocumentController`
 * (`pageDocument.ts`).
 */

import type { BuildQueueState } from "../../core/render/buildQueue";
import {
  DEFAULT_PREVIEW_CONFIGURATION,
  PREVIEW_STARTUP_SETTING_KEYS,
  previewBootSettings,
  PreviewConfiguration,
} from "../../core/configuration/previewConfiguration";
import { analyzeFrontmatter } from "../../core/frontmatter/okfFrontmatter";
import type { HostDocument } from "../../host-api/documentStore";
import {
  diagnosticsFitPatch,
  planContentPatch,
  reuseNonce,
  runtimeContextKey,
  type RuntimeContextSettings,
} from "../../core/preview/contentPatch";
import {
  buildPreviewWebviewHtml,
  buildStatusWebviewHtml,
  formatStatusDiagnostic,
  PreviewStatus,
  setPreviewStatus,
} from "../webview";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import { PreviewDiagnostic, RenderError, RenderResult, RenderStage } from "../../core/render/renderPipeline";
import { isBroadReadOnlyRoot } from "../../core/security/resource-policy";
import { needsRefresh } from "../../core/state/editLock";
import type { PreviewPanelState } from "../../core/state/previewState";
import type { PreviewRuntimeContext } from "../../core/protocol/bootContext";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewSession } from "../previewSession";
import { isDocumentEligible, previewReadOnlyReason, revisionOfStage } from "../sessionDocuments";
import { PENDING_OVERLAY_DELAY_MS, type ToolbarState } from "./pageLoadState";
import { PageDocumentController } from "./pageDocument";
import { fireAndForget } from "../../host-api/logger";

function diagnosticDetails(error: unknown): PreviewDiagnostic[] {
  return error instanceof RenderError ? error.diagnostics : [];
}

function runtimeContextSettings(context: PreviewRuntimeContext): RuntimeContextSettings {
  const settings: Record<string, unknown> = {
    documentId: context.documentId,
    activeSourceFile: context.activeSourceFile,
  };
  for (const key of PREVIEW_STARTUP_SETTING_KEYS) {
    settings[key] = context[key];
  }
  return settings as RuntimeContextSettings;
}

function sameResourceRoots(previous: readonly string[], next: readonly string[]): boolean {
  return previous.length === next.length && previous.every((root, index) => root === next[index]);
}

/** What the boot context says about editing: comments on, or the reason a read-only page gives. */
export function editingBootState(
  preview: Pick<PreviewSession, "readOnly" | "workspaceFolder">,
): { commentsEnabled: boolean; readOnlyReason?: string } {
  return preview.readOnly
    ? { commentsEnabled: false, readOnlyReason: previewReadOnlyReason(preview) }
    : { commentsEnabled: true };
}

/** Renders, page documents, content patches, status and the pending overlay. */
// @implements_req SwRS-MDOKFSTUDIO-TRUST-002
/** The webview's local resource roots (before the extension bundle): none for a broad read-only root. */
export function previewLocalResourceRoots(workspaceRoot: string, readOnly: boolean): string[] {
  return readOnly && isBroadReadOnlyRoot(workspaceRoot) ? [] : [workspaceRoot];
}

export class RenderingController extends PageDocumentController {
  /** Registers the handler of the page's ready report. */
  public register(router: PageMessageRouter): void {
    router.on("previewReady", (value, preview) => this.onReady(preview, value));
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-170
  /** The runtime context of a page that shows `stage` (read by the page at startup). */
  public runtimeContext(
    stage: RenderStage,
    state?: PreviewPanelState,
    configuration: PreviewConfiguration = DEFAULT_PREVIEW_CONFIGURATION,
    initialAnchor?: number,
    initialPin?: { line: number; viewportTop: number },
    toolbarState?: ToolbarState,
  ): PreviewRuntimeContext {
    const { host, choices } = this.manager;
    choices.refreshThreadAuthor(host.documents.idOf(stage.activeDocumentPath));
    const threadAuthor = choices.threadAuthor;
    const previewThemeMode = choices.previewThemeMode;
    return {
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
      activeSourceFile: stage.activeDocumentPath,
      ...(threadAuthor !== "" ? { threadAuthor } : {}),
      ...(initialAnchor !== undefined ? { initialAnchor } : {}),
      ...(initialPin ? { initialPin } : {}),
      ...previewBootSettings(configuration),
      themeKind: host.theme.kind,
      ...(toolbarState ?? {}),
      ...(choices.dismissedWarningBanners.has(stage.activeDocumentIdentity)
        ? { dismissedWarningBanner: choices.dismissedWarningBanners.get(stage.activeDocumentIdentity) }
        : {}),
      ...(host.workspace.trusted ? {} : { warningsInProblems: false }),
      ...(previewThemeMode ? { previewThemeMode } : {}),
      initialViewPreferences: choices.viewPreferences,
      ...(state && state.documentId === stage.activeDocumentIdentity
        ? {
          initialState: {
            sourceLine: state.sourceLine,
            scrollTop: state.scrollTop,
            focusedBlockId: state.focusedBlockId,
            selectedText: state.selectedText,
            openDisclosures: state.openDisclosures,
            descriptionsCollapsed: state.descriptionsCollapsed,
          },
        }
        : {}),
    };
  }


  // @implements_req SwRS-MDOKFSTUDIO-LIFE-069
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-011
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-042
  /** Shows a finished render: a content patch when the loaded page allows it, else a new document. */
  public updatePreview(preview: PreviewSession, result: RenderResult): void {
    const { manager } = this;
    // Deliberately renders results that the buffer has already moved past: a newer build is
    // queued behind it, and dropping them here would freeze the preview while the user types.
    if (
      preview.disposed
      || !manager.has(preview)
      || preview.documentUri !== result.stage.activeDocumentIdentity
    ) {
      result.stage.dispose();
      return;
    }
    const previousStage = preview.stage;
    const previousHtml = preview.webview.html;
    const previousNonce = preview.webview.nonce;
    const previousRoots = preview.page.resourceRoots;
    const context = this.runtimeContext(
      result.stage,
      preview.state,
      preview.configuration,
      result.stage.activeDocumentIdentity === preview.documentUri ? manager.scroll.initialAnchorLine(preview) : undefined,
      manager.scroll.takePendingPin(preview, result.stage.activeDocumentIdentity, result.stage.activeDocumentRevision),
      {
        pairedTextEditor: manager.scroll.visibleEditorFor(preview) !== undefined,
        initialEditMode: !preview.readOnly && manager.choices.editMode === true,
        initialPaletteMode: manager.choices.initialPaletteMode(),
        ...editingBootState(preview),
      },
    );
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-002
    // A read-only preview in the home folder or a file-system root loads nothing from it.
    const localResourceRoots = previewLocalResourceRoots(preview.workspaceRoot, preview.readOnly);
    const plantUmlRenderer = result.plantUmlEngine === "builtin" ? "builtin" : "host";
    // Every rendered page loads its runtime and stylesheet from the bundle (PERF-11), and the
    // diagram engines when it has diagrams: the bundle folder is always a resource root.
    const bundleRoot = preview.panel.bundleRoot;
    if (bundleRoot !== undefined) {
      localResourceRoots.push(bundleRoot);
    }
    const frontmatter = analyzeFrontmatter({
      schemaFiles: manager.host.schemaFiles,
      filePath: result.stage.activeDocumentPath,
      sourceText: result.stage.sourceText,
      stopDir: preview.workspaceRoot,
      allowSchemaResolution: !preview.readOnly,
      inspectLinks: false,
      strictAdditionalProperties: preview.frontmatterConfiguration.strictAdditionalProperties,
      bundleRoot: preview.frontmatterConfiguration.bundleRoot,
      projectRoot: preview.frontmatterConfiguration.projectRoot,
      allowOutsideWorkspaceLinks: preview.frontmatterConfiguration.allowOutsideWorkspaceLinks,
      workspaceRoots: preview.sessionRoots,
    });
    manager.frontmatter.setState(
      preview,
      frontmatter,
      result.stage.activeDocumentIdentity,
      result.stage.activeDocumentRevision,
      false,
    );
    // The live preview renders in-process and only references workspace files (the document
    // itself and assets like figures), so the workspace folder is the single localResourceRoot.
    this.setResourceRoots(preview, localResourceRoots);
    const webview = buildPreviewWebviewHtml(
      result.html,
      result.stage.outputDirectory,
      preview.panel.assets,
      context,
      preview.workspaceRoot,
      preview.frontmatter.result
        ? {
          result: preview.frontmatter.result,
          tableEnabled: preview.frontmatterConfiguration.propertiesTable,
        }
        : undefined,
      preview.configuration.maxContentWidth,
      !preview.readOnly,
      !preview.readOnly,
      [],
      plantUmlRenderer,
      preview.readOnly,
    );
    const status: PreviewStatus = preview.hadFailure ? "recovery" : "success";
    const html = setPreviewStatus(webview.html, status, undefined, result.diagnostics);
    // A page that is ready for the previous stage gets the new content in place when everything
    // else about it is unchanged; any other case loads the full document (T34).
    const nextContext = runtimeContextSettings(context);
    const statusLines = result.diagnostics.map(formatStatusDiagnostic);
    const contentPatch = preview.configuration.incrementalUpdates
      && previousStage !== undefined
      && this.pageHasStage(preview, previousStage)
      && previousStage.activeDocumentIdentity === result.stage.activeDocumentIdentity
      && previousStage.activeDocumentPath === result.stage.activeDocumentPath
      && previousNonce !== ""
      && preview.page.loadedContext !== undefined
      && runtimeContextKey(preview.page.loadedContext) === runtimeContextKey(nextContext)
      && sameResourceRoots(previousRoots, localResourceRoots)
      && diagnosticsFitPatch(statusLines)
      ? planContentPatch(previousHtml, html)
      : undefined;
    preview.stage = result.stage;
    manager.diagnostics.publish(preview, result);
    preview.probe.renderedStages += 1;
    preview.webview = {
      ...webview,
      // The record describes the page the webview shows. A patched page keeps the nonce it was
      // loaded with, so the record carries that nonce instead of the one of this render.
      ...(contentPatch
        ? { html: reuseNonce(html, webview.nonce, previousNonce), nonce: previousNonce }
        : { html }),
      diagnostics: [...webview.diagnostics, ...result.diagnostics],
    };
    preview.status = status;
    preview.shownStatus = undefined;
    preview.hadFailure = false;
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-024
    preview.panel.title = manager.previewTitle(preview, result.stage.activeDocumentPath);
    if (contentPatch && previousStage) {
      // The page removes its pending overlay itself when it applies the patch.
      this.clearPendingOverlay(preview);
      this.postContentPatch(preview, previousStage, result.stage, {
        contentHtml: contentPatch.contentHtml,
        status,
        diagnostics: statusLines,
        ...(context.initialAnchor !== undefined ? { initialAnchor: context.initialAnchor } : {}),
        ...(context.initialPin ? { initialPin: context.initialPin } : {}),
      });
      this.armContentPatchFallback(preview, result.stage);
    } else {
      this.assignWebviewHtml(preview, html);
      preview.page.loadedContext = nextContext;
    }
    manager.plantUml.scheduleDeferredWork(preview, result);
    manager.incoming.schedule(preview);
    manager.comments.schedule(preview);
  }

  /** True while `result` is the render the session shows (and `generation` its deferred work). */
  public isCurrentRender(
    preview: PreviewSession,
    result: RenderResult,
    generation?: number,
  ): boolean {
    return !preview.disposed
      && this.manager.has(preview)
      && preview.documentUri === result.stage.activeDocumentIdentity
      && preview.stage === result.stage
      && (generation === undefined || preview.page.enrichmentGeneration === generation);
  }

  private armPendingOverlay(preview: PreviewSession): void {
    if (preview.overlay.timer !== undefined || preview.overlay.visible) {
      return;
    }
    const stage = preview.stage;
    preview.overlay.timer = setTimeout(() => {
      preview.overlay.timer = undefined;
      const phase = preview.queue.getState().phase;
      if (
        preview.disposed
        || preview.status !== "pending"
        || preview.stage !== stage
        || (phase !== "debouncing" && phase !== "building")
      ) {
        return;
      }
      if (!stage || !this.pageHasStage(preview, stage)) {
        // The page is still loading and cannot show it; post it with the next ready report.
        preview.overlay.due = true;
        return;
      }
      this.showPendingOverlay(preview);
    }, PENDING_OVERLAY_DELAY_MS);
  }

  private showPendingOverlay(preview: PreviewSession): void {
    preview.overlay.due = false;
    preview.overlay.visible = true;
    preview.probe.pendingOverlayShown += 1;
    this.postPendingOverlay(preview, true);
  }

  /** Follows the render queue of a session: pending status, finished render, failure. */
  public handleQueueState(
    preview: PreviewSession,
    state: BuildQueueState<RenderResult, HostDocument>,
  ): void {
    const { manager } = this;
    if (preview.disposed || !manager.has(preview) || !state.request) {
      return;
    }
    if (state.request.document.id !== preview.documentUri) {
      return;
    }
    if (state.phase === "debouncing" || state.phase === "building") {
      const pendingMessage = state.phase === "building"
        ? "Rendering the active buffer."
        : "Waiting for the latest edit.";
      if (preview.stage) {
        // A rendered page exists: leave it untouched (no reload, nothing moves). A floating overlay
        // appears only when the render stays pending (D-22).
        if (preview.status !== "pending") {
          preview.shownStatus = preview.status;
        }
        preview.status = "pending";
        preview.overlay.message = pendingMessage;
        this.armPendingOverlay(preview);
        return;
      }
      this.setStatus(preview, "pending", pendingMessage);
      return;
    }
    if (state.phase === "ready" && state.result) {
      this.endPendingOverlay(preview);
      const result = state.result;
      if (preview.edits.lock.shouldDeferResult() && !preview.edits.forceNextResult) {
        // The page has an inline editor open: the render reaches the page when it closes, so the
        // editor keeps its text, caret and selection (STAB-03). A newer outcome replaces this one.
        manager.edits.deferPageWork(preview, "render-result", () => {
          if (preview.stage && result.stage.requestId < preview.stage.requestId) {
            result.stage.dispose(); // a newer render reached the page in the meantime
            return;
          }
          this.updatePreview(preview, result);
        }, () => result.stage.dispose());
        return;
      }
      // An explicit refresh replaces the page as before, open editor included; an older deferred
      // result must not come back over it.
      preview.edits.forceNextResult = false;
      preview.edits.lock.drop("render-result");
      this.updatePreview(preview, result);
      return;
    }
    if (state.phase !== "failed") {
      return;
    }
    this.endPendingOverlay(preview);
    if (preview.edits.lock.shouldDeferResult() && !preview.edits.forceNextResult) {
      // A failed render replaces the page with its status document: it waits for the editor too.
      const error = state.error;
      manager.edits.deferPageWork(preview, "render-result", () => this.showRenderFailure(preview, error));
      return;
    }
    preview.edits.forceNextResult = false;
    preview.edits.lock.drop("render-result");
    this.showRenderFailure(preview, state.error);
  }

  // @implements_req SwRS-MDOKFSTUDIO-CORE-025
  private showRenderFailure(preview: PreviewSession, error: unknown): void {
    if (preview.disposed || !this.manager.has(preview)) {
      return;
    }
    const diagnostics = diagnosticDetails(error);
    preview.hadFailure = true;
    if (preview.stage?.activeDocumentIdentity === preview.documentUri) {
      this.setStatus(
        preview,
        "stale",
        error instanceof Error ? error.message : "The latest render failed.",
        diagnostics,
      );
      return;
    }
    this.setStatus(
      preview,
      "error",
      error instanceof Error ? error.message : "The render failed.",
      diagnostics,
    );
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-062
  /** Replaces the page with the missing-source status and stops rendering. */
  public setMissingSource(
    preview: PreviewSession,
    message = "The active Markdown source is unavailable.",
  ): void {
    if (preview.disposed) {
      return;
    }
    preview.queue.cancel();
    preview.queue.clearLastGood();
    // A render that waited for an open editor must not bring the page back over this status.
    preview.edits.lock.drop("render-result");
    preview.stage = undefined;
    preview.state = undefined;
    preview.status = "missing-source";
    preview.shownStatus = undefined;
    this.setResourceRoots(preview, []);
    preview.webview = {
      html: buildStatusWebviewHtml("missing-source", preview.panel.cspSource, message),
      diagnostics: [],
      nonce: "",
    };
    this.assignWebviewHtml(preview, preview.webview.html);
  }

  /** Renders `document` again (after the debounce), or shows the missing source. */
  public refreshPreviewDocument(
    preview: PreviewSession,
    document: HostDocument,
  ): Promise<unknown> {
    if (!isDocumentEligible(document) || !this.manager.sourceAvailable(preview)) {
      this.setMissingSource(preview);
      return Promise.resolve({ status: "canceled" });
    }
    preview.document = document;
    if (this.deferWhileHidden(preview)) {
      return Promise.resolve({ status: "canceled" });
    }
    return preview.queue.refresh(document);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-039
  /**
   * A hidden panel renders nothing: the session is marked dirty and the render runs when the panel
   * is shown (see {@link renderIfDirty}). True when the render was deferred.
   */
  public deferWhileHidden(preview: PreviewSession): boolean {
    if (preview.panel.visible) {
      preview.renderDirty = false;
      return false;
    }
    preview.renderDirty = true;
    return true;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-039
  /** The panel was shown: renders the document now when a render was skipped while it was hidden. */
  public renderIfDirty(preview: PreviewSession): void {
    if (!preview.renderDirty || preview.disposed || !preview.document) {
      return;
    }
    preview.renderDirty = false;
    fireAndForget(this.manager.host.logger, this.refreshPreviewDocument(preview, preview.document), "refreshPreviewDocument");
  }

  /** Renders the shown document again when the page needs it (a dependency change always does). */
  public refreshOpenDocument(preview: PreviewSession, isDependencyChange = false): void {
    const shown = preview.status === "pending" ? preview.shownStatus : preview.status;
    if (!preview.disposed && preview.document && this.manager.sourceAvailable(preview)
      && needsRefresh({
        isDependencyChange,
        shownStatus: shown,
        documentVersion: preview.document.revision,
        stageVersion: preview.stage?.activeDocumentRevision,
      })) {
      fireAndForget(this.manager.host.logger, this.refreshPreviewDocument(preview, preview.document), "refreshPreviewDocument");
    }
  }

  /** The page reports ready: it listens, and gets the live state it may have missed while loading. */
  private onReady(preview: PreviewSession, value: PageMessageOf<"previewReady">): void {
    const { manager } = this;
    manager.view.recordPreviewState(preview, value);
    preview.page.readyRequestId = value.requestId;
    if (preview.edits.active) {
      // A page of another render, or one that reports no open editor, has no inline editor: the
      // lock would block every later edit (STAB-02).
      const outcome = preview.edits.lock.onPreviewReady(value.requestId, value.blockEditOpen);
      if (outcome.released) {
        manager.edits.releaseActiveBlockEdit(preview, false, outcome.flush);
      }
    } else if (preview.edits.lock.pageEditorOpen && value.blockEditOpen === false) {
      // The page reports no open editor: the work that waited for one runs now.
      manager.edits.closePageEditor(preview);
    }
    if (preview.status === "pending" && preview.shownStatus !== undefined && !preview.overlay.visible) {
      if (preview.overlay.due) {
        this.showPendingOverlay(preview);
      } else {
        // A deferred update replaced the page while a render was pending: wait again.
        this.armPendingOverlay(preview);
      }
    }
    // The webview already applied the anchor passed at render time; only refresh the
    // selection marker so a re-render never triggers a second scroll.
    manager.scroll.markEditorSelectionInPreview(preview);
    // The page starts with both buttons disabled: tell it what the history of this panel allows.
    manager.history.postHistoryState(preview);
    // A pairing or theme change announced before the page listened did not reach it.
    manager.scroll.postPageLiveState(preview, value);
    manager.view.postShowComments(preview);
    // A freshly loaded page has no marks and assumes the marks are enabled; a patched page keeps
    // what it shows.
    if (preview.page.patchedRequestId === undefined) {
      preview.incoming.marksShown = false;
      preview.incoming.enabledPosted = true;
      preview.comments.shown = false;
    }
    preview.comments.posted = undefined;
    preview.comments.textHash = undefined;
    manager.incoming.schedule(preview, 0);
    manager.comments.schedule(preview, 0);
  }
}
