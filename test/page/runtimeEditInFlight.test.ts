import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { findButton, insertPointAfterLine, moveButton, patchMessage, plainClick } from "./runtimeTestSupport";

/**
 * An edit in flight blocks every other edit gesture (CR 475, check 12, save-guard-Q15): a block
 * move, a delete, a paste, a checkbox toggle, a table row drag, a list-item drag and a file drop post
 * nothing, with an editor open and with a detached save. The same gesture posts when no edit is in
 * flight, so each case proves its own setup.
 */

const DONE = "Done editing";
const IDENTITY = { documentId: "file:///active.md", revision: 7, requestId: 11 };
const MAPPED = { "data-sphinx-preview-document": "file:///active.md", "data-sphinx-source-file": "/workspace/active.md" };
const escape = { key: "Escape", preventDefault: () => undefined, stopPropagation: () => undefined };
const noop = (): void => undefined;

/** The page messages of every kind an edit gesture posts. */
const GESTURE_TYPES = [
  "previewBlockMove", "previewBlocksDelete", "previewBlocksPaste", "previewCheckboxToggle", "previewDropFiles",
  "previewEditOpen",
];

interface Page {
  harness: RuntimeHarness;
  table: RuntimeElement[];
  list: RuntimeElement[];
}

function fakeTable(harness: RuntimeHarness): RuntimeElement[] {
  const table = new RuntimeElement({ ...MAPPED, "data-sphinx-source-line": "20", "data-sphinx-source-end-line": "23" },
    harness.windowState, 300, 120, "table");
  const rows: RuntimeElement[] = [];
  for (let index = 0; index <= 3; index += 1) {
    const row = new RuntimeElement({}, harness.windowState, 300 + 30 * index, 30, "tr");
    row.rowIndex = index;
    const cell = new RuntimeElement({}, harness.windowState, 300 + 30 * index, 30, index === 0 ? "th" : "td");
    const second = new RuntimeElement({}, harness.windowState, 300 + 30 * index, 30, index === 0 ? "th" : "td");
    second.cellIndex = 1;
    row.cells = [cell, second];
    row.appendChild(cell);
    row.appendChild(second);
    table.appendChild(row);
    rows.push(row);
  }
  table.rows = rows;
  harness.contentTables.push(table);
  return rows;
}

function fakeList(harness: RuntimeHarness): RuntimeElement[] {
  const list = new RuntimeElement({ ...MAPPED, "data-sphinx-source-line": "40", "data-sphinx-source-end-line": "42" },
    harness.windowState, 500, 60, "ul");
  list.rectProvider = () => ({ top: 500 - harness.windowState.scrollY, height: 60, left: 0, width: 200, bottom: 560 });
  const items: RuntimeElement[] = [];
  for (let index = 0; index < 3; index += 1) {
    const item = new RuntimeElement({
      ...MAPPED, "data-sphinx-source-line": String(40 + index), "data-sphinx-source-end-line": String(40 + index),
    }, harness.windowState, 500 + 20 * index, 20, "li");
    list.appendChild(item);
    items.push(item);
  }
  harness.contentLists.push(list);
  return items;
}

type Setup = "free" | "an editor open" | "a detached save";

function page(setup: Setup): Page {
  const harness = createRuntimeHarness();
  const table = fakeTable(harness);
  const list = fakeList(harness);
  harness.editModeButton.dispatch("click");
  harness.flushFrames();
  if (setup !== "free") {
    harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: noop });
    harness.dispatchMessage({
      type: "previewEditSource", ...IDENTITY, editId: harness.messages.at(-1)?.editId, originalText: "Second paragraph.\n",
    });
    const box = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
    if (setup === "a detached save") {
      box.value = "changed";
      box.dispatch("input");
      findButton(harness, DONE).dispatch("click");
      box.dispatch("keydown", escape);
    }
  }
  return { harness, table, list };
}

const transfer = (): Record<string, unknown> => ({ effectAllowed: "", dropEffect: "", setData: noop });
const rowHandle = (harness: RuntimeHarness): RuntimeElement | undefined => harness.createdElements.find((element) =>
  element.getAttribute("data-okf-row-handle") !== null && !element.parentElement?.removed
  && element.getAttribute("data-okf-row") === "1");
const itemHandle = (harness: RuntimeHarness): RuntimeElement | undefined => harness.createdElements.find((element) =>
  element.getAttribute("data-okf-list-item-handle") !== null && !element.parentElement?.removed
  && element.getAttribute("data-okf-list-item-line") === "40");

