export interface LineRange {
  /** First changed line, 1-based, in the current text. */
  start: number;
  /** Last changed line, inclusive. */
  end: number;
}

/** Above this many middle lines (after the common prefix and suffix) the whole middle is changed. */
 const MAX_DIFF_LINES = 20_000;
/** Above this many edits Myers stops and the whole middle is changed. */
 const MAX_DIFF_EDITS = 2000;

function splitLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/u);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Indexes (0-based) of the lines of `current` that are not in the common subsequence with `base`
 * (inserted), and of the lines of `base` that are not (deleted), or undefined when more than `MAX_DIFF_EDITS` edits are needed. Myers' O(ND) algorithm.
 */
function editIndexes(base: string[], current: string[]): { inserted: number[]; deleted: number[] } | undefined {
  const n = base.length;
  const m = current.length;
  const max = Math.min(n + m, MAX_DIFF_EDITS);
  const offset = max + 1;
  let v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d += 1) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
        ? v[offset + k + 1]
        : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && base[x] === current[y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
  }
  if (found < 0) return undefined;
  const inserted: number[] = [];
  const deleted: number[] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d -= 1) {
    const previous = trace[d];
    const k = x - y;
    const down = k === -d || (k !== d && previous[offset + k - 1] < previous[offset + k + 1]);
    const previousK = down ? k + 1 : k - 1;
    const previousX = previous[offset + previousK];
    const previousY = previousX - previousK;
    while (x > (down ? previousX : previousX + 1) && y > (down ? previousY + 1 : previousY)) {
      x -= 1;
      y -= 1;
    }
    if (down) inserted.push(previousY);
    else deleted.push(previousX);
    x = previousX;
    y = previousY;
  }
  return { inserted: inserted.reverse(), deleted: deleted.reverse() };
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-200
/**
 * Line ranges of `current` that differ from `base` (added or modified lines; lines that only
 * disappeared have no range). Line endings are ignored. Large or very different texts report the
 * whole differing middle as one range.
 */
export function changedLineRanges(base: string, current: string): LineRange[] {
  const a = splitLines(base);
  const b = splitLines(current);
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < a.length - prefix && suffix < b.length - prefix
    && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) suffix += 1;
  const middleBase = a.slice(prefix, a.length - suffix);
  const middleCurrent = b.slice(prefix, b.length - suffix);
  if (middleCurrent.length === 0) return [];
  const whole = [{ start: prefix + 1, end: prefix + middleCurrent.length }];
  if (Math.max(middleBase.length, middleCurrent.length) > MAX_DIFF_LINES) return whole;
  const edits = editIndexes(middleBase, middleCurrent);
  if (!edits) return whole;
  const { inserted } = edits;
  const ranges: LineRange[] = [];
  for (const index of inserted) {
    const line = prefix + index + 1;
    const last = ranges[ranges.length - 1];
    if (last && last.end + 1 === line) last.end = line;
    else ranges.push({ start: line, end: line });
  }
  return ranges;
}

/**
 * One difference between a base text and the current text: the base lines `baseStart..baseEnd` became
 * the current lines `start..end` (1-based, inclusive). A side that has no line is empty:
 * `end === start - 1`, and its `start` is the line it would sit before.
 */
