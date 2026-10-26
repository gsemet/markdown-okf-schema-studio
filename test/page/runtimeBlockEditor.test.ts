import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  altKey,
  blockEditorOf,
  cellEditorOf,
  findButton,
  insertPointAfterLine,
  insertPointsOf,
  openBlockEditorWithSource,
  openRawEditor,
  openTableCellEditorForTab,
  shiftKey,
  sourceReply,
  stubExecCommand,
  typeKey,
} from "./runtimeTestSupport";

/**
 * The raw Markdown block editor: open, autosave, Done and Cancel, keys, marker wrapping and the
 * top spacing of the first block (features/blockEditor.ts, textControls.ts).
 */

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-029
test("fenced Markdown editors sit outside the rendered pre and preserve source when saving", () => {
  const harness = createRuntimeHarness();
  const code = harness.mappings[1];
  const pre = new RuntimeElement({}, harness.windowState, 500, 200, "pre");
  pre.appendChild(code);
  const originalText = [
    "```md",
    "Implementation completed: <tasks-number> tasks",
    "",
    "Tasks:",
    "- <task-1>: completed",
    "- <task-2>: completed (1 reworks)",
    "- <task-3>: completed",
    "",
    "```",
    "",
  ].join("\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: code, preventDefault: () => undefined });
  const editor = blockEditorOf(pre);
  assert.ok(editor);
  assert.equal(code.insertedElements.length, 0);
  assert.equal(pre.contains(editor), false);
  assert.equal(pre.getAttribute("data-sphinx-preview-editing"), "true");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.parentElement, editor);
  assert.equal(textarea.value, originalText.slice(0, -1));
  textarea.value = textarea.value.replace("(1 reworks)", "(1 rework)");
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.editedText, originalText.replace("(1 reworks)", "(1 rework)"));
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  // Cmd+Enter commits like blur: a final save, closed by the re-render; never a cancel.
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.equal(
    harness.messages.at(-1)?.editedText,
    originalText.replace("(1 reworks)", "(1 rework)"),
  );
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-026
test("without caretRangeFromPoint a click opens the editor with the caret at the end of the block", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.mappings[1],
    clientX: 10,
    clientY: 10,
    preventDefault: () => undefined,
  });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "First line\nSecond line\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.selectionStart, "First line\nSecond line".length);
  assert.equal(textarea.selectionEnd, "First line\nSecond line".length);
});

test("active Markdown editors leave repeated spaces and Enter to native text input", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- `compendium-jira-confluence`:\n  - `jira-skill`.        \n  - `derive-jira-issue-to-change-request`\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.parentElement = harness.mappings[1];
  assert.equal(textarea.getAttribute("autocorrect"), "off");
  assert.equal(textarea.getAttribute("autocapitalize"), "off");
  assert.equal(textarea.getAttribute("autocomplete"), "off");
  // The editor opens with the caret at the end of a list line, where Enter continues the list (D-03);
  // this test checks Enter before the marker, which stays native.
  textarea.setSelectionRange(0, 0);
  const messageCount = harness.messages.length;
  let prevented = 0;
  for (const key of [" ", " ", " ", " ", "Enter"]) {
    const event = { target: textarea, key, preventDefault: () => { prevented += 1; } };
    textarea.dispatch("keydown", event);
    harness.dispatchDocument("keydown", event);
  }
  assert.equal(prevented, 0);
  assert.equal(harness.messages.length, messageCount);
});

test("Enter in a list item continues the list, and Shift+Enter stays native", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.setSelectionRange(3, 3);
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 0);
  assert.equal(textarea.value, "- a");
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "- a\n- ");
  assert.equal(textarea.selectionStart, 6);
  assert.equal(textarea.selectionEnd, 6);
  harness.flushTimers();
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.editedText, "- a\n- \n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-069
test("Enter in the selected alt text of an image validates it and moves the caret after the image", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "![image.png](image.png) tail\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  let prevented = 0;
  // The alt text selected, as after a paste or a pick: Enter keeps it and leaves after the image.
  textarea.setSelectionRange(2, 11);
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "![image.png](image.png) tail");
  assert.equal(textarea.selectionStart, 23);
  assert.equal(textarea.selectionEnd, 23);
  // A caret inside the alt text (after typing) validates the same way.
  textarea.setSelectionRange(5, 5);
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 2);
  assert.equal(textarea.selectionStart, 23);
  // Outside the alt text Enter stays native.
  textarea.setSelectionRange(25, 25);
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 2);
  assert.equal(textarea.value, "![image.png](image.png) tail");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-061
