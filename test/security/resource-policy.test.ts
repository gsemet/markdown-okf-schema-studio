import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import {
  ResourcePolicy,
  rewriteSrcset,
} from "../../src/core/security/resource-policy";
import { needsSymlinks } from "../shared/symlinks";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function makeRoots(): { output: string; outside: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-security-test-"));
  temporaryDirectories.push(directory);
  const output = path.join(directory, "output");
  const outside = path.join(directory, "outside");
  fs.mkdirSync(output);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(output, "image.png"), "image");
  fs.writeFileSync(path.join(outside, "secret.txt"), "secret");
  return { output, outside };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S2
test("a reference that is not a safe relative path is refused with the code of the failed check", async () => {
  const { output } = makeRoots();
  const policy = new ResourcePolicy(createNodeFileSystem(), [{ label: "output", directory: output }]);
  const table: Array<[string, readonly string[]]> = [
    ["blocked-resource-scheme", [
      "data:text/plain,secret", "javascript:alert(1)", "vscode://file/secret", "file:///tmp/secret",
      "/etc/hosts", "//host/share",
    ]],
    // A malformed escape, a backslash, a NUL character, and "%2e" nested one level deeper than the
    // four decodings reach.
    ["invalid-resource-path", ["%E0%A4%A", "sub\\image.png", "%00", "image%252525252epng"]],
  ];

  for (const [code, requests] of table) {
    for (const request of requests) {
      assert.deepEqual(await policy.resolveResourceDetailed(request, output), { refusal: code }, request);
      assert.ok(policy.diagnostics.some((entry) => entry.code === code && entry.value === request), request);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-013#S5
// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-025#S3
test("canonicalizes local resources and rejects hostile paths", needsSymlinks, async () => {
  const { output, outside } = makeRoots();
  fs.symlinkSync(path.join(outside, "secret.txt"), path.join(output, "escape.txt"));
  const policy = new ResourcePolicy(createNodeFileSystem(), [{ label: "output", directory: output }]);

  assert.equal(await policy.resolveResource("image.png", output), fs.realpathSync(path.join(output, "image.png")));
  assert.equal(await policy.resolveResource("image.png?v=1#preview", output), fs.realpathSync(path.join(output, "image.png")));
  assert.equal(await policy.resolveResource("../outside/secret.txt", output), undefined);
  assert.equal(await policy.resolveResource("%2e%2e%2foutside%2fsecret.txt", output), undefined);
  assert.equal(await policy.resolveResource("data:text/plain,secret", output), undefined);
  assert.equal(await policy.resolveResource("javascript:alert(1)", output), undefined);
  assert.equal(await policy.resolveResource("vscode://file/secret", output), undefined);
  assert.equal(await policy.resolveResource("file:///tmp/secret", output), undefined);
  assert.equal(await policy.resolveResource("escape.txt", output), undefined);
  assert.ok(policy.diagnostics.some((entry) => entry.code === "symlink-escape"));
});

test("allows only explicit navigation schemes", async () => {
  const { output } = makeRoots();
  const policy = new ResourcePolicy(createNodeFileSystem(), [{ label: "output", directory: output }]);

  assert.deepEqual(await policy.resolveNavigation("#section", output), { kind: "anchor", value: "#section" });
  assert.deepEqual(await policy.resolveNavigation("https://example.test/docs", output), {
    kind: "external",
    value: "https://example.test/docs",
  });
  assert.deepEqual(await policy.resolveNavigation("https://example.test/docs?v=1#section", output), {
    kind: "external",
    value: "https://example.test/docs?v=1#section",
  });
  assert.deepEqual(await policy.resolveNavigation("mailto:docs@example.test", output), {
    kind: "external",
    value: "mailto:docs@example.test",
  });
  assert.deepEqual(await policy.resolveNavigation("image.png?v=1#preview", output), {
    kind: "local",
    path: fs.realpathSync(path.join(output, "image.png")),
    suffix: "?v=1#preview",
  });
  assert.deepEqual(await policy.resolveNavigation("javascript:alert(1)", output), { kind: "blocked" });
  assert.deepEqual(await policy.resolveNavigation("vscode://file/secret", output), { kind: "blocked" });
  // A percent sign before the first colon hides the scheme from the opener: never external.
  assert.deepEqual(await policy.resolveNavigation("https%3A/../../System/Applications/Calculator.app", output), { kind: "blocked" });
  assert.deepEqual(await policy.resolveNavigation("mailto%3Aa@example.test", output), { kind: "blocked" });
});

test("rewrites srcset candidates without allowing data or script URLs", () => {
  const rewritten = rewriteSrcset(
    "image.png 1x, data:image/png;base64,AAAA 2x, javascript:alert(1) 3x",
    (request) => (request === "image.png" ? "webview://image.png" : undefined),
  );

  assert.equal(rewritten, "webview://image.png 1x");
});

test("resolves parent-relative figure references through an ancestor root", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-workspace-"));
  temporaryDirectories.push(directory);
  const documentDirectory = path.join(directory, "book", "chapters");
  const images = path.join(directory, "book", "external-img");
  fs.mkdirSync(documentDirectory, { recursive: true });
  fs.mkdirSync(images, { recursive: true });
  const figure = path.join(images, "figure.svg");
  fs.writeFileSync(figure, "<svg/>");

  const policy = new ResourcePolicy(createNodeFileSystem(), [
    { label: "document directory", directory: documentDirectory },
    { label: "workspace root", directory: directory },
  ]);

  assert.equal(
    await policy.resolveResource("../external-img/figure.svg", documentDirectory),
    fs.realpathSync(figure),
  );
  assert.equal(policy.diagnostics.length, 0);
});

test("still blocks references escaping the workspace root", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-workspace-"));
  temporaryDirectories.push(directory);
  const documentDirectory = path.join(directory, "book", "chapters");
  fs.mkdirSync(documentDirectory, { recursive: true });

  const policy = new ResourcePolicy(createNodeFileSystem(), [
    { label: "document directory", directory: documentDirectory },
    { label: "workspace root", directory: directory },
  ]);

  assert.equal(
    await policy.resolveResource("../../../etc/hostname", documentDirectory),
    undefined,
  );
  assert.ok(policy.diagnostics.some((diagnostic) => diagnostic.code === "resource-outside-root"));
});
