import * as assert from "node:assert/strict";
import { test } from "node:test";

import { planBlocksPaste } from "../../../src/core/edits/sourceEdits";
import { blankRuns, quoteBlankRuns, shownBlankLines } from "../../../src/core/mapping/blankRuns";
import { insertionText, planBlankRunInsertion } from "../../../src/core/mapping/insertion";
import { renderPreviewSource } from "../../../src/core/render/renderPipeline";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent, type HtmlElement } from "../render/dom";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

/**
 * CR-462, section 4: a block written or pasted in place of a run inside a container takes the
 * container indent. Every row of the examples table runs through `planBlankRunInsertion` with
 * `insertionText` and through `planBlocksPaste`, in LF, CR LF and lone CR, and its result is rendered.
 */
const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]] as const;
const eolOf = (eol: string, text: string): string => text.replace(/\n/gu, eol);

const render = (text: string) =>
  renderPreviewSource({ text, documentPath: "/w/doc.md", workspaceRoot: "/w", restrictedReads: false }, createNodeFileSystem());

interface Row {
  name: string;
  text: string;
  typed: string;
  written: string;
  itemLine?: number;
  containerLine?: number;
  /** The tags of the top-level elements of the rendered result (the hidden run list excluded). */
  top: string[];
  /** The element that must hold a paragraph of exactly `inside.text`, found in the rendered result. */
  inside: { select: (element: HtmlElement) => boolean; text: string };
  /** A line ending whose result is not rendered: the renderer reads no alert in a lone CR text. */
  noRender?: string;
  /** More checks on the rendered document. */
  check?: (document: ReturnType<typeof parseHtml>) => void;
}

const innermostQuote = (element: HtmlElement): boolean =>
  element.tagName === "blockquote" && findElements(element, tag("blockquote")).length === 1;
const tag = (name: string) => (element: HtmlElement): boolean => element.tagName === name;
const footnote = (id: string) => (element: HtmlElement): boolean => attribute(element, "id") === `user-content-fn-${id}`;

