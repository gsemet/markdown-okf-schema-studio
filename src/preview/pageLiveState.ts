/**
 * Live state of a preview page: what the host knows that can change after a render, and that the
 * page reads from the context of that render.
 *
 * The host announces each change with a message, but a message can reach a page before the page
 * listens. VS Code's webview loader hands the queued messages to a new document a fixed delay after
 * writing it (`pre/index.html`, `hookupOnLoadHandlers`), not once its scripts ran. The page loads
 * its runtime as a file (PERF-11), and a slow load lets those messages fall on a document that has
 * no listener yet. The page reports `previewReady` only once it listens, so the host answers that
 * report with the current state: a change announced before it is never lost.
 *
 * This module must not import `vscode`.
 */

export interface PageIdentity {
  documentId: string;
  documentVersion: number;
  requestId: number;
}

export interface PageLiveState {
  /** A visible text editor shows the page's file: the anchor button can be used. */
  pairedTextEditor: boolean;
  /** `vscode.ColorThemeKind` of the active color theme. */
  themeKind: number;
}

export interface PageLiveStateMessage extends PageIdentity {
  type: "previewPairing" | "themeChanged";
  [field: string]: unknown;
}

/** The messages that bring the page that reported `ready` up to the host's live state. */
export function pageLiveStateMessages(ready: PageIdentity, live: PageLiveState): PageLiveStateMessage[] {
  const identity = {
    documentId: ready.documentId,
    documentVersion: ready.documentVersion,
    requestId: ready.requestId,
  };
  return [
    { type: "previewPairing", ...identity, pairedTextEditor: live.pairedTextEditor },
    { type: "themeChanged", ...identity, themeKind: live.themeKind },
  ];
}
