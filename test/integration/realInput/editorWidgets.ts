import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import {
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
} from "../extensionApi";
import {
  bufferText,
  caretToEnd,
  closeAllEditors,
  createFixture,
  type Evidence,
  findCurrentFrame,
  lines,
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
import { windowFocusReport } from "../windowFocus";
import { captureAfter, escapeBlockEditor, leaveEditModeOff, waitForNoBlockEditor, withDocument, withSmokeDocument } from "./common";
import { LIST_DOCUMENT } from "./frontmatterFields";
import { explained, waitForPageSettled, waitForTextInput } from "./flushBeforeNavigate";

const FIGURE_DOCUMENT = [
  "# Figure document",
  "",
  ":::{figure} images/chip.svg",
  ":alt: A chip",
  ":width: 60%",
  ":class: with-border",
  "",
  "The chip.",
  ":::",
  "",
  "After the figure.",
  "",
].join("\n");

const FIGURE_IMAGE = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#789"/></svg>\n';

/** RI-T32: the Edit figure button opens the form; Apply rewrites the directive, undo restores it, Cmd/Ctrl+Enter saves. */
export async function scenarioFigureEditor(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t32", { "smoke.md": FIGURE_DOCUMENT, "images/chip.svg": FIGURE_IMAGE });
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      const count = async (selector: string): Promise<number> => {
        const current = await findCurrentFrame(page);
        return current === undefined ? -1 : current.locator(selector).count();
      };
      const readText = async (): Promise<string | undefined> => {
        const current = await findCurrentFrame(page);
        if (current === undefined || await current.locator("[data-sphinx-preview-block-editor] textarea[aria-label='Raw Markdown block']").count() !== 1) return undefined;
        return current.locator("[data-sphinx-preview-block-editor] textarea[aria-label='Raw Markdown block']").inputValue();
      };
      const original = FIGURE_DOCUMENT.split("\n").slice(2, 9).join("\n");

      await withCurrentFrame(page, (frame) => frame.locator("figure").first().hover());
      await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-figure-edit]").click());
      await waitFor("the figure form", async () => await count("[role='dialog'][aria-label='Edit figure']") === 1);
      assert.equal(await readText(), original, "the text box shows the directive");

      // Change the width and the caption in the form, like a user: select the field, type.
      await withCurrentFrame(page, (frame) => frame.locator("[data-figure-field='width']").click({ clickCount: 3 }));
      await typeText(page, "40%");
      await withCurrentFrame(page, (frame) => frame.locator("[data-figure-field='caption']").click({ clickCount: 3 }));
      await typeText(page, "The chip, seen from above.");
      await withCurrentFrame(page, (frame) => frame.locator("[data-figure-action='apply']").click());
      const edited = original.replace(":width: 60%", ":width: 40%").replace("The chip.", "The chip, seen from above.");
      try {
        await waitFor("Apply to rewrite the directive", async () => (await readText()) === edited);
      } catch (error) {
        const current = await findCurrentFrame(page);
        const state = current === undefined ? undefined : await current.evaluate(() => ({
          text: globalThis.document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Raw Markdown block']")?.value,
          width: globalThis.document.querySelector<HTMLInputElement>("[data-figure-field='width']")?.value,
          caption: globalThis.document.querySelector<HTMLTextAreaElement>("[data-figure-field='caption']")?.value,
          errors: Array.from(globalThis.document.querySelectorAll("[data-figure-error]")).map((node) => node.textContent),
          dialogs: globalThis.document.querySelectorAll("[role='dialog']").length,
        }));
        throw new Error(String(error) + " Editor state: " + JSON.stringify(state));
      }
      assert.equal(await count("[role='dialog']"), 0, "the form closed");

      // One undo restores the whole directive.
      await press(page, MOD + "+z");
      await waitFor("one undo to restore the directive", async () => (await readText()) === original);

      // Close the editor, open it again through the button, apply and save with Cmd/Ctrl+Enter.
      await escapeBlockEditor(page, "the block editor to close after Escape");
      await waitFor("the document to be unchanged", () => bufferText(document) === FIGURE_DOCUMENT);
      await withCurrentFrame(page, (frame) => frame.locator("figure").first().hover());
      await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-figure-edit]").click());
      await waitFor("the figure form again", async () => await count("[role='dialog'][aria-label='Edit figure']") === 1);
      await withCurrentFrame(page, (frame) => frame.locator("[data-figure-field='width']").click({ clickCount: 3 }));
      await typeText(page, "40%");
      await press(page, "Enter");
      await waitFor("the width to change", async () => (await readText())?.includes(":width: 40%") === true);
      await press(page, MOD + "+Enter");
      const expected = FIGURE_DOCUMENT.replace(":width: 60%", ":width: 40%");
      await waitFor("the saved figure in the source buffer", () => bufferText(document) === expected);
      await waitForNoBlockEditor(page, "the block editor to close after Cmd/Ctrl+Enter");
      await captureAfter(evidence, page, "palette-slash/r07-figure-editor-form",
        "Edit mode on; hovering the figure showed Edit figure, the form changed the width and the caption "
        + "in one undoable edit, and a second round saved :width: 40% with every other line untouched.");
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

