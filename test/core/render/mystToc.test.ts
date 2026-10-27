import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent } from "./dom";

async function render(source: string): Promise<ReturnType<typeof parseHtml>> {
  return parseHtml((await renderMyst(source)).html);
}

const navs = (doc: ReturnType<typeof parseHtml>) => findElements(doc, (e) => e.tagName === "nav" && hasClass(e, "okf-toc"));
const links = (nav: Parameters<typeof findElements>[0]) =>
  findElements(nav, (e) => e.tagName === "a").map((a) => [attribute(a, "href"), textContent(a)]);

const SOURCE = "[TOC]\n\n# A\n\n## B\n\n## C\n\n### D\n\ntext\n";

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("[TOC] renders the headings as a nested list of links to their ids", async () => {
  const doc = await render(SOURCE);
  const [nav] = navs(doc);
  assert.ok(nav, "the table of contents nav");
  assert.deepEqual(links(nav), [["#a", "A"], ["#b", "B"], ["#c", "C"], ["#d", "D"]]);
  // Nested by level: A holds B and C, C holds D.
  const outer = findElement(nav, (e) => e.tagName === "ul")!;
  const topItems = findElements(outer, (e) => e.tagName === "li").filter((li) => li.parentNode === outer);
  assert.equal(topItems.length, 1);
  const second = findElements(topItems[0], (e) => e.tagName === "ul");
  assert.equal(second.length, 2, "a list under A and a list under C");
  for (const [id, text] of [["a", "A"], ["b", "B"], ["c", "C"], ["d", "D"]]) {
    const heading = findElement(doc, (e) => /^h[1-6]$/u.test(e.tagName) && attribute(e, "id") === id);
    assert.equal(heading && textContent(heading), text, `heading ${text} carries id ${id}`);
  }
  assert.equal(attribute(nav, "data-okf-tag"), "[TOC]");
  assert.equal(attribute(nav, "data-line"), "1");
  assert.equal(textContent(findElement(doc, (e) => e.tagName === "p")!), "text");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("the marker is replaced by the list and is not rendered as a wiki link", async () => {
  const { html } = await renderMyst(SOURCE);
  assert.doesNotMatch(html, /wiki:toc/u);
  assert.doesNotMatch(html, /<p[^>]*>\s*\[\[toc\]\]/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("[[_TOC_]] and any case of both markers render the same list, titled as written", async () => {
  const doc = await render("[[_TOC_]]\n\n[toc]\n\n[[_toc_]]\n\n# A\n\n## B\n");
  const found = navs(doc);
  assert.equal(found.length, 3);
  assert.deepEqual(found.map((nav) => attribute(nav, "data-okf-tag")), ["[[_TOC_]]", "[toc]", "[[_toc_]]"]);
  for (const nav of found) assert.deepEqual(links(nav), [["#a", "A"], ["#b", "B"]]);
  const { html } = await renderMyst("[[_TOC_]]\n\n# A\n");
  assert.doesNotMatch(html, /<em>|wiki:/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("{contents} renders the list, :depth: limits the levels, the title is the opening line", async () => {
  const doc = await render("```{contents}\n```\n\n```{contents} Outline\n:depth: 2\n```\n\n```{contents}\n:depth: 1\n```\n\n# A\n\n## B\n\n### C\n");
  const [all, two, one] = navs(doc);
  assert.deepEqual(links(all), [["#a", "A"], ["#b", "B"], ["#c", "C"]]);
  assert.deepEqual(links(two), [["#a", "A"], ["#b", "B"]]);
  assert.deepEqual(links(one), [["#a", "A"]]);
  assert.deepEqual([all, two, one].map((nav) => attribute(nav, "data-okf-tag")), ["{contents}", "{contents} Outline", "{contents}"]);
  assert.equal(attribute(all, "data-line"), "1");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("{contents} with :local: lists only the section it sits in", async () => {
  const doc = await render("# A\n\n## A1\n\n## A2\n\n```{contents}\n:local:\n```\n\n### A2a\n\n## A3\n\n# B\n");
  assert.deepEqual(links(navs(doc)[0]), [["#a2a", "A2a"]]);
  const top = await render("```{contents}\n:local:\n```\n\n# A\n\n## B\n");
  assert.deepEqual(links(navs(top)[0]), [["#a", "A"], ["#b", "B"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("a bracket marker takes no depth option and [[toc]] is not a marker", async () => {
  const doc = await render("[TOC depth=1]\n\n[[toc]]\n\n[[toc depth=2]]\n\n# A\n\n## B\n");
  assert.equal(navs(doc).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("repeated heading text gets distinct ids and a skipped level nests under the previous heading", async () => {
  const doc = await render("[TOC]\n\n# Top\n\n### Deep\n\n## Same\n\n## Same\n\n## Same\n");
  const [nav] = navs(doc);
  assert.deepEqual(links(nav), [
    ["#top", "Top"], ["#deep", "Deep"], ["#same", "Same"], ["#same-1", "Same"], ["#same-2", "Same"],
  ]);
  const ids = findElements(doc, (e) => /^h[1-6]$/u.test(e.tagName)).map((h) => attribute(h, "id"));
  assert.deepEqual(ids, ["top", "deep", "same", "same-1", "same-2"]);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("headings are collected as plain text and the list follows the headings of the source", async () => {
  const first = await render("[TOC]\n\n# One *em* `code`\n");
  assert.deepEqual(links(navs(first)[0]), [["#one-em-code", "One em code"]]);
  const second = await render("[TOC]\n\n# One *em* `code`\n\n## Added\n");
  assert.deepEqual(links(navs(second)[0]).map((l) => l[1]), ["One em code", "Added"]);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("a marker inside code, inline code or a longer paragraph is not a table of contents", async () => {
  const doc = await render("# A\n\n```\n[TOC]\n```\n\n`[TOC]`\n\nsee [TOC] here\n\n```\n[[_TOC_]]\n```\n");
  assert.equal(navs(doc).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("a document without headings renders an empty marker that read mode hides", async () => {
  const doc = await render("[TOC]\n\ntext only\n");
  const [nav] = navs(doc);
  assert.ok(nav && hasClass(nav, "okf-toc--empty"));
  assert.equal(findElements(nav, (e) => e.tagName === "a").length, 0);
  assert.match(PREVIEW_THEME_CSS, /nav\.okf-toc\.okf-toc--empty \{ display: none; \}/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-072
test("edit mode titles the block with the marker and hides the list, read mode paints no frame", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /html\[data-sphinx-preview-edit-mode="on"\] #sphinx-myst-preview-content nav\.okf-toc\[data-okf-tag\]::before \{\s*content: attr\(data-okf-tag\);/u);
  assert.match(css, /html\[data-sphinx-preview-edit-mode="on"\] #sphinx-myst-preview-content nav\.okf-toc > ul \{ display: none; \}/u);
  for (const rule of css.split("}").filter((part) => part.includes("nav.okf-toc[data-okf-tag]"))) {
    assert.match(rule, /data-sphinx-preview-edit-mode="on"/u);
  }
});
