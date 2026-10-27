/**
 * The browser side of the find bar: DOM ranges over the matches and their paint with the CSS
 * Custom Highlight API (`::highlight(studio-find)`), which colours text without changing the DOM,
 * so a content update or an editor never meets a wrapper element.
 */

import type { PageMatch } from "./findIndex";

/** The names of the two highlights: every match, and the current one on top. */
const FIND_HIGHLIGHT = "studio-find";
const FIND_HIGHLIGHT_CURRENT = "studio-find-current";

/** A DOM range over one match. */
export function matchRange(document: Document, match: PageMatch): Range {
  const range = document.createRange();
  range.setStart(match.startNode, match.startOffset);
  range.setEnd(match.endNode, match.endOffset);
  return range;
}

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}

/** Paints `ranges`, and `current` over them; an empty list clears the paint. Does nothing without the API. */
export function paintMatches(window: Window & typeof globalThis, ranges: readonly Range[], current: Range | undefined): void {
  const registry = (window as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS?.highlights;
  const Highlight = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!registry || !Highlight) return;
  if (ranges.length === 0) {
    registry.delete(FIND_HIGHLIGHT);
    registry.delete(FIND_HIGHLIGHT_CURRENT);
    return;
  }
  registry.set(FIND_HIGHLIGHT, new Highlight(...ranges));
  if (current) registry.set(FIND_HIGHLIGHT_CURRENT, new Highlight(current));
  else registry.delete(FIND_HIGHLIGHT_CURRENT);
}
