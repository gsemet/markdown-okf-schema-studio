import type { TextEdit } from "./textEditing";

export type EditActionMode = "strict" | "gfm" | "myst";
export type EditActionScope = "block" | "cell";

/** What an action receives: the text box value, its selection and where the text box lives. */
export interface EditActionContext {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  scope: EditActionScope;
  /** Optional argument chosen in the action's popover (for example a heading level). */
  arg?: string;
}

/** Keyboard binding of an action. `anyShift` lets layouts that type the key with Shift match. */
export interface EditActionShortcut {
  /** `KeyboardEvent.code` values accepted for the key (layout independent). */
  codes: string[];
  /** `KeyboardEvent.key` values accepted when the code differs (for example "/" on AZERTY). */
  keys?: string[];
  anyShift?: boolean;
  /**
   * `primary` needs the platform's command key (Cmd on macOS, Ctrl elsewhere); `any` accepts
   * either Cmd or Ctrl. Defaults to `primary`.
   */
  modifier?: "primary" | "any";
}

/**
 * One registered editing operation. The palette renders `label`, `icon` and `group`; a shortcut
 * and the palette button run the same `apply`, which returns the edit to run as one native step.
 * Modes are additive: an action listed for `strict` shows in every mode, `gfm` in GFM and MyST.
 */
export interface EditAction {
  id: string;
  label: string;
  icon: string;
  group: string;
  modes: EditActionMode[];
  scopes: EditActionScope[];
  shortcut?: EditActionShortcut;
  /** Name of the popover the palette opens to pick `ctx.arg`; absent for one-click actions. */
  popover?: string;
  apply(ctx: EditActionContext): TextEdit | undefined;
}

/** The subset of a keyboard event the shortcut matcher reads. */
export interface EditActionKeyEvent {
  key?: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  getModifierState?: (name: string) => boolean;
}

export interface EditActionRegistry {
  actions: EditAction[];
  byId: Map<string, EditAction>;
  /**
   * The action bound to this key event, or `undefined` (composition and AltGr never match).
   * `mac` selects the primary modifier: Cmd on macOS, Ctrl elsewhere.
   */
  shortcutFor(event: EditActionKeyEvent, mac?: boolean): EditAction | undefined;
}

/**
 * Action registry of the raw-Markdown block editor. Later palette tasks only append entries to
 * `actions`. The factory is stringified into the webview runtime, so its body must stay
 * self-contained.
 */
