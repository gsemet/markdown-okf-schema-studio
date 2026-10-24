/**
 * Host messages on the page side (src/protocol/hostToPage.ts): the filter checks that a message is
 * addressed to this page and has a valid payload, then the typed router runs the handler of its
 * type. Feature modules register their handlers on {@link PageHostMessages.router}; one handler per
 * type.
 */

import type { PageIdentity } from "../protocol/envelope";
import { createHostMessageFilter, type HostToPageMessage } from "../protocol/hostToPage";
import { createMessageRouter, type MessageRouter } from "../protocol/router";
import type { HostTransport } from "./hostTransport";

/** The router of host messages a page feature registers its handlers on. */
export type HostMessageRouter = MessageRouter<HostToPageMessage>;

/** The host message filter and router of a page. */
export interface PageHostMessages {
  /** Where features register the handler of a host message type. */
  readonly router: HostMessageRouter;
  /**
   * Starts listening to the transport. A message addressed to `page` (read at each message: a
   * content patch moves it) goes to the handler of its type; any other message, and one whose
   * handler declines it, goes to `unhandled`.
   */
  listen(transport: HostTransport, page: PageIdentity, unhandled: (message: unknown) => void): void;
}

/** A new filter and an empty router. */
export function createPageHostMessages(): PageHostMessages {
  const filter = createHostMessageFilter();
  const router: HostMessageRouter = createMessageRouter<HostToPageMessage>();
  return {
    router,
    listen(transport, page, unhandled) {
      transport.onMessage((message) => {
        if (filter.accepts(message, page) && router.dispatch(message).handled) return;
        unhandled(message);
      });
    },
  };
}
