export interface ToolbarCollapseContext {
  documentId: string;
  documentVersion: number;
  requestId: number;
  initialViewPreferences?: { toolbarCollapsed?: boolean };
}

/**
 * Collapse button of toolbar row 1: hides or shows rows 2 and 3 (the `hidden` attribute also
 * takes them out of the Tab order). Injected into the page script with `.toString()`, so the body
 * must not use anything defined outside it. The choice is the `toolbarCollapsed` view preference:
 * posted to the host (kept per workspace) and mirrored on `<html>` as
 * `data-sphinx-preview-toolbar-state` ("expanded" / "collapsed"). Without a stored choice the toolbar
 * starts collapsed, like `DEFAULT_VIEW_PREFERENCES`. `onChange` runs after a click, when
 * the toolbar changed size.
 */
export function installToolbarCollapse(
  document: Document,
  vscode: {
    postMessage(message: unknown): void;
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: ToolbarCollapseContext,
  onChange: () => void,
): { collapsed(): boolean } {
  const button = document.querySelector("[data-sphinx-preview-toolbar-collapse]");
  const rows = document.querySelector("[data-sphinx-preview-toolbar-more]") as HTMLElement | null;
  const saved = vscode.getState?.() as { viewToolbarCollapsed?: unknown } | undefined;
  let collapsed = typeof saved?.viewToolbarCollapsed === "boolean"
    ? saved.viewToolbarCollapsed
    : context.initialViewPreferences?.toolbarCollapsed !== false;

  const apply = (): void => {
    document.documentElement.setAttribute("data-sphinx-preview-toolbar-state", collapsed ? "collapsed" : "expanded");
    if (rows) rows.hidden = collapsed;
    if (!button) return;
    const label = collapsed ? "Show view controls" : "Hide view controls";
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("data-tooltip", label);
  };

  apply();
  button?.addEventListener("click", () => {
    collapsed = !collapsed;
    apply();
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      viewToolbarCollapsed: collapsed,
    });
    vscode.postMessage({
      type: "previewViewPreferenceChanged",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      preference: "toolbarCollapsed",
      value: collapsed,
    });
    onChange();
  });
  return { collapsed: () => collapsed };
}
