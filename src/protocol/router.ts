/**
 * A typed message router, the same on both sides of the protocol: handlers register per message
 * type with `on(type, handler)` and `dispatch` runs the one registered for a message's type. Pure
 * module: no host API, no DOM, no Node built-ins.
 *
 * {@link createMessageRouter} is self-contained: the page runtime is still assembled with
 * `Function.prototype.toString()`, so its body must not use anything defined outside it. When the
 * page becomes a bundle with normal imports, it is imported like any other module.
 */

/**
 * A handler of one message type. It returns its result, or `false` when it does not take the
 * message after all (the router then reports the message as not handled).
 */
export type MessageHandler<M, C extends unknown[], R> = (message: M, ...context: C) => R | false;

/** What {@link MessageRouter.dispatch} did with a message. */
export type RouteOutcome<R> = { readonly handled: true; readonly result: R } | { readonly handled: false };

/**
 * Routes the messages of a discriminated union `M` (discriminant `type`) to one handler per type.
 * `C` is the extra context passed to every handler, `R` what a handler returns.
 */
export interface MessageRouter<M extends { readonly type: string }, C extends unknown[] = [], R = unknown> {
  /** Registers the handler of a message type; a second handler for the same type throws. */
  on<T extends M["type"]>(type: T, handler: MessageHandler<Extract<M, { type: T }>, C, R>): void;
  /**
   * Runs the handler of the message's type. Not handled: no handler is registered, or it returned
   * `false`. The message is expected to be validated already.
   */
  dispatch(message: M, ...context: C): RouteOutcome<R>;
}

/** A new, empty {@link MessageRouter}. Self-contained (see the module comment). */
export function createMessageRouter<M extends { readonly type: string }, C extends unknown[] = [], R = unknown>(
): MessageRouter<M, C, R> {
  const handlers = new Map<string, (message: M, ...context: C) => R | false>();
  return {
    on(type, handler) {
      if (handlers.has(type)) throw new Error("A handler is already registered for " + type);
      handlers.set(type, handler as unknown as (message: M, ...context: C) => R | false);
    },
    dispatch(message, ...context) {
      const handler = handlers.get(message.type);
      if (!handler) return { handled: false };
      const result = handler(message, ...context);
      return result === false ? { handled: false } : { handled: true, result };
    },
  };
}
