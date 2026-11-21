import * as assert from "node:assert/strict";
import { test } from "node:test";

import { STUDIO_EDITOR_VIEW_TYPE } from "../../src/core/configuration/editorAssociationMigration";
import type { SettingScope, SettingScopes } from "../../src/host-api/settingScopes";
import { migrateEditorAssociation, MIGRATION_NOTICE } from "../../src/session/associationMigration";
import { FeatureIntroductions } from "../../src/session/featureIntroductions";
import { MemoryStore, recordingLogger, recordingUi } from "./memoryPorts";

const STUDIO_ASSOCIATION = { "*.md": STUDIO_EDITOR_VIEW_TYPE };
const MARK = "markdownOkfSchemaStudio.migrations.editorAssociation";

/** In-memory scopes keyed `<scope>|<section>.<key>`; `failOn` names one write that rejects. */
function memoryScopes(initial: Record<string, unknown>, failOn?: string) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  const scopes: SettingScopes = {
    inspect: (section, key) => ({ user: values.get(`user|${section}.${key}`), workspace: values.get(`workspace|${section}.${key}`) }),
    write: (section, key, value, scope: SettingScope) => {
      const name = `${scope}|${section}.${key}`;
      writes.push(name);
      if (failOn === name) return Promise.reject(new Error("read-only settings file"));
      if (value === undefined) values.delete(name);
      else values.set(name, value);
      return Promise.resolve();
    },
  };
  return { values, writes, scopes };
}

function setup(initial: Record<string, unknown>, failOn?: string) {
  const memory = memoryScopes(initial, failOn);
  const globalState = new MemoryStore();
  const workspaceState = new MemoryStore();
  const shown: string[] = [];
  const errors: string[] = [];
  const logger = recordingLogger(errors);
  const ui = recordingUi(shown);
  const introductions = new FeatureIntroductions(globalState, ui, logger);
  const run = (): Promise<boolean> => migrateEditorAssociation({
    settingScopes: memory.scopes, globalState, workspaceState, ui, logger, introductions,
  });
  return { ...memory, globalState, workspaceState, shown, errors, introductions, run };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("each scope holding the Studio association gets the setting on and the association removed, then is marked", async () => {
  const { values, globalState, workspaceState, shown, introductions, run } = setup({
    "user|workbench.editorAssociations": { ...STUDIO_ASSOCIATION, "*.png": "imagePreview.previewEditor" },
    "workspace|workbench.editorAssociations": STUDIO_ASSOCIATION,
  });
  assert.equal(await run(), true);
  assert.equal(values.get("user|markdownOkfSchemaStudio.open.markdownFilesInStudio"), true);
  assert.equal(values.get("workspace|markdownOkfSchemaStudio.open.markdownFilesInStudio"), true);
  assert.deepEqual(values.get("user|workbench.editorAssociations"), { "*.png": "imagePreview.previewEditor" });
  assert.equal(values.has("workspace|workbench.editorAssociations"), false);
  assert.equal(globalState.get(MARK), true);
  assert.equal(workspaceState.get(MARK), true);
  assert.deepEqual(shown, [`showInformation: ${MIGRATION_NOTICE}`], "one notice");
  assert.equal(await introductions.showOnce("openInStudio"), false, "the migration notice replaces the introduction");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("the Studio setting is written before the association is removed", async () => {
  const { writes, run } = setup({ "user|workbench.editorAssociations": STUDIO_ASSOCIATION });
  await run();
  assert.deepEqual(writes, [
    "user|markdownOkfSchemaStudio.open.markdownFilesInStudio",
    "user|workbench.editorAssociations",
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("a marked scope is not migrated again, so an association added later is respected", async () => {
  const { values, writes, run } = setup({ "user|workbench.editorAssociations": STUDIO_ASSOCIATION });
  await run();
  values.set("user|workbench.editorAssociations", STUDIO_ASSOCIATION);
  writes.length = 0;
  assert.equal(await run(), false);
  assert.deepEqual(writes, []);
  assert.deepEqual(values.get("user|workbench.editorAssociations"), STUDIO_ASSOCIATION);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("a scope with no Studio association writes nothing, shows nothing and gets no mark", async () => {
  const { writes, globalState, workspaceState, shown, run } = setup({
    "user|workbench.editorAssociations": { "*.md": "vscode.markdown.preview.editor" },
  });
  assert.equal(await run(), false);
  assert.deepEqual(writes, []);
  assert.deepEqual(shown, []);
  assert.deepEqual([globalState.keys(), workspaceState.keys()], [[], []]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("a failed write is logged and warned once, marks nothing, and the other scope still migrates", async () => {
  const { values, globalState, workspaceState, shown, errors, run } = setup({
    "user|workbench.editorAssociations": STUDIO_ASSOCIATION,
    "workspace|workbench.editorAssociations": STUDIO_ASSOCIATION,
  }, "user|markdownOkfSchemaStudio.open.markdownFilesInStudio");
  assert.equal(await run(), true);
  assert.equal(errors.length, 1);
  assert.equal(shown.filter((line) => line.startsWith("showWarning")).length, 1);
  assert.deepEqual(values.get("user|workbench.editorAssociations"), STUDIO_ASSOCIATION, "the association is kept");
  assert.equal(globalState.get(MARK), undefined);
  assert.equal(workspaceState.get(MARK), true);
  assert.equal(values.has("workspace|workbench.editorAssociations"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("a host without a setting writer migrates nothing", async () => {
  const globalState = new MemoryStore();
  const shown: string[] = [];
  const logger = recordingLogger();
  const ui = recordingUi(shown);
  const result = await migrateEditorAssociation({
    settingScopes: undefined, globalState, workspaceState: new MemoryStore(), ui, logger,
    introductions: new FeatureIntroductions(globalState, ui, logger),
  });
  assert.equal(result, false);
  assert.deepEqual(shown, []);
});
