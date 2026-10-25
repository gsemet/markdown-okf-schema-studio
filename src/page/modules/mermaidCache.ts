/**
 * Drawings of the page's Mermaid diagrams, kept by source and theme (PERF-07, pure).
 *
 * A diagram is drawn again only when its source or the theme variables changed. A diagram whose
 * node was replaced (a content update) with the same source reuses the earlier drawing, and an
 * attribute change that leaves the theme as it was draws nothing.
 */

export type MermaidPlan =
  | { action: "keep" }
  | { action: "reuse"; image: string }
  | { action: "render" };

export interface MermaidCache {
  /** What to do for a diagram last drawn under `drawnKey` that now needs `key`. */
  plan(drawnKey: string | undefined, key: string): MermaidPlan;
  store(key: string, image: string): void;
  readonly size: number;
}

/** The key of a diagram: the theme variables and the source, which cannot run into each other. */
export function diagramKey(themeVariables: Readonly<Record<string, string>>, source: string): string {
  return JSON.stringify([themeVariables, source]);
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-009
export function createMermaidCache(limit = 64): MermaidCache {
  const images = new Map<string, string>();
  return {
    plan(drawnKey, key) {
      if (drawnKey === key) return { action: "keep" };
      const image = images.get(key);
      if (image === undefined) return { action: "render" };
      images.delete(key);
      images.set(key, image);
      return { action: "reuse", image };
    },
    store(key, image) {
      images.delete(key);
      images.set(key, image);
      while (images.size > limit) {
        const oldest = images.keys().next().value as string;
        images.delete(oldest);
      }
    },
    get size() {
      return images.size;
    },
  };
}
