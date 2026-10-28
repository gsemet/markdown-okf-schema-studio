/**
 * Source lines of GitHub alerts and of the blocks after them. The alert pass rewrites
 * `> [!NOTE]` into a MyST admonition of a different number of lines before parsing; every block
 * must still carry the lines of the document as written, since the block editor opens, saves,
 * cuts and moves exactly the lines the page reports.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { loadEngine } from "../../../src/core/render/mystEngine";
import { repairGroupedContextTagHtml } from "../../../src/core/render/mystContextTags";
import type { MystNode } from "../../../src/core/render/mystNode";
import { renderMyst } from "../../../src/core/render/mystRenderer";
import { attribute, findElements, type HtmlElement, parseHtml, textContent } from "./dom";

const LAYOUT_FIXTURE = path.resolve(__dirname, "../../../../test/core/render/alert-fixtures/layout-two-alerts.md");

/** One mapped block: its tag, `data-line` and `data-end-line`. */
type Block = [tag: string, line: number, endLine: number | undefined];

function mappedElements(html: string): HtmlElement[] {
  return findElements(parseHtml(html), (element) => attribute(element, "data-line") !== undefined);
}

function blockOf(element: HtmlElement): Block {
  const end = attribute(element, "data-end-line");
  return [element.tagName, Number(attribute(element, "data-line")), end === undefined ? undefined : Number(end)];
}

async function blocks(source: string): Promise<Block[]> {
  return mappedElements((await renderMyst(source)).html).map(blockOf);
}

const TWO_ALERTS = [
  "> [!NOTE]",
  "> first alert line",
  "",
  "> [!NOTE]",
  "> second alert a",
  "> second alert b",
  "",
  "### Heading",
  "",
  "para",
  "",
].join("\n");

