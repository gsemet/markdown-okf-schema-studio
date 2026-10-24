import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { inspectFrontmatterLinks } from "../../../src/core/frontmatter/fileLinks";
import {
  invalidateStemIndex,
  MarkdownStemIndex,
} from "../../../src/core/frontmatter/stemIndex";

const filenameStemAnnotation = {
  resolution: "filename-stem",
  syntax: "plain",
};

function makeRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "okf-stem-index-"));
}

function inspect(root: string, value: string) {
  return inspectFrontmatterLinks(
    { target: value },
    {
      type: "object",
      properties: {
        target: {
          type: "string",
          "x-okf-link": filenameStemAnnotation,
        },
      },
    },
    {
      filePath: path.join(root, "document.md"),
      workspaceRoots: [root],
    },
  )[0];
}

function writeFile(root: string, relative: string): void {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "# fixture\n");
}

test("MarkdownStemIndex excludes generated, dependency, and hidden directories", () => {
  const root = makeRoot();
  try {
    writeFile(root, "visible/target.md");
    for (const directory of ["node_modules", ".git", "_build", ".venv", "out", "dist", "output", ".hidden"]) {
      writeFile(root, `${directory}/target.md`);
    }

    const index = new MarkdownStemIndex([root]);
    assert.deepEqual(index.pathsForStem("target"), [fs.realpathSync(path.join(root, "visible/target.md"))]);
    assert.deepEqual(index.pathsForStem("missing"), []);
    assert.equal(inspect(root, "target").status, "valid");
  } finally {
    invalidateStemIndex(root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("invalidateStemIndex refreshes the cached index for a root", () => {
  const root = makeRoot();
  try {
    writeFile(root, "docs/initial.md");
    const before = inspect(root, "later");
    assert.equal(before.status, "invalid");
    assert.equal(before.code, "E10");

    writeFile(root, "docs/later.md");
    const cached = inspect(root, "later");
    assert.equal(cached.status, "invalid");

    invalidateStemIndex(root);
    const refreshed = inspect(root, "later");
    assert.equal(refreshed.status, "valid");
    assert.equal(refreshed.resolvedPath, fs.realpathSync(path.join(root, "docs/later.md")));
  } finally {
    invalidateStemIndex(root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("T22: stems returns the indexed stems sorted and limited", () => {
  const root = makeRoot();
  try {
    fs.mkdirSync(path.join(root, "docs"));
    for (const file of ["zeta.md", "alpha.md", "docs/mid.md", "notes.txt"]) {
      fs.writeFileSync(path.join(root, file), "# x\n", "utf8");
    }
    const index = new MarkdownStemIndex([root]);
    assert.deepEqual(index.stems(500), ["alpha", "mid", "zeta"]);
    assert.deepEqual(index.stems(2), ["alpha", "mid"]);
    assert.deepEqual(index.stems(0), []);
  } finally {
    invalidateStemIndex(root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a cached match whose file was deleted rebuilds the index before resolving", () => {
  // The CI race: a fixture directory is deleted and a new one with the same stems is created
  // before the file watcher invalidates the index (the root's own mtime does not change).
  const root = makeRoot();
  try {
    writeFile(root, "fixtures/first/StRS-A.md");
    assert.equal(inspect(root, "StRS-A").status, "valid");

    fs.rmSync(path.join(root, "fixtures/first"), { recursive: true, force: true });
    writeFile(root, "fixtures/second/StRS-A.md");
    const refreshed = inspect(root, "StRS-A");
    assert.equal(refreshed.status, "valid");
    assert.equal(refreshed.resolvedPath, fs.realpathSync(path.join(root, "fixtures/second/StRS-A.md")));
  } finally {
    invalidateStemIndex(root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
