import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import realFs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { mock, test } from "node:test";

import katex from "katex";

import { BoundedCache } from "../../../src/core/render/boundedCache";
import { getHighlighter, highlightCodeBlocks } from "../../../src/core/render/highlight";
import { renderMathHtml } from "../../../src/core/render/mathRenderer";
import { expandToctrees, firstHeading, type GridNode } from "../../../src/core/render/mystGridToctree";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("a code block that did not change is highlighted once, a changed one again", () => {
  const spy = mock.method(getHighlighter(), "codeToTokensWithThemes");
  try {
    const block = (code: string): string => `<pre><code class="language-python">${code}</code></pre>`;
    const first = highlightCodeBlocks(block("cacheunique_alpha = 1\n"));
    const calls = spy.mock.callCount();
    assert.ok(calls >= 1);
    assert.equal(highlightCodeBlocks(block("cacheunique_alpha = 1\n")), first);
    assert.equal(spy.mock.callCount(), calls, "the second render of the same block runs no grammar");
    highlightCodeBlocks(block("cacheunique_alpha = 2\n"));
    assert.equal(spy.mock.callCount(), calls + 1, "an edited block is highlighted again");
  } finally {
    spy.mock.restore();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-024
test("a formula that did not change is typeset once, and a rejected one is remembered", () => {
  const spy = mock.method(katex, "renderToString");
  try {
    const page = '<span class="math-inline">cacheunique_x^2</span><span class="math-inline">\\cacheBadCommand{x}</span>';
    const first = renderMathHtml(page, "local.css", "n");
    const calls = spy.mock.callCount();
    assert.equal(calls, 2);
    assert.equal(renderMathHtml(page, "local.css", "n"), first);
    assert.equal(spy.mock.callCount(), calls, "the second render runs no KaTeX");
    assert.match(first, /data-studio-math-error/u);
  } finally {
    spy.mock.restore();
  }
});

test("the bounded cache evicts the least recently used entry and refuses an oversized one", () => {
  const cache = new BoundedCache<string>(2, 100);
  cache.set("a", "1");
  cache.set("b", "2");
  assert.equal(cache.get("a"), "1");
  cache.set("c", "3");
  assert.equal(cache.get("b"), undefined, "b was the least recently used");
  assert.equal(cache.get("a"), "1");
  cache.set("x".repeat(101), "too big");
  assert.equal(cache.size, 2);
  const byCost = new BoundedCache<string>(10, 10);
  byCost.set("aaaa", "");
  byCost.set("bbbb", "");
  byCost.set("cccc", "");
  assert.equal(byCost.get("aaaa"), undefined, "the total cost bound evicts the oldest");
  assert.equal(byCost.size, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-013
test("a resource referenced many times in one render is stat-ed once", (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "okf-policy-cache-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "img.png"), "x");
  const policy = new ResourcePolicy([{ label: "workspace", directory: root }]);
  const stat = mock.method(realFs, "statSync");
  const real = mock.method(realFs, "realpathSync");
  try {
    for (let index = 0; index < 5; index += 1) {
      assert.equal(policy.resolveResource("img.png", root), path.join(root, "img.png"));
      assert.equal(policy.resolveResource("missing.png", root), undefined);
    }
    assert.equal(stat.mock.callCount(), 2, "one stat per distinct path");
    assert.equal(real.mock.callCount(), 1, "one realpath for the one existing file");
    assert.equal(policy.diagnostics.filter((entry) => entry.code === "missing-resource").length, 5,
      "every refusal is still reported");
  } finally {
    stat.mock.restore();
    real.mock.restore();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-057
test("a toctree target listed twice in one render is read once", () => {
  const toctree = (value: string): GridNode => ({ type: "mystDirective", name: "toctree", value, children: [] });
  const tree: GridNode = { type: "root", children: [toctree("guide\nguide"), toctree("guide")] };
  const requests: string[] = [];
  expandToctrees(tree, {
    sourcePath: "/w/index.md",
    read: (request) => {
      requests.push(request);
      return request === "guide.md" ? { path: "/w/guide.md", source: "# Guide cacheunique\n" } : undefined;
    },
    dependencies: new Set(),
  });
  assert.equal(requests.filter((request) => request === "guide.md").length, 1);
  assert.equal(firstHeading("# Guide cacheunique\n"), "Guide cacheunique");
  assert.equal(firstHeading("no heading here\n"), undefined);
  assert.equal(firstHeading("no heading here\n"), undefined, "an absent heading is cached too");
});
