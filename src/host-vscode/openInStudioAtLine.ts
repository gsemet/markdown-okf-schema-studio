/**
 * The "Open in Studio at This Line" command: the explicit gesture that opens a Markdown text
 * editor's file in a Studio tab at the caret's line. The text tab stays open; the command closes
 * no tab. Its body lives here, not in `activation.ts`.
 */

import * as vscode from "vscode";

import { fireAndForget } from "../host-api/logger";
import { isDocumentEligible } from "../session/sessionDocuments";
import { StudioLines } from "./studioTabs";
import type { VscodeHost } from "./vscodeHost";

/** The command that opens the active Markdown text editor's file in Studio at the caret's line. */
export const OPEN_IN_STUDIO_AT_LINE_COMMAND_ID = "markdown-okf-schema-studio.openInStudioAtLine";

// @implements_req SwRS-MDOKFSTUDIO-LIFE-198
/**
 * Opens the active Markdown text editor's file in a Studio tab of the editor's group, with the
 * caret's line (1-based) revealed and marked by the Studio tab. A Studio tab of the file open in
 * any group is revealed in its own group and given the line instead. Without an eligible Markdown
 * text editor it opens nothing and tells the reader.
 */
export async function openInStudioAtLine(host: VscodeHost, lines: StudioLines): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const document = editor ? host.documents.of(editor.document) : undefined;
  if (!editor || !document || document.path === undefined || !isDocumentEligible(document)) {
    fireAndForget(host.logger, host.ui.showInformation(
      "Open a Markdown file as text to open it in Studio at a line.",
    ), "showInformation");
    return;
  }
  try {
    await lines.openStudioAt(editor.document.uri, editor.selection.active.line + 1, editor.viewColumn ?? vscode.ViewColumn.Active);
  } catch (error) {
    fireAndForget(host.logger, host.ui.showError(
      "Cannot open " + editor.document.uri.fsPath + " in Studio: " + (error instanceof Error ? error.message : String(error)),
    ), "showError");
  }
}
