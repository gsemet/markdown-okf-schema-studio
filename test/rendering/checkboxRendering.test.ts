import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst } from "../../src/render/mystRenderer";
import { rewriteSphinxHtml } from "../../src/security/html-sanitizer";
import { ResourcePolicy } from "../../src/security/resource-policy";
import {
  attribute,
  findElement,
  findElements,
  hasClass,
  parseHtml,
  textContent,
  type HtmlElement,
} from "./dom";

const workspaceRoot = path.resolve(__dirname, "../../../../..");

function checkboxes(html: string): HtmlElement[] {
  return findElements(parseHtml(html), (element) =>
    element.tagName === "input" && hasClass(element, "myst-checkbox"));
}

function position(element: HtmlElement): string {
  return `${attribute(element, "data-myst-checkbox-line")}:${attribute(element, "data-myst-checkbox-column")}`
    + `:${attribute(element, "checked") !== undefined ? "x" : " "}`;
}

test("task lists, paragraphs and table cells render interactive checkboxes mapped to the source", async () => {
  const source = [
    "---",
    "title: Tasks",
    "---",
    "- [ ] open task",
    "- [x] done task",
    "  - [X] nested task",
    "",
    "Inline [ ] box and *[x] emphasised*.",
    "",
    "| Task | Done |",
    "|------|------|",
    "| Ship | [x] |",
    "| Test | [ ] |",
    "",
    "> 1. [ ] quoted ordered task",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  assert.deepEqual(checkboxes(html).map(position), [
    "4:2: ", "5:2:x", "6:4:x", "8:7: ", "8:20:x", "12:9:x", "13:9: ", "15:5: ",
  ]);
  const document = parseHtml(html);
  const items = findElements(document, (element) => element.tagName === "li");
  assert.ok(items.slice(0, 3).every((item) => hasClass(item, "task-list-item")));
  const lists = findElements(document, (element) => element.tagName === "ul" || element.tagName === "ol");
  assert.ok(lists.every((list) => hasClass(list, "contains-task-list")));
  assert.equal(findElements(document, (element) =>
    element.tagName === "input" && attribute(element, "disabled") !== undefined).length, 0,
  "the parser's read-only task checkboxes are replaced");
  const firstItem = findElement(document, (element) => element.tagName === "p" && attribute(element, "data-line") === "4");
  assert.ok(firstItem);
  assert.equal(textContent(firstItem), " open task");
});

test("CRLF documents keep exact columns", async () => {
  const { html } = await renderMyst("Before\r\n\r\n| a [ ] | [x] |\r\n|---|---|\r\n| [ ] | b |\r\n");
  assert.deepEqual(checkboxes(html).map(position), ["3:4: ", "3:10:x", "5:2: "]);
});

// Raw HTML blocks are dropped by the writer; the case only checks that no placeholder leaks.
test("markers stay literal in code, math, diagrams, links, headings and raw HTML", async () => {
  const source = [
    "# Heading [ ]",
    "",
    "`[ ]` and [label [x] text](target.md) and [x](https://example.com) and $a[x]b$.",
    "",
    "```text",
    "- [ ] fenced",
    "```",
    "",
    "```mermaid",
    "flowchart LR",
    "  A[x] --> B[ ]",
    "```",
    "",
    "<div>[ ] raw</div>",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  assert.deepEqual(checkboxes(html), []);
  assert.match(html, /Heading \[ \]/u);
  assert.match(html, /<code>\[ \]<\/code>/u);
  assert.match(html, />label \[x\] text<\/a>/u);
  assert.match(html, /- \[ \] fenced/u);
  assert.match(html, /A\[x\] --(?:>|&gt;) B\[ \]/u);
  assert.match(html, /a\[x\]b/u);
  assert.doesNotMatch(html, /[-]/u, "no placeholder may leak into the output");
});

test("markers inside directives and their titles become checkboxes", async () => {
  const { html } = await renderMyst(":::{note} Plan [ ]\n- [x] inside\n:::\n");
  assert.deepEqual(checkboxes(html).map(position), ["1:15: ", "2:2:x"]);
});

test("the webview sanitizer keeps checkbox inputs and their source attributes", async () => {
  const { html } = await renderMyst("- [x] keep me\n");
  const rewritten = rewriteSphinxHtml(html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  const [checkbox] = checkboxes(rewritten.html);
  assert.ok(checkbox, "the sanitizer removed the checkbox");
  assert.equal(attribute(checkbox, "type"), "checkbox");
  assert.equal(position(checkbox), "1:2:x");
});
