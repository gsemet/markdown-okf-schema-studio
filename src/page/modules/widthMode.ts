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
  // Called at the end of every layout pass: a breakout or its removal moves the elements around.
  onLayout: () => void = () => undefined,
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
  // The cells of a token column (see tableMinimum), which keep their text on one line in Auto.
  const tokenAttribute = "data-sphinx-preview-token";
  const tokenCells = new Set<Element>();
  // A prose column needs about this many characters of the body font (the review said 20, see tableMinimum).
  const proseMinimumCharacters = 24;

  // The wrappers measured by the last pass, and the geometry (column, pane, TOC reserve, shift) it
  // measured them in: a table whose cell editor is open keeps its verdict until that geometry changes.
  let decided = new Set<Element>();
  let lastGeometry = "";

  const release = (element: Element): void => {
    element.removeAttribute(wideAttribute);
    (element as HTMLElement).style.setProperty(breakoutProperty, "");
    (element as HTMLElement).style.setProperty(shiftProperty, "");
    marked.delete(element);
  };

  const clear = (except: Set<Element> = new Set()): void => {
    for (const element of Array.from(marked)) {
      if (!except.has(element)) release(element);
    }
  };

  const hasCellEditor = (wrapper: Element): boolean => Boolean(
    wrapper.querySelector?.("[data-sphinx-preview-table-cell-editor]"),
  );

  // The text of a cell as rendered: while its editor is open the cell also holds the editor's
  // labels, so only the hidden rendered content counts.
  const renderedText = (cell: Element): string => {
    const hidden = cell.querySelector?.('[data-sphinx-table-cell-content="true"]');
    return (hidden ?? cell).textContent ?? "";
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

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-023
  // The elements that may break out in Auto: an element whose source editor is open, or a figure
  // sized relative to the column, keeps the column width. A table whose cell is being edited stays
  // rendered, so its cell editor (a textarea inside the cell) does not count: it keeps its breakout.
  const eligibleWrappers = (content: HTMLElement): Element[] => {
    const wrappers: Element[] = [];
    for (const element of Array.from(content.querySelectorAll("table, figure, img, pre, .myst-mermaid-diagram"))) {
      const wrapper = wrapperOf(element, content);
      if (!wrapper || wrappers.includes(wrapper)) continue;
      // A figure sized in %, em or rem asks for a size relative to the column: it never breaks out.
      const sized = (wrapper.tagName === "IMG" ? wrapper : wrapper.querySelector?.("img"))?.getAttribute("data-okf-width");
      if (sized && /(?:%|r?em)$/u.test(sized)) continue;
      if (wrapper.getAttribute("data-sphinx-preview-editing") === "true"
        || wrapper.querySelector?.('[data-sphinx-preview-editing="true"]')
        || Array.from(wrapper.querySelectorAll?.("textarea") ?? []).some(
          (field) => !field.closest?.("[data-sphinx-preview-table-cell-editor]"),
        )) continue;
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

  const tableOf = (wrapper: Element): Element | null => (
    wrapper.tagName === "TABLE" ? wrapper : wrapper.tagName === "FIGURE" ? wrapper.querySelector?.("table") ?? null : null
  );

  interface TablePlan {
    grid: Element[][];
    /** Per column: holds a code block, or is a token column. */
    block: boolean[];
    token: boolean[];
    /** Per column: the longest unbroken word of a body cell, in characters. */
    longest: number[];
  }

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-044
  /**
   * Sorts the columns of a table from its text alone: a token column (every body cell at most three
   * words: inline code, a number, a date, an identifier) never wraps; a column holding a code block
   * cannot shrink; any other column is prose. Undefined for a table without a plain grid (merged
   * cells, nested tables, no rows): it then keeps the rule of its natural width.
   */
  const planTable = (table: Element): TablePlan | undefined => {
    const rows = Array.from(table.querySelectorAll?.("tr") ?? []);
    if (rows.length === 0 || table.querySelector?.("table")) return undefined;
    const grid = rows.map((tableRow) => Array.from(tableRow.children));
    const count = grid[0].length;
    if (count === 0 || grid.some((cells) => cells.length !== count || cells.some((cell) => {
      const span = cell as HTMLTableCellElement;
      return span.colSpan > 1 || span.rowSpan > 1;
    }))) return undefined;
    const bodyRows = grid.filter((_, index) => rows[index].parentElement?.tagName !== "THEAD");
    const body = bodyRows.length > 0 ? bodyRows : grid;
    const plan: TablePlan = { grid, block: [], token: [], longest: [] };
    for (let column = 0; column < count; column += 1) {
      const words = body.map((cells) => renderedText(cells[column]).trim().split(/\s+/u).filter(Boolean));
      const block = grid.some((cells) => cells[column].querySelector?.("pre"));
      plan.block.push(block);
      plan.token.push(!block && words.every((cellWords) => cellWords.length <= 3));
      plan.longest.push(Math.max(0, ...words.flat().map((word) => word.length)));
    }
    return plan;
  };

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-044
  /**
   * The width a planned table needs at the least, read while it is uncapped: a token column or a
   * column holding a code block needs its widest cell; a prose column needs about 24 characters of
   * the body font (calibrated so that the reviewed cases keep their verdicts), or its longest
   * unbroken word when that is longer.
   */
  const tableMinimum = (plan: TablePlan): number => {
    const probe = document.createElement("span");
    probe.textContent = "0".repeat(proseMinimumCharacters);
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    plan.grid[0][0].appendChild(probe);
    const characterWidth = probe.getBoundingClientRect().width / proseMinimumCharacters;
    probe.remove();
    let minimum = 0;
    plan.grid[0].forEach((_, column) => {
      const cells = plan.grid.map((cellRow) => cellRow[column]);
      const natural = Math.max(...cells.map((cell) => cell.getBoundingClientRect().width));
      if (plan.block[column] || plan.token[column]) {
        minimum += natural;
        return;
      }
      const style = window.getComputedStyle?.(cells[0]);
      const padding = (parseFloat(style?.paddingLeft ?? "") || 0) + (parseFloat(style?.paddingRight ?? "") || 0) + 1;
      minimum += Math.min(natural, Math.max(proseMinimumCharacters, plan.longest[column]) * characterWidth + padding);
    });
    return minimum;
  };

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-023
  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-022
  const measureWide = (): void => {
    const content = document.getElementById(contentId);
    const wrappers = content && mode === "auto" ? eligibleWrappers(content) : undefined;
    // The measure below uncaps each wrapper, which makes the browser reset its sideways scroll.
    const scrolled = wrappers ? scrolledBoxes(wrappers) : [];
    // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-023
    // A table whose cell editor is open keeps the verdict of the pass before the editor opened: the
    // selected cell's minimum width would otherwise move the breakout at every Tab, arrow or click.
    const held = new Set<Element>(
      (wrappers ?? []).filter((wrapper) => decided.has(wrapper) && hasCellEditor(wrapper)),
    );
    clear(held);
    if (mode !== "auto") {
      decided = new Set();
      lastGeometry = "";
      for (const cell of tokenCells) cell.removeAttribute(tokenAttribute);
      tokenCells.clear();
    }
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
    // A real resize (pane, TOC column, toolbar, zoom) changes the geometry: the held tables are measured again.
    const geometry = [column, pane, reserved, shift].join(" ");
    if (geometry !== lastGeometry) {
      for (const wrapper of held) release(wrapper);
      held.clear();
    }
    lastGeometry = geometry;
    decided = new Set(wrappers);
    const measured = wrappers.filter((wrapper) => !held.has(wrapper));
    // A table is capped at the column, which wraps its cells: measure it uncapped, then restore.
    const measuring = "data-sphinx-preview-measuring";
    // The token cells are marked first, so the measure reads their final sizes.
    const plans = new Map<Element, TablePlan>();
    const wantedTokens = new Set<Element>();
    // The token cells of a held table stay marked: its plan reads the rendered text, not the editor.
    for (const wrapper of wrappers) {
      const table = tableOf(wrapper);
      const plan = table ? planTable(table) : undefined;
      if (!plan) continue;
      plans.set(wrapper, plan);
      plan.grid.forEach((cells) => cells.forEach((cell, column) => { if (plan.token[column]) wantedTokens.add(cell); }));
    }
    for (const cell of tokenCells) {
      if (!wantedTokens.has(cell)) {
        cell.removeAttribute(tokenAttribute);
        tokenCells.delete(cell);
      }
    }
    for (const cell of wantedTokens) {
      if (!tokenCells.has(cell)) {
        cell.setAttribute(tokenAttribute, "");
        tokenCells.add(cell);
      }
    }
    for (const wrapper of measured) {
      wrapper.setAttribute(measuring, "");
      tableOf(wrapper)?.setAttribute(measuring, "");
    }
    // A table whose minimums fit the column stays in it (LAYOUT-044), whatever its natural width.
    const stays = new Set<Element>();
    for (const [wrapper, plan] of plans) {
      if (!held.has(wrapper) && tableMinimum(plan) <= column + 1) stays.add(wrapper);
    }
    const widths = measured.map((wrapper) => {
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
    for (const wrapper of measured) {
      wrapper.removeAttribute(measuring);
      tableOf(wrapper)?.removeAttribute(measuring);
    }
    measured.forEach((wrapper, index) => {
      if (stays.has(wrapper)) return;
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

  const update = (): void => {
    measureWide();
    onLayout();
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
