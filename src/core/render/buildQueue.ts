/**
 * The render queue of a preview: debounces requests, runs one build at a time, cancels a build a
 * newer request supersedes and keeps the last good result. Host-neutral (timers only): the paths
 * it compares are canonicalised by the `canonicalize` function the host gives it.
 */

/** A document the queue builds: its text; the queue reads its revision through `revisionOf`. */
export interface QueueDocument {
  getText(): string;
}

export interface BuildRequest<TDocument extends QueueDocument> {
  requestId: number;
  documentVersion: number;
  document: TDocument;
}

export type BuildPhase =
  | "idle"
  | "debouncing"
  | "building"
  | "ready"
  | "failed"
  | "canceled";

export interface BuildQueueState<TResult, TDocument extends QueueDocument> {
  phase: BuildPhase;
  request?: BuildRequest<TDocument>;
  result?: TResult;
  lastGood?: TResult;
  error?: unknown;
  stale: boolean;
}

export interface BuildQueueOutcome<TResult, TDocument extends QueueDocument> {
  status: "ready" | "failed" | "superseded" | "canceled";
  request: BuildRequest<TDocument>;
  result?: TResult;
  error?: unknown;
  lastGood?: TResult;
}

export interface BuildQueueOptions<
  TDocument extends QueueDocument,
  TResult,
> {
  /**
   * The shortest wait after the last request before its build starts. The wait adapts to the
   * builds: twice the duration of the last build, at least `debounceMs`, at most `maxDebounceMs`.
   */
  debounceMs?: number;
  /** The longest adaptive wait (ms); default 1000. */
  maxDebounceMs?: number;
  /**
   * The duration of a finished build as the result reports it (ms), for the adaptive wait;
   * undefined keeps the previous estimate. Omitted: the time from the start of the build to its end.
   */
  durationOf?: (result: TResult) => number | undefined;
  build: (request: BuildRequest<TDocument>, signal: AbortSignal) => Promise<TResult>;
  onState?: (state: BuildQueueState<TResult, TDocument>) => void;
  disposeResult?: (result: TResult) => void;
  disposeError?: (error: unknown) => void;
  /**
   * The revision of a document, as the host's document store gives it; a request records it as
   * `documentVersion`.
   */
  revisionOf: (document: TDocument) => number;
  /**
   * The canonical form of a path (symbolic links resolved), as the host gives it; used to compare
   * a changed file with the dependencies of the last good build. Omitted: the path as it is.
   */
  canonicalize?: (filePath: string) => string;
}

interface PendingBuild<TDocument extends QueueDocument, TResult> {
  request: BuildRequest<TDocument>;
  resolve: (outcome: BuildQueueOutcome<TResult, TDocument>) => void;
}

interface ActiveBuild<TDocument extends QueueDocument, TResult>
  extends PendingBuild<TDocument, TResult> {
  controller: AbortController;
  /** `Date.now()` when the build started. */
  startedAt: number;
}

/**
 * Builds faster than this (ms) leave the wait at `debounceMs`: twice their time is below any useful
 * debounce, and a millisecond clock cannot measure them.
 */
const MIN_ADAPTIVE_BUILD_MS = 10;

export class BuildQueue<TDocument extends QueueDocument, TResult> {
  private readonly debounceMs: number;
  private readonly maxDebounceMs: number;
  private readonly durationOf: ((result: TResult) => number | undefined) | undefined;
  private readonly build: BuildQueueOptions<TDocument, TResult>["build"];
  private readonly onState: NonNullable<BuildQueueOptions<TDocument, TResult>["onState"]>;
  private readonly disposeResult: NonNullable<BuildQueueOptions<TDocument, TResult>["disposeResult"]>;
  private readonly disposeError: NonNullable<BuildQueueOptions<TDocument, TResult>["disposeError"]>;
  private readonly revisionOf: (document: TDocument) => number;
  private readonly canonicalize: (filePath: string) => string;
  private requestCounter = 0;
  private latestRequestId = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Re-checks a running build for an overrun while a newer request waits for it. */
  private overrunTimer: ReturnType<typeof setTimeout> | undefined;
  /**
   * How long the last build took (ms) as `durationOf` reports it, or at least how long an aborted
   * one had run: drives the adaptive wait.
   */
  private lastBuildMs: number | undefined;
  /**
   * The wall-clock time of the last completed build (ms), or at least how long an aborted one had
   * run: drives the overrun limit, which it is compared with.
   */
  private lastWallMs: number | undefined;
  private pending: PendingBuild<TDocument, TResult> | undefined;
  private active: ActiveBuild<TDocument, TResult> | undefined;
  private lastGood: TResult | undefined;
  private disposed = false;
  private state: BuildQueueState<TResult, TDocument> = {
    phase: "idle",
    stale: false,
  };

