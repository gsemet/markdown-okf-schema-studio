/**
 * Requirement test of the page HTML builder for the built-in PlantUML engine: the engine script is
 * added with the page nonce when the engine is the built-in one and the content holds a PlantUML
 * figure, and in no other case (`buildPreviewWebviewHtml`).
 */
import * as assert from "node:assert/strict";
import * as os from "node:os";
import { test } from "node:test";

import type { AssetResolver } from "../../src/host-api/assetResolver";
import { buildPreviewWebviewHtml } from "../../src/session/webview";

const assets: AssetResolver = {
  cspSource: "vscode-webview://csp",
  resourceUri: (resource) => `vscode-webview://res${resource}`,
  bundleUri: (...segments) => `vscode-webview://bundle/${segments.join("/")}`,
};

const page = (content: string): string =>
  `<html><head></head><body><main id="sphinx-myst-preview-content">${content}</main></body></html>`;

const FIGURE = '<figure class="myst-plantuml-figure"><div class="myst-plantuml-diagram">@startuml\nA -> B\n@enduml</div></figure>';

const build = (content: string, engine: "builtin" | "host"): string =>
  buildPreviewWebviewHtml(
    page(content), os.tmpdir(), assets, undefined, undefined, undefined, undefined, true, true, [], engine,
  ).html;

// @tests_req SwRS-MDOKFSTUDIO-DIAG-023
test("the built-in PlantUML script is added once with the page nonce, only for the built-in engine and a figure", () => {
  const html = build(FIGURE, "builtin");
  const tags = html.match(/<script[^>]*data-sphinx-preview-plantuml[^>]*><\/script>/gu) ?? [];
  assert.equal(tags.length, 1);
  assert.match(tags[0]!, /src="vscode-webview:\/\/bundle\/plantumlPreview\.js"/u);
  const nonce = /<script nonce="([^"]+)"/u.exec(tags[0]!)?.[1];
  assert.ok(nonce);
  assert.ok(html.includes(`'nonce-${nonce}'`) || html.includes(`nonce-${nonce}`), "the nonce is the page's own");

  assert.doesNotMatch(build("<p>no figure</p>", "builtin"), /data-sphinx-preview-plantuml/u);
  assert.doesNotMatch(build(FIGURE, "host"), /data-sphinx-preview-plantuml/u, "the JAR pipeline injects pictures instead");
});
