import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PALETTE_ACTION_IDS, PALETTE_ACTIONS } from "../../../src/core/palette/paletteActions";
import { PALETTE_ICONS } from "../../../src/core/palette/paletteIcons";
import { createEditActions } from "../../../src/page/modules/editActions";

const registry = createEditActions();

function run(value: string, start: number, end = start): { text: string; caret: number } {
  const edit = registry.byId.get("toc")!.apply({ value, selectionStart: start, selectionEnd: end, scope: "block" })!;
  assert.ok(edit, "the action returns an edit");
  const text = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  assert.equal(edit.selectionStart, edit.selectionEnd);
  return { text, caret: edit.selectionStart };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-003
test("the Table of contents action writes [TOC] set apart after the line, the caret after it", () => {
  assert.deepEqual(run("para", 4), { text: "para\n\n[TOC]", caret: 11 });
  const middle = run("one\n\ntwo", 1);
  assert.equal(middle.text, "one\n\n[TOC]\n\ntwo");
  assert.equal(middle.text.slice(middle.caret - 5, middle.caret), "[TOC]");
  assert.equal(run("", 0).text, "[TOC]");
  assert.equal(run("a\n\n", 3).text, "a\n\n[TOC]");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-003
test("the action is a block-scope palette button and a /toc entry in every mode", () => {
  const action = PALETTE_ACTIONS.toc;
  assert.deepEqual(action.modes, ["strict"]);
  assert.deepEqual(action.scopes, ["block"]);
  assert.ok(action.slash?.aliases?.includes("toc"));
  assert.ok(Object.hasOwn(PALETTE_ICONS, action.icon));
  assert.ok(PALETTE_ACTION_IDS.includes("toc"));
  assert.equal(registry.byId.get("toc")!.scopes.includes("cell"), false);
});
