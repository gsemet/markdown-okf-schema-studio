/**
 * Acceptance of the trust-security use case that starts in an untrusted workspace: the window runs
 * in Restricted Mode, with the repository as its workspace.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import type { Page } from "playwright-core";
import * as vscode from "vscode";

import type { WindowKind } from "../../shared/acceptanceCampaign";
import { getActivePreviewForTests } from "../extensionApi";
import {
  caretToEnd,
  currentPreviewFrame,
  MOD,
  press,
  setEditMode,
  typeText,
  waitForEditor,
  withCurrentFrame,
} from "../realInput/harness";
import { step } from "../stepWatchdog";
import { waitForFirstClickReady } from "../windowFocus";
import { prepareWorkbench, waitForState, withFixturePreview } from "./support";

export const windowKind: WindowKind = "restricted";

const TOGGLE = "[data-sphinx-preview-edit-toggle]";
const EDITOR = "[data-sphinx-preview-block-editor] textarea";

/**
 * Path "edit in an untrusted workspace": a preview is created for a document of an untrusted
 * workspace, the document is editable there, and the text typed in the preview is written to the
 * document and saved to its file.
 */
// @accepts_req StRS-MDOKFSTUDIO-TRUST-001#S1
async function editsInAnUntrustedWorkspace(page: Page): Promise<void> {
  const paragraph = "First line of the restricted note.";
  const typed = " Typed in Restricted Mode.";
  await withFixturePreview("trust-security", ["edit-restricted.md"], async (document) => {
    assert.ok(vscode.workspace.getWorkspaceFolder(document.uri), "the document is not in the untrusted workspace");
    assert.equal(getActivePreviewForTests()?.restrictedReads, true, "the preview does not have restricted reads");
    const expected = document.getText().replace(paragraph, `${paragraph}${typed}`);

    const toggle = (await currentPreviewFrame(page)).locator(TOGGLE);
    assert.equal(await toggle.count(), 1, "the page has no edit toggle");
    assert.equal(await toggle.getAttribute("aria-disabled"), null, "the edit toggle is disabled in Restricted Mode");
    // Notifications of the Restricted Mode window would cover the preview.
    await vscode.commands.executeCommand("notifications.clearAll");
    await waitForFirstClickReady(page);
    try {
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: paragraph }).click());
      const editing = await waitForEditor(page, EDITOR);
      assert.equal(await editing.locator(EDITOR).inputValue(), paragraph, "the editor does not hold the paragraph");

      await caretToEnd(page);
      await typeText(page, typed);
      await press(page, `${MOD}+s`);
      await waitForState("the typed text to be written to the document and saved", () => ({
        dirty: document.isDirty,
        text: document.getText(),
      }), (state) => !state.dirty && state.text === expected);
      assert.equal(fs.readFileSync(document.uri.fsPath, "utf8"), expected, "the file does not hold the edit");
    } finally {
      // The next window starts with edit mode off; a failure here must not hide the path's own.
      await setEditMode(page, false).catch((error: unknown) => console.log(`leaving edit mode failed: ${String(error)}`));
    }
  });
}

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, false, "this acceptance file runs in a Restricted Mode window");
  const { browser, page } = await prepareWorkbench();
  try {
    await step("trust-001-s1-restricted-edit", () => editsInAnUntrustedWorkspace(page));
  } finally {
    await browser.close();
  }
}
