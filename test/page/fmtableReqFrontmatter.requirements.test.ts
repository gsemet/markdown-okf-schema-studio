import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { checkFrontmatterCandidate, planFrontmatterSave } from "../../src/core/edits/frontmatterEdit";
import { analyzeFrontmatter } from "../../src/core/frontmatter/okfFrontmatter";
import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import {
  frontmatterSaves,
  openBlockEditorWithSource,
  openFrontmatterValueEditor,
  openTextFieldEditor,
  patchMessage,
  t21ClickEvent,
  propertiesMessage,
  cellMarkup,
} from "./runtimeTestSupport";

/**
 * Page-side behaviour of the frontmatter editors (features/frontmatter*.ts) that the neighbouring
 * runtimeFrontmatter*.test.ts files do not assert: guards between editors, native inputs, the
 * refusals shown in the editor, and the pin fields of a save.
 */

const click = (target: RuntimeElement) => ({
  target,
  preventDefault: () => undefined,
  stopPropagation: () => undefined,
});

/** The status paragraph of the open field editor. */
function editorStatus(harness: ReturnType<typeof createRuntimeHarness>): RuntimeElement {
  const status = harness.createdElements.filter((element) =>
    element.tagName === "P" && element.getAttribute("role") === "status").at(-1);
  assert.ok(status);
  return status;
}

