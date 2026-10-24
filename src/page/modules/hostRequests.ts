/**
 * Host round trips of the page: a registered message goes out with an edit id and the host answers
 * with `<type>Result` carrying the same id (the edit itself can move the document version, so the
 * context is not used to match). A request marked `dialog` stands for a native dialog the host
 * opens (a file picker): while one is open `isDialogOpen()` is true and the block editor must not
 * treat the focus loss as leaving; the image picker (T31) reuses this.
 */
export interface HostRequestOptions {
  /** Sends the registered message; the page adds the document context. */
  post(message: { type: string; editId: string; [field: string]: unknown }): void;
  nextEditId(): string;
}

export interface HostRequestSettings {
  /** The host shows a native dialog: the editor's blur handlers stand down until the answer. */
  dialog?: boolean;
  timeoutMs?: number;
}

export interface HostResult {
  type?: string;
  editId?: string;
  ok?: boolean;
  reason?: string;
  [field: string]: unknown;
}

export interface HostRequests {
  ask(type: string, payload: Record<string, unknown>, settings: HostRequestSettings, done: (result: HostResult) => void): void;
  /** Feeds a message from the host; true when it answered a pending request. */
  receive(message: HostResult): boolean;
  isDialogOpen(): boolean;
  /** Forgets every pending request without calling back (the editor was torn down). */
  cancelAll(): void;
}

export function installHostRequests(window: Window & typeof globalThis, options: HostRequestOptions): HostRequests {
  const listTimeoutMs = 6000;
  const dialogTimeoutMs = 600000;
  const pending = new Map<string, {
    resultType: string;
    dialog: boolean;
    timer: number;
    done: (result: HostResult) => void;
  }>();

  const settle = (editId: string, result: HostResult): void => {
    const entry = pending.get(editId);
    if (!entry) return;
    pending.delete(editId);
    window.clearTimeout(entry.timer);
    entry.done(result);
  };

  return {
    ask(type, payload, settings, done) {
      const editId = options.nextEditId();
      const dialog = settings.dialog === true;
      const timer = window.setTimeout(() => {
        settle(editId, { ok: false, reason: "The editor did not answer. Try again." });
      }, settings.timeoutMs ?? (dialog ? dialogTimeoutMs : listTimeoutMs));
      pending.set(editId, { resultType: type + "Result", dialog, timer, done });
      options.post({ ...payload, type, editId });
    },
    receive(message) {
      const editId = typeof message.editId === "string" ? message.editId : "";
      const entry = pending.get(editId);
      if (!entry || message.type !== entry.resultType) return false;
      settle(editId, message);
      return true;
    },
    isDialogOpen() {
      for (const entry of pending.values()) if (entry.dialog) return true;
      return false;
    },
    cancelAll() {
      for (const entry of pending.values()) window.clearTimeout(entry.timer);
      pending.clear();
    },
  };
}
