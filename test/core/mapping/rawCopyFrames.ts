/**
 * Test helper of the raw copy: renders a Markdown source through the real core pipeline (the MyST
 * renderer, then the sanitizer that writes `data-sphinx-source-line`, as the page receives it),
 * parses the HTML with parse5 and builds the edges of a selection from named rendered text, with
 * the same tree rules as the page (`RawCopyTree`).
 */

import { isChromeProbe } from "../../../src/core/export/chromeMarks";
import { rawMarkdownForSelection } from "../../../src/core/mapping/rawCopy";
import { RawCopyTree, type RawCopyTreeAdapter } from "../../../src/core/mapping/rawCopyTree";
import { renderMyst } from "../../../src/core/render/mystRenderer";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";
import { rewriteSphinxHtml } from "../../../src/core/security/html-sanitizer";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";
import {
  attribute,
  findElement,
  hasClass,
  parseHtml,
  type HtmlElement,
  type HtmlNode,
} from "../render/dom";

/** A point of the rendered page: the nth text holding `text`, at `offset` (a number, or "end"), or an element. */
export type Spot =
  | { text: string; offset?: number | "end"; nth?: number }
  | { element: (element: HtmlElement) => boolean; at: "before" | "after" };

export interface RenderedPage {
  source: string;
  tree: RawCopyTree<HtmlNode>;
  root: HtmlNode;
  main: HtmlNode;
}

const isElement = (node: HtmlNode): node is HtmlElement => "tagName" in node && "attrs" in node;
const childrenOf = (node: HtmlNode): HtmlNode[] => ("childNodes" in node ? node.childNodes : []);

const adapter: RawCopyTreeAdapter<HtmlNode> = {
  isText: (node) => node.nodeName === "#text",
  data: (node) => ("value" in node ? node.value : ""),
  tagName: (node) => (isElement(node) ? node.tagName : ""),
  hasClass: (node, name) => isElement(node) && hasClass(node, name),
  attributeNames: (node) => (isElement(node) ? node.attrs.map((entry) => entry.name) : []),
  attribute: (node, name) => (isElement(node) ? attribute(node, name) ?? null : null),
  parent: (node) => ("parentNode" in node ? node.parentNode ?? undefined : undefined),
  children: childrenOf,
};

/** The sanitized preview HTML of a source, as the page receives it. */
export async function previewHtml(source: string): Promise<string> {
  const { html } = await renderMyst(source);
  return rewriteSphinxHtml(html, {
    outputRoot: process.cwd(),
    policy: new ResourcePolicy(createNodeFileSystem(), []),
    nonce: "n",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
    sourceMapping: { sourceFile: "a.md", documentId: "d" },
  }).html;
}

/** Parses preview HTML into a page that selections can be read from. */
export function pageOf(source: string, html: string): RenderedPage {
  const root = parseHtml(html);
  const main = findElement(root, (element) => attribute(element, "id") === "sphinx-myst-preview-content")!;
  const tree = new RawCopyTree(adapter, main, isChromeProbe);
  return { source, tree, root, main };
}

export async function renderPage(source: string): Promise<RenderedPage> {
  return pageOf(source, await previewHtml(source));
}

/** The point of a spot: a text offset, or the boundary of an element in its parent. */
function pointOf(page: RenderedPage, spot: Spot): { node: HtmlNode; offset: number } {
  if ("element" in spot) {
    const element = findElement(page.root, spot.element);
    if (!element?.parentNode) throw new Error("no such element");
    const index = element.parentNode.childNodes.indexOf(element);
    return { node: element.parentNode, offset: spot.at === "before" ? index : index + 1 };
  }
  const nth = spot.nth ?? 0;
  const texts: Array<{ node: HtmlNode; index: number }> = [];
  const visit = (node: HtmlNode): void => {
    if (adapter.isText(node)) {
      const index = adapter.data(node).indexOf(spot.text);
      if (index >= 0) texts.push({ node, index });
    }
    childrenOf(node).forEach(visit);
  };
  visit(page.main);
  const found = texts[nth];
  if (!found) throw new Error(`no text "${spot.text}"`);
  const inside = spot.offset === "end" ? spot.text.length : spot.offset ?? 0;
  return { node: found.node, offset: found.index + inside };
}

/** The raw Markdown the page would copy for a selection from one spot to another. */
export function copyRaw(
  page: RenderedPage,
  from: Spot,
  to: Spot,
  options?: { balanceEdges?: boolean },
): string | undefined {
  return rawMarkdownForSelection(
    page.source,
    page.tree.edge(pointOf(page, from), "start"),
    page.tree.edge(pointOf(page, to), "end"),
    options,
  );
}

/** A selection of the whole content: from its first point to its last (Select all). */
export function copyAll(page: RenderedPage, options?: { balanceEdges?: boolean }): string | undefined {
  const count = childrenOf(page.main).length;
  return rawMarkdownForSelection(
    page.source,
    page.tree.edge({ node: page.main, offset: 0 }, "start"),
    page.tree.edge({ node: page.main, offset: count }, "end"),
    options,
  );
}
