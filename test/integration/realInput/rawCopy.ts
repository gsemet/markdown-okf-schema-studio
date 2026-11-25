import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import { findCurrentFrame, openSidePreview, press, setEditMode, waitFor, waitForEditor, waitForRender, withCurrentFrame } from "./harness";

const DOCUMENT = [
  "# Raw copy",
  "",
  "Intro with **bold** and a [link](https://example.com/page) here.",
  "",
  ":::{note} Heads up",
  "Paragraph before the table.",
  "",
  "| Name | Value |",
  "| ---- | ----- |",
  "| one  | first |",
  ":::",
  "",
  "Closing line.",
  "",
  "[ref]: https://example.com/ref",
  "",
].join("\n");

/** The raw Markdown from the start of the paragraph before the table to the end of the table's row. */
const SELECTED = DOCUMENT.slice(DOCUMENT.indexOf("Paragraph before"), DOCUMENT.indexOf("first |") + "first".length);

const BALANCED_DOCUMENT = [
  "# Raw copy balanced",
  "",
  ":::{note} Heads up",
  "Paragraph with a **bold** word.",
  ":::",
  "",
  "| Name | Value |",
  "| ---- | ----- |",
  "| one  | first row |",
  "",
  "Closing line.",
  "",
].join("\n");

/** With the setting on: the admonition's opening line, the bold's opening delimiters, then the cut to the end of the touched row. */
const BALANCED_SELECTED = ":::{note} Heads up\n**"
  + BALANCED_DOCUMENT.slice(BALANCED_DOCUMENT.indexOf("old** word"), BALANCED_DOCUMENT.indexOf("first row |") + "first row |".length);

const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

/** Puts a real Range from the start of one text (`skip` characters in) to the end of another on the page, with the page focused. */
async function selectBetween(page: Page, from: string, to: string, skip = 0): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.evaluate(({ first, last, skipped }) => {
    const root = window.document.getElementById("sphinx-myst-preview-content") as HTMLElement;
    root.focus();
    const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const find = (text: string): Text => {
      while (walker.nextNode()) if ((walker.currentNode as Text).data.includes(text)) return walker.currentNode as Text;
      throw new Error(`no text ${text}`);
    };
    const start = find(first);
    walker.currentNode = root;
    const end = find(last);
    const range = window.document.createRange();
    range.setStart(start, start.data.indexOf(first) + skipped);
    range.setEnd(end, end.data.indexOf(last) + last.length);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  }, { first: from, last: to, skipped: skip }));
}

/**
 * Presses the platform copy chord, with a sentinel on the clipboard, until the clipboard holds `expected` (the host sends
 * the source text of the shown render after the render is ready, so the first copies may be the browser's own).
 */
async function copyUntil(page: Page, label: string, expected: string): Promise<void> {
  let last = "";
  await waitFor(label, async () => {
    await vscode.env.clipboard.writeText("sentinel");
    await press(page, `${MODIFIER}+c`);
    last = await vscode.env.clipboard.readText();
    return last === expected;
  }).catch((error: unknown) => {
    throw new Error(`${String(error)} Clipboard: ${JSON.stringify(last)}.`);
  });
}

/** Runs `body` with preview.rawCopy.balanceEdges set in the workspace, then restores the setting. */
async function withRawCopyBalanceEdges(enabled: boolean, body: () => Promise<void>): Promise<void> {
  const configuration = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.preview");
  const original = configuration.inspect<boolean>("rawCopy.balanceEdges")?.workspaceValue;
  await configuration.update("rawCopy.balanceEdges", enabled, vscode.ConfigurationTarget.Workspace);
  try {
    await body();
  } finally {
    await configuration.update("rawCopy.balanceEdges", original, vscode.ConfigurationTarget.Workspace);
  }
}

/**
 * CR-480: a real selection and Ctrl/Cmd+C in the preview put the Markdown under the selection on the clipboard, in
 * reading mode and in edit mode; Select all gives the whole document exactly; a selection in an open block editor
 * stays the browser's own.
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-272#S1
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-273#S1
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-275#S1
 */
export async function scenarioRawCopy(page: Page): Promise<void> {
  await withDocument("realinput-raw-copy", DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, false);
    const saved = await vscode.env.clipboard.readText();
    try {
      // Reading mode: from the paragraph before a table inside an admonition to the end of the table's row.
      await selectBetween(page, "Paragraph before", "first");
      await copyUntil(page, "the page to copy the Markdown under the selection", SELECTED);
      assert.equal(document.getText(), DOCUMENT, "copying changes nothing in the document");

      // Select all: the whole document, final line break and trailing definition included.
      await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Closing line." }).click());
      await press(page, `${MODIFIER}+a`);
      await copyUntil(page, "Select all then copy to give the whole document", DOCUMENT);

      // Edit mode: the same selection copies the same Markdown.
      await setEditMode(page, true);
      await selectBetween(page, "Paragraph before", "first");
      await copyUntil(page, "the page to copy the Markdown under the selection in edit mode", SELECTED);
      assert.equal(document.getText(), DOCUMENT, "copying in edit mode changes nothing in the document");

      // An open block editor: the selection of its text area is copied natively (its source text, not a cut of the page).
      await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Intro with" }).click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-block-editor] textarea").evaluate((area: HTMLTextAreaElement) => {
        area.focus();
        const index = area.value.indexOf("**bold**");
        area.setSelectionRange(index, index + "**bold**".length);
      }));
      await copyUntil(page, "the open block editor to copy its own selection natively", "**bold**");
      assert.equal(document.getText(), DOCUMENT, "copying from the block editor changes nothing in the document");
    } finally {
      await vscode.env.clipboard.writeText(saved);
    }
  });

  // CR-481: with preview.rawCopy.balanceEdges set while the preview is open, the page reloads with the new boot context
  // and balances the edges of a selection.
  await withDocument("realinput-raw-copy-balanced", BALANCED_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, false);
    const saved = await vscode.env.clipboard.readText();
    try {
      await withRawCopyBalanceEdges(true, async () => {
        await waitForRender(document, (html) => /"rawCopy\.balanceEdges":\s*true/u.test(html));
        await waitFor("the ready webview with the new boot context", async () => (await findCurrentFrame(page)) !== undefined);
        // From inside a bold word of an admonition's paragraph to the middle of a table row after the admonition:
        // the admonition's opening line and the bold's delimiters are added; the row is whole.
        // @tests_req SwRS-MDOKFSTUDIO-BLOCK-278#S1
        await selectBetween(page, "bold", "first", 1);
        await copyUntil(page, "the balanced copy of a selection from a bold word to a table row", BALANCED_SELECTED);
        assert.equal(document.getText(), BALANCED_DOCUMENT, "a balanced copy changes nothing in the document");
      });
    } finally {
      await vscode.env.clipboard.writeText(saved);
    }
  });
}
