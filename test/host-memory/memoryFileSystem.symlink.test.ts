import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMemoryFileSystem } from "../../src/host-memory/memoryFileSystem";

const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

test("a symbolic link to a file is followed by stat, readFile and realpath and is told by isSymbolicLink", async () => {
  const files = createMemoryFileSystem();
  files.addFile("/w/real.txt", "data");
  files.addSymlink("/w/link.txt", "real.txt");
  assert.equal(await files.isSymbolicLink("/w/link.txt"), true);
  assert.equal(await files.isSymbolicLink("/w/real.txt"), false);
  assert.equal((await files.stat("/w/link.txt")).kind, "file");
  assert.equal(text(await files.readFile("/w/link.txt")), "data");
  assert.equal(await files.realpath("/w/link.txt"), "/w/real.txt");
  assert.equal(files.fileExists("/w/link.txt"), true);
});

test("a symbolic link to a folder is followed, also in the middle of a path, and an absolute target works", async () => {
  const files = createMemoryFileSystem();
  files.addFile("/outside/secret.txt", "s");
  files.addSymlink("/w/out", "/outside");
  assert.equal((await files.stat("/w/out")).kind, "directory");
  assert.equal(await files.realpath("/w/out/secret.txt"), "/outside/secret.txt");
  assert.equal(text(await files.readFile("/w/out/secret.txt")), "s");
  assert.equal(await files.isSymbolicLink("/w/out"), true);
  assert.equal(await files.isSymbolicLink("/w/out/secret.txt"), false, "a file below a linked folder is no link itself");
});

test("a dangling or looping symbolic link is an error, and reads as another kind in a listing", async () => {
  const files = createMemoryFileSystem();
  files.addFile("/w/a.txt", "a");
  files.addSymlink("/w/dangling", "missing.txt");
  files.addSymlink("/w/loop1", "loop2");
  files.addSymlink("/w/loop2", "loop1");
  await assert.rejects(files.stat("/w/dangling"), { code: "ENOENT" });
  await assert.rejects(files.realpath("/w/dangling"), { code: "ENOENT" });
  await assert.rejects(files.readFile("/w/loop1"), { code: "ELOOP" });
  assert.equal(files.fileExists("/w/loop1"), false);
  assert.equal(await files.isSymbolicLink("/w/dangling"), true);
  assert.deepEqual(await files.readDirectory("/w"), [
    ["a.txt", "file"], ["dangling", "other"], ["loop1", "other"], ["loop2", "other"],
  ]);
});

test("a listing gives a link the kind of its target, and deleting a link leaves its target", async () => {
  const files = createMemoryFileSystem();
  files.addFile("/w/real.txt", "data");
  files.addDirectory("/w/dir");
  files.addSymlink("/w/file-link", "real.txt");
  files.addSymlink("/w/dir-link", "dir");
  assert.deepEqual(await files.readDirectory("/w"), [
    ["dir", "directory"], ["dir-link", "directory"], ["file-link", "file"], ["real.txt", "file"],
  ]);
  await files.delete("/w/file-link");
  assert.equal(await files.isSymbolicLink("/w/file-link"), false);
  assert.equal(text(await files.readFile("/w/real.txt")), "data");
  assert.deepEqual((await files.readDirectory("/w")).map(([name]) => name), ["dir", "dir-link", "real.txt"]);
});
