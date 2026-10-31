import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import {
  figureHarness,
  frontmatterSaves,
  noop,
  openFrontmatterValueEditor,
  openTextFieldEditor,
  shiftKey,
} from "./runtimeTestSupport";

/**
 * The frontmatter key and value editors (features/frontmatterEditor.ts,
 * frontmatterValueEditor.ts).
 */

test("edit mode opens mapped figures and admonition titles at their source ranges", () => {
  const figureHarness = createRuntimeHarness();
  figureHarness.editModeButton.dispatch("click");
  const figure = new RuntimeElement({
    "data-sphinx-source-line": "20",
    "data-sphinx-source-end-line": "24",
  }, figureHarness.windowState, 100, 80, "figure");
  figureHarness.dispatchDocument("click", {
    target: figure,
    preventDefault: () => undefined,
  });
  const figureRequest = figureHarness.messages.at(-1);
  assert.equal(figureRequest?.type, "previewEditOpen");
  assert.equal(figureRequest?.line, 20);
  assert.equal(figureRequest?.endLine, 24);

  const admonitionHarness = createRuntimeHarness();
  admonitionHarness.editModeButton.dispatch("click");
  const admonition = new RuntimeElement({
    "data-sphinx-source-line": "30",
    "data-sphinx-source-end-line": "34",
  }, admonitionHarness.windowState, 100, 80, "aside");
  const title = new RuntimeElement({}, admonitionHarness.windowState, 100, 20, "p");
  admonition.appendChild(title);
  admonitionHarness.dispatchDocument("click", {
    target: title,
    preventDefault: () => undefined,
  });
  const admonitionRequest = admonitionHarness.messages.at(-1);
  assert.equal(admonitionRequest?.type, "previewEditOpen");
  assert.equal(admonitionRequest?.line, 30);
  assert.equal(admonitionRequest?.endLine, 34);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-024
test("frontmatter name cells open a schema-suggesting key editor and save on blur", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const keyInput = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  assert.ok(keyInput);
  assert.equal(harness.messages.some((message) => message.type === "previewEditOpen"), false);
  assert.equal(keyInput.value, "lifecycle");
  assert.equal(harness.frontmatterNameDisplay.getAttribute("hidden"), "");
  const datalist = harness.createdElements.find((element) => element.tagName === "DATALIST");
  assert.ok(datalist);
  assert.equal(keyInput.getAttribute("list"), datalist.getAttribute("id"));
  assert.deepEqual(
    datalist.childElements.map((option) => option.getAttribute("value")),
    ["status", "owner"],
  );
  const fieldMenu = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-menu") === "true");
  assert.ok(fieldMenu);
  assert.deepEqual(
    harness.createdElements
      .filter((element) => element.getAttribute("data-okf-frontmatter-operation") !== null)
      .map((element) => element.getAttribute("data-okf-frontmatter-operation")),
    ["add", "remove", "confirm-add"],
  );
  keyInput.value = "stage";
  keyInput.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldName, "lifecycle");
  assert.equal(save?.newFieldName, "stage");
  assert.equal(save?.fieldValue, "draft");
  assert.equal(harness.refreshButton.disabled, true);
});

test("Escape cancels an unsaved frontmatter key edit", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const keyInput = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  assert.ok(keyInput);
  keyInput.value = "stage";
  let prevented = false;
  keyInput.dispatch("keydown", {
    key: "Escape",
    preventDefault: () => { prevented = true; },
  });
  keyInput.dispatch("blur");

  assert.equal(prevented, true);
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  assert.equal(harness.frontmatterNameDisplay.getAttribute("hidden"), null);
  assert.equal(harness.frontmatterNameCell.getAttribute("data-okf-key-editing"), null);
  assert.equal(harness.refreshButton.disabled, false);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-003
test("edit mode exposes schema enum controls and saves the selected value", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  assert.equal(harness.frontmatterNameCell.getAttribute("tabindex"), null);
  assert.equal(harness.frontmatterValueCell.getAttribute("tabindex"), null);
  harness.editModeButton.dispatch("click");
  assert.equal(harness.frontmatterNameCell.getAttribute("tabindex"), "0");
  assert.equal(harness.frontmatterValueCell.getAttribute("tabindex"), "0");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  assert.equal(select.parentElement?.parentElement, harness.frontmatterValueCell);
  assert.deepEqual(select.childElements.map((option) => option.value), ["", "draft", "active"]);
  assert.equal(select.getAttribute("data-okf-empty-select"), "false");
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), "");
  assert.ok(harness.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove"));
  select.value = "active";
  select.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldName, "lifecycle");
  assert.equal(save?.fieldValue, "active");
  assert.equal(harness.refreshButton.disabled, true);
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: save?.editId,
    saved: true,
  });
  assert.equal(
    harness.createdElements.find((element) => element.getAttribute("role") === "status")?.textContent,
    "Saved. Refreshing preview…",
  );
});

