import * as assert from "node:assert/strict";
import { test } from "node:test";

import { countRefUses, isValidLabelName, renameLabelLine } from "../../../src/core/mapping/labelRename";

function apply(text: string, line: number, oldName: string, newName: string): string | undefined {
  const edit = renameLabelLine(text, line, oldName, newName);
  return edit ? text.slice(0, edit.start) + edit.text + text.slice(edit.end) : undefined;
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-038
test("label names follow the MyST pattern and the length limit", () => {
  for (const good of ["a", "intro", "A1", "sec_2.x:y-z", "x".repeat(100)]) {
    assert.equal(isValidLabelName(good), true, good);
  }
  for (const bad of ["", "-a", "_a", ".a", "a b", "a)", "a=", "é", "x".repeat(101), "a\n", 5, undefined]) {
    assert.equal(isValidLabelName(bad), false, String(bad));
  }
});

test("renames only the label line and keeps everything else", () => {
  assert.equal(apply("(old)=\nText {ref}`old`\n", 1, "old", "new"), "(new)=\nText {ref}`old`\n");
  assert.equal(apply("# T\n\n(old)=\nPara\n", 3, "old", "new"), "# T\n\n(new)=\nPara\n");
  assert.equal(apply("(old)=", 1, "old", "new"), "(new)=");
});

test("keeps CRLF line endings and surrounding whitespace", () => {
  assert.equal(apply("a\r\n(old)=\r\nb\r\n", 2, "old", "new"), "a\r\n(new)=\r\nb\r\n");
  assert.equal(apply("  (old)=  \r\nb", 1, "old", "new"), "  (new)=  \r\nb");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-045
test("refuses a line that is not exactly the old label, never guessing another line", () => {
  const text = "(other)=\n(old)=\nPara\n";
  assert.equal(renameLabelLine(text, 1, "old", "new"), undefined);
  assert.equal(renameLabelLine(text, 3, "old", "new"), undefined);
  assert.equal(renameLabelLine(text, 4, "old", "new"), undefined);
  assert.equal(renameLabelLine(text, 99, "old", "new"), undefined);
  assert.equal(renameLabelLine(text, 0, "old", "new"), undefined);
  assert.equal(renameLabelLine("(old)= trailing\n", 1, "old", "new"), undefined);
  assert.equal(renameLabelLine("(old)=\n", 1, "old", "bad name"), undefined);
  assert.equal(renameLabelLine("(old)=\n", 1, "old", ""), undefined);
});

test("counts {ref} uses with and without a title, not other roles or names", () => {
  const text = [
    "{ref}`old` and {ref}`Some text <old>` and {ref}`old`",
    "{doc}`old` {ref}`older` {ref}`x <older>` {ref}`oldx`",
    "(old)=",
  ].join("\n");
  assert.equal(countRefUses(text, "old"), 3);
  assert.equal(countRefUses(text, "older"), 2);
  assert.equal(countRefUses(text, "missing"), 0);
  assert.equal(countRefUses("{ref}`a.b` {ref}`aXb`", "a.b"), 1);
  assert.equal(countRefUses(text, "bad name"), 0);
});
