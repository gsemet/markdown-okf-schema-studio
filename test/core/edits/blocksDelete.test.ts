import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DELETE_INCLUDED,
  planBlocksDelete,
  planEmptiedBlockRemoval,
} from "../../../src/core/edits/sourceEdits";
import { applyTextEdits } from "../../../src/core/edits/textEdit";

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["lone CR", "\r"]] as const;

function deleted(text: string, line: number, endLine: number): string {
  const plan = planBlocksDelete(text, line, endLine);
  assert.ok("edit" in plan, JSON.stringify(plan));
  return applyTextEdits(text, [plan.edit]);
}

for (const [name, eol] of EOLS) {
  const join = (...lines: string[]): string => lines.join(eol);

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S5
  test(`${name}: planBlocksDelete takes the separator like a cut (middle, first, last)`, () => {
    const doc = join("# T", "", "First.", "", "Second.", "");
    assert.equal(deleted(doc, 3, 3), join("# T", "", "Second.", ""));
    assert.equal(deleted(doc, 1, 1), join("First.", "", "Second.", ""));
    assert.equal(deleted(doc, 5, 5), join("# T", "", "First.", ""));
    assert.equal(deleted(join("# T", "", "Only."), 3, 3), join("# T"));
    assert.equal(deleted(join("Only.", ""), 1, 1), "");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S5
  test(`${name}: planBlocksDelete drops the trailing blank lines of the span`, () => {
    const doc = join("- a", "- b", "", "Para", "");
    assert.equal(deleted(doc, 1, 3), join("Para", ""));
    assert.equal(deleted(join("Para", "", "- a", "", ""), 3, 5), join("Para", ""));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
  test(`${name}: planBlocksDelete refuses an include, the frontmatter and stale lines`, () => {
    const include = join(":::{include} other.md", ":::", "", "Para", "");
    assert.deepEqual(planBlocksDelete(include, 1, 2), { refused: DELETE_INCLUDED });
    if (eol !== "\r") {
      // A lone-CR document is not recognised as having frontmatter (known issue of SwRS-MDOKFSTUDIO-BLOCK-094).
      assert.ok("refused" in planBlocksDelete(join("---", "a: 1", "---", "", "B", ""), 2, 2));
    }
    assert.ok("refused" in planBlocksDelete(join("A", "", "B", ""), 3, 9));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S4
  test(`${name}: an emptied block is removed whether or not the autosave wrote the placeholder`, () => {
    const doc = join("# Title", "", "First.", "", "Second paragraph.", "");
    const start = doc.indexOf("First.");
    const expected = join("# Title", "", "Second paragraph.", "");
    const direct = planEmptiedBlockRemoval(doc, start, "First.", "First.", 3, 3);
    assert.ok(direct);
    assert.equal(applyTextEdits(doc, [direct]), expected);
    const autosaved = doc.replace("First.", eol);
    const afterAutosave = planEmptiedBlockRemoval(autosaved, start, eol, "First.", 3, 3);
    assert.ok(afterAutosave);
    assert.equal(applyTextEdits(autosaved, [afterAutosave]), expected);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S4
  test(`${name}: an emptied first, last, tight and loose list item leave no blank line`, () => {
    const remove = (doc: string, saved: string, original: string, line: number, endLine: number): string => {
      const start = doc.indexOf(saved);
      const edit = planEmptiedBlockRemoval(doc, start, saved, original, line, endLine);
      assert.ok(edit);
      return applyTextEdits(doc, [edit]);
    };
    assert.equal(remove(join("First.", "", "Second.", ""), "First.", "First.", 1, 1), join("Second.", ""));
    assert.equal(remove(join("First.", "", "Last.", ""), "Last.", "Last.", 3, 3), join("First.", ""));
    assert.equal(remove(join("- a", "- b", "- c", ""), "- b", "- b", 2, 2), join("- a", "- c", ""));
    assert.equal(remove(join("- a", "", "- b", "", "- c", ""), "- b", "- b", 3, 3), join("- a", "", "- c", ""));
    // A range that ends on a blank line: the blank line goes with the block.
    assert.equal(
      remove(join("- a", "- b", "", "Para", ""), join("- a", "- b"), join("- a", "- b"), 1, 3),
      join("Para", ""),
    );
  });

  test(`${name}: stale lines give no removal`, () => {
    const doc = join("A", "", "B", "");
    assert.equal(planEmptiedBlockRemoval(doc, 0, "A", "A", 3, 3), undefined);
    assert.equal(planEmptiedBlockRemoval(doc, 0, "A", "A", 9, 9), undefined);
    assert.equal(planEmptiedBlockRemoval(doc, 99, "A", "A", 1, 1), undefined);
  });
}
