/**
 * Context tags (`<example>` ... `</example>` on their own lines): the tree passes that group the
 * blocks between a tag pair into an admonition, and keep an unknown or unsupported tag as text.
 */

import { html as parse5Html } from "parse5";

import { offsetNodeLines } from "./mystBlockTransforms";
import { MYST_PARSE_OPTIONS, type MystEngine } from "./mystEngine";
import { expandGithubAlertsWithLines, mapAlertSourceLines } from "./mystGithubAlerts";
import type { MystNode } from "./mystNode";

interface ContextTagBoundary {
  kind: "open" | "close" | "unsupported";
  name?: string;
}

const HTML_TAG_NAMES = new Set(Object.values(parse5Html.TAG_NAMES).map((name) => name.toLowerCase()));
const CONTEXT_TAG_NAME = "[a-z][a-z0-9_-]*";
const CONTEXT_TAG_OPEN = new RegExp(`^<(${CONTEXT_TAG_NAME})>$`, "u");
const CONTEXT_TAG_CLOSE = new RegExp(`^</(${CONTEXT_TAG_NAME})>$`, "u");
const UNSUPPORTED_CONTEXT_TAG = new RegExp(
  `^</?(${CONTEXT_TAG_NAME})(?:\\s+[^>]*|\\s*/|/)>$`,
  "u",
);

function standaloneContextTagValue(node: MystNode): string | undefined {
  if (node.type === "html" && node.value !== undefined && node.value.trim() === node.value) {
    return node.value;
  }
  if (
    node.type === "paragraph"
    && node.children?.length === 1
    && node.children[0].type === "text"
    && node.children[0].value !== undefined
    && node.children[0].value.trim() === node.children[0].value
  ) {
    return node.children[0].value;
  }
  return undefined;
}

function contextTagBoundary(node: MystNode): ContextTagBoundary | undefined {
  const value = standaloneContextTagValue(node);
  if (value === undefined) {
    return undefined;
  }
  const opening = CONTEXT_TAG_OPEN.exec(value);
  if (opening) {
    if (HTML_TAG_NAMES.has(opening[1])) {
      return undefined;
    }
    return { kind: "open", name: opening[1] };
  }
  const closing = CONTEXT_TAG_CLOSE.exec(value);
  if (closing) {
    if (HTML_TAG_NAMES.has(closing[1])) {
      return undefined;
    }
    return { kind: "close", name: closing[1] };
  }
  const unsupported = UNSUPPORTED_CONTEXT_TAG.exec(value);
  return unsupported && !HTML_TAG_NAMES.has(unsupported[1]) ? { kind: "unsupported" } : undefined;
}

function literalizeContextTag(node: MystNode): MystNode {
  return {
    type: "paragraph",
    position: node.position,
    children: [{ type: "text", value: standaloneContextTagValue(node) ?? "" }],
  };
}

