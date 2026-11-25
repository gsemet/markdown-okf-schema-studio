/**
 * Host tests of the line hand-off to Studio tabs: the pending line a Studio tab takes once, the
 * line given to a live Studio tab, what a link followed from a Studio tab opened (a new Studio tab,
 * a Studio tab already open in another group, a text editor), and the "Open in Studio at This Line"
 * command. The real activation runs against the fake `vscode` module.
 */
import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

// The harness first: it installs the fake `vscode` module the production imports below need.
import { captured, fake, startStudio, writeFile, type Studio } from "./lifeReqHarness";

const STUDIO_TYPE = "markdown-okf-schema-studio.editor";
const OPEN_AT_LINE = "markdown-okf-schema-studio.openInStudioAtLine";

function start(t: TestContext): Studio {
  fake.controls.studioTabs.length = 0;
  fake.controls.executedCommands.length = 0;
  fake.controls.closedTabs.length = 0;
  fake.controls.activeGroupColumn.value = 1;
  fake.controls.commands.delete("vscode.open");
  fake.controls.commands.delete("vscode.openWith");
  const studio = startStudio(t.mock.timers);
  t.after(() => {
    fake.controls.commands.delete("vscode.open");
    fake.controls.commands.delete("vscode.openWith");
    studio.close();
  });
  return studio;
}

const uriOf = (file: string): string => fake.vscode.Uri.file(file).toString();
const calls = (id: string): Array<{ args: unknown[] }> => fake.controls.executedCommands.filter((call) => call.id === id);

/** What VS Code does for a Studio tab: a document, a panel in `column`, and the provider's resolve. */
async function resolveStudioTab(studio: Studio, file: string, column = 2): Promise<void> {
  const document = await fake.vscode.workspace.openTextDocument(fake.vscode.Uri.file(file));
  const panel = fake.vscode.window.createWebviewPanel(STUDIO_TYPE, "Studio", column);
  await captured.provider!.resolveCustomTextEditor(document, panel);
  await studio.settle();
}

