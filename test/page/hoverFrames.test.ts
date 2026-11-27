/**
 * Requirement tests of the edit-mode hover outline under a moving pointer: it follows the latest
 * element once per animation frame, and goes at once when the pointer leaves the window (issue 547).
 * The copy button's own frames are covered in `modules/codeCopy.test.ts`.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";

const HOVER = "data-sphinx-preview-edit-hover";

function editing(): { harness: RuntimeHarness; outlined: () => RuntimeElement[]; everOutlined: Set<RuntimeElement> } {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.flushFrames();
  const everOutlined = new Set<RuntimeElement>();
  for (const element of harness.mappings) {
    const set = element.setAttribute.bind(element);
    element.setAttribute = (name: string, value: string) => {
      if (name === HOVER) everOutlined.add(element);
      set(name, value);
    };
  }
  const outlined = (): RuntimeElement[] => harness.mappings.filter((element) => element.getAttribute(HOVER) !== null);
  return { harness, outlined, everOutlined };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017#S8
test("the hover outline follows the latest element the pointer went to, once per frame", () => {
  const { harness, outlined, everOutlined } = editing();
  const [first, second, third] = harness.mappings as [RuntimeElement, RuntimeElement, RuntimeElement];
  harness.dispatchDocument("mouseover", { target: first });
  harness.dispatchDocument("mouseout", { target: first, relatedTarget: second });
  harness.dispatchDocument("mouseover", { target: second });
  harness.dispatchDocument("mouseover", { target: third });
  assert.deepEqual(outlined(), [], "nothing changes before the frame");
  harness.flushFrames();
  assert.deepEqual(outlined(), [third]);
  assert.deepEqual([...everOutlined], [third], "the elements crossed on the way are never outlined");

  harness.dispatchDocument("mouseover", { target: first });
  assert.deepEqual(outlined(), [third], "the outline stays until the next frame");
  harness.flushFrames();
  assert.deepEqual(outlined(), [first]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017#S8
test("a pointer that leaves the window removes the outline at once, a waiting move included", () => {
  const { harness, outlined } = editing();
  const [first, second] = harness.mappings as [RuntimeElement, RuntimeElement];
  harness.dispatchDocument("mouseover", { target: first });
  harness.flushFrames();
  harness.dispatchDocument("mouseover", { target: second });
  harness.dispatchDocument("mouseout", { target: second, relatedTarget: null });
  assert.deepEqual(outlined(), [], "no frame is awaited");
  harness.flushFrames();
  assert.deepEqual(outlined(), [], "the waiting move is dropped");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017#S8
test("a focus change after a pointer move wins over it, and an element that left the page gets no outline", () => {
  const { harness, outlined } = editing();
  const [first, second, third] = harness.mappings as [RuntimeElement, RuntimeElement, RuntimeElement];
  harness.dispatchDocument("mouseover", { target: first });
  harness.dispatchDocument("focusin", { target: second });
  assert.deepEqual(outlined(), [second]);
  harness.flushFrames();
  assert.deepEqual(outlined(), [second], "the older pointer move does not take the outline back");

  harness.dispatchDocument("mouseover", { target: third });
  Object.defineProperty(third, "isConnected", { value: false });
  harness.flushFrames();
  assert.deepEqual(outlined(), []);
});
