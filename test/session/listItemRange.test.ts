/**
 * The precondition of the list item handles: with the real renderer, the items of a list inside a
 * quote, a GitHub alert, a MyST admonition and two nested admonitions carry their source lines, and
 * `createMappedBlocks(...).listRange(list)` covers the list's own lines only, never the container's
 * marker, lead or tail lines.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMappedBlocks } from "../../src/page/features/mappedBlocks";
import { renderMappedPage, type MappedElement } from "./mappedHtmlDom";

const SOURCE_FILE = "/w/spec.md";
const DOCUMENT_ID = "file:///w/spec.md";

/** The outer list of the page (the first list not inside a list item) and its range. */
async function outerList(lines: string[]) {
  const page = await renderMappedPage(lines.join("\n"), SOURCE_FILE, DOCUMENT_ID);
  const blocks = createMappedBlocks(page.document as never, { activeSourceFile: SOURCE_FILE, documentId: DOCUMENT_ID } as never);
  const lists = page.document.querySelectorAll("ul, ol");
  const list = lists.find((candidate) => !candidate.parentElement?.closest("li"));
  assert.ok(list, "the page has a list");
  const items = list.children.filter((child) => child.tagName === "LI");
  const itemLines = items.map((item) => [
    Number(item.getAttribute("data-sphinx-source-line")), Number(item.getAttribute("data-sphinx-source-end-line")),
  ]);
  const inner = list.querySelectorAll("ul, ol")[0];
  return {
    list,
    itemLines,
    range: blocks.listRange(list as never),
    innerRange: inner ? blocks.listRange(inner as never) : undefined,
    container: list.closest("blockquote, aside") as MappedElement | null,
  };
}

const CASES: Array<{ name: string; lines: string[]; items: number[][]; range: [number, number]; inner: [number, number] }> = [
  {
    name: "a plain quote",
    lines: ["Intro.", "", "> - Alpha", "> - Beta", ">   - Beta one", ">   - Beta two", "> - Gamma", "", "After.", ""],
    items: [[3, 3], [4, 6], [7, 7]], range: [3, 7], inner: [5, 6],
  },
  {
    name: "a GitHub alert",
    lines: [
      "Intro.", "", "> [!NOTE]", "> Lead text.", ">", "> - Alpha", "> - Beta", ">   - Beta one", ">   - Beta two",
      "> - Gamma", ">", "> Tail text.", "", "After.", "",
    ],
    items: [[6, 6], [7, 9], [10, 11]], range: [6, 11], inner: [8, 9],
  },
  {
    name: "a MyST admonition",
    lines: [
      "Intro.", "", "```{note}", "Lead text.", "", "- Alpha", "- Beta", "  - Beta one", "  - Beta two", "- Gamma", "",
      "Tail text.", "```", "", "After.", "",
    ],
    items: [[6, 6], [7, 9], [10, 11]], range: [6, 11], inner: [8, 9],
  },
  {
    name: "a MyST admonition with a colon fence",
    lines: [
      "Intro.", "", ":::{note}", "Lead text.", "", "- Alpha", "- Beta", "  - Beta one", "  - Beta two", "- Gamma", "",
      "Tail text.", ":::", "", "After.", "",
    ],
    items: [[6, 6], [7, 9], [10, 11]], range: [6, 11], inner: [8, 9],
  },
  {
    name: "two nested MyST admonitions",
    lines: [
      "Intro.", "", "````{note}", "Outer text.", "", "```{warning}", "Inner text.", "", "- Alpha", "- Beta",
      "  - Beta one", "  - Beta two", "- Gamma", "", "Inner tail.", "```", "", "Outer tail.", "````", "", "After.", "",
    ],
    items: [[9, 9], [10, 12], [13, 14]], range: [9, 14], inner: [11, 12],
  },
];

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262#S5
test("the items of a list in a quote, an alert and admonitions carry their lines and the list range is the list's own", async () => {
  for (const { name, lines, items, range, inner } of CASES) {
    const found = await outerList(lines);
    assert.deepEqual(found.itemLines, items, `${name}: each item carries its source lines`);
    assert.deepEqual(found.range, { line: range[0], endLine: range[1] }, `${name}: the list range`);
    assert.deepEqual(found.innerRange, { line: inner[0], endLine: inner[1] }, `${name}: the nested list range`);
    assert.ok(found.container, `${name}: the list sits in its container`);
    const containerLine = Number(found.container.getAttribute("data-sphinx-source-line"));
    const containerEnd = Number(found.container.getAttribute("data-sphinx-source-end-line"));
    // The range never reaches the container's marker line, lead text or tail text.
    const covered = lines.slice(range[0] - 1, range[1]);
    assert.ok(covered.every((line) => !/\[!NOTE\]|Lead text|Tail text|Inner text|Outer|\{note\}|\{warning\}/u.test(line)),
      `${name}: only the list's lines are covered`);
    assert.ok(containerLine <= range[0] && range[1] <= containerEnd, `${name}: inside the container's lines`);
  }
});
