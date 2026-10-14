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