/** RI-T25: the Alert button writes a GitHub alert and its type list changes it; undo steps back. */
export async function scenarioAlertDropdown(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t25", async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    const readEditor = async (): Promise<{ tag: string | undefined; value: string | undefined }> => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return { tag: undefined, value: undefined };
      return current.evaluate(() => {
        const element = document.activeElement;
        return {
          tag: element?.tagName,
          value: element instanceof HTMLTextAreaElement ? element.value : undefined,
        };
      });
    };
    const expectValue = async (description: string, expected: string): Promise<void> => {
      try {
        await waitFor(description, async () => (await readEditor()).value === expected);
      } catch (error) {
        throw new Error(String(error) + " Editor state: " + JSON.stringify(await readEditor()) + " " + await windowFocusReport(page));
      }
    };
    const count = async (selector: string): Promise<number> => {
      const current = await findCurrentFrame(page);
      return current === undefined ? -1 : current.locator(selector).count();
    };
    const original = "Second paragraph.";
    await press(page, "End");

    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-action='alert']").click());
    await expectValue("Alert to write the head and quote the line", "> [!NOTE]\n> " + original);
    await waitFor("the type list", async () => await count(".sphinx-preview-edit-palette-menu[data-edit-popover='alert']") === 1);
    assert.equal((await readEditor()).tag, "TEXTAREA", "the focus stays in the text box");
    // The list sits at the caret: inside the text box's horizontal span, below the caret line.
    const placement = await (await findCurrentFrame(page))!.evaluate(() => {
      const menu = document.querySelector(".sphinx-preview-edit-palette-menu")!.getBoundingClientRect();
      const box = document.querySelector("[data-sphinx-preview-block-editor] textarea")!.getBoundingClientRect();
      return { menuTop: menu.top, menuLeft: menu.left, boxTop: box.top, boxBottom: box.bottom, boxLeft: box.left };
    });
    assert.equal(placement.menuTop > placement.boxTop && placement.menuTop <= placement.boxBottom + 40, true,
      "the list opens next to the text: " + JSON.stringify(placement));
    assert.equal(placement.menuLeft > placement.boxLeft + 20, true, "and to the right of the text start");

    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-option='WARNING']").click());
    await expectValue("Warning to change the type", "> [!WARNING]\n> " + original);
    assert.equal(await count(".sphinx-preview-edit-palette-menu"), 0, "choosing closes the list");
    assert.equal((await readEditor()).tag, "TEXTAREA");

    await press(page, MOD + "+z");
    await expectValue("one undo to revert the type", "> [!NOTE]\n> " + original);
    await press(page, MOD + "+z");
    await expectValue("one more undo to remove the alert", original);
    assert.equal(await count("[data-sphinx-preview-block-editor] textarea"), 1, "the editor stayed open");

    // Escape closes the list and leaves NOTE; the focus is in the text box and the editor open.
    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-action='alert']").click());
    await waitFor("the type list again", async () => await count(".sphinx-preview-edit-palette-menu") === 1);
    await press(page, "Escape");
    await waitFor("Escape to close the list", async () => await count(".sphinx-preview-edit-palette-menu") === 0);
    await expectValue("NOTE to remain after Escape", "> [!NOTE]\n> " + original);
    assert.equal(await count("[data-sphinx-preview-block-editor] textarea"), 1, "the editor stayed open");
    await captureAfter(evidence, page, "palette-slash/r06-alert-dropdown",
      "Edit mode on; the Alert button wrote > [!NOTE], its type list chose Warning, two Cmd/Ctrl+Z "
      + "removed the alert again, and Escape on a second list kept NOTE with the focus in the text box.");
    await escapeBlockEditor(page, "the block editor to close after the second Escape");
  });
}

