import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createPageBus } from "../../src/page/pageBus";

interface TestEvents extends Record<string, unknown> {
  changed: number;
  other: undefined;
}

test("the page bus runs every listener of an event synchronously, in subscription order", () => {
  const bus = createPageBus<TestEvents>();
  const calls: string[] = [];
  bus.on("changed", (value) => calls.push(`first ${value}`));
  bus.on("other", () => calls.push("other"));
  bus.on("changed", (value) => calls.push(`second ${value}`));
  bus.emit("changed", 7);
  calls.push("after emit");
  assert.deepEqual(calls, ["first 7", "second 7", "after emit"]);
});

test("an unsubscribed listener no longer runs; an event without listeners is a no-op", () => {
  const bus = createPageBus<TestEvents>();
  const calls: number[] = [];
  const off = bus.on("changed", (value) => calls.push(value));
  bus.emit("changed", 1);
  off();
  off();
  bus.emit("changed", 2);
  bus.emit("other", undefined);
  assert.deepEqual(calls, [1]);
});

test("a listener added or removed during an emit takes effect at the next emit", () => {
  const bus = createPageBus<TestEvents>();
  const calls: string[] = [];
  let offSecond = (): void => undefined;
  bus.on("changed", (value) => {
    calls.push(`first ${value}`);
    offSecond();
    bus.on("changed", (later) => calls.push(`late ${later}`));
  });
  offSecond = bus.on("changed", (value) => calls.push(`second ${value}`));
  bus.emit("changed", 1);
  assert.deepEqual(calls, ["first 1", "second 1"]);
});

test("a listener that throws stops the event and the error reaches the emitter", () => {
  const bus = createPageBus<TestEvents>();
  const calls: string[] = [];
  bus.on("changed", () => { throw new Error("boom"); });
  bus.on("changed", () => calls.push("never"));
  assert.throws(() => bus.emit("changed", 1), /boom/u);
  assert.deepEqual(calls, []);
});
