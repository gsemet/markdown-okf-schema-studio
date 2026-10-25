/**
 * The page side of local PlantUML `!include` files. The PlantUML bundle cannot post to the host
 * (the page script owns the VS Code API), so it dispatches `studio:plantuml-file-request` on the
 * document with the request and a `respond` callback; the page script marks the event `accepted`,
 * asks the host with a registered `previewPlantUmlInclude` message and responds with the answer
 * (matched by its own edit id, so a late answer for a page that moved on is dropped). The host
 * announces a changed file with `previewPlantUmlIncludesChanged`, which becomes
 * `studio:plantuml-includes-changed` for the bundle.
 */

export const PLANTUML_FILE_REQUEST_EVENT = "studio:plantuml-file-request";
export const PLANTUML_INCLUDES_CHANGED_EVENT = "studio:plantuml-includes-changed";

/** How long the page waits for the host to read one file. */
export const PLANTUML_FILE_REQUEST_TIMEOUT_MS = 10000;

export interface PlantUmlFileRequestDetail {
  request: { path: string; from: string | null };
  /** Set by the page script when it takes the request. */
  accepted: boolean;
  respond(answer: { ok: true; id: string; text: string } | { ok: false; reason: string }): void;
}

interface FileRequestAsker {
  ask(
    type: string,
    payload: Record<string, unknown>,
    settings: { timeoutMs?: number },
    done: (result: { ok?: boolean; reason?: unknown; [field: string]: unknown }) => void,
  ): void;
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-046
/**
 * Forwards the bundle's file requests to the host through `requests` (an `installHostRequests`
 * instance of its own, so closing an editor does not cancel them).
 */
export function installPlantUmlFileRequests(
  document: Pick<Document, "addEventListener">,
  requests: FileRequestAsker,
  timeoutMs: number,
): void {
  document.addEventListener("studio:plantuml-file-request", (event) => {
    const detail = (event as CustomEvent<PlantUmlFileRequestDetail>).detail;
    if (!detail || typeof detail.respond !== "function" || !detail.request
      || typeof detail.request.path !== "string") {
      return;
    }
    detail.accepted = true;
    const from = typeof detail.request.from === "string" ? detail.request.from : null;
    requests.ask("previewPlantUmlInclude", { path: detail.request.path, from }, { timeoutMs }, (result) => {
      if (result.ok === true && typeof result.id === "string" && typeof result.text === "string") {
        detail.respond({ ok: true, id: result.id, text: result.text });
        return;
      }
      detail.respond({
        ok: false,
        reason: typeof result.reason === "string" ? result.reason : `${detail.request.path} could not be read.`,
      });
    });
  });
}
