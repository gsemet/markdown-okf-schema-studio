import type { MarkdownTableTools } from "./markdownTable";
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

/** One emoji of the picker: the Unicode character and its English name (used by the filter). */
export interface EmojiEntry {
  char: string;
  name: string;
}

export interface EmojiCategory {
  id: string;
  label: string;
  items: EmojiEntry[];
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
  /** Popover `grid`: the size picker (`ctx.arg` becomes "<rows>x<columns>"). */
  grid?: { rows: number; cols: number };
  /** Popover `emoji`: the picker's categories (`ctx.arg` becomes the chosen character). */
  emoji?: EmojiCategory[];
  /**
   * Name of the small panel the palette button and the shortcut open instead of running `apply`
   * directly; the panel collects the values and the page then runs the edit.
   */
  panel?: string;
  /**
   * The button and the shortcut first run `apply` without an argument, then open the popover at
   * the caret; choosing an option runs `apply` again with it (the Alert button inserts the alert,
   * then the dropdown changes its type).
   */
  popoverAtCaret?: boolean;
  /**
   * The button opens a filterable list the host fills (`targets`: labels of the document,
   * `citations`: keys of the workspace `.bib` files); the chosen value becomes `ctx.arg`.
   */
  hostList?: "targets" | "citations";
  /**
   * The button asks the host for a native open dialog (`document`: a Markdown file, `image`: an
   * image file); the answer, a path relative to the document, is `ctx.arg`.
   */
  hostDialog?: "document" | "image";
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

/** What the link panel starts with, and the part of the text a link insertion replaces. */
export interface LinkDraft {
  text: string;
  url: string;
  start: number;
  end: number;
  /** The quoted title of an existing link (kept when the link is replaced); absent otherwise. */
  title?: string;
}

export interface EditActionRegistry {
  actions: EditAction[];
  byId: Map<string, EditAction>;
  /** The link panel's initial values for the selection (an existing link is read back). */
  linkDraft(ctx: EditActionContext): LinkDraft;
  /** The edit that writes `[text](url)` over the draft's range; see `linkDraft`. */
  linkEdit(ctx: EditActionContext, text: string, url: string): TextEdit;
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
 * action offers them after "text". `tableTools` (the Markdown table parser and HTML writer) lets
 * the HTML table action convert the table under the caret; without it the action only inserts.
 */
export function createEditActions(
  languages: string[] = [],
  tableTools?: MarkdownTableTools,
): EditActionRegistry {
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

  const LINK_PATTERN =
    /\[((?:\\.|[^\]\\\n])*)\]\(\s*(<[^>\n]*>|[^)\s\n]*)(?:\s+("[^"\n]*"))?\s*\)/gu;
  const URL_SELECTION = /^(?:https?:\/\/|mailto:|www\.)\S+$/iu;

  /**
   * Starting values of the link panel. A selection inside an existing `[text](url)` (or a caret
   * within it) reads that link back and replaces all of it; a selected URL becomes the target
   * with an empty text; any other selection becomes the text.
   */
  function linkDraft(ctx: EditActionContext): LinkDraft {
    const { value, selectionStart, selectionEnd } = ctx;
    const collapsed = selectionStart === selectionEnd;
    for (const match of value.matchAll(LINK_PATTERN)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (start > 0 && value.charAt(start - 1) === "!") continue;
      const inside = collapsed
        ? selectionStart > start && selectionStart < end
        : selectionStart >= start && selectionEnd <= end;
      if (!inside) continue;
      const target = match[2];
      const url = target.startsWith("<") ? target.slice(1, -1) : target;
      const text = match[1].replace(/\\([[\]])/gu, "$1");
      return match[3] === undefined ? { text, url, start, end } : { text, url, start, end, title: match[3] };
    }
    const selected = value.slice(selectionStart, selectionEnd);
    if (URL_SELECTION.test(selected)) {
      return { text: "", url: selected, start: selectionStart, end: selectionEnd };
    }
    return { text: selected, url: "", start: selectionStart, end: selectionEnd };
  }

  function linkEdit(ctx: EditActionContext, text: string, url: string): TextEdit {
    const draft = linkDraft(ctx);
    // `<` and `>` cannot be written even inside `<...>`, so they are percent-encoded.
    const target = url.trim().replace(/</gu, "%3C").replace(/>/gu, "%3E");
    const label = (text.trim() === "" ? target : text.trim()).replace(/([[\]])/gu, "\\$1");
    let depth = 0;
    let balanced = true;
    for (const char of target) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (depth < 0) balanced = false;
    }
    const written = /\s/u.test(target) || !balanced || depth !== 0 ? "<" + target + ">" : target;
    const prefix = "[" + label + "](";
    // An empty target leaves the caret inside the parentheses to type it there.
    const caret = draft.start + prefix.length + (target === "" ? 0 : written.length + 1
      + (draft.title === undefined ? 0 : draft.title.length + 1));
    return {
      start: draft.start,
      end: draft.end,
      text: prefix + written + (draft.title === undefined ? "" : " " + draft.title) + ")",
      selectionStart: caret,
      selectionEnd: caret,
    };
  }


