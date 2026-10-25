import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  altKey,
  blockEditorOf,
  findButton,
  insertPointAfterLine,
  MOVE_IDENTIFIERS,
  moveMessages,
  openBlockEditorWithSource,
  sourceReply,
} from "./runtimeTestSupport";

/**
 * Page side of the block editing requirements (BLOCK scope) that had no test of their own: edit
 * mode state, the hover outline and the click and key guards, the block editor frame and its
 * status line, the keys of the text box, the refusals shown by the page, and the clipboard chord on
 * a bar. The page runs in the fake DOM of `runtimeHarness.ts`.
 */

const DONE = "Done editing";
const CANCEL = "Cancel editing and restore the original text";

/** An element that also answers `closest` for the selectors the fake DOM does not know. */
class SelectorElement extends RuntimeElement {
  public constructor(
    harness: RuntimeHarness,
    private readonly answers: readonly string[],
    attributes: Record<string, string> = {},
    tagName = "div",
  ) {
    super(attributes, harness.windowState, 0, 20, tagName);
  }

  public override closest(selector: string): RuntimeElement | null {
    return this.answers.includes(selector) ? this : super.closest(selector);
  }
}

/** The post of the page that carries `type`, from message `from` on. */
function postsOf(harness: RuntimeHarness, type: string, from = 0): Array<Record<string, unknown>> {
  return harness.messages.slice(from).filter((message) => message.type === type);
}

/** The status line of the block editor: the created element that carries the status attribute. */
function statusLine(harness: RuntimeHarness): RuntimeElement {
  const status = harness.createdElements.find((element) => element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.ok(status, "a status line was created");
  return status;
}

/** Gives the element the `classList` the comment chip handler reads on a chip's parent. */
function withClassList(element: RuntimeElement): void {
  (element as unknown as { classList: { contains(name: string): boolean } }).classList = { contains: () => false };
}

function turnEditModeOn(harness: RuntimeHarness): void {
  harness.editModeButton.dispatch("click");
}

/** Opens the editor of block `index` (edit mode on) and answers with its source. */
function openEditorOf(harness: RuntimeHarness, index: number, source: string): RuntimeElement {
  if (harness.documentElement.getAttribute("data-sphinx-preview-edit-mode") !== "on") turnEditModeOn(harness);
  harness.dispatchDocument("click", { target: harness.mappings[index], preventDefault: () => undefined });
  sourceReply(harness, source);
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(textarea, "the text box was built");
  return textarea;
}

/** A keydown event of the text box. */
function key(name: string, extra: Record<string, unknown> = {}): { event: Record<string, unknown>; prevented: () => boolean } {
  let prevented = false;
  return {
    event: { key: name, preventDefault: () => { prevented = true; }, stopPropagation: () => undefined, ...extra },
    prevented: () => prevented,
  };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
test("a toggle of edit mode is written to the webview state next to its other fields", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: false, descriptionsCollapsed: true } });
  harness.editModeButton.dispatch("click");
  assert.equal(harness.getWebviewState().editMode, true);
  assert.equal(harness.getWebviewState().descriptionsCollapsed, true, "the other saved fields stay");
  assert.equal(harness.getWebviewState().paletteMode, "gfm");
  harness.editModeButton.dispatch("click");
  assert.equal(harness.getWebviewState().editMode, false);
  assert.equal(harness.getWebviewState().descriptionsCollapsed, true, "the other saved fields stay");
  assert.equal(harness.getWebviewState().paletteMode, "gfm");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-001
