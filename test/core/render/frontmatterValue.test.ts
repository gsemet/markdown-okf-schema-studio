import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst, type MystRenderContext } from "../../../src/core/render/mystRenderer";
import { rewriteSphinxHtml } from "../../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";
import { attribute, findElements, hasClass, parseHtml, textContent } from "./dom";

/** A document with `front` as its front matter (one YAML line each) and `body` below it. */
async function render(front: string[], body: string) {
  const source = front.length > 0 ? `---\n${front.join("\n")}\n---\n\n${body}\n` : `${body}\n`;
  return renderMyst(source);
}

function values(html: string) {
  return findElements(parseHtml(html), (element) => hasClass(element, "okf-frontmatter-value"));
}

function missing(html: string) {
  return findElements(parseHtml(html), (element) => hasClass(element, "okf-frontmatter-missing"));
}

function paragraphText(html: string): string {
  const [paragraph] = findElements(parseHtml(html), (element) => element.tagName === "p");
  return paragraph ? textContent(paragraph) : "";
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("`= this.title` shows the string value of the front matter, without the code element", async () => {
  const { html, diagnostics } = await render(["title: Hello"], "Title: `= this.title`.");
  assert.equal(paragraphText(html), "Title: Hello.");
  assert.equal(values(html).length, 1);
  assert.equal(attribute(values(html)[0]!, "data-okf-this-field"), "title");
  assert.equal(findElements(parseHtml(html), (element) => element.tagName === "code").length, 0);
  assert.deepEqual(diagnostics, []);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("the form without the space after the equals sign shows the value too", async () => {
  const { html } = await render(["title: Hello"], "`=this.title`");
  assert.equal(paragraphText(html), "Hello");
  assert.equal(values(html).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("numbers and booleans show as text", async () => {
  const { html } = await render(["count: 42", "ratio: 1.5", "done: true", "open: false"],
    "`= this.count` `= this.ratio` `= this.done` `= this.open`");
  assert.equal(paragraphText(html), "42 1.5 true false");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("a list shows its items joined with commas", async () => {
  const { html } = await render(["tags: [alpha, beta, 3, true]"], "Tags: `= this.tags`");
  assert.equal(paragraphText(html), "Tags: alpha, beta, 3, true");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("an object shows as its YAML on one line", async () => {
  const { html } = await render(["owner:", "  name: Ada", "  team: core"], "`= this.owner`");
  assert.equal(paragraphText(html), "{ name: Ada, team: core }");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("a dotted path follows the nested objects", async () => {
  const { html, diagnostics } = await render(["owner:", "  name: Ada", "  team:", "    id: 7"],
    "`= this.owner.name` `= this.owner.team.id`");
  assert.equal(paragraphText(html), "Ada 7");
  assert.deepEqual(diagnostics, []);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("a missing key keeps the raw inline code with a warning style and reports a warning", async () => {
  const { html, diagnostics } = await render(["title: Hello"], "Owner: `= this.owner`");
  assert.equal(values(html).length, 0);
  const marked = missing(html);
  assert.equal(marked.length, 1);
  assert.equal(marked[0]!.tagName, "code");
  assert.equal(textContent(marked[0]!), "= this.owner");
  assert.match(attribute(marked[0]!, "title") ?? "", /owner/u);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]!.severity, "warning");
  assert.match(diagnostics[0]!.message, /owner/u);
  assert.equal(diagnostics[0]!.line, 5);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("a key without a value, a path through a scalar and an inherited name count as missing", async () => {
  const { html, diagnostics } = await render(["empty:", "title: Hello"],
    "`= this.empty` `= this.title.x` `= this.toString` `= this.__proto__` `= this.owner.name`");
  assert.equal(values(html).length, 0);
  assert.equal(missing(html).length, 5);
  assert.equal(diagnostics.length, 5);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("a document without front matter, or with an invalid one, shows the raw code with a warning", async () => {
  const none = await render([], "`= this.title`");
  assert.equal(missing(none.html).length, 1);
  assert.equal(none.diagnostics.length, 1);
  const broken = await render(["title: [unclosed"], "`= this.title`");
  assert.equal(missing(broken.html).length, 1);
  assert.equal(broken.diagnostics.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("a value is text: HTML and Markdown in it are never interpreted", async () => {
  const { html } = await render(
    ['title: "<script>alert(1)</script> **bold** [x](http://e.test) <b>b</b>"'],
    "`= this.title`");
  assert.doesNotMatch(html, /<script|<b>|<strong|<a /u);
  assert.equal(paragraphText(html), "<script>alert(1)</script> **bold** [x](http://e.test) <b>b</b>");
  assert.match(html, /&#x3C;script>alert/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("inline code that only looks close, and code blocks, stay as they are", async () => {
  const body = [
    "`= this.title x` `==this.title` `= that.title` `= this.` `this.title` `= this .title`",
    "`=  this.title` `= this.ti tle` `x = this.title` `= this.title()` `= THIS.title`",
    "",
    "```text",
    "= this.title",
    "```",
  ].join("\n");
  const { html, diagnostics } = await render(["title: Hello"], body);
  assert.equal(values(html).length, 0);
  assert.equal(missing(html).length, 0);
  assert.deepEqual(diagnostics, []);
  assert.equal(findElements(parseHtml(html), (element) => element.tagName === "code").length, 12);
  assert.doesNotMatch(html, /Hello/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("the value follows the front matter: the next render shows the new value", async () => {
  const body = "Title: `= this.title`";
  const before = await render(["title: First"], body);
  const after = await render(["title: Second"], body);
  assert.equal(paragraphText(before.html), "Title: First");
  assert.equal(paragraphText(after.html), "Title: Second");
  const removed = await render(["other: 1"], body);
  assert.equal(missing(removed.html).length, 1);
  assert.equal(removed.diagnostics.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("the value shows inside headings, lists, tables and links", async () => {
  const body = ["# About `= this.title`", "", "- item `= this.title`", "", "| a |", "|---|", "| `= this.title` |"].join("\n");
  const { html } = await render(["title: Hello"], body);
  assert.equal(values(html).length, 3);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("the value, the warning class and the hostile text survive the page sanitizer as text", async () => {
  const { html } = await render(['title: "<img src=x onerror=alert(1)>"'], "`= this.title` `= this.owner`");
  const { html: page } = rewriteSphinxHtml(html, {
    outputRoot: path.resolve(__dirname),
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  assert.equal(values(page).length, 1);
  assert.equal(missing(page).length, 1);
  assert.equal(findElements(parseHtml(page), (element) => element.tagName === "img").length, 0);
  assert.equal(textContent(values(page)[0]!), "<img src=x onerror=alert(1)>");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("an empty object counts as missing, like an empty list", async () => {
  const { html, diagnostics } = await render(["owner: {}", "tags: []"], "`= this.owner` `= this.tags`");
  assert.equal(values(html).length, 0);
  assert.equal(missing(html).length, 2);
  assert.equal(diagnostics.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("a table of contents entry reads the value, not the expression", async () => {
  const { html } = await render(["title: Hello"], "[TOC]\n\n# About `= this.title`");
  const links = findElements(parseHtml(html), (element) => element.tagName === "a")
    .map((element) => textContent(element).trim());
  assert.ok(links.includes("About Hello"), `entries: ${JSON.stringify(links)}`);
  assert.ok(!links.some((text) => text.includes("this.title")), "no entry shows the expression");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("the expression of an included file reads the front matter of the including document", async () => {
  const files: Record<string, string> = { "/virtual/part.md": "Owner: `= this.owner`\n" };
  const context: MystRenderContext = {
    sourcePath: "/virtual/main.md",
    resolveInclude: (request) => {
      const target = `/virtual/${request}`;
      return files[target] === undefined ? undefined : { path: target, source: files[target] };
    },
  };
  const source = "---\nowner: Ada\n---\n\n```{include} part.md\n```\n";
  const { html } = await renderMyst(source, context);
  assert.equal(values(html).length, 1);
  assert.equal(textContent(values(html)[0]!), "Ada");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("the heading anchor and the table of contents link are both built from the value", async () => {
  const { html } = await render(["title: Hello"], "[TOC]\n\n# About `= this.title`");
  const document = parseHtml(html);
  const [heading] = findElements(document, (element) => element.tagName === "h1");
  assert.equal(attribute(heading!, "id"), "about-hello");
  const hrefs = findElements(document, (element) => element.tagName === "a").map((element) => attribute(element, "href"));
  assert.ok(hrefs.includes("#about-hello"), `links: ${JSON.stringify(hrefs)}`);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-079
test("more backticks do not escape the form; a backtick kept inside the code does", async () => {
  const doubled = await render(["title: Hello"], "A ``= this.title`` B");
  assert.equal(values(doubled.html).length, 1, "a double-backtick span holds the same text as a single one");
  const kept = await render(["title: Hello"], "A `` `= this.title` `` B");
  assert.equal(values(kept.html).length + missing(kept.html).length, 0);
  assert.equal(kept.diagnostics.length, 0);
  const [code] = findElements(parseHtml(kept.html), (element) => element.tagName === "code");
  assert.equal(textContent(code!), "`= this.title`");
});