export interface LineHunk {
  baseStart: number;
  baseEnd: number;
  start: number;
  end: number;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-010
/**
 * The differences between `base` and `current` as hunks: runs of lines added, removed or changed,
 * with the lines of both texts. Unlike {@link changedLineRanges}, a run of removed lines is a hunk
 * (with an empty current side). A removal or an addition next to another hunk across blank lines
 * only is part of that hunk. Line endings are ignored. Large or very different texts report the
 * whole differing middle as one hunk.
 */
export function lineHunks(base: string, current: string): LineHunk[] {
  const a = splitLines(base);
  const b = splitLines(current);
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < a.length - prefix && suffix < b.length - prefix
    && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) suffix += 1;
  const middleBase = a.slice(prefix, a.length - suffix);
  const middleCurrent = b.slice(prefix, b.length - suffix);
  if (middleBase.length === 0 && middleCurrent.length === 0) return [];
  const whole = [{
    baseStart: prefix + 1,
    baseEnd: prefix + middleBase.length,
    start: prefix + 1,
    end: prefix + middleCurrent.length,
  }];
  if (Math.max(middleBase.length, middleCurrent.length) > MAX_DIFF_LINES) return whole;
  const edits = editIndexes(middleBase, middleCurrent);
  if (!edits) return whole;
  const inserted = new Set(edits.inserted);
  const deleted = new Set(edits.deleted);
  const hunks: LineHunk[] = [];
  let i = 0;
  let j = 0;
  while (i < middleBase.length || j < middleCurrent.length) {
    if (!(i < middleBase.length && deleted.has(i)) && !(j < middleCurrent.length && inserted.has(j))) {
      i += 1;
      j += 1;
      continue;
    }
    const baseFrom = i;
    const currentFrom = j;
    // Removed and added lines may interleave before the next common line: one hunk.
    while ((i < middleBase.length && deleted.has(i)) || (j < middleCurrent.length && inserted.has(j))) {
      while (i < middleBase.length && deleted.has(i)) i += 1;
      while (j < middleCurrent.length && inserted.has(j)) j += 1;
    }
    hunks.push({
      baseStart: prefix + baseFrom + 1,
      baseEnd: prefix + i,
      start: prefix + currentFrom + 1,
      end: prefix + j,
    });
  }
  return mergeAcrossBlankLines(hunks, a, b);
}

/** True when the lines `from..to` (1-based, inclusive) of `lines` are all blank (an empty range is). */
function blankLines(lines: readonly string[], from: number, to: number): boolean {
  for (let line = from; line <= to; line += 1) if (lines[line - 1].trim() !== "") return false;
  return true;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-010
/**
 * Merges a pure removal or a pure addition with the hunk next to it when only blank lines separate
 * them on both sides. Myers matches a blank line between two paragraphs as a common line, so a
 * paragraph removed right before an edited one would otherwise pair the wrong lines; the merged hunk
 * holds both, with the blank lines between them. A heading or any other non-blank line between two
 * hunks keeps them apart, and two hunks that both have lines on both sides stay apart.
 */
function mergeAcrossBlankLines(hunks: readonly LineHunk[], base: readonly string[], current: readonly string[]): LineHunk[] {
  const pure = (hunk: LineHunk): boolean => hunk.end < hunk.start || hunk.baseEnd < hunk.baseStart;
  const merged: LineHunk[] = [];
  for (const hunk of hunks) {
    const previous = merged[merged.length - 1];
    if (
      previous && (pure(previous) || pure(hunk))
      && blankLines(base, previous.baseEnd + 1, hunk.baseStart - 1)
      && blankLines(current, previous.end + 1, hunk.start - 1)
    ) {
      merged[merged.length - 1] = { baseStart: previous.baseStart, baseEnd: hunk.baseEnd, start: previous.start, end: hunk.end };
    } else {
      merged.push(hunk);
    }
  }
  return merged;
}

/** A range of lines, 1-based and inclusive; `end === start - 1` is an empty range. */
export interface LineSpan {
  start: number;
  end: number;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-010
/**
 * True when a block that covers `span` (lines of the current text) changed: it meets a hunk that has
 * current lines, or it holds the place where a hunk removed lines (the removal lies after its first
 * line and not after its last).
 */
export function spanChanged(span: LineSpan, hunks: readonly LineHunk[]): boolean {
  return hunks.some((hunk) => hunk.end >= hunk.start
    ? hunk.start <= span.end && hunk.end >= span.start
    : span.start < hunk.start && hunk.start <= span.end);
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-010
/**
 * The lines of the base text that a block covering `span` (lines of the current text) comes from.
 * A line inside a hunk maps to the whole base side of the hunk; the lines between hunks shift by the
 * lengths the hunks before them added or removed. The result is empty (`end === start - 1`) for a
 * block made only of added lines.
 */
export function baseSpanOf(span: LineSpan, hunks: readonly LineHunk[]): LineSpan {
  const shiftBefore = (line: number): number => hunks.reduce(
    (shift, hunk) => hunk.end < line ? shift + (hunk.end - hunk.start) - (hunk.baseEnd - hunk.baseStart) : shift,
    0,
  );
  const inside = (line: number): LineHunk | undefined =>
    hunks.find((hunk) => hunk.end >= hunk.start && hunk.start <= line && line <= hunk.end);
  const first = inside(span.start);
  const last = inside(span.end);
  return {
    start: first ? first.baseStart : span.start - shiftBefore(span.start),
    end: last ? last.baseEnd : span.end - shiftBefore(span.end),
  };
}
