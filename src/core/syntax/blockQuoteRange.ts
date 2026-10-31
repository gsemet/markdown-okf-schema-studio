/**
 * Where a block quote (and so a GitHub alert) ends, under the CommonMark rules (0.31.2, section
 * 5.1): it runs over its quoted lines and over the lazy continuation lines, the unquoted lines
 * that continue its open paragraph. A blank line, or an unquoted line that would start a new
 * block, ends it. Shared by the alert render pass and the palette so they agree on the range.
 */

import { advanceFence } from "./markdownSyntax";

const QUOTED = /^\s*>/u;

const HTML_BLOCK_TAGS = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|"
  + "dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|"
  + "legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|"
  + "td|tfoot|th|thead|title|tr|track|ul";

/** The HTML blocks that can interrupt a paragraph (CommonMark kinds 1 to 6). */
const HTML_BLOCK_START = new RegExp(
  `^ {0,3}(?:<(?:script|pre|style|textarea)(?:\\s|>|$)|<!--|<\\?|<![A-Za-z]|<!\\[CDATA\\[|</?(?:${HTML_BLOCK_TAGS})(?:\\s|/?>|$))`,
  "iu",
);
/**
 * The HTML block kinds 1 to 5 and the end condition of each: the block ends on the line that
 * holds it, the start line included. Kinds 6 and 7 end at a blank line.
 */
