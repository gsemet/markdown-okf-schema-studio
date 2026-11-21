import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElements, hasClass, parseHtml, textContent, type HtmlDocument, type HtmlElement } from "./dom";
import { inlineDocument, workspaceRoot } from "./mystFeaturesSupport";

/**
 * The renderer gives the line marker its lines (`data-okf-marker-line`): the rows of a pipe table
 * wherever the table sits, and everything inside a tab item, without making any of it a mapped
 * block (`data-line`). A wrong line here is silent, so each container is checked on real Markdown.
 */

async function render(source: string): Promise<{ html: string; dom: HtmlDocument }> {
  const result = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  return { html: result.html, dom: parseHtml(result.html) };
}

const rowLines = (dom: HtmlDocument): Array<number | undefined> =>
  findElements(dom, (element) => element.tagName === "tr").map((row) => {
    const line = attribute(row, "data-okf-marker-line");
    return line === undefined ? undefined : Number(line);
  });

const tableRowLines = (table: HtmlElement): Array<number | undefined> =>
  findElements(table, (element) => element.tagName === "tr").map((row) => {
    const line = attribute(row, "data-okf-marker-line");
    return line === undefined ? undefined : Number(line);
  });

const TABLE = ["| a | b |", "| - | - |", "| 1 | 2 |", "| 3 | 4 |"];

