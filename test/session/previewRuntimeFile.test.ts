import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { shellKey } from "../../src/core/preview/contentPatch";
import {
  RUNTIME_CONTEXT_ATTRIBUTE,
  type PreviewRuntimeContext,
} from "../../src/core/protocol/bootContext";
import { pageRuntimeScript } from "../page/runtimeHarness";
import { attribute, findElements, parseHtml, type HtmlElement } from "../core/render/dom";
import { fakeAssetResolver } from "../shared/fakeAssets";


const extensionRoot = path.resolve(__dirname, "../../..");
const sourcePath = path.join(extensionRoot, "tests", "fixtures", "sphinx-features", "inline.md");
const assets = fakeAssetResolver({
  cspSource: "vscode-webview://csp",
  url: (filePath) => "file://vscode-webview://resource" + filePath,
  extensionRoot,
});

async function page(markdown: string, requestId: number, maxContentWidth?: number): Promise<{ html: string; context: PreviewRuntimeContext }> {
  const result = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: sourcePath }, languageId: "markdown", version: requestId, getText: () => markdown },
    workspaceRoot: extensionRoot,
    requestId,
    isWorkspaceTrusted: () => true,
  });
  const context: PreviewRuntimeContext = {
    documentId: result.stage.activeDocumentIdentity,
    revision: requestId,
    requestId,
    activeSourceFile: result.stage.activeDocumentPath,
    initialAnchor: 2,
  };
  const built = buildPreviewWebviewHtml(
    result.html,
    result.stage.outputDirectory,
    assets,
    context,
    extensionRoot,
    undefined,
    maxContentWidth,
  );
  result.stage.dispose();
  return { html: built.html, context };
}

function scripts(html: string): HtmlElement[] {
  return findElements(parseHtml(html), (element) => element.tagName === "script");
}

function text(element: HtmlElement): string {
  return element.childNodes.map((node) => ("value" in node ? String(node.value) : "")).join("");
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007
// @tests_req SwRS-MDOKFSTUDIO-TRUST-022
test("PERF-11: a rendered page loads the runtime as a bundle file and carries its context as inert JSON", async () => {
  const { html, context } = await page("# Title\n\nSome text.\n", 7);
  const all = scripts(html);
  const runtime = all.filter((element) => attribute(element, "data-sphinx-preview-scroll-sync") !== undefined);
  assert.equal(runtime.length, 1, "one runtime script");
  assert.match(attribute(runtime[0]!, "src") ?? "", /\/out\/bundle\/preview\.js$/u, "the runtime is the bundled file");
  assert.ok(attribute(runtime[0]!, "nonce"), "the runtime script carries the page nonce");
  assert.equal(text(runtime[0]!), "", "no inline runtime code");
  const executable = all.filter((element) => attribute(element, "type") !== "application/json");
  assert.deepEqual(executable.filter((element) => attribute(element, "src") === undefined).map(text), [],
    "no inline executable script in the page");
  const contextElements = all.filter((element) => attribute(element, RUNTIME_CONTEXT_ATTRIBUTE) !== undefined);
  assert.equal(contextElements.length, 1, "one context element");
  assert.equal(attribute(contextElements[0]!, "type"), "application/json");
  assert.deepEqual(JSON.parse(text(contextElements[0]!)), context, "the context element holds this render's context");
  assert.ok(html.indexOf(RUNTIME_CONTEXT_ATTRIBUTE) < html.indexOf("out/bundle/preview.js"),
    "the context comes before the script that reads it");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-002
// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("PERF-11: the static stylesheet is a bundle file; the page keeps only the per-render rule inline", async () => {
  const { html } = await page("Text.\n", 3, 720);
  const styles = findElements(parseHtml(html), (element) => element.tagName === "style");
  const accessibility = styles.filter((element) => attribute(element, "data-sphinx-preview-accessibility") !== undefined);
  assert.equal(accessibility.length, 1);
  assert.ok(attribute(accessibility[0]!, "nonce"));
  const css = text(accessibility[0]!);
  assert.match(css, /^@import url\("[^"]*\/out\/bundle\/preview\.css"\);/u);
  assert.ok(css.length < 2_000, `the inline style is the width rule only (${css.length} characters)`);
  assert.match(css, /720/u, "the content-width setting stays in the page");
  const policy = /Content-Security-Policy" content="([^"]+)"/u.exec(html)?.[1] ?? "";
  assert.match(policy, /script-src vscode-webview:\/\/csp 'nonce-[^']+'/u);
  assert.match(policy, /style-src vscode-webview:\/\/csp 'nonce-[^']+'/u);
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/u);
});

// The runtime is one bundle for every render (src/page/main.ts): the program holds no render's
// context and reads it from the page's context element. (Before the bundle, this compared the
// inline runtime with the context-free one; the inline runtime retired with the toString()
// assembly.)
test("PERF-11: the bundled runtime holds no render's context and reads it from the page", () => {
  const file = pageRuntimeScript();
  assert.doesNotMatch(file, /documentId":"file:/u, "the file runtime holds no render's context");
  assert.ok(file.includes(RUNTIME_CONTEXT_ATTRIBUTE), "the runtime reads the context element");
});

test("PERF-11: two renders share the page shell although their context elements differ", async () => {
  const first = await page("# One\n\nText.\n", 1);
  const second = await page("# Two\n\nOther text.\n", 2);
  assert.notEqual(first.html, second.html);
  assert.ok(shellKey(first.html));
  assert.equal(shellKey(second.html), shellKey(first.html));
});
