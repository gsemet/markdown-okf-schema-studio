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
  /**
   * T45: the host's verdict after re-anchoring. `true`: list in the Orphaned box without looking at
   * the page; `false`: the host placed the thread, so its lines are trusted and the page does not
   * search the quote elsewhere; absent: the page decides alone (T44 rules).
   */
  orphaned?: boolean;
}

/**
 * Review comments in the page (T42).
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
 * popover with the thread (author, date, plain-text bodies, resolved state). When `hooks.reply`
 * is given (writable previews only, T43), the popover ends with a reply box: Reply or
 * Cmd/Ctrl+Enter hands the thread id and the trimmed text (1 to 10 000 characters) to the hook.
 * The text stays in the box until the host answers `ok: true` through `result()`; a refusal shows
 * its reason (`textContent`, role="alert") and keeps the text, and so does a missing answer after
 * 15 seconds. A reply draft survives the threads being posted again while its thread exists.
 *
 * T44: `hooks.resolve` and `hooks.remove` (writable previews only) add Resolve / Reopen and Delete
 * to the popover. Delete asks "Delete thread?" with Yes / No inside the popover (no
 * `window.confirm`). Both wait for the host's answer like a reply: nothing changes before the
 * thread list is posted again, and a refusal shows its reason in an alert line.
 *
 * A thread the page cannot place (no mapped block at its line and the quote found in no eligible
 * block) is listed in an "Orphaned comments" box that this module creates after the content
 * element, never inside it, and re-creates on every `apply()`. Each entry opens the same popover.
 * The page never writes anything for an orphan: the thread stays in the file untouched.
 *
 * T45: the host re-anchors threads against the document text and posts `orphaned` with each
 * thread. `orphaned: true` goes straight to the box; `orphaned: false` trusts the posted lines
 * (the page never searches the quote elsewhere for such a thread). Threads without the field
 * (older hosts, tests) keep the T44 placement rules.
 */
