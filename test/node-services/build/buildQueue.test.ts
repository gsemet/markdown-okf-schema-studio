import * as assert from "node:assert/strict";
import { test } from "node:test";

import { BuildQueue } from "../../../src/node-services/build/buildQueue";

interface TestDocument {
  uri: { fsPath: string };
  version: number;
  text: string;
  getText(): string;
}

function document(version: number, text: string): TestDocument {
  return {
    uri: { fsPath: "/workspace/active.md" },
    version,
    text,
    getText() {
      return this.text;
    },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("lets an in-flight build finish and starts the newest queued edit right after", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const resolvers = new Map<number, (value: string) => void>();
  const disposed: string[] = [];
  let aborted = false;
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 0,
    revisionOf: (queued) => queued.version,
    build: async (request, signal) => new Promise((resolve) => {
      resolvers.set(request.requestId, resolve);
      signal.addEventListener("abort", () => { aborted = true; }, { once: true });
    }),
    disposeResult: (result) => disposed.push(result),
  });
  context.after(() => queue.dispose());
  const first = queue.request(document(1, "old"));
  context.mock.timers.tick(0);
  const superseded = queue.request(document(2, "intermediate"));
  const second = queue.request(document(3, "new"));
  context.mock.timers.tick(0);
  // Only the debounced slot collapses; the running build is never torn down.
  assert.equal((await superseded).status, "superseded");
  assert.equal(aborted, false);
  assert.ok(resolvers.has(1));
  resolvers.get(1)!("old result");
  const firstOutcome = await first;
  assert.equal(firstOutcome.status, "ready");
  assert.equal(firstOutcome.result, "old result");
  assert.ok(resolvers.has(3));
  resolvers.get(3)!("new result");
  const outcome = await second;
  assert.equal(outcome.status, "ready");
  assert.equal(outcome.result, "new result");
  assert.deepEqual(disposed, ["old result"]);
  assert.equal(outcome.request.requestId, 3);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-025
// @tests_req SwRS-MDOKFSTUDIO-LIFE-049
test("retains a successful result as stale after a failed newer build", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = new Map<number, { resolve: (value: string) => void; reject: (error: Error) => void }>();
  const states: string[] = [];
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 0,
    revisionOf: (queued) => queued.version,
    build: async (request) => new Promise((resolve, reject) => {
      pending.set(request.requestId, { resolve, reject });
    }),
    onState: (state) => states.push(`${state.phase}:${state.stale}`),
  });
  context.after(() => queue.dispose());
  const first = queue.request(document(1, "valid"));
  context.mock.timers.tick(0);
  assert.ok(pending.has(1));
  pending.get(1)!.resolve("last good");
  assert.equal((await first).status, "ready");
  const second = queue.request(document(2, "invalid"));
  context.mock.timers.tick(0);
  assert.ok(pending.has(2));
  pending.get(2)!.reject(new Error("/workspace/active.md:2: invalid directive"));
  const outcome = await second;
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.lastGood, "last good");
  assert.equal(queue.getState().stale, true);
  assert.match(states.join("\n"), /failed:true/u);
});

test("still renders a build whose buffer already moved on, and cleans up on dispose", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const active = document(1, "first");
  const resolvers = new Map<number, (value: string) => void>();
  let aborted = false;
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 0,
    revisionOf: (queued) => queued.version,
    build: async (request, signal) => new Promise((resolve) => {
      resolvers.set(request.requestId, resolve);
      signal.addEventListener("abort", () => { aborted = true; }, { once: true });
    }),
  });
  context.after(() => queue.dispose());
  const request = queue.request(active);
  context.mock.timers.tick(0);
  // The user keeps typing while the build runs; the finished result is still worth showing.
  active.version = 2;
  assert.ok(resolvers.has(1));
  resolvers.get(1)!("slightly behind");
  const outcome = await request;
  assert.equal(outcome.status, "ready");
  assert.equal(outcome.result, "slightly behind");
  assert.equal(queue.getState().phase, "ready");

  const pending = queue.request(document(3, "pending"));
  context.mock.timers.tick(0);
  queue.dispose();
  assert.equal((await pending).status, "canceled");
  assert.equal(aborted, true);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-044
