import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PREVIEW_THEME_MODE,
  isPreviewThemeModeChangedMessage,
  PREVIEW_THEME_MODE_STORAGE_KEY,
  readPreviewThemeMode,
  type PreviewThemeModeStorage,
  writePreviewThemeMode,
} from "../../src/state/previewTheme";

function createMemoryStorage(): PreviewThemeModeStorage {
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

test("accepts only complete theme-mode change messages", () => {
  assert.equal(isPreviewThemeModeChangedMessage({
    type: "previewThemeModeChanged",
    previewThemeMode: "dark",
  }), true);
  assert.equal(isPreviewThemeModeChangedMessage({
    type: "previewThemeModeChanged",
    previewThemeMode: "sepia",
  }), false);
  assert.equal(isPreviewThemeModeChangedMessage({
    type: "previewThemeModeChanged",
    previewThemeMode: "cream",
  }), true);
  assert.equal(isPreviewThemeModeChangedMessage({ type: "previewThemeModeChanged" }), false);
});

test("restores a valid workspace theme mode and ignores invalid stored values", async () => {
  const storage = createMemoryStorage();

  await writePreviewThemeMode(storage, "white");
  assert.equal(storage.get(PREVIEW_THEME_MODE_STORAGE_KEY), "white");
  assert.equal(readPreviewThemeMode(storage), "white");

  await storage.update(PREVIEW_THEME_MODE_STORAGE_KEY, "sepia");
  assert.equal(readPreviewThemeMode(storage), undefined);
});

test("restores a stored cream theme mode", async () => {
  const storage = createMemoryStorage();

  await writePreviewThemeMode(storage, "cream");
  assert.equal(readPreviewThemeMode(storage), "cream");
});

test("a fresh workspace has no stored mode and the built-in default is cream", () => {
  const storage = createMemoryStorage();
  assert.equal(readPreviewThemeMode(storage), undefined, "the host sends no mode, the page uses the default");
  assert.equal(DEFAULT_PREVIEW_THEME_MODE, "cream");
});

test("stored choice wins: every stored theme mode is restored as is", async () => {
  const storage = createMemoryStorage();
  for (const mode of ["current", "dark", "white", "cream"] as const) {
    await writePreviewThemeMode(storage, mode);
    assert.equal(readPreviewThemeMode(storage), mode);
  }
});
