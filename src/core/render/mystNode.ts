/**
 * The MyST syntax tree as the renderer and the directive passes (`src/core/directives/`) see it,
 * and the small helpers they share to set the HTML a node becomes. Pure module: no host API, no
 * DOM, no Node built-ins.
 */

/** A node of the MyST syntax tree (the fields the renderer reads or sets). */
export interface MystNode {
  type: string;
  children?: MystNode[];
  position?: { start?: { line?: number }; end?: { line?: number } };
  data?: Record<string, unknown>;
  name?: string;
  /** A table cell the parser marked as a header cell. */
  header?: boolean;
  args?: string;
  label?: string;
  identifier?: string;
  value?: string;
  kind?: string;
  lang?: string;
  class?: string;
  icon?: boolean;
  open?: boolean;
  align?: string;
  options?: Record<string, unknown>;
  emphasizeLines?: number[];
  showLineNumbers?: boolean;
  startingLineNumber?: number | string;
  filename?: string;
  file?: string;
  literal?: boolean;
  url?: string;
}

/** A node of a parse5 fragment of raw HTML. */
export interface RawHtmlNode {
  nodeName: string;
  namespaceURI?: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: RawHtmlNode[];
  value?: string;
}

const TABLE_ALIGNMENTS = new Set(["left", "center", "right"]);

/** Makes `node` render as the element `name` with `properties` (and `children` in place of its own). */
export function setHast(node: MystNode, name: string, properties: Record<string, unknown>, children?: unknown[]): void {
  node.data = {
    ...(node.data ?? {}),
    hName: name,
    hProperties: { ...(node.data?.hProperties as object ?? {}), ...properties },
    ...(children ? { hChildren: children } : {}),
  };
}

/** Adds HTML attributes to the element `node` renders as. */
export function mergeProperties(node: MystNode, properties: Record<string, unknown>): void {
  node.data = {
    ...(node.data ?? {}),
    hProperties: { ...(node.data?.hProperties as object ?? {}), ...properties },
  };
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-003
/** The source line attributes (`data-line`, `data-end-line`) of a block that starts at `line`. */
export function sourcePositionProperties(node: MystNode, line?: number): Record<string, number | string> {
  if (line === undefined) {
    return {};
  }
  const endLine = node.position?.end?.line;
  return {
    "data-line": line,
    ...(node.data?.included === true ? { "data-sphinx-preview-included": "true" } : {}),
    ...(endLine !== undefined && endLine >= line ? { "data-end-line": endLine } : {}),
  };
}

/** The first node of type `type` in `node` and its descendants, depth first. */
export function findNode(node: MystNode, type: string): MystNode | undefined {
  if (node.type === type) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, type);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** A table alignment (`left`, `center`, `right`, any case) in lower case, else `undefined`. */
export function normalizeTableAlignment(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const alignment = value.toLowerCase();
  return TABLE_ALIGNMENTS.has(alignment) ? alignment : undefined;
}

/** True when the raw HTML fragment holds a `<table>`. */
export function containsRawTable(node: RawHtmlNode): boolean {
  return node.tagName?.toLowerCase() === "table"
    || (node.childNodes ?? []).some(containsRawTable);
}

/** The title an admonition takes from a leading heading or a lone bold paragraph, and the rest. */
export function takeAdmonitionTitle(children: MystNode[]): { title: MystNode; body: MystNode[] } | undefined {
  const first = children[0];
  if (first?.type === "heading") {
    return {
      title: { type: "admonitionTitle", children: first.children ?? [] },
      body: children.slice(1),
    };
  }
  if (first?.type === "paragraph") {
    const meaningfulChildren = (first.children ?? []).filter((child) =>
      child.type !== "text" || Boolean(child.value?.trim()));
    if (meaningfulChildren.length === 1 && meaningfulChildren[0].type === "strong") {
      return {
        title: { type: "admonitionTitle", children: meaningfulChildren[0].children ?? [] },
        body: children.slice(1),
      };
    }
  }
  return undefined;
}
