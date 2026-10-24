/**
 * The `markdownOkfSchemaStudio.preview.*` settings, read through the settings registry
 * (`settingsRegistry.ts`, where the names, defaults, bounds and descriptions live).
 */

import {
  bootSettingKeys,
  type BootSettingKeys,
  PREVIEW_SETTINGS,
  readSettings,
  settingDefaults,
  settingSection,
  type SettingsSource,
  type SettingValues,
} from "./settingsRegistry";

export {
  DEFAULT_PREVIEW_CONTENT_WIDTH,
  DEFAULT_STICKY_HEADING_DEPTH,
  MAX_PREVIEW_CONTENT_WIDTH,
  MAX_STICKY_HEADING_DEPTH,
  normalizePreviewContentWidth,
  normalizeStickyHeadingDepth,
} from "./settingsRegistry";

/** The full name of the preview section. */
export const PREVIEW_CONFIGURATION_SECTION = settingSection("preview");

/** Where the preview settings are read from (the section of the host's settings store). */
export type PreviewConfigurationSource = SettingsSource;

/** The preview settings, normalized (see `PREVIEW_SETTINGS` for each field). */
export type PreviewConfiguration = SettingValues<typeof PREVIEW_SETTINGS>;

/** The preview settings when none is set. */
export const DEFAULT_PREVIEW_CONFIGURATION: PreviewConfiguration = settingDefaults(PREVIEW_SETTINGS);

/** The preview settings of `source`, normalized. */
export function readPreviewConfiguration(source: PreviewConfigurationSource): PreviewConfiguration {
  return readSettings(PREVIEW_SETTINGS, source);
}

/**
 * The preview settings the page gets in its boot context (`PreviewRuntimeContext`), under the same
 * names: the settings of `PREVIEW_SETTINGS` that have a `boot` entry.
 */
export type PreviewBootSettings = Pick<PreviewConfiguration, BootSettingKeys<typeof PREVIEW_SETTINGS>>;

/** The boot context entries of the preview settings, in table order (the host writes them). */
export function previewBootSettings(configuration: PreviewConfiguration): PreviewBootSettings {
  const values: Record<string, unknown> = {};
  for (const key of bootSettingKeys(PREVIEW_SETTINGS)) {
    values[key] = configuration[key as keyof PreviewConfiguration];
  }
  return values as PreviewBootSettings;
}

/** The page's values of the preview boot settings: absent or odd entries get the page defaults. */
export function readPreviewBootSettings(
  context: Partial<Record<keyof PreviewBootSettings, unknown>>,
): PreviewBootSettings {
  const values: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(PREVIEW_SETTINGS)) {
    if (descriptor.boot !== undefined) {
      values[key] = descriptor.boot.read(context[key as keyof PreviewBootSettings]);
    }
  }
  return values as PreviewBootSettings;
}

/**
 * The names of the boot settings the page reads only at startup, in table order: a content patch
 * needs the same values (see `runtimeContextKey`).
 */
export const PREVIEW_STARTUP_SETTING_KEYS: readonly (keyof PreviewStartupSettings)[] =
  bootSettingKeys(PREVIEW_SETTINGS, "startup") as (keyof PreviewStartupSettings)[];

/** The preview boot settings the page reads only at startup (see `PREVIEW_STARTUP_SETTING_KEYS`). */
export type PreviewStartupSettings = Pick<PreviewConfiguration, BootSettingKeys<typeof PREVIEW_SETTINGS, "startup">>;
