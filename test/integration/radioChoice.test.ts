/**
 * Real-window test of the radio choice lists: real mouse clicks and keys (dispatched by Playwright
 * through CDP) on a radio group in the Studio preview, checked against the source buffer. A click
 * writes at most two lines and one undo reverts it; a click on the selected option writes nothing;
 * Space and Enter select the focused option; the arrow keys only move the focus.
 */
import * as assert from "node:assert/strict";
import { type Frame, type Locator, type Page } from "playwright-core";
import * as vscode from "vscode";

import { COMMAND_ID, disposeActivePreviewForTests } from "./extensionApi";
import { connectWorkbench, createFixture, currentPreviewFrame, waitFor, waitForRender } from "./realInput/harness";
import { traceDocumentChanges, waitForActiveSourceEditor, windowFocusReport } from "./windowFocus";
import { markProgress } from "../shared/hangWatchdog";
import { bounded } from "./stepWatchdog";

const SOURCE = [
  "# Plan",
  "",
  "Fix direction:",
  "",
  "- (x) A click in the margin around the block opens its editor",
  "- ( ) Alt+click on the link opens the editor",
  "- ( ) Leave as is: edit link-only blocks in the source",
  "",
  "After the choice.",
  "",
].join("\n");

/** SOURCE with the `x` on the option of `line` (5, 6 or 7) only. */
function selected(line: number): string {
  return SOURCE.split("\n").map((text, index) => {
    if (index + 1 < 5 || index + 1 > 7) return text;
    return text.replace(/^- \([ x]\)/u, index + 1 === line ? "- (x)" : "- ( )");
  }).join("\n");
}

function changedLines(before: string, after: string): number[] {
  const right = after.split("\n");
  return before.split("\n").flatMap((line, index) => (line === right[index] ? [] : [index + 1]));
}

function radioAt(frame: Frame, line: number): Locator {
  return frame.locator(`[role="radio"][data-myst-radio-line="${line}"]`);
}

/** The aria-checked state of the three options, as `x` and spaces. */
async function shownSelection(frame: Frame): Promise<string> {
  const states = await frame.locator('[role="radio"]').evaluateAll((radios) =>
    radios.map((radio) => (radio.getAttribute("aria-checked") === "true" ? "x" : " ")));
  return states.join("");
}

/** The source line of the focused radio option, or undefined when no option has the focus. */
async function focusedOption(frame: Frame): Promise<number | undefined> {
  const line = await frame.evaluate(() => document.activeElement?.getAttribute("data-myst-radio-line") ?? null);
  return line === null ? undefined : Number(line);
}

/** Waits for the source to become `expected`, then for the preview to render it. */
async function settle(page: Page, document: vscode.TextDocument, expected: string, description: string): Promise<Frame> {
  await waitFor(description, () => document.getText() === expected);
  await waitForRender(document, (html) => html.includes("myst-radio"));
  return currentPreviewFrame(page);
}

/** The page-side flag set while toggle requests are watched: see `watchToggles`. */
const TOGGLE_WATCH = "__radioToggleWatch";

/**
 * Starts recording, in the preview page, every radio option that becomes busy. The page marks the
 * options of a group `aria-busy="true"` in the same click or key handler that posts the
 * `previewCheckboxToggle` request, so an empty record proves the page sent no request: there is no
 * write to wait for. The record is read by `assertNoWrite`.
 */
async function watchToggles(frame: Frame): Promise<void> {
  await frame.evaluate((key) => {
    const record: string[] = [];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target as Element;
        if (target.getAttribute("role") === "radio" && target.getAttribute("aria-busy") === "true") {
          record.push(target.getAttribute("data-myst-radio-line") ?? "?");
        }
      }
    });
    observer.observe(document, { subtree: true, attributes: true, attributeFilter: ["aria-busy"] });
    (window as unknown as Record<string, unknown>)[key] = { record, observer };
  }, TOGGLE_WATCH);
}

/**
 * Checks that the actions since `watchToggles` posted no toggle request (no option became busy) and
 * that the source is still at `version`. No timer: without a request the host has nothing to write.
 */
