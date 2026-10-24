import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_FRONTMATTER_CONFIGURATION,
  FRONTMATTER_CONFIGURATION_SECTION,
  readFrontmatterConfiguration,
} from "../../../src/core/configuration/frontmatterConfiguration";

test("frontmatter settings use their own section and defaults", () => {
  assert.equal(FRONTMATTER_CONFIGURATION_SECTION, "markdownOkfSchemaStudio.frontmatter");
  const keys: string[] = [];
  const defaults = readFrontmatterConfiguration({
    get<T>(key: string, defaultValue: T): T {
      keys.push(key);
      return defaultValue;
    },
  });
  assert.deepEqual(keys, [
    "propertiesTable",
    "strictAdditionalProperties",
    "bundleRoot",
    "projectRoot",
    "allowOutsideWorkspaceLinks",
  ]);
  assert.deepEqual(defaults, {
    propertiesTable: true,
    strictAdditionalProperties: false,
    bundleRoot: "",
    projectRoot: "",
    allowOutsideWorkspaceLinks: false,
  });
  assert.deepEqual(defaults, DEFAULT_FRONTMATTER_CONFIGURATION);
});

test("frontmatter visibility and strict validation can be configured independently", () => {
  for (const propertiesTable of [false, true]) {
    for (const strictAdditionalProperties of [false, true]) {
      const values: Record<string, boolean | string> = {
        propertiesTable,
        strictAdditionalProperties,
        bundleRoot: "bundle",
        projectRoot: "/project",
        allowOutsideWorkspaceLinks: true,
      };
      assert.deepEqual(readFrontmatterConfiguration({
        get<T>(key: string, defaultValue: T): T {
          return (values[key] ?? defaultValue) as T;
        },
      }), values);
    }
  }
});
