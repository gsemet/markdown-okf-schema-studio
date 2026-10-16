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
 * the width and hides the column on narrow panes.
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
): { open(): boolean; refresh(): void; rebuild(): void; layout(): void } {
  const contentId = "sphinx-myst-preview-content";
  const headingSelector = "h1, h2, h3, h4";
  const excluded = "[data-okf-properties], .admonition, div[class*=\"admonition-\"], "
    + "[data-sphinx-preview-block-editor], [data-sphinx-preview-sticky-headings]";
  const button = document.querySelector("[data-sphinx-preview-toc-toggle]");
  const saved = vscode.getState?.() as { viewToc?: unknown } | undefined;
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
    let text = heading.textContent ?? "";
    const permalink = heading.querySelector?.("a.headerlink, .headerlink");
    const glyph = permalink?.textContent;
    if (glyph) text = text.split(glyph).join("");
    return text.replace(/\s+/gu, " ").trim();
  };

  const rebuild = (): void => {
    dirty = false;
    const content = document.getElementById(contentId);
    const found: Array<{ heading: Element; level: number; text: string }> = [];
    for (const heading of Array.from(content?.querySelectorAll(headingSelector) ?? [])) {
      if (heading.closest?.(excluded)) continue;
      const text = headingText(heading);
      if (!text) continue;
      found.push({ heading, level: Number(heading.tagName.slice(1)), text });
    }
    list?.remove();
    const next = document.createElement("ol");
    if (found.length === 0) {
      const empty = document.createElement("p");
      empty.setAttribute("data-sphinx-preview-toc-empty", "");
      empty.textContent = "No headings";
      next.appendChild(empty);
    }
    const shallowest = Math.min(...found.map((entry) => entry.level));
    for (const entry of found) {
      const item = document.createElement("li");
      item.setAttribute("data-sphinx-preview-toc-entry", "");
      item.setAttribute("data-level", String(entry.level));
      item.style.setProperty("--sphinx-preview-toc-depth", String(entry.level - shallowest));
      const target = document.createElement("button");
      target.setAttribute("type", "button");
      target.textContent = entry.text;
      target.addEventListener("click", (event) => {
        event.preventDefault?.();
        scrollToHeading(entry.heading);
      });
      item.appendChild(target);
      next.appendChild(item);
    }
    nav.appendChild(next);
    list = next;
    layout();
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
  return { open: () => open, refresh, rebuild, layout };
}
