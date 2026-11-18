import * as assert from "node:assert/strict";
import { type Page } from "playwright-core";

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
 * @tests_req StRS-MDOKFSTUDIO-TABLE-016
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-106
 * @tests_req SwRS-MDOKFSTUDIO-TABLE-111
 */
export async function scenarioTableInsertFromSlash(page: Page): Promise<void> {
  await withSmokeDocument("realinput-t45", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, EDITOR);
    const count = async (selector: string): Promise<number> => {
      const current = await findCurrentFrame(page);
      return current === undefined ? -1 : current.locator(selector).count();
    };
    const expectState = async (description: string, check: (state: { value: string; start: number; end: number }) => boolean): Promise<void> => {
      try {
        await waitFor(description, async () => {
          const state = await editorState(page);
          return state !== undefined && check(state);
        });
      } catch (error) {
        throw new Error(String(error) + " Editor state: " + JSON.stringify(await editorState(page)), { cause: error });
      }
    };

    // /tab Enter opens the size grid; the first arrow highlights 1 x 1, then 3 rows and 2 columns.
    await press(page, "End");
    await press(page, "Enter");
    await typeText(page, "/tab");
    await waitFor("the slash menu to open for /tab", async () => (await count("[data-slash-menu]")) === 1);
    await press(page, "Enter");
    await waitFor("the table size grid", async () => (await count("[data-edit-popover=\"grid\"]")) === 1);
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

    // The caret after the space that follows Column 1: a `/` there opens the menu.
    await press(page, "ArrowRight");
    await press(page, "ArrowRight");
    await expectState("the caret between the space and the pipe after Column 1", (state) =>
      state.start === state.end && state.value.slice(state.start - 2, state.start + 1) === "1 |");
    await typeText(page, "/align");
    await waitFor("the slash menu to list Column alignment first", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      return await current.locator("[data-slash-id]").first().getAttribute("data-slash-id") === "columnAlign";
    });
    await press(page, "Enter");
    await waitFor("the Column alignment choices", async () =>
      (await count("[data-edit-popover=\"align\"] [data-edit-option=\"center\"]")) === 1);
    await expectState("the /align query removed", (state) => state.value.includes(inserted));
    await withCurrentFrame(page, (frame) =>
      frame.locator("[data-edit-popover=\"align\"] [data-edit-option=\"center\"]").click());
    const aligned = inserted.replace("| --- | --- |", "| :---: | --- |");
    await expectState("only the delimiter cell of the first column centred", (state) => state.value.includes(aligned));

    await press(page, `${MOD}+Enter`);
    await waitFor("the table to reach the source buffer", () => bufferText(document).includes(aligned));
    await waitForRender(document);
    await waitForNoBlockEditor(page, "the block editor to close after the save");
    const buffer = bufferText(document);
    const before = buffer.slice(0, buffer.indexOf(aligned));
    const after = buffer.slice(buffer.indexOf(aligned) + aligned.length);
    assert.ok(before.startsWith(SMOKE.slice(0, SMOKE.indexOf("Second paragraph.") + "Second paragraph.".length)),
      "the text before the new table is unchanged: " + JSON.stringify(before));
    assert.ok(after.includes("| Name | Value |\n|------|-------|\n| alpha | one |\n| beta | two |"),
      "the table that was already there is unchanged: " + JSON.stringify(after));
    assert.equal(buffer.split(aligned).length, 2, "the new table is in the buffer once");
  });
}
