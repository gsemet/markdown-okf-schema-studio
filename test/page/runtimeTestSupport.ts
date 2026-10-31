import * as assert from "node:assert/strict";

import type { SourceBlockMapping } from "../../src/core/mapping/sourceMapping";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";

/**
 * Helpers shared by the page runtime tests (`runtime*.test.ts`): fixtures, openers of the editors
 * and readers of what the page posted. Each test builds its own page with `createRuntimeHarness`.
 */

/** A mapped source block with its measured position in the page. */
export interface PositionedSourceMapping extends SourceBlockMapping {
  top: number;
  height: number;
}

/** A mapped block of the active document at `sourceLine`, measured `top` pixels down the page. */
export function mapping(sourceLine: number, top: number): PositionedSourceMapping {
  return {
    element: { getAttribute: () => null },
    blockId: `block-${sourceLine}`,
    sourceFile: "/workspace/active.md",
    sourceLine,
    documentId: "file:///active.md",
    domOrder: sourceLine,
    top,
    height: 40,
  };
}

// Edit mode also inserts zero-height insertion points after blocks; the editor is the inserted
// element that carries the block-editor attribute.
export function blockEditorOf(block: RuntimeElement): RuntimeElement {
  return block.insertedElements.find((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") !== null) as RuntimeElement;
}

/**
 * Turns edit mode on, opens the editor of the second block with two raw lines and returns its text
 * box.
 */
export function openRawEditor(harness: RuntimeHarness): RuntimeElement {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Raw line one\nRaw line two\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return textarea;
}

/** The created button with this `aria-label` (fails the test when there is none). */
export function findButton(harness: RuntimeHarness, label: string): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.getAttribute("aria-label") === label);
  assert.ok(button, "missing button " + label);
  return button;
}

/**
 * Builds a table of three rows and two columns, opens the editor of its first body cell and returns
 * the cells, a click on a cell and the open cell input.
 */
export function openTableCellEditorForTab(
  harness: ReturnType<typeof createRuntimeHarness>,
  options: {
    mapped?: boolean;
    /** The cell clicked to open the editor, [rendered row, column]; the first body cell by default. */
    start?: [number, number];
    /** Runs after the click and before the source reply, which opens the editor. */
    beforeSource?: (table: RuntimeElement, cells: RuntimeElement[][]) => void;
  } = {},
  originalText = "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
) {
  const table = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const rows: RuntimeElement[] = [];
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    rows.push(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      row.cells.push(cell);
      return cell;
    });
  });
  table.rows = rows;
  if (options.mapped) harness.mappings.push(table);
  harness.editModeButton.dispatch("click");
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
  });
  const [startRow, startColumn] = options.start ?? [1, 0];
  click(cells[startRow][startColumn]);
  options.beforeSource?.(table, cells);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText,
  });
  const input = (): RuntimeElement => {
    const control = harness.createdElements.filter((element) =>
      element.getAttribute("aria-label") === "Markdown table cell").at(-1);
    assert.ok(control);
    return control;
  };
  return { cells, click, input };
}

/** The text input of the open table cell editor. */
export function cellEditorOf(harness: ReturnType<typeof createRuntimeHarness>): RuntimeElement {
  const editor = harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true").at(-1);
  assert.ok(editor);
  return editor;
}

/** Opens the block editor of the second block with its source and returns the text box. */
export function openBlockEditorWithSource(harness: ReturnType<typeof createRuntimeHarness>) {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Second paragraph.\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return textarea;
}

/** Builds a table, opens the editor of one of its cells and returns the cell input. */
export function openTableCellEditor(harness: ReturnType<typeof createRuntimeHarness>) {
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n",
  });
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  return input;
}

/** A page whose frontmatter row holds the text `value`, with that field's editor open. */
export function openTextFieldEditor(value: string): {
  harness: ReturnType<typeof createRuntimeHarness>;
  textarea: ReturnType<typeof createRuntimeHarness>["createdElements"][number];
} {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify(value));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", `${value}\n`);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return { harness, textarea };
}

