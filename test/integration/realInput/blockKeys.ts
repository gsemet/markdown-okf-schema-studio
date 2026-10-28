import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { lineDelta } from "../../shared/lineDelta";
import {
  bufferText,
  caretToEnd,
  closeAllEditors,
  createFixture,
  type Evidence,
  findCurrentFrame,
  focusedCaret,
  lines,
  MOD,
  openSidePreview,
  openStudioEditor,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";
import { captureAfter, leaveEditModeOff, SMOKE, TABLE_DOCUMENT, waitForCaretAtEnd, waitForNoBlockEditor, withDocument, withSmokeDocument } from "./common";

export async function scenarioParagraphBlurCommit(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-s1", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " Added.");
    await withCurrentFrame(page, (frame) => frame.locator("h1", { hasText: "Smoke document" }).click());

    const expected = SMOKE.replace("Second paragraph.", "Second paragraph. Added.");
    await waitFor("the paragraph edit to reach the source buffer on blur", () =>
      bufferText(document) === expected);
    assert.deepEqual(lines(bufferText(document)), lines(expected));
    // Autosave already applied the text, so only the blur commit re-renders the preview.
    await waitForRender(document);
    await waitFor("the paragraph to render with the committed text and no open block editor", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      const paragraphs = await current.locator("p", { hasText: "Second paragraph. Added." }).count();
      const openValues = await current.locator("[data-sphinx-preview-block-editor] textarea")
        .evaluateAll((areas) => areas.map((area) => (area as HTMLTextAreaElement).value));
      return paragraphs === 1 && !openValues.some((value) => value.includes("Second paragraph"));
    });
    await captureAfter(evidence, page, "block-editing/r01-paragraph-blur-commit",
      "Edit mode on; the paragraph gained ` Added.` and the heading click moved focus out. "
      + "The buffer line reads `Second paragraph. Added.`; nothing else changed.");
  });
}

/** T42: a comment highlight opens its popover, not the editor; plain text of the block still edits. */
export async function scenarioReviewComments(page: Page, evidence: Evidence): Promise<void> {
  const text = "# Review\n\nThe second paragraph has needle text here.\n\nAnother block without the quote.\n";
  const sidecar = {
    version: 1,
    document: "smoke.md",
    threads: [
      {
        id: "t1",
        anchor: { line: 3, endLine: 3, quote: "needle", prefix: "has ", suffix: " text" },
        resolved: false,
        createdAt: "2026-10-21T10:00:00Z",
        comments: [{ id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "<b>Why?</b>" }],
      },
      {
        id: "t2",
        anchor: { line: 5, endLine: 5, quote: "not in the block", prefix: "", suffix: "" },
        resolved: false,
        createdAt: "2026-10-21T10:00:00Z",
        comments: [{ id: "c2", author: "Bob", createdAt: "2026-10-21T10:00:00Z", body: "Second" }],
      },
    ],
  };
  const fixture = createFixture("realinput-comments", {
    "smoke.md": text,
    "smoke.comments.json": `${JSON.stringify(sidecar, null, 2)}\n`,
  });
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      const paragraph = "p:has-text('The second paragraph')";
      // T45: the quote of t2 is nowhere in the document, so the host orphans it (D25) instead of
      // leaving a badge on whatever block sits at its old line.
      await waitFor("the highlight and the orphaned entry", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("mark[data-okf-comment-thread]").count() === 1
        && await frame.locator("button[data-okf-comment-badge]").count() === 0
        && await frame.locator("[data-okf-comment-orphan]").count() === 1));
      await withCurrentFrame(page, async (frame) => {
        assert.equal(await frame.locator(paragraph).first().evaluate((element) => element.textContent),
          "The second paragraph has needle text here.", "the highlight adds no text");
        assert.equal(await frame.locator("mark[data-okf-comment-thread]").textContent(), "needle");
      });
      await withCurrentFrame(page, (frame) => frame.locator("mark[data-okf-comment-thread]").click());
      await waitFor("the popover", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-okf-comment-popover]").count() === 1));
      await withCurrentFrame(page, async (frame) => {
        assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 0, "no editor opened");
        const popover = frame.locator("[data-okf-comment-popover]");
        assert.match(await popover.textContent() ?? "", /<b>Why\?<\/b>/u);
        assert.equal(await popover.locator("b").count(), 0, "the body is text");
      });
      await captureAfter(evidence, page, "review-annotations/r02-review-thread-popover", "Edit mode on; the popover shows the thread and no editor is open.");
      // Plain text of the same block still edits (the click lands on the first words).
      await withCurrentFrame(page, async (frame) => {
        const target = frame.locator(paragraph).first();
        const box = await target.boundingBox();
        assert.ok(box);
        await target.click({ position: { x: 30, y: box.height / 2 } });
      });
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await withCurrentFrame(page, async (frame) => {
        assert.equal(await frame.locator("[data-okf-comment-popover]").count(), 0, "the popover closed");
      });
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

