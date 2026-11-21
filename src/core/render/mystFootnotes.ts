/**
 * The page-only label line of each footnote of the footnotes section (`data-okf-footnote-line` on
 * its `li`): the page reads it to place the blank-lines block of a run inside a footnote, and to
 * send the line the host reads the footnote's indent from. It is never `data-line`.
 */

import type { MystNode } from "./mystNode";

/** The attribute of a footnote `li`: the source line of its `[^label]:` line. */
const FOOTNOTE_LINE_ATTRIBUTE = "data-okf-footnote-line";

const ID_PREFIX = "user-content-fn-";

function collect(node: MystNode, found: MystNode[]): void {
  if (node.type === "footnoteDefinition") found.push(node);
  for (const child of node.children ?? []) collect(child, found);
}

const escapeLabel = (label: string): string => label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * The label line of each footnote definition of the tree, by lower-case identifier. The parser maps a
 * definition to the line of its first reference, so the line is found in the source: the nearest
 * `[^label]:` line at or above the start of the definition's first child (a label alone on its
 * line has the body below it). A definition with no child, or no such line, is left out.
 */
export function footnoteLabelLines(root: MystNode, sourceLines: readonly string[]): Map<string, number> {
  const definitions: MystNode[] = [];
  collect(root, definitions);
  const lines = new Map<string, number>();
  for (const definition of definitions) {
    const identifier = definition.identifier?.toLowerCase();
    const bodyLine = definition.children?.find((child) => child.position?.start?.line !== undefined)?.position?.start?.line;
    if (identifier === undefined || bodyLine === undefined || lines.has(identifier)) continue;
    const label = new RegExp(`^ {0,3}\\[\\^${escapeLabel(definition.label ?? definition.identifier ?? "")}\\]:`, "iu");
    for (let line = Math.min(bodyLine, sourceLines.length); line >= 1; line -= 1) {
      if (label.test(sourceLines[line - 1])) {
        lines.set(identifier, line);
        break;
      }
    }
  }
  return lines;
}

/** Adds the label line attribute to each footnote `li` of the writer's HTML that has a known line. */
export function addFootnoteLines(html: string, lines: ReadonlyMap<string, number>): string {
  if (lines.size === 0 || !html.includes(`<li id="${ID_PREFIX}`)) return html;
  return html.replace(/<li id="user-content-fn-([^"]*)">/gu, (match, id: string) => {
    let identifier = id;
    try {
      identifier = decodeURIComponent(id);
    } catch {
      // A malformed escape: the id is compared as it is.
    }
    const line = lines.get(identifier.toLowerCase());
    return line === undefined ? match : `<li id="${ID_PREFIX}${id}" ${FOOTNOTE_LINE_ATTRIBUTE}="${String(line)}">`;
  });
}