const ROWS: Row[] = [
  {
    name: "a quote",
    text: "> a\n>\n>\n> b\n",
    typed: "More",
    written: "> a\n>\n> More\n>\n> b\n",
    top: ["blockquote"],
    inside: { select: tag("blockquote"), text: "More" },
  },
  {
    name: "a quote at the start of the file",
    text: ">\n>\n> b\n",
    typed: "More",
    written: ">\n> More\n>\n> b\n",
    top: ["blockquote"],
    inside: { select: tag("blockquote"), text: "More" },
  },
  {
    name: "an alert",
    text: "> [!NOTE]\n>\n>\n> x\n",
    typed: "More",
    written: "> [!NOTE]\n>\n> More\n>\n> x\n",
    noRender: "CR",
    top: ["aside"],
    inside: { select: (element) => attribute(element, "data-okf-github-alert") !== undefined, text: "More" },
  },
  {
    name: "a nested quote",
    text: "> > c\n> >\n> >\n> > d\n",
    typed: "More",
    written: "> > c\n> >\n> > More\n> >\n> > d\n",
    top: ["blockquote"],
    inside: { select: innermostQuote, text: "More" },
    check: (document) => assert.equal(findElements(document, tag("blockquote")).length, 2, "the inner quote stays one quote"),
  },
  {
    name: "a quote in a list item",
    text: "- item\n\n  > q\n  >\n  >\n  > r\n",
    typed: "More",
    written: "- item\n\n  > q\n  >\n  > More\n  >\n  > r\n",
    top: ["ul"],
    inside: { select: tag("blockquote"), text: "More" },
  },
  {
    name: "a list item in a quote",
    text: "> - x\n>\n>\n>   more\n",
    typed: "More",
    itemLine: 1,
    written: "> - x\n>\n>   More\n>\n>   more\n",
    top: ["blockquote"],
    inside: { select: tag("li"), text: "More" },
  },
  {
    name: "a list item in a quote, with a tab after the marker",
    text: ">\t- x\n>\n>\n>   more\n",
    typed: "More",
    itemLine: 1,
    written: ">\t- x\n>\n>     More\n>\n>   more\n",
    top: ["blockquote"],
    inside: { select: tag("li"), text: "More" },
  },
  {
    name: "a sibling item in a quote",
    text: "> - x\n>\n>\n> - y\n",
    typed: "- c",
    itemLine: 1,
    written: "> - x\n>\n> - c\n>\n> - y\n",
    top: ["blockquote"],
    inside: { select: tag("li"), text: "c" },
    check: (document) => assert.equal(findElements(document, tag("li")).length, 3, "one list of three items"),
  },
  {
    name: "an admonition",
    text: "```{note}\na\n\n\nb\n```\n",
    typed: "More",
    containerLine: 1,
    written: "```{note}\na\n\nMore\n\nb\n```\n",
    top: ["aside"],
    inside: { select: tag("aside"), text: "More" },
  },
  {
    name: "an admonition in a list item",
    text: "- i\n\n  ```{note}\n  a\n\n\n  b\n  ```\n",
    typed: "More",
    containerLine: 3,
    written: "- i\n\n  ```{note}\n  a\n\n  More\n\n  b\n  ```\n",
    top: ["ul"],
    inside: { select: tag("aside"), text: "More" },
  },
  {
    name: "a quote directive",
    text: "```{epigraph}\nq1\n\n\nq2\n```\n",
    typed: "More",
    containerLine: 1,
    written: "```{epigraph}\nq1\n\nMore\n\nq2\n```\n",
    top: ["figure"],
    inside: { select: tag("blockquote"), text: "More" },
  },
  {
    name: "a context-tag panel",
    text: "<example>\n\nalpha\n\n\nbeta\n\n</example>\n",
    typed: "More",
    containerLine: 1,
    written: "<example>\n\nalpha\n\nMore\n\nbeta\n\n</example>\n",
    top: ["aside"],
    inside: { select: (element) => hasClass(element, "myst-context-admonition"), text: "More" },
  },
  {
    name: "a definition",
    text: "Term\n: d1\n\n\n  two\n",
    typed: "More",
    containerLine: 2,
    written: "Term\n: d1\n\n  More\n\n  two\n",
    top: ["dl"],
    inside: { select: tag("dd"), text: "More" },
    check: (document) => assert.equal(findElements(document, tag("dd")).length, 1, "one definition holds the three paragraphs"),
  },
  {
    name: "a run between two definition entries",
    text: "Term\n: d1\n\n\nOther\n: d2\n",
    typed: "More",
    containerLine: 2,
    written: "Term\n: d1\n\n  More\n\nOther\n: d2\n",
    top: ["dl"],
    inside: { select: tag("dd"), text: "More" },
    check: (document) => assert.equal(findElements(document, tag("dt")).length, 2, "still two terms"),
  },
  {
    name: "a new entry between two definition entries",
    text: "Term\n: d1\n\n\nOther\n: d2\n",
    typed: "New\n: dn",
    containerLine: 2,
    written: "Term\n: d1\n\nNew\n: dn\n\nOther\n: d2\n",
    top: ["dl"],
    inside: { select: tag("dd"), text: "dn" },
    check: (document) => assert.equal(findElements(document, tag("dt")).length, 3, "one dl with three terms"),
  },
  {
    name: "a footnote",
    text: "A[^a]\n\n[^a]: f1\n\n\n    more\n",
    typed: "More",
    containerLine: 3,
    written: "A[^a]\n\n[^a]: f1\n\n    More\n\n    more\n",
    top: ["p", "section"],
    inside: { select: footnote("a"), text: "More" },
    check: (document) => assert.equal(findElements(document, tag("li")).length, 1, "one footnote"),
  },
  {
    name: "a footnote label line alone",
    text: "A[^b]\n\n[^b]:\n\n\n    body\n",
    typed: "More",
    containerLine: 3,
    written: "A[^b]\n\n[^b]:\n\n    More\n\n    body\n",
    top: ["p", "section"],
    inside: { select: footnote("b"), text: "More" },
    check: (document) => assert.equal(findElements(document, tag("li")).length, 1, "one footnote"),
  },
  {
    name: "a run between two footnotes: More stays in the footnote above",
    text: "A[^a] B[^b]\n\n[^a]: f1\n\n\n[^b]: f2\n",
    typed: "More",
    containerLine: 3,
    written: "A[^a] B[^b]\n\n[^a]: f1\n\n    More\n\n[^b]: f2\n",
    top: ["p", "section"],
    inside: { select: footnote("a"), text: "More" },
    check: (document) => {
      assert.equal(findElements(document, tag("li")).length, 2, "two footnotes");
      const first = findElement(document, footnote("a"))!;
      assert.equal(findElements(first, tag("p")).length, 2, "a second paragraph in the first footnote");
    },
  },
  {
    name: "a new footnote between two footnotes",
    text: "A[^a] B[^b] C[^c]\n\n[^a]: f1\n\n\n[^b]: f2\n",
    typed: "[^c]: f3",
    containerLine: 3,
    written: "A[^a] B[^b] C[^c]\n\n[^a]: f1\n\n[^c]: f3\n\n[^b]: f2\n",
    top: ["p", "section"],
    inside: { select: footnote("c"), text: "f3" },
    check: (document) => assert.equal(findElements(document, tag("li")).length, 3, "three footnotes"),
  },
  {
    name: "a quote, with two paragraphs typed",
    text: "> a\n>\n>\n> b\n",
    typed: "More\n\nText",
    written: "> a\n>\n> More\n>\n> Text\n>\n> b\n",
    top: ["blockquote"],
    inside: { select: tag("blockquote"), text: "Text" },
  },
  {
    name: "a nested quote typed in a quote",
    text: "> a\n>\n>\n> b\n",
    typed: "> x",
    written: "> a\n>\n> > x\n>\n> b\n",
    top: ["blockquote"],
    inside: { select: innermostQuote, text: "x" },
    check: (document) => assert.equal(findElements(document, tag("blockquote")).length, 2, "a nested quote"),
  },
  {
    name: "a definition entry typed between two paragraphs of one definition",
    text: "Term\n: d1\n\n\n  two\n",
    typed: "New\n: dn",
    containerLine: 2,
    written: "Term\n: d1\n\n  New\n  : dn\n\n  two\n",
    top: ["dl"],
    inside: { select: tag("dt"), text: "New" },
    check: (document) => assert.equal(findElements(findElement(document, tag("dd"))!, tag("dl")).length, 1, "a list inside the definition"),
  },
  {
    name: "a footnote typed between two paragraphs of one footnote",
    text: "A[^a] C[^c]\n\n[^a]: f1\n\n\n    more\n",
    typed: "[^c]: f3",
    containerLine: 3,
    written: "A[^a] C[^c]\n\n[^a]: f1\n\n    [^c]: f3\n\n    more\n",
    // The indented label is read as a definition of its own: the rendered result is what Markdown makes of it.
    top: ["p", "p", "section"],
    inside: { select: footnote("c"), text: "f3" },
  },
];