export async function scenarioCtrlEnterCommit(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-s2", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "First paragraph" }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await caretToEnd(page);
    await waitForCaretAtEnd(page);
    await typeText(page, " X");
    await press(page, `${MOD}+Enter`);

    const expected = SMOKE.replace("continues on line two.", "continues on line two. X");
    await waitFor("the Cmd/Ctrl+Enter edit to reach the source buffer", () =>
      bufferText(document) === expected);
    assert.equal(lines(bufferText(document))[3], "continues on line two. X");
    await waitForRender(document);
    await waitForNoBlockEditor(page, "the block editor to close after the re-render");
    await captureAfter(evidence, page, "block-editing/r02-mod-enter-commit",
      "Edit mode on; the first paragraph gained ` X` and Cmd/Ctrl+Enter saved it. The editor is closed "
      + "after the re-render, and buffer line 4 reads `continues on line two. X`.");
  });
}

/** T37: Alt+Up/Down on a focused block, and Cmd/Ctrl+Alt+Up/Down inside its text box. */
export async function scenarioBlockMoveKeys(page: Page, evidence: Evidence): Promise<void> {
  const document3 = (order: string[]): string =>
    ["# Move keys", "", ...order.flatMap((name) => [name.includes(" ") ? name : name + " paragraph.", ""])].join("\n");
  await withDocument("realinput-move-keys", document3(["Alpha", "Beta", "Gamma"]), async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const activeText = (): Promise<string> => withCurrentFrame(page, (frame) =>
      frame.evaluate(() => window.document.activeElement?.textContent ?? ""));
    const expectOrder = async (order: string[], description: string): Promise<void> => {
      await waitFor(description, () => bufferText(document) === document3(order));
      await waitForRender(document);
      await waitForNoBlockEditor(page, "no block editor after " + description);
    };
    // Focus the down arrow of Alpha's bar, then Alt+Down twice: each move waits for the render.
    await withCurrentFrame(page, (frame) =>
      frame.locator("[data-sphinx-insert-after-line] button[data-sphinx-move='down']").nth(1).focus());
    await press(page, "Alt+ArrowDown");
    await expectOrder(["Beta", "Alpha", "Gamma"], "the first Alt+Down to move Alpha below Beta");
    await waitFor("the focus to follow Alpha", async () => (await activeText()).includes("Alpha"));
    await press(page, "Alt+ArrowDown");
    await expectOrder(["Beta", "Gamma", "Alpha"], "the second Alt+Down to move Alpha below Gamma");
    await waitFor("the focus to stay on Alpha", async () => (await activeText()).includes("Alpha"));
    // One undo step per move.
    await captureAfter(evidence, page, "block-editing/r21-alt-down-moves-block",
      "Edit mode on; Alt+Down was pressed twice on Alpha's block: the order is Beta, Gamma, Alpha.");

    // In the text box: the chord saves, moves, and reopens on the block with the caret in place.
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Beta paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "Home");
    await press(page, "ArrowRight");
    await press(page, "ArrowRight");
    await typeText(page, "!");
    await press(page, MOD + "+Alt+ArrowDown");
    await waitFor("the chord to save the edit and move the block", () =>
      bufferText(document) === document3(["Gamma", "Be!ta paragraph.", "Alpha"]));
    await waitForRender(document);
    await waitFor("the editor to reopen on the moved block with the caret after `Be!`", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      const value = await current.locator("[data-sphinx-preview-block-editor] textarea")
        .evaluateAll((areas) => areas.map((area) => (area as HTMLTextAreaElement).value));
      const caret = await focusedCaret(current);
      return value.length === 1 && value[0].startsWith("Be!ta paragraph.") && caret?.start === 3 && caret.end === 3;
    });
    await press(page, MOD + "+Alt+ArrowUp");
    await waitFor("the chord to move the block back up", () =>
      bufferText(document) === document3(["Be!ta paragraph.", "Gamma", "Alpha"]));
    await waitForRender(document);
    // Plain Alt+Arrow in the text box is not a move (macOS: word navigation).
    const before = bufferText(document);
    await press(page, "Alt+ArrowDown");
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    assert.equal(bufferText(document), before, "plain Alt+Arrow moved nothing");
    await captureAfter(evidence, page, "block-editing/r22-move-chord-keeps-editor",
      "The Cmd/Ctrl+Alt chord saved `Be!ta`, moved the block down and back up; the editor stays open on it.");
  });
}

