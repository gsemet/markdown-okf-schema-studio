import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { listGlobDocuments, MAX_GLOB_MATCHES } from "../../../src/core/render/documentGlob";
import { createPlatformMemoryFileSystem } from "../../shared/memoryHostPaths";

const base = path.resolve("/project/docs");
const allowAll = (): boolean => true;

function tree() {
  const files = createPlatformMemoryFileSystem();
  for (const name of ["b.md", "a.md", "sub/c.markdown", "sub/deep/d.myst", ".hidden.md", "readme.txt", "node_modules/e.md", ".git/f.md", "out/g.md", "_build/h.md", ".dot/i.md"]) {
    files.addFile(path.join(base, name), "# x\n");
  }
  return files;
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-057
test("a glob lists the documents below the folder, sorted, without hidden files and generated folders", async () => {
  const files = tree();
  assert.deepEqual(await listGlobDocuments(files, "**", base, allowAll), [
    "a.md", "b.md", "sub/c.markdown", "sub/deep/d.myst",
  ]);
  assert.deepEqual(await listGlobDocuments(files, "*", base, allowAll), ["a.md", "b.md"]);
  assert.deepEqual(await listGlobDocuments(files, "sub/*", base, allowAll), ["sub/c.markdown"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-057
test("a glob leaves out the excluded document, a refused candidate and an absolute or parent pattern", async () => {
  const files = tree();
  assert.deepEqual(await listGlobDocuments(files, "*", base, allowAll, path.join(base, "a.md")), ["b.md"]);
  assert.deepEqual(await listGlobDocuments(files, "*", base, async (request) => request !== "b.md"), ["a.md"]);
  assert.deepEqual(await listGlobDocuments(files, "../*", base, allowAll), []);
  assert.deepEqual(await listGlobDocuments(files, "/etc/*", base, allowAll), []);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-057
test("a glob lists no symbolic link and walks no linked folder", async () => {
  const files = tree();
  files.addFile(path.resolve("/project/elsewhere/z.md"), "# z\n");
  files.addSymlink(path.join(base, "link.md"), path.join(base, "a.md"));
  files.addSymlink(path.join(base, "linked"), path.resolve("/project/elsewhere"));
  files.addSymlink(path.join(base, "dangling.md"), path.join(base, "missing.md"));
  assert.deepEqual(await listGlobDocuments(files, "**", base, allowAll), [
    "a.md", "b.md", "sub/c.markdown", "sub/deep/d.myst",
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-057
test("a glob stops at the most matches and gives nothing for a folder that cannot be read", async () => {
  const files = createPlatformMemoryFileSystem();
  for (let index = 0; index < MAX_GLOB_MATCHES + 30; index += 1) {
    files.addFile(path.join(base, `n${String(index).padStart(3, "0")}.md`), "#\n");
  }
  assert.equal((await listGlobDocuments(files, "*", base, allowAll)).length, MAX_GLOB_MATCHES);
  assert.deepEqual(await listGlobDocuments(files, "*", path.resolve("/project/none"), allowAll), []);
});
