/**
 * A small DOM stand-in for the side-by-side module test (no browser): nodes, a plain HTML parser for
 * the rendered blocks, `cloneNode`, `closest`, `querySelectorAll` with the compound selectors the
 * module uses (`tag`, `.class`, `[attr]`, `[attr="value"]`, `*`, comma lists), a tree walker, the
 * `template` element and click dispatch. It has no layout and no CSS: what needs those is checked in
 * Chromium by the visual campaign (test/visual/capture_sbs_checks.py).
 */

type Listener = () => void;

export class DomNode {
  parentNode: DomElement | null = null;
  get parentElement(): DomElement | null { return this.parentNode instanceof DomElement ? this.parentNode : null; }
  remove(): void { this.parentNode?.removeChild(this); }
}

export class DomText extends DomNode {
  constructor(public data: string) { super(); }
  get textContent(): string { return this.data; }
  cloneNode(): DomText { return new DomText(this.data); }
}

interface Compound { tag?: string; classes: string[]; attrs: [string, string | undefined][] }

function parseCompound(text: string): Compound {
  const compound: Compound = { classes: [], attrs: [] };
  const pattern = /\[([\w-]+)(?:="([^"]*)")?\]|\.([\w-]+)|([\w*-]+)/gu;
  for (const match of text.matchAll(pattern)) {
    if (match[1] !== undefined) compound.attrs.push([match[1], match[2]]);
    else if (match[3] !== undefined) compound.classes.push(match[3]);
    else if (match[4] !== "*") compound.tag = match[4]!.toLowerCase();
  }
  return compound;
}

export class DomElement extends DomNode {
  attrs = new Map<string, string>();
  childNodes: DomNode[] = [];
  listeners = new Map<string, Listener[]>();
  content?: DomFragment;
  ownerDocument?: DomDocument;
  constructor(public tagName: string) { super(); }

  get children(): DomElement[] { return this.childNodes.filter((node): node is DomElement => node instanceof DomElement); }
  get nextElementSibling(): DomElement | null {
    const list = this.parentNode?.children ?? [];
    return list[list.indexOf(this) + 1] ?? null;
  }
  get textContent(): string { return this.childNodes.map((child) => (child as DomText).textContent).join(""); }
  set textContent(value: string) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    if (value !== "") this.appendChild(new DomText(value));
  }
  set innerHTML(html: string) {
    const target = this.content ?? this;
    target.childNodes.forEach((child) => { child.parentNode = null; });
    target.childNodes = [];
    parseHtml(html, this.ownerDocument!, target);
  }

  setAttribute(name: string, value: string): void { this.attrs.set(name, String(value)); }
  getAttribute(name: string): string | null { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string): void { this.attrs.delete(name); }
  hasAttribute(name: string): boolean { return this.attrs.has(name); }

  appendChild<T extends DomNode>(node: T): T { return this.insertBefore(node, null); }
  insertBefore<T extends DomNode>(node: T, reference: DomNode | null): T {
    if (node instanceof DomFragment) {
      for (const child of [...node.childNodes]) this.insertBefore(child, reference);
      return node;
    }
    node.parentNode?.removeChild(node);
    node.parentNode = this;
    const index = reference ? this.childNodes.indexOf(reference) : this.childNodes.length;
    this.childNodes.splice(index, 0, node);
    return node;
  }
  removeChild<T extends DomNode>(node: T): T {
    const index = this.childNodes.indexOf(node);
    if (index >= 0) this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }
  replaceChild(node: DomNode, old: DomNode): DomNode {
    this.insertBefore(node, old);
    this.removeChild(old);
    return old;
  }

  matches(selector: string): boolean {
    return selector.split(",").some((part) => {
      const compound = parseCompound(part.trim());
      const classes = (this.attrs.get("class") ?? "").split(/\s+/u);
      return (compound.tag === undefined || compound.tag === this.tagName.toLowerCase())
        && compound.classes.every((name) => classes.includes(name))
        && compound.attrs.every(([name, value]) => this.attrs.has(name) && (value === undefined || this.attrs.get(name) === value));
    });
  }
  closest(selector: string): DomElement | null {
    for (let node: DomElement | null = this; node; node = node.parentElement) if (node.matches(selector)) return node;
    return null;
  }
  descendants(): DomElement[] { return descendantsOf(this); }
  querySelectorAll(selector: string): DomElement[] { return this.descendants().filter((element) => element.matches(selector)); }
  querySelector(selector: string): DomElement | null { return this.querySelectorAll(selector)[0] ?? null; }

  cloneNode(deep: boolean): DomElement {
    const copy = new DomElement(this.tagName);
    copy.ownerDocument = this.ownerDocument;
    copy.attrs = new Map(this.attrs);
    if (deep) for (const child of this.childNodes) copy.appendChild((child as DomElement | DomText).cloneNode(true));
    return copy;
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  /** A click: the listeners run unless the element is disabled, as a browser does. */
  click(): void {
    if (this.attrs.has("disabled")) return;
    for (const listener of this.listeners.get("click") ?? []) listener();
  }
}

