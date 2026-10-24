import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_EDITING_CONFIGURATION,
  EDITING_CONFIGURATION_SECTION,
  initialPaletteModeOf,
  readEditingConfiguration,
  type EditingConfigurationSource,
} from "../../../src/core/configuration/editingConfiguration";

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
  assert.deepEqual(DEFAULT_EDITING_CONFIGURATION, { defaultPaletteMode: "gfm" });
});

test("falls back to GFM for an unknown or non-string palette mode", () => {
  for (const value of ["html", "", 42, null, undefined, "MyST"]) {
    const configuration = readEditingConfiguration({
      get<T>(_section: string, _defaultValue: T): T {
        return value as T;
      },
    });
    assert.deepEqual(configuration, DEFAULT_EDITING_CONFIGURATION, String(value));
  }
});

/** A configuration source with nothing set: VS Code then returns the default it is given. */
const UNSET: EditingConfigurationSource = {
  get<T>(_section: string, defaultValue: T): T {
    return defaultValue;
  },
};

test("a fresh workspace starts the palette in GFM", () => {
  assert.equal(initialPaletteModeOf(undefined, UNSET), "gfm");
  assert.equal(initialPaletteModeOf("html", UNSET), "gfm", "an invalid stored value is ignored");
});

test("stored choice wins: a stored palette mode is kept over the default and the setting", () => {
  for (const mode of ["strict", "gfm", "myst"] as const) {
    assert.equal(initialPaletteModeOf(mode, UNSET), mode);
    assert.equal(initialPaletteModeOf(mode, { get: <T>() => "strict" as T }), mode);
  }
  assert.equal(initialPaletteModeOf(undefined, { get: <T>() => "myst" as T }), "myst",
    "without a stored mode the setting decides");
});
