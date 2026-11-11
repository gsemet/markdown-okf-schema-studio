/**
 * Small helpers over the parse5 tree for the HTML export: attributes, classes, removal, unwrapping
 * and the creation of elements. Pure module: no host API, no DOM, no Node built-ins.
 */

import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

export type HtmlNode = DefaultTreeAdapterTypes.ChildNode;
export type HtmlElement = DefaultTreeAdapterTypes.Element;
export type HtmlParent = DefaultTreeAdapterTypes.ParentNode;

export function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node;
}

export function attr(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((entry) => entry.name === name)?.value;
}

export function hasAttr(element: HtmlElement, name: string): boolean {
  return element.attrs.some((entry) => entry.name === name);
}

export function setAttr(element: HtmlElement, name: string, value: string): void {
  const existing = element.attrs.find((entry) => entry.name === name);
  if (existing) existing.value = value;
  else element.attrs.push({ name, value });
}

export function removeAttr(element: HtmlElement, name: string): void {
  element.attrs = element.attrs.filter((entry) => entry.name !== name);
}

export function hasClass(element: HtmlElement, name: string): boolean {
  return (attr(element, "class") ?? "").split(/\s+/u).includes(name);
}

/** The child elements of a node. */
export function childElements(node: HtmlParent): HtmlElement[] {
  return node.childNodes.filter(isElement);
}

/** The text of a node and its descendants. */
export function textOf(node: HtmlNode): string {
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(textOf).join("") : "";
}

/** Removes a node from its parent. */
export function detach(node: HtmlNode): void {
  const parent = node.parentNode;
  if (!parent) return;
  const index = parent.childNodes.indexOf(node as never);
  if (index >= 0) parent.childNodes.splice(index, 1);
  node.parentNode = null;
}

/** Puts `nodes` in the place of `old` in its parent. */
export function replaceWith(old: HtmlNode, nodes: HtmlNode[]): void {
  const parent = old.parentNode;
  if (!parent) return;
  const index = parent.childNodes.indexOf(old as never);
  if (index < 0) return;
  for (const node of nodes) {
    node.parentNode?.childNodes.splice(node.parentNode.childNodes.indexOf(node as never), 1);
    node.parentNode = parent;
  }
  parent.childNodes.splice(parent.childNodes.indexOf(old as never), 1, ...(nodes as never[]));
  old.parentNode = null;
}

/** Replaces an element by its children (its text stays, the element goes). */
export function unwrap(element: HtmlElement): void {
  replaceWith(element, [...element.childNodes]);
}

/** Inserts `node` as the child of `parent` at `index`. */
export function insertAt(parent: HtmlParent, node: HtmlNode, index: number): void {
  node.parentNode = parent;
  parent.childNodes.splice(index, 0, node as never);
}

/** One element built from markup. */
export function elementFromHtml(markup: string): HtmlElement {
  const node = parseFragment(markup).childNodes.find(isElement);
  if (!node) throw new Error("No element in the markup");
  node.parentNode = null;
  return node;
}

/** A text node. */
export function textNode(value: string): HtmlNode {
  return { nodeName: "#text", value, parentNode: null } as unknown as HtmlNode;
}

/**
 * Visits every element under `root` in document order. The visitor may remove or unwrap the element
 * it gets: the children of an unwrapped element are visited in its place, those of a removed one are not.
 */
export function walkElements(root: HtmlParent, visit: (element: HtmlElement) => void): void {
  const walk = (parent: HtmlParent, nodes: HtmlNode[]): void => {
    for (const node of nodes) {
      if (!isElement(node)) continue;
      const children = [...node.childNodes];
      visit(node);
      if (node.parentNode === parent) walk(node, [...node.childNodes]);
      else walk(parent, children.filter((child) => child.parentNode === parent));
    }
  };
  walk(root, [...root.childNodes]);
}
