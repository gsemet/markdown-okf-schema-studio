import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  allDescendants,
  figureHarness,
  linkField,
  linkPanelOf,
  openBlockEditorWithSource,
  openTableCellEditorForTab,
  paletteButton,
  paletteMenu,
  paletteOf,
  shiftKey,
  stubExecCommand,
  typeKey,
} from "./runtimeTestSupport";

/**
 * Palette actions that reach the host or a panel: MyST buttons, file dialogs, the figure form,
 * colours, the table cell bar and pasting (modules/figurePanel.ts, pasteImage.ts, pasteHtml.ts).
 */

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-001
test("T28: the MyST buttons show in MyST mode only", () => {
  const ids = ["admonition", "deflist", "math", "sub", "sup", "label"];
  for (const mode of ["strict", "gfm"] as const) {
    const harness = createRuntimeHarness({ initialPaletteMode: mode });
    openBlockEditorWithSource(harness);
    for (const id of ids) {
      assert.equal(harness.createdElements.some((e) => e.getAttribute("data-edit-action") === id), false, mode + " " + id);
    }
  }
  const myst = createRuntimeHarness({ initialPaletteMode: "myst" });
  openBlockEditorWithSource(myst);
  for (const id of ids) assert.ok(paletteButton(myst, id), id);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-148
test("T30: the editor stays open while the host's file dialog has the focus, and the answer is inserted", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Read ";
  textarea.selectionStart = 5;
  textarea.selectionEnd = 5;
  paletteButton(harness, "doc").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPickDocument");
  assert.equal(typeof request.editId, "string");
  assert.equal(request.documentId, "file:///active.md");
  // The native dialog takes the focus: the blur of the text box is not leaving.
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false);
  harness.dispatchMessage({
    type: "previewPickDocumentResult", editId: request.editId, ok: true, path: "../guide/setup",
    revision: 99, requestId: 99,
  });
  assert.equal(textarea.value, "Read {doc}`../guide/setup`");
  // Once answered, a real departure saves again.
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

test("T30: a cancelled file dialog inserts nothing and the blur saves again", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. changed";
  textarea.dispatch("input");
  paletteButton(harness, "doc").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  const request = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPickDocumentResult", editId: request.editId, ok: true, cancelled: true });
  assert.equal(textarea.value.includes("{doc}"), false);
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

const paletteClick = { preventDefault: () => undefined, stopPropagation: () => undefined };

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-109
test("T31: Image keeps the editor open while the file dialog has the focus, then inserts the reference", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See ";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  paletteButton(harness, "image").dispatch("click", paletteClick);
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPickImage");
  assert.equal(typeof request.editId, "string");
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false);
  harness.dispatchMessage({
    type: "previewPickImageResult", editId: request.editId, ok: true, path: "img/my logo.png",
    revision: 99, requestId: 99,
  });
  assert.equal(textarea.value, "See ![my logo](<img/my logo.png>)");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "my logo");
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

test("T31: a stale image answer, a refusal and a cancel insert nothing", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See ";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  paletteButton(harness, "image").dispatch("click", paletteClick);
  const request = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPickImageResult", editId: "other-edit", ok: true, path: "a.png" });
  assert.equal(textarea.value, "See ", "an answer for another edit id is ignored");
  harness.dispatchMessage({ type: "previewPickImageResult", editId: request.editId, ok: false, reason: "Outside the workspace." });
  assert.equal(textarea.value, "See ");
  paletteButton(harness, "image").dispatch("click", paletteClick);
  const second = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPickImageResult", editId: second.editId, ok: true, cancelled: true });
  assert.equal(textarea.value, "See ");
});

test("T31: Done saves while the file dialog is still open, so the editor is never stuck", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. edited";
  textarea.dispatch("input");
  paletteButton(harness, "image").dispatch("click", paletteClick);
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

// T32: the figure editor (form above the text box, palette Figure inside a figure, hover button).
const figureSource = [
  ":::{figure} images/chip.png",
  ":alt: A chip",
  ":width: 60%",
  ":class: with-border",
  "",
  "The chip.",
  ":::",
].join("\n");

function figurePanelOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-figure-panel") !== null && !element.removed);
}

function figureField(harness: RuntimeHarness, name: string): RuntimeElement {
  const field = harness.createdElements.find((element) =>
    element.getAttribute("data-figure-field") === name && !element.removed);
  assert.ok(field, "figure field " + name);
  return field;
}

function figureAction(harness: RuntimeHarness, name: string): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.getAttribute("data-figure-action") === name && !element.removed);
  assert.ok(button, "figure action " + name);
  return button;
}

