import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { createPlatformMemoryFileSystem } from "../shared/memoryHostPaths";

// The sanitizer is synchronous: the file facts it needs are gathered before it runs (a guess read
// off the HTML), and a request the guess missed is gathered and the page sanitized again.

const workspace = path.resolve("/workspace/docs");
const outside = path.resolve("/workspace/outside");
const assets = fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (file) => `webview://${file}` });

function fixture() {
  const files = createPlatformMemoryFileSystem();
  files.addFile(path.join(workspace, "ok.png"), "image");
  files.addFile(path.join(outside, "secret.png"), "secret");
  files.addSymlink(path.join(workspace, "escape.png"), path.join(outside, "secret.png"));
  return files;
}

const build = (files: ReturnType<typeof fixture>, body: string) =>
  buildPreviewWebviewHtml(files, `<p>${body}</p>`, workspace, assets, undefined, workspace);

// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S4
// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S5
test("a local image found by the guess is shown, and a link out of the folder is refused", async () => {
  const built = await build(fixture(), '<img src="ok.png"><img src="escape.png">');
  assert.ok(built.html.includes(`src="webview://${path.join(workspace, "ok.png")}"`), built.html);
  assert.ok(!built.html.includes("secret"), "the target of the link is not served");
  assert.ok(built.diagnostics.some((entry) => entry.code === "symlink-escape"));
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S4
// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S5
// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S6
// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S7
test("an image the guess misses (an unquoted attribute) is found by the sanitizer and shown after a second pass", async () => {
  const built = await build(fixture(), "<img src=ok.png>");
  assert.ok(built.html.includes(`src="webview://${path.join(workspace, "ok.png")}"`), built.html);
  assert.equal(built.diagnostics.filter((entry) => entry.code === "missing-resource").length, 0,
    "the refusal of the first pass is not reported");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S3
test("an image the guess misses that leaves the folder through a link is still refused, once", async () => {
  const built = await build(fixture(), "<img src=escape.png>");
  assert.ok(!built.html.includes(`webview://${path.join(outside, "secret.png")}`));
  assert.equal(built.diagnostics.filter((entry) => entry.code === "symlink-escape").length, 1);
});