test("boolean frontmatter values use a checkbox and save on change", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "false");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "false\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
  });

  const checkbox = harness.createdElements.find((element) => element.type === "checkbox");
  assert.ok(checkbox);
  assert.equal(checkbox.checked, false);
  assert.equal(checkbox.className, "okf-value-checkbox");
  assert.equal(checkbox.disabled, false);
  const checkboxValueLabel = harness.createdElements.find((element) =>
    element.className === "okf-boolean-value");
  assert.ok(checkboxValueLabel);
  assert.equal(checkboxValueLabel.textContent, "false");
  checkbox.checked = true;
  checkbox.dispatch("change");
  assert.equal(checkboxValueLabel.textContent, "true");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValue, true);
});

test("one click on a boolean value cell toggles and saves it", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "false");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "false\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValue, true);
  const label = harness.createdElements.find((element) => element.className === "okf-boolean-value");
  assert.equal(label?.textContent, "true");
  const status = harness.createdElements.find((element) =>
    element.getAttribute("role") === "status" && element.textContent === "Saving frontmatter\u2026");
  assert.ok(status);
});

test("one click on a true boolean value cell saves false", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "true");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "true\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.equal(harness.messages.at(-1)?.fieldValue, false);
});

test("clicking a boolean name cell still opens the key editor and reading mode does nothing", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "false");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);

  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.ok(harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"));
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
test("frontmatter list editor supports add, reorder, remove, and direct array saves", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one","two","three"]');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n- two\n- three\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor);
  const listEditor = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listEditor);
  const itemList = listEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(itemList);
  assert.equal(itemList.childElements.length, 3);
  const firstHandle = itemList.childElements[0]?.childElements[0];
  assert.equal(firstHandle?.getAttribute("draggable"), "true");

  const inputs = () => itemList.childElements.map((row) =>
    row.querySelector("[data-okf-list-item-input]"));
  inputs()[0]!.value = "one updated";
  firstHandle?.dispatch("keydown", {
    key: "ArrowDown",
    preventDefault: () => undefined,
  });
  assert.deepEqual(inputs().map((input) => input?.value), ["two", "one updated", "three"]);

  const addButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Add list item");
  assert.ok(addButton);
  addButton.dispatch("click");
  const addedInput = inputs().at(-1);
  assert.ok(addedInput);
  addedInput.value = "four";
  assert.equal(harness.createdElements.some((element) =>
    element.textContent === "Save" || element.textContent === "Cancel"), false);

  editor.dispatch("focusout", { relatedTarget: null });
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(JSON.stringify(save?.fieldValue), '["two","one updated","three","four"]');
});

