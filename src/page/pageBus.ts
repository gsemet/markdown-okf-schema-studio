/**
 * The page bus: how the feature modules of the page runtime tell each other what happened without
 * importing each other. A feature emits an event; every listener of that event runs at once
 * (synchronously), in the order it subscribed, before `emit` returns, so a feature module keeps the
 * exact ordering a direct call had. A listener that throws stops the remaining listeners of that
 * event and the error reaches the emitter, as a direct call would. Host messages do not travel on
 * the bus: they go through the typed router (see `./hostMessages.ts`).
 */

/** A map of event names to the payload each one carries (`undefined` for none). */
export type PageEventMap = Record<string, unknown>;

/** A typed, synchronous event bus. */
export interface PageBus<Events extends PageEventMap> {
  /** Calls `listener` on every later `emit` of `type`; the returned function unsubscribes it. */
  on<Type extends keyof Events>(type: Type, listener: (payload: Events[Type]) => void): () => void;
  /** Runs every listener of `type` with `payload`, in subscription order. */
  emit<Type extends keyof Events>(type: Type, payload: Events[Type]): void;
}

/** A new, empty {@link PageBus}. */
export function createPageBus<Events extends PageEventMap>(): PageBus<Events> {
  type Listener = (payload: unknown) => void;
  const listeners = new Map<keyof Events, Listener[]>();
  return {
    on(type, listener) {
      const list = listeners.get(type) ?? [];
      list.push(listener as Listener);
      listeners.set(type, list);
      return () => {
        const current = listeners.get(type);
        const index = current?.indexOf(listener as Listener) ?? -1;
        if (current && index >= 0) current.splice(index, 1);
      };
    },
    emit(type, payload) {
      // A copy: a listener that subscribes or unsubscribes changes the next emit, not this one.
      for (const listener of [...(listeners.get(type) ?? [])]) listener(payload);
    },
  };
}

/** The events of the page runtime. */
export interface PageEvents extends PageEventMap {
  /** The rendered content was replaced in place (content patch); its listeners are bound again. */
  contentReplaced: undefined;
  /** A file a PlantUML diagram includes changed; the diagrams that include it draw again. */
  plantUmlIncludesChanged: undefined;
}
