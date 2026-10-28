/**
 * View preferences: per-workspace preview settings changed from the toolbar (zoom, width mode,
 * table of contents, incoming changes, comment chips, collapsed rows 2 to 5). This module must not import `vscode`.
 */

export type ViewWidthMode = "margin" | "auto" | "full";

export interface ViewPreferences {
  zoom: number;
  widthMode: ViewWidthMode;
  toc: boolean;
  incomingChanges: boolean;
  /** The gray comment chips show (toolbar Comments button); on by default. */
  comments: boolean;
  /** Rows 2 to 5 of the floating toolbar are hidden; collapsed by default. */
  toolbarCollapsed: boolean;
}

export type ViewPreferenceKey = keyof ViewPreferences;

export const VIEW_PREFERENCES_STORAGE_KEY = "markdownOkfSchemaStudio.viewPreferences";
 const MIN_VIEW_ZOOM = 70;
 const MAX_VIEW_ZOOM = 200;
 const VIEW_ZOOM_STEP = 10;
 const VIEW_WIDTH_MODES: readonly ViewWidthMode[] = ["margin", "auto", "full"];

// @implements_req SwRS-MDOKFSTUDIO-LIFE-170
export const DEFAULT_VIEW_PREFERENCES: Readonly<ViewPreferences> = Object.freeze({
  zoom: 100,
  widthMode: "margin",
  toc: false,
  incomingChanges: true,
  comments: true,
  toolbarCollapsed: true,
});

export interface ViewPreferencesStorage {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

function normalizeZoom(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_VIEW_PREFERENCES.zoom;
  }
  const rounded = Math.round(value / VIEW_ZOOM_STEP) * VIEW_ZOOM_STEP;
  return Math.min(MAX_VIEW_ZOOM, Math.max(MIN_VIEW_ZOOM, rounded));
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-169
export function normalizeViewPreferences(value: unknown): ViewPreferences {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    zoom: normalizeZoom(input.zoom),
    widthMode: VIEW_WIDTH_MODES.includes(input.widthMode as ViewWidthMode)
      ? input.widthMode as ViewWidthMode
      : DEFAULT_VIEW_PREFERENCES.widthMode,
    toc: typeof input.toc === "boolean" ? input.toc : DEFAULT_VIEW_PREFERENCES.toc,
    incomingChanges: typeof input.incomingChanges === "boolean"
      ? input.incomingChanges
      : DEFAULT_VIEW_PREFERENCES.incomingChanges,
    comments: typeof input.comments === "boolean" ? input.comments : DEFAULT_VIEW_PREFERENCES.comments,
    toolbarCollapsed: typeof input.toolbarCollapsed === "boolean"
      ? input.toolbarCollapsed
      : DEFAULT_VIEW_PREFERENCES.toolbarCollapsed,
  };
}

export function applyViewPreference(
  preferences: ViewPreferences,
  key: ViewPreferenceKey,
  value: unknown,
): ViewPreferences {
  return normalizeViewPreferences({ ...preferences, [key]: value });
}

export function readViewPreferences(storage: ViewPreferencesStorage): ViewPreferences {
  return normalizeViewPreferences(storage.get<unknown>(VIEW_PREFERENCES_STORAGE_KEY));
}

export function writeViewPreferences(
  storage: ViewPreferencesStorage,
  preferences: ViewPreferences,
): PromiseLike<void> {
  return storage.update(VIEW_PREFERENCES_STORAGE_KEY, preferences);
}
