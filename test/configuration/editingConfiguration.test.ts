import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_EDITING_CONFIGURATION,
  EDITING_CONFIGURATION_SECTION,
  readEditingConfiguration,
} from "../../src/configuration/editingConfiguration";

test("reads the default palette mode of the editing section", () => {
  const sections: string[] = [];
  for (const mode of ["strict", "gfm", "myst"]) {
    const configuration = readEditingConfiguration({
      get<T>(section: string, _defaultValue: T): T {
        sections.push(section);
        return mode as T;
      },
    });
    assert.deepEqual(configuration, { defaultPaletteMode: mode });
  }
  assert.deepEqual(new Set(sections), new Set(["defaultPaletteMode"]));
  assert.equal(EDITING_CONFIGURATION_SECTION, "markdownOkfSchemaStudio.editing");
  assert.deepEqual(DEFAULT_EDITING_CONFIGURATION, { defaultPaletteMode: "myst" });
});

test("falls back to MyST for an unknown or non-string palette mode", () => {
  for (const value of ["html", "", 42, null, undefined, "MyST"]) {
    const configuration = readEditingConfiguration({
      get<T>(_section: string, _defaultValue: T): T {
        return value as T;
      },
    });
    assert.deepEqual(configuration, DEFAULT_EDITING_CONFIGURATION, String(value));
  }
});
