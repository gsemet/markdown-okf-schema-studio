import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { sourceReply } from "./runtimeTestSupport";

/**
 * Plain Enter in the block editor opened on a one-line card part (a `:header:` or `:footer:`
 * option, or the directive line of the card title). A blank line ends the options of a MyST
 * directive, so a newline there would cut the card: Enter commits the line and closes the editor
 * (a final save of the single line), like Cmd/Ctrl+Enter. The page runtime runs against the fake
 * DOM, whose native text input inserts nothing: what the test sees is the keydown being taken over
 * (`preventDefault`) and the final save that follows.
 *
 * The renderer marks these parts `data-single-line` (checked in
 * test/core/render/gridCardTitleSourceLine.test.ts); the clicked element here carries the same
 * attributes: one source line (line 50, end line 50) and the marker. A one-line paragraph or
 * heading has no marker and keeps Enter as a new line.
 */

function openLine(source: string, typed: string, options: { partClass?: string; platform?: string } = {}): {
  harness: RuntimeHarness;
  textarea: RuntimeElement;
} {
  const harness = createRuntimeHarness({
    initialPaletteMode: "myst",
    secondBlockEndLine: 50,
    ...(options.platform === undefined ? {} : { platform: options.platform }),
  });
  harness.editModeButton.dispatch("click");
  if (options.partClass !== undefined) {
    harness.mappings[1].setAttribute("class", options.partClass);
    harness.mappings[1].setAttribute("data-single-line", "true");
  }
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  sourceReply(harness, source);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea, "the line opens in a text box");
  textarea.value = typed;
  textarea.setSelectionRange(typed.length, typed.length);
  textarea.dispatch("input");
  return { harness, textarea };
}

function statusText(harness: RuntimeHarness): string {
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.ok(status, "the editor has a status line");
  return status.textContent;
}

function finalSaves(harness: RuntimeHarness) {
  return harness.messages.filter((message) => message.type === "previewEditSave" && message.final === true);
}

