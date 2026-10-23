export const PLANTUML_CONFIGURATION_SECTION = "markdownOkfSchemaStudio.plantuml";

export interface PlantUmlConfigurationSource {
  get<T>(section: string, defaultValue: T): T;
}

export interface PlantUmlConfiguration {
  jarPath: string;
}

export const DEFAULT_PLANTUML_CONFIGURATION: PlantUmlConfiguration = {
  jarPath: "",
};

export function readPlantUmlConfiguration(
  source: PlantUmlConfigurationSource,
): PlantUmlConfiguration {
  const jarPath = source.get(
    "jarPath",
    DEFAULT_PLANTUML_CONFIGURATION.jarPath,
  );
  return {
    jarPath: typeof jarPath === "string" ? jarPath.trim() : DEFAULT_PLANTUML_CONFIGURATION.jarPath,
  };
}

/** The full name of the switch between the built-in engine and the JAR/PATH pipeline. */
export const PLANTUML_USE_JAR_SETTING = `${PLANTUML_CONFIGURATION_SECTION}.useJar`;

/**
 * Which PlantUML engine the preview uses: the JavaScript engine bundled into the webview (the
 * default) or, with `useJar`, the external `java -jar` / `plantuml` pipeline (`jarPath`).
 */
export interface PlantUmlEngineSettings {
  useJar: boolean;
}

export const DEFAULT_PLANTUML_ENGINE_SETTINGS: PlantUmlEngineSettings = {
  useJar: false,
};

export function readPlantUmlEngineSettings(
  source: PlantUmlConfigurationSource,
): PlantUmlEngineSettings {
  // Only a real `true` starts a process; anything else keeps the engine that spawns nothing.
  return { useJar: source.get("useJar", DEFAULT_PLANTUML_ENGINE_SETTINGS.useJar) === true };
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

export function resolvePlantUmlEngine(
  settings: PlantUmlEngineSettings,
  trusted: boolean,
): PlantUmlEngineChoice {
  if (!settings.useJar) {
    return "builtin";
  }
  return trusted ? "jar" : "jar-untrusted";
}
