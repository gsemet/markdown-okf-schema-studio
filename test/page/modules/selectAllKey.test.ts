import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installSelectAllInControls, isTextSelectAll } from "../../../src/page/modules/selectAllKey";

const textarea = { tagName: "TEXTAREA" };
const textInput = { tagName: "INPUT", type: "text" };

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-069
test("CR 041: Ctrl+A (Cmd+A on macOS) in a text control is the select-all of that control", () => {
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: textarea }, false), true);
  assert.equal(isTextSelectAll({ key: "A", ctrlKey: true, target: textInput }, false), true, "Caps Lock");
  assert.equal(isTextSelectAll({ key: "a", metaKey: true, target: textarea }, true), true);
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: { tagName: "INPUT", type: "number" } }, false), true);
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: { tagName: "DIV", isContentEditable: true } }, false), true);
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: { tagName: "INPUT" } }, false), true, "an input without type is text");
});

test("CR 041: other keys, modifiers and targets are not a control's select-all", () => {
  assert.equal(isTextSelectAll({ key: "b", ctrlKey: true, target: textarea }, false), false);
  assert.equal(isTextSelectAll({ key: "a", target: textarea }, false), false, "a plain a is typing");
  assert.equal(isTextSelectAll({ key: "a", metaKey: true, target: textarea }, false), false, "Meta+A is not select-all off macOS");
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: textarea }, true), false, "Ctrl+A is not select-all on macOS");
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, shiftKey: true, target: textarea }, false), false);
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, altKey: true, target: textarea }, false), false);
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, metaKey: true, target: textarea }, false), false);
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: { tagName: "INPUT", type: "checkbox" } }, false), false);
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: { tagName: "DIV" } }, false), false, "the page itself");
  assert.equal(isTextSelectAll({ key: "a", ctrlKey: true, target: null }, false), false);
});

test("CR 041: the shortcut stops at the document, so VS Code's window listener never forwards it", () => {
  const documentListeners: Array<(event: unknown) => void> = [];
  const document = { addEventListener: (_type: string, listener: (event: unknown) => void) => documentListeners.push(listener) };
  const kept: unknown[] = [];
  installSelectAllInControls(document as never, isTextSelectAll, false, (target) => kept.push(target));
  const dispatch = (event: Record<string, unknown>): boolean => {
    let stopped = false;
    let prevented = false;
    for (const listener of documentListeners) {
      listener({ ...event, stopPropagation: () => { stopped = true; }, preventDefault: () => { prevented = true; } });
    }
    assert.equal(prevented, false, "the browser's own select-all still runs");
    return stopped;
  };
  assert.equal(dispatch({ key: "a", ctrlKey: true, target: textarea }), true);
  assert.deepEqual(kept, [textarea]);
  assert.equal(dispatch({ key: "a", ctrlKey: true, target: { tagName: "BODY" } }), false, "outside a control VS Code still selects the page");
  assert.equal(dispatch({ key: "z", ctrlKey: true, target: textarea }), false, "undo still reaches VS Code");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: a select-all a text box already cancelled is left to VS Code's key binding", () => {
  const documentListeners: Array<(event: unknown) => void> = [];
  const document = { addEventListener: (_type: string, listener: (event: unknown) => void) => documentListeners.push(listener) };
  installSelectAllInControls(document as never, isTextSelectAll, false);
  let stopped = false;
  for (const listener of documentListeners) {
    listener({ key: "a", ctrlKey: true, target: textarea, defaultPrevented: true, stopPropagation: () => { stopped = true; } });
  }
  assert.equal(stopped, false);
});