test("list dragging shows the insertion boundary, reorders items, and suppresses drag blur saves", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one","two","three"]');
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  const itemList = harness.createdElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(editor);
  assert.ok(itemList);
  const listEditor = itemList.parentElement;
  assert.ok(listEditor);
  const [first, second, third] = itemList.childElements;
  first.top = 100;
  second.top = 150;
  third.top = 200;
  for (const row of [first, second, third]) row.height = 40;
  harness.windowState.scrollY = 0;
  const handle = first.childElements[0];
  let dragPayload = "";
  const dataTransfer = {
    effectAllowed: "",
    dropEffect: "",
    setData: (_format: string, value: string) => { dragPayload = value; },
  };
  handle.dispatch("dragstart", { dataTransfer });
  assert.equal(dataTransfer.effectAllowed, "move");
  assert.ok(dragPayload);
  assert.equal(first.getAttribute("data-okf-list-dragging"), "true");
  editor.dispatch("focusout", { relatedTarget: null });
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  assert.equal(handle.disabled, false);

  let acceptedDrop = false;
  const hover = (clientY: number) => ({
    clientY,
    dataTransfer,
    preventDefault: () => { acceptedDrop = true; },
    stopPropagation: () => undefined,
  });
  third.dispatch("dragover", hover(205));
  assert.equal(acceptedDrop, true);
  assert.equal(dataTransfer.dropEffect, "move");
  assert.equal(third.getAttribute("data-okf-list-drop"), "before");
  third.dispatch("dragover", hover(235));
  assert.equal(third.getAttribute("data-okf-list-drop"), "after");
  third.dispatch("drop", hover(235));
  handle.dispatch("dragend");
  const values = () => itemList.childElements.map((row) =>
    row.querySelector("[data-okf-list-item-input]")?.value);
  assert.deepEqual(values(), ["two", "three", "one"]);
  assert.ok(itemList.childElements.every((row) => row.getAttribute("data-okf-list-drop") === null));
  assert.equal(first.getAttribute("data-okf-list-dragging"), null);

  handle.dispatch("dragstart", { dataTransfer });
  harness.windowState.scrollY = 0;
  second.dispatch("dragover", hover(155));
  assert.equal(second.getAttribute("data-okf-list-drop"), "before");
  second.dispatch("drop", hover(155));
  handle.dispatch("dragend");
  assert.deepEqual(values(), ["one", "two", "three"]);

  handle.dispatch("dragstart", { dataTransfer });
  harness.windowState.scrollY = 0;
  listEditor.dispatch("dragover", hover(195));
  assert.equal(third.getAttribute("data-okf-list-drop"), "before");
  listEditor.dispatch("dragleave", { relatedTarget: third.childElements[1] });
  assert.equal(third.getAttribute("data-okf-list-drop"), "before");
  listEditor.dispatch("dragleave", { relatedTarget: null });
  assert.ok(itemList.childElements.every((row) => row.getAttribute("data-okf-list-drop") === null));
  third.dispatch("dragover", hover(235));
  handle.dispatch("dragend");
  assert.deepEqual(values(), ["one", "two", "three"]);
  assert.ok(itemList.childElements.every((row) => row.getAttribute("data-okf-list-drop") === null));
  acceptedDrop = false;
  listEditor.dispatch("dragover", hover(195));
  assert.equal(acceptedDrop, false);

  handle.dispatch("dragstart", { dataTransfer });
  harness.windowState.scrollY = 0;
  third.dispatch("drop", hover(235));
  handle.dispatch("dragend");
  editor.dispatch("focusout", { relatedTarget: null });
  assert.equal(JSON.stringify(harness.messages.at(-1)?.fieldValue), '["two","three","one"]');
});

test("nullable list editor can set its value as null", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-nullable", "true");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one"]');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const setNullButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-list-set-null") === "true");
  assert.ok(setNullButton);
  assert.equal(setNullButton.textContent, "Set to null");
  setNullButton.dispatch("click", { stopPropagation: () => undefined });

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(Object.prototype.hasOwnProperty.call(save ?? {}, "fieldValue"), true);
  assert.equal(save?.fieldValue, null);
});

test("nullable scalar editor can set its value to null", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-nullable", "true");
  harness.frontmatterRow.setAttribute("data-okf-value", '"reason"');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "reason\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const setNullButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-set-null") === "true");
  assert.ok(setNullButton);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor?.childElements.includes(setNullButton));
  assert.equal(setNullButton.textContent, "Set to null");
  setNullButton.dispatch("click", { stopPropagation: () => undefined });

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValue, null);
});

