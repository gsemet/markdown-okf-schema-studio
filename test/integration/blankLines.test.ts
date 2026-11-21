import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
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

async function openPreview(document: vscode.TextDocument): Promise<NonNullable<ReturnType<typeof getActivePreviewForTests>>> {
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
  await waitFor("the preview to be ready", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString() && preview.phase === "ready"
      && preview.webviewReady && preview.documentVersion === document.version;
  });
  const preview = getActivePreviewForTests();
  assert.ok(preview);
  return preview;
}

const LINES = ["# Title", "", "A", "", "", "", "B", ""];
// Blank runs inside a list (CR-448): lines 4-6 between two items, lines 10-12 inside the second item.
const LIST_LINES = ["# Title", "", "- a", "", "", "", "- b", "", "  p1", "", "", "", "  p2", ""];

// Blank runs inside containers (CR-462): lines 4-6 inside a quote, 13-15 inside an admonition in a list item,
// 22-24 inside a footnote.
const CONTAINER_LINES = [
  "# Title", "", "> One", ">", ">", ">", "> Two", "", "- a", "", "  ```{note}", "  One", "", "", "", "  Two", "  ```", "",
  "Text[^1].", "", "[^1]: First", "", "", "", "    Second", "",
];

/** Sends a page message the way the page does, for the preview that is current now. */
function sender(document: vscode.TextDocument, documentUri: string) {
  return (fields: Record<string, unknown>) => sendPreviewMessageForTests({
    documentId: documentUri,
    revision: document.version,
    requestId: getActivePreviewForTests()?.requestId,
    ...fields,
  });
}

