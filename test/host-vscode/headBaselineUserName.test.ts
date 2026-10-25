import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createHeadBaseline, type GitExtensionLike } from "../../src/host-vscode/headBaseline";

interface FakeUri { scheme: string; fsPath: string }

function extensionWith(getConfig: ((key: string) => Promise<string>) | undefined, active = true) {
  const repository = {
    show: async () => "",
    state: { HEAD: { commit: "c" }, onDidChange: () => ({ dispose() {} }) },
    ...(getConfig ? { getConfig } : {}),
  };
  const extension: GitExtensionLike<FakeUri> = {
    isActive: active,
    activate: async () => { extension.isActive = true; },
    exports: { getAPI: () => ({ getRepository: () => repository }) },
  };
  return extension;
}
const uri = { scheme: "file", fsPath: "/w/a.md" };

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-065
test("T43: userName reads user.name through the Git API and trims it", async () => {
  const keys: string[] = [];
  const baseline = createHeadBaseline(() => extensionWith(async (key) => { keys.push(key); return " Ada Lovelace \n"; }));
  assert.equal(await baseline.userName(uri), "Ada Lovelace");
  assert.deepEqual(keys, ["user.name"]);
});

test("T43: userName is undefined without Git, a repository, getConfig or a value", async () => {
  assert.equal(await createHeadBaseline<FakeUri>(() => undefined).userName(uri), undefined);
  assert.equal(await createHeadBaseline(() => extensionWith(undefined)).userName(uri), undefined);
  assert.equal(await createHeadBaseline(() => extensionWith(async () => "")).userName(uri), undefined);
  assert.equal(await createHeadBaseline(() => extensionWith(async () => { throw new Error("x"); })).userName(uri), undefined);
  assert.equal(await createHeadBaseline(() => extensionWith(async () => "n", false)).userName({ scheme: "untitled", fsPath: "x" }), undefined);
});
