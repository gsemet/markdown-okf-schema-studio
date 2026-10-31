import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  addOkfLink,
  cellMarkup,
  mapping,
  noop,
  openFrontmatterValueEditor,
  propertiesMessage,
  shiftKey,
  t21ClickEvent,
} from "./runtimeTestSupport";

/**
 * Frontmatter links, the list editor, the field picker, custom keys and the properties table
 * updates (features/frontmatterListEditor.ts, frontmatterMenu.ts).
 */

function openedFrontmatterEditors(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
}

test("T21: in edit mode a plain click on an okf link opens the field editor and does not navigate", () => {
  const harness = createRuntimeHarness();
  const link = addOkfLink(harness);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", t21ClickEvent(link));
  assert.equal(openedFrontmatterEditors(harness).length, 1);
  assert.equal(harness.messages.some((message) => message.type === "previewLink"), false);
});

test("T21: Cmd or Ctrl click on an okf link in edit mode still navigates", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const harness = createRuntimeHarness();
    const link = addOkfLink(harness);
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", t21ClickEvent(link, modifier));
    assert.equal(openedFrontmatterEditors(harness).length, 0);
    assert.equal(harness.messages.filter((message) => message.type === "previewLink").length, 1);
  }
});

test("T21: in reading mode a click on an okf link navigates", () => {
  const harness = createRuntimeHarness();
  const link = addOkfLink(harness);
  harness.dispatchDocument("click", t21ClickEvent(link));
  assert.equal(openedFrontmatterEditors(harness).length, 0);
  const posted = harness.messages.find((message) => message.type === "previewLink");
  assert.equal(posted?.request, "okf-link:abc");
});

interface ListHarness {
  harness: RuntimeHarness;
  rows: () => RuntimeElement[];
  inputs: () => RuntimeElement[];
  editor: RuntimeElement;
  addButton: RuntimeElement;
}

function openListEditor(values: string, suggestions?: string, known?: string): ListHarness {
  const harness = createRuntimeHarness();
  if (suggestions !== undefined) harness.frontmatterRow.setAttribute("data-okf-link-suggestions", suggestions);
  if (known !== undefined) harness.frontmatterRow.setAttribute("data-okf-link-known", known);
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", values);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", t21ClickEvent(harness.frontmatterValueCell));
  const editor = openedFrontmatterEditors(harness)[0];
  assert.ok(editor);
  const itemList = harness.createdElements.find((element) => element.className === "okf-list-editor-items");
  assert.ok(itemList);
  const addButton = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Add list item");
  assert.ok(addButton);
  return {
    harness,
    editor,
    addButton,
    rows: () => itemList.childElements,
    inputs: () => itemList.childElements.map((row) => row.querySelector("[data-okf-list-item-input]")!),
  };
}