  public constructor(options: BuildQueueOptions<TDocument, TResult>) {
    this.debounceMs = options.debounceMs ?? 120;
    this.maxDebounceMs = Math.max(this.debounceMs, options.maxDebounceMs ?? 1000);
    this.durationOf = options.durationOf;
    this.build = options.build;
    this.onState = options.onState ?? (() => undefined);
    this.disposeResult = options.disposeResult ?? (() => undefined);
    this.disposeError = options.disposeError ?? (() => undefined);
    this.revisionOf = options.revisionOf;
    this.canonicalize = options.canonicalize ?? ((filePath) => filePath);
  }

  private dependencyCache: { source: readonly string[]; canonical: ReadonlySet<string> } | undefined;

  public getState(): BuildQueueState<TResult, TDocument> {
    return this.state;
  }

  /** Whether the last good stage depends on `filePath`; `canonical` is its canonical form when the caller has it (no file system call). */
  public dependsOn(filePath: string, canonical?: string): boolean {
    const result = this.lastGood;
    if (!result || typeof result !== "object" || result === null || !("stage" in result)) {
      return false;
    }
    const stage = (result as { stage?: { dependencies?: readonly string[] } }).stage;
    const dependencies = stage?.dependencies;
    if (!dependencies) {
      return false;
    }
    return this.canonicalDependencies(dependencies).has(canonical ?? this.canonicalize(filePath));
  }

  /**
   * The canonical form of the dependencies of the last good stage, computed once per stage (one
   * one canonicalisation per dependency, not per query).
   */
  private canonicalDependencies(dependencies: readonly string[]): ReadonlySet<string> {
    if (this.dependencyCache?.source !== dependencies) {
      this.dependencyCache = { source: dependencies, canonical: new Set(dependencies.map((dependency) => this.canonicalize(dependency))) };
    }
    return this.dependencyCache.canonical;
  }