/** RI-T11: Enter in a nested list continues the list at the same indentation. */
export async function scenarioEnterContinuesList(page: Page, evidence: Evidence): Promise<void> {
  const LIST_DOCUMENT = [
    "# List document",
    "",
    "- Intake",
    "  - Dry goods",
    "    - Refrigerated goods",
    "  - Deduplication",
    "",
  ].join("\n");
  await withDocument("realinput-t11", LIST_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.getByText("Refrigerated goods", { exact: true }).first().click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await caretToEnd(page);
    await press(page, "Enter");
    await typeText(page, "Frozen goods");
    await withCurrentFrame(page, (frame) => frame.locator("h1").first().click());
    const expected = LIST_DOCUMENT.replace(
      "    - Refrigerated goods\n",
      "    - Refrigerated goods\n    - Frozen goods\n",
    );
    try {
      await waitFor("the new item to reach the buffer as a sibling", () => bufferText(document) === expected);
    } catch (error) {
      throw new Error(String(error) + " Buffer: " + JSON.stringify(bufferText(document)));
    }
    await waitForRender(document);
    await captureAfter(evidence, page, "block-editing/r09-enter-continues-list",
      "Edit mode on; Enter after `Refrigerated goods` continued the list, and `Frozen goods` is a sibling "
      + "at the same indentation while `Deduplication` kept its place.");
  });
}

