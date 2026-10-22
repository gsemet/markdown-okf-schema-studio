import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst } from "../../src/render/mystRenderer";
import { rewriteSphinxHtml } from "../../src/security/html-sanitizer";
import { ResourcePolicy } from "../../src/security/resource-policy";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent } from "./dom";

const workspaceRoot = path.resolve(__dirname, "../../../../..");

async function render(source: string): Promise<{ html: string; doc: ReturnType<typeof parseHtml> }> {
  const { html } = await renderMyst(source);
  return { html, doc: parseHtml(html) };
}

const chips = (doc: ReturnType<typeof parseHtml>) => findElements(doc, (e) => hasClass(e, "okf-chip"));

test("a block comment renders as a positioned gray chip with a hidden body", async () => {
  const { doc } = await render("Before\n\n<!-- remember this -->\n\nAfter\n");
  const block = findElement(doc, (e) => hasClass(e, "okf-comment"));
  assert.ok(block, "block comment wrapper");
  assert.equal(block.tagName, "div");
  assert.equal(attribute(block, "data-line"), "3");
  assert.equal(attribute(block, "data-end-line"), "3");
  assert.equal(attribute(block, "data-okf-comment-kind"), "comment");
  const chip = chips(doc)[0];
  assert.equal(attribute(chip, "role"), "button");
  assert.equal(attribute(chip, "tabindex"), "0");
  assert.equal(attribute(chip, "title"), "remember this");
  assert.equal(hasClass(chip, "okf-chip--todo"), false);
  assert.equal(textContent(chip), "comment");
  const body = findElement(doc, (e) => hasClass(e, "okf-comment-body"));
  assert.ok(body && attribute(body, "hidden") !== undefined);
  assert.equal(textContent(body), "remember this");
});

test("a multi-line block comment spans its source lines", async () => {
  const { doc } = await render("<!--\nline one\nline two\n-->\n\ntext\n");
  const block = findElement(doc, (e) => hasClass(e, "okf-comment"));
  assert.ok(block);
  assert.equal(attribute(block, "data-line"), "1");
  assert.equal(attribute(block, "data-end-line"), "4");
  assert.equal(attribute(chips(doc)[0], "title"), "line one\nline two");
});

test("an inline comment renders as a chip inside its paragraph", async () => {
  const { doc } = await render("a <!-- inline note --> b\n");
  const paragraph = findElement(doc, (e) => e.tagName === "p");
  assert.ok(paragraph);
  const wrapper = findElement(paragraph, (e) => hasClass(e, "okf-comment"));
  assert.ok(wrapper);
  assert.equal(wrapper.tagName, "span");
  assert.equal(attribute(wrapper, "data-line"), undefined);
  assert.equal(attribute(chips(doc)[0], "title"), "inline note");
  const body = findElement(paragraph, (e) => hasClass(e, "okf-comment-body"));
  assert.equal(body?.tagName, "span");
  assert.equal(textContent(body!), "inline note");
});

test("a TODO comment is a green expandable chip", async () => {
  const { doc } = await render("<!-- TODO: finish the chapter -->\n");
  const block = findElement(doc, (e) => hasClass(e, "okf-comment"));
  assert.equal(attribute(block!, "data-okf-comment-kind"), "todo");
  const chip = chips(doc)[0];
  assert.ok(hasClass(chip, "okf-chip--todo"));
  assert.equal(textContent(chip), "TODO");
  assert.equal(attribute(chip, "title"), "TODO: finish the chapter");
});

test("the word TODO in prose becomes a green chip and the rest of the sentence is unchanged", async () => {
  const { doc } = await render("We still TODO this part, TODOs and todo stay plain.\n");
  const found = chips(doc);
  assert.equal(found.length, 1);
  assert.ok(hasClass(found[0], "okf-chip--todo"));
  const paragraph = findElement(doc, (e) => e.tagName === "p")!;
  assert.equal(textContent(paragraph), "We still TODO this part, TODOs and todo stay plain.");
});

test("TODO in code, inline code, link text and URLs is left alone", async () => {
  const { doc, html } = await render([
    "`TODO` and [TODO list](https://example.com/TODO) and https://example.com/TODO/x",
    "",
    "```",
    "TODO fenced",
    "```",
    "",
    "$TODO$",
    "",
  ].join("\n"));
  assert.equal(chips(doc).length, 0, html);
});

test("tool comments stay hidden", async () => {
  const { doc, html } = await render([
    "<!-- markdownlint-disable MD013 -->",
    "",
    "<!-- prettier-ignore -->",
    "",
    "<!-- toc -->",
    "",
    "<!-- cspell:disable -->",
    "",
    "<!-- vale off -->",
    "",
    "text",
    "",
  ].join("\n"));
  assert.equal(chips(doc).length, 0, html);
  assert.equal(findElements(doc, (e) => hasClass(e, "okf-comment")).length, 0);
});