/** The frontmatter saves the page posted. */
export function frontmatterSaves(harness: ReturnType<typeof createRuntimeHarness>): Array<Record<string, unknown>> {
  return harness.messages.filter((message) => message.type === "previewFrontmatterSave");
}

/** Adds an okf link to the frontmatter value display and returns it. */
export function addOkfLink(harness: RuntimeHarness): RuntimeElement {
  const link = new RuntimeElement(
    { "data-sphinx-preview-navigation": "okf-link:abc", class: "okf-frontmatter-link" },
    harness.windowState, 0, 20, "a");
  harness.frontmatterValueDisplay.appendChild(link);
  return link;
}

/** A click event on `target` that records `stopImmediatePropagation`. */
export function t21ClickEvent(target: RuntimeElement, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const event: Record<string, unknown> = {
    target,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    stopImmediatePropagation: () => { event.immediatePropagationStopped = true; },
    ...extra,
  };
  return event;
}

/** Does nothing. */
export const noop = (): void => undefined;

/** Turns edit mode on and opens the editor of the frontmatter value cell. */
export function openFrontmatterValueEditor(harness: ReturnType<typeof createRuntimeHarness>): void {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
}

// T28: block insertion points.
export const INSERT_POINT_CLASS = "sphinx-preview-insert-point";

/** The insertion points currently in the page. */
export function insertPointsOf(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.className.split(" ").includes(INSERT_POINT_CLASS) && !element.removed);
}

/** The insertion point after source line `line` (fails the test when there is none). */
export function insertPointAfterLine(harness: RuntimeHarness, line: number): RuntimeElement {
  const point = insertPointsOf(harness).find((element) =>
    element.getAttribute("data-sphinx-insert-after-line") === String(line));
  assert.ok(point, `an insertion point after line ${line}`);
  return point;
}

/** Answers the last edit request with the block source `originalText`. */
export function sourceReply(harness: RuntimeHarness, originalText: string, extra: Record<string, unknown> = {}) {
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText,
    ...extra,
  });
}

/** The up or down move button of the insertion point after `afterLine`. */
export function moveButton(harness: RuntimeHarness, afterLine: number, direction: "up" | "down"): RuntimeElement {
  const button = insertPointAfterLine(harness, afterLine).childElements.find((element) =>
    element.getAttribute("data-sphinx-move") === direction);
  assert.ok(button, `a ${direction} button after line ${afterLine}`);
  return button;
}

/** A click event without modifiers. */
export const plainClick = () => ({ preventDefault: () => undefined, stopPropagation: () => undefined });

// T37: Alt+Up/Down moves the focused block; Cmd/Ctrl+Alt+Up/Down moves it from the text box.
export const MOVE_IDENTIFIERS = { documentId: "file:///active.md", revision: 7, requestId: 11 };

/** The block moves the page posted, from message `from` on. */
export function moveMessages(harness: RuntimeHarness, from = 0): Array<Record<string, unknown>> {
  return harness.messages.slice(from).filter((message) => message.type === "previewBlockMove");
}

/** A keydown event of `key` with Alt held. */
export function altKey(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { key, altKey: true, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra };
}

/** Opens the editor of the second block with the source `original` and returns its text box. */
export function openMoveTextarea(harness: RuntimeHarness, original: string): RuntimeElement {
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource", ...MOVE_IDENTIFIERS, editId: harness.messages.at(-1)?.editId, originalText: original,
  });
  return harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
}

/** A `previewPendingOverlay` message for the loaded page. */
export function overlayMessage(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "previewPendingOverlay",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    visible: true,
    label: "Preview pending",
    message: "Rendering the active buffer.",
    ...extra,
  };
}

/** The pending overlays in the page. */
export function pendingOverlays(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-pending-overlay") !== null && !element.removed);
}

