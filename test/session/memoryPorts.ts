/** In-memory ports for the session tests of the feature introductions and the association migration. */

import type { HostUi } from "../../src/host-api/hostUi";
import type { KeyValueStore } from "../../src/host-api/keyValueStore";
import type { Logger } from "../../src/host-api/logger";

/** A key-value store in a map, with a switch that makes every write fail and a log of the writes. */
export class MemoryStore implements KeyValueStore {
  public readonly values = new Map<string, unknown>();
  public failWrites = false;
  public readonly log: string[] = [];

  public get<T>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  public update(key: string, value: unknown): PromiseLike<void> {
    this.log.push(`update ${key}`);
    if (this.failWrites) return Promise.reject(new Error("disk full"));
    if (value === undefined) this.values.delete(key);
    else this.values.set(key, value);
    return Promise.resolve();
  }

  public keys(): readonly string[] {
    return [...this.values.keys()];
  }
}

/** A `HostUi` whose notifications are pushed on `shown` (and `show` on `log`); every other call does nothing. */
export function recordingUi(shown: string[], log: string[] = []): HostUi {
  return new Proxy({}, {
    get: (_target, name) => (name === "showInformation" || name === "showWarning" || name === "showError")
      ? (message: string, ..._actions: string[]) => {
        shown.push(`${String(name)}: ${message}`);
        log.push("show");
        return Promise.resolve(undefined);
      }
      : () => Promise.resolve(undefined),
  }) as HostUi;
}

/** A logger that collects the messages of `error` in `errors`. */
export function recordingLogger(errors: string[] = []): Logger {
  return { error: (message) => void errors.push(message), warn: () => undefined, info: () => undefined };
}
