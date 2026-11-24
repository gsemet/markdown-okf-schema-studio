/**
 * The seam between the resolution of a copied selection's two edges (rawCopy.ts) and the Markdown
 * that is copied: `balanceRawCut` turns the two resolved edges into text. This module holds no
 * DOM and no host API.
 */

/** One mapped element enclosing an edge, outermost first. */
export interface RawCopyFrame {
  /** 1-based first source line (`data-sphinx-source-line`). */
  line: number;
  /** 1-based last source line (`data-sphinx-source-end-line`, else `line`). */
  endLine: number;
  /** Generated content or an included block: copied whole. */
  atomic: boolean;
}

/** An enclosing element with the source offsets of its lines. */
export interface ResolvedRawFrame extends RawCopyFrame {
  /** Source offset of the frame's first line. */
  start: number;
  /** Source offset of the end of the frame's last line (before its line break). */
  end: number;
}

/** An edge of the selection resolved against the source. */
export type ResolvedRawEdge =
  | { kind: "placed"; offset: number; frames: readonly ResolvedRawFrame[] }
  | { kind: "unplaced"; frames: readonly ResolvedRawFrame[] };

/** The two resolved edges of a selection and the text they cut. */
export interface RawCut {
  source: string;
  /** The document's line break (the first one found, else "\n"). */
  lineBreak: "\n" | "\r\n";
  start: ResolvedRawEdge;
  end: ResolvedRawEdge;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-273
/**
 * The Markdown copied for a resolved cut; `undefined` leaves the copy native: an edge that could not
 * be placed, or a start after the end. For now the cut is verbatim, from the character under the
 * start edge to the character under the end edge, with nothing added: the edges are balanced by
 * copy-raw-edge-balancing, which replaces this body and keeps the signature.
 */
export function balanceRawCut(cut: RawCut): string | undefined {
  const { start, end } = cut;
  if (start.kind !== "placed" || end.kind !== "placed") return undefined;
  if (start.offset > end.offset) return undefined;
  return cut.source.slice(start.offset, end.offset);
}
