/**
 * A small least-recently-used cache bounded by entry count and by total cost (characters of key
 * plus value), for results that depend only on their key's content: highlighted code, typeset
 * maths, the first heading of a document. A hit never goes stale, so there is nothing to
 * invalidate; the bounds keep a long editing session from growing the heap.
 */
export class BoundedCache<V> {
  private readonly entries = new Map<string, { value: V; cost: number }>();

  private totalCost = 0;

  public constructor(
    private readonly maxEntries: number,
    private readonly maxCost: number,
    private readonly costOf: (key: string, value: V) => number = (key) => key.length,
  ) {}

  public get size(): number {
    return this.entries.size;
  }

  public get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    // Re-insert so the Map order stays least- to most-recently used.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  public set(key: string, value: V): void {
    const cost = this.costOf(key, value);
    if (cost > this.maxCost) return;
    const existing = this.entries.get(key);
    if (existing) {
      this.totalCost -= existing.cost;
      this.entries.delete(key);
    }
    this.entries.set(key, { value, cost });
    this.totalCost += cost;
    for (const [oldest, entry] of this.entries) {
      if (this.entries.size <= this.maxEntries && this.totalCost <= this.maxCost) break;
      this.entries.delete(oldest);
      this.totalCost -= entry.cost;
    }
  }

  public clear(): void {
    this.entries.clear();
    this.totalCost = 0;
  }
}
