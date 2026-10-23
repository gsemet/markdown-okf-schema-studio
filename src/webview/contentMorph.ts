/**
 * Keyed replacement of the preview content (PERF-05 step 2). Injected into the page script with
 * `.toString()`, so the bodies must not use anything defined outside them.
 *
 * A content patch carries the whole sanitised content of the new render. Instead of replacing
 * every node, the page keeps each top-level block whose host HTML is unchanged: the node, and what
 * the page did to it (a drawn Mermaid diagram, a decoded image, the link hints), stays in place.
 * The key of a kept node is the HTML the host sent for it, recorded when it was inserted; the key
 * of an incoming node is its own HTML, parsed in an inert `<template>`.
 */

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

export interface ContentMorph {
  /** Records the host HTML of the container's blocks as they are now (call before changing them). */
  record(container: Element): void;
  /** Replaces the container's content with `html`, keeping unchanged blocks. */
  replace(container: Element, html: string): { kept: number; inserted: number };
}

export function installContentMorph(
  document: Document,
  planKeyedMorph: (current: readonly (string | undefined)[], incoming: readonly (string | undefined)[]) => number[],
): ContentMorph {
  const sources = new WeakMap<Node, string>();
  const record = (container: Element): void => {
    Array.from(container.children ?? []).forEach((child) => {
      if (typeof child.outerHTML === "string") sources.set(child, child.outerHTML);
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
      const keyOf = (node: Node): string | undefined => node.nodeType === 1 ? (node as Element).outerHTML : undefined;
      const incomingKeys = incoming.map(keyOf);
      const plan = planKeyedMorph(current.map((node) => sources.get(node)), incomingKeys);
      let kept = 0;
      const nodes = incoming.map((node, index) => {
        const keep = plan[index] ?? -1;
        if (keep >= 0) {
          kept += 1;
          return current[keep] as Node;
        }
        const key = incomingKeys[index];
        if (key !== undefined) sources.set(node, key);
        return node;
      });
      container.replaceChildren(...nodes);
      return { kept, inserted: nodes.length - kept };
    },
  };
}
