import * as assert from "node:assert/strict";
import { test } from "node:test";

import { rawMarkdownForSelection } from "../../../src/core/mapping/rawCopy";
import { balanceRawCut, type ResolvedRawEdge } from "../../../src/core/mapping/rawCopyEdges";
import { hasClass } from "../render/dom";
import { copyAll, copyRaw, pageOf, previewHtml, renderPage } from "./rawCopyFrames";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("a selection inside a paragraph cuts the source from the character under each edge", async () => {
  const page = await renderPage("Hello **world** again\n");
  assert.equal(copyRaw(page, { text: "world", offset: 1 }, { text: " again", offset: "end" }), "orld** again");
  assert.equal(copyRaw(page, { text: "Hello" }, { text: "world", offset: "end" }), "Hello **world");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("the seam cases pin the verbatim cut, nothing added at either edge", async () => {
  const heading = await renderPage("## Hello\n");
  assert.equal(copyRaw(heading, { text: "Hello", offset: 2 }, { text: "Hello", offset: "end" }), "llo");
  const paragraph = await renderPage("Hello **world** again\n");
  assert.equal(
    copyRaw(paragraph, { text: "world", offset: 1 }, { text: " again", offset: "end" }),
    "orld** again",
  );
  const source = ":::{note}\nFirst one.\n:::\n\n:::{warning}\nSecond one.\n:::\n";
  const containers = await renderPage(source);
  assert.equal(
    copyRaw(containers, { text: "First one." }, { text: "Second one.", offset: "end" }),
    "First one.\n:::\n\n:::{warning}\nSecond one.",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("balanceRawCut cuts two placed edges verbatim and snaps an unplaced edge to the document side and leaves a reversed cut native", () => {
  const placed = (offset: number): ResolvedRawEdge => ({ kind: "placed", offset, frames: [] });
  const cut = (start: ResolvedRawEdge, end: ResolvedRawEdge) => ({ source: "0123456789", lineBreak: "\n" as const, balanceEdges: false, start, end });
  assert.equal(balanceRawCut(cut(placed(2), placed(6))), "2345");
  assert.equal(balanceRawCut(cut({ kind: "unplaced", frames: [] }, placed(6))), "012345");
  assert.equal(balanceRawCut(cut(placed(2), { kind: "unplaced", frames: [] })), "23456789");
  assert.equal(balanceRawCut(cut(placed(6), placed(2))), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("a thematic break and a table in the middle of a selection are copied verbatim", async () => {
  const source = "Intro line.\n\n---\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nOutro line.\n";
  const page = await renderPage(source);
  assert.equal(
    copyRaw(page, { text: "Intro", offset: 1 }, { text: "Outro line.", offset: "end" }),
    source.slice(1, source.length - 1),
  );
  assert.equal(copyRaw(page, { text: "a" }, { text: "2", offset: "end" }), "a | b |\n|---|---|\n| 1 | 2");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("edges inside a code block inside an admonition map to the exact code characters", async () => {
  const source = ":::{note}\n```python\nx = 1\ny = 22\n```\n:::\n";
  const page = await renderPage(source);
  assert.equal(copyRaw(page, { text: "y", offset: 0 }, { text: "y", offset: "end" }), "y");
  assert.equal(copyRaw(page, { text: "x = " }, { text: "22", offset: "end" }), "x = 1\ny = 22");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("an edge in an admonition's title, written or default, maps to the opening line", async () => {
  const written = await renderPage(":::{note} Heads up\nInside the note.\n:::\n");
  assert.equal(
    copyRaw(written, { text: "Heads up", offset: 2 }, { text: "Inside the note.", offset: "end" }),
    ":::{note} Heads up\nInside the note.",
  );
  assert.equal(copyRaw(written, { text: "Inside" }, { text: "Heads up", offset: 3 }), undefined, "reversed edges are not copied");
  const unnamed = await renderPage(":::{note}\nInside the note.\n:::\n");
  assert.equal(
    copyRaw(unnamed, { text: "Note", offset: 1 }, { text: "Inside the note.", offset: "end" }),
    ":::{note}\nInside the note.",
  );
  assert.equal(copyRaw(unnamed, { text: "Inside" }, { text: "Note", offset: 2 }), undefined);
  const titleOnly = copyRaw(written, { text: "Heads up" }, { text: "Heads up", offset: "end" });
  assert.equal(titleOnly, ":::{note} Heads up", "a selection of the title copies the opening line");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("nested containers selected from before the outer opening to after its closing are copied whole", async () => {
  const source = [
    "Before.",
    "",
    "::::{warning} Outer",
    "- item one",
    "- item two",
    "",
    ":::{note} Inner",
    "```js",
    "const a = 1;",
    "```",
    ":::",
    "::::",
    "",
    "After.",
    "",
  ].join("\n");
  const page = await renderPage(source);
  const container = source.slice(source.indexOf("::::{warning}"), source.indexOf("::::\n\nAfter") + 4);
  assert.equal(copyRaw(page, { text: "Before." , offset: "end" }, { text: "After." }), "\n\n" + container + "\n\n");
  assert.equal(
    copyRaw(page, { text: "item one" }, { text: "item two", offset: "end" }),
    "item one\n- item two",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("a table in an admonition and an admonition in a list item map to their own characters", async () => {
  const table = await renderPage(":::{note}\nlead\n\n| a | b |\n|---|---|\n| 1 | 2 |\n:::\n");
  assert.equal(copyRaw(table, { text: "lead" }, { text: "2", offset: "end" }), "lead\n\n| a | b |\n|---|---|\n| 1 | 2");
  const list = await renderPage("- item\n\n  :::{note}\n  inside\n  :::\n- last\n");
  assert.equal(copyRaw(list, { text: "item" }, { text: "inside", offset: "end" }), "item\n\n  :::{note}\n  inside");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("a block inside a tab item is read through the tab item's frame", async () => {
  const source = "::::{tab-set}\n:::{tab-item} One\nTab para **x** end.\n:::\n:::{tab-item} Two\nSecond.\n:::\n::::\n";
  const page = await renderPage(source);
  assert.equal(copyRaw(page, { text: "Tab para" }, { text: " end.", offset: "end" }), "Tab para **x** end.");
  assert.equal(copyRaw(page, { text: "x", offset: 0 }, { text: " end.", offset: 2 }), "x** e");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("a rendered text the source does not hold copies the whole element that holds it (setting off or on)", async () => {
  const source = "# Head\n\nPlain paragraph here.\n";
  const html = await previewHtml(source);
  const page = pageOf(source, html.replace("Plain paragraph here.", "Quite another text."));
  assert.equal(copyRaw(page, { text: "Quite" }, { text: "text.", offset: "end" }), "Plain paragraph here.");
  assert.equal(copyRaw(page, { text: "Quite", offset: 3 }, { text: "text.", offset: 2 }, { balanceEdges: true }), "Plain paragraph here.");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
test("a CR LF document is cut with its CR LF", async () => {
  const source = "First **para**.\r\n\r\nSecond para.\r\n";
  const page = await renderPage(source);
  assert.equal(copyRaw(page, { text: "para", offset: 0 }, { text: "Second", offset: 3 }), "para**.\r\n\r\nSec");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-274#S1
test("a generated or included block is copied whole whichever part the selection touches", async () => {
  const source = [
    "Lead.", "", "```{mermaid}", "graph TD", "A-->B", "```", "", "{contents}", "", "[TOC]", "", "Tail.", "",
  ].join("\n");
  const page = await renderPage(source);
  const diagram = "```{mermaid}\ngraph TD\nA-->B\n```";
  const isDiagram = (element: Parameters<typeof hasClass>[0]): boolean => hasClass(element, "myst-mermaid-diagram");
  assert.equal(
    copyRaw(page, { text: "Lead." }, { element: isDiagram, at: "after" }),
    "Lead.\n\n" + diagram,
  );
  assert.equal(copyRaw(page, { element: isDiagram, at: "before" }, { text: "Tail." }), diagram + "\n\n{contents}\n\n[TOC]\n\n");
  const withHeading = await renderPage("# Head\n\n[TOC]\n\nTail.\n");
  assert.equal(copyRaw(withHeading, { text: "Head", nth: 1, offset: 1 }, { text: "Tail.", offset: "end" }), "[TOC]\n\nTail.");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-274#S1
test("an image, an inline formula and a role inside a paragraph are copied as their whole construct", async () => {
  const source = "See {ref}`target` and ![alt](a.png \"t\") and $x^2$ here.\n";
  const page = await renderPage(source);
  const image = (element: Parameters<typeof hasClass>[0]): boolean => element.tagName === "img";
  assert.equal(copyRaw(page, { element: image, at: "before" }, { text: "here.", offset: "end" }), "![alt](a.png \"t\") and $x^2$ here.");
  assert.equal(copyRaw(page, { text: "x^2", offset: 1 }, { text: "here.", offset: "end" }), "$x^2$ here.");
  assert.equal(copyRaw(page, { text: "See" }, { text: "x^2", offset: 1 }), "See {ref}`target` and ![alt](a.png \"t\") and $x^2$");
  assert.equal(copyRaw(page, { text: "target", offset: 2 }, { text: "here.", offset: "end" }), "{ref}`target` and ![alt](a.png \"t\") and $x^2$ here.");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-274#S1
test("the properties table is copied as the whole frontmatter block, its delimiters included", async () => {
  const source = "---\ntitle: T\ntags: [a]\n---\n\nBody text.\n";
  const html = (await previewHtml(source)).replace(
    /(<main[^>]*>)/u,
    "$1<section data-line=\"1\" data-sphinx-source-line=\"1\" data-sphinx-source-end-line=\"1\" data-okf-frontmatter-end-line=\"4\" data-okf-properties><table><tbody><tr><th>title</th><td>T</td></tr></tbody></table></section>",
  );
  const page = pageOf(source, html);
  assert.equal(copyRaw(page, { text: "T" }, { text: "Body", offset: 4 }), "---\ntitle: T\ntags: [a]\n---\n\nBody");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-275#S1
test("selecting the whole page returns the source exactly", async () => {
  const source = [
    "---", "title: T", "---", "",
    "# Title", "",
    ":::{note} Heads", "Inside.", ":::", "",
    "| a | b |", "|---|---|", "| 1 | 2 |", "",
    "- one", "- two", "",
    "```python", "x = 1", "```", "",
    "```{mermaid}", "graph TD", "A-->B", "```", "",
    "Closing paragraph.", "",
    "[ref]: https://example.com", "",
    "<!-- trailing comment -->", "",
  ].join("\n");
  const html = (await previewHtml(source.replace(/^---\ntitle: T\n---\n\n/u, "\n\n\n\n"))).replace(
    /(<main[^>]*>)/u,
    "$1<section data-line=\"1\" data-sphinx-source-line=\"1\" data-sphinx-source-end-line=\"1\" data-okf-frontmatter-end-line=\"3\" data-okf-properties></section>",
  );
  const page = pageOf(source, html);
  assert.equal(copyAll(page), source);
  // A real Select all ends in the first and the last text nodes, not in the container.
  assert.equal(copyRaw(page, { text: "Title" }, { text: "Closing paragraph.", offset: "end" }), source);
  assert.equal(copyRaw(page, { text: "Title", offset: 1 }, { text: "Closing paragraph.", offset: "end" }) !== source, true);
  assert.equal(copyRaw(page, { text: "Title" }, { text: "Closing paragraph.", offset: 5 }) !== source, true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-275#S1
test("a real Select all of a document with a final line break and a trailing definition returns it exactly", async () => {
  const source = "First para.\n\nLast **para** [ref].\n\n[ref]: https://example.com\n";
  const page = await renderPage(source);
  assert.equal(copyRaw(page, { text: "First" }, { text: ".", nth: 1, offset: "end" }), source);
  // The start of the container and the end of the last text, as a webview's Select all gives them.
  const first = (element: Parameters<typeof hasClass>[0]): boolean => element.tagName === "p";
  assert.equal(copyRaw(page, { element: first, at: "before" }, { text: ".", nth: 1, offset: "end" }), source);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-275#S1
test("a range that ends at the start of the next block ends at the end of the text before it", async () => {
  const source = "First para.\n\n## Second\n";
  const page = await renderPage(source);
  const heading = (element: Parameters<typeof hasClass>[0]): boolean => element.tagName === "h2";
  assert.equal(copyRaw(page, { text: "First" }, { element: heading, at: "before" }), "First para.");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-275#S1
test("an edge in no mapped element snaps to the document side, and an empty selection copies nothing", async () => {
  assert.equal(rawMarkdownForSelection("a\n", { frames: [], text: "", offset: 0 }, { frames: [], text: "", offset: 0 }), "a\n");
  const page = await renderPage("Only line.\n");
  assert.equal(copyRaw(page, { text: "Only", offset: 2 }, { text: "Only", offset: 1 }), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-276#S1
test("interface chrome inside a block is not part of the text an edge is placed in", async () => {
  const source = "Hello world again.\n";
  const html = (await previewHtml(source)).replace("Hello world", 'Hello <button class="chrome">Copy</button><span class="okf-chip">C1</span>world');
  const page = pageOf(source, html);
  assert.equal(copyRaw(page, { text: "world", offset: 2 }, { text: "again.", offset: "end" }), "rld again.");
  assert.equal(copyRaw(page, { text: "C1" }, { text: "again.", offset: "end" }), "world again.");
});
