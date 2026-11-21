/**
 * Host tests of the opening watcher (CR 445): the real activation against the fake `vscode` module.
 * A Markdown text tab that opens at a line (a jump) or plainly is replaced by a Studio tab, or kept,
 * as the policy says; the settings are read after the editor association migration.
 */
import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

// The harness first: it installs the fake `vscode` module the production imports below need.
import { fake, startStudio, writeFile, type Studio } from "./lifeReqHarness";
import * as vscode from "vscode";

const MARKDOWN_IN_STUDIO = "markdownOkfSchemaStudio.open.markdownFilesInStudio";
const SEARCH_IN_STUDIO = "markdownOkfSchemaStudio.open.searchResultsInStudio";
const STUDIO_TYPE = "markdown-okf-schema-studio.editor";

function reset(): void {
  fake.controls.studioTabs.length = 0;
  fake.controls.executedCommands.length = 0;
  fake.controls.closedTabs.length = 0;
  fake.controls.activeGroupColumn.value = 1;
  fake.controls.configuration.values.clear();
  fake.controls.configuration.updates.length = 0;
}

function start(t: TestContext): Studio {
  reset();
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  return studio;
}

const openWith = (): Array<{ args: unknown[] }> => fake.controls.executedCommands.filter((call) => call.id === "vscode.openWith");
const uriOf = (file: string): string => vscode.Uri.file(file).toString();

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
test("a Markdown file that opens at a line is replaced by a Studio tab that waits for the line, and the text tab closes", async (t) => {
  const studio = start(t);
  const file = writeFile("# A\n\ntext\n");
  const tab = fake.controls.openTab(file, { line: 12, isPreview: true });
  await studio.settle();
  const calls = openWith();
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.args[1], STUDIO_TYPE);
  assert.deepEqual(calls[0]!.args[2], { viewColumn: 1, preview: true, preserveFocus: false });
  assert.deepEqual(fake.controls.closedTabs, [tab]);
  assert.equal(studio.activation.lineRequests.takePending(uriOf(file)), 12);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
test("a plain opening stays a text editor by default and becomes a Studio tab with no line when Open Markdown files in Studio is on", async (t) => {
  const studio = start(t);
  const file = writeFile("# A\n");
  fake.controls.openTab(file);
  await studio.settle();
  assert.equal(openWith().length, 0);
  assert.deepEqual(fake.controls.closedTabs, []);

  fake.controls.configuration.values.set(MARKDOWN_IN_STUDIO, { globalValue: true });
  const other = writeFile("# B\n");
  const tab = fake.controls.openTab(other);
  await studio.settle();
  assert.equal(openWith().length, 1);
  assert.deepEqual(fake.controls.closedTabs, [tab]);
  assert.equal(studio.activation.lineRequests.takePending(uriOf(other)), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
test("a jump with Open search results in Studio off stays a text editor", async (t) => {
  const studio = start(t);
  fake.controls.configuration.values.set(SEARCH_IN_STUDIO, { globalValue: false });
  fake.controls.openTab(writeFile("# A\n"), { line: 3 });
  await studio.settle();
  assert.equal(openWith().length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
test("a diff tab, a tab present at start and a file that is not a .md stay as they are", async (t) => {
  reset();
  const restored = writeFile("# Restored\n");
  const restoredTab = fake.controls.openTab(restored, { line: 5, fire: false });
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  fake.controls.configuration.values.set(MARKDOWN_IN_STUDIO, { globalValue: true });
  // The restored tab is reported again (VS Code announces the tabs it restores): never replaced.
  fake.controls.events.changeTabs.fire({ opened: [restoredTab], closed: [], changed: [] });
  fake.controls.openTab(writeFile("# D\n"), { kind: "diff" });
  fake.controls.openTab(writeFile("plain text\n", undefined, "notes.txt"), { line: 2 });
  await studio.settle();
  assert.equal(openWith().length, 0);
  assert.deepEqual(fake.controls.closedTabs, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
test("the settings are read after the editor association migration wrote them", async (t) => {
  reset();
  fake.controls.configuration.values.set("workbench.editorAssociations", { globalValue: { "*.md": STUDIO_TYPE } });
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  // A plain opening right at the start: it counts only once the migration turned the setting on.
  const file = writeFile("# A\n");
  const tab = fake.controls.openTab(file);
  await studio.settle();
  assert.ok(fake.controls.configuration.updates.some((update) => update.key === "markdownFilesInStudio" && update.value === true),
    "the migration turned Open Markdown files in Studio on");
  assert.equal(openWith().length, 1, "the watcher saw the migrated setting");
  assert.deepEqual(fake.controls.closedTabs, [tab]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
test("a jump stays a text editor while a side preview that follows the active editor is open", async (t) => {
  const studio = start(t);
  await studio.openSide(writeFile("# Side\n"));
  fake.controls.executedCommands.length = 0;
  fake.controls.openTab(writeFile("# Target\n"), { line: 7 });
  await studio.settle();
  assert.equal(openWith().length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-185
test("a text editor Studio opened itself, and one reopened as text from a Studio tab, are kept", async (t) => {
  const studio = start(t);
  fake.controls.configuration.values.set(MARKDOWN_IN_STUDIO, { globalValue: true });
  const own = writeFile("# Own\n");
  studio.activation.openedByStudio.record(uriOf(own));
  fake.controls.openTab(own, { line: 4 });

  const reopened = writeFile("# Reopened\n");
  const studioEntry = { viewColumn: 1, filePath: reopened, isActive: true };
  fake.controls.studioTabs.push(studioEntry);
  const studioTab = fake.vscode.window.tabGroups.all.flatMap((group) => group.tabs).at(-1)!;
  fake.controls.events.changeTabs.fire({ opened: [], closed: [], changed: [studioTab] });
  fake.controls.studioTabs.splice(fake.controls.studioTabs.indexOf(studioEntry), 1);
  fake.controls.events.changeTabs.fire({ opened: [], closed: [studioTab], changed: [] });
  fake.controls.openTab(reopened, { line: 6 });
  await studio.settle();
  assert.equal(openWith().length, 0);
  assert.deepEqual(fake.controls.closedTabs, []);
});