async function assertNoWrite(
  frame: Frame,
  document: vscode.TextDocument,
  version: number,
  expected: string,
  what: string,
): Promise<void> {
  const busy = await frame.evaluate((key) => {
    const watch = (window as unknown as Record<string, { record: string[]; observer: MutationObserver }>)[key];
    // Deliver the records of mutations made by the last handler before reading them.
    const pending = watch.observer.takeRecords().filter((mutation) =>
      (mutation.target as Element).getAttribute("aria-busy") === "true");
    watch.observer.disconnect();
    return [...watch.record, ...pending.map((mutation) => (mutation.target as Element).getAttribute("data-myst-radio-line") ?? "?")];
  }, TOGGLE_WATCH);
  assert.deepEqual(busy, [], `${what} must not send a toggle request (options marked busy)`);
  assert.equal(document.version, version, `${what} must not write to the source`);
  assert.equal(document.getText(), expected);
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
export async function run(): Promise<void> {
  const { browser, page } = await bounded("chromium.connectOverCDP to the workbench", connectWorkbench());
  const fixture = createFixture("radio-e2e", { "plan.md": SOURCE });
  const document = await bounded("workspace.openTextDocument of plan.md",
    vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("plan.md"))));
  try {
    await bounded("page.setViewportSize", page.setViewportSize({ width: 1400, height: 900 }));
    await bounded("workbench.action.closeSidebar", vscode.commands.executeCommand("workbench.action.closeSidebar"));
    await bounded("workbench.action.closeAuxiliaryBar", vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar"));
    await bounded("window.showTextDocument of plan.md", vscode.window.showTextDocument(document, vscode.ViewColumn.One));
    await bounded("waitForActiveSourceEditor of plan.md", waitForActiveSourceEditor(document));
    await bounded(`${COMMAND_ID} on plan.md`, vscode.commands.executeCommand(COMMAND_ID));
    markProgress("waiting for the first radio render");
    await waitForRender(document, (html) => html.includes("myst-radio"));
    let frame = await currentPreviewFrame(page);

    assert.equal(await frame.locator('[role="radiogroup"]').count(), 1);
    assert.equal(await frame.locator('[role="radio"]').count(), 3);
    assert.equal(await shownSelection(frame), "x  ");

    // A click on an unselected option moves the x: two lines change.
    markProgress("click an unselected option");
    await radioAt(frame, 7).click();
    frame = await settle(page, document, selected(7), "the click to reach the source buffer");
    assert.deepEqual(changedLines(SOURCE, document.getText()), [5, 7], "at most two lines change");
    assert.equal(await shownSelection(frame), "  x");
    assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 0, "no block editor opens");

    // One undo in the source editor reverts the whole choice.
    markProgress("undo the choice");
    const undoTrace = traceDocumentChanges(document);
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preserveFocus: false, preview: false });
    await waitForActiveSourceEditor(document);
    await page.locator(".monaco-editor:visible .view-lines").first().click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
    try {
      await waitFor("one undo to restore the original source", () => document.getText() === SOURCE);
    } catch (error) {
      throw new Error(`${String(error)} Window focus: ${await windowFocusReport(page)}; `
        + `buffer changes since the undo step: ${undoTrace.report()}`);
    } finally {
      undoTrace.dispose();
    }
    await waitForRender(document, (html) => html.includes("myst-radio"));
    frame = await currentPreviewFrame(page);
    assert.equal(await shownSelection(frame), "x  ");

    // A click on the selected option writes nothing.
    markProgress("click the selected option");
    const versionBeforeNoOp = document.version;
    await watchToggles(frame);
    await radioAt(frame, 5).click();
    // The click reached the page: the option took the focus (a click on a radio focuses it).
    await waitFor("the click to focus the selected option", async () => await focusedOption(frame) === 5);
    await assertNoWrite(frame, document, versionBeforeNoOp, SOURCE, "a click on the selected option");
    assert.equal(await shownSelection(frame), "x  ");

    // The arrow keys only move the focus.
    markProgress("arrow keys");
    await radioAt(frame, 5).focus();
    const versionBeforeArrows = document.version;
    await watchToggles(frame);
    await page.keyboard.press("ArrowDown");
    await waitFor("ArrowDown to focus the second option", async () => await focusedOption(frame) === 6);
    await page.keyboard.press("ArrowDown");
    await waitFor("ArrowDown to focus the third option", async () => await focusedOption(frame) === 7);
    await page.keyboard.press("ArrowUp");
    await waitFor("ArrowUp to focus the second option", async () => await focusedOption(frame) === 6);
    await assertNoWrite(frame, document, versionBeforeArrows, SOURCE, "the arrow keys");
    assert.equal(await shownSelection(frame), "x  ", "the arrow keys select nothing");

    // Space selects the focused option and writes.
    markProgress("Space selects");
    await page.keyboard.press("Space");
    frame = await settle(page, document, selected(6), "Space to reach the source buffer");
    assert.deepEqual(changedLines(SOURCE, document.getText()), [5, 6]);
    assert.equal(await shownSelection(frame), " x ");

    // Enter selects the focused option and writes.
    markProgress("Enter selects");
    const beforeEnter = document.getText();
    await radioAt(frame, 7).focus();
    await page.keyboard.press("Enter");
    frame = await settle(page, document, selected(7), "Enter to reach the source buffer");
    assert.deepEqual(changedLines(beforeEnter, document.getText()), [6, 7]);
    assert.equal(await shownSelection(frame), "  x");
    assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 0, "Enter opens no block editor");
    console.log("PASS radio choice: click, undo, selected no-op, arrows, Space, Enter");
  } finally {
    disposeActivePreviewForTests();
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await browser.close();
    fixture.dispose();
  }
}
