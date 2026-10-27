/**
 * The render worker: the {@link PreviewRenderer} port on Node's `worker_threads`. The source render
 * of a preview (MyST to HTML, `renderPreviewSource`) runs in a worker thread, strings in and
 * strings out, so a long render never blocks the extension host, and an aborted render stops at
 * once: its worker is terminated and the next render gets a fresh one. A thread gets a render only
 * once it is ready; a render aborted before that never stops the starting thread.
 *
 * The same file is the worker's entry: the esbuild bundle emits it as `out/bundle/renderWorker.js`
 * next to `extension.js`, and the compiled tests load `out/src/node-services/renderWorker.js`.
 * When a worker cannot start (the file is missing, the thread fails before it is ready), the
 * renderer falls back to the in-process render for good. A worker that dies during a render
 * fails that render (rendering the same input on the host could take the host down with it); after
 * three such deaths in a row the renderer falls back as well.
 */

import * as path from "node:path";
import { isMainThread, parentPort, threadId, Worker, workerData } from "node:worker_threads";

import {
  RenderCanceledError,
  renderPreviewSource,
  type SourceRenderer,
  type SourceRenderInput,
  type SourceRenderOutput,
} from "../core/render/renderPipeline";
import { preloadMystEngine } from "../core/render/mystEngine";
import type { PreviewRenderer } from "../host-api/previewRenderer";

/** Marks the threads this module starts (`workerData.role`). */
const WORKER_ROLE = "markdown-okf-schema-studio.render-worker";
/**
 * Workers rendering at the same time; more renders wait for a free one. One: a second thread would
 * start cold (thread and engine load) and cost more than waiting for the warm one.
 */
const DEFAULT_MAX_WORKERS = 1;
/** An idle worker is stopped after this long (ms). */
const DEFAULT_IDLE_MS = 300_000;
/** Deaths during a render, in a row, after which the renderer stays in-process. */
const MAX_CONSECUTIVE_CRASHES = 3;

type ToWorker = { type: "render"; id: number; input: SourceRenderInput };
type FromWorker =
  | { type: "ready" }
  | { type: "done"; id: number; output: SourceRenderOutput; threadId: number }
  | { type: "failed"; id: number; message: string };

// ----- worker side -----

function serveRenders(): void {
  const port = parentPort;
  if (!port) return;
  port.on("message", (message: ToWorker) => {
    if (message?.type !== "render") return;
    renderPreviewSource(message.input).then(
      (output) => port.postMessage({ type: "done", id: message.id, output, threadId } satisfies FromWorker),
      (error: unknown) => port.postMessage({
        type: "failed",
        id: message.id,
        message: error instanceof Error ? error.message : String(error),
      } satisfies FromWorker),
    );
  });
  // Load the engine while the thread waits for its first render.
  preloadMystEngine();
  port.postMessage({ type: "ready" } satisfies FromWorker);
}

if (!isMainThread && (workerData as { role?: unknown } | null)?.role === WORKER_ROLE) {
  serveRenders();
}

// ----- host side -----

let workersEnabled = true;

/**
 * Test hook: `false` makes every renderer render in-process, for the unit harnesses that drive the
 * extension host on a mocked clock and expect a render to end within a few event-loop turns.
 */
export function setRenderWorkersEnabledForTests(enabled: boolean): void {
  workersEnabled = enabled;
}

/** Options of {@link createWorkerRenderer}; the defaults suit the extension. */
export interface WorkerRendererOptions {
  /** The worker's script; default: `renderWorker.js` next to this module. */
  scriptPath?: string;
  maxWorkers?: number;
  idleMs?: number;
  /** The render used when no worker can run; default: `renderPreviewSource`. */
  fallback?: SourceRenderer;
}

/** What the renderer did so far (for tests and diagnostics). */
export interface WorkerRendererStats {
  /** Workers started. */
  started: number;
  /** Workers stopped because their render was aborted. */
  aborted: number;
  /** Renders a worker finished. */
  workerRenders: number;
  /** Renders made in-process because no worker could run. */
  fallbackRenders: number;
  /** The thread id of the worker that made the last worker render. */
  lastThreadId?: number;
  /** Why the renderer stays in-process, once it does. */
  disabledReason?: string;
}