  // Emoji are plain data: "<character> <english name>" per entry, no network, Unicode only (flags
  // are left out on purpose). The filter matches the words of the name.
  const EMOJI_SOURCE: Array<[string, string, string]> = [
    ["smileys", "Smileys", "😀 grinning face;😃 smiling face with big eyes;😄 smiling face with smiling eyes;"
      + "😁 beaming face;😆 grinning squinting face laugh;😅 grinning face with sweat;"
      + "😂 face with tears of joy;🙂 slightly smiling face;🙃 upside-down face;😉 winking face;"
      + "😊 smiling face with blush;😇 smiling face with halo angel;😍 smiling face with heart eyes;"
      + "🤩 star-struck;😘 face blowing a kiss;😋 face savoring food yum;😎 smiling face with sunglasses cool;"
      + "🤔 thinking face;😐 neutral face;😴 sleeping face;"
      + "😢 crying face sad;😭 loudly crying face;😡 pouting face angry;😱 face screaming in fear;"
      + "🤯 exploding head mind blown;🥳 partying face"],
    ["people", "People and hands", "👍 thumbs up like;👎 thumbs down dislike;👏 clapping hands applause;"
      + "🙌 raising hands celebration;🙏 folded hands please thanks pray;🤝 handshake agreement;"
      + "👋 waving hand hello;✋ raised hand stop;👌 ok hand;✌️ victory hand peace;🤞 crossed fingers luck;"
      + "👉 backhand index pointing right;👈 backhand index pointing left;👆 backhand index pointing up;"
      + "👇 backhand index pointing down;💪 flexed biceps strong;🤷 person shrugging;🤦 person facepalming;"
      + "🙋 person raising hand;👀 eyes look;🧠 brain;👤 bust in silhouette user;"
      + "👨‍💻 man technologist;👩‍💻 woman technologist"],
    ["nature", "Nature", "🌱 seedling sprout;🌲 evergreen tree;🌳 deciduous tree;"
      + "🌸 cherry blossom;🌹 rose;🌻 sunflower;🍀 four leaf clover;🍁 maple leaf;🔥 fire flame;"
      + "💧 droplet water;🌊 water wave;⚡ high voltage lightning;☀️ sun;🌙 crescent moon;⭐ star;"
      + "🌟 glowing star;❄️ snowflake;🌈 rainbow;☁️ cloud;🐛 bug insect;🐞 lady beetle;🐝 honeybee;"
      + "🦋 butterfly;🐙 octopus;🐧 penguin;🦊 fox;🐱 cat face"],
    ["food", "Food and drink", "🍎 red apple;🍏 green apple;🍌 banana;🍇 grapes;🍓 strawberry;🍋 lemon;"
      + "🥑 avocado;🥕 carrot;🌽 ear of corn;🍞 bread;🧀 cheese wedge;🍕 pizza;🍔 hamburger;🍟 french fries;"
      + "🌮 taco;🍣 sushi;🍪 cookie;🍰 shortcake cake;🍫 chocolate bar;🍩 doughnut;☕ hot beverage coffee;"
      + "🍵 teacup tea;🍺 beer mug;🍷 wine glass"],
    ["objects", "Objects", "💻 laptop computer;🖥️ desktop computer;⌨️ keyboard;📱 mobile phone;"
      + "💡 light bulb idea;🔧 wrench tool;🔨 hammer;⚙️ gear settings;🔒 locked padlock;🔓 unlocked padlock;"
      + "🔑 key;📁 file folder;📂 open file folder;📄 page facing up document;📝 memo note;"
      + "📎 paperclip;📅 calendar;📊 bar chart;📈 chart increasing;📉 chart decreasing;🔍 magnifying glass search;"
      + "📦 package box;🚀 rocket launch;🎯 direct hit target;🎉 party popper tada;🏆 trophy;"
      + "📚 books;🔔 bell notification"],
    ["symbols", "Symbols and status", "✅ check mark button done;☑️ check box with check;✔️ check mark;"
      + "❌ cross mark;❎ cross mark button;⚠️ warning;🚫 prohibited;⛔ no entry;❗ red exclamation mark;"
      + "❓ red question mark;ℹ️ information;➕ plus;➖ minus;➡️ right arrow;⬅️ left arrow;⬆️ up arrow;"
      + "⬇️ down arrow;🔄 counterclockwise arrows button refresh;🔁 repeat button;❤️ red heart;💔 broken heart;"
      + "💯 hundred points;🆗 ok button;🔴 red circle;"
      + "🟢 green circle;🔵 blue circle"],
  ];
  const EMOJI_CATEGORIES: EmojiCategory[] = EMOJI_SOURCE.map(([id, label, list]) => ({
    id,
    label,
    items: list.split(";").map((entry) => {
      const space = entry.indexOf(" ");
      return { char: entry.slice(0, space), name: entry.slice(space + 1) };
    }),
  }));

  /** A table of `rows` x `cols` (the header counts as a row) set apart by blank lines. */
  function insertTable(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const size = /^([1-9])x([1-9])$/u.exec(ctx.arg ?? "");
    if (!size) return undefined;
    const rows = Number(size[1]);
    const cols = Number(size[2]);
    const row = (cell: (column: number) => string): string =>
      "| " + Array.from({ length: cols }, (_, column) => cell(column)).join(" | ") + " |";
    const header = row((column) => "Column " + (column + 1));
    const lines = [header, row(() => "---")];
    for (let index = 1; index < rows; index += 1) lines.push(row(() => ""));
    // The table goes after the selection, which stays untouched.
    return insertBlockAfterSelection(ctx, lines.join("\n"), "Column 1");
  }

