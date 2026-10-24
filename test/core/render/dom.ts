import { parse, type DefaultTreeAdapterTypes } from "parse5";

export type HtmlDocument = DefaultTreeAdapterTypes.Document;
export type HtmlElement = DefaultTreeAdapterTypes.Element;
export type HtmlNode = DefaultTreeAdapterTypes.Node;

export function parseHtml(html: string): HtmlDocument {
  return parse(html);
}

function childNodes(node: HtmlNode): HtmlNode[] {
  return "childNodes" in node ? node.childNodes : [];
}

function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && "attrs" in node;
}

export function findElements(
  root: HtmlNode,
  predicate: (element: HtmlElement) => boolean,
): HtmlElement[] {
  const matches: HtmlElement[] = [];
  const visit = (node: HtmlNode): void => {
    if (isElement(node) && predicate(node)) {
      matches.push(node);
    }
    for (const child of childNodes(node)) {
      visit(child);
    }
  };
  visit(root);
  return matches;
}

export function findElement(
  root: HtmlNode,
  predicate: (element: HtmlElement) => boolean,
): HtmlElement | undefined {
  return findElements(root, predicate)[0];
}

export function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((entry) => entry.name === name)?.value;
}

export function hasClass(element: HtmlElement, className: string): boolean {
  return (attribute(element, "class") ?? "").split(/\s+/u).includes(className);
}

export function textContent(node: HtmlNode): string {
  if ("value" in node) {
    return node.value;
  }
  return childNodes(node).map((child) => textContent(child)).join("");
}
