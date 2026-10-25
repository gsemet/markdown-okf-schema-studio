export interface SelectableBlock {
  /** First source line of the top-level body block. */
  line: number;
  /** Last source line (defaults to `line`). */
  endLine?: number;
  /** True for a block that comes from an `{include}`: it never joins a selection. */
  included?: boolean;
}

export interface BlockSelection {
  /** Replaces the block list; a selection survives only while the list keeps its length. */
  setBlocks(blocks: readonly SelectableBlock[]): void;
  /** Selects the blocks from the anchor to `index`; with no anchor, `index` becomes the anchor. */
  extendTo(index: number): boolean;
  /** Moves the free end by `delta` blocks (Shift+Arrow); starts at `fallbackIndex` when empty. */
  extendBy(delta: number, fallbackIndex?: number): boolean;
  /** Makes `index` the anchor without selecting anything. */
  setAnchor(index: number): void;
  clear(): void;
  isActive(): boolean;
  readonly anchorIndex: number | undefined;
  readonly startIndex: number | undefined;
  readonly endIndex: number | undefined;
  /** Indexes of the selected blocks, in document order. */
  indices(): number[];
  /** First line to last end line of the selection, or undefined when nothing is selected. */
  range(): { line: number; endLine: number } | undefined;
}

/**
 * The contiguous block selection of edit mode: a pure model over the list of top-level body
 * blocks (properties are not in the list). Blocks from an include stop a range: the selection
 * ends before the first one, and an included block cannot be the anchor.
 */
export function createBlockSelection(): BlockSelection {
  let blocks: readonly SelectableBlock[] = [];
  let anchor: number | undefined;
  let start: number | undefined;
  let end: number | undefined;

  const valid = (index: unknown): index is number =>
    typeof index === "number" && Number.isInteger(index) && index >= 0 && index < blocks.length;
  const blocked = (index: number): boolean => blocks[index]?.included === true;
  const clear = (): void => {
    anchor = undefined;
    start = undefined;
    end = undefined;
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-127
  const extendTo = (index: number): boolean => {
    if (!valid(index)) return false;
    if (anchor === undefined) anchor = index;
    if (blocked(anchor)) {
      clear();
      return false;
    }
    const step = index < anchor ? -1 : 1;
    let reached = anchor;
    while (reached !== index && !blocked(reached + step)) reached += step;
    start = Math.min(anchor, reached);
    end = Math.max(anchor, reached);
    return true;
  };

  return {
    setBlocks(next) {
      if (next.length !== blocks.length) clear();
      blocks = next;
    },
    extendTo,
    extendBy(delta, fallbackIndex) {
      if (start === undefined || end === undefined || anchor === undefined) {
        if (!valid(fallbackIndex)) return false;
        anchor = fallbackIndex;
        return extendTo(Math.max(0, Math.min(blocks.length - 1, fallbackIndex + delta)));
      }
      // The free end is the one that is not the anchor (either end while only the anchor is held).
      const free = start === anchor ? end : start;
      const target = Math.max(0, Math.min(blocks.length - 1, free + delta));
      return extendTo(target);
    },
    setAnchor(index) {
      if (valid(index)) anchor = index;
    },
    clear,
    isActive: () => start !== undefined && end !== undefined,
    get anchorIndex() {
      return anchor;
    },
    get startIndex() {
      return start;
    },
    get endIndex() {
      return end;
    },
    indices() {
      if (start === undefined || end === undefined) return [];
      const result: number[] = [];
      for (let index = start; index <= end; index += 1) result.push(index);
      return result;
    },
    range() {
      if (start === undefined || end === undefined) return undefined;
      const first = blocks[start];
      const last = blocks[end];
      if (!first || !last) return undefined;
      return { line: first.line, endLine: last.endLine ?? last.line };
    },
  };
}