/** The top-level elements of the rendered body, the hidden list of runs excluded. */
function topOf(document: ReturnType<typeof parseHtml>): HtmlElement[] {
  const [body] = findElements(document, tag("body"));
  return body.childNodes.filter((node): node is HtmlElement => "tagName" in node && attribute(node, "data-okf-blank-runs") === undefined);
}

/**
 * The blocks directly in an element, as text with line breaks read as one space and the footnote
 * back link dropped: its paragraphs, and the loose text of a tight definition.
 */
const paragraphsOf = (element: HtmlElement): string[] =>
  element.childNodes
    .filter((node) => ("tagName" in node && node.tagName === "p") || node.nodeName === "#text")
    .map((node) => textContent(node).replace(/\s+/gu, " ").replace(/\s*↩$/u, "").trim())
    .filter((text) => text !== "");

/** The first shown blank line of the only run of the text, as the page sends it (one line, `endLine === line`). */
function onlyRun(text: string): { line: number; endLine: number } {
  const runs = [...quoteBlankRuns(text), ...blankRuns(text)];
  assert.equal(runs.length, 1, "the text has one run");
  const [first] = shownBlankLines(text);
  assert.ok(first, "the run shows a blank line");
  return { line: first.line, endLine: first.line };
}

/** The text written by the insertion plan. */
function inserted(text: string, typed: string, row: Row): string {
  const run = onlyRun(text);
  const plan = planBlankRunInsertion(text, run.line, row.itemLine, row.containerLine);
  return text.slice(0, plan.replace!.start) + insertionText(plan, typed) + text.slice(plan.replace!.end);
}

/** The text written by the paste of the same block. */
function pasted(text: string, typed: string, row: Row): string {
  const run = onlyRun(text);
  const result = planBlocksPaste(text, 0, typed, { ...run, itemLine: row.itemLine, containerLine: row.containerLine });
  assert.ok("edit" in result, "the paste is planned");
  return text.slice(0, result.edit.start) + result.edit.text + text.slice(result.edit.end);
}

for (const [name, eol] of EOLS) {
  for (const row of ROWS) {
    // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
    test(`${name}: a block typed or pasted in ${row.name} is written at the container indent and rendered inside it`, async () => {
      const text = eolOf(eol, row.text);
      const expected = eolOf(eol, row.written);
      assert.equal(inserted(text, row.typed, row), expected, "written by the insertion");
      assert.equal(pasted(text, row.typed, row), expected, "written by the paste");
      if (row.noRender === name) return;
      const document = parseHtml((await render(expected)).html);
      assert.deepEqual(topOf(document).map((element) => element.tagName), row.top, "one top-level container");
      const host = findElements(document, row.inside.select).find((element) => paragraphsOf(element).includes(row.inside.text));
      assert.ok(host, `a paragraph "${row.inside.text}" is inside the expected container`);
      row.check?.(document);
    });
  }
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
test("a plain run at the top level, with no container line, is written as before", () => {
  const text = "a\n\n\nb\n";
  const run = onlyRun(text);
  const plan = planBlankRunInsertion(text, run.line);
  assert.equal(plan.indent, undefined);
  assert.equal(text.slice(0, plan.replace!.start) + insertionText(plan, "More\n\n  Text") + text.slice(plan.replace!.end), "a\n\nMore\n\n  Text\n\nb\n");
});
