/**
 * Host tests of the jump source (CR 456): the selection change events of the fake `vscode` module
 * become jumps only for a command selection of one range in a Markdown file or diff side, and a
 * selection Studio asked for is not one.
 */
import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test, type TestContext } from "node:test";

// The harness first: it installs the fake `vscode` module the production imports below need.
import { COMMAND_ID, fake, startStudio, Uri, workspaceRoot, writeFile } from "./lifeReqHarness";
import * as vscode from "vscode";

import { startEditorJumps, type EditorJump, type SelectionRecord } from "../../src/host-vscode/editorJumps";
import { StudioSelections } from "../../src/host-vscode/studioSelections";

const COMMAND = 3;
const KEYBOARD = 1;
const MOUSE = 2;

function start(): { jumps: EditorJump[]; records: SelectionRecord[]; selections: StudioSelections; stop: () => void } {
  const selections = new StudioSelections();
  const source = startEditorJumps({ selections });
  const jumps: EditorJump[] = [];
  const records: SelectionRecord[] = [];
  source.onJump((jump) => jumps.push(jump));
  source.recordForTests((record) => records.push(record));
  return { jumps, records, selections, stop: () => source.dispose() };
}

function select(editor: unknown, lines: number[], kind?: number): void {
  const selections = lines.map((line) => new vscode.Selection(new vscode.Position(line, 0), new vscode.Position(line, 0)));
  fake.controls.events.changeSelection.fire({ textEditor: editor, selections, ...(kind === undefined ? {} : { kind }) });
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186#S1
test("only a command selection of one range in a Markdown file is a jump; the recorder sees every change", () => {
  const file = writeFile("# One\n\ntext\n\nmore\n");
  fake.controls.openTab(file, { fire: false });
  const editor = vscode.window.activeTextEditor;
  const source = start();
  try {
    select(editor, [4], KEYBOARD);
    select(editor, [4], MOUSE);
    select(editor, [4]);
    select(editor, [2, 4], COMMAND);
    assert.equal(source.jumps.length, 0);
    select(editor, [4], COMMAND);
    assert.deepEqual(source.jumps.map((jump) => ({ uri: jump.uri.toString(), line: jump.line })), [
      { uri: vscode.Uri.file(file).toString(), line: 5 },
    ]);
    assert.equal(source.records.length, 5, "each change is recorded");
    assert.deepEqual(source.records.map((record) => record.kind), ["keyboard", "mouse", "none", "command", "command"]);
    assert.deepEqual(source.records.at(-1)?.jump, { uri: vscode.Uri.file(file).toString(), line: 5 });
  } finally {
    source.stop();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186#S1
test("a selection Studio asked for is used up by the first matching change and is no jump", () => {
  const file = writeFile("# One\n\ntext\n");
  fake.controls.openTab(file, { fire: false });
  const editor = vscode.window.activeTextEditor;
  const source = start();
  try {
    source.selections.expect(vscode.Uri.file(file).toString(), 2, "marked-by-session");
    select(editor, [2], COMMAND);
    assert.equal(source.jumps.length, 0, "Studio's own selection");
    assert.equal(source.records.at(-1)?.matchedStudioSelection, true);
    select(editor, [2], COMMAND);
    assert.equal(source.jumps.length, 1, "the same change a second time is a jump");
  } finally {
    source.stop();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186#S1
test("a file that is not Markdown is no jump target", () => {
  const file = writeFile("plain\n", workspaceRoot, `plain-jump-${process.pid}.txt`);
  fake.controls.openTab(file, { fire: false });
  const source = start();
  try {
    select(vscode.window.activeTextEditor, [0], COMMAND);
    assert.equal(source.jumps.length, 0);
    assert.equal(path.extname(file), ".txt");
  } finally {
    source.stop();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-187#S1
test("a command selection on either side of a diff is a jump to the real file", () => {
  const file = writeFile("# Real\n\ntext\n");
  const git = Uri.file(file).with({ scheme: "git" });
  const sides = fake.controls.activateDiff({ original: git, modified: Uri.file(file), activeSide: "original", fire: false });
  const source = start();
  try {
    select(sides.original, [1], COMMAND);
    select(sides.modified, [2], COMMAND);
    assert.deepEqual(source.jumps.map((jump) => ({ uri: jump.uri.toString(), line: jump.line })), [
      { uri: vscode.Uri.file(file).toString(), line: 2 },
      { uri: vscode.Uri.file(file).toString(), line: 3 },
    ]);
    assert.deepEqual(source.records.map((record) => record.target), ["diff-side", "diff-side"]);
  } finally {
    source.stop();
    fake.controls.activateCustomEditorTab(undefined);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-187#S1
test("the activation sends a jump to the following side preview only, and Open as Text sends none", async (t: TestContext) => {
  fake.controls.studioTabs.length = 0;
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  const file = writeFile(["# One", "", "text", "", "more", ""].join("\n"));
  fake.controls.openTab(file, { fire: false });
  const done = studio.runCommand(COMMAND_ID);
  await studio.advance(300);
  await done;
  const session = studio.manager.active;
  assert.ok(session, "a side preview opened");
  assert.equal(session.followsActiveEditor, true);
  const editor = vscode.window.activeTextEditor;
  select(editor, [3], KEYBOARD);
  assert.equal(session.scroll.pendingRevealLine, undefined, "a cursor move marks nothing");
  select(editor, [3], COMMAND);
  const pending = session.scroll.pendingRevealLine as { line: number; documentId: string } | undefined;
  assert.deepEqual({ line: pending?.line, documentId: pending?.documentId }, { line: 4, documentId: Uri.file(file).toString() });
});
