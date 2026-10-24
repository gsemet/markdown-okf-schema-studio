import * as assert from "node:assert/strict";
import { test } from "node:test";

import { readTextFile } from "../../src/host-api/fileSystem";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { createMemoryFileSystem, normalizePosixPath } from "../../src/host-memory/memoryFileSystem";

test("a memory document applies text edits, moves its revision on and reports the change", async () => {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///a.md", "one\r\ntwo\r\n", "/a.md");
  const before = document.revision;
  const changes: Array<{ start: number; length: number; startLine: number; endLine: number; text: string }> = [];
  const subscription = store.onDidChange((change) => changes.push(...change.changes));
  assert.equal(document.eol, "\r\n");
  assert.equal(document.lineCount, 3);
  assert.equal(document.lineText(1), "two");

  assert.equal(await store.applyEdits(document, [{ start: 0, end: 3, text: "ONE" }], { ownUndoStep: true }), true);
  assert.equal(document.getText(), "ONE\r\ntwo\r\n");
  assert.ok(document.revision > before);
  assert.equal(document.isDirty, true);
  assert.deepEqual(changes, [{ start: 0, length: 3, startLine: 0, endLine: 0, text: "ONE" }]);
  assert.deepEqual(store.applied.map((entry) => entry.options), [{ ownUndoStep: true }]);
  subscription.dispose();

  assert.equal(await store.save(document), true);
  assert.equal(document.isDirty, false);
  assert.equal(store.isApplying(document.id), false);
});

test("a memory document change names the lines of the replaced text, line breaks of any kind", async () => {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///b.md", "one\r\ntwo\nthree\rfour\n", "/b.md");
  const changes: Array<{ startLine: number; endLine: number }> = [];
  const subscription = store.onDidChange((change) => changes.push(...change.changes));
  // "two\nthree" spans the second and the third line.
  assert.equal(await store.applyEdits(document, [{ start: 5, end: 14, text: "x" }]), true);
  // "four" is the fourth line, after a lone "\r".
  assert.equal(await store.applyEdits(document, [{ start: 7, end: 11, text: "4" }]), true);
  subscription.dispose();
  assert.equal(document.getText(), "one\r\nx\r4\n");
  assert.deepEqual(changes.map(({ startLine, endLine }) => [startLine, endLine]), [[1, 2], [2, 2]]);
});

test("a refusing memory store changes nothing, and a bad edit rejects", async () => {
  const store = createMemoryDocumentStore();
  const document = store.add("untitled:1", "abc");
  const revision = document.revision;
  store.refuseEdits(true);
  assert.equal(await store.applyEdits(document, [{ start: 0, end: 1, text: "x" }]), false);
  store.refuseEdits(false);
  await assert.rejects(Promise.resolve(store.applyEdits(document, [{ start: 2, end: 9, text: "" }])), RangeError);
  assert.equal(document.getText(), "abc");
  assert.equal(document.revision, revision);
  assert.equal(document.path, undefined);
});

test("a memory store opens unknown documents through its loader only", async () => {
  const empty = createMemoryDocumentStore();
  await assert.rejects(Promise.resolve(empty.open("file:///missing.md")));
  const store = createMemoryDocumentStore({ load: async () => "loaded" });
  const id = store.idOf("/notes/a b.md");
  const document = await store.open(id);
  assert.equal(document.getText(), "loaded");
  assert.equal(document.path, "/notes/a b.md");
  assert.equal(store.get(id), document);
  assert.equal(await store.open(id), document);
});

test("a memory store reports its own edit as in flight while the change event fires", async () => {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///a.md", "abc", "/a.md");
  const seen: boolean[] = [];
  const subscription = store.onDidChange((change) => seen.push(store.isApplying(change.document.id)));
  assert.equal(await store.applyEdits(document, [{ start: 0, end: 1, text: "x" }]), true);
  subscription.dispose();
  assert.deepEqual(seen, [true]);
  assert.equal(store.isApplying(document.id), false);
});

test("a memory store id is a file URI whose path keeps #, ? and % of a file name", async () => {
  const store = createMemoryDocumentStore({ load: async () => "loaded" });
  for (const name of ["/notes/a#b.md", "/notes/what?.md", "/notes/100%.md"]) {
    const id = store.idOf(name);
    const uri = new URL(id);
    assert.equal(uri.hash, "");
    assert.equal(uri.search, "");
    assert.equal(decodeURIComponent(uri.pathname), name);
    assert.equal((await store.open(id)).path, name);
  }
});

test("the memory file system reads, writes, lists and renames files", async () => {
  const files = createMemoryFileSystem();
  files.addFile("/w/docs/a.md", "# A");
  files.addDirectory("/w/empty");
  assert.equal(await readTextFile(files, "/w/docs/a.md"), "# A");
  assert.deepEqual(await files.stat("/w/docs"), { kind: "directory", size: 0 });
  assert.deepEqual(await files.readDirectory("/w"), [["docs", "directory"], ["empty", "directory"]]);

  await files.writeFile("/w/docs/b.md", new TextEncoder().encode("B"));
  await assert.rejects(files.writeFile("/w/nowhere/c.md", new Uint8Array()), { code: "ENOENT" });
  await assert.rejects(files.rename("/w/docs/a.md", "/w/docs/b.md"), { code: "EEXIST" });
  await files.rename("/w/docs/a.md", "/w/docs/b.md", { overwrite: true });
  assert.equal(await readTextFile(files, "/w/docs/b.md"), "# A");
  await assert.rejects(files.stat("/w/docs/a.md"), { code: "ENOENT" });
  assert.equal(await files.realpath("/w/docs/../docs/./b.md"), "/w/docs/b.md");
  assert.equal(normalizePosixPath("//a/./b/../c/"), "/a/c");
});
