export interface ToolbarCollapseContext {
  documentId: string;
  revision: number;
  requestId: number;
  initialViewPreferences?: { toolbarCollapsed?: boolean };
}

/** How long the load hint keeps rows 2 to 5 open before they roll up again. */
const HINT_OPEN_MS = 700;
/** Webview state key (true): this panel already showed the load hint; the state snapshots carry it. */
const HINT_STATE_KEY = "viewToolbarHintShown";

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-007
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-130
// @implements_req SwRS-MDOKFSTUDIO-LIFE-169
// @implements_req SwRS-MDOKFSTUDIO-LIFE-170
/**
 * Collapse button of toolbar row 1: hides or shows rows 2 to 5 (the `hidden` attribute also
 * takes them out of the Tab order). The choice is the `toolbarCollapsed` view preference:
 * posted to the host (kept per workspace) and mirrored on `<html>` as
 * `data-sphinx-preview-toolbar-state` ("expanded" / "collapsed"). Without a stored choice the toolbar
 * starts collapsed, like `DEFAULT_VIEW_PREFERENCES`. `onChange` runs after a click, when
 * the toolbar changed size, and again when the unroll or roll-up animation of the rows ends.
 *
 * The rows unroll and roll up as one block (the stylesheet animates `height` and `opacity` of the
 * rows; `hidden` still decides the Tab order). Load hint: when the toolbar is collapsed, a panel
 * that opens its preview unrolls the rows for a moment and rolls them up again, to show that they
 * exist. It plays once per panel: never again on a refresh, a reload, a patch or when the panel
 * follows another document. It is not part of the preference (nothing is posted
 * or saved but the "hint shown" mark), a pointer or key press cancels it, and the system
 * preference for reduced motion turns it off. A press or key on the chevron is left to its click.
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
  window?: Window,
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
  rows?.addEventListener("transitionend", (event) => {
    if (event.target === rows && (event as TransitionEvent).propertyName === "height") onChange();
  });

  const reduced = (): boolean => {
    try {
      return window?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    } catch {
      return false;
    }
  };

  // The rows are clipped while they unroll or roll up (the stylesheet animates under this mark).
  const ANIMATING = "data-sphinx-preview-toolbar-animating";
  const ANIMATION_MS = 200;
  let animatingTimer: number | undefined;
  /** Marks the rows as animating when the next change of `hidden` may animate. */
  const markAnimating = (): void => {
    if (!window || !rows || reduced()) return;
    if (animatingTimer !== undefined) window.clearTimeout(animatingTimer);
    rows.setAttribute(ANIMATING, "true");
    animatingTimer = window.setTimeout(() => {
      animatingTimer = undefined;
      rows.removeAttribute(ANIMATING);
    }, ANIMATION_MS);
  };

  // Load hint.
  const HINT = "data-sphinx-preview-toolbar-hint";
  let hintTimer: number | undefined;
  let hintActive = false;
  /** Ends the hint; returns true when it was active. `keepOpen` leaves the open rows as they are. */
  const endHint = (animated: boolean, keepOpen = false): boolean => {
    if (hintTimer !== undefined) window?.clearTimeout(hintTimer);
    hintTimer = undefined;
    if (!hintActive) return false;
    hintActive = false;
    window?.removeEventListener("pointerdown", cancelHint, true);
    window?.removeEventListener("keydown", cancelHint, true);
    document.documentElement.removeAttribute(HINT);
    if (keepOpen) return true;
    if (animated) markAnimating();
    if (rows) rows.hidden = collapsed;
    onChange();
    return true;
  };
  function cancelHint(event?: Event): void {
    // A press or key on the chevron is left to its click, which keeps the rows open (no flicker).
    if (button && event?.target instanceof Object
      && (event.target === button || (button as Element).contains?.(event.target as Node))) return;
    endHint(false);
  }
  const startHint = (): void => {
    if (!window || !rows || !collapsed || hintActive) return;
    hintActive = true;
    document.documentElement.setAttribute(HINT, "true");
    markAnimating();
    rows.hidden = false;
    onChange();
    window.addEventListener("pointerdown", cancelHint, true);
    window.addEventListener("keydown", cancelHint, true);
    hintTimer = window.setTimeout(() => endHint(true), HINT_OPEN_MS);
  };
  const state = vscode.getState?.() as Record<string, unknown> | undefined;
  if (window && rows && collapsed && !reduced() && state?.[HINT_STATE_KEY] !== true) {
    vscode.setState?.({ ...(state && typeof state === "object" ? state : {}), [HINT_STATE_KEY]: true });
    // Two frames later, so the collapsed toolbar is painted first (no timer is pending at load).
    const afterFrame = (next: () => void): void => {
      if (window.requestAnimationFrame) window.requestAnimationFrame(next);
      else next();
    };
    afterFrame(() => afterFrame(startHint));
  }

  button?.addEventListener("click", () => {
    // A click that ends the hint expands the toolbar: the rows are already open, so they stay
    // open without a new animation (no snap to zero height and unroll).
    const endedHint = endHint(false, collapsed);
    if (!endedHint) markAnimating();
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
      revision: context.revision,
      requestId: context.requestId,
      preference: "toolbarCollapsed",
      value: collapsed,
    });
    onChange();
  });
  return { collapsed: () => collapsed };
}
