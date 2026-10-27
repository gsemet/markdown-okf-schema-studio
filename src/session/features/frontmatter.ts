/**
 * The frontmatter controller: the OKF frontmatter of the shown document, its properties table
 * (patched in place, T30), the link enrichment that resolves its links (with a watch on each linked
 * target), and the edits of a frontmatter field from the table.
 */

import { checkFrontmatterCandidate, FRONTMATTER_STALE, planFrontmatterSave } from "../../core/edits/frontmatterEdit";
import type { LinkedTargetWatch } from "../../node-services/linkedTargetWatch";
import { analyzeFrontmatter, type FrontmatterResult } from "../../core/frontmatter/okfFrontmatter";
import { renderPropertiesTable, replacePropertiesTableHtml } from "../../core/frontmatter/propertiesTable";
import type { HostDocument } from "../../host-api/documentStore";
import type { SourceMappingOptions } from "../../core/mapping/sourceMapping";
import { flushRefusalMessage } from "../../core/preview/flushWait";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import type { Revision } from "../../core/protocol/revision";
import type { RenderResult } from "../../core/render/renderPipeline";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { currentPreviewDocument, revisionOfStage } from "../sessionDocuments";
import { fireAndForget } from "../../host-api/logger";

/** The watchers of one linked target: the host's one and the direct operating-system one. */
export interface LinkedTargetWatcher {
  dispose(): void;
  direct: LinkedTargetWatch;
  /** Events the host's watcher delivered (the direct watch counts its own). */
  vscodeEvents: number;
  /** The canonical path of the target, resolved once. */
  canonical: string;
}

/** Frontmatter state of one page (owned by the frontmatter controller). */
export interface FrontmatterState {
  /** The last analysis of the shown document; undefined when it has no frontmatter. */
  result?: FrontmatterResult;
  /** The document the analysis was made for. */
  documentUri?: string;
  /** Revision of the document text the frontmatter analysis was made from. */
  revision?: number;
  /** Revision the frontmatter links were resolved for (link enrichment). */
  linkResultsRevision?: number;
  refreshTimer?: NodeJS.Timeout;
  linkEnrichmentTimer?: NodeJS.Timeout;
  linkedTargetWatchers?: Map<string, LinkedTargetWatcher>;
}

/** A fresh {@link FrontmatterState}. */
export function createFrontmatterState(): FrontmatterState {
  return {};
}

const FRONTMATTER_DEBOUNCE_MS = 300;
const LINK_ENRICHMENT_DEBOUNCE_MS = 150;

