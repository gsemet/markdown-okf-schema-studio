/** Requirement tests of the extension manifest that concern the lifecycle (activation and engine). */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8")) as {
  activationEvents: string[];
  engines: { vscode: string };
};

// @tests_req SwRS-MDOKFSTUDIO-LIFE-001
test("the extension activates only on its commands, its Open With editor and panel restore", () => {
  assert.deepEqual([...manifest.activationEvents].sort(), [
    "onCommand:markdown-okf-schema-studio.openPreview",
    "onCommand:markdown-okf-schema-studio.refreshPreview",
    "onCustomEditor:markdown-okf-schema-studio.editor",
    "onWebviewPanel:markdown-okf-schema-studio.preview",
  ]);
  assert.ok(manifest.activationEvents.every((event) => !event.startsWith("onLanguage") && !event.startsWith("workspaceContains")));
});

test("the extension declares VS Code 1.95 as its minimum version", () => {
  assert.equal(manifest.engines.vscode, "^1.95.0");
});
