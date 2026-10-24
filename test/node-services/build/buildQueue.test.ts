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
