/**
 * The edge balancing of a raw copy (setting `preview.rawCopy.balanceEdges` on): given the two
 * source offsets of a cut, it finds the constructs that enclose each edge and builds the copy:
 * the constructs enclosing both edges are inside only (their line prefix is removed), those
 * enclosing one edge get the delimiters they are missing on that side. Pure module: no DOM and no
 * host API.
 */

import { parseInline, spansEnclosing } from "./rawCopyInline";
import {
  enclosingNodes,
  lineOf,
  scanSource,
  tableCells,
  type ItemRun,
  type RawNode,
  type RawScan,
} from "./rawCopyScan";

/** One line of the copy, read from a source line. */
interface Spec {
  line: number;
  /** The container prefix is read from the characters `[segLo, segHi)` of the line. */
  segLo: number;
  segHi: number;
  /** The text after the prefix is the characters `[textLo, textHi)` of the line; `literal` replaces it. */
  textLo: number;
  textHi: number;
  literal?: string;
  /** Inserted between the prefix and the text. */
  extra: string;
  /** Appended after the text. */
  tail: string;
  /** What follows the line in the copy. */
  separator: string;
}

interface Rendered {
  prefix: string;
  text: string;
  base: number;
  markers: Array<{ node: RawNode; index: number }>;
}

/** An inline construct enclosing an edge, with the source text of its delimiters. */
interface InlineHit {
  key: string;
  open: string;
  close: string;
}

interface Region {
  key: string;
  text: string;
  /** The source offset of each character of `text`, and of its end. */
  map: number[];
}

const topRunOf = (node: RawNode): ItemRun | undefined => {
  let run: ItemRun | undefined;
  for (let current: RawNode | undefined = node; current; current = current.parent) if (current.kind === "item") run = current.run;
  return run;
};

const leadingBlanks = (text: string): number => /^[ \t]*/u.exec(text)![0].length;

/** The inline text around `offset`: a table cell, a heading's text, or the lines of one paragraph. */
function regionAt(scan: RawScan, offset: number): Region | undefined {
  const { source, lines } = scan;
  const index = lineOf(scan, offset);
  const info = lines[index]!;
  const relative = offset - info.start;
  if (info.kind === "table") {
    const cells = tableCells(source.slice(info.start, info.end), info.textFrom);
    const cell = cells.findIndex(([from, to]) => from <= relative && relative <= to);
    if (cell < 0) return undefined;
    const [from, to] = cells[cell]!;
    return { key: `${index}:${cell}`, text: source.slice(info.start + from, info.start + to), map: Array.from({ length: to - from + 1 }, (_, at) => info.start + from + at) };
  }
  if (info.kind === "atx") {
    if (relative < info.textFrom || relative > info.textTo) return undefined;
    return { key: `${index}`, text: source.slice(info.start + info.textFrom, info.start + info.textTo), map: Array.from({ length: info.textTo - info.textFrom + 1 }, (_, at) => info.start + info.textFrom + at) };
  }
  if (info.kind !== "para") return undefined;
  let first = index;
  let last = index;
  while (first > 0 && lines[first - 1]!.kind === "para" && lines[first - 1]!.para === info.para) first -= 1;
  while (last + 1 < lines.length && lines[last + 1]!.kind === "para" && lines[last + 1]!.para === info.para) last += 1;
  let text = "";
  const map: number[] = [];
  for (let current = first; current <= last; current += 1) {
    const line = lines[current]!;
    if (current > first) {
      map.push(lines[current - 1]!.end);
      text += "\n";
    }
    for (let at = line.textFrom; at < line.textTo; at += 1) map.push(line.start + at);
    text += source.slice(line.start + line.textFrom, line.start + line.textTo);
  }
  map.push(lines[last]!.start + lines[last]!.textTo);
  return { key: `${first}`, text, map };
}

/** The inline constructs enclosing `offset` in its region, outermost first. */
function inlineHits(scan: RawScan, offset: number, lineBreak: string): InlineHit[] {
  const region = regionAt(scan, offset);
  if (!region) return [];
  let index = region.map.findIndex((position) => position >= offset);
  if (index < 0) index = region.map.length - 1;
  return spansEnclosing(parseInline(region.text), index).map((span) => ({
    key: `${region.key}#${span.openStart}`,
    open: region.text.slice(span.openStart, span.openEnd).replace(/\n/gu, lineBreak),
    close: region.text.slice(span.closeStart, span.closeEnd).replace(/\n/gu, lineBreak),
  }));
}

/** The table that holds `offset` and the cell it is in, when it is in a row. */
function tableCellAt(scan: RawScan, offset: number): { table: RawNode; line: number; cell: number } | undefined {
  const table = enclosingNodes(scan, offset).find((node) => node.kind === "table");
  if (!table) return undefined;
  const line = lineOf(scan, offset);
  const info = scan.lines[line]!;
  const cells = tableCells(scan.source.slice(info.start, info.end), info.textFrom);
  return { table, line, cell: cells.findIndex(([from, to]) => from <= offset - info.start && offset - info.start <= to) };
}

