/**
 * The inline edit actions of the palette: emphasis and strikethrough, TODO and thread comments,
 * MyST roles (sub, sup, label, ref, doc, kbd) and emoji.
 */

import { isSpace, isWordChar, touchedLines, validSelection } from "./editActionHelpers";
import type { EditActionContext } from "./editActions";
import type { TextEdit } from "./textEditing";

/**
 * Toggles an inline `*` marker pair (`*` italic, `**` bold) around the selection. A run of `n`
 * asterisks around the content holds bold when `n >= 2` and italic when `n` is odd, so
 * `***x***` carries both and each toggle removes only its own share.
 */
export function toggleAsterisks(ctx: EditActionContext, width: number): TextEdit | undefined {
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
export function toggleTodo(ctx: EditActionContext): TextEdit | undefined {
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

/**
 * Inserts an inline comment thread after the block at the caret, with the first message started
 * by `threadAuthor` (the Git user) and the local date, and the caret on its text line:
 * `<!-- THREAD`, `Author (YYYY-MM-DD HH:MM):`, an indented line, `-->`.
 */
export function insertThread(ctx: EditActionContext, threadAuthor?: string): TextEdit | undefined {
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
  const now = new Date();
  const two = (number: number): string => String(number).padStart(2, "0");
  const stamp = now.getFullYear() + "-" + two(now.getMonth() + 1) + "-" + two(now.getDate())
    + " " + two(now.getHours()) + ":" + two(now.getMinutes());
  const author = String(threadAuthor ?? "").replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim() || "Anonymous";
  const head = gap + "<!-- THREAD\n" + author + " (" + stamp + "):\n  ";
  const text = head + "\n-->\n\n";
  const caret = start + head.length;
  return { start, end, text, selectionStart: caret, selectionEnd: caret };
}

/** Toggles a `~~` pair around the selection or the word at the caret. */
export function toggleStrikethrough(ctx: EditActionContext): TextEdit | undefined {
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

/** Wraps the selection in a MyST role (`{sub}` or `{sup}`); empty puts the caret between the quotes. */
export function wrapRole(ctx: EditActionContext, role: string): TextEdit | undefined {
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
export function insertLabel(ctx: EditActionContext): TextEdit | undefined {
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
export const roleArgument = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0 && value.length <= 200 && !/[`<>\r\n]/u.test(value);

/**
 * Inserts `{role}` with the chosen target. A selection on one line becomes the link text
 * (`{ref}`text <target>``); without one the target is the text.
 */
export function insertTargetRole(ctx: EditActionContext, role: string, textAllowed: boolean): TextEdit | undefined {
  if (!validSelection(ctx) || !roleArgument(ctx.arg)) return undefined;
  const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
  if (/[`<>\r\n]/u.test(selected)) return undefined;
  const body = textAllowed && selected.trim() !== "" ? selected.trim() + " <" + ctx.arg + ">" : ctx.arg;
  const text = "{" + role + "}`" + body + "`";
  const caret = ctx.selectionStart + text.length;
  return { start: ctx.selectionStart, end: ctx.selectionEnd, text, selectionStart: caret, selectionEnd: caret };
}

/** Wraps the selection in the `{kbd}` role, or inserts a sample key with the sample selected. */
export function insertKbdRole(ctx: EditActionContext): TextEdit | undefined {
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

/** Wraps the selection in `<kbd>`, removes the tags when it already has them, or inserts a sample. */
export function toggleKbd(ctx: EditActionContext): TextEdit | undefined {
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
export function insertEmoji(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const char = ctx.arg ?? "";
  if (char === "" || char.length > 16 || !/^[\p{Extended_Pictographic}\u200d\ufe0f]+$/u.test(char)) {
    return undefined;
  }
  const caret = ctx.selectionStart + char.length;
  return { start: ctx.selectionStart, end: ctx.selectionEnd, text: char, selectionStart: caret, selectionEnd: caret };
}
