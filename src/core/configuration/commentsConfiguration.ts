/**
 * The `markdownOkfSchemaStudio.comments.*` settings, read through the settings registry
 * (`settingsRegistry.ts`, where the names, defaults and descriptions live).
 */

import {
  COMMENTS_SETTINGS,
  readSettings,
  settingDefaults,
  settingSection,
  type SettingsSource,
  type SettingValues,
} from "./settingsRegistry";

/** The full name of the comments section. */
export const COMMENTS_CONFIGURATION_SECTION = settingSection("comments");

/** Where the comments settings are read from (the section of the host's settings store). */
export type CommentsConfigurationSource = SettingsSource;

/** The comments settings, normalized (see `COMMENTS_SETTINGS` for each field). */
export type CommentsConfiguration = SettingValues<typeof COMMENTS_SETTINGS>;

/** The comments settings when none is set. */
export const DEFAULT_COMMENTS_CONFIGURATION: CommentsConfiguration = settingDefaults(COMMENTS_SETTINGS);

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-065
/** The comments settings of `source`, normalized. */
export function readCommentsConfiguration(source: CommentsConfigurationSource): CommentsConfiguration {
  return readSettings(COMMENTS_SETTINGS, source);
}
