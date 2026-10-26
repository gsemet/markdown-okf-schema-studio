import * as assert from "node:assert/strict";
import * as vscode from "vscode";

import {
  bufferText,
  caretToEnd,
  closeAllEditors,
  connectWorkbench,
  createFixture,
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
} from "./realInput/harness";

const DOCUMENT = "# Edit keys\n\nFirst line\nsecond line\nthird line\n\nTail.\n";

/** The value and selection of the focused text box of the preview. */
async function readEditor(page: Parameters<typeof findCurrentFrame>[0]): Promise<{
  tag: string | undefined; value: string | undefined; start: number | undefined; end: number | undefined;
}> {
  const frame = await findCurrentFrame(page);
  if (frame === undefined) return { tag: undefined, value: undefined, start: undefined, end: undefined };
  return frame.evaluate(() => {
    const element = document.activeElement;
    const box = element instanceof HTMLTextAreaElement ? element : undefined;
    return { tag: element?.tagName, value: box?.value, start: box?.selectionStart, end: box?.selectionEnd };
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
// @tests_req StRS-MDOKFSTUDIO-BLOCK-008
/**
 * CR 119: in the text box of an open block editor, real key presses go through VS Code's key
 * bindings: undo and redo step through several typing chunks, select all selects the whole text of
 * the box and delete line removes the current line in one undoable step.
 */
export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  const fixture = createFixture("edit-keys", { "keys.md": DOCUMENT });
  try {
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("keys.md")));
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "First line" }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await caretToEnd(page);
    const base = (await readEditor(page)).value;
    assert.ok(base !== undefined && base.startsWith("First line"), "the paragraph opens in the text box");
    await typeText(page, " abc");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await typeText(page, " def");
    await new Promise((resolve) => setTimeout(resolve, 600));
    const typed = (await readEditor(page)).value;
    assert.ok(typed !== undefined && typed.length > base.length);

    // Undo steps back through several chunks; redo restores them.
    await press(page, MOD + "+z");
    await waitFor("the first undo to remove the last chunk", async () => {
      const state = await readEditor(page);
      return state.tag === "TEXTAREA" && state.value !== undefined && state.value.length < typed.length;
    });
    const afterOne = (await readEditor(page)).value!;
    await press(page, MOD + "+z");
    await waitFor("the second undo to remove the earlier chunk", async () => {
      const state = await readEditor(page);
      return state.value !== undefined && state.value.length < afterOne.length;
    });
    await press(page, MOD + "+Shift+z");
    await waitFor("the redo to restore the earlier chunk", async () => {
      const state = await readEditor(page);
      return state.tag === "TEXTAREA" && state.value === afterOne;
    });

    // Select all selects the text of the box, not the page.
    await press(page, MOD + "+a");
    await waitFor("select all to cover the text box", async () => {
      const state = await readEditor(page);
      return state.tag === "TEXTAREA" && state.start === 0 && state.end === state.value?.length;
    });

    // Delete line removes the line of the caret, once, and one undo brings it back.
    const frame = await findCurrentFrame(page);
    assert.ok(frame, "the preview frame");
    await frame.evaluate(() => {
      const box = document.activeElement as HTMLTextAreaElement;
      const at = box.value.indexOf("second line") + 3;
      box.setSelectionRange(at, at);
    });
    const beforeDelete = (await readEditor(page)).value!;
    await press(page, MOD + "+Shift+k");
    await waitFor("delete line to remove the second line", async () => {
      const state = await readEditor(page);
      return state.tag === "TEXTAREA" && state.value !== undefined && !state.value.includes("second line")
        && state.value.includes("First line") && state.value.includes("third line");
    });
    await waitFor("the buffer to follow the deletion", () => !bufferText(source).includes("second line"));
    await press(page, MOD + "+z");
    await waitFor("one undo to bring the line back", async () => (await readEditor(page)).value === beforeDelete);
    assert.equal((await readEditor(page)).tag, "TEXTAREA", "the editor stays open and focused");
  } finally {
    try {
      await setEditMode(page, false);
    } catch {
      // Best effort: a failure here must not hide the scenario's own result.
    }
    await closeAllEditors();
    fixture.dispose();
    await browser.close();
  }
}
