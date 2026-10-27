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

/** The part of a `message` event the origin check reads. */
interface MessageSource {
  source?: unknown;
  origin?: string;
}

/** The window members the transport uses. */
export type TransportWindow = Pick<Window, "addEventListener"> & Partial<Pick<Window, "parent" | "location" | "opener">>;

/**
 * Whether a `message` event comes from a sender the page trusts: the frame that hosts the page (in
 * a VS Code webview the host posts from the parent frame or from another frame of the webview
 * host, which has the page's own origin, so a sender with that origin is accepted), the page's own
 * window with its own origin, or an event dispatched in the page itself (no sender, empty origin).
 * A message from any other window, frame or opener is dropped.
 */
 function isTrustedMessageSender(event: MessageSource, window: TransportWindow): boolean {
  const { source, origin } = event;
  if (source === undefined || source === null) {
    return origin === undefined || origin === "";
  }
  if (source === window.parent) {
    return true;
  }
  const own = window.location?.origin;
  if (source === window) {
    return origin === undefined || origin === own || origin === "null";
  }
  return source !== window.opener && own !== undefined && own !== "null" && origin === own;
}

/**
 * The transport of a VS Code webview: messages through the webview API, host messages as `message`
 * events of the page's window sent by a trusted sender (see {@link isTrustedMessageSender}).
 */
// @implements_req SwRS-MDOKFSTUDIO-TRUST-059
export function createVsCodeTransport(api: VsCodeWebviewApi, window: TransportWindow): HostTransport {
  return {
    postMessage: (message) => api.postMessage(message),
    getState: () => api.getState?.(),
    setState: (state) => api.setState?.(state),
    onMessage: (listener) =>
      window.addEventListener("message", (event) => {
        const message = event as MessageEvent;
        if (isTrustedMessageSender(message, window)) {
          listener(message.data);
        }
      }),
  };
}
