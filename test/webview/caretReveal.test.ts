import * as assert from "node:assert/strict";
import { test } from "node:test";

import { caretRevealDelta } from "../../src/webview/caretRect";

const stuckBar = { bottom: 190 };
const frameAbove = { top: -900 };

test("P4: a caret under the stuck palette is scrolled down to just below it", () => {
  // Caret line at y 120 is under the bar (bottom 190): scroll up by 70 (negative) to land flush under it.
  assert.equal(caretRevealDelta({ top: 120, bottom: 140 }, stuckBar, frameAbove, 900), -70);
  assert.equal(caretRevealDelta({ top: -30, bottom: -10 }, stuckBar, frameAbove, 900), -220);
});

test("P4: a caret below the viewport is brought back in", () => {
  assert.equal(caretRevealDelta({ top: 880, bottom: 900 }, stuckBar, frameAbove, 900), 8);
});

test("P4: a clear caret, or a palette that is not stuck, needs no scroll", () => {
  assert.equal(caretRevealDelta({ top: 400, bottom: 420 }, stuckBar, frameAbove, 900), 0);
  assert.equal(caretRevealDelta({ top: 190, bottom: 210 }, stuckBar, frameAbove, 900), 0, "touching the bar is clear");
  // Palette still above the frame (bar.bottom <= frame.top): the caret is in the frame, below it.
  assert.equal(caretRevealDelta({ top: 120, bottom: 140 }, { bottom: 100 }, { top: 103 }, 900), 0);
  assert.equal(caretRevealDelta({ top: Number.NaN, bottom: 1 }, stuckBar, frameAbove, 900), 0);
});
