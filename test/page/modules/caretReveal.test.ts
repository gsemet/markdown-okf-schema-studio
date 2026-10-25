import * as assert from "node:assert/strict";
import { test } from "node:test";

import { caretRectOf, caretRevealDelta } from "../../../src/page/modules/caretRect";

const stuckBar = { bottom: 190 };
const frameAbove = { top: -900 };

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
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

test("P4: the caret rect is one line high even when the rest of the text spans many lines", () => {
  // Fake mirror layout: the marker (rest of the text) starts at offsetTop 40 and covers 10 lines.
  const created: Array<Record<string, unknown>> = [];
  const element = (): Record<string, unknown> => {
    const node: Record<string, unknown> = {
      style: { setProperty: () => undefined },
      textContent: "",
      offsetLeft: 12,
      offsetTop: 40,
      offsetHeight: 200,
      getClientRects: () => [{ height: 20 }],
      appendChild: () => undefined,
      remove: () => undefined,
    };
    created.push(node);
    return node;
  };
  const document = { createElement: element, body: { appendChild: () => undefined } };
  const window = { getComputedStyle: () => ({ getPropertyValue: () => "0px" }) };
  const control = {
    value: "line 1\nline 2\nline 3\nline 4",
    selectionEnd: 7,
    scrollTop: 0,
    scrollLeft: 0,
    getBoundingClientRect: () => ({ top: 100, left: 10 }),
  };
  const rect = caretRectOf(document as never, window as never, control as never);
  assert.deepEqual(rect, { left: 22, top: 140, bottom: 160 });
  assert.equal(created.length, 2, "mirror and marker");
});
