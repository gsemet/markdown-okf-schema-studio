import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { ResourcePolicy } from "../../src/core/security/resource-policy";
import { createPlatformMemoryFileSystem } from "../shared/memoryHostPaths";

// The symlink-escape guarantee through the FileSystem port, on a memory file system: a link inside
// a root that leads outside it is refused, whatever the host behind the port.

const root = path.resolve("/workspace/output");
const outside = path.resolve("/workspace/outside");

function fixture() {
  const files = createPlatformMemoryFileSystem();
  files.addFile(path.join(root, "image.png"), "image");
  files.addFile(path.join(outside, "secret.png"), "secret");
  files.addSymlink(path.join(root, "escape.png"), path.join(outside, "secret.png"));
  files.addSymlink(path.join(root, "outside-folder"), outside);
  files.addSymlink(path.join(root, "inside.png"), "image.png");
  return files;
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S5
// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S3
test("a link to a file outside the root is refused with symlink-escape, a link inside the root is served", async () => {
  const policy = new ResourcePolicy(fixture(), [{ label: "output", directory: root }]);
  assert.equal(await policy.resolveResource("escape.png", root), undefined);
  assert.ok(policy.diagnostics.some((entry) => entry.code === "symlink-escape"));
  assert.equal(await policy.resolveResource("inside.png", root), path.join(root, "image.png"));
  assert.equal(await policy.resolveResource("image.png", root), path.join(root, "image.png"));
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S3
test("a file below a linked folder that leads outside the root is refused", async () => {
  const policy = new ResourcePolicy(fixture(), [{ label: "output", directory: root }]);
  assert.equal(await policy.resolveResource("outside-folder/secret.png", root), undefined);
  assert.ok(policy.diagnostics.some((entry) => entry.code === "symlink-escape"));
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S4
// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S5
test("the sync path decides from the primed answers only, and a request never primed is refused and listed", async () => {
  const policy = new ResourcePolicy(fixture(), [{ label: "output", directory: root }]);
  const primed = { request: "image.png", baseDirectory: root, options: { image: true } };
  const escape = { request: "escape.png", baseDirectory: root, options: { image: true } };
  const never = { request: "inside.png", baseDirectory: root, options: { image: true } };
  await policy.prime([primed, escape]);
  assert.equal(policy.resolvePrimed("image.png", root, { image: true }), path.join(root, "image.png"));
  assert.equal(policy.resolvePrimed("escape.png", root, { image: true }), undefined);
  assert.equal(policy.resolvePrimed("inside.png", root, { image: true }), undefined, "an unprimed file is not read");
  assert.deepEqual(policy.takeUnprimed().map((entry) => entry.request), ["inside.png"]);
  await policy.prime([never]);
  assert.equal(policy.resolvePrimed("inside.png", root, { image: true }), path.join(root, "image.png"));
  assert.deepEqual(policy.takeUnprimed(), []);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S5
test("a policy never primed lists the request instead of refusing it as outside every root", () => {
  const policy = new ResourcePolicy(fixture(), [{ label: "output", directory: root }]);
  assert.equal(policy.resolvePrimed("image.png", root, { image: true }), undefined);
  assert.deepEqual(policy.takeUnprimed().map((entry) => entry.request), ["image.png"]);
});
