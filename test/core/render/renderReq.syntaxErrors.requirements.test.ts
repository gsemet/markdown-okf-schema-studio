/**
 * Requirement tests of the MyST scope for broken block syntax: a directive or fence the parser
 * cannot build, and labels left open, render their raw source and never fail the render.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { neutralizeDirectiveErrors } from "../../../src/core/render/mystDirectiveErrors";
import type { MystNode } from "../../../src/core/render/mystNode";
import { renderMyst } from "../../../src/core/render/mystRenderer";
import { findElement, findElements, parseHtml, textContent } from "./dom";
import { isTag, workspaceRoot } from "./mystFeaturesSupport";

/** The text of every code block the render produced, in order. */
async function codeBlocks(source: string): Promise<string[]> {
  const { html } = await renderMyst(source);
  return findElements(parseHtml(html), isTag("pre")).map((pre) => textContent(pre).trimEnd());
}

async function bodyText(source: string): Promise<string> {
  const { html } = await renderMyst(source);
  return textContent(parseHtml(html));
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("an unclosed backtick directive at the end of the file renders its line as a code block", async () => {
  assert.deepEqual(await codeBlocks("```{list-table}\n"), ["```{list-table}"]);
  assert.deepEqual(await codeBlocks("```{list-table}"), ["```{list-table}"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("an unclosed colon directive renders its line as a code block", async () => {
  assert.deepEqual(await codeBlocks(":::{table} Caption\n"), [":::{table} Caption"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("a directive with options and no body keeps its options in the raw block", async () => {
  assert.deepEqual(
    await codeBlocks("```{list-table}\n:header-rows: 1\n```\n"),
    ["```{list-table}\n:header-rows: 1\n```"],
  );
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("the text around a broken directive renders as usual", async () => {
  const { html } = await renderMyst("# Title\n\nbefore\n\n:::{table} Caption\n\n:::\n\nafter\n\n```{list-table}\n");
  const dom = parseHtml(html);
  assert.equal(textContent(findElement(dom, isTag("h1"))!), "Title");
  assert.deepEqual(findElements(dom, isTag("p")).map((paragraph) => textContent(paragraph)), ["before", "after"]);
  assert.deepEqual(findElements(dom, isTag("pre")).map((pre) => textContent(pre).trimEnd()), [
    ":::{table} Caption\n\n:::",
    "```{list-table}",
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("a label opened and never closed stays a paragraph, also around an empty table directive", async () => {
  assert.match(await bodyText("(label-name\n\ntext\n"), /\(label-name\s*text/u);
  const source = "(label-name\n\n:::{table} Caption\n\n:::\n\n)=\n";
  const { html } = await renderMyst(source);
  const dom = parseHtml(html);
  assert.deepEqual(findElements(dom, isTag("p")).map((paragraph) => textContent(paragraph)), ["(label-name", ")="]);
  assert.deepEqual(await codeBlocks(source), [":::{table} Caption\n\n:::"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("a label target with no label before it stays a paragraph", async () => {
  const { html } = await renderMyst(")=\n\ntext\n");
  assert.deepEqual(
    findElements(parseHtml(html), isTag("p")).map((paragraph) => textContent(paragraph)),
    [")=", "text"],
  );
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("an unclosed directive nested in another directive renders its raw line inside it", async () => {
  const { html } = await renderMyst(":::{note}\n```{list-table}\n");
  const dom = parseHtml(html);
  const aside = findElement(dom, isTag("aside"))!;
  assert.deepEqual(
    findElements(aside, isTag("pre")).map((pre) => textContent(pre).trimEnd()),
    ["```{list-table}"],
  );
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("an empty directive at the end of the file, after a paragraph, renders as raw text", async () => {
  const { html } = await renderMyst("text\n\n:::{table}");
  const dom = parseHtml(html);
  assert.deepEqual(findElements(dom, isTag("p")).map((paragraph) => textContent(paragraph)), ["text"]);
  assert.deepEqual(findElements(dom, isTag("pre")).map((pre) => textContent(pre).trimEnd()), [":::{table}"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("the raw block follows the frontmatter and CRLF line breaks", async () => {
  assert.deepEqual(
    await codeBlocks("---\ntitle: T\n---\n\ntext\n\n```{list-table}\n:header-rows: 1\n```\n"),
    ["```{list-table}\n:header-rows: 1\n```"],
  );
  assert.deepEqual(await codeBlocks("text\r\n\r\n:::{table} Cap\r\n\r\n:::\r\n"), [":::{table} Cap\n\n:::"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("the fixture of the unclosed constructs renders every broken block as raw text", async () => {
  const source = fs.readFileSync(
    path.join(workspaceRoot, "test", "visual", "fixtures", "64-unclosed-directives.md"),
    "utf8",
  );
  const { html } = await renderMyst(source);
  const dom = parseHtml(html);
  assert.equal(textContent(findElement(dom, isTag("h1"))!), "Unclosed directives");
  assert.deepEqual(findElements(dom, isTag("pre")).map((pre) => textContent(pre).trimEnd()), [
    ":::{table} Caption\n\n:::",
    "```{list-table}",
  ]);
  assert.ok(findElements(dom, isTag("p")).some((paragraph) => textContent(paragraph).startsWith("The text after")));
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("a directive error without a usable position is rebuilt from its opening line, an include is left alone", () => {
  const error = (extra: Partial<MystNode>): MystNode => ({ type: "mystDirectiveError", name: "table", args: "Cap", ...extra });
  const root: MystNode = {
    type: "root",
    children: [
      error({}),
      error({ position: { start: { line: 1 }, end: { line: 2 } }, data: { included: true } }),
      error({ name: "include" }),
    ],
  };
  neutralizeDirectiveErrors(root, ["other file", "lines"]);
  const [noPosition, included, include] = root.children!;
  assert.deepEqual([noPosition.type, noPosition.value], ["code", "```{table} Cap"]);
  assert.deepEqual([included.type, included.value], ["code", "```{table} Cap"]);
  assert.equal(include.type, "mystDirectiveError");
});
