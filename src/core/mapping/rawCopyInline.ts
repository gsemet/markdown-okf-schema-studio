/**
 * The inline constructs of one block's source, for the edge balancing of a raw copy: emphasis and
 * strong, strikethrough, inline code, links, reference links, MyST roles and inline HTML elements,
 * each with its opening and closing delimiters. Inline math, images, autolinks and footnote
 * references are whole constructs with no delimiters to add, so they are skipped. Pure module: no
 * DOM and no host API.
 */

/** One inline construct: the delimiter before its content and the one after, as `[start, end)` indexes of the text. */
export interface InlineSpan {
  openStart: number;
  openEnd: number;
  closeStart: number;
  closeEnd: number;
}

interface Delimiter {
  char: string;
  position: number;
  count: number;
  canOpen: boolean;
  canClose: boolean;
}

const PUNCTUATION = /[!-/:-@[-`{-~\p{P}\p{S}]/u;
const VOID_ELEMENTS = new Set(["br", "hr", "img", "input", "wbr", "col", "area", "base", "link", "meta", "source", "track", "embed", "param"]);
const ROLE = /^\{[A-Za-z][\w:.+-]*\}(`+)/u;
const AUTOLINK = /^<(?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*|[^\s@<>]+@[^\s<>]+)>/u;
const HTML_OPEN = /^<([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*?)?(\/?)>/u;

const isWhitespace = (character: string | undefined): boolean => character === undefined || /\s/u.test(character);
const isPunctuation = (character: string | undefined): boolean => character !== undefined && PUNCTUATION.test(character);

/** The index of the closing backtick run of exactly `length` backticks after `from`, or -1. */
function findBacktickRun(text: string, from: number, to: number, length: number): number {
  let index = from;
  while (index < to) {
    if (text[index] !== "`") {
      index += 1;
      continue;
    }
    let end = index;
    while (end < to && text[end] === "`") end += 1;
    if (end - index === length) return index;
    index = end;
  }
  return -1;
}

/** The index of the bracket that closes the one opened at `open`, skipping escapes and code spans; -1 when none. */
function findClosing(text: string, open: number, to: number, opener: string, closer: string): number {
  let depth = 0;
  for (let index = open; index < to; index += 1) {
    const character = text[index];
    if (character === "\\") index += 1;
    else if (character === "`") {
      let end = index;
      while (end < to && text[end] === "`") end += 1;
      const close = findBacktickRun(text, end, to, end - index);
      index = close >= 0 ? close + (end - index) - 1 : end - 1;
    } else if (character === opener) depth += 1;
    else if (character === closer) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** The end of an inline construct that is whole and adds nothing (math, image, autolink), or -1. */
function wholeConstructEnd(text: string, index: number, to: number): number {
  const character = text[index];
  if (character === "$") {
    const double = text[index + 1] === "$";
    const close = text.indexOf(double ? "$$" : "$", index + (double ? 2 : 1));
    return close >= 0 && close < to && (double || close > index + 1) ? close + (double ? 2 : 1) : -1;
  }
  if (character === "!" && text[index + 1] === "[") {
    const close = findClosing(text, index + 1, to, "[", "]");
    if (close < 0 || text[close + 1] !== "(") return -1;
    const end = findClosing(text, close + 1, to, "(", ")");
    return end >= 0 ? end + 1 : -1;
  }
  if (character === "<") {
    const match = AUTOLINK.exec(text.slice(index, to));
    return match ? index + match[0].length : -1;
  }
  return -1;
}

function parseLink(text: string, index: number, to: number, spans: InlineSpan[]): number {
  const close = findClosing(text, index, to, "[", "]");
  if (close < 0 || text[index + 1] === "^") return -1;
  const next = text[close + 1];
  const end = next === "(" ? findClosing(text, close + 1, to, "(", ")") : next === "[" ? findClosing(text, close + 1, to, "[", "]") : -1;
  if (end < 0) return -1;
  spans.push({ openStart: index, openEnd: index + 1, closeStart: close, closeEnd: end + 1 });
  parseRange(text, index + 1, close, spans);
  return end + 1;
}

function parseHtmlElement(text: string, index: number, to: number, spans: InlineSpan[]): number {
  const match = HTML_OPEN.exec(text.slice(index, to));
  if (!match) return -1;
  const name = match[1]!.toLowerCase();
  const tagEnd = index + match[0].length;
  if (match[2] === "/" || VOID_ELEMENTS.has(name)) return tagEnd;
  const tags = new RegExp(`<(/?)${name}(?:\\s[^<>]*?)?(/?)>`, "giu");
  tags.lastIndex = tagEnd;
  let depth = 1;
  for (let found = tags.exec(text); found && found.index < to; found = tags.exec(text)) {
    if (found[1] === "/") depth -= 1;
    else if (found[2] !== "/") depth += 1;
    if (depth === 0) {
      spans.push({ openStart: index, openEnd: tagEnd, closeStart: found.index, closeEnd: found.index + found[0].length });
      parseRange(text, tagEnd, found.index, spans);
      return found.index + found[0].length;
    }
  }
  return tagEnd;
}

/** Matches the emphasis delimiters of one level, innermost first, and records their spans. */
function matchEmphasis(delimiters: Delimiter[], spans: InlineSpan[]): void {
  for (let closerIndex = 0; closerIndex < delimiters.length; closerIndex += 1) {
    const closer = delimiters[closerIndex]!;
    while (closer.canClose && closer.count > 0) {
      let openerIndex = closerIndex - 1;
      while (openerIndex >= 0) {
        const candidate = delimiters[openerIndex]!;
        const fits = candidate.char === closer.char && candidate.canOpen && candidate.count > 0
          && (closer.char !== "~" || (candidate.count >= 2 && closer.count >= 2));
        if (fits) break;
        openerIndex -= 1;
      }
      if (openerIndex < 0) break;
      const opener = delimiters[openerIndex]!;
      const use = closer.char === "~" || (opener.count >= 2 && closer.count >= 2) ? 2 : 1;
      spans.push({
        openStart: opener.position + opener.count - use,
        openEnd: opener.position + opener.count,
        closeStart: closer.position,
        closeEnd: closer.position + use,
      });
      opener.count -= use;
      closer.position += use;
      closer.count -= use;
      for (let between = openerIndex + 1; between < closerIndex; between += 1) delimiters[between]!.count = 0;
    }
  }
}

function delimiterRun(text: string, from: number, to: number, index: number): Delimiter & { end: number } {
  const char = text[index]!;
  let end = index;
  while (end < to && text[end] === char) end += 1;
  const before = index > from ? text[index - 1] : undefined;
  const after = end < to ? text[end] : undefined;
  const left = !isWhitespace(after) && (!isPunctuation(after) || isWhitespace(before) || isPunctuation(before));
  const right = !isWhitespace(before) && (!isPunctuation(before) || isWhitespace(after) || isPunctuation(after));
  const underscore = char === "_";
  return {
    char,
    position: index,
    count: end - index,
    end,
    canOpen: underscore ? left && (!right || isPunctuation(before)) : left,
    canClose: underscore ? right && (!left || isPunctuation(after)) : right,
  };
}

function parseRange(text: string, from: number, to: number, spans: InlineSpan[]): void {
  const delimiters: Delimiter[] = [];
  let index = from;
  while (index < to) {
    const character = text[index]!;
    let next = index + 1;
    if (character === "\\") next = index + 2;
    else if (character === "`") {
      let end = index;
      while (end < to && text[end] === "`") end += 1;
      const close = findBacktickRun(text, end, to, end - index);
      if (close >= 0) {
        spans.push({ openStart: index, openEnd: end, closeStart: close, closeEnd: close + (end - index) });
        next = close + (end - index);
      } else next = end;
    } else if (character === "{" && ROLE.test(text.slice(index, to))) {
      const match = ROLE.exec(text.slice(index, to))!;
      const open = index + match[0].length;
      const close = findBacktickRun(text, open, to, match[1]!.length);
      if (close >= 0) {
        spans.push({ openStart: index, openEnd: open, closeStart: close, closeEnd: close + match[1]!.length });
        next = close + match[1]!.length;
      }
    } else if (character === "[") {
      const end = parseLink(text, index, to, spans);
      if (end >= 0) next = end;
    } else if (character === "<") {
      const whole = wholeConstructEnd(text, index, to);
      if (whole >= 0) next = whole;
      else {
        const end = parseHtmlElement(text, index, to, spans);
        if (end >= 0) next = end;
      }
    } else if (character === "$" || character === "!") {
      const whole = wholeConstructEnd(text, index, to);
      if (whole >= 0) next = whole;
    } else if (character === "*" || character === "_" || character === "~") {
      const run = delimiterRun(text, from, to, index);
      delimiters.push(run);
      next = run.end;
    }
    index = next;
  }
  matchEmphasis(delimiters, spans);
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-279
/**
 * The inline constructs of `text` (one block's source), nested ones included, each with the
 * `[start, end)` indexes of its opening and closing delimiters.
 */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  parseRange(text, 0, text.length, spans);
  return spans;
}

/** The spans enclosing `index` (after the first character of the opening delimiter, before the end of the closing one), outermost first. */
export function spansEnclosing(spans: readonly InlineSpan[], index: number): InlineSpan[] {
  return spans
    .filter((span) => span.openStart < index && index < span.closeEnd)
    .sort((first, second) => first.openStart - second.openStart || second.closeEnd - first.closeEnd);
}
