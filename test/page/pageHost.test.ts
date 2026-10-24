import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { HostTransport } from "../../src/page/hostTransport";
import { createPageHost, STATE_THROTTLE_MS } from "../../src/page/pageHost";

function fakeWindow() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; run: () => void }>();
  return {
    performance: { now: () => now },
    setTimeout: ((run: () => void, delay: number) => {
      const id = nextId++;
      timers.set(id, { at: now + delay, run });
      return id;
    }) as unknown as Window["setTimeout"],
    clearTimeout: ((id: number) => { timers.delete(id); }) as Window["clearTimeout"],
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.run();
        }
      }
    },
    pending: () => timers.size,
  };
}

function fakeTransport() {
  const posted: unknown[] = [];
  const written: unknown[] = [];
  let state: unknown;
  const transport: HostTransport = {
    postMessage: (message) => posted.push(message),
    getState: () => state,
    setState: (next) => { state = next; written.push(next); },
    onMessage: () => undefined,
  };
  return { transport, posted, written };
}

test("throttled state writes: the first at once, then at most one per interval, the last one wins", () => {
  const window = fakeWindow();
  const { transport, written } = fakeTransport();
  const host = createPageHost(transport, window);
  host.setStateThrottled({ top: 1 });
  host.setStateThrottled({ top: 2 });
  host.setStateThrottled({ top: 3 });
  assert.deepEqual(written, [{ top: 1 }]);
  assert.deepEqual(host.api.getState(), { top: 3 });
  window.advance(STATE_THROTTLE_MS);
  assert.deepEqual(written, [{ top: 1 }, { top: 3 }]);
  assert.equal(window.pending(), 0);
});

test("a direct state write replaces a pending throttled one; a flush writes the pending one now", () => {
  const window = fakeWindow();
  const { transport, written } = fakeTransport();
  const host = createPageHost(transport, window);
  host.setStateThrottled({ top: 1 });
  host.setStateThrottled({ top: 2 });
  host.api.setState({ editMode: true });
  window.advance(STATE_THROTTLE_MS);
  assert.deepEqual(written, [{ top: 1 }, { editMode: true }]);
  host.setStateThrottled({ top: 4 });
  host.setStateThrottled({ top: 5 });
  host.flushPendingState();
  assert.deepEqual(written.at(-1), { top: 5 });
  assert.equal(window.pending(), 0);
});

test("throttled state messages follow the same rule; plain messages are never held back", () => {
  const window = fakeWindow();
  const { transport, posted } = fakeTransport();
  const host = createPageHost(transport, window);
  host.postStateMessageThrottled({ type: "previewState", n: 1 });
  host.postStateMessageThrottled({ type: "previewState", n: 2 });
  host.api.postMessage({ type: "previewScroll" });
  assert.deepEqual(posted, [{ type: "previewState", n: 1 }, { type: "previewScroll" }]);
  host.flushStateMessage();
  assert.deepEqual(posted.at(-1), { type: "previewState", n: 2 });
  window.advance(STATE_THROTTLE_MS);
  assert.equal(posted.length, 3);
});