test("Tab and Shift+Tab indent the block editor without closing it", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n  - b\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.setSelectionRange(6, 6);
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "- a\n    - b");
  harness.flushTimers();
  const autosave = harness.messages.at(-1);
  assert.equal(autosave?.type, "previewEditSave");
  assert.equal(autosave?.editedText, "- a\n    - b\n");
  textarea.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 2);
  assert.equal(textarea.value, "- a\n  - b");
  textarea.setSelectionRange(0, 0);
  textarea.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 3);
  assert.equal(textarea.value, "- a\n  - b");
  harness.flushTimers();
  assert.equal(
    harness.messages.some((message) => message.type === "previewEditSave" && message.final === true),
    false,
  );
  assert.ok(harness.createdElements.includes(textarea));
});

test("Enter on an empty list item empties the line and Enter in plain text stays native", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n- \n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.setSelectionRange(6, 6);
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "- a\n");
  assert.equal(textarea.selectionStart, 4);
  textarea.value = "plain";
  textarea.setSelectionRange(5, 5);
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "plain");
});

test("block textareas resize on input and preview layout changes", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "A long paragraph. ".repeat(500),
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.style.height, `${textarea.scrollHeight}px`);
  for (const [height, resize] of [
    [3_000, () => textarea.dispatch("input")],
    [4_000, () => harness.dispatchWindow("resize")],
    [5_000, () => harness.dispatchVisualViewportResize()],
    [2_500, () => harness.triggerResizeObserver()],
  ] as const) {
    textarea.scrollHeight = height;
    resize();
    harness.flushFrames();
    assert.equal(textarea.style.height, `${height}px`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode loads raw Markdown and saves changes when the block loses focus", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const request = harness.messages.at(-1);
  const editId = request?.editId;
  const originalText = "**Raw line one**\n\nRaw line two\n";
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    originalText,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, "**Raw line one**\n\nRaw line two");
  assert.equal(textarea.rows, 1);
  const lastContentPosition = originalText.trimEnd().length;
  assert.deepEqual(textarea.selectionRange, [lastContentPosition, lastContentPosition]);
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Save Markdown block"
    || element.getAttribute("aria-label") === "Cancel Markdown edit"), false);
  assert.equal(harness.createdElements.some((element) =>
    element.tagName === "BUTTON" && element.getAttribute("aria-label") === "Done editing"), true);
  assert.equal(harness.createdElements.some((element) =>
    element.tagName === "BUTTON"
    && element.getAttribute("aria-label") === "Cancel editing and restore the original text"), true);
  assert.equal(harness.createdElements.some((element) =>
    element.tagName === "BUTTON" && element.textContent === "Revert"), false);
  textarea.value = "**Edited line one**\n\nRaw line two";
  textarea.dispatch("input");
  textarea.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.originalText, originalText);
  assert.equal(save?.editedText, textarea.value + "\n");
  assert.equal(save?.line, 50);
  assert.equal(save?.endLine, 52);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-001
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017
test("edit mode hover marks the whole list that a click would edit", () => {
  for (const editMode of [true, false]) {
    const harness = createRuntimeHarness();
    if (editMode) harness.editModeButton.dispatch("click");
    const list = new RuntimeElement({
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-end-line": "8",
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": "5",
    }, harness.windowState, 0, 40, "ul");
    const item = new RuntimeElement({
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-end-line": "6",
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": "6",
    }, harness.windowState, 0, 20, "li");
    list.appendChild(item);
    harness.dispatchDocument("mouseover", { target: item });
    assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), editMode ? "true" : null);
    assert.equal(item.getAttribute("data-sphinx-preview-edit-hover"), null);
    if (editMode) {
      harness.dispatchDocument("mouseout", { target: item, relatedTarget: undefined });
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), null);
      harness.dispatchDocument("focusin", { target: item });
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), "true");
      harness.dispatchDocument("focusout", { target: item });
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), null);
      harness.dispatchDocument("mouseover", { target: item });
      harness.editModeButton.dispatch("click");
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), null);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-033
test("an opened block editor shows its line range, Done and Cancel on one row", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  const editor = textarea.parentElement;
  assert.ok(editor);
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.ok(status);
  assert.match(status.textContent, /^Lines 50\u201352 \u00b7 Enter: new line \u00b7 Tab: indent \u00b7 Esc: cancel \u00b7 /u);
  assert.match(status.textContent, /(?:\u2318\u21a9|Ctrl\+Enter): done$/u);
  assert.equal(findButton(harness, "Done editing").textContent, "Done");
  const cancel = findButton(harness, "Cancel editing and restore the original text");
  assert.equal(cancel.textContent, "Cancel");
  assert.equal(cancel.disabled, false);
});

