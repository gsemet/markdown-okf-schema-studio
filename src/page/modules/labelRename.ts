/**
 * Edit mode: a click on a label's anchor icon opens a one-field popover to rename the label.
 * The host re-checks everything it is sent.
 */
import { LABEL_NAME } from "../../core/mapping/labelRename";

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
  const namePattern = LABEL_NAME;
  const maxLength = 100;
  const answerTimeoutMs = 6000;
  const doneCloseMs = 5000;
  const invalidText = "Use letters, digits and _ . : - only (100 characters at most).";
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

  const gap = 6;
  const edgeInset = 8;
  /**
   * The top obstruction of the pane over the horizontal span [left, right]: the bottom of the preview
   * toolbar when it overlaps that span (it floats at the top right, so a field at the left clears it),
   * else the viewport edge.
   */
  const topInset = (left: number, right: number): number => {
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]")?.getBoundingClientRect();
    const covers = toolbar !== undefined && toolbar.bottom > 0 && toolbar.left < right && toolbar.right > left;
    return Math.max(edgeInset, covers ? toolbar.bottom + edgeInset : 0);
  };
  // @implements_req SwRS-MDOKFSTUDIO-MYST-038
  // Under the icon, except for an icon in an `.okf-anchor-row` (no paragraph or heading holds it:
  // a table, a code block, a figure): the block it labels starts right below the icon, so the field
  // opens above it, anchored by its bottom edge so that the status line grows away from the block.
  // It goes above only when it fits between the icon and the top obstruction, after scrolling the
  // page up by the missing height when the page can; otherwise it opens under the icon.
  const place = (anchor: Element): void => {
    if (!popover) return;
    let bounds = anchor.getBoundingClientRect();
    popover.style.setProperty("left", `${Math.round(Math.max(8, bounds.left))}px`);
    if (anchor.closest(".okf-anchor-row")) {
      const box = popover.getBoundingClientRect();
      const height = box.height;
      const left = Math.max(8, bounds.left);
      const inset = (): number => topInset(left, left + (box.right - box.left));
      const missing = height - (bounds.top - gap - inset());
      if (missing > 0 && window.scrollY >= missing) {
        window.scrollBy(0, -missing);
        bounds = anchor.getBoundingClientRect();
      }
      if (bounds.top - gap - inset() >= height) {
        popover.setAttribute("data-okf-label-rename-side", "above");
        popover.style.setProperty("bottom", `${Math.round(window.innerHeight - (bounds.top - gap))}px`);
        return;
      }
    }
    popover.setAttribute("data-okf-label-rename-side", "below");
    popover.style.setProperty("top", `${Math.round(bounds.bottom + gap)}px`);
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

  // @implements_req SwRS-MDOKFSTUDIO-MYST-038
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
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
