import * as assert from "node:assert/strict";
import { test } from "node:test";

import { countRefUses, renameLabelLine } from "../../../src/core/mapping/labelRename";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

// @tests_req SwRS-MDOKFSTUDIO-MYST-045#S3
// @tests_req SwRS-MDOKFSTUDIO-MYST-045#S4
test("the edit covers exactly the label, whatever whitespace is on each side and whatever the line ending", () => {
  assert.deepEqual(renameLabelLine("(old)=", 1, "old", "new"), { start: 0, end: 6, text: "(new)=" });
  assert.deepEqual(renameLabelLine("   (old)= ", 1, "old", "new"), { start: 3, end: 9, text: "(new)=" }, "more space before than after");
  assert.deepEqual(renameLabelLine(" (old)=   ", 1, "old", "new"), { start: 1, end: 7, text: "(new)=" }, "more space after than before");
  assert.deepEqual(renameLabelLine("x\n(old)=\r\ny", 2, "old", "new"), { start: 2, end: 8, text: "(new)=" }, "the CR is not part of the line");
  assert.deepEqual(renameLabelLine("x\n(old)=\ny", 2, "old", "new"), { start: 2, end: 8, text: "(new)=" }, "an LF line ends at its LF");
  assert.deepEqual(renameLabelLine("x\n(old)=", 2, "old", "new"), { start: 2, end: 8, text: "(new)=" }, "the last line ends with the text");
  assert.deepEqual(renameLabelLine("\n\n(old)=\n", 3, "old", "new"), { start: 2, end: 8, text: "(new)=" }, "empty lines before count");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-045#S1
// @tests_req SwRS-MDOKFSTUDIO-MYST-045#S2
test("a line number counts the lines before it, and a name or a line that is not valid refuses the rename", () => {
  assert.equal(renameLabelLine("(old)=\n", 2, "old", "new"), undefined, "the empty last line");
  assert.equal(renameLabelLine("a\nb\n(old)=", 2, "old", "new"), undefined);
  assert.deepEqual(renameLabelLine("a\nb\n(old)=", 3, "old", "new"), { start: 4, end: 10, text: "(new)=" });
  assert.equal(renameLabelLine("(old)=", 1.5, "old", "new"), undefined);
  assert.equal(renameLabelLine("(old)=", Number.NaN, "old", "new"), undefined);
  assert.equal(renameLabelLine("(old)=", -1, "old", "new"), undefined);
  assert.equal(renameLabelLine("(old)=", 1, "bad name", "new"), undefined, "an invalid old name");
  assert.equal(renameLabelLine("(bad name)=", 1, "bad name", "new"), undefined);
  assert.equal(renameLabelLine("(old)=", 1, "old", "bad name"), undefined, "an invalid new name");
  assert.equal(renameLabelLine("(old)=", 1, "old", ""), undefined);
  assert.equal(renameLabelLine("(old)=", 1, "", "new"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-038#S2
// @tests_req SwRS-MDOKFSTUDIO-MYST-038#S6
test("uses of a label are counted only for a valid name, and only for the ref role", () => {
  assert.equal(countRefUses("{ref}`a` and {ref}`a`", "a"), 2);
  assert.equal(countRefUses("{ref}`a`", "a b"), 0, "an invalid name has no uses");
  assert.equal(countRefUses("{ref}` `", ""), 0);
  assert.equal(countRefUses("{ref}`text <a>` {ref}`a`", "a"), 2);
  assert.equal(countRefUses("{ref}`b`", "a"), 0);
  assert.equal(countRefUses("no uses", "a"), 0);
});
