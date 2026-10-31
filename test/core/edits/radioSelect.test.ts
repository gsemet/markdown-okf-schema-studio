import * as assert from "node:assert/strict";
import { test } from "node:test";

import { planRadioSelect, RADIO_GONE } from "../../../src/core/edits/sourceEdits";
import { applyTextEdits } from "../../../src/core/edits/textEdit";
import { prepareCheckboxMarkers } from "../../../src/core/render/checkboxMarkers";
import { radioMarkerColumn } from "../../../src/core/render/radioMarkers";

/** The host edit of a radio choice: the `x` moves with at most one character per option. */

const PLAN = [
  "Fix direction:",
  "",
  "- (x) A click in the margin",
  "- ( ) Alt+click on the link",
  "- ( ) Leave as is",
  "",
].join("\n");

const GROUP = [{ line: 3, column: 2 }, { line: 4, column: 2 }, { line: 5, column: 2 }];

/** The source lines an edit plan changes. */
function changedLines(before: string, after: string): number[] {
  const left = before.split("\n");
  const right = after.split("\n");
  return left.flatMap((line, index) => (line === right[index] ? [] : [index + 1]));
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("selecting an option writes (x) on it and ( ) on the old one: two characters on two lines", () => {
  const plan = planRadioSelect(PLAN, 5, 2, GROUP);
  assert.ok("edits" in plan, JSON.stringify(plan));
  assert.equal(plan.edits.length, 2);
  assert.ok(plan.edits.every((edit) => edit.end - edit.start === 1), "each edit is one character");
  const after = applyTextEdits(PLAN, plan.edits);
  assert.equal(after, PLAN.replace("- (x) A click", "- ( ) A click").replace("- ( ) Leave", "- (x) Leave"));
  assert.deepEqual(changedLines(PLAN, after), [3, 5]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("selecting the only selected option writes nothing", () => {
  assert.deepEqual(planRadioSelect(PLAN, 3, 2, GROUP), { unchanged: true });
  const upper = PLAN.replace("(x)", "(X)");
  assert.deepEqual(planRadioSelect(upper, 3, 2, GROUP), { unchanged: true }, "(X) is already selected");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("with two selected options, a choice normalises the group in one plan", () => {
  const two = PLAN.replace("- ( ) Leave", "- (X) Leave");
  const onSelected = planRadioSelect(two, 5, 2, GROUP);
  assert.ok("edits" in onSelected);
  assert.equal(applyTextEdits(two, onSelected.edits), two.replace("- (x) A click", "- ( ) A click"));
  const onOther = planRadioSelect(two, 4, 2, GROUP);
  assert.ok("edits" in onOther);
  const after = applyTextEdits(two, onOther.edits);
  assert.equal(after, PLAN.replace("- (x) A click", "- ( ) A click").replace("- ( ) Alt", "- (x) Alt"));
  assert.deepEqual(changedLines(two, after), [3, 4, 5], "both old selections are cleared");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a group with no selection gets one (x), and CRLF files keep their offsets", () => {
  const crlf = "- ( ) a\r\n- ( ) b\r\n";
  const plan = planRadioSelect(crlf, 2, 2, [{ line: 1, column: 2 }, { line: 2, column: 2 }]);
  assert.ok("edits" in plan);
  assert.equal(applyTextEdits(crlf, plan.edits), "- ( ) a\r\n- (x) b\r\n");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a group whose markers moved, an unknown target or a repeated option is refused", () => {
  const moved = PLAN.replace("- ( ) Leave", "Leave");
  assert.deepEqual(planRadioSelect(moved, 4, 2, GROUP), { refused: RADIO_GONE });
  assert.deepEqual(planRadioSelect(PLAN, 4, 3, GROUP), { refused: RADIO_GONE }, "target outside the group");
  assert.deepEqual(planRadioSelect(PLAN, 4, 2, [...GROUP, { line: 9, column: 2 }]), { refused: RADIO_GONE });
  assert.deepEqual(planRadioSelect(PLAN, 4, 2, [GROUP[0], GROUP[1], GROUP[1]]), { refused: RADIO_GONE });
  assert.deepEqual(planRadioSelect(PLAN, 1, 0, [{ line: 1, column: 0 }, GROUP[0]]), { refused: RADIO_GONE },
    "a line that is not a radio item");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a radio marker starts a list item and is followed by a space or a tab", () => {
  assert.equal(radioMarkerColumn("- ( ) a"), 2);
  assert.equal(radioMarkerColumn("  * (x) a"), 4);
  assert.equal(radioMarkerColumn("10. (X)\ta"), 4);
  assert.equal(radioMarkerColumn("> 1) ( ) quoted"), 5);
  assert.equal(radioMarkerColumn("- (x)a"), -1, "no space after the marker");
  assert.equal(radioMarkerColumn("- ( )"), -1, "nothing after the marker");
  assert.equal(radioMarkerColumn("( ) not an item"), -1);
  assert.equal(radioMarkerColumn("- (y) other"), -1);
  const prepared = prepareCheckboxMarkers("- ( ) a [ ] box\n- (x) b\nSee (x) here.\n", 3);
  assert.deepEqual(prepared.markers.map(({ line, column, checked, kind }) => ({ line, column, checked, kind })), [
    { line: 3, column: 2, checked: false, kind: "radio" },
    { line: 3, column: 8, checked: false, kind: undefined },
    { line: 4, column: 2, checked: true, kind: "radio" },
  ]);
  assert.match(prepared.text, /See \(x\) here\./u, "a marker in prose is not a radio marker");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("positions that are not one group of consecutive radio items of one list are refused", () => {
  const two = "Approach:\n\n- (x) one\n- ( ) two\n\nTests:\n\n- (x) unit\n- ( ) e2e\n";
  const forged = [{ line: 3, column: 2 }, { line: 4, column: 2 }, { line: 8, column: 2 }, { line: 9, column: 2 }];
  assert.deepEqual(planRadioSelect(two, 4, 2, forged), { refused: RADIO_GONE }, "two groups split by a blank line");
  assert.deepEqual(planRadioSelect(two, 4, 2, [{ line: 4, column: 2 }, { line: 3, column: 2 }]), { refused: RADIO_GONE },
    "lines out of order");
  const heading = "- (x) a\n- ( ) b\n# Heading\n- (x) c\n- ( ) d\n";
  assert.deepEqual(planRadioSelect(heading, 2, 2, [{ line: 1, column: 2 }, { line: 2, column: 2 }, { line: 4, column: 2 }]),
    { refused: RADIO_GONE }, "a heading between two options");
  const otherList = "- (x) a\n- ( ) b\n* (x) c\n";
  assert.deepEqual(planRadioSelect(otherList, 2, 2, [{ line: 1, column: 2 }, { line: 2, column: 2 }, { line: 3, column: 2 }]),
    { refused: RADIO_GONE }, "another kind of bullet is another list");
  const plainItem = "- (x) a\n- plain\n- ( ) b\n";
  assert.deepEqual(planRadioSelect(plainItem, 3, 2, [{ line: 1, column: 2 }, { line: 3, column: 2 }]),
    { refused: RADIO_GONE }, "a plain item between two options");
  const nested = "- (x) outer one\n  - ( ) inner one\n  - (x) inner two\n- ( ) outer two\n";
  assert.deepEqual(planRadioSelect(nested, 2, 4, [{ line: 1, column: 2 }, { line: 2, column: 4 }]),
    { refused: RADIO_GONE }, "options of two nesting levels");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("one group is accepted across nested lists, lazy lines, quotes and two-digit ordered markers", () => {
  const nested = "- (x) outer one\n  - ( ) inner one\n  - (x) inner two\n- ( ) outer two\n";
  const outer = planRadioSelect(nested, 4, 2, [{ line: 1, column: 2 }, { line: 4, column: 2 }]);
  assert.ok("edits" in outer, JSON.stringify(outer));
  assert.equal(applyTextEdits(nested, outer.edits), "- ( ) outer one\n  - ( ) inner one\n  - (x) inner two\n- (x) outer two\n");
  const lazy = "- (x) a\nlazy text\n- ( ) b\n";
  assert.ok("edits" in planRadioSelect(lazy, 3, 2, [{ line: 1, column: 2 }, { line: 3, column: 2 }]));
  const quoted = "> - (x) a\n> - ( ) b\n";
  assert.ok("edits" in planRadioSelect(quoted, 2, 4, [{ line: 1, column: 4 }, { line: 2, column: 4 }]));
  const ordered = "9. (x) nine\n10. ( ) ten\n";
  assert.ok("edits" in planRadioSelect(ordered, 2, 4, [{ line: 1, column: 3 }, { line: 2, column: 4 }]));
});
