/**
 * Keys and native edits of the editor text boxes (the block text box, a table cell box, the
 * frontmatter fields): leaving a box at its edge, Home and End, the undo keys, wrapping a selection
 * in emphasis marks, the palette shortcuts, and text edits that keep the browser's undo stack.
 */

import { isApplePlatform } from "../pageSettings";
import type { CaretPosition, PageRuntime, TextControl, TextControls } from "./pageRuntime";

/** The text styles a hidden mirror copies from a text box to lay its text out the same way. */
const VISUAL_MIRROR_STYLES = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "fontStretch",
  "letterSpacing", "lineHeight", "textTransform", "textIndent", "wordSpacing", "tabSize",
  "wordBreak", "direction", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
] as const;

/** Whether the caret sits on the first and on the last visual (wrapped) line of a text box. */
interface CaretVisualLine {
  first: boolean;
  last: boolean;
}

/** The test-only probe of the caret's visual line (see `onVisualEdge`). */
type CaretLineProbeWindow = Window & { okfCaretLineProbe?: (control: TextControl) => CaretVisualLine | undefined };

/** The text-box helpers of a page. */
export function installTextControls(rt: PageRuntime): TextControls {
  const { document, window, state } = rt;
  const { textEditing, editActions } = rt.tools;

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-079
  // @implements_req SwRS-MDOKFSTUDIO-TABLE-035
  function boundaryNavigation(control: TextControl, event: KeyboardEvent): ReturnType<TextControls["boundaryNavigation"]> {
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return undefined;
    if (control.selectionStart !== control.selectionEnd) return undefined;
    const value = String(control.value ?? "");
    const position = Number(control.selectionStart);
    if (!Number.isSafeInteger(position)) return undefined;
    if (event.key === "ArrowLeft" && position === 0) {
      return { step: -1, caretPosition: "end" };
    }
    if (event.key === "ArrowRight" && position === value.length) {
      return { step: 1, caretPosition: "start" };
    }
    const firstLineEnd = value.indexOf("\n");
    const lastLineStart = value.lastIndexOf("\n") + 1;
    // Up/Down leave only from the first/last VISUAL line: a long logical line wraps in the field
    // and the native caret movement must run first.
    if (
      event.key === "ArrowUp"
      && position <= (firstLineEnd < 0 ? value.length : firstLineEnd)
      && onVisualEdge(control, "first")
    ) {
      return { step: -1, caretPosition: "end" };
    }
    if (event.key === "ArrowDown" && position >= lastLineStart && onVisualEdge(control, "last")) {
      return { step: 1, caretPosition: "start" };
    }
    return undefined;
  }

  // Measures whether the caret of a text field sits on its first and on its last visual (wrapped)
  // line. A hidden mirror with the field's font, padding and width lays out the same text; the
  // offsetTop of a marker at the caret is compared with a marker at the very start and the very
  // end. Returns undefined when the layout cannot be measured, which callers treat as "edge".
  function measureCaretVisualLine(control: TextControl): CaretVisualLine | undefined {
    let mirror: HTMLElement | undefined;
    try {
      const style = window.getComputedStyle(control);
      const value = String(control.value ?? "");
      const position = Number(control.selectionStart);
      const width = Number(control.clientWidth);
      if (!style || !(width > 0) || !Number.isSafeInteger(position)) return undefined;
      mirror = document.createElement("div");
      for (const name of VISUAL_MIRROR_STYLES) mirror.style[name] = style[name];
      mirror.style.position = "absolute";
      mirror.style.visibility = "hidden";
      mirror.style.top = "0";
      mirror.style.left = "-9999px";
      mirror.style.boxSizing = "border-box";
      mirror.style.width = width + "px";
      mirror.style.border = "0";
      mirror.style.whiteSpace = "pre-wrap";
      mirror.style.overflowWrap = "break-word";
      const marker = (): HTMLElement => {
        const element = document.createElement("span");
        // U+2060 WORD JOINER: zero width and no line-break opportunity, so a marker inside a word
        // cannot split a word that the textarea wraps whole.
        element.textContent = "⁠";
        return element;
      };
      const first = marker();
      const caret = marker();
      const last = marker();
      mirror.appendChild(first);
      mirror.appendChild(document.createTextNode(value.slice(0, position)));
      mirror.appendChild(caret);
      mirror.appendChild(document.createTextNode(value.slice(position)));
      mirror.appendChild(last);
      document.body.appendChild(mirror);
      const top = Number(caret.offsetTop);
      const firstTop = Number(first.offsetTop);
      const lastTop = Number(last.offsetTop);
      if (![top, firstTop, lastTop].every(Number.isFinite)) return undefined;
      return { first: Math.abs(top - firstTop) < 1, last: Math.abs(top - lastTop) < 1 };
    } catch {
      return undefined;
    } finally {
      try {
        mirror?.remove?.();
      } catch {
        // The mirror is detached with its document.
      }
    }
  }

  // The visual-line probe is replaceable through window.okfCaretLineProbe. This is a test-only seam
  // for the fake-DOM tests, which cannot measure layout: content scripts cannot define it under the
  // nonce CSP, so it is never set in a real preview.
  function onVisualEdge(control: TextControl, edge: keyof CaretVisualLine): boolean {
    let line: CaretVisualLine | undefined;
    const probeWindow = window as CaretLineProbeWindow;
    try {
      line = typeof probeWindow.okfCaretLineProbe === "function"
        ? probeWindow.okfCaretLineProbe(control)
        : measureCaretVisualLine(control);
    } catch {
      line = undefined;
    }
    return !line || line[edge] !== false;
  }

  // Home/End jump to the start/end of the edited text. On macOS the native keys scroll the nearest
  // scrollable ancestor (the whole preview, or a wide table horizontally) instead of moving the
  // caret, so they are handled here; Cmd+Left/Right keep their native line behaviour.
  function homeEndInControl(event: KeyboardEvent, control: TextControl): boolean {
    if ((event.key !== "Home" && event.key !== "End") || event.isComposing) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (typeof control.setSelectionRange !== "function") return false;
    event.preventDefault?.();
    // Block sources end with a line break; End stops before it rather than on an empty last line.
    const target = event.key === "Home" ? 0 : String(control.value ?? "").replace(/[\r\n]+$/u, "").length;
    if (!event.shiftKey) {
      control.setSelectionRange(target, target);
      return true;
    }
    const backward = control.selectionDirection === "backward";
    const anchor = Number(backward ? control.selectionEnd : control.selectionStart);
    if (target < anchor) control.setSelectionRange(target, anchor, "backward");
    else control.setSelectionRange(anchor, target, "forward");
    return true;
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-019
  function keepUndoInControl(event: KeyboardEvent): boolean {
    const mod = event.metaKey || event.ctrlKey;
    const code = event.keyCode;
    const letter = typeof event.key === "string" ? event.key.toLowerCase() : "";
    if (mod && !event.altKey && (code === 90 || code === 89 || letter === "z" || letter === "y")) {
      event.stopPropagation?.();
      return true;
    }
    return false;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-069
  // Typing *, _, backtick or ~ over a selection wraps it (as one native, undoable edit) and keeps the text
  // selected, so a second press wraps again. No selection, modifiers and IME stay native.
  function wrapSelectionInControl(event: KeyboardEvent, control: TextControl, onFallbackInput: () => void): boolean {
    // AltGr reports ctrlKey and altKey together; French and German layouts type ~ and backtick so.
    const altGraph = event.getModifierState?.("AltGraph") === true;
    if (event.isComposing || event.metaKey) return false;
    if (!altGraph && (event.ctrlKey || event.altKey)) return false;
    if (typeof event.key !== "string" || event.key.length !== 1) return false;
    const edit = textEditing.wrapSelection(
      String(control.value ?? ""),
      Number(control.selectionStart),
      Number(control.selectionEnd),
      event.key,
    );
    if (!edit) return false;
    event.preventDefault?.();
    applyTextEdit(control, edit, onFallbackInput);
    return true;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-085
  // Cmd/Ctrl+B, +I and +/ run a registered edit action on the block text box as one native edit.
  // The key is consumed even when the action has nothing to change, so the host editor never
  // sees it (Cmd+B would toggle the side bar).
  function paletteShortcut(event: KeyboardEvent, control: TextControl, onFallbackInput: () => void): boolean {
    const scope = state.activeBlockEdit?.selectedCell ? "cell" : "block";
    const action = editActions.shortcutFor(event, isApplePlatform());
    if (!action || !action.scopes.includes(scope)) return false;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (action.panel === "link") {
      rt.editorChrome.openLinkPanel(control, onFallbackInput);
      return true;
    }
    const edit = action.apply({
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope,
    });
    if (edit) applyTextEdit(control, edit, onFallbackInput);
    return true;
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-039
  // Applies a text edit through the native editing path so the undo stack keeps the step; falls
  // back to a manual splice where execCommand is unavailable.
  function applyTextEdit(control: TextControl, rawEdit: Parameters<TextControls["applyTextEdit"]>[1],
    onFallbackInput: () => void): void {
    // A table cell holds one line, and a bare pipe would split it: sanitize what is inserted.
    const inCell = Boolean(state.activeBlockEdit?.selectedCell) && control === state.activeBlockEdit?.tableInput;
    const edit = inCell ? textEditing.cellSafeEdit(String(control.value ?? ""), rawEdit) : rawEdit;
    control.focus({ preventScroll: true });
    control.setSelectionRange(edit.start, edit.end);
    let done = false;
    if (typeof document.execCommand === "function") {
      try {
        done = edit.text === "" && edit.end > edit.start
          ? document.execCommand("delete", false)
          : document.execCommand("insertText", false, edit.text);
      } catch {
        done = false;
      }
    }
    if (!done) {
      const value = String(control.value);
      control.value = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
      onFallbackInput();
    }
    control.setSelectionRange(edit.selectionStart, edit.selectionEnd);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-026
  function focusTextControlAtLastContent(element: HTMLElement, caretPosition: CaretPosition = "end"): void {
    element.focus({ preventScroll: true });
    const control = element as TextControl;
    const tagName = String(control.tagName || "").toUpperCase();
    const supportsTextSelection = tagName === "TEXTAREA"
      || (tagName === "INPUT" && ["text", "search", "tel", "url", "password"].includes(control.type));
    if (!supportsTextSelection || typeof control.setSelectionRange !== "function") return;
    const value = String(control.value ?? "");
    let position = caretPosition === "start" ? 0 : value.trimEnd().length;
    if (caretPosition && typeof caretPosition === "object" && Number.isSafeInteger(caretPosition.offset)) {
      position = Math.max(0, Math.min(value.length, caretPosition.offset!));
    } else if (caretPosition && typeof caretPosition === "object") {
      const mapped = textEditing.mapRenderedCaret(
        value,
        String(caretPosition.before ?? ""),
        String(caretPosition.after ?? ""),
      );
      if (mapped !== undefined && Number.isSafeInteger(mapped) && mapped >= 0 && mapped <= value.length) position = mapped;
    }
    control.setSelectionRange(position, position);
  }

  return {
    boundaryNavigation,
    homeEndInControl,
    keepUndoInControl,
    wrapSelectionInControl,
    paletteShortcut,
    applyTextEdit,
    focusTextControlAtLastContent,
  };
}
