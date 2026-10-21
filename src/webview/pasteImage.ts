/**
 * Pasting an image into the text box of the block editor. Text on the clipboard wins (the paste
 * stays native); otherwise the first png, jpeg, gif or webp file of the clipboard is read as
 * base64 and handed to `hooks.send`, and the host answers with the file name it chose. The page
 * never names the file. Self-contained: it is injected into the page script with `.toString()`,
 * so it must not use anything defined outside its own body.
 */
export interface PasteImageHooks {
  /** Posts the image to the host; `done` receives the host's answer. */
  send(mime: string, dataBase64: string, done: (result: { ok?: boolean; fileName?: unknown; reason?: unknown }) => void): void;
  status(text: string): void;
  /** Inserts `![name](name)` over `[start, end)` of the text box with `name` selected. */
  insert(name: string, start: number, end: number): void;
  /** The editor that was open at the paste is still the open one. */
  isCurrent(): boolean;
  /** The status text of an editor that is just open. */
  restoreStatus(): void;
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
