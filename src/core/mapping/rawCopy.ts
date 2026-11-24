/**
 * The raw Markdown of a selection of the rendered page: each edge of the selection is resolved to
 * a character of the source, then the two resolved edges are cut by `balanceRawCut`. Pure module:
 * the page reads its DOM into two {@link RawCopyEdge}; no DOM and no host API here.
 */

import {
  alignRendered,
  buildLineTable,
  renderedCharacters,
  type LineTable,
} from "./rawCopyAlignment";
import {
  balanceRawCut,
  type RawCopyFrame,
  type ResolvedRawEdge,
  type ResolvedRawFrame,
} from "./rawCopyEdges";

/** One edge of a selection, as the page reads it. */
export interface RawCopyEdge {
  /** The mapped elements enclosing the edge, outermost first; empty when the edge is clamped or lies in no mapped element. */
  frames: readonly RawCopyFrame[];
  /** The edge lies before the first (start) or after the last (end) mapped element of the page: the whole document's side. */
  clamp?: "start" | "end";
  /** The edge lies in the title of the innermost frame (written or default): the frame's opening line. */
  opening?: boolean;
  /** The rendered text of the innermost non-atomic frame, chrome and titles left out, an inline construct copied whole as one placeholder. */
  text: string;
  /** The edge lies at the very start (start) or very end (end) of the mapped content, only chrome and whitespace beyond it. */
  extreme?: boolean;
  /** The edge's offset in `text`. */
  offset: number;
}

type Side = "start" | "end";

/** The line that closes the fence opened on `line`, or `line` itself when it opens none. */
function fenceEndLine(source: string, table: LineTable, line: number): number {
  const lineAt = (number: number): string => source.slice(table.starts[number - 1], table.ends[number - 1]);
  const open = /^[ \t]*(`{3,}|~{3,}|:{3,})/u.exec(lineAt(line))?.[1];
  if (open === undefined) return line;
  for (let number = line + 1; number <= table.starts.length; number += 1) {
    const close = /^[ \t]*(`{3,}|~{3,}|:{3,})[ \t]*$/u.exec(lineAt(number))?.[1];
    if (close !== undefined && close[0] === open[0] && close.length >= open.length) return number;
  }
  return line;
}

function resolveFrames(source: string, frames: readonly RawCopyFrame[], table: LineTable): ResolvedRawFrame[] | undefined {
  const resolved: ResolvedRawFrame[] = [];
  for (const frame of frames) {
    const written = Math.max(frame.line, frame.endLine);
    // A generated block maps its first line only (a diagram, a figure): its fence closes where the source says.
    const endLine = frame.atomic && frame.line >= 1 && frame.line <= table.starts.length
      ? Math.max(written, fenceEndLine(source, table, frame.line))
      : written;
    if (!Number.isSafeInteger(frame.line) || !Number.isSafeInteger(endLine) || frame.line < 1 || endLine > table.starts.length) {
      return undefined;
    }
    resolved.push({ ...frame, endLine, start: table.starts[frame.line - 1]!, end: table.ends[endLine - 1]! });
  }
  return resolved;
}

/** Where an edge lies in the source: a clamp, a whole atomic frame, the opening line, or the aligned character. */
function resolveEdge(source: string, table: LineTable, edge: RawCopyEdge, side: Side): ResolvedRawEdge {
  if (edge.clamp !== undefined) {
    return { kind: "placed", offset: edge.clamp === "start" ? 0 : source.length, frames: [] };
  }
  const frames = resolveFrames(source, edge.frames, table);
  if (!frames || frames.length === 0) return { kind: "unplaced", frames: frames ?? [] };
  const atomic = frames.find((frame) => frame.atomic);
  if (atomic) return { kind: "placed", offset: side === "start" ? atomic.start : atomic.end, frames };
  const innermost = frames[frames.length - 1]!;
  if (edge.opening) {
    const first = table.ends[innermost.line - 1]!;
    return { kind: "placed", offset: side === "start" ? innermost.start : first, frames };
  }
  const rendered = renderedCharacters(edge.text);
  const before = renderedCharacters(edge.text.slice(0, Math.max(0, edge.offset))).length;
  const spans = rendered.length === 0 ? undefined : alignRendered(source, table, innermost.line, innermost.endLine, rendered);
  if (!spans || before > spans.length) return { kind: "unplaced", frames };
  // The start edge sits on the character after it, the end edge just after the character before it.
  const offset = side === "start"
    ? (before < spans.length ? spans[before]!.start : spans[spans.length - 1]!.end)
    : (before === 0 ? spans[0]!.start : spans[before - 1]!.end);
  return { kind: "placed", offset, frames };
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-273
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-274
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-275
/**
 * The raw Markdown under a selection: the source between the character under `start` and the
 * character under `end`. An edge in generated content or an included block moves to the whole
 * construct, a clamped edge to the start or the end of the document. `undefined` when an edge cannot
 * be placed (the copy stays native).
 */
export function rawMarkdownForSelection(source: string, start: RawCopyEdge, end: RawCopyEdge): string | undefined {
  // Both edges at the content's own sides (a real Select all ends in the first and last text, not the container): the whole source.
  const whole = (start.extreme === true || start.clamp === "start") && (end.extreme === true || end.clamp === "end");
  const table = buildLineTable(source);
  const firstBreak = /\r\n|\n|\r/u.exec(source)?.[0];
  return balanceRawCut({
    source,
    lineBreak: firstBreak === "\r\n" ? "\r\n" : "\n",
    start: resolveEdge(source, table, whole ? { ...start, clamp: "start" } : start, "start"),
    end: resolveEdge(source, table, whole ? { ...end, clamp: "end" } : end, "end"),
  });
}