test("the status line shares one row with the Done and Cancel buttons", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  const editor = textarea.parentElement;
  assert.ok(editor);
  const row = editor.childElements.find((child) =>
    child.getAttribute("class") === "sphinx-preview-block-editor-actions"
    || child.className === "sphinx-preview-block-editor-actions");
  assert.ok(row, "the actions row is a direct child of the editor");
  const status = row.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.ok(status, "the status element lives inside the actions row");
  assert.equal(editor.childElements.includes(status), false);
  const done = findButton(harness, "Done editing");
  const cancel = findButton(harness, "Cancel editing and restore the original text");
  const buttons = row.childElements.find((child) => child.childElements.includes(done));
  assert.ok(buttons);
  assert.equal(buttons.childElements.includes(cancel), true);
  assert.equal(row.childElements.indexOf(status) < row.childElements.indexOf(buttons), true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("Cancel cancels only what reached the document", () => {
  const withAutosave = createRuntimeHarness();
  let textarea = openRawEditor(withAutosave);
  let cancel = findButton(withAutosave, "Cancel editing and restore the original text");
  textarea.value = "Changed";
  textarea.dispatch("input");
  assert.equal(cancel.disabled, false);
  withAutosave.flushTimers();
  assert.equal(withAutosave.messages.at(-1)?.final, false);
  cancel.dispatch("click");
  assert.equal(withAutosave.messages.at(-1)?.type, "previewEditCancel");

  const withoutAutosave = createRuntimeHarness();
  textarea = openRawEditor(withoutAutosave);
  cancel = findButton(withoutAutosave, "Cancel editing and restore the original text");
  textarea.value = "Changed";
  textarea.dispatch("input");
  assert.equal(cancel.disabled, false);
  const before = withoutAutosave.messages.length;
  cancel.dispatch("click");
  textarea.dispatch("blur");
  assert.equal(withoutAutosave.messages.length, before);
  assert.equal(withoutAutosave.pendingTimerCount(), 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("Done posts a final save and both buttons keep the textarea focused on press", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  textarea.value = "Changed";
  textarea.dispatch("input");
  for (const label of ["Done editing", "Cancel editing and restore the original text"]) {
    let prevented = false;
    findButton(harness, label).dispatch("mousedown", { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, label);
  }
  findButton(harness, "Done editing").dispatch("click");
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.equal(save?.editedText, "Changed\n");
});

test("raw Markdown block edits autosave on input without disabling the textarea", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const editId = harness.messages.at(-1)?.editId;
  const originalText = "Raw line one\nRaw line two\n";
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    originalText,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "First keystroke";
  textarea.dispatch("input");
  harness.flushTimers();
  let save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, false);
  assert.equal(save?.editedText, "First keystroke\n");
  assert.equal(textarea.disabled, false);

  textarea.value = "Continued typing";
  textarea.dispatch("input");
  harness.flushTimers();
  save = harness.messages.at(-1);
  assert.equal(save?.final, false);
  assert.equal(save?.editedText, "Continued typing\n");
  assert.equal(textarea.disabled, false);

  textarea.dispatch("blur");
  save = harness.messages.at(-1);
  assert.equal(save?.final, true);
  assert.equal(save?.editedText, "Continued typing\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-079
test("arrow boundaries transfer block editing in every direction", () => {
  const cases = [
    { key: "ArrowLeft", position: 0, line: 1, source: "Previous block\n", caret: "end" },
    { key: "ArrowRight", position: "end", line: 100, source: "Next block\n", caret: "start" },
    { key: "ArrowUp", position: 0, line: 1, source: "Previous block\n", caret: "end" },
    { key: "ArrowDown", position: "end", line: 100, source: "Next block\n", caret: "start" },
  ] as const;

  for (const testCase of cases) {
    const harness = createRuntimeHarness();
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
    const request = harness.messages.at(-1);
    harness.dispatchMessage({
      type: "previewEditSource",
      documentId: "file:///active.md",
      revision: 7,
      requestId: 11,
      editId: request?.editId,
      originalText: "Current block\n",
    });
    const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
    assert.ok(textarea);
    const position = testCase.position === "end" ? textarea.value.length : testCase.position;
    textarea.setSelectionRange(position, position);
    let prevented = false;
    textarea.dispatch("keydown", {
      key: testCase.key,
      preventDefault: () => { prevented = true; },
    });

    assert.equal(prevented, true, testCase.key);
    const navigationRequest = harness.messages.at(-1);
    assert.equal(navigationRequest?.type, "previewEditOpen", testCase.key);
    assert.equal(navigationRequest?.line, testCase.line, testCase.key);
    harness.dispatchMessage({
      type: "previewEditSource",
      documentId: "file:///active.md",
      revision: 7,
      requestId: 11,
      editId: navigationRequest?.editId,
      originalText: testCase.source,
    });
    const nextTextarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
    assert.ok(nextTextarea);
    const expectedPosition = testCase.caret === "start"
      ? 0
      : testCase.source.trimEnd().length;
    assert.deepEqual(nextTextarea.selectionRange, [expectedPosition, expectedPosition], testCase.key);
  }
});

test("Escape in a changed Markdown block editor cancels and never saves a final text", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. DROP ME.";
  textarea.dispatch("input");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  // Nothing reached the document yet: the editor closes without any message.
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
  assert.equal(harness.pendingTimerCount(), 0);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
});

test("Escape after an autosave restores the block with previewEditCancel", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. DROP ME.";
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, false);
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.messages.some((message) => message.final === true), false);
  textarea.dispatch("blur");
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Escape during IME composition neither cancels nor saves a block edit", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. ime";
  textarea.dispatch("input");
  harness.flushTimers();
  const count = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", isComposing: true, preventDefault: () => undefined });
  assert.equal(harness.messages.length, count);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Cmd+Enter and Ctrl+Enter finish the block editor like Done", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const harness = createRuntimeHarness();
    const textarea = openBlockEditorWithSource(harness);
    textarea.value = "Second paragraph. KEEP ME PLEASE.";
    textarea.dispatch("keydown", { key: "Enter", ...modifier, preventDefault: () => undefined });
    const last = harness.messages.at(-1);
    assert.equal(last?.type, "previewEditSave");
    assert.equal(last?.final, true);
    assert.equal(last?.editedText, "Second paragraph. KEEP ME PLEASE.\n");
    assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
  }
});

test("undo and redo shortcuts stop at the block textarea and keep the native undo", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const messageCount = harness.messages.length;
  const cases: Array<[Record<string, unknown>, boolean]> = [
    [{ key: "z", keyCode: 90, metaKey: true }, true],
    [{ key: "z", keyCode: 90, ctrlKey: true }, true],
    [{ key: "Z", keyCode: 90, metaKey: true, shiftKey: true }, true],
    [{ key: "y", keyCode: 89, ctrlKey: true }, true],
    [{ key: "z", keyCode: 90 }, false],
    [{ key: "y", keyCode: 89 }, false],
    [{ key: "s", keyCode: 83, metaKey: true }, false],
    [{ key: "z", keyCode: 90, metaKey: true, altKey: true }, false],
  ];
  for (const [init, intercepted] of cases) {
    let stopped = 0;
    let prevented = 0;
    textarea.dispatch("keydown", {
      target: textarea,
      ...init,
      stopPropagation: () => { stopped += 1; },
      preventDefault: () => { prevented += 1; },
    });
    assert.equal(stopped, intercepted ? 1 : 0, JSON.stringify(init));
    assert.equal(prevented, 0, JSON.stringify(init));
  }
  assert.equal(harness.messages.length, messageCount);
});

