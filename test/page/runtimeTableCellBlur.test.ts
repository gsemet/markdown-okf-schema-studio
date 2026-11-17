import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness } from "./runtimeHarness";
import { openTableCellEditorForTab } from "./runtimeTestSupport";

/** The blur of a table cell editor and the pointer press of the last 500 ms (features/tableCellEditor.ts). */

// @tests_req SwRS-MDOKFSTUDIO-TABLE-018
test("a blur commits the cell when the last pointer press is older than 500 ms, and not before", async () => {
  for (const [age, committed] of [[0, false], [560, true]] as const) {
    const harness = createRuntimeHarness();
    const { input } = openTableCellEditorForTab(harness);
    input().value = "typed";
    input().dispatch("input");
    const control = input();
    harness.dispatchDocument("pointerdown", { target: harness.mappings[2] });
    // The page reads the real clock (it runs in its own context), so the test waits for it.
    await new Promise<void>((resolve) => setTimeout(resolve, age));
    control.dispatch("blur");
    harness.flushTimers();
    assert.equal(harness.messages.some((message) => message.final === true), committed, `pointer press ${age} ms ago`);
  }
});