test("T32: the Figure button with the caret inside a figure opens the form, not the file dialog", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  const before = harness.messages.length;
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewPickImage"), false);
  const panel = figurePanelOf(harness);
  assert.ok(panel, "the form opens");
  const frame = textarea.parentElement!;
  assert.equal(panel.parentElement, frame);
  assert.equal(frame.childElements.indexOf(panel), frame.childElements.indexOf(paletteOf(harness)!) + 1);
  assert.equal(figureField(harness, "source").value, "images/chip.png");
  assert.equal(figureField(harness, "alt").value, "A chip");
  assert.equal(figureField(harness, "width").value, "60%");
  assert.equal(figureField(harness, "caption").value, "The chip.");
  assert.equal(figureField(harness, "align").value, "");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-150
test("T32: the Figure button outside any figure still picks an image", () => {
  const { harness } = figureHarness("Just a paragraph.\n\n" + figureSource, 3);
  const before = harness.messages.length;
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewPickImage"), true);
  assert.equal(figurePanelOf(harness), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-150
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-153
test("CR117: inserting a figure from a picked image opens the figure form on its caption", () => {
  const { harness, textarea } = figureHarness("Just a paragraph.", 17);
  const proto = Object.getPrototypeOf(textarea) as { focus: (options?: FocusOptions) => void };
  const originalFocus = proto.focus;
  const focused: RuntimeElement[] = [];
  proto.focus = function focus(this: RuntimeElement, options?: FocusOptions): void {
    focused.push(this);
    originalFocus.call(this, options);
  };
  try {
    paletteButton(harness, "figure").dispatch("click", paletteClick);
    const request = harness.messages.at(-1)!;
    assert.equal(request.type, "previewPickImage");
    assert.equal(figurePanelOf(harness), undefined, "no form before the image is chosen");
    harness.dispatchMessage({
      type: "previewPickImageResult", editId: request.editId, ok: true, path: "images/chip.png",
      revision: 99, requestId: 99,
    });
    assert.match(textarea.value, /:::\{figure\} images\/chip\.png\n:alt: chip\n\n\n:::/u);
    assert.ok(figurePanelOf(harness), "the form opens right after the pick");
    assert.equal(figureField(harness, "source").value, "images/chip.png");
    assert.equal(figureField(harness, "alt").value, "chip");
    assert.equal(focused.at(-1), figureField(harness, "caption"), "the caption field has the focus");
    // Cancel keeps the inserted figure with its default values.
    const inserted = textarea.value;
    figureField(harness, "caption").dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    assert.equal(figurePanelOf(harness), undefined);
    assert.equal(textarea.value, inserted);
  } finally {
    proto.focus = originalFocus;
  }
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-160
test("T32: Apply rewrites the directive in one edit and keeps untouched options byte for byte", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureField(harness, "width").value = "300px";
  figureField(harness, "caption").value = "The chip, from above.";
  figureField(harness, "align").value = "center";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 1, "one native edit, so one undo step");
  assert.equal(calls[0].command, "insertText");
  assert.equal(textarea.value, [
    ":::{figure} images/chip.png",
    ":alt: A chip",
    ":width: 300px",
    ":class: with-border",
    ":align: center",
    "",
    "The chip, from above.",
    ":::",
  ].join("\n"));
  assert.equal(figurePanelOf(harness), undefined, "the form closes");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the editor stays open");
});

test("T32: Apply without a change writes nothing", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 0);
  assert.equal(textarea.value, figureSource);
  assert.equal(figurePanelOf(harness), undefined);
});

test("T32: an invalid width shows an inline error and keeps the form open without editing", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureField(harness, "width").value = "wide";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 0);
  assert.ok(figurePanelOf(harness), "still open");
  const error = harness.createdElements.find((element) =>
    element.getAttribute("data-figure-error") === "width")!;
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /px, %, em or rem/u);
  assert.equal(textarea.value, figureSource);
  figureField(harness, "width").value = "40%";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 1);
  assert.match(textarea.value, /:width: 40%/u);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-036
