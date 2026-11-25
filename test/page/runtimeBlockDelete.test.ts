import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  findButton,
  insertPointAfterLine,
  insertPointsOf,
  moveButton,
  MOVE_IDENTIFIERS,
  openBlockEditorWithSource,
  patchMessage,
  plainClick,
} from "./runtimeTestSupport";

/**
 * Delete block (CR-439): the button of the bar, Delete and Backspace on a block selection, the
 * selection after the delete, and the final save of an erased editor (features/blockMoves.ts,
 * blockSelectionView.ts, blockEditor.ts, modules/deleteBlockButton.ts).
 */

const SELECTED = "data-sphinx-preview-block-selected";

function selectedLines(harness: RuntimeHarness): number[] {
  return harness.mappings
    .filter((block) => block.getAttribute(SELECTED) !== null)
    .map((block) => Number(block.getAttribute("data-sphinx-source-line")));
}

function shiftClick(harness: RuntimeHarness, block: RuntimeElement): void {
  harness.dispatchDocument("click", {
    target: block, shiftKey: true, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
}

const key = (name: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  key: name, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra,
});

function deleteButton(harness: RuntimeHarness, afterLine: number): RuntimeElement | undefined {
  return insertPointAfterLine(harness, afterLine).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-delete"));
}

const deletes = (harness: RuntimeHarness, from = 0): Array<Record<string, unknown>> =>
  harness.messages.slice(from).filter((message) => message.type === "previewBlocksDelete");

const finalSaves = (harness: RuntimeHarness): Array<Record<string, unknown>> =>
  harness.messages.filter((message) => message.type === "previewEditSave" && message.final === true);

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("every body bar holds a Delete block button right after the down arrow", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  for (const line of [1, 52, 100]) {
    const button = deleteButton(harness, line);
    assert.ok(button, `a Delete block button after line ${line}`);
    assert.equal(button.tagName, "BUTTON");
    assert.equal(button.getAttribute("type"), "button");
    assert.equal(button.getAttribute("aria-label"), "Delete block");
    assert.equal(button.getAttribute("title"), "Delete block");
    assert.equal(button.textContent, "×");
    const children = insertPointAfterLine(harness, line).childElements;
    assert.equal(children.indexOf(button), children.indexOf(moveButton(harness, line, "down")) + 1);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
test("the properties bar and the Start writing bar have no Delete block button", () => {
  const withProperties = createRuntimeHarness({
    mapFrontmatter: true, propertiesMapped: true, savedState: { editMode: true },
  });
  const empty = createRuntimeHarness({ savedState: { editMode: true }, emptyBody: true });
  for (const harness of [withProperties, empty]) {
    const withDelete = insertPointsOf(harness).filter((point) => point.childElements.some((element) =>
      element.className.split(" ").includes("sphinx-preview-delete")));
    for (const point of withDelete) {
      assert.notEqual(point.getAttribute("data-sphinx-insert-after-line"), "0");
      assert.equal(point.className.includes("--start"), false);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-127#S6
test("the bar of an included block has no Delete block button", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.mappings[1]!.setAttribute("data-sphinx-preview-included", "true");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  const has = (line: number): boolean => deleteButton(harness, line) !== undefined;
  assert.equal(has(1), true);
  assert.equal(has(52), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
test("a click on the button posts previewBlocksDelete for the block above the bar", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = 0;
  deleteButton(harness, 52)!.dispatch("click", { ...plainClick(), preventDefault: () => { prevented += 1; } });
  const sent = deletes(harness, before);
  assert.equal(sent.length, 1);
  assert.deepEqual([sent[0]!.line, sent[0]!.endLine], [50, 52]);
  assert.equal(typeof sent[0]!.pinViewportTop, "number");
  assert.equal(prevented, 1);
  // A second click waits for the answer.
  deleteButton(harness, 52)!.dispatch("click", plainClick());
  assert.equal(deletes(harness, before).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("the button of the last block of a selection deletes the whole selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]!);
  shiftClick(harness, harness.mappings[1]!);
  const before = harness.messages.length;
  deleteButton(harness, 52)!.dispatch("click", plainClick());
  assert.deepEqual(deletes(harness, before).map((message) => [message.line, message.endLine]), [[1, 52]]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S5
test("the button does nothing while a block editor is open", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 52).childElements[0]!.dispatch("click", plainClick());
  const before = harness.messages.length;
  deleteButton(harness, 52)!.dispatch("click", plainClick());
  assert.equal(deletes(harness, before).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("Delete and Backspace on a block selection post the delete of its lines", () => {
  for (const name of ["Delete", "Backspace"]) {
    const harness = createRuntimeHarness({ savedState: { editMode: true } });
    shiftClick(harness, harness.mappings[1]!);
    const before = harness.messages.length;
    let prevented = 0;
    harness.dispatchDocument("keydown", key(name, { target: harness.mappings[1], preventDefault: () => { prevented += 1; } }));
    const sent = deletes(harness, before);
    assert.deepEqual(sent.map((message) => [message.line, message.endLine]), [[50, 52]], name);
    assert.equal(prevented, 1);
    harness.dispatchDocument("keydown", key(name, { target: harness.mappings[1] }));
    assert.equal(deletes(harness, before).length, 1, "a held key sends one request");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("Delete does nothing without a block selection, in a text box, with a chord or outside edit mode", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1] }));
  harness.dispatchDocument("keydown", key("Backspace", { target: moveButton(harness, 52, "down") }));
  assert.equal(deletes(harness, before).length, 0, "a focused block or bar button is not a selection");

  shiftClick(harness, harness.mappings[1]!);
  const textbox = new RuntimeElement({}, harness.windowState, 0, 0, "textarea");
  harness.dispatchDocument("keydown", key("Delete", { target: textbox }));
  assert.equal(deletes(harness, before).length, 0, "a text box keeps the key");
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1], shiftKey: true }));
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1], ctrlKey: true }));
  assert.equal(deletes(harness, before).length, 0, "a chord is not ours");

  const reading = createRuntimeHarness();
  shiftClick(reading, reading.mappings[1]!);
  reading.dispatchDocument("keydown", key("Delete", { target: reading.mappings[1] }));
  assert.equal(deletes(reading).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("a refusal is announced and keeps the selection, and the key works again", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]!);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1] }));
  harness.dispatchMessage({
    type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete", ok: false,
    reason: "A block that comes from an included file cannot be deleted.",
  });
  const status = harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))!;
  assert.equal(status.textContent, "A block that comes from an included file cannot be deleted.");
  assert.deepEqual(selectedLines(harness), [50]);
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1] }));
  assert.equal(deletes(harness, before).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("a delete keeps the selection until the render, which selects the block that took its place", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true }, trackFocus: true });
  shiftClick(harness, harness.mappings[1]!);
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete", ok: true });
  assert.deepEqual(selectedLines(harness), [50], "kept until the render");
  harness.mappings.splice(1, 1);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [100], "the following block");
  assert.equal(harness.document.activeElement, harness.mappings[1]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("deleting the last block selects the block above it", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[2]!);
  harness.dispatchDocument("keydown", key("Backspace", { target: harness.mappings[2] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete", ok: true });
  harness.mappings.splice(2, 1);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [50]);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S3
test("deleting the only block leaves the Start writing button focused", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true }, trackFocus: true });
  shiftClick(harness, harness.mappings[0]!);
  shiftClick(harness, harness.mappings[2]!);
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[2] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete", ok: true });
  harness.mappings.splice(0, harness.mappings.length);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), []);
  const start = insertPointsOf(harness).find((point) => point.className.includes("--start"));
  assert.ok(start, "a Start writing bar");
  assert.equal(harness.document.activeElement, start.childElements.find((element) => element.tagName === "BUTTON"));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
