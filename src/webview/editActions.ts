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

export interface EditActionOption {
  value: string;
  label: string;
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
  /** Tooltip text without the shortcut; defaults to `label`. */
  title?: string;
  /** Name of the popover the palette opens to pick `ctx.arg`; absent for one-click actions. */
  popover?: string;
  /** What the popover lists: `value` becomes `ctx.arg`, `label` is shown. */
  options?: EditActionOption[];
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
  /** The shortcut as shown in a tooltip ("Ctrl+B", "Cmd+B" on macOS), or "" without one. */
  shortcutLabel(action: EditAction, mac?: boolean): string;
}

/**
 * Action registry of the raw-Markdown block editor. Later palette tasks only append entries to
 * `actions`. The factory is stringified into the webview runtime, so its body must stay
 * self-contained. `languages` are the fence languages the preview highlights; the code block
 * action offers them after "text".
 */
export function createEditActions(languages: string[] = []): EditActionRegistry {
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


  /** The lines a selection touches (a selection ending at a line start excludes that line). */
  function touchedLines(ctx: EditActionContext) {
    const { value, selectionStart, selectionEnd } = ctx;
    const firstStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const probe =
      selectionEnd > selectionStart && value.charAt(selectionEnd - 1) === "\n"
        ? selectionEnd - 1
        : selectionEnd;
    const lastBreak = value.indexOf("\n", probe);
    const lastEnd = lastBreak === -1 ? value.length : lastBreak;
    return { firstStart, lastEnd, lines: value.slice(firstStart, lastEnd).split("\n") };
  }

  function validSelection(ctx: EditActionContext): boolean {
    return (
      ctx.selectionStart >= 0 &&
      ctx.selectionEnd <= ctx.value.length &&
      ctx.selectionStart <= ctx.selectionEnd
    );
  }

  /**
   * Rewrites the start of every touched line: `rewrite` says how many leading characters to drop
   * and what to put instead. The selection follows the text; a caret at the start of a line ends
   * up after the new prefix, a selection start at column 0 stays in front of it.
   */
  function editLinePrefixes(
    ctx: EditActionContext,
    rewrite: (line: string, count: number) => { remove: number; add: string },
  ): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    const changes = lines.map((line) => rewrite(line, lines.length));
    if (changes.every((change) => change.remove === 0 && change.add === "")) return undefined;
    const oldOffsets: number[] = [];
    const newOffsets: number[] = [];
    let oldAt = firstStart;
    let newAt = firstStart;
    const out = lines.map((line, index) => {
      oldOffsets.push(oldAt);
      newOffsets.push(newAt);
      const text = changes[index].add + line.slice(changes[index].remove);
      oldAt += line.length + 1;
      newAt += text.length + 1;
      return text;
    });
    const text = out.join("\n");
    const growth = text.length - (lastEnd - firstStart);
    const collapsed = ctx.selectionStart === ctx.selectionEnd;
    const map = (position: number, isStart: boolean): number => {
      if (position > lastEnd) return position + growth;
      let index = lines.length - 1;
      while (index > 0 && oldOffsets[index] > position) index -= 1;
      const column = position - oldOffsets[index];
      const { remove, add } = changes[index];
      if (column <= remove) {
        return newOffsets[index] + (isStart && !collapsed && column === 0 ? 0 : add.length);
      }
      return newOffsets[index] + column - remove + add.length;
    };
    return {
      start: firstStart,
      end: lastEnd,
      text,
      selectionStart: map(ctx.selectionStart, true),
      selectionEnd: map(ctx.selectionEnd, false),
    };
  }

  /** Sets (or, with level 0, removes) the `#` prefix on each touched non-blank line. */
  function setHeading(ctx: EditActionContext): TextEdit | undefined {
    if (ctx.arg === undefined || !/^[0-5]$/u.test(ctx.arg)) return undefined;
    const level = Number(ctx.arg);
    const prefix = level > 0 ? "#".repeat(level) + " " : "";
    return editLinePrefixes(ctx, (line, count) => {
      if (line.trim() === "") {
        return count === 1 && level > 0 ? { remove: line.length, add: prefix } : { remove: 0, add: "" };
      }
      const existing = /^(#{1,6})(?:[ \t]+|$)/u.exec(line);
      if (existing && existing[1].length === level) return { remove: 0, add: "" };
      return { remove: existing ? existing[0].length : 0, add: prefix };
    });
  }

  /**
   * Quotes every touched line with `> ` in front of any list marker, or removes one quote level
   * when every non-blank touched line is already quoted.
   */
  function toggleQuote(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const { lines } = touchedLines(ctx);
    const filled = lines.filter((line) => line.trim() !== "");
    const unquote = filled.length > 0 && filled.every((line) => line.startsWith(">"));
    return editLinePrefixes(ctx, (line, count) => {
      if (unquote) {
        const marker = /^> ?/u.exec(line);
        return { remove: marker ? marker[0].length : 0, add: "" };
      }
      if (line.trim() === "") {
        return count === 1 ? { remove: line.length, add: "> " } : { remove: 0, add: line === "" ? ">" : "" };
      }
      return { remove: 0, add: "> " };
    });
  }

  /** Toggles a `~~` pair around the selection or the word at the caret. */
  function toggleStrikethrough(ctx: EditActionContext): TextEdit | undefined {
    const { value, selectionStart, selectionEnd } = ctx;
    if (!validSelection(ctx)) return undefined;
    const marker = "~~";
    const collapsed = selectionStart === selectionEnd;
    let start = selectionStart;
    let end = selectionEnd;
    while (start < end && isSpace(value.charAt(start))) start += 1;
    while (end > start && isSpace(value.charAt(end - 1))) end -= 1;
    if (start === end) {
      start = selectionStart;
      end = selectionStart;
    }
    if (collapsed) {
      while (start > 0 && isWordChar(value.charAt(start - 1))) start -= 1;
      while (end < value.length && isWordChar(value.charAt(end))) end += 1;
    }
    if (
      end - start >= 4 &&
      value.startsWith(marker, start) &&
      value.slice(end - 2, end) === marker
    ) {
      // Markers inside the selection.
      const content = value.slice(start + 2, end - 2);
      return {
        start,
        end,
        text: content,
        selectionStart: start,
        selectionEnd: start + content.length,
      };
    }
    if (start >= 2 && value.slice(start - 2, start) === marker && value.slice(end, end + 2) === marker) {
      const content = value.slice(start, end);
      if (collapsed) {
        const caret = Math.max(start - 2, selectionStart - 2);
        return { start: start - 2, end: end + 2, text: content, selectionStart: caret, selectionEnd: caret };
      }
      return {
        start: start - 2,
        end: end + 2,
        text: content,
        selectionStart: start - 2,
        selectionEnd: start - 2 + content.length,
      };
    }
    if (collapsed) {
      return {
        start: selectionStart,
        end: selectionStart,
        text: marker + marker,
        selectionStart: selectionStart + 2,
        selectionEnd: selectionStart + 2,
      };
    }
    return {
      start,
      end,
      text: marker + value.slice(start, end) + marker,
      selectionStart: start + 2,
      selectionEnd: end + 2,
    };
  }

  /**
   * Wraps the touched lines in a fence, or inserts an empty fence with the caret inside (on a
   * blank line, otherwise below the caret line). The fence outgrows any backtick run inside.
   */
  function insertCodeFence(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const language = ctx.arg !== undefined && /^[\w+#.-]+$/u.test(ctx.arg) ? ctx.arg : "";
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    const block = lines.join("\n");
    const runs = block.match(/`+/gu) ?? [];
    const width = Math.max(3, ...runs.map((run) => run.length + 1));
    const fence = "`".repeat(width);
    const open = fence + language;
    if (ctx.selectionStart !== ctx.selectionEnd) {
      return {
        start: firstStart,
        end: lastEnd,
        text: open + "\n" + block + "\n" + fence,
        selectionStart: firstStart + open.length + 1,
        selectionEnd: firstStart + open.length + 1 + block.length,
      };
    }
    if (block.trim() === "") {
      const caret = firstStart + open.length + 1;
      return {
        start: firstStart,
        end: lastEnd,
        text: open + "\n\n" + fence,
        selectionStart: caret,
        selectionEnd: caret,
      };
    }
    const caret = lastEnd + 2 + open.length + 1;
    return {
      start: lastEnd,
      end: lastEnd,
      text: "\n\n" + open + "\n\n" + fence,
      selectionStart: caret,
      selectionEnd: caret,
    };
  }

  /** Puts a horizontal rule, set apart by blank lines, after the line the selection ends on. */
  function insertRule(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const { value } = ctx;
    const { firstStart, lastEnd } = touchedLines({ ...ctx, selectionStart: ctx.selectionEnd });
    const blank = value.slice(firstStart, lastEnd).trim() === "";
    const start = blank ? firstStart : lastEnd;
    const lead = value.slice(0, start);
    const gap = !blank
      ? "\n\n"
      : lead === "" || lead.endsWith("\n\n")
        ? ""
        : lead.endsWith("\n")
          ? "\n"
          : "\n\n";
    const end = value.charAt(lastEnd) === "\n" ? lastEnd + 1 : lastEnd;
    const text = gap + "---\n\n";
    const caret = start + text.length;
    return { start, end, text, selectionStart: caret, selectionEnd: caret };
  }

  const HEADING_OPTIONS: EditActionOption[] = [
    { value: "0", label: "Paragraph" },
    ...[1, 2, 3, 4, 5].map((level) => ({ value: String(level), label: "Heading " + level })),
  ];
  const LANGUAGE_OPTIONS: EditActionOption[] = [
    { value: "text", label: "text" },
    ...Array.from(new Set(languages))
      .filter((name) => name !== "text")
      .sort()
      .map((name) => ({ value: name, label: name })),
  ];

  const actions: EditAction[] = [
    {
      id: "heading",
      label: "Heading",
      title: "Heading level",
      icon: "heading",
      group: "block",
      modes: ["strict"],
      scopes: ["block"],
      popover: "heading",
      options: HEADING_OPTIONS,
      apply: setHeading,
    },
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
      id: "strikethrough",
      label: "Strikethrough",
      icon: "strikethrough",
      group: "inline",
      modes: ["strict"],
      scopes: ["block", "cell"],
      apply: toggleStrikethrough,
    },
    {
      id: "codeFence",
      label: "Code block",
      title: "Code block (choose a language)",
      icon: "code",
      group: "block",
      modes: ["strict"],
      scopes: ["block"],
      popover: "language",
      options: LANGUAGE_OPTIONS,
      apply: insertCodeFence,
    },
    {
      id: "quote",
      label: "Blockquote",
      icon: "quote",
      group: "block",
      modes: ["strict"],
      scopes: ["block"],
      apply: toggleQuote,
    },
    {
      id: "rule",
      label: "Horizontal rule",
      icon: "rule",
      group: "block",
      modes: ["strict"],
      scopes: ["block"],
      apply: insertRule,
    },
    {
      id: "todo",
      label: "TODO",
      title: "Toggle TODO comment",
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

  function shortcutLabel(action: EditAction, mac?: boolean): string {
    const shortcut = action.shortcut;
    if (!shortcut) return "";
    const key = shortcut.keys?.[0] ?? "";
    return (mac === true ? "Cmd" : "Ctrl") + "+" + key.toUpperCase();
  }

  return { actions, byId, shortcutFor, shortcutLabel };
}