function recordFocus<T>(body: (focused: RuntimeElement[]) => T): T {
  const focused: RuntimeElement[] = [];
  const original = RuntimeElement.prototype.focus;
  RuntimeElement.prototype.focus = function (this: RuntimeElement, options?: FocusOptions): void {
    focused.push(this);
    original.call(this, options);
  };
  try {
    return body(focused);
  } finally {
    RuntimeElement.prototype.focus = original;
  }
}

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
test("T21: Enter in a list item inserts an empty item after it, focuses it, and does not save", () => {
  recordFocus((focused) => {
    const list = openListEditor('["one","two"]');
    focused.length = 0;
    list.inputs()[0]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
    assert.deepEqual(list.inputs().map((input) => input.value), ["one", "", "two"]);
    assert.equal(focused.at(-1), list.inputs()[1]);
    assert.equal(list.harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
    assert.equal(list.inputs()[1]!.getAttribute("aria-label"), "List item 2");
    assert.equal(list.inputs()[2]!.getAttribute("aria-label"), "List item 3");
  });
});

test("T21: Enter in an empty last list item removes it and saves the list", () => {
  const list = openListEditor('["one"]');
  list.inputs()[0]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
  list.inputs()[1]!.value = "two";
  list.inputs()[1]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
  assert.equal(list.inputs().length, 3);
  list.inputs()[2]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
  const save = list.harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(JSON.stringify(save?.fieldValue), '["one","two"]');
});

test("T21: Backspace in an empty middle list item removes it and focuses the previous input", () => {
  recordFocus((focused) => {
    const list = openListEditor('["one","","three"]');
    const [first, middle, last] = list.inputs();
    focused.length = 0;
    middle!.selectionStart = 0;
    middle!.dispatch("keydown", { key: "Backspace", preventDefault: noop });
    assert.deepEqual(list.inputs().map((input) => input.value), ["one", "three"]);
    assert.equal(focused[0], first);
    assert.deepEqual(first!.selectionRange, [3, 3]);
    assert.equal(list.harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
    assert.equal(list.inputs()[1], last);
  });
});

test("T21: Backspace in an empty first item focuses the next input, and in the only item the add button", () => {
  recordFocus((focused) => {
    const list = openListEditor('["","two"]');
    const [first, second] = list.inputs();
    focused.length = 0;
    first!.dispatch("keydown", { key: "Backspace", preventDefault: noop });
    assert.equal(focused[0], second);
    second!.value = "";
    focused.length = 0;
    second!.dispatch("keydown", { key: "Backspace", preventDefault: noop });
    assert.equal(focused[0], list.addButton);
    assert.equal(list.inputs().length, 0);
  });
});

test("T21: Backspace in a non-empty list item is left to the browser", () => {
  const list = openListEditor('["one","two"]');
  let prevented = false;
  list.inputs()[1]!.dispatch("keydown", { key: "Backspace", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(list.inputs().length, 2);
});

test("T21: Cmd or Ctrl+Enter in a list item saves the list", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const list = openListEditor('["one"]');
    list.inputs()[0]!.value = "uno";
    list.inputs()[0]!.dispatch("keydown", { key: "Enter", preventDefault: noop, ...modifier });
    const save = list.harness.messages.at(-1);
    assert.equal(save?.type, "previewFrontmatterSave");
    assert.equal(JSON.stringify(save?.fieldValue), '["uno"]');
  }
});

test("T21: Enter while composing or with Shift does not touch the list", () => {
  const list = openListEditor('["one"]');
  list.inputs()[0]!.dispatch("keydown", { key: "Enter", isComposing: true, preventDefault: noop });
  list.inputs()[0]!.dispatch("keydown", { key: "Enter", shiftKey: true, preventDefault: noop });
  assert.equal(list.inputs().length, 1);
});

function listStatus(list: ListHarness): RuntimeElement {
  const status = list.harness.createdElements.find((element) => element.getAttribute("role") === "status");
  assert.ok(status);
  return status;
}

test("T22: list inputs get the datalist of link suggestions, new items included", () => {
  const list = openListEditor('["StRS-A"]', '["StRS-A","StRS-B"]');
  const datalist = list.harness.createdElements.find((element) => element.tagName === "DATALIST"
    && element.getAttribute("id")?.startsWith("okf-frontmatter-link-options-"));
  assert.ok(datalist);
  assert.deepEqual(datalist.childElements.map((option) => option.getAttribute("value")), ["StRS-A", "StRS-B"]);
  assert.equal(list.inputs()[0]!.getAttribute("list"), datalist.getAttribute("id"));
  list.addButton.dispatch("click");
  assert.equal(list.inputs()[1]!.getAttribute("list"), datalist.getAttribute("id"));
});

test("T22: without or with an invalid suggestions attribute the inputs have no list", () => {
  for (const suggestions of [undefined, "not json", "{}", "[]"]) {
    const list = openListEditor('["a"]', suggestions);
    assert.equal(list.inputs()[0]!.getAttribute("list"), null);
  }
});

test("T22: an unknown value warns, a known or empty value clears the warning", () => {
  const list = openListEditor('[""]', '["StRS-B"]');
  const input = list.inputs()[0]!;
  const status = listStatus(list);
  input.value = "StRS-BX";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(status.getAttribute("data-state"), "warning");
  assert.equal(status.getAttribute("data-visible"), "true");
  assert.equal(status.textContent, 'No Markdown file named "StRS-BX.md" was found. It will be saved as typed.');
  input.value = "StRS-B";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(status.getAttribute("data-state"), null);
  assert.equal(status.getAttribute("data-visible"), null);
  input.value = "X";
  input.dispatch("input", {});
  assert.equal(status.getAttribute("data-state"), "warning");
  input.value = "";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(status.getAttribute("data-state"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
test("T220: a known stem outside the dropdown suggestions does not warn, an unknown one still does", () => {
  const list = openListEditor('[""]', '["StRS-A"]', '["StRS-A","related-target"]');
  const input = list.inputs()[0]!;
  const status = listStatus(list);
  const datalist = list.harness.createdElements.find((element) => element.tagName === "DATALIST");
  assert.deepEqual(datalist?.childElements.map((option) => option.getAttribute("value")), ["StRS-A"]);
  input.value = "related-target";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(status.getAttribute("data-state"), null);
  assert.equal(status.textContent, "");
  input.value = "zzz";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(status.getAttribute("data-state"), "warning");
  assert.equal(status.textContent, 'No Markdown file named "zzz.md" was found. It will be saved as typed.');
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
test("T220: invalid JSON in the known-stems attribute falls back to the suggestions", () => {
  const list = openListEditor('[""]', '["StRS-A"]', "{not json");
  const input = list.inputs()[0]!;
  const status = listStatus(list);
  input.value = "StRS-A";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), null);
  input.value = "zzz";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(status.getAttribute("data-state"), "warning");
});

test("T22: saving a list with an unknown value still posts the save", () => {
  const list = openListEditor('["StRS-B"]', '["StRS-B"]');
  const input = list.inputs()[0]!;
  input.value = "StRS-BX";
  input.dispatch("input", {});
  input.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: noop });
  const save = list.harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(JSON.stringify(save?.fieldValue), '["StRS-BX"]');
});

test("T24: Remove field is disabled with a tooltip on a required row", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-required", "true");
  openFrontmatterValueEditor(harness);
  const removeButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove");
  assert.ok(removeButton);
  const tooltip = "Required by the schema; it cannot be removed";
  assert.equal(removeButton.disabled, true);
  assert.equal(removeButton.getAttribute("title"), tooltip);
  assert.equal(removeButton.getAttribute("aria-label"), tooltip);
  assert.equal(removeButton.getAttribute("data-tooltip"), tooltip);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-029
test("T24: Remove field stays enabled on an optional row", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const removeButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove");
  assert.ok(removeButton);
  assert.notEqual(removeButton.disabled, true);
  assert.equal(removeButton.getAttribute("title"), "Remove frontmatter field");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-028
test("T24: choosing a field in the picker adds it right after the open row", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const select = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(select);
  select.value = "owner";
  select.dispatch("change");
  const message = harness.messages.at(-1);
  assert.equal(message?.type, "previewFrontmatterSave");
  assert.equal(message?.frontmatterAction, "add");
  assert.equal(message?.fieldName, "owner");
  assert.equal(message?.fieldValue, "");
  assert.equal(message?.afterField, "lifecycle");
  const confirm = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "confirm-add");
  assert.equal(confirm?.hidden, true);
});

test("T24: the text-input picker adds on Enter with afterField", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.closest("[data-okf-properties]")?.setAttribute("data-okf-available-fields", "[]");
  openFrontmatterValueEditor(harness);
  const input = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(input);
  assert.equal(input.tagName, "INPUT");
  input.value = "custom";
  let prevented = false;
  input.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  const message = harness.messages.at(-1);
  assert.equal(message?.frontmatterAction, "add");
  assert.equal(message?.fieldName, "custom");
  assert.equal(message?.afterField, "lifecycle");
  assert.equal(prevented, true);
});

function customKeyHarness(attributes: Record<string, string> = {}) {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  const section = harness.frontmatterRow.closest("[data-okf-properties]");
  for (const [name, value] of Object.entries(attributes)) section?.setAttribute(name, value);
  openFrontmatterValueEditor(harness);
  const select = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(select);
  const options = () => harness.createdElements.filter((element) =>
    element.tagName === "OPTION" && element.parentElement === select);
  const customInput = () => harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "New field name");
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-status") !== null
    || element.getAttribute("role") === "status");
  return { harness, select, options, customInput, status };
}

test("T25: the picker offers Custom key only when additional properties are allowed", () => {
  const allowed = customKeyHarness();
  assert.deepEqual(allowed.options().map((option) => option.value).slice(-1), ["__custom__"]);
  assert.equal(allowed.options().at(-1)?.textContent, "Custom key\u2026");
  const forbidden = customKeyHarness({ "data-okf-additional-properties": "false" });
  assert.equal(forbidden.options().some((option) => option.value === "__custom__"), false);
});

test("T25: choosing Custom key shows the name input and posts nothing", () => {
  const { harness, select, customInput } = customKeyHarness();
  const before = harness.messages.length;
  select.value = "__custom__";
  select.dispatch("change");
  assert.ok(customInput());
  assert.equal(harness.messages.length, before);
});

test("T25: Enter in the custom key input adds the field with an empty value", () => {
  const { harness, select, customInput } = customKeyHarness();
  select.value = "__custom__";
  select.dispatch("change");
  const input = customInput()!;
  input.value = "reviewer";
  input.dispatch("keydown", { key: "Enter", preventDefault: noop });
  const message = harness.messages.at(-1);
  assert.equal(message?.type, "previewFrontmatterSave");
  assert.equal(message?.frontmatterAction, "add");
  assert.equal(message?.fieldName, "reviewer");
  assert.equal(message?.fieldValue, "");
  assert.equal(message?.afterField, "lifecycle");
  assert.equal(JSON.stringify(harness.getWebviewState().pendingFrontmatterEdit), '{"fieldName":"reviewer","requestId":11}');
});

test("T25: an invalid custom key shows an error and posts nothing", () => {
  for (const name of ["", "  ", " lead", "trail ", "two\nlines", "lifecycle"]) {
    const { harness, select, customInput } = customKeyHarness();
    select.value = "__custom__";
    select.dispatch("change");
    const before = harness.messages.length;
    const input = customInput()!;
    input.value = name;
    input.dispatch("keydown", { key: "Enter", preventDefault: noop });
    assert.equal(harness.messages.length, before, JSON.stringify(name));
    const errors = harness.createdElements.filter((element) =>
      element.getAttribute("data-state") === "error" && element.textContent.length > 0);
    assert.equal(errors.length, 1, JSON.stringify(name));
    assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-037
test("T25: a pending frontmatter edit opens the editor of the new field and clears the state once it closes", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle" } },
  });
  const select = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add");
  assert.ok(select, "the editor of the new field is open");
  assert.equal(JSON.stringify(harness.getWebviewState().pendingFrontmatterEdit), '{"fieldName":"lifecycle"}',
    "kept while the editor is open, so that a repeated load of the same render opens it again");
  select.dispatch("keydown", { key: "Escape", preventDefault: noop });
  select.dispatch("blur");
  assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
});

test("T25: a pending frontmatter edit outside edit mode or for a missing row is dropped", () => {
  for (const savedState of [
    { editMode: false, pendingFrontmatterEdit: { fieldName: "lifecycle" } },
    { editMode: true, pendingFrontmatterEdit: { fieldName: "missing" } },
  ]) {
    const harness = createRuntimeHarness({ mapFrontmatter: true, savedState });
    assert.equal(harness.createdElements.some((element) =>
      element.getAttribute("data-okf-frontmatter-editor") !== null), false);
    assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
  }
});

test("T25: an error result clears the pending frontmatter edit", () => {
  const { harness, select, customInput } = customKeyHarness();
  select.value = "__custom__";
  select.dispatch("change");
  const input = customInput()!;
  input.value = "reviewer";
  input.dispatch("keydown", { key: "Enter", preventDefault: noop });
  const message = harness.messages.at(-1)!;
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: message.editId,
    saved: false,
    error: "nope",
  });
  assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
});