test("the render clears the wait: a second delete after it is not held back", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]!);
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "delete", ok: true });
  harness.mappings.splice(1, 1);
  harness.dispatchMessage(patchMessage());
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1] }));
  assert.equal(deletes(harness, before).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S4
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S5
test("Delete and Backspace post nothing while the structural cursor is on a cell or an inner block", () => {
  const mapped = (harness: RuntimeHarness, line: number, endLine: number, top: number, tag: string): RuntimeElement => {
    const element = new RuntimeElement({
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-end-line": String(endLine),
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": String(line),
    }, harness.windowState, top, 40, tag);
    harness.mappings.push(element);
    return element;
  };
  const press = (harness: RuntimeHarness, name: string): void => {
    const event: Record<string, unknown> = key(name, { stopImmediatePropagation: () => { event.immediatePropagationStopped = true; } });
    harness.dispatchDocument("keydown", event);
  };
  for (const kind of ["admonition", "table"]) {
    for (const name of ["Delete", "Backspace"]) {
      const harness = createRuntimeHarness({ savedState: { editMode: true } });
      const holder = mapped(harness, 60, 65, 600, kind === "table" ? "table" : "div");
      if (kind === "table") {
        const rows = [0, 1].map((rowIndex) => {
          const row = new RuntimeElement({}, harness.windowState, 600 + rowIndex * 30, 30, "tr");
          row.rowIndex = rowIndex;
          holder.appendChild(row);
          row.cells = [0, 1].map((cellIndex) => {
            const cell = new RuntimeElement({}, harness.windowState, row.top, 30, rowIndex === 0 ? "th" : "td");
            cell.cellIndex = cellIndex;
            row.appendChild(cell);
            return cell;
          });
          return row;
        });
        holder.rows = rows;
      } else {
        holder.appendChild(mapped(harness, 61, 61, 610, "p"));
      }
      for (let step = 0; step < 10 && !selectedLines(harness).includes(60); step += 1) press(harness, "ArrowDown");
      assert.deepEqual(selectedLines(harness), [60]);
      press(harness, "ArrowRight");
      if (kind === "table") press(harness, "ArrowRight");
      const before = harness.messages.length;
      press(harness, name);
      assert.equal(deletes(harness, before).length, 0, kind + ": " + name + " below the top level");
      press(harness, "Escape");
      assert.deepEqual(selectedLines(harness), [60], "back on the top-level block");
      press(harness, name);
      assert.equal(deletes(harness, before).length, 1, kind + ": " + name + " at the top level");
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
test("Delete with a bar button focused, or while a block editor is open, posts nothing", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]!);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", key("Delete", { target: moveButton(harness, 52, "down") }));
  harness.dispatchDocument("keydown", key("Backspace", { target: deleteButton(harness, 52) }));
  assert.equal(deletes(harness, before).length, 0, "a focused bar button");
  insertPointAfterLine(harness, 100).childElements[0]!.dispatch("click", plainClick());
  assert.ok(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), "an editor opened");
  assert.deepEqual(selectedLines(harness), [50], "the selection is still there");
  harness.dispatchDocument("keydown", key("Delete", { target: harness.mappings[1] }));
  assert.equal(deletes(harness, before).length, 0, "an open editor");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S3
test("the final save of an erased top-level editor carries deleteWhenEmpty, an autosave never does", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "";
  textarea.dispatch("input");
  harness.flushTimers();
  const autosave = harness.messages.filter((message) => message.type === "previewEditSave").at(-1);
  assert.equal(autosave?.final, false);
  assert.equal("deleteWhenEmpty" in autosave!, false);
  findButton(harness, "Done editing").dispatch("click", plainClick());
  const final = finalSaves(harness).at(-1);
  assert.ok(final);
  assert.equal(final.deleteWhenEmpty, true);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S2
test("a final save of text that is not empty carries no deleteWhenEmpty", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Changed";
  textarea.dispatch("input");
  findButton(harness, "Done editing").dispatch("click", plainClick());
  const final = finalSaves(harness).at(-1);
  assert.ok(final);
  assert.equal("deleteWhenEmpty" in final, false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-264#S2
test("an erased list item editor carries deleteWhenEmpty, a block inside an admonition does not", () => {
  const MAPPED = { "data-sphinx-preview-document": "file:///active.md", "data-sphinx-source-file": "/workspace/active.md" };
  for (const [name, wrapper] of [["list", undefined], ["admonition", "aside"]] as const) {
    const harness = createRuntimeHarness({ savedState: { editMode: true } });
    const holder = wrapper === undefined ? undefined : new RuntimeElement({
      ...MAPPED, class: "admonition note", "data-sphinx-source-line": "20", "data-sphinx-source-end-line": "22",
    }, harness.windowState, 180, 60, wrapper);
    const list = new RuntimeElement({
      ...MAPPED, "data-sphinx-source-line": "30", "data-sphinx-source-end-line": "31",
    }, harness.windowState, 200, 40, "ul");
    const item = new RuntimeElement({
      ...MAPPED, "data-sphinx-source-line": "30", "data-sphinx-source-end-line": "30",
    }, harness.windowState, 200, 20, "li");
    list.appendChild(item);
    holder?.appendChild(list);
    harness.contentLists.push(holder ?? list);
    harness.mappings.push(...(holder ? [holder] : []), list, item);
    harness.dispatchDocument("click", { target: item, preventDefault: () => undefined });
    const open = harness.messages.filter((message) => message.type === "previewEditOpen").at(-1);
    assert.ok(open, name);
    harness.dispatchMessage({
      type: "previewEditSource", ...MOVE_IDENTIFIERS, editId: open.editId, originalText: "- a\n",
    });
    const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
    textarea.value = "";
    textarea.dispatch("input");
    findButton(harness, "Done editing").dispatch("click", plainClick());
    const final = finalSaves(harness).at(-1);
    assert.ok(final, name);
    assert.equal(final.deleteWhenEmpty === true, name === "list", name);
  }
});
