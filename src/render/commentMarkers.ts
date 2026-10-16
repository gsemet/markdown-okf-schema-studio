/**
 * Comment and TODO chips.
 *
 * Raw HTML is never rendered, so an HTML comment is invisible in the preview. This stage turns a
 * comment into a small gray chip (`<!--`) and the word TODO, or a `<!-- TODO … -->` comment, into
 * a green chip. The comment text is carried as a hast text node (never raw HTML) in a hidden body
 * that the chip's `title` mirrors; expanding it is up to the page script.
 *
 * Tool comments (`markdownlint-*`, `prettier-ignore`, `toc`, `cspell:`, `vale `) stay hidden.
 */

export interface CommentMarkerNode {
  type: string;
  children?: CommentMarkerNode[];
  value?: string;
  position?: { start?: { line?: number }; end?: { line?: number } };
  data?: Record<string, unknown>;
}

export type CommentKind = "comment" | "todo";

interface HastText {
  type: "text";
  value: string;
}

interface HastElement {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Array<HastElement | HastText>;
}

const COMMENT = /^<!--([\s\S]*?)-->$/u;
const TOOL_COMMENT = /^(?:markdownlint-|prettier-ignore|toc(?![\p{L}\p{N}_])|\/toc(?![\p{L}\p{N}_])|cspell:|vale\s)/iu;
const TODO_COMMENT = /^TODO(?![\p{L}\p{N}_])/u;
const TODO_WORD = /(?<![\p{L}\p{N}_])TODO(?![\p{L}\p{N}_])/gu;

// Nodes whose text is literal or already carries its own meaning.
const SKIP_PARENTS = new Set([
  "code", "inlineCode", "html", "link", "linkReference", "image", "imageReference",
  "crossReference", "cite", "footnoteReference", "mystRole", "mystTarget", "math", "inlineMath",
  "mystComment", "comment",
]);

// Parents whose `html` children are inline (inside a line of prose) rather than a block.
const PHRASING_PARENTS = new Set([
  "paragraph", "heading", "tableCell", "emphasis", "strong", "delete", "mystRole",
]);

/** The trimmed comment text, or undefined when the value is not exactly one comment. */
function commentText(value: string | undefined): string | undefined {
  const match = value === undefined ? undefined : COMMENT.exec(value.trim());
  // `<!-- a --> <!-- b -->` matches lazily as one comment only when no `-->` precedes the end.
  if (!match || match[1].includes("-->")) return undefined;
  return match[1].trim();
}

export function isToolComment(text: string): boolean {
  return TOOL_COMMENT.test(text);
}

function text(value: string): HastText {
  return { type: "text", value };
}

function element(
  tagName: string,
  properties: Record<string, unknown>,
  children: Array<HastElement | HastText>,
): HastElement {
  return { type: "element", tagName, properties, children };
}

function chip(label: string, kind: CommentKind, title: string): HastElement {
  return element(
    "span",
    {
      className: kind === "todo" ? ["okf-chip", "okf-chip--todo"] : ["okf-chip"],
      role: "button",
      tabIndex: 0,
      title,
      "aria-expanded": "false",
    },
    [text(label)],
  );
}

function setHast(
  node: CommentMarkerNode,
  tagName: string,
  properties: Record<string, unknown>,
  children: unknown[],
): void {
  node.data = { ...(node.data ?? {}), hName: tagName, hProperties: properties, hChildren: children };
}

function commentNode(
  node: CommentMarkerNode,
  body: string,
  block: boolean,
  positionProperties: Record<string, number | string>,
): void {
  const kind: CommentKind = TODO_COMMENT.test(body) ? "todo" : "comment";
  const wrapper = block ? "div" : "span";
  setHast(
    node,
    wrapper,
    {
      class: "okf-comment",
      "data-okf-comment-kind": kind,
      ...(block ? positionProperties : {}),
    },
    [
      chip(kind === "todo" ? "TODO" : "<!--", kind, body),
      element(wrapper, { className: ["okf-comment-body"], hidden: true }, [text(body)]),
    ],
  );
  node.type = "okfComment";
  node.value = undefined;
  node.children = [];
}

function todoChipNode(): CommentMarkerNode {
  return {
    type: "okfTodoChip",
    data: {
      hName: "span",
      hProperties: {
        class: "okf-chip okf-chip--todo",
        role: "button",
        tabIndex: 0,
        title: "TODO",
        "aria-expanded": "false",
      },
      hChildren: [text("TODO")],
    },
  };
}

function splitTodo(value: string): CommentMarkerNode[] | undefined {
  const parts: CommentMarkerNode[] = [];
  let offset = 0;
  for (const match of value.matchAll(TODO_WORD)) {
    if (match.index > offset) parts.push({ type: "text", value: value.slice(offset, match.index) });
    parts.push(todoChipNode());
    offset = match.index + match[0].length;
  }
  if (parts.length === 0) return undefined;
  if (offset < value.length) parts.push({ type: "text", value: value.slice(offset) });
  return parts;
}

/**
 * Converts HTML comments and TODO words in place.
 * `positionProperties` supplies the `data-line` family for a block comment.
 */
export function convertCommentMarkers(
  node: CommentMarkerNode,
  positionProperties: (node: CommentMarkerNode) => Record<string, number | string>,
): void {
  if (SKIP_PARENTS.has(node.type) || !node.children) return;
  const inline = PHRASING_PARENTS.has(node.type);
  node.children = node.children.flatMap((child): CommentMarkerNode[] => {
    if (child.type === "html") {
      const body = commentText(child.value);
      if (body !== undefined && !isToolComment(body)) {
        commentNode(child, body, !inline, positionProperties(child));
      }
      return [child];
    }
    if (child.type === "text" && child.value) {
      return splitTodo(child.value) ?? [child];
    }
    convertCommentMarkers(child, positionProperties);
    return [child];
  });
}