function descendantsOf(node: { childNodes: DomNode[] }): DomElement[] {
  const found: DomElement[] = [];
  for (const child of node.childNodes) {
    if (child instanceof DomElement) {
      found.push(child, ...descendantsOf(child));
    }
  }
  return found;
}

export class DomFragment {
  childNodes: DomNode[] = [];
  appendChild<T extends DomNode>(node: T): T {
    node.parentNode?.removeChild(node);
    this.childNodes.push(node);
    return node;
  }
  querySelectorAll(selector: string): DomElement[] { return descendantsOf(this).filter((element) => element.matches(selector)); }
}

const VOID = new Set(["br", "hr", "img", "input", "meta", "link"]);

/** Parses the plain markup the tests render (tags, quoted attributes, text; no entities). */
function parseHtml(html: string, document: DomDocument, into: { appendChild(node: DomNode): unknown }): void {
  const stack: { appendChild(node: DomNode): unknown }[] = [into];
  for (const match of html.matchAll(/<(\/?)([\w-]+)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/gu)) {
    const top = stack[stack.length - 1]!;
    if (match[5] !== undefined) {
      top.appendChild(new DomText(match[5]));
    } else if (match[1] === "/") {
      stack.pop();
    } else {
      const element = document.createElement(match[2]!);
      for (const attr of match[3]!.matchAll(/([\w-]+)(?:="([^"]*)")?/gu)) element.setAttribute(attr[1]!, attr[2] ?? "");
      top.appendChild(element);
      if (match[4] !== "/" && !VOID.has(match[2]!.toLowerCase())) stack.push(element);
    }
  }
}

export class DomDocument {
  documentElement = new DomElement("html");
  body = new DomElement("body");
  constructor(html: string) {
    this.documentElement.ownerDocument = this;
    this.body.ownerDocument = this;
    this.documentElement.appendChild(this.body);
    parseHtml(html, this, this.body);
  }
  createElement(tag: string): DomElement {
    const element = new DomElement(tag);
    element.ownerDocument = this;
    if (tag === "template") element.content = new DomFragment();
    return element;
  }
  createTextNode(text: string): DomText { return new DomText(text); }
  createDocumentFragment(): DomFragment { return new DomFragment(); }
  getElementById(id: string): DomElement | null { return this.body.descendants().find((element) => element.getAttribute("id") === id) ?? null; }
  querySelector(selector: string): DomElement | null { return this.body.querySelector(selector); }
  /** Text nodes of `root` in document order (the module asks for `NodeFilter.SHOW_TEXT`, 4). */
  createTreeWalker(root: DomElement): { nextNode(): DomText | null } {
    const texts: DomText[] = [];
    const walk = (node: DomElement): void => {
      for (const child of node.childNodes) {
        if (child instanceof DomText) texts.push(child);
        else walk(child as DomElement);
      }
    };
    walk(root);
    let index = 0;
    return { nextNode: () => texts[index++] ?? null };
  }
}
