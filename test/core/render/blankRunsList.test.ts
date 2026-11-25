import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewSource } from "../../../src/core/render/renderPipeline";
import { attribute, findElement, findElements, hasClass, parseHtml, type HtmlElement } from "./dom";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

const render = (text: string) =>
  renderPreviewSource({ text, documentPath: "/w/doc.md", workspaceRoot: "/w", restrictedReads: false }, createNodeFileSystem());

/** The value of the host's list of runs, the last element of the rendered content. */
function runsAttribute(html: string): string | undefined {
  return /<div hidden data-okf-blank-runs="([^"]*)"><\/div>$/u.exec(html)?.[1];
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S5
test("the rendered content ends with a hidden list of the blank runs of the source", async () => {
  const { html } = await render("# Title\n\nA\n\n\n\nB\n\n\nC\n");
  assert.equal(runsAttribute(html), "5-6 9-9");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S5
test("a source with no run has the list element with an empty value, and every render carries it", async () => {
  assert.equal(runsAttribute((await render("A\n\nB\n")).html), "");
  assert.equal(runsAttribute((await render("")).html), "");
  assert.equal(runsAttribute((await render("---\ntitle: x\n---\n\n\nbody\n")).html), "5-5");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S5
test("an edit changes the list: the next render of the content patch carries the new runs", async () => {
  const before = await render("A\n\n\nB\n");
  const after = await render("A\n\nB\n");
  assert.equal(runsAttribute(before.html), "3-3");
  assert.equal(runsAttribute(after.html), "");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S2
test("the list names the shown blank lines: a line of text then six blank lines gives 2-7, a single shown line L-L", async () => {
  assert.equal(runsAttribute((await render("Text.\n\n\n\n\n\n\n")).html), "2-7");
  assert.equal(runsAttribute((await render("a\n\n\nb\n")).html), "3-3");
  assert.equal(runsAttribute((await render("\n\na\n")).html), "1-2", "at the top of a file every blank line shows");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S3
test("a blank run in a code fence is not a run of the source's blocks", async () => {
  const { html } = await render("```\na\n\n\nb\n```\n");
  assert.ok(runsAttribute(html) !== undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S4
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S5
test("a quote run and a plain run are in the list, sorted by line", async () => {
  const { html } = await render("> a\n>\n>\n> b\n\n\nc\n");
  assert.equal(runsAttribute(html), "3-3 6-6");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S4
test("a definition and a footnote carry their page-only line, and a quote directive its end line", async () => {
  const { html } = await render("Term\n: one\n\n\n: two\n\nA[^x]\n\n[^x]: note\n");
  assert.match(html, /<dd[^>]*data-okf-definition-line="2"/u);
  assert.match(html, /<li id="user-content-fn-x" data-okf-footnote-line="9"/u);
  assert.doesNotMatch(html, /data-okf-(?:definition|footnote)-line="[^"]*"[^>]*data-line/u);
  const epigraph = (await render("```{epigraph}\nq1\n\n\nq2\n```\n")).html;
  assert.match(epigraph, /<blockquote data-line="1" data-end-line="6">/u);
  const endLine = attribute(findElement(parseHtml(epigraph), (e) => e.tagName === "blockquote")!, "data-end-line");
  assert.equal(endLine, "6", "the closing fence line (bq-Q6)");
});

/** The `[line, end line]` of an element, as the page reads its range. */
const rangeOf = (element: HtmlElement | undefined): [number, number] => [
  Number(attribute(element!, "data-line")),
  Number(attribute(element!, "data-end-line")),
];

/** True when the run `line`..`endLine` is within the element's range, the strict way or up to its edges. */
const holds = (element: HtmlElement | undefined, line: number, endLine: number, edges: boolean): boolean => {
  const [first, last] = rangeOf(element);
  return edges ? first <= line && endLine <= last : first < line && endLine < last;
};

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S4
test("a quote holds its run up to its edges: in its middle, at its start and at the end of the text", async () => {
  const { html } = await render("> a\n>\n>\n> b\n\n>\n>\n> c\n\nx\n>\n>\n");
  assert.equal(runsAttribute(html), "3-3 7-7 12-12");
  const quotes = findElements(parseHtml(html), (e) => e.tagName === "blockquote");
  assert.deepEqual(quotes.map(rangeOf), [[1, 4], [6, 8], [11, 12]]);
  assert.ok(holds(quotes[0], 3, 3, false), "a run in the middle is held strictly");
  assert.ok(holds(quotes[1], 7, 7, false), "a run at the start: its first line is the separator, the shown line is strictly inside");
  assert.ok(!holds(quotes[2], 12, 12, false) && holds(quotes[2], 12, 12, true), "a run at the end needs the edge test");
});

/** The first element of the rendered text that the selector accepts. */
async function containerOf(text: string, selector: (e: HtmlElement) => boolean): Promise<HtmlElement> {
  const { html } = await render(text);
  const element = findElement(parseHtml(html), selector);
  assert.ok(element, "the container is rendered");
  return element;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S1
test("an alert holds its run up to its edges", async () => {
  const alert = await containerOf("> [!NOTE]\n>\n>\n> x\n", (e) => e.tagName === "aside");
  assert.ok(attribute(alert, "data-okf-github-alert"));
  assert.deepEqual(rangeOf(alert), [1, 4]);
  assert.ok(holds(alert, 2, 3, true));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S1
test("an admonition, a closed dropdown and a context-tag panel hold their run, with their mapped paragraphs", async () => {
  const note = await containerOf("```{note}\na\n\n\nb\n```\n", (e) => e.tagName === "aside");
  assert.deepEqual(rangeOf(note), [1, 6]);
  assert.ok(holds(note, 3, 4, false));
  const dropdown = await containerOf("```{admonition} T\n:class: dropdown\na\n\n\nb\n```\n", (e) => e.tagName === "details");
  assert.ok(hasClass(dropdown, "admonition") && attribute(dropdown, "open") === undefined);
  assert.deepEqual(rangeOf(dropdown), [1, 7]);
  assert.ok(holds(dropdown, 4, 5, false));
  const panel = await containerOf("<example>\n\nalpha\n\n\nbeta\n\n</example>\n", (e) => e.tagName === "aside");
  assert.ok(hasClass(panel, "myst-context-admonition"));
  assert.deepEqual(rangeOf(panel), [1, 8]);
  assert.ok(holds(panel, 4, 5, false));
  for (const container of [note, dropdown, panel]) {
    const paragraphs = findElements(container, (e) => e.tagName === "p" && attribute(e, "data-line") !== undefined);
    assert.equal(paragraphs.length, 2, "the two paragraphs are mapped blocks");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S4
test("a quote directive, a figure and a card hold their run", async () => {
  const quote = await containerOf("```{epigraph}\nq1\n\n\nq2\n```\n", (e) => e.tagName === "blockquote");
  assert.deepEqual(rangeOf(quote), [1, 6]);
  assert.ok(holds(quote, 3, 4, false));
  const figure = await containerOf("```{figure} a.png\ncap\n\n\nleg\n```\n", (e) => e.tagName === "figure");
  assert.deepEqual(rangeOf(figure), [1, 6]);
  assert.ok(holds(figure, 3, 4, false));
  const card = await containerOf("```{card} T\na\n\n\nb\n```\n", (e) => hasClass(e, "myst-card"));
  assert.deepEqual(rangeOf(card), [1, 6]);
  assert.ok(holds(card, 3, 4, false));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266#S5
test("footnote paragraphs are mapped blocks inside the footnotes section, which carries no line", async () => {
  const { html } = await render("A[^a] B[^b] C[^c]\n\n[^a]: f1\n\n\n    f2\n\n[^b]:\n\n\n    body\n\n[^c]: f3\n");
  assert.equal(runsAttribute(html), "5-5 10-10");
  const document = parseHtml(html);
  const section = findElement(document, (e) => e.tagName === "section" && attribute(e, "data-footnotes") !== undefined);
  assert.ok(section);
  for (const name of ["data-line", "data-end-line"]) {
    assert.equal(attribute(section, name), undefined);
    assert.equal(findElement(section, (e) => e.tagName === "ol" && attribute(e, name) !== undefined), undefined);
    assert.equal(findElement(section, (e) => e.tagName === "li" && attribute(e, name) !== undefined), undefined);
  }
  const items = findElements(section, (e) => e.tagName === "li");
  assert.deepEqual(items.map((li) => attribute(li, "data-okf-footnote-line")), ["3", "8", "13"]);
  const lines = items.map((li) => findElements(li, (e) => e.tagName === "p").map(rangeOf));
  assert.deepEqual(lines, [[[3, 3], [6, 6]], [[11, 11]], [[13, 13]]]);
});
