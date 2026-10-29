import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { frontmatterSaves, openBlockEditorWithSource, openTableCellEditor } from "./runtimeTestSupport";

/**
 * Cmd/Ctrl+F pressed with the focus in a field of an open editor (block editor text box, table
 * cell, frontmatter field). The page takes the key itself and opens the find bar at once, its field
 * focused: the keys typed next go to the query, never into the editor field. Before, the page left
 * the key to VS Code, whose key binding posted `previewFindCommand` back one host round trip later;
 * keys typed in that gap landed in the editor field and the blur commit (BLOCK-047) wrote them into
 * the Markdown.
 */

const FIND_COMMAND = { type: "previewFindCommand", documentId: "file:///active.md", revision: 7, requestId: 11, command: "open" };

/** A harness whose `focus()` blurs the element that loses the focus, as a browser does. */
function focusingHarness(): RuntimeHarness {
  return createRuntimeHarness({ trackFocus: true, blurOnFocusChange: true });
}

/** Cmd/Ctrl+F (Ctrl here: the harness has no Apple platform) on `target`; counts what the page stopped. */
function pressFind(harness: RuntimeHarness, target: RuntimeElement): { prevented: number; stopped: number } {
  let prevented = 0;
  let stopped = 0;
  harness.dispatchWindow("keydown", {
    target, code: "KeyF", key: "f", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false,
    preventDefault: () => { prevented += 1; }, stopPropagation: () => { stopped += 1; },
  });
  return { prevented, stopped };
}

/** Types `text` one character at a time into the element that holds the focus. */
function type(harness: RuntimeHarness, text: string): void {
  for (const character of text) {
    const target = harness.document.activeElement as RuntimeElement;
    target.value = `${target.value}${character}`;
    target.dispatch("input", { target });
  }
}

/**
 * Types `text` into the element that holds the focus as a browser does: each character replaces
 * the selection (or goes in at the caret), then the caret follows it.
 */
function typeAtCaret(harness: RuntimeHarness, text: string): void {
  for (const character of text) {
    const target = harness.document.activeElement as RuntimeElement;
    const start = Math.min(target.selectionStart, target.value.length);
    const end = Math.max(start, Math.min(target.selectionEnd, target.value.length));
    target.value = `${target.value.slice(0, start)}${character}${target.value.slice(end)}`;
    target.setSelectionRange(start + 1, start + 1);
    target.dispatch("input", { target });
  }
}

function findInputs(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) => element.getAttribute("data-find-input") !== null);
}