export function createEditActions(): EditActionRegistry {
  const isSpace = (char: string): boolean => /\s/u.test(char);
  const isWordChar = (char: string): boolean => /[\p{L}\p{N}_]/u.test(char);

  /**
   * Toggles an inline `*` marker pair (`*` italic, `**` bold) around the selection. A run of `n`
   * asterisks around the content holds bold when `n >= 2` and italic when `n` is odd, so
   * `***x***` carries both and each toggle removes only its own share.
   */
  function toggleAsterisks(ctx: EditActionContext, width: number): TextEdit | undefined {
    const { value } = ctx;
    const selectionStart = ctx.selectionStart;
    const selectionEnd = ctx.selectionEnd;
    if (selectionStart < 0 || selectionEnd > value.length || selectionStart > selectionEnd) {
      return undefined;
    }
    const marker = "*".repeat(width);

    // Content range: the selection without surrounding whitespace.
    let start = selectionStart;
    let end = selectionEnd;
    while (start < end && isSpace(value.charAt(start))) start += 1;
    while (end > start && isSpace(value.charAt(end - 1))) end -= 1;
    if (start === end) {
      start = selectionStart;
      end = selectionStart;
    }
    const collapsed = selectionStart === selectionEnd;
    if (collapsed) {
      // Detect the markers around the word at the caret; a caret outside a word uses the caret.
      let wordStart = start;
      let wordEnd = end;
      while (wordStart > 0 && isWordChar(value.charAt(wordStart - 1))) wordStart -= 1;
      while (wordEnd < value.length && isWordChar(value.charAt(wordEnd))) wordEnd += 1;
      start = wordStart;
      end = wordEnd;
    }

    // Asterisk runs flanking the content, whether they lie inside or outside the selection.
    let contentStart = start;
    let contentEnd = end;
    const inner = value.slice(start, end);
    if (inner.length > 0 && /[^*]/u.test(inner)) {
      while (value.charAt(contentStart) === "*") contentStart += 1;
      while (value.charAt(contentEnd - 1) === "*") contentEnd -= 1;
    }
    let runStart = contentStart;
    while (runStart > 0 && value.charAt(runStart - 1) === "*") runStart -= 1;
    let runEnd = contentEnd;
    while (runEnd < value.length && value.charAt(runEnd) === "*") runEnd += 1;
    const content = value.slice(contentStart, contentEnd);
    const flanked =
      content.length === 0 ||
      (!isSpace(content.charAt(0)) && !isSpace(content.charAt(content.length - 1)));
    const run = flanked ? Math.min(contentStart - runStart, runEnd - contentEnd) : 0;
    const present = width === 2 ? run >= 2 : run % 2 === 1;
    // A selection that cuts into a marker run on one side only would produce garbled markup.
    if (!present && !collapsed && flanked) {
      const leftRun = contentStart - runStart;
      const rightRun = runEnd - contentEnd;
      if (Math.min(leftRun, rightRun) === 0 && Math.max(leftRun, rightRun) > 0) return undefined;
    }

    if (present) {
      const from = contentStart - width;
      const to = contentEnd + width;
      const selectionFrom = from;
      if (collapsed) {
        const caret = Math.max(from, selectionStart - width);
        const bounded = Math.min(caret, from + content.length);
        return {
          start: from,
          end: to,
          text: content,
          selectionStart: bounded,
          selectionEnd: bounded,
        };
      }
      return {
        start: from,
        end: to,
        text: content,
        selectionStart: selectionFrom,
        selectionEnd: selectionFrom + content.length,
      };
    }

    if (collapsed) {
      return {
        start: selectionStart,
        end: selectionStart,
        text: marker + marker,
        selectionStart: selectionStart + width,
        selectionEnd: selectionStart + width,
      };
    }
    const wrapStart = start;
    const wrapEnd = end;
    return {
      start: wrapStart,
      end: wrapEnd,
      text: marker + value.slice(wrapStart, wrapEnd) + marker,
      selectionStart: wrapStart + width,
      selectionEnd: wrapEnd + width,
    };
  }

  const TODO_OPEN = "<!-- TODO: ";
  const TODO_CLOSE = " -->";
  const TODO_LINE = /^([ \t]*)<!--[ \t]*TODO:[ \t]?(.*?)[ \t]?-->[ \t]*$/u;

  /**
   * Toggles `<!-- TODO: … -->` around each non-blank line touched by the selection: when every
   * such line is already wrapped they are unwrapped, otherwise the unwrapped ones are wrapped.
   * A blank line gets an empty comment with the caret inside.
   */
  function toggleTodo(ctx: EditActionContext): TextEdit | undefined {
    const { value, selectionStart, selectionEnd } = ctx;
    if (selectionStart < 0 || selectionEnd > value.length || selectionStart > selectionEnd) {
      return undefined;
    }
    const firstStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    // A non-empty selection that ends at a line start does not include that last line.
    const probe =
      selectionEnd > selectionStart && value.charAt(selectionEnd - 1) === "\n"
        ? selectionEnd - 1
        : selectionEnd;
    const lastBreak = value.indexOf("\n", probe);
    const lastEnd = lastBreak === -1 ? value.length : lastBreak;
    const lines = value.slice(firstStart, lastEnd).split("\n");

    if (lines.length === 1 && lines[0].trim() === "") {
      const indent = lines[0];
      const caret = firstStart + indent.length + TODO_OPEN.length;
      return {
        start: firstStart,
        end: lastEnd,
        text: indent + TODO_OPEN + TODO_CLOSE,
        selectionStart: caret,
        selectionEnd: caret,
      };
    }

    // A line holding `-->` would end the comment early; such lines are never wrapped.
    const wrappable = (line: string): boolean => TODO_LINE.test(line) || !line.includes("-->");
    const filled = lines.filter((line) => line.trim() !== "");
    const unwrap = filled.length > 0 && filled.every((line) => TODO_LINE.test(line));
    const out = lines.map((line) => {
      if (line.trim() === "") return line;
      const wrapped = TODO_LINE.exec(line);
      if (unwrap) return wrapped![1] + wrapped![2];
      if (wrapped || !wrappable(line)) return line;
      const indent = /^[ \t]*/u.exec(line)![0];
      return indent + TODO_OPEN + line.slice(indent.length).trimEnd() + TODO_CLOSE;
    });
    const text = out.join("\n");
    if (text === lines.join("\n")) return undefined;

    if (selectionStart === selectionEnd && lines.length === 1) {
      const indentLength = /^[ \t]*/u.exec(lines[0])![0].length;
      const column = selectionStart - firstStart;
      const shift = unwrap ? -TODO_OPEN.length : TODO_OPEN.length;
      const next = Math.max(indentLength, Math.min(column + shift, out[0].length));
      const caret = firstStart + (column < indentLength ? column : next);
      return { start: firstStart, end: lastEnd, text, selectionStart: caret, selectionEnd: caret };
    }
    return {
      start: firstStart,
      end: lastEnd,
      text,
      selectionStart: firstStart,
      selectionEnd: firstStart + text.length,
    };
  }

  const actions: EditAction[] = [
    {
      id: "bold",
      label: "Bold",
      icon: "bold",
      group: "inline",
      modes: ["strict"],
      scopes: ["block", "cell"],
      shortcut: { codes: ["KeyB"], keys: ["b"] },
      apply: (ctx) => toggleAsterisks(ctx, 2),
    },
    {
      id: "italic",
      label: "Italic",
      icon: "italic",
      group: "inline",
      modes: ["strict"],
      scopes: ["block", "cell"],
      shortcut: { codes: ["KeyI"], keys: ["i"] },
      apply: (ctx) => toggleAsterisks(ctx, 1),
    },
    {
      id: "todo",
      label: "TODO",
      icon: "todo",
      group: "annotation",
      modes: ["strict"],
      scopes: ["block"],
      shortcut: { codes: ["Slash"], keys: ["/"], anyShift: true, modifier: "any" },
      apply: toggleTodo,
    },
  ];

  const byId = new Map<string, EditAction>();
  for (const action of actions) byId.set(action.id, action);

  function shortcutFor(event: EditActionKeyEvent, mac?: boolean): EditAction | undefined {
    if (event.isComposing) return undefined;
    // AltGr reports ctrlKey and altKey together: it types characters, it is not a shortcut.
    if (event.altKey || event.getModifierState?.("AltGraph") === true) return undefined;
    if (!event.metaKey && !event.ctrlKey) return undefined;
    const primary = mac === true ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    // The typed character wins, so Cmd+X on Dvorak (physical B key) stays cut. The physical code
    // is only a fallback on layouts whose key is not a Latin letter (Cyrillic, Greek).
    const latinLetter = /^[a-z]$/u.test(key);
    for (const action of actions) {
      const shortcut = action.shortcut;
      if (!shortcut) continue;
      if (shortcut.modifier === "any" ? false : !primary) continue;
      if (event.shiftKey && !shortcut.anyShift) continue;
      if (shortcut.keys?.includes(key)) return action;
      const letterShortcut = shortcut.keys?.every((candidate) => /^[a-z]$/u.test(candidate));
      if (latinLetter && letterShortcut) continue;
      if (typeof event.code === "string" && shortcut.codes.includes(event.code)) return action;
    }
    return undefined;
  }

  return { actions, byId, shortcutFor };
}
