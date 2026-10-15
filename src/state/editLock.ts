/**
 * Decisions around the inline block-edit lock of one preview (pure, no VS Code API).
 *
 * The inline editor lives only in the webview document. While the host holds an edit, a webview
 * document replacement destroys the editor without telling the host, so the lock must be released
 * when the page reports a newer render, and the work that would replace the page waits until the
 * edit is over.
 */

export class EditLock {
  private held = false;
  private heldRequestId: number | undefined;
  private readonly deferred = new Map<string, () => void>();

  public get isHeld(): boolean {
    return this.held;
  }

  /** The edit opened against the render `requestId`. */
  public acquire(requestId: number): void {
    this.held = true;
    this.heldRequestId = requestId;
  }

  /**
   * The page reported ready for the render `requestId`. A page for another render than the one the
   * edit opened on, or a page that reports no open editor (`blockEditOpen === false`), has no
   * inline editor: the lock is released. Returns the queued work if it was.
   */
  public onPreviewReady(requestId: number, blockEditOpen?: boolean): { released: boolean; flush: Array<() => void> } {
    if (!this.held || (requestId === this.heldRequestId && blockEditOpen !== false)) {
      return { released: false, flush: [] };
    }
    return { released: true, flush: this.release() };
  }

  /** True while work that replaces the webview document or its content has to wait. */
  public shouldDeferReload(): boolean {
    return this.held;
  }

  /** Queues work under `key`; a later call with the same key replaces the earlier one. */
  public defer(key: string, work: () => void): void {
    this.deferred.set(key, work);
  }

  /** Drops queued work that the caller performs itself. */
  public drop(key: string): void {
    this.deferred.delete(key);
  }

  /** Releases the lock; returns the queued work, to run now, in the order it was queued. */
  public release(): Array<() => void> {
    this.held = false;
    this.heldRequestId = undefined;
    const work = [...this.deferred.values()];
    this.deferred.clear();
    return work;
  }
}

/**
 * A save of the open active document needs no render when the buffer that was rendered is the one
 * on disk: the document version is the one of the rendered stage.
 */
export function isUnchangedSave(state: {
  isActiveDocument: boolean;
  documentVersion: number | undefined;
  stageVersion: number | undefined;
}): boolean {
  return state.isActiveDocument
    && state.documentVersion !== undefined
    && state.documentVersion === state.stageVersion;
}
