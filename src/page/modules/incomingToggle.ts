export interface IncomingToggleContext {
  documentId: string;
  revision: number;
  requestId: number;
  initialViewPreferences?: { incomingChanges?: boolean };
}

/**
 * Diff button of toolbar row 2: shows or hides the incoming-change marks (green bars).
 * The choice is the `incomingChanges` view preference: it is posted to the host (which stops or
 * starts sending line ranges and keeps it per workspace) and mirrored on `<html>` as
 * `data-sphinx-preview-incoming` ("on" / "off"), so CSS hides the marks at once. Whether the
 * button exists at all follows the setting (`data-okf-incoming-changes`, see incomingChanges.ts).
 */
export function installIncomingToggle(
  document: Document,
  vscode: {
    postMessage(message: unknown): void;
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: IncomingToggleContext,
): { shown(): boolean } {
  const button = document.querySelector("[data-sphinx-preview-diff-toggle]");
  const saved = vscode.getState?.() as { viewIncomingChanges?: unknown } | undefined;
  let shown = typeof saved?.viewIncomingChanges === "boolean"
    ? saved.viewIncomingChanges
    : context.initialViewPreferences?.incomingChanges !== false;

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-214
  const apply = (): void => {
    document.documentElement.setAttribute("data-sphinx-preview-incoming", shown ? "on" : "off");
    if (!button) return;
    const label = shown ? "Hide changes since last commit" : "Show changes since last commit";
    button.setAttribute("aria-pressed", shown ? "true" : "false");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("data-tooltip", label);
  };

  apply();
  button?.addEventListener("click", () => {
    shown = !shown;
    apply();
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      viewIncomingChanges: shown,
    });
    vscode.postMessage({
      type: "previewViewPreferenceChanged",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      preference: "incomingChanges",
      value: shown,
    });
  });
  return { shown: () => shown };
}