/** T39: Shift+click across three blocks, Shift+Up shrinks, Escape clears; CR 157: Right and Escape walk into and out of a table; nothing is edited. */
export async function scenarioBlockSelection(page: Page, evidence: Evidence): Promise<void> {
  const text = ["# Selection", "", "Alpha paragraph.", "", "Beta paragraph.", "", "Gamma paragraph.", "",
    "| Head one | Head two |", "| --- | --- |", "| cell a | cell b |", ""].join("\n");
  await withDocument("realinput-block-selection", text, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const selected = (): Promise<string[]> => withCurrentFrame(page, (frame) =>
      frame.evaluate(() => Array.from(window.document.querySelectorAll("[data-sphinx-preview-block-selected]"))
        .map((element) => element.textContent ?? "")));
    const announced = (): Promise<string> => withCurrentFrame(page, (frame) =>
      frame.evaluate(() => window.document.querySelector(".sphinx-preview-selection-status")?.textContent ?? ""));
    await withCurrentFrame(page, async (frame) => {
      await frame.locator("p", { hasText: "Alpha paragraph." }).click({ modifiers: ["Shift"] });
      await frame.locator("p", { hasText: "Gamma paragraph." }).click({ modifiers: ["Shift"] });
    });
    await waitFor("three blocks to be selected", async () => (await selected()).length === 3);
    assert.equal(await announced(), "3 blocks selected");
    await waitForNoBlockEditor(page, "Shift+click opens no block editor");
    await captureAfter(evidence, page, "block-editing/r20-shift-click-selects-blocks",
      "Shift+click on Alpha then Gamma outlines the three body blocks; no editor is open.");
    await press(page, "Shift+ArrowUp");
    await waitFor("Shift+Up to shrink the selection", async () => (await selected()).length === 2);
    assert.equal(await announced(), "2 blocks selected");
    await press(page, "Escape");
    await waitFor("Escape to clear the selection", async () => (await selected()).length === 0);
    // CR 157: with the keyboard on the table, Right goes down into its first cell and Escape back up.
    const cellFocus = (): Promise<string[]> => withCurrentFrame(page, (frame) =>
      frame.evaluate(() => Array.from(window.document.querySelectorAll("[data-sphinx-preview-cell-focus]"))
        .map((element) => (element.textContent ?? "").trim())));
    for (let step = 0; step < 8 && !(await selected()).some((entry) => entry.includes("Head one")); step += 1) {
      await press(page, "ArrowDown");
    }
    await waitFor("the table to be selected from the keyboard", async () =>
      (await selected()).some((entry) => entry.includes("Head one")));
    await press(page, "ArrowRight");
    await waitFor("Right to select the first header cell", async () => (await cellFocus()).join() === "Head one");
    assert.equal((await selected()).length, 0, "the cell, not the table block, is outlined");
    await press(page, "ArrowRight");
    await waitFor("Right to move to the next cell", async () => (await cellFocus()).join() === "Head two");
    await press(page, "Escape");
    await waitFor("Escape to select the table block again", async () =>
      (await cellFocus()).length === 0 && (await selected()).some((entry) => entry.includes("Head one")));
    await waitForNoBlockEditor(page, "the structural keys open no block editor");
    assert.equal(bufferText(document), text, "selecting changes nothing in the document");
  });
}

