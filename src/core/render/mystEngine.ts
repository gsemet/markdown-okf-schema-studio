/**
 * The MyST engine: the parser and the HTML writer, loaded once and shared by every render. Both
 * packages are ESM-only, so they come through a cached dynamic import.
 */

import type { MystNode } from "./mystNode";

/** Parser options shared by every `mystParse` call so all parse sites agree. */
export const MYST_PARSE_OPTIONS = { extensions: { strikethrough: true } };

/** The MyST parser and HTML writer. */
export interface MystEngine {
  mystParse: (source: string, options?: typeof MYST_PARSE_OPTIONS) => MystNode;
  mystToHtml: (ast: MystNode) => string;
}

// myst-parser and myst-to-html are ESM-only, so they are pulled in through a cached
// dynamic import rather than a top-level require.
let enginePromise: Promise<MystEngine> | undefined;

/** The engine, imported once (the first call starts the import, later calls share it). */
export async function loadEngine(): Promise<MystEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [parser, writer] = await Promise.all([
        import("myst-parser"),
        import("myst-to-html"),
      ]);
      return { mystParse: parser.mystParse, mystToHtml: writer.mystToHtml } as MystEngine;
    })();
  }
  return enginePromise;
}

/** Parses source with the same options the renderer uses; for tests of tree-based checks. */
export async function parseMystSource(source: string): Promise<MystNode> {
  const { mystParse } = await loadEngine();
  return mystParse(source, MYST_PARSE_OPTIONS);
}

/** Warms the engine so the first keystroke does not pay the module-load cost. */
export function preloadMystEngine(): void {
  void loadEngine().catch(() => undefined);
}
