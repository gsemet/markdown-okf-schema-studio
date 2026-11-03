/**
 * A `+++` line (the MyST block break) inside a container renders as text; only a root-level one
 * stays a block break. None of these inputs may throw.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { findElements, parseHtml, textContent } from "./dom";

async function paragraphs(source: string): Promise<string[]> {
  const { html } = await renderMyst(source);
  return findElements(parseHtml(html), (element) => element.tagName === "p")
    .map((element) => textContent(element).replace(/\s+/gu, " ").trim());
}

const CASES: ReadonlyArray<readonly [name: string, source: string, expected: readonly string[]]> = [
  ["a directive body", ":::{note}\na\n+++\nb\n:::", ["Note", "a", "+++", "b"]],
  ["a directive body with metadata", ":::{note}\na\n+++ {\"a\": 1}\nb\n:::", ["Note", "a", "+++ {\"a\": 1}", "b"]],
  ["a quote", "> +++", ["+++"]],
  ["a list item", "- +++", ["+++"]],
  ["an alert followed by a list item", "> [!NOTE]\n> a\n- +++", ["Note", "a", "+++"]],
  ["the end of an alert", "> [!NOTE]\n> a\n> +++", ["Note", "a", "+++"]],
];

for (const [name, source, expected] of CASES) {
  // @tests_req SwRS-MDOKFSTUDIO-MYST-101
  test(`a +++ line in ${name} renders as text`, async () => {
    assert.deepEqual(await paragraphs(source), expected);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-101
test("a +++ line at the root stays a block break", async () => {
  assert.deepEqual(await paragraphs("a\n\n+++\n\nb\n"), ["a", "b"]);
});