/** A `previewPropertiesTable` message for the loaded page. */
export function propertiesMessage(markup: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "previewPropertiesTable",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    markup,
    ...extra,
  };
}

/** The markup of a properties section with one value cell. */
export function cellMarkup(label: string): string {
  return '<section data-okf-properties><td data-okf-edit-cell="value">' + label + "</td></section>";
}

// T34: the host replaces the content of the loaded page with a message instead of loading a new
// document. The page keeps its runtime; the identifiers move to the new render.
export function patchMessage(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "previewContentPatch",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    next: { revision: 8, requestId: 12 },
    contentHtml: "<p>fresh</p>",
    status: "success",
    label: "Preview ready",
    diagnostics: [],
    ...extra,
  };
}

/** The identifiers of the render that {@link patchMessage} moves to. */
export const NEXT_IDENTIFIERS = { documentId: "file:///active.md", revision: 8, requestId: 12 };

/** The messages the page posted after the first `count` ones. */
export function messagesAfter(harness: RuntimeHarness, count: number): Array<Record<string, unknown>> {
  return harness.messages.slice(count);
}

/** One `document.execCommand` call recorded by {@link stubExecCommand}. */
export type ExecCall = { command: string; text?: string };

/** Emulates the browser's insertText/delete on the textarea in focus, recording the calls. */
export function stubExecCommand(harness: ReturnType<typeof createRuntimeHarness>, control: RuntimeElement): ExecCall[] {
  const calls: ExecCall[] = [];
  harness.document.execCommand = (command: string, _ui: boolean, text?: string): boolean => {
    calls.push({ command, text });
    const start = control.selectionStart;
    const end = control.selectionEnd;
    const inserted = command === "delete" ? "" : String(text);
    control.value = control.value.slice(0, start) + inserted + control.value.slice(end);
    control.setSelectionRange(start + inserted.length, start + inserted.length);
    control.dispatch("input");
    return true;
  };
  return calls;
}

/** Dispatches a keydown of `key` on `control`; true when the page prevented its default. */
export function typeKey(control: RuntimeElement, key: string, init: Record<string, unknown> = {}): boolean {
  let prevented = false;
  control.dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
  return prevented;
}

// T21: the edition palette above an open block editor.
export const PALETTE_CLASS = "sphinx-preview-edit-palette";

/** The edition palette, when one is open. */
export function paletteOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("class") === PALETTE_CLASS || element.className === PALETTE_CLASS);
}

/** The palette button of the action `id` (fails the test when there is none). */
export function paletteButton(harness: RuntimeHarness, id: string): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.getAttribute("data-edit-action") === id);
  assert.ok(button, "palette button " + id);
  return button;
}

/** The open popover menu of the palette, if any. */
export function paletteMenu(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("role") === "menu" && !element.removed
    && element.parentElement !== undefined);
}

// T22: the link panel opened by the Link button and Cmd/Ctrl+K.
export function linkPanelOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("role") === "dialog" && !element.removed);
}

/** The Text or URL field of the link panel. */
export function linkField(harness: RuntimeHarness, name: "text" | "url"): RuntimeElement {
  const field = harness.createdElements.find((element) =>
    element.tagName === "INPUT" && element.getAttribute("data-link-field") === name);
  assert.ok(field, "link field " + name);
  return field;
}

/** Every element below `element`, depth first. */
export function allDescendants(element: RuntimeElement): RuntimeElement[] {
  return element.childElements.flatMap((child) => [child, ...allDescendants(child)]);
}

/**
 * A MyST page with the editor of the second block open on `source`, the caret at `caret`, and
 * execCommand stubbed.
 */
export function figureHarness(source: string, caret: number) {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: source + "\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  assert.ok(textarea);
  textarea.setSelectionRange(caret, caret);
  const calls = stubExecCommand(harness, textarea);
  return { harness, textarea, calls };
}

/** A keydown event of `key` with Shift held. */
export function shiftKey(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { key, shiftKey: true, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra };
}
