import * as assert from "node:assert/strict";
import * as vscode from "vscode";

import {
  bufferText,
  caretToStart,
  closeAllEditors,
  connectWorkbench,
  createFixture,
  openSidePreview,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./realInput/harness";

/** The grid of the report: `{grid} 1 2 3 3` with three `{grid-item-card}` (same layout as the palette report). */
const DOCUMENT = [
  "# Grid", "",
  "::::{grid} 1 2 3 3",
  ":::{grid-item-card} 1. Link projection",
  ":header: okf-schema, okfreq, okfkb",
  "Relations become Markdown links in a generated body section. {ref}`evo-links`",
  ":::",
  ":::{grid-item-card} 2. Status projection",
  ":header: okfreq",
  "The lifecycle maps to OKF `status` through the schema. {ref}`evo-status`",
  ":::",
  ":::{grid-item-card} 3. Approval as trust",
  ":header: okfreq",
  "Approval becomes a `verified` event in ISO 8601. {ref}`evo-trust`",
  ":::",
  "::::", "",
  "(evo-links)=", "", "## Links", "",
  "(evo-status)=", "", "## Status", "",
  "(evo-trust)=", "", "## Trust", "",
  "After the grid, a paragraph to click outside.", "",
].join("\n");

const CARD_TEXT = "The lifecycle maps to OKF `status` through the schema.";
/** The normal wait for the editor to close: the host answer of a save takes well under this. */
const CLOSE_WAIT_MS = 8_000;

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-047
/**
 * Issue 227 repro: in a grid card, a click outside the block editor must save the card and close
 * the editor, whatever happened inside it (typing, the palette, an autosave that already landed).
 * The clicks and the typing are real mouse and keyboard events on the card, the palette and the
 * page; the focus moves into the palette select and the typed text start use the page's own focus
 * call and the keyboard shortcut for the caret. A card editor that stays open after the click is
 * reported with its state: "Saving Markdown" status shown (the final save was posted and the host
 * answer never closed the editor) or not (the blur never reached the editor).
 */
export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  const fixture = createFixture("grid-card-blur", { "grid.md": DOCUMENT });
  const failures: string[] = [];
  try {
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("grid.md")));
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);

    const editorCount = (): Promise<number> => withCurrentFrame(page, (frame) =>
      frame.locator("[data-sphinx-preview-block-editor]").count());
    const editorState = (): Promise<string> => withCurrentFrame(page, async (frame) => {
      const open = await frame.locator("[data-sphinx-preview-block-editor]").count();
      if (open === 0) return "closed";
      const status = await frame.locator("[data-sphinx-preview-edit-status]").first().textContent();
      return status?.includes("Saving Markdown")
        ? "still open with the Saving Markdown status (final save posted, no host answer closed it)"
        : `still open without the Saving Markdown status (status: ${JSON.stringify(status)}; the blur did not finish the editor)`;
    });
    // A click in the body paragraph of the second card, at a fixed small offset: the centre of the
    // paragraph may hit the `{ref}` link at its end.
    const openCard = async (): Promise<void> => {
      await withCurrentFrame(page, (frame) => frame.locator(".myst-grid-card-body p", { hasText: /The lifecycle maps to OKF/ })
        .first().click({ position: { x: 12, y: 6 } }));
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      const text = await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue());
      assert.ok(text.includes(CARD_TEXT), `the click opened the card text, got ${JSON.stringify(text)}`);
      // The caret goes to the start, so a marker lands in the card whatever the editor opened
      // (the card body or the whole directive).
      await caretToStart(page);
    };
    // The margin of the page: not a mapped block (a mapped block would save, then open its editor).
    const clickOutside = (): Promise<void> => withCurrentFrame(page, async (frame) => {
      // At scrollY 0 the viewport point checked here is the html-relative point clicked below.
      assert.equal(await frame.evaluate(() => window.scrollY), 0, "the page is not scrolled");
      const mapped = await frame.evaluate(() => document.elementFromPoint(2, 200)?.closest("[data-sphinx-source-line]") !== null);
      assert.equal(mapped, false, "the click point is outside every mapped block");
      await frame.locator("html").click({ position: { x: 2, y: 200 } });
    });
    const expectClosed = async (name: string, marker: string): Promise<void> => {
      try {
        await waitFor(`${name}: the editor to close`, async () => (await editorCount()) === 0, CLOSE_WAIT_MS);
      } catch (error) {
        failures.push(`${name}: the card editor stayed ${await editorState()}`);
        await page.keyboard.press("Escape");
        return;
      }
      try {
        await waitFor(`${name}: the card text to be saved`, () => bufferText(source).includes(marker), CLOSE_WAIT_MS);
      } catch (error) {
        failures.push(`${name}: the editor closed but ${String(error)}`);
      }
    };

    // (a) Type, then click outside.
    await openCard();
    await typeText(page, "ALPHA ");
    await clickOutside();
    await expectClosed("click outside after typing", "ALPHA ");

    // (b) Click in the palette (a button, then its padding), then outside.
    await openCard();
    await typeText(page, "BETA ");
    await withCurrentFrame(page, (frame) => frame.locator(".sphinx-preview-edit-palette [data-edit-action='bold']").click());
    // The palette's left padding (1px border + 3px padding) at its vertical middle, clear of the rounded corners.
    await withCurrentFrame(page, async (frame) => {
      const palette = frame.locator(".sphinx-preview-edit-palette");
      const box = await palette.boundingBox();
      assert.ok(box, "the palette has a bounding box");
      await palette.click({ position: { x: 3, y: box.height / 2 } });
    });
    assert.equal(await editorCount(), 1, "a click in the palette keeps the editor open");
    await clickOutside();
    await expectClosed("click in the palette, then outside", "BETA");

    // (c) Focus in the palette's mode select (programmatic focus), then outside.
    await openCard();
    await typeText(page, "GAMMA ");
    await withCurrentFrame(page, (frame) => frame.locator(".sphinx-preview-edit-palette-mode").focus());
    await clickOutside();
    await expectClosed("focus in the palette select, then outside", "GAMMA");

    // (d) Click outside at once after typing (inside the autosave and blur windows).
    await openCard();
    await typeText(page, "DELTA ", 0);
    await clickOutside();
    await expectClosed("click outside right after typing", "DELTA");

    // (e) Type, wait until an autosave landed in the source, then click outside (the final save
    // drains behind the autosave on the host; the autosave delay of the page is 400 ms).
    await openCard();
    await typeText(page, "EPSILON ");
    await waitFor("the autosave to land in the source", () => bufferText(source).includes("EPSILON"), CLOSE_WAIT_MS)
      .catch((error) => { failures.push(`autosave then outside: no autosave landed: ${String(error)}`); });
    assert.equal(await editorCount(), 1, "the autosave leaves the editor open");
    await clickOutside();
    await expectClosed("click outside after an autosave landed", "EPSILON");

    assert.deepEqual(failures, [], failures.join("\n"));
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
