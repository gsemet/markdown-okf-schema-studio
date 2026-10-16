export interface TocColumnContext {
  documentId: string;
  documentVersion: number;
  requestId: number;
  initialViewPreferences?: { toc?: boolean };
}

/**
 * TOC column: a right-hand column below the toolbar that lists the h1-h4 headings of the content.
 * Injected into the page script with `.toString()`, so the body must not use anything defined
 * outside it. The column is runtime UI appended to the body (never part of the page shell) and is
 * built only while it is open. `scrollToHeading` reveals a heading at the reading line; `onChange`
 * runs after the column opened or closed, because that changes the available width. CSS reserves
 * the width and hides the column on narrow panes. Parent entries fold with a twisty (the folded
 * keys, level + occurrence + text, live in the webview state and survive rebuilds). `track` marks
 * the entry of the section at the reading line from heading tops cached per rebuild; `remeasure`
 * refreshes those tops after a layout change (zoom, width mode, resize, content patch).
 */
export function installTocColumn(
  document: Document,
  window: Window & typeof globalThis,
  vscode: {
    postMessage(message: unknown): void;
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: TocColumnContext,
  scrollToHeading: (heading: Element) => void,
  onChange: () => void,
  readingLine: () => number = () => 0,
): {
  open(): boolean;
  refresh(): void;
  rebuild(): void;
  layout(): void;
  track(): void;
  remeasure(): void;
  collapsed(): string[];
} {
  const contentId = "sphinx-myst-preview-content";
  const headingSelector = "h1, h2, h3, h4";
  const excluded = "[data-okf-properties], .admonition, div[class*=\"admonition-\"], "
    + "[data-sphinx-preview-block-editor], [data-sphinx-preview-sticky-headings]";
  const button = document.querySelector("[data-sphinx-preview-toc-toggle]");
  const saved = vscode.getState?.() as { viewToc?: unknown; tocCollapsed?: unknown } | undefined;
  let open = typeof saved?.viewToc === "boolean"
    ? saved.viewToc
    : context.initialViewPreferences?.toc === true;

  const nav = document.createElement("nav");
  nav.setAttribute("data-sphinx-preview-toc", "");
  nav.setAttribute("aria-label", "Table of contents");
  document.body.appendChild(nav);
  let list: HTMLElement | undefined;
  let dirty = true;
  let scheduled = false;

  const layout = (): void => {
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    const bounds = toolbar?.getBoundingClientRect?.();
    const bottom = bounds && Number.isFinite(bounds.bottom) ? Math.max(0, bounds.bottom) : 0;
    nav.style.setProperty("--sphinx-preview-toc-top", bottom + 8 + "px");
  };

  const headingText = (heading: Element): string => {
    // A comment chip and its hidden body are not part of the heading's wording.
    let source: Element = heading;
    if (typeof heading.cloneNode === "function" && heading.querySelector?.(".okf-comment")) {
      source = heading.cloneNode(true) as Element;
      source.querySelectorAll?.(".okf-comment").forEach((comment) => comment.remove());
    }
    let text = source.textContent ?? "";
    const permalink = source.querySelector?.("a.headerlink, .headerlink");
    const glyph = permalink?.textContent;
    if (glyph) text = text.split(glyph).join("");
    return text.replace(/\s+/gu, " ").trim();
  };

  interface Entry {
    heading: Element;
    level: number;
    text: string;
    key: string;
    item: HTMLElement;
    target: HTMLElement;
    twisty?: HTMLElement;
    parent: number;
    top: number;
  }
  let entries: Entry[] = [];
  let represent: number[] = [];
  let shown = -1;
  const collapsedKeys = new Set<string>(
    Array.isArray(saved?.tocCollapsed)
      ? (saved.tocCollapsed as unknown[]).filter((key): key is string => typeof key === "string")
      : [],
  );

  const collect = (): Array<{ heading: Element; level: number; text: string; key: string }> => {
    const content = document.getElementById(contentId);
    const found: Array<{ heading: Element; level: number; text: string; key: string }> = [];
    const seen = new Map<string, number>();
    for (const heading of Array.from(content?.querySelectorAll(headingSelector) ?? [])) {
      if (heading.closest?.(excluded)) continue;
      const text = headingText(heading);
      if (!text) continue;
      const level = Number(heading.tagName.slice(1));
      const base = level + "|" + text;
      const occurrence = seen.get(base) ?? 0;
      seen.set(base, occurrence + 1);
      found.push({ heading, level, text, key: base + "|" + occurrence });
    }
    return found;
  };

  const scrollTop = (): number => (Number.isFinite(window.scrollY) ? window.scrollY : 0);

  const measureTops = (): void => {
    const offset = scrollTop();
    for (const entry of entries) {
      const top = entry.heading.getBoundingClientRect?.().top;
      entry.top = (Number.isFinite(top) ? top : 0) + offset;
    }
  };

  const keepVisible = (item: HTMLElement): void => {
    const area = nav.getBoundingClientRect?.();
    const box = item.getBoundingClientRect?.();
    if (!area || !box || !Number.isFinite(area.top) || !Number.isFinite(box.top)) return;
    if (box.bottom > area.bottom) nav.scrollTop += box.bottom - area.bottom;
    else if (box.top < area.top) nav.scrollTop -= area.top - box.top;
  };

  // Marks the entry of the section at the reading line from the cached tops; no layout read.
  const track = (force = false): void => {
    if (!open || entries.length === 0) return;
    const line = scrollTop() + readingLine();
    let current = -1;
    for (let index = 0; index < entries.length; index += 1) {
      // 1 px of tolerance: a heading revealed at the reading line can sit a fraction below it.
      if (entries[index].top <= line + 1) current = index;
      else break;
    }
    const next = current < 0 ? -1 : represent[current];
    if (next === shown && !force) return;
    if (shown >= 0 && entries[shown]) {
      entries[shown].target.removeAttribute("aria-current");
      entries[shown].item.removeAttribute("data-sphinx-preview-toc-current");
    }
    shown = next;
    if (next < 0) return;
    entries[next].target.setAttribute("aria-current", "location");
    entries[next].item.setAttribute("data-sphinx-preview-toc-current", "");
    keepVisible(entries[next].item);
  };

  const applyCollapse = (): void => {
    const hidden: boolean[] = [];
    represent = [];
    entries.forEach((entry, index) => {
      const parent = entry.parent;
      hidden[index] = parent >= 0 && (collapsedKeys.has(entries[parent].key) || hidden[parent]);
      represent[index] = hidden[index]
        ? (hidden[parent] ? represent[parent] : parent)
        : index;
      if (hidden[index]) entry.item.setAttribute("hidden", "");
      else entry.item.removeAttribute("hidden");
      entry.twisty?.setAttribute("aria-expanded", collapsedKeys.has(entry.key) ? "false" : "true");
    });
    track(true);
  };

  const rebuild = (): void => {
    dirty = false;
    const found = collect();
    list?.remove();
    const next = document.createElement("ol");
    if (found.length === 0) {
      const empty = document.createElement("p");
      empty.setAttribute("data-sphinx-preview-toc-empty", "");
      empty.textContent = "No headings";
      next.appendChild(empty);
    }
    const shallowest = Math.min(...found.map((entry) => entry.level));
    entries = [];
    shown = -1;
    for (const [position, entry] of found.entries()) {
      const item = document.createElement("li");
      item.setAttribute("data-sphinx-preview-toc-entry", "");
      item.setAttribute("data-level", String(entry.level));
      item.style.setProperty("--sphinx-preview-toc-depth", String(entry.level - shallowest));
      let parent = entries.length - 1;
      while (parent >= 0 && entries[parent].level >= entry.level) parent = entries[parent].parent;
      const key = entry.key;
      const hasChildren = (found[position + 1]?.level ?? 0) > entry.level;
      let twisty: HTMLElement | undefined;
      if (hasChildren) {
        twisty = document.createElement("button");
        twisty.setAttribute("type", "button");
        twisty.setAttribute("data-sphinx-preview-toc-twisty", "");
        twisty.setAttribute("aria-label", "Fold " + entry.text);
        twisty.addEventListener("click", (event) => {
          event.preventDefault?.();
          if (collapsedKeys.has(key)) collapsedKeys.delete(key);
          else collapsedKeys.add(key);
          const state = vscode.getState?.();
          vscode.setState?.({
            ...(state && typeof state === "object" ? state : {}),
            tocCollapsed: Array.from(collapsedKeys),
          });
          applyCollapse();
        });
        item.setAttribute("data-sphinx-preview-toc-parent", "");
        item.appendChild(twisty);
      }
      const target = document.createElement("button");
      target.setAttribute("type", "button");
      target.textContent = entry.text;
      target.addEventListener("click", (event) => {
        event.preventDefault?.();
        // Resolved at click time: a content patch may have replaced the heading since the build.
        const live = collect().find((candidate) => candidate.key === entry.key);
        scrollToHeading(live ? live.heading : entry.heading);
      });
      item.appendChild(target);
      entries.push({ ...entry, item, target, twisty, parent, top: 0 });
      next.appendChild(item);
    }
    nav.appendChild(next);
    list = next;
    layout();
    measureTops();
    applyCollapse();
  };

  const remeasure = (): void => {
    if (!open || dirty || entries.length === 0) return;
    measureTops();
    track();
  };

  const refresh = (): void => {
    dirty = true;
    if (!open || scheduled) return;
    const run = (): void => {
      scheduled = false;
      if (open && dirty) rebuild();
    };
    scheduled = true;
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(run);
    else if (typeof window.setTimeout === "function") window.setTimeout(run, 0);
    else run();
  };

  const apply = (): void => {
    document.documentElement.setAttribute("data-sphinx-preview-toc", open ? "open" : "closed");
    if (button) {
      const label = open ? "Hide table of contents" : "Show table of contents";
      button.setAttribute("aria-pressed", open ? "true" : "false");
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("data-tooltip", label);
    }
    if (open) {
      layout();
      if (dirty) refresh();
    }
  };

  apply();
  button?.addEventListener("click", () => {
    open = !open;
    apply();
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      viewToc: open,
    });
    vscode.postMessage({
      type: "previewViewPreferenceChanged",
      documentId: context.documentId,
      documentVersion: context.documentVersion,
      requestId: context.requestId,
      preference: "toc",
      value: open,
    });
    onChange();
  });
  window.addEventListener?.("resize", layout, { passive: true });
  return {
    open: () => open,
    refresh,
    rebuild,
    layout,
    track: () => track(),
    remeasure,
    collapsed: () => Array.from(collapsedKeys),
  };
}
