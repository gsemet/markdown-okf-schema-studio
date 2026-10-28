/**
 * Writing a review comment in the page (T43).
 *
 * Selecting text inside mapped body blocks shows a small "Comment" button near the selection
 * rectangle; the button, or Cmd/Ctrl+Alt+M, opens a box with a text area. Save (or Cmd/Ctrl+Enter)
 * posts `previewCommentCreate { anchor, body }` through `hooks.post`; Escape or Cancel closes the
 * box. The anchor is `{ line, endLine, quote, prefix, suffix }`: the first block's line .. the last
 * block's end line, the whitespace-collapsed selected text (at most 500 characters) and up to 32
 * characters of text before and after it in the first and last block.
 *
 * Nothing here takes over the selection: the button only cancels its own mousedown, every other
 * mouse and key event keeps its default, and the button is not shown while the mouse drags, while
 * `hooks.busy()` is true (a block editor is open, blocks are selected), or when a selection end is
 * in code, the properties table, an editor, a comment chip or included content. Every string shown
 * in the box (the quote) goes through `textContent`.
 *
 * The typed text is never dropped before the host answers: Save sends the message and waits for
 * `previewCommentResult`. `ok: true` closes the box; `ok: false` keeps the box and the text and
 * shows the reason (`textContent`, role="alert") so Save can be pressed again. If no answer comes
 * within 15 seconds the box says so and Save works again; the text stays.
 */
