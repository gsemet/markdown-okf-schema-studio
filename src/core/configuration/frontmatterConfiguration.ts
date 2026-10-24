export const FRONTMATTER_CONFIGURATION_SECTION = "markdownOkfSchemaStudio.frontmatter";

export interface FrontmatterConfigurationSource {
  get<T>(section: string, defaultValue: T): T;
}

export interface FrontmatterConfiguration {
  propertiesTable: boolean;
  strictAdditionalProperties: boolean;
  bundleRoot: string;
  projectRoot: string;
  allowOutsideWorkspaceLinks: boolean;
}

export const DEFAULT_FRONTMATTER_CONFIGURATION: FrontmatterConfiguration = {
  propertiesTable: true,
  strictAdditionalProperties: false,
  bundleRoot: "",
  projectRoot: "",
  allowOutsideWorkspaceLinks: false,
};

export function readFrontmatterConfiguration(
  source: FrontmatterConfigurationSource,
): FrontmatterConfiguration {
  return {
    propertiesTable: source.get(
      "propertiesTable",
      DEFAULT_FRONTMATTER_CONFIGURATION.propertiesTable,
    ),
    strictAdditionalProperties: source.get(
      "strictAdditionalProperties",
      DEFAULT_FRONTMATTER_CONFIGURATION.strictAdditionalProperties,
    ),
    bundleRoot: source.get("bundleRoot", DEFAULT_FRONTMATTER_CONFIGURATION.bundleRoot).trim(),
    projectRoot: source.get("projectRoot", DEFAULT_FRONTMATTER_CONFIGURATION.projectRoot).trim(),
    allowOutsideWorkspaceLinks: source.get(
      "allowOutsideWorkspaceLinks",
      DEFAULT_FRONTMATTER_CONFIGURATION.allowOutsideWorkspaceLinks,
    ),
  };
}
