/**
 * Word-level difference of two texts, for the side-by-side diff of a changed block. Pure module:
 * no DOM, no host API.
 */

/** A range of characters of a text, `start` inclusive, `end` exclusive. */
export interface CharRange {
  start: number;
  end: number;
}

/** The words of the old text that disappeared and the words of the new text that appeared. */
export interface WordDiff {
  removed: CharRange[];
  added: CharRange[];
}

/** Above this many token pairs the texts are not compared word by word: all of both is marked. */
export const MAX_WORD_DIFF_CELLS = 4_000_000;

interface Token {
  text: string;
  start: number;
  end: number;
  space: boolean;
}

function tokens(text: string): Token[] {
  const result: Token[] = [];
  const pattern = /\s+|[^\s]+/gu;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    result.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      space: /^\s/u.test(match[0]),
    });
  }
  return result;
}

/** Merges consecutive marked words into ranges; the space between two marked words is marked too. */
function rangesOf(words: Token[], marked: boolean[]): CharRange[] {
  const ranges: CharRange[] = [];
  words.forEach((word, index) => {
    if (!marked[index]) return;
    if (index > 0 && marked[index - 1]) ranges[ranges.length - 1].end = word.end;
    else ranges.push({ start: word.start, end: word.end });
  });
  return ranges;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-005
/**
 * Compares two texts word by word (a longest common subsequence of the words). The result lists
 * the character ranges of `before` that are not in `after` and the ranges of `after` that are not in
 * `before`; consecutive changed words form one range. A very long pair marks everything.
 */
export function diffWords(before: string, after: string): WordDiff {
  const a = tokens(before).filter((token) => !token.space);
  const b = tokens(after).filter((token) => !token.space);
  if (a.length * b.length > MAX_WORD_DIFF_CELLS) {
    return { removed: rangesOf(a, a.map(() => true)), added: rangesOf(b, b.map(() => true)) };
  }
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix].text === b[prefix].text) prefix += 1;
  let suffix = 0;
  while (
    suffix < a.length - prefix && suffix < b.length - prefix
    && a[a.length - 1 - suffix].text === b[b.length - 1 - suffix].text
  ) suffix += 1;
  const n = a.length - prefix - suffix;
  const m = b.length - prefix - suffix;
  const lcs: Uint32Array[] = [];
  for (let row = 0; row <= n; row += 1) lcs.push(new Uint32Array(m + 1));
  for (let row = n - 1; row >= 0; row -= 1) {
    for (let column = m - 1; column >= 0; column -= 1) {
      lcs[row][column] = a[prefix + row].text === b[prefix + column].text
        ? lcs[row + 1][column + 1] + 1
        : Math.max(lcs[row + 1][column], lcs[row][column + 1]);
    }
  }
  const removedFlags = a.map(() => false);
  const addedFlags = b.map(() => false);
  let row = 0;
  let column = 0;
  while (row < n || column < m) {
    if (row < n && column < m && a[prefix + row].text === b[prefix + column].text) {
      row += 1;
      column += 1;
    } else if (column >= m || (row < n && lcs[row + 1][column] >= lcs[row][column + 1])) {
      removedFlags[prefix + row] = true;
      row += 1;
    } else {
      addedFlags[prefix + column] = true;
      column += 1;
    }
  }
  return { removed: rangesOf(a, removedFlags), added: rangesOf(b, addedFlags) };
}

/** The ranges of each segment: `removed[i]` are ranges inside segment `i` of the old texts. */
export interface SegmentDiff {
  removed: CharRange[][];
  added: CharRange[][];
}

/** Cuts the ranges of the joined text (segments separated by one character) back to the segments. */
function splitRanges(segments: readonly string[], ranges: readonly CharRange[]): CharRange[][] {
  const result: CharRange[][] = segments.map(() => []);
  let offset = 0;
  segments.forEach((segment, index) => {
    const start = offset;
    const end = offset + segment.length;
    for (const range of ranges) {
      const from = Math.max(range.start, start);
      const to = Math.min(range.end, end);
      if (from < to) result[index].push({ start: from - start, end: to - start });
    }
    offset = end + 1;
  });
  return result;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-005
/**
 * {@link diffWords} for texts that come in pieces (the text nodes of a rendered block). The pieces
 * are compared as one text in which a piece boundary separates words; the ranges come back inside
 * their piece.
 */
export function diffSegments(before: readonly string[], after: readonly string[]): SegmentDiff {
  const diff = diffWords(before.join("\n"), after.join("\n"));
  return { removed: splitRanges(before, diff.removed), added: splitRanges(after, diff.added) };
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-009
/**
 * How much two texts share, from 0 (no common word) to 1 (the same words): the words {@link diffWords}
 * keeps on both sides over all the words of both. Two texts without words share nothing (0).
 */
export function sharedWordRatio(before: string, after: string): number {
  const count = (text: string): number => tokens(text).filter((token) => !token.space).length;
  const total = count(before) + count(after);
  if (total === 0) return 0;
  const diff = diffWords(before, after);
  const changed = diff.removed.reduce((sum, range) => sum + count(before.slice(range.start, range.end)), 0)
    + diff.added.reduce((sum, range) => sum + count(after.slice(range.start, range.end)), 0);
  return (total - changed) / total;
}
