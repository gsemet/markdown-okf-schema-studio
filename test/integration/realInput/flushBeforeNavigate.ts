import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import {
  getActivePreviewForTests,
  previewGroupFocusMovesForTests,
} from "../extensionApi";
import {
  bufferText,
  closeAllEditors,
  createFixture,
  type Evidence,
  findCurrentFrame,
  focusedCaret,
  htmlAssignmentCount,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
  writeSchema,
} from "./harness";
import { captureAfter, leaveEditModeOff } from "./common";
import { REQ_SCHEMA } from "./textEditing";
import { run } from "./run";

const FLUSH_FIRST = [
  "---",
  "type: req",
  "title: Flush title",
  "count: 3",
  "meta:",
  "  a: 1",
  "---",
  "",
  "# First",
  "",
  "Go to [the second note](second.md).",
  "",
  "Typed target paragraph.",
  "",
  "| Name | Value |",
  "|------|-------|",
  "| alpha | one |",
  "",
].join("\n");

const FLUSH_SECOND = ["# Second", "", "Second body.", "", "Back to [the first note](first.md).", ""].join("\n");

async function withFlushDocuments(
  prefix: string,
  scenario: (first: vscode.TextDocument, second: vscode.TextDocument) => Promise<void>,
): Promise<void> {
  const fixture = createFixture(prefix, { "first.md": FLUSH_FIRST, "second.md": FLUSH_SECOND });
  try {
    writeSchema(fixture.directory, "req", REQ_SCHEMA + "  count:\n    type: number\n  meta:\n    type: object\n");
    const first = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("first.md")));
    const second = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("second.md")));
    try {
      await scenario(first, second);
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

async function waitForPreviewOf(document: vscode.TextDocument): Promise<void> {
  await waitFor(`the preview to show ${path.basename(document.uri.fsPath)}`, () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString() && preview.phase === "ready";
  });
}

async function waitForNoOpenEditor(page: Page): Promise<void> {
  await waitFor("no editor to be open in the preview", async () => {
    const current = await findCurrentFrame(page);
    return current !== undefined
      && await current.locator("[data-sphinx-preview-block-editor], [data-okf-frontmatter-editor]").count() === 0;
  });
}

/** Opens the editor of the block with `text` and types ` Added.` without waiting for the autosave. */
async function typeIntoBlock(page: Page, selector: string, text: string | RegExp): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.locator(selector).filter({ hasText: text }).first().click());
  await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
  await press(page, "End");
  await typeText(page, " Added.", 5);
}

/**
 * Activates an element of the preview without moving the focus: a pointer click would blur the text
 * box first and the blur commit would save the text, hiding the race this CR is about. The click
 * event reaches the page handlers (link navigation, Back) while the caret stays in the text box.
 */
async function clickWithoutBlur(
  page: Page,
  selector: string,
  options: { hasText?: string; modifier?: boolean } = {},
): Promise<void> {
  await withCurrentFrame(page, async (frame) => {
    const target = frame.locator(selector).filter(options.hasText ? { hasText: options.hasText } : {}).first();
    const focusedBefore = await frame.evaluate(() => window.document.activeElement?.tagName);
    assert.ok(focusedBefore === "TEXTAREA" || focusedBefore === "INPUT", "the caret is in the editor before the click");
    await target.evaluate((element, meta) => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: meta, ctrlKey: !meta }));
    }, process.platform === "darwin");
  });
}

/**
 * Host and page state for a failure message: what the host holds for the current render and
 * what the page shows (focus, the last properties table, its editor trace: see editorTrace.ts).
 */