/**
 * The table rule: both edges in one cell are inside only; otherwise an edge in a row moves to the
 * row's start (start edge) or end (end edge), and a start in a body row asks for the header rows.
 */
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-282
function applyTableRule(scan: RawScan, start: number, end: number): { start: number; end: number; header: RawNode | undefined } {
  const first = tableCellAt(scan, start);
  const last = tableCellAt(scan, end);
  if (first && last && first.table === last.table && first.line === last.line && first.cell >= 0 && first.cell === last.cell) {
    return { start, end, header: undefined };
  }
  let header: RawNode | undefined;
  if (first) {
    const row = first.line - first.table.firstLine;
    start = scan.lines[row <= 1 ? first.table.firstLine : first.line]!.start;
    if (row > 1) header = first.table;
  }
  if (last) {
    const row = last.line - last.table.firstLine;
    end = scan.lines[row <= 1 ? last.table.firstLine + 1 : last.line]!.end;
  }
  return { start, end, header };
}

function render(scan: RawScan, spec: Spec, removed: ReadonlySet<RawNode>, topRun: ItemRun | undefined, overrides: ReadonlyMap<RawNode, string>): Rendered {
  const info = scan.lines[spec.line]!;
  const line = scan.source.slice(info.start, info.end);
  let prefix = "";
  let base = -1;
  const markers: Rendered["markers"] = [];
  for (const segment of info.chain) {
    if (topRun && base < 0 && segment.node.kind === "item" && topRunOf(segment.node) === topRun) base = prefix.length;
    if (removed.has(segment.node)) continue;
    const replacement = overrides.get(segment.node);
    const piece = replacement ?? line.slice(Math.max(segment.from, spec.segLo), Math.max(segment.from, Math.min(segment.to, spec.segHi)));
    if (segment.node.kind === "item" && (segment.node.firstLine === spec.line || replacement !== undefined)) {
      markers.push({ node: segment.node, index: prefix.length + leadingBlanks(piece) });
    }
    prefix += piece;
  }
  return { prefix, text: spec.literal ?? line.slice(spec.textLo, Math.max(spec.textLo, spec.textHi)), base, markers };
}

const prefixEnd = (scan: RawScan, line: number): number => {
  const chain = scan.lines[line]!.chain;
  return chain.length === 0 ? 0 : chain[chain.length - 1]!.to;
};

/** A whole source line as a line of the copy. */
function wholeLine(scan: RawScan, line: number, separator: string): Spec {
  const info = scan.lines[line]!;
  return { line, segLo: 0, segHi: Infinity, textLo: prefixEnd(scan, line), textHi: info.end - info.start, extra: "", tail: "", separator };
}

const hasClosing = (node: RawNode): boolean => node.closeLine !== undefined && (node.kind === "fence" || node.kind === "code");

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-280
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-281
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-283
/**
 * The balanced copy of the source between the offsets `start` and `end` (`start <= end`): the
 * source's own text from edge to edge, the prefix of the containers around both edges removed, the
 * opening lines of the constructs only the start edge is in, the closing lines of those only the
 * end edge is in. Every added line break is `lineBreak`.
 */
