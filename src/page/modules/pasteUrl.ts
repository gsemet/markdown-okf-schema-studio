/**
 * Pasting a URL into the text box of the block editor (CR 145). A clipboard that holds nothing but
 * one `http:`, `https:` or `mailto:` address as plain text is turned into Markdown at the paste:
 * over selected text it makes the link `[text](url)`, alone it makes the autolink `<url>`, and an
 * image address (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`) makes `![](url)`. Rich text
 * (a clipboard with `text/html`), any other text, a paste inside code and Cmd/Ctrl+Shift+V (paste
 * as plain text) are left to the browser, so the source is only ever changed at the edited span.
 */
import type { PasteKeyEvent } from "./pasteHtml";

export interface PasteUrlEdit {
  start: number;
  end: number;
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** The slice of a `ClipboardEvent` the URL paste reads. */
export interface PasteUrlEvent {
  clipboardData?: { getData?(format: string): string } | null;
  preventDefault?(): void;
}

export interface PasteUrl {
  /** Notes a key press of the text box: Cmd/Ctrl+Shift+V marks the next paste as plain text. */
  noteKey(event: PasteKeyEvent | null | undefined): void;
  /** True when the paste was taken over (the default insertion is prevented). */
  handle(
    event: PasteUrlEvent | null | undefined,
    textarea: { value: string; selectionStart: number; selectionEnd: number },
    insert: (edit: PasteUrlEdit) => void,
  ): boolean;
}

const MAX_URL_LENGTH = 2048;
const WEB_URL = /^https?:\/\/[^\s<>]+$/iu;
const MAIL_URL = /^mailto:[^\s<>]+$/iu;
const IMAGE_PATH = /\.(?:png|jpe?g|gif|svg|webp)$/iu;

/** The URL the clipboard text is, or `undefined` when it is anything else (other scheme, words, lines). */
export function pastedUrl(text: string): string | undefined {
  const url = text.trim();
  if (url === "" || url.length > MAX_URL_LENGTH) return undefined;
  return WEB_URL.test(url) || MAIL_URL.test(url) ? url : undefined;
}

/** True for an `http(s)` address whose path ends with an image extension (query and hash ignored). */
export function isImageUrl(url: string): boolean {
  if (!/^https?:/iu.test(url)) return false;
  const path = url.replace(/[?#].*$/u, "");
  return IMAGE_PATH.test(path);
}

/** The caret is in a fenced block, an inline code span or the target of a link: paste natively. */
function inProtectedSpan(value: string, position: number): boolean {
  const before = value.slice(0, position);
  const fences = before.match(/^ {0,3}(?:```|~~~)/gmu);
  if (fences && fences.length % 2 === 1) return true;
  const line = before.slice(before.lastIndexOf("\n") + 1);
  if ((line.match(/`/gu) ?? []).length % 2 === 1) return true;
  if (/\]\([^)\s]*$/u.test(line) || /<[^>\s]*$/u.test(line)) return true;
  return false;
}

/**
 * The edit a pasted URL makes over `[start, end)` of `value`, or `undefined` when the paste stays
 * native. A destination with parentheses is written in angle brackets so the link stays valid.
 */
export function pasteUrlEdit(value: string, start: number, end: number, clipboardText: string): PasteUrlEdit | undefined {
  const url = pastedUrl(clipboardText);
  if (url === undefined) return undefined;
  const length = value.length;
  const from = Math.max(0, Math.min(start, length));
  const to = Math.max(from, Math.min(end, length));
  if (inProtectedSpan(value, from)) return undefined;
  const selected = value.slice(from, to);
  if (/[\n[\]]/u.test(selected)) return undefined;
  const destination = /[()]/u.test(url) ? "<" + url + ">" : url;
  if (isImageUrl(url)) {
    const text = "![" + selected + "](" + destination + ")";
    // Nothing selected: the caret waits in the empty alt text; otherwise it goes after the image.
    const caret = selected === "" ? from + 2 : from + text.length;
    return { start: from, end: to, text, selectionStart: caret, selectionEnd: caret };
  }
  const text = selected === "" ? "<" + url + ">" : "[" + selected + "](" + destination + ")";
  const caret = from + text.length;
  return { start: from, end: to, text, selectionStart: caret, selectionEnd: caret };
}

export function installPasteUrl(): PasteUrl {
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
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-264
    handle(event, textarea, insert) {
      const plainRequested = plainNext;
      plainNext = false;
      const data = event && event.clipboardData;
      if (plainRequested || !data || typeof data.getData !== "function") return false;
      const html = data.getData("text/html");
      if (typeof html === "string" && html.trim() !== "") return false;
      const plain = data.getData("text/plain");
      if (typeof plain !== "string") return false;
      const edit = pasteUrlEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd, plain);
      if (!edit) return false;
      event.preventDefault?.();
      insert(edit);
      return true;
    },
  };
}
