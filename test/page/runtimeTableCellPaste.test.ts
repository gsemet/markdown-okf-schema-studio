import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement } from "./runtimeHarness";
import { openTableCellEditorForTab } from "./runtimeTestSupport";

/**
 * A paste into the table cell text box (features/tableCellEditor.ts, modules/tableGridPaste.ts):
 * spreadsheet cells fill the table, any other text stays a native paste.
 */

const QA_TABLE = "| N | Name | Who |\n| --- | --- | --- |\n| Four | dan | dan |\n| Five | row five | erin |\n";
const SMALL = "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n";

function pasteInto(input: RuntimeElement, text: string): { prevented: boolean } {
  let prevented = false;
  input.dispatch("paste", {
    clipboardData: { getData: (type: string) => (type === "text/plain" ? text : "") },
    preventDefault: () => { prevented = true; },
  });
  return { prevented };
}

const finalSaves = (harness: ReturnType<typeof createRuntimeHarness>) =>
  harness.messages.filter((message) => message.type === "previewEditSave");

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a spreadsheet paste fills the cells in one save and reopens in the start cell", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness, { start: [2, 1] }, QA_TABLE);
  const { prevented } = pasteInto(input(), "a\tb\tc\n1\t2\t3\n");
  assert.equal(prevented, true);
  const saves = finalSaves(harness);
  assert.equal(saves.length, 1, "exactly one save");
  assert.equal(saves[0]!.final, true);
  const edited = String(saves[0]!.editedText);
  assert.equal(edited.includes("\t"), false);
  const lines = edited.split("\n");
  assert.equal(lines.length, 6);
  assert.match(lines[0]!, /^\| N +\| Name +\| Who +\| *\|$/u);
  assert.match(lines[1]!, /^\| -+ \| -+ \| -+ \| -+ \|$/u);
  assert.match(lines[2]!, /^\| Four +\| dan +\| dan +\| *\|$/u);
  assert.match(lines[3]!, /^\| Five +\| a +\| b +\| c +\|$/u);
  assert.match(lines[4]!, /^\| *\| 1 +\| 2 +\| 3 +\|$/u);
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.tableRowIndex, 2);
  assert.equal(pending?.tableColumnIndex, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
test("a spreadsheet paste that fits adds nothing and keeps the other cells", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness, undefined, SMALL);
  pasteInto(input(), "1\t2\r\n3\t4");
  assert.equal(finalSaves(harness).at(-1)!.editedText, "| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |\n");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-120
// @tests_req SwRS-MDOKFSTUDIO-TABLE-091
test("a single value or a text without a tab is left to the native paste", () => {
  for (const text of ["x", "a\nb", "a\r\nb\r\n", ""]) {
    const harness = createRuntimeHarness();
    const { input } = openTableCellEditorForTab(harness, undefined, SMALL);
    const before = finalSaves(harness).length;
    const { prevented } = pasteInto(input(), text);
    assert.equal(prevented, false, JSON.stringify(text));
    assert.equal(finalSaves(harness).length, before, "no save");
  }
});

