import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import type { Page } from "playwright-core";

import { waitForActiveSourceEditor } from "./windowFocus";
import {
  bufferText,
  closeAllEditors,
  createFixture,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./realInput/harness";

/**
 * Real-window scenarios of the list item handles of CR 432: a real mouse drag of an item, of an item
 * with sub-items and of an item of a GitHub alert, a drag over another list, Alt+Down on a focused
 * handle, and the whole-list chord of an open item editor (unchanged).
 */

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const lines = (...text: string[]): string => text.join("\n");

const HANDLE = "[data-okf-list-handle-layer] .okf-list-item-handle";

/** Runs `scenario` on a document of `content` shown in the preview with edit mode on. */
async function withList(
  page: Page, prefix: string, content: string, scenario: (document: vscode.TextDocument) => Promise<void>,
): Promise<void> {
  const fixture = createFixture(prefix, { "lists.md": content });
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("lists.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      await waitForHandles(page);
      await scenario(document);
    } finally {
      try {
        const frame = await findCurrentFrame(page);
        if (frame !== undefined && await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on") {
          await setEditMode(page, false);
          await wait(250);
        }
      } catch {
        // Best effort: it must not hide the scenario's own result.
      }
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

async function waitForHandles(page: Page): Promise<void> {
  await waitFor("the list item handles", async () => {
    const frame = await findCurrentFrame(page);
    return frame !== undefined && await frame.locator(HANDLE).count() > 0;
  });
}

/** The selector of the handle of the item whose own text starts with `text`. */
async function handleOf(page: Page, text: string): Promise<string> {
  const line = await withCurrentFrame(page, (frame) => frame.evaluate((wanted) => {
    const ownText = (candidate: Element): string => {
      const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if ((node.textContent ?? "").trim()) return (node.textContent ?? "").trim();
      }
      return "";
    };
    const item = [...document.querySelectorAll("#sphinx-myst-preview-content li")]
      .find((candidate) => ownText(candidate).startsWith(wanted));
    return item?.getAttribute("data-sphinx-source-line") ?? "";
  }, text));
  assert.ok(line !== "", `the item ${text} is rendered with its source line`);
  return `${HANDLE}[data-okf-list-item-line="${line}"]`;
}

/** The selector of the rendered item whose own text starts with `text`, by its source line. */
async function itemOf(page: Page, text: string): Promise<string> {
  const handle = await handleOf(page, text);
  const line = /data-okf-list-item-line="([^"]*)"/u.exec(handle)![1];
  return `#sphinx-myst-preview-content li[data-sphinx-source-line="${line}"]`;
}

/** A real mouse drag from the centre of `handle` to the lower part (`fraction`) of the first line of `target`. */
async function dragTo(page: Page, handle: string, target: string, fraction = 0.8): Promise<void> {
  const boxes = await withCurrentFrame(page, async (frame) => ({
    from: await frame.locator(handle).first().boundingBox(),
    to: await frame.locator(target).first().boundingBox(),
  }));
  assert.ok(boxes.from, `the handle ${handle} has a box`);
  assert.ok(boxes.to, `the drop target ${target} has a box`);
  const fromX = boxes.from.x + boxes.from.width / 2;
  const fromY = boxes.from.y + boxes.from.height / 2;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + 6, fromY + 8, { steps: 3 });
  await page.mouse.move(boxes.to.x + 40, boxes.to.y + boxes.to.height * fraction, { steps: 12 });
  await wait(150);
  await page.mouse.up();
}

async function expectBuffer(document: vscode.TextDocument, expected: string, what: string): Promise<void> {
  try {
    await waitFor(what, () => bufferText(document) === expected);
  } catch (error) {
    throw new Error(`${String(error)} The buffer holds ${JSON.stringify(bufferText(document))}.`, { cause: error });
  }
  await waitForRender(document);
}

