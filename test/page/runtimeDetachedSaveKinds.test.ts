import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  findButton, insertPointAfterLine, openBlockEditorWithSource, openTableCellEditorForTab, patchMessage, plainClick,
} from "./runtimeTestSupport";

/**
 * A detached save that fails reopens the editor it left, whatever the editor was (CR 475, checks 14
 * to 20): a paragraph, a table cell (the cell left earlier, a Tab-added row), an insertion and a
 * blank-line block. The retry posts the first save again, with the identity of the first.
 */

const DONE = "Done editing";
const IDENTITY = { documentId: "file:///active.md", revision: 7, requestId: 11 };
const TYPED = "new words";
const escape = { key: "Escape", preventDefault: () => undefined };
const enter = { key: "Enter", preventDefault: () => undefined };
const tab = { key: "Tab", preventDefault: () => undefined };

const posts = (harness: RuntimeHarness, type: string, from = 0): Array<Record<string, unknown>> =>
  harness.messages.slice(from).filter((message) => message.type === type);

/** An editor of one kind with its final save posted (M1) and left with Escape. */
interface Scenario {
  harness: RuntimeHarness;
  editId: string;
  /** The final save the editor posted before the Escape. */
  first: Record<string, unknown>;
  /** The control that holds the typed text. */
  control: () => RuntimeElement;
  /** Presses Done in the reopened editor. */
  finish: () => void;
}

type Kind = "paragraph" | "cell" | "cell with a kept cell" | "cell with a Tab-added row" | "insertion" | "blank lines";
const KINDS: Kind[] = ["paragraph", "cell", "cell with a kept cell", "cell with a Tab-added row", "insertion", "blank lines"];

function textarea(harness: RuntimeHarness): RuntimeElement {
  const found = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(found, "a text box");
  return found;
}