test("turning edit mode off closes the label rename field and posts no rename", () => {
  const harness = createRuntimeHarness();
  const create = harness.document.createElement as (tagName: string) => RuntimeElement & { select?: () => void };
  harness.document.createElement = (tagName: string) => {
    const element = create(tagName);
    element.select = () => undefined;
    return element;
  };
  turnEditModeOn(harness);
  const anchor = new SelectorElement(harness, [".okf-anchor"], { "data-okf-label": "intro", "data-okf-label-line": "3" }, "a");
  harness.mappings[1].appendChild(anchor);
  harness.dispatchDocument("click", {
    target: anchor,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    stopImmediatePropagation: () => undefined,
  });
  const field = () => harness.createdElements.find((element) => element.getAttribute("data-okf-label-rename") !== null);
  assert.ok(field(), "the rename field is open");
  assert.equal(field()!.removed, false);
  const before = harness.messages.length;
  harness.editModeButton.dispatch("click");
  assert.equal(field()!.removed, true, "the field is closed");
  assert.deepEqual(postsOf(harness, "previewLabelRename", before), []);

  const quiet = createRuntimeHarness();
  turnEditModeOn(quiet);
  const count = quiet.messages.length;
  quiet.editModeButton.dispatch("click");
  assert.deepEqual(quiet.messages.slice(count).map((message) => message.type), ["previewEditModeChanged"]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017
test("the hover outline skips the properties table and an open editor, and an element in a link", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  turnEditModeOn(harness);
  const outlined = (): RuntimeElement[] => [...harness.mappings, harness.frontmatterProperties]
    .filter((element) => element.getAttribute("data-sphinx-preview-edit-hover") !== null);
  const cell = new RuntimeElement({}, harness.windowState, 0, 20, "td");
  harness.frontmatterProperties.appendChild(cell);
  harness.dispatchDocument("mouseover", { target: cell });
  assert.deepEqual(outlined(), [], "the properties table is not outlined");

  const linked = new SelectorElement(harness, ["a"], {
    "data-sphinx-source-file": "/workspace/active.md", "data-sphinx-source-line": "60",
  });
  harness.dispatchDocument("mouseover", { target: linked });
  assert.deepEqual(outlined(), [], "a block that is itself inside a link is not outlined");

  harness.dispatchDocument("mouseover", { target: harness.mappings[0] });
  assert.deepEqual(outlined(), [harness.mappings[0]], "a plain mapped block is outlined");
  const textarea = openEditorOf(harness, 1, "Second paragraph.\n");
  harness.dispatchDocument("mouseover", { target: textarea });
  assert.deepEqual(outlined(), [], "nothing is outlined while the pointer is over the open editor");
});

test("Known issue: a link inside a paragraph does not stop the outline of the paragraph", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  const link = new RuntimeElement({}, harness.windowState, 0, 20, "a");
  harness.mappings[1].appendChild(link);
  harness.dispatchDocument("mouseover", { target: link });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-edit-hover"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("a click on a cell of the properties table never opens a block editor", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  turnEditModeOn(harness);
  const cell = new RuntimeElement({}, harness.windowState, 0, 20, "td");
  harness.frontmatterProperties.appendChild(cell);
  const before = harness.messages.length;
  harness.dispatchDocument("click", { target: cell, preventDefault: () => undefined });
  assert.deepEqual(postsOf(harness, "previewEditOpen", before), []);
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const opens = postsOf(harness, "previewEditOpen", before);
  assert.equal(opens.length, 1);
  assert.equal(opens[0]!.line, 50);
});

test("a click on a comment chip, an open thread or a block inside a link opens no editor", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  const before = harness.messages.length;
  withClassList(harness.mappings[1]);
  const chip = new SelectorElement(harness, [".okf-chip"]);
  const thread = new SelectorElement(harness, ['.okf-comment[data-okf-comment-kind="thread"] > .okf-comment-body']);
  harness.mappings[1].appendChild(chip);
  harness.mappings[1].appendChild(thread);
  const linked = new SelectorElement(harness, ["a"], {
    "data-sphinx-source-file": "/workspace/active.md", "data-sphinx-source-line": "60",
  });
  for (const target of [chip, thread, linked]) {
    harness.dispatchDocument("click", { target, preventDefault: () => undefined });
  }
  assert.deepEqual(postsOf(harness, "previewEditOpen", before), []);
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(postsOf(harness, "previewEditOpen", before).length, 1, "a plain block still opens its editor");
});

test("Known issue: a click on a link inside a paragraph opens the editor of the paragraph", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  const link = new RuntimeElement({}, harness.windowState, 0, 20, "a");
  harness.mappings[1].appendChild(link);
  const before = harness.messages.length;
  harness.dispatchDocument("click", { target: link, preventDefault: () => undefined });
  assert.equal(postsOf(harness, "previewEditOpen", before).length, 1);
});

