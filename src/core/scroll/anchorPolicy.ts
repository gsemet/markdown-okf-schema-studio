/**
 * Scroll anchoring policy: the single source of truth for how the text editor
 * and the preview stay aligned, in every editing mode (raw text editor with a
 * side preview, custom-editor preview, inline block or frontmatter editing).
 *
 * The full rationale lives in `docs/scroll-anchoring.md`. In short:
 *
 * 1. Panes exchange fractional source lines only; pixels never cross the
 *    host/webview boundary.
 * 2. The anchor is the start of a source line, never the cursor. The editor
 *    anchor is its first visible line; the preview anchor is the source line
 *    that starts at the preview reading line.
 * 3. The preview reading line sits a constant `readingOffset` below the top of
 *    the viewport (the space reserved for the sticky heading band), with a
 *    ramp over the first `readingOffset` pixels so scrollTop 0 is line 1.
 * 4. One piecewise-linear map converts lines to document y and back. It holds
 *    the top of every mapped block, the start of every soft-wrapped source line
 *    inside paragraphs, and the bottom of every block, so long paragraphs
 *    anchor at the exact start of a source line.
 * 5. The pane that received user input leads; programmatic scrolls never emit
 *    synchronization messages, and the anchor survives re-renders and layout
 *    changes instead of being re-derived from the current scroll position.
 */

/** A mapped preview block measured in absolute document coordinates. */
export interface AnchorBlock {
  /** Document y of the block border-box top. */
  top: number;
  height: number;
  /** First source line (1-based). */
  line: number;
  /** Last source line (1-based, inclusive). */
  endLine: number;
  /**
   * Document y where source lines `line + 1`, `line + 2`, … start inside the
   * block (soft line breaks of a paragraph), when they could be measured.
   */
  lineTops?: readonly number[];
}

/** One point of the line ↔ y map. Lines are fractional, 1-based. */
export interface AnchorPoint {
  y: number;
  line: number;
}

export type AnchorOwner = "editor" | "preview";

/** The authoritative anchor shared by both panes. */
export interface ScrollAnchor {
  line: number;
  owner: AnchorOwner;
}