test("frontmatter list editor adds from empty and saves after removing every item", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", "[]");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "[]\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor);
  const listEditor = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listEditor);
  const itemList = listEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(itemList);
  assert.equal(itemList.childElements.length, 0);
  const addButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Add list item");
  assert.ok(addButton);

  addButton.dispatch("click");
  assert.equal(itemList.childElements.length, 1);
  const firstRemoveButton = itemList.childElements[0]?.childElements[2];
  assert.ok(firstRemoveButton);
  let clickStopped = false;
  let mouseDownPrevented = false;
  firstRemoveButton.dispatch("mousedown", { preventDefault: () => { mouseDownPrevented = true; } });
  assert.equal(mouseDownPrevented, true);
  firstRemoveButton.dispatch("click", { stopPropagation: () => { clickStopped = true; } });
  assert.equal(clickStopped, true);
  assert.equal(itemList.childElements.length, 0);

  editor.dispatch("focusout", { relatedTarget: null });
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);

  const removeHarness = createRuntimeHarness();
  removeHarness.frontmatterRow.setAttribute("data-okf-type", "list");
  removeHarness.frontmatterRow.setAttribute("data-okf-value", '["only"]');
  removeHarness.frontmatterRow.setAttribute("data-okf-value-yaml", "- only\n");
  removeHarness.editModeButton.dispatch("click");
  removeHarness.dispatchDocument("click", {
    target: removeHarness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const removeEditor = removeHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(removeEditor);
  const removeListEditor = removeEditor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(removeListEditor);
  const removeItemList = removeListEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(removeItemList);
  removeItemList.childElements[0]?.childElements[2]?.dispatch("click");
  removeEditor.dispatch("focusout", { relatedTarget: null });
  const removeSave = removeHarness.messages.at(-1);
  assert.equal(JSON.stringify(removeSave?.fieldValue), "[]");
});

test("frontmatter list editor keeps invalid edits open and Escape cancels them", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one"]');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor);
  const listEditor = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listEditor);
  const itemList = listEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(itemList);
  const input = itemList.childElements[0]?.querySelector("[data-okf-list-item-input]");
  assert.ok(input);
  input.value = "invalid";
  editor.dispatch("focusout", { relatedTarget: null });
  const save = harness.messages.at(-1);
  const status = harness.createdElements.find((element) => element.getAttribute("role") === "status");
  assert.ok(status);
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: save?.editId,
    error: "Schema validation failed: invalid list item",
  });
  assert.equal(status.getAttribute("data-visible"), "true");
  assert.equal(input.disabled, false);
  const listControl = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listControl);
  listControl.dispatch("keydown", {
    key: "Escape",
    preventDefault: () => undefined,
  });
  assert.equal(harness.messages.filter((message) => message.type === "previewFrontmatterSave").length, 1);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null);
});

test("frontmatter validation errors show an explicit error state", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  select.value = "invalid";
  select.dispatch("blur");
  const save = harness.messages.at(-1);
  const status = harness.createdElements.find((element) => element.getAttribute("role") === "status");
  assert.ok(status);

  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: save?.editId,
    error: "Schema validation failed: must NOT have fewer than 1 characters",
  });
  assert.equal(status.getAttribute("data-state"), "error");
  assert.equal(status.getAttribute("data-visible"), "true");
  assert.equal(status.textContent, "Schema validation failed: must NOT have fewer than 1 characters");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-028