test("T32: focus moves inside the editor frame keep the editor open; leaving it saves", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  textarea.value = figureSource + "\nmore";
  textarea.dispatch("input");
  textarea.setSelectionRange(5, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  const saved = () => harness.messages.some((message) => message.type === "previewEditSave" && message.final === true);
  figureField(harness, "alt").dispatch("blur", { relatedTarget: figureField(harness, "width") });
  figureField(harness, "width").dispatch("blur", { relatedTarget: textarea });
  assert.equal(saved(), false);
  figureField(harness, "width").dispatch("blur", { relatedTarget: null });
  assert.equal(saved(), true);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-031
test("T32: Escape in the form closes it and gives the focus back to the text box", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  let prevented = false;
  figureField(harness, "alt").dispatch("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(figurePanelOf(harness), undefined);
  assert.equal(calls.length, 0);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.deepEqual(textarea.selectionRange, [5, 5]);
});

test("T32: Browse asks the host for an image, keeps the editor open, and fills Source", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureAction(harness, "browse").dispatch("click", { preventDefault: () => undefined });
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPickImage");
  figureField(harness, "source").dispatch("blur", { relatedTarget: null });
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false);
  harness.dispatchMessage({
    type: "previewPickImageResult", editId: request.editId, ok: true, path: "img/other.png",
    revision: 99, requestId: 99,
  });
  assert.equal(figureField(harness, "source").value, "img/other.png");
  assert.ok(figurePanelOf(harness));
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.match(textarea.value, /^:::\{figure\} img\/other\.png\n/u);
});

test("T32: typing in the text box closes the form", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  textarea.dispatch("input");
  assert.equal(figurePanelOf(harness), undefined);
});

test("T32: a Markdown image alone in its paragraph converts to a figure", () => {
  const { harness, textarea, calls } = figureHarness("![A chip](images/chip.png)", 4);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  assert.ok(figurePanelOf(harness));
  assert.equal(figureField(harness, "alt").value, "A chip");
  assert.equal(figureAction(harness, "apply").textContent, "Convert to figure");
  figureField(harness, "caption").value = "Top view.";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 1);
  assert.equal(textarea.value, ":::{figure} images/chip.png\n:alt: A chip\n\nTop view.\n:::");
});

function hoverFigure(harness: RuntimeHarness): RuntimeElement {
  const figure = new RuntimeElement({
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
    "data-sphinx-source-end-line": "26",
  }, harness.windowState, 100, 80, "figure");
  harness.dispatchDocument("mouseover", { target: figure });
  return figure;
}

function editFigureButton(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-figure-edit") !== null);
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-153
test("T32: hovering a figure in edit mode shows Edit figure; outside edit mode it does not", () => {
  const off = createRuntimeHarness();
  hoverFigure(off);
  assert.equal(editFigureButton(off), undefined);
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const figure = hoverFigure(harness);
  const button = editFigureButton(harness)!;
  assert.ok(button);
  assert.equal(button.getAttribute("hidden"), null);
  let prevented = false;
  button.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, "a press does not move the focus");
  // Moving from the figure onto the button is not leaving the figure.
  harness.dispatchDocument("mouseout", { target: figure, relatedTarget: button });
  assert.equal(button.getAttribute("hidden"), null);
  harness.dispatchDocument("mouseout", { target: figure, relatedTarget: harness.body });
  assert.notEqual(button.getAttribute("hidden"), null);
});