export async function previewDiagnostics(page: Page): Promise<string> {
  const preview = getActivePreviewForTests();
  const host = preview === undefined ? "no preview" : JSON.stringify({
    document: path.basename(vscode.Uri.parse(preview.documentUri).fsPath),
    phase: preview.phase,
    version: preview.documentVersion,
    requestId: preview.requestId,
    webviewReady: preview.webviewReady,
    deferredWorkPending: preview.deferredWorkPending,
    propertiesTableAwaited: preview.propertiesTableAwaited,
    panelActive: preview.panelActive,
    pageLoads: preview.htmlAssignments,
    contentPatches: preview.contentPatches,
  });
  let shown: string;
  // Focus commands the extension ran on its own (group unlock of a closed preview), with "at" on
  // the page trace's clock: a negative value is before the page started.
  let focusMoves = "";
  try {
    const frame = await findCurrentFrame(page);
    if (frame === undefined) {
      shown = "no current frame";
    } else {
      const state = await frame.evaluate(() => {
        const active = window.document.activeElement;
        const label = active?.getAttribute("aria-label");
        const diagnostics = (window as unknown as {
          __studioDiagnostics?: { trace(): unknown[]; startedAt?: () => number };
        }).__studioDiagnostics;
        return {
          active: active ? active.tagName.toLowerCase() + (label ? `[${label}]` : "") : "none",
          pageFocus: window.document.hasFocus(),
          propertiesSeq: window.document.documentElement.getAttribute("data-okf-properties-seq"),
          startedAt: diagnostics?.startedAt?.(),
          trace: diagnostics ? diagnostics.trace() : "unavailable",
        };
      });
      shown = JSON.stringify(state);
      const startedAt = typeof state.startedAt === "number" ? state.startedAt : 0;
      focusMoves = JSON.stringify(previewGroupFocusMovesForTests(startedAt - 5_000)
        .map((move) => ({ at: move.at - startedAt, command: move.command })));
    }
  } catch (error) {
    shown = `unreadable (${String(error)})`;
  }
  return `host ${host}; page ${shown}${focusMoves === "" ? "" : `; host focus moves ${focusMoves}`}`;
}