const HTML_BLOCK_ENDS: readonly (readonly [RegExp, RegExp])[] = [
  [/^ {0,3}<(?:script|pre|style|textarea)(?:\s|>|$)/iu, /<\/(?:script|pre|style|textarea)>/iu],
  [/^ {0,3}<!--/u, /-->/u],
  [/^ {0,3}<\?/u, /\?>/u],
  [/^ {0,3}<![A-Za-z]/u, />/u],
  [/^ {0,3}<!\[CDATA\[/u, /\]\]>/u],
];
/** HTML block kind 7: one complete open or closing tag alone on its line; it cannot interrupt a paragraph. */
const HTML_BLOCK_7 = new RegExp(
  "^ {0,3}(?:<[A-Za-z][A-Za-z0-9-]*(?:\\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\\s*=\\s*(?:[^\\s\"'=<>`]+|'[^']*'|\"[^\"]*\"))?)*"
  + "\\s*/?>|</[A-Za-z][A-Za-z0-9-]*\\s*>)[ \\t]*$",
  "u",
);
const ATX_HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/u;
const CODE_FENCE = /^ {0,3}(?:`{3,}|~{3,})/u;
const COLON_FENCE = /^ {0,3}:{3,}/u;
const THEMATIC_BREAK = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/u;
const SETEXT_UNDERLINE = /^ {0,3}(?:=+|-+)[ \t]*$/u;
/** A GFM table delimiter row (`| - | :-: |`, `--|--`), once it holds a pipe: cells of hyphens. */
const DELIMITER_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/u;
/** A list item that can interrupt a paragraph: a bullet, or an ordered item from 1, with text. */
const INTERRUPTING_ITEM = /^ {0,3}(?:[-*+]|1[.)])[ \t]+\S/u;
/** Any list marker, an empty item included: on a lazy line the quote does not match, so it starts a list. */
const LIST_MARKER = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/u;
const LIST_ITEM_WITH_TEXT = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+\S/u;
/** A list item with no text: it cannot interrupt a paragraph, and opens none. */
const EMPTY_LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]*$/u;
/** A MyST block break (`+++`, optionally with metadata): GitHub reads it as text. */
const MYST_BLOCK_BREAK = /^ {0,3}\+{3}/u;
const INDENTED = /^(?: {4}|\t| {1,3}\t)/u;

/** True when `line` starts a block that interrupts a paragraph, so it is not a lazy line. */
function interruptsParagraph(line: string): boolean {
  if (INDENTED.test(line)) return false;
  return ATX_HEADING.test(line) || CODE_FENCE.test(line) || COLON_FENCE.test(line)
    || THEMATIC_BREAK.test(line) || INTERRUPTING_ITEM.test(line) || HTML_BLOCK_START.test(line);
}

/** True when `line` is a table delimiter row. */
function isDelimiterRow(line: string): boolean {
  return line.includes("|") && DELIMITER_ROW.test(line);
}

/** The number of cells of a table row: its unescaped pipes split it, outer pipes left out. */
function cellCount(row: string): number {
  let text = row.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/u).length;
}

/**
 * The end of the HTML block that `line` starts: the end condition of kinds 1 to 5, `"blank"`
 * for kinds 6 and 7 (kind 7 only with `kind7`: no paragraph is open, kind 7 cannot interrupt
 * one), `undefined` when the line starts none or the block already ends on it.
 */
function htmlBlockEnd(line: string, kind7: boolean): RegExp | "blank" | undefined {
  for (const [start, end] of HTML_BLOCK_ENDS) {
    if (start.test(line)) return end.test(line) ? undefined : end;
  }
  return HTML_BLOCK_START.test(line) || (kind7 && HTML_BLOCK_7.test(line)) ? "blank" : undefined;
}

/** `line` without up to `indent` leading white space characters: a lazy line read after an indent. */
export function dedent(line: string, indent: number): string {
  const leading = (/^[ \t]*/u.exec(line) ?? [""])[0].length;
  return line.slice(Math.min(leading, indent));
}

/**
 * A lazy line written so that it stays paragraph text once it is no longer lazy (the alert
 * rewrite unquotes it into the admonition body): a line that would underline a setext heading,
 * be a table delimiter row or a MyST block break there gets its first character
 * backslash-escaped. Every other line is returned as is.
 */
export function lazyLineAsText(line: string): string {
  if (!SETEXT_UNDERLINE.test(line) && !isDelimiterRow(line) && !MYST_BLOCK_BREAK.test(line)) return line;
  return line.replace(/^([ \t]*)/u, "$1\\");
}

/** The content of a quoted line: every leading `>` marker (and its optional space) removed. */
function quotedContent(line: string): string {
  let content = line.replace(/^\s*>[ \t]?/u, "");
  while (/^ {0,3}>/u.test(content)) content = content.replace(/^ {0,3}>[ \t]?/u, "");
  return content;
}

/** The block state of a block quote after one of its lines. */
interface QuoteState {
  /** A paragraph is open: a lazy line can continue it. */
  paragraphOpen: boolean;
  /** The last line of the open paragraph: the header row a delimiter row turns into a table. */
  paragraphLine: string;
  /** The end condition of the open HTML block, if one is open. */
  html: RegExp | "blank" | undefined;
  /** A table is open: its rows follow until a blank line or a new block. */
  table: boolean;
}

/** The state after `content`, a non-blank quoted line that no open block takes. */
function startBlock(state: QuoteState, content: string): void {
  state.table = false;
  state.paragraphLine = content;
  if (INDENTED.test(content)) {
    state.paragraphOpen = false;
    return;
  }
  const html = htmlBlockEnd(content, true);
  // `htmlBlockEnd` gives `undefined` for a block of kinds 1 to 5 that closes on this same line:
  // the line is still an HTML block, so the start patterns are tested again.
  if (html !== undefined || HTML_BLOCK_START.test(content) || HTML_BLOCK_7.test(content)) {
    state.paragraphOpen = false;
    state.html = html;
    return;
  }
  state.paragraphOpen = !(ATX_HEADING.test(content) || COLON_FENCE.test(content) || THEMATIC_BREAK.test(content))
    && (LIST_ITEM_WITH_TEXT.test(content) || !EMPTY_LIST_ITEM.test(content));
}

/** The state after `content`, a non-blank quoted line that follows an open paragraph. */
function continueParagraph(state: QuoteState, content: string): void {
  if (!INDENTED.test(content) && isDelimiterRow(content)
    && cellCount(state.paragraphLine) === cellCount(content)) {
    state.paragraphOpen = false;
    state.table = true;
    return;
  }
  if (!INDENTED.test(content) && (SETEXT_UNDERLINE.test(content) || interruptsParagraph(content))) {
    state.paragraphOpen = LIST_ITEM_WITH_TEXT.test(content) && !THEMATIC_BREAK.test(content);
    state.html = htmlBlockEnd(content, false);
  }
  state.paragraphLine = content;
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-009
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-115
/**
 * The zero-based index of the last line of the block quote whose first (quoted) line is
 * `lines[start]`. `indent` is the width of the white space before its `>` markers (an alert in a
 * list item): a lazy line is read after that much indentation. The quote takes every following
 * quoted line; an unquoted line joins it only when the quote's last line leaves a paragraph open
 * (plain text, the alert marker line included, not a heading, a fence, indented code, a blank
 * quoted line, a thematic break, an HTML block or a table) and the line is not blank and cannot
 * start a block there (a list item of any kind, empty or of any number, a heading, a code or
 * colon fence, a thematic break, an HTML block that can interrupt a paragraph).
 */
export function blockQuoteEnd(lines: readonly string[], start: number, indent = 0): number {
  const state: QuoteState = { paragraphOpen: false, paragraphLine: "", html: undefined, table: false };
  let fence: string | undefined;
  let last = start;
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > start && !QUOTED.test(line)) {
      const lazy = dedent(line, indent);
      if (!state.paragraphOpen || lazy.trim() === "" || interruptsParagraph(lazy) || LIST_MARKER.test(lazy)) break;
      state.paragraphLine = lazy;
      last = index;
      continue;
    }
    last = index;
    const content = quotedContent(line);
    const wasInFence = fence !== undefined;
    fence = advanceFence(content, fence);
    if (wasInFence || fence !== undefined) {
      state.paragraphOpen = false;
      state.table = false;
    } else if (content.trim() === "") {
      state.paragraphOpen = false;
      state.html = undefined;
      state.table = false;
    } else if (state.html !== undefined) {
      if (state.html !== "blank" && state.html.test(content)) state.html = undefined;
    } else if (state.table && !interruptsParagraph(content)) {
      // A table row: the paragraph stays closed.
    } else if (state.paragraphOpen) {
      continueParagraph(state, content);
    } else {
      startBlock(state, content);
    }
  }
  return last;
}

/**
 * The block quote (first and last zero-based line) that line `at` belongs to, quoted or lazy;
 * `undefined` when it is in none. The scan runs from the first line and skips fenced code at the
 * document level, so a `>` line inside a code block starts no quote.
 */
export function blockQuoteAround(lines: readonly string[], at: number): { start: number; end: number } | undefined {
  let fence: string | undefined;
  for (let index = 0; index <= at; index += 1) {
    const line = lines[index];
    const wasInFence = fence !== undefined;
    fence = advanceFence(line, fence);
    if (wasInFence || fence !== undefined || !QUOTED.test(line)) continue;
    const end = blockQuoteEnd(lines, index);
    if (at <= end) return { start: index, end };
    index = end;
  }
  return undefined;
}
