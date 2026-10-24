import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  addOkfLink,
  cellMarkup,
  frontmatterSaves,
  noop,
  openBlockEditorWithSource,
  openFrontmatterValueEditor,
  openTableCellEditor,
  openTableCellEditorForTab,
  openTextFieldEditor,
  propertiesMessage,
  t21ClickEvent,
} from "./runtimeTestSupport";

/**
 * The slash menu, flushing open editors before navigation or a host request, and the editor trace
 * (features/blockEditor.ts, hostHandlers.ts).
 */

// P11: the / command menu in the page runtime.
function slashMenuOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-slash-menu") === "true" && !element.removed);
}

test("P11: typing / in a block editor opens the menu, Enter applies it and Escape keeps the editor", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph.\n/h2";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.equal(slashMenuOf(harness), undefined, "the slash must be at a line start or after a space");
  textarea.value = "Second paragraph.\n/";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.ok(slashMenuOf(harness), "opened by the slash after a line break");
  assert.equal(textarea.getAttribute("aria-expanded"), "true");
  textarea.value = "Second paragraph.\n/h2";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "2", inputType: "insertText" });
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented >= 1, true, "Enter is taken by the menu");
  assert.equal(slashMenuOf(harness), undefined);
  assert.equal(textarea.value, "Second paragraph.\n## ");
  assert.equal(textarea.getAttribute("aria-expanded"), null);

  textarea.value = "Second paragraph.\n## /";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.ok(slashMenuOf(harness));
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(slashMenuOf(harness), undefined, "Escape closes the menu");
  assert.equal(textarea.value, "Second paragraph.\n## /", "and keeps the typed text");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the editor stays open");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null, "the next Escape cancels the editor");
});

test("P11: the menu closes when the text box loses the focus", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "/";
  textarea.selectionStart = textarea.selectionEnd = 1;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.ok(slashMenuOf(harness));
  textarea.dispatch("blur");
  assert.equal(slashMenuOf(harness), undefined);
});

// CR 025: typed text is saved before the preview leaves the document.

function messageTypesSince(harness: RuntimeHarness, count: number): string[] {
  return harness.messages.slice(count).map((message) => message.type as string);
}

test("CR 025: following a link right after typing posts the final save before the link", () => {
  const harness = createRuntimeHarness();
  const link = addOkfLink(harness);
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  harness.dispatchDocument("click", t21ClickEvent(link, { metaKey: true }));
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewLink"]);
  const save = harness.messages[before];
  assert.equal(save.final, true);
  assert.equal(save.editedText, "Typed just now\n");
  assert.equal(harness.pendingTimerCount(), 0, "the autosave timer is gone");
});

test("CR 025: an anchor link inside the page keeps the open editor", () => {
  const harness = createRuntimeHarness();
  const link = new RuntimeElement({ "data-sphinx-preview-navigation": "#section" }, harness.windowState, 0, 20, "a");
  harness.frontmatterValueDisplay.appendChild(link);
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  const before = harness.messages.length;
  harness.dispatchDocument("click", t21ClickEvent(link, { metaKey: true }));
  assert.equal(messageTypesSince(harness, before).includes("previewEditSave"), false);
  harness.flushTimers();
});

test("CR 025: Back right after typing posts the final save before previewHistoryGo", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: true, canForward: false });
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  harness.backButton.dispatch("click");
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewHistoryGo"]);
  assert.equal(harness.messages[before].final, true);
  assert.equal(harness.messages[before].editedText, "Typed just now\n");
});

test("CR 025: Back with an untouched editor open posts only the navigation", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: true, canForward: false });
  openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  harness.backButton.dispatch("click");
  assert.deepEqual(messageTypesSince(harness, before), ["previewHistoryGo"]);
});

test("CR 025: a host flush request saves the open editor first, then answers", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-1" });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewEditFlushed"]);
  assert.equal(harness.messages[before].final, true);
  assert.equal(harness.messages[before].editedText, "Typed just now\n");
  const answer = harness.messages[before + 1];
  assert.equal(answer.flushId, "flush-1");
  assert.equal(answer.flushed, true);
  assert.equal(harness.pendingTimerCount(), 0);
});

