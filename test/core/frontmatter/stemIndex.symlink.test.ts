import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { inspectFrontmatterLinks } from "../../../src/core/frontmatter/fileLinks";
import { MarkdownStemIndex } from "../../../src/core/frontmatter/stemIndex";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

const files = createNodeFileSystem();

function trySymlink(target: string, link: string, type: "dir" | "file" | "junction"): boolean {
  try {
    fs.symlinkSync(target, link, type);
    return true;
  } catch {
    return false;
  }
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055#S5
test("the walk through the Node port never descends a symbolic link to a directory", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-stem-symlink-"));
  try {
    fs.mkdirSync(path.join(root, "real"));
    fs.writeFileSync(path.join(root, "real", "inside.md"), "# i\n");
    fs.mkdirSync(path.join(root, "outside"));
    fs.writeFileSync(path.join(root, "outside", "elsewhere.md"), "# e\n");
    if (!trySymlink(path.join(root, "outside"), path.join(root, "real", "link"), process.platform === "win32" ? "junction" : "dir")) {
      context.skip("symbolic links are not available");
      return;
    }
    const index = await MarkdownStemIndex.build(files, [path.join(root, "real")]);
    assert.deepEqual(index.stems(), ["inside"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055#S3
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055#S4
test("a dangling .md symbolic link is a candidate that gives W15", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-stem-dangling-"));
  try {
    if (!trySymlink(path.join(root, "missing-target.md"), path.join(root, "dangling.md"), "file")) {
      context.skip("symbolic links are not available");
      return;
    }
    const result = (await inspectFrontmatterLinks({ target: "dangling" }, {
      type: "object",
      properties: { target: { type: "string", "x-okf-link": { resolution: "filename-stem", syntax: "plain" } } },
    }, { files, filePath: path.join(root, "doc.md"), workspaceRoots: [root] }))[0]!;
    assert.equal(result.code, "W15");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
