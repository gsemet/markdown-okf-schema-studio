import * as assert from "node:assert/strict";
import { test } from "node:test";

import { AUTOSAVE_DELAY_MS } from "../../src/page/pageSettings";
import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { paletteButton, paletteOf, patchMessage, sourceReply } from "./runtimeTestSupport";

/**
 * Blur outside the block editor of a grid card saves and closes it. The page runtime runs against
 * the fake DOM with a small stand-in for a three-block page (the second block is the one edited,
 * its source is the body of a `{grid-item-card}` of a `{grid} 1 2 3 3`); the DOM is not the real
 * rendered grid. Every focus change is dispatched the way a browser reports it: a blur naming the
 * new focus target, or none when the focus goes to nothing. The host's answer to the final save is
 * driven too (a content patch, as the host sends after the edit landed), and the editor must be
 * gone afterwards. The "still open, Saving Markdown" state before that answer is asserted as such:
 * it is the state the report may be stuck in if the host answer never comes.
 */

const CARD_BODY = "The lifecycle maps to OKF `status` through the schema. {ref}`evo-status`\n";
const TYPED = CARD_BODY.trimEnd() + " It is typed.";


function openCardEditor(blurOnFocusChange = false): { harness: RuntimeHarness; textarea: RuntimeElement } {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst", trackFocus: true, blurOnFocusChange });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  sourceReply(harness, CARD_BODY);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea, "the card body opens in a text box");
  textarea.focus({ preventScroll: true });
  return { harness, textarea };
}

function type(textarea: RuntimeElement): void {
  textarea.value = TYPED;
  textarea.dispatch("input");
}

function finalSaves(harness: RuntimeHarness): Array<Record<string, unknown>> {
  return harness.messages.filter((message) => message.type === "previewEditSave" && message.final === true);
}

/** The page still has a block editor open (the page marks it on the document element). */
function editorOpen(harness: RuntimeHarness): boolean {
  return harness.documentElement.getAttribute("data-sphinx-preview-block-editing") !== null;
}

function savingStatusShown(harness: RuntimeHarness): boolean {
  return harness.createdElements.some((element) => !element.removed && element.textContent === "Saving Markdown…");
}

/**
 * One final save with the typed text was posted; the editor is then still open in its "Saving
 * Markdown" state (nothing else closes it), and the host's content patch closes it.
 */
