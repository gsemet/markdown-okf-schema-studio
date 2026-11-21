/**
 * Host tests of CR-445 round 1 that run the real activation against the fake `vscode` module: the
 * lazy start of the services, the setting writer, the "Open as Text" command and the registry of the
 * text editors Studio opened.
 */
import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

// The harness first: it installs the fake `vscode` module the production imports below need.
import { captured, fake, startStudio, workspaceRoot, writeFile, type Studio } from "./lifeReqHarness";
import { OPEN_AS_TEXT_COMMAND_ID as OPEN_AS_TEXT, SHOW_INTRODUCTIONS_COMMAND_ID as SHOW_AGAIN } from "../../src/host-vscode/activation";
import { createVscodeSettingScopes } from "../../src/host-vscode/vscodeHost";
import { StudioOpenedTextEditors } from "../../src/host-vscode/openInStudio";
import { servicesStartedForTests, setCurrentActivation } from "../../src/host-vscode/testHooks";


function start(t: TestContext): Studio {
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  return studio;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-001
// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("an activation with no preview starts no service, the first preview starts them once, a second one does not again", async (t) => {
  const studio = start(t);
  setCurrentActivation(studio.activation);
  t.after(() => setCurrentActivation(undefined));
  assert.equal(studio.activation.servicesStarted, false);
  assert.equal(servicesStartedForTests(), false);
  const confWatchers = (): number => captured.watchers.filter((entry) => entry.pattern === "**/conf.py").length;
  const before = confWatchers();
  const { panel } = await studio.openSide(writeFile("# One\n"));
  assert.equal(studio.activation.servicesStarted, true);
  assert.equal(servicesStartedForTests(), true);
  assert.equal(confWatchers(), before + 1, "the first preview started the conf.py watcher");
  const document = await fake.controls.showDocument(writeFile("# Two\n"));
  await captured.provider!.resolveCustomTextEditor(document, fake.vscode.window.createWebviewPanel("markdown-okf-schema-studio.editor", "Studio", 2));
  assert.equal(confWatchers(), before + 1, "the second preview started no service again");
  assert.ok(panel);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-001
test("an activation with no preview creates no file watcher", (t) => {
  const watchersBefore = captured.watchers.length;
  const studio = start(t);
  assert.equal(captured.watchers.length, watchersBefore, "no watcher before the first preview");
  assert.equal(studio.activation.servicesStarted, false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("the setting writer maps the user and workspace values, and writes to the matching target", async () => {
  fake.controls.configuration.values.set("workbench.editorAssociations", { globalValue: { "*.md": "x" }, workspaceValue: undefined });
  fake.controls.configuration.updates.length = 0;
  const scopes = createVscodeSettingScopes();
  assert.deepEqual(scopes.inspect("workbench", "editorAssociations"), { user: { "*.md": "x" }, workspace: undefined });
  await scopes.write("markdownOkfSchemaStudio.open", "markdownFilesInStudio", true, "user");
  await scopes.write("workbench", "editorAssociations", undefined, "workspace");
  assert.deepEqual(fake.controls.configuration.updates, [
    { section: "markdownOkfSchemaStudio.open", key: "markdownFilesInStudio", value: true, target: 1 },
    { section: "workbench", key: "editorAssociations", value: undefined, target: 2 },
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-149
// @tests_req SwRS-MDOKFSTUDIO-LIFE-175
test("the setting writer refuses the built-in Markdown preview settings and any other key without writing", async () => {
  fake.controls.configuration.updates.length = 0;
  const scopes = createVscodeSettingScopes();
  for (const [section, key] of [["markdown.preview", "fontSize"], ["workbench", "colorTheme"], ["editor", "wordWrap"], ["workbench", "editorAssociationsX"]] as const) {
    await assert.rejects(Promise.resolve(scopes.write(section, key, 1, "user")), /never writes/u, `${section}.${key}`);
  }
  assert.deepEqual(fake.controls.configuration.updates, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-177
test("Open as Text on a Studio tab opens the text editor at the previewed line, closes the Studio tab and records the file", async (t) => {
  const studio = start(t);
  const file = writeFile("# One\n\ntext\n");
  fake.controls.shownTextOptions.length = 0;
  fake.controls.closedTabs.length = 0;
  fake.controls.activateCustomEditorTab(file);
  await studio.runCommand(OPEN_AS_TEXT);
  assert.equal(fake.controls.shownTextOptions.length, 1);
  assert.equal((fake.controls.shownTextOptions[0] as { preview: boolean }).preview, false);
  assert.equal(fake.controls.closedTabs.length, 1, "the Studio tab is closed");
  const uri = fake.vscode.Uri.file(file).toString();
  assert.equal(studio.activation.openedByStudio.has(uri), true, "the watcher will not replace this text editor");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-177
test("Open as Text with no Studio tab active tells the reader and opens nothing", async (t) => {
  const studio = start(t);
  fake.controls.activateCustomEditorTab(undefined);
  fake.controls.shownTextOptions.length = 0;
  fake.controls.closedTabs.length = 0;
  const messages = fake.controls.shownMessages.length;
  await studio.runCommand(OPEN_AS_TEXT);
  await studio.settle();
  assert.deepEqual([fake.controls.shownTextOptions.length, fake.controls.closedTabs.length], [0, 0]);
  assert.equal(fake.controls.shownMessages.length, messages + 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("Show Feature Introductions Again forgets the stored introductions", async (t) => {
  const studio = start(t);
  const key = "markdownOkfSchemaStudio.introductions.openInStudio";
  await studio.context.globalState.update(key, true);
  await studio.runCommand(SHOW_AGAIN);
  assert.equal(studio.context.globalState.get(key), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-177
test("the registry of Studio's text editors remembers a file for a few seconds only", () => {
  let now = 1000;
  const registry = new StudioOpenedTextEditors(() => now);
  assert.equal(registry.has("file:///a.md"), false);
  registry.record("file:///a.md");
  now += 4999;
  assert.equal(registry.has("file:///a.md"), true);
  assert.equal(registry.has("file:///b.md"), false);
  now += 2;
  assert.equal(registry.has("file:///a.md"), false);
  assert.ok(workspaceRoot.length > 0);
});
