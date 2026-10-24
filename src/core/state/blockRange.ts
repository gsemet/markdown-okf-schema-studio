/**
 * Range tracking of the open inline block edit (STAB-06, pure, no VS Code API).
 *
 * While the page edits a block, the document can change elsewhere (the text editor, another
 * extension). The host keeps the block's source offset in step with those changes instead of
 * dropping the edit; a change that touches the block itself is a conflict the reader is told about.
 */

/** One change of a `TextDocumentChangeEvent`; offsets refer to the text before the event. */
export interface BlockRangeChange {
  rangeOffset: number;
  rangeLength: number;
  text: string;
}

/**
 * The block's new start offset after `changes`, or `"conflict"` when a change overlaps the block.
 * A change that ends at or before the block's start (an insertion at its start included) shifts
 * it; a change that starts at or after its end leaves it in place.
 */
export function rebaseBlockRange(
  block: { start: number; length: number },
  changes: readonly BlockRangeChange[],
): { start: number } | "conflict" {
  const end = block.start + block.length;
  let shift = 0;
  for (const change of changes) {
    const changeEnd = change.rangeOffset + change.rangeLength;
    if (changeEnd <= block.start) {
      shift += change.text.length - change.rangeLength;
    } else if (change.rangeOffset < end) {
      return "conflict";
    }
  }
  return { start: block.start + shift };
}
