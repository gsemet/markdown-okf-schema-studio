/** The parts of a keydown event the select-all test reads. */
export interface SelectAllKeyEvent {
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?: unknown;
}

/**
 * True when `event` is the platform's select-all shortcut (Cmd+A on macOS, Ctrl+A elsewhere)
 * typed in a text control of the page: a textarea, a text-like input or an editable element.
 */
export function isTextSelectAll(event: SelectAllKeyEvent, mac: boolean): boolean {
  if (event.altKey || event.shiftKey) return false;
  const primary = mac ? event.metaKey === true && !event.ctrlKey : event.ctrlKey === true && !event.metaKey;
  if (!primary || String(event.key || "").toLowerCase() !== "a") return false;
  const target = event.target as { tagName?: unknown; type?: unknown; isContentEditable?: unknown } | null | undefined;
  if (!target || typeof target !== "object") return false;
  const tagName = String(target.tagName || "").toUpperCase();
  if (tagName === "TEXTAREA") return true;
  if (tagName === "INPUT") {
    const type = String(target.type || "text").toLowerCase();
    return ["text", "search", "url", "tel", "password", "email", "number"].includes(type);
  }
  return target.isContentEditable === true;
}

/**
 * Keeps the select-all shortcut inside the text control that has the caret. VS Code forwards
 * every keydown of a webview to the workbench, which runs its own `selectAll` for Ctrl/Cmd+A. That
 * command acts on the webview only when the workbench already knows the webview has the focus, and
 * the webview reports focus changes by polling every 250 ms. A shortcut typed sooner after a click
 * runs the fallback instead: it focuses the last active text editor and selects its whole document,
 * and the page's text control loses the focus (its blur closes an unchanged frontmatter editor:
 * CI runs 39917471008 to 39930593934). Stopping the propagation at the document keeps the event
 * away from VS Code's forwarding listener on the window; the browser's own select-all (the
 * default action, not prevented) selects the control's text at once. Other document listeners still
 * run. `onKept` receives the target, for the page's diagnostics.
 */
export function installSelectAllInControls(
  document: Document,
  isSelectAll: (event: SelectAllKeyEvent, mac: boolean) => boolean,
  mac: boolean,
  onKept?: (target: EventTarget | null) => void,
): void {
  document.addEventListener("keydown", (event) => {
    if (!isSelectAll(event, mac)) return;
    event.stopPropagation();
    onKept?.(event.target);
  });
}
