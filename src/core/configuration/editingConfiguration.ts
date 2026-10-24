/**
 * The `markdownOkfSchemaStudio.editing.*` settings, read through the settings registry
 * (`settingsRegistry.ts`, where the names, defaults and descriptions live).
 */

import {
  EDITING_SETTINGS,
  isPaletteMode,
  type PaletteMode,
  readSettings,
  settingDefaults,
  settingSection,
  type SettingsSource,
  type SettingValues,
} from "./settingsRegistry";

export { isPaletteMode, PALETTE_MODES, type PaletteMode } from "./settingsRegistry";

/** The full name of the editing section. */
export const EDITING_CONFIGURATION_SECTION = settingSection("editing");

/** Where the editing settings are read from (the section of the host's settings store). */
export type EditingConfigurationSource = SettingsSource;

/** The editing settings, normalized (see `EDITING_SETTINGS` for each field). */
export type EditingConfiguration = SettingValues<typeof EDITING_SETTINGS>;

/** The editing settings when none is set. */
export const DEFAULT_EDITING_CONFIGURATION: EditingConfiguration = settingDefaults(EDITING_SETTINGS);

/** The editing settings of `source`, normalized. */
export function readEditingConfiguration(source: EditingConfigurationSource): EditingConfiguration {
  return readSettings(EDITING_SETTINGS, source);
}

/**
 * The palette mode a new panel starts in: the mode stored for the workspace when there is a valid
 * one (the user's choice always wins), otherwise the `defaultPaletteMode` setting.
 */
export function initialPaletteModeOf(stored: unknown, source: EditingConfigurationSource): PaletteMode {
  return isPaletteMode(stored) ? stored : readEditingConfiguration(source).defaultPaletteMode;
}
