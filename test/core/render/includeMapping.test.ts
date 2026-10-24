import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst, type MystRenderContext } from "../../../src/core/render/mystRenderer";

const root = "/virtual";

function context(files: Record<string, string>): MystRenderContext {
  return {
    sourcePath: `${root}/main.md`,
    resolveInclude: (request, from) => {
      const target = path.posix.resolve(path.posix.dirname(from), request);
      const source = files[target];
      return source === undefined ? undefined : { path: target, source };
    },
  };
}

const twentyLines = Array.from({ length: 20 }, (_, index) => `Line ${index + 1}.`).join("\n\n");

/** Opening tags of mapped elements, as `[tag, line, endLine | undefined, included]`. */
function mapped(html: string): Array<[string, number, number | undefined, boolean]> {
  const result: Array<[string, number, number | undefined, boolean]> = [];
  for (const match of html.matchAll(/<(\w+)([^>]*\bdata-line="(\d+)"[^>]*)>/gu)) {
    const end = /data-end-line="(\d+)"/u.exec(match[2]);
    result.push([
      match[1],
      Number(match[3]),
      end ? Number(end[1]) : undefined,
      match[2].includes('data-sphinx-preview-included="true"'),
    ]);
  }
  return result;
}

test("included blocks map to the directive lines only", async () => {
  const main = ["# Main", "", "```{include} part.md", "```", "", "Host after."].join("\n");
  const result = await renderMyst(main, context({ [`${root}/part.md`]: twentyLines }));
  const entries = mapped(result.html);
  const included = entries.filter((entry) => entry[3]);
  assert.equal(included.length, 20);
  for (const [, line, endLine] of included) {
    assert.equal(line, 3);
    assert.equal(endLine, 4);
  }
  const host = entries.filter((entry) => !entry[3]);
  assert.deepEqual(host.map((entry) => [entry[1], entry[2]]), [[1, 1], [6, 6]]);
});

test("nested includes keep the outer directive lines and the marker", async () => {
  const files = {
    [`${root}/a.md`]: "## A\n\n```{include} b.md\n```\n\nAfter b.\n",
    [`${root}/b.md`]: twentyLines,
  };
  const main = ["Intro", "", "", "```{include} a.md", "```", "", "Tail"].join("\n");
  const result = await renderMyst(main, context(files));
  const included = mapped(result.html).filter((entry) => entry[3]);
  assert.ok(included.length > 20);
  for (const [, line, endLine] of included) {
    assert.equal(line, 4);
    assert.equal(endLine, 5);
  }
  assert.deepEqual(mapped(result.html).filter((entry) => !entry[3]).map((entry) => entry[1]), [1, 7]);
});
