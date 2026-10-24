export interface InlineThreadDeps {
  /** True when the document may be edited (a trusted workspace); otherwise threads are read-only. */
  enabled: boolean;
  /** True while a block or frontmatter editor is open: a reply would race its save. */
  blockedReason(): string | undefined;
  /** Sends the request to the host; `done` gets its answer. */
  ask(
    type: "previewThreadReply" | "previewThreadDelete",
    payload: { line: number; endLine: number; text?: string },
    done: (result: { ok?: boolean; reason?: string }) => void,
  ): void;
}

/**
 * The reply box and the Delete button of an open inline thread (`<!-- THREAD`). The chip, the
 * messages and the expansion are the comment chip's (see chipToggle); this adds the controls to
 * the body of each thread comment. Idempotent: `apply` runs after every load and content patch and
 * skips a body that already has its controls. The host rewrites the file; the page refreshes from
 * the content patch that follows.
 */
export function installInlineThreads(
  document: Document,
  deps: InlineThreadDeps,
): { apply(): void } {
  const lines = (comment: Element): { line: number; endLine: number } | undefined => {
    const line = Number(comment.getAttribute("data-line"));
    const endLine = Number(comment.getAttribute("data-end-line"));
    return Number.isSafeInteger(line) && line >= 1 && Number.isSafeInteger(endLine) && endLine >= line
      ? { line, endLine }
      : undefined;
  };

  const build = (comment: Element, body: Element): void => {
    const box = document.createElement("div");
    box.className = "okf-thread-actions";
    box.setAttribute("data-okf-thread-actions", "true");
    const field = document.createElement("textarea");
    field.setAttribute("rows", "2");
    field.setAttribute("placeholder", "Reply");
    field.setAttribute("aria-label", "Reply to this thread");
    const buttons = document.createElement("div");
    buttons.className = "okf-thread-buttons";
    const reply = document.createElement("button");
    reply.setAttribute("type", "button");
    reply.setAttribute("data-okf-thread-reply", "true");
    reply.textContent = "Reply";
    const remove = document.createElement("button");
    remove.setAttribute("type", "button");
    remove.setAttribute("data-okf-thread-delete", "true");
    remove.setAttribute("title", "Delete the whole thread from the document");
    remove.textContent = "Delete thread";
    const status = document.createElement("span");
    status.className = "okf-thread-status";
    status.setAttribute("role", "status");
    buttons.append(reply, remove, status);
    box.append(field, buttons);
    body.appendChild(box);

    let busy = false;
    const send = (
      type: "previewThreadReply" | "previewThreadDelete",
      text: string | undefined,
    ): void => {
      const range = lines(comment);
      const blocked = deps.blockedReason();
      if (busy) return;
      if (blocked) {
        status.textContent = blocked;
        return;
      }
      if (!range) {
        status.textContent = "The thread has no source position. Refresh the preview.";
        return;
      }
      busy = true;
      reply.disabled = true;
      remove.disabled = true;
      status.textContent = "";
      deps.ask(type, text === undefined ? range : { ...range, text }, (result) => {
        busy = false;
        reply.disabled = false;
        remove.disabled = false;
        if (result.ok === true) {
          field.value = "";
          return;
        }
        status.textContent = typeof result.reason === "string" ? result.reason : "The change was not saved.";
      });
    };

    reply.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = field.value.trim();
      if (text === "") {
        status.textContent = "Write a reply first.";
        field.focus();
        return;
      }
      send("previewThreadReply", text);
    });
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      send("previewThreadDelete", undefined);
    });
    field.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing) {
        event.preventDefault();
        reply.click();
      }
    });
  };

  return {
    apply() {
      if (!deps.enabled) return;
      document.querySelectorAll('.okf-comment[data-okf-comment-kind="thread"]').forEach((comment) => {
        if (!comment.classList?.contains("okf-comment") || !comment.children) return;
        const body = Array.from(comment.children).find((child) => child.classList?.contains("okf-comment-body"));
        if (!body || body.querySelector("[data-okf-thread-actions]")) return;
        build(comment, body);
      });
    },
  };
}
