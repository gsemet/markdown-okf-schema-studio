/**
 * Re-anchoring of review comment threads (T45). Pure module: no `vscode` import.
 *
 * A thread stores the lines of its block and the quoted (rendered) text. When the document
 * changes, `shiftThreadLines` moves the lines with the edits (cheap, per change event), and
 * `reanchor` checks a thread against the document text and finds the quote again when it moved.
 *
 * Decision D25: a wrong re-attachment is worse than an orphan, so every rule is conservative.
 *  - The quote is searched in the "plain" text of the document: block markers, link targets,
 *    emphasis marks, table pipes and HTML tags removed, whitespace collapsed (the quote comes from
 *    the rendered page). Code fences and front matter are not searched.
 *  - A quote still inside its old lines stays (state "anchored").
 *  - Otherwise the exact matches are the candidates. Several candidates are narrowed by the prefix
 *    and the suffix of the thread; if that still leaves several, only candidates within 50 lines
 *    of the old lines count, and the nearest wins only when it is strictly nearer than the next.
 *    A quote shorter than 12 characters is accepted only inside that window.
 *  - With no exact match, a fuzzy match (edit distance of at most 20 %) is tried, only around the
 *    occurrences of the quote's rarest word, with a bounded number of cells computed. Fuzzy
 *    candidates go through the same decision as exact ones.
 *  - Anything else is "orphaned": the thread keeps its old lines and nothing is deleted.
 */

import { shiftLineForEdits } from "../scroll/anchorPolicy";
import { advanceFence, frontmatterRange } from "../syntax/markdownSyntax";
import type { CommentThread } from "./commentModel";

export type AnchorState = "anchored" | "moved" | "orphaned";

export interface AnchorResult {
  state: AnchorState;
  /** The lines to store: new ones when "moved", the stored ones otherwise. */
  line: number;
  endLine: number;
}

export interface LineChange {
  startLine: number;
  endLine: number;
  insertedLineCount: number;
}

/** Lines around the old position inside which a weak match is still accepted. */
export const WINDOW_LINES = 50;
/** A quote with fewer characters (plain text) is accepted only inside the window. */
export const MIN_FAR_QUOTE = 12;
/** Fuzzy matches may differ by this share of the quote length. */
export const FUZZY_RATIO = 0.2;
/** Share of the quote's words that must still be found, in order, in the old lines to keep a thread there. */
export const RESEMBLANCE = 0.6;
const MAX_CANDIDATES = 200;
const MAX_RARE_OCCURRENCES = 20;
const MAX_FUZZY_TEXT = 2_000_000;
/** Cells of edit-distance work allowed for one call of `reanchorThreads` (or one `reanchor`). */
export const FUZZY_BUDGET = 20_000_000;

/** `TextDocumentContentChangeEvent`-like input of `toLineChanges` (0-based lines). */
export interface ContentChangeLike {
  range: { start: { line: number }; end: { line: number } };
  text: string;
}

