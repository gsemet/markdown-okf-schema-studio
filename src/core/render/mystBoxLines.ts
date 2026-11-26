/**
 * The source lines of the blocks inside an admonition or a GitHub alert (a box). A block of a box is
 * pointed, edited, erased and moved on its own, so a mapped block there must be the whole source of
 * its element and must hold no fence line of a directive around it.
 */

import { type MystNode, sourcePositionProperties } from "./mystNode";
import { closes } from "./mystUnclosedFences";

/** The nodes whose first and last lines are fences (or tags) around their content. */
const FENCED_NODES = new Set([
  "mystDirective", "mystGrid", "mystGridItem", "mystGridCard", "admonition", "details", "div", "rawDetails",
]);

/** The nodes that come from a directive, so what they build without a position stands for it. */
const DIRECTIVE_NODES = new Set(["mystDirective", "mystGrid", "mystGridItem", "mystGridCard"]);

/** What a directive builds without a position of its own, whose source is the whole directive. */
const WHOLE_DIRECTIVE = new Set(["admonition", "container", "mermaid", "math", "code", "table", "div"]);

/** The fence a line opens, after its quote and list markers. */
const OPENING_FENCE = /^((?:[ \t>]|(?:[-*+]|\d{1,9}[.)])[ \t])*)(:{3,}|`{3,}|~{3,})/u;

/** What may stand before a formula on its first line: the markers of quotes, lists and definitions. */
const BEFORE_FORMULA = /^(?:[ \t>]|(?:[-*+:~]|\d{1,9}[.)])[ \t])*(?=\$\$|\\begin\{)/u;

/** A line with no content of its own: empty, or only quote markers. */
const BLANK = /^[ \t>]*$/u;

/** A line that reads `---`, after any indentation and quote markers. */
const DASH_LINE = /^[ \t>]*---[ \t]*$/u;

const LINE_ATTRIBUTES = ["data-line", "data-end-line", "data-single-line"];

export interface Lines {
  start: number;
  end: number;
}

/** The lines of an enclosing directive; `closed` when its last line is its closing fence. */
interface Fence extends Lines {
  closed: boolean;
}

interface Scope {
  inBox: boolean;
  fences: readonly Fence[];
  /** The lines of the directive whose synthesised content is being visited. */
  owner: MystNode["position"];
  /** The line a node without a position renders at (see `walk`). */
  inherited: number | undefined;
  /** True for a box and for a one-line paragraph directly in it: a line there is written in the body. */
  body: boolean;
}

function classNames(node: MystNode): string[] {
  return (node.class ?? "").split(/\s+/u);
}

/** True for a node that renders as an admonition (a context-tag panel is not one). */
function isBox(node: MystNode): boolean {
  if (node.type === "admonition") return !classNames(node).includes("myst-context-admonition");
  if (node.type === "div") return classNames(node).some((name) => name.startsWith("callout-"));
  return node.type === "details";
}

/**
 * True when `last` closes the fence that `opening` opens: the same character, at least as long, and
 * indented less than four columns past it. An unclosed directive may end on the fence of a block
 * inside it, which is not its own.
 */
function closesOpening(opening: string, last: string): boolean {
  const found = OPENING_FENCE.exec(opening);
  if (!found) return false;
  const [, markers, fence] = found as unknown as [string, string, string];
  return closes(last, fence) && last.indexOf(fence.charAt(0)) - markers.length < 4;
}

function fenceOf(node: MystNode, sourceLines: readonly string[]): Fence | undefined {
  const start = node.position?.start?.line;
  const end = node.position?.end?.line;
  if (!FENCED_NODES.has(node.type) || start === undefined || end === undefined) return undefined;
  // A rewritten GitHub alert ends on its last body line: it has no closing fence.
  const alert = node.children?.some((child) => child.data?.githubAlert === true) === true;
  const tags = node.type === "rawDetails" || classNames(node).includes("myst-context-admonition");
  const fenced = end > start && closesOpening(sourceLines[start - 1] ?? "", sourceLines[end - 1] ?? "");
  return { start, end, closed: !alert && (tags || fenced) };
}

/** The lines `node` renders with: those a pass has written, else those of its position. */
function renderedLines(node: MystNode, inherited: number | undefined): Lines | undefined {
  const properties = node.data?.hProperties as Record<string, unknown> | undefined;
  const written = properties?.["data-line"];
  if (typeof written === "number") {
    const writtenEnd = properties?.["data-end-line"];
    return { start: written, end: typeof writtenEnd === "number" ? writtenEnd : written };
  }
  const start = node.position?.start?.line ?? inherited;
  return start === undefined ? undefined : { start, end: node.position?.end?.line ?? start };
}

/** A comment, else an opening or closing tag: `/`, the name, and the `/` of a self-closed one. */
const HTML_TAG = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-z][\w:-]*)(?:[\s/](?:"[^"]*"|'[^']*'|[^'">])*?)?(\/?)>/giu;

/** The elements that have no closing tag. */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);

interface Tag {
  name: string;
  closing: boolean;
  line: number;
}

/** The tags of the HTML under `node`, in the order of the document; an included file has its own lines. */
function htmlTags(node: MystNode): Tag[] {
  const under = (node.children ?? []).flatMap(htmlTags);
  const first = node.position?.start?.line;
  if (node.type !== "html" || first === undefined || node.data?.included === true) return under;
  const value = node.value ?? "";
  return [...value.matchAll(HTML_TAG)].flatMap((found) => {
    const [, slash, written, selfClosed] = found;
    const name = written?.toLowerCase();
    if (name === undefined || selfClosed || VOID_ELEMENTS.has(name)) return [];
    return [{ name, closing: slash === "/", line: first + value.slice(0, found.index).split("\n").length - 1 }];
  });
}

/**
 * The two tag lines of every HTML element that opens and closes on different lines. Read from the
 * HTML the parser found, before the HTML passes: an element they do not build, or build with the
 * tag of another one, keeps its own two lines here.
 */
export function htmlTagLines(root: MystNode): Lines[] {
  const open: Tag[] = [];
  const pairs: Lines[] = [];
  for (const tag of htmlTags(root)) {
    if (!tag.closing) {
      open.push(tag);
      continue;
    }
    const at = open.map((other) => other.name).lastIndexOf(tag.name);
    if (at === -1) continue;
    const [opening] = open.splice(at) as [Tag];
    if (tag.line > opening.line) pairs.push({ start: opening.line, end: tag.line });
  }
  return pairs;
}

function isOneLine(node: MystNode): boolean {
  const lines = renderedLines(node, undefined);
  return lines !== undefined && lines.start === lines.end;
}

/** True when `lines` hold one tag line of an element and not the other. */
function tearsPair(lines: Lines, pair: Lines): boolean {
  const holdsLine = (line: number): boolean => lines.start <= line && line <= lines.end;
  return holdsLine(pair.start) !== holdsLine(pair.end);
}

/** True when `lines` are part of `fence` only, and hold one of its fence lines or leave it. */
function cutsFence(lines: Lines, fence: Fence): boolean {
  if (lines.start === fence.start && lines.end === fence.end) return false;
  return lines.start <= fence.start || lines.end > fence.end || (fence.closed && lines.end === fence.end);
}

/**
 * Makes `node` no block of its own: a click on it reaches the block around it. Lines a pass has
 * already written become its line marker; the walk writes the marker of the others.
 */
function unmap(node: MystNode): void {
  const properties = node.data?.hProperties as Record<string, unknown> | undefined;
  const line = properties?.["data-line"];
  if (properties && typeof line === "number") {
    const endLine = properties["data-end-line"];
    for (const name of LINE_ATTRIBUTES) delete properties[name];
    properties["data-okf-marker-line"] = line;
    if (typeof endLine === "number" && endLine > line) properties["data-okf-marker-end-line"] = endLine;
  }
  node.data = { ...(node.data ?? {}), noSourceLine: true };
}

/** Unmaps every node under `node`; a comment keeps its lines, for its review actions. */
export function unmapBlocksUnder(node: MystNode): void {
  for (const child of node.children ?? []) {
    if (child.type === "html" && /^\s*<!--/u.test(child.value ?? "")) continue;
    unmap(child);
    unmapBlocksUnder(child);
  }
}

function hasPositionBelow(node: MystNode): boolean {
  return (node.children ?? []).some((child) => child.type !== "text"
    && (child.position?.start?.line !== undefined || hasPositionBelow(child)));
}

/**
 * Gives a node its directive builds without a position the lines of that directive. A container
 * with nothing positioned inside (a captioned `{code-block}`, a `{list-table}`) is mapped itself,
 * as the one block of its directive.
 */
function claimDirectiveLines(node: MystNode, owner: NonNullable<MystNode["position"]>): void {
  if (node.position !== undefined || node.data?.noSourceLine === true || !WHOLE_DIRECTIVE.has(node.type)) return;
  const whole = node.type === "container" && !hasPositionBelow(node);
  node.position = { start: { ...owner.start }, end: { ...owner.end } };
  if (!whole) return;
  unmapBlocksUnder(node);
  node.data = {
    ...(node.data ?? {}),
    hProperties: {
      ...(node.data?.hProperties as object ?? {}),
      ...sourcePositionProperties(node, node.position.start?.line),
    },
  };
}

// The parser ends an amsmath block one line early, before its `\end` line.
function closeAmsmath(node: MystNode, sourceLines: readonly string[]): void {
  const name = node.type === "math" ? /^\s*\\begin\{([^}]+)\}/u.exec(node.value ?? "")?.[1] : undefined;
  const end = node.position?.end?.line;
  if (!name || end === undefined || node.data?.included === true) return;
  const closing = `\\end{${name}}`;
  if (!sourceLines[end - 1]?.includes(closing) && sourceLines[end]?.includes(closing)) {
    node.position = { ...node.position, end: { ...node.position!.end, line: end + 1 } };
  }
}

const withoutSpaces = (value: string): string => value.replace(/[\s>]/gu, "");

/**
 * True when the lines of the formula `node` read as that formula and nothing else, or, `directly`
 * in a box body, when it is written on one line, which then holds all of it and of its paragraph.
 */
function hasOwnLines(node: MystNode, sourceLines: readonly string[], directly: boolean): boolean {
  const lines = renderedLines(node, undefined);
  if (!lines) return false;
  const written = sourceLines.slice(lines.start - 1, lines.end).join("\n");
  const before = BEFORE_FORMULA.exec(written);
  if (!before) return false;
  const found = withoutSpaces(written.slice(before[0].length));
  const value = withoutSpaces(node.value ?? "");
  if (found.startsWith("\\begin{")) return found === value;
  if (directly && lines.start === lines.end) return found.startsWith(`$$${value}$$`);
  return found === `$$${value}$$` || (found.startsWith(`$$${value}$$(`) && found.endsWith(")"));
}

/**
 * A formula written inside a paragraph (after text or a quote, with no blank line) comes with the
 * first line of the block around it, which holds none or only part of it. It is no block of its own:
 * the block around it, which holds all of it, opens instead.
 */
function unmapStrayFormula(node: MystNode, sourceLines: readonly string[], directly: boolean): void {
  if (node.type !== "math" || node.position === undefined || node.data?.included === true) return;
  closeAmsmath(node, sourceLines);
  if (hasOwnLines(node, sourceLines, directly)) return;
  unmap(node);
  delete node.position;
}

/** True when a block under `node` starts below line `end`. */
function holdsBlockBelow(node: MystNode, end: number): boolean {
  return (node.children ?? []).some((child) =>
    (child.type !== "text" && (renderedLines(child, undefined)?.start ?? 0) > end) || holdsBlockBelow(child, end));
}

/**
 * A closing tag with more HTML right under it is not paired with its opening tag: the element ends
 * above content it holds, so it is no block of its own.
 */
function unmapUnpairedElement(node: MystNode): void {
  const lines = node.type === "rawHtmlElement" ? renderedLines(node, undefined) : undefined;
  if (lines && holdsBlockBelow(node, lines.end)) unmap(node);
}

/**
 * A definition of several lines gives the HTML it wraps (no blank line above it) its own first
 * line, which may not hold it: that wrap is no block of its own, so the definition list opens.
 */
function unmapHtmlWrap(node: MystNode, parent: MystNode): void {
  const { start, end } = parent.position ?? {};
  if (parent.type !== "definitionDescription" || node.data?.htmlWrap !== true) return;
  if ((end?.line ?? 0) > (start?.line ?? 0)) unmap(node);
}

/**
 * The lines the synthesised content under `node` may claim: none directly in a box (what the box's
 * own directive builds is not the box), else those of the nearest directive with a position.
 */
function ownerUnder(node: MystNode, synthesised: boolean, scope: Scope): MystNode["position"] {
  if (isBox(node)) return undefined;
  if (synthesised) return scope.owner;
  return DIRECTIVE_NODES.has(node.type) ? node.position : undefined;
}

function writeEndLine(node: MystNode, lines: Lines, endLine: number): void {
  const properties = node.data?.hProperties as Record<string, unknown> | undefined;
  if (properties && typeof properties["data-line"] === "number") {
    delete properties["data-single-line"];
    properties["data-end-line"] = endLine;
    return;
  }
  node.position = { start: node.position?.start ?? { line: lines.start }, end: { ...node.position?.end, line: endLine } };
}

/** The children of a list item whose lines stay as they are: no block of their own, or a comment. */
const NOT_SPANNED = new Set(["text", "html", "okfComment"]);

/** The first line of `node`, else of the first node under it that has one. */
function firstLine(node: MystNode): number | undefined {
  if (node.type === "text") return undefined;
  return renderedLines(node, undefined)?.start
    ?? (node.children ?? []).map(firstLine).find((line) => line !== undefined);
}

/** The last line of the empty lines under line `line`, at most `limit`. */
function lastBlankLine(sourceLines: readonly string[], line: number, limit: number): number {
  let last = line;
  while (last < limit && BLANK.test(sourceLines[last] ?? "")) last += 1;
  return last;
}

/**
 * Gives each block a list item holds directly, and that renders on one line, all of its lines, and
 * never across a fence. A block with a position holds all its source, so it takes only the empty
 * lines under it (what follows may be a closing HTML tag, which is no block). A block without one
 * reaches the line before the next block of the item (a directive from its opening fence), else the
 * end of the item. The first paragraph of a tight item has no position: it starts where the item
 * does. A later paragraph without a position has no known first line, so it is no block of its own.
 */
function spanItemBlocks(item: MystNode, fences: readonly Fence[], sourceLines: readonly string[]): void {
  const children = item.children ?? [];
  for (const [index, child] of children.entries()) {
    if (NOT_SPANNED.has(child.type) || child.data?.noSourceLine === true) continue;
    if (child.type === "paragraph" && index > 0 && !renderedLines(child, undefined)) {
      unmap(child);
      continue;
    }
    const lines = renderedLines(child, item.position?.start?.line);
    if (!lines || lines.end > lines.start) continue;
    const next = children.slice(index + 1).map(firstLine).find((line) => line !== undefined && line > lines.start);
    let endLine = next === undefined ? item.position?.end?.line : next - 1;
    if (endLine === undefined) continue;
    if (child.position) endLine = lastBlankLine(sourceLines, lines.end, endLine);
    if (endLine <= lines.end) continue;
    const whole = { start: lines.start, end: endLine };
    if (!fences.some((fence) => cutsFence(whole, fence))) writeEndLine(child, lines, endLine);
  }
}

/**
 * A node whose lines hold one fence line of a directive around it, or one tag line of an HTML
 * element, without the other is no block of its own. Neither is anything under such a list or list
 * item: the page opens an item or a list over the mapped blocks under it, across that line.
 */
function unmapPartial(node: MystNode, lines: Lines, fences: readonly Fence[], pairs: readonly Lines[]): void {
  const torn = pairs.some((pair) => tearsPair(lines, pair));
  if (!torn && !fences.some((fence) => cutsFence(lines, fence))) return;
  unmap(node);
  if (torn && (node.type === "list" || node.type === "listItem")) unmapBlocksUnder(node);
}

/** The box a directive builds without a position of its own takes the lines of that directive. */
function claimBoxLines(box: MystNode, parent: MystNode): void {
  if (!isBox(box) || box.position !== undefined || !DIRECTIVE_NODES.has(parent.type)) return;
  const { start, end } = parent.position ?? {};
  if (start && end) box.position = { start: { ...start }, end: { ...end } };
}

/**
 * A directive with a `---` block of options and a later `---` line in its body maps the body above
 * that line one line down, so no block of that body is a block of its own: its box opens.
 */
function unmapShiftedBody(directive: MystNode, sourceLines: readonly string[]): void {
  const { start, end } = directive.position ?? {};
  if (directive.type !== "mystDirective" || !start || !end) return;
  const body = sourceLines.slice(start.line, end.line);
  if (!DASH_LINE.test(body[0] ?? "") || body.filter((line) => DASH_LINE.test(line)).length < 3) return;
  for (const built of directive.children ?? []) unmapBlocksUnder(built);
}

/** What the whole tree is read with. */
interface Source {
  lines: readonly string[];
  pairs: readonly Lines[];
}

function visit(node: MystNode, scope: Scope, source: Source): void {
  // Before the item's blocks are spanned, so that a formula's wrong line bounds none of them.
  if (scope.inBox && !DIRECTIVE_NODES.has(node.type)) {
    for (const child of node.children ?? []) unmapStrayFormula(child, source.lines, scope.body);
  }
  if (scope.inBox && node.type === "listItem") spanItemBlocks(node, scope.fences, source.lines);
  for (const child of node.children ?? []) {
    claimBoxLines(child, node);
    const synthesised = child.position === undefined;
    if (scope.inBox) {
      if (scope.owner) claimDirectiveLines(child, scope.owner);
      closeAmsmath(child, source.lines);
      const lines = child.type === "text" ? undefined : renderedLines(child, scope.inherited);
      if (lines) unmapPartial(child, lines, scope.fences, source.pairs);
      unmapHtmlWrap(child, node);
      unmapUnpairedElement(child);
    }
    if (scope.inBox || child.children?.some(isBox)) unmapShiftedBody(child, source.lines);
    const fence = fenceOf(child, source.lines);
    visit(child, {
      inBox: scope.inBox || isBox(child),
      fences: fence ? [...scope.fences, fence] : scope.fences,
      owner: ownerUnder(child, synthesised, scope),
      inherited: child.position?.start?.line ?? scope.inherited,
      body: isBox(child) || (child.type === "paragraph" && isBox(node) && isOneLine(child)),
    }, source);
  }
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-130
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-254
/**
 * Makes every mapped block of a box the whole source of its element: what a directive builds takes
 * the lines of that directive, and a block that is only a part of one and holds one of its fence
 * lines (the body written on the opening line, a caption, a card title) is no block of its own.
 */
export function mapBoxSourceLines(root: MystNode, sourceLines: readonly string[], tagLines: readonly Lines[]): void {
  const source = { lines: sourceLines, pairs: tagLines };
  visit(root, { inBox: false, fences: [], owner: undefined, inherited: undefined, body: false }, source);
}
