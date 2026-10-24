export interface ChipToggleContext {
  /** False hides the gray comment chips; true (the default) shows them. */
  showComments?: boolean;
}

/**
 * Expansion of the comment and TODO chips, and the show-comments switch. Injected into the page
 * script with `.toString()`, so the body must not use anything defined outside it.
 *
 * A comment is `.okf-comment` holding an `.okf-chip` and a hidden `.okf-comment-body` (text only).
 * Clicking the chip, or Enter or Space on it, shows or hides the body. A chip without a body (the
 * word TODO in prose) does nothing. Which comments are open is kept per panel, in the webview
 * state, under the key "<source line>:<nth comment of that line>" (the line is the comment's own
 * `data-line` or that of the block around it), so it survives a content patch and a reload.
 * `onLayoutChange` runs after a change that moves the content, so the page keeps its reading line.
 */
export function installChipToggle(
  document: Document,
  vscode: {
    getState?(): unknown;
    setState?(state: unknown): void;
  },
  context: ChipToggleContext,
  onLayoutChange: () => void,
): {
  apply(): void;
  expanded(): string[];
  setShowComments(show: boolean): void;
} {
  const expandedKeys = new Set<string>();
  const saved = vscode.getState?.() as { expandedChips?: unknown } | undefined;
  if (saved && Array.isArray(saved.expandedChips)) {
    for (const key of saved.expandedChips) {
      if (typeof key === "string") expandedKeys.add(key);
    }
  }

  const partsOf = (comment: Element): { chip: Element; body: HTMLElement } | undefined => {
    let chip: Element | undefined;
    let body: Element | undefined;
    for (const child of Array.from(comment.children)) {
      if (child.classList.contains("okf-chip")) chip = child;
      else if (child.classList.contains("okf-comment-body")) body = child;
    }
    return chip && body ? { chip, body: body as HTMLElement } : undefined;
  };

  // Every comment with its key, in document order.
  const keyedComments = (): Array<{ comment: Element; key: string }> => {
    const counters = new Map<string, number>();
    return Array.from(document.querySelectorAll(".okf-comment")).filter(
      (comment) => comment.classList?.contains("okf-comment") && comment.children,
    ).map((comment) => {
      const line = comment.closest("[data-line]")?.getAttribute("data-line") ?? "0";
      const index = counters.get(line) ?? 0;
      counters.set(line, index + 1);
      return { comment, key: `${line}:${index}` };
    });
  };

  const show = (comment: Element, open: boolean): void => {
    const parts = partsOf(comment);
    if (!parts) return;
    parts.chip.setAttribute("aria-expanded", open ? "true" : "false");
    parts.body.hidden = !open;
  };

  const persist = (): void => {
    const state = vscode.getState?.();
    vscode.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      expandedChips: Array.from(expandedKeys),
    });
  };

  const toggle = (chip: Element): void => {
    const comment = chip.parentElement;
    if (!comment || !comment.classList.contains("okf-comment") || !partsOf(comment)) return;
    const entry = keyedComments().find((candidate) => candidate.comment === comment);
    if (!entry) return;
    const open = !expandedKeys.has(entry.key);
    if (open) expandedKeys.add(entry.key);
    else expandedKeys.delete(entry.key);
    show(comment, open);
    persist();
    onLayoutChange();
  };

  const chipOf = (target: EventTarget | null): Element | undefined => {
    const element = target as Element | null;
    return (element && typeof element.closest === "function"
      ? element.closest(".okf-chip")
      : null) ?? undefined;
  };

  document.addEventListener("click", (event) => {
    const chip = chipOf(event.target);
    if (chip) toggle(chip);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const chip = chipOf(event.target);
    if (!chip || !chip.parentElement?.classList.contains("okf-comment") || !partsOf(chip.parentElement)) return;
    event.preventDefault();
    toggle(chip);
  });

  let shown: boolean | undefined;
  const setShowComments = (next: boolean): void => {
    const changed = shown !== undefined && shown !== next;
    shown = next;
    document.documentElement.setAttribute("data-okf-show-comments", next ? "true" : "false");
    if (changed) onLayoutChange();
  };
  setShowComments(context.showComments !== false);

  return {
    // Re-applies the saved state to the current content (after a load or a content patch).
    apply() {
      const entries = keyedComments();
      const present = new Set(entries.map((entry) => entry.key));
      let pruned = false;
      for (const key of Array.from(expandedKeys)) {
        if (!present.has(key)) {
          expandedKeys.delete(key);
          pruned = true;
        }
      }
      for (const { comment, key } of entries) show(comment, expandedKeys.has(key));
      if (pruned) persist();
    },
    expanded: () => Array.from(expandedKeys),
    setShowComments,
  };
}
