import {
  hasSection,
  headingFoldKey,
  normalizeHeadingFolds,
  planHeadingFold,
  withDocumentFolds,
  type FoldBlock,
  type HeadingFolds,
} from "../../core/state/headingFold";

export interface HeadingFoldContext {
  documentId: string;
}

export interface HeadingFoldHooks {
  /** The reading line in viewport pixels: the current section is the one that holds it. */
  readingLine(): number;
  /** Runs after the layout changed, so the page keeps its reading line. */
  onLayoutChange(): void;
  /** True while an editor is open: the sections do not fold under it. */
  busy(): boolean;
}

export interface HeadingFold {
  /** Applies the fold state to the content (call after the content changed). */
  apply(): void;
  /** Folds or unfolds the section of one heading of the content. */
  toggle(heading: Element): void;
  foldAll(): void;
  unfoldAll(): void;
  /** Folds or unfolds the current section: the focused heading's, or the one at the reading line. */
  toggleCurrent(): void;
  /** Unfolds every folded section that holds `target`; true when the layout changed. */
  reveal(target: Element): boolean;
  /** True when any section is folded. */
  anyFolded(): boolean;
  /** The folded headings of every document the page remembers (kept in the webview state). */
  state(): HeadingFolds;
}

const CONTENT_ID = "sphinx-myst-preview-content";
/** True when the element carries the attribute (read through `getAttribute`, as the page does). */
const has = (element: Element, name: string): boolean => element.getAttribute(name) !== null;
const HEADING_PATTERN = /^H([1-6])$/u;

/** The key a fold-all button of the toolbar reads: pressed while any section is folded. */
const FOLD_BUTTON = "[data-sphinx-preview-fold-toggle]";

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-003
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-004
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-005
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-006
/**
 * Folding of the sections of the content. Each heading that has blocks after it gets a chevron
 * button; a folded section hides its blocks with `hidden="until-found"`, so the browser find still
 * reaches the text and asks the page (`beforematch`) to unfold the section. The folded headings
 * are keys (level, text, occurrence) kept per document in the webview state, applied again after
 * every content update. Nothing is written to the document.
 */
