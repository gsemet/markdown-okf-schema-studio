import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { RuntimeHarness } from "./runtimeHarness";
import { figureHarness, paletteButton, paletteOf } from "./runtimeTestSupport";

/** The Code-block (MyST) form: the options of a `{code-block}` directive (modules/codeBlockPanel.ts). */

const click = { preventDefault: () => undefined, stopPropagation: () => undefined };

const source = [
  "```{code-block} python",
  ":caption: Hello",
  ":dedent: 2",
  "",
  "print('hi')",
  "```",
].join("\n");

function panelOf(harness: RuntimeHarness) {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-code-block-panel") !== null && !element.removed);
}

function field(harness: RuntimeHarness, name: string) {
  const control = harness.createdElements.find((element) =>
    element.getAttribute("data-code-block-field") === name && !element.removed);
  assert.ok(control, "code-block field " + name);
  return control;
}

function action(harness: RuntimeHarness, name: string) {
  const button = harness.createdElements.find((element) =>
    element.getAttribute("data-code-block-action") === name && !element.removed);
  assert.ok(button, "code-block action " + name);
  return button;
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("the Code-block button with the caret in a directive opens the form filled with its options", () => {
  const { harness, textarea } = figureHarness(source, source.indexOf("print"));
  paletteButton(harness, "codeBlock").dispatch("click", click);
  const panel = panelOf(harness);
  assert.ok(panel, "the form opens");
  const frame = textarea.parentElement!;
  assert.equal(panel.parentElement, frame);
  assert.equal(frame.childElements.indexOf(panel), frame.childElements.indexOf(paletteOf(harness)!) + 1);
  assert.equal(field(harness, "language").value, "python");
  assert.equal(field(harness, "linenos").value, "off");
  assert.equal(field(harness, "emphasizeLines").value, "");
  assert.equal(field(harness, "caption").value, "Hello");
  assert.equal(field(harness, "name").value, "");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("Apply rewrites the directive in one edit and keeps the other options and the code", () => {
  const { harness, textarea, calls } = figureHarness(source, source.indexOf("print"));
  paletteButton(harness, "codeBlock").dispatch("click", click);
  field(harness, "linenos").value = "on";
  field(harness, "emphasizeLines").value = "1";
  field(harness, "name").value = "hi";
  action(harness, "apply").dispatch("click", click);
  assert.equal(calls.length, 1, "one native edit, so one undo step");
  assert.equal(textarea.value, [
    "```{code-block} python",
    ":caption: Hello",
    ":dedent: 2",
    ":linenos:",
    ":emphasize-lines: 1",
    ":name: hi",
    "",
    "print('hi')",
    "```",
  ].join("\n"));
  assert.equal(panelOf(harness), undefined, "the form closes");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("Apply without a change writes nothing", () => {
  const { harness, textarea, calls } = figureHarness(source, source.indexOf("print"));
  paletteButton(harness, "codeBlock").dispatch("click", click);
  action(harness, "apply").dispatch("click", click);
  assert.equal(calls.length, 0);
  assert.equal(textarea.value, source);
  assert.equal(panelOf(harness), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("an invalid value shows an inline error and keeps the form open without editing", () => {
  const { harness, textarea, calls } = figureHarness(source, source.indexOf("print"));
  paletteButton(harness, "codeBlock").dispatch("click", click);
  field(harness, "emphasizeLines").value = "first";
  action(harness, "apply").dispatch("click", click);
  assert.ok(panelOf(harness), "the form stays open");
  assert.equal(calls.length, 0);
  assert.equal(textarea.value, source);
  const message = harness.createdElements.find((element) =>
    element.getAttribute("data-code-block-error") === "emphasizeLines");
  assert.ok(message && message.textContent !== "" && message.hidden !== true);
  field(harness, "emphasizeLines").dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(panelOf(harness), undefined, "Escape closes the form");
  assert.equal(textarea.value, source);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("the Code-block button outside a directive opens an empty form and Apply inserts a directive", () => {
  const text = "Intro paragraph.";
  const { harness, textarea, calls } = figureHarness(text, 5);
  paletteButton(harness, "codeBlock").dispatch("click", click);
  assert.ok(panelOf(harness));
  assert.equal(field(harness, "language").value, "");
  field(harness, "language").value = "sh";
  field(harness, "linenos").value = "on";
  action(harness, "apply").dispatch("click", click);
  assert.equal(calls.length, 1);
  assert.equal(textarea.value, text + "\n\n```{code-block} sh\n:linenos:\n\n\n```");
  assert.equal(panelOf(harness), undefined);
});
