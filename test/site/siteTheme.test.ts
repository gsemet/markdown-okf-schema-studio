import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { PAGE_CHROME_CSS } from "../../src/core/preview/styles/pageChromeStyles";
import { pageDocument } from "./buildSite";
import { levelCardBody } from "./requirementsViewer/cards";
import { viewerDocument } from "./requirementsViewer/shell";
import { cardDocument, simpleCard } from "./socialCard";
import { SITE_CSS, SITE_ROOT_CSS, SITE_TOKENS, SITE_TOKEN_SOURCES } from "./siteTheme";

const FOOTER = { sha: "abc", generatedAt: "" };
const VIEWER_PAGE = { dir: "requirements/area/StRS-X-001", level: "use-case", title: "T", description: "d", body: "<p>x</p>", crumbs: [{ text: "Areas", dir: "requirements" }, { text: "Here" }] } as const;
const FORMER_VALUES = ["#0e6974", "#084b55", "#16242c", "#f7faf9", "#f6f1e7", "#2b2620", "#e5ddce"];

function creamBlock(): Map<string, string> {
  const start = PAGE_CHROME_CSS.indexOf('html[data-sphinx-preview-theme-mode="cream"],');
  assert.ok(start >= 0, "the extension has a cream block");
  const block = PAGE_CHROME_CSS.slice(start, PAGE_CHROME_CSS.indexOf("}", start));
  return new Map([...block.matchAll(/(--[\w-]+):\s*([^;]+);/gu)].map((match) => [match[1], match[2].trim()]));
}

function siteLinks(html: string): string[] {
  const nav = /<nav class="site" aria-label="Site">(.*?)<\/nav>/su.exec(html)?.[1] ?? "";
  return [...nav.matchAll(/<a href="[^"]*">([^<]*)<\/a>/gu)].map((match) => match[1]);
}

test("every site token equals its variable in the cream block of the extension", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
  const cream = creamBlock();
  assert.deepEqual(Object.keys(SITE_TOKEN_SOURCES).sort(), Object.keys(SITE_TOKENS).sort());
  for (const [token, source] of Object.entries(SITE_TOKEN_SOURCES)) {
    assert.equal(SITE_TOKENS[token], cream.get(source), `${token} follows ${source}`);
    assert.ok(SITE_ROOT_CSS.includes(`${token}:${SITE_TOKENS[token]}`), token);
  }
  assert.ok(SITE_ROOT_CSS.includes("color-scheme:light"));
});

test("no page or stylesheet has a dark mode, a theme switch or a former palette", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
  const documents = [pageDocument("Studio", "index.html", "<h1>x</h1>"), viewerDocument(VIEWER_PAGE, FOOTER), SITE_CSS];
  for (const html of documents) {
    for (const forbidden of ["prefers-color-scheme: dark", "prefers-color-scheme:dark", "data-theme", "req-theme", 'id="theme"', ...FORMER_VALUES]) {
      assert.ok(!html.includes(forbidden), forbidden);
    }
  }
});

test("a main page and a viewer page carry the same brand and the five links, only the viewer has a breadcrumb", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
  const expected = ["Home", "Contributing", "How we ship", "Gallery", "Requirements"];
  const main = pageDocument("Studio", "index.html", "<h1>x</h1>");
  const viewer = viewerDocument(VIEWER_PAGE, FOOTER);
  assert.deepEqual(siteLinks(main), expected);
  assert.deepEqual(siteLinks(viewer), expected);
  assert.ok(main.includes('src="images/logo.svg" alt="" width="44" height="44"><strong>Markdown OKF-Schema Studio</strong>'));
  assert.ok(viewer.includes('src="../../../images/logo.svg" alt="" width="44" height="44"><strong>Markdown OKF-Schema Studio</strong>'));
  assert.ok(!main.includes('class="crumbs"'));
  assert.ok(viewer.includes('<nav class="crumbs" aria-label="Breadcrumb">'));
  assert.ok(!viewer.includes('class="home"'));
});

test("the main page stylesheet uses the site tokens and the viewer's typography", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
  const html = pageDocument("Studio", "index.html", "<h1>x</h1>");
  assert.ok(html.includes("--bg:#f5f1e8") && html.includes("--ink:#2b2a27") && html.includes("--link:#a14e32"));
  assert.ok(html.includes("main h1, main h2, main h3 { font-family: var(--serif);"));
  for (const former of ["--accent", "--warm", "#eef3f2", "#e8efed", "#fff9ef", "#10191d", "#16242ccc"]) assert.ok(!html.includes(former), former);
});

test("the social card documents are cream", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
  for (const html of [cardDocument(simpleCard("Eyebrow", "Headline", "Line")), cardDocument(levelCardBody("use-case"))]) {
    assert.ok(html.includes("#f5f1e8"));
    for (const former of [...FORMER_VALUES, "--accent", "rgba(14, 105, 116"]) assert.ok(!html.includes(former), former);
  }
});

test("the stylesheet keeps wide content and the breadcrumb inside the page", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
  assert.ok(/pre\{max-width:100%;overflow-x:auto;/u.test(SITE_CSS));
  assert.ok(SITE_CSS.includes("code{overflow-wrap:anywhere;") && SITE_CSS.includes("pre code{overflow-wrap:normal;"));
  assert.ok(SITE_CSS.includes("table{display:block;max-width:100%;overflow-x:auto}"));
  const viewer = readFileSync(join(__dirname, "../../../test/site/requirementsViewer/viewer.css"), "utf8");
  assert.ok(viewer.includes(".crumbs{order:5;flex:1 1 100%;min-width:0;display:flex;flex-wrap:wrap;"));
  assert.ok(!/\.crumbs\{[^}]*(overflow-x|nowrap)/u.test(viewer));
});
