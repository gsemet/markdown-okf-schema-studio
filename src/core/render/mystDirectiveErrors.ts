/**
 * The directives the parser could not build (an unclosed or empty fence, a missing body): they
 * come back as `mystDirectiveError` nodes the HTML writer cannot emit, so the whole render would
 * fail. Each one becomes a plain code block holding its own source lines instead, and the rest of
 * the document renders as usual. Pure module: no host API, no DOM, no Node built-ins.
 */

import type { MystNode } from "./mystNode";

// @implements_req SwRS-MDOKFSTUDIO-MYST-096
/**
 * Replaces every directive error under `root` (except `{include}`, which has its own placeholder)
 * with a code block of the raw source. `sourceLines` are the lines of the document the tree was
 * parsed from, in the lines the tree reports (frontmatter lines already shifted back).
 */
export function neutralizeDirectiveErrors(root: MystNode, sourceLines: readonly string[]): void {
  visit(root, sourceLines);
}

function visit(node: MystNode, sourceLines: readonly string[]): void {
  if (node.type === "mystDirectiveError" && node.name !== "include") {
    toRawBlock(node, sourceLines);
    return;
  }
  for (const child of node.children ?? []) {
    visit(child, sourceLines);
  }
}

function toRawBlock(node: MystNode, sourceLines: readonly string[]): void {
  node.value = rawSource(node, sourceLines);
  node.type = "code";
  node.lang = "";
  node.children = undefined;
}

/** The node's own lines when its position is of this document, else the opening line rebuilt. */
function rawSource(node: MystNode, sourceLines: readonly string[]): string {
  const start = node.position?.start?.line;
  const end = node.position?.end?.line;
  if (node.data?.included !== true && start !== undefined && end !== undefined && start >= 1) {
    const lines = sourceLines.slice(start - 1, end);
    if (lines.length > 0) {
      return lines.join("\n");
    }
  }
  return `\`\`\`{${node.name ?? ""}}${node.args ? ` ${node.args}` : ""}`;
}
