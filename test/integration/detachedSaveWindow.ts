import * as assert from "node:assert/strict";
import type * as vscode from "vscode";

import { getActivePreviewForTests, holdBlockEditAppliesForTests, sendPreviewMessageForTests } from "./extensionApi";
import { currentContext, waitFor, waitForCurrentPreview } from "./previewEditingHelpers";

/**
 * A final save the writer cancelled while it was in flight (CR-475) still ends: the page closed its
 * editor, the host holds the write, and the edit completes with its answer once the write lands.
 */
export async function detachedFinalSaveEnds(
  document: vscode.TextDocument,
  block: { line: number; endLine: number },
): Promise<void> {
  await waitForCurrentPreview(document);
  const context = currentContext(document);
  const editId = "integration-lock-detached";
  const original = "Include edit first line\nAutosaved second line\n";
  const edited = "Detached first line\nAutosaved second line\n";
  await sendPreviewMessageForTests({ type: "previewEditOpen", ...context, editId, ...block });
  const held = holdBlockEditAppliesForTests();
  try {
    await sendPreviewMessageForTests({
      type: "previewEditSave", ...context, editId, ...block,
      originalText: original, editedText: edited, final: true,
    });
    await waitFor("the final save write to be held", () => held.held() === 1);
    await sendPreviewMessageForTests({ type: "previewEditClosed", ...context, editId, detached: true });
    assert.equal(getActivePreviewForTests()?.blockEditOpen, true, "the host still holds the detached save");
    assert.equal(getActivePreviewForTests()?.pageEditorOpen, false, "the page editor is closed");
  } finally {
    held.release();
  }
  await waitFor("the detached save to reach the document", () => document.getText().includes(edited));
  await waitFor("the detached edit to end", () => getActivePreviewForTests()?.blockEditOpen === false);
}
