import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import type { Page } from "playwright-core";

import { waitForNoBlockEditor, withDocument } from "./common";
import {
  bufferText,
  caretToEnd,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

/**
 * CR 436: a block editor left without a change never stays on "Saving Markdown…", and the file's
 * bytes are the ones it had, in a CR LF file and in an LF file. The block is a hard-wrapped
 * paragraph, a list item with nested items or the last item of a list; the editor is left with
 * Done, Cmd/Ctrl+Enter, a click on another block, an arrow past the edge, or a letter typed then
 * deleted. A real change in a CR LF file keeps CR LF everywhere.
 * @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
 */

const LINES = [
  "# Line endings",
  "",
  "First line of a wrapped paragraph",
  "second line of the same paragraph",
  "",
  "- alpha",
  "- beta",
  "  - nested one",
  "  - nested two",
  "- last item",
  "",
  "Closing paragraph.",
  "",
];

const EDITOR = "[data-sphinx-preview-block-editor] textarea";

type Opener = (page: Page) => Promise<void>;

/** The blocks the scenario opens: how to click each one. */
const BLOCKS: Array<{ name: string; open: Opener }> = [
  {
    name: "paragraph",
    open: (page) => withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "First line of a wrapped" }).click()),
  },
  {
    name: "list item with nested items",
    open: (page) => withCurrentFrame(page, (frame) =>
      frame.locator("li:has(> ul)", { hasText: "beta" }).first().click({ position: { x: 24, y: 6 } })),
  },
  {
    name: "last item of a list",
    open: (page) => withCurrentFrame(page, (frame) => frame.locator("li", { hasText: "last item" }).last().click()),
  },
];

type Leave = (page: Page, original: string) => Promise<void>;

async function textBoxValue(page: Page): Promise<string | undefined> {
  return withCurrentFrame(page, async (frame) => await frame.locator(EDITOR).count() === 1
    ? frame.locator(EDITOR).inputValue()
    : undefined);
}

/** Waits for the editor of another block (the first one let go) then cancels it: nothing is saved. */
async function waitForOtherEditorThenEscape(page: Page, original: string, description: string): Promise<void> {
  await waitFor(description, async () => {
    const value = await textBoxValue(page);
    return value !== undefined && value !== original;
  });
  await press(page, "Escape");
}

const LEAVES: Array<{ name: string; leave: Leave }> = [
  {
    name: "Done",
    leave: (page) => withCurrentFrame(page, (frame) => frame.getByRole("button", { name: "Done editing" }).click()),
  },
  { name: "Ctrl+Enter", leave: (page) => press(page, `${MOD}+Enter`) },
  {
    name: "a click on another block",
    // The click moves the focus out of the text box: the editor commits and closes (no other opens).
    leave: (page) => withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Closing paragraph" }).click()),
  },
  {
    name: "an arrow past the edge",
    leave: async (page, original) => {
      await caretToEnd(page);
      await press(page, "ArrowDown");
      await waitForOtherEditorThenEscape(page, original, "the editor of the next block");
    },
  },
  {
    name: "a letter typed then deleted",
    leave: async (page) => {
      await caretToEnd(page);
      await typeText(page, "x");
      await press(page, "Backspace");
      await press(page, `${MOD}+Enter`);
    },
  },
];

async function noSavingMessage(page: Page): Promise<boolean> {
  return withCurrentFrame(page, async (frame) => await frame.getByText("Saving Markdown").count() === 0);
}

/** Runs every block and every way of leaving on a file whose line breaks are `ending`. */
export async function scenarioLeaveWithoutChange(page: Page, ending: "\r\n" | "\n"): Promise<void> {
  const content = LINES.join(ending);
  await withDocument("realinput-leave-" + (ending === "\n" ? "lf" : "crlf"), content, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    for (const block of BLOCKS) {
      for (const way of LEAVES) {
        const label = `${ending === "\n" ? "LF" : "CRLF"} file, ${block.name}, left by ${way.name}`;
        await block.open(page);
        await waitForEditor(page, EDITOR);
        const original = (await textBoxValue(page)) ?? "";
        await way.leave(page, original);
        await waitForNoBlockEditor(page, `the editor to close (${label})`);
        await waitFor(`no "Saving Markdown…" left (${label})`, () => noSavingMessage(page));
        assert.equal(bufferText(document), content, `${label}: the buffer is unchanged`);
        await document.save();
        assert.deepEqual(fs.readFileSync(document.uri.fsPath), Buffer.from(content), `${label}: the file's bytes are unchanged`);
      }
    }
  });
}

/** A real change in a CR LF file stays CR LF, and no other byte moves. */
export async function scenarioRealChangeKeepsCrLf(page: Page): Promise<void> {
  const content = LINES.join("\r\n");
  await withDocument("realinput-leave-change", content, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await BLOCKS[0]!.open(page);
    await waitForEditor(page, EDITOR);
    await caretToEnd(page);
    await typeText(page, " X");
    await press(page, `${MOD}+Enter`);
    const expected = content.replace("of the same paragraph", "of the same paragraph X");
    await waitFor("the change to reach the buffer", () => bufferText(document) === expected);
    await waitForRender(document);
    await waitForNoBlockEditor(page, "the editor to close after the change");
    await document.save();
    assert.deepEqual(fs.readFileSync(document.uri.fsPath), Buffer.from(expected), "only the typed bytes changed, CR LF kept");
  });
}

/** Every scenario of CR 436. */
export async function scenarioLineEndingLeave(page: Page): Promise<void> {
  await scenarioLeaveWithoutChange(page, "\r\n");
  await scenarioLeaveWithoutChange(page, "\n");
  await scenarioRealChangeKeepsCrLf(page);
}
