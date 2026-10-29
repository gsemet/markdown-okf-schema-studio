/**
 * Requirement tests of the preview lifecycle (scope lifecycle-sync) that run the real activation
 * against the fake `vscode` module (`lifeReqHarness.ts`). Each test asserts what the code does
 * today; a Known issue of a requirement is asserted as it behaves.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test, type TestContext } from "node:test";

import type { PreviewSession } from "../../src/session/previewSession";
import {
  captured,
  COMMAND_ID,
  fake,
  FakeTextDocument,
  identityOfDocument,
  outsideRoot,
  REFRESH_COMMAND_ID,
  setRenderOverrideForTests,
  startStudio,
  Uri,
  workspaceRoot,
  writeFile,
  type FakeWebviewPanel,
  type Studio,
} from "./lifeReqHarness";

const DEFAULT_PANEL_TYPE = "markdown-okf-schema-studio.preview";
const EDITOR_TYPE = "markdown-okf-schema-studio.editor";

function start(t: TestContext, options: { trusted?: boolean } = {}): Studio {
  const studio = startStudio(t.mock.timers, options);
  t.after(() => studio.close());
  return studio;
}

function lastHtml(panel: FakeWebviewPanel): string {
  return panel.htmlAssignments.at(-1) ?? "";
}

function lastRendered(panel: FakeWebviewPanel): string {
  return [...panel.htmlAssignments].reverse().find((html) => identityOfDocument(html) !== undefined)!;
}

function newPanel(type: string, column = 2): FakeWebviewPanel {
  return fake.vscode.window.createWebviewPanel(type, "Studio", column) as unknown as FakeWebviewPanel;
}

function sessionsOf(studio: Studio): PreviewSession[] {
  return [...studio.manager.sessions()];
}

/** Opens `file` in an Open With editor (a fixed preview) and waits for its first page. */
async function openWith(studio: Studio, file: string): Promise<FakeWebviewPanel> {
  const document = await fake.controls.showDocument(file);
  const panel = newPanel(EDITOR_TYPE);
  await captured.provider!.resolveCustomTextEditor(document, panel);
  await studio.renderDone(panel);
  return panel;
}

/** Runs a command whose render waits for the (mocked) debounce: moves the clock, then awaits it. */
async function runAndSettle(studio: Studio, id: string, ...args: unknown[]): Promise<void> {
  const done = studio.runCommand(id, ...args);
  await studio.advance(300);
  await done;
}

/** Restores a panel through the serializer; the render behind it waits for the clock. */
async function restore(studio: Studio, panel: FakeWebviewPanel, state: unknown): Promise<void> {
  const done = Promise.resolve(captured.serializer!.deserializeWebviewPanel(panel, state));
  await studio.advance(300);
  await done;
}

const restoredState = (file: string): Record<string, unknown> => ({ documentId: Uri.file(file).toString(), sourceFile: file });

// @tests_req SwRS-MDOKFSTUDIO-LIFE-062
test("deleting the shown file shows The active Markdown source was deleted.", async (t) => {
  const studio = start(t);
  const file = writeFile("# A\n");
  const { panel } = await studio.openSide(file);
  const watcher = studio.dependencyWatcherOf(workspaceRoot);
  const assignments = panel.htmlAssignments.length;
  watcher.deleted.fire(Uri.file(path.join(workspaceRoot, "not-included.md")));
  await studio.advance(100);
  assert.equal(panel.htmlAssignments.length, assignments, "an unrelated deletion changes nothing");
  fs.rmSync(file);
  watcher.deleted.fire(Uri.file(file));
  assert.match(lastHtml(panel), /Preview source missing/u);
  assert.match(lastHtml(panel), /The active Markdown source was deleted\./u);
});