test("T25: a reload of the render that posted the add keeps the pending edit for the next render", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle", requestId: 11 } },
  });
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null), false);
  assert.equal(JSON.stringify(harness.getWebviewState().pendingFrontmatterEdit),
    '{"fieldName":"lifecycle","requestId":11}');
});

test("T25: saving a value from the pending edit's editor consumes the pending edit", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle", requestId: "old" } },
  });
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  assert.ok(editor, "the editor of the new field is open");
  const control = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add")!;
  control.value = "active";
  control.dispatch("blur");
  assert.ok(harness.messages.some((message) => message.type === "previewFrontmatterSave"),
    "the value was posted");
  assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
});

test("T25: a later render does not reopen an editor that was already opened for the pending edit", () => {
  const first = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle", requestId: "old" } },
  });
  assert.ok(first.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null), "opened on the new render");
  const state = first.getWebviewState();
  const second = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: state,
    requestId: 99,
  });
  assert.equal(second.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null), false);
  assert.equal(second.getWebviewState().pendingFrontmatterEdit, undefined);
});

test("T30: previewPropertiesTable replaces the properties section in place", () => {
  const harness = createRuntimeHarness();
  const old = harness.currentProperties();
  assert.ok(old);
  assert.equal(old, harness.frontmatterProperties);
  const contentBefore = [...harness.previewContent.childElements];
  harness.dispatchMessage(propertiesMessage(cellMarkup("fresh")));
  const current = harness.currentProperties();
  assert.ok(current && current !== old, "a new section replaced the old one");
  assert.equal(old.removed, true);
  assert.deepEqual(harness.htmlInsertions.map((entry) => entry.position), ["beforebegin"]);
  assert.equal(current.innerHTML, cellMarkup("fresh"));
  assert.deepEqual(harness.previewContent.childElements, contentBefore, "nothing else in the content moved");
});

