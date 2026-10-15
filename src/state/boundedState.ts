/** Most recent documents whose per-document preview state is kept. */
export const MAX_DOCUMENT_STATES = 200;

/** Workspace-state key holding the bounded `descriptionsCollapsed` map. */
export const DESCRIPTIONS_COLLAPSED_KEY = "descriptionsCollapsedByDocument";

/** Prefix of the legacy one-key-per-document entries that migration folds into the map. */
export const LEGACY_DESCRIPTIONS_PREFIX = "descriptionsCollapsed:";

/** The slice of `vscode.Memento` the persistence helpers need. */
export interface KeyValueStorage {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
  keys(): readonly string[];
}

/** A Map that keeps at most `capacity` entries; reading or writing an entry makes it most recent. */
export class BoundedMap<V> {
  private readonly entriesByKey = new Map<string, V>();

  constructor(readonly capacity: number = MAX_DOCUMENT_STATES, initial?: Iterable<readonly [string, V]>) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError("BoundedMap capacity must be a positive integer.");
    }
    for (const [key, value] of initial ?? []) {
      this.set(key, value);
    }
  }

  get size(): number {
    return this.entriesByKey.size;
  }

  /** Returns the value and marks the entry as most recently used. */
  get(key: string): V | undefined {
    if (!this.entriesByKey.has(key)) {
      return undefined;
    }
    const value = this.entriesByKey.get(key) as V;
    this.entriesByKey.delete(key);
    this.entriesByKey.set(key, value);
    return value;
  }

  /** Returns the value without changing the recency order. */
  peek(key: string): V | undefined {
    return this.entriesByKey.get(key);
  }

  has(key: string): boolean {
    return this.entriesByKey.has(key);
  }

  set(key: string, value: V): this {
    this.entriesByKey.delete(key);
    this.entriesByKey.set(key, value);
    while (this.entriesByKey.size > this.capacity) {
      const oldest = this.entriesByKey.keys().next().value as string;
      this.entriesByKey.delete(oldest);
    }
    return this;
  }

  delete(key: string): boolean {
    return this.entriesByKey.delete(key);
  }

  /** Entries from least to most recently used. */
  entries(): [string, V][] {
    return [...this.entriesByKey];
  }
}

/** Reads the persisted map (least to most recent), ignoring anything malformed. */
export function loadCollapsedMap(
  storage: KeyValueStorage,
  capacity: number = MAX_DOCUMENT_STATES,
): BoundedMap<boolean> {
  const map = new BoundedMap<boolean>(capacity);
  const stored = storage.get<unknown>(DESCRIPTIONS_COLLAPSED_KEY);
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      if (Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "boolean") {
        map.set(entry[0], entry[1]);
      }
    }
  }
  return map;
}

/** Persists the whole map under its single key. */
export function saveCollapsedMap(
  storage: KeyValueStorage,
  map: BoundedMap<boolean>,
): PromiseLike<void> {
  return storage.update(DESCRIPTIONS_COLLAPSED_KEY, map.entries());
}

/**
 * Folds the legacy `descriptionsCollapsed:<uri>` keys into the map and deletes them. The map is
 * updated synchronously, so readers see the migrated values at once; the returned promise settles
 * when storage has been rewritten. Entries already in the map win over legacy ones.
 */
export function migrateLegacyCollapsedKeys(
  storage: KeyValueStorage,
  map: BoundedMap<boolean>,
): Promise<void> {
  const legacyKeys = storage.keys().filter((key) => key.startsWith(LEGACY_DESCRIPTIONS_PREFIX));
  if (legacyKeys.length === 0) {
    return Promise.resolve();
  }
  const current = map.entries();
  const migrated = new BoundedMap<boolean>(map.capacity);
  for (const key of legacyKeys) {
    const value = storage.get<unknown>(key);
    if (typeof value === "boolean") {
      migrated.set(key.slice(LEGACY_DESCRIPTIONS_PREFIX.length), value);
    }
  }
  // Legacy entries are older than anything the map already holds.
  const merged = new BoundedMap<boolean>(map.capacity, [...migrated.entries(), ...current]);
  for (const [key, value] of merged.entries()) {
    map.set(key, value);
  }
  return (async () => {
    await saveCollapsedMap(storage, map);
    for (const key of legacyKeys) {
      await storage.update(key, undefined);
    }
  })();
}