/** T41: select two blocks, Alt+Up/Down moves the span, the selection follows */
export async function scenarioBlockMoveSelection(page: Page, evidence: Evidence): Promise<void> {
  const document4 = (order: string[]): string =>
    ["# Move span", "", ...order.flatMap((name) => [name + " paragraph.", ""])].join("\n");
  await withDocument("realinput-move-selection", document4(["Alpha", "Beta", "Gamma", "Delta"]), async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const selected = (): Promise<string[]> => withCurrentFrame(page, (frame) =>
      frame.evaluate(() => Array.from(window.document.querySelectorAll("[data-sphinx-preview-block-selected]"))
        .map((element) => element.textContent ?? "")));
    await withCurrentFrame(page, async (frame) => {
      await frame.locator("p", { hasText: "Alpha paragraph." }).click({ modifiers: ["Shift"] });
      await frame.locator("p", { hasText: "Beta paragraph." }).click({ modifiers: ["Shift"] });
    });
    await waitFor("two blocks to be selected", async () => (await selected()).length === 2);
    await press(page, "Alt+ArrowDown");
    await waitFor("the span to move below Gamma", () =>
      bufferText(document) === document4(["Gamma", "Alpha", "Beta", "Delta"]));
    await waitForRender(document);
    await waitFor("the selection to follow Alpha and Beta", async () => {
      const blocks = await selected();
      return blocks.length === 2 && blocks[0].includes("Alpha") && blocks[1].includes("Beta");
    });
    await press(page, "Alt+ArrowDown");
    await waitFor("the span to move below Delta", () =>
      bufferText(document) === document4(["Gamma", "Delta", "Alpha", "Beta"]));
    await waitForRender(document);
    await waitFor("the selection to stay on Alpha and Beta", async () => (await selected()).length === 2);
    await press(page, "Alt+ArrowUp");
    await waitFor("the span to move back up", () =>
      bufferText(document) === document4(["Gamma", "Alpha", "Beta", "Delta"]));
    await captureAfter(evidence, page, "block-editing/r23-alt-arrows-move-selection",
      "Alpha and Beta were selected, then moved down twice and up once with Alt+Arrow: the order is Gamma, "
      + "Alpha, Beta, Delta and both stay selected.");
  });
}

export async function scenarioArrowNavigation(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-s3", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await caretToEnd(page);
    await waitForCaretAtEnd(page);
    await press(page, "ArrowDown");

    await waitFor("the table block editor after ArrowDown", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      const textarea = current.locator("[data-sphinx-preview-block-editor] textarea");
      if (await textarea.count() !== 1) return false;
      return (await textarea.inputValue()).startsWith("| Name | Value |");
    });
    await captureAfter(evidence, page, "block-editing/r03-arrow-down-into-table",
      "Edit mode on; ArrowDown at the end of the paragraph moved the raw Markdown editor to the table, "
      + "whose textarea starts with `| Name | Value |`.");
  });
}

export async function scenarioTableCellEnter(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-s4", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^one$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await press(page, "End");
    await typeText(page, "1");
    await press(page, "Enter");

    await waitFor("the table cell edit to reach the source buffer", () =>
      bufferText(document).includes("| alpha | one1 |"));
    // Autosave already applied the cell text, so only the Enter commit re-renders the table.
    await waitForRender(document);
    await waitFor("the table cell editor to close after the re-render", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      if (await current.locator("[data-sphinx-preview-table-cell-editor]").count() !== 0) return false;
      return await current.locator("td", { hasText: /^one1$/u }).count() === 1;
    });
    const tableRows = lines(bufferText(document)).filter((line) => line.startsWith("|"));
    assert.equal(tableRows.length, 4, "the table keeps its header, separator and two rows");
    await captureAfter(evidence, page, "table-editing/r01-cell-enter-saves",
      "Edit mode on; the cell `one` was edited with End, `1` and Enter. The buffer contains "
      + "`| alpha | one1 |` and the table still has four lines.");
  });
}

