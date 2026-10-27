import * as assert from "node:assert/strict";
import { test } from "node:test";

import { pageLiveStateMessages, type PageIdentity } from "../../src/core/preview/pageLiveState";
import { PREVIEW_THEME_CSS } from "../../src/core/preview/previewStyles";
import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import { noop, overlayMessage, pendingOverlays } from "./runtimeTestSupport";

/**
 * Checkboxes, editor pairing, the edit-mode toggle, the pending overlay and the toolbar view
 * controls (features/checkboxes.ts, editMode.ts, statusRegion.ts; modules/viewControls.ts,
 * widthMode.ts, historyControls.ts).
 */

interface ClickEvent {
  target: RuntimeElement;
  defaultPrevented: boolean;
  immediatePropagationStopped: boolean;
  preventDefault(): void;
  stopImmediatePropagation(): void;
}

function clickEvent(target: RuntimeElement): ClickEvent {
  return {
    target,
    defaultPrevented: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-021
test("clicking a checkbox posts a source toggle instead of revealing the block", () => {
  const harness = createRuntimeHarness();
  const messageCount = harness.messages.length;
  harness.checkbox.checked = true; // the browser flips the box before dispatching the click
  const event = clickEvent(harness.checkbox);
  harness.dispatchDocument("click", event);

  assert.equal(event.defaultPrevented, false);
  assert.equal(event.immediatePropagationStopped, true);
  const posted = harness.messages.slice(messageCount);
  assert.deepEqual(posted.map((message) => message.type), ["previewCheckboxToggle"]);
  assert.equal(posted[0].line, 51);
  assert.equal(posted[0].endLine, 51);
  assert.equal(posted[0].column, 2);
  assert.equal(posted[0].checked, true);
  assert.equal(posted[0].revision, 7);
  assert.equal(harness.checkbox.getAttribute("aria-busy"), "true");

  harness.dispatchMessage({
    type: "previewCheckboxResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: posted[0].editId,
    saved: true,
  });
  assert.equal(harness.checkbox.getAttribute("aria-busy"), null);
  assert.equal(harness.checkbox.checked, true);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-021
test("a rejected checkbox toggle reverts the box and explains why", () => {
  const harness = createRuntimeHarness();
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", clickEvent(harness.checkbox));
  harness.dispatchMessage({
    type: "previewCheckboxResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    error: "The preview is out of date. Try again once it has refreshed.",
  });
  assert.equal(harness.checkbox.checked, false);
  assert.equal(harness.checkbox.getAttribute("aria-busy"), null);
  assert.match(harness.checkbox.getAttribute("title") ?? "", /out of date/u);
  const note = harness.checkbox.insertedElements.at(-1)!;
  assert.equal(note.className, "myst-checkbox-refusal");
  assert.equal(note.getAttribute("role"), "status");
  assert.match(note.textContent, /out of date/u);
  assert.equal(note.parentElement, harness.checkbox.parentElement);
  harness.advanceTimers(6000);
  assert.equal(note.parentElement, undefined);
});

test("in edit mode a checkbox click toggles the box without opening a block editor", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const messageCount = harness.messages.length;
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", clickEvent(harness.checkbox));
  assert.deepEqual(harness.messages.slice(messageCount).map((message) => message.type), ["previewCheckboxToggle"]);
  assert.equal(
    harness.createdElements.some((element) => element.getAttribute("data-sphinx-preview-block-editor") !== null),
    false,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("a checkbox click is refused while a block editor is open", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const messageCount = harness.messages.length;
  harness.checkbox.checked = true;
  const event = clickEvent(harness.checkbox);
  harness.dispatchDocument("click", event);
  assert.equal(event.defaultPrevented, true, "the browser must undo the visual toggle");
  assert.equal(harness.messages.length, messageCount);
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.match(status?.textContent ?? "", /before toggling a checkbox/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("checkboxes are disabled when the preview cannot edit the document", () => {
  const harness = createRuntimeHarness({ editingEnabled: false, readOnlyReason: "Reason from the host." });
  assert.equal(harness.checkbox.disabled, true);
  assert.equal(harness.checkbox.getAttribute("title"), "Reason from the host.");
  const messageCount = harness.messages.length;
  const event = clickEvent(harness.checkbox);
  harness.dispatchDocument("click", event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(harness.messages.length, messageCount);
});

const NO_EDITOR_TOOLTIP = "No text editor shows this file";

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-120
test("T38: an unpaired preview disables the anchor button and a previewPairing message re-enables it", () => {
  const harness = createRuntimeHarness({ pairedTextEditor: false });
  assert.equal(harness.anchorButton.disabled, true);
  for (const name of ["title", "data-tooltip", "aria-label"]) {
    assert.equal(harness.anchorButton.getAttribute(name), NO_EDITOR_TOOLTIP);
  }
  harness.dispatchMessage({
    type: "previewPairing",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    pairedTextEditor: true,
  });
  assert.equal(harness.anchorButton.disabled, false);
  assert.equal(harness.anchorButton.getAttribute("title"), "Preview and text editor scroll together");
  harness.dispatchMessage({
    type: "previewPairing",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    pairedTextEditor: false,
  });
  assert.equal(harness.anchorButton.disabled, true);
  assert.equal(harness.anchorButton.getAttribute("title"), NO_EDITOR_TOOLTIP);
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-016
test("a page whose pairing and theme messages were lost while it loaded gets both from the host's answer to its ready report", () => {
  // The page loaded with the context of a render made before a text editor showed the file. The
  // host's previewPairing and themeChanged reached the document before its runtime listened (VS
  // Code delivers queued messages a fixed delay after writing the document), so the page never saw
  // them: this harness never dispatches them.
  const harness = createRuntimeHarness({ pairedTextEditor: false });
  assert.equal(harness.anchorButton.disabled, true);
  const ready = harness.messages.find((message) => message.type === "previewReady") as PageIdentity | undefined;
  assert.ok(ready, "the page reports ready once it listens");
  for (const message of pageLiveStateMessages(ready, { pairedTextEditor: true, themeKind: 2 })) {
    harness.dispatchMessage(message);
  }
  assert.equal(harness.anchorButton.disabled, false);
  assert.equal(harness.anchorButton.getAttribute("title"), "Preview and text editor scroll together");
  assert.equal(harness.anchorButton.getAttribute("aria-label"), "Anchor preview to text editor");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme"), "2");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-122
test("T38: a paired preview keeps the anchor button enabled, and a foreign previewPairing is ignored", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.anchorButton.disabled, false);
  harness.dispatchMessage({
    type: "previewPairing",
    documentId: "file:///other.md",
    revision: 7,
    requestId: 11,
    pairedTextEditor: false,
  });
  assert.equal(harness.anchorButton.disabled, false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-170
test("T38: edit mode starts from the workspace choice unless the webview has saved state", () => {
  const remembered = createRuntimeHarness({ initialEditMode: true });
  assert.equal(remembered.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "on");
  assert.equal(remembered.editModeButton.getAttribute("aria-pressed"), "true");

  const saved = createRuntimeHarness({ initialEditMode: true, savedState: { editMode: false } });
  assert.equal(saved.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");

  const plain = createRuntimeHarness();
  assert.equal(plain.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("T38: a read-only preview never starts in edit mode", () => {
  const harness = createRuntimeHarness({ initialEditMode: true, editingEnabled: false });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("a greyed Edit button does nothing and says why (untrusted or no workspace folder)", () => {
  const untrusted = createRuntimeHarness({ initialEditMode: true, editingEnabled: false });
  untrusted.editModeButton.dispatch("click");
  assert.equal(untrusted.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");
  assert.equal(untrusted.editModeButton.getAttribute("aria-pressed"), null);
  assert.equal(
    untrusted.editModeButton.getAttribute("data-tooltip"),
    "Editing is unavailable: this file is not in a trusted workspace",
  );
  const noFolder = createRuntimeHarness({
    editingEnabled: false,
    readOnlyReason: "Editing needs the file's folder opened as a workspace folder in VS Code.",
  });
  assert.equal(
    noFolder.editModeButton.getAttribute("title"),
    "Editing is unavailable: this file is not in a folder opened in the VS Code workspace",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-001
test("T38: toggling edit mode posts previewEditModeChanged", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const on = harness.messages.filter((message) => message.type === "previewEditModeChanged").at(-1);
  assert.equal(on?.editMode, true);
  assert.equal(on?.documentId, "file:///active.md");
  harness.editModeButton.dispatch("click");
  const off = harness.messages.filter((message) => message.type === "previewEditModeChanged").at(-1);
  assert.equal(off?.editMode, false);
});

test("T43: the pending overlay message creates one overlay, outside the content", () => {
  const harness = createRuntimeHarness();
  const contentBefore = [...harness.previewContent.childElements];
  harness.dispatchMessage(overlayMessage());
  const overlays = pendingOverlays(harness);
  assert.equal(overlays.length, 1);
  const overlay = overlays[0]!;
  assert.equal(overlay.getAttribute("role"), "status");
  assert.equal(overlay.getAttribute("aria-live"), "polite");
  assert.equal(overlay.parentElement, harness.body);
  assert.equal(overlay.childElements[0]?.tagName, "STRONG");
  assert.equal(overlay.childElements[0]?.textContent, "Preview pending");
  assert.equal(overlay.childElements[1]?.tagName, "SPAN");
  assert.equal(overlay.childElements[1]?.textContent, "Rendering the active buffer.");
  assert.deepEqual(harness.previewContent.childElements, contentBefore, "content children are unchanged");
  assert.equal(harness.previewContent.insertedElements.length, 0);
});

test("T43: a second pending overlay message updates the overlay instead of duplicating it", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage());
  harness.dispatchMessage(overlayMessage({ message: "Waiting for the latest edit." }));
  const overlays = pendingOverlays(harness);
  assert.equal(overlays.length, 1);
  assert.equal(overlays[0]!.childElements[1]?.textContent, "Waiting for the latest edit.");
});

test("T43: visible false removes the pending overlay", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage());
  harness.dispatchMessage(overlayMessage({ visible: false }));
  assert.equal(pendingOverlays(harness).length, 0);
  // Showing it again after a removal creates a fresh one.
  harness.dispatchMessage(overlayMessage());
  assert.equal(pendingOverlays(harness).length, 1);
});

test("T43: invalid or foreign pending overlay messages are ignored", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage({ requestId: 12 }));
  harness.dispatchMessage(overlayMessage({ revision: 8 }));
  harness.dispatchMessage(overlayMessage({ visible: "yes" }));
  harness.dispatchMessage(overlayMessage({ label: 3 }));
  harness.dispatchMessage(overlayMessage({ message: undefined }));
  harness.dispatchMessage(overlayMessage({ label: "x".repeat(501) }));
  assert.equal(pendingOverlays(harness).length, 0);
  harness.dispatchMessage(overlayMessage());
  harness.dispatchMessage(overlayMessage({ requestId: 12, visible: false }));
  harness.dispatchMessage(overlayMessage({ visible: 0 }));
  assert.equal(pendingOverlays(harness).length, 1, "invalid hides do not remove the overlay");
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-038
// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
test("T08: zoom buttons set the zoom variable, post the preference and keep the state", () => {
  const harness = createRuntimeHarness();
  const root = harness.documentElement;
  assert.equal(root.style.getPropertyValue("--sphinx-preview-zoom"), "1");
  assert.equal(root.getAttribute("data-sphinx-preview-zoom"), "100");
  assert.equal(harness.zoomInButton.getAttribute("data-tooltip"), "Zoom in (110 %)");
  assert.equal(harness.zoomOutButton.getAttribute("data-tooltip"), "Zoom out (90 %)");

  const before = harness.messages.length;
  harness.zoomInButton.dispatch("click");
  assert.equal(root.style.getPropertyValue("--sphinx-preview-zoom"), "1.1");
  assert.equal(root.getAttribute("data-sphinx-preview-zoom"), "110");
  assert.equal(harness.zoomOutButton.getAttribute("data-tooltip"), "Zoom out (100 %)");
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].preference, "zoom");
  assert.equal(posted[0].value, 110);
  assert.equal(posted[0].documentId, "file:///active.md");
  assert.equal(harness.getWebviewState().viewZoom, 110);
  harness.zoomOutButton.dispatch("click");
  harness.zoomOutButton.dispatch("click");
  assert.equal(root.getAttribute("data-sphinx-preview-zoom"), "90");
  assert.equal(harness.messages.at(-1)?.value, 90);
});

test("T08: the zoom limits disable the buttons and post nothing more", () => {
  const low = createRuntimeHarness({ initialViewPreferences: { zoom: 80, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false } });
  assert.equal(low.zoomOutButton.disabled, false);
  low.zoomOutButton.dispatch("click");
  assert.equal(low.documentElement.getAttribute("data-sphinx-preview-zoom"), "70");
  assert.equal(low.zoomOutButton.disabled, true);
  assert.equal(low.zoomInButton.disabled, false);
  const count = low.messages.length;
  low.zoomOutButton.dispatch("click");
  assert.equal(low.documentElement.getAttribute("data-sphinx-preview-zoom"), "70");
  assert.equal(low.messages.length, count);

  const high = createRuntimeHarness({ initialViewPreferences: { zoom: 200, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false } });
  assert.equal(high.zoomInButton.disabled, true);
  assert.equal(high.zoomOutButton.disabled, false);
  assert.equal(high.documentElement.style.getPropertyValue("--sphinx-preview-zoom"), "2");
});

test("T08: saved webview state wins over the initial context", () => {
  const harness = createRuntimeHarness({
    initialViewPreferences: { zoom: 150, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
    savedState: { viewZoom: 120 },
  });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-zoom"), "120");
  const initialOnly = createRuntimeHarness({
    initialViewPreferences: { zoom: 150, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  assert.equal(initialOnly.documentElement.getAttribute("data-sphinx-preview-zoom"), "150");
});

function widthModeFixture(initial?: string) {
  const harness = createRuntimeHarness(initial
    ? { initialViewPreferences: { zoom: 100, widthMode: initial as "auto", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false } }
    : {});
  harness.previewContent.clientWidth = 700;
  harness.documentElement.clientWidth = 1000;
  const make = (tag: string, scrollWidth: number): RuntimeElement => {
    const element = new RuntimeElement({}, harness.windowState, 0, 40, tag);
    element.scrollWidth = scrollWidth;
    harness.previewContent.appendChild(element);
    return element;
  };
  return { harness, wide: make("table", 900), small: make("table", 400), huge: make("pre", 1600) };
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-020
test("T10: the width button cycles margin, auto, full width and posts widthMode", () => {
  const { harness } = widthModeFixture();
  const root = harness.documentElement;
  assert.equal(root.getAttribute("data-sphinx-preview-width"), "margin");
  assert.equal(harness.widthButton.getAttribute("aria-label"), "Width: Margin");
  const before = harness.messages.length;
  const seen: string[] = [];
  for (let click = 0; click < 3; click += 1) {
    harness.widthButton.dispatch("click");
    seen.push(String(root.getAttribute("data-sphinx-preview-width")));
  }
  assert.deepEqual(seen, ["auto", "full", "margin"]);
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.deepEqual(posted.map((m) => [m.preference, m.value]),
    [["widthMode", "auto"], ["widthMode", "full"], ["widthMode", "margin"]]);
  assert.equal(posted[0].documentId, "file:///active.md");
  harness.widthButton.dispatch("click");
  assert.equal(harness.widthButton.getAttribute("aria-label"), "Width: Auto");
  assert.equal(harness.widthButton.getAttribute("data-tooltip"), "Width: Auto");
  harness.widthButton.dispatch("click");
  assert.equal(harness.widthButton.getAttribute("aria-label"), "Width: Full width");
  assert.equal(harness.getWebviewState().viewWidthMode, "full");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("T10: only elements wider than the column are flagged, and only in Auto", () => {
  const { harness, wide, small, huge } = widthModeFixture();
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), null, "margin: nothing flagged");
  harness.widthButton.dispatch("click");
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), "");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout"), "200px");
  assert.equal(small.getAttribute("data-sphinx-preview-wide"), null);
  // Never wider than the pane minus a 16 px gutter on each side.
  assert.equal(huge.style.getPropertyValue("--sphinx-preview-breakout"), "268px");
  harness.widthButton.dispatch("click");
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), null, "full: cleared");
  harness.widthButton.dispatch("click");
  harness.widthButton.dispatch("click");
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), "");
  harness.widthButton.dispatch("click");
  assert.equal(huge.getAttribute("data-sphinx-preview-wide"), null);
});

test("T10b: a wide element is centred on the available area, not on the column", () => {
  const { harness, wide, huge } = widthModeFixture();
  // The column starts 120 px right of the pane edge, so it is 30 px off the pane centre (500).
  harness.previewContent.rectProvider = () => ({ top: 0, height: 100, left: 120, width: 700 });
  harness.widthButton.dispatch("click");
  // column centre 470, available-area centre 500: shift 30.
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout-shift"), "30px");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout"), "200px");
  assert.equal(huge.style.getPropertyValue("--sphinx-preview-breakout"), "268px");
});

test("T10b: with the TOC open the available area, its centre and the cap exclude the TOC column", () => {
  const harness = createRuntimeHarness({
    tocReserve: 256,
    initialViewPreferences: { zoom: 100, widthMode: "auto", toc: true, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  harness.previewContent.clientWidth = 400;
  harness.documentElement.clientWidth = 1000;
  harness.previewContent.rectProvider = () => ({ top: 0, height: 100, left: 100, width: 400 });
  const table = new RuntimeElement({}, harness.windowState, 0, 40, "table");
  table.scrollWidth = 1600;
  harness.previewContent.appendChild(table);
  harness.dispatchWindow("resize");
  harness.flushFrames();
  // available = 1000 - 256 - 32 = 712 -> breakout 312; centre (1000 - 256) / 2 = 372 vs column 300.
  assert.equal(table.style.getPropertyValue("--sphinx-preview-breakout"), "312px");
  assert.equal(table.style.getPropertyValue("--sphinx-preview-breakout-shift"), "72px");
});

test("T10b: a narrow element is not flagged and the shift is cleared outside Auto", () => {
  const { harness, wide, small } = widthModeFixture();
  harness.previewContent.rectProvider = () => ({ top: 0, height: 100, left: 150, width: 700 });
  harness.widthButton.dispatch("click");
  assert.equal(small.getAttribute("data-sphinx-preview-wide"), null);
  assert.equal(small.style.getPropertyValue("--sphinx-preview-breakout-shift"), "");
  harness.widthButton.dispatch("click");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout-shift"), "");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-022
test("T10b: a paragraph holding only an image is marked as a figure in every width mode", () => {
  const { harness } = widthModeFixture();
  const paragraph = new RuntimeElement({}, harness.windowState, 0, 40, "p");
  const image = new RuntimeElement({}, harness.windowState, 0, 40, "img");
  paragraph.appendChild(image);
  harness.previewContent.appendChild(paragraph);
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(paragraph.getAttribute("data-sphinx-preview-figure"), "", "margin");
  harness.widthButton.dispatch("click");
  assert.equal(paragraph.getAttribute("data-sphinx-preview-figure"), "", "auto");
});

test("T10b: a wide table gets its fractional max-content width rounded up, so no cell wraps", () => {
  const { harness, wide } = widthModeFixture();
  // scrollWidth is an integer (900); the real box is 900.4 px wide: 900 px would squeeze the cells.
  wide.rectProvider = () => ({ top: 0, height: 40, left: 0, width: 900.4 });
  harness.widthButton.dispatch("click");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout"), "201px");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("T10b: a table with row handles keeps their room left of it when it breaks out", () => {
  const { harness, wide } = widthModeFixture();
  wide.scrollWidth = 1600;
  wide.setAttribute("data-okf-row-handles", "true");
  harness.widthButton.dispatch("click");
  // available = 1000 - 2 * 34 = 932 -> breakout 232, so the table starts 34 px from the pane edge.
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout"), "232px");
});

test("T10: the saved width mode applies at startup and an edited element keeps the column", () => {
  const { harness, wide } = widthModeFixture("auto");
  harness.dispatchMessage({ type: "noop" });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-width"), "auto");
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), "");
  wide.setAttribute("data-sphinx-preview-editing", "true");
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), null);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-054
test("T11: Back and Next post previewHistoryGo and follow previewHistoryState", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: true, canForward: false });
  assert.equal(harness.backButton.disabled, false);
  assert.equal(harness.nextButton.disabled, true);
  const before = harness.messages.length;
  harness.backButton.dispatch("click");
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewHistoryGo");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].direction, "back");
  assert.equal(posted[0].documentId, "file:///active.md");
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: false, canForward: true });
  assert.equal(harness.backButton.disabled, true);
  assert.equal(harness.nextButton.disabled, false);
  harness.nextButton.dispatch("click");
  assert.equal(harness.messages.at(-1)?.direction, "forward");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-156
test("T15: previewShowComments sets the show-comments attribute of the page, stale ids are ignored", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "true");
  harness.dispatchMessage({ type: "previewShowComments", ...ids, showComments: false });
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "false");
  harness.dispatchMessage({ type: "previewShowComments", ...ids, requestId: 3, showComments: true });
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "false");
  harness.dispatchMessage({ type: "previewShowComments", ...ids, showComments: true });
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-207
test("T16: previewIncomingChanges marks blocks and reports enabled, stale ids are ignored", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), null);
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, requestId: 3, enabled: false, ranges: [] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), null);
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, enabled: false, ranges: [] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), "false");
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, enabled: true, ranges: [{ start: 1, end: 2 }] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), "true");
});

test("T17: the Diff button flips the marks, posts the preference and keeps the state", () => {
  const harness = createRuntimeHarness();
  const root = harness.documentElement;
  assert.equal(root.getAttribute("data-sphinx-preview-incoming"), "on");
  assert.equal(harness.diffButton.getAttribute("aria-pressed"), "true");
  assert.equal(harness.diffButton.getAttribute("data-tooltip"), "Hide changes since last commit");
  const before = harness.messages.length;
  harness.diffButton.dispatch("click");
  assert.equal(root.getAttribute("data-sphinx-preview-incoming"), "off");
  assert.equal(harness.diffButton.getAttribute("aria-pressed"), "false");
  assert.equal(harness.diffButton.getAttribute("title"), "Show changes since last commit");
  assert.equal(harness.diffButton.getAttribute("data-tooltip"), "Show changes since last commit");
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].preference, "incomingChanges");
  assert.equal(posted[0].value, false);
  assert.equal(posted[0].documentId, "file:///active.md");
  assert.equal(harness.getWebviewState().viewIncomingChanges, false);
  harness.diffButton.dispatch("click");
  assert.equal(root.getAttribute("data-sphinx-preview-incoming"), "on");
  assert.equal(harness.messages.at(-1)?.value, true);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-214
test("T17: the initial preference and the saved webview state decide the pressed state", () => {
  const off = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: false, comments: true, toolbarCollapsed: false },
  });
  assert.equal(off.documentElement.getAttribute("data-sphinx-preview-incoming"), "off");
  assert.equal(off.diffButton.getAttribute("aria-pressed"), "false");
  const saved = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: false, comments: true, toolbarCollapsed: false },
    savedState: { viewIncomingChanges: true },
  });
  assert.equal(saved.documentElement.getAttribute("data-sphinx-preview-incoming"), "on");
});