function assertSavedAndClosedByHost(harness: RuntimeHarness, textarea: RuntimeElement, why: string): void {
  const saves = finalSaves(harness);
  assert.equal(saves.length, 1, why + ": one final save");
  assert.equal(saves[0].editedText, TYPED + "\n", why + ": the typed text");
  assert.equal(editorOpen(harness) && savingStatusShown(harness), true,
    why + ": awaiting the host, the editor shows the Saving Markdown status");
  harness.dispatchMessage(patchMessage());
  assert.equal(editorOpen(harness), false,
    why + ": the editor is gone after the host's answer (still open: " + savingStatusShown(harness) + " with the Saving status)");
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: a click outside after an autosave landed sends the final save and the host closes the editor", () => {
  const { harness, textarea } = openCardEditor();
  type(textarea);
  harness.advanceTimers(AUTOSAVE_DELAY_MS);
  const autosaves = harness.messages.filter((message) => message.type === "previewEditSave" && message.final !== true);
  assert.equal(autosaves.length, 1, "the autosave was posted");
  // The autosave leaves the editor open; the click outside then sends the final save.
  assert.equal(editorOpen(harness), true, "the autosave does not close the editor");
  textarea.dispatch("blur", { relatedTarget: null });
  assertSavedAndClosedByHost(harness, textarea, "outside after an autosave");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: a click outside after typing saves the card and closes the editor", () => {
  for (const related of [undefined, null, "body"] as const) {
    const { harness, textarea } = openCardEditor();
    type(textarea);
    textarea.dispatch("blur", { relatedTarget: related === "body" ? harness.body : related });
    assertSavedAndClosedByHost(harness, textarea, String(related));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: a click outside without typing closes the editor at once", () => {
  const { harness, textarea } = openCardEditor();
  textarea.dispatch("blur", { relatedTarget: null });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: a click on the palette keeps the text box focused, then a click outside saves", () => {
  const { harness, textarea } = openCardEditor(true);
  type(textarea);
  const palette = paletteOf(harness)!;
  // The palette's press is cancelled, so the text box keeps the focus and nothing blurs.
  let paletteCancelled = false;
  let buttonCancelled = false;
  palette.dispatch("mousedown", { target: palette, preventDefault: () => { paletteCancelled = true; } });
  paletteButton(harness, "bold").dispatch("mousedown", { preventDefault: () => { buttonCancelled = true; } });
  assert.equal(paletteCancelled, true, "the press on the palette padding is cancelled");
  assert.equal(buttonCancelled, true, "the press on the palette button is cancelled");
  assert.equal(finalSaves(harness).length, 0, "the palette press does not save");
  textarea.dispatch("blur", { relatedTarget: null });
  assertSavedAndClosedByHost(harness, textarea, "outside after the palette");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: the focus in the mode select then a click outside saves", () => {
  const { harness, textarea } = openCardEditor(true);
  type(textarea);
  const select = paletteOf(harness)!.childElements.find((child) => child.tagName === "SELECT")!;
  select.focus();
  assert.equal(finalSaves(harness).length, 0);
  select.dispatch("blur", { relatedTarget: null });
  assertSavedAndClosedByHost(harness, textarea, "mode select blurred outside");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: the focus in an open palette popover then a click outside saves", () => {
  const { harness, textarea } = openCardEditor(true);
  type(textarea);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  const field = harness.createdElements.find((e) =>
    e.tagName === "INPUT" && e.getAttribute("data-emoji-filter") !== null && !e.removed);
  assert.ok(field);
  assert.equal(finalSaves(harness).length, 0, "the move into the popover does not save");
  field.dispatch("blur", { relatedTarget: null });
  assertSavedAndClosedByHost(harness, textarea, "popover field blurred outside");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: Done saves and closes, whatever the palette covers", () => {
  const { harness, textarea } = openCardEditor(true);
  type(textarea);
  const done = harness.createdElements.find((e) => e.tagName === "BUTTON" && e.getAttribute("aria-label") === "Done editing");
  assert.ok(done);
  done.dispatch("mousedown", { preventDefault: () => undefined });
  done.dispatch("click");
  assertSavedAndClosedByHost(harness, textarea, "Done");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: the window losing the focus saves the card (BLOCK-047 regression guard)", () => {
  const { harness, textarea } = openCardEditor(true);
  type(textarea);
  harness.dispatchWindow("blur");
  textarea.dispatch("blur", { relatedTarget: null });
  assertSavedAndClosedByHost(harness, textarea, "window blur");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
test("grid card: a click outside while the file dialog is open waits, and one after its answer saves", () => {
  for (const answer of [{ ok: true, cancelled: true }, { ok: false, reason: "Outside the workspace." }]) {
    const { harness, textarea } = openCardEditor(true);
    type(textarea);
    paletteButton(harness, "image").dispatch("click", { preventDefault: () => undefined });
    const request = harness.messages.at(-1)!;
    assert.equal(request.type, "previewPickImage");
    // Inside the suspension window: the dialog has the focus, a blur is not leaving.
    textarea.dispatch("blur", { relatedTarget: null });
    assert.equal(finalSaves(harness).length, 0, "no save while the dialog is open");
    harness.dispatchMessage({ type: "previewPickImageResult", editId: request.editId, revision: 99, requestId: 99, ...answer });
    // The dialog is gone: the next focus loss saves again, the editor is not stuck.
    textarea.focus({ preventScroll: true });
    textarea.dispatch("blur", { relatedTarget: null });
    assertSavedAndClosedByHost(harness, textarea, "after the dialog answer " + JSON.stringify(answer));
  }
});
