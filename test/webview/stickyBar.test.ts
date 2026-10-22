import * as assert from "node:assert/strict";
import { test } from "node:test";

import { stickyBarShift } from "../../src/webview/stickyBar";

test("CR 034: a bar whose natural place is in view does not move", () => {
  assert.equal(stickyBarShift(200, 40, 0, 900), 0);
  assert.equal(stickyBarShift(4, 40, 0, 900), 0, "exactly at the gap");
  assert.equal(stickyBarShift(-10, 40, 0, 900, 0), 10, "a custom gap");
});

test("CR 034: a bar above the usable top rides down to just under it", () => {
  assert.equal(stickyBarShift(-300, 40, 60, 900), 364);
  assert.equal(stickyBarShift(10, 40, 60, 900), 54);
});

test("CR 034: the bar never goes past the bottom of its block, so it leaves with the block", () => {
  // Block bottom at 100: the bar (40 high) may end at 100, not lower.
  assert.equal(stickyBarShift(-300, 40, 60, 100), 360);
  assert.equal(stickyBarShift(10, 40, 60, 30), 0, "a block shorter than the bar never pushes it");
});

test("CR 034: unmeasurable input leaves the bar where it is", () => {
  assert.equal(stickyBarShift(Number.NaN, 40, 60, 900), 0);
  assert.equal(stickyBarShift(-300, 40, Number.NaN, 900), 0);
});