test("frontmatter field actions render inside the edited row", () => {
  for (const fieldCell of ["name", "value"] as const) {
    const harness = createRuntimeHarness({ mapFrontmatter: true, viewportWidth: 460, viewportHeight: 600 });
    const anchor = fieldCell === "name" ? harness.frontmatterNameCell : harness.frontmatterValueCell;
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target: anchor,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    const menu = harness.createdElements.find((element) => element.getAttribute("data-okf-frontmatter-menu") === "true");
    assert.ok(menu, fieldCell);
    const editor = harness.createdElements.find((element) => element.getAttribute("data-okf-frontmatter-editor") !== null);
    assert.ok(editor, fieldCell);
    assert.equal(menu.parentElement, editor, fieldCell);
    assert.equal(editor.childElements[editor.childElements.length - 1], menu, fieldCell);
    assert.notEqual(menu.parentElement, harness.body, fieldCell);
    assert.equal(menu.getAttribute("data-placement"), null, fieldCell);
    assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-top"), "", fieldCell);
    assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-left"), "", fieldCell);
    const labels = harness.createdElements
      .filter((element) => element.className === "sphinx-preview-frontmatter-menu-label")
      .map((element) => element.textContent);
    assert.deepEqual(labels, ["Add field", "Remove field", "Add"], fieldCell);
    harness.windowState.scrollY = 50;
    harness.dispatchWindow("scroll");
    harness.dispatchWindow("resize");
    assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-top"), "", fieldCell);
    assert.equal(menu.parentElement, editor, fieldCell);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("frontmatter blur toward the field actions does not save", () => {
  type Harness = ReturnType<typeof createRuntimeHarness>;
  const saves = (harness: Harness) =>
    harness.messages.filter((message) => message.type === "previewFrontmatterSave");
  const open = (harness: Harness, target: unknown) => {
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
  };
  const operation = (harness: Harness, name: string) =>
    harness.createdElements.find((element) =>
      element.getAttribute("data-okf-frontmatter-operation") === name);

  // value editor
  const valueHarness = createRuntimeHarness({ mapFrontmatter: true });
  valueHarness.frontmatterRow.setAttribute("data-okf-type", "text");
  valueHarness.frontmatterRow.setAttribute("data-okf-value", '"Core"');
  open(valueHarness, valueHarness.frontmatterValueCell);
  const valueControl = valueHarness.createdElements.find((element) => element.tagName === "TEXTAREA");
  const valueEditor = valueHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  const valueAdd = operation(valueHarness, "add");
  assert.ok(valueControl && valueEditor && valueAdd);
  valueControl.value = "Changed";
  valueControl.dispatch("blur", { relatedTarget: valueAdd });
  assert.equal(saves(valueHarness).length, 0);
  assert.equal(valueAdd.parentElement?.parentElement, valueEditor);
  valueControl.dispatch("blur", { relatedTarget: null });
  assert.equal(saves(valueHarness).length, 1);

  // key editor
  const keyHarness = createRuntimeHarness({ mapFrontmatter: true });
  open(keyHarness, keyHarness.frontmatterNameCell);
  const keyInput = keyHarness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  const keyAdd = operation(keyHarness, "add");
  assert.ok(keyInput && keyAdd);
  keyInput.value = "stage";
  keyInput.dispatch("blur", { relatedTarget: keyAdd });
  assert.equal(saves(keyHarness).length, 0);
  keyInput.dispatch("blur", { relatedTarget: null });
  assert.equal(saves(keyHarness).length, 1);

  // list editor: focusout toward the picker
  const listHarness = createRuntimeHarness({ mapFrontmatter: true });
  listHarness.frontmatterRow.setAttribute("data-okf-type", "list");
  listHarness.frontmatterRow.setAttribute("data-okf-value", '["one","two"]');
  listHarness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n- two\n");
  open(listHarness, listHarness.frontmatterValueCell);
  const listEditor = listHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  const picker = listHarness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  const firstItem = listHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-list-item-input") !== null);
  assert.ok(listEditor && picker && firstItem);
  firstItem.value = "one updated";
  listEditor.dispatch("focusout", { relatedTarget: picker });
  assert.equal(saves(listHarness).length, 0);
  listEditor.dispatch("focusout", { relatedTarget: null });
  assert.equal(saves(listHarness).length, 1);
});

test("frontmatter text values open a one-row textarea", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-value", '"Core"');
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.getAttribute("data-okf-text-value"), "true");
  assert.equal(textarea.rows, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-029
test("frontmatter field toolbar adds and removes fields", () => {
  const addHarness = createRuntimeHarness({ mapFrontmatter: true });
  addHarness.editModeButton.dispatch("click");
  addHarness.dispatchDocument("click", {
    target: addHarness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const addButton = addHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "add");
  assert.ok(addButton);
  assert.equal(addButton.getAttribute("title"), "Add frontmatter field");
  assert.equal(addButton.getAttribute("data-tooltip"), "Add frontmatter field");
  const menu = addHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-menu") === "true");
  assert.ok(menu);
  assert.equal(menu.getAttribute("data-placement"), null);
  assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-top"), "");
  const fieldPicker = addHarness.createdElements.find((element) =>
    element.className === "sphinx-preview-frontmatter-picker");
  assert.ok(fieldPicker);
  assert.equal(fieldPicker.getAttribute("hidden"), "");
  addButton.dispatch("click");
  assert.equal(fieldPicker.getAttribute("hidden"), null);
  const fieldControl = addHarness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(fieldControl);
  assert.equal(fieldControl.tagName, "SELECT");
  assert.deepEqual(fieldControl.childElements.map((option) => option.value), ["", "status", "owner", "__custom__"]);
  fieldControl.value = "status";
  fieldControl.dispatch("change");
  const confirmAdd = addHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "confirm-add");
  assert.ok(confirmAdd);
  assert.equal(confirmAdd.getAttribute("title"), "Add selected frontmatter field");
  assert.equal(confirmAdd.getAttribute("data-tooltip"), "Add selected frontmatter field");
  assert.equal(confirmAdd.disabled, false);
  confirmAdd.dispatch("click");
  const addMessage = addHarness.messages.at(-1);
  assert.equal(addMessage?.frontmatterAction, "add");
  assert.equal(addMessage?.fieldName, "status");
  assert.equal(addMessage?.fieldValue, "draft");

  const removeHarness = createRuntimeHarness({ mapFrontmatter: true });
  removeHarness.editModeButton.dispatch("click");
  removeHarness.dispatchDocument("click", {
    target: removeHarness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const removeButton = removeHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove");
  assert.ok(removeButton);
  assert.equal(removeButton.getAttribute("title"), "Remove frontmatter field");
  assert.equal(removeButton.getAttribute("data-tooltip"), "Remove frontmatter field");
  removeButton.dispatch("click");
  const removeMessage = removeHarness.messages.at(-1);
  assert.equal(removeMessage?.frontmatterAction, "remove");
  assert.equal(removeMessage?.fieldName, "lifecycle");
  assert.equal(Object.prototype.hasOwnProperty.call(removeMessage ?? {}, "fieldValue"), false);
});

test("empty enum values show an explicit placeholder", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-value", "null");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  assert.equal(select.getAttribute("data-okf-empty-select"), "true");
  assert.equal(select.childElements[0]?.textContent, "Choose a value...");
});

test("schema-free frontmatter values use a generic YAML editor", () => {
  const harness = createRuntimeHarness();
  const valueYaml = "owner: platform\nlabels:\n  - alpha\n";
  harness.frontmatterRow.setAttribute("data-okf-schema-found", "false");
  harness.frontmatterRow.setAttribute("data-okf-type", "unknown");
  harness.frontmatterRow.setAttribute("data-okf-value", '{"owner":"platform","labels":["alpha"]}');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", valueYaml);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, valueYaml);
  assert.equal(textarea.rows, 4);
  assert.ok(harness.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "add"));
  let enterPrevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    preventDefault: () => { enterPrevented = true; },
  });
  assert.equal(enterPrevented, false);
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  textarea.value = "owner: experience\nlabels:\n  - beta\n";
  textarea.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValueFormat, "yaml");
  assert.equal(save?.fieldValue, textarea.value);

  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: textarea,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, false);
});