test("the Comments toggle is installed with the page: on by default, off from the saved preference", () => {
  const on = createRuntimeHarness();
  assert.equal(on.documentElement.getAttribute("data-sphinx-preview-comments"), "on");
  const off = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: false, toolbarCollapsed: false },
  });
  assert.equal(off.documentElement.getAttribute("data-sphinx-preview-comments"), "off");
  const saved = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: false, toolbarCollapsed: false },
    savedState: { viewComments: true },
  });
  assert.equal(saved.documentElement.getAttribute("data-sphinx-preview-comments"), "on");
});

test("T17: the Diff button is hidden through the document attribute when the setting is off", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, enabled: false, ranges: [] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), "false");
  assert.match(PREVIEW_THEME_CSS,
    /html\[data-okf-incoming-changes="false"\] \[data-sphinx-preview-diff-toggle\] \{\s*display: none;/u);
  assert.match(PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-incoming="off"\] \[data-sphinx-preview-change-layer\] \{\s*display: none;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-007
test("P8: the collapse button hides rows 2-3, posts the preference and keeps the state", () => {
  // A workspace that stored the expanded toolbar (the fresh default is collapsed).
  const harness = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  const button = harness.collapseButton;
  assert.equal(harness.moreRows.hidden, false, "expanded as stored");
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(button.getAttribute("aria-label"), "Hide view controls");
  assert.equal(button.getAttribute("title"), "Hide view controls");
  const before = harness.messages.length;
  button.dispatch("click");
  assert.equal(harness.moreRows.hidden, true);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(button.getAttribute("aria-label"), "Show view controls");
  assert.equal(button.getAttribute("data-tooltip"), "Show view controls");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "collapsed");
  // The root attribute must never match the `[data-sphinx-preview-toolbar]` selector of the toolbar itself.
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-toolbar"), null);
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].preference, "toolbarCollapsed");
  assert.equal(posted[0].value, true);
  assert.equal(harness.getWebviewState().viewToolbarCollapsed, true);
  button.dispatch("click");
  assert.equal(harness.moreRows.hidden, false);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(harness.messages.at(-1)?.value, false);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "expanded");
});

