import { balanceEdges } from "./rawCopyBalance";

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
  /** The copy balances its edges (`preview.rawCopy.balanceEdges` on); off cuts the source verbatim. */
  balanceEdges: boolean;
}

/** The source offset of an edge: its placed offset, else the whole element that holds it (start of its first line, end of its last). */
function snapEdge(cut: RawCut, edge: ResolvedRawEdge, side: "start" | "end"): number {
  if (edge.kind === "placed") return edge.offset;
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-286
  const frame = [...edge.frames].reverse().find((candidate) => !candidate.atomic);
  if (frame) return side === "start" ? frame.start : frame.end;
  return side === "start" ? 0 : cut.source.length;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-273
/**
 * The Markdown copied for a resolved cut; `undefined` leaves the copy native when the start lies
 * after the end. An edge the alignment could not place is snapped to the element that holds it
 * first (setting off or on). With `preview.rawCopy.balanceEdges` off the copy is the source between
 * the two edges, verbatim; on, it is balanced (rawCopyBalance.ts): a construct holding both edges
 * is copied without its delimiters, one holding a single edge gets the delimiters it is missing.
 */
export function balanceRawCut(cut: RawCut): string | undefined {
  const start = snapEdge(cut, cut.start, "start");
  const end = snapEdge(cut, cut.end, "end");
  if (start > end) return undefined;
  if (!cut.balanceEdges) return cut.source.slice(start, end);
  return balanceEdges(cut.source, cut.lineBreak, start, end);
}
