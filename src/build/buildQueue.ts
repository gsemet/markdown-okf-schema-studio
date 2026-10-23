import * as fs from "node:fs";
import * as path from "node:path";

export interface QueueDocument {
  uri: { fsPath: string };
  version?: number;
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
  debounceMs?: number;
  build: (request: BuildRequest<TDocument>, signal: AbortSignal) => Promise<TResult>;
  onState?: (state: BuildQueueState<TResult, TDocument>) => void;
  disposeResult?: (result: TResult) => void;
  disposeError?: (error: unknown) => void;
  /**
   * The revision of a document, as the host's document store gives it; a request records it as
   * `documentVersion`. Defaults to `document.version`.
   */
  revisionOf?: (document: TDocument) => number;
}

interface PendingBuild<TDocument extends QueueDocument, TResult> {
  request: BuildRequest<TDocument>;
  resolve: (outcome: BuildQueueOutcome<TResult, TDocument>) => void;
}

interface ActiveBuild<TDocument extends QueueDocument, TResult>
  extends PendingBuild<TDocument, TResult> {
  controller: AbortController;
}

function documentVersion(document: QueueDocument): number {
  return document.version ?? 0;
}

function canonicalPath(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

export class BuildQueue<TDocument extends QueueDocument, TResult> {
  private readonly debounceMs: number;
  private readonly build: BuildQueueOptions<TDocument, TResult>["build"];
  private readonly onState: NonNullable<BuildQueueOptions<TDocument, TResult>["onState"]>;
  private readonly disposeResult: NonNullable<BuildQueueOptions<TDocument, TResult>["disposeResult"]>;
  private readonly disposeError: NonNullable<BuildQueueOptions<TDocument, TResult>["disposeError"]>;
  private readonly revisionOf: (document: TDocument) => number;
  private requestCounter = 0;
  private latestRequestId = 0;
  private timer: NodeJS.Timeout | undefined;
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
    this.build = options.build;
    this.onState = options.onState ?? (() => undefined);
    this.disposeResult = options.disposeResult ?? (() => undefined);
    this.disposeError = options.disposeError ?? (() => undefined);
    this.revisionOf = options.revisionOf ?? documentVersion;
  }

  public getState(): BuildQueueState<TResult, TDocument> {
    return this.state;
  }

  public dependsOn(filePath: string): boolean {
    const result = this.lastGood;
    if (!result || typeof result !== "object" || result === null || !("stage" in result)) {
      return false;
    }
    const stage = (result as { stage?: { dependencies?: readonly string[] } }).stage;
    const candidate = canonicalPath(filePath);
    return stage?.dependencies?.some((dependency) => canonicalPath(dependency) === candidate) ?? false;
  }

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

    // Edits coalesce into the pending slot; an in-flight render is left alone so the
    // preview keeps refreshing at build cadence instead of restarting on every keystroke.
    this.supersedePending();
    return new Promise((resolve) => {
      this.pending = { request, resolve };
      this.publish({
        phase: "debouncing",
        request,
        lastGood: this.lastGood,
        stale: this.lastGood !== undefined,
      });
      this.timer = setTimeout(() => this.startPending(), this.debounceMs);
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
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private startPending(): void {
    this.timer = undefined;
    if (this.disposed || !this.pending || this.active) {
      return;
    }
    const pending = this.pending;
    this.pending = undefined;
    const active: ActiveBuild<TDocument, TResult> = {
      ...pending,
      controller: new AbortController(),
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
