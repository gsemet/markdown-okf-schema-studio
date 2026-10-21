export interface PageCommentEntry {
  id: string;
  author: string;
  createdAt: string;
  body: string;
}

export interface PageCommentThread {
  id: string;
  anchor: { line: number; endLine: number; quote: string; prefix: string; suffix: string };
  resolved: boolean;
  createdAt: string;
  comments: PageCommentEntry[];
}

/**
 * Review comments in the page (T42). Injected into the page script with `.toString()`, so the body
 * must not use anything defined outside it.
 *
 * Thread content comes from a file next to the document and is untrusted: every string reaches the
 * page through `textContent` or `setAttribute`, never as markup. For each thread the innermost
 * mapped block (`data-line` .. `data-end-line`) that covers the anchor line is searched for the
 * first occurrence of the quote inside ONE text node (a quote that spans several elements is not
 * found); that text is wrapped in `mark[data-okf-comment-thread]`. A thread whose quote is not
 * found gets an empty `button[data-okf-comment-badge]` on its block instead. Code, diagrams, math,
 * the properties table and open inline editors are never touched (O10). The last threads are
 * kept, so `apply()` puts them back on content that was replaced by a patch; it first removes what
 * an earlier run added, so running it twice changes nothing. Clicking a mark or badge opens a
 * popover with the thread (author, date, plain-text bodies, resolved state).
 */
