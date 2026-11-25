/**
 * Requirement test of the page HTML builder for the built-in PlantUML engine: the engine script is
 * added with the page nonce when the engine is the built-in one and the content holds a PlantUML
 * figure, and in no other case (`buildPreviewWebviewHtml`).
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import type { AssetResolver } from "../../src/host-api/assetResolver";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";

const assets: AssetResolver = {
  cspSource: "vscode-webview://csp",
  resourceUri: (resource) => `vscode-webview://res${resource}`,
  bundleUri: (...segments) => `vscode-webview://bundle/${segments.join("/")}`,
};

const page = (content: string): string =>
  `<html><head></head><body><main id="sphinx-myst-preview-content">${content}</main></body></html>`;

const FIGURE = '<figure class="myst-plantuml-figure"><div class="myst-plantuml-diagram">@startuml\nA -> B\n@enduml</div></figure>';

const build = async (content: string, engine: "builtin" | "host"): Promise<string> =>
  (await buildPreviewWebviewHtml(createNodeFileSystem(),
    page(content), os.tmpdir(), assets, undefined, undefined, undefined, undefined, true, [], engine,
  )).html;

// @tests_req SwRS-MDOKFSTUDIO-DIAG-023#S3
test("the built-in PlantUML script is added once with the page nonce, only for the built-in engine and a figure", async () => {
  const html = await build(FIGURE, "builtin");
  const tags = html.match(/<script[^>]*data-sphinx-preview-plantuml[^>]*><\/script>/gu) ?? [];
  assert.equal(tags.length, 1);
  assert.match(tags[0]!, /src="vscode-webview:\/\/bundle\/plantumlPreview\.js"/u);
  const nonce = /<script nonce="([^"]+)"/u.exec(tags[0]!)?.[1];
  assert.ok(nonce);
  assert.ok(html.includes(`'nonce-${nonce}'`) || html.includes(`nonce-${nonce}`), "the nonce is the page's own");

  assert.doesNotMatch(await build("<p>no figure</p>", "builtin"), /data-sphinx-preview-plantuml/u);
  assert.doesNotMatch(await build(FIGURE, "host"), /data-sphinx-preview-plantuml/u, "the JAR pipeline injects pictures instead");
});

const REPO = path.resolve(__dirname, "../../..");

// @tests_req SwRS-MDOKFSTUDIO-DIAG-024#S5
test("the built-in engine is bundled into the extension's page script and the page loads nothing from outside for it", async () => {
  // The engine, its themes and its icons are bundled at build time into out/bundle/plantumlPreview.js.
  const entry = fs.readFileSync(path.join(REPO, "src/page/modules/plantumlPreview.ts"), "utf8");
  assert.match(entry, /^import \{ renderToString \} from "@plantuml\/core";$/mu);
  assert.match(entry, /^import "@plantuml\/core\/themes\.js";$/mu);
  assert.match(entry, /^import "@plantuml\/core\/openiconic\.js";$/mu);
  const imports = entry.match(/^import [^;]*;$/gmu) ?? [];
  assert.equal(imports.some((line) => /viz-global|https?:\/\//u.test(line)), false, "no Graphviz and no remote module");
  const config = fs.readFileSync(path.join(REPO, "esbuild.mjs"), "utf8");
  const step = /entryPoints: \["src\/page\/modules\/plantumlPreview\.ts"\],([^}]*)\}/u.exec(config)?.[1] ?? "";
  assert.match(step, /outfile: "out\/bundle\/plantumlPreview\.js"/u);
  assert.match(step, /bundle: true/u, "the package is inlined, not loaded at run time");
  assert.doesNotMatch(step, /external/u);

  // The page built for the built-in engine takes every script from the extension and allows no fetch.
  const html = await build(FIGURE, "builtin");
  const sources = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]*)"/gu)].map((match) => match[1]!);
  assert.ok(sources.includes("vscode-webview://bundle/plantumlPreview.js"));
  for (const source of sources) {
    assert.match(source, /^vscode-webview:\/\//u, `${source} comes from the extension`);
  }
  const policy = /http-equiv="Content-Security-Policy" content="([^"]*)"/u.exec(html)?.[1] ?? "";
  assert.match(policy, /connect-src 'none'/u, "the engine cannot fetch anything");
  assert.doesNotMatch(policy, /https?:/u);
});
