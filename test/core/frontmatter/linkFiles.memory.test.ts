import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { inspectFrontmatterLinks } from "../../../src/core/frontmatter/fileLinks";
import type { LinkFiles } from "../../../src/core/frontmatter/linkFiles";
import {
  getCachedMarkdownStemIndex,
  invalidateStemIndex,
  MarkdownStemIndex,
} from "../../../src/core/frontmatter/stemIndex";
import { createMemoryFileSystem, type MemoryFileSystem } from "../../../src/host-memory/memoryFileSystem";

/** The core resolves paths with `node:path`: on Windows `/ws` becomes `C:\ws`, which the POSIX memory file system does not know. */
const toMemory = (value: string): string => value.replace(/^[A-Za-z]:/u, "").replaceAll("\\", "/");
const fromMemory = (value: string): string => path.resolve(value);

interface Fixture {
  memory: MemoryFileSystem;
  files: LinkFiles;
  root: string;
  at(relative: string): string;
}

function fixture(): Fixture {
  const memory = createMemoryFileSystem();
  const files: LinkFiles = {
    stat: (target) => memory.stat(toMemory(target)),
    readFile: (target) => memory.readFile(toMemory(target)),
    readDirectory: (target) => memory.readDirectory(toMemory(target)),
    isSymbolicLink: (target) => memory.isSymbolicLink(toMemory(target)),
    realpath: async (target) => fromMemory(await memory.realpath(toMemory(target))),
  };
  const root = path.resolve("/ws");
  invalidateStemIndex();
  return { memory, files, root, at: (relative) => path.join(root, relative) };
}

const stemSchema = (resolution: string) => ({
  type: "object",
  properties: { target: { type: "string", "x-okf-link": { resolution, syntax: "plain" } } },
});

async function inspect(f: Fixture, resolution: string, value: string, filePath = f.at("docs/doc.md"), extra = {}) {
  return (await inspectFrontmatterLinks({ target: value }, stemSchema(resolution), {
    files: f.files,
    filePath,
    workspaceRoots: [f.root],
    ...extra,
  }))[0]!;
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("a stem is unique, ambiguous or unknown in the memory file system", async () => {
  const f = fixture();
  f.memory.addFile("/ws/a/unique.md", "# u\n");
  f.memory.addFile("/ws/a/twin.md", "# t\n");
  f.memory.addFile("/ws/b/twin.md", "# t\n");
  const index = await MarkdownStemIndex.build(f.files, [f.root]);
  assert.equal((await index.get(f.files, "unique")).length, 1);
  assert.equal((await index.get(f.files, "twin")).length, 2);
  assert.equal((await index.get(f.files, "missing")).length, 0);
  assert.equal((await inspect(f, "filename-stem", "unique")).status, "valid");
  assert.equal((await inspect(f, "filename-stem", "twin")).status, "invalid");
  assert.equal((await inspect(f, "filename-stem", "missing")).status, "invalid");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("the memory walk skips excluded and hidden directories", async () => {
  const f = fixture();
  f.memory.addFile("/ws/visible/target.md", "# t\n");
  for (const directory of ["node_modules", ".git", "_build", ".venv", "out", "dist", "output", ".hidden"]) {
    f.memory.addFile(`/ws/${directory}/other.md`, "# o\n");
  }
  const index = await MarkdownStemIndex.build(f.files, [f.root]);
  assert.deepEqual(index.stems(), ["target"]);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("a file removed after the build is unavailable, never listed", async () => {
  const f = fixture();
  f.memory.addFile("/ws/a/gone.md", "# g\n");
  const index = await MarkdownStemIndex.build(f.files, [f.root]);
  await f.memory.delete("/ws/a/gone.md");
  const lookup = await index.lookup(f.files, "gone");
  assert.deepEqual(lookup.paths, []);
  assert.equal(lookup.unavailable, true);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("the cached index is shared by concurrent callers and rebuilt after an invalidation", async () => {
  const f = fixture();
  f.memory.addFile("/ws/a/one.md", "# 1\n");
  const [first, second] = await Promise.all([
    getCachedMarkdownStemIndex(f.files, [f.root]),
    getCachedMarkdownStemIndex(f.files, [f.root]),
  ]);
  assert.equal(first, second, "one build for two callers");
  assert.equal(await getCachedMarkdownStemIndex(f.files, [f.root]), first, "no invalidation keeps it");
  invalidateStemIndex(f.root);
  f.memory.addFile("/ws/a/two.md", "# 2\n");
  const rebuilt = await getCachedMarkdownStemIndex(f.files, [f.root]);
  assert.notEqual(rebuilt, first);
  assert.deepEqual(rebuilt.stems(), ["one", "two"]);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("an invalidation during a build discards that build", async () => {
  const f = fixture();
  f.memory.addFile("/ws/a/one.md", "# 1\n");
  const pending = getCachedMarkdownStemIndex(f.files, [f.root]);
  // The build is under way (it awaits the port): a file appears and the watcher invalidates.
  await Promise.resolve();
  f.memory.addFile("/ws/a/late.md", "# l\n");
  invalidateStemIndex(f.root);
  const index = await pending;
  assert.deepEqual(index.stems(), ["late", "one"], "the served index is a rebuild that sees the new file");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
test("document-relative, bundle and project links resolve through the port", async () => {
  const f = fixture();
  f.memory.addFile("/ws/docs/sibling.md", "# s\n");
  f.memory.addFile("/ws/index.md", "# Bundle\n");
  f.memory.addFile("/ws/log.md", "# Log\n");
  f.memory.addFile("/ws/top/file.md", "# f\n");
  const relative = await inspect(f, "document-relative", "sibling.md");
  assert.equal(relative.status, "valid");
  assert.equal(relative.resolvedPath, f.at("docs/sibling.md"));
  const project = await inspect(f, "project-relative", "top/file.md", f.at("docs/doc.md"), { projectRoot: f.root });
  assert.equal(project.status, "valid");
  const bundle = await inspect(f, "bundle-relative", "top/file.md", f.at("docs/doc.md"), { bundleRoot: f.root });
  assert.equal(bundle.status, "valid");
  assert.equal((await inspect(f, "document-relative", "nope.md")).status, "invalid");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
test("a linked file with a BOM and a marker gives its details through the port", async () => {
  const f = fixture();
  f.memory.addFile("/ws/docs/target.md", "\uFEFF---\ntitle: Target\n---\n# Target\n@ref alpha\n");
  const result = (await inspectFrontmatterLinks({ target: "target.md" }, {
    type: "object",
    properties: {
      target: {
        type: "string",
        "x-okf-link": { resolution: "document-relative", syntax: "plain", basename_marker: "@ref" },
      },
    },
  }, { files: f.files, filePath: f.at("docs/doc.md"), workspaceRoots: [f.root] }))[0]!;
  assert.equal(result.status, "valid");
  assert.equal(result.resolvedPath, f.at("docs/target.md"));
});