function cellInput(harness: RuntimeHarness): RuntimeElement {
  const found = harness.createdElements.filter((element) => element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(found, "a cell input");
  return found;
}

function addBlankRuns(harness: RuntimeHarness, runs: string): void {
  harness.previewContent.appendChild(new RuntimeElement({ "data-okf-blank-runs": runs, hidden: "" }, harness.windowState, 0, 0, "div"));
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
}

/** Opens the editor of `kind`, types TYPED, posts the final save and leaves with Escape. */
function detached(kind: Kind): Scenario {
  // The paragraph and cell helpers switch edit mode on themselves; the bars and blocks need it on at load.
  const editing = kind === "insertion" || kind === "blank lines";
  const harness = createRuntimeHarness({ ...(editing ? { savedState: { editMode: true } } : {}), trackFocus: true });
  let control: () => RuntimeElement = () => textarea(harness);
  let finish: () => void = () => findButton(harness, DONE).dispatch("click");
  let first: () => void = () => findButton(harness, DONE).dispatch("click");
  if (kind === "paragraph") {
    const box = openBlockEditorWithSource(harness);
    box.value = TYPED;
    box.dispatch("input");
  } else if (kind === "insertion") {
    insertPointAfterLine(harness, 52).childElements[0]!.dispatch("click", plainClick());
    harness.dispatchMessage({
      type: "previewEditSource", ...IDENTITY, editId: harness.messages.at(-1)?.editId, originalText: "",
    });
    const box = textarea(harness);
    box.value = TYPED;
    box.dispatch("input");
  } else if (kind === "blank lines") {
    addBlankRuns(harness, "3-6 54-56");
    const blank = harness.createdElements.find((element) =>
      element.className.split(" ").includes("sphinx-preview-blank-lines") && !element.removed);
    assert.ok(blank, "a blank-line block");
    blank.dispatch("click", plainClick());
    harness.dispatchMessage({
      type: "previewEditSource", ...IDENTITY, editId: harness.messages.at(-1)?.editId, originalText: "\n\n\n\n",
    });
    const box = textarea(harness);
    box.value = TYPED;
    box.dispatch("input");
  } else {
    const opened = openTableCellEditorForTab(harness, { mapped: true });
    if (kind === "cell with a kept cell") {
      // Tab leaves the first cell with its change kept; the editor of the next cell is the one cancelled.
      opened.input().value = "left";
      opened.input().dispatch("input");
      opened.input().dispatch("keydown", tab);
    } else if (kind === "cell with a Tab-added row") {
      opened.input().dispatch("keydown", tab);
    }
    control = () => cellInput(harness);
    finish = () => cellInput(harness).dispatch("keydown", enter);
    first = () => cellInput(harness).dispatch("keydown", enter);
    control().value = TYPED;
    control().dispatch("input");
  }
  first();
  const finals = posts(harness, "previewEditSave").filter((message) => message.final === true);
  assert.ok(finals.length >= 1, `${kind}: a final save was posted`);
  const firstSave = finals.at(-1)!;
  control().dispatch("keydown", escape);
  assert.equal(posts(harness, "previewEditClosed").at(-1)?.detached, true, `${kind}: detached`);
  return { harness, editId: String(firstSave.editId), first: firstSave, control, finish };
}

/** M1 and M2 differ only in the one-shot pin, anchor and flush fields. */
const stable = (message: Record<string, unknown>): Record<string, unknown> => {
  const copy: Record<string, unknown> = JSON.parse(JSON.stringify(message)) as Record<string, unknown>;
  for (const key of Object.keys(copy)) {
    if (key.startsWith("pin") || key.startsWith("anchor") || key === "flush") delete copy[key];
  }
  return copy;
};

for (const kind of KINDS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
  // @tests_req SwRS-MDOKFSTUDIO-TABLE-025
  test(`${kind}: a failed detached save reopens the same editor with the typed text and no new open`, () => {
    const { harness, editId, control, first } = detached(kind);
    const before = harness.messages.length;
    harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: "disk full", unsavedText: String(first.editedText) });
    assert.deepEqual(posts(harness, "previewEditOpen", before), [], "no new open");
    const reopen = posts(harness, "previewEditReopen", before);
    assert.equal(reopen.length, 1);
    assert.equal(reopen[0]!.reopened, true);
    assert.equal(reopen[0]!.editId, editId);
    const box = control();
    assert.equal(box.value.replace(/\n$/u, ""), TYPED);
    assert.equal(harness.document.activeElement, box, "the text box has the focus");
    assert.ok(harness.createdElements.some((element) => element.textContent === "disk full"), "the status shows the error");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
  test(`${kind}: the retry equals the first save in every field but the pin, the anchor and flush, even after a patch`, () => {
    const { harness, editId, first, finish } = detached(kind);
    // A render already in flight arrives between the Cancel and the error.
    harness.dispatchMessage(patchMessage());
    harness.dispatchMessage({
      type: "previewEditSource", ...IDENTITY, editId, error: "disk full", unsavedText: String(first.editedText),
    });
    const before = harness.messages.length;
    finish();
    const retry = posts(harness, "previewEditSave", before).at(-1);
    assert.ok(retry, `${kind}: a retry was posted`);
    assert.deepEqual(stable(retry), stable(first));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-053
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
  test(`${kind}: Escape in the reopened editor posts previewEditCancel`, () => {
    const { harness, editId, control, first } = detached(kind);
    harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: "disk full", unsavedText: String(first.editedText) });
    const before = harness.messages.length;
    control().dispatch("keydown", escape);
    if (kind === "cell with a kept cell") {
      // A cell left earlier holds typed text: Escape puts the open cell back and saves the table (TABLE-025).
      assert.equal(posts(harness, "previewEditSave", before).filter((message) => message.final === true).length, 1);
    } else {
      assert.equal(posts(harness, "previewEditCancel", before).length, 1);
    }
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
  test(`${kind}: an error without unsavedText reopens the editor with the text of the first save`, () => {
    const { harness, editId, control, first } = detached(kind);
    harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: "disk full" });
    assert.equal(posts(harness, "previewEditReopen").at(-1)?.reopened, true);
    void first;
    assert.equal(control().value.trim(), TYPED);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("an error for an edit the page has no record of reopens nothing and answers reopened false", () => {
  const { harness } = detached("paragraph");
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId: harness.messages.filter((m) => m.type === "previewEditSave").at(-1)!.editId, done: true });
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId: "never-seen", error: "No.", unsavedText: "kept" });
  assert.deepEqual(posts(harness, "previewEditOpen", before), []);
  const reopen = posts(harness, "previewEditReopen", before);
  assert.equal(reopen.length, 1);
  assert.deepEqual([reopen[0]!.editId, reopen[0]!.reopened], ["never-seen", false]);
  assert.equal(harness.createdElements.filter((element) => element.tagName === "TEXTAREA").length, 1, "no second text box");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-216
test("the outside change error reopens the editor with the typed text and that message", () => {
  const { harness, editId, control, first } = detached("paragraph");
  const message = "The file changed outside the preview before your text was saved. Copy your text, then reopen the block.";
  harness.dispatchMessage({ type: "previewEditSource", ...IDENTITY, editId, error: message, unsavedText: String(first.editedText) });
  assert.equal(control().value.replace(/\n$/u, ""), TYPED);
  assert.ok(harness.createdElements.some((element) => element.textContent === message), "the status shows the message");
});