  /**
   * A block set apart by blank lines after the selection (which stays untouched); the first
   * occurrence of `select` in it becomes the selection.
   */
  function insertBlockAfterSelection(
    ctx: EditActionContext,
    body: string,
    select: string,
  ): TextEdit {
    const at = ctx.selectionEnd;
    const before = ctx.value.slice(0, at);
    const after = ctx.value.slice(at);
    const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const breaks = (/^\n*/u.exec(after) ?? [""])[0].length;
    const trail = after === "" || breaks >= 2 ? "" : breaks === 1 ? "\n" : "\n\n";
    const first = at + lead.length + Math.max(0, body.indexOf(select));
    return {
      start: at,
      end: at,
      text: lead + body + trail,
      selectionStart: first,
      selectionEnd: first + select.length,
    };
  }

  const ALERT_TYPES = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
  const ALERT_HEAD = /^(\s{0,3}>\s?\[!)(NOTE|TIP|IMPORTANT|WARNING|CAUTION)(\][ \t]*)$/iu;
  const ALERT_OPTIONS: EditActionOption[] = ALERT_TYPES.map((type) => ({
    value: type,
    label: type.charAt(0) + type.slice(1).toLowerCase(),
  }));

  /**
   * The type word of the alert the caret is in: the head line is the first line of the run of
   * quoted lines around the caret (`> [!TYPE]`).
   */
  function alertAtCaret(ctx: EditActionContext): { start: number; end: number; type: string } | undefined {
    const { value } = ctx;
    const lineEndOf = (start: number): number => {
      const end = value.indexOf("\n", start);
      return end === -1 ? value.length : end;
    };
    const quoted = (start: number): boolean => /^\s{0,3}>/u.test(value.slice(start, lineEndOf(start)));
    let lineStart = value.lastIndexOf("\n", ctx.selectionStart - 1) + 1;
    if (!quoted(lineStart)) return undefined;
    while (lineStart > 0) {
      const previousStart = value.lastIndexOf("\n", lineStart - 2) + 1;
      if (!quoted(previousStart)) break;
      lineStart = previousStart;
    }
    const head = ALERT_HEAD.exec(value.slice(lineStart, lineEndOf(lineStart)));
    if (!head) return undefined;
    const start = lineStart + head[1].length;
    return { start, end: start + head[2].length, type: head[2].toUpperCase() };
  }

  /**
   * Inserts a GitHub alert (`> [!NOTE]` and the touched lines quoted) or, with the caret inside
   * an alert, changes its type to `ctx.arg`. An unknown type is refused.
   */
  function insertAlert(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    if (ctx.arg !== undefined && !ALERT_TYPES.includes(ctx.arg)) return undefined;
    const existing = alertAtCaret(ctx);
    if (existing) {
      if (ctx.arg === undefined || ctx.arg === existing.type) return undefined;
      const delta = ctx.arg.length - existing.type.length;
      const move = (position: number): number =>
        position >= existing.end ? position + delta : position > existing.start ? existing.start + ctx.arg!.length : position;
      return {
        start: existing.start,
        end: existing.end,
        text: ctx.arg,
        selectionStart: move(ctx.selectionStart),
        selectionEnd: move(ctx.selectionEnd),
      };
    }
    const head = "> [!" + (ctx.arg ?? "NOTE") + "]\n";
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    const quoted = lines.map((line) => (line.trim() === "" && lines.length > 1 ? ">" : "> " + line));
    const text = head + quoted.join("\n");
    if (ctx.selectionStart !== ctx.selectionEnd) {
      return {
        start: firstStart,
        end: lastEnd,
        text,
        selectionStart: firstStart + head.length,
        selectionEnd: firstStart + text.length,
      };
    }
    const column = ctx.selectionStart - firstStart;
    const caret = firstStart + head.length + 2 + Math.min(column, lines[0].length);
    return { start: firstStart, end: lastEnd, text, selectionStart: caret, selectionEnd: caret };
  }