/** RI-T35: Cmd/Ctrl+B in a table cell bolds the selection and Enter saves the cell. */
export async function scenarioTableCellBold(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t35", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^one$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await press(page, "End");
    for (let index = 0; index < "one".length; index += 1) await press(page, "Shift+ArrowLeft");
    await press(page, `${MOD}+b`);
    await waitFor("the bold shortcut to reach the table cell", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      return await current.locator("[data-sphinx-preview-table-cell-editor] textarea").inputValue() === "**one**";
    });
    await press(page, "Enter");
    await waitFor("the bold table cell to reach the source buffer", () =>
      bufferText(document).includes("| alpha | **one** |"));
    await waitFor("the table cell editor to close after the re-render", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      return await current.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    });
    await captureAfter(evidence, page, "table-editing/r08-cell-bold-shortcut",
      "Edit mode on; the cell `one` was selected, bolded with Cmd/Ctrl+B and saved with Enter. The "
      + "buffer contains `| alpha | **one** |`.");
  });
}

/** RI-T04: one cell edit changes exactly one source line, in a padded and in a compact table. */
export async function scenarioTableMinimalDiff(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t04", TABLE_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("td", { hasText: /^second$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await press(page, "End");
    await typeText(page, " X");
    await press(page, "Enter");

    const paddedEdited = TABLE_DOCUMENT.replace("| first    | second   |", "| first    | second X |");
    await waitFor("the padded table cell edit to reach the source buffer", () =>
      bufferText(document) === paddedEdited);
    assert.deepEqual(lineDelta(TABLE_DOCUMENT, bufferText(document)), {
      removed: ["| first    | second   |"],
      added: ["| first    | second X |"],
    });
    await waitForRender(document);
    await waitFor("the padded cell editor to close and show the edited value", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      if (await current.locator("[data-sphinx-preview-table-cell-editor]").count() !== 0) return false;
      return await current.locator("td", { hasText: /^second X$/u }).count() === 1;
    });
    await captureAfter(evidence, page, "table-editing/r02-padded-table-minimal-diff",
      "Edit mode on; the padded table cell `second` gained ` X` and Enter saved it. The buffer changed "
      + "only the line `| first    | second X |`; the alignment padding is kept.");

    await withCurrentFrame(page, (frame) => frame.locator("td", { hasText: /^Ana$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await press(page, "End");
    await typeText(page, " Lee");
    await press(page, "Enter");

    const compactEdited = paddedEdited.replace("| Plan | Ana |", "| Plan | Ana Lee |");
    await waitFor("the compact table cell edit to reach the source buffer", () =>
      bufferText(document) === compactEdited);
    assert.deepEqual(lineDelta(paddedEdited, bufferText(document)), {
      removed: ["| Plan | Ana |"],
      added: ["| Plan | Ana Lee |"],
    });
    await waitForRender(document);
    await waitFor("the compact cell editor to close and show the edited value", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      if (await current.locator("[data-sphinx-preview-table-cell-editor]").count() !== 0) return false;
      return await current.locator("td", { hasText: /^Ana Lee$/u }).count() === 1;
    });
    await captureAfter(evidence, page, "table-editing/r03-compact-table-minimal-diff",
      "Edit mode on; the compact table cell `Ana` gained ` Lee` and Enter saved it. The buffer changed "
      + "only the line `| Plan | Ana Lee |`; the compact `|---|---|` delimiter is untouched.");
  });
}

export async function scenarioOpenWithEditor(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-s5", async (document) => {
    await openStudioEditor(document.uri);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " Z");
    await press(page, `${MOD}+Enter`);

    const expected = SMOKE.replace("Second paragraph.", "Second paragraph. Z");
    await waitFor("the Open With edit to reach the source buffer", () =>
      bufferText(document) === expected);
    assert.ok(bufferText(document).includes("Second paragraph. Z"));
    // Autosave already applied the text, so only Cmd/Ctrl+Enter re-renders and closes the editor.
    await waitForRender(document);
    await waitForNoBlockEditor(page, "the block editor to close after Cmd/Ctrl+Enter");
    await waitFor("the paragraph to render with the committed text", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("p", { hasText: "Second paragraph. Z" }).count() === 1;
    });
    await captureAfter(evidence, page, "lifecycle-sync/r01-open-with-editor",
      "Opened with the Studio Open With editor (no side preview); edit mode on; Cmd/Ctrl+Enter saved "
      + "`Second paragraph. Z` to the buffer.");
  });
}
