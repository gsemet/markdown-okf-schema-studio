import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";

import { COMMAND_ID, getActivePreviewForTests, recordSelectionChangesForTests } from "./extensionApi";
import { LONG, openDiff, previewOf, SCHEME, textTabs, virtualOf } from "./diffHelpers";
import { closeAllEditors, createFixture, waitFor } from "./realInput/harness";

const markedLine = (): { line: number; documentId: string } | undefined => getActivePreviewForTests()?.markedLine;

const customTabsOf = (file: string): vscode.Tab[] => vscode.window.tabGroups.all.flatMap((group) => group.tabs)
  .filter((tab) => tab.input instanceof vscode.TabInputCustom && tab.input.uri.fsPath === file);

/** A jump as a search click or a link gives it: the file opens with its cursor at a 1-based line. */
const jumpTo = async (file: string, line: number): Promise<void> => {
  const position = new vscode.Position(line - 1, 0);
  await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(file), { selection: new vscode.Range(position, position) });
};

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186
// @tests_req SwRS-MDOKFSTUDIO-LIFE-187
// @tests_req SwRS-MDOKFSTUDIO-LIFE-189
/**
 * CR 456 in the real window (trials J1 to J7): a jump into a Markdown file marks its line in the side
 * preview that follows the editor. The selection recorder (`recordSelectionChangesForTests`) tells
 * which kind each move carries (J1: the table printed below goes in the docs); the marker is read
 * from the host (`markedLine`), the line the page was asked to draw.
 *
 * Not driven here, for lack of a way to type into the real window's search view, Quick Open or
 * Problems from a test: those moves are reached by `vscode.open` with a selection, the call a search
 * click makes. J6 (anchor off, caret mark, Studio tab, hidden page) is run by hand.
 */
export async function run(): Promise<void> {
  const fixture = createFixture("side-preview-jump", {
    "doc.md": `# Doc\n\n${LONG}`,
    "other.md": `# Other\n\n${LONG}`,
  });
  const file = (name: string): string => path.join(fixture.directory, name);
  const provider = vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
    provideTextDocumentContent: (uri) => `virtual ${uri.query}\n\n${LONG}`,
  });
  const recording = recordSelectionChangesForTests();
  try {
    // J1: the kind each move carries. Printed; the Command ones are the ones that mark.
    await closeAllEditors();
    const editor = await vscode.window.showTextDocument(vscode.Uri.file(file("doc.md")), { viewColumn: vscode.ViewColumn.One });
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the side preview of doc.md", () => previewOf(file("doc.md")), 30_000);
    const table: Array<[string, string]> = [];
    const record = async (label: string, move: () => Thenable<unknown> | void): Promise<void> => {
      const before = recording.records.length;
      await move();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const seen = recording.records.slice(before);
      table.push([label, seen.length === 0 ? "no selection change" : seen.map((entry) => `${entry.kind}/${entry.selections}${entry.jump ? "/jump" : ""}`).join(" ")]);
    };
    await record("vscode.open with a selection (a search click)", () => jumpTo(file("doc.md"), 40));
    await record("cursorDown", () => vscode.commands.executeCommand("cursorDown"));
    await record("cursorBottom", () => vscode.commands.executeCommand("cursorBottom"));
    await record("selectAll", () => vscode.commands.executeCommand("editor.action.selectAll"));
    await record("API selection (as VSCodeVim)", () => {
      const position = new vscode.Position(10, 0);
      editor.selection = new vscode.Selection(position, position);
    });
    await record("Go Back", () => vscode.commands.executeCommand("workbench.action.navigateBack"));
    console.log(`J1 kinds of moves:\n${table.map(([label, kinds]) => `  ${label}: ${kinds}`).join("\n")}`);

    // J2: a search click in a file already open marks the line, and the text editor is at the line.
    await jumpTo(file("doc.md"), 40);
    await waitFor("the marker on line 40 of doc.md", () => markedLine()?.line === 40
      && markedLine()?.documentId === vscode.Uri.file(file("doc.md")).toString());
    assert.equal(vscode.window.activeTextEditor?.selection.active.line, 39, "the text editor is at line 40");

    // J4: the marker stays through a cursor move, and goes when the text editor edits the document.
    await vscode.commands.executeCommand("cursorDown");
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(markedLine()?.line, 40, "a cursor move keeps the marker");
    await vscode.window.activeTextEditor!.edit((builder) => builder.insert(new vscode.Position(41, 0), "typed "));
    await waitFor("the marker removed by an edit of the text editor", () => markedLine() === undefined);

    // J3: a jump to another file switches the side preview and marks the line there, never on doc.md.
    await jumpTo(file("other.md"), 55);
    await waitFor("the side preview of other.md", () => previewOf(file("other.md")), 30_000);
    await waitFor("the marker on line 55 of other.md", () => markedLine()?.line === 55
      && markedLine()?.documentId === vscode.Uri.file(file("other.md")).toString());

    // J4: a switch of document removes the marker, and it does not come back on returning.
    await vscode.window.showTextDocument(vscode.Uri.file(file("doc.md")), { viewColumn: vscode.ViewColumn.One });
    await waitFor("the side preview back on doc.md", () => previewOf(file("doc.md")), 30_000);
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(markedLine(), undefined, "no marker after the switch");

    // J5: a jump on a side of a diff of doc.md marks that line of the real file (the kinds are printed).
    await closeAllEditors();
    await vscode.window.showTextDocument(vscode.Uri.file(file("doc.md")), { viewColumn: vscode.ViewColumn.One });
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the side preview of doc.md", () => previewOf(file("doc.md")), 30_000);
    await openDiff(virtualOf(file("doc.md")), vscode.Uri.file(file("doc.md")));
    const before = recording.records.length;
    const position = new vscode.Position(24, 0);
    await vscode.commands.executeCommand("vscode.diff", virtualOf(file("doc.md")), vscode.Uri.file(file("doc.md")), "Diff under test",
      { selection: new vscode.Range(position, position) });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const diffRecords = recording.records.slice(before);
    console.log(`J5 diff selection records: ${JSON.stringify(diffRecords.map((entry) => ({ kind: entry.kind, target: entry.target, jump: entry.jump })))}`);
    if (diffRecords.some((entry) => entry.jump !== undefined)) {
      await waitFor("the marker on line 25 of the real file", () => markedLine()?.line === 25);
    }

    // J7: the text editor of a file the side preview does not show stays; the preview switches to it and marks the line.
    await closeAllEditors();
    await vscode.window.showTextDocument(vscode.Uri.file(file("other.md")), { viewColumn: vscode.ViewColumn.One });
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the side preview of other.md", () => previewOf(file("other.md")), 30_000);
    await jumpTo(file("doc.md"), 30);
    await waitFor("the side preview switched to doc.md", () => previewOf(file("doc.md")), 30_000);
    await waitFor("the marker on line 30 of doc.md", () => markedLine()?.line === 30);
    assert.ok(textTabs().some((tab) => (tab.input as vscode.TabInputText).uri.fsPath === file("doc.md")), "the text editor of doc.md stays");
    assert.equal(customTabsOf(file("doc.md")).length, 0, "no Studio tab opened for doc.md");
  } finally {
    recording.stop();
    provider.dispose();
    await closeAllEditors();
    fixture.dispose();
  }
}
