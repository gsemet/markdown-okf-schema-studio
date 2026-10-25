export interface CommentsToggleContext {
  documentId: string;
  revision: number;
  requestId: number;
  initialViewPreferences?: { comments?: boolean };
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-152
// @implements_req SwRS-MDOKFSTUDIO-LIFE-170
/**
 * Comments button of toolbar row 3, in preview and in edit mode: shows or hides the gray comment
 * chips (TODO chips stay). The choice is the `comments` view preference: it is posted to
 * the host (which keeps it per workspace, on by default) and mirrored on `<html>` as
 * `data-sphinx-preview-comments` ("on" / "off"), so CSS hides the chips at once. The
 * `preview.showComments` setting stays the master switch (`data-okf-show-comments`, which also
 * removes the button). `onLayoutChange` runs after a change so the page keeps its reading line.
 */
export function installCommentsToggle(
  document: Document,
  vscode: {
    postMessage(message: unknown): void;
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: CommentsToggleContext,
  onLayoutChange: () => void,
): { shown(): boolean } {
  const button = document.querySelector("[data-sphinx-preview-comments-toggle]");
  const saved = vscode.getState?.() as { viewComments?: unknown } | undefined;
  let shown = typeof saved?.viewComments === "boolean"
    ? saved.viewComments
    : context.initialViewPreferences?.comments !== false;

  const apply = (): void => {
    document.documentElement.setAttribute("data-sphinx-preview-comments", shown ? "on" : "off");
    if (!button) return;
    const label = shown ? "Hide comments" : "Show comments";
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
      viewComments: shown,
    });
    vscode.postMessage({
      type: "previewViewPreferenceChanged",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      preference: "comments",
      value: shown,
    });
    onLayoutChange();
  });
  return { shown: () => shown };
}