test("CR 025: a host flush request without an open editor only answers", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-2" });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditFlushed"]);
  assert.equal(harness.messages[before].flushed, false);
});

test("CR 025: a host flush request saves the typed text of an open table cell", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  const before = harness.messages.length;
  input.value = "typed";
  input.dispatch("input");
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-3" });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewEditFlushed"]);
  assert.equal(harness.messages[before].final, true);
  assert.match(String(harness.messages[before].editedText), /\| typed\s*\|/u);
});

test("CR 025: a host flush request saves an open frontmatter field and marks it as a flush", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta";
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-4" });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].fieldValue, "Beta");
  assert.equal(saves[0].flush, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditFlushed");
  assert.equal(harness.messages.at(-1)?.flushed, true);
});

test("CR 025: a frontmatter YAML editor with invalid YAML is still sent on a flush", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "object");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "a: [unclosed";
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-5" });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].fieldValueFormat, "yaml");
  assert.equal(saves[0].fieldValue, "a: [unclosed");
  assert.equal(saves[0].flush, true);
});

function openObjectYamlEditor(): {
  harness: ReturnType<typeof createRuntimeHarness>;
  textarea: ReturnType<typeof createRuntimeHarness>["createdElements"][number];
} {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "object");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
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

const CR25_IDS = { documentId: "file:///active.md", revision: 7, requestId: 11 };

test("CR 025: a blur save refused before a host flush is saved again as a flush, then answered", () => {
  // The host focusing another editor tab blurs the editor first: the blur posts a plain save that
  // the host refuses (invalid YAML), and the flush request arrives while it is pending.
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "[unclosed";
  textarea.dispatch("blur");
  const plain = frontmatterSaves(harness);
  assert.equal(plain.length, 1);
  assert.equal(plain[0].flush, undefined);
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-9" });
  assert.deepEqual(messageTypesSince(harness, before), [], "the answer waits for the pending save");
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    ...CR25_IDS,
    editId: plain[0].editId,
    error: "Invalid YAML value: unexpected end",
  });
  assert.deepEqual(messageTypesSince(harness, before), ["previewFrontmatterSave", "previewEditFlushed"]);
  const flushSave = harness.messages[before];
  assert.equal(flushSave.fieldValue, "[unclosed");
  assert.equal(flushSave.fieldValueFormat, "yaml");
  assert.equal(flushSave.flush, true);
  assert.equal(harness.messages[before + 1].flushId, "flush-9");
  assert.equal(harness.messages[before + 1].flushed, true);
  assert.equal(harness.pendingTimerCount(), 0);
});

test("CR 025: a blur save accepted before a host flush is not saved twice", () => {
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "a: 2";
  textarea.dispatch("blur");
  const plain = frontmatterSaves(harness);
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-10" });
  assert.deepEqual(messageTypesSince(harness, before), []);
  harness.dispatchMessage({ type: "previewFrontmatterResult", ...CR25_IDS, editId: plain[0].editId, saved: true });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditFlushed"]);
  assert.equal(frontmatterSaves(harness).length, 1);
});

test("CR 025: a host flush whose pending save gets no result still answers after a bounded wait", () => {
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "[unclosed";
  textarea.dispatch("blur");
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-11" });
  assert.deepEqual(messageTypesSince(harness, before), []);
  harness.flushTimers();
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditFlushed"]);
});

test("CR 025: Back right after a refused blur save posts the flush save before previewHistoryGo", () => {
  const { harness, textarea } = openObjectYamlEditor();
  harness.dispatchMessage({ type: "previewHistoryState", ...CR25_IDS, canBack: true, canForward: false });
  textarea.value = "just text";
  textarea.dispatch("blur");
  const plain = frontmatterSaves(harness);
  const before = harness.messages.length;
  harness.backButton.dispatch("click");
  assert.deepEqual(messageTypesSince(harness, before), []);
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    ...CR25_IDS,
    editId: plain[0].editId,
    error: "The frontmatter field is stale or its value does not match the schema.",
  });
  assert.deepEqual(messageTypesSince(harness, before), ["previewFrontmatterSave", "previewHistoryGo"]);
  assert.equal(harness.messages[before].fieldValue, "just text");
  assert.equal(harness.messages[before].flush, true);
});