/** RI-T32: the edited block keeps its viewport top across the render that follows Save. */
export async function scenarioSaveKeepsBlockInPlace(page: Page, evidence: Evidence): Promise<void> {
  const filler = (count: number, label: string): string[] =>
    Array.from({ length: count }, (_, index) => `${label} paragraph ${index + 1} of filler text.`);
  const listDocument = (title: string): string => [
    "# " + title,
    "",
    ...filler(40, "Before").flatMap((line) => [line, ""]),
    "- Intake",
    "  - Dry goods",
    "    - Refrigerated goods",
    "  - Deduplication",
    "",
    ...filler(40, "After").flatMap((line) => [line, ""]),
  ].join("\n");
  const TABLE_PINNED = [
    "# Pinned table",
    "",
    ...filler(6, "Before").flatMap((line) => [line, ""]),
    "| Step | Owner |",
    "|------|-------|",
    "| Plan | Ana   |",
    "| Ship | Bo    |",
    "",
  ].join("\n");

  const frameTop = (selector: string): Promise<number | undefined> => withCurrentFrame(page, async (frame) => {
    const box = await frame.locator(selector).first().boundingBox();
    const host = await (await frame.frameElement()).boundingBox();
    return box === null || host === null ? undefined : box.y - host.y;
  });
  const topNow = async (selector: string): Promise<number> => {
    const top = await frameTop(selector);
    assert.ok(top !== undefined, selector + " has a bounding box");
    return top;
  };
  const viewportHeight = (): Promise<number> => withCurrentFrame(page, async (frame) => {
    const host = await (await frame.frameElement()).boundingBox();
    assert.ok(host, "the preview frame has a bounding box");
    return host.height;
  });
  /** The reading line's distance from the viewport top, as the runtime publishes it. */
  const readingOffset = (): Promise<number> => withCurrentFrame(page, (frame) => frame.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue("--sphinx-preview-reading-offset")) || 0));
  const scrollTargetTo = async (selector: string, goal: number): Promise<number> => {
    const host = await withCurrentFrame(page, async (frame) => (await frame.frameElement()).boundingBox());
    assert.ok(host, "the preview frame has a bounding box");
    await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const top = await frameTop(selector);
      if (top !== undefined && Math.abs(top - goal) <= 10) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return (await frameTop(selector)) ?? top;
      }
      const delta = top === undefined ? 600 : Math.max(-1200, Math.min(1200, top - goal));
      await page.mouse.wheel(0, delta);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    throw new Error("could not scroll " + selector + " to " + goal + " px below the preview top");
  };
  const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * One list case. The list top sits about 40 px below the viewport top, so the reading line lies
   * inside the edited list: its growth moves content under the reading line, which is what
   * drifted the list by about 95 px in UX-11.
   */
  const listCase = async (
    prefix: string,
    shot: string | undefined,
  ): Promise<void> => {
    await withDocument(prefix, listDocument("Pinned list"), async (document) => {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      const reading = await readingOffset();
      const goal = Math.max(0, Math.min(40, reading - 25));
      const t0 = await scrollTargetTo("ul", goal);
      const listHeight = await withCurrentFrame(page, async (frame) =>
        (await frame.locator("ul").first().boundingBox())?.height ?? 0);
      assert.ok(t0 < reading && reading < t0 + listHeight,
        "the reading line (" + reading + ") lies inside the list (" + t0 + " + " + listHeight + ")");
      await withCurrentFrame(page, (frame) => frame.getByText("Refrigerated goods", { exact: true }).first().click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await caretToEnd(page);
      await press(page, "Enter");
      await typeText(page, "Frozen goods");
      await press(page, MOD + "+Enter");
      await waitFor("the new item to reach the buffer", () => bufferText(document).includes("    - Frozen goods"));
      await waitForRender(document);
      await waitForNoBlockEditor(page, "the list editor to close after the re-render");
      await pause(600);
      const t1 = await topNow("ul");
      console.log("RI-T32 list (" + prefix + "): reading=" + reading + " T0=" + t0 + " T1=" + t1
        + " drift=" + (t1 - t0));
      assert.ok(Math.abs(t1 - t0) <= 3, "the list moved from " + t0 + " to " + t1 + " after Save");

      if (shot === undefined) return;
      // A second render without a pin (an edit far below) must restore the pinned anchor, and the
      // link enrichment that reloads the page later must keep it too.
      const end = document.positionAt(document.getText().length);
      const tail = new vscode.WorkspaceEdit();
      tail.insert(document.uri, end, "\nTail paragraph added after Save.\n");
      assert.ok(await vscode.workspace.applyEdit(tail), "the tail edit applies");
      await waitFor("the tail text to reach the preview", () =>
        getActivePreviewForTests()?.html.includes("Tail paragraph added after Save.") === true);
      await waitForRender(document);
      await pause(800);
      const t2 = await topNow("ul");
      console.log("RI-T32 list second render: T2=" + t2 + " drift=" + (t2 - t0));
      assert.ok(Math.abs(t2 - t0) <= 3, "the list moved from " + t0 + " to " + t2 + " on the next render");
      await pause(700);
      const t3 = await topNow("ul");
      assert.ok(Math.abs(t3 - t0) <= 3, "the list moved from " + t0 + " to " + t3 + " after the reload");
      await captureAfter(evidence, page, shot,
        "Edit mode on; `Frozen goods` was added with Enter and committed with Mod+Enter in a list whose top "
        + "was " + t0 + " px below the preview top (reading line at " + reading + " px). List top after Save T1="
        + t1 + ", after a second render T2=" + t2 + ", 700 ms later T3=" + t3 + ".");
    });
  };

  await listCase("realinput-t32-list", "block-editing/r19-save-keeps-list-in-place");

  await withDocument("realinput-t32-table", TABLE_PINNED, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const t0 = await topNow("table");
    await withCurrentFrame(page, (frame) => frame.locator("td", { hasText: /^Ana$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await press(page, "End");
    await typeText(page, "-Lee");
    // Typing in a cell of a long document pages it by up to ~1700 px before any commit (unrelated to
    // Save), so this document has only ~200 px of scroll room (nothing after the table) and the table stays visible. R7 is
    // about the commit, so the reference is the table's position when Enter is pressed.
    await pause(800);
    const tCommit = await topNow("table");
    const height = await viewportHeight();
    assert.ok(tCommit >= 0 && tCommit <= height,
      "the table is visible when Enter is pressed (top " + tCommit + ", viewport " + height + ")");
    await press(page, "Enter");
    await waitFor("the cell edit to reach the buffer", () => bufferText(document).includes("Ana-Lee"));
    await waitForRender(document);
    await waitFor("the table cell editor to close after the re-render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    });
    await pause(600);
    const t1 = await topNow("table");
    console.log("RI-T32 table: T0=" + t0 + " Tcommit=" + tCommit + " T1=" + t1
      + " drift=" + (t1 - tCommit));
    assert.ok(t1 >= 0 && t1 <= height, "the table is visible after Save (top " + t1 + ")");
    assert.ok(Math.abs(t1 - tCommit) <= 3,
      "the table moved from " + tCommit + " (at Enter) to " + t1 + " after Save");
    await captureAfter(evidence, page, "table-editing/r07-save-keeps-table-in-place",
      "Edit mode on; the cell `Ana` gained `-Lee` and Enter committed it in a visible table. "
      + "Table top " + t0 + " before the click, " + tCommit + " at Enter and " + t1 + " after Save.");
  });
}

/** RI-T12: Tab and Shift+Tab indent and outdent in the block editor; Escape then Tab leaves it. */
export async function scenarioTabIndents(page: Page, evidence: Evidence): Promise<void> {
  const LIST_DOCUMENT = [
    "# List document",
    "",
    "- Intake",
    "  - Dry goods",
    "    - Refrigerated goods",
    "  - Deduplication",
    "",
  ].join("\n");
  await withDocument("realinput-t12", LIST_DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.getByText("Refrigerated goods", { exact: true }).first().click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    const readFocus = async (): Promise<{ tag: string | undefined; value: string | undefined }> => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return { tag: undefined, value: undefined };
      return current.evaluate(() => {
        const element = document.activeElement;
        return {
          tag: element?.tagName,
          value: element instanceof HTMLTextAreaElement ? element.value : undefined,
        };
      });
    };
    await caretToEnd(page);
    await press(page, "Home");
    await press(page, "Tab");
    const indented = await readFocus();
    assert.equal(indented.tag, "TEXTAREA", "Tab keeps the focus in the editor");
    assert.equal(indented.value, "      - Refrigerated goods", "Tab adds the marker width (2 spaces)");
    await press(page, "Shift+Tab");
    const restored = await readFocus();
    assert.equal(restored.tag, "TEXTAREA", "Shift+Tab keeps the focus in the editor");
    assert.equal(restored.value, "    - Refrigerated goods", "Shift+Tab restores the line");
    await captureAfter(evidence, page, "block-editing/r10-tab-indents",
      "Edit mode on; Tab indented `Refrigerated goods` by 2 spaces and Shift+Tab restored it, "
      + "with the focus staying in the editor.");
    await escapeBlockEditor(page, "the block editor to close after Escape");
    await press(page, "Tab");
    const afterTab = await readFocus();
    assert.notEqual(afterTab.tag, "TEXTAREA", "after Escape, Tab moves the focus out of a textarea");
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(bufferText(source), LIST_DOCUMENT, "indent then outdent leaves the source unchanged");
  });
}

/** RI-T13: a non-Markdown editor does not blank the side preview; another Markdown file switches it. */
export async function scenarioPreviewKeepsMarkdown(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t13", {
    "first.md": "# First heading T13\n\nBody one.\n",
    "second.md": "# Second heading T13\n\nBody two.\n",
    "tool.py": "print('hello')\n",
  });
  try {
    const first = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("first.md")));
    const second = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("second.md")));
    const python = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("tool.py")));
    try {
      await openSidePreview(first);
      await waitForRender(first);
      await vscode.window.showTextDocument(python, vscode.ViewColumn.One);
      await new Promise((resolve) => setTimeout(resolve, 750));
      const preview = getActivePreviewForTests();
      assert.equal(preview?.documentUri, first.uri.toString(), "the preview keeps the Markdown file");
      assert.notEqual(preview?.status, "missing-source");
      const title = getActivePreviewPanelForTests()?.title ?? "";
      assert.ok(title.includes("first.md"), `panel title names the Markdown file: ${title}`);
      await withCurrentFrame(page, async (frame) => {
        await frame.getByText("First heading T13", { exact: false }).first().waitFor({ timeout: 5000 });
      });
      await captureAfter(evidence, page, "lifecycle-sync/r02-preview-keeps-markdown",
        "A Python file is active in column One; the side preview still shows `First heading T13`.");
      await vscode.window.showTextDocument(second, vscode.ViewColumn.One);
      await waitForRender(second);
      assert.ok(getActivePreviewPanelForTests()?.title.includes("second.md"), "the preview switched to the second file");
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

/** RI-T14: clicking a word opens the editor with the caret at that word, not at the block end. */
export async function scenarioCaretAtClick(page: Page, evidence: Evidence): Promise<void> {
  const PARAGRAPH = "Alpha bravo charlie\ndelta echo foxtrot\ngolf hotel india.";
  const DOCUMENT = "# Caret document\n\n" + PARAGRAPH + "\n";
  await withDocument("realinput-t14", DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, async (frame) => {
      const paragraph = frame.locator("p", { hasText: "Alpha bravo" }).first();
      const position = await paragraph.evaluate((element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const node = walker.nextNode();
        const index = (node?.nodeValue ?? "").indexOf("bravo");
        const range = document.createRange();
        range.setStart(node!, index);
        range.setEnd(node!, index + 5);
        const word = range.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return { x: word.left - box.left + 3, y: word.top - box.top + word.height / 2 };
      });
      await paragraph.click({ position });
    });
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await typeText(page, "X");
    await press(page, `${MOD}+Enter`);
    await waitFor("the typed character to reach the buffer", () => bufferText(source).includes("X"));
    const firstLine = lines(bufferText(source)).find((line) => line.includes("X")) ?? "";
    assert.match(firstLine, /^Alpha (?:Xbravo|bXravo|brXavo|braXvo|bravXo|bravoX) charlie$/u, "X lands in or next to bravo: " + firstLine);
    await waitForRender(source);
    await captureAfter(evidence, page, "block-editing/r11-caret-at-click",
      "Edit mode on; clicking the word `bravo` placed the caret there, and the typed `X` landed in line one.");
  });
}

