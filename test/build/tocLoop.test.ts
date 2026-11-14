import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  injectToggleDelay,
  MAX_TOC_LOOP,
  MAX_TOGGLE_DELAY_MS,
  TOC_LOOP_STEP_BUDGET_MS,
  TOC_LOOP_DEADLINE_CEILING_MS,
  tocLoopControl,
  tocLoopDeadlineLine,
  tocLoopDeadlineMs,
  tocLoopRounds,
  tocLoopSteps,
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

test("the steps of a round default to the three that reopen the side bar, in the suite's order", () => {
  assert.deepEqual(tocLoopSteps({}), ["readme-html", "toc", "myst-blocks"]);
  assert.deepEqual(tocLoopSteps({ STUDIO_TOC_LOOP_STEPS: "  " }), ["readme-html", "toc", "myst-blocks"]);
  assert.deepEqual(tocLoopSteps({ STUDIO_TOC_LOOP_STEPS: " toc , myst-blocks" }), ["toc", "myst-blocks"]);
  assert.deepEqual(tocLoopSteps({ STUDIO_TOC_LOOP_STEPS: "toc,toc" }), ["toc", "toc"]);
});

test("a bad step list is a configuration error", () => {
  for (const value of ["toc,", ",toc", "toc,,toc", "scroll", "toc;myst-blocks", "toc,toc,toc,toc,toc,toc,toc"]) {
    assert.throws(() => tocLoopSteps({ STUDIO_TOC_LOOP_STEPS: value }), /STUDIO_TOC_LOOP_STEPS/u, value);
  }
});

test("the side bar control is 0, 1 or empty", () => {
  assert.equal(tocLoopControl({}), false);
  assert.equal(tocLoopControl({ STUDIO_TOC_LOOP_CONTROL: "" }), false);
  assert.equal(tocLoopControl({ STUDIO_TOC_LOOP_CONTROL: "0" }), false);
  assert.equal(tocLoopControl({ STUDIO_TOC_LOOP_CONTROL: " 1 " }), true);
  for (const value of ["2", "true", "yes", "-1"]) {
    assert.throws(() => tocLoopControl({ STUDIO_TOC_LOOP_CONTROL: value }), /STUDIO_TOC_LOOP_CONTROL/u, value);
  }
});

test("the launch deadline follows the rounds and the steps and fits 40 rounds of three steps", () => {
  assert.equal(tocLoopDeadlineMs(1, 1), 2 * 60_000 + TOC_LOOP_STEP_BUDGET_MS);
  assert.equal(tocLoopDeadlineMs(40, 3), 2 * 60_000 + 120 * TOC_LOOP_STEP_BUDGET_MS);
  assert.ok(tocLoopDeadlineMs(MAX_TOC_LOOP, 3) < TOC_LOOP_DEADLINE_CEILING_MS, "40 rounds of 3 steps are not capped");
  // Under the 35-minute step of the workflow.
  assert.ok(TOC_LOOP_DEADLINE_CEILING_MS < 35 * 60_000);
  assert.equal(tocLoopDeadlineMs(40, 6), TOC_LOOP_DEADLINE_CEILING_MS);
});

test("the deadline line names its origin and says when it is capped", () => {
  assert.equal(tocLoopDeadlineLine(1_000, 5, ["toc"], true), "toc-loop: launch deadline 1000 ms (STUDIO_LAUNCH_TIMEOUT_MS)");
  assert.equal(tocLoopDeadlineLine(1_320_000, 40, ["a", "b", "c"], false),
    "toc-loop: launch deadline 1320000 ms (40 rounds x 3 steps, ceiling 1800000 ms)");
  assert.match(tocLoopDeadlineLine(1_800_000, 40, ["a", "b", "c", "d", "e", "f"], false), /; capped: /u);
});
