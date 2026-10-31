// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
/**
 * Source line of a `{grid-item-card}` title that looks like an ordered list item. The title is
 * parsed on its own, so its blocks must still carry the document line of the directive line, since
 * a click on the title opens the block editor on exactly the line the page reports.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { attribute, findElements, hasClass, type HtmlElement, parseHtml, textContent } from "./dom";

const FIXTURE = path.resolve(__dirname, "../../../../test/visual/fixtures/73-grid-card-editing.md");

/**
 * The title must stay mapped to its directive line: a title click then opens the editor inside the
 * card (SwRS-MDOKFSTUDIO-BLOCK-257). An unmapped title falls through to the card div, and the editor
 * opens after the card, outside it.
 */
async function titleMappings(source: string, text: string) {
  const html = (await renderMyst(source)).html;
  const title = findElements(parseHtml(html), (element) => hasClass(element, "myst-grid-card-title"))
    .find((element) => textContent(element).includes(text));
  assert.ok(title, "the card title part is rendered");
  const nodes = [title, ...findElements(title, () => true)];
  const attr = (name: string) => nodes
    .filter((element) => attribute(element, name) !== undefined)
    .map((element) => [element.tagName, Number(attribute(element, name))] as const);
  return { lines: attr("data-line"), endLines: attr("data-end-line") };
}

function assertTitleMapped(
  mapping: Awaited<ReturnType<typeof titleMappings>>,
  titleLine: number,
): void {
  const got = JSON.stringify(mapping);
  assert.ok(mapping.lines.length > 0, `the title carries a data-line the editor can open; got ${got}`);
  assert.deepEqual(
    mapping.lines.filter(([, line]) => line !== titleLine),
    [],
    `every mapped line inside the title must be ${titleLine} (the directive line); got ${got}`,
  );
  assert.deepEqual(
    mapping.endLines.filter(([, line]) => line !== titleLine),
    [],
    `the title must not span the whole card (end line absent or ${titleLine}); got ${got}`,
  );
}

test("a numbered grid card title maps to its directive line, never to line 1", async () => {
  const source = fs.readFileSync(FIXTURE, "utf8");
  const titleLine = source.split("\n").findIndex((line) => line.includes("2. Status projection")) + 1;
  assert.equal(titleLine, 8);
  assertTitleMapped(await titleMappings(source, "Status projection"), titleLine);
});

test("a numbered standalone card title maps to its directive line", async () => {
  const source = ["# Doc", "", ":::{card} 3. Standalone", "Body text.", ":::", ""].join("\n");
  const titleLine = source.split("\n").findIndex((line) => line.includes("3. Standalone")) + 1;
  assert.equal(titleLine, 3);
  assertTitleMapped(await titleMappings(source, "Standalone"), titleLine);
});

test("a numbered card title is literal inline text: the leading number stays and no list is built", async () => {
  const source = fs.readFileSync(FIXTURE, "utf8");
  const html = (await renderMyst(source)).html;
  const title = findElements(parseHtml(html), (element) => hasClass(element, "myst-grid-card-title"))
    .find((element) => textContent(element).includes("Status projection"));
  assert.ok(title, "the card title part is rendered");
  assert.equal(textContent(title).trim(), "2. Status projection");
  assert.deepEqual(
    findElements(title, (element) => element.tagName === "ol" || element.tagName === "li"),
    [],
    "the title holds no list element",
  );
});

test("a plain grid card title maps to its directive line too", async () => {
  const source = ["# Doc", "", "::::{grid} 2", ":::{grid-item-card} Plain *title*", "Body.", ":::", "::::", ""].join("\n");
  assertTitleMapped(await titleMappings(source, "Plain"), 4);
});

// CR 217: the owner changed the rule. A linked title is now mapped like a plain one, so in edit mode
// a plain click on it opens its directive line (Cmd/Ctrl+click still follows the link).
test("a card title with a link option maps to its directive line like a plain title", async () => {
  const source = ["# Doc", "", ":::{card} 3. Linked", ":link: https://example.com", "Body text.", ":::", ""].join("\n");
  assertTitleMapped(await titleMappings(source, "Linked"), 3);
});