/** A {@link PreviewRenderer} with its counters. */
export interface WorkerRenderer extends PreviewRenderer {
  stats(): WorkerRendererStats;
}

interface Job {
  id: number;
  input: SourceRenderInput;
  resolve: (output: SourceRenderOutput) => void;
  reject: (error: unknown) => void;
  detach: () => void;
  /** Sent to the thread: only a ready thread gets a render, so an abort before that keeps it. */
  posted: boolean;
}

interface Handle {
  worker: Worker;
  ready: boolean;
  /** Stopped on purpose (abort, idle, dispose): its exit is not a failure. */
  stopping: boolean;
  job?: Job;
  idleTimer?: NodeJS.Timeout;
}

interface Waiter {
  start: () => void;
  cancel: () => void;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-004
/** Creates the worker-thread renderer. Workers start on the first render, not before. */
export function createWorkerRenderer(options: WorkerRendererOptions = {}): WorkerRenderer {
  const scriptPath = options.scriptPath ?? path.join(__dirname, "renderWorker.js");
  const maxWorkers = Math.max(1, options.maxWorkers ?? DEFAULT_MAX_WORKERS);
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
  const fallback = options.fallback ?? renderPreviewSource;
  const handles = new Set<Handle>();
  const waiters: Waiter[] = [];
  const stats: WorkerRendererStats = { started: 0, aborted: 0, workerRenders: 0, fallbackRenders: 0 };
  let nextId = 1;
  let crashes = 0;
  let disposed = false;

  const renderInProcess = (input: SourceRenderInput): Promise<SourceRenderOutput> => {
    stats.fallbackRenders += 1;
    return fallback(input);
  };

  const stop = (handle: Handle): void => {
    handle.stopping = true;
    if (handle.idleTimer) clearTimeout(handle.idleTimer);
    handles.delete(handle);
    void handle.worker.terminate().catch(() => undefined);
  };

  const disable = (reason: string): void => {
    stats.disabledReason ??= reason;
    for (const handle of [...handles]) {
      if (!handle.job) stop(handle);
    }
    // The renders waiting for a worker run in-process now.
    for (const waiter of waiters.splice(0)) waiter.start();
  };

  const release = (handle: Handle): void => {
    handle.job = undefined;
    const waiter = waiters.shift();
    if (waiter) {
      waiter.start();
      return;
    }
    // At most one idle worker stays, and only for `idleMs`.
    const idle = [...handles].filter((other) => other !== handle && !other.job);
    if (idle.length > 0 || disposed || stats.disabledReason) {
      stop(handle);
      return;
    }
    handle.worker.unref();
    handle.idleTimer = setTimeout(() => stop(handle), idleMs);
    handle.idleTimer.unref();
  };

  const spawn = (): Handle | undefined => {
    let worker: Worker;
    try {
      worker = new Worker(scriptPath, { workerData: { role: WORKER_ROLE } });
    } catch (error) {
      disable(`the render worker could not start: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
    stats.started += 1;
    const handle: Handle = { worker, ready: false, stopping: false };
    handles.add(handle);
    const failed = (reason: string): void => {
      if (handle.stopping) return;
      handle.stopping = true;
      handles.delete(handle);
      const job = handle.job;
      handle.job = undefined;
      if (!handle.ready) {
        // The thread never came up: no worker will, render in-process from now on.
        disable(`the render worker could not start: ${reason}`);
        if (job) {
          job.detach();
          renderInProcess(job.input).then(job.resolve, job.reject);
        }
        return;
      }
      if (job) {
        job.detach();
        crashes += 1;
        if (crashes >= MAX_CONSECUTIVE_CRASHES) disable(`the render worker stopped ${crashes} times in a row: ${reason}`);
        job.reject(new Error(`The render worker stopped during the render: ${reason}`));
      }
      void worker.terminate().catch(() => undefined);
      const waiter = waiters.shift();
      waiter?.start();
    };
    worker.on("message", (message: FromWorker) => {
      if (message.type === "ready") {
        handle.ready = true;
        if (handle.job) post(handle, handle.job);
        return;
      }
      const job = handle.job;
      if (!job || job.id !== message.id) return;
      job.detach();
      if (message.type === "done") {
        crashes = 0;
        stats.workerRenders += 1;
        stats.lastThreadId = message.threadId;
        release(handle);
        job.resolve(message.output);
      } else {
        release(handle);
        job.reject(new Error(message.message));
      }
    });
    worker.on("error", (error) => failed(error instanceof Error ? error.message : String(error)));
    worker.on("exit", (code) => failed(`exit code ${code}`));
    return handle;
  };

  const post = (handle: Handle, job: Job): void => {
    job.posted = true;
    handle.worker.postMessage({ type: "render", id: job.id, input: job.input } satisfies ToWorker);
  };

  const run = (handle: Handle, input: SourceRenderInput, signal: AbortSignal | undefined): Promise<SourceRenderOutput> =>
    new Promise((resolve, reject) => {
      if (handle.idleTimer) {
        clearTimeout(handle.idleTimer);
        handle.idleTimer = undefined;
      }
      handle.worker.ref();
      const onAbort = (): void => {
        if (handle.job !== job) return;
        handle.job = undefined;
        job.detach();
        reject(new RenderCanceledError());
        if (!job.posted) {
          // The thread is still starting and never got this render: keep it for the next one.
          // Stopping it would only start another cold thread.
          release(handle);
          return;
        }
        // The render is stale: stop its thread now instead of waiting for a result nobody shows.
        stats.aborted += 1;
        stop(handle);
        const waiter = waiters.shift();
        if (waiter) {
          waiter.start();
        } else if (!disposed && !stats.disabledReason && handles.size < maxWorkers) {
          // A newer render usually follows an abort: start its thread (and engine) now.
          const spare = spawn();
          if (spare) release(spare);
        }
      };
      const job: Job = {
        id: nextId++,
        input,
        resolve,
        reject,
        detach: () => signal?.removeEventListener("abort", onAbort),
        posted: false,
      };
      handle.job = job;
      signal?.addEventListener("abort", onAbort, { once: true });
      if (handle.ready) post(handle, job);
    });

  const acquire = (): Handle | undefined => {
    const idle = [...handles].find((handle) => !handle.job);
    if (idle) return idle;
    return handles.size < maxWorkers ? spawn() : undefined;
  };

  const render: SourceRenderer = (input, signal) => {
    if (signal?.aborted) return Promise.reject(new RenderCanceledError());
    if (disposed || stats.disabledReason || !workersEnabled) return renderInProcess(input);
    const handle = acquire();
    if (handle) return run(handle, input, signal);
    if (stats.disabledReason) return renderInProcess(input);
    // Every worker is busy: wait for one, unless the render is given up first.
    return new Promise((resolve, reject) => {
      const onAbort = (): void => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new RenderCanceledError());
      };
      const waiter: Waiter = {
        start: () => {
          signal?.removeEventListener("abort", onAbort);
          render(input, signal).then(resolve, reject);
        },
        cancel: () => {
          signal?.removeEventListener("abort", onAbort);
          reject(new RenderCanceledError());
        },
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      waiters.push(waiter);
    });
  };

  return {
    render,
    warm: () => {
      if (disposed || stats.disabledReason || !workersEnabled || handles.size > 0) return;
      const handle = spawn();
      if (handle) release(handle);
    },
    stats: () => ({ ...stats }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const waiter of waiters.splice(0)) waiter.cancel();
      for (const handle of [...handles]) {
        const job = handle.job;
        handle.job = undefined;
        stop(handle);
        if (job) {
          job.detach();
          job.reject(new RenderCanceledError());
        }
      }
    },
  };
}
