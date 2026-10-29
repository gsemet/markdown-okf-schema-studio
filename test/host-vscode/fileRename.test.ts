/**
 * The VS Code file system port (`src/host-vscode/vscodeHost.ts`): a rename that replaces its target
 * does it in one step. VS Code's `workspace.fs.rename` with `overwrite` deletes the target first and
 * renames after, so a reader of a review comments file could find it missing while it is rewritten.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { createCommentStore } from "../../src/core/comments/commentStore";
import { createFakeVscode } from "../host/fakeVscode";

const fake = createFakeVscode({ workspaceRoot: os.tmpdir() });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeModule = require("node:module") as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = nodeModule._load;
nodeModule._load = function load(request: string, ...rest: unknown[]): unknown {
  return request === "vscode" ? fake.vscode : originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createVscodeHost } = require("../../src/host-vscode/vscodeHost") as typeof import("../../src/host-vscode/vscodeHost");

function temporaryFolder(t: { after(fn: () => void): void }): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "vscode-rename-"));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  return folder;
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-054
test("a rename with overwrite replaces the target in one step, never deleting it first", async (t) => {
  const folder = temporaryFolder(t);
  const source = path.join(folder, "notes.comments.json.1a2b.tmp");
  const target = path.join(folder, "notes.comments.json");
  fs.writeFileSync(target, "old");
  fs.writeFileSync(source, "new");
  fake.controls.targetsDeletedByRename.length = 0;

  await createVscodeHost().files.rename(source, target, { overwrite: true });

  assert.equal(fs.readFileSync(target, "utf8"), "new");
  assert.equal(fs.existsSync(source), false);
  assert.deepEqual(fake.controls.targetsDeletedByRename, [], "the target is never missing during the rename");
});

test("a rename without overwrite refuses an existing target and moves onto a free one", async (t) => {
  const folder = temporaryFolder(t);
  const source = path.join(folder, "move-me.comments.json");
  const taken = path.join(folder, "taken.comments.json");
  const free = path.join(folder, "moved.comments.json");
  fs.writeFileSync(source, "mine");
  fs.writeFileSync(taken, "theirs");
  const { files } = createVscodeHost();

  await assert.rejects(files.rename(source, taken));
  assert.equal(fs.readFileSync(taken, "utf8"), "theirs");
  assert.equal(fs.readFileSync(source, "utf8"), "mine");
  await files.rename(source, free, { overwrite: false });
  assert.equal(fs.readFileSync(free, "utf8"), "mine");
  assert.equal(fs.existsSync(source), false);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-054
test("rewriting a review comments file through the VS Code host never leaves it missing", async (t) => {
  const folder = temporaryFolder(t);
  const sidecar = path.join(folder, "moved.comments.json");
  fs.writeFileSync(sidecar, `${JSON.stringify({ version: 1, document: "move-me.md", threads: [] }, null, 2)}\n`);
  const { files } = createVscodeHost();
  const store = createCommentStore({
    read: (file) => files.readFile(file).then((data) => new TextDecoder().decode(data), () => undefined),
    write: (file, text) => files.writeFile(file, new TextEncoder().encode(text)),
    isSymbolicLink: (file) => files.isSymbolicLink(file),
    rename: (from, to) => files.rename(from, to, { overwrite: true }),
    remove: (file) => files.delete(file),
  });
  fake.controls.targetsDeletedByRename.length = 0;

  const result = await store.update(sidecar, "moved.md", (threads) => threads, { renameDocument: true });

  assert.equal(result.ok, true);
  assert.equal(JSON.parse(fs.readFileSync(sidecar, "utf8")).document, "moved.md");
  assert.deepEqual(fake.controls.targetsDeletedByRename, [], "the comments file is replaced, not deleted then written");
  assert.deepEqual(fs.readdirSync(folder), ["moved.comments.json"], "no temporary file is left");
});
