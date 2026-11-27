import { MAX_TEXT, sanitize, type PageCommentThread } from "./commentThreadData";
import { DISCARD, DISCARD_KEEP, DISCARD_YES, discardQuestion, floatingTop } from "./commentEditorBehaviour";
import { createCommentPlacements } from "./commentPlacements";
import { BADGE, MARK, ORPHAN, POPOVER } from "./commentPlan";

/**
 * Review comments in the page (T42).
 *
 * Thread content comes from a file next to the document and is untrusted: every string reaches the
 * page through `textContent` or `setAttribute`, never as markup. For each thread the innermost
 * mapped block (`data-line` .. `data-end-line`) that covers the anchor line is searched for the
 * first occurrence of the quote that no earlier thread took, inside ONE run of text: a text node as
 * it is without any highlight (a quote that spans several elements is not found). That text is
 * wrapped in `mark[data-okf-comment-thread]`. A thread whose quote is not found gets an empty
 * `button[data-okf-comment-badge]` inside its block, or below a block that cannot take it. No
 * highlight is made in code, diagrams, math, the properties table, open inline editors or included
 * content (O10). commentPlan.ts finds the places and commentPlacements.ts changes the page: when
 * the host posts the threads again, `setThreads` changes only the elements of the threads whose
 * place or state differs. The last threads are kept, so `apply()` puts them back on content that
 * was replaced by a patch: it removes what the page holds and places every thread again. A second
 * run gives the same page with new elements, unless a highlight starts or ends where two text nodes
 * touch: removing it leaves one node, in which a quote across that place is then found. Clicking a
 * mark or badge opens a popover with the thread (author, date, plain-text bodies, resolved state).
 * When `hooks.reply` is given
 * (writable previews only, T43), the popover ends with a reply box: Reply or Cmd/Ctrl+Enter hands
 * the thread id and the trimmed text (1 to 10 000 characters) to the hook. The text stays in the
 * box until the host answers `ok: true` through `result()`; a refusal shows its reason
 * (`textContent`, role="alert") and keeps the text, and so does a missing answer after 15 seconds.
 * A reply draft survives the threads being posted again while its thread exists.
 *
 * T44: `hooks.resolve` and `hooks.remove` (writable previews only) add Resolve / Reopen and Delete
 * to the popover. Delete asks "Delete thread?" with Yes / No inside the popover (no
 * `window.confirm`). Both wait for the host's answer like a reply: nothing changes before the
 * thread list is posted again, and a refusal shows its reason in an alert line.
 *
 * A thread with no mapped block at its line is highlighted elsewhere only when its quote has at
 * least 12 characters and occurs exactly once in the eligible blocks; otherwise it is an orphan,
 * listed in an "Orphaned comments" box that commentPlacements.ts keeps after the content element,
 * never inside it (`setThreads` changes the entries that differ, `apply()` builds the box again).
 * Each entry opens the same popover. The page never writes anything for an orphan: the thread
 * stays in the file untouched.
 *
 * T45: the host re-anchors threads against the document text and posts `orphaned` with each
 * thread. `orphaned: true` goes straight to the box; `orphaned: false` trusts the posted lines
 * (the page never searches the quote elsewhere for such a thread). Threads without the field
 * (older hosts, tests) keep the T44 placement rules: the search elsewhere above.
 *
 * Placement and dismissal of the popover follow `commentEditorBehaviour.ts`: it sits inside the window,
 * follows its text on scroll, and Escape or a press outside closes it, or, when the reply box holds
 * text, asks "Discard / Keep editing" inside the popover first (no `window.confirm`).
 *
 * `trace` (diagnostics only) hears why an open popover went away: a press outside, Escape, a toggle
 * of its own thread, a discarded draft, hidden comments, a close by the page, or new threads or a
 * re-apply that left it no thread or no holder. Opening another thread over it is not traced.
 *
 * While comments are hidden (`<html>` carries `data-sphinx-preview-comments="off"` from the toolbar
 * Comments button or `data-okf-show-comments="false"` from the setting; the stylesheet hides the
 * paint) every mark is plain text: clicks and keys pass through to the page, highlights leave the
 * Tab order and no popover opens. `visibilityChanged()` closes an open popover and updates the Tab
 * order after either attribute changed.
 */
