/**
 * Requirement test of a diagram under edit: the page hides the rendered block while its block
 * editor is open and shows it again when the editor closes (`blockEditor.ts`, `editModeStyles.ts`).
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { EDIT_MODE_CSS } from "../../src/core/preview/styles/editModeStyles";
import { createRuntimeHarness } from "./runtimeHarness";
import { openBlockEditorWithSource } from "./runtimeTestSupport";

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001
test("a diagram block is hidden while its editor is open and shown again when it closes", () => {
  assert.match(EDIT_MODE_CSS, /\[data-sphinx-preview-editing="true"\]\s*\{\s*display: none !important;\s*\}/u);

  const harness = createRuntimeHarness();
  const figure = harness.mappings[1];
  figure.setAttribute("class", "myst-mermaid-figure");
  const textarea = openBlockEditorWithSource(harness);

  assert.equal(figure.getAttribute("data-sphinx-preview-editing"), "true");
  assert.ok(textarea);
  const placed = figure.insertedElements.map((element) => element.getAttribute("data-sphinx-preview-block-editor"));
  assert.ok(placed.includes("true"), "the block editor is placed right after the figure: " + JSON.stringify(placed));

  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(figure.getAttribute("data-sphinx-preview-editing"), null);
});