function findContextTagClose(
  children: MystNode[],
  openingIndex: number,
  name: string,
): number | undefined {
  const stack = [name];
  for (let index = openingIndex + 1; index < children.length; index += 1) {
    const boundary = contextTagBoundary(children[index]);
    if (!boundary || boundary.kind === "unsupported" || !boundary.name) {
      continue;
    }
    if (boundary.kind === "open") {
      stack.push(boundary.name);
      continue;
    }
    if (stack.at(-1) !== boundary.name) {
      return undefined;
    }
    stack.pop();
    if (stack.length === 0) {
      return index;
    }
  }
  return undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-013
function createContextAdmonition(
  opening: MystNode,
  closing: MystNode,
  body: MystNode[],
): MystNode {
  return {
    type: "admonition",
    kind: "admonition",
    class: "myst-context-admonition",
    icon: false,
    position: {
      ...(opening.position?.start ? { start: { ...opening.position.start } } : {}),
      ...(closing.position?.end ? { end: { ...closing.position.end } } : {}),
    },
    children: [
      {
        type: "admonitionTitle",
        position: opening.position,
        children: [{ type: "text", value: standaloneContextTagValue(opening) ?? opening.value ?? "" }],
      },
      ...body,
    ],
  };
}

function groupContextTagChildren(children: MystNode[]): MystNode[] {
  const grouped: MystNode[] = [];
  for (let index = 0; index < children.length; index += 1) {
    const boundary = contextTagBoundary(children[index]);
    if (boundary?.kind === "open" && boundary.name) {
      const closingIndex = findContextTagClose(children, index, boundary.name);
      if (closingIndex !== undefined) {
        grouped.push(createContextAdmonition(
          children[index],
          children[closingIndex],
          groupContextTagChildren(children.slice(index + 1, closingIndex)),
        ));
        index = closingIndex;
        continue;
      }
    }
    grouped.push(
      boundary?.kind === "close" || boundary?.kind === "unsupported"
        ? literalizeContextTag(children[index])
        : boundary?.kind === "open" ? literalizeContextTag(children[index]) : children[index],
    );
  }
  return grouped;
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-012
function splitGroupedContextTagHtml(
  node: MystNode,
  mystParse: MystEngine["mystParse"],
): MystNode[] | undefined {
  if (node.type !== "html" || node.value === undefined) {
    return undefined;
  }
  const lines = node.value.split(/\r?\n/u);
  if (lines.length < 3) {
    return undefined;
  }
  const opening = contextTagBoundary({ type: "html", value: lines[0] });
  const closing = contextTagBoundary({ type: "html", value: lines.at(-1) });
  if (
    opening?.kind !== "open"
    || closing?.kind !== "close"
    || !opening.name
    || opening.name !== closing.name
  ) {
    return undefined;
  }

  const sourceLine = node.position?.start?.line;
  const endLine = node.position?.end?.line
    ?? (sourceLine === undefined ? undefined : sourceLine + lines.length - 1);
  const expanded = expandGithubAlertsWithLines(lines.slice(1, -1).join("\n"));
  const body = mystParse(expanded.text, MYST_PARSE_OPTIONS);
  // The body's lines count from the line after the opening tag, as in the raw block.
  mapAlertSourceLines(body, expanded);
  repairGroupedContextTagHtml(body, mystParse);
  if (sourceLine !== undefined) {
    offsetNodeLines(body, sourceLine);
  }
  return [
    {
      type: "html",
      value: lines[0],
      position: sourceLine === undefined ? undefined : { start: { line: sourceLine } },
    },
    ...(body.children ?? []),
    {
      type: "html",
      value: lines.at(-1),
      position: endLine === undefined ? undefined : { end: { line: endLine } },
    },
  ];
}

/**
 * Re-parses a raw HTML block the parser kept whole from an opening to a closing context tag: the
 * tag lines stay HTML and the Markdown between them is parsed (GitHub alerts included).
 */
export function repairGroupedContextTagHtml(node: MystNode, mystParse: MystEngine["mystParse"]): void {
  if (!node.children) {
    return;
  }
  const children: MystNode[] = [];
  for (const child of node.children) {
    const replacement = splitGroupedContextTagHtml(child, mystParse);
    if (replacement) {
      children.push(...replacement);
    } else {
      repairGroupedContextTagHtml(child, mystParse);
      children.push(child);
    }
  }
  node.children = children;
}

const CONTEXT_TAG_BLOCK_PARENTS = new Set([
  "root",
  "blockquote",
  "container",
  "definitionDescription",
  "definitionList",
  "listItem",
]);

/** Groups the blocks between context tag pairs into admonitions, in every block container. */
export function normalizeContextTagContainers(node: MystNode): void {
  if (node.children && CONTEXT_TAG_BLOCK_PARENTS.has(node.type)) {
    node.children = groupContextTagChildren(node.children);
  }
  for (const child of node.children ?? []) {
    normalizeContextTagContainers(child);
  }
}
