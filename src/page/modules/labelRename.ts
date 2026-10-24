/**
 * Edit mode: a click on a label's anchor icon opens a one-field popover to rename the label.
 * Self-contained: it is injected into the page script with `.toString()`, so it must not use
 * anything defined outside its own body. The host re-checks everything it is sent.
 */
export interface LabelRenameOptions {
  isEditMode(): boolean;
  /** Why a rename cannot start now (an open editor), or undefined. */
  blockedReason(): string | undefined;
  /** Sends the registered message; the page adds the document context and the edit id. */
  post(message: { line: number; oldName: string; newName: string }, editId: string): void;
  nextEditId(): string;
}

export function installLabelRename(
  document: Document,
  window: Window & typeof globalThis,
  options: LabelRenameOptions,
): { close(): void; receive(message: { type?: string; editId?: string; ok?: boolean; remainingRefs?: number; reason?: string }): boolean } {
  const namePattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u;
  const maxLength = 100;
  const answerTimeoutMs = 6000;
  const doneCloseMs = 5000;
  const invalidText = "Use letters, digits and _ . : - only, starting with a letter or digit (100 characters at most).";
  let popover: HTMLElement | undefined;
  let input: HTMLInputElement | undefined;
  let status: HTMLElement | undefined;
  let pending: { editId: string; oldName: string; timer: number } | undefined;
  let closeTimer: number | undefined;

  const clearTimers = (): void => {
    if (closeTimer !== undefined) window.clearTimeout(closeTimer);
    closeTimer = undefined;
    if (pending) window.clearTimeout(pending.timer);
    pending = undefined;
  };
  const close = (): void => {
    clearTimers();
    popover?.remove();
    popover = undefined;
    input = undefined;
    status = undefined;
  };
  const say = (text: string): void => {
    if (!status) return;
    status.textContent = text;
    status.setAttribute("data-visible", text ? "true" : "false");
  };
  const uses = (count: number): string => count === 1 ? "1 use" : `${count} uses`;

  const place = (anchor: Element): void => {
    if (!popover) return;
    const bounds = anchor.getBoundingClientRect();
    popover.style.setProperty("top", `${Math.round(bounds.bottom + 6)}px`);
    popover.style.setProperty("left", `${Math.round(Math.max(8, bounds.left))}px`);
  };

  const submit = (line: number, oldName: string): void => {
    if (!input || pending) return;
    const newName = input.value.trim();
    if (newName === oldName) {
      close();
      return;
    }
    if (newName.length > maxLength || !namePattern.test(newName)) {
      say(invalidText);
      return;
    }
    const editId = options.nextEditId();
    input.disabled = true;
    say("Renaming...");
    pending = {
      editId,
      oldName,
      timer: window.setTimeout(() => {
        pending = undefined;
        if (input) input.disabled = false;
        say("The editor did not answer. Try again.");
      }, answerTimeoutMs),
    };
    options.post({ line, oldName, newName }, editId);
  };

  const open = (anchor: Element, line: number, name: string): void => {
    close();
    const box = document.createElement("div");
    box.setAttribute("data-okf-label-rename", "");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Rename label");
    const field = document.createElement("input");
    field.setAttribute("type", "text");
    field.setAttribute("aria-label", "Label name");
    field.setAttribute("maxlength", String(maxLength));
    field.setAttribute("spellcheck", "false");
    field.value = name;
    const message = document.createElement("div");
    message.setAttribute("role", "status");
    message.setAttribute("data-okf-label-rename-status", "");
    message.setAttribute("data-visible", "false");
    box.appendChild(field);
    box.appendChild(message);
    document.body.appendChild(box);
    popover = box;
    input = field;
    status = message;
    place(anchor);
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit(line, name);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    });
    field.addEventListener("input", () => {
      if (!pending) say("");
    });
    field.focus();
    field.select();
  };

  // Capture phase: this runs before the click handlers of the mapped blocks, which would open the
  // block editor. Outside edit mode the icon stays a plain link target.
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : undefined;
    const anchor = target?.closest(".okf-anchor");
    if (!anchor) return;
    if (!options.isEditMode()) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const name = anchor.getAttribute("data-okf-label") ?? "";
    const line = Number(anchor.getAttribute("data-okf-label-line"));
    if (!namePattern.test(name) || !Number.isSafeInteger(line) || line < 1) return;
    const reason = options.blockedReason();
    if (reason) {
      open(anchor, line, name);
      say(reason);
      if (input) input.disabled = true;
      return;
    }
    open(anchor, line, name);
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (!popover) return;
    const target = event.target instanceof Element ? event.target : undefined;
    if (target && (popover.contains(target) || target.closest(".okf-anchor"))) return;
    close();
  });

  return {
    close,
    receive(message) {
      if (message.type !== "previewLabelRenameResult" || !pending || message.editId !== pending.editId) {
        return false;
      }
      const { oldName } = pending;
      clearTimers();
      if (input) input.disabled = false;
      if (message.ok === true) {
        const remaining = Number.isSafeInteger(message.remainingRefs) ? Number(message.remainingRefs) : 0;
        say(remaining > 0
          ? `Renamed. ${uses(remaining)} of "${oldName}" remain in this document.`
          : "Renamed. No use of the old name remains.");
        if (input) input.disabled = true;
        closeTimer = window.setTimeout(close, doneCloseMs);
      } else {
        say(typeof message.reason === "string" && message.reason ? message.reason : "The label could not be renamed.");
      }
      return true;
    },
  };
}