test("P8: the stored preference and the saved webview state decide the collapsed state", () => {
  const stored = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
  });
  assert.equal(stored.moreRows.hidden, true);
  assert.equal(stored.collapseButton.getAttribute("aria-expanded"), "false");
  const saved = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
    savedState: { viewToolbarCollapsed: false },
  });
  assert.equal(saved.moreRows.hidden, false);
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-001
test("fresh workspace: the toolbar starts collapsed and the preview theme starts in cream", () => {
  const fresh = createRuntimeHarness();
  assert.equal(fresh.moreRows.hidden, true, "rows 2 and 3 are hidden without a stored choice");
  assert.equal(fresh.collapseButton.getAttribute("aria-expanded"), "false");
  assert.equal(fresh.collapseButton.getAttribute("aria-label"), "Show view controls");
  assert.equal(fresh.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "collapsed");
  assert.equal(fresh.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "cream");
  assert.equal(fresh.themeButton.getAttribute("data-theme-mode"), "cream");
  assert.equal(fresh.themeButton.getAttribute("aria-label"), "Preview theme: Cream theme");
  assert.equal(fresh.themeButton.getAttribute("data-tooltip"), "Cream theme (click for current theme)");
  // Nothing is posted: the defaults are not stored as if the user had chosen them.
  assert.deepEqual(fresh.messages.filter((message) =>
    message.type === "previewThemeModeChanged" || message.type === "previewViewPreferenceChanged"), []);
});

