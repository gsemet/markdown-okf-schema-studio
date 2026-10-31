/**
 * Lazy continuation lines of GitHub alerts. Under CommonMark (0.31.2, section 5.1, "laziness")
 * an unquoted line that continues the open paragraph of a block quote belongs to the quote, and
 * GitHub renders it inside the alert. A blank line, or a line that starts a new block, ends it.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { attribute, findElements, hasClass, parseHtml, textContent } from "./dom";

interface AlertView {
  /** The text of each alert body, title left out, white space collapsed. */
  readonly alerts: string[];
  /** The `data-line` / `data-end-line` of each alert. */
  readonly ranges: [number, number][];
  /** The text outside every alert, white space collapsed. */
  readonly outside: string;
}

function collapse(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

async function view(source: string): Promise<AlertView> {
  const document = parseHtml((await renderMyst(source)).html);
  const asides = findElements(document, (element) => element.tagName === "aside" && hasClass(element, "admonition"));
  const alerts = asides.map((aside) => collapse(aside.childNodes
    .filter((child) => !("attrs" in child) || !hasClass(child, "admonition-title"))
    .map(textContent).join(" ")));
  const ranges = asides.map((aside): [number, number] =>
    [Number(attribute(aside, "data-line")), Number(attribute(aside, "data-end-line"))]);
  let all = collapse(textContent(document));
  for (const aside of asides) all = all.replace(collapse(textContent(aside)), " ");
  return { alerts, ranges, outside: collapse(all) };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a lazy continuation line renders inside the alert, which ends on that line", async () => {
  const result = await renderMyst("> [!NOTE]\n> a\nb\n");
  const document = parseHtml(result.html);
  const [aside] = findElements(document, (element) => element.tagName === "aside");
  assert.ok(aside, result.html);
  assert.equal(attribute(aside, "data-line"), "1");
  assert.equal(attribute(aside, "data-end-line"), "3");
  const paragraphs = findElements(aside, (element) => element.tagName === "p" && !hasClass(element, "admonition-title"));
  assert.deepEqual(paragraphs.map((p) => [attribute(p, "data-line"), attribute(p, "data-end-line")]), [["2", "3"]],
    "the quoted line and the lazy line make one paragraph");
  assert.equal(collapse(textContent(paragraphs[0])), "a b");
  assert.equal(findElements(document, (element) => element.tagName === "p" && element !== paragraphs[0]
    && !hasClass(element, "admonition-title")).length, 0, "no paragraph outside the alert");
});