/** RI-T15: hover outlines what a click edits; Done keeps and Cancel restores the block text. */
export async function scenarioEditAffordances(page: Page, evidence: Evidence): Promise<void> {
  const DOCUMENT = "# Affordance document\n\n- outer one\n  - inner a\n  - inner b\n- outer two\n\nAlpha paragraph.\n";
  const CANCEL = "button[aria-label='Cancel editing and restore the original text']";
  const DONE = "button[aria-label='Done editing']";
  await withDocument("realinput-t15", DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("li", { hasText: "inner a" }).first().hover());
    await waitFor("the hovered list to carry the outline attribute", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("ul[data-sphinx-preview-edit-hover='true']").count() === 1;
    });
    await captureAfter(evidence, page, "block-editing/r12-edit-hover",
      "Edit mode on; hovering the nested item outlines the list a click would edit.");

    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Alpha paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await typeText(page, " R");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await captureAfter(evidence, page, "block-editing/r13-editor-frame-and-buttons",
      "A paragraph editor is open and ` R` was typed: framed editor, monospace text, status line with Done and Cancel on one row.");
    await withCurrentFrame(page, (frame) => frame.locator(CANCEL).click());
    await waitForNoBlockEditor(page, "the block editor to close after Cancel");
    await waitFor("Cancel to restore the original buffer", () => bufferText(source) === DOCUMENT);
    assert.equal(bufferText(source), DOCUMENT);
    await waitForRender(source);

    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Alpha paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await typeText(page, " D");
    await withCurrentFrame(page, (frame) => frame.locator(DONE).click());
    await waitFor("Done to keep the typed text", () => bufferText(source).includes("Alpha paragraph. D"));
    await waitForNoBlockEditor(page, "the block editor to close after Done");
    assert.equal(bufferText(source), DOCUMENT.replace("Alpha paragraph.", "Alpha paragraph. D"));
  });
}

