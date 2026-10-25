/**
 * Requirement tests of the trust and security scope that were not covered by a test yet: the
 * content security policy directives and the nonce, the status page, the resource policy refusals
 * (missing file, missing root, unreadable or large include), the includes of a preview, and the
 * rules of the sanitizer that keep or remove what the document holds.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import { createContentSecurityPolicy, createNonce } from "../../src/core/security/csp";
import { rewriteSphinxHtml } from "../../src/core/security/html-sanitizer";
import {
  MAX_INCLUDED_FILE_BYTES,
  readBoundedText,
  ResourcePolicy,
} from "../../src/core/security/resource-policy";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildErrorWebviewHtml, buildPreviewWebviewHtml, buildStatusWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function makeDirectory(): string {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "trust-req-")));
  temporaryDirectories.push(directory);
  return directory;
}

/** The value of one directive of a content security policy. */
function directive(policy: string, name: string): string | undefined {
  return policy.split("; ").find((entry) => entry.startsWith(`${name} `))?.slice(name.length + 1);
}

const CSP_SOURCE = "vscode-webview://csp";

// ---------------------------------------------------------------------------------------------
// The policy of a page

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("fonts and media load only from the webview source", () => {
  const policy = createContentSecurityPolicy(CSP_SOURCE, "abc");
  assert.equal(directive(policy, "font-src"), CSP_SOURCE);
  assert.equal(directive(policy, "media-src"), CSP_SOURCE);
});

test("the page may open no connection, frame, object or worker", () => {
  const policy = createContentSecurityPolicy(CSP_SOURCE, "abc");
  for (const name of ["connect-src", "frame-src", "object-src", "worker-src"]) {
    assert.equal(directive(policy, name), "'none'", name);
  }
});

test("the page may not change its base address or submit a form", () => {
  const policy = createContentSecurityPolicy(CSP_SOURCE, "abc");
  assert.equal(directive(policy, "base-uri"), "'none'");
  assert.equal(directive(policy, "form-action"), "'none'");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-022
test("each nonce is 18 random bytes as 24 base64url characters, fresh for every page", () => {
  const nonces = Array.from({ length: 20 }, () => createNonce());
  for (const nonce of nonces) {
    assert.match(nonce, /^[A-Za-z0-9_-]{24}$/u);
    assert.equal(Buffer.from(nonce, "base64url").length, 18);
  }
  assert.equal(new Set(nonces).size, nonces.length);
  const noncesOf = (html: string): string => /'nonce-([^']+)'/u.exec(html)![1]!;
  assert.notEqual(
    noncesOf(buildStatusWebviewHtml("pending", CSP_SOURCE)),
    noncesOf(buildStatusWebviewHtml("pending", CSP_SOURCE)),
  );
});

test("a status page carries the policy and its own nonce and no script", () => {
  const pending = buildStatusWebviewHtml("pending", CSP_SOURCE, "Rendering.");
  assert.match(pending, /<meta http-equiv="Content-Security-Policy" content="[^"]*default-src 'none'/u);
  const nonce = /script-src [^;]*'nonce-([^']+)'/u.exec(pending)![1]!;
  assert.match(pending, new RegExp(`<style nonce="${nonce}"`, "u"));
  assert.doesNotMatch(pending, /<script/iu);

  const error = buildErrorWebviewHtml("The render failed.", CSP_SOURCE);
  const errorNonce = /script-src [^;]*'nonce-([^']+)'/u.exec(error)![1]!;
  assert.match(error, /<meta http-equiv="Content-Security-Policy"/u);
  assert.doesNotMatch(error, /<script/iu);
  assert.notEqual(errorNonce, nonce);

  const missing = buildStatusWebviewHtml("missing-source", CSP_SOURCE);
  assert.match(missing, /<meta http-equiv="Content-Security-Policy"/u);
  assert.doesNotMatch(missing, /<script/iu);
});

// ---------------------------------------------------------------------------------------------
// The resource policy

