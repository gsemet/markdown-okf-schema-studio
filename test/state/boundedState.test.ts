import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  BoundedMap,
  DESCRIPTIONS_COLLAPSED_KEY,
  KeyValueStorage,
  loadCollapsedMap,
  migrateLegacyCollapsedKeys,
  saveCollapsedMap,
} from "../../src/state/boundedState";

class FakeStorage implements KeyValueStorage {
  readonly data = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }
  async update(key: string, value: unknown): Promise<void> {
    if (value === undefined) {
      this.data.delete(key);
    } else {
      this.data.set(key, value);
    }
  }
  keys(): readonly string[] {
    return [...this.data.keys()];
  }
}

test("evicts the least recently set entry once the cap is exceeded", () => {
  const map = new BoundedMap<number>(3);
  for (const [i, key] of ["a", "b", "c", "d"].entries()) map.set(key, i);
  assert.deepEqual(map.entries().map(([key]) => key), ["b", "c", "d"]);
  assert.equal(map.size, 3);
  assert.equal(map.has("a"), false);
});

test("reading an entry protects it from eviction, peek does not", () => {
  const map = new BoundedMap<number>(3, [["a", 1], ["b", 2], ["c", 3]]);
  assert.equal(map.get("a"), 1);
  map.set("d", 4);
  assert.deepEqual(map.entries().map(([key]) => key), ["c", "a", "d"]);
  const peeked = new BoundedMap<number>(2, [["a", 1], ["b", 2]]);
  assert.equal(peeked.peek("a"), 1);
  peeked.set("c", 3);
  assert.equal(peeked.has("a"), false);
});

test("overwriting a key refreshes it and never grows the map", () => {
  const map = new BoundedMap<number>(2, [["a", 1], ["b", 2]]);
  map.set("a", 10);
  map.set("c", 3);
  assert.deepEqual(map.entries(), [["a", 10], ["c", 3]]);
});

test("default capacity is 200 and rejects invalid capacities", () => {
  const map = new BoundedMap<number>();
  for (let i = 0; i < 250; i += 1) map.set(`k${i}`, i);
  assert.equal(map.size, 200);
  assert.equal(map.has("k49"), false);
  assert.equal(map.has("k50"), true);
  assert.throws(() => new BoundedMap(0), RangeError);
});

test("migration folds legacy keys into the map, preserves values and deletes the old keys", async () => {
  const storage = new FakeStorage();
  storage.data.set("descriptionsCollapsed:file:///a.md", true);
  storage.data.set("descriptionsCollapsed:file:///b.md", false);
  storage.data.set("descriptionsCollapsed:file:///junk.md", "yes");
  storage.data.set("previewThemeMode", "dark");
  const map = loadCollapsedMap(storage);
  const done = migrateLegacyCollapsedKeys(storage, map);
  assert.equal(map.peek("file:///a.md"), true, "visible before storage settles");
  await done;
  assert.equal(map.peek("file:///b.md"), false);
  assert.equal(map.has("file:///junk.md"), false);
  assert.deepEqual([...storage.keys()].sort(), [DESCRIPTIONS_COLLAPSED_KEY, "previewThemeMode"].sort());
  const reloaded = loadCollapsedMap(storage);
  assert.equal(reloaded.peek("file:///a.md"), true);
  assert.equal(reloaded.peek("file:///b.md"), false);
});

test("migration is a no-op without legacy keys and keeps newer map entries over legacy ones", async () => {
  const storage = new FakeStorage();
  const map = new BoundedMap<boolean>(200, [["file:///a.md", false]]);
  await saveCollapsedMap(storage, map);
  await migrateLegacyCollapsedKeys(storage, map);
  assert.deepEqual(map.entries(), [["file:///a.md", false]]);
  storage.data.set("descriptionsCollapsed:file:///a.md", true);
  storage.data.set("descriptionsCollapsed:file:///b.md", true);
  await migrateLegacyCollapsedKeys(storage, map);
  assert.equal(map.peek("file:///a.md"), false);
  assert.equal(map.peek("file:///b.md"), true);
  assert.equal(storage.keys().some((key) => key.startsWith("descriptionsCollapsed:")), false);
});

test("migration respects the cap", async () => {
  const storage = new FakeStorage();
  for (let i = 0; i < 5; i += 1) storage.data.set(`descriptionsCollapsed:file:///${i}.md`, i % 2 === 0);
  const map = new BoundedMap<boolean>(3);
  await migrateLegacyCollapsedKeys(storage, map);
  assert.equal(map.size, 3);
  assert.equal((storage.get<unknown[]>(DESCRIPTIONS_COLLAPSED_KEY) ?? []).length, 3);
  assert.equal(storage.keys().length, 1);
});

test("loading ignores a malformed stored value", () => {
  const storage = new FakeStorage();
  storage.data.set(DESCRIPTIONS_COLLAPSED_KEY, [["ok", true], ["bad", "x"], 5, null]);
  assert.deepEqual(loadCollapsedMap(storage).entries(), [["ok", true]]);
  storage.data.set(DESCRIPTIONS_COLLAPSED_KEY, "nope");
  assert.equal(loadCollapsedMap(storage).size, 0);
});