function messagesOf(harness: RuntimeHarness, type: string): Array<Record<string, unknown>> {
  return harness.messages.filter((message) => message.type === type);
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("Cmd/Ctrl+F in a block editor opens the find bar at once: later keys go to the query, not the Markdown", () => {
  const harness = focusingHarness();
  const textarea = openBlockEditorWithSource(harness);
  assert.equal(textarea.value, "Second paragraph.");
  textarea.focus();
  type(harness, "!");

  assert.deepEqual(pressFind(harness, textarea), { prevented: 1, stopped: 1 },
    "the page takes the key: VS Code does not run its own find for it");
  const [findInput, ...others] = findInputs(harness);
  assert.ok(findInput, "the find bar opened at once, without waiting for the host");
  assert.equal(others.length, 0);
  assert.equal(harness.document.activeElement, findInput, "the find field holds the focus");

  // The reader keeps typing: the keys go to the query.
  type(harness, "XY");
  assert.equal(findInput.value, "XY");
  assert.equal(textarea.value, "Second paragraph.!", "the editor field did not receive the keys");

  // The text box lost the focus to the find field: the editor committed what was typed before.
  harness.flushTimers();
  const saves = messagesOf(harness, "previewEditSave");
  assert.ok(saves.length > 0, "the blur committed the editor (BLOCK-047)");
  assert.equal(saves.at(-1)!.editedText, "Second paragraph.!\n", "the edit made before Cmd/Ctrl+F is saved");
  for (const save of saves) assert.doesNotMatch(String(save.editedText), /X|Y/u, "the keys typed after Cmd/Ctrl+F stay out of the Markdown");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("unsaved block edits survive Cmd/Ctrl+F exactly: one final save on the blur, the query holds only the keys typed after", () => {
  const harness = focusingHarness();
  const textarea = openBlockEditorWithSource(harness);
  assert.equal(textarea.value, "Second paragraph.");
  textarea.focus();

  // Unsaved edits of several kinds, the autosave timer still pending: a word replaced through a
  // selection, text and a new line typed at the end.
  textarea.setSelectionRange(0, 6);
  typeAtCaret(harness, "First");
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  typeAtCaret(harness, " More text.\nA second line");
  const edited = "First paragraph. More text.\nA second line";
  assert.equal(textarea.value, edited);
  assert.deepEqual(messagesOf(harness, "previewEditSave"), [], "nothing saved yet: the edits are unsaved");

  // A selection over the line break when the key is pressed: it does not start the query.
  textarea.setSelectionRange(20, 33);
  assert.deepEqual(pressFind(harness, textarea), { prevented: 1, stopped: 1 });
  const [findInput, ...others] = findInputs(harness);
  assert.ok(findInput, "the find bar opened at once");
  assert.equal(others.length, 0);
  assert.equal(harness.document.activeElement, findInput, "the find field holds the focus");
  assert.equal(findInput.value, "", "a selection over two lines does not start the query");

  // The blur of the text box committed the edits once, exactly as typed.
  const saves = (): Array<Record<string, unknown>> => messagesOf(harness, "previewEditSave");
  assert.equal(saves().length, 1, "one save, posted by the blur");
  assert.equal(saves()[0]!.final, true, "the blur commit is the final save");
  assert.equal(saves()[0]!.editedText, `${edited}\n`, "the edits are saved whole, nothing lost or added");
  assert.equal(saves()[0]!.originalText, "Second paragraph.\n");

  // The keys typed right after the key go to the active element: the query.
  typeAtCaret(harness, "query");
  assert.equal(findInput.value, "query", "the query holds the typed keys only");
  assert.equal(textarea.value, edited, "the text box received none of them");

  // Later events post nothing more: the host's late find command, the pending timers, Escape.
  harness.dispatchMessage(FIND_COMMAND);
  assert.equal(findInputs(harness).length, 1, "no second bar");
  assert.equal(findInput.value, "query", "the late host command keeps the query");
  harness.flushTimers();
  let prevented = 0;
  harness.dispatchWindow("keydown", {
    target: findInput, key: "Escape", code: "Escape",
    preventDefault: () => { prevented += 1; }, stopPropagation: () => undefined,
  });
  assert.equal(prevented, 1, "the bar took Escape");
  // The final save is on its way: the text box does not get the focus back (keys typed there
  // would never be saved), and the find field let it go.
  assert.notEqual(harness.document.activeElement, textarea, "the committed text box does not take the focus back");
  assert.notEqual(harness.document.activeElement, findInput, "the closed bar let the focus go");
  harness.flushTimers();
  assert.equal(saves().length, 1, "still one save after the host command, the timers and Escape");
  assert.equal(saves()[0]!.editedText, `${edited}\n`);
  assert.equal(textarea.value, edited);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("the host's find command after the page opened the bar from an editor changes nothing", () => {
  const harness = focusingHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.focus();
  pressFind(harness, textarea);
  const [findInput] = findInputs(harness);
  assert.ok(findInput);
  type(harness, "XY");
  harness.flushTimers();
  const messageCount = harness.messages.length;
  let selected = 0;
  (findInput as unknown as { select(): void }).select = () => { selected += 1; };
  const focusOptions = findInput.focusOptions;
  findInput.focusOptions = { preventScroll: false };

  // The same key may still reach VS Code, whose key binding posts the command one round trip later.
  harness.dispatchMessage(FIND_COMMAND);
  assert.equal(findInputs(harness).length, 1, "no second bar");
  assert.equal(harness.document.activeElement, findInput, "the find field keeps the focus");
  assert.deepEqual(findInput.focusOptions, { preventScroll: false }, "the field was not focused again");
  assert.equal(selected, 0, "the query is not selected again, so the next key does not replace it");
  type(harness, "Z");
  assert.equal(findInput.value, "XYZ", "the query is kept");
  harness.flushTimers();
  assert.deepEqual(harness.messages.slice(messageCount).filter((message) => message.type === "previewEditSave"), [],
    "no extra save");
  findInput.focusOptions = focusOptions;
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("the find bar opened from a block editor starts with the text selected in the text box", () => {
  const harness = focusingHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.focus();
  textarea.setSelectionRange(7, 16);
  pressFind(harness, textarea);
  const [findInput] = findInputs(harness);
  assert.ok(findInput);
  assert.equal(findInput.value, "paragraph");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
// The blur commit closes an unchanged editor at once (a changed one when the host answers its save):
// Escape then closes the bar and lets the focus go. The bar gives it back to the text box only while
// that is still in the page (`isConnected`, which this harness does not model).
test("Escape closes the find bar opened from a block editor; the unchanged editor was closed by the blur", () => {
  const harness = focusingHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.focus();
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing") !== null, true, "the editor is open");
  pressFind(harness, textarea);
  const [findInput] = findInputs(harness);
  assert.ok(findInput);
  harness.flushTimers();
  assert.deepEqual(messagesOf(harness, "previewEditSave"), [], "nothing changed, nothing saved");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing") !== null, false,
    "the blur closed the unchanged editor");
  let prevented = 0;
  harness.dispatchWindow("keydown", {
    target: findInput, key: "Escape", code: "Escape",
    preventDefault: () => { prevented += 1; }, stopPropagation: () => undefined,
  });
  assert.equal(prevented, 1, "the bar took Escape");
  assert.notEqual(harness.document.activeElement, findInput, "the bar closed and its field let the focus go");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("Cmd/Ctrl+F in a table cell editor opens the find bar at once; later keys go to the query", () => {
  const harness = focusingHarness();
  const input = openTableCellEditor(harness);
  input.focus();
  assert.deepEqual(pressFind(harness, input), { prevented: 1, stopped: 1 });
  const [findInput] = findInputs(harness);
  assert.ok(findInput);
  assert.equal(harness.document.activeElement, findInput);
  const cellValue = input.value;
  type(harness, "XY");
  assert.equal(findInput.value, "XY");
  assert.equal(input.value, cellValue, "the cell field did not receive the keys");
  harness.flushTimers();
  for (const save of messagesOf(harness, "previewEditSave")) assert.doesNotMatch(String(save.editedText), /XY/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("Cmd/Ctrl+F in a frontmatter field opens the find bar at once; later keys go to the query", () => {
  const harness = createRuntimeHarness({ trackFocus: true, blurOnFocusChange: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify("Draft"));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "Draft\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  const field = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(field);
  field.focus();
  assert.deepEqual(pressFind(harness, field), { prevented: 1, stopped: 1 });
  const [findInput] = findInputs(harness);
  assert.ok(findInput);
  assert.equal(harness.document.activeElement, findInput);
  type(harness, "XY");
  assert.equal(findInput.value, "XY");
  assert.equal(field.value, "Draft", "the frontmatter field did not receive the keys");
  harness.flushTimers();
  for (const save of frontmatterSaves(harness)) assert.doesNotMatch(JSON.stringify(save), /XY/u);
});
