import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import { openSidePreview, press, setEditMode, waitFor, waitForEditor, waitForRender, withCurrentFrame } from "./harness";

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

const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

/** Puts a real Range from the start of one text to the end of another on the page, with the page focused. */
async function selectBetween(page: Page, from: string, to: string): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.evaluate(({ first, last }) => {
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
    range.setStart(start, start.data.indexOf(first));
    range.setEnd(end, end.data.indexOf(last) + last.length);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  }, { first: from, last: to }));
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

/**
 * CR-480: a real selection and Ctrl/Cmd+C in the preview put the Markdown under the selection on the clipboard, in
 * reading mode and in edit mode; Select all gives the whole document exactly; a selection in an open block editor
 * stays the browser's own.
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-272
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-273
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-275
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
}
