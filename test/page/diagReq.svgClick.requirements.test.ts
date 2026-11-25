/**
 * Requirement test of the click on an svg picture (the click handler of src/page/features/pageInput.ts):
 * in edit mode a click on the picture opens the source editor of the block that holds it, in
 * reading mode it only reveals the lines. Runs the page runtime in the runtime harness.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";

/** A mapped svg figure (lines 30 to 34 of the document) with the picture inside it. */
function addPicture(harness: RuntimeHarness): { figure: RuntimeElement; picture: RuntimeElement } {
  const figure = new RuntimeElement({
    class: "myst-svg-figure",
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "30",
    "data-sphinx-source-end-line": "34",
  }, harness.windowState, 400, 120, "figure");
  const picture = new RuntimeElement({ viewBox: "0 0 10 10" }, harness.windowState, 400, 120, "svg");
  figure.appendChild(picture);
  harness.mappings.push(figure);
  return { figure, picture };
}

const click = (target: RuntimeElement) => ({ target, preventDefault: () => undefined, stopPropagation: () => undefined });

// @tests_req SwRS-MDOKFSTUDIO-DIAG-127#S2
test("in edit mode a click on an svg picture asks the host for the source of the block that holds it", () => {
  const harness = createRuntimeHarness();
  const { picture } = addPicture(harness);
  harness.editModeButton.dispatch("click");
  const before = harness.messages.length;
  harness.dispatchDocument("click", click(picture));
  const posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => message.type), ["previewEditOpen"], "an edit request and no reveal");
  assert.equal(posted[0]!.documentId, "file:///active.md");
  assert.equal(posted[0]!.line, 30, "the first line of the figure");
  assert.equal(posted[0]!.endLine, 34, "the last line of the figure");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-127#S1
test("in reading mode a click on an svg picture opens no editor", () => {
  const harness = createRuntimeHarness();
  const { picture } = addPicture(harness);
  const before = harness.messages.length;
  harness.dispatchDocument("click", click(picture));
  const posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => message.type), ["previewReveal"], "the lines are revealed, no edit is asked");
  assert.equal(posted[0]!.line, 30);
});
