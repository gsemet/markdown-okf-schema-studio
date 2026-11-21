import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewSource } from "../../../src/core/render/renderPipeline";

const render = (text: string) =>
  renderPreviewSource({ text, documentPath: "/w/doc.md", workspaceRoot: "/w", restrictedReads: false });

/** The value of the host's list of runs, the last element of the rendered content. */
function runsAttribute(html: string): string | undefined {
  return /<div hidden data-okf-blank-runs="([^"]*)"><\/div>$/u.exec(html)?.[1];
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("the rendered content ends with a hidden list of the blank runs of the source", async () => {
  const { html } = await render("# Title\n\nA\n\n\n\nB\n\n\nC\n");
  assert.equal(runsAttribute(html), "4-6 8-9");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a source with no run has the list element with an empty value, and every render carries it", async () => {
  assert.equal(runsAttribute((await render("A\n\nB\n")).html), "");
  assert.equal(runsAttribute((await render("")).html), "");
  assert.equal(runsAttribute((await render("---\ntitle: x\n---\n\n\nbody\n")).html), "4-5");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("an edit changes the list: the next render of the content patch carries the new runs", async () => {
  const before = await render("A\n\n\nB\n");
  const after = await render("A\n\nB\n");
  assert.equal(runsAttribute(before.html), "2-3");
  assert.equal(runsAttribute(after.html), "");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a blank run in a code fence is not a run of the source's blocks", async () => {
  const { html } = await render("```\na\n\n\nb\n```\n");
  assert.ok(runsAttribute(html) !== undefined);
});