/** A message sent while the preview still renders the previous text is dropped as stale: retry. */
async function untilApplied(document: vscode.TextDocument, send: () => Thenable<void> | undefined): Promise<void> {
  const before = document.getText();
  for (let attempt = 0; attempt < 20 && document.getText() === before; attempt += 1) {
    await send();
    if (document.getText() === before) await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
}

async function withFixture(
  name: string,
  eol: string,
  lines: string[],
  body: (document: vscode.TextDocument, send: ReturnType<typeof sender>) => Promise<void>,
): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", `${name}-`));
  const sourcePath = path.join(directory, "blank.md");
  fs.writeFileSync(sourcePath, lines.join(eol));
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const preview = await openPreview(document);
    await body(document, sender(document, preview.documentUri));
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * A blank run written in place and removed on a real file in LF and CRLF, between paragraphs, inside a list (CR-448) and inside a quote, an admonition and a footnote (CR-462): the run takes one block
 * with one blank line on each side, a delete keeps one blank line, the line endings stay, one undo
 * brings the run back.
 */
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
export async function run(): Promise<void> {
  for (const [name, eol] of [["lf", "\n"], ["crlf", "\r\n"]] as const) {
    const original = LINES.join(eol);
    const run = { line: 4, endLine: 6 };

    await withFixture(`blank-lines-write-${name}`, eol, LINES, async (document, send) => {
      await untilApplied(document, () => send({
        type: "previewEditSave", editId: "e1", line: 4, endLine: 6, insertAfterLine: 3, replaceBlankRun: run,
        originalText: "", editedText: "X", final: false,
      }));
      assert.equal(document.getText(), ["# Title", "", "A", "", "X", "", "B", ""].join(eol), `${name}: block in place`);
      if (name === "crlf") assert.equal(/(?<!\r)\n/u.test(document.getText()), false, "no bare LF in a CRLF file");
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), original, `${name}: one undo brings the run back`);
    });

    await withFixture(`blank-lines-delete-${name}`, eol, LINES, async (document, send) => {
      await untilApplied(document, () => send({ type: "previewBlankRunDelete", line: 4, endLine: 6 }));
      assert.equal(document.getText(), ["# Title", "", "A", "", "B", ""].join(eol), `${name}: one blank line kept`);
      if (name === "crlf") assert.equal(/(?<!\r)\n/u.test(document.getText()), false, "no bare LF in a CRLF file");
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), original, `${name}: one undo brings the run back`);
    });

    const listOriginal = LIST_LINES.join(eol);
    const between = { line: 4, endLine: 6, itemLine: 3 };
    const inItem = { line: 10, endLine: 12, itemLine: 7 };
    const noBareLineBreak = (document: vscode.TextDocument): void => {
      if (name === "crlf") assert.equal(/(?<!\r)\n/u.test(document.getText()), false, "no bare LF in a CRLF file");
    };

    await withFixture(`blank-lines-list-delete-${name}`, eol, LIST_LINES, async (document, send) => {
      await untilApplied(document, () => send({ type: "previewBlankRunDelete", line: 4, endLine: 6 }));
      assert.equal(document.getText(), LIST_LINES.slice(0, 4).concat(LIST_LINES.slice(6)).join(eol), `${name}: list, one blank line kept`);
      noBareLineBreak(document);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), listOriginal, `${name}: list, one undo brings the run back`);
    });

    await withFixture(`blank-lines-list-item-${name}`, eol, LIST_LINES, async (document, send) => {
      await untilApplied(document, () => send({
        type: "previewEditSave", editId: "e1", line: 10, endLine: 12, insertAfterLine: 9, replaceBlankRun: inItem,
        originalText: "", editedText: "More", final: false,
      }));
      assert.equal(
        document.getText(),
        ["# Title", "", "- a", "", "", "", "- b", "", "  p1", "", "  More", "", "  p2", ""].join(eol),
        `${name}: "More" written in the item`,
      );
      noBareLineBreak(document);
    });

    await withFixture(`blank-lines-list-sibling-${name}`, eol, LIST_LINES, async (document, send) => {
      await untilApplied(document, () => send({
        type: "previewEditSave", editId: "e1", line: 4, endLine: 6, insertAfterLine: 3, replaceBlankRun: between,
        originalText: "", editedText: "- c", final: false,
      }));
      assert.equal(
        document.getText(),
        ["# Title", "", "- a", "", "- c", "", "- b", "", "  p1", "", "", "", "  p2", ""].join(eol),
        `${name}: "- c" is an item between the two`,
      );
      noBareLineBreak(document);
    });

    await withFixture(`blank-lines-list-nested-${name}`, eol, LIST_LINES, async (document, send) => {
      await untilApplied(document, () => send({
        type: "previewEditSave", editId: "e1", line: 10, endLine: 12, insertAfterLine: 9, replaceBlankRun: inItem,
        originalText: "", editedText: "- c", final: false,
      }));
      assert.equal(
        document.getText(),
        ["# Title", "", "- a", "", "", "", "- b", "", "  p1", "", "  - c", "", "  p2", ""].join(eol),
        `${name}: "- c" is a nested item of the second item`,
      );
      noBareLineBreak(document);
    });

    const containerOriginal = CONTAINER_LINES.join(eol);
    const without = (from: number, count: number): string[] =>
      CONTAINER_LINES.slice(0, from).concat(CONTAINER_LINES.slice(from + count));
    const replaced = (from: number, text: string[]): string =>
      CONTAINER_LINES.slice(0, from).concat(text, CONTAINER_LINES.slice(from + 3)).join(eol);
    const undone = async (document: vscode.TextDocument, label: string): Promise<void> => {
      noBareLineBreak(document);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("undo");
      assert.equal(document.getText(), containerOriginal, `${name}: ${label}, one undo brings the run back`);
    };
    const save = (document: vscode.TextDocument, send: ReturnType<typeof sender>, run: Record<string, number>, text: string) =>
      untilApplied(document, () => send({
        type: "previewEditSave", editId: "e1", line: run.line, endLine: run.endLine, insertAfterLine: run.line - 1,
        replaceBlankRun: run, originalText: "", editedText: text, final: false,
      }));

    await withFixture(`blank-lines-quote-delete-${name}`, eol, CONTAINER_LINES, async (document, send) => {
      await untilApplied(document, () => send({ type: "previewBlankRunDelete", line: 4, endLine: 6 }));
      assert.equal(document.getText(), without(4, 2).join(eol), `${name}: quote, one empty line kept`);
      await undone(document, "quote delete");
    });

    await withFixture(`blank-lines-quote-write-${name}`, eol, CONTAINER_LINES, async (document, send) => {
      await save(document, send, { line: 4, endLine: 6 }, "More");
      assert.equal(document.getText(), replaced(3, [">", "> More", ">"]), `${name}: "More" written in the quote`);
      await undone(document, "quote write");
    });

    await withFixture(`blank-lines-admonition-write-${name}`, eol, CONTAINER_LINES, async (document, send) => {
      await save(document, send, { line: 13, endLine: 15, containerLine: 11 }, "More");
      assert.equal(document.getText(), replaced(12, ["", "  More", ""]), `${name}: "More" written in the admonition of the item`);
      await undone(document, "admonition write");
    });

    await withFixture(`blank-lines-footnote-write-${name}`, eol, CONTAINER_LINES, async (document, send) => {
      await save(document, send, { line: 22, endLine: 24, containerLine: 21 }, "More");
      assert.equal(document.getText(), replaced(21, ["", "    More", ""]), `${name}: "More" written in the footnote`);
      await undone(document, "footnote write");
    });
  }
}
