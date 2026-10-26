import * as assert from "node:assert/strict";
import { test } from "node:test";

import { editCommandOfKey } from "../../../src/page/modules/editCommandKey";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: the VS Code default keys map to undo, redo, select all and delete line", () => {
  assert.equal(editCommandOfKey({ key: "z", ctrlKey: true }, false), "undo");
  assert.equal(editCommandOfKey({ key: "z", metaKey: true }, true), "undo");
  assert.equal(editCommandOfKey({ key: "Z", ctrlKey: true, shiftKey: true }, false), "redo");
  assert.equal(editCommandOfKey({ key: "Z", metaKey: true, shiftKey: true }, true), "redo");
  assert.equal(editCommandOfKey({ key: "y", ctrlKey: true }, false), "redo");
  assert.equal(editCommandOfKey({ key: "A", ctrlKey: true }, false), "selectAll");
  assert.equal(editCommandOfKey({ key: "a", metaKey: true }, true), "selectAll");
  assert.equal(editCommandOfKey({ key: "K", ctrlKey: true, shiftKey: true }, false), "deleteLine");
  assert.equal(editCommandOfKey({ key: "k", metaKey: true, shiftKey: true }, true), "deleteLine");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: other keys, the wrong primary key, Alt and a composition are not editing commands", () => {
  assert.equal(editCommandOfKey({ key: "z" }, false), undefined, "a plain z is typing");
  assert.equal(editCommandOfKey({ key: "z", metaKey: true }, false), undefined, "Cmd is not primary off macOS");
  assert.equal(editCommandOfKey({ key: "z", ctrlKey: true }, true), undefined, "Ctrl is not primary on macOS");
  assert.equal(editCommandOfKey({ key: "y", metaKey: true }, true), undefined, "Cmd+Y is not redo on macOS");
  assert.equal(editCommandOfKey({ key: "z", ctrlKey: true, altKey: true }, false), undefined);
  assert.equal(editCommandOfKey({ key: "z", ctrlKey: true, metaKey: true }, false), undefined);
  assert.equal(editCommandOfKey({ key: "k", ctrlKey: true }, false), undefined, "Ctrl+K is a chord prefix");
  assert.equal(editCommandOfKey({ key: "a", ctrlKey: true, shiftKey: true }, false), undefined);
  assert.equal(editCommandOfKey({ key: "z", ctrlKey: true, isComposing: true }, false), undefined);
  assert.equal(editCommandOfKey({ key: "s", ctrlKey: true }, false), undefined);
});
