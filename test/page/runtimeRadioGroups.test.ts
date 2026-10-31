import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement } from "./runtimeHarness";
import { openBlockEditorWithSource, patchMessage } from "./runtimeTestSupport";

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

/**
 * The content patch of a write replaces the list block, so the focused option leaves the document
 * and the browser moves the focus to the body. The harness keeps the same option elements, so the
 * replacement is modelled by dropping the focus when the patch writes the new content.
 */
function dropFocusOnContentPatch(harness: ReturnType<typeof createRuntimeHarness>): void {
  const document = harness.document as { activeElement?: unknown };
  let html = "";
  Object.defineProperty(harness.previewContent, "innerHTML", {
    configurable: true,
    get: () => html,
    set: (value: string) => {
      html = value;
      document.activeElement = undefined;
    },
  });
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("after a choice with Space or a click and the content patch that follows, the option of the same line and column has the focus", () => {
  for (const way of ["space", "click"] as const) {
    const harness = createRuntimeHarness({ radioGroup: ["x", " ", " "], captureOrder: true, trackFocus: true });
    const { radios } = harness;
    const focused = (): unknown => (harness.document as { activeElement?: unknown }).activeElement;
    dropFocusOnContentPatch(harness);
    let chosen: RuntimeElement;
    if (way === "space") {
      radios[0].focus();
      harness.dispatchDocument("keydown", fakeEvent(radios[0], "ArrowDown"));
      chosen = radios[1];
      harness.dispatchDocument("keydown", fakeEvent(chosen, " "));
    } else {
      chosen = radios[2];
      chosen.focus();
      harness.dispatchDocument("click", fakeEvent(chosen));
    }
    const toggle = harness.messages.at(-1)!;
    assert.equal(toggle.type, "previewCheckboxToggle", way);
    harness.dispatchMessage(result(toggle.editId, { saved: true }));
    harness.dispatchMessage(patchMessage());
    const where = (element: unknown): string => {
      const option = element as RuntimeElement | null | undefined;
      return option?.getAttribute?.("role") === "radio"
        ? `radio ${option.getAttribute("data-myst-radio-line")}:${option.getAttribute("data-myst-radio-column")}`
        : String(option ?? "nothing (the body)");
    };
    assert.equal(where(focused()), where(chosen), `${way}: the chosen option keeps the focus`);
    assert.equal(focused(), chosen, way);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a content patch while no option has the focus (an external rewrite) gives the focus to no option", () => {
  const harness = createRuntimeHarness({ radioGroup: ["x", " "], trackFocus: true });
  const focused = (): unknown => (harness.document as { activeElement?: unknown }).activeElement;
  harness.mappings[0].focus();
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.radios.includes(focused() as RuntimeElement), false, "the focus stays where the author left it");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("with a block editor open, a press on an option that blurs the editor before the click writes nothing and keeps the editor open", () => {
  const harness = createRuntimeHarness({
    radioGroup: ["x", " "], captureOrder: true, trackFocus: true, blurOnFocusChange: true,
  });
  const textarea = openBlockEditorWithSource(harness);
  textarea.focus();
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") !== null)!;
  const before = harness.messages.length;
  const option = harness.radios[1];
  // As a browser does: mousedown, then (unless it was prevented) the option takes the focus, which
  // blurs the text box and runs its blur-commit, then the click.
  const press = { ...fakeEvent(option), button: 0 };
  harness.dispatchDocument("mousedown", press);
  if (!press.defaultPrevented) option.focus();
  harness.dispatchDocument("click", { ...fakeEvent(option), button: 0 });

  assert.deepEqual(harness.messages.slice(before).filter((message) => message.type === "previewCheckboxToggle"), [],
    "no choice is sent while the editor is open");
  assert.equal(states(harness.radios), "x ");
  assert.equal(editor.removed, false, "the block editor stays open");
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.equal(status?.textContent, "Save or cancel this edit before choosing an option.");
});