/** Converts content changes of one edit event into the 1-based line changes used by the shift. */
export function toLineChanges(changes: readonly ContentChangeLike[]): LineChange[] {
  return changes.map((change) => ({
    startLine: change.range.start.line + 1,
    endLine: change.range.end.line + 1,
    insertedLineCount: change.text.split("\n").length - 1,
  }));
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-094
/**
 * Moves the stored lines of the threads with the edits (all ranges are in the coordinates of the
 * document before the event, so the order of the changes does not matter). Unchanged threads keep
 * their identity; the same array is returned when nothing changed.
 */
export function shiftThreadLines(threads: readonly CommentThread[], changes: readonly LineChange[]): CommentThread[] {
  if (changes.length === 0) return threads as CommentThread[];
  let any = false;
  const result = threads.map((thread) => {
    const line = shiftLineForEdits(thread.anchor.line, changes);
    const endLine = Math.max(line, shiftLineForEdits(thread.anchor.endLine, changes));
    if (line === thread.anchor.line && endLine === thread.anchor.endLine) return thread;
    any = true;
    return { ...thread, anchor: { ...thread.anchor, line, endLine } };
  });
  return any ? result : threads as CommentThread[];
}

// ---------------------------------------------------------------------------------------------
// Plain text of the document

// Roles whose rendered text the source does not hold (a citation label, a heading title): dropped.
const OPAQUE_ROLES = "cite|citep|citet|cite:p|cite:t|footcite|ref|numref|doc|eq|term|any|download";
const OPAQUE_NAME = new RegExp(`^(?:${OPAQUE_ROLES})$`, "u");
const OPAQUE_IN_LINE = new RegExp(`\\{(?:${OPAQUE_ROLES})\\}\``, "u");
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

function decodeEntities(value: string): string {
  return value.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z]{2,6}));/gu, (whole, dec, hex, name) => {
    if (name !== undefined) return ENTITIES[name.toLowerCase()] ?? whole;
    const code = dec !== undefined ? Number(dec) : parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/**
 * Inline markup removed from a quote or a source line; whitespace collapsed. MyST roles keep the
 * text they render ({kbd}`X` -> X; {ref}`text <label>` -> text), roles that render a label the
 * source does not hold ({cite}, {ref} without text) are dropped, entities are decoded, HTML
 * comments and footnote markers removed.
 */
export function plainInline(value: string): string {
  const withoutRoles = value.replace(/\{([A-Za-z][\w:+.-]*)\}`([^`]*)`/gu, (_whole, name: string, content: string) => {
    if (OPAQUE_NAME.test(name)) {
      const titled = /^(.*?)\s*<[^>]*>$/u.exec(content);
      return titled ? titled[1] : "";
    }
    return content;
  });
  return decodeEntities(withoutRoles
    .replace(/<!--[\s\S]*?-->/gu, "")
    .replace(/\[\^[^\]]*\]/gu, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/gu, "$1")
    .replace(/<\/?[A-Za-z][^>\n]*>/gu, "")
    .replace(/\\(?=[!-/:-@[-`{-~])/gu, "")
    .replace(/[*_~`|]/gu, ""))
    .replace(/\s+/gu, " ")
    .trim();
}

function plainLine(raw: string): string {
  const stripped = raw
    .replace(/^\s{0,3}(?:>\s?)+/u, "")
    .replace(/^\s*(?:#{1,6}\s+|(?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?)/u, "");
  return plainInline(stripped);
}

const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/u;

export interface DocumentIndex {
  /** Number of lines of the source. */
  lineCount: number;
  /** Plain lines (non-empty) joined by one space. */
  plain: string;
  /** Offset in `plain` where each indexed line starts. */
  starts: number[];
  /** Source line (1-based) of each indexed line. */
  lines: number[];
  /** Source lines, for the checks that need the markup (opaque roles). */
  raw: string[];
  /** Lower-cased word counts; built on first use. */
  words?: Map<string, number>;
}

export function createDocumentIndex(text: string): DocumentIndex {
  const source = text.split(/\r\n|\r|\n/u);
  const starts: number[] = [];
  const lines: number[] = [];
  const parts: string[] = [];
  let offset = 0;
  let fence: string | undefined;
  // Front matter is skipped; an unclosed one is ordinary text.
  for (let index = frontmatterRange(source); index < source.length; index += 1) {
    const raw = source[index];
    const wasInFence = fence !== undefined;
    fence = advanceFence(raw, fence);
    if (wasInFence || fence !== undefined) continue;
    if (TABLE_RULE.test(raw) && raw.includes("-") && raw.includes("|")) continue;
    const plain = plainLine(raw);
    if (plain === "") continue;
    starts.push(offset);
    lines.push(index + 1);
    parts.push(plain);
    offset += plain.length + 1;
  }
  return { lineCount: source.length, plain: parts.join(" "), starts, lines, raw: source };
}

function lineAt(index: DocumentIndex, offset: number): number {
  let low = 0;
  let high = index.starts.length - 1;
  let found = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (index.starts[middle] <= offset) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return index.lines[found] ?? 1;
}

/** Index of the first indexed line whose source line is >= `line`. */
function firstIndexedFrom(index: DocumentIndex, line: number): number {
  let low = 0;
  let high = index.lines.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (index.lines[middle] < line) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Offsets in `plain` of the indexed lines of source lines `line`..`endLine`; undefined when none. */
function rangeSpan(index: DocumentIndex, line: number, endLine: number): { from: number; to: number } | undefined {
  const first = firstIndexedFrom(index, line);
  const after = firstIndexedFrom(index, endLine + 1);
  if (first >= after) return undefined;
  const to = after < index.starts.length ? index.starts[after] - 1 : index.plain.length;
  return { from: index.starts[first], to };
}

const TOKEN = /[\p{L}\p{N}]+/gu;

/**
 * True when the old lines still look like the quote: at least 60 % of its words occur, in order,
 * in the plain text of those lines, or the lines hold a role that renders text the source does
 * not contain (a citation, a reference) so nothing can be checked. Used only to avoid calling a
 * thread orphaned while its text sits where it was.
 */
function resembles(index: DocumentIndex, quote: string, line: number, endLine: number): boolean {
  const span = rangeSpan(index, line, endLine);
  if (!span) return false;
  for (let number = line; number <= Math.min(endLine, index.raw.length); number += 1) {
    if (OPAQUE_IN_LINE.test(index.raw[number - 1])) return true;
  }
  const wanted: string[] = [...(quote.toLowerCase().match(TOKEN) ?? [])];
  if (wanted.length === 0) return false;
  const present: string[] = [...(index.plain.slice(span.from, span.to).toLowerCase().match(TOKEN) ?? [])];
  let cursor = 0;
  let matched = 0;
  for (const word of wanted) {
    const at = present.indexOf(word, cursor);
    if (at >= 0) {
      matched += 1;
      cursor = at + 1;
    }
  }
  return matched / wanted.length >= RESEMBLANCE;
}

const NEGATIONS = new Set(["not", "no", "never", "without", "cannot", "nor", "none", "ne", "pas", "non"]);

/** Numbers and negation words of a text, sorted: a fuzzy match must agree on them. */
function criticalTokens(value: string): string[] {
  const lower = value.toLowerCase();
  const found: string[] = [...(lower.match(/\d+(?:[.,]\d+)*/gu) ?? [])];
  for (const word of lower.match(/[\p{L}\p{N}']+/gu) ?? []) {
    if (NEGATIONS.has(word) || word.endsWith("n't")) found.push(word);
  }
  return found.sort();
}

function isSubMultiset(small: readonly string[], large: readonly string[]): boolean {
  const left = [...large];
  for (const item of small) {
    const at = left.indexOf(item);
    if (at < 0) return false;
    left.splice(at, 1);
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// Candidates and the decision

interface Candidate {
  /** Offset of the match start in the plain text. */
  start: number;
  end: number;
  line: number;
  endLine: number;
}

interface Anchor {
  line: number;
  endLine: number;
  prefix: string;
  suffix: string;
}

function distanceTo(anchor: Anchor, candidate: Candidate): number {
  if (candidate.line < anchor.line) return anchor.line - candidate.line;
  if (candidate.line > anchor.endLine) return candidate.line - anchor.endLine;
  return 0;
}

const inWindow = (anchor: Anchor, candidate: Candidate): boolean =>
  candidate.line >= anchor.line - WINDOW_LINES && candidate.line <= anchor.endLine + WINDOW_LINES;

function contextMatches(index: DocumentIndex, anchor: Anchor, candidate: Candidate): boolean {
  const prefix = plainInline(anchor.prefix);
  const suffix = plainInline(anchor.suffix);
  if (prefix !== "" && !index.plain.slice(Math.max(0, candidate.start - prefix.length - 8), candidate.start).trimEnd().endsWith(prefix)) {
    return false;
  }
  if (suffix !== "" && !index.plain.slice(candidate.end, candidate.end + suffix.length + 8).trimStart().startsWith(suffix)) {
    return false;
  }
  return true;
}

/** Picks one candidate or none (D25): context first, then proximity inside the window. */
function decide(
  index: DocumentIndex,
  anchor: Anchor,
  candidates: readonly Candidate[],
  quoteLength: number,
): Candidate | undefined {
  if (candidates.length === 0) return undefined;
  let pool = candidates;
  const short = quoteLength < MIN_FAR_QUOTE;
  if (plainInline(anchor.prefix) !== "" || plainInline(anchor.suffix) !== "") {
    const matching = candidates.filter((candidate) => contextMatches(index, anchor, candidate));
    if (matching.length > 0) {
      pool = matching;
    } else if (short || candidates.length > 1) {
      // The surroundings disagree everywhere: a short quote, or one of several copies, would be a guess.
      return undefined;
    }
  }
  if (pool.length === 1) {
    return !short || inWindow(anchor, pool[0]) ? pool[0] : undefined;
  }
  const near = pool.filter((candidate) => inWindow(anchor, candidate));
  if (near.length === 0) return undefined;
  if (near.length === 1) return near[0];
  const ranked = near.map((candidate) => ({ candidate, distance: distanceTo(anchor, candidate) }))
    .sort((left, right) => left.distance - right.distance);
  return ranked[0].distance < ranked[1].distance ? ranked[0].candidate : undefined;
}

function exactCandidates(index: DocumentIndex, quote: string): Candidate[] {
  const found: Candidate[] = [];
  let from = index.plain.indexOf(quote);
  while (from >= 0 && found.length < MAX_CANDIDATES) {
    const end = from + quote.length;
    found.push({ start: from, end, line: lineAt(index, from), endLine: lineAt(index, Math.max(from, end - 1)) });
    from = index.plain.indexOf(quote, end);
  }
  return found;
}

const WORD = /[\p{L}\p{N}]+/gu;

function wordCounts(index: DocumentIndex): Map<string, number> {
  if (!index.words) {
    const counts = new Map<string, number>();
    for (const word of index.plain.toLowerCase().match(WORD) ?? []) counts.set(word, (counts.get(word) ?? 0) + 1);
    index.words = counts;
  }
  return index.words;
}

/** Lowest edit distance of `pattern` against any substring of `text`; Infinity when above `limit`. */
function bestDistance(pattern: string, text: string, limit: number, budget: { cells: number }): number {
  const width = text.length;
  budget.cells -= pattern.length * width;
  let previous = new Uint16Array(width + 1);
  let current = new Uint16Array(width + 1);
  for (let row = 1; row <= pattern.length; row += 1) {
    current[0] = row;
    let rowMinimum = row;
    const char = pattern.charCodeAt(row - 1);
    for (let column = 1; column <= width; column += 1) {
      const substitution = previous[column - 1] + (char === text.charCodeAt(column - 1) ? 0 : 1);
      const value = Math.min(substitution, previous[column] + 1, current[column - 1] + 1);
      current[column] = value;
      if (value < rowMinimum) rowMinimum = value;
    }
    if (rowMinimum > limit) return Infinity;
    [previous, current] = [current, previous];
  }
  let best = Infinity;
  for (let column = 0; column <= width; column += 1) if (previous[column] < best) best = previous[column];
  return best <= limit ? best : Infinity;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-107
function fuzzyCandidates(index: DocumentIndex, quote: string, budget: { cells: number }): Candidate[] {
  if (index.plain.length > MAX_FUZZY_TEXT || quote.length < MIN_FAR_QUOTE) return [];
  const counts = wordCounts(index);
  const quoteLower = quote.toLowerCase();
  let rarest: string | undefined;
  let rarestCount = Infinity;
  for (const word of new Set(quoteLower.match(WORD) ?? [])) {
    const count = counts.get(word) ?? 0;
    if (count === 0) continue;
    if (count < rarestCount || (count === rarestCount && rarest !== undefined && word.length > rarest.length)) {
      rarest = word;
      rarestCount = count;
    }
  }
  if (rarest === undefined || rarestCount > MAX_RARE_OCCURRENCES) return [];
  const limit = Math.floor(quote.length * FUZZY_RATIO);
  const slack = limit + 1;
  const offsetInQuote = Math.max(0, quoteLower.search(new RegExp(`(?<![\\p{L}\\p{N}])${rarest.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}(?![\\p{L}\\p{N}])`, "u")));
  const lowerPlain = index.plain.toLowerCase();
  const found: Array<Candidate & { distance: number }> = [];
  const isWordChar = (char: string | undefined): boolean => char !== undefined && /[\p{L}\p{N}]/u.test(char);
  let position = lowerPlain.indexOf(rarest);
  while (position >= 0) {
    const boundary = !isWordChar(lowerPlain[position - 1]) && !isWordChar(lowerPlain[position + rarest.length]);
    if (boundary) {
      if (budget.cells <= 0) break;
      const base = position - offsetInQuote;
      const from = Math.max(0, base - slack);
      const to = Math.min(index.plain.length, base + quote.length + slack);
      const distance = bestDistance(quote, index.plain.slice(from, to), limit, budget);
      // Numbers and negations must agree: "300" is not "30", "should" is not "should not".
      const wanted = criticalTokens(quote);
      const tight = index.plain.slice(Math.max(0, base), Math.min(index.plain.length, base + quote.length));
      const agree = distance !== Infinity
        && isSubMultiset(wanted, criticalTokens(index.plain.slice(from, to)))
        && isSubMultiset(criticalTokens(tight), wanted);
      if (agree) {
        const start = Math.max(0, base);
        const line = lineAt(index, position);
        const previous = found[found.length - 1];
        const candidate = { start, end: Math.min(index.plain.length, start + quote.length), line, endLine: line, distance };
        // The same region again (the rare word repeats inside one match): keep the better one.
        if (previous && start - previous.start < quote.length) {
          if (distance < previous.distance) found[found.length - 1] = candidate;
        } else {
          found.push(candidate);
        }
      }
    }
    position = lowerPlain.indexOf(rarest, position + rarest.length);
  }
  return found;
}

/** The `reanchor` input: only the anchor of a thread is read. */
export type AnchorThread = { anchor: CommentThread["anchor"] };

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-100
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-101
function reanchorWith(index: DocumentIndex, thread: AnchorThread, budget: { cells: number }): AnchorResult {
  const { line, endLine } = thread.anchor;
  const orphaned: AnchorResult = { state: "orphaned", line, endLine };
  const quote = plainInline(thread.anchor.quote);
  if (quote === "") {
    // A block-only thread has nothing to search: it stays while its line exists.
    return line <= index.lineCount ? { state: "anchored", line, endLine } : orphaned;
  }
  const anchor: Anchor = { line, endLine, prefix: thread.anchor.prefix, suffix: thread.anchor.suffix };
  const stay: AnchorResult = { state: "anchored", line, endLine };
  const hasContext = plainInline(anchor.prefix) !== "" || plainInline(anchor.suffix) !== "";
  // The old lines first, directly (a common quote may have more copies than the candidate cap).
  const span = rangeSpan(index, line, endLine);
  const here = span ? index.plain.slice(span.from, span.to).indexOf(quote) : -1;
  const exact = exactCandidates(index, quote);
  if (span && here >= 0) {
    const start = span.from + here;
    const inRange: Candidate = { start, end: start + quote.length, line: lineAt(index, start), endLine: lineAt(index, start + quote.length - 1) };
    // A single copy, or no context to tell the copies apart: the quote is where it was.
    if (exact.length <= 1 || !hasContext || contextMatches(index, anchor, inRange)) return stay;
    // Several copies and this one does not fit the surroundings: another copy may be the thread's.
    const fitting = exact.filter((candidate) => contextMatches(index, anchor, candidate));
    const other = fitting.length > 0 ? decide(index, anchor, fitting, quote.length) : undefined;
    if (other) return { state: "moved", line: other.line, endLine: Math.max(other.line, other.endLine) };
    return stay;
  }
  let chosen = decide(index, anchor, exact, quote.length);
  if (!chosen && exact.length === 0) chosen = decide(index, anchor, fuzzyCandidates(index, quote, budget), quote.length);
  if (!chosen) return resembles(index, quote, line, endLine) ? stay : orphaned;
  const newEnd = Math.max(chosen.line, chosen.endLine);
  if (chosen.line === line && newEnd === endLine) return stay;
  return { state: "moved", line: chosen.line, endLine: newEnd };
}

/** Checks one thread against the text of the document (see the module comment for the rules). */
export function reanchor(text: string | DocumentIndex, thread: AnchorThread): AnchorResult {
  const index = typeof text === "string" ? createDocumentIndex(text) : text;
  return reanchorWith(index, thread, { cells: FUZZY_BUDGET });
}

export interface ReanchorOutcome {
  /** Same objects for unchanged threads; moved ones are copies with the new lines. */
  threads: CommentThread[];
  /** Ids of the threads that could not be placed. Their stored lines are untouched. */
  orphaned: Set<string>;
  /** True when at least one thread got new lines. */
  changed: boolean;
}

/** `reanchor` for all threads of a sidecar against one document text; shares the cost budget. */
export function reanchorThreads(text: string | DocumentIndex, threads: readonly CommentThread[]): ReanchorOutcome {
  const index = typeof text === "string" ? createDocumentIndex(text) : text;
  const budget = { cells: FUZZY_BUDGET };
  const orphaned = new Set<string>();
  let changed = false;
  const result = threads.map((thread) => {
    const outcome = reanchorWith(index, thread, budget);
    if (outcome.state === "orphaned") orphaned.add(thread.id);
    if (outcome.state !== "moved") return thread;
    changed = true;
    return { ...thread, anchor: { ...thread.anchor, line: outcome.line, endLine: outcome.endLine } };
  });
  return { threads: result, orphaned, changed };
}
