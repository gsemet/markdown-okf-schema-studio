/**
 * The MyST block break (`+++`) splits a document at its root only. Inside a container (a
 * directive, a quote, a list item, an alert) the parser still leaves a break node that the HTML
 * writer cannot resolve and throws on, so such a line becomes the paragraph of text it is on GitHub.
 */

import type { MystNode } from "./mystNode";

/** A node the parser makes of a `+++` line; `meta` holds the text after the marker. */
type BreakNode = MystNode & { meta?: string };

function isBreak(node: MystNode): boolean {
  return node.type === "blockBreak" || node.type === "block";
}

function asText(node: BreakNode): MystNode {
  const meta = typeof node.meta === "string" ? node.meta.trim() : "";
  return {
    type: "paragraph",
    ...(node.position ? { position: node.position } : {}),
    children: [{ type: "text", value: meta ? `+++ ${meta}` : "+++" }],
  };
}

/** Rewrites the break nodes below `node`; the content of a nested `block` takes the place of the break. */
function rewrite(node: MystNode): void {
  if (!node.children) return;
  const children: MystNode[] = [];
  for (const child of node.children) {
    if (!isBreak(child)) {
      rewrite(child);
      children.push(child);
      continue;
    }
    children.push(asText(child));
    for (const inner of child.children ?? []) {
      rewrite(inner);
      children.push(inner);
    }
  }
  node.children = children;
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-101
/** Turns every `+++` line below a root child into text; the root's own breaks stay. */
export function textifyNestedBlockBreaks(root: MystNode): void {
  for (const child of root.children ?? []) rewrite(child);
}
