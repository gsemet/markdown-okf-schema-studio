import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { listGlobDocuments } from "../../../src/core/render/documentGlob";
import { renderMyst, type MystRenderContext } from "../../../src/core/render/mystRenderer";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import {
  attribute,
  findElement,
  findElements,
  hasClass,
  parseHtml,
  textContent,
} from "./dom";

const root = "/virtual";

function context(files: Record<string, string>): MystRenderContext {
  return {
    sourcePath: `${root}/main.md`,
    resolveInclude: (request, from) => {
      const target = path.posix.resolve(path.posix.dirname(from), request);
      const source = files[target];
      return source === undefined ? undefined : { path: target, source };
    },
    listDocuments: (pattern, from) => {
      const base = path.posix.dirname(from);
      const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, "[^/]*")}$`, "u");
      return Object.keys(files)
        .map((file) => path.posix.relative(base, file))
        .filter((relative) => regex.test(relative) || regex.test(relative.replace(/\.md$/u, "")))
        .sort();
    },
  };
}

async function render(source: string, files: Record<string, string> = {}) {
  const result = await renderMyst(source, context(files));
  return { ...result, dom: parseHtml(result.html) };
}

const GRID = [
  "::::{grid} 1 1 2 3",
  ":gutter: 2",
  "",
  ":::{grid-item}",
  "First item.",
  ":::",
  "",
  ":::{grid-item-card} Card title",
  ":link: other.md",
  "",
  "Header text",
  "^^^",
  "Body text",
  "+++",
  "Footer text",
  ":::",
  "::::",
].join("\n");

test("a grid renders its items in a column container with one class per breakpoint", async () => {
  const { dom, diagnostics } = await render(GRID);
  const grid = findElement(dom, (element) => hasClass(element, "myst-grid"));
  assert.ok(grid, "no grid container");
  const row = findElement(grid, (element) => hasClass(element, "myst-grid-row"));
  assert.ok(row, "no grid row");
  for (const expected of ["myst-grid-xs-1", "myst-grid-sm-1", "myst-grid-md-2", "myst-grid-lg-3"]) {
    assert.ok(hasClass(row, expected), `row lacks ${expected}`);
  }
  assert.equal(findElements(row, (element) => hasClass(element, "myst-grid-item")).length, 2);
  assert.equal(diagnostics.length, 0);
});

test("the grid breakpoints inherit the last given column count", async () => {
  const { dom } = await render(":::{grid} 2\n\n:::{grid-item}\nA\n:::\n\n:::\n");
  const row = findElement(dom, (element) => hasClass(element, "myst-grid-row"));
  assert.ok(row);
  for (const expected of ["myst-grid-xs-2", "myst-grid-sm-2", "myst-grid-md-2", "myst-grid-lg-2"]) {
    assert.ok(hasClass(row, expected), `row lacks ${expected}`);
  }
});

test("a grid-item-card renders header, body, footer and a stretched link", async () => {
  const { dom } = await render(GRID);
  const card = findElement(dom, (element) => hasClass(element, "myst-grid-card"));
  assert.ok(card, "no card");
  const part = (name: string) => findElement(card, (element) => hasClass(element, name));
  assert.equal(textContent(part("myst-grid-card-header")!).trim(), "Header text");
  assert.equal(textContent(part("myst-grid-card-body")!).trim(), "Body text");
  assert.equal(textContent(part("myst-grid-card-footer")!).trim(), "Footer text");
  const link = findElement(card, (element) => element.tagName === "a");
  assert.ok(link, "no link");
  assert.equal(attribute(link, "href"), "other.md");
  assert.ok(hasClass(link, "myst-grid-card-link"));
});

test("a card title is the argument and a card without link or parts has only a body", async () => {
  const { dom } = await render(":::{grid} 1\n\n::::{grid-item-card} Just **title**\nOnly body.\n::::\n\n:::\n");
  const card = findElement(dom, (element) => hasClass(element, "myst-grid-card"));
  assert.ok(card);
  assert.match(textContent(findElement(card, (element) => hasClass(element, "myst-grid-card-title"))!), /Just title/u);
  assert.equal(findElement(card, (element) => hasClass(element, "myst-grid-card-header")), undefined);
  assert.equal(findElement(card, (element) => hasClass(element, "myst-grid-card-footer")), undefined);
  assert.equal(findElement(card, (element) => element.tagName === "a"), undefined);
  assert.match(textContent(card), /Only body\./u);
});

test("a grid also works with backtick fences, and grids nest inside items with colon fences", async () => {
  const source = [
    "```{grid} 1 2 2 2",
    "",
    "::::{grid-item}",
    ":::{grid} 2",
    "::::{grid-item}",
    "Inner.",
    "::::",
    ":::",
    "::::",
    "```",
  ].join("\n");
  const { dom } = await render(source);
  assert.equal(findElements(dom, (element) => hasClass(element, "myst-grid")).length, 2);
  assert.match(textContent(dom), /Inner\./u);
});

test("grid content keeps source lines for scroll sync", async () => {
  const { html } = await render(`Intro\n\n${GRID}\n`);
  assert.match(html, /class="myst-grid"[^>]*data-line="3"/u);
});

