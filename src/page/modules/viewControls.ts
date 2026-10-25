export interface ViewControlsContext {
  documentId: string;
  revision: number;
  requestId: number;
  initialViewPreferences?: { zoom?: number };
}

/**
 * Zoom controls of toolbar row 2. `onZoomChange` runs after the zoom variable changed and lets
 * the page keep its reading line.
 */
export function installViewControls(
  document: Document,
  vscode: {
    postMessage(message: unknown): void;
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: ViewControlsContext,
  onZoomChange: () => void,
): { zoom(): number } {
  const minimum = 70;
  const maximum = 200;
  const step = 10;
  const zoomOut = document.querySelector("[data-sphinx-preview-zoom-out]");
  const zoomIn = document.querySelector("[data-sphinx-preview-zoom-in]");
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-170
  const normalize = (value: unknown): number | undefined => (
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(maximum, Math.max(minimum, Math.round(value / step) * step))
      : undefined
  );
  const saved = vscode.getState?.() as { viewZoom?: unknown } | undefined;
  let zoom = normalize(saved?.viewZoom) ?? normalize(context.initialViewPreferences?.zoom) ?? 100;

  const apply = (): void => {
    const root = document.documentElement;
    root.style.setProperty("--sphinx-preview-zoom", String(Number((zoom / 100).toFixed(2))));
    root.setAttribute("data-sphinx-preview-zoom", String(zoom));
    const outTooltip = zoom <= minimum ? `Zoom out (minimum ${minimum} %)` : `Zoom out (${zoom - step} %)`;
    const inTooltip = zoom >= maximum ? `Zoom in (maximum ${maximum} %)` : `Zoom in (${zoom + step} %)`;
    for (const [button, tooltip, limit] of [
      [zoomOut, outTooltip, zoom <= minimum],
      [zoomIn, inTooltip, zoom >= maximum],
    ] as const) {
      if (!button) continue;
      (button as HTMLButtonElement).disabled = limit;
      button.setAttribute("title", tooltip);
      button.setAttribute("data-tooltip", tooltip);
    }
  };
  // @implements_req SwRS-MDOKFSTUDIO-THEME-038
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-169
  const change = (delta: number): void => {
    const next = Math.min(maximum, Math.max(minimum, zoom + delta));
    if (next === zoom) return;
    zoom = next;
    apply();
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      viewZoom: zoom,
    });
    vscode.postMessage({
      type: "previewViewPreferenceChanged",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      preference: "zoom",
      value: zoom,
    });
    onZoomChange();
  };

  apply();
  zoomOut?.addEventListener("click", () => change(-step));
  zoomIn?.addEventListener("click", () => change(step));
  return { zoom: () => zoom };
}