test("CR 025: a normal frontmatter save does not carry the flush flag", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta";
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(harness)[0].flush, undefined);
});

test("CR 025: a number field with a bad number is refused on Enter but sent as typed on a flush", () => {
  const open = () => {
    const harness = createRuntimeHarness();
    harness.frontmatterRow.setAttribute("data-okf-type", "number");
    harness.frontmatterRow.setAttribute("data-okf-schema-found", "true");
    harness.frontmatterRow.setAttribute("data-okf-value", "3");
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target: harness.frontmatterValueCell,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    const input = harness.createdElements.find((element) => element.tagName === "INPUT"
      && (element as unknown as { type?: string }).type === "number");
    assert.ok(input);
    input.value = "";
    return { harness, input };
  };
  const refused = open();
  refused.input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(refused.harness).length, 0);
  const flushed = open();
  flushed.harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-6" });
  const saves = frontmatterSaves(flushed.harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].fieldValue, "");
  assert.equal(saves[0].flush, true);
});

test("CR 025: pagehide and a hidden page save an open frontmatter editor as a flush", () => {
  for (const hide of ["pagehide", "visibilitychange"] as const) {
    const { harness, textarea } = openTextFieldEditor("Alpha");
    textarea.value = "Beta";
    if (hide === "pagehide") {
      harness.dispatchWindow("pagehide");
    } else {
      harness.setVisibilityState("hidden");
      harness.dispatchDocument("visibilitychange", {});
    }
    const saves = frontmatterSaves(harness);
    assert.equal(saves.length, 1, hide);
    assert.equal(saves[0].fieldValue, "Beta");
    assert.equal(saves[0].flush, true);
  }
});

test("CR 025: pagehide saves the typed text of an open table cell", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  const before = harness.messages.length;
  input.value = "typed";
  input.dispatch("input");
  harness.dispatchWindow("pagehide");
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.match(String(saves[0].editedText), /\| typed\s*\|/u);
});

test("CR 025: a flushed block save carries the flush flag, a normal save does not", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Typed";
  textarea.dispatch("input");
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-7" });
  assert.equal(harness.messages[before].flush, true);
  const other = createRuntimeHarness();
  const area = openBlockEditorWithSource(other);
  area.value = "Typed";
  area.dispatch("input");
  other.flushTimers();
  assert.equal(other.messages.filter((m) => m.type === "previewEditSave").at(-1)?.flush, undefined);
});

test("CR 025: a key typed with surrounding spaces is trimmed on a flush and refused otherwise", () => {
  const open = () => {
    const harness = createRuntimeHarness();
    harness.frontmatterRow.setAttribute("data-okf-type", "text");
    harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify("v"));
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target: harness.frontmatterNameCell,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    const input = harness.createdElements.find((element) => element.tagName === "INPUT");
    assert.ok(input);
    return { harness, input };
  };
  const normal = open();
  normal.input.value = "  renamed ";
  normal.input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(normal.harness).length, 0);
  const flushed = open();
  flushed.input.value = "  renamed ";
  flushed.harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-8" });
  const saves = frontmatterSaves(flushed.harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].newFieldName, "renamed");
  assert.equal(saves[0].flush, true);
});

// CR 041: an editor that disappears in CI must say why. The page keeps a small trace of editor
// events (test diagnostics only) and the value control keeps Cmd/Ctrl+A to itself.
function traceOf(harness: ReturnType<typeof createRuntimeHarness>): Array<{ event: string; detail?: string; stack?: string }> {
  const diagnostics = harness.window.__studioDiagnostics as { trace(): Array<{ event: string; detail?: string }> } | undefined;
  assert.ok(diagnostics, "the page exposes its diagnostics");
  return diagnostics.trace();
}

test("CR 041: the trace records the open, the blur and why the unchanged frontmatter editor closed", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.dispatch("blur", { relatedTarget: null });
  const events = traceOf(harness);
  const names = events.map((entry) => entry.event);
  assert.equal(names[0], "page");
  assert.ok(names.includes("frontmatter editor opened"), JSON.stringify(names));
  const blur = names.indexOf("frontmatter control blur");
  const closed = events.findIndex((entry) => entry.event === "frontmatter editor closed");
  assert.ok(blur >= 0 && closed > blur, JSON.stringify(names));
  assert.match(events[closed]?.detail ?? "", /^save of an unchanged value field=\S+ active=\S+ pageFocus=\S+$/u);
});