test("Escape in an unchanged Markdown block editor closes it without a message", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const messageCount = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.length, messageCount);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(harness.mappings[1].contains(textarea.parentElement as RuntimeElement), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-191
test("STAB-03: an editor the host watches reports its close; without a watch the close stays silent", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const editId = harness.messages.filter((message) => message.type === "previewEditOpen").at(-1)?.editId;
  assert.equal(typeof editId, "string");
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///active.md", revision: 7, requestId: 11, editId });
  const messageCount = harness.messages.length;
  assert.equal(harness.messages.length, messageCount, "the watch itself posts nothing while the editor is open");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const closed = harness.messages.slice(messageCount);
  assert.deepEqual(closed.map((message) => message.type), ["previewEditClosed"]);
  assert.equal(closed[0]?.editId, editId);
  assert.equal(closed[0]?.documentId, "file:///active.md");
});

test("STAB-03: a watch for an editor that is already closed is answered at once", () => {
  const harness = createRuntimeHarness();
  const messageCount = harness.messages.length;
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///active.md", revision: 7, requestId: 11, editId: "gone" });
  assert.deepEqual(harness.messages.slice(messageCount).map((message) => [message.type, message.editId]),
    [["previewEditClosed", "gone"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-064
test("STAB-03: a watch sent while the host already follows another document is still answered", () => {
  // The host switched to the next document while this page still shows the previous one: the
  // watch carries the new document id, and the page must answer it by editor id, or the host
  // waits for an editor that is gone and the preview stays on the old document.
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const editId = harness.messages.filter((message) => message.type === "previewEditOpen").at(-1)?.editId;
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///other.md", revision: 1, requestId: 12, editId });
  const messageCount = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.deepEqual(harness.messages.slice(messageCount).map((message) => [message.type, message.editId]),
    [["previewEditClosed", editId]], "the open editor reports its close");
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///other.md", revision: 1, requestId: 12, editId: "gone" });
  assert.deepEqual(harness.messages.slice(messageCount + 1).map((message) => [message.type, message.editId]),
    [["previewEditClosed", "gone"]], "a closed editor is reported at once");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-042
test("typing is saved once after the autosave delay, carrying the last text", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  for (const text of ["S", "Se", "Sec", "Seco", "Second"]) {
    textarea.value = text;
    textarea.dispatch("input");
  }
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditSave"), false);
  harness.flushTimers();
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.equal(saves[0].editedText, "Second\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-205
test("pagehide flushes a pending autosave without waiting for the timer", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.dispatchWindow("pagehide");
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.equal(saves[0].editedText, "Typed\n");
  assert.equal(harness.pendingTimerCount(), 0);
});

test("visibilitychange to hidden flushes a pending autosave without waiting for the timer", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.setVisibilityState("hidden");
  harness.dispatchDocument("visibilitychange", {});
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.equal(saves[0].editedText, "Typed\n");
  assert.equal(harness.pendingTimerCount(), 0);
});

test("hide events post nothing when no edit is pending or the page stays visible", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  harness.dispatchWindow("pagehide");
  harness.setVisibilityState("hidden");
  harness.dispatchDocument("visibilitychange", {});
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.setVisibilityState("visible");
  harness.dispatchDocument("visibilitychange", {});
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditSave"), false);
  harness.flushTimers();
});

test("blur after typing posts one final save and clears the autosave timer", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed";
  textarea.dispatch("input");
  textarea.dispatch("blur");
  assert.equal(harness.pendingTimerCount(), 0);
  harness.flushTimers();
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, true);
  assert.equal(saves[0].editedText, "Typed\n");
});

function arrowAt(
  control: RuntimeElement,
  key: string,
  position: number,
): { prevented: boolean } {
  control.setSelectionRange(position, position);
  const result = { prevented: false };
  control.dispatch("keydown", { key, preventDefault: () => { result.prevented = true; } });
  return result;
}

test("ArrowUp/ArrowDown inside a wrapped logical line move the caret instead of leaving the block", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "one very long paragraph that wraps over several visual lines in the editor";
  let probed: RuntimeElement | undefined;
  harness.window.okfCaretLineProbe = (control: RuntimeElement) => {
    probed = control;
    return { first: false, last: false };
  };
  const count = harness.messages.length;
  assert.equal(arrowAt(textarea, "ArrowUp", 40).prevented, false);
  assert.equal(arrowAt(textarea, "ArrowDown", 40).prevented, false);
  assert.equal(arrowAt(textarea, "ArrowUp", 0).prevented, false, "first logical line, not first visual line");
  assert.equal(arrowAt(textarea, "ArrowDown", textarea.value.length).prevented, false);
  assert.equal(probed, textarea);
  assert.equal(harness.messages.length, count, "no navigation message");
  assert.equal(harness.messages.some((message) => message.type === "previewEditOpen" && message.line === 1), false);
});

test("ArrowUp/ArrowDown leave the block only on the first/last visual line", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "one very long paragraph that wraps over several visual lines in the editor";
  harness.window.okfCaretLineProbe = () => ({ first: true, last: false });
  const up = arrowAt(textarea, "ArrowUp", 10);
  assert.equal(up.prevented, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave", "the unchanged block moves on");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("a table cell arrow inside a wrapped cell does not move to another cell", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  input().value = "a long cell that wraps";
  harness.window.okfCaretLineProbe = () => ({ first: false, last: false });
  const count = harness.messages.length;
  assert.equal(arrowAt(input(), "ArrowDown", 22).prevented, false);
  assert.equal(arrowAt(input(), "ArrowUp", 0).prevented, false);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  assert.equal(harness.messages.length, count);
  harness.window.okfCaretLineProbe = () => ({ first: false, last: true });
  assert.equal(arrowAt(input(), "ArrowDown", 22).prevented, true);
  assert.equal(cellEditorOf(harness).parentElement, cells[2][0]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-069
test("typing * or _ on a selection wraps it, keeps it selected and wraps again on a second press", () => {
  for (const marker of ["*", "_", "`", "~"]) {
    const harness = createRuntimeHarness();
    const textarea = openBlockEditorWithSource(harness);
    const calls = stubExecCommand(harness, textarea);
    textarea.value = "say foo now";
    textarea.setSelectionRange(4, 7);
    assert.equal(typeKey(textarea, marker), true, marker);
    assert.equal(textarea.value, "say " + marker + "foo" + marker + " now");
    assert.deepEqual(textarea.selectionRange, [5, 8], "foo stays selected");
    assert.equal(typeKey(textarea, marker), true);
    assert.equal(textarea.value, "say " + marker + marker + "foo" + marker + marker + " now");
    assert.deepEqual(textarea.selectionRange, [6, 9]);
    assert.equal(calls.length, 2, "one undoable native edit per wrap");
    assert.equal(calls[0].command, "insertText");
  }
});

test("marker wrapping falls back to a direct edit and autosaves when execCommand is unavailable", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "foo";
  textarea.setSelectionRange(0, 3);
  assert.equal(typeKey(textarea, "*"), true);
  assert.equal(textarea.value, "*foo*");
  assert.deepEqual(textarea.selectionRange, [1, 4]);
  harness.flushTimers();
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.editedText, "*foo*\n");
});

test("marker keys stay native without a selection, with modifiers or during IME composition", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "foo";
  textarea.setSelectionRange(1, 1);
  assert.equal(typeKey(textarea, "*"), false, "caret only");
  textarea.setSelectionRange(0, 3);
  assert.equal(typeKey(textarea, "*", { isComposing: true }), false);
  assert.equal(typeKey(textarea, "*", { ctrlKey: true }), false);
  assert.equal(typeKey(textarea, "*", { metaKey: true }), false);
  assert.equal(typeKey(textarea, "a"), false);
  assert.equal(typeKey(textarea, "Dead"), false);
  assert.equal(textarea.value, "foo");
});

test("a table cell wraps its selection with the marker too", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  const calls = stubExecCommand(harness, input());
  input().value = "a foo b";
  input().setSelectionRange(2, 5);
  assert.equal(typeKey(input(), "_"), true);
  assert.equal(input().value, "a _foo_ b");
  assert.deepEqual(input().selectionRange, [3, 6]);
  assert.equal(calls.length, 1);
  harness.flushTimers();
  assert.match(String(harness.messages.at(-1)?.editedText ?? ""), /_foo_/u);
});

test("Cmd/Ctrl+B, Cmd/Ctrl+I and Ctrl+/ edit the block text box in one native step without saving", () => {
  const cases: [Record<string, unknown>, string, [number, number], string][] = [
    [{ ctrlKey: true, code: "KeyB", key: "b" }, "say foo now", [4, 7], "say **foo** now"],
    [{ ctrlKey: true, code: "KeyI", key: "i" }, "say foo now", [4, 7], "say *foo* now"],
    [{ ctrlKey: true, code: "Slash", key: "/" }, "say foo", [0, 0], "<!-- TODO: say foo -->"],
    [{ metaKey: true, code: "Slash", key: "/" }, "say foo", [0, 0], "<!-- TODO: say foo -->"],
  ];
  for (const [init, value, [start, end], expected] of cases) {
    const harness = createRuntimeHarness();
    const textarea = openBlockEditorWithSource(harness);
    const calls = stubExecCommand(harness, textarea);
    textarea.value = value;
    textarea.setSelectionRange(start, end);
    const count = harness.messages.length;
    let stopped = false;
    let prevented = false;
    textarea.dispatch("keydown", {
      ...init,
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
    });
    assert.equal(prevented, true, JSON.stringify(init));
    assert.equal(stopped, true, "the shortcut stays out of the host editor");
    assert.equal(textarea.value, expected);
    assert.equal(calls.length, 1, "one undoable native edit");
    assert.equal(calls[0].command, "insertText");
    assert.equal(harness.messages.length, count, "no immediate save or commit");
    harness.flushTimers();
    const save = harness.messages.at(-1);
    assert.equal(save?.type, "previewEditSave");
    assert.equal(String(save?.editedText).startsWith(expected), true, "autosave carries the edit");
  }
});

test("editing shortcuts are ignored while composing, with AltGr or with Shift", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "foo";
  textarea.setSelectionRange(0, 3);
  for (const init of [
    { metaKey: true, code: "KeyB", key: "b", isComposing: true },
    { ctrlKey: true, altKey: true, code: "Slash", key: "/" },
    { ctrlKey: true, shiftKey: true, code: "KeyI", key: "i" },
    { metaKey: true, code: "KeyB", key: "b" },
  ]) {
    assert.equal(typeKey(textarea, String(init.key), init), false, JSON.stringify(init));
  }
  assert.equal(textarea.value, "foo");
  assert.equal(calls.length, 0);
});

test("the editing shortcuts do not touch the table cell editor", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  const calls = stubExecCommand(harness, input());
  input().value = "a foo b";
  input().setSelectionRange(2, 5);
  assert.equal(typeKey(input(), "b", { metaKey: true, code: "KeyB" }), false);
  assert.equal(input().value, "a foo b");
  assert.equal(calls.length, 0);
});

