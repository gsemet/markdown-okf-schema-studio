import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import { type Page } from "playwright-core";

import {
  bufferText,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForRender,
  withCurrentFrame,
} from "./harness";
import { holdEditSourcesForTests } from "../extensionApi";
import { SMOKE, withSmokeDocument } from "./common";

/**
 * CR 188: in edit mode a click on a block opens its editor, whose source comes back from the host a
 * moment later. Cmd/Ctrl+F pressed at once, with the query typed right after, must leave the text in
 * the find field: the late editor does not take the focus, so the Markdown stays as it was.
 * The click and the keys are issued back to back: nothing waits for the editor.
 *
 * The host answers an open within a few milliseconds, usually before the key: the editor would then
 * already hold the focus and Cmd/Ctrl+F would start from its text box, which is not the case this
 * scenario proves. The host holds the source back (a test hook) until the query is typed, so the
 * source always arrives after the find field took the focus.
 */
export async function scenarioFindRightAfterClick(page: Page): Promise<void> {
  await withSmokeDocument("realinput-find-after-click", async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    const query = "paragraph";

    const sources = holdEditSourcesForTests();
    try {
      await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
      await press(page, `${MOD}+F`);
      await typeText(page, query);

      // "paragraph" is in the two paragraphs of the document.
      await waitFor("the match count of the query", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined
          && /^1 of 2$/u.test(await current.locator("[data-find-count]").textContent() ?? "");
      });
      // The click opened an editor: the host got the open and holds its source.
      await waitFor("the host to hold the source of the opened editor", async () => sources.held() === 1);
      const waiting = await withCurrentFrame(page, (frame) => frame.evaluate(() => ({
        frames: document.querySelectorAll("[data-sphinx-preview-block-editor]").length,
        textareas: document.querySelectorAll("[data-sphinx-preview-block-editor] textarea").length,
        findValue: document.querySelector<HTMLInputElement>("[data-find-input]")?.value,
      })));
      assert.deepEqual(waiting, { frames: 1, textareas: 0, findValue: query },
        "the editor still waits for its source while the whole query is in the find field");
    } finally {
      // The source goes to the page now, after the find field took the focus.
      sources.release();
    }

    // The late editor is still an open edit: it arrived without taking the focus.
    await waitFor("the block editor to be built", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("[data-sphinx-preview-block-editor] textarea").count() === 1;
    });
    const state = await withCurrentFrame(page, (frame) => frame.evaluate(() => ({
      findValue: document.querySelector<HTMLInputElement>("[data-find-input]")?.value,
      findFocused: document.activeElement?.hasAttribute("data-find-input") === true,
      editorText: document.querySelector<HTMLTextAreaElement>("[data-sphinx-preview-block-editor] textarea")?.value,
    })));
    assert.equal(state.findValue, query, "the query landed in the find field");
    assert.equal(state.findFocused, true, "the find field still holds the focus");
    assert.equal(state.editorText, "Second paragraph.",
      "the block's Markdown text box holds its own source, without the query");
    assert.equal(bufferText(source), SMOKE, "the open buffer is unchanged");
    assert.equal(fs.readFileSync(source.uri.fsPath, "utf8"), SMOKE, "the Markdown file on disk is unchanged");
  });
}