/** RI-T16: turning edit mode on keeps the reading layout of paragraphs that are not being edited. */
export async function scenarioEditModeNoReflow(page: Page, evidence: Evidence): Promise<void> {
  const WORDS = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november";
  const paragraph = (seed: number): string => {
    const words = WORDS.split(" ");
    const rotated = words.slice(seed).concat(words.slice(0, seed)).join(" ");
    // Hard-wrap the source at about 40 characters (the side preview is narrow, so 60-character lines
    // would fit one rendered line each and hide the reflow): four source lines per paragraph.
    const out: string[] = [];
    let line = "";
    for (const word of (rotated + " " + rotated).split(" ")) {
      if (line.length + word.length + 1 > 40 && line.length > 0) {
        out.push(line);
        line = word;
      } else {
        line = line.length === 0 ? word : line + " " + word;
      }
    }
    out.push(line);
    return out.slice(0, 4).join("\n");
  };
  const DOCUMENT = [
    "# Reflow document", "", paragraph(0), "", paragraph(3), "", paragraph(6), "",
    "| Name | Value |", "|------|-------|", "| alpha | one |", "",
  ].join("\n");
  await withDocument("realinput-t16", DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    const measure = (): Promise<{ height: number; top: number }> => withCurrentFrame(page, (frame) =>
      frame.locator("p[data-sphinx-source-line]").nth(2).evaluate((element) => ({
        height: document.documentElement.scrollHeight,
        top: element.getBoundingClientRect().top + window.scrollY,
      })));
    const before = await measure();
    await setEditMode(page, true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const after = await measure();
    await captureAfter(evidence, page, "block-editing/r14-edit-mode-no-reflow",
      "Edit mode on; hard-wrapped paragraphs (about 40 characters per source line) keep their reading flow.");
    assert.ok(Math.abs(after.height - before.height) <= 2,
      "scrollHeight changed from " + before.height + " to " + after.height);
    assert.ok(Math.abs(after.top - before.top) <= 2,
      "third paragraph top moved from " + before.top + " to " + after.top);
  });
}