const TWO_ALERTS_BLOCKS: Block[] = [
  ["aside", 1, 2],
  ["p", 2, 2],
  ["aside", 4, 6],
  ["p", 5, 6],
  ["h3", 8, 8],
  ["p", 10, 10],
];

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-CORE-003
test("two consecutive alerts and the blocks after them carry the lines of the document", async () => {
  assert.deepEqual(await blocks(TWO_ALERTS), TWO_ALERTS_BLOCKS);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("the same document with CRLF line breaks carries the same lines", async () => {
  assert.deepEqual(await blocks(TWO_ALERTS.replaceAll("\n", "\r\n")), TWO_ALERTS_BLOCKS);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert followed by a blank line and a paragraph keeps the paragraph on its line", async () => {
  assert.deepEqual(await blocks("> [!NOTE]\n> alert body\n\nAfter paragraph.\n"), [
    ["aside", 1, 2],
    ["p", 2, 2],
    ["p", 4, 4],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("every alert type, the bold markers and a titled alert keep the lines of the document", async () => {
  const markers = [
    "> [!TIP]",
    "> [!IMPORTANT]",
    "> [!WARNING]",
    "> [!CAUTION]",
    "> [!note]",
    "> **Note**",
    "> **Important**",
    "> **Warning**",
    "> [!TIP] A custom title",
  ];
  for (const marker of markers) {
    const source = `Intro.\n\n${marker}\n> body a\n> body b\n\nAfter.\n`;
    assert.deepEqual(await blocks(source), [
      ["p", 1, 1],
      ["aside", 3, 5],
      ["p", 4, 5],
      ["p", 7, 7],
    ], marker);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert followed directly by an unquoted line keeps that line and the next blocks in place", async () => {
  assert.deepEqual(await blocks("> [!NOTE]\n> body\nAfter text.\n\nLast.\n"), [
    ["aside", 1, 2],
    ["p", 2, 2],
    ["p", 3, 3],
    ["p", 5, 5],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert at the end of a file without a final line break ends on the last line", async () => {
  assert.deepEqual(await blocks("Intro.\n\n> [!NOTE]\n> last line"), [
    ["p", 1, 1],
    ["aside", 3, 4],
    ["p", 4, 4],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-CORE-003
test("an alert after a frontmatter block carries the absolute lines of the file", async () => {
  assert.deepEqual(await blocks("---\ntitle: x\n---\n\n> [!NOTE]\n> fm body\n\nAfter.\n"), [
    ["aside", 5, 6],
    ["p", 6, 6],
    ["p", 8, 8],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("alert markers inside a fenced code block stay untouched and do not move later lines", async () => {
  const source = "```md\n> [!NOTE]\n> fenced\n```\n\n> [!TIP]\n> real\n\nAfter.\n";
  const result = await renderMyst(source);
  assert.match(result.html.replace(/<[^>]*>/gu, ""), /\[!NOTE\]/u, "the fenced marker stays literal");
  assert.deepEqual(mappedElements(result.html).map(blockOf), [
    ["code", 1, 4],
    ["aside", 6, 7],
    ["p", 7, 7],
    ["p", 9, 9],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert inside a list item keeps the lines of the item, the alert and the next blocks", async () => {
  assert.deepEqual(await blocks("- item\n\n  > [!NOTE]\n  > inside list\n\n- next\n\nAfter.\n"), [
    ["ul", 1, 7],
    ["li", 1, 4],
    ["p", 1, 1],
    ["aside", 3, 4],
    ["p", 4, 4],
    ["li", 6, 7],
    ["p", 6, 6],
    ["p", 8, 8],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a quote nested in an alert (no nested alert) keeps its lines", async () => {
  assert.deepEqual(await blocks("> [!NOTE]\n> outer\n> > [!TIP]\n> > inner\n\nAfter.\n"), [
    ["aside", 1, 4],
    ["p", 2, 2],
    ["blockquote", 3, 4],
    ["p", 3, 4],
    ["p", 6, 6],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert inside a grid card keeps the lines of the grid, the card, the alert and the next blocks", async () => {
  const source = ":::::{grid} 1\n::::{grid-item-card} Title\n> [!NOTE]\n> in card\n\n::::\n:::::\n\nAfter.\n";
  assert.deepEqual(await blocks(source), [
    ["div", 1, 7],
    ["div", 2, 6],
    ["aside", 3, 4],
    ["p", 4, 4],
    ["p", 9, 9],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert inside a tab item keeps the lines of the tab set, its panels and the next blocks", async () => {
  const source = [
    ":::::{tab-set}",
    "::::{tab-item} A",
    "> [!NOTE]",
    "> in tab",
    "",
    "::::",
    "::::{tab-item} B",
    "B body",
    "::::",
    ":::::",
    "",
    "After.",
    "",
  ].join("\n");
  assert.deepEqual(await blocks(source), [
    ["div", 1, 10],
    ["div", 2, 6],
    ["div", 7, 9],
    ["p", 12, 12],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert between context tags keeps the lines of the tag group, the alert and the next blocks", async () => {
  assert.deepEqual(await blocks("<example-ctx>\n\n> [!NOTE]\n> Grouped alert.\n\n</example-ctx>\n\nAfter.\n"), [
    ["aside", 1, 6],
    ["aside", 3, 4],
    ["p", 4, 4],
    ["p", 8, 8],
  ]);
  // Without blank lines the parser keeps the tags and the alert as one raw HTML block.
  assert.deepEqual(await blocks("<example-ctx>\n> [!NOTE]\n> Grouped alert.\n\n</example-ctx>\n\nAfter.\n"), [
    ["aside", 1, 5],
    ["aside", 2, 3],
    ["p", 3, 3],
    ["p", 7, 7],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a context tag group re-parsed from raw HTML maps the alert of its body to the lines of the block", async () => {
  const { mystParse } = await loadEngine();
  const root: MystNode = {
    type: "root",
    children: [{
      type: "html",
      value: "<example-ctx>\n> [!NOTE]\n> body\n\nPara\n</example-ctx>",
      position: { start: { line: 10 }, end: { line: 15 } },
    }],
  };
  repairGroupedContextTagHtml(root, mystParse);
  const lines: Array<[string, number | undefined, number | undefined]> = [];
  const visit = (node: MystNode): void => {
    if (node.type === "mystDirective" || node.type === "paragraph") {
      lines.push([node.type, node.position?.start?.line, node.position?.end?.line]);
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  assert.deepEqual(lines, [
    ["mystDirective", 11, 12],
    ["paragraph", 12, 12],
    ["paragraph", 14, 14],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-CORE-003
test("the document with an important alert then a note alert maps every block to its own lines", async () => {
  const source = fs.readFileSync(LAYOUT_FIXTURE, "utf8");
  const sourceLines = source.split("\n");
  const html = (await renderMyst(source)).html;
  const elements = mappedElements(html);
  const asides = elements.filter((element) => element.tagName === "aside").map(blockOf);
  assert.deepEqual(asides, [["aside", 22, 37], ["aside", 39, 41]]);

  const paragraphs = elements.filter((element) => element.tagName === "p").map(blockOf);
  for (const expected of [[23, 24], [26, 29], [31, 35], [37, 37], [40, 41], [45, 46]]) {
    assert.ok(
      paragraphs.some(([, line, end]) => line === expected[0] && end === expected[1]),
      `a paragraph at lines ${expected[0]}-${expected[1]}`,
    );
  }
  const heading = elements.find((element) => textContent(element) === "Section heading");
  assert.deepEqual(heading && blockOf(heading), ["h3", 43, 43]);

  // Every heading and paragraph starts on a line holding its first word and ends on a line holding
  // its last word: no block of the document is shifted.
  for (const element of elements.filter((candidate) => /^(?:h[1-6]|p)$/u.test(candidate.tagName))) {
    const words = textContent(element).match(/[A-Za-z]{3,}/gu);
    if (!words) continue;
    const [, line, end] = blockOf(element);
    assert.ok(sourceLines[line - 1]?.includes(words[0]!), `"${words[0]}" on line ${line}`);
    if (end !== undefined) {
      assert.ok(sourceLines[end - 1]?.includes(words.at(-1)!), `"${words.at(-1)}" on end line ${end}`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-MYST-096
test("an unclosed fence after an alert is reported and shown with its own line", async () => {
  const source = "> [!NOTE]\n> body\n\n```{note}\nunclosed\n\n# Heading\n\nText\n";
  const result = await renderMyst(source);
  assert.deepEqual(
    result.diagnostics.filter((diagnostic) => diagnostic.code === "unclosed-fence").map((diagnostic) => diagnostic.line),
    [4],
  );
  const opening = mappedElements(result.html).find((element) => attribute(element, "data-line") === "4");
  assert.ok(opening, "a block on the line of the unclosed fence");
  assert.equal(textContent(opening).trim(), "```{note}");
  assert.deepEqual(mappedElements(result.html).map(blockOf).filter(([tag]) => tag === "h1"), [["h1", 7, 7]]);
});
