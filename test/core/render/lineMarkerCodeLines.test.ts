import * as assert from "node:assert/strict";
import { test } from "node:test";

import { codeSpanIndex } from "../../../src/page/features/lineMarker";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElements, hasClass, parseHtml, textContent, type HtmlElement } from "./dom";
import { inlineDocument, workspaceRoot } from "./mystFeaturesSupport";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

/**
 * The line marker counts a code line back from the block's last source line (the closing fence):
 * the rendered `.myst-code-line` spans must line up with the source lines for a backtick fence, a
 * tilde fence and a `{code-block}` with options (features/lineMarker.ts, `codeSpanIndex`).
 */

// The renderer marks a block with `data-line` and `data-end-line`; the page turns them into `data-sphinx-source-*`.
const hasMapping = (element: HtmlElement): boolean => attribute(element, "data-line") !== undefined;
const codeSpans = (element: HtmlElement): HtmlElement[] =>
  findElements(element, (candidate) => candidate.tagName === "span" && hasClass(candidate, "myst-code-line"));

interface CodeBlock {
  readonly start: number;
  /** The block's last source line (the closing fence), absent for a directive that has no end line. */
  readonly end: number | undefined;
  readonly spans: HtmlElement[];
}

async function codeBlocksOf(source: string): Promise<CodeBlock[]> {
  const result = await renderPreviewDocument({
    files: createNodeFileSystem(),
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  const mapped = findElements(parseHtml(result.html), hasMapping);
  return mapped
    .filter((element) => codeSpans(element).length > 0
      && findElements(element, (candidate) => candidate !== element && hasMapping(candidate)).length === 0)
    .map((element) => ({
      start: Number(attribute(element, "data-line")),
      end: attribute(element, "data-end-line") === undefined ? undefined : Number(attribute(element, "data-end-line")),
      spans: codeSpans(element),
    }));
}

function assertSpansMatchSource(source: string, block: CodeBlock, firstLine: number): void {
  assert.notEqual(block.end, undefined, "a fence has an end line");
  const end = block.end!;
  const lines = source.split("\n");
  for (let sourceLine = firstLine; sourceLine < end; sourceLine += 1) {
    const index = codeSpanIndex(block.spans.length, end, sourceLine);
    assert.notEqual(index, undefined, `line ${sourceLine} has a span`);
    assert.equal(
      textContent(block.spans[index!]!).replace(/\n$/u, ""),
      lines[sourceLine - 1],
      `line ${sourceLine} maps to its span`,
    );
  }
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a backtick fence and a tilde fence map their lines to spans, and a code-block with options has no end line", async () => {
  const source = [
    "# Title", // 1
    "", // 2
    "```python", // 3
    "alpha = 1", // 4
    "", // 5
    "beta = 2", // 6
    "```", // 7
    "", // 8
    "~~~python", // 9
    "gamma = 3", // 10
    "delta = 4", // 11
    "~~~", // 12
    "", // 13
    "```{code-block} python", // 14
    ":linenos:", // 15
    ":caption: Example", // 16
    "", // 17
    "epsilon = 5", // 18
    "zeta = 6", // 19
    "```", // 20
    "",
  ].join("\n");
  const blocks = await codeBlocksOf(source);
  assert.equal(blocks.length, 3, "three code blocks");
  assertSpansMatchSource(source, blocks[0]!, 4);
  assertSpansMatchSource(source, blocks[1]!, 10);
  // A `{code-block}` directive carries no end line: the page cannot count back from it and the
  // marker takes the block's top (the enclosing block's top, the spec's rule for what it cannot place).
  assert.equal(blocks[2]!.start, 14);
  assert.equal(blocks[2]!.end, undefined);
  assert.equal(blocks[2]!.spans.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a fence line and a line before the first span have no span", () => {
  assert.equal(codeSpanIndex(2, 7, 7), undefined);
  assert.equal(codeSpanIndex(2, 7, 4), undefined);
  assert.equal(codeSpanIndex(2, 7, 5), 0);
  assert.equal(codeSpanIndex(2, 7, 6), 1);
});
