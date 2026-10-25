/**
 * Requirement tests of the palette that need the whole page runtime: the paste into a table cell
 * editor and the stale submit of the figure form. Each test asserts the behaviour of the current code.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";
import { figureHarness, openTableCellEditorForTab, paletteButton } from "./runtimeTestSupport";

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-213
test("pasting into the text box of a table cell editor stays a native paste, whatever the clipboard holds", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const control = openTableCellEditorForTab(harness).input();
  const before = harness.messages.length;
  let prevented = false;
  const event = (clipboardData: Record<string, unknown>): Record<string, unknown> => ({
    clipboardData, preventDefault: () => { prevented = true; },
  });
  const png = { type: "image/png", size: 8, dataUrl: "data:image/png;base64,aGVsbG8=" };
  control.dispatch("paste", event({
    getData: () => "",
    items: [{ kind: "file", type: "image/png", getAsFile: () => png }],
  }));
  control.dispatch("paste", event({
    getData: (type: string) => (type === "text/html" ? "<b>rich</b>" : "rich"),
    items: [],
  }));
  assert.equal(prevented, false, "the browser pastes");
  assert.equal(harness.messages.length, before, "no image and no conversion request reach the host");
});

const figureSource = [":::{figure} images/chip.png", ":alt: A chip", ":width: 60%", "", "The chip.", ":::"].join("\n");

const live = (harness: RuntimeHarness, attribute: string, name: string) =>
  harness.createdElements.find((element) => element.getAttribute(attribute) === name && !element.removed);

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-153
test("a figure form submitted on a text that changed is closed without writing", () => {
  const stale = figureHarness(figureSource, 5);
  paletteButton(stale.harness, "figure").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.ok(live(stale.harness, "data-sphinx-figure-panel", "true"), "the form opens");
  live(stale.harness, "data-figure-field", "width")!.value = "300px";
  // The text changes without an input event, so the form's range is stale.
  stale.textarea.value = stale.textarea.value + "\nExtra line";
  const changed = stale.textarea.value;
  live(stale.harness, "data-figure-action", "apply")!.dispatch("click", { preventDefault: () => undefined });
  assert.equal(stale.calls.length, 0, "nothing is written");
  assert.equal(stale.textarea.value, changed);
  assert.equal(live(stale.harness, "data-sphinx-figure-panel", "true"), undefined, "the form is closed");

  const fresh = figureHarness(figureSource, 5);
  paletteButton(fresh.harness, "figure").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  live(fresh.harness, "data-figure-field", "width")!.value = "300px";
  live(fresh.harness, "data-figure-action", "apply")!.dispatch("click", { preventDefault: () => undefined });
  assert.equal(fresh.calls.length, 1);
  assert.match(fresh.textarea.value, /:width: 300px/u);
});