export function installCommentThreads(
  document: Document,
  window: Window & typeof globalThis,
  hooks?: {
    reply?: (threadId: string, body: string) => void;
    resolve?: (threadId: string, resolved: boolean) => void;
    remove?: (threadId: string) => void;
  },
  trace?: (event: string, detail: string) => void,
): {
  /**
   * Shows the threads the host posted. True when a block of the content can have moved (see
   * commentPlacements.ts).
   */
  setThreads(threads: unknown): boolean;
  /** Places the threads again from nothing, after the content was replaced. */
  apply(): void;
  close(): void;
  openThread(id: string): boolean;
  /** The comments were hidden or shown: closes an open popover when hidden, updates the Tab order. */
  visibilityChanged(): void;
  /** Feeds a `previewCommentResult` of the host; true when it answered a reply. */
  result(message: { kind?: unknown; threadId?: unknown; ok?: unknown; reason?: unknown }): boolean;
} {
  const REPLY_INPUT = "data-okf-comment-reply-input";
  const REPLY_SEND = "data-okf-comment-reply-send";
  const ACTIONS = "data-okf-comment-thread-actions";
  const ACTION_ERROR = "data-okf-comment-action-error";
  let threads: PageCommentThread[] = [];
  let popover: Element | undefined;
  let openId: string | undefined;
  const ANSWER_TIMEOUT_MS = 15000;
  // The reply waiting for the host's answer; it outlives a rebuilt popover (threads posted again).
  let sent: { threadId: string; body: string; timer?: number; waiting: boolean; error: string } | undefined;

  // The resolve or delete waiting for the host's answer, and the thread whose Delete is being asked.
  let act: { threadId: string; kind: "resolve" | "delete"; timer?: number; waiting: boolean; error: string } | undefined;
  let confirming: string | undefined;
  // The thread whose reply draft is being asked about, and the element the popover is anchored to.
  let discarding: string | undefined;
  let openTarget: Element | undefined;

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-152
  // Read at event time from the attributes the stylesheet hides the marks with.
  const hidden = (): boolean => {
    const root = document.documentElement;
    return root?.getAttribute("data-sphinx-preview-comments") === "off"
      || root?.getAttribute("data-okf-show-comments") === "false";
  };

  // A shown highlight is a button in the Tab order; a hidden one is plain text.
  const paintFocus = (mark: Element): void => {
    const shown = !hidden();
    for (const [name, value] of [["tabindex", "0"], ["role", "button"], ["aria-haspopup", "dialog"]] as const) {
      if (!shown) mark.removeAttribute(name);
      else if (mark.getAttribute(name) !== value) mark.setAttribute(name, value);
    }
  };
  const placements = createCommentPlacements(document, paintFocus);

  const replyInput = (): { value: string } | undefined =>
    (popover?.querySelector(`[${REPLY_INPUT}]`) ?? undefined) as unknown as { value: string } | undefined;

  // Shows the state of `sent` in the open popover: error line and Reply button.
  const paintReply = (): void => {
    paintReplyContent();
    if (popover && openTarget) position(openTarget); // the rows changed the height
  };

  const paintReplyContent = (): void => {
    if (!popover) return;
    paintActions();
    paintDiscard(false);
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
    if (openTarget) position(openTarget);
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

  const close = (why?: string): void => {
    if (why !== undefined && popover) trace?.("comment popover closed", `${why}, thread ${openId ?? "none"}`);
    popover?.remove();
    popover = undefined;
    openId = undefined;
    confirming = undefined;
    discarding = undefined;
    openTarget = undefined;
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-218
  // The question under the reply box; only the user's trigger, not a repaint, focuses Keep editing.
  const paintDiscard = (focusKeep: boolean): void => {
    if (!popover) return;
    const shown = popover.querySelector(`[${DISCARD}]`);
    const wanted = discarding !== undefined && discarding === openId;
    if (shown && wanted) return;
    shown?.remove();
    if (!wanted) return;
    const row = discardQuestion(document, "Discard this reply?");
    popover.appendChild(row);
    if (focusKeep) (row.querySelector(`[${DISCARD_KEEP}]`) as HTMLElement | null)?.focus?.();
  };
  const keepEditing = (): void => {
    discarding = undefined;
    paintDiscard(false);
    if (openTarget) position(openTarget);
    (replyInput() as unknown as HTMLElement | undefined)?.focus?.();
  };

  const draftChanged = (): boolean => {
    const field = replyInput();
    return popover !== undefined && typeof field?.value === "string" && field.value.trim() !== "";
  };

  // Closes at once, or asks first when the reply box holds text. Returns false when it asked.
  const closeOrAsk = (why: string): boolean => {
    if (!draftChanged()) {
      close(why);
      return true;
    }
    discarding = openId;
    paintDiscard(true);
    if (openTarget) position(openTarget);
    return false;
  };

  // Places the threads in the page, from nothing when the content was replaced. An open popover
  // stays open (a render re-posts the same threads) when its thread is still there; the holder is
  // its mark, badge or orphan entry. Not while hidden. True when a block may have moved.
  const place = (afresh: boolean): boolean => {
    const reopen = hidden() ? undefined : openId;
    const draft = replyInput()?.value;
    const asking = confirming;
    const discardAsked = discarding;
    close();
    if (afresh) placements.update([]);
    const moved = placements.update(threads);
    if (reopen === undefined) return moved;
    if (threads.length === 0) {
      trace?.("comment popover closed", `re-apply without threads, thread ${reopen}`);
      return moved;
    }
    const holder = placements.holders().find((candidate) => idOf(candidate) === reopen);
    const thread = threads.find((candidate) => candidate.id === reopen);
    if (holder && thread) {
      open(thread, holder);
      const input = replyInput();
      if (input && typeof draft === "string") input.value = draft;
      confirming = asking === reopen ? asking : undefined;
      discarding = discardAsked === reopen ? discardAsked : undefined;
      paintReply();
      paintActions();
    } else {
      trace?.("comment popover closed", `re-apply without ${thread ? "a holder" : "the thread"}, `
        + `thread ${reopen}, ${threads.length} thread(s)`);
    }
    return moved;
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

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-217
  const position = (target: Element): void => {
    if (!popover) return;
    openTarget = target;
    const rectangle = target.getBoundingClientRect();
    const width = Math.min(360, Math.max(200, (window.innerWidth || 800) - 16));
    const left = Math.max(8, Math.min(rectangle.left, (window.innerWidth || 800) - width - 8));
    const top = floatingTop(popover, rectangle, window.innerHeight || 600);
    (popover as HTMLElement).style.setProperty("width", `${width}px`);
    (popover as HTMLElement).style.setProperty("left", `${left}px`);
    (popover as HTMLElement).style.setProperty("top", `${top}px`);
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-044
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
  };

  const holderOf = (target: Element): Element | null => target.closest(`[${MARK}], [${BADGE}], [${ORPHAN}]`);
  const idOf = (holder: Element): string | null =>
    holder.getAttribute(MARK) ?? holder.getAttribute(BADGE) ?? holder.getAttribute(ORPHAN);

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-021
  const toggle = (holder: Element): boolean => {
    const id = idOf(holder);
    const thread = threads.find((candidate) => candidate.id === id);
    if (!thread) return false;
    if (openId === thread.id) closeOrAsk("toggled");
    else if (draftChanged()) closeOrAsk("switched");
    else open(thread, holder);
    return true;
  };

  // Registered in the capture phase, before the handlers that edit or reveal the clicked block.
  const intercept = (event: Event): void => {
    const target = event.target;
    const holder = target instanceof Element ? holderOf(target) : null;
    // Hidden comments: the click is a click on plain text (reveal the source, edit the block).
    if (!holder || hidden()) return;
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
    } else if (popover && target instanceof Element && hit(DISCARD_YES) && target.closest(`[${POPOVER}]`)) {
      event.preventDefault();
      close("discarded");
    } else if (popover && target instanceof Element && hit(DISCARD_KEEP) && target.closest(`[${POPOVER}]`)) {
      event.preventDefault();
      keepEditing();
    }
  }, true);
  document.addEventListener("click", intercept, true);
  document.addEventListener("dblclick", intercept, true);
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (event.key === "Escape") {
      if (!popover) return;
      // While the question shows, Escape means Keep editing.
      if (discarding !== undefined) {
        keepEditing();
      } else {
        closeOrAsk("Escape");
      }
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
    if ((event.key !== "Enter" && event.key !== " ") || !holder || hidden()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(holder);
  }, true);
  const pressOutside = (event: Event): void => {
    const target = event.target;
    if (!popover || discarding !== undefined) return;
    if (target instanceof Element && (target.closest(`[${POPOVER}]`) || holderOf(target))) return;
    closeOrAsk(`pointerdown outside on ${target instanceof Element ? target.tagName.toLowerCase() : "no element"}`);
  };
  document.addEventListener("pointerdown", pressOutside, true);
  document.addEventListener("mousedown", pressOutside, true);
  // The popover follows its text: scroll events of the page and of any scrolling container.
  document.addEventListener("scroll", () => { if (openTarget) position(openTarget); }, { capture: true, passive: true });

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
      return place(false);
    },
    apply: () => { place(true); },
    close: () => close("closed by the page"),
    // @implements_req SwRS-MDOKFSTUDIO-REVIEW-152
    visibilityChanged() {
      if (hidden()) close("comments hidden");
      placements.marks().forEach(paintFocus);
    },
    openThread(id) {
      if (hidden()) return false;
      // Compared in code, never put into a selector: the id is file data.
      const holder = Array.from(document.querySelectorAll(`[${MARK}], [${BADGE}], [${ORPHAN}]`))
        .find((candidate) => idOf(candidate) === id);
      return holder ? toggle(holder) : false;
    },
  };
}
