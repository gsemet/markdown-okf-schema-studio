import * as assert from "node:assert/strict";
import { test } from "node:test";

import { flushRefusalMessage, LatestRequest, waitForAnswer, waitForSettled } from "../../../src/core/preview/flushWait";

test("CR 025: waitForSettled resolves at once when nothing is pending", async () => {
  assert.equal(await waitForSettled(() => true, 1000), true);
});

test("CR 025: waitForSettled resolves true as soon as the pending save is applied", async () => {
  let applied = false;
  setTimeout(() => { applied = true; }, 20);
  const started = Date.now();
  assert.equal(await waitForSettled(() => applied, 1000, 2), true);
  assert.ok(Date.now() - started < 500, "it does not wait for the whole timeout");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-205
test("CR 025: waitForSettled gives up after the timeout, so a stuck save never blocks a navigation", async () => {
  assert.equal(await waitForSettled(() => false, 30, 2), false);
});

test("CR 025: waitForAnswer resolves true on the answer and false on silence", async () => {
  assert.equal(await waitForAnswer(Promise.resolve(), 1000), true);
  assert.equal(await waitForAnswer(new Promise(() => undefined), 30), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-026
test("CR 025: LatestRequest applies only the latest request, so A to B to A ends on A", () => {
  const latest = new LatestRequest<string>();
  assert.equal(latest.idle, true);
  latest.request("B");
  latest.request("A");
  assert.equal(latest.idle, false);
  assert.equal(latest.settle(), undefined, "an earlier run does not switch");
  assert.equal(latest.settle(), "A", "the last run switches to the latest request");
  assert.equal(latest.idle, true);
  latest.request("B");
  assert.equal(latest.settle(), "B");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-067
test("CR 025: the flush refusal warning names the field and says the text was not saved", () => {
  const text = flushRefusalMessage('the frontmatter field "title"', "A frontmatter field named \"x\" already exists.");
  assert.match(text, /the frontmatter field "title"/u);
  assert.match(text, /already exists\. That text was not saved\.$/u);
  assert.doesNotMatch(text, /\.\./u);
});
