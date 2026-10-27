/**
 * Keyed replacement of the preview content (PERF-05 step 2).
 *
 * A content patch carries the whole sanitised content of the new render. Instead of replacing
 * every node, the page keeps each top-level block whose host HTML is unchanged: the node, and what
 * the page did to it (a drawn Mermaid diagram, a decoded image, the link hints), stays in place.
 * The key of a kept node is a hash of the HTML the host sent for it, recorded when it was inserted;
 * the key of an incoming node is the hash of its own HTML, parsed in an inert `<template>`. Both go
 * through {@link morphKey}, which removes what VS Code added to the first page when it loaded it and
 * the source-line attributes of the host (`data-line`, `data-sphinx-source-line`,
 * `data-sphinx-source-end-line`, `data-sphinx-preview-block`). A line inserted above a block
 * changes only those attributes in it, so the block keeps its key and stays in place; the kept node
 * gets the new attributes written onto it, and the insertion bars of edit mode that follow a kept
 * block stay with it.
 */

// @implements_req SwRS-MDOKFSTUDIO-LIFE-069
/**
 * For each incoming key, the index of the current node to keep in its place, or -1 for the
 * incoming node itself. Equal keys pair in document order; a node is kept at most once.
 */
export function planKeyedMorph(
  currentKeys: readonly (string | undefined)[],
  incomingKeys: readonly (string | undefined)[],
): number[] {
  const available = new Map<string, number[]>();
  currentKeys.forEach((key, index) => {
    if (key === undefined) return;
    const list = available.get(key);
    if (list) list.push(index);
    else available.set(key, [index]);
  });
  return incomingKeys.map((key) => {
    if (key === undefined) return -1;
    const list = available.get(key);
    return list !== undefined && list.length > 0 ? list.shift() as number : -1;
  });
}

/**
 * The attributes that say where a block sits in the source. They change for every block below an
 * edit, so they are not part of the key; the page copies them onto the kept node instead.
 */
export const SOURCE_POSITION_ATTRIBUTES = [
  "data-line",
  "data-sphinx-source-line",
  "data-sphinx-source-end-line",
  "data-sphinx-preview-block",
] as const;

const POSITION_ATTRIBUTE_PATTERN = new RegExp(` (?:${SOURCE_POSITION_ATTRIBUTES.join("|")})="[^"]*"`, "gu");
const INSERT_POINT_CLASS = "sphinx-preview-insert-point";

/** The source-position attributes of a block's HTML, in order: what the key leaves out. */
export function positionSignature(html: string): string {
  return (html.match(POSITION_ATTRIBUTE_PATTERN) ?? []).join("");
}

/**
 * A short key for a string: two 32-bit hashes and the length (a collision needs all three equal).
 * The page keeps this instead of the whole HTML of every block.
 */