test("Enter continuation and Tab indentation use the undo-preserving execCommand path", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "- a";
  textarea.setSelectionRange(3, 3);
  assert.equal(typeKey(textarea, "Enter"), true);
  assert.equal(textarea.value, "- a\n- ");
  assert.equal(typeKey(textarea, "Tab"), true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.command === "insertText"));
});

test("undo and redo keys stop at the table cell editor and reach no window listener", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  let windowSaw = 0;
  (harness.window.addEventListener as (type: string, listener: () => void) => void)("keydown", () => { windowSaw += 1; });
  for (const init of [
    { key: "z", keyCode: 90, metaKey: true },
    { key: "Z", keyCode: 90, ctrlKey: true, shiftKey: true },
    { key: "y", ctrlKey: true },
  ]) {
    let stopped = 0;
    let prevented = 0;
    input().dispatch("keydown", {
      ...init,
      stopPropagation: () => { stopped += 1; },
      preventDefault: () => { prevented += 1; },
    });
    assert.equal(stopped, 1, JSON.stringify(init));
    assert.equal(prevented, 0, JSON.stringify(init));
  }
  assert.equal(windowSaw, 0);
});

test("AltGr (ctrlKey and altKey with AltGraph) still wraps the selection, plain Ctrl+Alt does not", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "foo";
  textarea.setSelectionRange(0, 3);
  assert.equal(typeKey(textarea, "~", { ctrlKey: true, altKey: true }), false);
  assert.equal(typeKey(textarea, "~", { ctrlKey: true, altKey: true, getModifierState: () => false }), false);
  assert.equal(textarea.value, "foo");
  assert.equal(typeKey(textarea, "~", {
    ctrlKey: true,
    altKey: true,
    getModifierState: (name: string) => name === "AltGraph",
  }), true);
  assert.equal(textarea.value, "~foo~");
});

