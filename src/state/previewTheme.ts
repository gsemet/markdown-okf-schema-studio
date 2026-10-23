export type PreviewThemeMode = "current" | "dark" | "white" | "cream";

export const PREVIEW_THEME_MODE_STORAGE_KEY = "previewThemeMode";

/**
 * The theme mode of a workspace that has stored no choice: the warm, low-glare cream palette. A
 * mode stored by the toolbar theme button always wins over it.
 */
export const DEFAULT_PREVIEW_THEME_MODE: PreviewThemeMode = "cream";

export interface PreviewThemeModeStorage {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

export interface PreviewThemeModeChangedMessage {
  type: "previewThemeModeChanged";
  previewThemeMode: PreviewThemeMode;
}

export function isPreviewThemeMode(value: unknown): value is PreviewThemeMode {
  return value === "current" || value === "dark" || value === "white" || value === "cream";
}

export function isPreviewThemeModeChangedMessage(
  value: unknown,
): value is PreviewThemeModeChangedMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Partial<PreviewThemeModeChangedMessage>;
  return message.type === "previewThemeModeChanged" && isPreviewThemeMode(message.previewThemeMode);
}

export function readPreviewThemeMode(
  storage: PreviewThemeModeStorage,
): PreviewThemeMode | undefined {
  const mode = storage.get<unknown>(PREVIEW_THEME_MODE_STORAGE_KEY);
  return isPreviewThemeMode(mode) ? mode : undefined;
}

export function writePreviewThemeMode(
  storage: PreviewThemeModeStorage,
  mode: PreviewThemeMode,
): PromiseLike<void> {
  return storage.update(PREVIEW_THEME_MODE_STORAGE_KEY, mode);
}

export function clearPreviewThemeMode(storage: PreviewThemeModeStorage): PromiseLike<void> {
  return storage.update(PREVIEW_THEME_MODE_STORAGE_KEY, undefined);
}
