import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

import {
  inspectFrontmatterLinks,
  resolveFrontmatterLinkRoots,
  type FileLinkResolution,
} from "../../../src/core/frontmatter/fileLinks";

const files = createNodeFileSystem();

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

function makeRoot(): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-holes-")));
}

function write(root: string, ...segments: string[]): string {
  const target = path.join(root, ...segments);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "x");
  return target;
}

const schemaFor = (resolution: FileLinkResolution) => ({
  properties: { target: { "x-okf-link": { resolution, syntax: "plain" } } },
});

async function link(
  filePath: string,
  target: string,
  resolution: FileLinkResolution,
  options: Record<string, unknown> = {},
) {
  return (await inspectFrontmatterLinks({ target }, schemaFor(resolution), { files, filePath, ...options }))[0];
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S3
test("without a workspace folder the navigation root is the folder of the document, and with one it is that folder", async () => {
  const root = makeRoot();
  try {
    const filePath = write(root, "notes", "a.md");
    assert.deepEqual((await resolveFrontmatterLinkRoots({ files, filePath })).navigationRoots, [path.join(root, "notes")]);
    assert.deepEqual((await resolveFrontmatterLinkRoots({ files, filePath, workspaceRoots: [] })).navigationRoots, [path.join(root, "notes")]);
    assert.deepEqual((await resolveFrontmatterLinkRoots({ files, filePath, workspaceRoots: [root] })).navigationRoots, [root]);
    assert.deepEqual((await resolveFrontmatterLinkRoots({ files, filePath, workspaceRoots: [root] })).filenameRoots, [root]);
    assert.deepEqual((await resolveFrontmatterLinkRoots({ files, filePath })).filenameRoots, [], "the document folder is no filename-stem root");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S3
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S6
test("the project root is the Git root of the document, only when a navigation root holds it", async () => {
  const root = makeRoot();
  try {
    fs.mkdirSync(path.join(root, ".git"));
    const filePath = write(root, "docs", "a.md");
    assert.equal((await resolveFrontmatterLinkRoots({ files, filePath, workspaceRoots: [root] })).projectRoot, root);
    assert.equal((await resolveFrontmatterLinkRoots({ files, filePath, workspaceRoots: [path.join(root, "docs")] })).projectRoot, undefined,
      "the Git root lies outside the only navigation root");
    assert.equal((await resolveFrontmatterLinkRoots({ files, filePath, workspaceRoots: [path.join(root, "docs"), root] })).projectRoot, root,
      "one navigation root holding it is enough");
    assert.equal((await resolveFrontmatterLinkRoots({ files, filePath })).projectRoot, undefined, "the document folder does not hold its parent");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S3
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S6
test("an absolute target is refused by its shape and a target that only contains a colon is not", async () => {
  const root = makeRoot();
  try {
    const filePath = path.join(root, "a.md");
    const messageOf = async (target: string) => (await link(filePath, target, "document-relative", { workspaceRoots: [root] })).message;
    for (const target of ["C:/x.md", "C:\\x.md", "z:\\x.md", "\\\\server\\share\\x.md", "/etc/x.md"]) {
      assert.equal(await messageOf(target), `absolute target '${target}' is not allowed at 'target'`, target);
    }
    for (const target of ["a/b:/c.md", "1:/x.md", "x:y.md", "a\\\\b.md"]) {
      assert.doesNotMatch(await messageOf(target), /^absolute target/u, target);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S6
test("a document-relative target is resolved from the real folder of the document and contained by the navigation roots", async (context) => {
  const root = makeRoot();
  try {
    const nested = write(root, "real", "sub", "a.md");
    write(root, "real", "up.md");
    write(root, "sibling", "b.md");
    const alias = path.join(root, "alias");
    try {
      fs.symlinkSync(path.join(root, "real", "sub"), alias, "junction");
    } catch {
      context.diagnostic("links are not allowed here: the real-folder check is skipped");
    }
    if (fs.existsSync(alias)) {
      const viaAlias = await link(path.join(alias, "a.md"), "../up.md", "document-relative", { workspaceRoots: [root] });
      assert.equal(viaAlias.status, "valid", viaAlias.message);
      assert.equal(viaAlias.resolvedPath, path.join(root, "real", "up.md"));
    }
    const sibling = await link(nested, "../../sibling/b.md", "document-relative", { workspaceRoots: [root] });
    assert.equal(sibling.status, "valid", "a file of another folder of the workspace is contained by its root");
    assert.equal(sibling.resolvedPath, path.join(root, "sibling", "b.md"));
    const outside = await link(nested, "../../sibling/b.md", "document-relative", { workspaceRoots: [path.join(root, "real")] });
    assert.equal(outside.message, "target '../../sibling/b.md' escapes its navigation root at 'target'");
    const allowed = await link(nested, "../../sibling/b.md", "document-relative", {
      workspaceRoots: [path.join(root, "real")], allowOutsideWorkspaceLinks: true,
    });
    assert.equal(allowed.status, "valid");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S6
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067#S6
test("bundle-relative and project-relative targets start from their own root, and bundle-relative-stem adds .md", async () => {
  const root = makeRoot();
  try {
    const bundle = path.join(root, "bundle");
    const project = path.join(root, "project");
    const filePath = write(bundle, "deep", "dir", "a.md");
    write(bundle, "top.md");
    write(project, "top.md");
    write(project, "only-project.md");
    write(bundle, "only-bundle.md");
    const options = { workspaceRoots: [root], bundleRoot: bundle, projectRoot: project };
    const bundled = await link(filePath, "top.md", "bundle-relative", options);
    assert.equal(bundled.resolvedPath, path.join(bundle, "top.md"));
    assert.equal((await link(filePath, "top.md", "project-relative", options)).resolvedPath, path.join(project, "top.md"));
    assert.equal((await link(filePath, "only-bundle.md", "project-relative", options)).status, "invalid", "the bundle is not the project");
    assert.equal((await link(filePath, "only-project.md", "bundle-relative", options)).status, "invalid", "the project is not the bundle");
    const stem = await link(filePath, "top", "bundle-relative-stem", options);
    assert.equal(stem.resolvedPath, path.join(bundle, "top.md"));
    assert.equal(stem.normalizedTarget, "top.md");
    assert.equal((await link(filePath, "top.md", "bundle-relative", options)).normalizedTarget, "top.md", "only the stem form is extended");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046#S6
test("a missing root is reported by its kind, and a target leaving its root is refused before the disk is read", async () => {
  const root = makeRoot();
  try {
    const filePath = write(root, "a.md");
    write(root, "outside.md");
    const bundle = path.join(root, "bundle");
    fs.mkdirSync(bundle);
    assert.equal((await link(filePath, "x.md", "bundle-relative", { workspaceRoots: [root] })).message, "Skipped file-link check at 'target': bundle-relative root is unavailable");
    assert.equal((await link(filePath, "x.md", "bundle-relative-stem", { workspaceRoots: [root] })).message, "Skipped file-link check at 'target': bundle-relative-stem root is unavailable");
    assert.equal((await link(filePath, "x.md", "project-relative", { workspaceRoots: [root] })).message, "Skipped file-link check at 'target': project-relative root is unavailable");
    const options = { workspaceRoots: [root], bundleRoot: bundle, projectRoot: bundle };
    assert.equal((await link(filePath, "../nope.md", "bundle-relative", options)).message, "target '../nope.md' escapes its bundle-relative root at 'target'");
    assert.equal((await link(filePath, "../nope.md", "project-relative", options)).message, "target '../nope.md' escapes its project-relative root at 'target'");
    assert.equal((await link(filePath, "../outside.md", "bundle-relative", options)).message, "target '../outside.md' escapes its bundle-relative root at 'target'");
    assert.equal((await link(filePath, "../nope", "bundle-relative-stem", options)).message, "target '../nope' escapes its bundle-relative-stem root at 'target'");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
