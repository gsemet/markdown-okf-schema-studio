import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { isFileNotFound, readTextFile } from "../../src/host-api/fileSystem";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { createNodeProcessRunner } from "../../src/node-services/processRunner";

test("the Node file system reads, writes, lists, renames and resolves links", async (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "okf-node-fs-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = createNodeFileSystem();
  fs.mkdirSync(path.join(root, "docs"));
  fs.symlinkSync(path.join(root, "docs"), path.join(root, "link"));

  await files.writeFile(path.join(root, "docs", "a.md"), new TextEncoder().encode("# A"));
  assert.equal(await readTextFile(files, path.join(root, "docs", "a.md")), "# A");
  assert.deepEqual(await files.stat(path.join(root, "docs", "a.md")), { kind: "file", size: 3 });
  assert.deepEqual(await files.readDirectory(root), [["docs", "directory"], ["link", "directory"]]);
  assert.equal(await files.realpath(path.join(root, "link", "a.md")), path.join(root, "docs", "a.md"));

  await files.writeFile(path.join(root, "docs", "b.md"), new TextEncoder().encode("B"));
  await assert.rejects(files.rename(path.join(root, "docs", "a.md"), path.join(root, "docs", "b.md")), { code: "EEXIST" });
  await files.rename(path.join(root, "docs", "a.md"), path.join(root, "docs", "c.md"));
  const missing = await files.stat(path.join(root, "docs", "a.md")).then(() => undefined, (error: unknown) => error);
  assert.equal(isFileNotFound(missing), true);
  assert.equal(isFileNotFound(new Error("other")), false);
  await files.delete(path.join(root, "docs", "c.md"));
  assert.equal(fs.existsSync(path.join(root, "docs", "c.md")), false);
  assert.equal(isFileNotFound(await files.delete(path.join(root, "docs", "c.md")).then(() => undefined, (error: unknown) => error)), true);
});

test("the Node file system keeps the case of the input path on a case-insensitive file system, like fs.realpathSync", async (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "okf-node-case-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "CaseDir"));
  fs.writeFileSync(path.join(root, "CaseDir", "File.md"), "# File");
  const typed = path.join(root, "casedir", "file.md");
  if (!fs.existsSync(typed)) {
    t.skip("the temporary directory is on a case-sensitive file system");
    return;
  }
  const resolved = await createNodeFileSystem().realpath(typed);
  assert.equal(resolved, fs.realpathSync(typed));
  assert.equal(resolved, typed);
});

test("the Node process runner runs a program without a shell and reports its output", async () => {
  const runner = createNodeProcessRunner();
  const result = await runner.run(process.execPath, ["-e", "process.stdout.write('out'); process.stderr.write('err'); process.exit(3)"]);
  assert.deepEqual(result, { exitCode: 3, stopped: false, stdout: "out", stderr: "err" });
});

test("the Node process runner stops a program on abort", async () => {
  const runner = createNodeProcessRunner();
  const controller = new AbortController();
  const running = runner.run(process.execPath, ["-e", "process.stdout.write('ready'); setInterval(() => {}, 1000)"], {
    signal: controller.signal,
  });
  controller.abort();
  const result = await running;
  assert.equal(result.stopped, true);
});
