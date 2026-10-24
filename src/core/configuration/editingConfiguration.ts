export const EDITING_CONFIGURATION_SECTION = "markdownOkfSchemaStudio.editing";

export const PALETTE_MODES = ["strict", "gfm", "myst"] as const;

export type PaletteMode = (typeof PALETTE_MODES)[number];

export function isPaletteMode(value: unknown): value is PaletteMode {
  return typeof value === "string" && (PALETTE_MODES as readonly string[]).includes(value);
}

export interface EditingConfigurationSource {
  get<T>(section: string, defaultValue: T): T;
}

export interface EditingConfiguration {
  /** The palette buttons a workspace starts with, until the user picks another mode. */
  defaultPaletteMode: PaletteMode;
}

export const DEFAULT_EDITING_CONFIGURATION: EditingConfiguration = {
  defaultPaletteMode: "gfm",
};

export function readEditingConfiguration(source: EditingConfigurationSource): EditingConfiguration {
  const mode: unknown = source.get(
    "defaultPaletteMode",
    DEFAULT_EDITING_CONFIGURATION.defaultPaletteMode,
  );
  return {
    defaultPaletteMode: isPaletteMode(mode) ? mode : DEFAULT_EDITING_CONFIGURATION.defaultPaletteMode,
  };
}

/**
 * The palette mode a new panel starts in: the mode stored for the workspace when there is a valid
 * one (the user's choice always wins), otherwise the `defaultPaletteMode` setting.
 */
export function initialPaletteModeOf(stored: unknown, source: EditingConfigurationSource): PaletteMode {
  return isPaletteMode(stored) ? stored : readEditingConfiguration(source).defaultPaletteMode;
}