test("Enter or Space on a focused block opens its editor with the caret at the end", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  for (const name of ["Enter", " "]) {
    const press = key(name, { target: harness.mappings[1] });
    harness.dispatchDocument("keydown", press.event);
    assert.equal(press.prevented(), true);
    const opens = postsOf(harness, "previewEditOpen");
    assert.equal(opens.at(-1)!.line, 50);
    assert.equal(opens.at(-1)!.endLine, 52);
    if (name === "Enter") {
      sourceReply(harness, "Second paragraph.\n");
      const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
      assert.equal(textarea.selectionStart, "Second paragraph.".length);
      findButton(harness, CANCEL).dispatch("click");
    }
  }
});

test("Enter or Space stays with a text box, a button, a chip, a toggle and an insert point", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  const before = harness.messages.length;
  withClassList(harness.mappings[1]);
  const targets = [
    new RuntimeElement({}, harness.windowState, 0, 20, "textarea"),
    new RuntimeElement({}, harness.windowState, 0, 20, "button"),
    new SelectorElement(harness, [".okf-chip"]),
    new SelectorElement(harness, ["[data-okf-description-toggle]"]),
    insertPointAfterLine(harness, 52).childElements[0]!,
  ];
  targets.slice(0, 4).forEach((target) => harness.mappings[1].appendChild(target));
  for (const target of targets) {
    for (const name of ["Enter", " "]) harness.dispatchDocument("keydown", key(name, { target }).event);
  }
  assert.deepEqual(postsOf(harness, "previewEditOpen", before), []);
  const reading = createRuntimeHarness();
  reading.dispatchDocument("keydown", key("Enter", { target: reading.mappings[1] }).event);
  assert.deepEqual(postsOf(reading, "previewEditOpen"), [], "outside edit mode the key only reveals the source");
  assert.equal(postsOf(reading, "previewReveal").length, 1);
});

test("Known issue: Enter on a link inside a paragraph opens the editor of the paragraph", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  const link = new RuntimeElement({}, harness.windowState, 0, 20, "a");
  harness.mappings[1].appendChild(link);
  harness.dispatchDocument("keydown", key("Enter", { target: link }).event);
  assert.equal(postsOf(harness, "previewEditOpen").length, 1);
});

