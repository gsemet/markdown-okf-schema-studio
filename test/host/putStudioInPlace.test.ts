/**
 * Host tests of CR-445: `putStudioInPlace` and the host's `showDocumentInStudio` against the fake
 * `vscode` module: the tab the opening policy picks, the line it records or delivers, the text tab
 * that is closed, and the recency of the Studio tabs.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

// The harness first: it installs the fake `vscode` module the production imports below need.
import { fake, writeFile } from "./lifeReqHarness";
import { StudioLineRequests, StudioOpenedTextEditors } from "../../src/host-vscode/openInStudio";
import { putStudioInPlace, trackStudioActivation } from "../../src/host-vscode/studioPlacement";
import { createVscodeHost } from "../../src/host-vscode/vscodeHost";
import * as vscode from "vscode";

const openWith = (): Array<{ args: unknown[] }> => fake.controls.executedCommands.filter((call) => call.id === "vscode.openWith");

function reset(): void {
  fake.controls.studioTabs.length = 0;
  fake.controls.executedCommands.length = 0;
  fake.controls.closedTabs.length = 0;
  fake.controls.activeGroupColumn.value = 1;
}

const textTab = (isPreview = false, isActive = true): { tab: vscode.Tab; group: vscode.TabGroup } => ({
  tab: { isPreview, isActive } as vscode.Tab,
  group: { viewColumn: 1 } as vscode.TabGroup,
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("a text tab with no Studio tab of the file becomes a Studio tab in its group, with the line recorded and the text tab closed", async () => {
  reset();
  const file = writeFile("# A\n");
  const requests = new StudioLineRequests();
  const replaced = textTab(true, false);
  await putStudioInPlace(requests, { uri: vscode.Uri.file(file), line: 12, textTab: replaced, action: "studio" });
  const calls = openWith();
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.args[1], "markdown-okf-schema-studio.editor");
  assert.deepEqual(calls[0]!.args[2], { viewColumn: 1, preview: true, preserveFocus: true });
  assert.deepEqual(fake.controls.closedTabs, [replaced.tab], "the text tab it replaces is closed");
  assert.equal(requests.takePending(vscode.Uri.file(file).toString()), 12, "the line waits for the new Studio tab");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("a Studio tab of the file in the text tab's own group is revealed and given the line", async () => {
  reset();
  const file = writeFile("# A\n");
  fake.controls.studioTabs.push({ viewColumn: 1, filePath: file, isActive: false });
  const requests = new StudioLineRequests();
  await putStudioInPlace(requests, { uri: vscode.Uri.file(file), line: 4, textTab: textTab(), action: "studio" });
  assert.deepEqual(openWith()[0]!.args[2], { viewColumn: 1, preview: false });
  // No live session took the line in this test, so it waits for the tab as a pending line.
  assert.equal(requests.takePending(vscode.Uri.file(file).toString()), 4);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-182
// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("showDocumentInStudio reveals the most recently active Studio tab of another group and opens no text tab", async () => {
  reset();
  const file = writeFile("# A\n");
  const requests = new StudioLineRequests();
  const host = createVscodeHost(new StudioOpenedTextEditors(), requests);
  const subscription = trackStudioActivation();
  try {
    fake.controls.studioTabs.push({ viewColumn: 2, filePath: file, isActive: true }, { viewColumn: 3, filePath: file, isActive: true });
    fake.controls.activeGroupColumn.value = 2;
    fake.controls.events.changeTabs.fire({ opened: [], closed: [], changed: fake.vscode.window.tabGroups.all[1]!.tabs });
    fake.controls.activeGroupColumn.value = 3;
    fake.controls.events.changeTabs.fire({ opened: [], closed: [], changed: fake.vscode.window.tabGroups.all.find((group) => group.viewColumn === 3)!.tabs });
    // The reader is now in group 1, which holds no Studio tab of the file.
    fake.controls.activeGroupColumn.value = 1;
    // Column 2 was active first, column 3 last: the jump goes to column 3 even though column 2 is listed first.
    await host.navigation.showDocumentInStudio(vscode.Uri.file(file).toString(), 7);
    assert.deepEqual(openWith().map((call) => (call.args[2] as { viewColumn: number }).viewColumn), [3]);
    assert.deepEqual(fake.controls.closedTabs, [], "Studio's own navigation closes no tab");
    assert.equal(requests.takePending(vscode.Uri.file(file).toString()), 7);
  } finally {
    subscription.dispose();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-182
test("showDocumentInStudio with no Studio tab of the file opens one and records the line", async () => {
  reset();
  const file = writeFile("# A\n");
  const requests = new StudioLineRequests();
  const host = createVscodeHost(new StudioOpenedTextEditors(), requests);
  await host.navigation.showDocumentInStudio(vscode.Uri.file(file).toString(), 9);
  assert.equal(openWith().length, 1);
  assert.equal(requests.takePending(vscode.Uri.file(file).toString()), 9);
});