test("tracks referenced dependencies for refresh decisions", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const queue = new BuildQueue<TestDocument, { stage: { dependencies: readonly string[] } }>({
    debounceMs: 0,
    revisionOf: (queued) => queued.version,
    build: async () => ({ stage: { dependencies: ["/workspace/image.png"] } }),
  });
  context.after(() => queue.dispose());
  assert.equal(queue.dependsOn("/workspace/image.png"), false);
  const request = queue.request(document(1, "image"));
  context.mock.timers.tick(0);
  await request;
  assert.equal(queue.dependsOn("/workspace/image.png"), true);
  assert.equal(queue.dependsOn("/workspace/other.png"), false);
});

test("debounces pending edits and cancels them without invoking the builder", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let builds = 0;
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 120,
    revisionOf: (queued) => queued.version,
    build: async () => { builds += 1; return "result"; },
  });
  context.after(() => queue.dispose());
  const first = queue.request(document(1, "first"));
  context.mock.timers.tick(119);
  assert.equal(builds, 0);
  const second = queue.request(document(2, "second"));
  assert.equal((await first).status, "superseded");
  context.mock.timers.tick(119);
  assert.equal(builds, 0);
  queue.cancel();
  assert.equal((await second).status, "canceled");
  context.mock.timers.tick(1);
  assert.equal(builds, 0);
  assert.equal(queue.getState().phase, "canceled");
});

test("cancellation discards late results and permits a fresh build", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const completed: string[] = [];
  let finish: ((value: string) => void) | undefined;
  let signal: AbortSignal | undefined;
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 0,
    revisionOf: (queued) => queued.version,
    build: (request, activeSignal) => {
      signal = activeSignal;
      return request.requestId === 1
        ? new Promise((resolve) => { finish = resolve; })
        : Promise.resolve("fresh");
    },
    disposeResult: (result) => completed.push(result),
  });
  context.after(() => queue.dispose());
  const first = queue.request(document(1, "old"));
  context.mock.timers.tick(0);
  queue.cancel();
  assert.equal(signal?.aborted, true);
  assert.equal((await first).status, "canceled");
  assert.ok(finish);
  finish("late");
  await Promise.resolve();
  assert.deepEqual(completed, ["late"]);
  assert.equal(queue.getState().phase, "canceled");
  const next = queue.refresh(document(2, "new"));
  context.mock.timers.tick(0);
  assert.equal((await next).result, "fresh");
});