test("a click on Diagram source in edit mode opens the editor of the figure and not the disclosure", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  const summary = new RuntimeElement({}, harness.windowState, 0, 20, "summary");
  harness.mappings[1].appendChild(summary);
  let prevented = 0;
  harness.dispatchDocument("click", { target: summary, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1, "the default toggle is prevented");
  const opens = postsOf(harness, "previewEditOpen");
  assert.equal(opens.length, 1);
  assert.deepEqual([opens[0]!.line, opens[0]!.endLine], [50, 52]);

  const reading = createRuntimeHarness();
  const readingSummary = new RuntimeElement({}, reading.windowState, 0, 20, "summary");
  reading.mappings[1].appendChild(readingSummary);
  let readingPrevented = 0;
  reading.dispatchDocument("click", { target: readingSummary, preventDefault: () => { readingPrevented += 1; } });
  assert.equal(readingPrevented, 0, "the disclosure toggles as usual");
  assert.deepEqual(postsOf(reading, "previewEditOpen"), []);
  const reveals = postsOf(reading, "previewReveal");
  assert.equal(reveals.length, 1);
  assert.equal(reveals[0]!.line, 50);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-033
test("the editor frame appears at once, empty, and is filled when the source arrives", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const frame = blockEditorOf(harness.mappings[1]);
  assert.ok(frame, "the frame is in the page after the block");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the block is hidden");
  assert.equal(frame.childElements.length, 0, "no text box yet");
  assert.equal(harness.createdElements.some((element) => element.tagName === "TEXTAREA"), false);
  // Known issue: the "Loading Markdown source…" line is not attached to the frame of a block.
  const status = statusLine(harness);
  assert.equal(status.textContent, "Loading Markdown source…");
  assert.equal(status.parentElement, undefined);
  const parentOf = (element: RuntimeElement): RuntimeElement | undefined => element.parentElement;

  sourceReply(harness, "Second paragraph.\n");
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  assert.equal(textarea.parentElement, frame);
  assert.equal(parentOf(parentOf(status)!), frame, "the status line is in the actions row of the frame");
  assert.equal(frame.childElements.length, 2, "the text box and the row of status and buttons");
  findButton(harness, DONE);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-029
test("the editor frame is a region named Raw Markdown editor and its text box is named Raw Markdown block", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const frame = blockEditorOf(harness.mappings[1]);
  assert.equal(frame.getAttribute("role"), "region");
  assert.equal(frame.getAttribute("aria-label"), "Raw Markdown editor");
  assert.equal(textarea.getAttribute("aria-label"), "Raw Markdown block");

  const cellHarness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23", "data-sphinx-source-file": "/workspace/active.md", "data-sphinx-source-line": "20",
  }, cellHarness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, cellHarness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, cellHarness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  table.appendChild(row);
  row.appendChild(cell);
  turnEditModeOn(cellHarness);
  cellHarness.dispatchDocument("click", { target: cell, preventDefault: () => undefined, stopPropagation: () => undefined });
  sourceReply(cellHarness, "not a pipe table\n");
  const fallback = cellHarness.createdElements.find((element) => element.getAttribute("aria-label") === "Raw Markdown block");
  assert.ok(fallback, "a cell whose source is no pipe table falls back to the raw text box");
  assert.equal(fallback.parentElement?.getAttribute("aria-label"), "Raw Markdown editor");
});

test("a click inside the editor frame does not reach the document listeners", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const frame = blockEditorOf(harness.mappings[1]);
  let stopped = 0;
  frame.dispatch("click", { stopPropagation: () => { stopped += 1; } });
  assert.equal(stopped, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("the status line reads Saving Markdown… from the final save on, and shows an error that refuses it", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph, changed.";
  textarea.dispatch("input");
  const status = statusLine(harness);
  findButton(harness, DONE).dispatch("click");
  const save = postsOf(harness, "previewEditSave").at(-1)!;
  assert.equal(save.final, true);
  assert.equal(status.textContent, "Saving Markdown…");
  harness.dispatchMessage({
    type: "previewEditSource", ...MOVE_IDENTIFIERS, editId: save.editId, error: "The preview is stale. Reopen the block before saving.",
  });
  assert.equal(status.textContent, "The preview is stale. Reopen the block before saving.");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("Done, Ctrl+Enter and the blur post one final save while the first is in flight", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph, changed.";
  textarea.dispatch("input");
  findButton(harness, DONE).dispatch("click");
  const before = harness.messages.length;
  findButton(harness, DONE).dispatch("click");
  textarea.dispatch("blur");
  textarea.dispatch("keydown", { key: "Enter", ctrlKey: true, preventDefault: () => undefined });
  assert.deepEqual(postsOf(harness, "previewEditSave", before), [], "no second final save");
  assert.equal(postsOf(harness, "previewEditSave").filter((message) => message.final === true).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("Cancel and Escape are ignored while the final save is in flight", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph, changed.";
  textarea.dispatch("input");
  findButton(harness, DONE).dispatch("click");
  const before = harness.messages.length;
  findButton(harness, CANCEL).dispatch("click");
  textarea.dispatch("keydown", key("Escape").event);
  assert.deepEqual(harness.messages.slice(before), [], "nothing is posted");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the editor stays open");

  const idle = createRuntimeHarness();
  const idleTextarea = openBlockEditorWithSource(idle);
  idleTextarea.dispatch("keydown", key("Escape").event);
  assert.equal(idle.mappings[1].getAttribute("data-sphinx-preview-editing"), null, "before the save Escape cancels");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("the Refresh button is disabled while a block editor is open and enabled again when it closes", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.refreshButton.disabled, false);
  const textarea = openBlockEditorWithSource(harness);
  assert.equal(harness.refreshButton.disabled, true);
  textarea.dispatch("keydown", key("Escape").event);
  assert.equal(harness.refreshButton.disabled, false);
});

test("a refresh asked from the page over an open block editor shows a message and posts no refresh", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  harness.refreshButton.dispatch("click");
  assert.equal(statusLine(harness).textContent, "Save or cancel this edit before refreshing.");
  assert.deepEqual(postsOf(harness, "previewRefresh", before), []);

  const idle = createRuntimeHarness();
  idle.refreshButton.dispatch("click");
  assert.equal(postsOf(idle, "previewRefresh").length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("a refused open leaves the frame without a text box and records the error", () => {
  const harness = createRuntimeHarness();
  turnEditModeOn(harness);
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const editId = harness.messages.at(-1)?.editId;
  const status = statusLine(harness);
  harness.dispatchMessage({
    type: "previewEditSource", ...MOVE_IDENTIFIERS, editId: "another", error: "Not for this editor.",
  });
  assert.equal(status.textContent, "Loading Markdown source…", "the answer of another editor is ignored");
  harness.dispatchMessage({
    type: "previewEditSource", ...MOVE_IDENTIFIERS, editId, error: "Another Markdown block is already being edited.",
  });
  assert.equal(status.textContent, "Another Markdown block is already being edited.");
  const frame = blockEditorOf(harness.mappings[1]);
  assert.equal(frame.childElements.length, 0, "no text box");
  assert.equal(harness.createdElements.some((element) => element.tagName === "TEXTAREA"), false);
  // Known issue: the status line is not in the frame, so the writer does not see the reason.
  assert.equal(status.parentElement, undefined);
  assert.equal(harness.refreshButton.disabled, true, "the editor stays registered as the open editor");
});

test("a refused save keeps the typed text and lets the next input save again", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph, changed.";
  textarea.dispatch("input");
  harness.flushTimers();
  const status = statusLine(harness);
  findButton(harness, DONE).dispatch("click");
  const save = postsOf(harness, "previewEditSave").at(-1)!;
  assert.equal(save.final, true);
  harness.dispatchMessage({
    type: "previewEditSource", ...MOVE_IDENTIFIERS, editId: save.editId, error: "VS Code could not apply the Markdown edit.",
  });
  assert.equal(textarea.value, "Second paragraph, changed.");
  assert.equal(status.textContent, "VS Code could not apply the Markdown edit.");
  const before = harness.messages.length;
  textarea.value = "Second paragraph, changed again.";
  textarea.dispatch("input");
  assert.match(status.textContent, /Esc: cancel/u, "the key hint returns to the status line");
  harness.flushTimers();
  const saves = postsOf(harness, "previewEditSave", before);
  assert.equal(saves.length, 1, "the next autosave is posted");
  assert.equal(saves[0]!.editedText, "Second paragraph, changed again.\n");
  assert.equal(saves[0]!.final, false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-228
test("closing an editor scrolls the page back by the shift applied on opening", () => {
  const shifted = createRuntimeHarness();
  shifted.windowState.scrollY = 200;
  shifted.dispatchWindow("scroll");
  shifted.flushFrames();
  shifted.windowState.paletteHeight = 44;
  const textarea = openBlockEditorWithSource(shifted);
  assert.equal(shifted.windowState.scrollY, 244, "opening scrolled down by the palette height");
  textarea.dispatch("keydown", key("Escape").event);
  shifted.flushFrames();
  assert.equal(shifted.windowState.scrollY, 200, "closing scrolled back");

  const plain = createRuntimeHarness();
  plain.windowState.scrollY = 200;
  plain.dispatchWindow("scroll");
  plain.flushFrames();
  const plainTextarea = openBlockEditorWithSource(plain);
  assert.equal(plain.windowState.scrollY, 200, "no shift on opening");
  plainTextarea.dispatch("keydown", key("Escape").event);
  plain.flushFrames();
  assert.equal(plain.windowState.scrollY, 200, "no scroll on closing");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-069
test("Home and End move the caret to the start and to the end before the last line break", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Hello\nworld\n\n";
  textarea.setSelectionRange(3, 3);
  const end = key("End");
  textarea.dispatch("keydown", end.event);
  assert.equal(end.prevented(), true, "the preview does not scroll");
  assert.deepEqual(textarea.selectionRange, [11, 11]);
  const home = key("Home");
  textarea.dispatch("keydown", home.event);
  assert.equal(home.prevented(), true);
  assert.deepEqual(textarea.selectionRange, [0, 0]);

  textarea.setSelectionRange(3, 3);
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }, { isComposing: true }]) {
    const native = key("Home", modifier);
    textarea.dispatch("keydown", native.event);
    assert.equal(native.prevented(), false, JSON.stringify(modifier));
    assert.deepEqual(textarea.selectionRange, [3, 3]);
  }
});

test("Shift with Home or End extends the selection from its anchor", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Hello\nworld\n";
  textarea.setSelectionRange(3, 3);
  textarea.dispatch("keydown", key("End", { shiftKey: true }).event);
  assert.deepEqual(textarea.selectionRange, [3, 11]);
  assert.equal(textarea.selectionDirection, "forward");

  textarea.setSelectionRange(2, 8, "backward");
  textarea.dispatch("keydown", key("Home", { shiftKey: true }).event);
  assert.deepEqual(textarea.selectionRange, [0, 8], "the anchor is the end of the backward selection");
  assert.equal(textarea.selectionDirection, "backward");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-079
test("arrow keys with a modifier or with a selection stay in the text box", () => {
  const harness = createRuntimeHarness();
  const textarea = openEditorOf(harness, 1, "one\ntwo\n");
  harness.window.okfCaretLineProbe = () => ({ first: true, last: true });
  const before = harness.messages.length;
  textarea.setSelectionRange(0, 0);
  for (const modifier of [{ shiftKey: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
    const press = key("ArrowUp", modifier);
    textarea.dispatch("keydown", press.event);
    assert.equal(press.prevented(), false, JSON.stringify(modifier));
  }
  textarea.setSelectionRange(0, 3);
  const selected = key("ArrowLeft");
  textarea.dispatch("keydown", selected.event);
  assert.equal(selected.prevented(), false);
  assert.deepEqual(harness.messages.slice(before), [], "the editor stays open");

  textarea.setSelectionRange(0, 0);
  const plain = key("ArrowUp");
  textarea.dispatch("keydown", plain.event);
  assert.equal(plain.prevented(), true, "a plain arrow at the edge leaves for the block above");
});

test("arrow navigation stops at the first and at the last block", () => {
  const first = createRuntimeHarness();
  const firstBox = openEditorOf(first, 0, "First\n");
  first.window.okfCaretLineProbe = () => ({ first: true, last: true });
  const count = first.messages.length;
  firstBox.setSelectionRange(0, 0);
  const up = key("ArrowUp");
  firstBox.dispatch("keydown", up.event);
  assert.equal(up.prevented(), false);
  assert.deepEqual(first.messages.slice(count), []);
  assert.equal(first.mappings[0].getAttribute("data-sphinx-preview-editing"), "true");

  const last = createRuntimeHarness();
  const lastBox = openEditorOf(last, 2, "Last\n");
  last.window.okfCaretLineProbe = () => ({ first: true, last: true });
  const lastCount = last.messages.length;
  lastBox.setSelectionRange(lastBox.value.length, lastBox.value.length);
  const down = key("ArrowDown");
  lastBox.dispatch("keydown", down.event);
  assert.equal(down.prevented(), false);
  assert.deepEqual(last.messages.slice(lastCount), []);
  assert.equal(last.mappings[2].getAttribute("data-sphinx-preview-editing"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130
test("a keyboard move that never lands is forgotten after five seconds", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true }, virtualClock: true });
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness).length, 1);
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness).length, 1, "a chord during the flight is ignored");
  harness.advanceTimers(4999);
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness).length, 1, "still in flight at 4999 ms");
  harness.advanceTimers(1);
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness).length, 2, "forgotten at 5000 ms, the new chord is accepted");

  const answered = createRuntimeHarness({ savedState: { editMode: true }, virtualClock: true });
  answered.dispatchDocument("keydown", altKey("ArrowDown", { target: answered.mappings[1] }));
  const timers = answered.pendingTimerCount();
  answered.advanceTimers(1000);
  answered.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "no" });
  assert.ok(answered.pendingTimerCount() < timers, "the timer is cleared by the answer");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127
test("the paste chord on the insert point of an included block shows a notice and posts nothing", () => {
  const harness = createRuntimeHarness();
  harness.mappings[1].setAttribute("data-sphinx-preview-included", "true");
  turnEditModeOn(harness);
  const paste = (line: number) => harness.dispatchDocument("keydown", {
    key: "v", ctrlKey: true, target: insertPointAfterLine(harness, line).childElements[0],
    preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  const notice = (): string | undefined => harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))?.textContent;
  const before = harness.messages.length;
  paste(52);
  assert.equal(notice(), "Text cannot be pasted next to a block that comes from an included file.");
  assert.deepEqual(postsOf(harness, "previewBlocksPaste", before), []);
  harness.advanceTimers(3999);
  assert.match(notice() ?? "", /included file/u, "the notice stays for four seconds");
  harness.advanceTimers(1);
  assert.doesNotMatch(notice() ?? "", /included file/u);

  paste(1);
  const pastes = postsOf(harness, "previewBlocksPaste", before);
  assert.equal(pastes.length, 1);
  assert.equal(pastes[0]!.insertAfterLine, 1);
});
