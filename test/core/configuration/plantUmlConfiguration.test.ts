import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PLANTUML_CONFIGURATION,
  DEFAULT_PLANTUML_ENGINE_SETTINGS,
  PLANTUML_CONFIGURATION_SECTION,
  PLANTUML_USE_JAR_SETTING,
  readPlantUmlConfiguration,
  readPlantUmlEngineSettings,
  resolvePlantUmlEngine,
} from "../../../src/core/configuration/plantUmlConfiguration";

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

test("the built-in PlantUML engine is the default and useJar is read as a strict boolean", () => {
  const read = (value: unknown) => readPlantUmlEngineSettings({
    get<T>(section: string, _defaultValue: T): T {
      assert.equal(section, "useJar");
      return value as T;
    },
  });

  assert.equal(PLANTUML_USE_JAR_SETTING, "markdownOkfSchemaStudio.plantuml.useJar");
  assert.deepEqual(DEFAULT_PLANTUML_ENGINE_SETTINGS, { useJar: false });
  assert.deepEqual(read(undefined), { useJar: false });
  assert.deepEqual(read(false), { useJar: false });
  assert.deepEqual(read(true), { useJar: true });
  for (const invalid of ["true", 1, null, {}]) {
    assert.deepEqual(read(invalid), { useJar: false }, `${JSON.stringify(invalid)} must not switch to the JAR`);
  }
});

test("resolves the PlantUML engine from useJar and the workspace trust", () => {
  // The built-in engine spawns nothing and reads no file, so Restricted Mode keeps it.
  assert.equal(resolvePlantUmlEngine({ useJar: false }, true), "builtin");
  assert.equal(resolvePlantUmlEngine({ useJar: false }, false), "builtin");
  // The JAR starts a process: it only runs in a trusted workspace and is never swapped silently.
  assert.equal(resolvePlantUmlEngine({ useJar: true }, true), "jar");
  assert.equal(resolvePlantUmlEngine({ useJar: true }, false), "jar-untrusted");
});