/** RI-T17: Tab moves between table cells, adds a row on the last cell, and focus loss commits. */
export async function scenarioTableTab(page: Page, evidence: Evidence): Promise<void> {
  const CELL = "[data-sphinx-preview-table-cell-editor] textarea";
  const cellValue = async (): Promise<string | undefined> => {
    const current = await findCurrentFrame(page);
    if (current === undefined || await current.locator(CELL).count() !== 1) return undefined;
    return await current.locator(CELL).inputValue();
  };
  await withSmokeDocument("realinput-t17", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^one$/u }).click());
    await waitForEditor(page, CELL);
    await press(page, "Tab");
    await waitFor("Tab to wrap to the cell `beta`", async () => await cellValue() === "beta");
    await caretToEnd(page);
    await typeText(page, "X");
    await press(page, "Tab");
    await waitFor("Tab to open the cell `two`", async () => await cellValue() === "two");
    await press(page, "Tab");
    await waitFor("the editor to be open in a new third body row", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      if (await current.locator("tbody tr").count() !== 3) return false;
      const open = await current.locator("tbody tr:nth-child(3) " + CELL).count();
      return open === 1 && await cellValue() === "";
    });
    // The new row exists only in the render of the saved row, whose page reopens the editor
    // before it reports ready. Type once that render is the host's last one, the page reported it
    // and no deferred update is armed (nothing can replace the editor any more), and the cell
    // editor holds the focus of the page.
    await waitForPageSettled(page, "Tab in the new row", document);
    await waitForTextInput(page, "tbody tr:nth-child(3) " + CELL, "Tab in the new row");
    await typeText(page, "gamma");
    await press(page, "Tab");
    await explained(page, () => waitFor("Tab to open the second cell of the new row", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("tbody tr:nth-child(3) td:nth-child(2) " + CELL).count() === 1;
    }));
    await typeText(page, "three");
    await press(page, "Enter");
    await waitFor("the new row to reach the source buffer", () =>
      /^\|\s*gamma\s*\|\s*three\s*\|$/mu.test(bufferText(document)));
    await waitForRender(document);
    await waitFor("the cell editor to close after Enter", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    });
    assert.match(bufferText(document), /^\|\s*betaX\s*\|\s*two\s*\|$/mu);
    await captureAfter(evidence, page, "table-editing/r05-tab-adds-row",
      "Edit mode on; Tab moved from `one` to `beta` (typed `X`) and `two`, on to a new third row where `gamma` and `three` "
      + "were typed; Enter saved. The buffer holds the new row.");

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^one$/u }).click());
    await waitForEditor(page, CELL);
    // Focus loss within 500 ms of a pointer press is treated as part of the click.
    await new Promise((resolve) => setTimeout(resolve, 700));
    await press(page, "End");
    await typeText(page, "Q");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitFor("focus loss to commit the cell", () => /\|\s*oneQ\s*\|/u.test(bufferText(document)));
    await waitForRender(document);
    await waitFor("the cell editor to close on focus loss", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    });
  });
}

