import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  sendPreviewMessageForTests,
} from "./extensionApi";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

type PreviewForTests = NonNullable<ReturnType<typeof getActivePreviewForTests>>;

function send(preview: PreviewForTests, type: string, fields: Record<string, unknown>, version = preview.documentVersion) {
  return sendPreviewMessageForTests({
    type,
    documentId: preview.documentUri,
    revision: version,
    requestId: getActivePreviewForTests()?.requestId ?? preview.requestId,
    ...fields,
  });
}

const anchorOf = (line: number, quote: string) => ({ line, endLine: line, quote, prefix: "a ", suffix: " b" });
const readThreads = (file: string): any[] => JSON.parse(fs.readFileSync(file, "utf8")).threads;

/**
 * T43: creating a thread and replying write the sidecar next to the document through the host
 * queue. Two creates sent together both land; the author comes from the setting; an invalid
 * existing file is never overwritten; the sidecar is removed again in the teardown.
 */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "comment-write-"));
  const filePath = path.join(directory, "notes.md");
  const sidecarPath = path.join(directory, "notes.comments.json");
  fs.writeFileSync(filePath, "# Notes\n\nThe first paragraph.\n\nThe second paragraph.\n");
  const settings = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.comments");
  const originalAuthor = settings.inspect<string>("authorName")?.globalValue;
  try {
    await settings.update("authorName", "  Ada Reviewer  ", vscode.ConfigurationTarget.Global);
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)), vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the preview to be ready", () => {
      const preview = getActivePreviewForTests();
      return preview?.documentUri === vscode.Uri.file(filePath).toString() && preview.phase === "ready" && preview.webviewReady;
    });
    const preview = getActivePreviewForTests()!;
    assert.match(preview.html, /"commentsEnabled":true/u, "a writable preview offers comments");
    assert.equal(fs.existsSync(sidecarPath), false);

    // Two creates sent together: the queue keeps both.
    await Promise.all([
      send(preview, "previewCommentCreate", { anchor: anchorOf(3, "first"), body: "  First remark  " }),
      send(preview, "previewCommentCreate", { anchor: anchorOf(5, "second"), body: "Second remark" }),
    ]);
    let file = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(file.version, 1);
    assert.equal(file.document, "notes.md");
    assert.equal(file.threads.length, 2, "two quick creates must both be saved");
    assert.deepEqual(file.threads.map((thread: any) => thread.comments[0].body).sort(), ["First remark", "Second remark"]);
    for (const thread of file.threads) {
      assert.match(thread.id, /^t_[0-9a-f]{8}$/u);
      assert.match(thread.comments[0].id, /^c_[0-9a-f]{8}$/u);
      assert.equal(thread.comments[0].author, "Ada Reviewer");
      assert.equal(thread.resolved, false);
      assert.match(thread.createdAt, /^\d{4}-\d\d-\d\dT[\d:.]+Z$/u);
    }
    const first = file.threads.find((thread: any) => thread.comments[0].body === "First remark");
    assert.deepEqual(first.anchor, anchorOf(3, "first"));
    assert.equal(getActivePreviewForTests()?.comments.last?.length, 2, "the page was told");

    // A reply is appended to the named thread only; an unknown thread changes nothing.
    await send(preview, "previewCommentReply", { threadId: first.id, body: "Reply text" });
    file = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const repliedFirst = file.threads.find((thread: any) => thread.id === first.id);
    assert.deepEqual(repliedFirst.comments.map((comment: any) => comment.body), ["First remark", "Reply text"]);
    assert.match(repliedFirst.comments[1].id, /^c_[0-9a-f]{8}$/u);
    assert.equal(file.threads.find((thread: any) => thread.id !== first.id).comments.length, 1);
    const stored = fs.readFileSync(sidecarPath, "utf8");
    await send(preview, "previewCommentReply", { threadId: "t_ffffffff", body: "Lost" });
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), stored, "a reply to an unknown thread writes nothing");
    let result = getActivePreviewForTests()?.comments.result;
    assert.equal(result?.ok, false, "the page is told the reply was refused");
    assert.equal(result?.kind, "reply");
    assert.equal(result?.threadId, "t_ffffffff");
    assert.match(result?.reason ?? "", /no longer exists/u);

    // Invalid messages and a stale version change nothing.
    await send(preview, "previewCommentCreate", { anchor: anchorOf(3, "x"), body: "" });
    await send(preview, "previewCommentCreate", { anchor: anchorOf(3, "x"), body: "x".repeat(10_001) });
    await send(preview, "previewCommentCreate", { anchor: { ...anchorOf(3, "x"), quote: "q".repeat(501) }, body: "x" });
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), stored, "invalid messages write nothing");

    // Comments do not depend on the document version: an old version is still written and answered.
    await send(preview, "previewCommentCreate", { anchor: anchorOf(3, "old"), body: "Sent with an old version" }, (preview.documentVersion ?? 1) - 1);
    result = getActivePreviewForTests()?.comments.result;
    assert.deepEqual([result?.ok, result?.kind], [true, "create"]);
    assert.ok(readThreads(sidecarPath).some((thread: any) => thread.comments[0].body === "Sent with an old version"),
      "a create with an old documentVersion must still be written");
    // A wrong document id is still dropped.
    let before = fs.readFileSync(sidecarPath, "utf8");
    await sendPreviewMessageForTests({
      type: "previewCommentCreate", documentId: "file:///elsewhere.md", revision: preview.documentVersion,
      requestId: getActivePreviewForTests()?.requestId, anchor: anchorOf(3, "x"), body: "Wrong document",
    });
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), before);

    // T44: resolve, reopen and delete go through the same queue and are always answered.
    const secondId = file.threads.find((thread: any) => thread.id !== first.id).id;
    await send(preview, "previewCommentResolve", { threadId: first.id, resolved: true });
    assert.equal(readThreads(sidecarPath).find((thread: any) => thread.id === first.id).resolved, true);
    assert.deepEqual(
      [getActivePreviewForTests()?.comments.result?.ok, getActivePreviewForTests()?.comments.result?.kind],
      [true, "resolve"],
    );
    await send(preview, "previewCommentResolve", { threadId: first.id, resolved: false });
    assert.equal(readThreads(sidecarPath).find((thread: any) => thread.id === first.id).resolved, false);
    await Promise.all([
      send(preview, "previewCommentResolve", { threadId: secondId, resolved: true }),
      send(preview, "previewCommentReply", { threadId: first.id, body: "Queued reply" }),
    ]);
    assert.equal(readThreads(sidecarPath).find((thread: any) => thread.id === secondId).resolved, true);
    assert.equal(readThreads(sidecarPath).find((thread: any) => thread.id === first.id).comments.length, 3);
    const beforeMissing = fs.readFileSync(sidecarPath, "utf8");
    await send(preview, "previewCommentResolve", { threadId: "t_ffffffff", resolved: true });
    await send(preview, "previewCommentDelete", { threadId: "t_ffffffff" });
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), beforeMissing, "unknown threads change nothing");
    result = getActivePreviewForTests()?.comments.result;
    assert.deepEqual([result?.ok, result?.kind, result?.threadId], [false, "delete", "t_ffffffff"]);
    assert.match(result?.reason ?? "", /no longer exists/u);
    await send(preview, "previewCommentDelete", { threadId: secondId });
    const remaining = readThreads(sidecarPath).map((thread: any) => thread.id);
    assert.equal(remaining.includes(secondId), false, "the deleted thread is gone");
    assert.equal(remaining.includes(first.id), true, "the others stay");
    assert.deepEqual(
      [getActivePreviewForTests()?.comments.result?.ok, getActivePreviewForTests()?.comments.result?.kind],
      [true, "delete"],
    );
    for (const id of remaining) await send(preview, "previewCommentDelete", { threadId: id });
    assert.ok(fs.existsSync(sidecarPath), "deleting the last thread keeps the file");
    assert.deepEqual(readThreads(sidecarPath), [], "with an empty list");
    assert.equal(getActivePreviewForTests()?.comments.last?.length, 0);
    // Put two threads back for the checks that follow.
    await send(preview, "previewCommentCreate", { anchor: anchorOf(3, "first"), body: "First again" });
    await send(preview, "previewCommentCreate", { anchor: anchorOf(5, "second"), body: "Second again" });
    file = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(file.threads.length, 2);
    before = fs.readFileSync(sidecarPath, "utf8");

    // A comments file with unsaved changes in an editor is not overwritten from disk.
    const sidecarDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(sidecarPath));
    const sidecarEditor = await vscode.window.showTextDocument(sidecarDocument, vscode.ViewColumn.Two);
    await sidecarEditor.edit((builder) => builder.insert(new vscode.Position(0, 0), " "));
    assert.equal(sidecarDocument.isDirty, true);
    await send(preview, "previewCommentCreate", { anchor: anchorOf(3, "dirty"), body: "Blocked by the dirty editor" });
    result = getActivePreviewForTests()?.comments.result;
    assert.equal(result?.ok, false);
    assert.match(result?.reason ?? "", /unsaved changes/u);
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), before, "the file on disk is untouched");
    await vscode.commands.executeCommand("workbench.action.files.revert");
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    assert.equal(sidecarDocument.isDirty, false);

    // Our own writes do not make the page re-post: wait for the watcher, count stays.
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    const posts = getActivePreviewForTests()?.comments.posts ?? 0;
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    assert.equal(getActivePreviewForTests()?.comments.posts, posts, "the echo of our own write is skipped");

    // An existing file that is not valid is never overwritten.
    fs.writeFileSync(sidecarPath, "{ not json");
    await send(preview, "previewCommentCreate", { anchor: anchorOf(3, "x"), body: "Would overwrite" });
    assert.equal(fs.readFileSync(sidecarPath, "utf8"), "{ not json");
    result = getActivePreviewForTests()?.comments.result;
    assert.equal(result?.ok, false, "the page is told, so it keeps the typed text");
    assert.match(result?.reason ?? "", /not valid/u);

    // Without the setting, the Git user name or the OS user name is stored (never empty).
    await settings.update("authorName", undefined, vscode.ConfigurationTarget.Global);
    fs.rmSync(sidecarPath);
    await send(preview, "previewCommentCreate", { anchor: anchorOf(3, "x"), body: "Anonymous or OS" });
    assert.ok(readThreads(sidecarPath)[0].comments[0].author.length > 0);
    assert.equal(getActivePreviewForTests()?.comments.result?.ok, true);
  } finally {
    await settings.update("authorName", originalAuthor, vscode.ConfigurationTarget.Global);
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/** T43: a read-only preview offers no comments and writes no sidecar. */
export async function runUntrusted(preview: PreviewForTests, document: vscode.TextDocument): Promise<void> {
  assert.match(preview.html, /"commentsEnabled":false/u, "a read-only preview has no Comment button");
  const sidecar = path.join(path.dirname(document.uri.fsPath), `${path.basename(document.uri.fsPath, ".md")}.comments.json`);
  assert.equal(fs.existsSync(sidecar), false);
  try {
    await send(preview, "previewCommentCreate", { anchor: anchorOf(1, "x"), body: "Refused" });
    await send(preview, "previewCommentReply", { threadId: "t_00000000", body: "Refused" });
    await send(preview, "previewCommentResolve", { threadId: "t_00000000", resolved: true });
    await send(preview, "previewCommentDelete", { threadId: "t_00000000" });
    assert.equal(fs.existsSync(sidecar), false, "a read-only preview must not write a comments file");
    const result = getActivePreviewForTests()?.comments.result;
    assert.equal(result?.ok, false, "the refusal is reported to the page");
    assert.equal(result?.kind, "delete", "resolve and delete are answered too");
    assert.match(result?.reason ?? "", /trusted workspace/u);
  } finally {
    fs.rmSync(sidecar, { force: true });
  }
}
