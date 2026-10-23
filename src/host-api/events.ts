/**
 * Subscriptions and events shared by the host ports. Host-neutral: no host API, no DOM, no Node
 * built-ins (rule for every file of `src/host-api/`).
 */

/** Something that holds a resource or a subscription until it is disposed. */
export interface Disposable {
  dispose(): void;
}

/** A source of events: `event(listener)` subscribes, and disposing the result unsubscribes. */
export type HostEvent<T> = (listener: (value: T) => void) => Disposable;

/** A small event source for port implementations that fire their own events. */
export class EventSource<T> {
  private readonly listeners = new Set<(value: T) => void>();

  /** Subscribes a listener; listeners run in the order they subscribed. */
  public readonly event: HostEvent<T> = (listener) => {
    const entry = (value: T): void => listener(value);
    this.listeners.add(entry);
    return { dispose: () => this.listeners.delete(entry) };
  };

  /** Calls every listener with `value`. */
  public fire(value: T): void {
    for (const listener of [...this.listeners]) listener(value);
  }
}
