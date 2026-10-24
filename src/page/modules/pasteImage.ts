/**
 * Pasting an image into the text box of the block editor. Text on the clipboard wins (the paste
 * stays native); otherwise the first png, jpeg, gif or webp file of the clipboard is read as
 * base64 and handed to `hooks.send`, and the host answers with the file name it chose. The page
 * never names the file.
 */
export interface PasteImageHooks {
  /** Posts the image to the host; `done` receives the host's answer. */
  send(mime: string, dataBase64: string, done: (result: { ok?: boolean; fileName?: unknown; reason?: unknown }) => void): void;
  status(text: string): void;
  /** Inserts `![name](name)` over `[start, end)` of the text box, as its own paragraph, with `name` selected. */
  insert(name: string, start: number, end: number): void;
  /** The editor that was open at the paste is still the open one. */
  isCurrent(): boolean;
  /** The status text of an editor that is just open. */
  restoreStatus(): void;
}

export interface ImageParagraphEdit {
  start: number;
  end: number;
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * CR 050: the edit that puts `![name](name)` over `[start, end)` of `value` as a paragraph of its
 * own, like GitHub and Obsidian do: a blank line before it unless it starts the text or follows a
 * blank line, and one after it unless it ends the text or a blank line follows. The spaces and tabs
 * around the caret go with the break, so no line keeps trailing blanks. The name is selected.
 */
export function imageParagraphEdit(value: string, start: number, end: number, name: string): ImageParagraphEdit {
  const length = value.length;
  let from = Math.max(0, Math.min(start, length));
  let to = Math.max(from, Math.min(end, length));
  while (from > 0 && (value[from - 1] === " " || value[from - 1] === "\t")) from -= 1;
  while (to < length && (value[to] === " " || value[to] === "\t")) to += 1;
  const before = value.slice(0, from);
  const after = value.slice(to);
  const lead = before === "" || /\n[ \t]*\n$/u.test(before) ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after === "" || /^\n[ \t]*\n/u.test(after) ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const at = from + lead.length + 2;
  return {
    start: from,
    end: to,
    text: lead + "![" + name + "](" + name + ")" + trail,
    selectionStart: at,
    selectionEnd: at + name.length,
  };
}

export interface PasteImage {
  /** True when the paste was taken over (the default insertion is prevented). */
  handle(event: any, textarea: { selectionStart: number; selectionEnd: number }, hooks: PasteImageHooks): boolean;
}

export function installPasteImage(window: any): PasteImage {
  const MAX_BYTES = 10 * 1024 * 1024;
  const ALLOWED = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  return {
    handle(event, textarea, hooks) {
      const data = event && event.clipboardData;
      if (!data) return false;
      const text = typeof data.getData === "function" ? data.getData("text/plain") : "";
      if (typeof text === "string" && text !== "") return false;
      let file;
      const items = data.items ? Array.from(data.items) : [];
      for (const item of items as any[]) {
        if (item && item.kind === "file" && ALLOWED.includes(item.type)) {
          file = typeof item.getAsFile === "function" ? item.getAsFile() : undefined;
          if (file) break;
        }
      }
      if (!file) return false;
      event.preventDefault?.();
      if (typeof file.size === "number" && file.size > MAX_BYTES) {
        hooks.status("The image is larger than 10 MB and was not pasted.");
        return true;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const mime = String(file.type || "");
      const reader = new window.FileReader();
      hooks.status("Saving image…");
      reader.onerror = () => {
        if (hooks.isCurrent()) hooks.status("The image could not be read.");
      };
      reader.onload = () => {
        const url = typeof reader.result === "string" ? reader.result : "";
        const marker = ";base64,";
        const at = url.indexOf(marker);
        if (at < 0 || !hooks.isCurrent()) {
          if (hooks.isCurrent()) hooks.status("The image could not be read.");
          return;
        }
        hooks.send(mime, url.slice(at + marker.length), (result) => {
          if (!hooks.isCurrent()) return;
          if (result && result.ok === true && typeof result.fileName === "string" && result.fileName !== "") {
            hooks.insert(result.fileName, start, end);
            hooks.restoreStatus();
          } else {
            hooks.status(typeof (result && result.reason) === "string" ? String(result.reason) : "The image was not saved.");
          }
        });
      };
      reader.readAsDataURL(file);
      return true;
    },
  };
}