export function hashKey(text: string): string {
  let first = 0xdeadbeef;
  let second = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
  return `${text.length}:${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

/**
 * The key of a block: its HTML without the source-position attributes and without the link titles
 * that VS Code's webview loader adds. When
 * VS Code loads a page, every link without a title gets its `href` as title (`toContentHtml` in the
 * webview's `pre/index.html`); a content patch does not go through that loader. Without this, every
 * block of the first page that holds a link (a diagram caption, a reference) misses its key once
 * and is rebuilt, its drawn Mermaid diagram included. Serialised HTML writes each attribute as
 * `name="value"`, so a string pass over it is exact; a title the host wrote itself and that differs
 * from the link target stays in the key.
 */
export function morphKey(source: string): string {
  const html = source.indexOf(" data-") < 0 ? source : source.replace(POSITION_ATTRIBUTE_PATTERN, "");
  if (html.indexOf(" title=\"") < 0) return html;
  return html.replace(/<a(\s[^>]*)?>/gu, (tag: string, attributes: string | undefined) => {
    if (!attributes) return tag;
    const href = / href="([^"]*)"/u.exec(attributes);
    const title = / title="([^"]*)"/u.exec(attributes);
    if (!href || !title || href[1] !== title[1]) return tag;
    return "<a" + attributes.replace(title[0], "") + ">";
  });
}

export interface ContentMorph {
  /** Records the host HTML of the container's blocks as they are now (call before changing them). */
  record(container: Element): void;
  /** Replaces the container's content with `html`, keeping unchanged blocks. */
  replace(container: Element, html: string): { kept: number; inserted: number };
}

interface Recorded {
  key: string;
  /** The source-position attributes the node carries now, as the host wrote them. */
  position: string;
}

// Writes the source-position attributes of `fresh` (and of its descendants, which have the same
// shape: the keys are equal) onto `kept`.
function copyPositions(kept: Element, fresh: Element): void {
  for (const name of SOURCE_POSITION_ATTRIBUTES) {
    const value = fresh.getAttribute(name);
    if (value === null) {
      if (kept.getAttribute(name) !== null) kept.removeAttribute(name);
    } else if (kept.getAttribute(name) !== value) {
      kept.setAttribute(name, value);
    }
  }
  const keptChildren = Array.from(kept.children ?? []);
  const freshChildren = Array.from(fresh.children ?? []);
  if (keptChildren.length !== freshChildren.length) return;
  keptChildren.forEach((child, index) => copyPositions(child, freshChildren[index] as Element));
}

const isInsertPoint = (node: Node | undefined): node is Element =>
  node !== undefined && node.nodeType === 1
  && String((node as Element).className ?? "").split(" ").includes(INSERT_POINT_CLASS);

export function installContentMorph(
  document: Document,
  planKeyedMorph: (current: readonly (string | undefined)[], incoming: readonly (string | undefined)[]) => number[],
  morphKey: (html: string) => string = (html) => html,
): ContentMorph {
  const sources = new WeakMap<Node, Recorded>();
  const describe = (html: string): Recorded => ({ key: hashKey(morphKey(html)), position: positionSignature(html) });
  const record = (container: Element): void => {
    Array.from(container.children ?? []).forEach((child) => {
      if (typeof child.outerHTML === "string") sources.set(child, describe(child.outerHTML));
    });
  };
  return {
    record,
    replace(container, html) {
      const template = typeof document.createElement === "function" ? document.createElement("template") : undefined;
      if (!template || !("content" in template) || typeof container.replaceChildren !== "function") {
        container.innerHTML = html;
        record(container);
        return { kept: 0, inserted: container.children?.length ?? 0 };
      }
      template.innerHTML = html;
      const incoming = Array.from(template.content.childNodes);
      const current = Array.from(container.childNodes);
      const described = incoming.map((node) => node.nodeType === 1 ? describe((node as Element).outerHTML) : undefined);
      const plan = planKeyedMorph(current.map((node) => sources.get(node)?.key), described.map((entry) => entry?.key));
      let kept = 0;
      let fresh = 0;
      const nodes: Node[] = [];
      incoming.forEach((node, index) => {
        const keep = plan[index] ?? -1;
        const entry = described[index];
        if (keep < 0) {
          if (entry) sources.set(node, entry);
          fresh += 1;
          nodes.push(node);
          return;
        }
        kept += 1;
        const old = current[keep] as Node;
        const recorded = sources.get(old);
        // Only a moved block (a line was inserted above it) needs its attributes written again.
        if (entry && recorded && recorded.position !== entry.position) {
          copyPositions(old as Element, node as Element);
          recorded.position = entry.position;
        }
        nodes.push(old);
        // The insertion bars of edit mode follow the kept block they were made for.
        const after = current[keep + 1];
        if (isInsertPoint(after) && sources.get(after) === undefined) nodes.push(after);
      });
      container.replaceChildren(...nodes);
      return { kept, inserted: fresh };
    },
  };
}
