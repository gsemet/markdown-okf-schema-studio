/**
 * The title of a GitHub alert is the marker text or the default of its kind, never the first body
 * line: a heading or a lone bold line on the first body line stays in the body, as GitHub renders
 * it. MyST admonitions keep the title shortcut.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import {
  attribute,
  findElement,
  findElements,
  hasClass,
  type HtmlElement,
  type HtmlNode,
  parseHtml,
  textContent,
} from "./dom";

const FIXTURES = path.resolve(__dirname, "../../../../test/core/render/alert-fixtures");

type Doc = ReturnType<typeof parseHtml>;

async function render(source: string): Promise<Doc> {
  return parseHtml((await renderMyst(source)).html);
}

function admonitionOf(doc: Doc, kind: string): HtmlElement {
  const found = findElements(doc, (e) => hasClass(e, "admonition") && hasClass(e, kind));
  assert.equal(found.length, 1, `one ${kind} admonition`);
  return found[0];
}

function titleOf(admonition: HtmlElement): string {
  const title = findElement(admonition, (e) => hasClass(e, "admonition-title"));
  assert.ok(title, "the admonition title");
  return textContent(title);
}

/** The block children of the admonition after its title, as [tag, text]. */
function bodyOf(admonition: HtmlElement): Array<[string, string]> {
  return childElements(admonition)
    .filter((e) => !hasClass(e, "admonition-title"))
    .map((e) => [e.tagName, textContent(e).trim()]);
}

function childElements(element: HtmlElement): HtmlElement[] {
  return element.childNodes.filter((n: HtmlNode): n is HtmlElement => "tagName" in n);
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert whose first body line is a heading keeps the default title and the heading", async () => {
  const doc = await render("> [!NOTE]\n> # h\n> b\n");
  const note = admonitionOf(doc, "note");
  assert.equal(titleOf(note), "Note");
  assert.equal(attribute(note, "data-line"), "1");
  assert.equal(attribute(note, "data-end-line"), "3");
  const heading = findElement(note, (e) => e.tagName === "h1");
  assert.ok(heading, "the heading stays in the body");
  assert.equal(textContent(heading), "h");
  assert.equal(attribute(heading, "data-line"), "2");
  assert.deepEqual(bodyOf(note), [["h1", "h"], ["p", "b"]]);
  // The alert has the class `admonition`, which the TOC column and the sticky band exclude.
  assert.equal(note.tagName, "aside");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert whose first body line is a lone bold line keeps the default title and the bold line", async () => {
  const note = admonitionOf(await render("> [!NOTE]\n> **Bold first**\n>\n> b\n"), "note");
  assert.equal(titleOf(note), "Note");
  assert.deepEqual(bodyOf(note), [["p", "Bold first"], ["p", "b"]]);
  const first = childElements(note).find((e) => e.tagName === "p" && !hasClass(e, "admonition-title"));
  assert.ok(first && findElement(first, (e) => e.tagName === "strong"), "the bold line stays bold");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert with marker text keeps it as the title and keeps a heading in the body", async () => {
  const warning = admonitionOf(await render("> [!WARNING] Read this\n> ## h\n> b\n"), "warning");
  assert.equal(titleOf(warning), "Read this");
  assert.deepEqual(bodyOf(warning), [["h2", "h"], ["p", "b"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a legacy bold-marker alert keeps a heading in the body", async () => {
  const note = admonitionOf(await render("> **Note**\n> # h\n> b\n"), "note");
  assert.equal(titleOf(note), "Note");
  assert.deepEqual(bodyOf(note), [["h1", "h"], ["p", "b"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert between context tags keeps a heading in the body", async () => {
  const tip = admonitionOf(await render("<example-ctx>\n\n> [!TIP]\n> ### h\n\n</example-ctx>\n"), "tip");
  assert.equal(titleOf(tip), "Tip");
  assert.deepEqual(bodyOf(tip), [["h3", "h"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("the heading inside an alert sits in the admonition, which the TOC column and sticky band exclude", async () => {
  const doc = await render("# Top\n\n> [!NOTE]\n> ## Inside\n");
  const inside = findElement(doc, (e) => e.tagName === "h2");
  assert.ok(inside, "the heading stays a heading");
  const alert = admonitionOf(doc, "note");
  assert.ok(findElements(alert, (e) => e === inside).length === 1, "the heading is inside the admonition");
  const top = findElement(doc, (e) => e.tagName === "h1");
  assert.ok(top && findElements(alert, (e) => e === top).length === 0, "the document heading is outside it");
});

/** GitHub's block children after the alert title, as [tag, text]. */
function githubBody(fixture: string): { title: string; body: Array<[string, string]> } {
  const html = fs.readFileSync(path.join(FIXTURES, fixture), "utf8");
  const alert = findElement(parseHtml(html), (e) => hasClass(e, "markdown-alert"));
  assert.ok(alert, "the GitHub alert");
  const children = childElements(alert);
  const title = children.find((e) => hasClass(e, "markdown-alert-title"));
  assert.ok(title);
  return {
    title: textContent(title).trim(),
    body: children.filter((e) => e !== title).map((e) => [e.tagName, textContent(e).trim()]),
  };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("Studio and GitHub agree on the title and the body order of the committed GitHub fixtures", async () => {
  const cases: Array<[string, string]> = [
    ["heading-first-line.github.html", "> [!NOTE]\n> # h\n> b\n"],
    ["bold-first-line.github.html", "> [!NOTE]\n> **Bold first**\n>\n> b\n"],
  ];
  for (const [fixture, source] of cases) {
    const github = githubBody(fixture);
    const note = admonitionOf(await render(source), "note");
    assert.equal(titleOf(note), github.title, fixture);
    assert.deepEqual(bodyOf(note), github.body, fixture);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-001
test("a MyST admonition still takes its title from a leading heading", async () => {
  const note = admonitionOf(await render(":::{note}\n# h\nb\n:::\n"), "note");
  assert.equal(titleOf(note), "h");
  assert.equal(findElement(note, (e) => e.tagName === "h1"), undefined);
});
