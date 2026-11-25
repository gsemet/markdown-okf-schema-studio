/**
 * Requirement tests of the side preview next to a text diff (scope lifecycle-sync): the real file of
 * a diff, Open Preview to Side from a diff, the side preview following a diff, and the scroll sync
 * between the real file's side and the preview. They run the real activation against the fake
 * `vscode` module with a fake diff tab (`controls.activateDiff`).
 */
import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test, type TestContext } from "node:test";

import {
  COMMAND_ID,
  fake,
  identityOfDocument,
  startStudio,
  Uri,
  workspaceRoot,
  writeFile,
  type FakeWebviewPanel,
  type Studio,
} from "./lifeReqHarness";
// Loaded after the harness, which gives the `vscode` module to this process.
import { realFileOfDiff, realSideOfDiff } from "../../src/host-vscode/diffRealFile";

function start(t: TestContext): Studio {
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  return studio;
}

/** The URI of a `git:` document at the path of `file`, as the Git extension shows the committed version. */
const gitUri = (file: string): Uri => Uri.file(file).with({ scheme: "git" });
/** The virtual "after replacement" document of the replace preview, whose path still ends in `.md`. */
const virtualUri = (file: string): Uri => Uri.file(file).with({ scheme: "search-replace" });

const diffTab = (original: Uri, modified: Uri): never =>
  new (fake.vscode as unknown as { TabInputTextDiff: new (a: Uri, b: Uri) => unknown }).TabInputTextDiff(original, modified) as never;