test("T32: Edit figure opens the block editor and, once the source arrives, the form", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  harness.editModeButton.dispatch("click");
  const figure = hoverFigure(harness);
  editFigureButton(harness)!.dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  const open = harness.messages.at(-1)!;
  assert.equal(open.type, "previewEditOpen");
  assert.equal(open.line, 20);
  assert.equal(figure.getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(figurePanelOf(harness), undefined, "nothing before the source arrives");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: open.editId,
    originalText: figureSource + "\n",
  });
  assert.ok(figurePanelOf(harness), "the form opens with the editor");
  assert.equal(figureField(harness, "source").value, "images/chip.png");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-069
// T34: the colour picker and the colour-code swatch in the real page script.
test("T34: the code swatch appears and disappears as the caret moves into and out of a colour code", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Use #c00 or plain text";
  textarea.setSelectionRange(0, 0);
  textarea.dispatch("keyup", { key: "Home" });
  const swatch = paletteButton(harness, "colorCode");
  assert.equal(swatch.getAttribute("hidden"), "true");
  textarea.setSelectionRange(6, 6);
  textarea.dispatch("keyup", { key: "ArrowRight" });
  assert.equal(swatch.getAttribute("hidden"), null, "caret inside #c00");
  textarea.setSelectionRange(15, 15);
  textarea.dispatch("mouseup");
  assert.equal(swatch.getAttribute("hidden"), "true", "caret in plain text");
  textarea.value = "Use #c00 or #00f";
  textarea.setSelectionRange(16, 16);
  textarea.dispatch("input");
  assert.equal(swatch.getAttribute("hidden"), null, "typing next to a code shows it");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-039
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-058
test("T34: the picker edits the text box as one undo step and keeps the editor open", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  const count = harness.messages.length;
  paletteButton(harness, "color").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.equal(menu.getAttribute("data-edit-popover"), "color");
  const swatches = allDescendants(menu).filter((e) => e.getAttribute("data-color-swatch") !== null);
  assert.equal(swatches.length, 16);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  swatches[0].dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, `say <span style="color:${swatches[0].getAttribute("data-color-swatch")}">foo</span> now`);
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.messages.length, count, "no commit");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "foo", "the text stays selected");
});