export interface AnchorPolicy {
  buildAnchorMap(blocks: readonly AnchorBlock[]): AnchorPoint[];
  lineAtY(map: readonly AnchorPoint[], y: number): number | undefined;
  yAtLine(map: readonly AnchorPoint[], line: number): number | undefined;
  readingY(scrollTop: number, readingOffset: number): number;
  scrollTopForY(y: number, readingOffset: number, maxScrollTop: number): number;
  lineAtScrollTop(
    map: readonly AnchorPoint[],
    scrollTop: number,
    readingOffset: number,
  ): number | undefined;
  scrollTopForLine(
    map: readonly AnchorPoint[],
    line: number,
    readingOffset: number,
    maxScrollTop: number,
  ): number | undefined;
  readingOffset(stickyHeadingDepth: number, lineHeight: number, chrome: number): number;
  editorTopLine(line: number): number;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-119
export function createAnchorPolicy(): AnchorPolicy {
  function finite(value: number): boolean {
    return typeof value === "number" && Number.isFinite(value);
  }

  function buildAnchorMap(blocks: readonly AnchorBlock[]): AnchorPoint[] {
    const raw: AnchorPoint[] = [];
    for (const block of blocks) {
      if (!finite(block.top) || !finite(block.height) || block.height < 0
        || !finite(block.line) || block.line < 1) {
        continue;
      }
      let endLine = finite(block.endLine) && block.endLine > block.line ? block.endLine : block.line;
      raw.push({ y: block.top, line: block.line });
      const tops = block.lineTops;
      if (tops && tops.length > 0 && (endLine === block.line || tops.length === endLine - block.line)) {
        endLine = block.line + tops.length;
        for (let index = 0; index < tops.length; index += 1) {
          if (finite(tops[index])) raw.push({ y: tops[index], line: block.line + index + 1 });
        }
      }
      raw.push({ y: block.top + block.height, line: endLine + 1 });
    }
    raw.sort((left, right) => left.y - right.y || left.line - right.line);
    const map: AnchorPoint[] = [{ y: 0, line: 1 }];
    for (const point of raw) {
      const last = map[map.length - 1];
      if (point.y < last.y || point.line < last.line) continue;
      if (point.y === last.y && point.line === last.line) continue;
      map.push({ y: point.y, line: point.line });
    }
    return map.length > 1 ? map : [];
  }

  function lineAtY(map: readonly AnchorPoint[], y: number): number | undefined {
    if (map.length === 0 || !finite(y)) return undefined;
    if (y <= map[0].y) return map[0].line;
    for (let index = 1; index < map.length; index += 1) {
      const next = map[index];
      if (y <= next.y) {
        const previous = map[index - 1];
        if (next.y === previous.y) return next.line;
        return previous.line + (next.line - previous.line) * (y - previous.y) / (next.y - previous.y);
      }
    }
    return map[map.length - 1].line;
  }

  function yAtLine(map: readonly AnchorPoint[], line: number): number | undefined {
    if (map.length === 0 || !finite(line)) return undefined;
    if (line <= map[0].line) return map[0].y;
    for (let index = 1; index < map.length; index += 1) {
      const next = map[index];
      if (line <= next.line) {
        const previous = map[index - 1];
        if (next.line === previous.line) return previous.y;
        return previous.y + (next.y - previous.y) * (line - previous.line) / (next.line - previous.line);
      }
    }
    return map[map.length - 1].y;
  }

  function readingY(scrollTop: number, readingOffset: number): number {
    const offset = Math.max(0, readingOffset);
    const top = Math.max(0, scrollTop);
    return top < offset ? top * 2 : top + offset;
  }

  function scrollTopForY(y: number, readingOffset: number, maxScrollTop: number): number {
    const offset = Math.max(0, readingOffset);
    const target = y < offset * 2 ? y / 2 : y - offset;
    return Math.max(0, Math.min(Math.max(0, maxScrollTop), target));
  }

  function lineAtScrollTop(
    map: readonly AnchorPoint[],
    scrollTop: number,
    readingOffset: number,
  ): number | undefined {
    return lineAtY(map, readingY(scrollTop, readingOffset));
  }

  function scrollTopForLine(
    map: readonly AnchorPoint[],
    line: number,
    readingOffset: number,
    maxScrollTop: number,
  ): number | undefined {
    const y = yAtLine(map, line);
    return y === undefined ? undefined : scrollTopForY(y, readingOffset, maxScrollTop);
  }

  function readingOffset(stickyHeadingDepth: number, lineHeight: number, chrome: number): number {
    const depth = finite(stickyHeadingDepth) ? Math.max(0, stickyHeadingDepth) : 0;
    const height = finite(lineHeight) ? Math.max(0, lineHeight) : 0;
    return depth * height + (finite(chrome) ? Math.max(0, chrome) : 0);
  }

  function editorTopLine(line: number): number {
    return finite(line) ? Math.max(1, Math.floor(line + 1e-6)) : 1;
  }

  return {
    buildAnchorMap,
    lineAtY,
    yAtLine,
    readingY,
    scrollTopForY,
    lineAtScrollTop,
    scrollTopForLine,
    readingOffset,
    editorTopLine,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-100
/**
 * Host-side echo guard. After the host scrolls the text editor on behalf of
 * the preview, the editor reports visible-range changes; those are echoes and
 * must not be sent back to the preview. The guard is keyed by document, not by
 * render request, so it survives re-renders that happen mid-scroll.
 */
export class EditorEchoGuard {
  private expected: {
    documentId: string;
    fromLine: number;
    line: number;
    expiresAt: number;
  } | undefined;

  public constructor(private readonly windowMs = 500) {}

  /** Records that the host is about to reveal `line` while the editor top is `fromLine`. */
  public expect(documentId: string, fromLine: number, line: number, now = Date.now()): void {
    this.expected = { documentId, fromLine, line, expiresAt: now + this.windowMs };
  }

  /**
   * Returns true when a visible-range change is the consequence of the last
   * programmatic reveal: the editor top lies between where it started and the
   * target (smooth scrolling reports intermediate positions), or the revealed
   * line is visible (centered reveals).
   */
  public isEcho(
    documentId: string,
    topLine: number,
    now = Date.now(),
    expectedLineVisible = false,
  ): boolean {
    const expected = this.expected;
    if (!expected) return false;
    if (expected.documentId !== documentId || now > expected.expiresAt) {
      this.expected = undefined;
      return false;
    }
    const low = Math.min(expected.fromLine, expected.line) - 1;
    const high = Math.max(expected.fromLine, expected.line) + 1;
    if (topLine >= low && topLine <= high) {
      return true;
    }
    // A centered reveal leaves the editor top outside the range: accept that
    // single event, then treat further movement as the user's.
    this.expected = undefined;
    return expectedLineVisible;
  }
}

/**
 * Keeps a line anchor attached to the same source text when lines are
 * inserted or removed above it.
 */
export function shiftLineForEdits(
  line: number,
  changes: readonly { startLine: number; endLine: number; insertedLineCount: number }[],
): number {
  let shifted = line;
  for (const change of [...changes].sort((left, right) => right.startLine - left.startLine)) {
    const delta = change.insertedLineCount - (change.endLine - change.startLine);
    if (delta !== 0 && change.endLine < Math.floor(shifted)) {
      shifted = Math.max(change.startLine, shifted + delta);
    }
  }
  return Math.max(1, shifted);
}