export function installCommentThreads(document: Document, window: Window & typeof globalThis): {
  setThreads(threads: unknown): void;
  apply(): void;
  close(): void;
  openThread(id: string): boolean;
} {
  const MARK = "data-okf-comment-thread";
  const BADGE = "data-okf-comment-badge";
  const BADGED = "data-okf-comment-badged";
  const POPOVER = "data-okf-comment-popover";
  const SKIP = "pre, code, script, style, textarea, svg, .katex, .math, .math-inline, .math-display, "
    + ".myst-mermaid-figure, .myst-plantuml-figure, [data-okf-properties], "
    + ".okf-comment, .okf-chip, [data-sphinx-preview-block-editor], [data-sphinx-preview-editing], "
    + "[data-sphinx-preview-included], "
    + `[${MARK}], [${BADGE}], [${POPOVER}]`;
  const EDITING = "[data-sphinx-preview-block-editor], [data-sphinx-preview-editing]";
  const NEXT_TO = new Set(["TABLE", "THEAD", "TBODY", "TR", "UL", "OL", "DL", "PRE", "DETAILS", "IMG", "HR", "SVG"]);
  const MAX_THREADS = 1000;
  const MAX_COMMENTS = 200;
  const MAX_TEXT = 10000;
  let threads: PageCommentThread[] = [];
  let popover: Element | undefined;
  let openId: string | undefined;

  const text = (value: unknown): string => (typeof value === "string" ? value.slice(0, MAX_TEXT) : "");

  // Keeps only well-formed threads, as fresh objects (the host validated them already).
  const sanitize = (value: unknown): PageCommentThread[] => {
    if (!Array.isArray(value)) return [];
    const result: PageCommentThread[] = [];
    for (const raw of value.slice(0, MAX_THREADS)) {
      if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || raw.id === "") continue;
      const anchor = raw.anchor;
      if (!anchor || !Number.isSafeInteger(anchor.line) || anchor.line < 1) continue;
      if (!Array.isArray(raw.comments)) continue;
      const comments: PageCommentEntry[] = [];
      for (const comment of raw.comments.slice(0, MAX_COMMENTS)) {
        if (!comment || typeof comment !== "object") continue;
        comments.push({
          id: text(comment.id),
          author: text(comment.author),
          createdAt: text(comment.createdAt),
          body: text(comment.body),
        });
      }
      result.push({
        id: text(raw.id),
        anchor: {
          line: anchor.line,
          endLine: Number.isSafeInteger(anchor.endLine) && anchor.endLine >= anchor.line ? anchor.endLine : anchor.line,
          quote: text(anchor.quote),
          prefix: text(anchor.prefix),
          suffix: text(anchor.suffix),
        },
        resolved: raw.resolved === true,
        createdAt: text(raw.createdAt),
        comments,
      });
    }
    return result;
  };

  const close = (): void => {
    popover?.remove();
    popover = undefined;
    openId = undefined;
  };

  // Puts back the text a mark wrapped and merges it with its neighbouring text nodes.
  const unwrap = (mark: Element): void => {
    const parent = mark.parentNode;
    if (!parent) return;
    let merged = document.createTextNode(mark.textContent ?? "");
    parent.replaceChild(merged, mark);
    const before = merged.previousSibling;
    if (before && before.nodeType === 3) {
      before.nodeValue = (before.nodeValue ?? "") + (merged.nodeValue ?? "");
      parent.removeChild(merged);
      merged = before as Text;
    }
    const after = merged.nextSibling;
    if (after && after.nodeType === 3) {
      merged.nodeValue = (merged.nodeValue ?? "") + (after.nodeValue ?? "");
      parent.removeChild(after);
    }
  };

  // What the last run added, so clearing never searches the page (and works after a patch).
  let addedMarks: Element[] = [];
  let addedBadges: Element[] = [];
  let badgedBlocks: Element[] = [];

  const clear = (): void => {
    addedMarks.forEach(unwrap);
    addedBadges.forEach((badge) => badge.remove());
    badgedBlocks.forEach((block) => block.removeAttribute(BADGED));
    addedMarks = [];
    addedBadges = [];
    badgedBlocks = [];
  };

  const spanOf = (element: Element): [number, number] | undefined => {
    const start = Number(element.getAttribute("data-line"));
    if (!Number.isFinite(start)) return undefined;
    const endValue = Number(element.getAttribute("data-end-line"));
    return [start, Number.isFinite(endValue) && endValue >= start ? endValue : start];
  };

  // The innermost mapped block that covers the line (smallest span; the deeper one on a tie).
  const blockFor = (line: number): Element | undefined => {
    let best: Element | undefined;
    let bestSize = Infinity;
    document.querySelectorAll("[data-line]").forEach((element) => {
      const span = spanOf(element);
      if (!span || line < span[0] || line > span[1]) return;
      if (element.closest(EDITING) || element.closest("[data-okf-properties]")) return;
      // Included content carries the lines of ANOTHER file; a skipped ancestor (diagram, chip,
      // math, code) never holds a commentable block.
      if (element.closest("[data-sphinx-preview-included]")) return;
      const container = element.parentNode as Element | null;
      if (container && container.nodeType === 1 && container.closest(SKIP)) return;
      const size = span[1] - span[0];
      if (size <= bestSize) {
        best = element;
        bestSize = size;
      }
    });
    return best;
  };

  const textNodesOf = (block: Element): Text[] => {
    const found: Text[] = [];
    const walk = (node: Node): void => {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 3) {
          found.push(child as Text);
        } else if (child.nodeType === 1 && !(child as Element).matches(SKIP)) {
          walk(child);
        }
      }
    };
    if (!block.matches(SKIP)) walk(block);
    return found;
  };

  const attach = (thread: PageCommentThread): boolean => {
    const quote = thread.anchor.quote;
    if (quote === "") return false;
    const block = blockFor(thread.anchor.line);
    if (!block) return false;
    const variants = [quote];
    const collapsed = quote.replace(/\s+/gu, " ");
    if (collapsed !== quote) variants.push(collapsed);
    for (const node of textNodesOf(block)) {
      const value = node.nodeValue ?? "";
      for (const variant of variants) {
        const index = value.indexOf(variant);
        if (index < 0) continue;
        const parent = node.parentNode;
        if (!parent) continue;
        const mark = document.createElement("mark");
        mark.setAttribute(MARK, thread.id);
        if (thread.resolved) mark.setAttribute("data-okf-comment-resolved", "true");
        mark.setAttribute("tabindex", "0");
        mark.setAttribute("role", "button");
        mark.setAttribute("aria-haspopup", "dialog");
        mark.textContent = value.slice(index, index + variant.length);
        if (index === 0) {
          // No empty text node before the mark: clear() then restores the original structure.
          parent.replaceChild(mark, node);
        } else {
          node.nodeValue = value.slice(0, index);
          parent.insertBefore(mark, node.nextSibling);
        }
        addedMarks.push(mark);
        const rest = value.slice(index + variant.length);
        if (rest !== "") parent.insertBefore(document.createTextNode(rest), mark.nextSibling);
        return true;
      }
    }
    return false;
  };

  // A badge has no text, so a block keeps its text content (headings, edit offsets); the stylesheet
  // draws it. It sits inside the block, or after it when the block cannot take children.
  const badge = (thread: PageCommentThread): void => {
    const block = blockFor(thread.anchor.line);
    if (!block) return;
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute(BADGE, thread.id);
    if (thread.resolved) button.setAttribute("data-okf-comment-resolved", "true");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-label", `Comment thread, ${thread.comments.length} comment${thread.comments.length === 1 ? "" : "s"}`);
    if (block.matches(SKIP) || NEXT_TO.has(block.tagName.toUpperCase())) {
      button.setAttribute("data-okf-comment-badge-after", "true");
      block.parentNode?.insertBefore(button, block.nextSibling);
    } else {
      block.setAttribute(BADGED, "true");
      badgedBlocks.push(block);
      block.appendChild(button);
    }
    addedBadges.push(button);
  };

  const apply = (): void => {
    // An open popover stays open across a re-apply (a render re-posts the same threads) when its
    // thread is still there; the holder is the new mark or badge.
    const reopen = openId;
    close();
    clear();
    if (threads.length === 0) return;
    for (const thread of threads) {
      if (!attach(thread)) badge(thread);
    }
    if (reopen !== undefined) {
      const holder = [...addedMarks, ...addedBadges].find((candidate) => idOf(candidate) === reopen);
      const thread = threads.find((candidate) => candidate.id === reopen);
      if (holder && thread) open(thread, holder);
    }
  };

  const formatDate = (iso: string): string => {
    const time = Date.parse(iso);
    if (Number.isNaN(time)) return iso;
    try {
      return new Date(time).toLocaleString();
    } catch {
      return iso;
    }
  };

  const position = (target: Element): void => {
    if (!popover) return;
    const rectangle = target.getBoundingClientRect();
    const width = Math.min(360, Math.max(200, (window.innerWidth || 800) - 16));
    const left = Math.max(8, Math.min(rectangle.left, (window.innerWidth || 800) - width - 8));
    const top = Math.min(rectangle.bottom + 6, Math.max(8, (window.innerHeight || 600) - 120));
    (popover as HTMLElement).style.setProperty("width", `${width}px`);
    (popover as HTMLElement).style.setProperty("left", `${left}px`);
    (popover as HTMLElement).style.setProperty("top", `${top}px`);
  };

  const open = (thread: PageCommentThread, target: Element): void => {
    close();
    const root = document.createElement("div");
    root.setAttribute(POPOVER, thread.id);
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Comment thread");
    if (thread.resolved) root.setAttribute("data-okf-comment-resolved", "true");
    if (thread.resolved) {
      const state = document.createElement("div");
      state.setAttribute("data-okf-comment-state", "resolved");
      state.textContent = "Resolved";
      root.appendChild(state);
    }
    for (const comment of thread.comments) {
      const item = document.createElement("div");
      item.setAttribute("data-okf-comment-entry", "true");
      const head = document.createElement("div");
      head.setAttribute("data-okf-comment-head", "true");
      const author = document.createElement("strong");
      author.textContent = comment.author;
      const date = document.createElement("span");
      date.textContent = formatDate(comment.createdAt);
      head.appendChild(author);
      head.appendChild(date);
      const body = document.createElement("div");
      body.setAttribute("data-okf-comment-body", "true");
      body.textContent = comment.body;
      item.appendChild(head);
      item.appendChild(body);
      root.appendChild(item);
    }
    document.body.appendChild(root);
    popover = root;
    openId = thread.id;
    position(target);
  };

  const holderOf = (target: Element): Element | null => target.closest(`[${MARK}], [${BADGE}]`);
  const idOf = (holder: Element): string | null => holder.getAttribute(MARK) ?? holder.getAttribute(BADGE);

  const toggle = (holder: Element): boolean => {
    const id = idOf(holder);
    const thread = threads.find((candidate) => candidate.id === id);
    if (!thread) return false;
    if (openId === thread.id) close();
    else open(thread, holder);
    return true;
  };

  // Registered in the capture phase, before the handlers that edit or reveal the clicked block.
  const intercept = (event: Event): void => {
    const target = event.target;
    const holder = target instanceof Element ? holderOf(target) : null;
    if (!holder) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === "click") toggle(holder);
  };
  document.addEventListener("click", intercept, true);
  document.addEventListener("dblclick", intercept, true);
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (event.key === "Escape") {
      if (!popover) return;
      close();
      event.stopImmediatePropagation();
      return;
    }
    const holder = target instanceof Element ? holderOf(target) : null;
    if ((event.key !== "Enter" && event.key !== " ") || !holder) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(holder);
  }, true);
  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!popover || (target instanceof Element && (target.closest(`[${POPOVER}]`) || holderOf(target)))) return;
    close();
  }, true);

  return {
    setThreads(next) {
      threads = sanitize(next);
      apply();
    },
    apply,
    close,
    openThread(id) {
      // Compared in code, never put into a selector: the id is file data.
      const holder = Array.from(document.querySelectorAll(`[${MARK}], [${BADGE}]`))
        .find((candidate) => idOf(candidate) === id);
      return holder ? toggle(holder) : false;
    },
  };
}
