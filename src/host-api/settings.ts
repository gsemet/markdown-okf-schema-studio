/**
 * The `Settings` port: the user's settings, read by section. The setting names and defaults belong
 * to the core (`src/core/configuration/`); a host maps them onto its own settings store (VS Code: the
 * `contributes.configuration` of `package.json`).
 */

import type { HostEvent } from "./events";

/** The settings of one section (`markdownOkfSchemaStudio.preview`, …). */
export interface SettingsSection {
  /** The value of `key` in the section, or `defaultValue` when it is not set. */
  get<T>(key: string, defaultValue: T): T;
}

/** A change of some settings. */
export interface SettingsChange {
  /** True when the change touches `section` (or a setting below it). */
  affects(section: string): boolean;
}

/** Read access to the settings, and their changes. */
export interface Settings {
  /** The settings of one section, read when a value is asked for. */
  section(name: string): SettingsSection;
  /** Fires after the user changed settings. */
  readonly onDidChange: HostEvent<SettingsChange>;
}
