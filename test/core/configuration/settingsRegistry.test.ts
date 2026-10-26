import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import {
  PREVIEW_STARTUP_SETTING_KEYS,
  previewBootSettings,
  readPreviewBootSettings,
  readPreviewConfiguration,
} from "../../../src/core/configuration/previewConfiguration";
import {
  bootSettingKeys,
  contributedConfiguration,
  PREVIEW_SETTINGS,
  readSettings,
  SETTING_CATEGORIES,
  settingDefaults,
  settingSection,
} from "../../../src/core/configuration/settingsRegistry";

const projectRoot = path.resolve(__dirname, "../../../..");

test("the generated settings schema is the package.json one, byte for byte", () => {
  const text = fs.readFileSync(path.join(projectRoot, "package.json"), "utf8");
  const manifest = JSON.parse(text) as { contributes: { configuration: unknown } };
  assert.deepStrictEqual(contributedConfiguration(), manifest.contributes.configuration);
  assert.equal(
    JSON.stringify(contributedConfiguration(), null, 2),
    JSON.stringify(manifest.contributes.configuration, null, 2),
    "same key order too",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-024
// @tests_req SwRS-MDOKFSTUDIO-LIFE-156
test("categories keep their titles and order, and settings are sorted by their order", () => {
  const configuration = contributedConfiguration();
  assert.deepEqual(configuration.map((category) => [category.title, category.order]), [
    ["Preview", 1], ["Editing", 2], ["Frontmatter", 3], ["Comments", 4], ["PlantUML", 5],
  ]);
  for (const category of configuration) {
    const orders = Object.values(category.properties).map((schema) => schema.order);
    assert.deepEqual(orders, [...orders].sort((left, right) => left - right), category.title);
  }
  const names = configuration.flatMap((category) => Object.keys(category.properties));
  assert.equal(new Set(names).size, names.length, "every setting name is unique");
  assert.ok(names.every((name) => name.startsWith("markdownOkfSchemaStudio.")));
  assert.equal(names.length, SETTING_CATEGORIES.reduce((count, category) =>
    count + Object.keys(category.settings).length, 0));
});

test("a setting with nothing stored reads as its schema default", () => {
  const unset = { get: <T>(_key: string, defaultValue: T): T => defaultValue };
  for (const category of SETTING_CATEGORIES) {
    assert.deepEqual(readSettings(category.settings, unset), settingDefaults(category.settings), category.section);
  }
  assert.equal(settingSection("preview"), "markdownOkfSchemaStudio.preview");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-128
test("the page gets the scroll, reveal, sticky band and comment chip settings in its boot context", () => {
  assert.deepEqual(bootSettingKeys(PREVIEW_SETTINGS), [
    "scrollPreviewWithEditor",
    "scrollEditorWithPreview",
    "markEditorSelection",
    "stickyHeadingDepth",
    "showComments",
  ]);
  assert.deepEqual(PREVIEW_STARTUP_SETTING_KEYS, [
    "scrollPreviewWithEditor",
    "scrollEditorWithPreview",
    "markEditorSelection",
    "stickyHeadingDepth",
  ]);
  assert.deepEqual(bootSettingKeys(PREVIEW_SETTINGS, "live"), ["showComments"]);
});

test("the host writes the boot settings as configured, in table order", () => {
  const configuration = readPreviewConfiguration({
    get: <T>(key: string, defaultValue: T): T => (key === "stickyHeadingDepth" ? 9 : defaultValue) as T,
  });
  const boot = previewBootSettings(configuration);
  assert.equal(JSON.stringify(boot), JSON.stringify({
    scrollPreviewWithEditor: true,
    scrollEditorWithPreview: true,
    markEditorSelection: false,
    stickyHeadingDepth: 6,
    showComments: true,
  }));
});

test("the page reads missing or odd boot entries with the page defaults", () => {
  assert.deepEqual(readPreviewBootSettings({}), {
    scrollPreviewWithEditor: true,
    scrollEditorWithPreview: true,
    markEditorSelection: false,
    stickyHeadingDepth: 3,
    showComments: true,
  });
  assert.deepEqual(readPreviewBootSettings({
    scrollPreviewWithEditor: "no",
    scrollEditorWithPreview: false,
    markEditorSelection: "yes",
    stickyHeadingDepth: "4",
    showComments: false,
  }), {
    scrollPreviewWithEditor: true,
    scrollEditorWithPreview: false,
    markEditorSelection: false,
    stickyHeadingDepth: 3,
    showComments: false,
  });
});
