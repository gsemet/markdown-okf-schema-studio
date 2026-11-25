import * as assert from "node:assert/strict";
import { type Page } from "playwright-core";

import { getActivePreviewForTests } from "../extensionApi";
import { windowFocusReport } from "../windowFocus";
import { clickListOption, installLandingProbe, readLandingSummary } from "./clickRouting";
import { SMOKE, waitForNoBlockEditor, withSmokeDocument } from "./common";
import {
  bufferText,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

const EDITOR = "[data-sphinx-preview-block-editor] textarea";

/** The value of the block text box and its caret, or undefined while no frame is shown. */
async function editorState(page: Page): Promise<{ value: string; start: number; end: number } | undefined> {
  const current = await findCurrentFrame(page);
  if (current === undefined) return undefined;
  return current.evaluate((selector) => {
    const area = document.querySelector(selector);
    if (!(area instanceof HTMLTextAreaElement)) return undefined;
    return { value: area.value, start: area.selectionStart, end: area.selectionEnd };
  }, EDITOR);
}

/**
 * RI-T45: a table inserted and shaped from the slash menu, with real keys. In the paragraph editor,
 * `/tab` Enter opens the size grid, three ArrowDown and one ArrowRight choose 3 x 2 and Enter
 * inserts the table; `/align` Enter opens Column alignment in the header cell of the first column,
 * Center rewrites its delimiter cell, and Cmd/Ctrl+Enter saves the block. The buffer holds the new
 * table with the first column centred, the rest of the document unchanged.
 * @accepts_req StRS-MDOKFSTUDIO-TABLE-016#S1
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-106#S4
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-106#S7
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-111#S5
 */
export async function scenarioTableInsertFromSlash(page: Page): Promise<void> {
  await withSmokeDocument("realinput-t45", async (document) => {
    // Each step with its time since the scenario started, for the failure message (CI rule 12).
    const startedAt = Date.now();
    const steps: Array<{ at: number; step: string }> = [];
    const step = (name: string): void => {
      steps.push({ at: Date.now() - startedAt, step: name });
    };
    // A part of the message that cannot be read says so and never hides the original error.
    const safely = async (read: () => Promise<unknown> | unknown): Promise<unknown> => {
      try {
        return await read();
      } catch (error) {
        return "unreadable: " + String(error).slice(0, 120);
      }
    };
    // The one failure message of the scenario: the steps passed, the host's render request and
    // document, the editor state, the page trace start, where the press landed and the focus report.
    const explain = async (error: unknown): Promise<Error> => {
      const preview = getActivePreviewForTests();
      const pageTraceStart = await safely(async () => {
        const startedAtInPage = await (await findCurrentFrame(page))?.evaluate(() =>
          (window as unknown as { __studioDiagnostics?: { startedAt?: () => number } }).__studioDiagnostics?.startedAt?.());
        return typeof startedAtInPage === "number" ? startedAtInPage - startedAt : undefined;
      });
      return new Error(String(error)
        + " Editor state: " + JSON.stringify(await safely(() => editorState(page)))
        + " Scenario: " + JSON.stringify({
          steps,
          pageTraceStart,
          host: { requestId: preview?.requestId, documentVersion: preview?.documentVersion, phase: preview?.phase },
          source: await safely(() => ({ version: document.version, dirty: document.isDirty, text: document.getText() })),
        })
        + " " + await safely(async () => readLandingSummary(page, await findCurrentFrame(page), startedAt, startedAt))
        + " " + await safely(() => windowFocusReport(page)), { cause: error });
    };
    const guarded = async <T>(run: () => Promise<T>): Promise<T> => {
      try {
        return await run();
      } catch (error) {
        throw await explain(error);
      }
    };
    const check = (description: string, condition: () => Promise<boolean> | boolean): Promise<void> =>
      guarded(() => waitFor(description, condition));

    step("open preview");
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    step("paragraph click");
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, EDITOR);
    step("paragraph editor open");
    // A read-only recorder of where each press lands, installed once the editor is open.
    const probed = await findCurrentFrame(page);
    if (probed !== undefined) await installLandingProbe(page, probed);
    const count = async (selector: string): Promise<number> => {
      const current = await findCurrentFrame(page);
      return current === undefined ? -1 : current.locator(selector).count();
    };
    const expectState = (description: string, matches: (state: { value: string; start: number; end: number }) => boolean): Promise<void> =>
      check(description, async () => {
        const state = await editorState(page);
        return state !== undefined && matches(state);
      });

    // /tab Enter opens the size grid; the first arrow highlights 1 x 1, then 3 rows and 2 columns.
    await press(page, "End");
    step("press End");
    await press(page, "Enter");
    await typeText(page, "/tab");
    step("type /tab");
    await check("the slash menu to open for /tab", async () => (await count("[data-slash-menu]")) === 1);
    step("slash menu open");
    await press(page, "Enter");
    await check("the table size grid", async () => (await count("[data-edit-popover=\"grid\"]")) === 1);
    step("size grid");
    for (const key of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowRight"]) await press(page, key);
    await press(page, "Enter");
    const inserted = [
      "| Column 1 | Column 2 |",
      "| --- | --- |",
      "|  |  |",
      "|  |  |",
    ].join("\n");
    await expectState("the 3 x 2 table in the text box with Column 1 selected", (state) =>
      state.value.includes(inserted) && state.value.slice(state.start, state.end) === "Column 1");
    step("table inserted");

    // The caret after the space that follows Column 1: a `/` there opens the menu.
    await press(page, "ArrowRight");
    await press(page, "ArrowRight");
    await expectState("the caret between the space and the pipe after Column 1", (state) =>
      state.start === state.end && state.value.slice(state.start - 2, state.start + 1) === "1 |");
    step("caret after Column 1");
    await typeText(page, "/align");
    step("type /align");
    await check("the slash menu to list Column alignment first", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      return await current.locator("[data-slash-id]").first().getAttribute("data-slash-id") === "columnAlign";
    });
    await press(page, "Enter");
    await check("the Column alignment choices", async () =>
      (await count("[data-edit-popover=\"align\"] [data-edit-option=\"center\"]")) === 1);
    step("align choices");
    await expectState("the /align query removed", (state) => state.value.includes(inserted));
    step("query removed");
    // The option of a list that has just opened: hovered first so the press reaches the webview (CI rule 12).
    await guarded(() => withCurrentFrame(page, (frame) =>
      clickListOption(page, frame, "center", "[data-edit-action='columnAlign']")));
    step("Center pressed");
    const aligned = inserted.replace("| --- | --- |", "| :---: | --- |");
    await expectState("only the delimiter cell of the first column centred", (state) => state.value.includes(aligned));
    step("first column centred");

    await press(page, `${MOD}+Enter`);
    await check("the table to reach the source buffer", () => bufferText(document).includes(aligned));
    step("table in buffer");
    await guarded(() => waitForRender(document));
    await guarded(() => waitForNoBlockEditor(page, "the block editor to close after the save"));
    step("editor closed");
    const buffer = bufferText(document);
    const before = buffer.slice(0, buffer.indexOf(aligned));
    const after = buffer.slice(buffer.indexOf(aligned) + aligned.length);
    await guarded(async () => {
      assert.ok(before.startsWith(SMOKE.slice(0, SMOKE.indexOf("Second paragraph.") + "Second paragraph.".length)),
        "the text before the new table is unchanged: " + JSON.stringify(before));
      assert.ok(after.includes("| Name | Value |\n|------|-------|\n| alpha | one |\n| beta | two |"),
        "the table that was already there is unchanged: " + JSON.stringify(after));
      assert.equal(buffer.split(aligned).length, 2, "the new table is in the buffer once");
    });
  });
}
