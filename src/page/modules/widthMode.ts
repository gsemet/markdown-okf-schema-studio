export interface WidthModeContext {
  documentId: string;
  revision: number;
  requestId: number;
  initialViewPreferences?: { widthMode?: string };
}

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-020
// @implements_req SwRS-MDOKFSTUDIO-LIFE-169
/**
 * Width button of toolbar row 4: Margin (the configured column), Auto (the column stays, but
 * tables, figures, images and code blocks wider than it break out, up to the available width and
 * centred on it; code blocks stay in the list and are not centred when narrow) and Full
 * width (no column limit). `onChange` runs after the mode changed and lets the page keep its
 * reading line; `update()` re-measures the wide elements (Auto only).
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
  const shiftProperty = "--sphinx-preview-breakout-shift";
  const figureAttribute = "data-sphinx-preview-figure";
  const gutter = 16;
  // A table with row handles (edit mode) keeps their room on its left, so it never needs the
  // row-shift that would cap it and make the measure flip-flop.
  const handleGutter = 34;
  const button = document.querySelector("[data-sphinx-preview-width-toggle]");
  const saved = vscode.getState?.() as { viewWidthMode?: unknown } | undefined;
  const pick = (value: unknown): string | undefined => (
    typeof value === "string" && modes.includes(value) ? value : undefined
  );
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-170
  let mode = pick(saved?.viewWidthMode) ?? pick(context.initialViewPreferences?.widthMode) ?? "margin";
  const marked = new Set<Element>();
  const figures = new Set<Element>();

  const clear = (): void => {
    for (const element of marked) {
      element.removeAttribute(wideAttribute);
      (element as HTMLElement).style.setProperty(breakoutProperty, "");
      (element as HTMLElement).style.setProperty(shiftProperty, "");
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

  // The elements that may break out in Auto: an element under edit, or a figure sized relative to
  // the column, keeps the column width.
  const eligibleWrappers = (content: HTMLElement): Element[] => {
    const wrappers: Element[] = [];
    for (const element of Array.from(content.querySelectorAll("table, figure, img, pre, .myst-mermaid-diagram"))) {
      const wrapper = wrapperOf(element, content);
      if (!wrapper || wrappers.includes(wrapper)) continue;
      // A figure sized in %, em or rem asks for a size relative to the column: it never breaks out.
      const sized = (wrapper.tagName === "IMG" ? wrapper : wrapper.querySelector?.("img"))?.getAttribute("data-okf-width");
      if (sized && /(?:%|r?em)$/u.test(sized)) continue;
      if (wrapper.getAttribute("data-sphinx-preview-editing") === "true"
        || wrapper.querySelector?.('[data-sphinx-preview-editing="true"], textarea')) continue;
      wrappers.push(wrapper);
    }
    return wrappers;
  };

  // The boxes scrolled sideways: each wrapper, and the table or code block inside a wrapper that
  // is not itself the scrolling box.
  const scrolledBoxes = (wrappers: Element[]): Array<[Element, number]> => {
    const scrolled: Array<[Element, number]> = [];
    for (const wrapper of wrappers) {
      for (const box of [wrapper, ...Array.from(wrapper.querySelectorAll?.("table, pre") ?? [])]) {
        if (box.scrollLeft > 0) scrolled.push([box, box.scrollLeft]);
      }
    }
    return scrolled;
  };

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-023
  // The same pixel offset, clamped to the new maximum; written only when it changed.
  const restoreScroll = (scrolled: Array<[Element, number]>): void => {
    for (const [box, left] of scrolled) {
      const target = Math.max(0, Math.min(left, box.scrollWidth - box.clientWidth));
      if (box.scrollLeft !== target) box.scrollLeft = target;
    }
  };

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-023
  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-022
  const update = (): void => {
    const content = document.getElementById(contentId);
    const wrappers = content && mode === "auto" ? eligibleWrappers(content) : undefined;
    // The measure below uncaps each wrapper, which makes the browser reset its sideways scroll.
    const scrolled = wrappers ? scrolledBoxes(wrappers) : [];
    clear();
    if (!content) return;
    // A paragraph holding only an image is a figure: CSS centres it in every width mode. Only the
    // top-level blocks are looked at, and only the difference is written, so a re-measure of a long
    // document is cheap and causes no attribute churn.
    const holders = new Set<Element>();
    for (const child of Array.from(content.children)) {
      const only = child.childElementCount === 1 ? child.firstElementChild : null;
      if (child.tagName === "P" && only && only.tagName === "IMG" && (child.textContent ?? "").trim() === "") {
        holders.add(child);
      }
    }
    for (const holder of figures) {
      if (!holders.has(holder)) {
        holder.removeAttribute(figureAttribute);
        figures.delete(holder);
      }
    }
    for (const holder of holders) {
      if (!figures.has(holder)) {
        holder.setAttribute(figureAttribute, "");
        figures.add(holder);
      }
    }
    if (mode !== "auto" || !wrappers) return;
    const style = window.getComputedStyle?.(content);
    const column = content.clientWidth
      - (parseFloat(style?.paddingLeft ?? "") || 0) - (parseFloat(style?.paddingRight ?? "") || 0);
    const pane = document.documentElement.clientWidth || window.innerWidth;
    // The open TOC column takes its width from the pane (CSS publishes 0 when it is closed or hidden).
    const reserved = parseFloat(
      window.getComputedStyle?.(document.documentElement)?.getPropertyValue?.("--sphinx-preview-toc-reserve") ?? "",
    ) || 0;
    const available = pane - reserved - gutter * 2;
    const hasRowHandles = (wrapper: Element): boolean => wrapper.getAttribute("data-okf-row-handles") === "true"
      || Boolean(wrapper.querySelector?.('[data-okf-row-handles="true"]'));
    // A wide element is centred on the available area (the pane without the TOC column), which is
    // normally also the centre of the column; the shift covers the case where it is not.
    const box = content.getBoundingClientRect?.();
    const columnCentre = (box?.left ?? 0) + (parseFloat(style?.paddingLeft ?? "") || 0) + column / 2;
    const shift = Math.round((pane - reserved) / 2 - columnCentre);
    // A table is capped at the column, which wraps its cells: measure it uncapped, then restore.
    const measuring = "data-sphinx-preview-measuring";
    for (const wrapper of wrappers) wrapper.setAttribute(measuring, "");
    const widths = wrappers.map((wrapper) => {
      const image = wrapper.tagName === "IMG" ? wrapper : wrapper.querySelector?.("img");
      // An image is capped by the column, so its own size is the natural width: the pixel width
      // attribute when it has one (an SVG has no intrinsic size), else the intrinsic width.
      const declared = parseFloat(image?.getAttribute("data-okf-width") ?? image?.getAttribute("width") ?? "") || 0;
      // A pixel width asked for by the author replaces the intrinsic size, which may be larger.
      const intrinsic = image?.hasAttribute("data-okf-width") ? 0 : (image as HTMLImageElement | null)?.naturalWidth ?? 0;
      // scrollWidth is rounded down: a table of 1038.2px given 1038px would squeeze its cells and
      // wrap them, so the fractional box width counts too and the result is rounded up.
      const box = wrapper.getBoundingClientRect?.()?.width ?? 0;
      return Math.ceil(Math.max(wrapper.scrollWidth, declared, intrinsic, box));
    });
    for (const wrapper of wrappers) wrapper.removeAttribute(measuring);
    wrappers.forEach((wrapper, index) => {
      const room = hasRowHandles(wrapper) ? pane - reserved - handleGutter * 2 : available;
      const extra = widths[index] <= room ? Math.ceil(widths[index] - column) : Math.floor(room - column);
      if (extra <= 1) return;
      wrapper.setAttribute(wideAttribute, "");
      (wrapper as HTMLElement).style.setProperty(breakoutProperty, extra + "px");
      (wrapper as HTMLElement).style.setProperty(shiftProperty, shift + "px");
      marked.add(wrapper);
    });
    restoreScroll(scrolled);
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
      revision: context.revision,
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