const FIRST_EDITOR_CLASS = "sphinx-preview-block-editor--first";
const FIRST_START_CLASS = "sphinx-preview-insert-point--first";

function openBlockEditorElement(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") === "true" && !element.removed);
}

function openEmptyDocumentEditor(harness: RuntimeHarness): void {
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.previewContent,
    preventDefault: () => undefined,
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-102
test("top spacing: the editor of the first block of the document carries the first-block class", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", { target: harness.mappings[0], preventDefault: () => undefined });
  sourceReply(harness, "# Title\n");
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.ok(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), editor.className);
});

test("top spacing: the editor of a later block does not carry the first-block class", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  sourceReply(harness, "Editable paragraph.\n");
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.equal(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), false);
});

test("top spacing: an insertion editor below another block is not the first-block editor", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 52 });
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.equal(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), false);
});

test("top spacing: the first body block below a properties table is not the first-block editor", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  const properties = harness.mappings.find((block) => block.getAttribute("data-okf-properties") !== null);
  const first = harness.mappings.find((block) => block !== properties);
  assert.ok(first);
  harness.dispatchDocument("click", { target: first, preventDefault: () => undefined });
  sourceReply(harness, "First block.\n");
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.equal(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), false);
});

test("top spacing: Start writing of an empty document carries the first class, below properties not", () => {
  const empty = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  assert.ok(insertPointsOf(empty)[0].className.split(" ").includes(FIRST_START_CLASS));
  const withProperties = createRuntimeHarness({
    emptyBody: true,
    mapFrontmatter: true,
    propertiesMapped: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  assert.equal(insertPointsOf(withProperties)[0].className.split(" ").includes(FIRST_START_CLASS), false);
});

test("top spacing: the editor opened from Start writing carries the first-block class", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  insertPointAfterLine(harness, 0).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 0 });
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.ok(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), editor.className);
});

