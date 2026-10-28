import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness } from "./runtimeHarness";

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: the toolbar load hint plays once per panel and survives the state snapshots", () => {
  const first = createRuntimeHarness();
  first.flushFrames();
  assert.equal(first.moreRows.hidden, false, "the hint plays on a new panel");
  // The page start, its ready snapshot and a refresh each rewrite the webview state.
  assert.equal(first.getWebviewState().viewToolbarHintShown, true, "the ready snapshot kept the mark");
  first.dispatchWindow("scroll");
  first.flushFrames();
  assert.equal(first.getWebviewState().viewToolbarHintShown, true, "a scroll snapshot kept the mark");

  // A reload, a refresh or another followed document: a new page from the saved webview state.
  const second = createRuntimeHarness({ savedState: first.getWebviewState() });
  second.flushFrames();
  second.advanceTimers(5000);
  assert.equal(second.moreRows.hidden, true, "no second hint");
  assert.equal(second.getWebviewState().viewToolbarHintShown, true);
});
