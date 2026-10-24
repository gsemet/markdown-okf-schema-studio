/**
 * The diagnostics controller: a document's MyST extension warnings in the host's problems list
 * (trusted workspaces only), kept while a preview shows the document.
 */

import type { DiagnosticEntry, DiagnosticsSink } from "../../host-api/diagnostics";
import type { RenderResult } from "../../core/render/renderPipeline";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";

const MYST_DIAGNOSTIC_SOURCE = "Markdown OKF-Schema Studio";

/** The MyST warnings of the shown documents in the problems list. */
export class DiagnosticsController {
  private sink: DiagnosticsSink | undefined;

  public constructor(private readonly manager: PreviewManager) {}

  /** Creates the host's diagnostics collection; disposing the result removes it. */
  public start(): DiagnosticsSink {
    this.sink = this.manager.host.diagnostics.create("markdownOkfSchemaStudio.myst");
    return this.sink;
  }

  /** Removes the collection. */
  public stop(): void {
    this.sink?.dispose();
    this.sink = undefined;
  }

  /** Shows a document's MyST extension warnings in the Problems panel; trusted workspaces only. */
  public publish(preview: PreviewSession, result: RenderResult): void {
    const sink = this.sink;
    const document = preview.document;
    if (!sink || !document || !this.manager.host.workspace.trusted
      || document.id !== result.stage.activeDocumentIdentity) {
      return;
    }
    const entries = result.diagnostics
      .filter((diagnostic) => diagnostic.code === "myst-extension" && diagnostic.line !== undefined)
      .map((diagnostic) => {
        const line = Math.min(Math.max(diagnostic.line! - 1, 0), Math.max(document.lineCount - 1, 0));
        const entry: DiagnosticEntry = {
          range: { start: { line, character: 0 }, end: { line, character: document.lineText(line).length } },
          message: diagnostic.message,
          severity: "warning",
          source: MYST_DIAGNOSTIC_SOURCE,
          code: "myst-extension",
        };
        return entry;
      });
    if (entries.length > 0 || sink.has(document.id)) {
      sink.set(document.id, entries);
    }
  }

  /** Drops the entries of a document that no live preview shows any more. */
  public clear(documentUri: string): void {
    if (!this.sink) {
      return;
    }
    for (const preview of this.manager.sessions()) {
      if (!preview.disposed && preview.documentUri === documentUri) {
        return;
      }
    }
    this.sink.delete(documentUri);
  }
}
