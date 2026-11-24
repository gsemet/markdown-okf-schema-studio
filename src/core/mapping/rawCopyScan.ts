/**
 * The line scan of a Markdown source for the edge balancing of a raw copy: the block constructs
 * that can enclose an edge (fenced containers and code blocks with their option lines and closing
 * fence, blockquotes and alerts, list items, footnote definitions, tables, headings, definitions,
 * HTML blocks), each with its line range and, per line, the prefix every enclosing container puts
 * before the text. Pure module: no DOM and no host API.
 */

import { listItemIndentOfLine, startsWithListMarker } from "./listMarker";

export type RawNodeKind =
  | "quote" | "alert" | "item" | "footnote" | "fence" | "code" | "icode" | "html" | "table" | "atx" | "setext" | "def";

/** The marker lines of a run of sibling list items: the lines the list spans. */
export interface ItemRun {
  firstLine: number;
  lastLine: number;
}

export interface RawNode {
  id: number;
  kind: RawNodeKind;
  parent: RawNode | undefined;
  depth: number;
  /** 0-based first and last line (blank lines at the end are not counted). */
  firstLine: number;
  lastLine: number;
  /** Source offset of the first line's start and of the last line's end. */
  start: number;
  end: number;
  /** Lines of the opening, from `firstLine`: a fence line and its option lines, an alert's title line, an HTML opening line. */
  openLines: number;
  /** The line of the closing fence, when the construct has one. */
  closeLine?: number;
  /** The closing tag of an HTML block. */
  closeTag?: string;
  /** Columns a continuation line is indented (item, footnote) or the fence's own indentation (code). */
  indent: number;
  fenceChar: string;
  fenceLength: number;
  run?: ItemRun;
  /** A definition: the line of its term. A setext heading: the underline line. */
  termLine?: number;
  underline?: number;
  /** Option lines may still follow the fence line. */
  options: boolean;
  yaml: boolean;
  /** A raw directive (`{code-block}`): its body is code. */
  raw: boolean;
}

/** What one container takes at the start of a line: the characters `[from, to)`. */
export interface Segment {
  node: RawNode;
  from: number;
  to: number;
}

export type LineKind = "blank" | "para" | "fence" | "code" | "atx" | "table" | "rule" | "html" | "underline";

export interface LineInfo {
  start: number;
  end: number;
  next: number;
  chain: Segment[];
  kind: LineKind;
  /** The inline text of the line, `[textFrom, textTo)` of the line. */
  textFrom: number;
  textTo: number;
  /** The paragraph the line belongs to (lines of one paragraph share it), else -1. */
  para: number;
}

export interface RawScan {
  source: string;
  lines: LineInfo[];
  nodes: RawNode[];
}