test("CR 041: Cmd/Ctrl+A in the frontmatter value control stops at the document; other keys go on", () => {
  for (const [platform, modifier] of [[undefined, { ctrlKey: true }], ["MacIntel", { metaKey: true }]] as const) {
    const harness = createRuntimeHarness(platform === undefined ? {} : { platform });
    harness.frontmatterRow.setAttribute("data-okf-type", "text");
    harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify("Alpha"));
    openFrontmatterValueEditor(harness);
    const control = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
    assert.ok(control, "the text field opens a textarea");
    let stopped = 0;
    const key = (event: Record<string, unknown>): void => harness.dispatchDocument("keydown", {
      target: control, preventDefault: noop, stopPropagation: () => { stopped += 1; }, ...event,
    });
    key({ key: "a", ...modifier });
    assert.equal(stopped, 1, `${platform ?? "Linux"}: select-all stays in the control`);
    key({ key: "b", ...modifier });
    key({ key: "a" });
    assert.equal(stopped, 1, "other keys keep reaching VS Code");
    assert.ok(traceOf(harness).some((entry) => entry.event === "select-all kept in control"));
  }
});

test("CR 041: Tab handled by the table cell editor stops at the document; Ctrl+Tab goes on", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  let stopped = 0;
  // The browser's bubbling order: the control's own listener, then the document's.
  const key = (event: Record<string, unknown>): void => {
    const control = input();
    let prevented = false;
    const keydown = {
      target: control,
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped += 1; },
      ...event,
    };
    control.dispatch("keydown", keydown);
    harness.dispatchDocument("keydown", { ...keydown, defaultPrevented: prevented });
  };
  key({ key: "Tab" });
  assert.equal(input().value, "y", "the page moved to the next cell");
  assert.equal(stopped, 1, "the workbench never receives the Tab the page used");
  key({ key: "Tab", ctrlKey: true });
  assert.equal(stopped, 1, "Ctrl+Tab (VS Code's editor switch) still reaches the workbench");
  assert.ok(traceOf(harness).some((entry) => entry.event === "editor key kept in page"
    && /^Tab in textarea /u.test(entry.detail ?? "")), JSON.stringify(traceOf(harness)));
});

test("CR 041: the trace records the cell editor opening and getting the focus, on a known clock", () => {
  const harness = createRuntimeHarness();
  openTableCellEditorForTab(harness);
  const events = traceOf(harness);
  const opened = events.findIndex((entry) => entry.event === "cell editor opened");
  const focused = events.findIndex((entry) => entry.event === "cell editor focused");
  assert.ok(opened >= 0 && focused > opened, JSON.stringify(events));
  assert.match(events[opened]?.detail ?? "", /^line=20 row=1 column=0 active=\S+ pageFocus=\S+$/u);
  assert.match(events[focused]?.detail ?? "", /^line=20 row=1 column=0 active=\S+ pageFocus=\S+$/u);
  const diagnostics = harness.window.__studioDiagnostics as { startedAt?: () => number } | undefined;
  assert.equal(typeof diagnostics?.startedAt?.(), "number", "the trace's wall-clock start is exposed");
});

test("CR 041: the page echoes the seq of the properties table it applied, also after a deferral", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.dispatchMessage(propertiesMessage(cellMarkup("first"), { seq: 3 }));
  assert.equal(harness.documentElement.getAttribute("data-okf-properties-seq"), "3");
  openFrontmatterValueEditor(harness);
  harness.dispatchMessage(propertiesMessage(cellMarkup("second"), { seq: 4 }));
  assert.equal(harness.documentElement.getAttribute("data-okf-properties-seq"), "3", "deferred while editing");
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.frontmatterValueCell, preventDefault: noop });
  assert.equal(harness.documentElement.getAttribute("data-okf-properties-seq"), "4", "applied on close");
});
