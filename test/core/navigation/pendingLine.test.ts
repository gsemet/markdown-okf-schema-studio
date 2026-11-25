/**
 * Tests of the line hand-off to a Studio tab: a pending line is taken once, by URI, dropped past
 * the window, replaced by a second request, and removed as soon as a live session takes it.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PENDING_LINE_WINDOW_MS, PendingLines } from "../../../src/core/navigation/pendingLine";

function lines(): { pending: PendingLines; clock: { now: number } } {
  const clock = { now: 1000 };
  return { pending: new PendingLines(() => clock.now), clock };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S2
test("a pending line is taken once, and only for its own URI", () => {
  const { pending } = lines();
  pending.record("file:///a.md", 42);
  assert.equal(pending.take("file:///b.md"), undefined, "another file takes nothing");
  assert.equal(pending.take("file:///a.md"), 42);
  assert.equal(pending.take("file:///a.md"), undefined, "taken once");
  assert.equal(pending.has("file:///a.md"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S1
test("a pending line past the window is dropped, and one at the window is still taken", () => {
  const { pending, clock } = lines();
  pending.record("file:///a.md", 7);
  clock.now += PENDING_LINE_WINDOW_MS;
  assert.equal(pending.has("file:///a.md"), true);
  assert.equal(pending.take("file:///a.md"), 7);
  pending.record("file:///a.md", 7);
  clock.now += PENDING_LINE_WINDOW_MS + 1;
  assert.equal(pending.has("file:///a.md"), false);
  assert.equal(pending.take("file:///a.md"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S1
test("a second request for the same URI replaces the first, and drop forgets it", () => {
  const { pending } = lines();
  pending.record("file:///a.md", 3);
  pending.record("file:///a.md", 9);
  assert.equal(pending.take("file:///a.md"), 9);
  pending.record("file:///a.md", 4);
  pending.drop("file:///a.md");
  assert.equal(pending.take("file:///a.md"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S2
test("a line delivered to a live session is not left pending, and one nobody takes is recorded", () => {
  const { pending } = lines();
  const sent: Array<[string, number, number | undefined]> = [];
  pending.bindLiveSessions((uri, line, column) => {
    sent.push([uri, line, column]);
    return uri === "file:///live.md";
  });
  pending.deliver("file:///live.md", 12, 2);
  assert.deepEqual(sent, [["file:///live.md", 12, 2]]);
  assert.equal(pending.take("file:///live.md"), undefined, "a delivered line never stays pending");
  pending.deliver("file:///new.md", 5);
  assert.equal(pending.take("file:///new.md"), 5, "no live session: the line waits for the tab that opens");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S1
test("a live delivery replaces an older pending line of the same file instead of leaving it", () => {
  const { pending } = lines();
  pending.bindLiveSessions(() => true);
  pending.record("file:///a.md", 3);
  pending.deliver("file:///a.md", 8);
  assert.equal(pending.take("file:///a.md"), undefined);
});