/** Runs `action`; a failure carries the host and page diagnostics (previewDiagnostics). */
export async function explained<T>(page: Page, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}; ${await previewDiagnostics(page)}`);
  }
}

/**
 * Waits until nothing can replace the page content under an editor opened now: the host's render
 * is the one of the current buffer version, the page reported ready for it (`webviewReady` is true
 * only when the page echoed the request id of that render), no deferred host update is armed (the
 * link check, the properties refresh, a patch waiting for its acknowledgement, the pending overlay),
 * and the page shows the last properties table the host posted (it echoes the table's seq on
 * `<html data-okf-properties-seq>`; a table posted by a timer that has just fired is otherwise still
 * on its way). Each condition is a state the host or the page reports; none is a delay.
 */
export async function waitForPageSettled(page: Page, label: string, document: vscode.TextDocument): Promise<void> {
  await explained(page, () => waitFor(`${label}: the page to settle on the last render of ${path.basename(document.uri.fsPath)}`, async () => {
    const preview = getActivePreviewForTests();
    if (preview === undefined || preview.documentUri !== document.uri.toString() || preview.phase !== "ready"
      || preview.documentVersion !== document.version || !preview.webviewReady || preview.deferredWorkPending) {
      return false;
    }
    const frame = await findCurrentFrame(page);
    if (frame === undefined) return false;
    return preview.propertiesTableAwaited === undefined
      || await frame.locator("html").getAttribute("data-okf-properties-seq") === String(preview.propertiesTableAwaited);
  }));
}

/**
 * Waits until the control matching `selector` has the caret: it is the page's active element and
 * the page has the focus, so the next key press reaches it.
 */
export async function waitForTextInput(page: Page, selector: string, label: string): Promise<void> {
  await explained(page, () => waitFor(`${label}: ${selector} to have the caret`, async () => {
    const frame = await findCurrentFrame(page);
    return frame !== undefined && await frame.evaluate((query) => {
      const control = window.document.querySelector(query);
      return control !== null && window.document.activeElement === control && window.document.hasFocus();
    }, selector);
  }));
}

/**
 * Cmd/Ctrl+A in the text control matching `selector`, then waits until its whole value is
 * selected. The page keeps the shortcut to the control (selectAllKey.ts): the browser selects the
 * text as the key's default action, with no workbench round trip. The control must have the caret.
 */
export async function selectAllInControl(page: Page, selector: string, label: string): Promise<void> {
  await waitForTextInput(page, selector, label);
  await press(page, `${MOD}+a`);
  await explained(page, () => waitFor(`${label}: the whole value of ${selector} to be selected after ${MOD}+A`, async () => {
    const frame = await findCurrentFrame(page);
    if (frame === undefined) return false;
    if (await frame.locator(selector).count() === 0) throw new Error(`${label}: no ${selector} after ${MOD}+A`);
    const caret = await focusedCaret(frame);
    return caret !== undefined && caret.start === 0 && caret.end === caret.length;
  }));
}

/** CR 025: a link to another file, right after typing. */
export async function scenarioFlushBeforeLink(page: Page, evidence: Evidence): Promise<void> {
  await withFlushDocuments("realinput-cr25a", async (first, second) => {
    await openSidePreview(first);
    await waitForRender(first);
    await setEditMode(page, true);
    await typeIntoBlock(page, "p", "Typed target paragraph.");
    await clickWithoutBlur(page, "a", { hasText: "the second note" });
    await waitFor("the typed text to reach the first document", () =>
      bufferText(first).includes("Typed target paragraph. Added."));
    await waitForPreviewOf(second);
    // Back to the first document: the editor was saved and closed, and is not reopened.
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-back]").click());
    await waitForPreviewOf(first);
    await waitForNoOpenEditor(page);
    assert.equal(bufferText(first), FLUSH_FIRST.replace("Typed target paragraph.", "Typed target paragraph. Added."));
  });
}

/** CR 025: Back across documents, right after typing. */
export async function scenarioFlushBeforeBack(page: Page, evidence: Evidence): Promise<void> {
  await withFlushDocuments("realinput-cr25b", async (first, second) => {
    await openSidePreview(first);
    await waitForRender(first);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator("a", { hasText: "the second note" }).click({ modifiers: [MOD] }));
    await waitForPreviewOf(second);
    await waitForRender(second);
    await typeIntoBlock(page, "p", "Second body.");
    await clickWithoutBlur(page, "[data-sphinx-preview-back]");
    await waitFor("the typed text to reach the second document", () =>
      bufferText(second).includes("Second body. Added."));
    await waitForPreviewOf(first);
    await waitForNoOpenEditor(page);
  });
}

/** CR 025: the preview follows another editor tab, right after typing; the screenshot comes back. */
export async function scenarioFlushBeforeTabSwitch(page: Page, evidence: Evidence): Promise<void> {
  await withFlushDocuments("realinput-cr25c", async (first, second) => {
    await openSidePreview(first);
    await waitForRender(first);
    await setEditMode(page, true);
    await typeIntoBlock(page, "p", "Typed target paragraph.");
    await vscode.window.showTextDocument(second, { viewColumn: vscode.ViewColumn.One, preview: false });
    await waitFor("the typed text to reach the first document", () =>
      bufferText(first).includes("Typed target paragraph. Added."));
    await waitForPreviewOf(second);
    await vscode.window.showTextDocument(first, { viewColumn: vscode.ViewColumn.One, preview: false });
    await waitForPreviewOf(first);
    await waitForRender(first);
    await waitForNoOpenEditor(page);
    assert.equal(bufferText(first), FLUSH_FIRST.replace("Typed target paragraph.", "Typed target paragraph. Added."));
    await captureAfter(evidence, page, "block-editing/r24-flush-before-tab-switch",
      "Edit mode on; ` Added.` was typed in the paragraph and the editor tab was switched at once. "
      + "Coming back, the preview shows `Typed target paragraph. Added.` and no editor is open; the "
      + "source buffer holds the same text.");
  });
}

/** CR 025: a table cell and a frontmatter field, right after typing, then a tab switch. */
export async function scenarioFlushCellAndFrontmatter(page: Page, evidence: Evidence): Promise<void> {
  await withFlushDocuments("realinput-cr25d", async (first, second) => {
    await openSidePreview(first);
    await waitForRender(first);
    await waitForPageSettled(page, "table cell", first);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^one$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await waitForTextInput(page, "[data-sphinx-preview-table-cell-editor] textarea", "table cell");
    await press(page, "End");
    await typeText(page, "1", 5);
    await vscode.window.showTextDocument(second, { viewColumn: vscode.ViewColumn.One, preview: false });
    await explained(page, () => waitFor("the typed cell text to reach the first document", () =>
      /\|\s*alpha\s*\|\s*one1\s*\|/u.test(bufferText(first))));
    await waitForPreviewOf(second);

    await vscode.window.showTextDocument(first, { viewColumn: vscode.ViewColumn.One, preview: false });
    await waitForPreviewOf(first);
    await waitForRender(first);
    await waitForPageSettled(page, "frontmatter title", first);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="title"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea, [data-okf-frontmatter-editor] input");
    await waitForTextInput(page, "[data-okf-frontmatter-editor] textarea, [data-okf-frontmatter-editor] input",
      "frontmatter title");
    await press(page, "End");
    await typeText(page, " more", 5);
    await vscode.window.showTextDocument(second, { viewColumn: vscode.ViewColumn.One, preview: false });
    await explained(page, () => waitFor("the typed title to reach the first document", () =>
      bufferText(first).includes("title: Flush title more")));
    await waitForPreviewOf(second);
  });
}

/**
 * The value of the open frontmatter control matching `selector`, read without the 30 s locator
 * auto-wait: when the editor is gone, the error names the case, the step and the preview state.
 */
async function flushEditorValue(page: Page, selector: string, label: string, step: string): Promise<string> {
  const value = await withCurrentFrame(page, (frame) => frame.evaluate((query) => {
    const control = window.document.querySelector(query) as HTMLInputElement | HTMLTextAreaElement | null;
    return control === null ? null : control.value;
  }, selector));
  if (value === null) {
    throw new Error(`${label}: no ${selector} ${step}; ${await flushFrameState(page)}`);
  }
  return value;
}

/** Full page loads counted when the flush scenario opened its editor (see flushFrameState). */
let reloadsBefore = 0;

/** In-place content patches counted at the same moment: a patch closes an open editor too. */
let patchesBefore = 0;

/** Describes the preview for a flush failure message: which document, edit mode, open editors. */
async function flushFrameState(page: Page): Promise<string> {
  const preview = getActivePreviewForTests();
  const shown = preview
    ? `${path.basename(vscode.Uri.parse(preview.documentUri).fsPath)} (${preview.phase}, page ready `
      + `${String(preview.webviewReady)}, page loads ${preview.htmlAssignments - reloadsBefore}, content patches `
      + `${preview.contentPatches - patchesBefore} since the editor opened)`
    : "none";
  try {
    const frame = await findCurrentFrame(page);
    if (frame === undefined) return `preview ${shown}, no current frame`;
    const state = await frame.evaluate(() => {
      const editor = window.document.querySelector("[data-okf-frontmatter-editor]");
      const control = editor?.querySelector("textarea, input") as HTMLInputElement | HTMLTextAreaElement | null;
      return {
        editMode: window.document.documentElement.getAttribute("data-sphinx-preview-edit-mode"),
        frontmatterEditors: window.document.querySelectorAll("[data-okf-frontmatter-editor]").length,
        blockEditors: window.document.querySelectorAll("[data-sphinx-preview-block-editor]").length,
        value: control?.value,
        disabled: control?.disabled,
        status: editor?.querySelector('[role="status"]')?.textContent ?? undefined,
      };
    });
    return `preview ${shown}, frame ${JSON.stringify(state)}; ${await previewDiagnostics(page)}`;
  } catch (error) {
    return `preview ${shown}, frame unreadable (${String(error)})`;
  }
}

/**
 * CR 025: a frontmatter value typed in the editor and followed by a tab switch is written as typed,
 * even when it is not valid YAML, does not fit the schema or is not a number. The preview then
 * shows the validation error; the text is never lost.
 */
export async function scenarioFlushFrontmatterKeptAsTyped(page: Page, evidence: Evidence): Promise<void> {
  await withFlushDocuments("realinput-cr25e", async (first, second) => {
    const cases: Array<{ field: string; selector: string; typed: string | undefined; expected: RegExp }> = [
      // Invalid YAML in the YAML editor of an object field.
      { field: "meta", selector: "[data-okf-frontmatter-editor] textarea", typed: "[unclosed", expected: /\[unclosed/u },
      // Valid YAML that does not fit the schema (a string for an object).
      { field: "meta", selector: "[data-okf-frontmatter-editor] textarea", typed: "just text", expected: /just text/u },
      // A number field that is emptied: not a number.
      { field: "count", selector: "[data-okf-frontmatter-editor] input", typed: undefined, expected: /^count:\s*(""|'')\s*$/mu },
    ];
    // The preview must exist before the first tab switch: nothing else has opened one in this fixture.
    await openSidePreview(first);
    await waitForRender(first);
    for (const [index, item] of cases.entries()) {
      const label = `case ${index + 1} (${item.field}, typed ${JSON.stringify(item.typed ?? "")})`;
      await vscode.window.showTextDocument(first, { viewColumn: vscode.ViewColumn.One, preview: false });
      await waitForPreviewOf(first);
      await waitForRender(first);
      // The host reports "ready" once the render is done, before the page has loaded it. A deferred
      // update that arrives while the page has not reported ready (the frontmatter link check, about
      // 150 ms after the render) reloads the whole page, and the reload drops an editor opened in
      // the meantime (CI run 39849844386: case 2 clicked right after the switch back, as edit mode
      // was already on). Open the editor only once the page has settled on this render.
      await waitForPageSettled(page, label, first);
      if (!(await withCurrentFrame(page, (frame) => frame.locator("html").getAttribute("data-sphinx-preview-edit-mode")) === "on")) {
        await setEditMode(page, true);
      }
      await withCurrentFrame(page, (frame) =>
        frame.locator(`tr[data-okf-field="${item.field}"] [data-okf-edit-cell="value"]`).click());
      await waitForEditor(page, item.selector);
      await waitForTextInput(page, item.selector, label);
      // Full page loads so far: a failure message shows whether the page was reloaded under the editor.
      reloadsBefore = htmlAssignmentCount();
      patchesBefore = getActivePreviewForTests()?.contentPatches ?? 0;
      if (item.typed === undefined) {
        // The number field is emptied with real keys and no Cmd/Ctrl+A: a number input exposes no
        // text selection to check. (CI run 39831790532 lost this editor after Cmd/Ctrl+A: the same
        // workbench fallback as case 2, see selectAllKey.ts.) End, then one Backspace and one Delete
        // per character, empties it wherever the caret is (macOS can ignore End in an input).
        const length = (await flushEditorValue(page, item.selector, label, "before emptying")).length;
        await press(page, "End");
        for (let key = 0; key < length; key += 1) await press(page, "Backspace");
        for (let key = 0; key < length; key += 1) await press(page, "Delete");
      } else {
        // Case 2 lost its editor here on every CI run since 2026-10-23 07:29Z (39917471008 to
        // 39930593934): the workbench ran Cmd/Ctrl+A on the source editor, which took the focus, and
        // the blur closed the unchanged editor. The page now keeps the shortcut (selectAllKey.ts).
        await selectAllInControl(page, item.selector, label);
        await typeText(page, item.typed, 5);
      }
      // The frontmatter editor saves on blur and Enter only (no timer): reading its value saves nothing.
      const heldValue = await flushEditorValue(page, item.selector, label, "after typing");
      assert.equal(heldValue, item.typed ?? "", `${label}: the editor holds the typed text before the switch`);
      await vscode.window.showTextDocument(second, { viewColumn: vscode.ViewColumn.One, preview: false });
      try {
        await waitFor(`the typed ${item.field} value to reach the first document`, () =>
          item.expected.test(bufferText(first)));
      } catch (error) {
        throw new Error(`${error instanceof Error ? error.message : String(error)} ${label}; `
          + `expected ${String(item.expected)}; ${await flushFrameState(page)}; `
          + `first document starts with ${JSON.stringify(bufferText(first).slice(0, 300))}`);
      }
      await waitForPreviewOf(second);
    }
  });
}