test("empty document: Enter in edit mode opens the new-block editor like Start writing", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.previewContent,
    preventDefault: () => { prevented = true; },
  });
  const open = harness.messages.at(-1);
  assert.equal(open?.type, "previewEditOpen");
  assert.equal(open?.line, 1);
  assert.equal(open?.endLine, 1);
  assert.equal(open?.insertAfterLine, 0);
  assert.equal(prevented, true);
});

test("empty document: Enter with a modifier, in a field, outside edit mode or on a filled document does nothing", () => {
  const opens = (harness: RuntimeHarness, event: Record<string, unknown>): boolean => {
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", {
      key: "Enter",
      target: harness.previewContent,
      preventDefault: () => undefined,
      ...event,
    });
    return harness.messages.slice(before).some((message) => message.type === "previewEditOpen");
  };
  const emptyOptions = { emptyBody: true, previewStatus: "success", savedState: { editMode: true } };
  for (const modifier of ["shiftKey", "altKey", "metaKey", "ctrlKey"]) {
    assert.equal(opens(createRuntimeHarness(emptyOptions), { [modifier]: true }), false, modifier);
  }
  assert.equal(opens(createRuntimeHarness(emptyOptions), { isComposing: true }), false);
  assert.equal(opens(createRuntimeHarness(emptyOptions), { target: new RuntimeElement({}, { scrollY: 0 }, 0, 20, "textarea") }), false);
  assert.equal(opens(createRuntimeHarness(emptyOptions), { target: new RuntimeElement({}, { scrollY: 0 }, 0, 20, "input") }), false);
  assert.equal(opens(createRuntimeHarness({ emptyBody: true, previewStatus: "success" }), {}), false, "reading mode");
  assert.equal(opens(createRuntimeHarness({ emptyBody: true, previewStatus: "error", savedState: { editMode: true } }), {}), false, "failed render");
  assert.equal(opens(createRuntimeHarness({ savedState: { editMode: true } }), {}), false, "document with blocks");
  const harness = createRuntimeHarness(emptyOptions);
  assert.equal(opens(harness, {}), true);
  assert.equal(opens(harness, {}), false, "an editor is already open");
});