export function installCommentThreads(
  document: Document,
  window: Window & typeof globalThis,
  hooks?: {
    reply?: (threadId: string, body: string) => void;
    resolve?: (threadId: string, resolved: boolean) => void;
    remove?: (threadId: string) => void;
  },
): {
  setThreads(threads: unknown): void;
  apply(): void;
  close(): void;
  openThread(id: string): boolean;
  /** Feeds a `previewCommentResult` of the host; true when it answered a reply. */
  result(message: { kind?: unknown; threadId?: unknown; ok?: unknown; reason?: unknown }): boolean;
} {
  const MARK = "data-okf-comment-thread";
  const BADGE = "data-okf-comment-badge";
  const BADGED = "data-okf-comment-badged";
  const POPOVER = "data-okf-comment-popover";
  const REPLY_INPUT = "data-okf-comment-reply-input";
  const REPLY_SEND = "data-okf-comment-reply-send";
  const ORPHAN = "data-okf-comment-orphan";
  const ORPHANS = "data-okf-orphans";
  const ACTIONS = "data-okf-comment-thread-actions";
  const ACTION_ERROR = "data-okf-comment-action-error";
  const SKIP = "pre, code, script, style, textarea, svg, .katex, .math, .math-inline, .math-display, "
    + ".myst-mermaid-figure, .myst-plantuml-figure, [data-okf-properties], "
    + ".okf-comment, .okf-chip, [data-sphinx-preview-block-editor], [data-sphinx-preview-editing], "
    + "[data-sphinx-preview-included], "
    + `[${MARK}], [${BADGE}], [${POPOVER}]`;
  const EDITING = "[data-sphinx-preview-block-editor], [data-sphinx-preview-editing]";
  const NEXT_TO = new Set(["TABLE", "THEAD", "TBODY", "TR", "UL", "OL", "DL", "PRE", "DETAILS", "IMG", "HR", "SVG"]);
  // A quote must have this many characters (whitespace collapsed) to be searched for elsewhere.
  const MIN_MOVED_QUOTE = 12;
  const MAX_THREADS = 1000;
  const MAX_COMMENTS = 200;
  const MAX_TEXT = 10000;
  let threads: PageCommentThread[] = [];
  let popover: Element | undefined;
  let openId: string | undefined;
  const ANSWER_TIMEOUT_MS = 15000;
  // The reply waiting for the host's answer; it outlives a rebuilt popover (threads posted again).
  let sent: { threadId: string; body: string; timer?: number; waiting: boolean; error: string } | undefined;

  // The resolve or delete waiting for the host's answer, and the thread whose Delete is being asked.
  let act: { threadId: string; kind: "resolve" | "delete"; timer?: number; waiting: boolean; error: string } | undefined;
  let confirming: string | undefined;
  let orphanBox: Element | undefined;
  let addedOrphans: Element[] = [];

  const text = (value: unknown): string => (typeof value === "string" ? value.slice(0, MAX_TEXT) : "");

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-001
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
        ...(typeof raw.orphaned === "boolean" ? { orphaned: raw.orphaned } : {}),
      });
    }
    return result;
  };

  const replyInput = (): { value: string } | undefined =>
    (popover?.querySelector(`[${REPLY_INPUT}]`) ?? undefined) as unknown as { value: string } | undefined;

  // Shows the state of `sent` in the open popover: error line and Reply button.
  const paintReply = (): void => {
    if (!popover) return;
    paintActions();
    const reply = popover.querySelector("[data-okf-comment-reply]");
    const send = popover.querySelector(`[${REPLY_SEND}]`);
    if (!reply || !send) return;
    const mine = sent !== undefined && sent.threadId === openId;
    if (pendingFor(openId)) send.setAttribute("disabled", "true");
    else send.removeAttribute("disabled");
    let line = popover.querySelector("[data-okf-comment-error]");
    const text = mine ? sent!.error : "";
    if (text === "") {
      line?.remove();
      return;
    }
    if (!line) {
      line = document.createElement("div");
      line.setAttribute("data-okf-comment-error", "true");
      line.setAttribute("role", "alert");
      reply.insertBefore(line, send);
    }
    line.textContent = text;
  };

  // A resolve, a delete or a reply of this thread is waiting for the host: the others wait too.
  const pendingFor = (threadId: string | undefined): boolean =>
    (act !== undefined && act.threadId === threadId && act.timer !== undefined)
    || (sent !== undefined && sent.threadId === threadId && sent.timer !== undefined);

  const actionButton = (label: string, attribute: string, disabled: boolean): Element => {
    const element = document.createElement("button");
    element.setAttribute("type", "button");
    element.setAttribute(attribute, "true");
    element.textContent = label;
    if (disabled) element.setAttribute("disabled", "true");
    return element;
  };

  // Resolve / Reopen and Delete, or the Delete question, plus the alert line of a refused action.
  const paintActions = (): void => {
    if (!popover) return;
    const row = popover.querySelector(`[${ACTIONS}]`);
    if (!row) return;
    const thread = threads.find((candidate) => candidate.id === openId);
    row.textContent = "";
    const busy = pendingFor(openId);
    if (confirming !== undefined && confirming === openId) {
      const ask = document.createElement("span");
      ask.setAttribute("data-okf-comment-confirm", "true");
      ask.textContent = "Delete thread?";
      row.appendChild(ask);
      row.appendChild(actionButton("Yes", "data-okf-comment-delete-yes", busy));
      row.appendChild(actionButton("No", "data-okf-comment-delete-no", busy));
    } else {
      if (hooks?.resolve) {
        row.appendChild(actionButton(thread?.resolved ? "Reopen" : "Resolve", "data-okf-comment-resolve", busy));
      }
      if (hooks?.remove) row.appendChild(actionButton("Delete", "data-okf-comment-delete", busy));
    }
    const message = act !== undefined && act.threadId === openId ? act.error : "";
    if (message !== "") {
      const line = document.createElement("div");
      line.setAttribute(ACTION_ERROR, "true");
      line.setAttribute("role", "alert");
      line.textContent = message;
      row.appendChild(line);
    }
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-086
  const startAction = (kind: "resolve" | "delete", send: (threadId: string) => void): void => {
    const threadId = openId;
    if (threadId === undefined || pendingFor(threadId)) return;
    if (act?.timer !== undefined) window.clearTimeout(act.timer);
    const mine = {
      threadId,
      kind,
      waiting: true,
      error: "",
      timer: window.setTimeout(() => {
        if (act !== mine) return;
        mine.timer = undefined;
        confirming = undefined;
        mine.error = "No answer from the editor. Nothing changed here: try again.";
        paintReply();
      }, ANSWER_TIMEOUT_MS) as number | undefined,
    };
    act = mine;
    paintReply();
    send(threadId);
  };

  const close = (): void => {
    popover?.remove();
    popover = undefined;
    openId = undefined;
    confirming = undefined;
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
    orphanBox?.remove();
    orphanBox = undefined;
    addedOrphans = [];
  };

  const spanOf = (element: Element): [number, number] | undefined => {
    const start = Number(element.getAttribute("data-line"));
    if (!Number.isFinite(start)) return undefined;
    const endValue = Number(element.getAttribute("data-end-line"));
    return [start, Number.isFinite(endValue) && endValue >= start ? endValue : start];
  };

  // A block may carry a thread: not in an open editor or the properties table, not included content
  // (it carries the lines of ANOTHER file), not under a skipped ancestor (diagram, chip, math, code).
  const eligible = (element: Element): boolean => {
    if (element.closest(EDITING) || element.closest("[data-okf-properties]")) return false;
    if (element.closest("[data-sphinx-preview-included]")) return false;
    const container = element.parentNode as Element | null;
    return !(container && container.nodeType === 1 && container.closest(SKIP));
  };

  // The innermost mapped block that covers the line (smallest span; the deeper one on a tie).
  const blockFor = (line: number): Element | undefined => {
    let best: Element | undefined;
    let bestSize = Infinity;
    document.querySelectorAll("[data-line]").forEach((element) => {
      const span = spanOf(element);
      if (!span || line < span[0] || line > span[1]) return;
      if (!eligible(element)) return;
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

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-017
  const attach = (thread: PageCommentThread): boolean => {
    const quote = thread.anchor.quote;
    if (quote === "") return false;
    const block = blockFor(thread.anchor.line);
    // The host re-anchored this thread and found no block to trust: do not guess a place here.
    if (!block && thread.orphaned === false) return false;
    // No block at the line (the text moved): look for the quote in every eligible block, in order.
    const blocks: Element[] = block ? [block] : [];
    if (!block) {
      document.querySelectorAll("[data-line]").forEach((element) => {
        if (eligible(element)) blocks.push(element);
      });
    }
    const variants = [quote];
    const collapsed = quote.replace(/\s+/gu, " ");
    if (collapsed !== quote) variants.push(collapsed);
    const seen = new Set<Text>();
    const nodes: Text[] = [];
    for (const candidate of blocks) {
      for (const node of textNodesOf(candidate)) {
        if (!seen.has(node)) {
          seen.add(node);
          nodes.push(node);
        }
      }
    }
    if (!block) {
      // The text moved: place the thread only when the quote is long enough to be meaningful and
      // occurs exactly once; a short or repeated quote would land on an unrelated place.
      if (collapsed.trim().length < MIN_MOVED_QUOTE) return false;
      let total = 0;
      for (const node of nodes) {
        const value = node.nodeValue ?? "";
        for (const variant of variants) {
          let from = value.indexOf(variant);
          if (from < 0) continue;
          while (from >= 0) {
            total += 1;
            from = value.indexOf(variant, from + variant.length);
          }
          break;
        }
      }
      if (total !== 1) return false;
    }
    for (const node of nodes) {
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
  const badge = (thread: PageCommentThread): boolean => {
    const block = blockFor(thread.anchor.line);
    if (!block) return false;
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
    return true;
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-028
  // The "Orphaned comments" box: after the content element, outside the HTML a patch replaces. It
  // adds no scroll height of its own where the content ends (see the stylesheet), so the end of
  // the document, the first-element gap and the insert points do not change.
  const renderOrphans = (orphans: PageCommentThread[]): void => {
    if (orphans.length === 0) return;
    const box = document.createElement("div");
    box.setAttribute(ORPHANS, "true");
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Orphaned comments");
    const title = document.createElement("div");
    title.setAttribute("data-okf-orphans-title", "true");
    title.textContent = "Orphaned comments";
    box.appendChild(title);
    for (const thread of orphans) {
      const item = document.createElement("button");
      item.setAttribute("type", "button");
      item.setAttribute(ORPHAN, thread.id);
      item.setAttribute("aria-haspopup", "dialog");
      if (thread.resolved) item.setAttribute("data-okf-comment-resolved", "true");
      const quote = document.createElement("span");
      quote.setAttribute("data-okf-orphan-quote", "true");
      quote.textContent = thread.anchor.quote !== "" ? thread.anchor.quote : "(no quoted text)";
      const first = thread.comments[0];
      const meta = document.createElement("span");
      meta.setAttribute("data-okf-orphan-meta", "true");
      const count = thread.comments.length;
      meta.textContent = `${first ? first.author + ": " + first.body.slice(0, 120) : ""}`
        + ` (${count} comment${count === 1 ? "" : "s"}${thread.resolved ? ", resolved" : ""})`;
      item.appendChild(quote);
      item.appendChild(meta);
      box.appendChild(item);
      addedOrphans.push(item);
    }
    const main = document.getElementById?.("sphinx-myst-preview-content");
    const parent = (main?.parentNode ?? document.body) as Node;
    parent.insertBefore(box, main ? main.nextSibling : null);
    orphanBox = box;
  };

  const apply = (): void => {
    // An open popover stays open across a re-apply (a render re-posts the same threads) when its
    // thread is still there; the holder is the new mark, badge or orphan entry.
    const reopen = openId;
    const draft = replyInput()?.value;
    const asking = confirming;
    close();
    clear();
    if (threads.length === 0) return;
    const orphans: PageCommentThread[] = [];
    for (const thread of threads) {
      if (thread.orphaned === true || (!attach(thread) && !badge(thread))) orphans.push(thread);
    }
    renderOrphans(orphans);
    if (reopen !== undefined) {
      const holder = [...addedMarks, ...addedBadges, ...addedOrphans].find((candidate) => idOf(candidate) === reopen);
      const thread = threads.find((candidate) => candidate.id === reopen);
      if (holder && thread) {
        open(thread, holder);
        const input = replyInput();
        if (input && typeof draft === "string") input.value = draft;
        confirming = asking === reopen ? asking : undefined;
        paintReply();
        paintActions();
      }
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

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-081
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-001
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
    if (hooks && (typeof hooks.resolve === "function" || typeof hooks.remove === "function")) {
      const row = document.createElement("div");
      row.setAttribute(ACTIONS, "true");
      root.appendChild(row);
    }
    if (hooks && typeof hooks.reply === "function") {
      const reply = document.createElement("div");
      reply.setAttribute("data-okf-comment-reply", "true");
      const input = document.createElement("textarea");
      input.setAttribute(REPLY_INPUT, "true");
      input.setAttribute("maxlength", String(MAX_TEXT));
      input.setAttribute("rows", "2");
      input.setAttribute("aria-label", "Reply to this thread");
      input.setAttribute("placeholder", "Reply");
      const send = document.createElement("button");
      send.setAttribute("type", "button");
      send.setAttribute(REPLY_SEND, "true");
      send.textContent = "Reply";
      reply.appendChild(input);
      reply.appendChild(send);
      root.appendChild(reply);
    }
    document.body.appendChild(root);
    popover = root;
    openId = thread.id;
    position(target);
    paintReply();
    paintActions();
  };

  const holderOf = (target: Element): Element | null => target.closest(`[${MARK}], [${BADGE}], [${ORPHAN}]`);
  const idOf = (holder: Element): string | null =>
    holder.getAttribute(MARK) ?? holder.getAttribute(BADGE) ?? holder.getAttribute(ORPHAN);

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-021
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
  // Sends the text of the reply box of the open popover. The text stays until the host says ok.
  const sendReply = (input: Element): void => {
    const field = input as unknown as { value: string };
    const body = typeof field.value === "string" ? field.value.trim() : "";
    if (body === "" || body.length > MAX_TEXT || openId === undefined || !hooks?.reply) return;
    if (pendingFor(openId)) return;
    const threadId = openId;
    sent = {
      threadId,
      body,
      waiting: true,
      error: "",
      timer: window.setTimeout(() => {
        if (!sent || sent.threadId !== threadId) return;
        sent.timer = undefined;
        sent.error = "No answer from the editor. Your text is kept: try Reply again.";
        paintReply();
      }, ANSWER_TIMEOUT_MS),
    };
    paintReply();
    hooks.reply(threadId, body);
  };
  document.addEventListener("click", (event) => {
    const target = event.target;
    const send = target instanceof Element ? target.closest(`[${REPLY_SEND}]`) : null;
    if (!send) return;
    event.preventDefault();
    const input = popover?.querySelector(`[${REPLY_INPUT}]`);
    if (input) sendReply(input);
  }, true);
  document.addEventListener("click", (event) => {
    const target = event.target;
    const hit = (attribute: string): boolean => target instanceof Element && target.closest(`[${attribute}]`) !== null;
    const resolveHook = hooks?.resolve;
    const removeHook = hooks?.remove;
    if (hit("data-okf-comment-resolve") && resolveHook) {
      event.preventDefault();
      const thread = threads.find((candidate) => candidate.id === openId);
      if (thread) startAction("resolve", (threadId) => resolveHook(threadId, !thread.resolved));
    } else if (hit("data-okf-comment-delete") && removeHook) {
      event.preventDefault();
      if (openId !== undefined && !pendingFor(openId)) {
        confirming = openId;
        if (act !== undefined && act.threadId === openId) act.error = "";
        paintActions();
      }
    } else if (hit("data-okf-comment-delete-no")) {
      event.preventDefault();
      if (!pendingFor(openId)) {
        confirming = undefined;
        paintActions();
      }
    } else if (hit("data-okf-comment-delete-yes") && removeHook) {
      event.preventDefault();
      if (confirming === openId) startAction("delete", (threadId) => removeHook(threadId));
    }
  }, true);
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
    // Typing in the reply box stays in the box: no other key handler of the page sees it.
    const field = target instanceof Element ? target.closest(`[${REPLY_INPUT}]`) : null;
    if (field) {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing) {
        event.preventDefault();
        sendReply(field);
      }
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
    result(message) {
      if ((message.kind === "resolve" || message.kind === "delete") && act !== undefined) {
        if (!act.waiting || act.kind !== message.kind || message.threadId !== act.threadId) return false;
        if (act.timer !== undefined) window.clearTimeout(act.timer);
        act.timer = undefined;
        act.waiting = false;
        if (message.ok === true) {
          act = undefined;
        } else {
          act.error = typeof message.reason === "string" && message.reason !== ""
            ? message.reason.slice(0, 500) : "The change was not saved.";
        }
        confirming = undefined;
        paintReply();
        return true;
      }
      if (message.kind !== "reply" || !sent || !sent.waiting || message.threadId !== sent.threadId) return false;
      if (sent.timer !== undefined) window.clearTimeout(sent.timer);
      sent.timer = undefined;
      sent.waiting = false;
      if (message.ok === true) {
        const answered = sent;
        sent = undefined;
        const input = replyInput();
        // Only the text that was sent is removed; anything typed since stays.
        if (input && openId === answered.threadId && input.value.trim() === answered.body) input.value = "";
      } else {
        sent.error = typeof message.reason === "string" && message.reason !== ""
          ? message.reason.slice(0, 500) : "The reply was not saved.";
      }
      paintReply();
      return true;
    },
    setThreads(next) {
      threads = sanitize(next);
      apply();
    },
    apply,
    close,
    openThread(id) {
      // Compared in code, never put into a selector: the id is file data.
      const holder = Array.from(document.querySelectorAll(`[${MARK}], [${BADGE}], [${ORPHAN}]`))
        .find((candidate) => idOf(candidate) === id);
      return holder ? toggle(holder) : false;
    },
  };
}
