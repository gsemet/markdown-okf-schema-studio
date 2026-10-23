import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMessageRouter } from "../../src/protocol/router";

type Sample = { type: "a"; value: number } | { type: "b"; text: string };

test("dispatch runs the handler of the message's type with the context and returns its result", () => {
  const router = createMessageRouter<Sample, [string], string>();
  router.on("a", (message, context) => `${context}:a${message.value}`);
  router.on("b", (message, context) => `${context}:b${message.text}`);
  assert.deepEqual(router.dispatch({ type: "a", value: 1 }, "x"), { handled: true, result: "x:a1" });
  assert.deepEqual(router.dispatch({ type: "b", text: "t" }, "y"), { handled: true, result: "y:bt" });
});

test("a type without a handler, or a handler that returns false, is not handled", () => {
  const router = createMessageRouter<Sample, [], boolean | undefined>();
  router.on("a", (message) => message.value > 0 ? undefined : false);
  assert.deepEqual(router.dispatch({ type: "b", text: "t" }), { handled: false });
  assert.deepEqual(router.dispatch({ type: "a", value: 0 }), { handled: false });
  assert.deepEqual(router.dispatch({ type: "a", value: 1 }), { handled: true, result: undefined });
});

test("a second handler for the same type throws", () => {
  const router = createMessageRouter<Sample>();
  router.on("a", () => undefined);
  assert.throws(() => router.on("a", () => undefined), /already registered for a/u);
});

test("the router works from its source text alone, as the page runtime injects it", () => {
  const create = new Function(`return (${createMessageRouter.toString()});`)() as typeof createMessageRouter;
  const router = create<Sample>();
  const seen: unknown[] = [];
  router.on("b", (message) => { seen.push(message.text); });
  assert.deepEqual(router.dispatch({ type: "b", text: "hi" }), { handled: true, result: undefined });
  assert.deepEqual(seen, ["hi"]);
});