/** Source lines: the header on `first`, the delimiter on `first + 1`, then body rows at `first + 2`... */
const expectedRows = (first: number): number[] => [first, first + 2, first + 3];

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-192
test("a top-level pipe table marks its header on its first line and body row n on the first line plus n + 1", async () => {
  const { dom } = await render(["Intro.", "", ...TABLE, ""].join("\n"));
  assert.deepEqual(rowLines(dom), expectedRows(3));
  // The delimiter line is no row: the header row is the one before it. Top level: no marker pair on the table.
  const table = findElements(dom, (element) => element.tagName === "table")[0]!;
  assert.equal(attribute(table, "data-line"), "3");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a pipe table at the end of the file, without a final newline, keeps its row lines", async () => {
  const { dom } = await render(["Intro.", "", ...TABLE].join("\n"));
  assert.deepEqual(rowLines(dom), expectedRows(3));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a pipe table after a front matter counts whole-file lines", async () => {
  const { dom } = await render(["---", "title: T", "---", "", ...TABLE, ""].join("\n"));
  assert.deepEqual(rowLines(dom).filter((line) => line !== undefined), expectedRows(5));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-192
test("a pipe table in a blockquote marks its rows and itself", async () => {
  const { dom } = await render(["Intro.", "", ...TABLE.map((line) => `> ${line}`), ""].join("\n"));
  assert.deepEqual(rowLines(dom), expectedRows(3));
  const table = findElements(dom, (element) => element.tagName === "table")[0]!;
  assert.equal(attribute(table, "data-okf-marker-line"), "3");
  assert.equal(attribute(table, "data-okf-marker-end-line"), "6");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a pipe table in a GitHub alert marks its rows", async () => {
  const { dom } = await render(["Intro.", "", "> [!NOTE]", ...TABLE.map((line) => `> ${line}`), ""].join("\n"));
  assert.deepEqual(rowLines(dom), expectedRows(4));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a pipe table in a {note} and in an {admonition} marks its rows", async () => {
  const note = await render(["Intro.", "", ":::{note}", ...TABLE, ":::", ""].join("\n"));
  assert.deepEqual(rowLines(note.dom), expectedRows(4));
  const admonition = await render(["Intro.", "", ":::{admonition} Title", "Some text.", "", ...TABLE, ":::", ""].join("\n"));
  assert.deepEqual(rowLines(admonition.dom), expectedRows(6));
  const table = findElements(admonition.dom, (element) => element.tagName === "table")[0]!;
  assert.equal(attribute(table, "data-okf-marker-line"), "6");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a pipe table in a list item marks its rows", async () => {
  const { dom } = await render(["Intro.", "", "- item", "", ...TABLE.map((line) => `  ${line}`), ""].join("\n"));
  assert.deepEqual(rowLines(dom), expectedRows(5));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-192
test("a pipe table in a tab item marks its rows, and a click on the item still edits the whole item", async () => {
  const source = [
    "Intro.",
    "",
    "::::{tab-set}",
    ":::{tab-item} A",
    "first",
    ":::",
    ":::{tab-item} B",
    ...TABLE,
    ":::",
    "::::",
    "",
  ].join("\n");
  const { dom } = await render(source);
  assert.deepEqual(rowLines(dom), expectedRows(8));
  const table = findElements(dom, (element) => element.tagName === "table")[0]!;
  assert.equal(attribute(table, "data-okf-marker-line"), "8");
  assert.equal(attribute(table, "data-line"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a list-table, a captioned table directive and a raw HTML table carry no row line", async () => {
  const listTable = [
    ":::{list-table}",
    ":header-rows: 1",
    "",
    "* - a",
    "  - b",
    "* - 1",
    "  - 2",
    ":::",
    "",
  ].join("\n");
  const captioned = ["```{table} Caption", ...TABLE, "```", ""].join("\n");
  const raw = ["<table>", "<tr><td>a</td></tr>", "</table>", ""].join("\n");
  for (const [name, source] of [["list-table", listTable], ["captioned table", captioned], ["raw HTML table", raw]] as const) {
    const { dom } = await render(source);
    assert.ok(findElements(dom, (element) => element.tagName === "tr").length > 0, `${name}: has rows`);
    assert.ok(rowLines(dom).every((line) => line === undefined), `${name}: no row line`);
  }
});

const TAB_SET = [
  "Intro.",
  "",
  "::::::{tab-set}",
  ":::::{tab-item} One",
  "Selected tab.",
  ":::::",
  ":::::{tab-item} Two",
  "A soft wrapped paragraph that goes",
  "over several source lines in the",
  "second tab.",
  "",
  "```python",
  "x = 1",
  "y = 2",
  "```",
  "",
  ...TABLE,
  "",
  "::::{tab-set}",
  ":::{tab-item} Inner A",
  "inner a",
  ":::",
  ":::{tab-item} Inner B",
  "inner b line",
  ":::",
  "::::",
  ":::::",
  "::::::",
  "",
].join("\n");

const markerPair = (element: HtmlElement): [number | undefined, number | undefined] => [
  attribute(element, "data-okf-marker-line") === undefined ? undefined : Number(attribute(element, "data-okf-marker-line")),
  attribute(element, "data-okf-marker-end-line") === undefined ? undefined : Number(attribute(element, "data-okf-marker-end-line")),
];

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("the content of a tab item carries whole-file marker lines and no source mapping", async () => {
  const { dom } = await render(TAB_SET);
  const panels = findElements(dom, (element) => hasClass(element, "myst-tab-panel"));
  const second = panels.find((panel) => attribute(panel, "id")?.endsWith("-1") === true)!;
  assert.ok(second, "the second panel");
  const inside = (name: string): HtmlElement[] => findElements(second, (element) => element.tagName === name);
  const paragraph = inside("p").find((element) => textContent(element).includes("soft wrapped"))!;
  assert.deepEqual(markerPair(paragraph), [8, 10]);
  const code = inside("code")[0]!;
  assert.deepEqual(markerPair(code), [12, 15]);
  const table = inside("table")[0]!;
  assert.deepEqual(markerPair(table), [17, 20]);
  assert.deepEqual(tableRowLines(table), expectedRows(17));
  const nestedSet = findElements(second, (element) => hasClass(element, "myst-tab-set"))[0]!;
  assert.deepEqual(markerPair(nestedSet), [22, 29]);
  const innerPanel = findElements(nestedSet, (element) => hasClass(element, "myst-tab-panel"))
    .find((panel) => textContent(panel).includes("inner b line"))!;
  const innerParagraph = findElements(innerPanel, (element) => element.tagName === "p")[0]!;
  assert.deepEqual(markerPair(innerParagraph), [27, undefined]);

  // None of it is a mapped block: the item's panel is the only one (MYST-098).
  const mapped = findElements(second, (element) => element !== second && attribute(element, "data-line") !== undefined);
  assert.deepEqual(mapped.map((element) => attribute(element, "class")), []);
  assert.equal(attribute(second, "data-line"), "7");
  assert.equal(findElements(dom, (element) => attribute(element, "data-sphinx-source-line") !== undefined).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("CRLF text gives the same marker lines as LF text", async () => {
  const lf = await render(TAB_SET);
  const crlf = await render(TAB_SET.replace(/\n/gu, "\r\n"));
  const lines = (dom: HtmlDocument): Array<[string, string | undefined, string | undefined]> =>
    findElements(dom, (element) => attribute(element, "data-okf-marker-line") !== undefined)
      .map((element) => [
        element.tagName,
        attribute(element, "data-okf-marker-line"),
        attribute(element, "data-okf-marker-end-line"),
      ]);
  assert.ok(lines(lf.dom).length > 5);
  assert.deepEqual(lines(crlf.dom), lines(lf.dom));
  const table = ["Intro.", "", ...TABLE, ""];
  assert.deepEqual(rowLines((await render(table.join("\r\n"))).dom), expectedRows(3));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a pipe table with aligned columns (written through the HTML pass) marks its rows too", async () => {
  const aligned = ["| a | b |", "| :- | -: |", "| 1 | 2 |", "| 3 | 4 |"];
  const top = await render(["Intro.", "", ...aligned, ""].join("\n"));
  assert.deepEqual(rowLines(top.dom), expectedRows(3));
  const quoted = await render(["Intro.", "", ...aligned.map((line) => `> ${line}`), ""].join("\n"));
  assert.deepEqual(rowLines(quoted.dom), expectedRows(3));
  const table = findElements(quoted.dom, (element) => element.tagName === "table")[0]!;
  assert.equal(attribute(table, "data-okf-marker-line"), "3");
  // A raw HTML table next to a pipe table does not shift the pipe table's rows.
  const mixed = await render(["<table>", "<tr><td>x</td></tr>", "</table>", "", ...aligned, ""].join("\n"));
  assert.deepEqual(rowLines(mixed.dom).filter((line) => line !== undefined), expectedRows(5));
});