test("T30: previewPropertiesTable inserts the section when it is absent and removes it on empty markup", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(propertiesMessage(""));
  assert.equal(harness.currentProperties(), null, "an empty markup removes the section");
  assert.equal(harness.frontmatterProperties.removed, true);
  assert.equal(harness.htmlInsertions.length, 0, "nothing is inserted for an empty markup");
  harness.dispatchMessage(propertiesMessage(""));
  assert.equal(harness.currentProperties(), null, "removing an absent section is harmless");
  harness.dispatchMessage(propertiesMessage(cellMarkup("again")));
  assert.deepEqual(harness.htmlInsertions.map((entry) => entry.position), ["afterbegin"]);
  assert.equal(harness.currentProperties()?.innerHTML, cellMarkup("again"));
});

test("T30: previewPropertiesTable is ignored for another request, version, document or a non-string markup", () => {
  const harness = createRuntimeHarness();
  const old = harness.currentProperties();
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { requestId: 12 }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { revision: 8 }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { documentId: "file:///other.md" }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { markup: 3 }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { markup: undefined }));
  assert.equal(harness.currentProperties(), old);
  assert.equal(harness.htmlInsertions.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-043
test("T30: previewPropertiesTable is deferred while a frontmatter editor is open, then applied on close", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null)!;
  assert.ok(editor.parentElement, "the editor is open");
  harness.dispatchMessage(propertiesMessage(cellMarkup("first")));
  harness.dispatchMessage(propertiesMessage(cellMarkup("second")));
  assert.equal(harness.currentProperties(), harness.frontmatterProperties, "the section is not touched");
  assert.equal(harness.htmlInsertions.length, 0);
  harness.dispatchDocument("keydown", {
    key: "Escape",
    target: harness.frontmatterValueCell,
    preventDefault: noop,
  });
  assert.equal(editor.parentElement, undefined, "Escape closed the editor");
  const current = harness.currentProperties();
  assert.ok(current && current !== harness.frontmatterProperties, "the latest deferred markup was applied");
  assert.equal(current.innerHTML, cellMarkup("second"));
  assert.deepEqual(harness.htmlInsertions.map((entry) => entry.position), ["beforebegin"]);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-001
test("T30: a replaced section gets edit-cell tabindex in edit mode and none outside it", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(propertiesMessage(
    cellMarkup("a").replace("</section>", '<th data-okf-edit-cell="name">n</th></section>')));
  const cells = harness.currentProperties()?.childElements ?? [];
  assert.equal(cells.length, 2);
  for (const cell of cells) assert.equal(cell.getAttribute("tabindex"), "0");
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(propertiesMessage(cellMarkup("c")));
  for (const cell of harness.currentProperties()?.childElements ?? []) {
    assert.equal(cell.getAttribute("tabindex"), null);
  }
});

