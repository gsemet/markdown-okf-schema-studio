import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { renderMyst } from "../../../src/core/render/mystRenderer";
import { rewriteSphinxHtml } from "../../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";
import { attribute, findElements, parseHtml, textContent, type HtmlElement } from "./dom";

const workspaceRoot = path.resolve(__dirname, "../../../../../..");

function anchors(html: string): HtmlElement[] {
  return findElements(parseHtml(html), (element) => element.tagName === "a");
}

function summary(html: string): string[] {
  return anchors(html).map((a) => `${textContent(a)} -> ${attribute(a, "href")}`);
}

test("bare http(s) and www URLs render as links with GFM trailing-punctuation rules", async () => {
  const source = [
    "Plain https://example.com/path?q=1#frag and http://example.org/a.",
    "",
    "Visit www.example.com now, or (see https://example.com).",
    "",
    "Wiki https://en.wikipedia.org/wiki/Foo_(bar) and (https://example.com/x_(y)) end!",
    "",
    "Emphasis *https://example.com/em* and **www.example.com/strong**.",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  assert.deepEqual(summary(html), [
    "https://example.com/path?q=1#frag -> https://example.com/path?q=1#frag",
    "http://example.org/a -> http://example.org/a",
    "www.example.com -> https://www.example.com",
    "https://example.com -> https://example.com",
    "https://en.wikipedia.org/wiki/Foo_(bar) -> https://en.wikipedia.org/wiki/Foo_(bar)",
    "https://example.com/x_(y) -> https://example.com/x_(y)",
    "https://example.com/em -> https://example.com/em",
    "www.example.com/strong -> https://www.example.com/strong",
  ]);
});

test("bare URLs in list items and table cells are links", async () => {
  const { html } = await renderMyst("- item https://example.com/list\n\n| a |\n|---|\n| www.example.com/cell |\n");
  assert.deepEqual(summary(html), [
    "https://example.com/list -> https://example.com/list",
    "www.example.com/cell -> https://www.example.com/cell",
  ]);
});

test("code, links, autolinks, math, emails and non-URLs stay as they are", async () => {
  const source = [
    "Code `https://example.com/code` here.",
    "",
    "```text",
    "https://example.com/fenced",
    "```",
    "",
    "[text https://example.com/label](https://example.com/target) and <https://example.com/auto>.",
    "",
    "Math $https://example.com/math$ and mail user@example.com and user@www.example.com.",
    "",
    "Glued xhttps://example.com/glued and path/https://example.com/slash and www.com and https://.",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  assert.deepEqual(summary(html), [
    "text https://example.com/label -> https://example.com/target",
    "https://example.com/auto -> https://example.com/auto",
  ]);
  assert.match(html, /<code>https:\/\/example\.com\/code<\/code>/u);
  assert.match(html, /https:\/\/example\.com\/fenced/u);
  assert.match(html, /user@example\.com/u);
});

test("javascript-looking and other non-http text is never linkified", async () => {
  const { html } = await renderMyst("javascript:alert(1) and data:text/html,x and ftp://example.com and vbscript:x\n");
  assert.deepEqual(anchors(html), []);
});

test("generated links pass through the same sanitizer and navigation routing as Markdown links", async () => {
  const { html } = await renderMyst("Go https://example.com/a and www.example.com\n\n[x](https://example.com/b)\n");
  const rewritten = rewriteSphinxHtml(html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  const links = anchors(rewritten.html);
  assert.equal(links.length, 3);
  const shape = (a: HtmlElement): string[] => a.attrs.map((attr) => attr.name).sort();
  assert.deepEqual(shape(links[0]), shape(links[2]));
  assert.equal(attribute(links[0], "data-sphinx-preview-navigation"), "https://example.com/a");
  assert.equal(attribute(links[1], "data-sphinx-preview-navigation"), "https://www.example.com");
});

test("the source text sent to the editor keeps the raw URL", async () => {
  const text = "A bare https://example.com/x and www.example.com.\n";
  const result = await renderPreviewDocument({
    document: {
      uri: { scheme: "file", fsPath: "/workspace/active.md" },
      languageId: "markdown",
      version: 1,
      getText: () => text,
    },
    workspaceRoot: "/workspace",
    requestId: 1,
    documentIdentity: "file:///active.md",
    isWorkspaceTrusted: () => true,
  });
  assert.equal(result.stage.sourceText, text);
  assert.match(result.html, /<a [^>]*>https:\/\/example\.com\/x<\/a>/u);
  assert.match(result.html, /<p [^>]*data-line="1"/u);
});

test("pathological URLs render in linear time", async () => {
  const closing = "https://a.b/" + ")".repeat(50_000);
  let started = Date.now();
  let { html } = await renderMyst(`See ${closing}\n`);
  assert.ok(Date.now() - started < 1000, `50k trailing parentheses took ${Date.now() - started} ms`);
  assert.deepEqual(summary(html), ["https://a.b/ -> https://a.b/"]);

  const long = "https://example.com/" + "a".repeat(100_000);
  started = Date.now();
  ({ html } = await renderMyst(`${long}\n`));
  assert.ok(Date.now() - started < 1000, `100k URL took ${Date.now() - started} ms`);
  assert.deepEqual(summary(html), [`${long} -> ${long}`]);

  const balanced = "https://a.b/" + "(".repeat(20_000) + ")".repeat(30_000);
  started = Date.now();
  ({ html } = await renderMyst(`${balanced}.\n`));
  assert.ok(Date.now() - started < 1000, `unbalanced mix took ${Date.now() - started} ms`);
  assert.deepEqual(summary(html), [`https://a.b/${"(".repeat(20_000)}${")".repeat(20_000)} -> https://a.b/${"(".repeat(20_000)}${")".repeat(20_000)}`]);
});

test("prose contexts are linkified while directive option text stays literal", async () => {
  const source = [
    "# Heading https://example.com/heading",
    "",
    ":::{note} Title https://example.com/title",
    "Body https://example.com/note-body",
    ":::",
    "",
    ":::{figure} img.png",
    ":alt: https://example.com/alt",
    ":class: https://example.com/class",
    "",
    "Caption https://example.com/caption",
    ":::",
    "",
    "Term",
    ": Definition https://example.com/definition",
    "",
    "Note[^1]",
    "",
    "[^1]: Footnote https://example.com/footnote",
    "",
    "- [ ] task https://example.com/task",
    "",
    "| Head https://example.com/th |",
    "|---|",
    "| x |",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  const targets = anchors(html).map((a) => textContent(a));
  for (const name of ["heading", "title", "note-body", "caption", "definition", "footnote", "task", "th"]) {
    assert.ok(targets.includes(`https://example.com/${name}`), `${name} not linkified: ${targets.join(", ")}`);
  }
  assert.ok(!targets.some((t) => t.endsWith("/alt") || t.endsWith("/class")));
});