export function balanceEdges(source: string, lineBreak: string, startOffset: number, endOffset: number): string {
  const scan = scanSource(source);
  const { start, end, header } = applyTableRule(scan, startOffset, endOffset);
  const enclosingStart = enclosingNodes(scan, start);
  const enclosingEnd = enclosingNodes(scan, end);
  const both = new Set(enclosingStart.filter((node) => enclosingEnd.includes(node)));
  const crossedStart = enclosingStart.filter((node) => !both.has(node));
  const crossedEnd = enclosingEnd.filter((node) => !both.has(node));
  const startLine = lineOf(scan, start);
  const endLine = lineOf(scan, end);
  const startInfo = scan.lines[startLine]!;

  const openings: Spec[] = [];
  let sameLine = "";
  const startItem = [...crossedStart].reverse().find((node) => node.kind === "item");
  const startFootnote = [...crossedStart].reverse().find((node) => node.kind === "footnote");
  for (const node of crossedStart) {
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-284
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-285
    if ((node.kind === "fence" || node.kind === "code" || node.kind === "alert" || node.kind === "html") && startLine >= node.firstLine + node.openLines) {
      for (let line = node.firstLine; line < node.firstLine + node.openLines; line += 1) openings.push(wholeLine(scan, line, lineBreak));
    } else if (node.kind === "atx" && start - startInfo.start >= startInfo.textFrom) {
      sameLine += source.slice(startInfo.start + prefixEnd(scan, startLine), startInfo.start + startInfo.textFrom);
    } else if (node.kind === "def") {
      openings.push(wholeLine(scan, node.termLine!, lineBreak));
      const marker = scan.lines[node.firstLine]!;
      sameLine += source.slice(marker.start + prefixEnd(scan, node.firstLine), marker.start + marker.textFrom);
    }
  }
  if (header) for (const line of [header.firstLine, header.firstLine + 1]) openings.push(wholeLine(scan, line, lineBreak));
  const box = startItem && startItem.firstLine === startLine
    ? /^\[[ xX]\][ \t]/u.exec(source.slice(startInfo.start + prefixEnd(scan, startLine), startInfo.end))
    : null;
  if (box && start >= startInfo.start + prefixEnd(scan, startLine) + box[0].length) sameLine += box[0];

  const closings: Spec[] = [];
  for (const node of [...crossedEnd].reverse()) {
    if (hasClosing(node) && node.closeLine! > endLine) closings.push(wholeLine(scan, node.closeLine!, lineBreak));
    else if (node.kind === "html" && node.closeTag !== undefined && node.closeLine! > endLine) {
      closings.push({ ...wholeLine(scan, node.closeLine!, lineBreak), literal: node.closeTag });
    } else if (node.kind === "setext" && node.underline! > endLine) closings.push(wholeLine(scan, node.underline!, lineBreak));
  }

  const hitsStart = inlineHits(scan, start, lineBreak);
  const hitsEnd = inlineHits(scan, end, lineBreak);
  const sharedKeys = new Set(hitsStart.filter((hit) => hitsEnd.some((other) => other.key === hit.key)).map((hit) => hit.key));
  const inlineOpen = hitsStart.filter((hit) => !sharedKeys.has(hit.key)).map((hit) => hit.open).join("");
  const inlineClose = hitsEnd.filter((hit) => !sharedKeys.has(hit.key)).reverse().map((hit) => hit.close).join("");

  const body: Spec[] = [];
  for (let line = startLine; line <= endLine; line += 1) {
    const info = scan.lines[line]!;
    const lineEnd = info.end - info.start;
    const prefixLength = prefixEnd(scan, line);
    const relativeStart = start - info.start;
    const relativeEnd = end - info.start;
    body.push({
      line,
      segLo: line === startLine && relativeStart < prefixLength ? relativeStart : 0,
      segHi: line === endLine && relativeEnd < prefixLength ? relativeEnd : Infinity,
      textLo: line === startLine ? Math.max(prefixLength, relativeStart) : prefixLength,
      textHi: line === endLine ? relativeEnd : lineEnd,
      extra: line === startLine ? sameLine + inlineOpen : "",
      tail: line === endLine ? inlineClose : "",
      separator: line === endLine ? lineBreak : source.slice(info.end, info.next),
    });
  }
  const specs = [...openings, ...body, ...closings];
  specs[specs.length - 1]!.separator = "";

  // The marker of the start item (or footnote) goes where the first line inside it begins.
  const overrides = new Map<RawNode, string>();
  const first = (node: RawNode | undefined): number =>
    node === undefined ? -1 : specs.findIndex((spec) => scan.lines[spec.line]!.chain.some((segment) => segment.node === node));
  for (const node of [startItem, startFootnote]) {
    const at = first(node);
    if (node && at >= 0 && specs[at]!.line !== node.firstLine) {
      const segment = scan.lines[node.firstLine]!.chain.find((candidate) => candidate.node === node)!;
      overrides.set(node, source.slice(scan.lines[node.firstLine]!.start + segment.from, scan.lines[node.firstLine]!.start + segment.to));
    }
  }

  const topRun = startItem ? topRunOf(startItem) : undefined;
  const rendered = specs.map((spec, at) => {
    const here = new Map([...overrides].filter(([node]) => first(node) === at));
    return render(scan, spec, both, topRun, here);
  });
  if (startItem && topRun) shiftList(scan, specs, rendered, startItem, topRun, startLine, endLine, first(startItem));

  return specs.map((spec, at) => `${rendered[at]!.prefix}${spec.extra}${rendered[at]!.text}${spec.tail}${spec.separator}`).join("");
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-283
/**
 * Brings the copied lines of the start item's top-level list left by the column of its shallowest
 * copied item, and the start item's marker line to column 3 at most.
 */
function shiftList(scan: RawScan, specs: Spec[], rendered: Rendered[], startItem: RawNode, topRun: ItemRun, startLine: number, endLine: number, firstIndex: number): void {
  let shift = Infinity;
  rendered.forEach((line) => {
    for (const marker of line.markers) {
      if (line.base < 0 || topRunOf(marker.node) !== topRun) continue;
      if (marker.node === startItem || (marker.node.firstLine > startLine && marker.node.firstLine <= endLine)) {
        shift = Math.min(shift, marker.index - line.base);
      }
    }
  });
  rendered.forEach((line, at) => {
    const spec = specs[at]!;
    if (line.base < 0 || spec.line < topRun.firstLine || spec.line > topRun.lastLine) return;
    const blanks = leadingBlanks(line.prefix.slice(line.base));
    let remove = Number.isFinite(shift) ? Math.min(shift, blanks) : 0;
    let keep = blanks - remove;
    if (at === firstIndex && keep >= 4) {
      remove = blanks - 3;
      keep = 3;
    }
    line.prefix = line.prefix.slice(0, line.base) + line.prefix.slice(line.base + remove);
  });
}