test("text frontmatter values use a wrapping textarea that grows with its content", () => {
  const harness = createRuntimeHarness();
  const longValue = "A long frontmatter value that needs to wrap. ".repeat(20);
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify(longValue));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", `${longValue}\n`);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, longValue);
  assert.equal(textarea.getAttribute("data-okf-text-value"), "true");
  assert.equal(textarea.style.height, `${textarea.scrollHeight}px`);

  textarea.scrollHeight = 3_000;
  textarea.dispatch("input");
  assert.equal(textarea.style.height, "3000px");

  textarea.scrollHeight = 4_000;
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(textarea.style.height, "4000px");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-004
test("Enter saves a one-line frontmatter text field and Shift+Enter does not", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  assert.equal(textarea.getAttribute("aria-keyshortcuts"), "Enter Shift+Enter");
  assert.equal(textarea.getAttribute("title"), "Enter saves \u00b7 Shift+Enter adds a line");

  textarea.value = "Beta";
  let shiftPrevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    shiftKey: true,
    preventDefault: () => { shiftPrevented = true; },
  });
  assert.equal(shiftPrevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);

  let prevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValue, "Beta");
});

test("Enter in a multi-line frontmatter text value inserts a line; Cmd/Ctrl+Enter saves", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "a\nb";
  let prevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);

  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValue, "a\nb");
});

