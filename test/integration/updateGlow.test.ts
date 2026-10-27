import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  noteKeystrokeForTests,
  sendPreviewMessageForTests,
} from "./extensionApi";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

type GlowPatch = { fromVersion: number; toVersion: number; ranges: { start: number; end: number }[] };

/** The content patch that first shows `document.version`, once the preview has posted it. */
async function patchShowing(document: vscode.TextDocument, what: string): Promise<GlowPatch> {
  let found: GlowPatch | undefined;
  await waitFor(`the content patch of ${what} (version ${document.version})`, () => {
    found = getActivePreviewForTests()?.updateGlowPatches
      .find((patch) => patch.toVersion === document.version && patch.fromVersion < patch.toVersion);
    return found !== undefined;
  });
  assert.ok(found);
  return found;
}

function covers(patch: GlowPatch, line: number): boolean {
  return patch.ranges.some((range) => range.start <= line && line <= range.end);
}

const SOURCE = [
  "# Update glow",
  "",
  "- [ ] A task to tick from the preview",
  "",
  "A paragraph another tool rewrites.",
  "",
  "A paragraph the user types in.",
  "",
].join("\n");

// @tests_req StRS-MDOKFSTUDIO-LIFE-005
/**
 * CR 046, in a real window: the preview's own edit and typing in the active text editor make no
 * block glow; an edit made by another tool while the document is not in the active editor, and an
 * undo, do.
 */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "update-glow-"));
  const filePath = path.join(directory, "glow.md");
  fs.writeFileSync(filePath, SOURCE);
  const uri = vscode.Uri.file(filePath);
  const opened: vscode.TextDocument[] = [];
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    opened.push(document);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the preview to be ready", () => {
      const preview = getActivePreviewForTests();
      return preview?.documentUri === uri.toString() && preview.phase === "ready" && preview.webviewReady
        && preview.documentVersion === document.version;
    });

    // Another editor is active: the Markdown document is only shown by the preview.
    const other = await vscode.workspace.openTextDocument({ content: "Another file.\n", language: "plaintext" });
    opened.push(other);
    await vscode.window.showTextDocument(other, vscode.ViewColumn.One);
    assert.notEqual(vscode.window.activeTextEditor?.document.uri.toString(), uri.toString());
    assert.equal(getActivePreviewForTests()?.documentUri, uri.toString());

    // 1. The preview's own edit (a checkbox ticked on the page): no glow.
    const before = document.getText();
    for (let attempt = 0; attempt < 20 && document.getText() === before; attempt += 1) {
      await sendPreviewMessageForTests({
        type: "previewCheckboxToggle",
        documentId: uri.toString(),
        revision: document.version,
        requestId: getActivePreviewForTests()?.requestId,
        editId: `glow-checkbox-${attempt}`,
        line: 3,
        endLine: 3,
        column: 2,
        checked: true,
      });
      if (document.getText() === before) await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }
    assert.match(document.lineAt(2).text, /^- \[x\]/u, "the preview ticked the checkbox");
    const ownEdit = await patchShowing(document, "the preview's own edit");
    assert.deepEqual(ownEdit.ranges, [], "the preview's own edit glows nowhere");
    console.log("PASS update glow: the preview's own edit glows nowhere");

    // 2. Another tool edits the document while it is not in the active editor: it glows.
    const external = new vscode.WorkspaceEdit();
    external.replace(uri, document.lineAt(4).range, "A paragraph another tool has rewritten.");
    assert.equal(await vscode.workspace.applyEdit(external), true);
    const externalEdit = await patchShowing(document, "an outside edit");
    assert.ok(covers(externalEdit, 5), `the outside edit glows on line 5: ${JSON.stringify(externalEdit.ranges)}`);
    console.log("PASS update glow: an outside edit glows");

    // 2b. CR 139: another tool edits the document while it is the active editor, the cursor being
    // on another line and no key pressed: it glows.
    const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), uri.toString());
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    const foreignActive = new vscode.WorkspaceEdit();
    foreignActive.replace(uri, document.lineAt(4).range, "A paragraph another tool rewrote again.");
    assert.equal(await vscode.workspace.applyEdit(foreignActive), true);
    const foreignInActive = await patchShowing(document, "an outside edit of the active document");
    assert.ok(covers(foreignInActive, 5), `the outside edit of the active document glows on line 5: ${JSON.stringify(foreignInActive.ranges)}`);
    console.log("PASS update glow: an outside edit of the active document glows");

    // 3. Typing in the active text editor: no glow.
    const end = document.lineAt(6).range.end;
    editor.selection = new vscode.Selection(end, end);
    await vscode.commands.executeCommand("type", { text: " Typed." });
    // VS Code reports the key after the change it caused; the command above reports none.
    noteKeystrokeForTests();
    assert.equal(document.lineAt(6).text, "A paragraph the user types in. Typed.");
    const typing = await patchShowing(document, "typing in the active editor");
    assert.deepEqual(typing.ranges, [], "typing in the active text editor glows nowhere");
    console.log("PASS update glow: typing in the active text editor glows nowhere");

    // @tests_req SwRS-MDOKFSTUDIO-LIFE-094
    // 4. Undo (of the typing, in the active editor): it glows.
    await vscode.commands.executeCommand("undo");
    assert.equal(document.lineAt(6).text, "A paragraph the user types in.");
    const undo = await patchShowing(document, "an undo");
    assert.ok(covers(undo, 7), `the undo glows on line 7: ${JSON.stringify(undo.ranges)}`);
    console.log("PASS update glow: an undo glows");
  } finally {
    disposeActivePreviewForTests();
    for (const document of opened) {
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    }
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