  /**
   * The wait before a requested build starts: `debounceMs` until a build finished, then twice the
   * last build's duration within `[debounceMs, maxDebounceMs]` (builds under 10 ms do not count), so a slow document is not rebuilt
   * on every short pause in typing.
   */
  public currentDebounceMs(): number {
    if (this.lastBuildMs === undefined || this.lastBuildMs < MIN_ADAPTIVE_BUILD_MS) return this.debounceMs;
    return Math.min(this.maxDebounceMs, Math.max(this.debounceMs, Math.round(2 * this.lastBuildMs)));
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-039
  public request(document: TDocument): Promise<BuildQueueOutcome<TResult, TDocument>> {
    const request: BuildRequest<TDocument> = {
      requestId: ++this.requestCounter,
      documentVersion: this.revisionOf(document),
      document,
    };
    this.latestRequestId = request.requestId;

    if (this.disposed) {
      return Promise.resolve({ status: "canceled", request });
    }

    // Edits coalesce into the pending slot; an in-flight render is left alone so the preview keeps
    // refreshing at build cadence, unless it overruns (see `startPending`).
    this.supersedePending();
    return new Promise((resolve) => {
      this.pending = { request, resolve };
      this.publish({
        phase: "debouncing",
        request,
        lastGood: this.lastGood,
        stale: this.lastGood !== undefined,
      });
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.startPending();
      }, this.currentDebounceMs());
    });
  }

  public refresh(document: TDocument): Promise<BuildQueueOutcome<TResult, TDocument>> {
    return this.request(document);
  }

  public cancel(): void {
    if (this.disposed) {
      return;
    }
    const canceledRequest = this.active?.request ?? this.pending?.request;
    this.latestRequestId = this.requestCounter + 1;
    this.clearOverrunTimer();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.pending) {
      this.settle(this.pending, { status: "canceled", request: this.pending.request });
      this.pending = undefined;
    }
    if (this.active) {
      const active = this.active;
      active.controller.abort();
      this.settle(active, { status: "canceled", request: active.request, lastGood: this.lastGood });
      this.active = undefined;
    }
    this.publish({
      phase: "canceled",
      ...(canceledRequest ? { request: canceledRequest } : {}),
      lastGood: this.lastGood,
      stale: this.lastGood !== undefined,
    });
  }

  public clearLastGood(): void {
    if (this.disposed) {
      return;
    }
    if (this.lastGood) {
      this.disposeResult(this.lastGood);
      this.lastGood = undefined;
    }
    this.publish({ phase: "idle", stale: false });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearOverrunTimer();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.pending) {
      this.settle(this.pending, { status: "canceled", request: this.pending.request });
      this.pending = undefined;
    }
    if (this.active) {
      const active = this.active;
      active.controller.abort();
      this.settle(active, { status: "canceled", request: active.request });
      this.active = undefined;
    }
    if (this.lastGood) {
      this.disposeResult(this.lastGood);
      this.lastGood = undefined;
    }
    this.publish({ phase: "canceled", stale: false });
  }

  private publish(state: BuildQueueState<TResult, TDocument>): void {
    this.state = state;
    this.onState(state);
  }

  private supersedePending(): void {
    if (!this.pending) {
      return;
    }
    this.settle(this.pending, { status: "superseded", request: this.pending.request });
    this.pending = undefined;
    this.clearOverrunTimer();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private clearOverrunTimer(): void {
    if (this.overrunTimer) {
      clearTimeout(this.overrunTimer);
      this.overrunTimer = undefined;
    }
  }

  /**
   * How long a build may run, once a build completed, before a newer request stops it: twice the
   * wall-clock time of the last build, and never less than `maxDebounceMs`. The floor covers what a
   * restart costs (a fresh render thread loads its engine first), so the builds of a small document
   * are never aborted.
   */
  private overrunMs(): number | undefined {
    return this.lastWallMs === undefined ? undefined : Math.max(this.maxDebounceMs, 2 * this.lastWallMs);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-039
  /**
   * Starts the pending request once its wait elapsed. A running build is left to finish (its
   * result is still worth showing), unless it overruns: it has run more than twice the wall-clock
   * time of the last build, and at least `maxDebounceMs`. Its result is then too late to matter, so it is aborted and the newest request starts.
   * Before any build finished there is no build time to compare with (the first build also loads
   * the engine), so the first build always finishes.
   */
  private startPending(): void {
    if (this.disposed || !this.pending) {
      return;
    }
    if (this.active) {
      const overrunMs = this.overrunMs();
      if (overrunMs === undefined) return;
      const elapsed = Date.now() - this.active.startedAt;
      if (elapsed < overrunMs) {
        this.clearOverrunTimer();
        this.overrunTimer = setTimeout(() => {
          this.overrunTimer = undefined;
          if (!this.timer) this.startPending();
        }, overrunMs - elapsed);
        return;
      }
      this.abortOverrun(this.active, elapsed);
    }
    this.clearOverrunTimer();
    const pending = this.pending;
    this.pending = undefined;
    const active: ActiveBuild<TDocument, TResult> = {
      ...pending,
      controller: new AbortController(),
      startedAt: Date.now(),
    };
    this.active = active;
    this.publish({
      phase: "building",
      request: active.request,
      lastGood: this.lastGood,
      stale: this.lastGood !== undefined,
    });
    void this.run(active);
  }

  /** Stops an overrunning build; the time it ran is a lower bound of the next build time. */
  private abortOverrun(active: ActiveBuild<TDocument, TResult>, elapsed: number): void {
    this.lastBuildMs = Math.max(this.lastBuildMs ?? 0, elapsed);
    this.lastWallMs = Math.max(this.lastWallMs ?? 0, elapsed);
    this.active = undefined;
    active.controller.abort();
    this.settle(active, { status: "superseded", request: active.request, lastGood: this.lastGood });
  }

  private isCurrent(): boolean {
    return !this.disposed;
  }

  // A queued request whose debounce already elapsed starts as soon as the slot frees up.
  private drainPending(): void {
    if (!this.timer) {
      this.startPending();
    }
  }

  private async run(active: ActiveBuild<TDocument, TResult>): Promise<void> {
    try {
      const result = await this.build(active.request, active.controller.signal);
      if (!this.isCurrent() || this.active !== active) {
        this.disposeResult(result);
        if (this.active === active) {
          this.active = undefined;
          this.publish({
            phase: "canceled",
            request: active.request,
            lastGood: this.lastGood,
            stale: this.lastGood !== undefined,
          });
          this.settle(active, {
            status: "superseded",
            request: active.request,
            lastGood: this.lastGood,
          });
        }
        return;
      }
      const previous = this.lastGood;
      this.lastGood = result;
      this.active = undefined;
      const wallMs = Date.now() - active.startedAt;
      this.lastWallMs = wallMs;
      this.lastBuildMs = this.durationOf ? this.durationOf(result) ?? this.lastBuildMs : wallMs;
      this.clearOverrunTimer();
      this.publish({
        phase: "ready",
        request: active.request,
        result,
        lastGood: result,
        stale: false,
      });
      if (previous && previous !== result) {
        this.disposeResult(previous);
      }
      this.settle(active, { status: "ready", request: active.request, result });
      this.drainPending();
    } catch (error) {
      if (this.active !== active) {
        this.disposeError(error);
        return;
      }
      this.active = undefined;
      this.clearOverrunTimer();
      if (!this.isCurrent()) {
        this.disposeError(error);
        this.publish({
          phase: "canceled",
          request: active.request,
          lastGood: this.lastGood,
          stale: this.lastGood !== undefined,
        });
        this.settle(active, {
          status: "superseded",
          request: active.request,
          lastGood: this.lastGood,
        });
        return;
      }
      if (active.controller.signal.aborted) {
        this.publish({
          phase: "canceled",
          request: active.request,
          lastGood: this.lastGood,
          stale: this.lastGood !== undefined,
        });
        this.settle(active, { status: "canceled", request: active.request, lastGood: this.lastGood });
        return;
      }
      this.publish({
        phase: "failed",
        request: active.request,
        error,
        lastGood: this.lastGood,
        stale: this.lastGood !== undefined,
      });
      this.settle(active, {
        status: "failed",
        request: active.request,
        error,
        lastGood: this.lastGood,
      });
      this.drainPending();
    }
  }

  private settle(
    pending: PendingBuild<TDocument, TResult>,
    outcome: BuildQueueOutcome<TResult, TDocument>,
  ): void {
    pending.resolve(outcome);
  }
}
