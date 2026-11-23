import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";
import {
  getCachedMarkdownStemIndex,
  invalidateStemIndex,
  MarkdownStemIndex,
} from "../../../src/core/frontmatter/stemIndex";

const files = createNodeFileSystem();

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

function makeRoot(): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "okf-stem-holes-")));
}

function touch(root: string, ...segments: string[]): string {
  const target = path.join(root, ...segments);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "x");
  return target;
}

function bumpRoot(root: string, seconds: number): void {
  const when = new Date(Date.now() + seconds * 1000);
  fs.utimesSync(root, when, when);
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("only files named like a stem and .md are indexed, whatever their directory, and a directory named like a file is walked", async () => {
  const root = makeRoot();
  try {
    touch(root, "plain.md");
    touch(root, "notes.md.md");
    touch(root, "sub", "deep.md");
    touch(root, "upper.MD");
    touch(root, "page.markdown");
    touch(root, "readme.txt");
    touch(root, "noext");
    touch(root, ".md");
    touch(root, "folder.md", "inner.md");
    touch(root, ".hidden", "skipped.md");
    touch(root, "node_modules", "skipped-too.md");
    const index = await MarkdownStemIndex.build(files, [root]);
    assert.deepEqual(index.stems(), ["deep", "inner", "notes.md", "plain"]);
    assert.deepEqual(await index.get(files, "notes.md"), [fs.realpathSync(path.join(root, "notes.md.md"))]);
    assert.deepEqual(await index.get(files, "folder"), [], "a directory is not a file");
    assert.deepEqual(await index.get(files, "upper"), []);
    assert.deepEqual(await index.get(files, ""), [], "a file called .md has no stem");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("a symbolic link to a Markdown file is indexed under its own stem", async (context) => {
  const root = makeRoot();
  try {
    const real = touch(root, "real", "target.md");
    try {
      fs.symlinkSync(real, path.join(root, "alias.md"), "file");
    } catch {
      context.skip("symbolic links are not allowed here");
      return;
    }
    const index = await MarkdownStemIndex.build(files, [root]);
    assert.deepEqual(index.stems(), ["alias", "target"]);
    assert.deepEqual(await index.get(files, "alias"), [real], "the real path is returned");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("the cached index is rebuilt when its root changes and not otherwise, and each root set has its own", async () => {
  const first = makeRoot();
  const second = makeRoot();
  try {
    touch(first, "one.md");
    touch(second, "two.md");
    bumpRoot(first, -100);
    bumpRoot(second, -100);
    const cachedFirst = (await getCachedMarkdownStemIndex(files, [first]));
    assert.equal((await getCachedMarkdownStemIndex(files, [first])), cachedFirst, "the same root gives the same index");
    assert.deepEqual((await getCachedMarkdownStemIndex(files, [second])).stems(), ["two"], "another root is another index");
    assert.deepEqual((await getCachedMarkdownStemIndex(files, [first])).stems(), ["one"]);
    const both = (await getCachedMarkdownStemIndex(files, [first, second]));
    assert.equal((await getCachedMarkdownStemIndex(files, [second, first])), both, "the order of the roots does not matter");
    assert.deepEqual(both.stems(), ["one", "two"]);
    assert.notEqual(both, cachedFirst);
    touch(first, "three.md");
    bumpRoot(first, -50);
    const rebuilt = (await getCachedMarkdownStemIndex(files, [first]));
    assert.notEqual(rebuilt, cachedFirst, "a changed root is indexed again");
    assert.deepEqual(rebuilt.stems(), ["one", "three"]);
  } finally {
    invalidateStemIndex();
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("a root that is gone is indexed as empty, and indexed again once it exists", async () => {
  const parent = makeRoot();
  const missing = path.join(parent, "later");
  try {
    const before = (await getCachedMarkdownStemIndex(files, [missing]));
    assert.deepEqual(before.stems(), []);
    assert.equal((await getCachedMarkdownStemIndex(files, [missing])), before, "an absent root is cached");
    touch(missing, "now.md");
    const after = (await getCachedMarkdownStemIndex(files, [missing]));
    assert.notEqual(after, before, "the root appeared");
    assert.deepEqual(after.stems(), ["now"]);
  } finally {
    invalidateStemIndex();
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("invalidating a root drops only the cached indexes that contain it, and invalidating nothing in particular drops all", async () => {
  const first = makeRoot();
  const second = makeRoot();
  try {
    touch(first, "one.md");
    touch(second, "two.md");
    const cachedFirst = (await getCachedMarkdownStemIndex(files, [first]));
    const cachedSecond = (await getCachedMarkdownStemIndex(files, [second]));
    const cachedBoth = (await getCachedMarkdownStemIndex(files, [first, second]));
    invalidateStemIndex(first);
    assert.equal((await getCachedMarkdownStemIndex(files, [second])), cachedSecond, "an unrelated index stays");
    assert.notEqual((await getCachedMarkdownStemIndex(files, [first])), cachedFirst);
    assert.notEqual((await getCachedMarkdownStemIndex(files, [first, second])), cachedBoth, "an index holding the root goes too");
    const keptSecond = (await getCachedMarkdownStemIndex(files, [second]));
    invalidateStemIndex();
    assert.notEqual((await getCachedMarkdownStemIndex(files, [second])), keptSecond);
  } finally {
    invalidateStemIndex();
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
});