const GESTURES: Array<{ name: string; type: string; run: (current: Page) => void }> = [
  { name: "a block move", type: "previewBlockMove", run: ({ harness }) => moveButton(harness, 52, "down").dispatch("click", plainClick()) },
  {
    name: "a delete",
    type: "previewBlocksDelete",
    run: ({ harness }) => insertPointAfterLine(harness, 52).childElements
      .find((element) => element.className.split(" ").includes("sphinx-preview-delete"))?.dispatch("click", plainClick()),
  },
  {
    name: "a paste",
    type: "previewBlocksPaste",
    run: ({ harness }) => harness.dispatchDocument("keydown", {
      key: "v", ctrlKey: true, target: insertPointAfterLine(harness, 52).childElements[0], preventDefault: noop, stopPropagation: noop,
    }),
  },
  {
    name: "a checkbox toggle",
    type: "previewCheckboxToggle",
    run: ({ harness }) => {
      harness.checkbox.checked = true;
      harness.dispatchDocument("click", { target: harness.checkbox, stopImmediatePropagation: noop, preventDefault: noop });
    },
  },
  {
    name: "a table row drag",
    type: "previewEditOpen",
    run: ({ harness, table }) => {
      const data = transfer();
      const handle = rowHandle(harness);
      handle?.dispatch("dragstart", { dataTransfer: data });
      harness.windowState.scrollY = 0;
      const event = { clientY: table[3]!.top + 25, dataTransfer: data, preventDefault: noop, stopPropagation: noop };
      table[3]!.dispatch("dragover", event);
      table[3]!.dispatch("drop", event);
      handle?.dispatch("dragend");
    },
  },
  {
    name: "a list-item drag",
    type: "previewEditOpen",
    run: ({ harness, list }) => {
      const data = transfer();
      const handle = itemHandle(harness);
      handle?.dispatch("dragstart", { dataTransfer: data });
      const at = { clientX: 10, clientY: list[2]!.top + 15, dataTransfer: data, preventDefault: noop, stopPropagation: noop };
      harness.dispatchDocument("dragover", at);
      harness.dispatchDocument("drop", at);
      handle?.dispatch("dragend");
    },
  },
  {
    name: "a file drop",
    type: "previewDropFiles",
    run: ({ harness }) => {
      const data: Record<string, string> = { "text/uri-list": "file:///w/a.md" };
      const event = {
        dataTransfer: { types: Object.keys(data), getData: (format: string) => data[format] ?? "" },
        clientY: insertPointAfterLine(harness, 52).getBoundingClientRect().top + 3,
        relatedTarget: {},
        preventDefault: noop,
      };
      harness.dispatchDocument("dragover", event);
      harness.dispatchDocument("drop", event);
    },
  },
];

for (const gesture of GESTURES) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
  test(`${gesture.name} posts when no edit is in flight and nothing with an editor open or a detached save`, () => {
    const free = page("free");
    const mark = free.harness.messages.length;
    gesture.run(free);
    assert.ok(free.harness.messages.slice(mark).some((message) => message.type === gesture.type),
      `${gesture.name}: the gesture posts ${gesture.type} when nothing is in flight`);
    for (const setup of ["an editor open", "a detached save"] as const) {
      const current = page(setup);
      const before = current.harness.messages.length;
      gesture.run(current);
      const sent = current.harness.messages.slice(before).filter((message) => GESTURE_TYPES.includes(String(message.type)));
      assert.deepEqual(sent.map((message) => message.type), [], `${gesture.name} with ${setup}`);
    }
  });
}

const FIND_COMMAND = { type: "previewFindCommand", ...IDENTITY, command: "open" };
const BLOCKED = "Save or cancel the open edit before replacing.";

function findPart(harness: RuntimeHarness, name: string): RuntimeElement {
  const part = harness.createdElements.find((element) => element.getAttribute(name) !== null);
  assert.ok(part, "missing find bar part " + name);
  return part;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
test("the replace gesture posts and changes nothing with an editor open or a detached save", () => {
  const free = page("free");
  free.harness.dispatchMessage(FIND_COMMAND);
  findPart(free.harness, "data-find-toggle-replace").dispatch("click");
  assert.equal(findPart(free.harness, "data-find-toggle-replace").getAttribute("aria-expanded"), "true",
    "with no edit in flight the replace row opens");
  for (const setup of ["an editor open", "a detached save"] as const) {
    const { harness } = page(setup);
    harness.dispatchMessage(FIND_COMMAND);
    const toggle = findPart(harness, "data-find-toggle-replace");
    const before = harness.messages.length;
    toggle.dispatch("click");
    findPart(harness, "data-find-replace").dispatch("click");
    findPart(harness, "data-find-replace-all").dispatch("click");
    assert.equal(toggle.getAttribute("aria-expanded"), "false", `${setup}: the replace row stays closed`);
    assert.equal(findPart(harness, "data-find-note").textContent, BLOCKED, `${setup}: the note says why`);
    assert.deepEqual(harness.messages.slice(before), [], `${setup}: nothing posted`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a full page replacement leaves no editor and no detached save: the replace gesture works again", () => {
  for (const setup of ["an editor open", "a detached save"] as const) {
    const { harness } = page(setup);
    // A detached save ends with the render its `done` announces (`renderFollows`).
    if (setup === "a detached save") {
      harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId: harness.messages.find((message) => message.type === "previewEditOpen")?.editId, done: true, renderFollows: true });
    }
    harness.dispatchMessage(patchMessage());
    harness.flushFrames();
    harness.dispatchMessage({ ...FIND_COMMAND, ...{ revision: 8, requestId: 12 } });
    const toggle = findPart(harness, "data-find-toggle-replace");
    toggle.dispatch("click");
    assert.equal(toggle.getAttribute("aria-expanded"), "true", `${setup}: nothing in flight after the replacement`);
  }
});