test("a linked grid card title maps to its directive line and keeps its link", async () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../../test/visual/fixtures/46-grid-cards.md"), "utf8");
  const titleLine = source.split("\n").findIndex((line) => line.includes("{grid-item-card} Linked card")) + 1;
  assert.equal(titleLine, 14);
  assertTitleMapped(await titleMappings(source, "Linked card"), titleLine);
  const html = (await renderMyst(source)).html;
  const title = findElements(parseHtml(html), (element) => hasClass(element, "myst-grid-card-title"))
    .find((element) => textContent(element).includes("Linked card"));
  const link = title && findElements(title, (element) => element.tagName === "a")[0];
  assert.ok(link && hasClass(link, "myst-grid-card-link"), "the title still holds the card link");
  assert.equal(attribute(link, "href"), "targets/alpha.md");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-100
test("a standalone card header option maps to its own option line and keeps its leading number", async () => {
  const source = ["# Doc", "", ":::{card} Title", ":header: 4. Header text", "Body text.", ":::", ""].join("\n");
  const html = (await renderMyst(source)).html;
  const header = findElements(parseHtml(html), (element) => hasClass(element, "myst-grid-card-header"))[0];
  assert.ok(header, "the header part is rendered");
  assert.equal(textContent(header).trim(), "4. Header text");
  const nodes = [header, ...findElements(header, () => true)];
  const mapped = nodes
    .filter((element) => attribute(element, "data-line") !== undefined)
    .map((element) => [element.tagName, Number(attribute(element, "data-line")), Number(attribute(element, "data-end-line"))]);
  assert.ok(mapped.length > 0, "the header carries a data-line");
  assert.deepEqual(mapped.filter(([, line, end]) => line !== 4 || end !== 4), [], `only line 4; got ${JSON.stringify(mapped)}`);
  assert.deepEqual(findElements(header, (element) => element.tagName === "ol" || element.tagName === "li"), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("header and footer options that are not the first option line map to their own lines", async () => {
  const source = [
    "# Doc", "", ":::{card} Title", ":class-card: x", ":header: 4. H", ":footer: 5. F", "Body text.", ":::", "",
  ].join("\n");
  const html = (await renderMyst(source)).html;
  const tree = parseHtml(html);
  for (const [kind, text, line] of [["header", "4. H", 5], ["footer", "5. F", 6]] as const) {
    const part = findElements(tree, (element) => hasClass(element, `myst-grid-card-${kind}`))[0];
    assert.ok(part, `the ${kind} part is rendered`);
    assert.equal(textContent(part).trim(), text);
    const mapped = [part, ...findElements(part, () => true)]
      .filter((element) => attribute(element, "data-line") !== undefined)
      .map((element) => [Number(attribute(element, "data-line")), Number(attribute(element, "data-end-line"))]);
    assert.ok(mapped.length > 0, `the ${kind} carries a data-line`);
    assert.deepEqual(mapped.filter(([start, end]) => start !== line || end !== line), [], `${kind}: only line ${line}`);
  }
});

/** The parts of a rendered element (itself and its descendants) that carry `data-single-line`. */
function singleLineParts(element: HtmlElement | undefined): string[] {
  assert.ok(element, "the part is rendered");
  // findElements visits the element itself too.
  return findElements(element, (node) => attribute(node, "data-single-line") !== undefined)
    .map((node) => `${node.tagName}:${attribute(node, "data-line")}-${attribute(node, "data-end-line")}`);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("the header, footer and unlinked title lines are marked single-line; the body is not", async () => {
  const source = [
    "# Doc", "", "One line paragraph.", "", ":::{card} Title", ":header: H", ":footer: F", "Body text.", ":::", "",
    "::::{grid} 2", ":::{grid-item-card} Grid title", "Grid body.", ":::", "::::", "",
  ].join("\n");
  const tree = parseHtml((await renderMyst(source)).html);
  const part = (kind: string, text: string) => findElements(tree, (element) => hasClass(element, `myst-grid-card-${kind}`))
    .find((element) => textContent(element).includes(text));
  assert.deepEqual(singleLineParts(part("header", "H")), ["div:6-6"]);
  assert.deepEqual(singleLineParts(part("footer", "F")), ["div:7-7"]);
  assert.deepEqual(singleLineParts(part("title", "Title")), ["div:5-5"]);
  assert.deepEqual(singleLineParts(part("title", "Grid title")), ["div:12-12"]);
  for (const text of ["Body text.", "Grid body."]) {
    assert.deepEqual(singleLineParts(part("body", text)), [], `the body "${text}" is no single-line part`);
  }
  const outside = findElements(tree, (element) => element.tagName === "p" || element.tagName === "h1")
    .filter((element) => attribute(element, "data-single-line") !== undefined);
  assert.deepEqual(outside, [], "a one-line paragraph or heading is no single-line part");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("a linked card title is marked single-line like any card title", async () => {
  const source = ["# Doc", "", ":::{card} Linked", ":link: https://example.com", "Body text.", ":::", ""].join("\n");
  const tree = parseHtml((await renderMyst(source)).html);
  const title = findElements(tree, (element) => hasClass(element, "myst-grid-card-title"))[0];
  assert.deepEqual(singleLineParts(title), ["div:3-3"]);
});