export function installHeadingFold(
  document: Document,
  window: Window & typeof globalThis,
  vscode: {
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: HeadingFoldContext,
  hooks: HeadingFoldHooks,
): HeadingFold {
  const saved = vscode.getState?.() as { headingFolds?: unknown } | undefined;
  let folds = normalizeHeadingFolds(saved?.headingFolds);
  const keys = new Set<string>(folds[context.documentId] ?? []);
  const button = document.querySelector?.(FOLD_BUTTON);

  const content = (): HTMLElement | null => document.getElementById?.(CONTENT_ID) ?? null;
  const levelOf = (element: Element): FoldBlock => {
    const match = HEADING_PATTERN.exec(element.tagName ?? "");
    return match ? Number(match[1]) : undefined;
  };

  // A comment chip and its hidden body are not part of a heading's wording.
  const headingText = (heading: Element): string => {
    let source: Element = heading;
    if (typeof heading.cloneNode === "function" && heading.querySelector?.(".okf-comment")) {
      source = heading.cloneNode(true) as Element;
      source.querySelectorAll?.(".okf-comment").forEach((comment) => comment.remove());
    }
    return (source.textContent ?? "").replace(/\s+/gu, " ").trim();
  };

  interface Layout {
    blocks: HTMLElement[];
    levels: FoldBlock[];
    keys: Array<string | undefined>;
  }
  const layout = (): Layout => {
    const blocks = Array.from(content()?.children ?? []) as HTMLElement[];
    const levels = blocks.map(levelOf);
    const seen = new Map<string, number>();
    const headingKeys = blocks.map((block, index) => {
      const level = levels[index];
      if (level === undefined) return undefined;
      const text = headingText(block);
      const base = `${level}|${text}`;
      const occurrence = seen.get(base) ?? 0;
      seen.set(base, occurrence + 1);
      return headingFoldKey(level, text, occurrence);
    });
    return { blocks, levels, keys: headingKeys };
  };

  const persist = (): void => {
    folds = withDocumentFolds(folds, context.documentId, Array.from(keys));
    const state = vscode.getState?.();
    vscode.setState?.({ ...(state && typeof state === "object" ? state : {}), headingFolds: folds });
  };

  const setToggle = (heading: HTMLElement, foldable: boolean, folded: boolean, text: string): void => {
    let toggle = Array.from(heading.children).find((child) => has(child, "data-okf-fold-toggle")) as
      HTMLElement | undefined;
    if (!foldable) {
      toggle?.remove();
      heading.removeAttribute("data-okf-fold");
      return;
    }
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.setAttribute("type", "button");
      toggle.setAttribute("data-okf-fold-toggle", "");
      toggle.setAttribute("contenteditable", "false");
      heading.insertBefore(toggle, heading.firstChild);
    }
    const label = `${folded ? "Unfold" : "Fold"} section: ${text}`;
    toggle.setAttribute("aria-expanded", folded ? "false" : "true");
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", folded ? "Unfold section" : "Fold section");
    heading.setAttribute("data-okf-fold", folded ? "closed" : "open");
  };

  const syncButton = (folded: boolean): void => {
    if (!button) return;
    const label = folded ? "Unfold all sections" : "Fold all sections";
    button.setAttribute("aria-pressed", folded ? "true" : "false");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("data-tooltip", label);
  };

  const anyFoldedNow = (): boolean => {
    const { levels, keys: headingKeys } = layout();
    return headingKeys.some((key, index) => key !== undefined && keys.has(key) && hasSection(levels, index));
  };

  const apply = (): void => {
    const { blocks, levels, keys: headingKeys } = layout();
    const folded = new Set<number>();
    headingKeys.forEach((key, index) => {
      if (key !== undefined && keys.has(key) && hasSection(levels, index)) folded.add(index);
    });
    const hidden = planHeadingFold(levels, folded);
    blocks.forEach((block, index) => {
      if (hidden[index]) {
        if (!has(block, "data-okf-folded")) block.setAttribute("data-okf-folded", "");
        if (block.getAttribute("hidden") !== "until-found") block.setAttribute("hidden", "until-found");
      } else if (has(block, "data-okf-folded")) {
        block.removeAttribute("data-okf-folded");
        block.removeAttribute("hidden");
      }
      if (levels[index] !== undefined) {
        setToggle(block, hasSection(levels, index), folded.has(index), headingText(block));
      }
    });
    syncButton(folded.size > 0);
  };

  const change = (update: () => boolean): void => {
    if (hooks.busy()) return;
    if (!update()) return;
    persist();
    apply();
    hooks.onLayoutChange();
  };

  const toggleKey = (key: string): boolean => {
    if (keys.has(key)) keys.delete(key);
    else keys.add(key);
    return true;
  };

  const toggle = (heading: Element): void => {
    change(() => {
      const index = layout().blocks.indexOf(heading as HTMLElement);
      const key = layout().keys[index];
      return key === undefined ? false : toggleKey(key);
    });
  };

  const foldAll = (): void => {
    change(() => {
      const { levels, keys: headingKeys } = layout();
      const before = keys.size;
      headingKeys.forEach((key, index) => {
        if (key !== undefined && hasSection(levels, index)) keys.add(key);
      });
      return keys.size !== before;
    });
  };

  const unfoldAll = (): void => {
    change(() => {
      if (keys.size === 0) return false;
      keys.clear();
      return true;
    });
  };

  const currentHeadingIndex = (): number | undefined => {
    const { blocks, levels } = layout();
    const headings = blocks.map((_block, index) => index).filter((index) => levels[index] !== undefined
      && !has(blocks[index]!, "data-okf-folded"));
    if (headings.length === 0) return undefined;
    const active = document.activeElement;
    const focused = active ? headings.find((index) => blocks[index]!.contains(active)) : undefined;
    let current = focused;
    if (current === undefined) {
      const line = hooks.readingLine() + 2;
      current = headings[0];
      for (const index of headings) {
        if (blocks[index]!.getBoundingClientRect().top <= line) current = index;
      }
    }
    return current;
  };

  const toggleCurrent = (): void => {
    change(() => {
      let index = currentHeadingIndex();
      if (index === undefined) return false;
      const { levels, keys: headingKeys } = layout();
      // A heading without a section of its own belongs to the section of the heading above it.
      while (index !== undefined && !hasSection(levels, index)) {
        const level = levels[index]!;
        let parent: number | undefined;
        for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
          const candidateLevel = levels[candidate];
          if (candidateLevel !== undefined && candidateLevel < level) {
            parent = candidate;
            break;
          }
        }
        index = parent;
      }
      const key = index === undefined ? undefined : headingKeys[index];
      return key === undefined ? false : toggleKey(key);
    });
  };

  const reveal = (target: Element): boolean => {
    if (keys.size === 0) return false;
    const { blocks, levels, keys: headingKeys } = layout();
    const block = blocks.find((candidate) => candidate === target || candidate.contains(target));
    if (!block) return false;
    const position = blocks.indexOf(block);
    let changed = false;
    headingKeys.forEach((key, index) => {
      if (key === undefined || !keys.has(key) || index >= position || !hasSection(levels, index)) return;
      const level = levels[index]!;
      for (let next = index + 1; next <= position; next += 1) {
        const nextLevel = levels[next];
        if (nextLevel !== undefined && nextLevel <= level) return;
      }
      keys.delete(key);
      changed = true;
    });
    if (!changed) return false;
    persist();
    apply();
    return true;
  };

  // The browser find found text inside a folded section: unfold it before the match is shown.
  document.addEventListener("beforematch", (event) => {
    if (event.target instanceof Element && reveal(event.target)) hooks.onLayoutChange();
  }, true);

  // The chevron. Registered at install, before the page's own click handlers, and it stops the
  // click: pressing a chevron neither opens an editor nor reveals the source.
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-okf-fold-toggle]") : null;
    if (!target) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    const heading = target.parentElement;
    if (heading) toggle(heading);
  });

  button?.addEventListener("click", () => (anyFoldedNow() ? unfoldAll() : foldAll()));

  // The section shortcut: Ctrl+Alt+[ (Cmd+Alt+[ on macOS), the keys of VS Code's own Fold command.
  window.addEventListener("keydown", (event) => {
    if (event.code !== "BracketLeft" || !event.altKey || !(event.ctrlKey || event.metaKey) || event.shiftKey) return;
    const target = event.target instanceof Element ? event.target : undefined;
    if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      || (target as HTMLElement).isContentEditable)) return;
    event.preventDefault();
    toggleCurrent();
  });

  return {
    apply,
    toggle,
    foldAll,
    unfoldAll,
    toggleCurrent,
    reveal,
    anyFolded: anyFoldedNow,
    state: () => folds,
  };
}
