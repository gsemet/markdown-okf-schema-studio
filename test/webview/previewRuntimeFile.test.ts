import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderPreviewDocument } from "../../src/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/preview/webview";
import { shellKey } from "../../src/preview/contentPatch";
import {
  createPreviewRuntimeScript,
  createScrollSyncScript,
  RUNTIME_CONTEXT_ATTRIBUTE,
  serializeRuntimeContext,
  type PreviewRuntimeContext,
} from "../../src/webview/scrollSync";
import { attribute, findElements, parseHtml, type HtmlElement } from "../rendering/dom";
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

test("PERF-11: the bundled runtime is the inline runtime with its context read from the page", () => {
  const context: PreviewRuntimeContext = {
    documentId: "file:///workspace/a.md",
    revision: 4,
    requestId: 9,
    activeSourceFile: "/workspace/a.md",
    initialAnchor: 3,
  };
  const inline = createScrollSyncScript(context);
  const file = createPreviewRuntimeScript();
  assert.ok(inline.includes(serializeRuntimeContext(context)));
  assert.doesNotMatch(file, /documentId":"file:/u, "the file runtime holds no render's context");
  assert.equal(
    inline.replace(serializeRuntimeContext(context), `JSON.parse(document.querySelector("script[${RUNTIME_CONTEXT_ATTRIBUTE}]")?.textContent || "{}")`),
    file,
    "the same program apart from where the context comes from",
  );
});

test("PERF-11: two renders share the page shell although their context elements differ", async () => {
  const first = await page("# One\n\nText.\n", 1);
  const second = await page("# Two\n\nOther text.\n", 2);
  assert.notEqual(first.html, second.html);
  assert.ok(shellKey(first.html));
  assert.equal(shellKey(second.html), shellKey(first.html));
});