const GITHUB_CASES: { source: string; alerts: string[]; ranges: [number, number][]; outside: string }[] = [
  { source: "> [!NOTE]\n> Line one.\nlazy line.\n", alerts: ["Line one. lazy line."], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\nlazy right after head\n", alerts: ["lazy right after head"], ranges: [[1, 2]], outside: "" },
  { source: "> [!NOTE]\n> a\nb\nc\n> d\n", alerts: ["a b c d"], ranges: [[1, 5]], outside: "" },
  { source: "> [!NOTE]\n> a\n    indented lazy\n", alerts: ["a indented lazy"], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\n> a\n\nb\n", alerts: ["a"], ranges: [[1, 2]], outside: "b" },
  { source: "> [!NOTE]\n> a\n- item\n", alerts: ["a"], ranges: [[1, 2]], outside: "item" },
  { source: "> [!NOTE]\n> a\n1. item\n", alerts: ["a"], ranges: [[1, 2]], outside: "item" },
  { source: "> [!NOTE]\n> a\n# Head\n", alerts: ["a"], ranges: [[1, 2]], outside: "Head" },
  { source: "> [!NOTE]\n> a\n```\ncode\n```\n", alerts: ["a"], ranges: [[1, 2]], outside: "code" },
  { source: "> [!NOTE]\n> a\n~~~\ncode\n~~~\n", alerts: ["a"], ranges: [[1, 2]], outside: "code" },
  { source: "> [!NOTE]\n> a\n:::{tip}\ninner\n:::\n", alerts: ["a", "inner"], ranges: [[1, 2], [3, 5]], outside: "" },
  { source: "> [!NOTE]\n> a\n***\nb\n", alerts: ["a"], ranges: [[1, 2]], outside: "b" },
  { source: "> [!NOTE]\n> a\n<div>\nhtml\n</div>\n", alerts: ["a"], ranges: [[1, 2]], outside: "html" },
  { source: "> [!NOTE]\n> a\n> # head\nb\n", alerts: ["a head"], ranges: [[1, 3]], outside: "b" },
  { source: "> [!NOTE]\n> ```\n> code\n> ```\nb\n", alerts: ["code"], ranges: [[1, 4]], outside: "b" },
  { source: "> [!NOTE]\n>\n>     indented code\nb\n", alerts: ["indented code"], ranges: [[1, 3]], outside: "b" },
  { source: "> [!NOTE]\n> a\n>\nb\n", alerts: ["a"], ranges: [[1, 3]], outside: "b" },
  { source: "> [!NOTE]\n> a\n> ***\nb\n", alerts: ["a"], ranges: [[1, 3]], outside: "b" },
  // A lazy line that would underline a setext heading once unquoted stays paragraph text.
  { source: "> [!NOTE]\n> a\n===\n", alerts: ["a ==="], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\n> a\n--\n", alerts: ["a --"], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\n> a\n=\n", alerts: ["a ="], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\n> a\n  ===  \n", alerts: ["a ==="], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\n> - a\n===\n", alerts: ["a ==="], ranges: [[1, 3]], outside: "" },
  // On a lazy line the quote does not match, so any list marker starts a list.
  { source: "> [!NOTE]\n> a\n2. x\n", alerts: ["a"], ranges: [[1, 2]], outside: "x" },
  { source: "> [!NOTE]\n> a\n-\n", alerts: ["a"], ranges: [[1, 2]], outside: "" },
  { source: "> [!NOTE]\n> a\n*\n", alerts: ["a"], ranges: [[1, 2]], outside: "" },
  { source: "> [!NOTE]\n> a\n+ b\n", alerts: ["a"], ranges: [[1, 2]], outside: "b" },
  { source: "> [!NOTE]\n> a\n1) b\n", alerts: ["a"], ranges: [[1, 2]], outside: "b" },
  { source: "> [!NOTE]\n> a\n> 2. x\n", alerts: ["a 2. x"], ranges: [[1, 3]], outside: "" },
  // A table closes the paragraph; a lazy delimiter row stays text.
  { source: "> [!NOTE]\n> | a | b |\n> | - | - |\n> | 1 | 2 |\nfoo\n", alerts: ["a b 1 2"], ranges: [[1, 4]],
    outside: "foo" },
  { source: "> [!NOTE]\n> a | b\n> --|--\nfoo\n", alerts: ["a b"], ranges: [[1, 3]], outside: "foo" },
  { source: "> [!NOTE]\n> | a |\n> | - | - |\nfoo\n", alerts: ["| a | | - | - | foo"], ranges: [[1, 4]], outside: "" },
  { source: "> [!NOTE]\n> | a | b |\n| - | - |\n", alerts: ["| a | b | | - | - |"], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\n> a | b\n--|--\n", alerts: ["a | b --|--"], ranges: [[1, 3]], outside: "" },
  { source: "> [!NOTE]\n> a | b\n:-|-:\n", alerts: ["a | b :-|-:"], ranges: [[1, 3]], outside: "" },
  // HTML blocks of kinds 1 to 5 end on their end marker; kind 7 cannot interrupt a paragraph.
  { source: "> [!NOTE]\n> <!-- c -->\n> text\nlazy\n", alerts: ["commentc text lazy"], ranges: [[1, 4]], outside: "" },
  { source: "> [!NOTE]\n> <!-- c\n> d -->\n> text\nlazy\n", alerts: ["commentc d text lazy"], ranges: [[1, 5]],
    outside: "" },
  { source: "> [!NOTE]\n> <pre>x</pre>\n> text\nlazy\n", alerts: ["text lazy"], ranges: [[1, 4]], outside: "" },
  { source: "> [!NOTE]\n> a\n> <!-- c -->\nlazy\n", alerts: ["a commentc"], ranges: [[1, 3]], outside: "lazy" },
  { source: "> [!NOTE]\n> a\n> <custom-x>\nlazy\n", alerts: ["a lazy"], ranges: [[1, 4]], outside: "" },
  { source: "> [!NOTE]\n> a\n>\n> <custom-x>\nlazy\n", alerts: ["a"], ranges: [[1, 4]], outside: "lazy" },
  // A lazy MyST block break stays paragraph text, as on GitHub.
  { source: "> [!NOTE]\n> a\n+++\nb\n", alerts: ["a +++ b"], ranges: [[1, 4]], outside: "" },
  // The preview's typographer curls the quotes, in an alert as in any paragraph.
  { source: "> [!NOTE]\n> a\n+++ {\"a\": 1}\nb\n", alerts: ["a +++ {\u201ca\u201d: 1} b"], ranges: [[1, 4]], outside: "" },
  { source: "> [!NOTE]\n> a\n  +++\nb\n", alerts: ["a +++ b"], ranges: [[1, 4]], outside: "" },
];

for (const { source, alerts, ranges, outside } of GITHUB_CASES) {
  // @tests_req SwRS-MDOKFSTUDIO-GFM-009
  test(`an unquoted line joins the alert only as a lazy continuation of its open paragraph: ${JSON.stringify(source)}`,
    async () => {
      assert.deepEqual(await view(source), { alerts, ranges, outside }, JSON.stringify(source));
    });
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a lazy line of an alert nested in a list item stays in the alert", async () => {
  const result = await view("- item\n\n  > [!TIP]\n  > a\n  b\n\nAfter.\n");
  assert.deepEqual(result, { alerts: ["a b"], ranges: [[3, 5]], outside: "item After." });
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a lazy line of a CRLF alert stays in the alert", async () => {
  assert.deepEqual(await view("> [!NOTE]\r\n> a\r\nb\r\n\r\nAfter.\r\n"),
    { alerts: ["a b"], ranges: [[1, 3]], outside: "After." });
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a lazy setext underline or delimiter row adds no heading or table to the alert", async () => {
  for (const source of ["> [!NOTE]\n> a\n===\n", "> [!NOTE]\n> a\n--\n", "> [!NOTE]\n> | a | b |\n| - | - |\n"]) {
    const document = parseHtml((await renderMyst(source)).html);
    const titles = findElements(document, (element) => hasClass(element, "admonition-title")).map(textContent);
    assert.deepEqual(titles, ["Note"], JSON.stringify(source));
    const blocks = findElements(document, (element) => /^(?:h[1-6]|table)$/u.test(element.tagName));
    assert.deepEqual(blocks.map((element) => element.tagName), [], JSON.stringify(source));
  }
});