/** Directives whose body is raw text, not Markdown. */
const RAW_DIRECTIVES = new Set([
  "code-block", "code", "sourcecode", "code-cell", "literalinclude", "math", "mermaid", "plantuml", "graphviz", "vega",
  "vega-lite", "eval-rst", "raw", "csv-table",
]);
const HTML_BLOCK_TAGS = new Set([
  "div", "details", "summary", "section", "aside", "article", "figure", "figcaption", "table", "ul", "ol", "dl", "blockquote",
  "center", "nav", "header", "footer", "main", "form", "fieldset", "pre", "p", "style", "script",
]);
const ALERT = /^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/iu;
const FENCE = /^(`{3,}|~{3,}|:{3,})(.*)$/u;
const FENCE_CLOSE = /^(`{3,}|~{3,}|:{3,})[ \t]*$/u;
const OPTION_LINE = /^:[A-Za-z][\w-]*:(?:[ \t]|$)/u;
const THEMATIC = /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/u;
const DELIMITER_ROW = /^\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/u;
const FOOTNOTE = /^\[\^[^\]\s]+\]:(?:[ \t]+|$)/u;
const ATX = /^(#{1,6})(?:[ \t]+|$)/u;

const isBlank = (text: string): boolean => /^[ \t]*$/u.test(text);

/** Columns of leading spaces and tabs (a tab runs to the next stop of 4) and their characters. */
function leading(text: string): { columns: number; length: number } {
  let columns = 0;
  let length = 0;
  while (length < text.length && (text[length] === " " || text[length] === "\t")) {
    columns = text[length] === "\t" ? columns + 4 - (columns % 4) : columns + 1;
    length += 1;
  }
  return { columns, length };
}

/** The characters taken by at most `columns` columns of leading whitespace. */
function takeColumns(text: string, columns: number): number {
  let used = 0;
  let length = 0;
  while (length < text.length && used < columns && (text[length] === " " || text[length] === "\t")) {
    used = text[length] === "\t" ? used + 4 - (used % 4) : used + 1;
    length += 1;
  }
  return length;
}

/** The cells of a table row line read from `from`: `[start, end)` of each cell text, as indexes of the line text. */
export function tableCells(text: string, from: number): Array<[number, number]> {
  let start = from;
  while (text[start] === " " || text[start] === "	") start += 1;
  if (text[start] === "|") start += 1;
  let stop = text.length;
  while (stop > start && (text[stop - 1] === " " || text[stop - 1] === "	")) stop -= 1;
  if (stop > start && text[stop - 1] === "|" && text[stop - 2] !== "\\") stop -= 1;
  const cells: Array<[number, number]> = [];
  let cellStart = start;
  let ticks = 0;
  for (let index = start; index < stop; index += 1) {
    const character = text[index];
    if (character === "\\") index += 1;
    else if (character === "`") {
      let end = index;
      while (text[end] === "`") end += 1;
      if (ticks === 0) ticks = end - index;
      else if (ticks === end - index) ticks = 0;
      index = end - 1;
    } else if (character === "|" && ticks === 0) {
      cells.push([cellStart, index]);
      cellStart = index + 1;
    }
  }
  cells.push([cellStart, stop]);
  return cells;
}

/** The line index containing `offset`: the last line starting at or before it. */
export function lineOf(scan: RawScan, offset: number): number {
  let low = 0;
  let high = scan.lines.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (scan.lines[middle]!.start <= offset) low = middle;
    else high = middle - 1;
  }
  return low;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-280
/** The constructs that enclose `offset` (after the first character of the construct, before the end of its last line), outermost first. */
export function enclosingNodes(scan: RawScan, offset: number): RawNode[] {
  return scan.nodes.filter((node) => node.start < offset && offset < node.end).sort((first, second) => first.depth - second.depth || first.id - second.id);
}

/** The last line of the HTML block opened on `first`: the line of the matching closing tag, else the line before the next blank one. */
function htmlBlockEnd(lines: readonly string[], first: number, tag: string): { line: number; closed: boolean } {
  const tags = new RegExp(`<(/?)${tag}(?:[\\s>/]|$)`, "giu");
  let depth = 0;
  for (let index = first; index < lines.length; index += 1) {
    tags.lastIndex = 0;
    for (let found = tags.exec(lines[index]!); found; found = tags.exec(lines[index]!)) depth += found[1] === "/" ? -1 : 1;
    if (depth <= 0) return { line: index, closed: true };
    if (isBlank(lines[index + 1] ?? "")) return { line: index, closed: false };
  }
  return { line: lines.length - 1, closed: false };
}

export function scanSource(source: string): RawScan {
  const lines: LineInfo[] = [];
  const texts: string[] = [];
  for (let offset = 0; ;) {
    const found = /\r\n|\n|\r/u.exec(source.slice(offset));
    const end = found ? offset + found.index : source.length;
    const next = found ? end + found[0].length : source.length;
    lines.push({ start: offset, end, next, chain: [], kind: "blank", textFrom: 0, textTo: 0, para: -1 });
    texts.push(source.slice(offset, end));
    if (!found) break;
    offset = next;
  }
  const scan: RawScan = { source, lines, nodes: [] };
  const stack: RawNode[] = [];
  const runs = new Map<RawNode | undefined, ItemRun>();
  let para: { id: number; first: number; depth: number } | undefined;
  let paraCount = 0;
  let leaf: RawNode | undefined;
  let lastNonBlank = -1;

  const create = (kind: RawNodeKind, line: number, init: Partial<RawNode> = {}): RawNode => {
    const parent = stack[stack.length - 1];
    const node: RawNode = {
      id: scan.nodes.length, kind, parent, depth: (parent?.depth ?? -1) + 1, firstLine: line, lastLine: line,
      start: 0, end: 0, openLines: 0, indent: 0, fenceChar: "", fenceLength: 0, options: false, yaml: false, raw: false, ...init,
    };
    scan.nodes.push(node);
    return node;
  };
  const startsBlock = (text: string): boolean => {
    const body = text.slice(leading(text).length);
    return body.startsWith(">") || FENCE.test(body) || ATX.test(body) || THEMATIC.test(body) || startsWithListMarker(body);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const info = lines[index]!;
    const text = texts[index]!;
    const chain = info.chain;
    let position = 0;
    let matched = 0;
    for (const node of stack) {
      const rest = text.slice(position);
      let to: number | undefined;
      if (node.kind === "quote" || node.kind === "alert") {
        const lead = leading(rest);
        if (lead.columns < 4 && rest[lead.length] === ">") {
          const after = lead.length + 1;
          to = position + after + (rest[after] === " " || rest[after] === "\t" ? 1 : 0);
        }
      } else if (node.kind === "item" || node.kind === "footnote") {
        if (isBlank(rest)) to = text.length;
        else if (leading(rest).columns >= node.indent) to = position + takeColumns(rest, node.indent);
      } else if (node.kind === "code") to = position + Math.min(node.indent, leading(rest).length);
      else if (node.kind === "icode") {
        if (isBlank(rest)) to = position + Math.min(rest.length, takeColumns(rest, 4));
        else if (leading(rest).columns >= 4) to = position + takeColumns(rest, 4);
      } else to = position;
      if (to === undefined) break;
      chain.push({ node, from: position, to });
      position = to;
      matched += 1;
    }
    if (matched < stack.length) {
      const rest = text.slice(position);
      if (para && para.depth === stack.length && !isBlank(rest) && !startsBlock(rest)) {
        info.kind = "para";
        info.para = para.id;
        info.textFrom = position;
        info.textTo = text.length;
        for (const node of stack) node.lastLine = index;
        lastNonBlank = index;
        continue;
      }
      stack.length = matched;
      para = undefined;
      leaf = undefined;
    }
    const finish = (): void => {
      if (info.kind === "blank") return;
      lastNonBlank = index;
      for (const node of stack) {
        node.lastLine = index;
        if (node.run) node.run.lastLine = index;
      }
    };
    const tip = stack[stack.length - 1];
    const prior = tip && chain.length > 0 ? chain[chain.length - 1]!.from : 0;
    if (tip && (tip.kind === "code" || tip.kind === "html")) {
      const body = text.slice(prior);
      const lead = leading(body);
      const close = tip.kind === "code" ? FENCE_CLOSE.exec(body.slice(lead.length)) : undefined;
      if (close && lead.columns < 4 && close[1]![0] === tip.fenceChar && close[1]!.length >= tip.fenceLength) {
        tip.closeLine = index;
        info.kind = "fence";
        chain[chain.length - 1] = { node: tip, from: prior, to: prior };
        finish();
        stack.pop();
        continue;
      }
      if (tip.kind === "code" && tip.options && OPTION_LINE.test(body.slice(lead.length))) {
        tip.openLines += 1;
        info.kind = "fence";
      } else {
        tip.options = false;
        info.kind = tip.kind === "code" ? "code" : "html";
      }
      info.textFrom = position;
      info.textTo = text.length;
      finish();
      if (tip.kind === "html" && tip.closeLine === index) stack.pop();
      continue;
    }
    // Block starts on the rest of the line, until a leaf or a paragraph ends it.
    for (;;) {
      const rest = text.slice(position);
      const lead = leading(rest);
      const body = rest.slice(lead.length);
      const bodyPosition = position + lead.length;
      const paraOpen = para !== undefined && para.depth === stack.length;
      const top = stack[stack.length - 1];
      info.textFrom = position;
      info.textTo = text.length;
      if (isBlank(rest)) {
        info.kind = "blank";
        para = undefined;
        leaf = undefined;
        if (top) top.options = false;
        break;
      }
      if (top && top.kind === "fence") {
        const close = FENCE_CLOSE.exec(body);
        if (lead.columns < 4 && close && close[1]![0] === top.fenceChar && close[1]!.length >= top.fenceLength) {
          top.closeLine = index;
          info.kind = "fence";
          chain[chain.length - 1] = { node: top, from: position, to: position };
          finish();
          stack.pop();
          para = undefined;
          leaf = undefined;
          break;
        }
        if (top.yaml || (top.options && (OPTION_LINE.test(body) || body.trim() === "---"))) {
          top.openLines += 1;
          top.yaml = top.yaml ? body.trim() !== "---" : body.trim() === "---";
          info.kind = "fence";
          break;
        }
        top.options = false;
      }
      if (leaf && leaf.kind === "table" && leaf.parent === top && !startsBlock(rest) && lead.columns < 4) {
        leaf.lastLine = index;
        info.kind = "table";
        break;
      }
      if (lead.columns >= 4) {
        if (paraOpen) {
          info.kind = "para";
          info.para = para!.id;
          if (leaf?.kind === "def") leaf.lastLine = index;
        } else {
          const node = create("icode", index);
          stack.push(node);
          chain.push({ node, from: position, to: position + takeColumns(rest, 4) });
          info.kind = "code";
        }
        break;
      }
      if (body[0] === ">") {
        const after = body[1] === " " || body[1] === "\t" ? 2 : 1;
        const isFirstLineAlert = ALERT.test(body.slice(after));
        const node = create(isFirstLineAlert ? "alert" : "quote", index, { openLines: isFirstLineAlert ? 1 : 0 });
        stack.push(node);
        chain.push({ node, from: position, to: bodyPosition + after });
        position = bodyPosition + after;
        para = undefined;
        leaf = undefined;
        continue;
      }
      const fence = FENCE.exec(body);
      if (fence && !(fence[1]![0] === "`" && fence[2]!.includes("`"))) {
        const directive = /^\{([^}\s]+)\}/u.exec(fence[2]!.trim());
        const container = fence[1]![0] === ":" || (directive !== undefined && directive !== null && !RAW_DIRECTIVES.has(directive[1]!));
        const node = create(container ? "fence" : "code", index, {
          openLines: 1, fenceChar: fence[1]![0]!, fenceLength: fence[1]!.length, indent: lead.columns,
          options: directive !== null, raw: !container && directive !== null,
        });
        stack.push(node);
        chain.push({ node, from: position, to: position });
        info.kind = "fence";
        para = undefined;
        leaf = undefined;
        break;
      }
      if (paraOpen && /^(=+|-+)[ \t]*$/u.test(body)) {
        create("setext", para!.first, { lastLine: index, underline: index });
        info.kind = "underline";
        para = undefined;
        break;
      }
      if (paraOpen && body.includes("|") && DELIMITER_ROW.test(body) && /\|/u.test(texts[index - 1]!) && lines[index - 1]!.kind === "para"
        && tableCells(texts[index - 1]!, lines[index - 1]!.textFrom).length === tableCells(text, position).length) {
        const node = create("table", index - 1, { lastLine: index });
        lines[index - 1]!.kind = "table";
        info.kind = "table";
        leaf = node;
        para = undefined;
        break;
      }
      if (THEMATIC.test(body)) {
        info.kind = "rule";
        para = undefined;
        leaf = undefined;
        break;
      }
      if (startsWithListMarker(body)) {
        const marker = /^(?:[-+*]|[0-9]{1,9}[.)])/u.exec(body)![0];
        const spaces = /^[ \t]*/u.exec(body.slice(marker.length))![0];
        const after = body.slice(marker.length + spaces.length);
        const indent = listItemIndentOfLine(body.slice(0, marker.length + spaces.length) + (after === "" ? "" : "x"))!;
        const interrupts = !paraOpen || (after !== "" && (marker.length === 1 || marker.startsWith("1")));
        if (interrupts) {
          const contentLength = after === "" || spaces.length > 4 ? marker.length + 1 : marker.length + spaces.length;
          const parent = stack[stack.length - 1];
          let run = runs.get(parent);
          if (!run || lastNonBlank !== run.lastLine) {
            run = { firstLine: index, lastLine: index };
            runs.set(parent, run);
          }
          const node = create("item", index, { indent: lead.columns + indent.content.length, run });
          stack.push(node);
          chain.push({ node, from: position, to: bodyPosition + Math.min(contentLength, body.length) });
          position = bodyPosition + Math.min(contentLength, body.length);
          para = undefined;
          leaf = undefined;
          continue;
        }
      }
      const atx = ATX.exec(body);
      if (atx) {
        create("atx", index);
        info.kind = "atx";
        info.textFrom = bodyPosition + atx[0].length;
        info.textTo = text.length - (/(?:[ \t]+#+|^#+)[ \t]*$/u.exec(text.slice(info.textFrom))?.[0].length ?? 0);
        para = undefined;
        leaf = undefined;
        break;
      }
      if (paraOpen && /^:[ \t]/u.test(body)) {
        const spaces = /^:[ \t]*/u.exec(body)![0].length;
        const term = leaf?.kind === "def" ? leaf.termLine! : index - 1;
        leaf = create("def", index, { termLine: term });
        info.kind = "para";
        info.textFrom = bodyPosition + spaces;
        para = { id: paraCount += 1, first: index, depth: stack.length };
        info.para = para.id;
        break;
      }
      const footnote = FOOTNOTE.exec(body);
      if (footnote) {
        const node = create("footnote", index, { indent: 4 });
        stack.push(node);
        chain.push({ node, from: position, to: bodyPosition + footnote[0].length });
        position = bodyPosition + footnote[0].length;
        para = undefined;
        leaf = undefined;
        continue;
      }
      const html = /^<([A-Za-z][A-Za-z0-9-]*)(?=[\s/>]|$)/u.exec(body);
      if (html && HTML_BLOCK_TAGS.has(html[1]!.toLowerCase())) {
        const tag = html[1]!.toLowerCase();
        const end = htmlBlockEnd(texts, index, tag);
        const node = create("html", index, { openLines: 1, closeLine: end.line, closeTag: end.closed ? `</${tag}>` : undefined });
        stack.push(node);
        chain.push({ node, from: position, to: position });
        info.kind = "html";
        para = undefined;
        leaf = undefined;
        if (end.line === index) {
          finish();
          stack.pop();
        }
        break;
      }
      info.kind = "para";
      info.textFrom = bodyPosition;
      if (!paraOpen) para = { id: paraCount += 1, first: index, depth: stack.length };
      info.para = para!.id;
      if (leaf?.kind === "def") leaf.lastLine = index;
      else leaf = undefined;
      break;
    }
    finish();
  }
  for (const node of scan.nodes) {
    node.start = lines[node.firstLine]!.start;
    node.end = lines[node.closeLine ?? node.lastLine]!.end;
  }
  return scan;
}
