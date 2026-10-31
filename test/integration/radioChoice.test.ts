/**
 * Real-window test of the radio choice lists: real mouse clicks and keys (dispatched by Playwright
 * through CDP) on a radio group in the Studio preview, checked against the source buffer. A click
 * writes at most two lines and one undo reverts it; a click on the selected option writes nothing;
 * Space and Enter select the focused option; the arrow keys only move the focus. One Tab from the
 * label lands on the selected option, and the chosen option keeps the focus after the re-render. A
 * click with a block editor open writes nothing and keeps the editor open; on a file VS Code keeps
 * read-only, a click is refused and the selection returns to the source's.
 */
import * as assert from "node:assert/strict";
import { type Frame, type Locator, type Page } from "playwright-core";
import * as vscode from "vscode";

import { READ_ONLY_FILE } from "../../src/core/edits/readOnlyReasons";
import { COMMAND_ID, disposeActivePreviewForTests } from "./extensionApi";
import {
  connectWorkbench, createFixture, currentPreviewFrame, setEditMode, waitFor, waitForEditor, waitForRender,
} from "./realInput/harness";
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

/** SOURCE, then enough paragraphs that the heading at the end is a wheel scroll away from the group. */
const LONG_SOURCE = [
  ...SOURCE.split("\n").slice(0, -1),
  ...Array.from({ length: 40 }, (_, index) => [`Filler paragraph ${index + 1}.`, ""]).flat(),
  "## Tasks",
  "",
  "Write the fix.",
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

/** Where the preview focus is: the active element, its radio line and tabindex, and the option tabindex values of its group. */
async function describePreviewFocus(frame: Frame): Promise<string> {
  try {
    return await frame.evaluate(() => {
      const active = window.document.activeElement;
      if (!active) return "no active element";
      const group = active.closest('[role="radiogroup"]') ?? active.closest("ul, ol");
      const tabindexes = group
        ? [...group.querySelectorAll('[role="radio"]')].map((radio) => radio.getAttribute("tabindex") ?? "none").join(",")
        : "no radio group around the active element";
      return JSON.stringify({
        tagName: active.tagName,
        role: active.getAttribute("role"),
        id: active.id || null,
        className: String(active.getAttribute("class") ?? ""),
        radioLine: active.getAttribute("data-myst-radio-line"),
        tabindex: active.getAttribute("tabindex"),
        text: (active.textContent ?? "").slice(0, 60),
        groupOptionTabindexes: tabindexes,
      });
    });
  } catch (error) {
    return `unavailable (${String(error)})`;
  }
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

/** Opens `plan.md` of a new fixture with `source` beside its Studio preview; disposes both after `body`. */
async function withPlan(
  page: Page,
  prefix: string,
  source: string,
  body: (document: vscode.TextDocument, frame: Frame) => Promise<void>,
): Promise<void> {
  const fixture = createFixture(prefix, { "plan.md": source });
  const document = await bounded("workspace.openTextDocument of plan.md",
    vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("plan.md"))));
  try {
    await bounded("page.setViewportSize", page.setViewportSize({ width: 1400, height: 900 }));
    await bounded("workbench.action.closeSidebar", vscode.commands.executeCommand("workbench.action.closeSidebar"));
    await bounded("workbench.action.closeAuxiliaryBar", vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar"));
    await bounded("window.showTextDocument of plan.md", vscode.window.showTextDocument(document, vscode.ViewColumn.One));
    await bounded("waitForActiveSourceEditor of plan.md", waitForActiveSourceEditor(document));
    await bounded(`${COMMAND_ID} on plan.md`, vscode.commands.executeCommand(COMMAND_ID));
    markProgress(`waiting for the first radio render of ${prefix}`);
    await waitForRender(document, (html) => html.includes("myst-radio"));
    await body(document, await currentPreviewFrame(page));
  } finally {
    disposeActivePreviewForTests();
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    fixture.dispose();
  }
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
export async function run(): Promise<void> {
  const { browser, page } = await bounded("chromium.connectOverCDP to the workbench", connectWorkbench());
  try {
    await withPlan(page, "radio-e2e", SOURCE, (document, frame) => choices(page, document, frame));
    await withPlan(page, "radio-editor", LONG_SOURCE, (document) => openEditorGuard(page, document));
    await readOnlyFile(page);
  } finally {
    await browser.close();
  }
}

/** Clicks, undo, the selected no-op, Tab entry, arrows, Space and Enter on SOURCE. */
async function choices(page: Page, document: vscode.TextDocument, first: Frame): Promise<void> {
  let frame = first;

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
  await waitFor("the clicked option to keep the focus after the re-render", async () => await focusedOption(frame) === 7);

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

  // One Tab from the label lands on the selected option: the list, its items and their
  // paragraphs are not tab stops.
  markProgress("Tab from the label");
  await frame.locator("p", { hasText: "Fix direction:" }).click();
  await page.keyboard.press("Tab");
  try {
    await waitFor("one Tab from the label to focus the selected option", async () => await focusedOption(frame) === 5);
  } catch (error) {
    throw new Error(`${String(error)} Window focus: ${await windowFocusReport(page)}; `
      + `preview focus: ${await describePreviewFocus(frame)}`);
  }
  assert.equal(await frame.evaluate(() => window.document.activeElement?.getAttribute("role")), "radio");

  // The arrow keys only move the focus.
  markProgress("arrow keys");
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
  await waitFor("the chosen option to keep the focus after the re-render", async () => await focusedOption(frame) === 6);

  // Enter selects the focused option and writes.
  markProgress("Enter selects");
  const beforeEnter = document.getText();
  await radioAt(frame, 7).focus();
  await page.keyboard.press("Enter");
  frame = await settle(page, document, selected(7), "Enter to reach the source buffer");
  assert.deepEqual(changedLines(beforeEnter, document.getText()), [6, 7]);
  assert.equal(await shownSelection(frame), "  x");
  assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 0, "Enter opens no block editor");
  await waitFor("the option chosen with Enter to keep the focus", async () => await focusedOption(frame) === 7);
  console.log("PASS radio choice: click, undo, selected no-op, Tab entry, arrows, Space, Enter, focus kept");
}

/** Waits for the preview page to rest at `scrollY` 0 after a wheel up over it. */
async function wheelToTop(page: Page, frame: Frame): Promise<void> {
  const box = await (await frame.frameElement()).boundingBox();
  assert.ok(box, "the preview frame has a box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -20_000);
  await waitFor("the wheel to bring the preview back to the top", async () =>
    await frame.evaluate(() => window.scrollY) === 0);
}

/**
 * Edit mode, a block editor open on the heading at the end, a wheel up to the group, a real mouse
 * click on an unselected option: nothing is written, the editor stays open and says why.
 */
async function openEditorGuard(page: Page, document: vscode.TextDocument): Promise<void> {
  markProgress("open a block editor, then click an option");
  await setEditMode(page, true);
  try {
    await clickWithEditorOpen(page, document);
  } finally {
    // The workspace remembers the edit mode for the next preview (CR 152): cancel the unchanged
    // editor, then turn edit mode off.
    await page.keyboard.press("Escape");
    await waitFor("Escape to cancel the unchanged editor", async () =>
      await (await currentPreviewFrame(page)).locator("[data-sphinx-preview-block-editor]").count() === 0);
    await setEditMode(page, false);
  }
}

async function clickWithEditorOpen(page: Page, document: vscode.TextDocument): Promise<void> {
  let frame = await currentPreviewFrame(page);
  await frame.locator("h2", { hasText: "Tasks" }).click();
  frame = await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
  const option = radioAt(frame, 6);
  assert.equal(await option.isVisible(), true);
  const optionInView = (): Promise<boolean> => option.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  });
  assert.equal(await optionInView(), false, "the option needs a wheel scroll to be reached");
  await wheelToTop(page, frame);
  assert.equal(await optionInView(), true);
  assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 1, "the wheel keeps the editor open");
  const version = document.version;
  await watchToggles(frame);
  const box = await option.boundingBox();
  assert.ok(box, "the option has a box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const status = frame.locator("[data-sphinx-preview-edit-status]").first();
  await waitFor("the editor status to say why the click was refused", async () =>
    await status.textContent() === "Save or cancel this edit before choosing an option.");
  await assertNoWrite(frame, document, version, LONG_SOURCE, "a click with a block editor open");
  assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 1, "the block editor stays open");
  assert.equal(await shownSelection(frame), "x  ");
  console.log("PASS radio choice: a click with a block editor open writes nothing");
}

