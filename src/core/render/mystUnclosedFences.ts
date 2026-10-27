/**
 * The fences left open in the middle of a document. Markdown runs an unclosed fence to the end of
 * the file, so the heading and every section after it would become the body of that directive (or
 * code block) and vanish from the preview. When a heading falls inside the unclosed part, the
 * opening line is shown as a code block of its own, with a warning, and the lines after it are
 * parsed again as ordinary document content. The source is never changed. Pure module: no host
 * API, no DOM, no Node built-ins.
 */

import type { RenderDiagnostic } from "./mystTypes";
import type { MystNode } from "./mystNode";

/** The nodes a fence produces: a directive (backticks or colons) or a plain code block. */
const FENCE_NODE_TYPES = new Set(["mystDirective", "code"]);
const OPENING_FENCE = /^[\s>]*(`{3,}|:{3,}|~{3,})/u;
const ATX_HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/u;

/** What the pass reads: both texts of the document, line for line, and how to parse a fragment. */
export interface UnclosedFenceContext {
  /** The document as written (frontmatter included), for the raw line shown to the author. */
  readonly sourceLines: readonly string[];
  /** The text the parser read (frontmatter removed): the rest is parsed again from here. */
  readonly parsedLines: readonly string[];
  /** Lines of frontmatter removed before parsing. */
  readonly lineOffset: number;
  readonly parse: (text: string) => MystNode;
  readonly diagnostics: RenderDiagnostic[];
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-096
/**
 * Replaces every fence of `root` that has no closing line and swallows a heading by its opening
 * line as a code block, followed by the nodes of the lines it had swallowed.
 */
export function splitUnclosedFences(root: MystNode, context: UnclosedFenceContext): void {
  visit(root, context);
}

function visit(parent: MystNode, context: UnclosedFenceContext): void {
  const children = parent.children;
  if (!children) {
    return;
  }
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]!;
    const span = unclosedSpan(child, context);
    if (!span) {
      visit(child, context);
      continue;
    }
    context.diagnostics.push({
      code: "unclosed-fence",
      severity: "warning",
      line: span.start,
      message: "Unclosed fence: the closing fence is missing, so only this line is shown as written.",
    });
    const rest = reparse(span.start, span.end, context);
    children.splice(index, 1, rawOpening(child, span.start, context), ...rest);
  }
}

/** The lines of an unclosed fence that swallows a heading, else undefined. */
function unclosedSpan(node: MystNode, context: UnclosedFenceContext): { start: number; end: number } | undefined {
  const start = node.position?.start?.line;
  const end = node.position?.end?.line;
  if (!FENCE_NODE_TYPES.has(node.type) || start === undefined || end === undefined || end <= start) {
    return undefined;
  }
  const opening = parsedLine(context, start);
  const fence = opening === undefined ? undefined : OPENING_FENCE.exec(opening)?.[1];
  const last = parsedLine(context, end);
  if (fence === undefined || last === undefined || closes(last, fence)) {
    return undefined;
  }
  for (let line = start + 1; line <= end; line += 1) {
    if (ATX_HEADING.test(parsedLine(context, line) ?? "")) {
      return { start, end };
    }
  }
  return undefined;
}

function closes(line: string, fence: string): boolean {
  const trimmed = line.replace(/^[\s>]+/u, "").trimEnd();
  return trimmed.length >= fence.length && [...trimmed].every((char) => char === fence[0]);
}

function parsedLine(context: UnclosedFenceContext, line: number): string | undefined {
  return context.parsedLines[line - 1 - context.lineOffset];
}

/** The nodes of the lines after the opening one, with their lines in the document's numbering. */
function reparse(start: number, end: number, context: UnclosedFenceContext): MystNode[] {
  const text = context.parsedLines.slice(start - context.lineOffset, end - context.lineOffset).join("\n");
  const fragment = context.parse(text);
  shift(fragment, start);
  visit(fragment, context);
  return fragment.children ?? [];
}

function shift(node: MystNode, offset: number): void {
  if (node.position?.start?.line !== undefined) {
    node.position.start.line += offset;
  }
  if (node.position?.end?.line !== undefined) {
    node.position.end.line += offset;
  }
  for (const child of node.children ?? []) {
    shift(child, offset);
  }
}

function rawOpening(node: MystNode, line: number, context: UnclosedFenceContext): MystNode {
  const text = context.sourceLines[line - 1] ?? parsedLine(context, line) ?? "";
  return {
    type: "code",
    lang: "",
    value: text.trim(),
    position: { start: { line }, end: { line } },
    ...(node.data?.included === true ? { data: { included: true } } : {}),
  };
}