const studioTabOf = (studio: Studio, file: string) =>
  studio.manager.latest((session) => session.inStudioTab && session.documentUri === uriOf(file));

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S2
test("a Studio tab that opens with a pending line asks its page to reveal it, once; without one it asks nothing", async (t) => {
  const studio = start(t);
  const file = writeFile("# One\n\ntext\n");
  studio.activation.studioLines.pending.record(uriOf(file), 3);
  await resolveStudioTab(studio, file);
  const first = studioTabOf(studio, file)!;
  assert.equal(first.scroll.pendingRevealLine?.line, 3);
  assert.equal(studio.activation.studioLines.pending.has(uriOf(file)), false, "taken by the resolve");
  const second = writeFile("# Two\n");
  await resolveStudioTab(studio, second, 3);
  assert.equal(studioTabOf(studio, second)?.scroll.pendingRevealLine, undefined, "no pending line: nothing to reveal");
  await resolveStudioTab(studio, file, 4);
  const again = studio.manager.latest((session) => session.inStudioTab && session.documentUri === uriOf(file) && session !== first);
  assert.equal(again?.scroll.pendingRevealLine, undefined, "the line was taken once: a later opening of the file gets none");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S1
test("a line delivered to the live Studio tab of a revealed file is gone afterwards, so a later opening reveals nothing", async (t) => {
  const studio = start(t);
  const file = writeFile("# One\n\ntext\n");
  await resolveStudioTab(studio, file, 2);
  const live = studioTabOf(studio, file)!;
  studio.activation.studioLines.pending.deliver(uriOf(file), 2, 2);
  assert.equal(live.scroll.pendingRevealLine?.line, 2, "the live session got the line");
  assert.equal(studio.activation.studioLines.pending.has(uriOf(file)), false, "not left pending");
  await resolveStudioTab(studio, file, 3);
  const created = studio.manager.latest((session) => session.inStudioTab && session.documentUri === uriOf(file) && session !== live);
  assert.equal(created?.scroll.pendingRevealLine, undefined, "a resolve right after reveals nothing");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S2
test("a link from a Studio tab that opens as text reports other and drops the line, and closes no tab", async (t) => {
  const studio = start(t);
  const target = writeFile("# Target\n\nbody\n");
  fake.controls.commands.set("vscode.open", () => {
    fake.controls.openTab(target, { line: 3 });
  });
  const outcome = await studio.activation.host.navigation.showDocument(uriOf(target), undefined, { fromStudioTab: true, line: 3 });
  assert.equal(outcome, "other");
  assert.equal(studio.activation.studioLines.pending.has(uriOf(target)), false, "the pending line is dropped");
  assert.deepEqual(fake.controls.closedTabs, [], "no tab closed");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S1
test("a link from a Studio tab that opens a new Studio tab reports studio-created and the new tab reveals the line", async (t) => {
  const studio = start(t);
  const target = writeFile("# Target\n\nbody\n");
  fake.controls.commands.set("vscode.open", async () => {
    fake.controls.studioTabs.push({ viewColumn: 1, filePath: target, isActive: true });
    await resolveStudioTab(studio, target, 1);
  });
  const outcome = await studio.activation.host.navigation.showDocument(uriOf(target), undefined, { fromStudioTab: true, line: 3 });
  assert.equal(outcome, "studio-created");
  assert.equal(studioTabOf(studio, target)?.scroll.pendingRevealLine?.line, 3);
  assert.equal(studio.activation.studioLines.pending.has(uriOf(target)), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S2
test("a link, Back or Next to a file whose Studio tab is open in another group reveals that tab in its group, with no second tab", async (t) => {
  const studio = start(t);
  const target = writeFile("# Target\n\nbody\n");
  await resolveStudioTab(studio, target, 2);
  fake.controls.studioTabs.push({ viewColumn: 2, filePath: target, isActive: false });
  const existing = studioTabOf(studio, target)!;
  fake.controls.executedCommands.length = 0;
  const outcome = await studio.activation.host.navigation.showDocument(uriOf(target), undefined, { fromStudioTab: true, line: 3 });
  assert.equal(outcome, "studio-existing");
  assert.deepEqual(calls("vscode.open"), [], "no new tab through vscode.open");
  const opened = calls("vscode.openWith");
  assert.equal(opened.length, 1);
  assert.equal((opened[0]!.args[0] as { toString(): string }).toString(), uriOf(target));
  assert.equal(opened[0]!.args[1], STUDIO_TYPE);
  assert.deepEqual(opened[0]!.args[2], { viewColumn: 2, preview: false }, "revealed in its own group");
  assert.equal(existing.scroll.pendingRevealLine?.line, 3, "the live session got the line");
  assert.equal(studio.activation.studioLines.pending.has(uriOf(target)), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-198#S2
test("Open in Studio at This Line opens the Studio view type in the text editor's group at the caret's line and closes no tab", async (t) => {
  const studio = start(t);
  const file = writeFile("# One\n\ntext\nmore\n");
  fake.controls.openTab(file, { viewColumn: 2, line: 4 });
  await studio.runCommand(OPEN_AT_LINE);
  const opened = calls("vscode.openWith");
  assert.equal(opened.length, 1);
  assert.equal(opened[0]!.args[1], STUDIO_TYPE);
  assert.deepEqual(opened[0]!.args[2], { viewColumn: 2, preview: false });
  assert.equal(studio.activation.studioLines.pending.take(uriOf(file)), 4, "the caret's 1-based line is pending");
  assert.deepEqual(fake.controls.closedTabs, [], "the text tab stays");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-198#S1
test("Open in Studio at This Line reveals the Studio tab of the file already open in another group and gives it the line", async (t) => {
  const studio = start(t);
  const file = writeFile("# One\n\ntext\nmore\n");
  await resolveStudioTab(studio, file, 3);
  fake.controls.studioTabs.push({ viewColumn: 3, filePath: file, isActive: false });
  const live = studioTabOf(studio, file)!;
  fake.controls.openTab(file, { viewColumn: 1, line: 2 });
  fake.controls.executedCommands.length = 0;
  await studio.runCommand(OPEN_AT_LINE);
  assert.deepEqual(calls("vscode.openWith")[0]!.args[2], { viewColumn: 3, preview: false }, "no second Studio tab");
  assert.equal(live.scroll.pendingRevealLine?.line, 2);
  assert.equal(studio.activation.studioLines.pending.has(uriOf(file)), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-198#S2
test("Open in Studio at This Line tells the reader and opens nothing on a Studio tab, with no editor and on a file that is not Markdown", async (t) => {
  const studio = start(t);
  const refused = async (): Promise<void> => {
    fake.controls.executedCommands.length = 0;
    const before = fake.controls.shownMessages.length;
    await studio.runCommand(OPEN_AT_LINE);
    await studio.settle();
    assert.deepEqual([calls("vscode.openWith").length, fake.controls.closedTabs.length], [0, 0]);
    assert.equal(fake.controls.shownMessages.length, before + 1);
  };
  fake.controls.activateCustomEditorTab(writeFile("# Studio tab\n"));
  await refused();
  fake.controls.activateCustomEditorTab(undefined);
  await refused();
  await fake.controls.showDocument(writeFile("plain\n", undefined, `notes-${process.pid}.txt`));
  await refused();
  assert.match(fake.controls.shownMessages.at(-1)!.text, /Open a Markdown file as text to open it in Studio at a line\./u);
});