/**
 * A file VS Code keeps read-only (`files.readonlyInclude`): the edit resolves and changes nothing, so
 * the page puts the source's selection back and shows the reason next to the clicked option.
 */
async function readOnlyFile(page: Page): Promise<void> {
  markProgress("read-only file");
  const files = vscode.workspace.getConfiguration("files");
  const original = files.inspect<Record<string, boolean>>("readonlyInclude")?.globalValue;
  await files.update("readonlyInclude", { ...original, "**/radio-readonly-*/**": true }, vscode.ConfigurationTarget.Global);
  try {
    await withPlan(page, "radio-readonly", SOURCE, async (document, frame) => {
      const version = document.version;
      await radioAt(frame, 6).click();
      await waitFor("the refused choice to show the source's selection again", async () =>
        await shownSelection(frame) === "x  " && await frame.locator(".myst-checkbox-refusal").count() === 1);
      const note = frame.locator(".myst-checkbox-refusal");
      assert.equal(await note.textContent(), READ_ONLY_FILE);
      assert.equal(await note.isVisible(), true);
      assert.equal(await radioAt(frame, 6).getAttribute("title"), READ_ONLY_FILE);
      assert.equal(document.version, version, "VS Code wrote nothing");
      assert.equal(document.getText(), SOURCE);
    });
  } finally {
    await files.update("readonlyInclude", original, vscode.ConfigurationTarget.Global);
  }
  console.log("PASS radio choice: a click on a read-only file is refused with its reason");
}
