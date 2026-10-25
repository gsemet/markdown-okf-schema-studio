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
  /** The inline editor the page has open (its edit id), known from its first message. */
  private pageEditorId: string | undefined;
  private readonly deferred = new Map<string, { work: () => void; discard?: () => void }>();

  public get isHeld(): boolean {
    return this.held;
  }

  /** True while the page has an inline block editor open (STAB-03), saved or not. */
  public get pageEditorOpen(): boolean {
    return this.pageEditorId !== undefined;
  }

  /** The edit id of the inline editor the page has open, if any. */
  public get pageEditor(): string | undefined {
    return this.pageEditorId;
  }

  /** The edit opened against the render `requestId`. */
  public acquire(requestId: number): void {
    this.held = true;
    this.heldRequestId = requestId;
  }

  /**
   * The page opened an inline editor (`previewEditOpen`). Until it closes, work that would change
   * the page's content waits, including a render that finishes now: an open editor keeps its text
   * and caret through saves, theme changes and diagram updates.
   */
  public openPageEditor(editId: string): void {
    this.pageEditorId = editId;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-191
  /**
   * The page closed the editor `editId` (any editor when omitted). Returns the queued work when
   * nothing else holds it any more.
   */
  public closePageEditor(editId?: string): Array<() => void> {
    if (this.pageEditorId === undefined || (editId !== undefined && editId !== this.pageEditorId)) {
      return [];
    }
    this.pageEditorId = undefined;
    return this.held ? [] : this.drain();
  }

  /**
   * The page moves on to another document: its editors were flushed and closed before the switch.
   * Forgets the page editor and discards the work queued for the old document (a deferred render
   * result frees its stage), so the new document's render reaches the page at once. The host's own
   * edit lock, if a final save is still being applied, is kept.
   */
  public forgetPage(): void {
    this.pageEditorId = undefined;
    const queued = [...this.deferred.values()];
    this.deferred.clear();
    queued.forEach((entry) => entry.discard?.());
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

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-193
  /** True while work that replaces the webview document or its content has to wait. */
  public shouldDeferReload(): boolean {
    return this.held || this.pageEditorId !== undefined;
  }

  /**
   * True while a finished render has to wait before it reaches the page: only an editor the page
   * reported open holds it (the host's own lock lets an explicit refresh through, as before).
   */
  public shouldDeferResult(): boolean {
    return this.pageEditorId !== undefined;
  }

  /**
   * Queues work under `key`; a later call with the same key replaces the earlier one, whose
   * `discard` then runs (a deferred render result frees its stage).
   */
  public defer(key: string, work: () => void, discard?: () => void): void {
    this.deferred.get(key)?.discard?.();
    this.deferred.set(key, { work, ...(discard ? { discard } : {}) });
  }

  /** Drops queued work that the caller performs itself. */
  public drop(key: string): void {
    this.deferred.get(key)?.discard?.();
    this.deferred.delete(key);
  }

  /**
   * The host's edit ended but the page keeps its editor open (an error it shows): the queued work
   * waits for the editor, unless the page has none.
   */
  public releaseHostEdit(): Array<() => void> {
    this.held = false;
    this.heldRequestId = undefined;
    return this.pageEditorId === undefined ? this.drain() : [];
  }

  /** Releases the lock and forgets the page editor; returns the queued work, to run now, in order. */
  public release(): Array<() => void> {
    this.held = false;
    this.heldRequestId = undefined;
    this.pageEditorId = undefined;
    return this.drain();
  }

  private drain(): Array<() => void> {
    const work = [...this.deferred.values()].map((entry) => entry.work);
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

/**
 * Whether a refresh of the open document has to render. Only a save of the active document may be
 * skipped, when its buffer is already the rendered one (PERF-06); a changed dependency (an
 * `{include}` target, an image...) never changes the document version and always re-renders.
 */
export function needsRefresh(state: {
  isDependencyChange: boolean;
  shownStatus: string | undefined;
  documentVersion: number | undefined;
  stageVersion: number | undefined;
}): boolean {
  if (state.isDependencyChange) {
    return true;
  }
  return !((state.shownStatus === "success" || state.shownStatus === "recovery")
    && state.stageVersion === state.documentVersion);
}
