/**
 * Requirement tests of the page build (`buildPreviewWebviewHtml`, which sanitizes the rendered HTML
 * and adds the policy and the extension scripts) for rows no other test checked: embed, object and
 * form, a srcset with no safe candidate, wiki links, a bad anchor, xlink:href, the stylesheet
 * removals, a policy meta in the body and the nonce of the diagram scripts and the maths style.
 * Each test asserts the behaviour of the current code.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function folder(): string {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "trust-page-build-")));
  directories.push(directory);
  return directory;
}

function build(content: string, directory = folder()) {
  const assets = fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (filePath) => `webview:/${filePath}`, extensionRoot: directory });
  return buildPreviewWebviewHtml(
    `<html><head></head><body><main id="sphinx-myst-preview-content">${content}</main></body></html>`,
    directory, assets, undefined, undefined, undefined, undefined, true, [], "builtin",
  );
}

const codes = (diagnostics: ReadonlyArray<{ code: string }>, code: string): number =>
  diagnostics.filter((entry) => entry.code === code).length;

// @tests_req SwRS-MDOKFSTUDIO-TRUST-036
test("an embed, an object and a form are removed with their content and each records blocked-active-element", () => {
  const built = build(
    '<p>before</p><embed src="movie.swf"><object data="file.pdf"><p>inside-object</p></object>'
    + '<form action="/send"><input name="q"><p>inside-form</p></form><p>after</p>',
  );
  assert.doesNotMatch(built.html, /<embed|<object|<form|<input|inside-object|inside-form/iu);
  assert.match(built.html, /<p[^>]*>before<\/p>/u);
  assert.match(built.html, /<p[^>]*>after<\/p>/u);
  const removed = built.diagnostics.filter((entry) => entry.code === "blocked-active-element").map((entry) => entry.message);
  assert.deepEqual(removed, [
    "Removed <embed> from preview output.",
    "Removed <object> from preview output.",
    "Removed <form> from preview output.",
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-025
test("a srcset whose candidates are all refused is removed and records blocked-srcset", () => {
  const directory = folder();
  fs.writeFileSync(path.join(directory, "local.png"), "png");
  const built = build(
    '<img src="local.png" srcset="data:image/png;base64,AAAA 1x, javascript:alert(1) 2x" alt="refused">'
    + '<img src="local.png" srcset="local.png 1x, data:image/png;base64,AAAA 2x" alt="mixed">',
    directory,
  );
  const refused = /<img[^>]*alt="refused"[^>]*>/u.exec(built.html)?.[0] ?? "";
  assert.ok(refused, built.html);
  assert.doesNotMatch(refused, /srcset/u, "the attribute is removed");
  assert.match(refused, /src="webview:\//u, "the src of the image is still served");
  const mixed = /<img[^>]*alt="mixed"[^>]*>/u.exec(built.html)?.[0] ?? "";
  assert.match(mixed, /srcset="webview:\/[^" ]*local\.png 1x"/u, "only the local candidate stays");
  const srcset = built.diagnostics.filter((entry) => entry.code === "blocked-srcset");
  assert.equal(srcset.length, 1);
  assert.equal(srcset[0]?.message, "Removed a srcset with no safe local candidates.");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-042
test("a wiki link is routed by the host, a bad anchor and javascript: lose their href with blocked-navigation", () => {
  const built = build('<a href="wiki:Some Page">wiki</a><a href="# x">bad</a><a href="javascript:alert(1)">script</a>');
  assert.match(built.html, /<a href="#" data-sphinx-preview-navigation="wiki:Some Page">wiki<\/a>/u);
  const bad = /<a[^>]*>bad<\/a>/u.exec(built.html)?.[0] ?? "";
  assert.doesNotMatch(bad, /href=/u, "no href remains on the bad anchor");
  assert.match(bad, /data-sphinx-preview-navigation="# x"/u);
  const script = /<a[^>]*>script<\/a>/u.exec(built.html)?.[0] ?? "";
  assert.doesNotMatch(script, /href=/u);
  const blocked = built.diagnostics.filter((entry) => entry.code === "blocked-navigation");
  assert.deepEqual(blocked.map((entry) => entry.value), ["# x", "javascript:alert(1)"]);
  for (const entry of blocked) {
    assert.equal(entry.message, "Removed navigation outside the preview policy.");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-042
test("an SVG xlink:href is treated like an HTML link: blocked loses its address, allowed keeps it, both keep the request for the host", () => {
  const built = build(
    '<svg><a xlink:href="javascript:alert(2)"><text>blocked</text></a><a xlink:href="#section"><text>allowed</text></a></svg>',
  );
  const blocked = /<a[^>]*><text>blocked/u.exec(built.html)?.[0] ?? "";
  assert.ok(blocked, built.html);
  assert.doesNotMatch(blocked, /href=/u, "the blocked address is removed");
  const allowed = /<a[^>]*><text>allowed/u.exec(built.html)?.[0] ?? "";
  assert.match(allowed, /xlink:href="#section"/u, "the allowed address is kept");
  assert.equal(codes(built.diagnostics, "blocked-navigation"), 1);
  // The HTML parser names the attribute href (with the xlink prefix), so both links get the
  // navigation attribute like an HTML link, and the host routes the click.
  assert.match(blocked, /data-sphinx-preview-navigation="javascript:alert\(2\)"/u);
  assert.match(allowed, /data-sphinx-preview-navigation="#section"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-042
test("a linked stylesheet is removed: inside the roots it is ignored, outside it is refused, each with blocked-stylesheet", () => {
  const directory = folder();
  fs.writeFileSync(path.join(directory, "theme.css"), "p { color: red }");
  const built = build('<link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="../../../outside.css"><p>Text</p>', directory);
  assert.doesNotMatch(built.html, /<link|theme\.css|outside\.css/u);
  const stylesheets = built.diagnostics.filter((entry) => entry.code === "blocked-stylesheet");
  assert.deepEqual(stylesheets.map((entry) => [entry.message, entry.value]), [
    ["Removed a stylesheet outside staged output.", "../../../outside.css"],
    ["Ignored a linked stylesheet; the preview supplies its own theme.", path.join(directory, "theme.css")],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("a policy meta element in the body is kept as an inert element; only the policy of the head applies", () => {
  const built = build('<meta http-equiv="Content-Security-Policy" content="default-src *"><p>Text</p>');
  const head = /<head>([\s\S]*?)<\/head>/u.exec(built.html)?.[1] ?? "";
  assert.equal(head.match(/http-equiv="Content-Security-Policy"/gu)?.length, 1);
  assert.match(head, /content="default-src 'none';/u);
  const body = /<body>([\s\S]*)<\/body>/u.exec(built.html)?.[1] ?? "";
  assert.match(body, /<meta content="default-src \*">/u, "the element in the body is not removed");
  assert.doesNotMatch(body, /http-equiv/u, "it loses its http-equiv attribute, so it sets no policy");
  assert.equal(built.html.match(/http-equiv="Content-Security-Policy"/gu)?.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-022
test("the Mermaid and PlantUML scripts and the maths style carry the page nonce", async () => {
  const directory = folder();
  const documentPath = path.join(directory, "page.md");
  const markdown = "```mermaid\ngraph TD; A-->B\n```\n\n```plantuml\n@startuml\nA -> B\n@enduml\n```\n\n$$\n\\sqrt{x^2}\n$$\n";
  fs.writeFileSync(documentPath, markdown);
  const rendered = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => markdown },
    workspaceRoot: directory, requestId: 1, isWorkspaceTrusted: () => true, plantUmlEngine: "builtin",
  });
  const assets = fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (filePath) => `webview:/${filePath}`, extensionRoot: directory });
  const html = buildPreviewWebviewHtml(rendered.html, directory, assets, undefined, undefined, undefined, undefined, true, [], "builtin").html;
  const nonce = /'nonce-([^']+)'/u.exec(html)?.[1];
  assert.ok(nonce);
  const mermaid = /<script[^>]*data-sphinx-preview-mermaid[^>]*>/u.exec(html)?.[0] ?? "";
  const plantuml = /<script[^>]*data-sphinx-preview-plantuml[^>]*>/u.exec(html)?.[0] ?? "";
  assert.match(mermaid, new RegExp(`nonce="${nonce}"`, "u"), "the Mermaid script");
  assert.match(plantuml, new RegExp(`nonce="${nonce}"`, "u"), "the PlantUML script");
  assert.match(html, /class="[^"]*katex/u, "the maths block is rendered");
  const styles = html.match(/<style\b[^>]*>/gu) ?? [];
  assert.ok(styles.length > 0);
  for (const style of styles) {
    assert.match(style, new RegExp(`nonce="${nonce}"`, "u"), style);
  }
  for (const script of html.match(/<script\b[^>]*>/gu) ?? []) {
    if (/type="application\/json"/u.test(script)) continue;
    assert.match(script, new RegExp(`nonce="${nonce}"`, "u"), script);
  }
});
