export interface LineRange {
  /** First changed line, 1-based, in the current text. */
  start: number;
  /** Last changed line, inclusive. */
  end: number;
}

/** Above this many middle lines (after the common prefix and suffix) the whole middle is changed. */
export const MAX_DIFF_LINES = 20_000;
/** Above this many edits Myers stops and the whole middle is changed. */
export const MAX_DIFF_EDITS = 2000;

function splitLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/u);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Indexes (0-based, in `current`) of the lines that are not in the common subsequence with `base`,
 * or undefined when more than `MAX_DIFF_EDITS` edits are needed. Myers' O(ND) algorithm.
 */
function insertedIndexes(base: string[], current: string[]): number[] | undefined {
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
    x = previousX;
    y = previousY;
  }
  return inserted.reverse();
}

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
  const inserted = insertedIndexes(middleBase, middleCurrent);
  if (!inserted) return whole;
  const ranges: LineRange[] = [];
  for (const index of inserted) {
    const line = prefix + index + 1;
    const last = ranges[ranges.length - 1];
    if (last && last.end + 1 === line) last.end = line;
    else ranges.push({ start: line, end: line });
  }
  return ranges;
}
