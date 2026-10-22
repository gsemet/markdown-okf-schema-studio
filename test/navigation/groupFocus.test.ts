import * as assert from "node:assert/strict";
import { test } from "node:test";

import { focusGroupCommand } from "../../src/navigation/groupFocus";

test("a group position that exists maps to its focus command", () => {
  assert.equal(focusGroupCommand(1, 2), "workbench.action.focusFirstEditorGroup");
  assert.equal(focusGroupCommand(2, 2), "workbench.action.focusSecondEditorGroup");
  assert.equal(focusGroupCommand(3, 3), "workbench.action.focusThirdEditorGroup");
});

test("a position past the last group gets no command, because the command would create a group", () => {
  // The user's group moved from position 3 to 2 when the empty preview group closed.
  assert.equal(focusGroupCommand(3, 2), undefined);
  assert.equal(focusGroupCommand(1, 0), undefined);
});

test("positions outside the supported range or not known get no command", () => {
  assert.equal(focusGroupCommand(undefined, 3), undefined);
  assert.equal(focusGroupCommand(0, 3), undefined);
  assert.equal(focusGroupCommand(9, 9), undefined);
  assert.equal(focusGroupCommand(1.5, 3), undefined);
});
