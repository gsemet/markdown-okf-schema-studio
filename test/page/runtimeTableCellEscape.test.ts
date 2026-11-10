import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement } from "./runtimeHarness";
import { cellEditorOf, openTableCellEditorForTab } from "./runtimeTestSupport";

/**
 * Escape in a table cell cancels only the cell it is pressed in (features/tableCellEditor.ts).
 */

const descendantsOf = (element: RuntimeElement): RuntimeElement[] =>
  element.childElements.flatMap((child) => [child, ...descendantsOf(child)]);

const typeInto = (control: { value: string; dispatch(type: string, init?: object): void }, text: string): void => {
  control.value = text;
  control.dispatch("input");
};

type Leave = "Tab" | "ArrowRight" | "click";

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
for (const leave of ["Tab", "ArrowRight", "click"] as Leave[]) {
  test("Escape after leaving a typed cell with " + leave + " keeps that cell and drops the open one", () => {
    const harness = createRuntimeHarness();
    const { cells, click, input } = openTableCellEditorForTab(harness);
    typeInto(input(), "x2");
    if (leave === "click") {
      click(cells[1][1]);
    } else {
      input().setSelectionRange(2, 2);
      input().dispatch("keydown", { key: leave, preventDefault: () => undefined });
    }
    assert.equal(input().value, "y");
    typeInto(input(), "y2");
    harness.flushTimers();
    input().dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    const saves = harness.messages.filter((message) => message.type === "previewEditSave");
    const last = saves.at(-1);
    assert.equal(last?.final, true);
    assert.match(String(last?.editedText), /\| x2 \| y \|/u);
    assert.doesNotMatch(String(last?.editedText), /y2/u);
    assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Escape after two cells left with Tab keeps both and drops only the open one", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness, { start: [0, 0] });
  typeInto(input(), "A2");
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  typeInto(input(), "B2");
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  typeInto(input(), "x2");
  input().dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const last = harness.messages.filter((message) => message.type === "previewEditSave").at(-1);
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /^\| A2 \| B2 \|\n\| --- \| --- \|\n\| x \| y \|/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Escape outside the cell editor after leaving a typed cell keeps that cell", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  typeInto(input(), "x2");
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  typeInto(input(), "y2");
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.body });
  const last = harness.messages.filter((message) => message.type === "previewEditSave").at(-1);
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /\| x2 \| y \|/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Escape in an untouched cell after a typed cell was left keeps the typed cell", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  typeInto(input(), "x2");
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  input().dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const last = harness.messages.filter((message) => message.type === "previewEditSave").at(-1);
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /\| x2 \| y \|/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Cancel after leaving a typed cell keeps that cell, like Escape", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  typeInto(input(), "A");
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  typeInto(input(), "yB");
  harness.flushTimers();
  const buttons = descendantsOf(cellEditorOf(harness)).filter((element) => element.tagName === "BUTTON");
  buttons[1].dispatch("click");
  const last = harness.messages.filter((message) => message.type === "previewEditSave").at(-1);
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /\| A \| y \|/u);
  assert.doesNotMatch(String(last?.editedText), /yB/u);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-025
test("Escape after leaving an untouched cell runs the whole cancel", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  typeInto(input(), "y2");
  input().dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});
