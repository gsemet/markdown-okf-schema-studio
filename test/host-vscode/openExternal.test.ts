/**
 * The VS Code navigation (`src/host-vscode/vscodeHost.ts`): only http, https and mailto reach
 * `vscode.env.openExternal`, whatever string the caller passes.
 */

import * as assert from "node:assert/strict";
import * as os from "node:os";
import { test } from "node:test";

import { createFakeVscode } from "../host/fakeVscode";

const fake = createFakeVscode({ workspaceRoot: os.tmpdir() });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeModule = require("node:module") as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = nodeModule._load;
nodeModule._load = function load(request: string, ...rest: unknown[]): unknown {
  return request === "vscode" ? fake.vscode : originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createVscodeHost } = require("../../src/host-vscode/vscodeHost") as typeof import("../../src/host-vscode/vscodeHost");

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-090
test("only http, https and mailto URIs reach openExternal", async () => {
  const opened: string[] = [];
  const env = fake.vscode.env as unknown as { openExternal: (uri: { scheme: string; toString(): string }) => Promise<boolean> };
  env.openExternal = (uri) => { opened.push(`${uri.scheme}`); return Promise.resolve(true); };
  const { navigation } = createVscodeHost();
  for (const url of [
    "https%3A/../../System/Applications/Calculator.app",
    "/System/Applications/Calculator.app",
    "file:///System/Applications/Calculator.app",
    "javascript:alert(1)",
    "vscode://file/secret",
    "",
  ]) {
    assert.equal(await navigation.openExternal(url), false, url);
  }
  assert.deepEqual(opened, [], "a refused link never reaches the system");
  for (const url of ["https://example.test/a", "HTTP://example.test", "mailto:a@example.test"]) {
    assert.equal(await navigation.openExternal(url), true, url);
  }
  assert.equal(opened.length, 3);
});
