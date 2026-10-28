/**
 * Requirement test of the page HTML builder for charts: the chart runtime script is added once with
 * the page nonce when the content holds a chart figure and in no other case, and the page policy is
 * the one without eval and without network.
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

const CHART = '<figure class="myst-vega-figure"><div class="myst-vega-diagram" data-myst-chart-kind="vega-lite">{}</div></figure>';
const MERMAID = '<figure class="myst-mermaid-figure"><div class="myst-mermaid-diagram">graph TD</div></figure>';

const build = (content: string) =>
  buildPreviewWebviewHtml(page(content), os.tmpdir(), assets, undefined, undefined, undefined, undefined, true, true, [], "builtin").html;

// @tests_req SwRS-MDOKFSTUDIO-DIAG-124
test("the chart runtime script is added once with the page nonce, only when the content holds a chart", () => {
  const html = build(CHART + CHART);
  const tags = html.match(/<script[^>]*data-sphinx-preview-vega[^>]*><\/script>/gu) ?? [];
  assert.equal(tags.length, 1);
  assert.match(tags[0]!, /src="vscode-webview:\/\/bundle\/vegaPreview\.js"/u);
  const nonce = /<script nonce="([^"]+)"/u.exec(tags[0]!)?.[1];
  assert.ok(nonce);
  assert.ok(html.includes(`nonce-${nonce}`), "the nonce is the page's own");

  assert.doesNotMatch(build("<p>no chart</p>"), /data-sphinx-preview-vega|vegaPreview/u);
  const mermaidOnly = build(MERMAID);
  assert.doesNotMatch(mermaidOnly, /vegaPreview/u, "a Mermaid page does not load the chart runtime");
  assert.match(mermaidOnly, /data-sphinx-preview-mermaid/u);
  const both = build(MERMAID + CHART);
  assert.match(both, /data-sphinx-preview-mermaid/u);
  assert.match(both, /data-sphinx-preview-vega/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-124
test("the page policy of a chart page has no eval and no network", () => {
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/u.exec(build(CHART))?.[1] ?? "";
  assert.ok(csp);
  assert.doesNotMatch(csp, /unsafe-eval|unsafe-inline|wasm-unsafe-eval/u);
  assert.match(csp, /connect-src 'none'/u);
  assert.match(csp, /script-src vscode-webview:\/\/csp 'nonce-/u);
});