test("empty document: Cmd/Ctrl+Enter saves the new block and Escape cancels back to Start writing", () => {
  const save = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  openEmptyDocumentEditor(save);
  sourceReply(save, "", { insertAfterLine: 0 });
  const textarea = save.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "# Hello";
  textarea.dispatch("input");
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  const saved = save.messages.at(-1);
  assert.equal(saved?.type, "previewEditSave");
  assert.equal(saved?.final, true);
  assert.equal(saved?.insertAfterLine, 0);
  assert.equal(saved?.editedText, "# Hello");

  const cancel = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  openEmptyDocumentEditor(cancel);
  sourceReply(cancel, "", { insertAfterLine: 0 });
  const field = cancel.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(field);
  field.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(cancel.messages.some((message) => message.type === "previewEditSave"), false);
  const point = insertPointsOf(cancel)[0];
  assert.ok(point, "Start writing is still there");
  assert.equal(point.getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(openBlockEditorElement(cancel), undefined);
});

test("ArrowUp from the first body block under a properties table keeps the editor open", () => {
  const harness = createRuntimeHarness({
    firstMappedSourceLine: 5,
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  const first = harness.mappings[0];
  harness.dispatchDocument("click", { target: first, preventDefault: () => undefined });
  const request = harness.messages.at(-1);
  assert.equal(request?.type, "previewEditOpen");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "Current block\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(textarea);
  textarea.setSelectionRange(0, 0);
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "ArrowUp", preventDefault: () => undefined });
  assert.equal(harness.messages.slice(before).some((message) => message.final === true), false);
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
  assert.equal(harness.messages.length, before, "no message is posted");
  assert.equal(first.getAttribute("data-sphinx-preview-editing"), "true", "the editor stays open");
});
