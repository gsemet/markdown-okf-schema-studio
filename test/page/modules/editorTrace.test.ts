import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditorTrace } from "../../../src/page/modules/editorTrace";

test("CR 041: the editor trace keeps the last entries with their time since the page started", () => {
  let clock = 1000;
  const trace = createEditorTrace(3, () => clock);
  for (const event of ["one", "two", "three", "four"]) {
    clock += 10;
    trace.record(event, event === "two" ? "detail" : undefined);
  }
  assert.deepEqual(trace.entries(), [
    { at: 20, event: "two", detail: "detail" },
    { at: 30, event: "three" },
    { at: 40, event: "four" },
  ]);
  const copy = trace.entries();
  copy[0]!.event = "changed";
  assert.equal(trace.entries()[0]?.event, "two", "entries() returns copies");
});

test("CR 041: callers names the nearest named functions of a stack", () => {
  const trace = createEditorTrace(5, () => 0);
  const v8 = [
    "Error",
    "    at traceStack (eval at run (file.js:1:1), <anonymous>:10:5)",
    "    at closeFrontmatterEditor (<anonymous>:20:5)",
    "    at saveValue (<anonymous>:30:5)",
    "    at HTMLTextAreaElement.<anonymous> (<anonymous>:40:5)",
    "    at <anonymous>:50:5",
  ].join("\n");
  assert.equal(trace.callers(v8, 1), "closeFrontmatterEditor < saveValue < HTMLTextAreaElement.<anonymous>");
  assert.equal(trace.callers("Error\ncloseBlockEdit@page.js:1:1\nsaveBlockEdit@page.js:2:1"), "closeBlockEdit < saveBlockEdit");
  assert.equal(trace.callers(undefined), "");
  trace.record("closed", "", "a < b");
  assert.deepEqual(trace.entries(), [{ at: 0, event: "closed", stack: "a < b" }]);
});