test("the grid stylesheet collapses to one column in a narrow pane", () => {
  assert.match(PREVIEW_THEME_CSS, /\.myst-grid\s*\{[^}]*container-type:\s*inline-size/u);
  assert.match(PREVIEW_THEME_CSS, /@container \(min-width: \d+px\)\s*\{[^@]*\.myst-grid-row\.myst-grid-md-2/u);
  assert.doesNotMatch(PREVIEW_THEME_CSS, /\.myst-grid[^{]*\{[^}]*style=/u);
});

const DOCS = {
  [`${root}/intro.md`]: "---\ntitle: x\n---\n\n# Introduction guide\n\nText.\n",
  [`${root}/sub/deep.md`]: "```\n# not a title\n```\n\n# Deep `code` title #\n",
  [`${root}/notitle.md`]: "Only text.\n",
  [`${root}/chap/a.md`]: "# Chapter A\n",
  [`${root}/chap/b.md`]: "# Chapter B\n",
};

test("a toctree lists links labelled by the target H1, the file name or an explicit title", async () => {
  const source = "```{toctree}\n:caption: Contents\n\nintro\nsub/deep\nnotitle\nCustom <intro.md>\n```\n";
  const { dom, html } = await render(source, DOCS);
  const nav = findElement(dom, (element) => hasClass(element, "myst-toctree"));
  assert.ok(nav, "no toctree");
  const caption = findElement(nav, (element) => hasClass(element, "myst-toctree-caption"));
  assert.equal(textContent(caption!).trim(), "Contents");
  assert.equal(attribute(caption!, "role"), "heading");
  const links = findElements(nav, (element) => element.tagName === "a");
  assert.deepEqual(links.map((link) => textContent(link).trim()), [
    "Introduction guide",
    "Deep code title",
    "notitle",
    "Custom",
  ]);
  assert.deepEqual(links.map((link) => attribute(link, "href")), [
    "intro.md",
    "sub/deep.md",
    "notitle.md",
    "intro.md",
  ]);
  assert.doesNotMatch(html, /not available outside a full build/u);
});

test("a hidden toctree shows no list", async () => {
  const { dom } = await render("```{toctree}\n:hidden:\n:caption: Secret\n\nintro\n```\n", DOCS);
  const nav = findElement(dom, (element) => hasClass(element, "myst-toctree"));
  assert.ok(nav);
  assert.ok(hasClass(nav, "myst-toctree-hidden"));
  assert.equal(findElement(nav, (element) => element.tagName === "a"), undefined);
  assert.doesNotMatch(textContent(nav), /Secret|Introduction/u);
});

test("a glob entry lists the matching documents sorted", async () => {
  const { dom } = await render("```{toctree}\n:glob:\n\nchap/*\n```\n", DOCS);
  const links = findElements(dom, (element) => element.tagName === "a" && attribute(element, "href")?.startsWith("chap/") === true);
  assert.deepEqual(links.map((link) => textContent(link).trim()), ["Chapter A", "Chapter B"]);
  assert.deepEqual(links.map((link) => attribute(link, "href")), ["chap/a.md", "chap/b.md"]);
});

test("a missing target is shown with the warning style and no link", async () => {
  const { dom } = await render("```{toctree}\n\nintro\nghost\n```\n", DOCS);
  const missing = findElements(dom, (element) => hasClass(element, "myst-toctree-missing"));
  assert.equal(missing.length, 1);
  assert.equal(textContent(missing[0]).trim(), "ghost");
  assert.equal(findElement(missing[0], (element) => element.tagName === "a"), undefined);
  assert.equal(findElements(dom, (element) => element.tagName === "a").length, 1);
});

test("a toctree without a resolver shows every entry as missing", async () => {
  const result = await renderMyst("```{toctree}\n\nintro\n```\n");
  assert.match(result.html, /myst-toctree-missing/u);
});

test("the toctree stylesheet styles links, the caption, the missing entries and the hidden list", () => {
  for (const selector of [".myst-toctree-caption", ".myst-toctree-missing", ".myst-toctree-hidden"]) {
    assert.ok(PREVIEW_THEME_CSS.includes(selector), `no rule for ${selector}`);
  }
});

test("paragraphs inside grid cards map to their own source lines, blank lines included", async () => {
  const source = [
    "Intro", "", "::::{grid} 1", ":gutter: 2", "", "", ":::{grid-item-card} Card", "", "", "Header",
    "^^^", "", "Body", "+++", "Footer", ":::", "::::",
  ].join("\n");
  const { html } = await render(source);
  const lineOf = (word: string): string | undefined =>
    new RegExp(`<p data-line="(\\d+)"[^>]*>${word}</p>`, "u").exec(html)?.[1];
  assert.equal(lineOf("Header"), "10");
  assert.equal(lineOf("Body"), "13");
  assert.equal(lineOf("Footer"), "15");
});

test("a card title that holds a link still renders one link", async () => {
  const { dom } = await render(":::{grid} 1\n\n::::{grid-item-card} See [docs](x.md)\n:link: y.md\nBody\n::::\n\n:::\n");
  assert.equal(findElements(dom, (element) => element.tagName === "a").length, 1);
});

test("listGlobDocuments returns the sorted matching Markdown documents below the folder", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "okf-glob-"));
  try {
    for (const file of ["chap/b.md", "chap/a.md", "chap/skip.txt", "chap/deep/c.md", "other.md", "node_modules/x/n.md"]) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), "# t\n");
    }
    const allow = (): boolean => true;
    assert.deepEqual(listGlobDocuments("chap/*", directory, allow), ["chap/a.md", "chap/b.md"]);
    assert.deepEqual(listGlobDocuments("chap/**", directory, allow), ["chap/a.md", "chap/b.md", "chap/deep/c.md"]);
    assert.deepEqual(listGlobDocuments("**", directory, allow), ["chap/a.md", "chap/b.md", "chap/deep/c.md", "other.md"]);
    assert.deepEqual(listGlobDocuments("chap/*", directory, allow, path.join(directory, "chap/a.md")), ["chap/b.md"]);
    assert.deepEqual(listGlobDocuments("../*", directory, allow), []);
    assert.deepEqual(listGlobDocuments("chap/*", directory, () => false), []);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
