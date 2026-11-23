import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { EDITOR_VIEW_TYPE } from "./extensionApi";
import { withSuiteWatchdog } from "./stepWatchdog";

const RETIRED = /markdownOkfSchemaStudio\.open\./u;

function read(file: string): string {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

async function waitUntil(label: string, condition: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195
/**
 * CR 477 reverse migration, in a window of its own (the launcher `runReverseMigrationScenario` of
 * run-tests.ts): the user `settings.json` was seeded with the retired setting on, and so was the
 * `.code-workspace` file. After one activation both files carry `"*.md": "<Studio type>"` in
 * `workbench.editorAssociations` and no retired `open.*` key; nothing is shown to the reader.
 */
export async function run(): Promise<void> {
  await withSuiteWatchdog("reverse-migration-suite", runReverseMigration);
}

async function runReverseMigration(): Promise<void> {
  const userData = process.env.STUDIO_USER_DATA_DIR;
  assert.ok(userData, "the launcher passes STUDIO_USER_DATA_DIR");
  const userSettings = path.join(userData, "User", "settings.json");
  const workspaceFile = vscode.workspace.workspaceFile;
  assert.ok(workspaceFile && workspaceFile.scheme === "file", "the window opened a .code-workspace file");
  assert.match(read(userSettings), RETIRED, "the user settings were seeded with the retired setting");
  assert.match(read(workspaceFile.fsPath), RETIRED, "the workspace file was seeded with the retired setting");

  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await waitUntil("the retired settings to leave both files", () =>
    !RETIRED.test(read(userSettings)) && !RETIRED.test(read(workspaceFile.fsPath)), 30_000);

  for (const [label, text] of [["user settings", read(userSettings)], ["workspace file", read(workspaceFile.fsPath)]]) {
    assert.doesNotMatch(text, RETIRED, `${label}: no retired key left`);
    assert.match(text, /"workbench\.editorAssociations"/u, `${label}: the association is written`);
    assert.match(text, new RegExp(`"\\*\\.md"\\s*:\\s*"${EDITOR_VIEW_TYPE.replace(/\./gu, "\\.")}"`, "u"), `${label}: *.md goes to Studio`);
  }
  const configuration = vscode.workspace.getConfiguration("workbench").inspect<Record<string, string>>("editorAssociations");
  assert.equal(configuration?.globalValue?.["*.md"], EDITOR_VIEW_TYPE, "the user value, read by VS Code");
  assert.equal(configuration?.workspaceValue?.["*.md"], EDITOR_VIEW_TYPE, "the workspace value, read by VS Code");
}
