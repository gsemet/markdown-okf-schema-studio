/**
 * The PlantUML controller: the engine a render uses (the bundled one that draws in the page, or the
 * JAR the host runs), the diagrams the host draws after a render (injected in place when the page
 * is ready), and the `!include` files the bundled engine reads through the host.
 */

import { resolvePlantUmlEngine } from "../../core/configuration/plantUmlConfiguration";
import { formatStatusDiagnostic, setPreviewStatus } from "../webview";
import { diagnosticsFitPatch, planContentPatch } from "../../core/preview/contentPatch";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import { PlantUmlIncludeWatch, resolvePlantUmlInclude } from "../../core/render/plantUmlIncludes";
import { injectPlantUmlDiagrams } from "../../core/render/plantUmlRenderer";
import type { RenderResult } from "../../core/render/renderPipeline";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";

/** PlantUML state of one page (owned by the PlantUML controller). */
export interface PlantUmlState {
  /** Files the built-in engine was served for `!include` (canonical paths): a change draws again. */
  includeWatch: PlantUmlIncludeWatch;
}

/** A fresh {@link PlantUmlState}. */
export function createPlantUmlState(): PlantUmlState {
  return { includeWatch: new PlantUmlIncludeWatch() };
}

/** PlantUML diagrams of the page. */
export class PlantUmlController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handler of the bundled engine's include requests. */
  public register(router: PageMessageRouter): void {
    router.on("previewPlantUmlInclude", (message, preview) => this.handleInclude(preview, message));
  }

  /**
   * The engine for this preview's next render: the bundled one unless `useJar` is on. With `useJar`
   * in an untrusted workspace the JAR pipeline is still asked, and it refuses without a process.
   */
  public engineFor(preview: PreviewSession): "builtin" | "jar" {
    return resolvePlantUmlEngine(preview.plantUmlEngineSettings, this.manager.host.workspace.trusted) === "builtin"
      ? "builtin"
      : "jar";
  }

  /** Starts the work that follows a render: link enrichment, then the host's diagrams. */
  public scheduleDeferredWork(preview: PreviewSession, result: RenderResult): void {
    const { manager } = this;
    const generation = ++preview.page.enrichmentGeneration;
    manager.frontmatter.scheduleLinkEnrichment(
      preview,
      result.stage.activeDocumentIdentity,
      result.stage.activeDocumentRevision,
      result,
      generation,
    );
    setTimeout(() => {
      if (!manager.rendering.isCurrentRender(preview, result, generation)) {
        return;
      }
      void result.resolvePlantUml().then((plantUml) => {
        manager.edits.deferWhileEditing(preview, "plantuml", () => this.apply(preview, result, generation, plantUml));
      });
    }, 0);
  }

  private apply(
    preview: PreviewSession,
    result: RenderResult,
    generation: number,
    plantUml: Awaited<ReturnType<RenderResult["resolvePlantUml"]>>,
  ): void {
    const { rendering } = this.manager;
    if (!rendering.isCurrentRender(preview, result, generation)) {
      return;
    }
    const diagnostics = plantUml.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      code: "plantuml-render",
      file: result.stage.activeDocumentPath,
    }));
    const injected = injectPlantUmlDiagrams(preview.webview.html, plantUml.diagrams);
    if (injected === preview.webview.html && diagnostics.length === 0) {
      return;
    }
    // While a render is pending over this page, the page still shows the status it had.
    const shownStatus = preview.shownStatus ?? preview.status;
    const statusDiagnostics = [...result.diagnostics, ...diagnostics];
    const html = setPreviewStatus(injected, shownStatus, undefined, statusDiagnostics);
    const nextDiagnostics = [...preview.webview.diagnostics, ...diagnostics];
    // A page that is ready for this stage takes the diagrams in place; the stage does not change.
    const statusLines = statusDiagnostics.map(formatStatusDiagnostic);
    const contentPatch = preview.configuration.incrementalUpdates
      && preview.page.readyRequestId === result.stage.requestId
      && diagnosticsFitPatch(statusLines)
      ? planContentPatch(preview.webview.html, html)
      : undefined;
    if (contentPatch) {
      preview.webview = { ...preview.webview, html, diagnostics: nextDiagnostics };
      // The page removes its pending overlay when it applies a patch, as a reload would; the next
      // ready report shows it again while a render is still pending.
      rendering.clearPendingOverlay(preview);
      rendering.postContentPatch(preview, result.stage, result.stage, {
        contentHtml: contentPatch.contentHtml,
        status: shownStatus,
        diagnostics: statusLines,
      });
      return;
    }
    rendering.setPanelHtml(preview, html, nextDiagnostics);
  }

  /**
   * A local `!include` file for the built-in PlantUML engine: read under the rules of `{include}`
   * (only the document's folder and below in Restricted Mode) and watched, so a change draws the
   * diagrams again. It reads only; the answer repeats `editId`.
   */
  private handleInclude(preview: PreviewSession, message: PageMessageOf<"previewPlantUmlInclude">): void {
    const { manager } = this;
    const answer = resolvePlantUmlInclude(
      { path: message.path, from: message.from },
      { documentPath: manager.activePathOf(preview), workspaceRoot: preview.workspaceRoot, trusted: manager.host.workspace.trusted },
    );
    if (answer.watch) {
      preview.plantUml.includeWatch.remember(manager.canonicalPath(answer.watch));
    }
    manager.requests.postHostResult(preview, message, answer.ok
      ? { ok: true, id: answer.id, text: answer.text }
      : { ok: false, reason: answer.reason });
  }

  /** An included file changed: the page draws its built-in diagrams again (after an open editor). */
  public notifyIncludesChanged(preview: PreviewSession): void {
    this.manager.edits.deferWhileEditing(preview, "plantuml-includes", () => {
      if (!preview.disposed) {
        void preview.postToPage({
          type: "previewPlantUmlIncludesChanged",
          documentId: preview.documentUri,
        });
      }
    });
  }
}