// @tests_req SwRS-MDOKFSTUDIO-TRUST-025
test("a resource must be an existing regular file", () => {
  const root = makeDirectory();
  fs.writeFileSync(path.join(root, "image.png"), "image");
  fs.mkdirSync(path.join(root, "sub"));
  const policy = new ResourcePolicy([{ label: "output", directory: root }]);

  assert.deepEqual(policy.resolveResourceDetailed("image.png", root), { path: path.join(root, "image.png") });
  assert.deepEqual(policy.resolveResourceDetailed("ghost.png", root), {
    refusal: "missing-resource",
    candidate: path.join(root, "ghost.png"),
  });
  assert.deepEqual(policy.resolveResourceDetailed("sub", root), {
    refusal: "missing-resource",
    candidate: path.join(root, "sub"),
  });
  assert.equal(policy.resolveResource("ghost.png", root), undefined);
  assert.equal(policy.diagnostics.filter((entry) => entry.code === "missing-resource").length, 3);
});

test("a resource root that does not exist is dropped with the diagnostic missing-root", () => {
  const present = makeDirectory();
  fs.writeFileSync(path.join(present, "image.png"), "image");
  const absent = path.join(makeDirectory(), "not-on-disk");
  const policy = new ResourcePolicy([
    { label: "ghost", directory: absent },
    { label: "output", directory: present },
  ]);

  assert.deepEqual(policy.diagnostics, [
    { code: "missing-root", message: "The ghost resource root is unavailable.", value: absent },
  ]);
  // Nothing resolves through the dropped root.
  assert.deepEqual(policy.resolveResourceDetailed("x.png", absent), { refusal: "resource-outside-root" });
  // A file of the other root is found.
  assert.equal(policy.resolveResource("image.png", present), path.join(present, "image.png"));
});

// ---------------------------------------------------------------------------------------------
// Includes

// @tests_req SwRS-MDOKFSTUDIO-CORE-013
test("an include that cannot be read is left unresolved", async (t) => {
  const root = makeDirectory();
  const policy = new ResourcePolicy([{ label: "folder", directory: root }]);

  // A file of 5 MiB plus one byte is refused as too large, one of 5 MiB is read.
  const large = path.join(root, "large.md");
  fs.writeFileSync(large, "");
  fs.truncateSync(large, MAX_INCLUDED_FILE_BYTES + 1);
  assert.deepEqual(readBoundedText(policy, "large.md", root), { ok: false, refusal: "too-large" });
  fs.truncateSync(large, MAX_INCLUDED_FILE_BYTES);
  assert.equal(readBoundedText(policy, "large.md", root).ok, true);

  // A file the process cannot read is refused as unreadable (a superuser reads it anyway).
  const secret = path.join(root, "secret.md");
  fs.writeFileSync(secret, "Secret text.\n");
  fs.chmodSync(secret, 0o000);
  t.after(() => {
    try {
      fs.chmodSync(secret, 0o644);
    } catch {
      // The directory is already removed.
    }
  });
  const canRead = (() => {
    try {
      fs.readFileSync(secret);
      return true;
    } catch {
      return false;
    }
  })();
  if (canRead) {
    t.diagnostic("the process reads files without permission: the unreadable case is skipped");
    return;
  }
  assert.deepEqual(readBoundedText(policy, "secret.md", root), { ok: false, refusal: "unreadable" });

  // The render leaves the directive as a placeholder and shows nothing of the file.
  const documentPath = path.join(root, "doc.md");
  const markdown = "# Doc\n\n```{include} secret.md\n```\n";
  const result = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => markdown },
    workspaceRoot: root,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  assert.doesNotMatch(result.html, /Secret text/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007
test("a read-only preview reads includes from the folder of its document", async () => {
  const root = makeDirectory();
  const folder = path.join(root, "docs");
  fs.mkdirSync(path.join(folder, "sub"), { recursive: true });
  fs.writeFileSync(path.join(folder, "sub", "part.md"), "Part text below the folder.\n");
  fs.writeFileSync(path.join(root, "other.md"), "Other text outside the folder.\n");
  const documentPath = path.join(folder, "doc.md");
  const markdown = "# Doc\n\n```{include} sub/part.md\n```\n\n```{include} ../other.md\n```\n";

  // A read-only preview has the folder of its document as resource root.
  const result = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => markdown },
    workspaceRoot: folder,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  assert.match(result.html, /Part text below the folder\./u);
  assert.doesNotMatch(result.html, /Other text outside the folder\./u);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "resource-outside-root" && entry.value === "../other.md"),
    JSON.stringify(result.diagnostics),
  );
});

// ---------------------------------------------------------------------------------------------
// The sanitizer

