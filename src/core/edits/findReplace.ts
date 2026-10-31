/**
 * Replacing the matches of the find bar in the source. The page names, for each match, the source
 * lines of its block, the matched text as the page shows it and which occurrence of that text it
 * is. The planner locates the same occurrence in the source lines and replaces that span only; a
 * match whose text does not map one-to-one to the source is skipped and counted. The source text
 * the reader cannot see (link and image targets and titles, whole inline images, reference
 * definitions) is left out of the count. Pure module.
 */

import type { FindReplaceItem } from "../protocol/pageToHost";
import { sourceLines, type EditRefusal, type TextEdit } from "./textEdit";

/** The edits to apply, how many matches they replace and how many could not be mapped. */
export type FindReplacePlan = EditRefusal | { readonly edits: TextEdit[]; readonly replaced: number; readonly skipped: number };

/** Refusal of a request that names no replaceable match. */
export const FIND_REPLACE_NOTHING = "None of the matches can be replaced from the preview. Refresh the preview.";

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\/]/gu, "\\$&");

type Span = { start: number; end: number };

/** The length of the run of `char` that starts at `index`. */
const runLength = (text: string, index: number, char: string): number => {
  let end = index;
  while (text[end] === char) end += 1;
  return end - index;
};

/**
 * The end (exclusive, after the `)`) of an inline link destination and optional title that open
 * with the `(` at `open`, or undefined when the text there is no destination: `(dest)`,
 * `(<dest>)`, `(dest "title")`, `(dest 'title')`, `(dest (title))`, with balanced parentheses in a
 * bare destination and backslash escapes.
 */
function destinationEnd(text: string, open: number): number | undefined {
  let index = open + 1;
  const skipSpace = (): void => {
    while (index < text.length && /\s/u.test(text[index]!)) index += 1;
  };
  skipSpace();
  if (text[index] === "<") {
    index += 1;
    while (index < text.length && text[index] !== ">") {
      if (text[index] === "\n" || text[index] === "<") return undefined;
      index += text[index] === "\\" ? 2 : 1;
    }
    if (text[index] !== ">") return undefined;
    index += 1;
  } else {
    let depth = 0;
    while (index < text.length && !/\s/u.test(text[index]!)) {
      const char = text[index]!;
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") {
        if (depth === 0) break;
        depth -= 1;
      }
      index += 1;
    }
    if (depth !== 0) return undefined;
  }
  const beforeTitle = index;
  skipSpace();
  const quote = text[index];
  if (index > beforeTitle && (quote === "\"" || quote === "'" || quote === "(")) {
    const close = quote === "(" ? ")" : quote;
    index += 1;
    while (index < text.length && text[index] !== close) index += text[index] === "\\" ? 2 : 1;
    if (text[index] !== close) return undefined;
    index += 1;
    skipSpace();
  }
  return text[index] === ")" ? index + 1 : undefined;
}

/**
 * A reference definition line (`[label]: dest "title"`), footnote definitions (`[^label]:`)
 * excepted: at most 3 spaces of indent after the block quote markers (4 or a tab make it code).
 */
const REFERENCE_DEFINITION = /^(?:[ ]{0,3}>[ ]?)*[ ]{0,3}(\[(?!\^)(?:[^\]\\\n]|\\.)+\]:[ \t]*\S.*)$/gmu;

/** The block quote and list markers and the indent before a fence line. */
const FENCE_PREFIX = String.raw`^(?:[ \t]*(?:>|[-*+][ \t]|\d{1,9}[.)][ \t]))*[ \t]*`;
/** The opening line of a fenced code block (a backtick fence has no backtick in its info string). */
const FENCE_OPEN = new RegExp(`${FENCE_PREFIX}(\`{3,}(?=[^\`]*$)|~{3,})`, "u");

/**
 * The spans of the fenced code blocks of `text` (``` or ~~~), from the opening line to the end of
 * the closing one (or of `text` when unclosed). Their whole text, info string included, is left
 * as it is: links and definitions in a fence are text the reader sees.
 */
function fencedCode(text: string): Span[] {
  const fences: Span[] = [];
  let open: { start: number; fence: string } | undefined;
  let lineStart = 0;
  while (lineStart <= text.length) {
    const newline = text.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? text.length : newline;
    const line = text.slice(lineStart, lineEnd);
    if (open) {
      const close = new RegExp(`${FENCE_PREFIX}${open.fence[0]}{${open.fence.length},}\\s*$`, "u");
      if (close.test(line)) {
        fences.push({ start: open.start, end: lineEnd });
        open = undefined;
      }
    } else {
      const found = FENCE_OPEN.exec(line);
      if (found) open = { start: lineStart, fence: found[1]! };
    }
    if (newline === -1) break;
    lineStart = newline + 1;
  }
  if (open) fences.push({ start: open.start, end: text.length });
  return fences;
}