  const CHECKBOX_LINE = /^(\s*(?:[-*+]|\d{1,9}[.)])[ \t]+)\[[ xX]\][ \t]?/u;
  const LIST_ITEM_LINE = /^(\s*(?:[-*+]|\d{1,9}[.)])[ \t]+)/u;

  /**
   * Toggles a task-list checkbox on the touched lines: when every non-blank line has one they
   * lose it (the list item stays), otherwise the lines without one gain `[ ]` after their list
   * marker, or `- [ ] ` when they have none.
   */
  function toggleCheckbox(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    const filled = lines.filter((line) => line.trim() !== "");
    const remove = filled.length > 0 && filled.every((line) => CHECKBOX_LINE.test(line));
    // For each line: where the change happens, how many characters go and what comes instead.
    const changes = lines.map((line) => {
      if (line.trim() === "" && lines.length > 1) return { at: 0, drop: 0, add: "" };
      const boxed = CHECKBOX_LINE.exec(line);
      if (remove) {
        const marker = boxed![1];
        return { at: marker.length, drop: boxed![0].length - marker.length, add: "" };
      }
      if (boxed) return { at: 0, drop: 0, add: "" };
      const item = LIST_ITEM_LINE.exec(line);
      if (item) return { at: item[1].length, drop: 0, add: "[ ] " };
      const indent = (/^[ \t]*/u.exec(line) ?? [""])[0].length;
      return { at: indent, drop: 0, add: "- [ ] " };
    });
    const text = lines.map((line, index) => {
      const change = changes[index];
      return line.slice(0, change.at) + change.add + line.slice(change.at + change.drop);
    }).join("\n");
    if (text === lines.join("\n")) return undefined;
    if (lines.length === 1 && ctx.selectionStart === ctx.selectionEnd) {
      const change = changes[0];
      const column = ctx.selectionStart - firstStart;
      const next = column < change.at
        ? column
        : column >= change.at + change.drop ? column - change.drop + change.add.length : change.at;
      const caret = firstStart + next;
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

  /**
   * The pipe table the caret is in (or at the end of): its text range, parsed model, lines and
   * the caret's line. The table is the run of non-blank lines around the caret, started at the
   * first line from which the rest parses as a table.
   */
  function tableAtCaret(ctx: EditActionContext) {
    const tools = tableTools;
    if (!tools) return undefined;
    const { value } = ctx;
    // The run of non-blank lines around the caret, with the offset of each line.
    const caretLineStart = value.lastIndexOf("\n", ctx.selectionStart - 1) + 1;
    const offsets: number[] = [];
    const rows: string[] = [];
    let from = caretLineStart;
    while (from > 0) {
      const previous = value.lastIndexOf("\n", from - 2) + 1;
      if (value.slice(previous, from - 1).trim() === "") break;
      from = previous;
    }
    for (let offset = from; offset <= value.length;) {
      const lineEnd = value.indexOf("\n", offset) === -1 ? value.length : value.indexOf("\n", offset);
      const line = value.slice(offset, lineEnd);
      if (line.trim() === "") break;
      offsets.push(offset);
      rows.push(line);
      offset = lineEnd + 1;
    }
    for (let first = 0; first < rows.length && offsets[first] <= caretLineStart; first += 1) {
      const model = tools.parse(rows.slice(first).join("\n"));
      if (!model) continue;
      return {
        model,
        start: offsets[first],
        end: offsets[rows.length - 1] + rows[rows.length - 1].length,
        lines: rows.slice(first),
        lineOffsets: offsets.slice(first),
        caretLine: offsets.indexOf(caretLineStart) - first,
        caretLineStart,
      };
    }
    return undefined;
  }

  /**
   * With the caret in a pipe table, replaces that table's lines with an HTML `<table>`; anywhere
   * else (or without table tools) inserts a new 2 x 2 HTML table after the selection.
   */
  function htmlTable(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const found = tableAtCaret(ctx);
    if (found && tableTools) {
      const text = tableTools.toHtmlTable(found.model);
      return {
        start: found.start,
        end: found.end,
        text,
        selectionStart: found.start + text.length,
        selectionEnd: found.start + text.length,
      };
    }
    const body = [
      "<table>", "  <thead>", "    <tr>", "      <th>Column 1</th>", "      <th>Column 2</th>",
      "    </tr>", "  </thead>", "  <tbody>", "    <tr>", "      <td></td>", "      <td></td>",
      "    </tr>", "  </tbody>", "</table>",
    ].join("\n");
    return insertBlockAfterSelection(ctx, body, "Column 1");
  }

  const ALIGNMENTS = ["left", "center", "right"];

  /**
   * Sets the alignment of the table column the caret is in, rewriting only that cell of the
   * delimiter row (`:---`, `:---:`, `---:`): the cell keeps its padding and, when the colons need
   * room, takes it from the trailing spaces. Outside a pipe table nothing happens.
   */
  function alignColumn(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    if (ctx.arg === undefined || !ALIGNMENTS.includes(ctx.arg)) return undefined;
    const found = tableAtCaret(ctx);
    const tools = tableTools;
    if (!found || !tools || found.caretLine < 0) return undefined;
    const caretSegments = tools.cellSegments(found.lines[found.caretLine]);
    const offset = ctx.selectionStart - found.caretLineStart;
    let column = caretSegments.findIndex((segment) => offset <= segment.end);
    if (column === -1) column = caretSegments.length - 1;
    const delimiter = found.lines[1];
    const segments = tools.cellSegments(delimiter);
    const segment = segments[Math.min(column, segments.length - 1)];
    const cell = delimiter.slice(segment.start, segment.end);
    const lead = /^\s*/u.exec(cell)![0];
    const core = cell.trim();
    const tail = cell.slice(lead.length + core.length);
    const colons = ctx.arg === "center" ? 2 : 1;
    const dashes = Math.max(3, core.length - colons);
    const next = (ctx.arg === "left" || ctx.arg === "center" ? ":" : "")
      + "-".repeat(dashes) + (ctx.arg === "right" || ctx.arg === "center" ? ":" : "");
    if (next === core) return undefined;
    // Growth comes out of the trailing spaces, keeping at least one when there was one.
    const grow = next.length - core.length;
    const padding = tail === "" ? "" : " ".repeat(Math.max(1, tail.length - Math.max(0, grow)));
    const start = found.lineOffsets[1] + segment.start + lead.length;
    const end = found.lineOffsets[1] + segment.end;
    const shift = next.length + padding.length - core.length - tail.length;
    const mapped = (position: number): number => (position >= end ? position + shift : position);
    return {
      start,
      end,
      text: next + padding,
      selectionStart: mapped(ctx.selectionStart),
      selectionEnd: mapped(ctx.selectionEnd),
    };
  }

  /**
   * Wraps the touched lines (or a new sample) in `<details><summary>`; the summary text is
   * selected. A blank line after the summary lets the content render as Markdown.
   */
  function insertDetails(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    if (ctx.selectionStart === ctx.selectionEnd) {
      return insertBlockAfterSelection(
        ctx, "<details>\n<summary>Summary</summary>\n\nContent\n\n</details>", "Summary");
    }
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    const head = "<details>\n<summary>";
    const text = head + "Summary</summary>\n\n" + lines.join("\n") + "\n\n</details>";
    return {
      start: firstStart,
      end: lastEnd,
      text,
      selectionStart: firstStart + head.length,
      selectionEnd: firstStart + head.length + "Summary".length,
    };
  }

  /**
   * Adds a footnote: `[^n]` after the selection and an empty `[^n]: ` definition at the end of
   * the text (after the footnote definitions already there), the caret in it. `n` is one more than
   * the highest numeric label in use.
   */
  function insertFootnote(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    let highest = 0;
    for (const label of ctx.value.matchAll(/\[\^(\d+)\]/gu)) highest = Math.max(highest, Number(label[1]));
    const mark = "[^" + (highest + 1) + "]";
    const at = ctx.selectionEnd;
    const rest = ctx.value.slice(at);
    const content = rest.replace(/\s+$/u, "");
    const trailing = rest.slice(content.length);
    const body = ctx.value.slice(0, at) + mark + content;
    const lastLine = body.slice(body.lastIndexOf("\n") + 1);
    const separator = /^\[\^[^\]]+\]:/u.test(lastLine) ? "\n" : "\n\n";
    const text = mark + content + separator + mark + ": ";
    const caret = at + text.length;
    return { start: at, end: ctx.value.length, text: text + trailing, selectionStart: caret, selectionEnd: caret };
  }

  const ADMONITION_TYPES = [
    "note", "tip", "important", "warning", "caution", "danger", "attention", "error", "hint", "seealso",
  ];
  const ADMONITION_OPTIONS: EditActionOption[] = [
    ...ADMONITION_TYPES.map((type) => ({
      value: type,
      label: type === "seealso" ? "See also" : type.charAt(0).toUpperCase() + type.slice(1),
    })),
    { value: "custom", label: "Custom\u2026" },
  ];

  /** Inserts `body` as a block after the selection; the selection starts `offset` in, `length` long. */
  function insertBlockAt(ctx: EditActionContext, body: string, offset: number, length: number): TextEdit {
    const at = ctx.selectionEnd;
    const before = ctx.value.slice(0, at);
    const after = ctx.value.slice(at);
    const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const breaks = (/^\n*/u.exec(after) ?? [""])[0].length;
    const trail = after === "" || breaks >= 2 ? "" : breaks === 1 ? "\n" : "\n\n";
    const first = at + lead.length + offset;
    return { start: at, end: at, text: lead + body + trail, selectionStart: first, selectionEnd: first + length };
  }

  /**
   * Wraps the touched lines in a MyST colon-fence admonition (`:::{type}`), or inserts an empty one;
   * "custom" writes `{admonition} Title` with a `:class:`. The outer fence is one colon longer than
   * the longest colon fence inside.
   */
  function insertAdmonition(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const type = ctx.arg;
    if (type === undefined || (type !== "custom" && !ADMONITION_TYPES.includes(type))) return undefined;
    const custom = type === "custom";
    const selected = ctx.selectionStart !== ctx.selectionEnd;
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    let longest = 2;
    if (selected) {
      for (const line of lines) {
        const fence = /^\s*(:{3,})/u.exec(line);
        if (fence) longest = Math.max(longest, fence[1].length);
      }
    }
    const colons = ":".repeat(longest + 1);
    const head = colons + (custom ? "{admonition} Title\n:class: note\n\n" : "{" + type + "}\n");
    const body = selected ? lines.join("\n") : "";
    const text = head + (selected ? body + "\n" : custom ? "" : "\n") + colons;
    const titleAt = head.indexOf("Title");
    if (selected) {
      return {
        start: firstStart,
        end: lastEnd,
        text,
        selectionStart: firstStart + (custom ? titleAt : head.length),
        selectionEnd: firstStart + (custom ? titleAt + 5 : head.length + body.length),
      };
    }
    return insertBlockAt(ctx, text, custom ? titleAt : head.length, custom ? 5 : 0);
  }

  /** Makes the touched lines a definition list term with an `: Definition` line below (or a sample). */
  function insertDefinitionList(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    if (ctx.selectionStart === ctx.selectionEnd) {
      return insertBlockAt(ctx, "Term\n: Definition", 0, 4);
    }
    const { lastEnd } = touchedLines(ctx);
    return {
      start: lastEnd,
      end: lastEnd,
      text: "\n: Definition",
      selectionStart: lastEnd + 3,
      selectionEnd: lastEnd + 13,
    };
  }

  /** Math: `inline` wraps in `$…$`, `display` in a `$$` block and `aligned` in `\begin{align}`. */
  function insertMath(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const kind = ctx.arg;
    if (kind !== "inline" && kind !== "display" && kind !== "aligned") return undefined;
    const selected = ctx.selectionStart !== ctx.selectionEnd;
    if (kind === "inline") {
      const text = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd) || "x";
      return {
        start: ctx.selectionStart,
        end: ctx.selectionEnd,
        text: "$" + text + "$",
        selectionStart: ctx.selectionStart + 1,
        selectionEnd: ctx.selectionStart + 1 + text.length,
      };
    }
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    const content = selected ? lines.join("\n") : kind === "display" ? "E = mc^2" : "a &= b";
    const head = kind === "display" ? "$$\n" : "$$\n\\begin{align}\n";
    const tail = kind === "display" ? "\n$$" : "\n\\end{align}\n$$";
    const text = head + content + tail;
    if (selected) {
      return {
        start: firstStart, end: lastEnd, text,
        selectionStart: firstStart + head.length, selectionEnd: firstStart + head.length + content.length,
      };
    }
    return insertBlockAt(ctx, text, head.length, content.length);
  }

  /** Wraps the selection in a MyST role (`{sub}` or `{sup}`); empty puts the caret between the quotes. */
  function wrapRole(ctx: EditActionContext, role: string): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    if (selected.includes("`") || selected.includes("\n")) return undefined;
    const open = "{" + role + "}`";
    const caret = ctx.selectionStart + open.length;
    return {
      start: ctx.selectionStart,
      end: ctx.selectionEnd,
      text: open + selected + "`",
      selectionStart: caret,
      selectionEnd: caret + selected.length,
    };
  }

  /** Writes `(label-name)=` above the first line of the text, the name selected; refuses a second one. */
  function insertLabel(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const lead = (/^(?:[ \t]*\n)*/u.exec(ctx.value) ?? [""])[0].length;
    if (/^\([^()\n]+\)=[ \t]*(?:\n|$)/u.test(ctx.value.slice(lead))) return undefined;
    return {
      start: lead,
      end: lead,
      text: "(label-name)=\n",
      selectionStart: lead + 1,
      selectionEnd: lead + 11,
    };
  }

  /** A MyST role argument: one line, no backtick or angle bracket, bounded. */
  const roleArgument = (value: string | undefined): value is string =>
    value !== undefined && value.length > 0 && value.length <= 200 && !/[`<>\r\n]/u.test(value);

  /**
   * Inserts `{role}` with the chosen target. A selection on one line becomes the link text
   * (`{ref}`text <target>``); without one the target is the text.
   */
  function insertTargetRole(ctx: EditActionContext, role: string, textAllowed: boolean): TextEdit | undefined {
    if (!validSelection(ctx) || !roleArgument(ctx.arg)) return undefined;
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    if (/[`<>\r\n]/u.test(selected)) return undefined;
    const body = textAllowed && selected.trim() !== "" ? selected.trim() + " <" + ctx.arg + ">" : ctx.arg;
    const text = "{" + role + "}`" + body + "`";
    const caret = ctx.selectionStart + text.length;
    return { start: ctx.selectionStart, end: ctx.selectionEnd, text, selectionStart: caret, selectionEnd: caret };
  }

  /** The file stem of a picked path, without the characters that would break `![alt]`. */
  function imageName(imagePath: string): string {
    const file = imagePath.slice(imagePath.lastIndexOf("/") + 1);
    const dot = file.lastIndexOf(".");
    const stem = (dot > 0 ? file.slice(0, dot) : file).replace(/[\[\]\\]/gu, "").trim();
    return stem === "" ? "image" : stem;
  }

  /** A picked path the actions can write: relative text without line breaks or angle brackets. */
  function pickedImagePath(ctx: EditActionContext): string | undefined {
    const picked = ctx.arg;
    if (picked === undefined || picked === "" || /[<>\r\n]/u.test(picked)) return undefined;
    return picked;
  }

  /** `![name](path)` over the selection with the name selected; `<…>` around spaces or parentheses. */
  function insertImage(ctx: EditActionContext): TextEdit | undefined {
    const picked = pickedImagePath(ctx);
    if (!validSelection(ctx) || picked === undefined) return undefined;
    const name = imageName(picked);
    const target = /[\s()]/u.test(picked) ? "<" + picked + ">" : picked;
    const text = "![" + name + "](" + target + ")";
    return {
      start: ctx.selectionStart, end: ctx.selectionEnd, text,
      selectionStart: ctx.selectionStart + 2, selectionEnd: ctx.selectionStart + 2 + name.length,
    };
  }

  /**
   * `:::{figure} path` with `:alt:` and an empty caption line. The touched lines of a selection
   * become the caption; the fence is one colon longer than the longest colon fence inside them.
   */
  function insertFigure(ctx: EditActionContext): TextEdit | undefined {
    const picked = pickedImagePath(ctx);
    if (!validSelection(ctx) || picked === undefined) return undefined;
    const selected = ctx.selectionStart !== ctx.selectionEnd;
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    let longest = 2;
    if (selected) {
      for (const line of lines) {
        const fence = /^\s*(:{3,})/u.exec(line);
        if (fence) longest = Math.max(longest, fence[1].length);
      }
    }
    const colons = ":".repeat(longest + 1);
    const head = colons + "{figure} " + picked + "\n:alt: " + imageName(picked) + "\n\n";
    const text = head + (selected ? lines.join("\n") : "") + "\n" + colons;
    if (selected) {
      return { start: firstStart, end: lastEnd, text, selectionStart: firstStart + head.length, selectionEnd: firstStart + head.length };
    }
    return insertBlockAt(ctx, text, head.length, 0);
  }

  /** A MyST dropdown: a note admonition with `:class: dropdown`; the touched lines become its body. */
  function insertDropdown(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const selected = ctx.selectionStart !== ctx.selectionEnd;
    const { firstStart, lastEnd, lines } = touchedLines(ctx);
    let longest = 2;
    if (selected) {
      for (const line of lines) {
        const fence = /^\s*(:{3,})/u.exec(line);
        if (fence) longest = Math.max(longest, fence[1].length);
      }
    }
    const colons = ":".repeat(longest + 1);
    const head = colons + "{note} Title\n:class: dropdown\n\n";
    const text = head + (selected ? lines.join("\n") : "Content") + "\n" + colons;
    const titleAt = head.indexOf("Title");
    if (selected) {
      return { start: firstStart, end: lastEnd, text, selectionStart: firstStart + titleAt, selectionEnd: firstStart + titleAt + 5 };
    }
    return insertBlockAt(ctx, text, titleAt, 5);
  }

  /**
   * Wraps the pipe table at the caret in `:::{table} Caption` (the caption selected), or inserts a
   * new 2 x 2 captioned table. A table that is already inside a `{table}` directive is left alone.
   */
  function tableCaption(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    // Inside a `{table}` directive: its opener comes before the caret with no closing fence between.
    const above = ctx.value.slice(0, ctx.selectionStart).split("\n");
    for (let index = above.length - 1; index >= 0; index -= 1) {
      if (/^\s*:{3,}\{table\}/u.test(above[index])) return undefined;
      if (/^\s*:{3,}\s*$/u.test(above[index])) break;
    }
    const found = tableAtCaret(ctx);
    const head = ":".repeat(3) + "{table} Caption\n\n";
    if (found) {
      const text = head + ctx.value.slice(found.start, found.end) + "\n" + ":".repeat(3);
      return {
        start: found.start, end: found.end, text,
        selectionStart: found.start + head.indexOf("Caption"),
        selectionEnd: found.start + head.indexOf("Caption") + 7,
      };
    }
    const body = head + "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n" + ":".repeat(3);
    return insertBlockAt(ctx, body, head.indexOf("Caption"), 7);
  }

  /** Wraps the selection in the `{kbd}` role, or inserts a sample key with the sample selected. */
  function insertKbdRole(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    if (ctx.selectionStart === ctx.selectionEnd) {
      const open = "{kbd}`";
      const start = ctx.selectionStart + open.length;
      return {
        start: ctx.selectionStart, end: ctx.selectionEnd, text: open + "Ctrl+K`",
        selectionStart: start, selectionEnd: start + "Ctrl+K".length,
      };
    }
    return wrapRole(ctx, "kbd");
  }

  /** A fenced Mermaid flowchart set apart after the selection, its first node label selected. */
  function insertMermaid(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    return insertBlockAfterSelection(
      ctx, "```mermaid\nflowchart TD\n  A[Start] --> B[End]\n```", "Start");
  }

  /** Wraps the selection in `<kbd>`, removes the tags when it already has them, or inserts a sample. */
  function toggleKbd(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const { value, selectionStart: start, selectionEnd: end } = ctx;
    const open = "<kbd>";
    const close = "</kbd>";
    const selected = value.slice(start, end);
    if (selected.length >= open.length + close.length && selected.startsWith(open) && selected.endsWith(close)) {
      const inner = selected.slice(open.length, selected.length - close.length);
      return { start, end, text: inner, selectionStart: start, selectionEnd: start + inner.length };
    }
    if (value.slice(start - open.length, start) === open && value.slice(end, end + close.length) === close) {
      return {
        start: start - open.length,
        end: end + close.length,
        text: selected,
        selectionStart: start - open.length,
        selectionEnd: end - open.length,
      };
    }
    if (selected === "") {
      return {
        start, end, text: open + "Key" + close,
        selectionStart: start + open.length, selectionEnd: start + open.length + 3,
      };
    }
    return {
      start,
      end,
      text: open + selected + close,
      selectionStart: start + open.length,
      selectionEnd: end + open.length,
    };
  }

  /** Replaces the selection with the chosen emoji character, caret after it. */
  function insertEmoji(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const char = ctx.arg ?? "";
    if (char === "" || char.length > 16 || !/^[\p{Extended_Pictographic}\u200d\ufe0f]+$/u.test(char)) {
      return undefined;
    }
    const caret = ctx.selectionStart + char.length;
    return { start: ctx.selectionStart, end: ctx.selectionEnd, text: char, selectionStart: caret, selectionEnd: caret };
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
      id: "link",
      label: "Link",
      title: "Link",
      icon: "link",
      group: "inline",
      modes: ["strict"],
      scopes: ["block", "cell"],
      shortcut: { codes: ["KeyK"], keys: ["k"] },
      panel: "link",
      apply: (ctx) => linkEdit(ctx, linkDraft(ctx).text, ctx.arg ?? ""),
    },
    {
      id: "image",
      label: "Image",
      title: "Image (pick a file next to the document)",
      icon: "image",
      group: "inline",
      modes: ["strict"],
      scopes: ["block"],
      hostDialog: "image",
      apply: insertImage,
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
      id: "table",
      label: "Table",
      title: "Table (choose a size)",
      icon: "table",
      group: "block",
      modes: ["strict"],
      scopes: ["block"],
      popover: "grid",
      grid: { rows: 9, cols: 9 },
      apply: insertTable,
    },
    {
      id: "emoji",
      label: "Emoji",
      title: "Emoji",
      icon: "emoji",
      group: "insert",
      modes: ["strict"],
      scopes: ["block", "cell"],
      popover: "emoji",
      emoji: EMOJI_CATEGORIES,
      apply: insertEmoji,
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
    {
      id: "alert",
      label: "Alert",
      title: "GitHub alert (choose a type)",
      icon: "alert",
      group: "github",
      modes: ["gfm"],
      scopes: ["block"],
      popover: "alert",
      popoverAtCaret: true,
      options: ALERT_OPTIONS,
      apply: insertAlert,
    },
    {
      id: "checkbox",
      label: "Checkbox",
      title: "Toggle checkbox",
      icon: "checkbox",
      group: "github",
      modes: ["gfm"],
      scopes: ["block"],
      apply: toggleCheckbox,
    },
    {
      id: "htmlTable",
      label: "HTML table",
      title: "HTML table (converts the table at the caret)",
      icon: "htmlTable",
      group: "github",
      modes: ["gfm"],
      scopes: ["block"],
      apply: htmlTable,
    },
    {
      id: "details",
      label: "Collapsible",
      title: "Collapsible section (details)",
      icon: "details",
      group: "github",
      modes: ["gfm"],
      scopes: ["block"],
      apply: insertDetails,
    },
    {
      id: "footnote",
      label: "Footnote",
      title: "Footnote",
      icon: "footnote",
      group: "github",
      modes: ["gfm"],
      scopes: ["block"],
      apply: insertFootnote,
    },
    {
      id: "mermaid",
      label: "Mermaid",
      title: "Mermaid diagram",
      icon: "mermaid",
      group: "github",
      modes: ["gfm"],
      scopes: ["block"],
      apply: insertMermaid,
    },
    {
      id: "columnAlign",
      label: "Column alignment",
      title: "Table column alignment (choose)",
      icon: "columnAlign",
      group: "github",
      modes: ["gfm"],
      scopes: ["block"],
      popover: "align",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
      apply: alignColumn,
    },
    {
      id: "kbd",
      label: "Key",
      title: "Keyboard key (kbd)",
      icon: "kbd",
      group: "github",
      modes: ["gfm"],
      scopes: ["block", "cell"],
      apply: toggleKbd,
    },
    {
      id: "admonition",
      label: "Admonition",
      title: "Admonition (choose a type)",
      icon: "admonition",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      popover: "admonition",
      options: ADMONITION_OPTIONS,
      apply: insertAdmonition,
    },
    {
      id: "deflist",
      label: "Definition list",
      title: "Definition list",
      icon: "deflist",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      apply: insertDefinitionList,
    },
    {
      id: "math",
      label: "Math",
      title: "Math (choose inline, display or aligned)",
      icon: "math",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      popover: "math",
      options: [
        { value: "inline", label: "Inline $\u2026$" },
        { value: "display", label: "Display $$" },
        { value: "aligned", label: "Aligned equations" },
      ],
      apply: insertMath,
    },
    {
      id: "sub",
      label: "Subscript",
      title: "Subscript",
      icon: "sub",
      group: "myst",
      modes: ["myst"],
      scopes: ["block", "cell"],
      apply: (ctx) => wrapRole(ctx, "sub"),
    },
    {
      id: "sup",
      label: "Superscript",
      title: "Superscript",
      icon: "sup",
      group: "myst",
      modes: ["myst"],
      scopes: ["block", "cell"],
      apply: (ctx) => wrapRole(ctx, "sup"),
    },
    {
      id: "label",
      label: "Label",
      title: "Label (anchor for {ref})",
      icon: "label",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      apply: insertLabel,
    },
    {
      id: "ref",
      label: "Reference",
      title: "Reference to a label ({ref})",
      icon: "ref",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      popover: "choices",
      hostList: "targets",
      apply: (ctx) => insertTargetRole(ctx, "ref", true),
    },
    {
      id: "doc",
      label: "Document link",
      title: "Link to another document ({doc})",
      icon: "doc",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      hostDialog: "document",
      apply: (ctx) => insertTargetRole(ctx, "doc", true),
    },
    {
      id: "cite",
      label: "Citation",
      title: "Citation from the workspace .bib files ({cite})",
      icon: "cite",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      popover: "choices",
      hostList: "citations",
      apply: (ctx) => {
        if (!validSelection(ctx) || !roleArgument(ctx.arg) || /[\s,]/u.test(ctx.arg)) return undefined;
        const text = "{cite}`" + ctx.arg + "`";
        const caret = ctx.selectionStart + text.length;
        return { start: ctx.selectionStart, end: ctx.selectionEnd, text, selectionStart: caret, selectionEnd: caret };
      },
    },
    {
      id: "dropdown",
      label: "Dropdown",
      title: "Dropdown (collapsible admonition)",
      icon: "dropdown",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      apply: insertDropdown,
    },
    {
      id: "tableCaption",
      label: "Table with caption",
      title: "Table with caption (wraps the table at the caret)",
      icon: "tableCaption",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      apply: tableCaption,
    },
    {
      id: "figure",
      label: "Figure",
      title: "Figure (pick an image file; MyST directive with a caption)",
      icon: "figure",
      group: "myst",
      modes: ["myst"],
      scopes: ["block"],
      hostDialog: "image",
      apply: insertFigure,
    },
    {
      id: "roleKbd",
      label: "Key (MyST)",
      title: "Keyboard key ({kbd} role)",
      icon: "kbd",
      group: "myst",
      modes: ["myst"],
      scopes: ["block", "cell"],
      apply: insertKbdRole,
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

  return { actions, byId, linkDraft, linkEdit, shortcutFor, shortcutLabel };
}
