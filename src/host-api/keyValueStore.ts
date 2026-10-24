/**
 * The `KeyValueStore` port: small values the host keeps for the workspace between sessions (the
 * reader's choices: theme mode, view preferences, edit and palette mode, collapsed descriptions).
 */

/** Values stored by key; `update` with `undefined` removes the key. */
export interface KeyValueStore {
  /** The value stored under `key`, if any. */
  get<T>(key: string): T | undefined;
  /** Stores `value` under `key` (`undefined` removes it). */
  update(key: string, value: unknown): PromiseLike<void>;
  /** The keys stored now. */
  keys(): readonly string[];
}
