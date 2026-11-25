/**
 * The live chart views of the page, kept by key (PERF-07, pure, generic over the entry).
 *
 * A chart is drawn again only when its source, data or theme changed. A view whose chart node left
 * the page (a keyed morph replaced the block, or the node moved to another key) is detached and can
 * be reused by a node that needs its key again. A view still attached belongs to its chart: two
 * identical charts each get their own.
 */

/** A kept view: where it sits and how it is released. */
export interface ChartViewEntry {
  /** True when the view's host is no longer in the page. */
  isDetached(): boolean;
  /** Releases the view (Vega's `finalize`). */
  finalize(): void;
}

export type ChartViewPlan<T> =
  | { action: "keep" }
  | { action: "reuse"; entry: T }
  | { action: "render" };

export interface ChartViewCache<T extends ChartViewEntry> {
  /** What to do for a chart last drawn under `drawnKey` that now needs `key`. */
  plan(drawnKey: string | undefined, key: string): ChartViewPlan<T>;
  store(key: string, entry: T): void;
  /** True when `entry` is the entry kept for `key`. */
  holds(key: string, entry: T): boolean;
  readonly size: number;
}

/** Finalizes a view that leaves the cache, only when it is detached: an attached one is left to its chart. */
function release(entry: ChartViewEntry): void {
  if (entry.isDetached()) entry.finalize();
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-009
export function createChartViewCache<T extends ChartViewEntry>(limit = 16): ChartViewCache<T> {
  const entries = new Map<string, T>();
  return {
    plan(drawnKey, key) {
      if (drawnKey === key) return { action: "keep" };
      const entry = entries.get(key);
      if (entry === undefined || !entry.isDetached()) return { action: "render" };
      entries.delete(key);
      entries.set(key, entry);
      return { action: "reuse", entry };
    },
    store(key, entry) {
      const previous = entries.get(key);
      if (previous !== undefined && previous !== entry) release(previous);
      entries.delete(key);
      entries.set(key, entry);
      while (entries.size > limit) {
        const oldest = entries.keys().next().value as string;
        release(entries.get(oldest)!);
        entries.delete(oldest);
      }
    },
    holds: (key, entry) => entries.get(key) === entry,
    get size() {
      return entries.size;
    },
  };
}
