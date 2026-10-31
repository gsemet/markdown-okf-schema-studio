import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement } from "./runtimeHarness";

/**
 * Radio choice options in the page (features/checkboxes.ts): a click or Space / Enter selects an
 * option and asks the host to move the `x`, the arrows move the focus only, and the checkbox guards
 * (read-only preview, open editor, pending toggle) apply.
 */

interface FakeEvent {
  target: RuntimeElement;
  key?: string;
  defaultPrevented: boolean;
  propagationStopped: boolean;
  immediatePropagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

function fakeEvent(target: RuntimeElement, key?: string): FakeEvent {
  return {
    target,
    ...(key === undefined ? {} : { key }),
    defaultPrevented: false,
    propagationStopped: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    },
  };
}

const states = (radios: readonly RuntimeElement[]): string =>
  radios.map((radio) => (radio.getAttribute("aria-checked") === "true" ? "x" : " ")).join("");

const tabStops = (radios: readonly RuntimeElement[]): string =>
  radios.map((radio) => (radio.getAttribute("tabindex") === "0" ? "0" : "-")).join("");

const GROUP = [{ line: 60, column: 2 }, { line: 61, column: 2 }, { line: 62, column: 2 }];

function result(editId: unknown, outcome: { saved: true } | { error: string }): Record<string, unknown> {
  return { type: "previewCheckboxResult", documentId: "file:///active.md", revision: 7, requestId: 11, editId, ...outcome };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("clicking an unselected radio option selects it at once and asks the host to move the x", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " ", " "] });
  const { radios } = harness;
  const before = harness.messages.length;
  const event = fakeEvent(radios[2]);
  harness.dispatchDocument("click", event);

  assert.equal(event.immediatePropagationStopped, true, "the click never reaches the block handlers");
  const posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => message.type), ["previewCheckboxToggle"]);
  assert.equal(posted[0].line, 62);
  assert.equal(posted[0].endLine, 62);
  assert.equal(posted[0].column, 2);
  assert.equal(posted[0].checked, true);
  assert.deepEqual(JSON.parse(JSON.stringify(posted[0].radioGroup)), GROUP, "every option of the group, in source order");
  assert.equal(states(radios), "  x");
  assert.equal(tabStops(radios), "--0", "the selected option is the group's tab stop");
  assert.ok(radios.every((radio) => radio.getAttribute("aria-busy") === "true"));

  harness.dispatchMessage(result(posted[0].editId, { saved: true }));
  assert.ok(radios.every((radio) => radio.getAttribute("aria-busy") === null));
  assert.equal(states(radios), "  x");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("clicking the selected option writes nothing", () => {
  const harness = createRuntimeHarness({ radioGroup: [" ", "x", " "] });
  const before = harness.messages.length;
  harness.dispatchDocument("click", fakeEvent(harness.radios[1]));
  assert.equal(harness.messages.length, before);
  assert.equal(states(harness.radios), " x ");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("with two selected options in the source, a click on one of them normalises the group", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " ", "x"] });
  const before = harness.messages.length;
  harness.dispatchDocument("click", fakeEvent(harness.radios[2]));
  const posted = harness.messages.slice(before);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].line, 62);
  assert.deepEqual(JSON.parse(JSON.stringify(posted[0].radioGroup)), GROUP, "every option of the group, in source order");
  assert.equal(states(harness.radios), "  x");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a refused choice restores the previous selection and shows the reason next to the option", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " ", " "] });
  const { radios } = harness;
  harness.dispatchDocument("click", fakeEvent(radios[1]));
  harness.dispatchMessage(result(harness.messages.at(-1)?.editId, {
    error: "The choice is no longer in the source. Refresh the preview.",
  }));
  assert.equal(states(radios), "x  ");
  assert.equal(tabStops(radios), "0--");
  assert.ok(radios.every((radio) => radio.getAttribute("aria-busy") === null));
  assert.match(radios[1].getAttribute("title") ?? "", /no longer in the source/u);
  const note = radios[1].insertedElements.at(-1)!;
  assert.equal(note.className, "myst-checkbox-refusal");
  assert.equal(note.getAttribute("role"), "status");
  harness.advanceTimers(6000);
  assert.equal(note.parentElement, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a second click while a choice waits for the host sends nothing", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " ", " "] });
  harness.dispatchDocument("click", fakeEvent(harness.radios[1]));
  const before = harness.messages.length;
  const event = fakeEvent(harness.radios[2]);
  harness.dispatchDocument("click", event);
  assert.equal(harness.messages.length, before);
  assert.equal(event.defaultPrevented, true);
  assert.equal(states(harness.radios), " x ");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("Space and Enter select the focused option and write; neither reaches the page's keys", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " ", " "], captureOrder: true });
  const { radios } = harness;
  let before = harness.messages.length;
  const space = fakeEvent(radios[1], " ");
  harness.dispatchDocument("keydown", space);
  assert.equal(space.defaultPrevented, true, "Space does not scroll the page");
  assert.equal(space.immediatePropagationStopped, true);
  let posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => [message.type, message.line]), [["previewCheckboxToggle", 61]]);
  harness.dispatchMessage(result(posted[0].editId, { saved: true }));
  assert.equal(states(radios), " x ");

  before = harness.messages.length;
  const enter = fakeEvent(radios[2], "Enter");
  harness.dispatchDocument("keydown", enter);
  assert.equal(enter.immediatePropagationStopped, true, "Enter opens no block editor and reveals no source");
  posted = harness.messages.slice(before);
  assert.deepEqual(posted.map((message) => [message.type, message.line]), [["previewCheckboxToggle", 62]]);
  assert.equal(states(radios), "  x");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("the arrow keys move the focus between the options and write nothing", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " ", " "], captureOrder: true, trackFocus: true });
  const { radios } = harness;
  const before = harness.messages.length;
  const focused = (): unknown => (harness.document as { activeElement?: unknown }).activeElement;

  const down = fakeEvent(radios[0], "ArrowDown");
  harness.dispatchDocument("keydown", down);
  assert.equal(down.defaultPrevented, true);
  assert.equal(down.immediatePropagationStopped, true, "the arrow never moves the block selection");
  assert.equal(focused(), radios[1]);
  assert.equal(tabStops(radios), "-0-", "the focused option is the group's tab stop");

  harness.dispatchDocument("keydown", fakeEvent(radios[1], "ArrowRight"));
  assert.equal(focused(), radios[2]);
  harness.dispatchDocument("keydown", fakeEvent(radios[2], "ArrowDown"));
  assert.equal(focused(), radios[0], "the focus wraps from the last option to the first");
  harness.dispatchDocument("keydown", fakeEvent(radios[0], "ArrowUp"));
  assert.equal(focused(), radios[2], "and from the first to the last");
  harness.dispatchDocument("keydown", fakeEvent(radios[2], "ArrowLeft"));
  assert.equal(focused(), radios[1]);

  assert.equal(harness.messages.length, before, "moving the focus writes nothing");
  assert.equal(states(radios), "x  ", "moving the focus selects nothing");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("radio options in a read-only preview are disabled and a click sends nothing", () => {
  const harness = createRuntimeHarness({
    radioGroup: ["x", " "], editingEnabled: false, readOnlyReason: "Reason from the host.", captureOrder: true,
  });
  for (const radio of harness.radios) {
    assert.equal(radio.getAttribute("aria-disabled"), "true");
    assert.equal(radio.getAttribute("title"), "Reason from the host.");
  }
  const before = harness.messages.length;
  const click = fakeEvent(harness.radios[1]);
  harness.dispatchDocument("click", click);
  harness.dispatchDocument("keydown", fakeEvent(harness.radios[1], " "));
  assert.equal(click.defaultPrevented, true);
  assert.equal(harness.messages.length, before);
  assert.equal(states(harness.radios), "x ");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a radio choice is refused while a block editor is open", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " "] });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const before = harness.messages.length;
  harness.dispatchDocument("click", fakeEvent(harness.radios[1]));
  assert.equal(harness.messages.length, before);
  assert.equal(states(harness.radios), "x ");
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.match(status?.textContent ?? "", /before choosing an option/u);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("in edit mode and in every palette mode a radio click selects the option without opening a block editor", () => {
  for (const initialPaletteMode of ["strict", "gfm", "myst", "full"] as const) {
    const harness = createRuntimeHarness({ radioGroup: ["x", " "], initialPaletteMode });
    harness.editModeButton.dispatch("click");
    const before = harness.messages.length;
    harness.dispatchDocument("click", fakeEvent(harness.radios[1]));
    assert.deepEqual(harness.messages.slice(before).map((message) => message.type), ["previewCheckboxToggle"],
      `palette mode ${initialPaletteMode}`);
    assert.equal(harness.createdElements.some((element) =>
      element.getAttribute("data-sphinx-preview-block-editor") !== null), false);
  }
});
