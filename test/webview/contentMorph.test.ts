import * as assert from "node:assert/strict";
import { test } from "node:test";

import { planKeyedMorph } from "../../src/webview/contentMorph";

test("PERF-05: unchanged blocks are kept in place, changed and new ones come from the patch", () => {
  assert.deepEqual(planKeyedMorph(["<p>a</p>", "<p>b</p>", "<p>c</p>"], ["<p>a</p>", "<p>B</p>", "<p>c</p>"]), [0, -1, 2]);
  assert.deepEqual(planKeyedMorph(["<p>a</p>"], ["<h1>t</h1>", "<p>a</p>"]), [-1, 0], "an insertion before shifts nothing else");
  assert.deepEqual(planKeyedMorph(["<p>a</p>", "<p>b</p>"], ["<p>b</p>"]), [1], "a removed block is dropped");
});

test("PERF-05: equal blocks pair in document order and each kept node is used once", () => {
  assert.deepEqual(planKeyedMorph(["<hr>", "<p>x</p>", "<hr>"], ["<hr>", "<hr>", "<hr>"]), [0, 2, -1]);
});

test("PERF-05: nodes without a recorded key (text, nodes the page added) are never kept", () => {
  assert.deepEqual(planKeyedMorph([undefined, "<p>a</p>"], [undefined, "<p>a</p>"]), [-1, 1]);
});
