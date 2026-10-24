/**
 * The text helpers the palette's edit actions share: the lines a selection touches, line prefix
 * rewrites, and block insertion after the selection.
 */

import type { EditActionContext } from "./editActions";
import type { TextEdit } from "./textEditing";

/** True for a whitespace character. */
export const isSpace = (char: string): boolean => /\s/u.test(char);

/** True for a letter, digit or underscore (any script). */
export const isWordChar = (char: string): boolean => /[\p{L}\p{N}_]/u.test(char);

/** The lines a selection touches (a selection ending at a line start excludes that line). */
export function touchedLines(ctx: EditActionContext) {
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

/** True when the selection lies inside the text, start before end. */
export function validSelection(ctx: EditActionContext): boolean {
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
export function editLinePrefixes(
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

/**
 * A block set apart by blank lines after the selection (which stays untouched); the first
 * occurrence of `select` in it becomes the selection.
 */
export function insertBlockAfterSelection(
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

/** Inserts `body` as a block after the selection; the selection starts `offset` in, `length` long. */
export function insertBlockAt(ctx: EditActionContext, body: string, offset: number, length: number): TextEdit {
  const at = ctx.selectionEnd;
  const before = ctx.value.slice(0, at);
  const after = ctx.value.slice(at);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const breaks = (/^\n*/u.exec(after) ?? [""])[0].length;
  const trail = after === "" || breaks >= 2 ? "" : breaks === 1 ? "\n" : "\n\n";
  const first = at + lead.length + offset;
  return { start: at, end: at, text: lead + body + trail, selectionStart: first, selectionEnd: first + length };
}
