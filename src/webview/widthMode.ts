export interface WidthModeContext {
  documentId: string;
  documentVersion: number;
  requestId: number;
  initialViewPreferences?: { widthMode?: string };
}

/**
 * Width button of toolbar row 2: Margin (the configured column), Auto (the column stays, but
 * tables, figures, images and code blocks wider than it break out to the pane width) and Full
 * width (no column limit). Injected into the page script with `.toString()`, so the body must not
 * use anything defined outside it. `onChange` runs after the mode changed and lets the page keep
 * its reading line; `update()` re-measures the wide elements (Auto only).
 */
export function installWidthMode(
  document: Document,
  window: Window & typeof globalThis,
  vscode: {
    postMessage(message: unknown): void;
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: WidthModeContext,
  onChange: () => void,
): { mode(): string; update(): void } {
  const modes = ["margin", "auto", "full"];
  const labels: Record<string, string> = { margin: "Margin", auto: "Auto", full: "Full width" };
  const contentId = "sphinx-myst-preview-content";
  const wideAttribute = "data-sphinx-preview-wide";
  const breakoutProperty = "--sphinx-preview-breakout";
  const gutter = 16;
  const button = document.querySelector("[data-sphinx-preview-width-toggle]");
  const saved = vscode.getState?.() as { viewWidthMode?: unknown } | undefined;
  const pick = (value: unknown): string | undefined => (
    typeof value === "string" && modes.includes(value) ? value : undefined
  );
  let mode = pick(saved?.viewWidthMode) ?? pick(context.initialViewPreferences?.widthMode) ?? "margin";
  const marked = new Set<Element>();

  const clear = (): void => {
    for (const element of marked) {
      element.removeAttribute(wideAttribute);
      (element as HTMLElement).style.setProperty(breakoutProperty, "");
    }
    marked.clear();
  };

  // The element that breaks out: a top-level block, or the paragraph holding only an image.
  const wrapperOf = (element: Element, content: HTMLElement): Element | undefined => {
    if (element.parentElement === content) return element;
    const parent = element.parentElement;
    if (element.tagName === "IMG" && parent && parent.tagName === "P" && parent.parentElement === content
      && (parent.textContent ?? "").trim() === "") {
      return parent;
    }
    return undefined;
  };

  const update = (): void => {
    clear();
    const content = document.getElementById(contentId);
    if (mode !== "auto" || !content) return;
    const wrappers: Element[] = [];
    for (const element of Array.from(content.querySelectorAll("table, figure, img, pre, .myst-mermaid-diagram"))) {
      const wrapper = wrapperOf(element, content);
      if (!wrapper || wrappers.includes(wrapper)) continue;
      // An element under edit keeps the column width.
      if (wrapper.getAttribute("data-sphinx-preview-editing") === "true"
        || wrapper.querySelector?.('[data-sphinx-preview-editing="true"], textarea')) continue;
      wrappers.push(wrapper);
    }
    const style = window.getComputedStyle?.(content);
    const column = content.clientWidth
      - (parseFloat(style?.paddingLeft ?? "") || 0) - (parseFloat(style?.paddingRight ?? "") || 0);
    const pane = document.documentElement.clientWidth || window.innerWidth;
    // The open TOC column takes its width from the pane (CSS publishes 0 when it is closed or hidden).
    const reserved = parseFloat(
      window.getComputedStyle?.(document.documentElement)?.getPropertyValue?.("--sphinx-preview-toc-reserve") ?? "",
    ) || 0;
    const available = pane - reserved - gutter * 2;
    const widths = wrappers.map((wrapper) => {
      const image = wrapper.tagName === "IMG" ? wrapper : wrapper.querySelector?.("img");
      // An image is capped by the column, so its own size is the natural width: the pixel width
      // attribute when it has one (an SVG has no intrinsic size), else the intrinsic width.
      const declared = parseFloat(image?.getAttribute("width") ?? "") || 0;
      return Math.max(wrapper.scrollWidth, declared, (image as HTMLImageElement | null)?.naturalWidth ?? 0);
    });
    wrappers.forEach((wrapper, index) => {
      const extra = Math.floor(Math.min(widths[index], available) - column);
      if (extra <= 1) return;
      wrapper.setAttribute(wideAttribute, "");
      (wrapper as HTMLElement).style.setProperty(breakoutProperty, extra + "px");
      marked.add(wrapper);
    });
  };

  const apply = (): void => {
    document.documentElement.setAttribute("data-sphinx-preview-width", mode);
    if (button) {
      const label = "Width: " + labels[mode];
      button.setAttribute("data-width-mode", mode);
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("data-tooltip", label);
    }
    update();
  };

  apply();
  button?.addEventListener("click", () => {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    apply();
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      viewWidthMode: mode,
    });
    vscode.postMessage({
      type: "previewViewPreferenceChanged",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      preference: "widthMode",
      value: mode,
    });
    onChange();
  });
  if (typeof MutationObserver !== "undefined") {
    const content = document.getElementById(contentId);
    if (content) {
      new MutationObserver(update).observe(content, {
        attributes: true,
        attributeFilter: ["data-sphinx-preview-editing"],
        subtree: true,
      });
    }
  }
  return { mode: () => mode, update };
}
