import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../../src/page/modules/editActions";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

const registry = createEditActions([], createMarkdownTableTools());

/** `[` and `]` mark a selection, `|` a caret; `undefined` when the action returns no edit. */
function run(id: string, input: string): string | undefined {
  const caret = input.indexOf("|");
  const start = caret !== -1 ? caret : input.indexOf("[");
  const end = caret !== -1 ? caret : input.indexOf("]") - 1;
  const value = input.replace("|", "").replace("[", "").replace("]", "");
  const edit = registry.byId.get(id)!.apply({ value, selectionStart: start, selectionEnd: end, scope: "block" });
  if (!edit) return undefined;
  const result = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  const a = edit.selectionStart;
  const b = edit.selectionEnd;
  return a === b
    ? result.slice(0, a) + "|" + result.slice(a)
    : result.slice(0, a) + "[" + result.slice(a, b) + "]" + result.slice(b);
}

const commentCases: [string, string | undefined][] = [
  ["a|bc", "<!-- a|bc -->"],
  ["[abc]", "[<!-- abc -->]"],
  ["<!-- a|bc -->", "a|bc"],
  ["[<!-- abc -->]", "[abc]"],
  ["|", "<!-- | -->"],
  ["  |", "  <!-- | -->"],
  ["<!-- | -->", "|"],
  ["  [item]", "[  <!-- item -->]"],
  ["x\n[a\nb]\ny", "x\n[<!-- a -->\n<!-- b -->]\ny"],
  ["x\n[<!-- a -->\n<!-- b -->]\ny", "x\n[a\nb]\ny"],
  ["[a\n\nb]", "[<!-- a -->\n\n<!-- b -->]"],
  ["[a\n<!-- b -->]", "[<!-- a -->\n<!-- b -->]"],
  ["[a\n]b", "[<!-- a -->]\nb"],
  ["ab[c\nd]ef", "[<!-- abc -->\n<!-- def -->]"],
  // A TODO or THREAD comment is not what Ctrl+/ adds: it is left alone, never half-unwrapped.
  ["<!-- TODO: a|bc -->", undefined],
  ["<!-- todo a|bc -->", undefined],
  ["[a\n<!-- TODO: b -->]", "[<!-- a -->\n<!-- TODO: b -->]"],
];

for (const [input, expected] of commentCases) {
  // @tests_req SwRS-MDOKFSTUDIO-PALETTE-266
  test("editActions comment " + JSON.stringify(input), () => {
    assert.equal(run("comment", input), expected);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-266
test("the comment toggle is its own inverse and never wraps a line holding -->", () => {
  const original = "- one\n- two";
  const wrapped = run("comment", "[" + original + "]")!;
  assert.equal(wrapped, "[<!-- - one -->\n<!-- - two -->]");
  assert.equal(run("comment", wrapped), "[" + original + "]");
  assert.equal(run("comment", "a |--> b"), undefined);
});