/** RI-T18: the table toolbar sits above the table, never covers a cell, and the cell does not jump. */
export async function scenarioTableToolbar(page: Page, evidence: Evidence): Promise<void> {
  const CELL = "[data-sphinx-preview-table-cell-editor] textarea";
  const TARGET_CELL = "tbody tr:first-child td:nth-child(2)";
  await withSmokeDocument("realinput-t18", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await waitFor("the smoke table cell `one` to render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator(TARGET_CELL).count() === 1;
    });
    const cellTop = async (): Promise<number> => await withCurrentFrame(page, (frame) =>
      frame.locator(TARGET_CELL).evaluate((element) => element.getBoundingClientRect().top));
    const before = await cellTop();
    await withCurrentFrame(page, (frame) => frame.locator(TARGET_CELL).click());
    await waitForEditor(page, CELL);
    await waitFor("the table toolbar to appear above the table", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-sphinx-table-menu] + table, [data-sphinx-table-menu] + .table-wrapper").count() === 1;
    });
    let previous = Number.NaN;
    let after = Number.NaN;
    await waitFor("the selected cell top to be stable", async () => {
      after = await cellTop();
      const stable = after === previous;
      previous = after;
      return stable;
    });
    // The cell may move only by the reveal that clears the floating controls: wider fonts can put
    // the right end of the table toolbar under them, and the page then moves just enough.
    const clearance = await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-table-menu]").evaluate((menu) => {
      const controls = menu.ownerDocument.querySelector("[data-sphinx-preview-toolbar]")?.getBoundingClientRect();
      if (!controls) return undefined;
      const tops = Array.from(menu.querySelectorAll("button, input, textarea, select, a, span, p"))
        .map((item) => item.getBoundingClientRect())
        .filter((box) => box.width > 0 && box.height > 0 && box.left < controls.right && box.right > controls.left)
        .map((box) => box.top);
      const view = menu.ownerDocument.defaultView;
      const scroller = menu.ownerDocument.scrollingElement;
      return {
        controlsBottom: controls.bottom,
        firstTop: tops.length > 0 ? Math.min(...tops) : undefined,
        menuHeight: menu.getBoundingClientRect().height,
        menuTop: menu.getBoundingClientRect().top,
        bandBottom: (() => {
          const band = menu.ownerDocument.querySelector("[data-sphinx-preview-sticky-headings]");
          const box = band && !(band as HTMLElement).hidden ? band.getBoundingClientRect() : undefined;
          return box && box.height > 0 ? box.bottom : undefined;
        })(),
        readingOffset: Number.parseFloat(view?.getComputedStyle(menu.ownerDocument.documentElement)
          .getPropertyValue("--sphinx-preview-reading-offset") ?? "") || undefined,
        scrollY: view?.scrollY,
        maxScroll: scroller ? scroller.scrollHeight - scroller.clientHeight : undefined,
      };
    }));
    const moved = after - before;
    const revealed = moved > 2 && clearance?.firstTop !== undefined
      && Math.abs(clearance.firstTop - (clearance.controlsBottom + 4)) <= 2;
    // A short page cannot scroll by the whole toolbar height: the cell then goes down by the rest.
    const pageTooShort = moved > 2 && clearance?.scrollY !== undefined && clearance.maxScroll !== undefined
      && Math.abs(clearance.scrollY - clearance.maxScroll) <= 1 && moved <= clearance.menuHeight + 1;
    // The toolbar is kept below the reading line (the sticky heading band or the anchor offset):
    // the page moves just enough to put its top there.
    const readingLine = Math.max(clearance?.bandBottom ?? 0, clearance?.readingOffset ?? 0);
    const belowBand = moved > 2 && clearance !== undefined && readingLine > 0
      && Math.abs(clearance.menuTop - readingLine) <= 2 && moved <= clearance.menuHeight + 1;
    assert.ok(Math.abs(moved) <= 2 || revealed || pageTooShort || belowBand,
      "the selected cell moved " + (after - before) + " px; toolbar clearance " + JSON.stringify(clearance));
    await withCurrentFrame(page, async (frame) => {
      const status = await frame.locator("[data-sphinx-table-menu] [data-sphinx-preview-edit-status]").textContent();
      assert.equal(status, "Row 1 of 2 \u00b7 column 2 of 2");
      const labels = await frame.locator(".sphinx-preview-table-menu-label").allTextContents();
      assert.deepEqual(labels, ["Row above", "Row below", "Row \u2212", "Col left", "Col right", "Col \u2212", "List table"]);
      const bar = await frame.locator("[data-sphinx-table-menu]").evaluate((element) => {
        const style = getComputedStyle(element);
        return { position: style.position, top: style.top, left: style.left, bottom: style.bottom,
          right: style.right, zIndex: style.zIndex };
      });
      // In the flow (CR 168): "relative" with no offset (auto or 0px on every side) and z-index 3,
      // which lifts the bar above the row-handle layer without moving it.
      assert.equal(bar.position, "relative", "table bar computed position: " + bar.position);
      for (const side of ["top", "left", "bottom", "right"] as const) {
        assert.ok(bar[side] === "auto" || bar[side] === "0px",
          "table bar computed " + side + " must be auto or 0px (no offset), got: " + bar[side]);
      }
      assert.equal(bar.zIndex, "3", "table bar computed z-index: " + bar.zIndex);
    });
    await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "table-editing/r06-cell-bar-in-flow",
      "Edit mode on; the cell `one` is open. The toolbar sits in the flow above the table with text labels, "
      + "and the selected cell is outlined.",
      { checks: { required: ["overlay-covers-text", "overlay-clipped"] } }));
  });
}
