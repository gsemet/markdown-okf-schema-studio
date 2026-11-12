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
  openStudioEditor,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
  writeSchema,
} from "./realInput/harness";

const SCHEMA = "type: object\nproperties:\n  type:\n    type: string\n  title:\n    type: string\nadditionalProperties: true\n";
const DOCUMENT = [
  "---",
  "type: req",
  "title: Original title",
  "---",
  "",
  "# Save key",
  "",
  "First line",
  "",
  "| h1 | h2 |",
  "| --- | --- |",
  "| c1 | c2 |",
  "",
  "Tail.",
  "",
].join("\n");

type Page = Parameters<typeof findCurrentFrame>[0];

/** The tag, value and selection of the focused element of the preview. */
async function readFocus(page: Page): Promise<{ tag: string | undefined; value: string | undefined; start: number | undefined }> {
  const frame = await findCurrentFrame(page);
  if (frame === undefined) return { tag: undefined, value: undefined, start: undefined };
  return frame.evaluate(() => {
    const element = document.activeElement;
    const box = element instanceof HTMLTextAreaElement ? element : undefined;
    return { tag: element?.tagName, value: box?.value, start: box?.selectionStart };
  });
}

/** The document is clean and holds `typed`, and stays clean after a pause (no later autosave dirties it). */
async function expectSaved(document: vscode.TextDocument, typed: string): Promise<void> {
  await waitFor(`the save key to save "${typed}"`, () => !document.isDirty && bufferText(document).includes(typed));
  await new Promise((resolve) => setTimeout(resolve, 800));
  assert.equal(document.isDirty, false, "the dirty mark does not come back after the save");
  assert.ok(bufferText(document).includes(typed), "the saved text still holds what was typed");
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173
/**
 * CR 312: Cmd/Ctrl+S with the focus in the side preview saves the document. The key is pressed at
 * once after typing, inside the autosave delay: the text typed so far is written first, the editor
 * stays open with its caret, and a frontmatter field closes. The last step checks the custom editor
 * (decision 5): VS Code saves a custom text editor natively, and the check says whether that save
 * meets the same outcome.
 */
export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  const fixture = createFixture("save-key", { "save.md": DOCUMENT });
  writeSchema(fixture.directory, "req", SCHEMA);
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("save.md")));
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);

    // A block editor: type, press the key inside the autosave delay.
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "First line" }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await caretToEnd(page);
    await typeText(page, " blockTyped");
    await press(page, MOD + "+s");
    await expectSaved(document, "First line blockTyped");
    const block = await readFocus(page);
    assert.equal(block.tag, "TEXTAREA", "the block text box keeps the focus");
    assert.ok(block.value?.includes("First line blockTyped"), "and its value");

    // A table cell editor.
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c2$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await caretToEnd(page);
    await typeText(page, "cellTyped");
    await press(page, MOD + "+s");
    await expectSaved(document, "c2cellTyped");
    const cell = await readFocus(page);
    assert.equal(cell.tag, "TEXTAREA", "the cell text box keeps the focus");
    assert.ok(cell.value?.includes("cellTyped"), "and its value");

    // A frontmatter field: the value is written and the field closes.
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="title"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await press(page, MOD + "+a");
    await typeText(page, "Fieldtyped");
    await press(page, MOD + "+s");
    await expectSaved(document, "title: Fieldtyped");
    await waitFor("the frontmatter field to close", async () => withCurrentFrame(page, async (frame) =>
      await frame.locator("[data-okf-frontmatter-editor]").count() === 0));
    await setEditMode(page, false);
    await closeAllEditors();

    // Decision 5: the custom editor, saved natively by VS Code.
    await openStudioEditor(vscode.Uri.file(fixture.path("save.md")));
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Tail." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await caretToEnd(page);
    await typeText(page, " customTyped");
    await press(page, MOD + "+s");
    await expectSaved(document, "Tail. customTyped");
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