/** The frontmatter, its properties table and its links. */
export class FrontmatterController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handler of a frontmatter field save. */
  public register(router: PageMessageRouter): void {
    router.on("previewFrontmatterSave", (message, preview) =>
      this.manager.edits.trackPendingSave(preview, this.handleSave(preview, message)));
  }

  /** The frontmatter analysis of `sourceText` with the settings and roots of the preview. */
  public analyze(
    preview: PreviewSession,
    filePath: string,
    sourceText: string,
    inspectLinks: boolean,
    workspaceRoots: string[] = preview.sessionRoots,
  ): FrontmatterResult {
    return analyzeFrontmatter({
      schemaFiles: this.manager.host.schemaFiles,
      filePath,
      sourceText,
      stopDir: preview.workspaceRoot,
      allowSchemaResolution: !preview.readOnly,
      inspectLinks,
      strictAdditionalProperties: preview.frontmatterConfiguration.strictAdditionalProperties,
      bundleRoot: preview.frontmatterConfiguration.bundleRoot,
      projectRoot: preview.frontmatterConfiguration.projectRoot,
      allowOutsideWorkspaceLinks: preview.frontmatterConfiguration.allowOutsideWorkspaceLinks,
      workspaceRoots,
    });
  }

  /** Records an analysis; with resolved links, watches each linked target that the table shows. */
  public setState(
    preview: PreviewSession,
    frontmatter: FrontmatterResult,
    documentUri: string,
    revision: Revision,
    linksResolved: boolean,
  ): void {
    const state = preview.frontmatter;
    state.result = frontmatter.present ? frontmatter : undefined;
    state.documentUri = documentUri;
    state.revision = revision;
    state.linkResultsRevision = linksResolved ? revision : undefined;
    if (linksResolved) {
      const targets = new Set(frontmatter.linkResults?.filter((link) =>
        link.resolvedPath && (link.tooltipFields !== undefined || link.previewFields !== undefined),
      ).map((link) => link.resolvedPath as string));
      state.linkedTargetWatchers ??= new Map();
      for (const [target, watcher] of state.linkedTargetWatchers) {
        if (!targets.has(target)) {
          watcher.dispose();
          state.linkedTargetWatchers.delete(target);
        }
      }
      for (const target of targets) {
        if (state.linkedTargetWatchers.has(target)) continue;
        const refresh = (): void => {
          preview.probe.linkedTargetEvents += 1;
          const document = preview.document;
          if (document && !preview.disposed) {
            this.scheduleLinkEnrichment(preview, preview.documentUri, document.revision);
          }
        };
        // One host watcher and one direct watch per target, shared by the previews that link it
        // (capped); both may report the same write, the link enrichment they schedule is debounced.
        // The direct watch is armed when it returns, before the properties table shows the link as resolved.
        const entry: LinkedTargetWatcher = {
          dispose: () => undefined, direct: undefined as unknown as LinkedTargetWatch, vscodeEvents: 0,
          canonical: this.manager.canonicalPath(target),
        };
        const hold = this.manager.linkedTargetWatches.acquire(target, refresh, () => {
          entry.vscodeEvents += 1;
        });
        entry.direct = hold.direct;
        entry.dispose = () => hold.dispose();
        state.linkedTargetWatchers.set(target, entry);
      }
    }
  }

  /** True when the preview watches `canonical` as a linked target (paths compared canonically). */
  public watchesLinkedTarget(preview: PreviewSession, canonical: string): boolean {
    return [...preview.frontmatter.linkedTargetWatchers?.values() ?? []]
      .some((entry) => entry.canonical === canonical);
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
  /** Resolves the frontmatter links of `documentUri` at `revision` after a debounce (T30). */
  public scheduleLinkEnrichment(
    preview: PreviewSession,
    documentUri: string,
    revision: number,
    result?: RenderResult,
    generation?: number,
  ): void {
    const { manager } = this;
    const state = preview.frontmatter;
    if (state.linkEnrichmentTimer) {
      clearTimeout(state.linkEnrichmentTimer);
    }
    state.linkEnrichmentTimer = setTimeout(() => {
      state.linkEnrichmentTimer = undefined;
      const current = preview.document;
      if (preview.disposed
        || !manager.has(preview)
        || preview.documentUri !== documentUri
        || !current
        || current.id !== documentUri
        || current.revision !== revision
        || (result !== undefined && !manager.rendering.isCurrentRender(preview, result, generation))) {
        return;
      }
      const frontmatter = this.analyze(preview, manager.pathOf(current), current.getText(), true);
      if (preview.disposed
        || !manager.has(preview)
        || preview.documentUri !== documentUri
        || preview.document !== current
        || current.revision !== revision
        || (result !== undefined && !manager.rendering.isCurrentRender(preview, result, generation))) {
        return;
      }
      this.setState(preview, frontmatter, documentUri, revision, true);
      const stage = preview.stage;
      const sourceMapping = stage && stage.activeDocumentIdentity === documentUri ? {
        documentId: stage.activeDocumentIdentity,
        activeSourceFile: stage.activeDocumentPath,
      } : undefined;
      manager.edits.deferWhileEditing(preview, "links", () => {
        if (!preview.disposed
          && preview.document === current
          && current.revision === revision
          && preview.stage === stage) {
          this.patchPropertiesTable(preview, frontmatter, sourceMapping);
        }
      });
    }, LINK_ENRICHMENT_DEBOUNCE_MS);
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-043
  /**
   * Recomputes the frontmatter payload from the current buffer and re-renders
   * only the properties table, without running the heavier Sphinx build. Falls
   * back to a full render of the already-built webview by relaying on the last
   * good webview HTML string: the table is replaced in place via its anchor.
   */
  public refresh(preview: PreviewSession, document: HostDocument): void {
    const { manager } = this;
    const state = preview.frontmatter;
    if (!manager.has(preview) || document.id !== preview.documentUri) {
      return;
    }
    if (state.refreshTimer) {
      clearTimeout(state.refreshTimer);
    }
    state.refreshTimer = setTimeout(() => {
      state.refreshTimer = undefined;
      if (!manager.has(preview) || preview.disposed) {
        return;
      }
      const current = preview.document;
      if (!current || current.id !== preview.documentUri || current.revision !== document.revision) {
        return;
      }
      const result = this.analyze(preview, manager.pathOf(current), current.getText(), false);
      this.setState(preview, result, preview.documentUri, current.revision, false);
      const sourceMapping = preview.stage ? {
        documentId: preview.stage.activeDocumentIdentity,
        activeSourceFile: preview.stage.activeDocumentPath,
      } : undefined;
      this.patchPropertiesTable(preview, result, sourceMapping);
      this.scheduleLinkEnrichment(preview, preview.documentUri, current.revision);
    }, FRONTMATTER_DEBOUNCE_MS);
  }

  /** Stops the frontmatter refresh and the link enrichment of a preview. */
  public cancelPending(preview: PreviewSession): void {
    const state = preview.frontmatter;
    if (state.refreshTimer) {
      clearTimeout(state.refreshTimer);
      state.refreshTimer = undefined;
    }
    if (state.linkEnrichmentTimer) {
      clearTimeout(state.linkEnrichmentTimer);
      state.linkEnrichmentTimer = undefined;
    }
  }

  /** Stops the watches of the linked targets of a preview. */
  public disposeWatchers(preview: PreviewSession): void {
    for (const watcher of preview.frontmatter.linkedTargetWatchers?.values() ?? []) watcher.dispose();
    preview.frontmatter.linkedTargetWatchers?.clear();
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-004
  /**
   * Applies a fresh frontmatter result to the properties section (T30). The host's record of the page
   * is always updated; a page that is ready for the current stage is patched in place with the same
   * markup, without reloading it. Nothing happens when the markup did not change. A page that is not
   * ready yet loads the new document instead.
   */
  private patchPropertiesTable(
    preview: PreviewSession,
    result: FrontmatterResult,
    sourceMapping: SourceMappingOptions | undefined,
  ): void {
    if (preview.disposed) {
      return;
    }
    const markup = renderPropertiesTable(
      result,
      preview.frontmatterConfiguration.propertiesTable,
      sourceMapping,
      !preview.readOnly,
    );
    const html = replacePropertiesTableHtml(preview.webview.html, markup);
    if (html === preview.webview.html) {
      return;
    }
    const stage = preview.stage;
    if (stage && preview.page.readyRequestId === stage.requestId) {
      // preview.webview is the host's record of the page; the loaded document is patched by the
      // message, so the panel's html is deliberately not assigned (no reload).
      preview.webview = { ...preview.webview, html };
      preview.page.propertiesTableSeq += 1;
      preview.page.propertiesTableAwaited = preview.page.propertiesTableSeq;
      fireAndForget(this.manager.host.logger, preview.postToPage({
        type: "previewPropertiesTable",
        documentId: stage.activeDocumentIdentity,
        revision: revisionOfStage(stage),
        requestId: stage.requestId,
        seq: preview.page.propertiesTableSeq,
        markup,
      }), "postToPage");
      return;
    }
    this.manager.rendering.setPanelHtml(preview, html);
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-067
  /** Answers a frontmatter save with an error the page shows next to the field. */
  public postEditError(
    preview: PreviewSession,
    message: PageMessageOf<"previewFrontmatterSave">,
    error: string,
  ): void {
    if (message.flush === true) {
      // The page is about to be replaced: only a host warning tells the reader the text was dropped.
      const field = message.newFieldName ?? message.fieldName;
      fireAndForget(this.manager.host.logger, this.manager.host.ui.showWarning(flushRefusalMessage(
        field ? `the frontmatter field "${field}"` : "a frontmatter field",
        error,
      )), "showWarning");
    }
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewFrontmatterResult",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      error,
    }), "postToPage");
  }

  private postEditSaved(
    preview: PreviewSession,
    message: PageMessageOf<"previewFrontmatterSave">,
  ): void {
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewFrontmatterResult",
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      saved: true,
    }), "postToPage");
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-058
  private handleSave(preview: PreviewSession, message: PageMessageOf<"previewFrontmatterSave">): PromiseLike<void> | undefined {
    const { manager } = this;
    const document = currentPreviewDocument(preview, message);
    if (!document) {
      this.postEditError(preview, message, FRONTMATTER_STALE);
      return;
    }
    const plan = planFrontmatterSave(document.getText(), preview.frontmatter.result, message);
    if ("error" in plan) {
      this.postEditError(preview, message, plan.error);
      return;
    }
    if (plan.needsSchemaCheck) {
      const candidate = this.analyze(preview, manager.pathOf(document), plan.candidateSource, false);
      const refusal = checkFrontmatterCandidate(plan, candidate, preview.frontmatter.result);
      if (refusal) {
        this.postEditError(preview, message, refusal.error);
        return;
      }
    }
    return manager.host.documents.applyEdits(document, [plan.edit]).then((applied) => {
      if (applied) {
        manager.scroll.storePendingPin(preview, message, document.revision);
        this.postEditSaved(preview, message);
      } else {
        this.postEditError(preview, message, "VS Code could not apply the frontmatter edit.");
      }
    }, (error: unknown) => {
      this.postEditError(
        preview,
        message,
        error instanceof Error ? error.message : String(error),
      );
    });
  }
}
