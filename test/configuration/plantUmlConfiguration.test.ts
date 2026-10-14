import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PLANTUML_CONFIGURATION,
  PLANTUML_CONFIGURATION_SECTION,
  readPlantUmlConfiguration,
} from "../../src/configuration/plantUmlConfiguration";

test("reads and trims the configured PlantUML JAR path", () => {
  const configuration = readPlantUmlConfiguration({
    get<T>(section: string, defaultValue: T): T {
      assert.equal(section, "jarPath");
      return "  /opt/tools/plantuml.jar  " as T;
    },
  });

  assert.deepEqual(configuration, { jarPath: "/opt/tools/plantuml.jar" });
  assert.equal(PLANTUML_CONFIGURATION_SECTION, "markdownOkfSchemaStudio.plantuml");
  assert.deepEqual(DEFAULT_PLANTUML_CONFIGURATION, { jarPath: "" });
});

test("uses an empty path for non-string configuration values", () => {
  const configuration = readPlantUmlConfiguration({
    get<T>(_section: string, defaultValue: T): T {
      return 42 as T;
    },
  });

  assert.deepEqual(configuration, DEFAULT_PLANTUML_CONFIGURATION);
});
