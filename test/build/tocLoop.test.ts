import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  injectToggleDelay,
  MAX_TOC_LOOP,
  MAX_TOGGLE_DELAY_MS,
  tocLoopRounds,
  tocLoopSummary,
  toggleDelayMaxMs,
} from "../shared/tocLoop";

test("the toc loop knobs default to one round and no delay", () => {
  assert.equal(tocLoopRounds({}), 1);
  assert.equal(tocLoopRounds({ STUDIO_TOC_LOOP: " " }), 1);
  assert.equal(tocLoopRounds({ STUDIO_TOC_LOOP: " 30 " }), 30);
  assert.equal(toggleDelayMaxMs({}), 0);
  assert.equal(toggleDelayMaxMs({ STUDIO_TOGGLE_DELAY_MS: "300" }), 300);
});

test("the toc loop knobs reject values out of range", () => {
  for (const value of ["0", "-1", "1.5", "abc", String(MAX_TOC_LOOP + 1)]) {
    assert.throws(() => tocLoopRounds({ STUDIO_TOC_LOOP: value }), /STUDIO_TOC_LOOP/u, value);
  }
  for (const value of ["-5", "x", String(MAX_TOGGLE_DELAY_MS + 1)]) {
    assert.throws(() => toggleDelayMaxMs({ STUDIO_TOGGLE_DELAY_MS: value }), /STUDIO_TOGGLE_DELAY_MS/u, value);
  }
});

test("the injected delay is zero when off and bounded when on", async () => {
  assert.equal(await injectToggleDelay({}), 0);
  const loop = { STUDIO_REAL_INPUT_SCENARIO: "toc-loop" };
  assert.equal(await injectToggleDelay({ ...loop, STUDIO_TOGGLE_DELAY_MS: "10" }, () => 0.999), 10);
  assert.equal(await injectToggleDelay({ ...loop, STUDIO_TOGGLE_DELAY_MS: "10" }, () => 0), 0);
  // A stray variable outside the toc-loop scenario never delays anything.
  assert.equal(await injectToggleDelay({ STUDIO_TOGGLE_DELAY_MS: "10" }, () => 0.999), 0);
  assert.equal(await injectToggleDelay({ STUDIO_REAL_INPUT_SCENARIO: "stress", STUDIO_TOGGLE_DELAY_MS: "10" }, () => 0.999), 0);
});

test("the summary counts clean and failed rounds", () => {
  assert.equal(tocLoopSummary({ rounds: 60, passed: 58, failed: 2, failures: [] }), "toc-loop: 60 round(s), 58 clean, 2 failed");
});