test("disposal releases the last result once and rejects future requests", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const disposed: string[] = [];
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 0,
    revisionOf: (queued) => queued.version,
    build: async () => "result",
    disposeResult: (result) => disposed.push(result),
  });
  context.after(() => queue.dispose());
  const request = queue.request(document(1, "first"));
  context.mock.timers.tick(0);
  await request;
  queue.clearLastGood();
  assert.deepEqual(disposed, ["result"]);
  assert.deepEqual(queue.getState(), { phase: "idle", stale: false });
  queue.dispose();
  queue.dispose();
  assert.deepEqual(disposed, ["result"]);
  assert.equal((await queue.request(document(2, "new"))).status, "canceled");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("adapts the debounce to twice the last build time, within its bounds", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const started: number[] = [];
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 40,
    maxDebounceMs: 1000,
    revisionOf: (queued) => queued.version,
    // Each build takes 300 ms of (mocked) time.
    build: (request) => {
      started.push(request.requestId);
      return new Promise((resolve) => setTimeout(() => resolve(`r${request.requestId}`), 300));
    },
  });
  context.after(() => queue.dispose());
  assert.equal(queue.currentDebounceMs(), 40);
  const first = queue.request(document(1, "first"));
  context.mock.timers.tick(40);
  assert.deepEqual(started, [1]);
  context.mock.timers.tick(300);
  assert.equal((await first).status, "ready");
  // The last build took 300 ms: the next one waits 600 ms after the last edit, not 40 ms.
  assert.equal(queue.currentDebounceMs(), 600);
  const second = queue.request(document(2, "second"));
  context.mock.timers.tick(40);
  assert.deepEqual(started, [1]);
  context.mock.timers.tick(559);
  assert.deepEqual(started, [1]);
  context.mock.timers.tick(1);
  assert.deepEqual(started, [1, 2]);
  context.mock.timers.tick(300);
  assert.equal((await second).status, "ready");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("aborts a build that overruns twice the last build time once a newer edit is due", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const signals = new Map<number, AbortSignal>();
  const finishers = new Map<number, (value: string) => void>();
  const disposed: string[] = [];
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 40,
    // The overrun limit is never below the longest wait; 200 ms keeps the numbers small.
    maxDebounceMs: 200,
    revisionOf: (queued) => queued.version,
    build: (request, signal) => {
      signals.set(request.requestId, signal);
      return new Promise((resolve) => {
        finishers.set(request.requestId, resolve);
        // The first build takes 100 ms; the others wait for the test.
        if (request.requestId === 1) setTimeout(() => resolve("r1"), 100);
      });
    },
    disposeResult: (result) => disposed.push(result),
  });
  context.after(() => queue.dispose());
  const first = queue.request(document(1, "first"));
  context.mock.timers.tick(40);
  context.mock.timers.tick(100);
  assert.equal((await first).status, "ready");
  // The next build runs long (the document grew); a newer edit arrives 50 ms into it.
  const slow = queue.request(document(2, "slow"));
  context.mock.timers.tick(200);
  assert.ok(signals.has(2));
  context.mock.timers.tick(50);
  const newest = queue.request(document(3, "newest"));
  // Its 200 ms wait elapses 250 ms into the slow build, past twice the last build time.
  context.mock.timers.tick(199);
  assert.equal(signals.get(2)!.aborted, false);
  context.mock.timers.tick(1);
  assert.equal(signals.get(2)!.aborted, true);
  const slowOutcome = await slow;
  assert.equal(slowOutcome.status, "superseded");
  assert.equal(slowOutcome.lastGood, "r1");
  assert.ok(signals.has(3), "the newest edit builds at once");
  // The aborted build ran 250 ms at least: the next wait grows with it, up to its bound.
  assert.equal(queue.currentDebounceMs(), 200);
  // A late result of the aborted build is dropped.
  finishers.get(2)!("late");
  finishers.get(3)!("r3");
  const outcome = await newest;
  assert.equal(outcome.status, "ready");
  assert.equal(outcome.result, "r3");
  await Promise.resolve();
  assert.ok(disposed.includes("late"));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("the adaptive wait uses the duration the result reports, and keeps its estimate without one", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const durations: Array<number | undefined> = [250, undefined];
  const queue = new BuildQueue<TestDocument, number | undefined>({
    debounceMs: 40,
    revisionOf: (queued) => queued.version,
    // The build itself takes no time; the reported duration is what counts (a worker start is not).
    build: async () => durations.shift(),
    durationOf: (result) => result,
  });
  context.after(() => queue.dispose());
  const first = queue.request(document(1, "first"));
  context.mock.timers.tick(40);
  await first;
  assert.equal(queue.currentDebounceMs(), 500);
  const second = queue.request(document(2, "second"));
  context.mock.timers.tick(500);
  await second;
  assert.equal(queue.currentDebounceMs(), 500);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("never aborts a build of a small document whose wall time exceeds its reported render time", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const signals = new Map<number, AbortSignal>();
  const queue = new BuildQueue<TestDocument, string>({
    debounceMs: 40,
    revisionOf: (queued) => queued.version,
    // The render itself takes 2 ms; the build takes 60 ms of wall time (a busy host, a worker
    // starting, the patch to the page).
    build: (request, signal) => {
      signals.set(request.requestId, signal);
      return new Promise((resolve) => setTimeout(() => resolve(`r${request.requestId}`), 60));
    },
    durationOf: () => 2,
  });
  context.after(() => queue.dispose());
  const first = queue.request(document(1, "first"));
  context.mock.timers.tick(40);
  context.mock.timers.tick(60);
  assert.equal((await first).status, "ready");
  assert.equal(queue.currentDebounceMs(), 40);
  const second = queue.request(document(2, "second"));
  context.mock.timers.tick(40);
  assert.ok(signals.has(2));
  // A newer edit arrives as the build starts; its 40 ms wait elapses while the build still runs.
  const third = queue.request(document(3, "third"));
  context.mock.timers.tick(40);
  assert.equal(signals.get(2)!.aborted, false);
  context.mock.timers.tick(20);
  const secondOutcome = await second;
  assert.equal(secondOutcome.status, "ready");
  assert.equal(signals.get(2)!.aborted, false);
  // The newer edit starts right after the build finished.
  assert.ok(signals.has(3));
  context.mock.timers.tick(60);
  assert.equal((await third).status, "ready");
});