function enterCommitsOneLine(partClass: string, source: string, typed: string): void {
  const { harness, textarea } = openLine(source, typed, { partClass });
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1, "Enter is taken over: no native newline in the text box");
  assert.equal(textarea.value.includes("\n"), false, "the text box holds one line");
  const saves = finalSaves(harness);
  assert.equal(saves.length, 1, "Enter sends the final save");
  assert.equal(saves[0].editedText, typed + "\n", "the saved text is the single line, no blank line after it");
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("card :header: option: plain Enter commits the single line and closes the editor", () => {
  enterCommitsOneLine(
    "myst-grid-card-option",
    ":header: Since v2.1.154, published 2026-05-28\n",
    ":header: Since v2.1.154, published 2026-05-28 Q",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("card :footer: option: plain Enter commits the single line and closes the editor", () => {
  enterCommitsOneLine(
    "myst-grid-card-option",
    ":footer: Documented in the workflows guide\n",
    ":footer: Documented in the workflows guide Q",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("card title (directive line): plain Enter commits the single line and closes the editor", () => {
  enterCommitsOneLine(
    "myst-grid-card-title",
    ":::{card} Claude Code\n",
    ":::{card} Claude Code Q",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("card one-line part: Shift+Enter is ignored, no newline and the editor stays open", () => {
  const typed = ":header: Since v2.1.154 Q";
  const { harness, textarea } = openLine(":header: Since v2.1.154\n", typed, { partClass: "myst-grid-card-option" });
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1, "Shift+Enter is taken over: no native newline in the text box");
  assert.equal(textarea.value, typed, "the text is unchanged");
  assert.equal(finalSaves(harness).length, 0, "Shift+Enter does not save");
  assert.match(statusText(harness), /^Line 50 /u, "the editor stays open, its hint unchanged");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
for (const [label, modifiers] of [
  ["Alt+Enter", { altKey: true }],
  ["Alt+Shift+Enter", { altKey: true, shiftKey: true }],
] as const) {
  test(`card one-line part: ${label} is ignored, no newline and the editor stays open`, () => {
    const typed = ":footer: Documented Q";
    const { harness, textarea } = openLine(":footer: Documented\n", typed, { partClass: "myst-grid-card-option" });
    let prevented = 0;
    textarea.dispatch("keydown", { key: "Enter", ...modifiers, preventDefault: () => { prevented += 1; } });
    assert.equal(prevented, 1, `${label} is taken over: no native newline in the text box`);
    assert.equal(textarea.value, typed, "the text is unchanged");
    assert.equal(finalSaves(harness).length, 0, `${label} does not save`);
    assert.match(statusText(harness), /^Line 50 /u, "the editor stays open");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
for (const [label, shiftKey, typed] of [
  ["Tab", false, ":header: H"],
  ["Shift+Tab", true, "  :header: H"],
] as const) {
  test(`card one-line part: ${label} does nothing, no indent and the editor stays open`, () => {
    const { harness, textarea } = openLine(typed + "\n", typed, { partClass: "myst-grid-card-option" });
    let prevented = 0;
    textarea.dispatch("keydown", { key: "Tab", shiftKey, preventDefault: () => { prevented += 1; } });
    assert.equal(prevented, 1, `${label} is taken over: the focus stays in the text box`);
    assert.equal(textarea.value, typed, `${label} neither indents nor outdents the line`);
    assert.equal(finalSaves(harness).length, 0, `${label} does not save`);
    assert.match(statusText(harness), /^Line 50 /u, "the editor stays open");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("card one-line part: Enter goes to the open slash menu and does not save", () => {
  const typed = ":header: H /";
  const { harness, textarea } = openLine(":header: H\n", ":header: H", { partClass: "myst-grid-card-option" });
  textarea.value = typed;
  textarea.setSelectionRange(typed.length, typed.length);
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  const menu = () => harness.createdElements.find((element) =>
    element.getAttribute("data-slash-menu") === "true" && !element.removed);
  assert.ok(menu(), "the slash menu is open");
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented >= 1, true, "Enter is taken by the menu");
  assert.equal(menu(), undefined, "the menu applied its item and closed");
  assert.equal(finalSaves(harness).length, 0, "Enter in the menu does not save the card line");
  assert.match(statusText(harness), /^Line 50 /u, "the editor stays open");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-033
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("card one-line part: the status hint says Enter is done and drops Tab", () => {
  const apple = openLine(":header: H\n", ":header: H", { partClass: "myst-grid-card-option", platform: "MacIntel" });
  assert.equal(statusText(apple.harness), "Line 50 · Enter: done · Esc: cancel · ⌘↩: done");
  const other = openLine(":::{card} T\n", ":::{card} T", { partClass: "myst-grid-card-title", platform: "Linux x86_64" });
  assert.equal(statusText(other.harness), "Line 50 · Enter: done · Esc: cancel · Ctrl+Enter: done");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-033
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
for (const [kind, source] of [["paragraph", "One line paragraph\n"], ["heading", "## One line heading\n"]] as const) {
  test(`a one-line ${kind} (no single-line marker) keeps Enter as a new line and its hint`, () => {
    const typed = source.slice(0, -1);
    const { harness, textarea } = openLine(source, typed, { platform: "MacIntel" });
    assert.equal(
      statusText(harness),
      "Line 50 · Enter: new line · Tab: indent · Esc: cancel · ⌘↩: done",
    );
    let prevented = 0;
    textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
    assert.equal(prevented, 0, "Enter is left to the text box: it inserts a newline");
    let shiftPrevented = 0;
    textarea.dispatch("keydown", { key: "Enter", shiftKey: true, preventDefault: () => { shiftPrevented += 1; } });
    assert.equal(shiftPrevented, 0, "Shift+Enter is left to the text box too");
    textarea.setSelectionRange(0, 0);
    textarea.dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
    assert.equal(textarea.value, "    " + typed, "Tab still indents the line");
    assert.equal(finalSaves(harness).length, 0, "Enter does not save");
  });
}
