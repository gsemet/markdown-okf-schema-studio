/**
 * The `markdownOkfSchemaStudio.frontmatter.*` settings, read through the settings registry
 * (`settingsRegistry.ts`, where the names, defaults and descriptions live).
 */

import {
  FRONTMATTER_SETTINGS,
  readSettings,
  settingDefaults,
  settingSection,
  type SettingsSource,
  type SettingValues,
} from "./settingsRegistry";

/** The full name of the frontmatter section. */
export const FRONTMATTER_CONFIGURATION_SECTION = settingSection("frontmatter");

/** Where the frontmatter settings are read from (the section of the host's settings store). */
export type FrontmatterConfigurationSource = SettingsSource;

/** The frontmatter settings, normalized (see `FRONTMATTER_SETTINGS` for each field). */
export type FrontmatterConfiguration = SettingValues<typeof FRONTMATTER_SETTINGS>;

/** The frontmatter settings when none is set. */
export const DEFAULT_FRONTMATTER_CONFIGURATION: FrontmatterConfiguration = settingDefaults(FRONTMATTER_SETTINGS);

/** The frontmatter settings of `source`, normalized. */
export function readFrontmatterConfiguration(
  source: FrontmatterConfigurationSource,
): FrontmatterConfiguration {
  return readSettings(FRONTMATTER_SETTINGS, source);
}
