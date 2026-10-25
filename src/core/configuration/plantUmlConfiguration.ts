/**
 * The `markdownOkfSchemaStudio.plantuml.*` settings, read through the settings registry
 * (`settingsRegistry.ts`, where the names, defaults and descriptions live).
 */

import { PLANTUML_SETTINGS, readSetting, settingSection, type SettingsSource } from "./settingsRegistry";

/** The full name of the PlantUML section. */
export const PLANTUML_CONFIGURATION_SECTION = settingSection("plantuml");

/** Where the PlantUML settings are read from (the section of the host's settings store). */
export type PlantUmlConfigurationSource = SettingsSource;

/** The JAR pipeline settings. */
export interface PlantUmlConfiguration {
  /** Path to `plantuml.jar`, trimmed; empty: the `plantuml` command on the PATH. */
  jarPath: string;
}

/** The JAR pipeline settings when none is set. */
export const DEFAULT_PLANTUML_CONFIGURATION: PlantUmlConfiguration = {
  jarPath: PLANTUML_SETTINGS.jarPath.schema.default,
};

// @implements_req SwRS-MDOKFSTUDIO-DIAG-084
/** The JAR pipeline settings of `source`, normalized. */
export function readPlantUmlConfiguration(
  source: PlantUmlConfigurationSource,
): PlantUmlConfiguration {
  return { jarPath: readSetting(source, "jarPath", PLANTUML_SETTINGS.jarPath) };
}

/** The full name of the switch between the built-in engine and the JAR/PATH pipeline. */
export const PLANTUML_USE_JAR_SETTING = `${PLANTUML_CONFIGURATION_SECTION}.useJar`;

/**
 * Which PlantUML engine the preview uses: the JavaScript engine bundled into the webview (the
 * default) or, with `useJar`, the external `java -jar` / `plantuml` pipeline (`jarPath`).
 */
export interface PlantUmlEngineSettings {
  /** True: the external pipeline (only a real `true` starts a process). */
  useJar: boolean;
}

/** The engine settings when none is set. */
export const DEFAULT_PLANTUML_ENGINE_SETTINGS: PlantUmlEngineSettings = {
  useJar: PLANTUML_SETTINGS.useJar.schema.default,
};

/** The engine settings of `source`: only a real `true` starts a process. */
export function readPlantUmlEngineSettings(
  source: PlantUmlConfigurationSource,
): PlantUmlEngineSettings {
  return { useJar: readSetting(source, "useJar", PLANTUML_SETTINGS.useJar) };
}

/**
 * - `builtin`: the bundled engine draws in the webview. It starts no process, reads no file and
 *   fetches nothing, so it also runs in Restricted Mode (an untrusted workspace).
 * - `jar`: the external pipeline, in a trusted workspace.
 * - `jar-untrusted`: the JAR was chosen but the workspace is untrusted; it stays disabled (the
 *   diagrams say so) instead of being swapped for the built-in engine behind the user's back.
 */
export type PlantUmlEngineChoice = "builtin" | "jar" | "jar-untrusted";

/** The engine the render pipeline is asked to use (trust is checked again by the JAR renderer). */
export type PlantUmlEngine = "builtin" | "jar";

// @implements_req SwRS-MDOKFSTUDIO-DIAG-024
/** The engine to use for these settings: the built-in one unless `useJar`, which needs trust. */
export function resolvePlantUmlEngine(
  settings: PlantUmlEngineSettings,
  trusted: boolean,
): PlantUmlEngineChoice {
  if (!settings.useJar) {
    return "builtin";
  }
  return trusted ? "jar" : "jar-untrusted";
}
