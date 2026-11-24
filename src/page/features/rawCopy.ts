/**
 * The raw copy: Ctrl/Cmd+C of a native selection of the page puts the Markdown under the selection
 * on the clipboard (text/plain) and the rendered selection without chrome (text/html). The host
 * sends the render's source text (`previewSourceText`); the copy event is answered at once from it,
 * since the clipboard must be set while the event runs. The rules that place an edge in the source
 * are `src/core/mapping/rawCopy.ts`; this module reads the DOM into the two edges.
 */

import { isChromeProbe, type ChromeProbe } from "../../core/export/chromeMarks";
import { rawMarkdownForSelection } from "../../core/mapping/rawCopy";
import { RawCopyTree, type RawCopyPoint, type RawCopyTreeAdapter } from "../../core/mapping/rawCopyTree";
import type { PreviewRuntimeContext } from "../../core/protocol/bootContext";
import type { HostMessageRouter } from "../hostMessages";

const CONTENT_ID = "sphinx-myst-preview-content";
const CARD = "[data-okf-sbs-card]";

/** Where a copy stays the browser's own: a text control, an open editor, the find bar, a compose box. */
const NATIVE_COPY_SURFACES = "textarea, input, select, [contenteditable]:not([contenteditable=\"false\"]), "
  + "[data-sphinx-preview-block-editor], [data-okf-frontmatter-editor], [data-sphinx-preview-table-cell-editor], "
  + "[data-sphinx-preview-find], [data-okf-comment-compose]";

/** What the page adds to the chrome of the export: line numbers, cards of the side-by-side view, hidden math. */
function isPageChrome(probe: ChromeProbe): boolean {
  return isChromeProbe(probe) || probe.hasClass("katex-mathml")
    || probe.attributeNames().some((name) => name === "data-line-number" || name === "data-okf-sbs-card"
      || name === "data-okf-sbs-replaced" || name === "data-okf-comment-popover");
}

const domTree: RawCopyTreeAdapter<Node> = {
  isText: (node) => node.nodeType === 3,
  data: (node) => (node as Text).data,
  tagName: (node) => (node as Element).tagName.toLowerCase(),
  hasClass: (node, name) => (node as Element).classList.contains(name),
  attributeNames: (node) => (node as Element).getAttributeNames(),
  attribute: (node, name) => (node as Element).getAttribute(name),
  parent: (node) => node.parentNode ?? undefined,
  children: (node) => Array.from(node.childNodes),
};

const probeOf = (element: Element): ChromeProbe => ({
  tagName: element.tagName.toLowerCase(),
  hasClass: (name) => element.classList.contains(name),
  attributeNames: () => element.getAttributeNames(),
});

/** What the page needs to take a copy. */
export interface RawCopyDeps {
  context: PreviewRuntimeContext;
  /** True while a block selection is active in edit mode: its copy is the block copy. */
  blockSelectionActive(): boolean;
}

/** The index path of a node under an ancestor. */
function pathBetween(ancestor: Node, node: Node): number[] | undefined {
  const path: number[] = [];
  for (let current: Node | null = node; current && current !== ancestor; current = current.parentNode) {
    const parent: Node | null = current.parentNode;
    if (!parent) return undefined;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current) as number);
  }
  return path;
}

/**
 * A point in the current side of a side-by-side card, moved to the page block the card copies (the
 * hidden original), or `undefined` when it cannot be resolved so (an old side, a removed card).
 */
function pointInPageBlock(point: RawCopyPoint<Node>): RawCopyPoint<Node> | undefined {
  const element = point.node.nodeType === 1 ? point.node as Element : point.node.parentElement;
  const card = element?.closest(CARD);
  if (!card) return point;
  const side = element?.closest("[data-okf-sbs-side]");
  const original = card.nextElementSibling;
  const copy = side?.firstElementChild;
  if (side?.getAttribute("data-okf-sbs-side") !== "current" || !copy || !original?.hasAttribute("data-okf-sbs-replaced")) {
    return undefined;
  }
  const path = pathBetween(copy, point.node);
  if (!path) return undefined;
  let node: Node = original;
  for (const index of path) {
    const child = node.childNodes[index];
    if (!child) return undefined;
    node = child;
  }
  return node.nodeType === point.node.nodeType && node.childNodes.length === point.node.childNodes.length
    ? { node, offset: point.offset }
    : undefined;
}

/** A boundary point of the range, moved to the content container's edge when it lies outside it. */
function contentPoint(content: Element, node: Node, offset: number, side: "start" | "end"): RawCopyPoint<Node> {
  if (content.contains(node)) return { node, offset };
  return { node: content, offset: side === "start" ? 0 : content.childNodes.length };
}

/**
 * The rendered selection as HTML: the range's contents without chrome and without the old side of a
 * card. A card stays (its current side is the block now); the hidden original it replaces goes.
 */
function renderedHtml(document: Document, range: Range): string {
  const holder = document.createElement("div");
  holder.appendChild(range.cloneContents());
  for (const element of Array.from(holder.querySelectorAll("*"))) {
    const card = element.hasAttribute("data-okf-sbs-card");
    if ((!card && isPageChrome(probeOf(element))) || element.closest("[data-okf-sbs-side=\"base\"]")) element.remove();
  }
  return holder.innerHTML;
}

/**
 * Installs the raw copy. Handles `previewSourceText`: the text is kept with the identity of the
 * render it came for, and used only while the page shows that render.
 */
export function installRawCopy(
  document: Document,
  window: Window & typeof globalThis,
  router: HostMessageRouter,
  deps: RawCopyDeps,
): void {
  const { context } = deps;
  let held: { text: string; documentId: string; revision: number; requestId: number } | undefined;
  router.on("previewSourceText", (message) => {
    held = { text: message.text, documentId: message.documentId, revision: message.revision, requestId: message.requestId };
  });

  const sourceText = (): string | undefined => held
    && held.documentId === context.documentId && held.revision === context.revision && held.requestId === context.requestId
    ? held.text : undefined;

  const inNativeSurface = (node: Node | null): boolean => {
    const element = node && node.nodeType === 1 ? node as Element : node?.parentElement;
    return Boolean(element?.closest(NATIVE_COPY_SURFACES));
  };

  const markdownOf = (text: string, range: Range, content: HTMLElement): string | undefined => {
    const start = pointInPageBlock(contentPoint(content, range.startContainer, range.startOffset, "start"));
    const end = pointInPageBlock(contentPoint(content, range.endContainer, range.endOffset, "end"));
    if (!start || !end) return undefined;
    const tree = new RawCopyTree(domTree, content, isPageChrome);
    return rawMarkdownForSelection(text, tree.edge(start, "start"), tree.edge(end, "end"));
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-272
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-277
  document.addEventListener("copy", (event: ClipboardEvent) => {
    const text = sourceText();
    const content = document.getElementById(CONTENT_ID);
    if (text === undefined || !content || !event.clipboardData) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    if (deps.blockSelectionActive() || inNativeSurface(document.activeElement)) return;
    const range = selection.getRangeAt(0);
    if (!range.intersectsNode(content) || inNativeSurface(selection.anchorNode) || inNativeSurface(selection.focusNode)) return;
    const markdown = markdownOf(text, range, content);
    if (markdown === undefined) return;
    event.clipboardData.setData("text/plain", markdown);
    event.clipboardData.setData("text/html", renderedHtml(document, range));
    event.preventDefault();
  });
}