test("context tags still produce their admonition, with and without a comment inside", async () => {
  const plain = await render("<context>\n\ninner TODO text\n\n</context>\n");
  const admonition = findElement(plain.doc, (e) => hasClass(e, "myst-context-admonition"));
  assert.ok(admonition, plain.html);
  assert.match(textContent(admonition), /inner/u);
  assert.equal(chips(plain.doc).length, 1);
  const withComment = await render("<context>\n<!-- c -->\n</context>\n");
  const inner = findElement(withComment.doc, (e) => hasClass(e, "myst-context-admonition"));
  assert.ok(inner, withComment.html);
  assert.ok(findElement(inner, (e) => hasClass(e, "okf-comment")), withComment.html);
});

test("a comment in a heading does not change the heading's id or attributes", async () => {
  const plain = await render("## Plan\n");
  const commented = await render("## Plan <!-- TODO fix later -->\n");
  const attributes = (doc: ReturnType<typeof parseHtml>) => {
    const h2 = findElement(doc, (e) => e.tagName === "h2")!;
    return h2.attrs.map((a) => `${a.name}=${a.value}`).sort();
  };
  assert.deepEqual(attributes(commented.doc), attributes(plain.doc));
  assert.equal(attribute(findElement(commented.doc, (e) => e.tagName === "h2")!, "id"), undefined);
});

test("data-line follows the frontmatter offset", async () => {
  const { doc } = await render("---\ntitle: x\n---\n\n<!-- note -->\n");
  const block = findElement(doc, (e) => hasClass(e, "okf-comment"));
  assert.equal(attribute(block!, "data-line"), "5");
});

test("a comment followed by markup is never rendered as HTML", async () => {
  const { html, doc } = await render("<!-- x --><script>alert(1)</script>\n");
  assert.equal(findElements(doc, (e) => e.tagName === "script").length, 0);
  assert.doesNotMatch(html, /<script/u);
});

test("comment text never reaches the DOM as HTML", async () => {
  const { html, doc } = await render("<!-- <img src=x onerror=alert(1)> & <b>bold</b> -->\n");
  assert.equal(findElements(doc, (e) => e.tagName === "img" || e.tagName === "b").length, 0, html);
  assert.equal(
    attribute(chips(doc)[0], "title"),
    "<img src=x onerror=alert(1)> & <b>bold</b>",
  );
});

test("chip markup survives the sanitizer without event attributes", async () => {
  const { html } = await renderMyst("<!-- note -->\n\nTODO here <!-- inline --> now\n");
  const rewritten = rewriteSphinxHtml(html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  const doc = parseHtml(rewritten.html);
  assert.equal(chips(doc).length, 3);
  assert.equal(findElements(doc, (e) => e.attrs.some((a) => a.name.startsWith("on"))).length, 0);
  assert.equal(attribute(chips(doc)[0], "role"), "button");
});

test("a raw HTML table next to comments is unchanged", async () => {
  const { doc } = await render("<!-- c -->\n\n<table><tr><td>cell</td></tr></table>\n");
  assert.equal(findElements(doc, (e) => e.tagName === "td").length, 1);
});

const OKFKB_LIST = [
  "# okfkb",
  "",
  "<!-- generated by okfkb -->",
  "<!-- do not edit the list -->",
  "",
  "- first requirement",
  "- second requirement",
  "",
  "<!-- end of the list -->",
  "",
].join("\n");

test("comments before and after a list each render as a real comment chip, never as a `<!--` label", async () => {
  const { doc, html } = await render(OKFKB_LIST);
  const found = chips(doc);
  assert.equal(found.length, 3, html);
  for (const chip of found) {
    assert.equal(textContent(chip), "comment");
    assert.doesNotMatch(textContent(chip), /<!--/u);
  }
  assert.deepEqual(found.map((chip) => attribute(chip, "title")), [
    "generated by okfkb",
    "do not edit the list",
    "end of the list",
  ]);
  const list = findElement(doc, (e) => e.tagName === "ul");
  assert.ok(list);
  assert.equal(findElements(list, (e) => hasClass(e, "okf-comment")).length, 0);
});

test("comments written on one line, one after the other, are separate chips", async () => {
  const { doc, html } = await render("<!-- one --> <!-- TODO two -->\n<!-- markdownlint-disable -->\n\ntext\n");
  const found = chips(doc);
  assert.equal(found.length, 2, html);
  assert.deepEqual(found.map((chip) => textContent(chip)), ["comment", "TODO"]);
  assert.deepEqual(found.map((chip) => attribute(chip, "title")), ["one", "TODO two"]);
  assert.equal(findElements(doc, (e) => hasClass(e, "okf-comment-body")).length, 2);
});

test("a list item can hold a comment chip between its items", async () => {
  const { doc } = await render("- one\n<!-- between -->\n- two\n");
  assert.deepEqual(chips(doc).map((chip) => textContent(chip)), ["comment"]);
});