test("renaming the shown file shows The active Markdown source was renamed or deleted.", async (t) => {
  const studio = start(t);
  const file = writeFile("# A\n");
  const { panel } = await studio.openSide(file);
  const renamed = path.join(workspaceRoot, `renamed-${path.basename(file)}`);
  fs.renameSync(file, renamed);
  fake.controls.events.renameFiles.fire({ files: [{ oldUri: Uri.file(file), newUri: Uri.file(renamed) }] });
  assert.match(lastHtml(panel), /Preview source missing/u);
  assert.match(lastHtml(panel), /The active Markdown source was renamed or deleted\./u);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-044
test("renaming a file the render depends on renders the document again, an unrelated rename does not", async (t) => {
  const studio = start(t);
  const intro = writeFile("Included text.\n", workspaceRoot, `parts-${process.pid}/intro.md`);
  const file = writeFile(`# Main\n\n\`\`\`{include} parts-${process.pid}/intro.md\n\`\`\`\n`);
  await studio.openSide(file);
  await studio.advance(100);
  const session = studio.manager.active!;
  assert.equal(session.queue.dependsOn(intro), true, "the include is a dependency of the render");
  const rendered = (): number => session.probe.renderedStages;
  const before = rendered();
  const unrelated = writeFile("Other.\n");
  fake.controls.events.renameFiles.fire({ files: [{ oldUri: Uri.file(unrelated), newUri: Uri.file(`${unrelated}.bak`) }] });
  await studio.advance(200);
  assert.equal(rendered(), before, "an unrelated rename starts no render");
  const start2 = path.join(path.dirname(intro), "start.md");
  fs.renameSync(intro, start2);
  fake.controls.events.renameFiles.fire({ files: [{ oldUri: Uri.file(intro), newUri: Uri.file(start2) }] });
  await studio.advance(200);
  assert.ok(rendered() > before, "the dependency rename renders the document again");
});

test("a missing source that comes back renders again by itself", async (t) => {
  const studio = start(t);
  const file = writeFile("# Back\n\nReturned text.\n");
  const { panel } = await studio.openSide(file);
  const watcher = studio.dependencyWatcherOf(workspaceRoot);
  fs.rmSync(file);
  watcher.deleted.fire(Uri.file(file));
  assert.match(lastHtml(panel), /Preview source missing/u);
  const other = writeFile("# Not the source\n");
  watcher.created.fire(Uri.file(other));
  await studio.advance(200);
  assert.match(lastHtml(panel), /Preview source missing/u, "a created file that is not the source changes nothing");
  fs.writeFileSync(file, "# Back\n\nReturned text.\n", "utf8");
  watcher.created.fire(Uri.file(file));
  await studio.advance(300);
  assert.match(lastHtml(panel), /Returned text\./u);
  assert.doesNotMatch(lastHtml(panel), /Preview source missing/u);
});

test("the default reason of a missing source is The active Markdown source is unavailable.", async (t) => {
  const studio = start(t);
  const vanished = writeFile("# Gone\n");
  await fake.controls.showDocument(vanished);
  fs.rmSync(vanished);
  const before = fake.controls.panels.length;
  void studio.runCommand(COMMAND_ID);
  await studio.until(() => fake.controls.panels.length > before, "the preview panel");
  const created = fake.controls.panels.at(-1)!;
  await studio.advance(100);
  assert.match(lastHtml(created), /Preview source missing/u);
  assert.match(lastHtml(created), /The active Markdown source is unavailable\./u);
  created.dispose();

  const file = writeFile("# Edit\n");
  const { panel, document: shown } = await studio.openSide(file);
  fs.rmSync(file);
  fake.controls.changeDocument(shown, "# Edited after the file vanished\n");
  assert.match(lastHtml(panel), /The active Markdown source is unavailable\./u);
});

test("a source whose symbolic link leaves the root counts as missing", async (t) => {
  const studio = start(t);
  const target = writeFile("# Outside\n", outsideRoot);
  const link = path.join(workspaceRoot, `link-${process.pid}.md`);
  fs.symlinkSync(target, link);
  const regular = writeFile("# Inside\n");
  const { panel } = await studio.openSide(regular);
  const session = studio.manager.active!;
  assert.equal(studio.manager.sourceAvailable(session), true, "a file below the root is available");
  const linked = await fake.controls.showDocument(link);
  const before = fake.controls.panels.length;
  await runAndSettle(studio, COMMAND_ID);
  assert.equal(fake.controls.panels.length, before, "the existing side preview is reused");
  const linkedSession = studio.manager.active!;
  assert.equal(linkedSession.documentUri, linked.uri.toString());
  assert.equal(studio.manager.sourceAvailable(linkedSession), false, "the link resolves outside the root");
  assert.match(lastHtml(panel), /Preview source missing/u);
});

test("a document that is not a saved .md file shows The restored or active source is not a Markdown file.", async (t) => {
  const studio = start(t);
  const file = writeFile("# A\n");
  const { panel } = await studio.openSide(file);
  const session = studio.manager.active!;
  const untitled = new FakeTextDocument(new Uri("untitled", "Untitled-1"), "# Untitled\n");
  await studio.manager.requestDocument(session, studio.activation.host.documents.of(untitled as never));
  assert.match(lastHtml(panel), /Preview source missing/u);
  assert.match(lastHtml(panel), /The restored or active source is not a Markdown file\./u);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-049
test("a failed render of a document that was not shown yet shows Preview unavailable", async (t) => {
  const studio = start(t);
  const fileA = writeFile("# Alpha page\n\nAlpha text.\n");
  const fileB = writeFile("# Beta page\n");
  const { panel } = await studio.openSide(fileA);
  setRenderOverrideForTests(() => Promise.reject(new Error("render of B failed")));
  await fake.controls.showDocument(fileB);
  fake.controls.events.changeActiveEditor.fire(fake.vscode.window.activeTextEditor);
  await studio.until(() => studio.manager.active!.documentUri === Uri.file(fileB).toString(), "the switch to B");
  await studio.advance(300);
  assert.match(lastHtml(panel), /Preview unavailable/u);
  assert.match(lastHtml(panel), /render of B failed/u);
  assert.doesNotMatch(lastHtml(panel), /Alpha text/u, "nothing of the previous document stays");
  assert.equal(studio.manager.active!.status, "error");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-032
test("Refresh Preview does nothing while the active text editor shows another document", async (t) => {
  const studio = start(t);
  const fileA = writeFile("# A\n");
  const fileB = writeFile("# B\n");
  await studio.openSide(fileA);
  await studio.advance(100);
  const session = studio.manager.active!;
  const messages = fake.controls.shownMessages.length;
  await fake.controls.showDocument(fileB);
  const stages = session.probe.renderedStages;
  await runAndSettle(studio, REFRESH_COMMAND_ID);
  assert.equal(session.probe.renderedStages, stages, "no render starts");
  assert.equal(fake.controls.shownMessages.length, messages, "no message appears");
  (fake.vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
  await runAndSettle(studio, REFRESH_COMMAND_ID);
  assert.ok(session.probe.renderedStages > stages, "without a text editor the newest preview's own document renders again");
});

test("Refresh Preview acts on the preview created last that is still open", async (t) => {
  const studio = start(t);
  const file = writeFile("# Shared\n");
  await studio.openSide(file);
  await studio.advance(100);
  const side = studio.manager.active!;
  const withPanel = await openWith(studio, file);
  await studio.advance(200);
  const withSession = studio.manager.active!;
  assert.notEqual(withSession, side, "the Open With tab is the newest session");
  await fake.controls.showDocument(file);
  const [sideStages, withStages] = [side.probe.renderedStages, withSession.probe.renderedStages];
  await runAndSettle(studio, REFRESH_COMMAND_ID);
  assert.equal(side.probe.renderedStages, sideStages, "the older preview does not render");
  assert.ok(withSession.probe.renderedStages > withStages, "the newest preview renders again");
  withPanel.dispose();
  assert.equal(studio.manager.active, side, "after the newest closes the newest remaining is the target");
  const again = side.probe.renderedStages;
  await runAndSettle(studio, REFRESH_COMMAND_ID);
  assert.ok(side.probe.renderedStages > again);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-010
test("Open Preview to Side refuses a file that is not a saved Markdown file", async (t) => {
  const studio = start(t);
  const typescript = writeFile("export {};\n", workspaceRoot, `code-${process.pid}.ts`);
  await fake.controls.showDocument(typescript);
  const panels = fake.controls.panels.length;
  const messages = fake.controls.shownMessages.length;
  await studio.runCommand(COMMAND_ID);
  assert.equal(fake.controls.panels.length, panels, "no preview opens");
  assert.deepEqual(fake.controls.shownMessages.slice(messages), [
    { kind: "information", text: "Open a Markdown file to use Markdown OKF-Schema Studio." },
  ]);
  (fake.vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
  await studio.runCommand(COMMAND_ID);
  assert.equal(fake.controls.shownMessages.length, messages + 2, "with no text editor the same message shows");
  assert.equal(fake.controls.panels.length, panels);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-010
test("Open Preview to Side from a Studio Open With tab previews that tab's file", async (t) => {
  const studio = start(t);
  const file = writeFile("# From the Open With tab\n");
  fake.controls.activateCustomEditorTab(file);
  assert.equal(fake.vscode.window.activeTextEditor, undefined, "no text editor is active");
  const panels = fake.controls.panels.length;
  const messages = fake.controls.shownMessages.length;
  await runAndSettle(studio, COMMAND_ID);
  assert.equal(fake.controls.shownMessages.length, messages, "no refusal message");
  assert.equal(fake.controls.panels.length, panels + 1, "a side preview opens");
  assert.equal(sessionsOf(studio).at(-1)!.documentUri.endsWith(path.basename(file)), true);
  fake.controls.activateCustomEditorTab(file, "some.other.editor");
  const refused = fake.controls.shownMessages.length;
  await runAndSettle(studio, COMMAND_ID);
  assert.equal(fake.controls.shownMessages.length, refused + 1, "a custom editor of another type is still refused");
});

test("Open Preview to Side reports a file it cannot open", async (t) => {
  const studio = start(t);
  const missing = path.join(workspaceRoot, `deleted-${process.pid}.md`);
  const panels = fake.controls.panels.length;
  const messages = fake.controls.shownMessages.length;
  await studio.runCommand(COMMAND_ID, Uri.file(missing));
  assert.equal(fake.controls.panels.length, panels, "no preview opens");
  const shown = fake.controls.shownMessages.slice(messages);
  assert.equal(shown.length, 1);
  assert.equal(shown[0]!.kind, "error");
  assert.ok(shown[0]!.text.startsWith(`Cannot open ${missing}: `), shown[0]!.text);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003
test("Open Preview to Side on the shown document reveals the preview and renders it again", async (t) => {
  const studio = start(t);
  const file = writeFile("# Twice\n");
  const { panel } = await studio.openSide(file);
  await studio.advance(100);
  const session = studio.manager.active!;
  const requestId = session.stage!.requestId;
  const panels = fake.controls.panels.length;
  panel.viewColumn = 3;
  await runAndSettle(studio, COMMAND_ID);
  assert.equal(fake.controls.panels.length, panels, "no second panel opens");
  assert.equal(studio.manager.sessions().size, 1);
  assert.ok(session.stage!.requestId > requestId, "the document was rendered again");
});

test("Open Preview to Side ignores previews that do not follow the active editor", async (t) => {
  const studio = start(t);
  const file = writeFile("# Fixed\n");
  const fixed = await openWith(studio, file);
  const fixedSession = studio.manager.active!;
  assert.equal(fixedSession.followsActiveEditor, false);
  const panels = fake.controls.panels.length;
  await fake.controls.showDocument(file);
  void studio.runCommand(COMMAND_ID);
  await studio.until(() => fake.controls.panels.length > panels, "a new side preview panel");
  await studio.advance(100);
  assert.equal(studio.manager.sessions().size, 2);
  assert.deepEqual(sessionsOf(studio).map((session) => session.followsActiveEditor), [false, true]);
  assert.equal(fixed.disposed, false, "the Open With tab stays");
});

test("the side preview and the Open With editor do not retain their page while hidden", async (t) => {
  const studio = start(t);
  await studio.openSide(writeFile("# Side\n"));
  assert.notEqual(captured.panelOptions.at(-1)!.retainContextWhenHidden, true);
  assert.notEqual(captured.editorOptions!.webviewOptions!.retainContextWhenHidden, true);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-143
test("previews of one root share one file watcher, which closing the last preview removes with its subscriptions", async (t) => {
  const studio = start(t);
  const file = writeFile("# Watched\n");
  const { panel } = await studio.openSide(file);
  const otherPanel = await openWith(studio, file);
  const watchers = studio.dependencyWatchers(workspaceRoot);
  assert.equal(watchers.length, 1, "both previews share one watcher of the root");
  const [shared] = watchers;
  assert.equal(shared!.disposed, false);
  assert.ok(shared!.changed.size > 0 && shared!.created.size > 0 && shared!.deleted.size > 0);
  panel.dispose();
  assert.equal(shared!.disposed, false, "the other preview keeps the watcher");
  assert.ok(shared!.changed.size > 0);
  assert.equal(otherPanel.disposed, false);
  otherPanel.dispose();
  assert.equal(shared!.disposed, true, "the watcher goes with the last preview");
  assert.deepEqual([shared!.changed.size, shared!.created.size, shared!.deleted.size], [0, 0, 0]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-026
test("a document outside the workspace folder gets a new session on the same panel", async (t) => {
  const studio = start(t);
  const fileA = writeFile("# A\n");
  const sameFolder = writeFile("# C\n");
  const fileB = writeFile("# B\n", outsideRoot);
  const { panel } = await studio.openSide(fileA);
  const first = studio.manager.active!;
  first.lockedColumn = 2;
  await fake.controls.showDocument(sameFolder);
  fake.controls.events.changeActiveEditor.fire(fake.vscode.window.activeTextEditor);
  await studio.until(() => first.documentUri === Uri.file(sameFolder).toString(), "the switch inside the folder");
  assert.equal(studio.manager.active, first, "the same folder and trust state keep the session");
  assert.equal(first.disposed, false);
  await fake.controls.showDocument(fileB);
  fake.controls.events.changeActiveEditor.fire(fake.vscode.window.activeTextEditor);
  await studio.until(() => first.disposed, "the old session is disposed");
  const replacement = studio.manager.active!;
  assert.notEqual(replacement, first);
  assert.equal(replacement.documentUri, Uri.file(fileB).toString());
  assert.equal(replacement.followsActiveEditor, true);
  assert.equal(replacement.lockedColumn, 2, "the group lock is kept");
  assert.equal(replacement.readOnly, true, "outside every folder the session is read-only");
  assert.equal(replacement.workspaceRoot, outsideRoot, "the resource folder is the directory of the document");
  assert.equal(fake.controls.panels.filter((candidate) => candidate === panel).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-151
test("the recorded column of a locked preview follows its group", async (t) => {
  const studio = start(t);
  const { panel } = await studio.openSide(writeFile("# Locked\n"));
  const session = studio.manager.active!;
  session.lockedColumn = 3;
  panel.viewColumn = 2;
  fake.controls.events.changeTabGroups.fire(undefined);
  assert.equal(session.lockedColumn, 2, "a layout change records the current column");
  panel.viewColumn = 1;
  panel.onViewState.fire({});
  assert.equal(session.lockedColumn, 1, "a view-state change does too");
  session.lockedColumn = undefined;
  panel.viewColumn = 4;
  fake.controls.events.changeTabGroups.fire(undefined);
  assert.equal(session.lockedColumn, undefined, "a preview whose group was not locked records no column");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("granting trust turns an open Restricted Mode preview into a writable one", async (t) => {
  const untrusted = start(t, { trusted: false });
  const file = writeFile("# Restricted\n\n- [ ] task\n");
  const { panel } = await untrusted.openSide(file);
  const restricted = untrusted.manager.active!;
  assert.equal(restricted.readOnly, true);
  assert.deepEqual(restricted.sessionRoots, []);
  assert.deepEqual(restricted.navigationRoots, [path.dirname(file)]);
  assert.equal(restricted.workspaceRoot, path.dirname(file));
  const readOnlyHtml = lastRendered(panel);
  const assignmentsBefore = panel.htmlAssignments.length;
  (fake.vscode.workspace as unknown as { isTrusted: boolean }).isTrusted = true;
  fake.controls.events.grantTrust.fire();
  await untrusted.advance(300);
  await untrusted.renderDone(panel);
  const trusted = untrusted.manager.active!;
  assert.equal(untrusted.manager.sessions().size, 1, "the preview is not duplicated");
  assert.equal(trusted.panel, restricted.panel, "the same panel is kept: nothing is reopened");
  assert.equal(trusted.readOnly, false, "the preview is writable after the grant");
  assert.equal(trusted.workspaceRoot, workspaceRoot);
  assert.ok(trusted.navigationRoots.includes(workspaceRoot));
  assert.ok(trusted.sessionRoots.includes(workspaceRoot));
  assert.notEqual(lastRendered(panel), readOnlyHtml, "the page is rebuilt with the editing controls");
  const rendersAfter = panel.htmlAssignments.filter((html) => identityOfDocument(html) !== undefined).length;
  assert.ok(panel.htmlAssignments.length > assignmentsBefore);
  assert.equal(trusted.probe.renderedStages, 1, "the trusted session renders once");
  assert.ok(rendersAfter >= 2);
});

test("granting trust keeps the active preview active when several previews are open", async (t) => {
  const studio = start(t, { trusted: false });
  const first = writeFile("# First\n");
  const second = writeFile("# Second\n");
  await studio.openSide(first);
  await openWith(studio, second);
  const activeId = studio.manager.active!.documentUri;
  assert.equal(activeId, Uri.file(second).toString());
  (fake.vscode.workspace as unknown as { isTrusted: boolean }).isTrusted = true;
  fake.controls.events.grantTrust.fire();
  await studio.advance(300);
  assert.equal(studio.manager.sessions().size, 2);
  assert.ok(sessionsOf(studio).every((session) => !session.readOnly));
  assert.equal(studio.manager.active!.documentUri, activeId, "the active preview is still the same one");
});

test("a preview created in a trusted workspace stays writable when trust is granted again", async (t) => {
  const studio = start(t);
  await studio.openSide(writeFile("# Trusted\n"));
  const session = studio.manager.active!;
  assert.equal(session.readOnly, false);
  fake.controls.events.grantTrust.fire();
  await studio.advance(100);
  assert.equal(session.readOnly, false);
});

type FakeFolder = { uri: Uri; name: string; index: number };
const folderApi = fake.vscode.workspace as unknown as {
  workspaceFolders: FakeFolder[];
  getWorkspaceFolder: (uri: Uri) => FakeFolder | undefined;
};

/**
 * Returns a function that sets the folders of the fake workspace and fires the folder change, as
 * VS Code's `updateWorkspaceFolders` does (the Agents window mounts the folder of the active agent
 * session that way). The test's end restores the single workspace folder.
 */
function folderControl(t: TestContext): (roots: readonly string[]) => void {
  const original = { folders: folderApi.workspaceFolders, getWorkspaceFolder: folderApi.getWorkspaceFolder };
  t.after(() => {
    folderApi.workspaceFolders = original.folders;
    folderApi.getWorkspaceFolder = original.getWorkspaceFolder;
  });
  return (roots) => {
    const before = folderApi.workspaceFolders;
    const folders = roots.map((root, index) => before.find((folder) => folder.uri.fsPath === root)
      ?? original.folders.find((folder) => folder.uri.fsPath === root)
      ?? { uri: Uri.file(root), name: path.basename(root), index });
    folderApi.workspaceFolders = folders;
    folderApi.getWorkspaceFolder = (uri) => folders.find((folder) =>
      uri.fsPath === folder.uri.fsPath || uri.fsPath.startsWith(folder.uri.fsPath + path.sep));
    fake.controls.events.changeWorkspaceFolders.fire({
      added: folders.filter((folder) => !before.includes(folder)),
      removed: before.filter((folder) => !folders.includes(folder)),
    });
  };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("adding a workspace folder makes the read-only previews of its files writable on the same panel", async (t) => {
  const studio = start(t);
  const setFolders = folderControl(t);
  const mounted = path.join(outsideRoot, `mounted-${process.pid}`);
  const inside = writeFile("# Mounted\n", mounted);
  const outside = writeFile("# Elsewhere\n", path.join(outsideRoot, `elsewhere-${process.pid}`));
  const { panel } = await studio.openSide(inside);
  const readOnly = studio.manager.active!;
  assert.equal(readOnly.readOnly, true, "no folder holds the file yet");
  const readingState = { documentId: Uri.file(inside).toString(), sourceFile: inside, sourceLine: 1, scrollTop: 40 };
  readOnly.state = readingState;
  await openWith(studio, outside);
  const other = studio.manager.active!;
  assert.equal(other.readOnly, true);
  setFolders([workspaceRoot, mounted]);
  await studio.advance(300);
  const promoted = sessionsOf(studio).find((session) => session.documentUri === Uri.file(inside).toString())!;
  assert.equal(studio.manager.sessions().size, 2, "the preview is not duplicated");
  assert.equal(readOnly.disposed, true);
  assert.equal(promoted.panel, readOnly.panel, "the same panel is kept: nothing is reopened");
  assert.equal(panel.disposed, false);
  assert.equal(promoted.readOnly, false, "the preview is writable once its folder is added");
  assert.equal(promoted.workspaceRoot, mounted);
  assert.ok(promoted.sessionRoots.includes(mounted));
  assert.deepEqual(promoted.state, readingState, "the reading state is kept");
  assert.equal(other.disposed, false, "a preview of a file outside the added folder is left alone");
  assert.equal(other.readOnly, true);
  assert.equal(studio.manager.active, other, "the active preview stays the active one");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-143
test("removing the folder of a preview keeps its panel read-only until the folder is added back", async (t) => {
  const studio = start(t);
  const setFolders = folderControl(t);
  const directory = path.join(workspaceRoot, `agent-session-${process.pid}`);
  const file = writeFile("# Session\n", directory);
  const { panel } = await studio.openSide(file);
  const writable = studio.manager.active!;
  assert.equal(writable.readOnly, false);
  const readingState = { documentId: Uri.file(file).toString(), sourceFile: file, sourceLine: 1, scrollTop: 40 };
  writable.state = readingState;
  const folderWatcher = studio.dependencyWatcherOf(workspaceRoot);
  const writableHtml = lastRendered(panel);

  setFolders([]);
  await studio.advance(300);
  await studio.until(() => lastRendered(panel) !== writableHtml, "the read-only page");
  assert.equal(panel.disposed, false, "the tab stays open");
  assert.equal(writable.disposed, true, "the session of the removed folder is disposed");
  assert.equal(folderWatcher.disposed, true, "with its watcher of the folder");
  const readOnly = studio.manager.active!;
  assert.equal(studio.manager.sessions().size, 1);
  assert.equal(readOnly.panel, writable.panel, "the same panel shows the file");
  assert.equal(readOnly.readOnly, true);
  assert.equal(readOnly.workspaceRoot, directory, "the resource folder is the directory of the document");
  assert.deepEqual(readOnly.sessionRoots, []);
  assert.deepEqual(readOnly.state, readingState, "the reading state is kept");

  setFolders([workspaceRoot]);
  await studio.advance(300);
  const again = studio.manager.active!;
  assert.equal(readOnly.disposed, true);
  assert.equal(again.panel, writable.panel);
  assert.equal(again.readOnly, false, "the preview is writable again once the folder is back");
  assert.equal(again.workspaceRoot, workspaceRoot);
  assert.equal(panel.disposed, false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-127
test("a restored side preview owns the group lock the workbench restored", async (t) => {
  const studio = start(t);
  const first = writeFile("# First\n");
  const second = writeFile("# Second\n");
  const olderPanel = newPanel(DEFAULT_PANEL_TYPE, 2);
  await restore(studio, olderPanel, restoredState(first));
  const [older] = sessionsOf(studio);
  assert.equal(older!.followsActiveEditor, true);
  assert.equal(older!.lockedColumn, 2, "the panel's group is recorded");
  const newerPanel = newPanel(DEFAULT_PANEL_TYPE, 3);
  await restore(studio, newerPanel, restoredState(second));
  const newer = studio.manager.active!;
  assert.equal(newer.lockedColumn, 3);
  assert.equal(older!.followsActiveEditor, false, "the older panel became a fixed preview");
  assert.equal(older!.lockedColumn, 2, "it keeps the group it recorded");
});

test("only the newest following preview switches with the active editor", async (t) => {
  const studio = start(t);
  const fileA = writeFile("# A\n");
  const fileX = writeFile("# X\n");
  const fileB = writeFile("# B\n");
  await studio.openSide(fileA);
  const side = studio.manager.active!;
  await openWith(studio, fileX);
  const fixed = studio.manager.active!;
  assert.equal(fixed.followsActiveEditor, false);
  await fake.controls.showDocument(fileB);
  fake.controls.events.changeActiveEditor.fire(fake.vscode.window.activeTextEditor);
  await studio.until(() => side.documentUri === Uri.file(fileB).toString(), "the side preview switches");
  await studio.advance(200);
  assert.equal(fixed.documentUri, Uri.file(fileX).toString(), "the Open With tab does not switch");
});

test("of two restored panels only the newer one switches with the active editor", async (t) => {
  const studio = start(t);
  const first = writeFile("# First\n");
  const second = writeFile("# Second\n");
  const target = writeFile("# Target\n");
  await restore(studio, newPanel(DEFAULT_PANEL_TYPE, 2), restoredState(first));
  await restore(studio, newPanel(DEFAULT_PANEL_TYPE, 3), restoredState(second));
  const [older, newer] = sessionsOf(studio);
  assert.deepEqual([older!.followsActiveEditor, newer!.followsActiveEditor], [false, true]);
  await fake.controls.showDocument(target);
  fake.controls.events.changeActiveEditor.fire(fake.vscode.window.activeTextEditor);
  await studio.until(() => newer!.documentUri === Uri.file(target).toString(), "the newer panel switches");
  assert.equal(older!.documentUri, Uri.file(first).toString());
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-018
test("the Open With editor explains that it needs a Markdown file", async (t) => {
  const studio = start(t);
  const untitled = new FakeTextDocument(new Uri("untitled", "Untitled-1"), "# Untitled\n");
  const panel = newPanel(EDITOR_TYPE);
  await captured.provider!.resolveCustomTextEditor(untitled, panel);
  assert.match(lastHtml(panel), /Preview source missing/u);
  assert.match(lastHtml(panel), /Markdown OKF-Schema Studio requires a Markdown file\./u);
  assert.equal(studio.manager.sessions().size, 0, "no session is created");
  const text = writeFile("not markdown\n", workspaceRoot, `notes-${process.pid}.txt`);
  const textPanel = newPanel(EDITOR_TYPE);
  await captured.provider!.resolveCustomTextEditor(await fake.vscode.workspace.openTextDocument(Uri.file(text)), textPanel);
  assert.match(lastHtml(textPanel), /requires a Markdown file/u);
  const filePanel = await openWith(studio, writeFile("# Fine\n"));
  assert.doesNotMatch(lastHtml(filePanel), /requires a Markdown file/u);
  assert.equal(studio.manager.sessions().size, 1);
});

test("a failure while opening the Open With editor shows its message on the page", async (t) => {
  const studio = start(t);
  const document = await fake.controls.showDocument(writeFile("# Failing\n"));
  const workspaceApi = fake.vscode.workspace as unknown as { createFileSystemWatcher: (...args: unknown[]) => unknown };
  const original = workspaceApi.createFileSystemWatcher;
  workspaceApi.createFileSystemWatcher = () => {
    throw new Error("the watcher could not be created");
  };
  const panel = newPanel(EDITOR_TYPE);
  try {
    await captured.provider!.resolveCustomTextEditor(document, panel);
  } finally {
    workspaceApi.createFileSystemWatcher = original;
  }
  assert.match(lastHtml(panel), /Preview unavailable/u);
  assert.match(lastHtml(panel), /the watcher could not be created/u);
  setRenderOverrideForTests(() => Promise.reject(new Error("first render failed")));
  const second = newPanel(EDITOR_TYPE);
  await captured.provider!.resolveCustomTextEditor(document, second);
  await studio.advance(300);
  assert.equal(studio.manager.active!.status, "error");
  assert.match(lastHtml(second), /first render failed/u);
});

test("a saved state with an invalid source URI shows an explanation", async (t) => {
  const studio = start(t);
  const staticUri = Uri as unknown as { parse: (value: string) => Uri };
  const original = staticUri.parse;
  staticUri.parse = () => {
    throw new Error("not a URI");
  };
  const panel = newPanel(DEFAULT_PANEL_TYPE);
  try {
    await restore(studio, panel, { documentId: "::broken::", sourceFile: "/x/broken.md" });
  } finally {
    staticUri.parse = original;
  }
  assert.match(lastHtml(panel), /Preview source missing/u);
  assert.match(lastHtml(panel), /The previous preview source URI is invalid\./u);
  assert.equal(studio.manager.sessions().size, 0);
});

test("a saved source that is not a Markdown file shows an explanation", async (t) => {
  const studio = start(t);
  const other = newPanel(DEFAULT_PANEL_TYPE);
  await restore(studio, other, restoredState(path.join(workspaceRoot, "notes.txt")));
  assert.match(lastHtml(other), /Preview source missing/u);
  assert.match(lastHtml(other), /The previous preview source is not a Markdown file\./u);
  const untitled = newPanel(DEFAULT_PANEL_TYPE);
  await restore(studio, untitled, { documentId: "untitled:Untitled-1", sourceFile: "Untitled-1" });
  assert.match(lastHtml(untitled), /The previous preview source is not a Markdown file\./u);
  assert.equal(studio.manager.sessions().size, 0, "no session is created");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-100
test("the host tells each preview whether a text editor shows its file whenever the visible editors change", async (t) => {
  const studio = start(t);
  const file = writeFile("# Paired\n");
  const { panel } = await studio.openSide(file);
  await studio.advance(100);
  const pairing = (from: number): Array<Record<string, unknown>> =>
    panel.posted.slice(from).filter((message) => message.type === "previewPairing");
  const windowApi = fake.vscode.window as unknown as { visibleTextEditors: unknown[] };
  const editors = windowApi.visibleTextEditors;
  windowApi.visibleTextEditors = [];
  let from = panel.posted.length;
  fake.controls.events.changeVisibleEditors.fire(undefined);
  assert.deepEqual(pairing(from).map((message) => message.pairedTextEditor), [false], "editor closed");
  windowApi.visibleTextEditors = editors;
  from = panel.posted.length;
  fake.controls.events.changeVisibleEditors.fire(undefined);
  assert.deepEqual(pairing(from).map((message) => message.pairedTextEditor), [true], "editor opened");
  assert.ok(identityOfDocument(lastHtml(panel)), "the page document carries its identity");
});

test("a hidden preview that becomes visible catches up with the editor", async (t) => {
  const studio = start(t);
  const { panel } = await studio.openSide(writeFile("# Hidden\n"));
  await studio.advance(100);
  const session = studio.manager.active!;
  const scrolls = (from: number): number => panel.posted.slice(from).filter((message) => message.type === "sourceScroll").length;
  const calls = session.probe.restoreCalls;
  panel.visible = false;
  panel.onViewState.fire({});
  assert.equal(session.probe.restoreCalls, calls, "hiding catches up with nothing");
  const from = panel.posted.length;
  panel.visible = true;
  panel.onViewState.fire({});
  assert.equal(session.probe.restoreCalls, calls + 1, "hidden to visible catches up");
  assert.ok(scrolls(from) > 0, "the editor's first visible line is sent to the page");
  const afterFocus = panel.posted.length;
  panel.onViewState.fire({});
  assert.equal(session.probe.restoreCalls, calls + 1, "a focus change catches up with nothing");
  assert.equal(scrolls(afterFocus), 0);
});

test("closing a preview clears the Problems entries that no preview shows", async (t) => {
  const studio = start(t);
  const file = writeFile("# Problems\n");
  const { panel } = await studio.openSide(file);
  const withPanel = await openWith(studio, file);
  const id = Uri.file(file).toString();
  const sink = (studio.manager.diagnostics as unknown as {
    sink: { set(id: string, entries: unknown[]): void; has(id: string): boolean };
  }).sink;
  const entry = {
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
    message: "warning", severity: "warning", source: "Studio", code: "myst-extension",
  };
  sink.set(id, [entry]);
  assert.equal(sink.has(id), true);
  panel.dispose();
  assert.equal(sink.has(id), true, "another live preview still shows the document");
  withPanel.dispose();
  assert.equal(sink.has(id), false, "the last preview closed");
});

test("pending renders say Waiting for the latest edit. then Rendering the active buffer.", async (t) => {
  const studio = start(t);
  const { panel, document } = await studio.openSide(writeFile("# Pending\n\nText.\n"));
  await studio.advance(100);
  await studio.ready(panel);
  const session = studio.manager.active!;
  fake.controls.changeDocument(document, "# Pending\n\nText changed.\n");
  assert.equal(session.overlay.message, "Waiting for the latest edit.");
  t.mock.timers.tick(40);
  assert.equal(session.overlay.message, "Rendering the active buffer.");
});

test("a notice that falls due while the page is loading is posted when the page is ready", async (t) => {
  const studio = start(t);
  const { panel, document } = await studio.openSide(writeFile("# Loading\n\nText.\n"));
  await studio.advance(100);
  const overlays = (from: number): Array<Record<string, unknown>> =>
    panel.posted.slice(from).filter((message) => message.type === "previewPendingOverlay" && message.visible === true);
  const session = studio.manager.active!;
  // The page has not reported ready for this render yet; a slow render over it falls due at 1.5 s.
  const identity = identityOfDocument(lastRendered(panel))!;
  fake.controls.changeDocument(document, "# Loading\n\nText changed.\n");
  t.mock.timers.tick(1_500);
  assert.equal(session.overlay.due, true, "the notice is due but cannot be shown yet");
  const from = panel.posted.length;
  panel.fromPage.fire({
    type: "previewReady", ...identity, sourceLine: 1, scrollTop: 0, descriptionsCollapsed: false, blockEditOpen: false,
  });
  assert.equal(overlays(from).length, 1, "the page reports ready: the notice is posted then");
});

test("a notice whose render ended before the page is ready is not posted", async (t) => {
  const studio = start(t);
  const second = await studio.openSide(writeFile("# Ended\n\nText.\n"));
  await studio.advance(100);
  const other = studio.manager.active!;
  const secondIdentity = identityOfDocument(lastRendered(second.panel))!;
  fake.controls.changeDocument(second.document, "# Ended\n\nText changed.\n");
  t.mock.timers.tick(1_500);
  assert.equal(other.overlay.due, true);
  await studio.advance(500);
  assert.equal(other.overlay.due, false, "the render ended meanwhile");
  const secondFrom = second.panel.posted.length;
  second.panel.fromPage.fire({
    type: "previewReady", ...secondIdentity, sourceLine: 1, scrollTop: 0, descriptionsCollapsed: false, blockEditOpen: false,
  });
  await studio.settle();
  assert.equal(second.panel.posted.slice(secondFrom).filter((message) => message.type === "previewPendingOverlay").length, 0);
});

test("file events below build and tool folders do not trigger a render (only the segments below the root count)", async (t) => {
  const studio = start(t);
  await studio.openSide(writeFile("# Ignore\n"));
  const session = studio.manager.active!;
  const checked: string[] = [];
  (session.queue as unknown as { dependsOn: (filePath: string) => boolean }).dependsOn = (filePath) => {
    checked.push(filePath);
    return false;
  };
  const at = (...segments: string[]): string => path.join(path.sep, "project", ...segments, "x.md");
  const ignored = [".git", ".venv", ".vscode-test", "_build", "dist", "htmlcov", "node_modules", "out", "output", "public", "tmp"];
  for (const segment of ignored) studio.manager.events.refreshReferencedPath(session, at(segment));
  assert.deepEqual(checked, [], "every ignored segment is skipped");
  studio.manager.events.refreshReferencedPath(session, at("docs"));
  assert.deepEqual(checked, [at("docs")], "an ordinary folder is examined");
  const root = path.join(path.sep, "home", "me", "tmp", "book");
  (session as unknown as { workspaceRoot: string }).workspaceRoot = root;
  const underTmp = path.join(root, "include.md");
  studio.manager.events.refreshReferencedPath(session, underTmp);
  assert.deepEqual(checked, [at("docs"), underTmp], "a workspace stored below a tmp folder still refreshes");
  const below = path.join(root, "out", "include.md");
  studio.manager.events.refreshReferencedPath(session, below);
  assert.deepEqual(checked, [at("docs"), underTmp], "a tmp-like folder below the root is still ignored");
});

test("deactivating the extension disposes the sessions and leaves the panels to VS Code", async (t) => {
  const studio = start(t);
  const file = writeFile("# Stop\n");
  const { panel } = await studio.openSide(file);
  const withPanel = await openWith(studio, file);
  const sessions = sessionsOf(studio);
  assert.equal(sessions.length, 2);
  studio.activation.stop();
  assert.ok(sessions.every((session) => session.disposed));
  assert.equal(studio.manager.sessions().size, 0);
  assert.equal(panel.disposed, false, "the panels stay");
  assert.equal(withPanel.disposed, false);
  assert.doesNotThrow(() => studio.manager.disposeSession(sessions[0]!, false), "disposing twice does nothing");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-014
test("the Description column choice of a document is stored for the workspace and read at creation", async (t) => {
  const studio = start(t);
  const stored = writeFile("# Stored\n");
  const saved = writeFile("# Saved\n");
  studio.manager.choices.recordCollapsedDescriptions(Uri.file(stored).toString(), true);
  studio.manager.choices.recordCollapsedDescriptions(Uri.file(saved).toString(), true);
  assert.equal(studio.manager.choices.collapsedDescriptionsOf(Uri.file(stored).toString()), true);
  assert.equal(studio.manager.choices.collapsedDescriptionsOf(Uri.file("/not/stored.md").toString()), undefined);
  await studio.openSide(stored);
  assert.equal(studio.manager.active!.state?.descriptionsCollapsed, true, "a new preview starts collapsed");
  const panel = newPanel(DEFAULT_PANEL_TYPE, 3);
  await restore(studio, panel, { ...restoredState(saved), descriptionsCollapsed: false });
  assert.equal(studio.manager.active!.state?.descriptionsCollapsed, false, "the saved panel state wins");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-125
test("switching back to a document brings back its remembered state", async (t) => {
  const studio = start(t);
  const fileA = writeFile("# A\n\nFirst.\n");
  const fileB = writeFile("# B\n\nSecond.\n");
  const idA = Uri.file(fileA).toString();
  const { panel } = await studio.openSide(fileA);
  await studio.advance(100);
  const session = studio.manager.active!;
  await studio.ready(panel, undefined, { sourceLine: 80, scrollTop: 900, focusedBlockId: "block-3", openDisclosures: [1] });
  assert.equal(session.state?.focusedBlockId, "block-3");
  await fake.controls.showDocument(fileB);
  fake.controls.events.changeActiveEditor.fire(fake.vscode.window.activeTextEditor);
  await studio.advance(2_000);
  assert.equal(session.documentUri, Uri.file(fileB).toString());
  assert.equal(session.states.get(idA)?.focusedBlockId, "block-3", "the state of A was remembered");
  await fake.controls.showDocument(fileA);
  fake.controls.events.changeActiveEditor.fire(fake.vscode.window.activeTextEditor);
  await studio.advance(2_000);
  assert.equal(session.documentUri, idA);
  assert.equal(session.state?.focusedBlockId, "block-3", "the focused block of A is back");
  assert.deepEqual(session.state?.openDisclosures, [1], "the open sections of A are back");
  assert.equal(session.state?.sourceLine, 80, "the scroll line of A is back");
});
