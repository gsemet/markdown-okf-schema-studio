/** A minimal DOM shared by the webview module tests (T43 copy of the T42 fake). */
export type Listener = (event: any) => void;

/** A minimal DOM: elements and text nodes, the selectors the module uses, and event dispatch. */
export class FakeNode {
  parentNode: FakeElement | null = null;
  get nodeType(): number { return this instanceof FakeElement ? 1 : 3; }
  get previousSibling(): FakeNode | null {
    const list = this.parentNode?.childNodes ?? [];
    return list[list.indexOf(this) - 1] ?? null;
  }
  get nextSibling(): FakeNode | null {
    const list = this.parentNode?.childNodes ?? [];
    return list[list.indexOf(this) + 1] ?? null;
  }
  remove(): void { this.parentNode?.removeChild(this); }
}

export class FakeText extends FakeNode {
  constructor(public nodeValue: string) { super(); }
  get textContent(): string { return this.nodeValue; }
}

export class FakeElement extends FakeNode {
  attrs = new Map<string, string>();
  childNodes: FakeNode[] = [];
  listeners = new Map<string, Listener[]>();
  styles = new Map<string, string>();
  constructor(public tagName: string, attrs: Record<string, string> = {}) {
    super();
    for (const [key, value] of Object.entries(attrs)) this.attrs.set(key, value);
  }
  get firstChild(): FakeNode | null { return this.childNodes[0] ?? null; }
  get style() { return { setProperty: (name: string, value: string) => this.styles.set(name, value) }; }
  get textContent(): string { return this.childNodes.map((child) => (child as any).textContent).join(""); }
  set textContent(value: string) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    if (value !== "") this.appendChild(new FakeText(value));
  }
  setAttribute(name: string, value: string) { this.attrs.set(name, String(value)); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  hasAttribute(name: string) { return this.attrs.has(name); }
  detach(node: FakeNode) { node.parentNode?.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1); }
  appendChild<T extends FakeNode>(node: T): T { return this.insertBefore(node, null); }
  insertBefore<T extends FakeNode>(node: T, reference: FakeNode | null): T {
    this.detach(node);
    node.parentNode = this;
    const index = reference ? this.childNodes.indexOf(reference) : this.childNodes.length;
    this.childNodes.splice(index, 0, node);
    return node;
  }
  removeChild<T extends FakeNode>(node: T): T { this.detach(node); node.parentNode = null; return node; }
  replaceChild(node: FakeNode, old: FakeNode) { this.insertBefore(node, old); this.removeChild(old); return old; }
  matchesToken(token: string): boolean {
    if (token.startsWith(".")) return (this.attrs.get("class") ?? "").split(/\s+/u).includes(token.slice(1));
    if (token.startsWith("[")) return this.attrs.has(token.slice(1, -1));
    return this.tagName.toLowerCase() === token.toLowerCase();
  }
  matches(selector: string): boolean {
    return selector.split(",").map((token) => token.trim()).some((token) => this.matchesToken(token));
  }
  closest(selector: string): FakeElement | null {
    for (let node: FakeElement | null = this; node; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
  }
  contains(node: FakeNode | null): boolean {
    for (let current: FakeNode | null = node; current; current = current.parentNode) if (current === this) return true;
    return false;
  }
  descendants(): FakeElement[] {
    const found: FakeElement[] = [];
    const walk = (node: FakeElement) => {
      for (const child of node.childNodes) if (child instanceof FakeElement) { found.push(child); walk(child); }
    };
    walk(this);
    return found;
  }
  querySelectorAll(selector: string) { return this.descendants().filter((element) => element.matches(selector)); }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
  getBoundingClientRect() { return { left: 10, top: 10, right: 50, bottom: 30, width: 40, height: 20 }; }
  addEventListener(type: string, listener: Listener) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]); }
  fire(type: string, event: Record<string, any> = {}) {
    const calls = { prevented: 0, stopped: 0 };
    let halted = false;
    const full = {
      type, target: this, preventDefault: () => calls.prevented++,
      stopImmediatePropagation: () => { calls.stopped++; halted = true; }, ...event,
    };
    // Capture handlers on the document run before the ones registered after them.
    for (const listener of (this.ownerDocument?.listeners.get(type) ?? [])) {
      if (halted) break;
      listener(full);
    }
    return calls;
  }
  ownerDocument?: FakeDocument;
}

export class FakeDocument extends FakeElement {
  body = new FakeElement("body");
  content = new FakeElement("main");
  constructor() {
    super("html");
    this.appendChild(this.body);
    this.body.appendChild(this.content);
    this.ownerDocument = this;
  }
  createElement(tag: string) { const element = new FakeElement(tag); element.ownerDocument = this; return element; }
  createTextNode(text: string) { return new FakeText(text); }
  add(tag: string, attrs: Record<string, string>, parent: FakeElement = this.content, text?: string) {
    const element = this.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    if (text !== undefined) element.appendChild(new FakeText(text));
    parent.appendChild(element);
    return element;
  }
}


/**
 * Puts the class the page modules test with `instanceof Element` on the global object (Node has no
 * DOM). Each test file runs in its own process, so the global never reaches another file.
 */
export function provideGlobalElement(element: abstract new (...args: never[]) => unknown): void {
  (globalThis as { Element?: unknown }).Element = element;
}