test("saving a frontmatter text field strips trailing line breaks unless the original had one", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta\n";
  textarea.dispatch("blur", {});
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValue, "Beta");

  const kept = openTextFieldEditor("Alpha\n");
  kept.textarea.value = "Beta\n";
  kept.textarea.dispatch("blur", {});
  assert.equal(frontmatterSaves(kept.harness)[0]?.fieldValue, "Beta\n");
});

test("Enter in the YAML frontmatter editor inserts a line; Cmd/Ctrl+Enter saves", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "unknown");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "a: 2\n";
  let prevented = false;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);

  textarea.dispatch("keydown", { key: "Enter", ctrlKey: true, preventDefault: () => undefined });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValueFormat, "yaml");
});

test("Escape cancels an unsaved frontmatter value edit", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  select.value = "active";
  select.dispatch("change");
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  let prevented = false;
  select.dispatch("keydown", {
    key: "Escape",
    preventDefault: () => { prevented = true; },
  });
  select.dispatch("blur");

  assert.equal(prevented, true);
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null);
  assert.equal(harness.refreshButton.disabled, false);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-001
test("frontmatter cells open their field editor with the keyboard in edit mode", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.frontmatterNameCell,
    preventDefault: () => { prevented = true; },
  });

  assert.equal(prevented, true);
  assert.ok(harness.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"));
});

function newCustomKeyHarness() {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "approver", requestId: "old" } },
    frontmatterRowAttributes: {
      class: "okf-unknown",
      "data-okf-field": "approver",
      "data-okf-type": "unknown",
      "data-okf-value": '""',
      "data-okf-value-yaml": '""\n',
    },
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea, "the editor of the new custom key is a text area");
  return { harness, textarea };
}

test("T41: a new custom key opens a one-line text editor, not the YAML editor", () => {
  const { textarea } = newCustomKeyHarness();
  assert.equal(textarea.getAttribute("data-okf-text-value"), "true");
  assert.equal(textarea.getAttribute("aria-keyshortcuts"), "Enter Shift+Enter");
  assert.equal(textarea.value, "");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-037
test("T41: Enter saves a new custom key as plain text and Shift+Enter adds a line", () => {
  const { harness, textarea } = newCustomKeyHarness();
  textarea.value = "Ann";
  let shiftPrevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    shiftKey: true,
    preventDefault: () => { shiftPrevented = true; },
  });
  assert.equal(shiftPrevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);
  let prevented = false;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldName, "approver");
  assert.equal(saves[0]?.fieldValue, "Ann");
  assert.equal(saves[0]?.fieldValueFormat, undefined);
  assert.equal(saves[0]?.fieldValueStyle, "plain");
});

test("T41: an existing field's save does not ask for a plain scalar", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta";
  textarea.dispatch("keydown", { key: "Enter", preventDefault: noop });
  assert.equal(frontmatterSaves(harness)[0]?.fieldValueStyle, undefined);
});

test("T41: Escape on the field picker cancels the open frontmatter edit", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const control = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add");
  assert.ok(control);
  const addButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "add")!;
  addButton.dispatch("click", {});
  const picker = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add")!;
  const before = harness.messages.length;
  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Escape",
    target: picker,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  assert.equal(editor?.parentElement, undefined, "the editor is removed");
  // A blur of the removed control must not save anything.
  control.value = "active";
  control.dispatch("blur", {});
  assert.equal(harness.messages.length, before);
});

test("T41: Escape outside the properties section does not touch an open frontmatter edit", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const outside = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add")!;
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null)!;
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.editModeButton, preventDefault: noop });
  assert.ok(editor.parentElement, "the editor stays open");
  assert.ok(outside);
});

