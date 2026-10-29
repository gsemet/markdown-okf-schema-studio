/**
 * A rendered document as the page sees it, for the page helpers that read mapped blocks
 * (`createMappedBlocks`): the Markdown is rendered, passed through the preview sanitizer with the
 * source mapping, parsed with parse5, and its elements are wrapped in the few DOM methods those
 * helpers call. Selectors are limited to compounds of a tag name, classes and attribute tests
 * (`ul, ol`, `[a][b]`, `aside[a="v"]`); any other selector throws, so a test never passes on a
 * selector the wrapper does not understand.
 */

import { parse, type DefaultTreeAdapterTypes } from "parse5";

import { renderMyst } from "../../src/core/render/mystRenderer";
import { rewriteSphinxHtml } from "../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../src/core/security/resource-policy";

type Parse5Element = DefaultTreeAdapterTypes.Element;
type Parse5Node = DefaultTreeAdapterTypes.Node;

interface SimpleSelector {
  readonly tag: string | undefined;
  readonly attributes: ReadonlyArray<{ readonly name: string; readonly value: string | undefined }>;
  readonly classes: readonly string[];
}

function parseSelector(selector: string): SimpleSelector[] {
  return selector.split(",").map((part) => {
    const match = part.trim().match(/^([a-z][a-z0-9]*)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/u);
    if (!match || (!match[1] && !match[2] && !match[3])) throw new Error(`unsupported selector in the test DOM: ${selector}`);
    const attributes = [...match[3].matchAll(/\[([^\]=]+)(?:="([^"]*)")?\]/gu)]
      .map((entry) => ({ name: entry[1], value: entry[2] }));
    return { tag: match[1], attributes, classes: match[2].split(".").filter(Boolean) };
  });
}

function isParse5Element(node: Parse5Node): node is Parse5Element {
  return "tagName" in node && "attrs" in node;
}

/** One wrapper per parse5 element, so that the same element is always the same object. */
const wrappers = new WeakMap<Parse5Element, MappedElement>();

function wrap(node: Parse5Element, parent: MappedElement | null): MappedElement {
  let element = wrappers.get(node);
  if (!element) {
    element = new MappedElement(node, parent);
    wrappers.set(node, element);
  }
  return element;
}

/** One element of the rendered page, with the DOM methods the mapped-block helpers call. */
export class MappedElement {
  public constructor(private readonly node: Parse5Element, public readonly parentElement: MappedElement | null) {}

  public get tagName(): string {
    return this.node.tagName.toUpperCase();
  }

  public get children(): MappedElement[] {
    return this.node.childNodes.filter(isParse5Element).map((child) => wrap(child, this));
  }

  public get textContent(): string {
    const text = (node: Parse5Node): string => ("value" in node && typeof node.value === "string"
      ? node.value
      : ("childNodes" in node ? node.childNodes.map(text).join("") : ""));
    return text(this.node);
  }

  public getAttribute(name: string): string | null {
    return this.node.attrs.find((entry) => entry.name === name)?.value ?? null;
  }

  public matches(selector: string): boolean {
    return parseSelector(selector).some((simple) =>
      (simple.tag === undefined || simple.tag.toUpperCase() === this.tagName)
      && simple.classes.every((name) => (this.getAttribute("class") ?? "").split(/\s+/u).includes(name))
      && simple.attributes.every((test) => {
        const value = this.getAttribute(test.name);
        return value !== null && (test.value === undefined || value === test.value);
      }));
  }

  public closest(selector: string): MappedElement | null {
    for (let current: MappedElement | null = this; current; current = current.parentElement) {
      if (current.matches(selector)) return current;
    }
    return null;
  }

  public contains(other: MappedElement | null | undefined): boolean {
    for (let current = other ?? null; current; current = current.parentElement) {
      if (current === this) return true;
    }
    return false;
  }

  public querySelectorAll(selector: string): MappedElement[] {
    const found: MappedElement[] = [];
    const visit = (element: MappedElement): void => {
      for (const child of element.children) {
        if (child.matches(selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }

  public querySelector(selector: string): MappedElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

/** The rendered page of `source`, mapped to `sourceFile` and `documentId` like the preview. */
export async function renderMappedPage(source: string, sourceFile: string, documentId: string) {
  const rendered = await renderMyst(source);
  const rewritten = rewriteSphinxHtml(rendered.html, {
    outputRoot: "/w",
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    sourceMapping: { sourceFile, documentId },
    resolveResource: (request) => ({ path: request, uri: `vscode-resource:${request}` }),
    resolveNavigation: () => ({ kind: "blocked", reason: "blocked" }),
  });
  const html = parse(rewritten.html).childNodes.find(isParse5Element)!;
  const root = wrap(html, null);
  /** The innermost element whose text is exactly `text` (the clicked element). */
  const elementWithText = (text: string): MappedElement => {
    const matches = [root, ...root.querySelectorAll("p"), ...root.querySelectorAll("li")]
      .filter((element) => element.textContent.trim() === text);
    if (matches.length === 0) throw new Error(`no element of the page reads "${text}"`);
    return matches[matches.length - 1];
  };
  return { document: root, elementWithText };
}
