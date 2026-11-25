import * as assert from "node:assert/strict";
import { test } from "node:test";

import { STUDIO_EDITOR_VIEW_TYPE } from "../../src/core/configuration/editorAssociationMigration";
import type { HostUi } from "../../src/host-api/hostUi";
import type { SettingScope, SettingScopes } from "../../src/host-api/settingScopes";
import { restoreEditorAssociation } from "../../src/session/associationMigration";
import { MemoryStore, recordingLogger } from "./memoryPorts";

const ASSOCIATIONS = "workbench.editorAssociations";
const FILES = "markdownOkfSchemaStudio.open.markdownFilesInStudio";
const SEARCH = "markdownOkfSchemaStudio.open.searchResultsInStudio";
const STUDIO_ASSOCIATION = { "*.md": STUDIO_EDITOR_VIEW_TYPE };
const OLD_MARK = "markdownOkfSchemaStudio.migrations.editorAssociation";

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

/** A `HostUi` that records every access, so a test can assert that nothing at all touched it. */
function untouchedUi(calls: string[]): HostUi {
  return new Proxy({}, {
    get: (_target, name) => {
      calls.push(String(name));
      return () => Promise.resolve(undefined);
    },
  }) as HostUi;
}

function setup(initial: Record<string, unknown>, failOn?: string) {
  const memory = memoryScopes(initial, failOn);
  const globalState = new MemoryStore();
  const workspaceState = new MemoryStore();
  const errors: string[] = [];
  const uiCalls: string[] = [];
  // The ports carry no UI; the recording UI is handed along anyway, as a host would hold one, so a
  // later change that reaches it makes these tests fail.
  const ports = {
    settingScopes: memory.scopes, globalState, workspaceState, logger: recordingLogger(errors), ui: untouchedUi(uiCalls),
  };
  const run = () => restoreEditorAssociation(ports);
  return { ...memory, globalState, workspaceState, errors, uiCalls, run };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("user on, workspace not set: the association is in the user settings and the setting is removed", async () => {
  const { values, writes, uiCalls, run } = setup({ [`user|${FILES}`]: true, [`user|${SEARCH}`]: true });
  assert.deepEqual(await run(), ["user"]);
  assert.deepEqual(values.get(`user|${ASSOCIATIONS}`), STUDIO_ASSOCIATION);
  assert.equal(values.has(`user|${FILES}`), false);
  assert.equal(values.has(`user|${SEARCH}`), false, "the other retired setting goes too");
  assert.equal(writes.some((name) => name.startsWith("workspace|")), false, "the workspace scope is not written");
  assert.deepEqual(uiCalls, [], "nothing is shown");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("user not set, workspace on: the association is in the workspace settings and the setting is removed", async () => {
  const { values, writes, uiCalls, run } = setup({ [`workspace|${FILES}`]: true });
  assert.deepEqual(await run(), ["workspace"]);
  assert.deepEqual(values.get(`workspace|${ASSOCIATIONS}`), STUDIO_ASSOCIATION);
  assert.equal(values.has(`workspace|${FILES}`), false);
  assert.equal(writes.some((name) => name.startsWith("user|")), false, "the user scope is not written");
  assert.deepEqual(uiCalls, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("user on and workspace on: the association is in both scopes and both settings are removed", async () => {
  const { values, uiCalls, run } = setup({
    [`user|${FILES}`]: true,
    [`workspace|${FILES}`]: true,
    [`user|${ASSOCIATIONS}`]: { "*.png": "imagePreview.previewEditor" },
  });
  assert.deepEqual(await run(), ["user", "workspace"]);
  assert.deepEqual(values.get(`user|${ASSOCIATIONS}`), { "*.png": "imagePreview.previewEditor", ...STUDIO_ASSOCIATION });
  assert.deepEqual(values.get(`workspace|${ASSOCIATIONS}`), STUDIO_ASSOCIATION);
  assert.equal(values.has(`user|${FILES}`) || values.has(`workspace|${FILES}`), false);
  assert.deepEqual(uiCalls, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("user on and workspace off: the association goes to the user settings and both values are removed", async () => {
  const { values, uiCalls, run } = setup({ [`user|${FILES}`]: true, [`workspace|${FILES}`]: false });
  assert.deepEqual(await run(), ["user"]);
  assert.deepEqual(values.get(`user|${ASSOCIATIONS}`), STUDIO_ASSOCIATION);
  assert.equal(values.has(`workspace|${ASSOCIATIONS}`), false, "no association in the workspace scope");
  assert.equal(values.has(`user|${FILES}`) || values.has(`workspace|${FILES}`), false);
  assert.deepEqual(uiCalls, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S2
test("off or not set in both scopes: no association is written and the leftover values are removed", async () => {
  const { values, writes, uiCalls, run } = setup({
    [`user|${FILES}`]: false,
    [`workspace|${SEARCH}`]: false,
    [`user|${SEARCH}`]: true,
  });
  assert.deepEqual(await run(), []);
  assert.equal(writes.some((name) => name.endsWith(ASSOCIATIONS)), false);
  assert.deepEqual([...values.keys()], []);
  assert.deepEqual(uiCalls, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("a fresh install writes nothing at all", async () => {
  const { writes, globalState, workspaceState, uiCalls, run } = setup({});
  assert.deepEqual(await run(), []);
  assert.deepEqual(writes, []);
  assert.deepEqual([globalState.log, workspaceState.log, uiCalls], [[], [], []]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("the association is written before the setting is removed", async () => {
  const { writes, run } = setup({ [`user|${FILES}`]: true });
  await run();
  assert.deepEqual(writes, [`user|${ASSOCIATIONS}`, `user|${FILES}`]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("a failing association write keeps the setting, is logged, shows nothing, and the other scope still restores", async () => {
  const { values, errors, uiCalls, run } = setup({
    [`user|${FILES}`]: true,
    [`workspace|${FILES}`]: true,
  }, `user|${ASSOCIATIONS}`);
  assert.deepEqual(await run(), ["workspace"]);
  assert.equal(errors.length, 1);
  assert.equal(values.get(`user|${FILES}`), true, "the setting is the mark: it is still there");
  assert.equal(values.has(`user|${ASSOCIATIONS}`), false);
  assert.deepEqual(values.get(`workspace|${ASSOCIATIONS}`), STUDIO_ASSOCIATION);
  assert.deepEqual(uiCalls, [], "no notification, no warning, nothing");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("a second run writes nothing", async () => {
  const { writes, run } = setup({ [`user|${FILES}`]: true, [`workspace|${FILES}`]: true });
  await run();
  writes.length = 0;
  assert.deepEqual(await run(), []);
  assert.deepEqual(writes, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("a malformed association keeps the setting, writes nothing there and shows nothing; the other retired setting is removed", async () => {
  const { values, writes, errors, uiCalls, run } = setup({
    [`user|${FILES}`]: true,
    [`user|${SEARCH}`]: false,
    [`user|${ASSOCIATIONS}`]: "not an association",
  });
  assert.deepEqual(await run(), []);
  assert.equal(values.get(`user|${FILES}`), true, "nothing is lost");
  assert.equal(values.get(`user|${ASSOCIATIONS}`), "not an association");
  assert.equal(values.has(`user|${SEARCH}`), false);
  assert.deepEqual(writes, [`user|${SEARCH}`]);
  assert.equal(errors.length, 1, "logged");
  assert.deepEqual(uiCalls, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("a scope that has another editor for *.md keeps it and the setting is still removed", async () => {
  const { values, writes, run } = setup({
    [`user|${FILES}`]: true,
    [`user|${ASSOCIATIONS}`]: { "*.md": "vscode.markdown.preview.editor" },
  });
  assert.deepEqual(await run(), ["user"]);
  assert.deepEqual(values.get(`user|${ASSOCIATIONS}`), { "*.md": "vscode.markdown.preview.editor" });
  assert.deepEqual(writes, [`user|${FILES}`]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S2
test("the state keys the 1.11.0 migration left are removed, and only when they exist", async () => {
  const { globalState, workspaceState, run } = setup({});
  globalState.values.set(OLD_MARK, true);
  await run();
  assert.equal(globalState.get(OLD_MARK), undefined);
  assert.deepEqual(globalState.log, [`update ${OLD_MARK}`]);
  assert.deepEqual(workspaceState.log, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
test("a host without a setting writer restores nothing", async () => {
  const result = await restoreEditorAssociation({
    settingScopes: undefined, globalState: new MemoryStore(), workspaceState: new MemoryStore(), logger: recordingLogger(),
  });
  assert.deepEqual(result, []);
});