const idOf = (file: string): string => Uri.file(file).toString();

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S11
test("the real file of a diff is the file side, the active side of two files, or the working-tree stand-in", async () => {
  const file = writeFile("# Real\n");
  const other = writeFile("# Other\n");
  const missing = path.join(workspaceRoot, "never-written.md");
  const text = writeFile("plain\n", workspaceRoot, `plain-${process.pid}.txt`);

  const git = diffTab(gitUri(file), Uri.file(file));
  assert.equal(realSideOfDiff(git, undefined)?.toString(), idOf(file), "a git diff: the modified side");
  const replace = diffTab(Uri.file(file), virtualUri(file));
  assert.equal(realSideOfDiff(replace, undefined)?.toString(), idOf(file), "the replace preview: the original side");

  const compare = diffTab(Uri.file(file), Uri.file(other));
  assert.equal(realSideOfDiff(compare, Uri.file(file))?.toString(), idOf(file), "two files: the active side");
  assert.equal(realSideOfDiff(compare, Uri.file(other))?.toString(), idOf(other));
  assert.equal(realSideOfDiff(compare, undefined)?.toString(), idOf(other), "no active side: the modified side");

  assert.equal(realSideOfDiff(diffTab(Uri.file(text), gitUri(text)), undefined), undefined, "a file side that is not Markdown");

  const staged = diffTab(gitUri(file), gitUri(file));
  assert.equal(realSideOfDiff(staged, undefined), undefined, "no side is a file");
  const standIn = await realFileOfDiff(staged, undefined);
  assert.deepEqual(
    { kind: standIn?.kind, uri: standIn?.uri.toString() },
    { kind: "stand-in", uri: idOf(file) },
    "git against git: the working-tree file is a stand-in",
  );
  assert.equal(await realFileOfDiff(diffTab(gitUri(missing), gitUri(missing)), undefined), undefined, "no working-tree file: none");
  assert.equal(await realFileOfDiff(diffTab(gitUri(text), gitUri(text)), undefined), undefined, "a stand-in must be Markdown");
  assert.equal((await realFileOfDiff(git, undefined))?.kind, "file");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S11
// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S15
test("Open Preview to Side from a diff previews the real file, whichever side holds the cursor, and opens no text editor", async (t) => {
  const studio = start(t);
  const file = writeFile("# Real file\n");
  for (const [label, original, modified] of [
    ["git diff", gitUri(file), Uri.file(file)],
    ["replace preview", Uri.file(file), virtualUri(file)],
  ] as const) {
    for (const activeSide of ["original", "modified", "none"] as const) {
      for (const argument of [undefined, original, modified]) {
        studio.manager.disposeAll(true);
        fake.controls.activateDiff({ original, modified, activeSide, fire: false });
        const shown = fake.controls.shownTextOptions.length;
        const messages = fake.controls.shownMessages.length;
        const panels = fake.controls.panels.length;
        const done = studio.runCommand(COMMAND_ID, ...(argument === undefined ? [] : [argument]));
        await studio.advance(300);
        await done;
        const where = `${label}, cursor ${activeSide}, argument ${argument?.scheme ?? "none"}`;
        assert.equal(fake.controls.shownTextOptions.length, shown, `${where}: no text editor opens`);
        assert.equal(fake.controls.shownMessages.length, messages, `${where}: no refusal`);
        assert.equal(fake.controls.panels.length, panels + 1, `${where}: a side preview opens`);
        assert.equal(studio.manager.active?.documentUri, idOf(file), where);
      }
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S11
// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S15
test("Open Preview to Side from a staged diff previews the working-tree file, and refuses when it is missing", async (t) => {
  const studio = start(t);
  const file = writeFile("# Working tree\n");
  fake.controls.activateDiff({ original: gitUri(file), modified: gitUri(file), activeSide: "modified", fire: false });
  let done = studio.runCommand(COMMAND_ID);
  await studio.advance(300);
  await done;
  assert.equal(studio.manager.active?.documentUri, idOf(file));
  studio.manager.disposeAll(true);

  const missing = path.join(workspaceRoot, `deleted-${process.pid}.md`);
  fake.controls.activateDiff({ original: gitUri(missing), modified: gitUri(missing), activeSide: "modified", fire: false });
  const messages = fake.controls.shownMessages.length;
  done = studio.runCommand(COMMAND_ID);
  await studio.advance(300);
  await done;
  assert.deepEqual(fake.controls.shownMessages.slice(messages), [
    { kind: "information", text: "Open a Markdown file to use Markdown OKF-Schema Studio." },
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S11
// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S15
test("Open Preview to Side with the URI of another file keeps its path while a diff is active", async (t) => {
  const studio = start(t);
  const file = writeFile("# Diffed\n");
  const another = writeFile("# Another\n");
  fake.controls.activateDiff({ original: gitUri(file), modified: Uri.file(file), activeSide: "modified", fire: false });
  const shown = fake.controls.shownTextOptions.length;
  const done = studio.runCommand(COMMAND_ID, Uri.file(another));
  await studio.advance(300);
  await done;
  assert.equal(fake.controls.shownTextOptions.length, shown + 1, "the other file opens in a text editor, as before");
  assert.equal(studio.manager.active?.documentUri, idOf(another));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-026#S3
test("a text diff that becomes active switches the side preview to its real file, never to a stand-in", async (t) => {
  const studio = start(t);
  const fileA = writeFile("# A\n");
  const fileB = writeFile("# B\n");
  const fileC = writeFile("# C\n");
  await studio.openSide(fileA);
  const session = studio.manager.active!;
  assert.equal(session.documentUri, idOf(fileA));

  fake.controls.activateDiff({ original: gitUri(fileB), modified: Uri.file(fileB), activeSide: "original" });
  await studio.until(() => session.documentUri === idOf(fileB), "the git diff of B, cursor in its git side");

  fake.controls.activateDiff({ original: Uri.file(fileC), modified: virtualUri(fileC), activeSide: "modified" });
  await studio.until(() => session.documentUri === idOf(fileC), "the replace preview of C");

  fake.controls.activateDiff({ original: Uri.file(fileC), modified: virtualUri(fileC), activeSide: "original" });
  await studio.advance(100);
  assert.equal(session.documentUri, idOf(fileC), "a focus move between the sides of one diff switches nothing");

  fake.controls.activateDiff({ original: gitUri(fileA), modified: gitUri(fileA), activeSide: "modified" });
  await studio.advance(100);
  assert.equal(session.documentUri, idOf(fileC), "a diff with only a working-tree stand-in does not switch it");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-100#S7
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100#S9
test("the real file's side of a diff scrolls the side preview, and a git side never does", async (t) => {
  const studio = start(t);
  const file = writeFile(Array.from({ length: 80 }, (_, index) => `line ${index}\n`).join("\n"));
  const { panel } = await studio.openSide(file);
  await studio.advance(100);
  const editors = fake.controls.activateDiff({ original: gitUri(file), modified: Uri.file(file), activeSide: "modified" });
  await studio.advance(100);
  const scrolls = (from: number): Array<Record<string, unknown>> =>
    panel.posted.slice(from).filter((message) => message.type === "sourceScroll" && message.line !== undefined);

  let from = panel.posted.length;
  (editors.original as unknown as { visibleRanges: unknown[] }).visibleRanges = [new fake.vscode.Range(30, 0, 60, 0)];
  fake.controls.events.changeVisibleRanges.fire({ textEditor: editors.original });
  assert.equal(scrolls(from).length, 0, "the git side moves no preview");

  from = panel.posted.length;
  (editors.modified as unknown as { visibleRanges: unknown[] }).visibleRanges = [new fake.vscode.Range(30, 0, 60, 0)];
  fake.controls.events.changeVisibleRanges.fire({ textEditor: editors.modified });
  assert.deepEqual(scrolls(from).map((message) => message.line), [31], "the real file's side moves the preview");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-100#S7
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100#S9
test("a staged-like diff, with no file side, scrolls no side preview from either side", async (t) => {
  const studio = start(t);
  const file = writeFile(Array.from({ length: 80 }, (_, index) => `line ${index}\n`).join("\n"));
  const { panel } = await studio.openSide(file);
  await studio.advance(100);
  const editors = fake.controls.activateDiff({ original: gitUri(file), modified: gitUri(file), activeSide: "modified" });
  await studio.advance(100);
  const from = panel.posted.length;
  for (const editor of [editors.original, editors.modified]) {
    (editor as unknown as { visibleRanges: unknown[] }).visibleRanges = [new fake.vscode.Range(30, 0, 60, 0)];
    fake.controls.events.changeVisibleRanges.fire({ textEditor: editor });
  }
  assert.deepEqual(
    panel.posted.slice(from).filter((message) => message.type === "sourceScroll" && message.line !== undefined),
    [],
    "neither virtual side moves the working-tree preview",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-108#S2
// @tests_req SwRS-MDOKFSTUDIO-LIFE-108#S3
test("a click in the preview reveals the line in the real file's side of a diff, not in a side that shares its path", async (t) => {
  const studio = start(t);
  const file = writeFile(Array.from({ length: 20 }, (_, index) => `line ${index}\n`).join("\n"));
  const { panel } = await studio.openSide(file);
  await studio.advance(100);
  // The git side comes first in the visible editors: a match on the path alone would pick it.
  const editors = fake.controls.activateDiff({ original: gitUri(file), modified: Uri.file(file), activeSide: "modified" });
  await studio.advance(100);
  const identity = [...panel.htmlAssignments].reverse().map(identityOfDocument).find((value) => value !== undefined)!;
  (panel as FakeWebviewPanel).fromPage.fire({
    type: "previewReveal", ...identity, sourceLine: 6, scrollTop: 0, descriptionsCollapsed: false, line: 6,
  });
  await studio.advance(50);
  const revealed = (editor: unknown): unknown[] => (editor as { revealed: unknown[] }).revealed;
  assert.equal(revealed(editors.original).length, 0, "the git side is never revealed");
  assert.equal(revealed(editors.modified).length, 1, "the real file's side is");
});
