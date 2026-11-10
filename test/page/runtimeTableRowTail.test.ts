import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness } from "./runtimeHarness";
import { openTableCellEditorForTab } from "./runtimeTestSupport";

/**
 * A click on a cell of a pipe table whose row has text after its closing pipe opens the table
 * cell editor, not the raw Markdown editor.
 */

// @tests_req SwRS-MDOKFSTUDIO-TABLE-001
test("a cell of a table whose row has a token after its closing pipe opens the cell editor", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness, {},
    "| A | B |\n| --- | --- |\n| x | y | ^row-a\n| p | q |\n");
  assert.equal(input().value, "x");
  assert.equal(harness.createdElements.some((element) => element.getAttribute("aria-label") === "Raw Markdown block"),
    false, "no raw Markdown editor");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-070
test("the List table button is disabled on a table whose row has a token after its closing pipe", () => {
  const harness = createRuntimeHarness();
  openTableCellEditorForTab(harness, {}, "| A | B |\n| --- | --- |\n| x | y | ^row-a\n| p | q |\n");
  const button = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Convert to list-table");
  assert.ok(button);
  assert.equal(button.disabled, true);
});
