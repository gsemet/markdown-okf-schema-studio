/** The parts of a keydown event the editor-key test reads. */
export interface EditorKeyEvent {
  key?: string;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  target?: unknown;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-069
/**
 * True when an open editor of the page (block, table cell, frontmatter, or the table bar of a cell)
 * has already handled `event`: the key is one the editors act on (Tab, Enter, Escape, the arrow
 * keys), the editor's own listener prevented the default action, and the target sits inside an
 * editor. A key the page did not handle (Ctrl+Tab, an arrow key in the middle of the text) is not
 * matched.
 */
export function isHandledEditorKey(event: EditorKeyEvent): boolean {
  if (event.defaultPrevented !== true || event.isComposing === true) return false;
  const keys = ["Tab", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (!keys.includes(String(event.key))) return false;
  const target = event.target as { closest?: (selector: string) => unknown } | null | undefined;
  if (!target || typeof target.closest !== "function") return false;
  return ["[data-sphinx-preview-block-editor]", "[data-okf-frontmatter-editor]", "[data-sphinx-table-menu]"]
    .some((selector) => Boolean(target.closest?.(selector)));
}

/**
 * Keeps the keys an open editor has handled inside the page. VS Code forwards every keydown of a
 * webview to the workbench, which runs its own key bindings for it. The page has already acted on
 * these keys (moved to the next cell, saved, cancelled), so the workbench has nothing to add, and
 * whether a forwarded key reaches the webview's command or a workbench fallback depends on a focus
 * state the webview reports by polling every 250 ms (see selectAllKey.ts for the shortcut where
 * this went wrong). Stopping the propagation at the document keeps the event away from VS Code's
 * forwarding listener on the window. Other document listeners still run, and keys no editor handled
 * (VS Code's own shortcuts) keep reaching the workbench. `onKept` receives the key and target, for
 * the page's diagnostics.
 */
export function installEditorKeyContainment(
  document: Document,
  isHandled: (event: EditorKeyEvent) => boolean,
  onKept?: (key: string, target: EventTarget | null) => void,
): void {
  document.addEventListener("keydown", (event) => {
    if (!isHandled(event)) return;
    event.stopPropagation();
    onKept?.(String(event.key), event.target);
  });
}
