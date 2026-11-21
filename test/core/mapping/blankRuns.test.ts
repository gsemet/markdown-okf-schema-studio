import * as assert from "node:assert/strict";
import { test } from "node:test";

import { blankRuns } from "../../../src/core/mapping/blankRuns";
import { isCommonMarkBlank } from "../../../src/core/mapping/blockRange";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("a CommonMark blank line holds only spaces and tabs", () => {
  assert.equal(isCommonMarkBlank(""), true);
  assert.equal(isCommonMarkBlank("  \t "), true);
  assert.equal(isCommonMarkBlank(" "), false, "a no-break space renders as a paragraph");
  assert.equal(isCommonMarkBlank(" x "), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("one blank line is the separator, two or more are a run", () => {
  assert.deepEqual(blankRuns("a\n\nb\n"), []);
  assert.deepEqual(blankRuns("a\n\n\nb\n"), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("a\n\n\n\n\nb\n\n\nc"), [{ line: 2, endLine: 5 }, { line: 7, endLine: 8 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("runs at the start and at the end of the body count, the empty line after the final break does not", () => {
  assert.deepEqual(blankRuns("\n\na\n"), [{ line: 1, endLine: 2 }]);
  assert.deepEqual(blankRuns("a\n\n\n"), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("a\n\n"), []);
  assert.deepEqual(blankRuns("a\n\n  "), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("\n\n\n"), [{ line: 1, endLine: 3 }]);
  assert.deepEqual(blankRuns(""), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("spaces and tabs are blank, a no-break space is not", () => {
  assert.deepEqual(blankRuns("a\n \n\t\nb"), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("a\n \n\nb"), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("CR LF and lone CR line endings give the same runs", () => {
  assert.deepEqual(blankRuns("a\r\n\r\n\r\nb\r\n"), [{ line: 2, endLine: 3 }]);
  assert.deepEqual(blankRuns("a\r\r\rb\r"), [{ line: 2, endLine: 3 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("the frontmatter is not part of a run, and the lines after it can be", () => {
  assert.deepEqual(blankRuns("---\ntitle: x\n\n\nkind: y\n---\nbody\n"), []);
  assert.deepEqual(blankRuns("---\ntitle: x\n---\n\n\nbody\n"), [{ line: 4, endLine: 5 }]);
  assert.deepEqual(blankRuns("---\ntitle: x\n---\nbody\n\n\nend\n"), [{ line: 5, endLine: 6 }]);
});
