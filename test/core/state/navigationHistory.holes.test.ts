import * as assert from "node:assert/strict";
import { test } from "node:test";

import { NAVIGATION_HISTORY_CAP, NavigationHistory } from "../../../src/core/state/navigationHistory";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-059
test("a history restored with no current place cannot go forward, even with entries to come", () => {
  const history = new NavigationHistory();
  history.restore({ entries: [{ uri: "a", line: 1 }, { uri: "b", line: 2 }], index: -1 });
  assert.equal(history.canForward(), false);
  assert.equal(history.forward(), undefined);
  assert.equal(history.canBack(), false);
  history.restore({ entries: [{ uri: "a", line: 1 }, { uri: "b", line: 2 }], index: 0 });
  assert.equal(history.canForward(), true);
  assert.deepEqual(history.forward(), { uri: "b", line: 2 });
  assert.equal(history.canForward(), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-059
test("the oldest place goes only when the cap is passed, never at exactly the cap", () => {
  const history = new NavigationHistory();
  for (let line = 1; line <= NAVIGATION_HISTORY_CAP; line += 1) history.push({ uri: "d", line });
  assert.equal(history.snapshot().entries.length, NAVIGATION_HISTORY_CAP);
  assert.equal(history.snapshot().entries[0].line, 1, "the first place is kept at exactly the cap");
  history.push({ uri: "d", line: NAVIGATION_HISTORY_CAP + 1 });
  const { entries, index } = history.snapshot();
  assert.equal(entries.length, NAVIGATION_HISTORY_CAP);
  assert.equal(entries[0].line, 2);
  assert.equal(index, NAVIGATION_HISTORY_CAP - 1);
});