const overlaps = (spans: readonly Span[], start: number, end: number): boolean =>
  spans.some((span) => start < span.end && span.start < end);

/**
 * The spans of `text` the rendered page does not show as text: the destination and title of an
 * inline link (`[label](dest "title")`, the label stays), a whole inline image (`![alt](src)`: the
 * alt text is no rendered text either) and reference definition lines. Code spans and fenced code
 * blocks are skipped, so a link or a definition written as code stays visible text. An autolink
 * (`<https://...>`) shows its address and stays visible.
 */
function hiddenSpans(text: string): Span[] {
  const hidden: Span[] = [];
  const code = fencedCode(text);
  const openers: Array<{ index: number; image: boolean }> = [];
  let index = 0;
  while (index < text.length) {
    const fence = code.find((span) => span.start <= index && index < span.end);
    if (fence) {
      index = fence.end;
      continue;
    }
    const char = text[index]!;
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "`") {
      const length = runLength(text, index, "`");
      let close = text.indexOf("`".repeat(length), index + length);
      while (close !== -1 && runLength(text, close, "`") !== length) {
        close = text.indexOf("`".repeat(length), close + runLength(text, close, "`"));
      }
      if (close !== -1) code.push({ start: index, end: close + length });
      index = close === -1 ? index + length : close + length;
      continue;
    }
    if (char === "[") {
      openers.push({ index, image: text[index - 1] === "!" });
      index += 1;
      continue;
    }
    if (char === "]" && openers.length > 0) {
      const opener = openers.pop()!;
      const end = text[index + 1] === "(" ? destinationEnd(text, index + 1) : undefined;
      if (end !== undefined) {
        hidden.push({ start: opener.image ? opener.index - 1 : index + 1, end });
        // No link inside a link: the `[` before a link are text (an image may hold a link).
        if (!opener.image) openers.splice(0, openers.length, ...openers.filter((entry) => entry.image));
        index = end;
        continue;
      }
    }
    index += 1;
  }
  for (const found of text.matchAll(REFERENCE_DEFINITION)) {
    const end = found.index + found[0].length;
    const start = end - found[1]!.length;
    if (!overlaps(code, start, end)) hidden.push({ start, end });
  }
  return hidden;
}

/**
 * The span of every occurrence of `find` in `text`, overlapping ones included. A white space in
 * `find` stands for any run of white space in the source: the page shows a line break of a wrapped
 * paragraph as one space.
 */
function sourceOccurrences(text: string, find: string): Span[] {
  const pattern = new RegExp(find.split(/\s+/u).map(escapeRegex).join("\\s+"), "uy");
  const hidden = hiddenSpans(text);
  const spans: Span[] = [];
  for (let index = 0; index < text.length; index += 1) {
    pattern.lastIndex = index;
    const found = pattern.exec(text);
    if (!found) continue;
    const end = index + found[0].length;
    if (!overlaps(hidden, index, end)) spans.push({ start: index, end });
  }
  return spans;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-012
/**
 * Plans the replacement of `items` in `text`. An item is skipped when its lines are gone, when the
 * block's visible source text has another number of occurrences of the text than the page shows
 * (a formula, generated text or markup inside the match), or when it overlaps an earlier item.
 */
export function planFindReplace(text: string, items: readonly FindReplaceItem[]): FindReplacePlan {
  const lines = sourceLines(text);
  const cache = new Map<string, Span[]>();
  const planned: TextEdit[] = [];
  for (const item of items) {
    if (item.line < 1 || item.endLine < item.line || item.endLine > lines.count) continue;
    const base = lines.start(item.line - 1);
    const blockText = text.slice(base, lines.end(item.endLine - 1));
    const key = `${item.line}:${item.endLine}:${item.find}`;
    let spans = cache.get(key);
    if (!spans) {
      spans = sourceOccurrences(blockText, item.find);
      cache.set(key, spans);
    }
    if (spans.length !== item.occurrences || item.occurrence >= spans.length) continue;
    const span = spans[item.occurrence]!;
    planned.push({ start: base + span.start, end: base + span.end, text: item.replacement });
  }
  planned.sort((left, right) => left.start - right.start || left.end - right.end);
  const edits: TextEdit[] = [];
  let reach = -1;
  for (const edit of planned) {
    if (edit.start < reach) continue;
    edits.push(edit);
    reach = edit.end;
  }
  if (edits.length === 0) return { refused: FIND_REPLACE_NOTHING };
  return { edits, replaced: edits.length, skipped: items.length - edits.length };
}
