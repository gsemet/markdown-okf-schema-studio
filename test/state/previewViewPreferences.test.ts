import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyViewPreference,
  DEFAULT_VIEW_PREFERENCES,
  normalizeViewPreferences,
  readViewPreferences,
  VIEW_PREFERENCES_STORAGE_KEY,
  writeViewPreferences,
  type ViewPreferencesStorage,
} from "../../src/state/previewViewPreferences";

function memoryStorage(): ViewPreferencesStorage {
  const values = new Map<string, unknown>();
  return {
    get<T>(key: string): T | undefined {
      return values.get(key) as T | undefined;
    },
    async update(key: string, value: unknown): Promise<void> {
      values.set(key, value);
    },
  };
}

test("defaults and the storage key", () => {
  assert.deepEqual(DEFAULT_VIEW_PREFERENCES, {
    zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false,
  });
  assert.equal(VIEW_PREFERENCES_STORAGE_KEY, "markdownOkfSchemaStudio.viewPreferences");
  assert.deepEqual(normalizeViewPreferences(undefined), DEFAULT_VIEW_PREFERENCES);
});

test("zoom is clamped to 70-200 and rounded to 10", () => {
  const zoom = (value: unknown): number => normalizeViewPreferences({ zoom: value }).zoom;
  assert.equal(zoom(10), 70);
  assert.equal(zoom(69), 70);
  assert.equal(zoom(300), 200);
  assert.equal(zoom(104), 100);
  assert.equal(zoom(105), 110);
  assert.equal(zoom(133), 130);
  assert.equal(zoom(200), 200);
  assert.equal(zoom(70), 70);
});

test("bad input falls back to the default per field", () => {
  assert.deepEqual(normalizeViewPreferences({
    zoom: "big", widthMode: "wide", toc: "yes", incomingChanges: 1, comments: "yes", toolbarCollapsed: "no",
  }), DEFAULT_VIEW_PREFERENCES);
  assert.deepEqual(normalizeViewPreferences({ zoom: Number.NaN }), DEFAULT_VIEW_PREFERENCES);
  for (const bad of [null, 5, "x", [], true]) {
    assert.deepEqual(normalizeViewPreferences(bad), DEFAULT_VIEW_PREFERENCES);
  }
  assert.deepEqual(normalizeViewPreferences({ zoom: 120, toc: true, widthMode: "full", incomingChanges: false, comments: false, toolbarCollapsed: true }), {
    zoom: 120, widthMode: "full", toc: true, incomingChanges: false, comments: false, toolbarCollapsed: true,
  });
});

test("applyViewPreference changes one key and normalizes it", () => {
  const next = applyViewPreference(DEFAULT_VIEW_PREFERENCES, "zoom", 500);
  assert.equal(next.zoom, 200);
  assert.equal(DEFAULT_VIEW_PREFERENCES.zoom, 100, "the input is not mutated");
  assert.equal(applyViewPreference(next, "toc", true).toc, true);
  assert.equal(applyViewPreference(next, "widthMode", "bogus").widthMode, "margin");
  assert.equal(applyViewPreference(next, "zoom", 90).widthMode, "margin");
});

test("read and write go through a Memento-like store", async () => {
  const storage = memoryStorage();
  assert.deepEqual(readViewPreferences(storage), DEFAULT_VIEW_PREFERENCES);
  await writeViewPreferences(storage, { ...DEFAULT_VIEW_PREFERENCES, zoom: 130 });
  assert.equal((storage.get(VIEW_PREFERENCES_STORAGE_KEY) as { zoom: number }).zoom, 130);
  assert.equal(readViewPreferences(storage).zoom, 130);
  await storage.update(VIEW_PREFERENCES_STORAGE_KEY, "garbage");
  assert.deepEqual(readViewPreferences(storage), DEFAULT_VIEW_PREFERENCES);
});
