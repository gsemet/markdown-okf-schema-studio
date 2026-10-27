/**
 * Shared file watchers: one host watcher per (folder, pattern) however many previews listen, and one
 * watch (host plus direct) per linked target file, capped. A watcher lives while at least one
 * listener holds it; the last release disposes it. Host-neutral: it works on the `Watcher` port.
 */

import * as path from "node:path";

import type { Disposable } from "../host-api/events";
import type { Watcher } from "../host-api/watcher";
import { type LinkedTargetWatch, watchLinkedTargetDirectly } from "../node-services/linkedTargetWatch";
import { globLiteral } from "./sessionDocuments";

/** The callbacks of one listener of a shared watcher; each receives the file system path. */
export interface WatchHandlers {
  onDidChange?(filePath: string): void;
  onDidCreate?(filePath: string): void;
  onDidDelete?(filePath: string): void;
}

interface SharedEntry {
  listeners: Set<WatchHandlers>;
  dispose(): void;
}

/** At most this many distinct linked targets are watched at once, however many previews link them. */
export const MAX_LINKED_TARGET_WATCHES = 256;

// @implements_req SwRS-MDOKFSTUDIO-LIFE-143
/** One host watcher per (base, pattern), shared by every listener, disposed with the last one. */
export class SharedWatchers {
  private readonly entries = new Map<string, SharedEntry>();

  public constructor(private readonly watcher: Watcher) {}

  /** How many host watchers are open. */
  public get size(): number {
    return this.entries.size;
  }

  /** Listens to the files matching `pattern` below `base`; dispose the result to stop. */
  public acquire(base: string, pattern: string, handlers: WatchHandlers): Disposable {
    const key = `${base}\u0000${pattern}`;
    let entry = this.entries.get(key);
    if (!entry) {
      const watcher = this.watcher.watch(base, pattern);
      const listeners = new Set<WatchHandlers>();
      const fan = (pick: (handlers: WatchHandlers) => ((filePath: string) => void) | undefined) =>
        (filePath: string): void => {
          for (const listener of [...listeners]) pick(listener)?.(filePath);
        };
      const subscriptions = [
        watcher.onDidChange(fan((listener) => listener.onDidChange)),
        watcher.onDidCreate(fan((listener) => listener.onDidCreate)),
        watcher.onDidDelete(fan((listener) => listener.onDidDelete)),
      ];
      entry = {
        listeners,
        dispose: () => {
          for (const subscription of subscriptions) subscription.dispose();
          watcher.dispose();
        },
      };
      this.entries.set(key, entry);
    }
    const shared = entry;
    // The handlers are wrapped so the same object can be acquired twice and released separately.
    const listener: WatchHandlers = {
      onDidChange: (filePath) => handlers.onDidChange?.(filePath),
      onDidCreate: (filePath) => handlers.onDidCreate?.(filePath),
      onDidDelete: (filePath) => handlers.onDidDelete?.(filePath),
    };
    shared.listeners.add(listener);
    let released = false;
    return {
      dispose: () => {
        if (released) return;
        released = true;
        shared.listeners.delete(listener);
        if (shared.listeners.size === 0 && this.entries.get(key) === shared) {
          this.entries.delete(key);
          shared.dispose();
        }
      },
    };
  }
}

/** A listener's hold on the watches of one linked target. */
export interface LinkedTargetHold extends Disposable {
  /** The direct operating-system watch of the target (shared); a closed stub past the cap. */
  direct: LinkedTargetWatch;
}

interface LinkedTargetEntry {
  listeners: Set<() => void>;
  hostListeners: Set<() => void>;
  hostHold: Disposable;
  direct: LinkedTargetWatch;
}

const CAPPED_WATCH: LinkedTargetWatch = {
  state: () => ({ status: "failed", error: "watch limit", events: 0 }),
  dispose: () => undefined,
};

/**
 * The watches of linked targets (host watcher plus direct watch), one pair per target however many
 * previews link it, at most {@link MAX_LINKED_TARGET_WATCHES} targets. Past the cap a target gets no
 * watch of its own: the preview-wide dependency watcher and the save handler still apply.
 */
export class SharedLinkedTargetWatches {
  private readonly entries = new Map<string, LinkedTargetEntry>();
  private warned = false;

  public constructor(
    private readonly watchers: SharedWatchers,
    private readonly limit = MAX_LINKED_TARGET_WATCHES,
  ) {}

  /** How many targets are watched. */
  public get size(): number {
    return this.entries.size;
  }

  /**
   * Calls `onEvent` when `target` changes (host watcher or direct watch). `onHostEvent` is told of
   * the events the host's watcher delivered, for the test snapshot.
   */
  public acquire(target: string, onEvent: () => void, onHostEvent: () => void): LinkedTargetHold {
    let entry = this.entries.get(target);
    if (!entry) {
      if (this.entries.size >= this.limit) {
        if (!this.warned) {
          this.warned = true;
          console.warn(`Markdown OKF Schema Studio: more than ${this.limit} linked targets; extra ones are not watched individually.`);
        }
        return { direct: CAPPED_WATCH, dispose: () => undefined };
      }
      const listeners = new Set<() => void>();
      const hostListeners = new Set<() => void>();
      const broadcast = (): void => {
        for (const listener of [...listeners]) listener();
      };
      const fromHost = (): void => {
        for (const listener of [...hostListeners]) listener();
        broadcast();
      };
      const hostHold = this.watchers.acquire(path.dirname(target), globLiteral(path.basename(target)), {
        onDidChange: fromHost,
        onDidCreate: fromHost,
        onDidDelete: fromHost,
      });
      // The host's watcher of a path inside a workspace folder rides on the shared recursive
      // workspace watcher, which can miss a write on Linux: the folder is also watched directly.
      entry = { listeners, hostListeners, hostHold, direct: watchLinkedTargetDirectly(target, broadcast) };
      this.entries.set(target, entry);
    }
    const shared = entry;
    shared.listeners.add(onEvent);
    shared.hostListeners.add(onHostEvent);
    let released = false;
    return {
      direct: shared.direct,
      dispose: () => {
        if (released) return;
        released = true;
        shared.listeners.delete(onEvent);
        shared.hostListeners.delete(onHostEvent);
        if (shared.listeners.size === 0 && this.entries.get(target) === shared) {
          this.entries.delete(target);
          shared.hostHold.dispose();
          shared.direct.dispose();
        }
      },
    };
  }
}
