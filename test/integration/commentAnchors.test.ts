import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { COMMAND_ID, disposeActivePreviewForTests, getActivePreviewForTests } from "./extensionApi";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const thread = (id: string, line: number, quote: string) => ({
  id,
  anchor: { line, endLine: line, quote, prefix: "", suffix: "" },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: `c_${id}`, author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: `Body ${id}` }],
});
const sidecarText = (document: string, threads: unknown[]) =>
  `${JSON.stringify({ version: 1, document, threads }, null, 2)}\n`;
const lines = (file: string): Record<string, number> =>
  Object.fromEntries(JSON.parse(fs.readFileSync(file, "utf8")).threads.map((t: any) => [t.id, t.anchor.line]));
const liveLines = (): Record<string, number> =>
  Object.fromEntries((getActivePreviewForTests()?.comments.last ?? []).map((t) => [t.id, t.anchor.line]));

/**
 * T45: threads follow the text. Edits shift them in memory without any write; the save of the
 * document writes the moved lines; an orphan keeps its line; no sidecar is created; an invalid or
 * dirty sidecar is left alone; a renamed document takes its sidecar along, never over another one.
 */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "comment-anchors-"));
  const filePath = path.join(directory, "notes.md");
  const sidecarPath = path.join(directory, "notes.comments.json");
  fs.writeFileSync(filePath, [
    "# Notes", "", "The first paragraph is here.", "", "The second paragraph is here.", "",
    "The gone soon sentence lives here.", "",
  ].join("\n"));
  const initial = sidecarText("notes.md", [
    thread("t1", 3, "first paragraph"), thread("t2", 5, "second paragraph"), thread("t3", 7, "gone soon sentence"),
  ]);
  fs.writeFileSync(sidecarPath, initial);
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the threads", () => (getActivePreviewForTests()?.comments.last?.length ?? 0) === 3);
    assert.deepEqual(getActivePreviewForTests()?.comments.last?.map((t) => t.orphaned), [false, false, false]);

    // Typing: two inserts in one event (multi-cursor). Lines shift in memory, nothing is written.
    await editor.edit((builder) => {
      builder.insert(new vscode.Position(0, 0), "Intro\n");
      builder.insert(new vscode.Position(3, 0), "Another\n");
    });
    await waitFor("the shifted lines", () => liveLines().t1 === 4 && liveLines().t2 === 7);
    await pause(700);
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), initial, "no sidecar write while typing");

    // Remove the sentence of t3: the page is told it is orphaned; still nothing written.
    const target = document.getText().split("\n").findIndex((text) => text.includes("gone soon"));
    await editor.edit((builder) => builder.delete(new vscode.Range(target, 0, target + 1, 0)));
    await pause(700);
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), initial);

    // Save: the moved lines are written, the orphan keeps its old line, nothing is lost.
    assert.equal(await document.save(), true);
    await waitFor("the sidecar to change", () => fs.readFileSync(sidecarPath, "utf8") !== initial);
    assert.deepEqual(lines(sidecarPath), { t1: 4, t2: 7, t3: 7 });
    const saved = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(saved.threads.length, 3);
    assert.deepEqual(saved.threads.map((t: any) => t.comments[0].body), ["Body t1", "Body t2", "Body t3"]);
    assert.equal(saved.document, "notes.md");

    // A save with nothing moved does not touch the file.
    const afterSave = fs.statSync(sidecarPath).mtimeMs;
    await editor.edit((builder) => builder.insert(new vscode.Position(document.lineCount - 1, 0), "Tail\n"));
    await document.save();
    await pause(700);
    assert.equal(fs.statSync(sidecarPath).mtimeMs, afterSave, "no write when no anchor moved");

    // A sidecar with unsaved changes in an editor is not written.
    const before = fs.readFileSync(sidecarPath, "utf8");
    const sidecarDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(sidecarPath));
    const sidecarEditor = await vscode.window.showTextDocument(sidecarDocument, vscode.ViewColumn.Two);
    await sidecarEditor.edit((builder) => builder.insert(new vscode.Position(0, 0), " "));
    assert.equal(sidecarDocument.isDirty, true);
    await editor.edit((builder) => builder.insert(new vscode.Position(0, 0), "More\n"));
    await document.save();
    await pause(700);
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), before, "a dirty sidecar is not overwritten");
    await vscode.commands.executeCommand("workbench.action.files.revert");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    disposeActivePreviewForTests();

    // A thread on a line with a role keeps its place on first open (rendered text is not the source).
    const roles = path.join(directory, "roles.md");
    fs.writeFileSync(roles, "# R\n\nAs shown in {cite}`smith2020` the result holds.\n");
    fs.writeFileSync(path.join(directory, "roles.comments.json"),
      sidecarText("roles.md", [thread("r1", 3, "As shown in Smith, 2020 the result holds.")]));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(roles)), vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the role thread", () => getActivePreviewForTests()?.comments.last?.length === 1);
    assert.equal(getActivePreviewForTests()?.comments.last?.[0].orphaned, false, "not orphaned at its own line");
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    // No sidecar is created; an invalid one stays as it is.
    const plain = path.join(directory, "plain.md");
    fs.writeFileSync(plain, "# Plain\n\nText.\n");
    const plainDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(plain));
    const plainEditor = await vscode.window.showTextDocument(plainDocument, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await plainEditor.edit((builder) => builder.insert(new vscode.Position(0, 0), "New\n"));
    await plainDocument.save();
    await pause(700);
    assert.equal(fs.existsSync(path.join(directory, "plain.comments.json")), false, "never creates a sidecar");
    fs.writeFileSync(path.join(directory, "plain.comments.json"), "{bad");
    await plainEditor.edit((builder) => builder.insert(new vscode.Position(0, 0), "More\n"));
    await plainDocument.save();
    await pause(700);
    assert.equal(fs.readFileSync(path.join(directory, "plain.comments.json"), "utf8"), "{bad");
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    // Rename: the sidecar moves and names the new document.
    const oldName = path.join(directory, "move-me.md");
    const newName = path.join(directory, "moved.md");
    fs.writeFileSync(oldName, "# A\n\nText here.\n");
    fs.writeFileSync(path.join(directory, "move-me.comments.json"), sidecarText("move-me.md", [thread("m1", 3, "Text here")]));
    const rename = new vscode.WorkspaceEdit();
    rename.renameFile(vscode.Uri.file(oldName), vscode.Uri.file(newName));
    assert.equal(await vscode.workspace.applyEdit(rename), true);
    await waitFor("the sidecar to move", () => fs.existsSync(path.join(directory, "moved.comments.json")));
    assert.equal(fs.existsSync(path.join(directory, "move-me.comments.json")), false);
    await waitFor("the document name", () =>
      JSON.parse(fs.readFileSync(path.join(directory, "moved.comments.json"), "utf8")).document === "moved.md");
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "moved.comments.json"), "utf8")).threads[0].id, "m1");

    // Rename onto an existing sidecar: nothing is overwritten, the old one stays.
    const keepOld = path.join(directory, "keep.md");
    const keepNew = path.join(directory, "target.md");
    fs.writeFileSync(keepOld, "# K\n\nText here.\n");
    fs.writeFileSync(keepNew, "# T\n");
    const keepSidecar = sidecarText("keep.md", [thread("k1", 3, "Text here")]);
    const targetSidecar = sidecarText("target.md", [thread("x1", 1, "T")]);
    fs.writeFileSync(path.join(directory, "keep.comments.json"), keepSidecar);
    fs.writeFileSync(path.join(directory, "target.comments.json"), targetSidecar);
    const conflict = new vscode.WorkspaceEdit();
    conflict.renameFile(vscode.Uri.file(keepOld), vscode.Uri.file(path.join(directory, "target2.md")));
    fs.writeFileSync(path.join(directory, "target2.comments.json"), targetSidecar);
    assert.equal(await vscode.workspace.applyEdit(conflict), true);
    await pause(1000);
    assert.equal(fs.readFileSync(path.join(directory, "keep.comments.json"), "utf8"), keepSidecar);
    assert.equal(fs.readFileSync(path.join(directory, "target2.comments.json"), "utf8"), targetSidecar);
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
