import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewSource } from "../../../src/core/render/renderPipeline";
import { attribute, findElements, parseHtml } from "./dom";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

/**
 * The ranges the page reads to place the blank-line block of a run inside a list (CR-448): the list
 * holds the run strictly, the item before it starts on its marker line, a fence and an admonition
 * hold their own runs.
 */

const SOURCE = [
  "# T", "",
  "- a", "", "", "",
  "- b", "", "  p1", "", "", "", "  p2", "",
  "- c", "  ```", "  x", "", "", "  y", "  ```", "", "",
  ":::{note}", "- n1", "", "", "- n2", ":::", "",
].join("\n");

const rangeOf = (element: Parameters<typeof attribute>[0]): [number, number] =>
  [Number(attribute(element, "data-line")), Number(attribute(element, "data-end-line"))];

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("the source gives the five runs: between items, in an item, in a fence, ending a list and in an admonition", async () => {
  const { html } = await renderPreviewSource({
    text: SOURCE, documentPath: "/w/doc.md", workspaceRoot: "/w", restrictedReads: false,
  }, createNodeFileSystem());
  assert.equal(/data-okf-blank-runs="([^"]*)"/u.exec(html)?.[1], "5-6 11-12 19-19 23-23 27-27");
  const document = parseHtml(html);
  const [list] = findElements(document, (element) => element.tagName === "ul");
  assert.deepEqual(rangeOf(list!), [3, 23], "the list holds the runs between items and in an item strictly");
  const [a, b, c] = findElements(list!, (element) => element.tagName === "li");
  assert.deepEqual(rangeOf(a!), [3, 6], "the item above a run between items ends on the run's last line");
  assert.deepEqual(rangeOf(b!), [7, 14], "an item holds its inner run strictly");
  assert.deepEqual(rangeOf(c!), [15, 23], "the last item reaches the end of the run that ends the list");
  const [code] = findElements(document, (element) => element.tagName === "code" && attribute(element, "data-line") === "16");
  assert.deepEqual(rangeOf(code!), [16, 21], "the fence holds its blank lines");
  const [aside] = findElements(document, (element) => element.tagName === "aside");
  assert.deepEqual(rangeOf(aside!), [24, 29], "the admonition is the top-level holder of the run in its list");
});
