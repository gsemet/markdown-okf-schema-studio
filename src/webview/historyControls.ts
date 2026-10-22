export interface HistoryControlsContext {
  documentId: string;
  documentVersion: number;
  requestId: number;
}

/**
 * Back and Next buttons of toolbar row 2. Injected into the page script with `.toString()`, so the
 * body must not use anything defined outside it. The host owns the history and reports which
 * buttons are usable with `previewHistoryState`; both start disabled.
 */
export function installHistoryControls(
  document: Document,
  vscode: { postMessage(message: unknown): void },
  context: HistoryControlsContext,
  beforeNavigate?: (navigate: () => void) => void,
): { apply(state: { canBack?: unknown; canForward?: unknown }): void } {
  const back = document.querySelector("[data-sphinx-preview-back]") as HTMLButtonElement | null;
  const next = document.querySelector("[data-sphinx-preview-next]") as HTMLButtonElement | null;
  // The markup carries the tooltips; the buttons start disabled until the host reports the history.
  if (back) back.disabled = true;
  if (next) next.disabled = true;
  const go = (direction: "back" | "forward"): void => {
    const navigate = (): void => vscode.postMessage({
      type: "previewHistoryGo",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      direction,
    });
    // Back and Next can switch document: save what the open editor holds first (CR 025). The
    // flush calls navigate once its saves are posted, which can wait for a pending save result.
    if (beforeNavigate) beforeNavigate(navigate);
    else navigate();
  };
  back?.addEventListener("click", () => go("back"));
  next?.addEventListener("click", () => go("forward"));
  return {
    apply(state) {
      if (back) back.disabled = state.canBack !== true;
      if (next) next.disabled = state.canForward !== true;
    },
  };
}
