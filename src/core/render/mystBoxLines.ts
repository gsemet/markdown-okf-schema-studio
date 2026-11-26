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

const LINE_ATTRIBUTES = ["data-line", "data-end-line", "data-single-line"];

interface Lines {
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

/**
 * The lines the synthesised content under `node` may claim: none directly in a box (what the box's
 * own directive builds is not the box), else those of the nearest directive with a position.
 */
function ownerUnder(node: MystNode, synthesised: boolean, scope: Scope): MystNode["position"] {
  if (isBox(node)) return undefined;
  if (synthesised) return scope.owner;
  return DIRECTIVE_NODES.has(node.type) ? node.position : undefined;
}

function visit(node: MystNode, scope: Scope, sourceLines: readonly string[]): void {
  for (const child of node.children ?? []) {
    const synthesised = child.position === undefined;
    if (scope.inBox) {
      if (scope.owner) claimDirectiveLines(child, scope.owner);
      closeAmsmath(child, sourceLines);
      const lines = child.type === "text" ? undefined : renderedLines(child, scope.inherited);
      if (lines && scope.fences.some((fence) => cutsFence(lines, fence))) unmap(child);
    }
    const fence = fenceOf(child, sourceLines);
    visit(child, {
      inBox: scope.inBox || isBox(child),
      fences: fence ? [...scope.fences, fence] : scope.fences,
      owner: ownerUnder(child, synthesised, scope),
      inherited: child.position?.start?.line ?? scope.inherited,
    }, sourceLines);
  }
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-130
/**
 * Makes every mapped block of a box the whole source of its element: what a directive builds takes
 * the lines of that directive, and a block that is only a part of one and holds one of its fence
 * lines (the body written on the opening line, a caption, a card title) is no block of its own.
 */
export function mapBoxSourceLines(root: MystNode, sourceLines: readonly string[]): void {
  visit(root, { inBox: false, fences: [], owner: undefined, inherited: undefined }, sourceLines);
}
