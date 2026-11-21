import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  getCachedMarkdownStemIndex,
  invalidateStemIndex,
  MarkdownStemIndex,
} from "../../../src/core/frontmatter/stemIndex";

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
test("only files named like a stem and .md are indexed, whatever their directory, and a directory named like a file is walked", () => {
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
    const index = new MarkdownStemIndex([root]);
    assert.deepEqual(index.stems(), ["deep", "inner", "notes.md", "plain"]);
    assert.deepEqual(index.get("notes.md"), [fs.realpathSync(path.join(root, "notes.md.md"))]);
    assert.deepEqual(index.get("folder"), [], "a directory is not a file");
    assert.deepEqual(index.get("upper"), []);
    assert.deepEqual(index.get(""), [], "a file called .md has no stem");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("a symbolic link to a Markdown file is indexed under its own stem", (context) => {
  const root = makeRoot();
  try {
    const real = touch(root, "real", "target.md");
    try {
      fs.symlinkSync(real, path.join(root, "alias.md"), "file");
    } catch {
      context.skip("symbolic links are not allowed here");
      return;
    }
    const index = new MarkdownStemIndex([root]);
    assert.deepEqual(index.stems(), ["alias", "target"]);
    assert.deepEqual(index.get("alias"), [real], "the real path is returned");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("the cached index is rebuilt when its root changes and not otherwise, and each root set has its own", () => {
  const first = makeRoot();
  const second = makeRoot();
  try {
    touch(first, "one.md");
    touch(second, "two.md");
    bumpRoot(first, -100);
    bumpRoot(second, -100);
    const cachedFirst = getCachedMarkdownStemIndex([first]);
    assert.equal(getCachedMarkdownStemIndex([first]), cachedFirst, "the same root gives the same index");
    assert.deepEqual(getCachedMarkdownStemIndex([second]).stems(), ["two"], "another root is another index");
    assert.deepEqual(getCachedMarkdownStemIndex([first]).stems(), ["one"]);
    const both = getCachedMarkdownStemIndex([first, second]);
    assert.equal(getCachedMarkdownStemIndex([second, first]), both, "the order of the roots does not matter");
    assert.deepEqual(both.stems(), ["one", "two"]);
    assert.notEqual(both, cachedFirst);
    touch(first, "three.md");
    bumpRoot(first, -50);
    const rebuilt = getCachedMarkdownStemIndex([first]);
    assert.notEqual(rebuilt, cachedFirst, "a changed root is indexed again");
    assert.deepEqual(rebuilt.stems(), ["one", "three"]);
  } finally {
    invalidateStemIndex();
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("a root that is gone is indexed as empty, and indexed again once it exists", () => {
  const parent = makeRoot();
  const missing = path.join(parent, "later");
  try {
    const before = getCachedMarkdownStemIndex([missing]);
    assert.deepEqual(before.stems(), []);
    assert.equal(getCachedMarkdownStemIndex([missing]), before, "an absent root is cached");
    touch(missing, "now.md");
    const after = getCachedMarkdownStemIndex([missing]);
    assert.notEqual(after, before, "the root appeared");
    assert.deepEqual(after.stems(), ["now"]);
  } finally {
    invalidateStemIndex();
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("invalidating a root drops only the cached indexes that contain it, and invalidating nothing in particular drops all", () => {
  const first = makeRoot();
  const second = makeRoot();
  try {
    touch(first, "one.md");
    touch(second, "two.md");
    const cachedFirst = getCachedMarkdownStemIndex([first]);
    const cachedSecond = getCachedMarkdownStemIndex([second]);
    const cachedBoth = getCachedMarkdownStemIndex([first, second]);
    invalidateStemIndex(first);
    assert.equal(getCachedMarkdownStemIndex([second]), cachedSecond, "an unrelated index stays");
    assert.notEqual(getCachedMarkdownStemIndex([first]), cachedFirst);
    assert.notEqual(getCachedMarkdownStemIndex([first, second]), cachedBoth, "an index holding the root goes too");
    const keptSecond = getCachedMarkdownStemIndex([second]);
    invalidateStemIndex();
    assert.notEqual(getCachedMarkdownStemIndex([second]), keptSecond);
  } finally {
    invalidateStemIndex();
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
});
