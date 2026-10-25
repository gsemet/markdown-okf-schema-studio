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

const SIDECAR = {
  version: 1,
  document: "notes.md",
  threads: [{
    id: "t1",
    anchor: { line: 3, endLine: 3, quote: "second paragraph", prefix: "The ", suffix: " has" },
    resolved: false,
    createdAt: "2026-10-21T10:00:00Z",
    comments: [{ id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "<b>Why?</b>" }],
  }],
};

async function openPreview(uri: vscode.Uri): Promise<void> {
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
  await waitFor("the preview to be ready", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === uri.toString() && preview.phase === "ready" && preview.webviewReady;
  });
}

// @tests_req StRS-MDOKFSTUDIO-REVIEW-001
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-001
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-012
/**
 * T42: a sidecar next to the document is posted to the page (and again when it changes); a
 * document without a sidecar gets no message; an invalid sidecar posts no threads.
 */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "comments-"));
  const filePath = path.join(directory, "notes.md");
  const sidecarPath = path.join(directory, "notes.comments.json");
  const plainPath = path.join(directory, "plain.md");
  fs.writeFileSync(filePath, "# Notes\n\nThe second paragraph has text.\n");
  fs.writeFileSync(plainPath, "# Plain\n\nNothing to review.\n");
  // The sidecar starts invalid: a warning at most, and no message to the page.
  fs.writeFileSync(sidecarPath, "{ not json");
  try {
    await openPreview(vscode.Uri.file(filePath));
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    assert.equal(getActivePreviewForTests()?.comments.posts, 0, "an invalid file posts nothing");

    // Made valid: the threads arrive with the data as stored.
    fs.writeFileSync(sidecarPath, `${JSON.stringify(SIDECAR, null, 2)}\n`);
    await waitFor("the threads to be posted", () => (getActivePreviewForTests()?.comments.last?.length ?? 0) === 1, 30_000);
    const posted = getActivePreviewForTests()?.comments.last?.[0];
    assert.equal(posted?.anchor.quote, "second paragraph");
    assert.equal(posted?.comments[0].body, "<b>Why?</b>", "the body is data, posted as stored");

    // A change of the file is followed.
    const afterChange = getActivePreviewForTests()?.comments.posts ?? 0;
    const edited = { ...SIDECAR, threads: [{ ...SIDECAR.threads[0], resolved: true }] };
    fs.writeFileSync(sidecarPath, `${JSON.stringify(edited, null, 2)}\n`);
    await waitFor("the changed thread to be posted", () =>
      (getActivePreviewForTests()?.comments.posts ?? 0) > afterChange
      && getActivePreviewForTests()?.comments.last?.[0].resolved === true, 30_000);

    // Deleting the file takes the threads back with an empty post.
    const beforeDelete = getActivePreviewForTests()?.comments.posts ?? 0;
    fs.rmSync(sidecarPath);
    await waitFor("an empty post after the sidecar is deleted", () =>
      (getActivePreviewForTests()?.comments.posts ?? 0) > beforeDelete
      && getActivePreviewForTests()?.comments.last?.length === 0, 30_000);

    // A document without a sidecar: no message at all.
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await openPreview(vscode.Uri.file(plainPath));
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    assert.equal(getActivePreviewForTests()?.comments.posts, 0);
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