function openKeyEditor(harness: ReturnType<typeof createRuntimeHarness>): RuntimeElement {
  harness.dispatchDocument("click", click(harness.frontmatterNameCell));
  const input = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  assert.ok(input);
  return input;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("an open field editor blocks the key editor and a second value editor; a block editor blocks the field editor", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const selects = (): number => harness.createdElements.filter((element) =>
    element.tagName === "SELECT" && element.getAttribute("aria-label") === "Frontmatter lifecycle").length;
  assert.equal(selects(), 1);
  harness.dispatchDocument("click", click(harness.frontmatterNameCell));
  harness.dispatchDocument("click", click(harness.frontmatterValueCell));
  assert.equal(selects(), 1, "no second value editor");
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"), false, "no key editor");

  const withBlock = createRuntimeHarness({ mapFrontmatter: true });
  openBlockEditorWithSource(withBlock);
  withBlock.dispatchDocument("click", click(withBlock.frontmatterValueCell));
  withBlock.dispatchDocument("click", click(withBlock.frontmatterNameCell));
  assert.equal(withBlock.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Frontmatter lifecycle"), false);
  assert.equal(withBlock.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-003
test("number, date and time fields get native inputs; a date-time field stays a text input", () => {
  const expectations: Array<[string, string, string, string | undefined]> = [
    ["number", "3", "3", "number"],
    ["date", '"2026-01-02"', "2026-01-02", "date"],
    ["time", '"10:30"', "10:30", "time"],
    ["date-time", '"2026-01-02T10:30:00Z"', "2026-01-02T10:30:00Z", "text"],
  ];
  for (const [fieldType, raw, shown, inputType] of expectations) {
    const harness = createRuntimeHarness({
      mapFrontmatter: true,
      frontmatterRowAttributes: { "data-okf-type": fieldType, "data-okf-value": raw, "data-okf-value-yaml": shown + "\n" },
    });
    openFrontmatterValueEditor(harness);
    const input = harness.createdElements.find((element) => element.tagName === "INPUT");
    assert.ok(input, fieldType);
    assert.equal(input.type, inputType, fieldType);
    assert.equal(input.value, shown, fieldType);
    assert.equal(input.step === "any", fieldType === "number", fieldType);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019
test("turning edit mode off closes a field editor without a save but saves a changed block editor", () => {
  const { harness, textarea } = openTextFieldEditor("original");
  textarea.value = "typed and not saved";
  harness.editModeButton.dispatch("click");
  assert.equal(frontmatterSaves(harness).length, 0);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null, "the value shows again");
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-editing"), null);

  const block = createRuntimeHarness();
  const control = openBlockEditorWithSource(block);
  control.value = "Second paragraph, edited.\n";
  control.dispatch("input");
  block.editModeButton.dispatch("click");
  const saves = block.messages.filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1, "the block editor saves its text");
});

test("the number input carries no schema limits and a value out of range is refused at save time", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    frontmatterRowAttributes: {
      "data-okf-type": "number", "data-okf-value": "5", "data-okf-value-yaml": "5\n",
      "data-okf-minimum": "0", "data-okf-maximum": "10",
    },
  });
  openFrontmatterValueEditor(harness);
  const input = harness.createdElements.find((element) => element.tagName === "INPUT");
  assert.ok(input);
  assert.equal(input.getAttribute("min"), null);
  assert.equal(input.getAttribute("max"), null);
  assert.equal(input.step, "any");
  input.value = "11";
  input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const save = frontmatterSaves(harness).at(-1);
  assert.equal(save?.fieldValue, 11, "the page posts the out-of-range value");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fmtable-req-050-"));
  try {
    fs.mkdirSync(path.join(root, "_schema"));
    fs.writeFileSync(path.join(root, "_schema", "gauge.schema.yaml"), [
      "type: object",
      "properties:",
      "  type: { const: gauge }",
      "  level: { type: number, minimum: 0, maximum: 10 }",
      "required: [type]",
    ].join("\n"));
    const source = "---\ntype: gauge\nlevel: 5\n---\nBody\n";
    const file = path.join(root, "doc.md");
    fs.writeFileSync(file, source);
    const options = { schemaFiles: nodeSchemaFiles, filePath: file, stopDir: root, strictAdditionalProperties: false };
    const before = analyzeFrontmatter({ ...options, sourceText: source });
    assert.equal(before.schemaFound, true);
    const plan = planFrontmatterSave(source, before, { fieldName: "level", fieldValue: 11 });
    assert.ok(!("error" in plan));
    const candidate = analyzeFrontmatter({ ...options, sourceText: plan.candidateSource });
    const refusal = checkFrontmatterCandidate(plan, candidate, before);
    assert.ok(refusal && refusal.error.startsWith("Schema validation failed: "), JSON.stringify(refusal));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("undo and redo keys in a field editor stop at the control, in the value and the key editor", () => {
  const { harness, textarea } = openTextFieldEditor("text");
  const stopped: string[] = [];
  const press = (control: RuntimeElement, key: string, extra: Record<string, unknown>): void => {
    control.dispatch("keydown", {
      key,
      preventDefault: () => undefined,
      stopPropagation: () => stopped.push(key),
      ...extra,
    });
  };
  press(textarea, "z", { metaKey: true });
  press(textarea, "y", { ctrlKey: true });
  assert.deepEqual(stopped, ["z", "y"]);
  press(textarea, "a", { metaKey: true });
  assert.deepEqual(stopped, ["z", "y"], "other keys are not stopped");

  const keyHarness = createRuntimeHarness({ mapFrontmatter: true });
  keyHarness.editModeButton.dispatch("click");
  const keyInput = openKeyEditor(keyHarness);
  const keyStopped: string[] = [];
  keyInput.dispatch("keydown", {
    key: "Z", metaKey: true, preventDefault: () => undefined, stopPropagation: () => keyStopped.push("Z"),
  });
  assert.deepEqual(keyStopped, ["Z"]);
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-228
test("a field save carries the source line and viewport top of the properties section", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterProperties.rectProvider = () => ({ top: 120, height: 60, bottom: 180 });
  harness.frontmatterRow.rectProvider = () => ({ top: 400, height: 30, bottom: 430 });
  harness.frontmatterValueCell.rectProvider = () => ({ top: 400, height: 30, bottom: 430 });
  openFrontmatterValueEditor(harness);
  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  select.value = "active";
  select.dispatch("change");
  select.dispatch("blur");
  const save = frontmatterSaves(harness).at(-1);
  assert.equal(save?.fieldValue, "active");
  assert.equal(save?.pinLine, 1);
  assert.equal(save?.pinViewportTop, 120, "the section top, not the row top");

  const empty = createRuntimeHarness({ mapFrontmatter: true });
  empty.frontmatterProperties.rectProvider = () => ({ top: 0, height: 0, bottom: 0 });
  openFrontmatterValueEditor(empty);
  const emptySelect = empty.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(emptySelect);
  emptySelect.value = "active";
  emptySelect.dispatch("blur");
  const emptySave = frontmatterSaves(empty).at(-1);
  assert.equal(emptySave?.fieldValue, "active");
  assert.equal(emptySave?.pinLine, undefined);
  assert.equal(emptySave?.pinViewportTop, undefined);
});

test("Refresh is refused with a message while a field editor is open and works once it is closed", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  assert.equal(harness.refreshButton.disabled, true);
  const before = harness.messages.length;
  harness.refreshButton.dispatch("click");
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewRefresh"), false);
  assert.equal(editorStatus(harness).textContent, "Save or cancel this edit before refreshing.");

  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  select.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.refreshButton.disabled, false);
  const afterClose = harness.messages.length;
  harness.refreshButton.dispatch("click");
  assert.equal(harness.messages.slice(afterClose).some((message) => message.type === "previewRefresh"), true);
});

test("a task-list checkbox click is refused with a message while a field editor is open", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const before = harness.messages.length;
  let prevented = false;
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", t21ClickEvent(harness.checkbox, { preventDefault: () => { prevented = true; } }));
  assert.equal(prevented, true, "the toggle is cancelled");
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewCheckboxToggle"), false);
  assert.equal(editorStatus(harness).textContent, "Save or cancel this edit before toggling a checkbox.");

  const free = createRuntimeHarness({ mapFrontmatter: true });
  free.editModeButton.dispatch("click");
  const freeBefore = free.messages.length;
  free.checkbox.checked = true;
  free.dispatchDocument("click", t21ClickEvent(free.checkbox));
  assert.equal(free.messages.slice(freeBefore).some((message) => message.type === "previewCheckboxToggle"), true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
test("a content patch closes an open field editor without a save and drops the waiting properties update", () => {
  const { harness, textarea } = openTextFieldEditor("original");
  textarea.value = "typed";
  harness.dispatchMessage(propertiesMessage(cellMarkup("waiting")));
  const insertions = harness.htmlInsertions.length;
  harness.dispatchMessage(patchMessage());
  assert.equal(frontmatterSaves(harness).length, 0);
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-editing"), null);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null);
  assert.equal(harness.htmlInsertions.slice(insertions).some((entry) => entry.markup.includes("waiting")), false);
  assert.equal(harness.refreshButton.disabled, false);

  const free = createRuntimeHarness({ mapFrontmatter: true });
  free.dispatchMessage(patchMessage());
  assert.equal(free.getWebviewState !== undefined, true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-079
test("ArrowUp at the start of the first body block does not step onto the properties table", () => {
  const harness = createRuntimeHarness({
    firstMappedSourceLine: 5,
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  const first = harness.mappings[0];
  harness.dispatchDocument("click", { target: first, preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Current block\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(textarea);
  textarea.setSelectionRange(0, 0);
  const before = harness.messages.length;
  let prevented = false;
  textarea.dispatch("keydown", { key: "ArrowUp", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(harness.messages.length, before);
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true"), false, "no editor on the properties table");

  const second = createRuntimeHarness({
    firstMappedSourceLine: 5,
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  const target = second.mappings[1];
  second.dispatchDocument("click", { target, preventDefault: () => undefined });
  second.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: second.messages.at(-1)?.editId,
    originalText: "Next block\n",
  });
  const nextArea = second.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(nextArea);
  nextArea.setSelectionRange(0, 0);
  const secondBefore = second.messages.length;
  nextArea.dispatch("keydown", { key: "ArrowUp", preventDefault: () => undefined });
  assert.ok(second.messages.length > secondBefore, "the previous body block is the target");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-001
test("typing in a field or key editor opens neither the slash menu nor the edition palette", () => {
  const slashMenus = (harness: ReturnType<typeof createRuntimeHarness>): RuntimeElement[] =>
    harness.createdElements.filter((element) => element.getAttribute("data-slash-menu") === "true");
  // Control: the block editor opens the menu for the same typing.
  const block = createRuntimeHarness();
  const blockArea = openBlockEditorWithSource(block);
  blockArea.value = "/";
  blockArea.selectionStart = blockArea.selectionEnd = 1;
  blockArea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.equal(slashMenus(block).length, 1);

  const { harness, textarea } = openTextFieldEditor("");
  textarea.value = "/";
  textarea.selectionStart = textarea.selectionEnd = 1;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.equal(slashMenus(harness).length, 0);
  assert.equal(textarea.getAttribute("aria-expanded"), null);
  textarea.value = "/abc";
  textarea.setSelectionRange(0, 4);
  harness.dispatchDocument("selectionchange", {});
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("data-sphinx-preview-edit-palette") !== null), false);

  const keyHarness = createRuntimeHarness({ mapFrontmatter: true });
  keyHarness.editModeButton.dispatch("click");
  const keyInput = openKeyEditor(keyHarness);
  keyInput.value = "/";
  keyInput.selectionStart = keyInput.selectionEnd = 1;
  keyInput.dispatch("input", { data: "/", inputType: "insertText" });
  assert.equal(slashMenus(keyHarness).length, 0);
});

test("the Edit figure button and the Start writing Enter shortcut ignore input while a field editor is open", () => {
  const pressEditFigure = (withFieldEditor: boolean): boolean => {
    const harness = createRuntimeHarness({ mapFrontmatter: true });
    harness.editModeButton.dispatch("click");
    const figure = new RuntimeElement({
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": "20",
      "data-sphinx-source-end-line": "26",
    }, harness.windowState, 100, 80, "figure");
    harness.dispatchDocument("mouseover", { target: figure });
    const button = harness.createdElements.find((element) =>
      element.getAttribute("data-sphinx-figure-edit") !== null);
    assert.ok(button);
    if (withFieldEditor) harness.dispatchDocument("click", click(harness.frontmatterValueCell));
    const before = harness.messages.length;
    button.dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
    return harness.messages.slice(before).some((message) => message.type === "previewEditOpen");
  };
  assert.equal(pressEditFigure(false), true, "without a field editor the figure editor opens");
  assert.equal(pressEditFigure(true), false, "with a field editor open nothing opens");

  const pressEnter = (withFieldEditor: boolean): boolean => {
    const empty = createRuntimeHarness({
      mapFrontmatter: true, emptyBody: true, previewStatus: "success", savedState: { editMode: true },
    });
    if (withFieldEditor) empty.dispatchDocument("click", click(empty.frontmatterValueCell));
    const before = empty.messages.length;
    empty.dispatchDocument("keydown", { key: "Enter", target: empty.previewContent, preventDefault: () => undefined });
    return empty.messages.slice(before).some((message) => message.type === "previewEditOpen");
  };
  assert.equal(pressEnter(false), true, "without a field editor Enter opens the Start writing editor");
  assert.equal(pressEnter(true), false, "with a field editor open nothing opens");
});

const FIELD_IDS = { documentId: "file:///active.md", revision: 7, requestId: 11 };

/** Opens the YAML editor of an object field, types `typed` and blurs it (the click's plain save). */
function blurredYamlField(typed: string) {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "object");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", click(harness.frontmatterValueCell));
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = typed;
  textarea.dispatch("blur");
  const save = frontmatterSaves(harness).at(-1);
  assert.ok(save);
  return { harness, editId: save.editId };
}

const blockEditorOpens = (harness: ReturnType<typeof createRuntimeHarness>): number =>
  harness.messages.filter((message) => message.type === "previewEditOpen").length;

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a refused field value is cancelled and the clicked block opens its editor", () => {
  const { harness, editId } = blurredYamlField("[review");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(blockEditorOpens(harness), 0, "the block waits for the answer to the save");
  harness.dispatchMessage({
    type: "previewFrontmatterResult", ...FIELD_IDS, editId, error: "Invalid YAML value: unexpected end",
  });
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-editing"), null);
  assert.equal(blockEditorOpens(harness), 1, "the block editor opens");
  assert.equal(frontmatterSaves(harness).length, 1, "the refused text is not saved again");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a refused field value is cancelled and a plus insert point opens its editor", () => {
  const { harness, editId } = blurredYamlField("[review");
  const point = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-insert-after-line") !== null && !element.removed);
  assert.ok(point, "an insertion point");
  point.childElements[0].dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(blockEditorOpens(harness), 0);
  harness.dispatchMessage({ type: "previewFrontmatterResult", ...FIELD_IDS, editId, error: "Invalid YAML value" });
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-editing"), null);
  assert.equal(blockEditorOpens(harness), 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a valid field value is saved and the clicked block opens its editor", () => {
  const { harness, editId } = blurredYamlField("a: 2");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(blockEditorOpens(harness), 0, "the block waits for the answer to the save");
  harness.dispatchMessage({ type: "previewFrontmatterResult", ...FIELD_IDS, editId, saved: true });
  assert.equal(blockEditorOpens(harness), 1, "the block editor opens once the value is saved");
  assert.equal(frontmatterSaves(harness).length, 1);
});
