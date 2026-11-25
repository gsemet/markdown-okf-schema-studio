/**
 * Tests of the jump signal rules (CR 456): which selection changes of a Markdown text editor are
 * jumps and which are the reader's cursor moves.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { jumpVerdict, type SelectionFacts } from "../../../src/core/navigation/jumpSignal";

const base: SelectionFacts = {
  changeKind: "command",
  selectionCount: 1,
  firstLine: 41,
  target: { kind: "file", eligible: true },
  matchedStudioSelection: false,
};

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186#S1
test("a command selection of one range in a Markdown file is a jump to its 1-based line", () => {
  assert.deepEqual(jumpVerdict(base), { jump: true, line: 42 });
  assert.deepEqual(jumpVerdict({ ...base, firstLine: 0 }), { jump: true, line: 1 });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-190#S2
test("keyboard, mouse and kindless selection changes are never jumps", () => {
  for (const changeKind of ["keyboard", "mouse", "none"] as const) {
    assert.deepEqual(jumpVerdict({ ...base, changeKind }), { jump: false }, changeKind);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186#S2
test("several selections, a selection Studio asked for and a non-Markdown target are not jumps", () => {
  assert.deepEqual(jumpVerdict({ ...base, selectionCount: 2 }), { jump: false });
  assert.deepEqual(jumpVerdict({ ...base, selectionCount: 0 }), { jump: false });
  assert.deepEqual(jumpVerdict({ ...base, matchedStudioSelection: true }), { jump: false });
  assert.deepEqual(jumpVerdict({ ...base, target: { kind: "file", eligible: false } }), { jump: false });
  assert.deepEqual(jumpVerdict({ ...base, target: { kind: "other" } }), { jump: false });
  assert.deepEqual(jumpVerdict({ ...base, firstLine: -1 }), { jump: false });
  assert.deepEqual(jumpVerdict({ ...base, firstLine: 1.5 }), { jump: false });
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-187#S1
test("a diff side is a jump when the diff has an eligible real file, whichever side holds the selection", () => {
  const side = (onRealSide: boolean, realFileEligible = true): SelectionFacts =>
    ({ ...base, target: { kind: "diff-side", realFileEligible, onRealSide } });
  assert.deepEqual(jumpVerdict(side(true)), { jump: true, line: 42 });
  assert.deepEqual(jumpVerdict(side(false)), { jump: true, line: 42 });
  assert.deepEqual(jumpVerdict(side(true, false)), { jump: false });
});
