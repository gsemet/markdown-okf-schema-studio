/**
 * Pasting rich text into the text box of the block editor. When the clipboard holds `text/html`
 * the paste is taken over: the HTML goes to the host, which converts it to Markdown, and the
 * answer replaces the selection of the moment of the paste in one undo step. Cmd/Ctrl+Shift+V
 * (paste as plain text) is left to the browser, and so is a clipboard without HTML. When the
 * conversion fails or leaves nothing, the plain text of the clipboard is inserted instead.
 */
export interface PasteHtmlHooks {
  /** Posts the HTML to the host; `done` receives the host's answer. */
  send(html: string, done: (result: { ok?: boolean; markdown?: unknown }) => void): void;
  /** Replaces `[start, end)` of the text box with `text`, leaving the caret after it. */
  insert(text: string, start: number, end: number): void;
  /** The editor that was open at the paste is still the open one. */
  isCurrent(): boolean;
}

export interface PasteHtml {
  /** Notes a key press of the text box: Cmd/Ctrl+Shift+V marks the next paste as plain text. */
  noteKey(event: any): void;
  /** True when the paste was taken over (the default insertion is prevented). */
  handle(event: any, textarea: { selectionStart: number; selectionEnd: number }, hooks: PasteHtmlHooks): boolean;
}

export function installPasteHtml(): PasteHtml {
  const MAX_HTML_LENGTH = 1_000_000;
  let plainNext = false;
  return {
    noteKey(event) {
      if (!event) return;
      if (String(event.key).toLowerCase() === "v" && event.shiftKey && (event.metaKey || event.ctrlKey)) {
        plainNext = true;
      } else if (!["Shift", "Meta", "Control", "Alt"].includes(String(event.key))) {
        plainNext = false;
      }
    },
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-213
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-090
    handle(event, textarea, hooks) {
      const plainRequested = plainNext;
      plainNext = false;
      const data = event && event.clipboardData;
      if (plainRequested || !data || typeof data.getData !== "function") return false;
      const html = data.getData("text/html");
      if (typeof html !== "string" || html.trim() === "" || html.length > MAX_HTML_LENGTH) return false;
      const plain = data.getData("text/plain");
      const fallback = typeof plain === "string" ? plain : "";
      event.preventDefault?.();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      hooks.send(html, (result) => {
        if (!hooks.isCurrent()) return;
        const markdown = result && result.ok === true && typeof result.markdown === "string" ? result.markdown : "";
        const text = markdown !== "" ? markdown : fallback;
        if (text !== "") hooks.insert(text, start, end);
      });
      return true;
    },
  };
}
