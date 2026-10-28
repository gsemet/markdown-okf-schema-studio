import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { insertPointAfterLine, insertPointsOf } from "./runtimeTestSupport";

/**
 * The Start writing button of an empty document in edit mode is the keyboard selection: Enter and
 * Arrow Down open the new-block editor, and a hint line under the button names the key
 * (features/insertPoints.ts).
 */

const HINT_TEXT = "Enter to create a new block";
const EMPTY = { emptyBody: true, previewStatus: "success", savedState: { editMode: true } };

function startButtonOf(harness: RuntimeHarness): RuntimeElement {
  return insertPointAfterLine(harness, 0).childElements[0];
}

function hintOf(point: RuntimeElement): RuntimeElement | undefined {
  return point.childElements.find((child) => child.getAttribute("data-sphinx-preview-start-hint") !== null);
}

function lastOpen(harness: RuntimeHarness): Record<string, unknown> | undefined {
  const message = harness.messages.at(-1);
  return message?.type === "previewEditOpen" ? message : undefined;
}

function press(harness: RuntimeHarness, key: string, target: unknown): boolean {
  let prevented = false;
  harness.dispatchDocument("keydown", { key, target, preventDefault: () => { prevented = true; } });
  return prevented;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-253
test("empty document: Enter with the Start writing button as target opens the new-block editor", () => {
  const harness = createRuntimeHarness(EMPTY);
  const prevented = press(harness, "Enter", startButtonOf(harness));
  const open = lastOpen(harness);
  assert.ok(open, "previewEditOpen was posted");
  assert.equal(open.line, 1);
  assert.equal(open.endLine, 1);
  assert.equal(open.insertAfterLine, 0);
  assert.equal(prevented, true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-253
test("empty document: Enter with the document body or the edit-mode toggle as target opens the editor", () => {
  for (const pick of [
    (harness: RuntimeHarness) => harness.body,
    (harness: RuntimeHarness) => harness.documentElement,
    (harness: RuntimeHarness) => {
      // The real toggle is a button that holds the focus right after it was pressed.
      Object.defineProperty(harness.editModeButton, "tagName", { value: "BUTTON" });
      return harness.editModeButton;
    },
  ]) {
    const harness = createRuntimeHarness(EMPTY);
    press(harness, "Enter", pick(harness));
    assert.equal(lastOpen(harness)?.insertAfterLine, 0);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-253
test("empty document: Arrow Down opens the editor from every page target, Arrow Up does nothing", () => {
  for (const pick of [
    (harness: RuntimeHarness) => harness.body,
    (harness: RuntimeHarness) => harness.previewContent,
    (harness: RuntimeHarness) => startButtonOf(harness),
  ]) {
    const harness = createRuntimeHarness(EMPTY);
    const prevented = press(harness, "ArrowDown", pick(harness));
    const open = lastOpen(harness);
    assert.equal(open?.line, 1);
    assert.equal(open?.endLine, 1);
    assert.equal(open?.insertAfterLine, 0);
    assert.equal(prevented, true);
  }
  const harness = createRuntimeHarness(EMPTY);
  press(harness, "ArrowUp", startButtonOf(harness));
  press(harness, "ArrowUp", harness.body);
  assert.equal(harness.messages.some((message) => message.type === "previewEditOpen"), false);
  assert.equal(startButtonOf(harness).getAttribute("data-sphinx-preview-start-selected"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-253
test("empty document: the keys do nothing with a modifier, in a field, in reading mode, or with blocks", () => {
  const opens = (harness: RuntimeHarness, key: string, event: Record<string, unknown>): boolean => {
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", { key, target: harness.body, preventDefault: () => undefined, ...event });
    return harness.messages.slice(before).some((message) => message.type === "previewEditOpen");
  };
  for (const key of ["Enter", "ArrowDown"]) {
    for (const modifier of ["shiftKey", "altKey", "metaKey", "ctrlKey", "isComposing"]) {
      assert.equal(opens(createRuntimeHarness(EMPTY), key, { [modifier]: true }), false, key + modifier);
    }
    const field = new RuntimeElement({}, { scrollY: 0 }, 0, 20, "textarea");
    assert.equal(opens(createRuntimeHarness(EMPTY), key, { target: field }), false, key + " textarea");
    assert.equal(opens(createRuntimeHarness({ emptyBody: true, previewStatus: "success" }), key, {}), false, key + " reading");
    assert.equal(
      opens(createRuntimeHarness({ ...EMPTY, previewStatus: "error" }), key, {}), false, key + " failed render");
    assert.equal(opens(createRuntimeHarness({ savedState: { editMode: true } }), key, {}), false, key + " blocks");
    const harness = createRuntimeHarness(EMPTY);
    assert.equal(opens(harness, key, {}), true, key + " first");
    assert.equal(opens(harness, key, {}), false, key + " an editor is already open");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-253
test("empty document: the Start writing point carries the hint line and the selection marker", () => {
  const harness = createRuntimeHarness(EMPTY);
  const point = insertPointAfterLine(harness, 0);
  const hint = hintOf(point);
  assert.ok(hint, "a hint element under the button");
  assert.equal(hint.textContent, HINT_TEXT);
  assert.equal(point.childElements.indexOf(hint) > point.childElements.indexOf(startButtonOf(harness)), true);
  assert.equal(startButtonOf(harness).getAttribute("data-sphinx-preview-start-selected"), "true");
  assert.equal(startButtonOf(harness).tagName, "BUTTON");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-253
test("a document with blocks: the plus bars carry no hint and no selection marker", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const points = insertPointsOf(harness);
  assert.ok(points.length > 0);
  for (const point of points) {
    assert.equal(hintOf(point), undefined);
    assert.equal(point.childElements[0].getAttribute("data-sphinx-preview-start-selected"), null);
    assert.equal(point.textContent.includes(HINT_TEXT), false);
  }
});