// CR 218: after a refused value save the control is enabled again but the focus is gone (the control
// was disabled during the save). The editor must stay usable: focus back, Escape, a click elsewhere.
function refusedNumberEditor() {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    trackFocus: true,
    blurOnFocusChange: true,
    frontmatterRowAttributes: {
      "data-okf-field": "priority",
      "data-okf-type": "number",
      "data-okf-value": "2",
      "data-okf-value-yaml": "2\n",
    },
  });
  const titleRow = new RuntimeElement({
    "data-okf-editable": "true",
    "data-okf-field": "title",
    "data-okf-schema-found": "true",
    "data-okf-type": "text",
    "data-okf-value": '"Saved title"',
    "data-okf-value-yaml": "Saved title\n",
  }, harness.windowState, 0, 30, "tr");
  const titleDisplay = new RuntimeElement({ "data-okf-value-display": "true" }, harness.windowState, 0, 30, "span");
  const titleCell = new RuntimeElement({
    "data-okf-edit-cell": "value",
    "data-okf-value-cell": "true",
  }, harness.windowState, 0, 30, "td");
  titleCell.appendChild(titleDisplay);
  titleRow.appendChild(titleCell);
  harness.frontmatterRow.parentElement?.appendChild(titleRow);
  harness.editModeButton.dispatch("click");
  const click = (target: RuntimeElement) => harness.dispatchDocument("click", {
    target,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  click(harness.frontmatterValueCell);
  const control = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Frontmatter priority");
  assert.ok(control);
  control.value = "7";
  control.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(harness).length, 1);
  // A browser drops the focus to the body when the focused control becomes disabled.
  (harness.windowState as { focused?: RuntimeElement }).focused = undefined;
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: frontmatterSaves(harness)[0].editId,
    error: "Schema validation failed: must be <= 5",
  });
  assert.equal(control.disabled, false);
  return { harness, control, click, titleCell, titleDisplay };
}

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("a refused frontmatter value save puts the focus back in the control", () => {
  const { harness, control } = refusedNumberEditor();
  assert.equal(harness.document.activeElement, control);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("Escape closes the editor after a refused frontmatter value save", () => {
  const { harness, control } = refusedNumberEditor();
  const before = frontmatterSaves(harness).length;
  // The focus is where the browser left it (the body), as the document Escape handler sees it.
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.body, preventDefault: () => undefined });
  if (harness.document.activeElement === control) {
    control.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  }
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null);
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-editing"), null);
  assert.equal(frontmatterSaves(harness).length, before);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("a click on another field after a refused value save closes the refused editor and opens the other", () => {
  const { harness, control, click, titleCell, titleDisplay } = refusedNumberEditor();
  const before = frontmatterSaves(harness).length;
  // The writer clicks back into the control, leaves the text as refused, then clicks another field.
  control.focus();
  titleCell.focus();
  assert.equal(frontmatterSaves(harness).length, before, "the unchanged refused text is not posted again");
  click(titleCell);
  assert.equal(frontmatterSaves(harness).length, before, "closing the refused editor saves nothing");
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null, "priority shows its saved value");
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-editing"), null);
  assert.equal(titleDisplay.getAttribute("hidden"), "", "the clicked field's editor opened in the same click");
  assert.ok(harness.createdElements.some((element) => element.getAttribute("aria-label") === "Frontmatter title"));
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("a corrected value and Enter after a refused value save post exactly one new save", () => {
  const { harness, control } = refusedNumberEditor();
  const before = frontmatterSaves(harness).length;
  control.focus();
  control.value = "4";
  control.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, before + 1);
  assert.equal(saves.at(-1)?.fieldValue, 4);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("a changed value after a refused value save is saved once by the blur", () => {
  const { harness, control, titleCell } = refusedNumberEditor();
  const before = frontmatterSaves(harness).length;
  control.value = "4";
  titleCell.focus();
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, before + 1);
  assert.equal(saves.at(-1)?.fieldValue, 4);
  assert.equal(control.disabled, true, "the changed value is saving");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("a refused key save puts the focus back in the key control and its blur posts nothing again", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true, trackFocus: true, blurOnFocusChange: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const keyInput = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  assert.ok(keyInput);
  keyInput.value = "stage";
  keyInput.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(harness).length, 1);
  (harness.windowState as { focused?: RuntimeElement }).focused = undefined;
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: frontmatterSaves(harness)[0].editId,
    error: "The key stage is not allowed.",
  });
  assert.equal(keyInput.disabled, false);
  assert.equal(harness.document.activeElement, keyInput);
  keyInput.blur();
  assert.equal(frontmatterSaves(harness).length, 1, "the unchanged refused key is not posted again");
});
