import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PALETTE_ACTION_IDS, PALETTE_ACTIONS } from "../../../src/core/palette/paletteActions";
import { createEditActions } from "../../../src/page/modules/editActions";

const registry = createEditActions();

interface Applied { value: string; selection: [number, number] }

function option(value: string, selection: [number, number]): Applied {
  const edit = registry.byId.get("option")!.apply({
    value, selectionStart: selection[0], selectionEnd: selection[1], scope: "block",
  })!;
  return {
    value: value.slice(0, edit.start) + edit.text + value.slice(edit.end),
    selection: [edit.selectionStart, edit.selectionEnd],
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
test("option is a GFM block action listed right after checkbox, with no shortcut", () => {
  const ids = [...PALETTE_ACTION_IDS] as string[];
  assert.equal(ids.indexOf("option"), ids.indexOf("checkbox") + 1);
  const action = registry.byId.get("option")!;
  assert.equal(action.title, "Toggle option");
  assert.deepEqual(action.modes, ["gfm"]);
  assert.deepEqual(action.scopes, ["block"]);
  assert.equal(action.shortcut, undefined);
  assert.equal(PALETTE_ACTIONS.option.group, PALETTE_ACTIONS.checkbox.group);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
test("option puts - ( ) on a plain line and ( ) after the marker of a list item", () => {
  assert.equal(option("pick one", [3, 3]).value, "- ( ) pick one");
  assert.equal(option("- pick one", [3, 3]).value, "- ( ) pick one");
  assert.equal(option("* pick", [0, 0]).value, "* ( ) pick");
  assert.equal(option("12. pick", [0, 0]).value, "12. ( ) pick");
  assert.equal(option("  - nested", [0, 0]).value, "  - ( ) nested");
  assert.equal(option("  nested plain", [0, 0]).value, "  - ( ) nested plain");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
test("option removes an option marker, selected or not, and leaves the list item", () => {
  assert.equal(option("- ( ) done", [8, 8]).value, "- done");
  assert.equal(option("- (x) done", [8, 8]).value, "- done");
  assert.equal(option("1. (X) done", [8, 8]).value, "1. done");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
test("option keeps the caret on its text", () => {
  const out = option("- pick one", [5, 5]);
  assert.equal(out.value.slice(0, out.selection[0]), "- ( ) pic");
  const back = option("- ( ) pick one", [9, 9]);
  assert.equal(back.value.slice(0, back.selection[0]), "- pic");
  const atStart = option("plain", [0, 0]);
  assert.equal(atStart.value.slice(0, atStart.selection[0]), "- ( ) ");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
test("option on several lines is one action: all markers go, else all lines get one", () => {
  assert.equal(option("- ( ) a\n- (x) b", [0, 15]).value, "- a\n- b");
  assert.equal(option("- ( ) a\n- b\nc", [0, 13]).value, "- ( ) a\n- ( ) b\n- ( ) c");
  assert.equal(option("a\n\nb", [0, 4]).value, "- ( ) a\n\n- ( ) b");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
test("option replaces the task box of a line", () => {
  assert.equal(option("- [ ] a", [0, 7]).value, "- ( ) a");
  assert.equal(option("- [x] a\n- ( ) b", [0, 15]).value, "- ( ) a\n- ( ) b");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-267
test("option on an empty line inserts the marker with the caret after it, and is its own inverse", () => {
  const out = option("a\n\nb", [2, 2]);
  assert.equal(out.value, "a\n- ( ) \nb");
  assert.deepEqual(out.selection, [8, 8]);
  const once = option("- item", [0, 6]);
  assert.equal(option(once.value, once.selection).value, "- item");
});