function sanitize(html: string): string {
  const policy = new ResourcePolicy([]);
  return rewriteSphinxHtml(html, {
    outputRoot: "/workspace",
    policy,
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  }).html;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-036
test("the sanitizer removes style elements and records blocked-inline-style", () => {
  const result = rewriteSphinxHtml(
    "<html><head></head><body><style>p { color: red }</style><p>Text</p></body></html>",
    {
      outputRoot: "/workspace",
      policy: new ResourcePolicy([]),
      nonce: "unit-nonce",
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );
  assert.doesNotMatch(result.html, /<style|color: red/iu);
  assert.match(result.html, /<p[^>]*>Text<\/p>/u);
  assert.ok(result.diagnostics.some((entry) => entry.code === "blocked-inline-style"));
});

test("the sanitizer leaves elements and attributes it has no rule for (Known issue: deny-list)", () => {
  const html = sanitize(
    '<html><head><base href="https://example.test/"></head><body><p data-example="1">Text</p></body></html>',
  );
  assert.match(html, /<base[ >]/u);
  assert.match(html, /<p[^>]*data-example="1"[^>]*>Text<\/p>/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-042
test("an anchor or external link keeps its address and the original request", () => {
  const assets = fakeAssetResolver({ cspSource: CSP_SOURCE, url: (filePath) => `webview:/${filePath}` });
  const directoryPath = makeDirectory();
  const built = buildPreviewWebviewHtml(
    '<html><body><main id="sphinx-myst-preview-content">'
    + '<a href="#section">anchor</a>'
    + '<a href="https://example.test/docs">web</a>'
    + '<a href="mailto:docs@example.test">mail</a>'
    + "</main></body></html>",
    directoryPath,
    assets,
  );
  assert.match(built.html, /<a href="#section"[^>]*data-sphinx-preview-navigation="#section"/u);
  assert.match(
    built.html,
    /<a href="https:\/\/example\.test\/docs"[^>]*data-sphinx-preview-navigation="https:\/\/example\.test\/docs"/u,
  );
  assert.match(
    built.html,
    /<a href="mailto:docs@example\.test"[^>]*data-sphinx-preview-navigation="mailto:docs@example\.test"/u,
  );
});

test("each removal or rewrite is recorded with its code, message and value", () => {
  const assets = fakeAssetResolver({ cspSource: CSP_SOURCE, url: (filePath) => `webview:/${filePath}` });
  const directoryPath = makeDirectory();
  const built = buildPreviewWebviewHtml(
    '<html><body><main id="sphinx-myst-preview-content">'
    + '<iframe src="https://example.test/"></iframe>'
    + '<img src="../../outside.png" alt="x">'
    + "</main></body></html>",
    directoryPath,
    assets,
  );
  const iframe = built.diagnostics.find((entry) => entry.code === "blocked-active-element");
  assert.ok(iframe, JSON.stringify(built.diagnostics));
  assert.notEqual(iframe.message, "");
  const image = built.diagnostics.find((entry) => entry.code === "blocked-resource");
  assert.ok(image, JSON.stringify(built.diagnostics));
  assert.notEqual(image.message, "");
  assert.equal(image.value, "../../outside.png");
  assert.doesNotMatch(built.html, /<iframe/iu);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("the manifest declares limited support for untrusted workspaces", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(path.resolve(__dirname, "../../.."), "package.json"), "utf8"),
  ) as {
    main?: string;
    capabilities?: { untrustedWorkspaces?: { supported?: unknown; description?: string; restrictedConfigurations?: string[] } };
    contributes: { configuration: Array<{ properties: Record<string, unknown> }> };
  };
  // VS Code (extensionManifestPropertiesService) runs an extension with a main entry point in
  // Restricted Mode only when this declaration says true or "limited"; without it the extension
  // is disabled there.
  assert.ok(manifest.main, "the rule below applies to an extension with a main entry point");
  const untrusted = manifest.capabilities?.untrustedWorkspaces;
  assert.equal(untrusted?.supported, "limited");
  assert.match(untrusted?.description ?? "", /read-only/u);
  const settings = new Set(manifest.contributes.configuration.flatMap((category) => Object.keys(category.properties)));
  assert.ok((untrusted?.restrictedConfigurations ?? []).length > 0);
  for (const name of untrusted?.restrictedConfigurations ?? []) {
    assert.ok(settings.has(name), `${name} is a contributed setting`);
  }
  assert.deepEqual(
    untrusted?.restrictedConfigurations,
    ["markdownOkfSchemaStudio.plantuml.useJar", "markdownOkfSchemaStudio.plantuml.jarPath"],
  );
});