const ORDERED = lines("# Lists", "", "1. one", "2. two", "3. three", "", "After the list.", "");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
/** The second item of an ordered list dragged after the third: moved, renumbered, one undo restores it. */
async function scenarioOrderedDragAndUndo(page: Page): Promise<void> {
  await withList(page, "listmoves-ordered", ORDERED, async (document) => {
    await dragTo(page, await handleOf(page, "two"), await itemOf(page, "three"));
    await expectBuffer(document, lines("# Lists", "", "1. one", "2. three", "3. two", "", "After the list.", ""),
      "the second item moved after the third and the list renumbered");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForActiveSourceEditor(document);
    await vscode.commands.executeCommand("undo");
    await waitFor("one undo to restore the list", () => bufferText(document) === ORDERED);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
/** An item with a sub-list moves with it. */
async function scenarioSubListDrag(page: Page): Promise<void> {
  const source = lines("# Lists", "", "- alpha", "  - alpha one", "  - alpha two", "- beta", "");
  await withList(page, "listmoves-sublist", source, async (document) => {
    await dragTo(page, await handleOf(page, "alpha"), await itemOf(page, "beta"));
    await expectBuffer(document, lines("# Lists", "", "- beta", "- alpha", "  - alpha one", "  - alpha two", ""),
      "the item moved after its sibling with its sub-list");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
/** An item of a list in a GitHub alert moves inside the alert; the alert's other lines stay. */
async function scenarioAlertDrag(page: Page): Promise<void> {
  const source = lines("# Lists", "", "> [!NOTE]", "> Pack these:", ">", "> - tent", "> - stove", "");
  await withList(page, "listmoves-alert", source, async (document) => {
    await dragTo(page, await handleOf(page, "tent"), await itemOf(page, "stove"));
    await expectBuffer(document, lines("# Lists", "", "> [!NOTE]", "> Pack these:", ">", "> - stove", "> - tent", ""),
      "the alert item moved with its quote prefix, the alert's other lines kept");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
/** A drop over an item of another list leaves the document as it was. */
async function scenarioDropOverAnotherList(page: Page): Promise<void> {
  const source = lines("# Lists", "", "- red", "- green", "", "Between.", "", "- left", "- right", "");
  await withList(page, "listmoves-other", source, async (document) => {
    await dragTo(page, await handleOf(page, "red"), await itemOf(page, "right"));
    await wait(600);
    assert.equal(bufferText(document), source, "a drop over another list moves nothing");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130
/** Alt+Down on a focused handle moves its item; the whole-list chord of an item editor is unchanged. */
async function scenarioKeys(page: Page): Promise<void> {
  await withList(page, "listmoves-keys", ORDERED, async (document) => {
    const handle = await handleOf(page, "one");
    await withCurrentFrame(page, (frame) => frame.locator(handle).first().focus());
    await press(page, "Alt+ArrowDown");
    await expectBuffer(document, lines("# Lists", "", "1. two", "2. one", "3. three", "", "After the list.", ""),
      "Alt+Down to move the first item below the second");
    await waitFor("the focus back on the handle of the moved item", async () => {
      const moved = await handleOf(page, "one");
      return withCurrentFrame(page, (frame) => frame.locator(moved).first().evaluate(
        (element) => element === element.ownerDocument.activeElement));
    });
    // Decision 1: in an open item editor, Cmd/Ctrl+Alt+Down still moves the whole list.
    await withCurrentFrame(page, (frame) => frame.locator("#sphinx-myst-preview-content li", { hasText: "three" }).first().click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, `${MOD}+Alt+ArrowDown`);
    await waitFor("the chord to move the whole list below the paragraph", () =>
      bufferText(document).startsWith(lines("# Lists", "", "After the list.", "", "1. two", "2. one", "3. three")));
  });
}

/** The list item scenarios of CR 432, in one window. */
export async function scenarioListItemMoves(page: Page): Promise<void> {
  await scenarioOrderedDragAndUndo(page);
  console.log("PASS list item moves: an ordered item dragged, renumbered, one undo restores it");
  await scenarioSubListDrag(page);
  console.log("PASS list item moves: an item with a sub-list moves whole");
  await scenarioAlertDrag(page);
  console.log("PASS list item moves: an item of a GitHub alert keeps the alert's lines");
  await scenarioDropOverAnotherList(page);
  console.log("PASS list item moves: a drop over another list moves nothing");
  await scenarioKeys(page);
  console.log("PASS list item moves: Alt+Down on a handle, and the whole-list chord in an item editor");
}
