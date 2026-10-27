/**
 * Shared renders: previews of the same document at the same revision and with the same render
 * options get one render between them. The first request starts it; the others join it, while it
 * runs and for a short window after it ended (two previews debounce their queues on their own
 * timers). Each preview receives its own copy of the stage, carrying its own request id, and the
 * render ends when the last copy is disposed. Host-neutral.
 */

import { RenderCanceledError, type RenderResult } from "../core/render/renderPipeline";

/** How long a finished render stays joinable (ms). */
export const SHARED_RENDER_WINDOW_MS = 250;

interface SharedEntry {
  readonly controller: AbortController;
  readonly promise: Promise<RenderResult>;
  /** The consumers that have not released their copy, plus the window while it is open. */
  holders: number;
  base?: RenderResult;
  windowTimer?: NodeJS.Timeout;
  inMap: boolean;
}

/** What identifies one render: a join is possible only when every part is equal. */
export interface SharedRenderKey {
  documentId: string;
  revision: number;
  workspaceRoot: string;
  readOnly: boolean;
  trusted: boolean;
  plantUmlJarPath: string | undefined;
  plantUmlEngine: string;
}

function keyString(key: SharedRenderKey): string {
  return JSON.stringify([
    key.documentId, key.revision, key.workspaceRoot, key.readOnly, key.trusted,
    key.plantUmlJarPath ?? null, key.plantUmlEngine,
  ]);
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-039
/** The renders in flight or just finished, by key. */
export class SharedRenders {
  private readonly entries = new Map<string, SharedEntry>();
  /** Renders started since the creation (a probe for tests and diagnostics). */
  public started = 0;

  /**
   * The render for `key` as the consumer `requestId` sees it. `run` starts the render when nobody
   * has: it gets the signal of the shared render, aborted when every consumer gave up.
   */
  public acquire(
    key: SharedRenderKey,
    requestId: number,
    signal: AbortSignal,
    run: (signal: AbortSignal) => Promise<RenderResult>,
  ): Promise<RenderResult> {
    const id = keyString(key);
    let entry = this.entries.get(id);
    if (!entry) {
      const controller = new AbortController();
      this.started += 1;
      const created: SharedEntry = {
        controller,
        holders: 0,
        inMap: true,
        promise: run(controller.signal).then((result) => {
          created.base = result;
          // The window: later requests for the same render join it.
          created.holders += 1;
          created.windowTimer = setTimeout(() => this.forget(id, created), SHARED_RENDER_WINDOW_MS);
          created.windowTimer.unref();
          return result;
        }, (error: unknown) => {
          this.forget(id, created);
          throw error;
        }),
      };
      entry = created;
      this.entries.set(id, entry);
    }
    const joined = entry;
    joined.holders += 1;
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      signal.removeEventListener("abort", onAbort);
      this.release(id, joined);
    };
    const onAbort = (): void => release();
    if (signal.aborted) {
      release();
      return Promise.reject(new RenderCanceledError());
    }
    signal.addEventListener("abort", onAbort, { once: true });
    return joined.promise.then((base) => {
      if (released) {
        throw new RenderCanceledError();
      }
      signal.removeEventListener("abort", onAbort);
      const stage = { ...base.stage, requestId, dispose: release };
      return { ...base, stage };
    }, (error: unknown) => {
      release();
      throw error;
    });
  }

  /** The inputs of renders changed behind the key (a file, a configuration): no more joins. */
  public invalidate(): void {
    for (const [id, entry] of [...this.entries]) {
      this.forget(id, entry);
    }
  }

  /** Takes the entry out of the map and gives up the window's hold. */
  private forget(id: string, entry: SharedEntry): void {
    if (entry.inMap && this.entries.get(id) === entry) {
      this.entries.delete(id);
    }
    entry.inMap = false;
    if (entry.windowTimer !== undefined) {
      clearTimeout(entry.windowTimer);
      entry.windowTimer = undefined;
      this.release(id, entry);
    }
  }

  private release(id: string, entry: SharedEntry): void {
    entry.holders -= 1;
    if (entry.holders > 0) return;
    if (this.entries.get(id) === entry) {
      this.entries.delete(id);
    }
    entry.inMap = false;
    if (entry.base) {
      entry.base.stage.dispose();
    } else {
      entry.controller.abort();
    }
  }
}
