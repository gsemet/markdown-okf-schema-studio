/**
 * The page's only link to its host. The runtime posts messages, keeps a small saved state and
 * listens for host messages through a {@link HostTransport}, never through a host API directly, so
 * another host (a standalone window, a canvas) plugs in its own transport. The VS Code webview one
 * is {@link createVsCodeTransport}.
 */

/** The channel between a preview page and its host. */
export interface HostTransport {
  /** Sends a page-to-host message (see `src/core/protocol/pageToHost.ts`). */
  postMessage(message: unknown): void;
  /** The state the host keeps for this page across reloads, or `undefined` when there is none. */
  getState(): unknown;
  /** Replaces the state the host keeps for this page. */
  setState(state: unknown): void;
  /**
   * Calls `listener` with the data of every message the host sends (unfiltered: the page filters
   * and routes them, see `src/core/protocol/hostToPage.ts`).
   */
  onMessage(listener: (data: unknown) => void): void;
}

/** The part of the VS Code webview API (`acquireVsCodeApi()`) the transport uses. */
export interface VsCodeWebviewApi {
  /** Posts a message to the extension host. */
  postMessage(message: unknown): void;
  /** The webview state VS Code keeps across reloads. */
  getState?(): unknown;
  /** Replaces the webview state VS Code keeps across reloads. */
  setState?(state: unknown): void;
}

/**
 * The transport of a VS Code webview: messages through the webview API, host messages as `message`
 * events of the page's window.
 */
export function createVsCodeTransport(api: VsCodeWebviewApi, window: Pick<Window, "addEventListener">): HostTransport {
  return {
    postMessage: (message) => api.postMessage(message),
    getState: () => api.getState?.(),
    setState: (state) => api.setState?.(state),
    onMessage: (listener) => window.addEventListener("message", (event) => listener((event as MessageEvent).data)),
  };
}