test("T30: a replacement closes the link tooltip, re-measures and keeps the description state", () => {
  const harness = createRuntimeHarness({ viewportWidth: 900 });
  harness.dispatchDocument("click", { target: harness.descriptionButton });
  assert.equal(harness.documentElement.getAttribute("data-okf-descriptions-collapsed"), "true");
  const link = new RuntimeElement({
    class: "okf-frontmatter-link", "data-okf-link-status": "valid", title: "target\ndescription: x",
  }, harness.windowState, 0, 10, "a");
  harness.dispatchDocument("mouseover", { target: link });
  const tooltips = () => harness.createdElements.filter((element) =>
    element.className === "sphinx-preview-link-tooltip" && element.parentElement !== undefined);
  assert.equal(tooltips().length, 1, "the tooltip is open");
  const rectReads = harness.mappings.reduce((count, mapping) => count + mapping.rectReadCount, 0);
  harness.dispatchMessage(propertiesMessage(cellMarkup("fresh")));
  assert.equal(tooltips().length, 0, "the tooltip closed");
  assert.equal(link.getAttribute("title"), "target\ndescription: x", "the title was restored");
  assert.ok(harness.mappings.reduce((count, mapping) => count + mapping.rectReadCount, 0) > rectReads,
    "the layout was measured again");
  assert.equal(harness.documentElement.getAttribute("data-okf-descriptions-collapsed"), "true");
  assert.equal(harness.descriptionButton.getAttribute("aria-expanded"), "false");
});
