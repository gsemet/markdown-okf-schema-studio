import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createChartViewCache } from "../../../src/page/modules/chartViewCache";

class FakeView {
  finalized = 0;
  constructor(public detached: boolean) {}
  isDetached(): boolean { return this.detached; }
  finalize(): void { this.finalized += 1; }
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S5
test("a chart drawn under its key is kept, a detached view of the key is reused, anything else is rendered", () => {
  const cache = createChartViewCache<FakeView>(4);
  assert.deepEqual(cache.plan(undefined, "a"), { action: "render" }, "first draw");
  const view = new FakeView(true);
  cache.store("a", view);
  assert.deepEqual(cache.plan("a", "a"), { action: "keep" }, "the node is up to date");
  assert.deepEqual(cache.plan("b", "a"), { action: "reuse", entry: view }, "a detached view comes back, for example the earlier theme");
  assert.deepEqual(cache.plan(undefined, "other"), { action: "render" });
});

test("a view still attached to a chart is never reused: two identical charts each get their own view", () => {
  const cache = createChartViewCache<FakeView>(4);
  const first = new FakeView(false);
  cache.store("a", first);
  assert.deepEqual(cache.plan(undefined, "a"), { action: "render" }, "the second chart of the same source renders its own");
  first.detached = true;
  assert.deepEqual(cache.plan(undefined, "a"), { action: "reuse", entry: first }, "once its chart left the page it is reusable");
});

test("the cache holds at most 16 views by default, and an evicted detached view is finalized, an attached one is not", () => {
  const cache = createChartViewCache<FakeView>();
  const views = Array.from({ length: 18 }, (_, index) => new FakeView(index !== 1));
  views.forEach((view, index) => cache.store(`k${index}`, view));
  assert.equal(cache.size, 16);
  assert.equal(views[0]!.finalized, 1, "the oldest detached view is finalized");
  assert.equal(views[1]!.finalized, 0, "the second oldest is still attached to its chart: dropped, not finalized");
  assert.ok(views.slice(2).every((view) => view.finalized === 0));
  assert.equal(cache.holds("k0", views[0]!), false);
  assert.equal(cache.holds("k2", views[2]!), true);
});

test("the least recently used view goes first: a reused one is refreshed", () => {
  const cache = createChartViewCache<FakeView>(2);
  const a = new FakeView(true);
  const b = new FakeView(true);
  cache.store("a", a);
  cache.store("b", b);
  cache.plan(undefined, "a");
  cache.store("c", new FakeView(true));
  assert.equal(b.finalized, 1, "b was the least recently used");
  assert.equal(a.finalized, 0);
});

test("storing a view under a key that holds another one finalizes the old one when it is detached", () => {
  const cache = createChartViewCache<FakeView>(4);
  const detached = new FakeView(true);
  cache.store("a", detached);
  const attached = new FakeView(false);
  cache.store("b", attached);
  cache.store("a", new FakeView(false));
  cache.store("b", new FakeView(false));
  assert.equal(detached.finalized, 1);
  assert.equal(attached.finalized, 0);
  cache.store("a", detached);
  assert.equal(cache.size, 2);
});