test("T34: the hex field takes the focus without saving, and the code swatch replaces a code in place", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "Use #c00 here";
  textarea.setSelectionRange(6, 6);
  textarea.dispatch("keyup");
  paletteButton(harness, "colorCode").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const field = allDescendants(menu).find((e) => e.getAttribute("data-color-hex") !== null)!;
  assert.equal(field.value, "#c00");
  textarea.dispatch("blur", { relatedTarget: field });
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false,
    "focus moved inside the frame");
  field.value = "#00ff88";
  field.dispatch("input");
  field.dispatch("keydown", { key: "Enter", preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, "Use #00ff88 here");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

// T35: the inline palette group merged into the table cell bar.
function cellBar(harness: RuntimeHarness): RuntimeElement {
  const bar = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(bar, "the table bar exists");
  return bar;
}

/** The wrapper that holds the rule and the inline group: they wrap together. */
function cellGroupWrapper(harness: RuntimeHarness): RuntimeElement | undefined {
  // The fake DOM keeps the wrappers of earlier renders in the bar: the one that holds the group is
  // the current one.
  return cellBar(harness).childElements.filter((child) =>
    child.className === "sphinx-preview-table-menu-cell-group")
    .find((wrapper) => wrapper.childElements.some((child) => child.getAttribute("data-sphinx-edit-palette") === "cell"));
}

function cellGroup(harness: RuntimeHarness): RuntimeElement | undefined {
  return cellGroupWrapper(harness)?.childElements.find((child) =>
    child.getAttribute("data-sphinx-edit-palette") === "cell");
}

function openCellEditorWithPalette(platform?: string) {
  // The inline group was written for a workspace that stored the MyST palette mode.
  const harness = createRuntimeHarness(platform === undefined ? { initialPaletteMode: "myst" } : { platform, initialPaletteMode: "myst" });
  const opened = openTableCellEditorForTab(harness);
  const control = opened.input();
  const calls = stubExecCommand(harness, control);
  return { harness, ...opened, control, calls };
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-085
test("T35: the cell bar keeps the table operations and adds the inline group after a separator", () => {
  const { harness } = openCellEditorWithPalette();
  const bar = cellBar(harness);
  assert.deepEqual(
    bar.childElements.filter((child) => child.tagName === "BUTTON")
      .map((button) => button.getAttribute("data-sphinx-table-operation")),
    ["Insert row before selected row", "Insert row after selected row", "Delete selected row",
      "Insert column before selected column", "Insert column after selected column",
      "Delete selected column", "Convert to list-table"],
  );
  const group = cellGroup(harness);
  assert.ok(group, "the inline group is inside the table bar");
  const wrapper = cellGroupWrapper(harness)!;
  const separator = wrapper.childElements.find((child) => child.getAttribute("role") === "separator");
  assert.ok(separator, "a separator inside the wrapper of the group, so it wraps with the group");
  assert.equal(wrapper.childElements.indexOf(separator) + 1, wrapper.childElements.indexOf(group));
  assert.equal(bar.childElements.some((child) => child.getAttribute("role") === "separator"), false);
  assert.equal(group.childElements.some((child) => child.tagName === "SELECT"), false, "no mode select");
  const ids = group.childElements.map((child) => child.getAttribute("data-edit-action"));
  for (const id of ["bold", "italic", "strikethrough", "link", "emoji", "color", "kbd", "sub", "sup"]) {
    assert.ok(ids.includes(id), id);
  }
  for (const id of ["heading", "quote", "rule", "table", "image", "codeFence", "alert", "todo", "details"]) {
    assert.equal(ids.includes(id), false, "block action " + id + " is not in a cell");
  }
  assert.equal(paletteOf(harness), undefined, "no separate palette bar");
});

test("T35: every inline cell button keeps the focus in the cell on mousedown", () => {
  const { harness } = openCellEditorWithPalette();
  const controls = cellGroup(harness)!.childElements.filter((child) =>
    child.getAttribute("data-edit-action") !== null);
  assert.ok(controls.length >= 9);
  for (const control of controls) {
    let prevented = false;
    control.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, String(control.getAttribute("data-edit-action")));
  }
});

test("T35: Bold in a cell is one native edit, keeps the cell open and Enter still saves it", () => {
  const { harness, control, calls } = openCellEditorWithPalette();
  control.value = "say foo now";
  control.setSelectionRange(4, 7);
  const count = harness.messages.length;
  paletteButton(harness, "bold").dispatch("click", { preventDefault: () => undefined });
  assert.equal(control.value, "say **foo** now");
  assert.equal(calls.length, 1);
  assert.equal(harness.messages.length, count, "no commit");
  typeKey(control, "Enter");
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.match(String(save?.editedText), /\| say \*\*foo\*\* now \| y \|/u);
});

test("T35: the bold shortcut works in a cell and stays out of the browser", () => {
  const { control } = openCellEditorWithPalette();
  control.value = "foo";
  control.setSelectionRange(0, 3);
  let stopped = false;
  control.dispatch("keydown", {
    key: "b", code: "KeyB", ctrlKey: true,
    preventDefault: () => undefined, stopPropagation: () => { stopped = true; },
  });
  assert.equal(control.value, "**foo**");
  assert.equal(stopped, true);
});

test("T35: block-only shortcuts do nothing in a cell", () => {
  const { control } = openCellEditorWithPalette();
  control.value = "foo";
  control.setSelectionRange(0, 3);
  control.dispatch("keydown", {
    key: "/", code: "Slash", ctrlKey: true, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.equal(control.value, "foo", "the comment toggle is a block action");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-091
test("T35: link text and URL with a pipe are escaped and newlines become spaces in a cell", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "see a|b";
  control.setSelectionRange(4, 7);
  control.dispatch("keydown", {
    key: "k", code: "KeyK", ctrlKey: true,
    preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.ok(linkPanelOf(harness), "the link panel opens from the cell");
  assert.equal(linkField(harness, "text").value, "a|b");
  linkField(harness, "text").value = "a|b\nc";
  linkField(harness, "url").value = "https://x.org/?a|b";
  linkField(harness, "url").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(control.value, "see [a\\|b c](https://x.org/?a\\|b)");
  assert.equal(control.selectionStart, control.value.length, "caret after the link");
  assert.equal(linkPanelOf(harness), undefined);
});

test("T35: already escaped pipes stay single and a colour span has no pipe to break", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "x a\\|b y";
  control.setSelectionRange(2, 6);
  paletteButton(harness, "bold").dispatch("click", { preventDefault: () => undefined });
  assert.equal(control.value, "x **a\\|b** y");
  control.value = "foo";
  control.setSelectionRange(0, 3);
  paletteButton(harness, "color").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const swatch = allDescendants(menu).find((e) => e.getAttribute("data-color-swatch") !== null)!;
  swatch.dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.match(control.value, /^<span style="color:#[0-9a-f]+">foo<\/span>$/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-018
test("T35: a popover opened from the cell bar keeps the editor open, outside focus still commits", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "foo";
  control.dispatch("input");
  control.setSelectionRange(0, 3);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.ok(menu, "the emoji picker opens");
  assert.equal(cellBar(harness).childElements.includes(cellGroupWrapper(harness)!), true);
  const filter = allDescendants(menu).find((e) => e.tagName === "INPUT")!;
  const doc = harness.document as unknown as { activeElement?: unknown };
  doc.activeElement = filter;
  control.dispatch("blur", { relatedTarget: filter });
  harness.flushTimers();
  assert.equal(harness.messages.some((m) => m.final === true), false, "focus moved into the bar");
  doc.activeElement = undefined;
  filter.dispatch("blur", { relatedTarget: null });
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, true, "focus left to nowhere: the cell commits");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-089
test("T35: the link panel opened from the cell keeps the editor open and clicking outside commits", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "foo";
  control.dispatch("input");
  control.setSelectionRange(0, 3);
  paletteButton(harness, "link").dispatch("click", { preventDefault: () => undefined });
  const panel = linkPanelOf(harness)!;
  assert.ok(panel);
  const doc = harness.document as unknown as { activeElement?: unknown };
  doc.activeElement = linkField(harness, "url");
  control.dispatch("blur", { relatedTarget: linkField(harness, "url") });
  harness.flushTimers();
  assert.equal(harness.messages.some((m) => m.final === true), false);
  doc.activeElement = undefined;
  linkField(harness, "url").dispatch("blur", { relatedTarget: null });
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, true);
});

test("T35: table operations keep the inline group in the rebuilt bar", () => {
  const { harness } = openCellEditorWithPalette();
  const group = cellGroup(harness)!;
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Insert row after selected row").at(-1)?.dispatch("click");
  // The fake DOM does not empty a parent on `textContent = ""`, so check identity, not counts.
  assert.equal(cellGroup(harness), group, "the same group is moved into the rebuilt bar");
  assert.equal(group.parentElement?.parentElement, cellBar(harness));
  assert.equal(group.removed, false);
});

test("T35: the cell group leaves with the editor", () => {
  const { harness, control } = openCellEditorWithPalette();
  const group = cellGroup(harness)!;
  control.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(group.removed || group.parentElement === undefined || cellBar(harness).removed === true, true);
});

function pasteEvent(items: Array<Record<string, unknown>>, text = "") {
  let prevented = false;
  return {
    event: {
      clipboardData: { getData: (type: string) => (type === "text/plain" ? text : ""), items },
      preventDefault: () => { prevented = true; },
    },
    wasPrevented: () => prevented,
  };
}

function imageItem(type = "image/png", size = 8): Record<string, unknown> {
  const file = { type, size, dataUrl: "data:" + type + ";base64,aGVsbG8=" };
  return { kind: "file", type, getAsFile: () => file };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-203
test("T38: pasting an image posts it to the host with the selection remembered", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See  here";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  const paste = pasteEvent([imageItem()]);
  textarea.dispatch("paste", paste.event);
  assert.equal(paste.wasPrevented(), true);
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPasteImage");
  assert.equal(request.mime, "image/png");
  assert.equal(request.dataBase64, "aGVsbG8=");
  assert.equal(typeof request.editId, "string");
  const status = harness.createdElements.find((element) => element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.equal(status?.textContent, "Saving image…");
  harness.dispatchMessage({ type: "previewPasteImageResult", editId: request.editId, ok: true, fileName: "image.png" });
  // CR 050: the image is a paragraph of its own; the spaces around the caret go with the breaks.
  assert.equal(textarea.value, "See\n\n![image.png](image.png)\n\nhere");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "image.png");
});

test("T38: text on the clipboard wins over an image, and other items are ignored", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  const both = pasteEvent([imageItem()], "some text");
  textarea.dispatch("paste", both.event);
  assert.equal(both.wasPrevented(), false, "the native text paste stays");
  const svg = pasteEvent([imageItem("image/svg+xml")]);
  textarea.dispatch("paste", svg.event);
  assert.equal(svg.wasPrevented(), false, "SVG is not an allowed type");
  const none = pasteEvent([]);
  textarea.dispatch("paste", none.event);
  assert.equal(none.wasPrevented(), false);
  assert.equal(harness.messages.length, before, "nothing was posted");
});

test("T38: an image over 10 MB is refused in the editor without a message to the host", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  const paste = pasteEvent([imageItem("image/png", 10 * 1024 * 1024 + 1)]);
  textarea.dispatch("paste", paste.event);
  assert.equal(paste.wasPrevented(), true);
  assert.equal(harness.messages.length, before);
  const status = harness.createdElements.find((element) => element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.match(String(status?.textContent), /larger than 10 MB/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090
test("T38: a reply for another edit is ignored and a refusal shows its reason", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See ";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  textarea.dispatch("paste", pasteEvent([imageItem()]).event);
  const request = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPasteImageResult", editId: "other-edit", ok: true, fileName: "image.png" });
  assert.equal(textarea.value, "See ");
  harness.dispatchMessage({ type: "previewPasteImageResult", editId: request.editId, ok: false, reason: "Save the document before pasting an image." });
  assert.equal(textarea.value, "See ");
  const status = harness.createdElements.find((element) => element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.equal(status?.textContent, "Save the document before pasting an image.");
});

function htmlPasteEvent(html: string, text = "") {
  let prevented = false;
  return {
    event: {
      clipboardData: {
        getData: (type: string) => (type === "text/html" ? html : type === "text/plain" ? text : ""),
        items: [],
      },
      preventDefault: () => { prevented = true; },
    },
    wasPrevented: () => prevented,
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-213
test("T1: pasting rich text asks the host for Markdown and inserts the answer over the selection", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See  here";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  const paste = htmlPasteEvent("<b>bold</b>", "bold");
  textarea.dispatch("paste", paste.event);
  assert.equal(paste.wasPrevented(), true);
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPasteHtml");
  assert.equal(request.html, "<b>bold</b>");
  assert.equal(textarea.value, "See  here", "nothing is inserted before the answer");
  harness.dispatchMessage({ type: "previewPasteHtmlResult", editId: request.editId, ok: true, markdown: "**bold**" });
  assert.equal(textarea.value, "See **bold** here");
  assert.equal(textarea.selectionStart, 12);
  assert.equal(textarea.selectionEnd, 12);
});

test("T1: a failed or empty conversion inserts the plain text of the clipboard", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "A: ";
  textarea.selectionStart = 3;
  textarea.selectionEnd = 3;
  textarea.dispatch("paste", htmlPasteEvent("<b>x</b>", "plain x").event);
  harness.dispatchMessage({ type: "previewPasteHtmlResult", editId: harness.messages.at(-1)!.editId, ok: false, reason: "boom" });
  assert.equal(textarea.value, "A: plain x");
});

test("T1: Cmd+Shift+V, an image paste and a clipboard without HTML stay untouched", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "v", shiftKey: true, metaKey: true });
  const plain = htmlPasteEvent("<b>bold</b>", "bold");
  textarea.dispatch("paste", plain.event);
  assert.equal(plain.wasPrevented(), false, "paste as plain text stays native");
  const next = htmlPasteEvent("<b>bold</b>", "bold");
  textarea.dispatch("paste", next.event);
  assert.equal(next.wasPrevented(), true, "the next ordinary paste is converted again");
  const before2 = harness.messages.length;
  const noHtml = htmlPasteEvent("", "text only");
  textarea.dispatch("paste", noHtml.event);
  assert.equal(noHtml.wasPrevented(), false);
  assert.equal(harness.messages.length, before2);
  assert.equal(before2, before + 1);
  const image = pasteEvent([imageItem()]);
  textarea.dispatch("paste", image.event);
  assert.equal(harness.messages.at(-1)!.type, "previewPasteImage");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: a pasted URL makes a link over a selection, an autolink alone and an image for a picture", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "See the docs here";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 12;
  const link = htmlPasteEvent("", "https://example.com/docs");
  textarea.dispatch("paste", link.event);
  assert.equal(link.wasPrevented(), true);
  assert.equal(textarea.value, "See [the docs](https://example.com/docs) here");
  assert.equal(textarea.selectionStart, textarea.selectionEnd);
  assert.equal(textarea.selectionStart, 4 + "[the docs](https://example.com/docs)".length);
  textarea.value = "A  B";
  textarea.selectionStart = 2;
  textarea.selectionEnd = 2;
  textarea.dispatch("paste", htmlPasteEvent("", "https://example.com/").event);
  assert.equal(textarea.value, "A <https://example.com/> B");
  textarea.value = "";
  textarea.selectionStart = 0;
  textarea.selectionEnd = 0;
  textarea.dispatch("paste", htmlPasteEvent("", "https://example.com/logo.svg").event);
  assert.equal(textarea.value, "![](https://example.com/logo.svg)");
  assert.equal(harness.messages.length, before, "no host request: the conversion is local");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: Ctrl+Shift+V, other schemes, other text and rich text keep their own paste", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "word";
  textarea.selectionStart = 0;
  textarea.selectionEnd = 4;
  textarea.dispatch("keydown", { key: "v", shiftKey: true, ctrlKey: true });
  const raw = htmlPasteEvent("", "https://example.com/");
  textarea.dispatch("paste", raw.event);
  assert.equal(raw.wasPrevented(), false, "paste as plain text stays native");
  for (const text of ["javascript:alert(1)", "two words", "ftp://x.org/a"]) {
    const other = htmlPasteEvent("", text);
    textarea.dispatch("paste", other.event);
    assert.equal(other.wasPrevented(), false, text);
  }
  assert.equal(textarea.value, "word");
  const rich = htmlPasteEvent("<a href='https://example.com/'>x</a>", "https://example.com/");
  textarea.dispatch("paste", rich.event);
  assert.equal(harness.messages.at(-1)!.type, "previewPasteHtml", "rich text still goes to the host");
});
