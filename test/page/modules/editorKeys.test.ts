import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installEditorKeyContainment, isHandledEditorKey } from "../../../src/page/modules/editorKeys";

const EDITOR_SELECTORS = ["[data-sphinx-preview-block-editor]", "[data-okf-frontmatter-editor]", "[data-sphinx-table-menu]"];
const inside = (selector: string) => ({ closest: (query: string) => (query === selector ? {} : null) });
const cellControl = inside("[data-sphinx-preview-block-editor]");
const outside = { closest: () => null };

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-069
test("CR 041: Tab, Enter, Escape and the arrow keys an open editor handled are the page's", () => {
  for (const key of ["Tab", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    assert.equal(isHandledEditorKey({ key, defaultPrevented: true, target: cellControl }), true, key);
  }
  for (const selector of EDITOR_SELECTORS) {
    assert.equal(isHandledEditorKey({ key: "Tab", defaultPrevented: true, target: inside(selector) }), true, selector);
  }
});

test("CR 041: keys no editor handled keep reaching VS Code", () => {
  assert.equal(isHandledEditorKey({ key: "Tab", target: cellControl }), false, "not prevented (Ctrl+Tab, a native Tab)");
  assert.equal(isHandledEditorKey({ key: "Tab", defaultPrevented: false, target: cellControl }), false);
  assert.equal(isHandledEditorKey({ key: "Enter", defaultPrevented: true, isComposing: true, target: cellControl }), false, "IME");
  assert.equal(isHandledEditorKey({ key: "a", defaultPrevented: true, target: cellControl }), false, "letters");
  assert.equal(isHandledEditorKey({ key: "F1", defaultPrevented: true, target: cellControl }), false);
  assert.equal(isHandledEditorKey({ key: "Tab", defaultPrevented: true, target: outside }), false, "outside an editor");
  assert.equal(isHandledEditorKey({ key: "Tab", defaultPrevented: true, target: null }), false);
  assert.equal(isHandledEditorKey({ key: "Tab", defaultPrevented: true, target: { tagName: "BODY" } }), false);
});

test("CR 041: a handled editor key stops at the document, without preventing anything else", () => {
  const listeners: Array<(event: unknown) => void> = [];
  const document = { addEventListener: (_type: string, listener: (event: unknown) => void) => listeners.push(listener) };
  const kept: string[] = [];
  installEditorKeyContainment(document as never, isHandledEditorKey, (key) => kept.push(key));
  const dispatch = (event: Record<string, unknown>): boolean => {
    let stopped = false;
    for (const listener of listeners) {
      listener({
        ...event,
        stopPropagation: () => { stopped = true; },
        preventDefault: () => assert.fail("the containment never prevents a default"),
      });
    }
    return stopped;
  };
  assert.equal(dispatch({ key: "Tab", defaultPrevented: true, target: cellControl }), true);
  assert.equal(dispatch({ key: "Tab", target: cellControl }), false);
  assert.equal(dispatch({ key: "Escape", defaultPrevented: true, target: outside }), false);
  assert.deepEqual(kept, ["Tab"]);
});