test("stored choice wins: a stored expanded toolbar and a stored theme mode are kept", () => {
  for (const mode of ["current", "dark", "white"] as const) {
    const stored = createRuntimeHarness({
      initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
    }, undefined, mode);
    assert.equal(stored.moreRows.hidden, false, mode);
    assert.equal(stored.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "expanded");
    assert.equal(stored.documentElement.getAttribute("data-sphinx-preview-theme-mode"), mode);
  }
  // The webview state of a restored panel wins over the fresh default too.
  const restored = createRuntimeHarness({ savedState: { viewToolbarCollapsed: false } }, "white");
  assert.equal(restored.moreRows.hidden, false);
  assert.equal(restored.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "white");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-056
test("T11: a previewHistoryState of another document version is ignored", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage({
    type: "previewHistoryState", documentId: "file:///active.md", revision: 99, requestId: 11,
    canBack: true, canForward: true,
  });
  assert.equal(harness.backButton.disabled, true);
  assert.equal(harness.nextButton.disabled, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-040
test("T13: a state snapshot keeps the TOC visibility and the folded sections", () => {
  const harness = createRuntimeHarness({
    viewportWidth: 900,
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: true, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  harness.dispatchDocument("click", { target: harness.descriptionButton });
  const state = harness.getWebviewState();
  assert.equal(state.viewToc, true);
  assert.equal((state.tocCollapsed as string[]).length, 0);
  assert.equal(state.viewZoom, 100);
});