export function installCommentCompose(
  document: Document,
  window: Window & typeof globalThis,
  hooks: {
    post(type: string, fields: Record<string, unknown>): void;
    busy(): boolean;
    beforeOpen?(): void;
  },
): {
  refresh(): void;
  /** Feeds a `previewCommentResult` of the host; true when it answered the box. */
  result(message: { kind?: unknown; threadId?: unknown; ok?: unknown; reason?: unknown }): boolean;
  open(): boolean;
  close(): void;
  isOpen(): boolean;
} {
  const BUTTON = "data-okf-comment-create";
  const BOX = "data-okf-comment-compose";
  const INPUT = "data-okf-comment-compose-input";
  const SAVE = "data-okf-comment-compose-save";
  const CANCEL = "data-okf-comment-compose-cancel";
  const SKIP = "pre, code, script, style, textarea, svg, .katex, .math, .math-inline, .math-display, "
    + ".myst-mermaid-figure, .myst-plantuml-figure, .myst-vega-figure, [data-okf-properties], "
    + ".okf-comment, .okf-chip, [data-sphinx-preview-block-editor], [data-sphinx-preview-editing], "
    + `[data-sphinx-preview-included], [data-okf-comment-popover], [${BOX}], [${BUTTON}]`;
  const MAX_QUOTE = 500;
  const MAX_CONTEXT = 32;
  const MAX_BODY = 10000;
  const ANSWER_TIMEOUT_MS = 15000;
  let button: Element | undefined;
  let box: Element | undefined;
  let pointerDown = false;
  let current: { anchor: Record<string, unknown>; rect: { left: number; top: number; right: number; bottom: number } } | undefined;

  const elementOf = (node: Node | null | undefined): Element | null =>
    !node ? null : (node.nodeType === 1 ? node as Element : node.parentNode as Element | null);

  const textNodesOf = (block: Element): Text[] => {
    const found: Text[] = [];
    const walk = (node: Node): void => {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 3) found.push(child as Text);
        else if (child.nodeType === 1 && !(child as Element).matches(SKIP)) walk(child);
      }
    };
    walk(block);
    return found;
  };

  const collapse = (value: string): string => value.replace(/\s+/gu, " ");

  // The collapsed text of a block before (or after) a point inside one of its text nodes.
  const contextAround = (block: Element, node: Node, offset: number): { before: string; after: string } => {
    let before = "";
    let after = "";
    let seen = false;
    for (const text of textNodesOf(block)) {
      const value = text.nodeValue ?? "";
      if (text === node) {
        before += value.slice(0, offset);
        after += value.slice(offset);
        seen = true;
      } else if (seen) {
        after += value;
      } else {
        before += value;
      }
    }
    return seen ? { before: collapse(before), after: collapse(after) } : { before: "", after: "" };
  };

  const spanOf = (element: Element): [number, number] | undefined => {
    const start = Number(element.getAttribute("data-line"));
    if (!Number.isSafeInteger(start) || start < 1) return undefined;
    const endValue = Number(element.getAttribute("data-end-line"));
    return [start, Number.isSafeInteger(endValue) && endValue >= start ? endValue : start];
  };

  // The innermost mapped block around a point, unless the point is somewhere comments never go.
  const blockAt = (node: Node | null): Element | undefined => {
    const element = elementOf(node);
    if (!element || element.closest(SKIP)) return undefined;
    const block = element.closest("[data-line]");
    return block && spanOf(block) ? block : undefined;
  };

  // A selection that ends at offset 0 (a triple click ends at the start of the next block) belongs
  // to the block that comes before: the last mapped block that is not around the end point.
  const blockBefore = (end: Element): Element | undefined => {
    const all = Array.from(document.querySelectorAll("[data-line]"));
    const index = all.indexOf(end);
    for (let i = index - 1; i >= 0; i -= 1) {
      if (all[i].contains(end) || !spanOf(all[i])) continue;
      let best = all[i];
      for (let parent = best.parentNode as Element | null; parent && parent.nodeType === 1; parent = parent.parentNode as Element | null) {
        if (parent.matches?.("[data-line]") && !parent.contains(end) && spanOf(parent)) best = parent;
      }
      return best;
    }
    return undefined;
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-049
  const readSelection = (): typeof current => {
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return undefined;
    const quote = collapse(selection.toString()).trim().slice(0, MAX_QUOTE);
    if (quote === "") return undefined;
    const range = selection.getRangeAt(0);
    const startBlock = blockAt(range.startContainer);
    let endBlock = blockAt(range.endContainer);
    if (!startBlock || !endBlock) return undefined;
    if (range.endOffset === 0 && endBlock !== startBlock && !startBlock.contains(endBlock)) {
      endBlock = blockBefore(endBlock) ?? endBlock;
    }
    const startSpan = spanOf(startBlock);
    const endSpan = spanOf(endBlock);
    if (!startSpan || !endSpan) return undefined;
    const line = Math.min(startSpan[0], endSpan[0]);
    const endLine = Math.max(startSpan[1], endSpan[1]);
    const prefix = contextAround(startBlock, range.startContainer, range.startOffset).before;
    const suffix = contextAround(endBlock, range.endContainer, range.endOffset).after;
    const rectangle = range.getBoundingClientRect();
    return {
      anchor: {
        line,
        endLine,
        quote,
        prefix: prefix.slice(Math.max(0, prefix.length - MAX_CONTEXT)),
        suffix: suffix.slice(0, MAX_CONTEXT),
      },
      rect: { left: rectangle.left, top: rectangle.top, right: rectangle.right, bottom: rectangle.bottom },
    };
  };

  const place = (element: Element, rect: { left: number; right: number; bottom: number }, width: number): void => {
    const viewportWidth = window.innerWidth || 800;
    const viewportHeight = window.innerHeight || 600;
    const left = Math.max(8, Math.min(rect.right - width / 2, viewportWidth - width - 8));
    const top = Math.max(8, Math.min(rect.bottom + 6, viewportHeight - 48));
    (element as HTMLElement).style.setProperty("left", `${left}px`);
    (element as HTMLElement).style.setProperty("top", `${top}px`);
  };

  const hideButton = (): void => {
    button?.remove();
    button = undefined;
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-038
  const showButton = (): void => {
    if (!button) {
      const created = document.createElement("button");
      created.setAttribute("type", "button");
      created.setAttribute(BUTTON, "true");
      created.setAttribute("aria-label", "Add a comment on the selected text");
      created.setAttribute("aria-keyshortcuts", "Control+Alt+M Meta+Alt+M");
      created.textContent = "Comment";
      document.body.appendChild(created);
      button = created;
    }
    if (current) place(button, current.rect, 90);
  };

  const close = (): void => {
    if (sending !== undefined) window.clearTimeout(sending);
    sending = undefined;
    awaiting = false;
    box?.remove();
    box = undefined;
  };

  const refresh = (): void => {
    if (box) return;
    if (pointerDown || hooks.busy()) {
      current = undefined;
      hideButton();
      return;
    }
    current = readSelection();
    if (current) showButton();
    else hideButton();
  };

  let sending: number | undefined;
  // True from Save until the host answers, even after the safety timeout (a late answer counts).
  let awaiting = false;

  const setError = (text: string): void => {
    if (!box) return;
    let line = box.querySelector("[data-okf-comment-error]");
    if (text === "") {
      line?.remove();
      return;
    }
    if (!line) {
      line = document.createElement("div");
      line.setAttribute("data-okf-comment-error", "true");
      line.setAttribute("role", "alert");
      const actions = box.querySelector("[data-okf-comment-actions]");
      box.insertBefore(line, actions);
    }
    line.textContent = text;
  };

  const setSending = (value: boolean): void => {
    const save = box?.querySelector(`[${SAVE}]`);
    if (!save) return;
    if (value) save.setAttribute("disabled", "true");
    else save.removeAttribute("disabled");
  };

  const settle = (): void => {
    if (sending !== undefined) window.clearTimeout(sending);
    sending = undefined;
  };

  const submit = (): void => {
    const input = box?.querySelector(`[${INPUT}]`) as unknown as { value: string } | null | undefined;
    const body = input && typeof input.value === "string" ? input.value.trim() : "";
    if (body === "" || body.length > MAX_BODY || !pendingAnchor || sending !== undefined) return;
    setError("");
    setSending(true);
    awaiting = true;
    sending = window.setTimeout(() => {
      sending = undefined;
      setSending(false);
      setError("No answer from the editor. Your text is kept: try Save again.");
    }, ANSWER_TIMEOUT_MS);
    hooks.post("previewCommentCreate", { anchor: pendingAnchor, body });
  };

  const result = (message: { kind?: unknown; threadId?: unknown; ok?: unknown; reason?: unknown }): boolean => {
    if (message.kind !== "create" || !box || !awaiting) return false;
    settle();
    awaiting = false;
    if (message.ok === true) {
      close();
      pendingAnchor = undefined;
      window.getSelection?.()?.removeAllRanges?.();
      refresh();
    } else {
      setSending(false);
      setError(typeof message.reason === "string" && message.reason !== "" ? message.reason.slice(0, 500) : "The comment was not saved.");
    }
    return true;
  };
  let pendingAnchor: Record<string, unknown> | undefined;

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-044
  const open = (): boolean => {
    if (box) return true;
    current = readSelection() ?? current;
    if (!current || hooks.busy()) return false;
    hooks.beforeOpen?.();
    pendingAnchor = current.anchor;
    const root = document.createElement("div");
    root.setAttribute(BOX, "true");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "New comment");
    const quote = document.createElement("div");
    quote.setAttribute("data-okf-comment-quote", "true");
    quote.textContent = String(current.anchor.quote);
    const input = document.createElement("textarea");
    input.setAttribute(INPUT, "true");
    input.setAttribute("maxlength", String(MAX_BODY));
    input.setAttribute("rows", "3");
    input.setAttribute("aria-label", "Comment");
    input.setAttribute("placeholder", "Write a comment");
    const actions = document.createElement("div");
    actions.setAttribute("data-okf-comment-actions", "true");
    const save = document.createElement("button");
    save.setAttribute("type", "button");
    save.setAttribute(SAVE, "true");
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.setAttribute("type", "button");
    cancel.setAttribute(CANCEL, "true");
    cancel.textContent = "Cancel";
    actions.appendChild(save);
    actions.appendChild(cancel);
    root.appendChild(quote);
    root.appendChild(input);
    root.appendChild(actions);
    hideButton();
    document.body.appendChild(root);
    box = root;
    place(root, current.rect, 320);
    (input as HTMLElement).focus?.();
    return true;
  };

  document.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(`[${BUTTON}]`)) {
      // Keeps the selection while the button is pressed.
      event.preventDefault();
      return;
    }
    if (target instanceof Element && target.closest(`[${BOX}]`)) return;
    pointerDown = true;
  }, true);
  const released = (): void => {
    if (!pointerDown) return;
    pointerDown = false;
    refresh();
  };
  document.addEventListener("mouseup", released, true);
  document.addEventListener("dragend", released, true);
  window.addEventListener("blur", released);
  document.addEventListener("selectionchange", () => refresh());
  window.addEventListener("scroll", () => { if (button || current) refresh(); }, { passive: true } as AddEventListenerOptions);
  window.addEventListener("resize", () => refresh());

  // Block selection (Shift+click, Shift+Arrows) and editors change `busy()` without moving the text
  // selection: look again once the other handlers of the event ran. Nothing is cancelled here.
  const later = (): void => { window.setTimeout(refresh, 0); };
  document.addEventListener("click", later, true);
  document.addEventListener("keyup", later, true);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(`[${BUTTON}]`)) {
      event.preventDefault();
      open();
    } else if (target.closest(`[${SAVE}]`)) {
      event.preventDefault();
      submit();
    } else if (target.closest(`[${CANCEL}]`)) {
      event.preventDefault();
      close();
      refresh();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(`[${BOX}]`)) {
      if (event.key === "Escape") {
        close();
        refresh();
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing) {
        event.preventDefault();
        submit();
      }
      // Typing in the box stays in the box: no other key handler of the page sees it.
      event.stopImmediatePropagation();
      return;
    }
    // Cmd/Ctrl+Alt+M comments on the current selection. `code` backs the key because Option
    // changes the character on macOS.
    const mod = event.metaKey || event.ctrlKey;
    const isM = event.key === "m" || event.key === "M" || event.code === "KeyM";
    if (!mod || !event.altKey || event.shiftKey || !isM) return;
    if (open()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  return { refresh, result, open, close, isOpen: () => box !== undefined };
}
