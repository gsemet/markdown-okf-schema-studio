import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { parse as parseYaml } from "yaml";
import { type Page } from "playwright-core";

import { lineDelta } from "../../shared/lineDelta";
import {
  bufferText,
  type Evidence,
  findCurrentFrame,
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
import {
  traceDocumentChanges,
  windowFocusReport,
} from "../windowFocus";
import { captureAfter, escapeBlockEditor, realInputId, SMOKE, waitForCaretAtEnd, waitForNoBlockEditor, withDocument, withSmokeDocument } from "./common";
import { explained, selectAllInControl, waitForPageSettled, waitForTextInput } from "./flushBeforeNavigate";

export const REQ_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  status:",
  "    type: string",
  "    enum:",
  "      - draft",
  "      - active",
  "  tags:",
  "    type: array",
  "    items:",
  "      type: string",
  "  summary:",
  "    type: string",
  "  derives_from:",
  "    type: array",
  "    items:",
  "      type: string",
  "",
].join("\n");

/** F1 style frontmatter: compact sequences and a two-line plain scalar. */
const REQ_DOCUMENT = [
  "---",
  "type: req",
  "title: Write CSV output",
  "status: draft",
  "tags:",
  "- alpha",
  "- beta",
  "summary: When export is requested, the service SHALL write the report",
  "  as CSV.",
  "derives_from:",
  "- StRS-CORE-001",
  "---",
  "",
  "# Requirement",
  "",
  "Body text.",
  "",
].join("\n");

/** RI-T05: one frontmatter value edit changes only that field's line. */
export async function scenarioFrontmatterValueMinimalPatch(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t05", REQ_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="status"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] > select");

    // Type-ahead: a printable key on the focused closed select selects the matching option. The
    // ArrowDown key does not change the select value in this harness (probed on macOS: the value
    // stayed `draft`), so the option is chosen with the letter `a` (matches `active`).
    await press(page, "a");
    await waitFor("the status select to show active", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      const select = current.locator("[data-okf-frontmatter-editor] > select");
      return await select.count() === 1 && await select.inputValue() === "active";
    });
    await press(page, "Enter");

    const expected = REQ_DOCUMENT.replace("status: draft\n", "status: active\n");
    await waitFor("the status edit to reach the source buffer", () =>
      bufferText(document) === expected);
    assert.deepEqual(lineDelta(REQ_DOCUMENT, bufferText(document)), {
      removed: ["status: draft"],
      added: ["status: active"],
    });
    await waitForRender(document);
    await waitFor("the status editor to close after the re-render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    await captureAfter(evidence, page, "frontmatter-editing/r01-value-minimal-patch",
      "Edit mode on; the status row was changed to `active` by typing `a` on the focused select "
      + "and pressing Enter. The buffer changed only the line `status: active`; the compact sequences and the two-line summary are untouched.");
  }, REQ_SCHEMA);
}

/** RI-T06: renaming and removing a frontmatter field change only that field's lines. */
export async function scenarioFrontmatterStructuralMinimalPatch(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t06", REQ_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="summary"] [data-okf-edit-cell="name"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] > input");
    // Cmd/Ctrl+A stays in the control (selectAllKey.ts): no asynchronous workbench echo to wait for.
    await selectAllInControl(page, "[data-okf-frontmatter-editor] > input", "RI-T06 key editor");
    await typeText(page, "abstract");
    await press(page, "Enter");

    const renamed = REQ_DOCUMENT.replace("summary: When", "abstract: When");
    await waitFor("the key rename to reach the source buffer", () =>
      bufferText(document) === renamed);
    assert.deepEqual(lineDelta(REQ_DOCUMENT, bufferText(document)), {
      removed: ["summary: When export is requested, the service SHALL write the report"],
      added: ["abstract: When export is requested, the service SHALL write the report"],
    });
    await waitForRender(document);
    await waitFor("the key editor to close after the re-render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    await captureAfter(evidence, page, "frontmatter-editing/r02-rename-minimal-patch",
      "Edit mode on; the name cell `summary` was renamed to `abstract` by select-all, typing and Enter. "
      + "The buffer changed only the line `abstract: When export ...`; the continuation line `  as CSV.` is untouched.");

    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="tags"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor]");
    await withCurrentFrame(page, (frame) =>
      frame.locator('[data-okf-frontmatter-operation="remove"]').click());

    const removed = renamed.replace("tags:\n- alpha\n- beta\n", "");
    await waitFor("the field removal to reach the source buffer", () =>
      bufferText(document) === removed);
    assert.deepEqual(lineDelta(renamed, bufferText(document)), {
      removed: ["tags:", "- alpha", "- beta"],
      added: [],
    });
    await waitForRender(document);
    await waitFor("the tags row to disappear after the re-render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator('tr[data-okf-field="tags"]').count() === 0;
    });
    await captureAfter(evidence, page, "frontmatter-editing/r03-remove-minimal-patch",
      "Edit mode on; the `tags` value was opened and the Remove frontmatter field button pressed. "
      + "The buffer lost exactly the three lines `tags:`, `- alpha` and `- beta`.");
  }, REQ_SCHEMA);
}

/** Parses the frontmatter block of a document with the `yaml` package. */
function frontmatterOf(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(text);
  assert.ok(match, "document has a frontmatter block");
  return parseYaml(match[1] ?? "") as Record<string, unknown>;
}

/** RI-T07: Enter saves a one-line text field; Shift+Enter then Cmd/Ctrl+Enter saves two lines. */
export async function scenarioEnterCommitsTextField(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t07", REQ_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="title"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await selectAllInControl(page, "[data-okf-frontmatter-editor] textarea", "RI-T07 title");
    const title = 'Write CSV output: with quotes "and" colons';
    await typeText(page, title);
    await press(page, "Enter");

    await waitFor("the title to reach the source buffer", () =>
      frontmatterOf(bufferText(document)).title === title);
    assert.equal(frontmatterOf(bufferText(document)).title, title);
    await waitForRender(document);
    await waitFor("the title editor to close after the re-render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    await captureAfter(evidence, page, "frontmatter-editing/r04-title-enter-saves",
      "Edit mode on; the title was replaced and Enter saved it as a one-line scalar.");

    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="title"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await waitForCaretAtEnd(page);
    await typeText(page, "a");
    await press(page, "Shift+Enter");
    await typeText(page, "b");
    await press(page, `${MOD}+Enter`);

    await waitFor("the two-line title to reach the source buffer", () =>
      frontmatterOf(bufferText(document)).title === `${title}a\nb`);
    await waitForRender(document);
    await waitFor("the title editor to close after the second save", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    await captureAfter(evidence, page, "frontmatter-editing/r05-title-multiline",
      "Edit mode on; Shift+Enter added a line and Cmd/Ctrl+Enter saved a two-line title.");
  }, REQ_SCHEMA);
}

/**
 * RI-T08: Escape cancels (block and table cell), also after an autosave reached the buffer;
 * Cmd/Ctrl+Enter and leaving edit mode keep the typed text.
 */
export async function scenarioEscapeCancels(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t08", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " DROP ME.");
    await escapeBlockEditor(page, "the block editor to close after Escape");
    await new Promise((resolve) => setTimeout(resolve, 800));
    assert.equal(bufferText(document), SMOKE, "Escape cancels the block edit");

    // Autosave (400 ms debounce) already wrote the text: Escape must restore the original block.
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " DROP ME TOO.");
    await waitFor("the autosave to reach the source buffer", () =>
      bufferText(document).includes("Second paragraph. DROP ME TOO."));
    await press(page, "Escape");
    await waitFor("Escape to restore the original buffer after an autosave", () =>
      bufferText(document) === SMOKE);
    await waitForRender(document);
    await waitForNoBlockEditor(page, "the block editor to close after Escape");
    assert.equal(bufferText(document), SMOKE);
    await captureAfter(evidence, page, "block-editing/r05-escape-cancels-block",
      "Edit mode on; ` DROP ME TOO.` was typed (and autosaved) in the paragraph and Escape closed "
      + "the editor. The preview and the source buffer show the original text again.");

    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " KEEP ME PLEASE.");
    await press(page, process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
    const kept = SMOKE.replace("Second paragraph.", "Second paragraph. KEEP ME PLEASE.");
    await waitFor("the Cmd/Ctrl+Enter commit to keep the typed text in the source buffer", () =>
      bufferText(document) === kept);
    await waitForRender(document);
    await waitForNoBlockEditor(page, "the block editor to close after Cmd/Ctrl+Enter");
    assert.equal(bufferText(document), kept);

    await withCurrentFrame(page, (frame) =>
      frame.locator("p", { hasText: "Second paragraph. KEEP ME PLEASE." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " B");
    await setEditMode(page, false);
    const withB = kept.replace("PLEASE.", "PLEASE. B");
    await waitFor("turning edit mode off to keep the typed text", () => bufferText(document) === withB);
    await waitForRender(document);
    await waitForNoBlockEditor(page, "the block editor to close after edit mode is turned off");
    assert.equal(bufferText(document), withB);

    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^two$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await press(page, "End");
    await typeText(page, "2");
    await waitFor("the table cell autosave to reach the source buffer", () =>
      bufferText(document).includes("| beta | two2 |"));
    await press(page, "Escape");
    await waitFor("the table cell Escape to restore the original cell", () =>
      !bufferText(document).includes("two2"));
    await waitForRender(document);
    await waitFor("the table cell editor to close after Escape", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    });
    assert.equal(bufferText(document), withB);
    await captureAfter(evidence, page, "table-editing/r04-escape-cancels-cell",
      "Edit mode on; the cell `two` gained `2` (autosaved) and Escape closed the editor. The cell "
      + "reads `two` again in the preview and in the buffer.");
  });
}

export async function scenarioTypingUndoGrouping(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t09", async (document) => {
    const changes: Array<{ rangeLength: number; textLength: number }> = [];
    let recording = false;
    const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (!recording || event.document.uri.toString() !== document.uri.toString()) return;
      for (const change of event.contentChanges) {
        changes.push({ rangeLength: change.rangeLength, textLength: change.text.length });
      }
    });
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await press(page, "End");
      recording = true;
      const typed = " twenty characters!!";
      await typeText(page, typed, 25);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await withCurrentFrame(page, (frame) => frame.locator("h1", { hasText: "Smoke document" }).click());

      const expected = SMOKE.replace("Second paragraph.", "Second paragraph." + typed);
      await waitFor("the typed paragraph in the source buffer", () => bufferText(document) === expected);
      await waitForRender(document);
      recording = false;
      assert.ok(changes.length <= 2, "content changes while typing: " + JSON.stringify(changes));
      for (const change of changes) {
        assert.ok(change.rangeLength + change.textLength <= 40,
          "every change is minimal: " + JSON.stringify(changes));
      }
      // The click on the heading saved the paragraph and then opened the heading's own editor
      // (the clicked block opens after the save): close it unchanged before the undo.
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await escapeBlockEditor(page, "the block editor to close before the undo");
      assert.equal(bufferText(document), expected, "closing the heading editor changes nothing");
      const undoTrace = traceDocumentChanges(document);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
      await vscode.commands.executeCommand("undo");
      try {
        await waitFor("one undo to restore the paragraph", () => bufferText(document) === SMOKE);
      } catch (error) {
        throw new Error(String(error) + " Buffer paragraph line: "
          + JSON.stringify(lines(bufferText(document))[5]) + "; changes: " + JSON.stringify(changes)
          + "; window focus: " + await windowFocusReport(page)
          + "; buffer changes since the undo step: " + undoTrace.report());
      } finally {
        undoTrace.dispose();
      }
      await captureAfter(evidence, page, "block-editing/r06-typing-one-undo-step",
        "Typed 20 characters inline; " + changes.length + " content change(s) reached the source "
        + "(" + JSON.stringify(changes) + "), and one undo restored `Second paragraph.`.");
    } finally {
      subscription.dispose();
    }
  });
}

/** RI-T10: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z undo typing inside the open inline editor. */
export async function scenarioUndoStaysInEditor(
  page: Page,
  evidence: Evidence,
  mode: "side" | "open-with",
): Promise<void> {
  await withSmokeDocument("realinput-t10-" + mode, async (source) => {
    if (mode === "side") await openSidePreview(source);
    else await openStudioEditor(source.uri);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " abc");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await typeText(page, " def");
    await new Promise((resolve) => setTimeout(resolve, 600));

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
    const withTyped = (typed: string): string => "Second paragraph." + typed;

    await press(page, MOD + "+z");
    try {
      await waitFor("the undo to remove the last typing chunk", async () => {
        const state = await readEditor();
        // Chromium undoes by word, so a trailing space may remain (`... abc `).
        return state.tag === "TEXTAREA" && state.value !== undefined
          && state.value.length < withTyped(" abc def").length
          && withTyped(" abc def").startsWith(state.value)
          && state.value.startsWith(withTyped(""));
      });
    } catch (error) {
      throw new Error(String(error) + " Editor state: " + JSON.stringify(await readEditor())
        + "; buffer: " + JSON.stringify(lines(bufferText(source))[5]));
    }
    const afterUndo = await readEditor();
    assert.equal(afterUndo.tag, "TEXTAREA", "the inline editor keeps focus after undo");
    await waitFor("the buffer to follow the undone textarea", async () => {
      const state = await readEditor();
      return state.value !== undefined
        && lines(bufferText(source)).includes(state.value);
    });
    await press(page, MOD + "+Shift+z");
    await waitFor("the redo to restore the typing", async () => {
      const state = await readEditor();
      return state.tag === "TEXTAREA" && state.value === withTyped(" abc def");
    });
    await captureAfter(evidence, page, realInputId("16-undo-stays-" + mode),
      "Typed ` abc` and ` def` inline (" + mode + "); Cmd/Ctrl+Z undid typing inside the textarea "
      + "and Cmd/Ctrl+Shift+Z restored it; the inline editor stayed open and focused.");
  });
}

/** RI-T20: Cmd/Ctrl+B and Ctrl+/ edit the text box, and one Cmd/Ctrl+Z undoes each of them. */
export async function scenarioShortcuts(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t20", async (source) => {
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
        throw new Error(String(error) + " Editor state: " + JSON.stringify(await readEditor()));
      }
    };
    const original = "Second paragraph.";
    await press(page, "End");
    await press(page, "ArrowLeft");
    for (let index = 0; index < "paragraph".length; index += 1) await press(page, "Shift+ArrowLeft");

    await press(page, MOD + "+b");
    await expectValue("Cmd/Ctrl+B to bold the selected word", "Second **paragraph**.");
    assert.equal((await readEditor()).tag, "TEXTAREA", "the shortcut keeps the focus in the editor");
    await press(page, MOD + "+z");
    await expectValue("one undo to restore the word", original);

    await press(page, "Control+/");
    await expectValue("Ctrl+/ to wrap the line in a TODO comment", "<!-- TODO: " + original + " -->");
    // Captured with the TODO wrapper visible, before the undo that restores the line.
    await captureAfter(evidence, page, "palette-slash/r03-shortcuts-bold-todo",
      "Edit mode on; Cmd/Ctrl+B bolded the selected word (undone by one Cmd/Ctrl+Z) and Ctrl+/ wrapped the line "
      + "in a TODO comment; the image shows the wrapped line before its single Cmd/Ctrl+Z, with the focus in the text box.");
    await press(page, MOD + "+z");
    await expectValue("one undo to restore the line", original);
    await escapeBlockEditor(page, "the block editor to close after Escape");
  });
}

/** RI-P11: the / command menu: /h2 Enter, /tab Enter (size grid) and an Escape that keeps the text. */
export async function scenarioSlashMenu(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-p11", async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    // Nothing may replace the page under the editor, and the keys below need the caret in its box.
    await waitForPageSettled(page, "slash menu", source);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await waitForTextInput(page, "[data-sphinx-preview-block-editor] textarea", "slash menu");
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
        throw new Error(String(error) + " Editor state: " + JSON.stringify(await readEditor()));
      }
    };
    const count = async (selector: string): Promise<number> => {
      const current = await findCurrentFrame(page);
      return current === undefined ? -1 : current.locator(selector).count();
    };
    const waitMenu = async (open: boolean, description: string): Promise<void> => {
      try {
        await explained(page, () => waitFor(description, async () => (await count("[data-slash-menu]")) === (open ? 1 : 0)));
      } catch (error) {
        throw new Error(String(error) + " Editor state: " + JSON.stringify(await readEditor())
          + "; window focus: " + await windowFocusReport(page));
      }
    };
    const original = "Second paragraph.";
    await press(page, "End");

    // /h2 then Enter: the query is replaced by the heading prefix, the focus stays in the box.
    await press(page, "Enter");
    await typeText(page, "/");
    await waitMenu(true, "the slash menu to open after a line break");
    await captureAfter(evidence, page, "palette-slash/r02-slash-open",
      "Edit mode on; typing / on a new line of the paragraph editor opened the command menu under the caret.");
    await typeText(page, "h2");
    await waitFor("the menu to list Heading 2 first", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      return await current.locator("[data-slash-id]").first().getAttribute("data-slash-id") === "heading:2";
    });
    await press(page, "Enter");
    await waitMenu(false, "the menu to close after Enter");
    await expectValue("/h2 Enter to write the heading prefix", original + "\n## ");
    assert.equal((await readEditor()).tag, "TEXTAREA", "the focus stays in the text box");
    await typeText(page, "Title");
    await expectValue("the heading text", original + "\n## Title");
    // Undo walks back through the typed title; the step that follows the bare prefix must bring
    // the /h2 back in one go (the command is a single native edit).
    let previous = String((await readEditor()).value);
    let reachedPrefix = false;
    for (let step = 0; step < 12; step += 1) {
      await press(page, MOD + "+z");
      await new Promise<void>((resolve) => setTimeout(resolve, 120));
      const value = String((await readEditor()).value);
      if (previous === original + "\n## ") {
        assert.equal(value, original + "\n/h2", "one undo brings the /h2 back");
        reachedPrefix = true;
        break;
      }
      previous = value;
    }
    assert.ok(reachedPrefix, "undo reached the bare heading prefix");
    // Restore the paragraph for the next part: undo everything that is left.
    for (let step = 0; step < 6; step += 1) await press(page, MOD + "+z");
    await expectValue("undo back to the start", original);

    // /tab Enter: the menu closes and the table size grid opens, exactly like the Table button.
    await press(page, "End");
    await press(page, "Enter");
    await typeText(page, "/tab");
    await waitMenu(true, "the menu to open for /tab");
    await press(page, "Enter");
    await waitMenu(false, "the menu to close");
    await waitFor("the table size grid", async () => (await count("[data-edit-popover=\"grid\"]")) === 1);
    await expectValue("the /tab text removed", original + "\n");
    await press(page, "ArrowRight");
    await press(page, "ArrowDown");
    await press(page, "Enter");
    await waitFor("the table in the text box", async () => ((await readEditor()).value ?? "").includes("|"));

    // Escape closes the menu and keeps the typed text; the editor stays open.
    await press(page, process.platform === "darwin" ? "Meta+ArrowDown" : "Control+End");
    await press(page, "Enter");
    await typeText(page, "/zz");
    await waitMenu(true, "the menu to open for /zz");
    await waitFor("the No command row", async () => (await count("[data-slash-none]")) === 1);
    await captureAfter(evidence, page, "palette-slash/r01-slash-no-command",
      "The query /zz matches nothing: the menu shows a No command row.");
    await press(page, "Escape");
    await waitMenu(false, "Escape to close the menu");
    assert.equal(await count("[data-sphinx-preview-block-editor]"), 1, "the editor is still open");
    const kept = await readEditor();
    assert.match(String(kept.value), /\/zz$/u, "the typed text is kept: " + JSON.stringify(kept));
    await escapeBlockEditor(page, "the block editor to close after the second Escape");
  });
}

/** RI-T21: palette buttons edit the text box without closing it, and one undo reverts each. */
export async function scenarioPalette(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t21", async (source) => {
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
        throw new Error(String(error) + " Editor state: " + JSON.stringify(await readEditor()));
      }
    };
    const count = async (selector: string): Promise<number> => {
      const current = await findCurrentFrame(page);
      return current === undefined ? -1 : current.locator(selector).count();
    };
    await press(page, "End");

    // Click Bold, then type: the text lands between the markers and the focus never left.
    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-action='bold']").click());
    await expectValue("Bold to insert an empty pair at the caret", "Second paragraph.****");
    assert.equal((await readEditor()).tag, "TEXTAREA", "clicking Bold keeps the focus in the editor");
    await typeText(page, "xy");
    await expectValue("typing after Bold to land inside the markers", "Second paragraph.**xy**");

    // A heading level from the list; one Cmd/Ctrl+Z reverts it.
    await press(page, "Home");
    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-action='heading']").click());
    await waitFor("the heading list", async () => await count(".sphinx-preview-edit-palette-menu") === 1);
    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-option='2']").click());
    await expectValue("Heading 2 to prefix the line", "## Second paragraph.**xy**");
    assert.equal(await count(".sphinx-preview-edit-palette-menu"), 0, "choosing closes the list");
    await press(page, MOD + "+z");
    await expectValue("one undo to remove the heading prefix", "Second paragraph.**xy**");
    assert.equal(await count("[data-sphinx-preview-block-editor] textarea"), 1, "the editor stayed open");

    // Escape closes the open list first, and only the next Escape closes the editor.
    await withCurrentFrame(page, (frame) => frame.locator("[data-edit-action='codeFence']").click());
    await waitFor("the language list", async () => await count(".sphinx-preview-edit-palette-menu") === 1);
    // Captured with the language list open, before the Escape that closes it.
    await captureAfter(evidence, page, "palette-slash/r04-palette-bold-heading",
      "Edit mode on; Bold then typing wrote inside the markers and Heading 2 was undone by one Cmd/Ctrl+Z; "
      + "the image shows the open language list that the next Escape closes while the editor stays open.");
    await press(page, "Escape");
    await waitFor("Escape to close the list", async () => await count(".sphinx-preview-edit-palette-menu") === 0);
    assert.equal(await count("[data-sphinx-preview-block-editor] textarea"), 1, "the editor stayed open");
    await escapeBlockEditor(page, "the block editor to close after the second Escape");
  });
}

/** RI-T22: Cmd/Ctrl+K opens the link panel, Enter inserts [text](url) and one undo reverts it. */
export async function scenarioLinkPanel(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t22", async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    const readEditor = async (): Promise<{ tag: string | undefined; field: string | null | undefined; value: string | undefined }> => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return { tag: undefined, field: undefined, value: undefined };
      return current.evaluate(() => {
        const element = document.activeElement;
        return {
          tag: element?.tagName,
          field: element?.getAttribute("data-link-field"),
          value: element instanceof HTMLTextAreaElement ? element.value : undefined,
        };
      });
    };
    const expectValue = async (description: string, expected: string): Promise<void> => {
      try {
        await waitFor(description, async () => (await readEditor()).value === expected);
      } catch (error) {
        throw new Error(String(error) + " Editor state: " + JSON.stringify(await readEditor()));
      }
    };
    const count = async (selector: string): Promise<number> => {
      const current = await findCurrentFrame(page);
      return current === undefined ? -1 : current.locator(selector).count();
    };
    const original = "Second paragraph.";
    await press(page, "End");
    await press(page, "ArrowLeft");
    for (let index = 0; index < "paragraph".length; index += 1) await press(page, "Shift+ArrowLeft");

    // The panel opens with the word as its text and the focus in the empty URL field.
    await press(page, MOD + "+k");
    await waitFor("the link panel", async () => await count("[role='dialog'][aria-label='Insert link']") === 1);
    await waitFor("the focus in the URL field", async () => (await readEditor()).field === "url");
    assert.equal(
      await (await findCurrentFrame(page))!.locator("[data-link-field='text']").inputValue(),
      "paragraph",
      "the text is prefilled from the selection",
    );
    // Captured with the link panel open, before the Escape that closes it.
    await captureAfter(evidence, page, "palette-slash/r05-link-panel",
      "Edit mode on; Cmd/Ctrl+K opened the link panel with the selected word as its text and the focus in the "
      + "empty URL field. Escape closes it unchanged and a second round inserts [paragraph](https://example.org).");

    // Escape returns to the text box without changing anything, and the editor stays open.
    await press(page, "Escape");
    await waitFor("the panel to close", async () => await count("[role='dialog']") === 0);
    await expectValue("the text to be unchanged after Escape", original);
    assert.equal((await readEditor()).tag, "TEXTAREA", "Escape returns the focus to the text box");
    assert.equal(await count("[data-sphinx-preview-block-editor] textarea"), 1, "the editor stayed open");

    // The selection was restored: open again, type the URL, Enter inserts the link.
    await press(page, MOD + "+k");
    await waitFor("the link panel again", async () => await count("[role='dialog']") === 1);
    await waitFor("the focus in the URL field", async () => (await readEditor()).field === "url");
    await typeText(page, "https://example.org");
    await press(page, "Enter");
    await expectValue("Enter to insert the link", "Second [paragraph](https://example.org).");
    assert.equal((await readEditor()).tag, "TEXTAREA", "the focus is back in the text box");
    assert.equal(await count("[role='dialog']"), 0, "the panel closed");
    assert.equal(await count("[data-sphinx-preview-block-editor] textarea"), 1, "the editor stayed open");
    await press(page, MOD + "+z");
    await expectValue("one undo to remove the link", original);
    await escapeBlockEditor(page, "the block editor to close after Escape");
  });
}

/** CR 035: the link panel opens pre-filled inside an existing link, Enter replaces it, one undo restores it. */
export async function scenarioLinkPanelPrefill(page: Page, evidence: Evidence): Promise<void> {
  const original = 'See [the docs](https://example.org/docs "Docs") now.';
  await withDocument("realinput-cr035", "# Link prefill\n\nFirst paragraph.\n\n" + original + "\n", async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "now." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    const readValue = async (): Promise<string | undefined> => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return undefined;
      return current.evaluate(() => {
        const element = document.activeElement;
        return element instanceof HTMLTextAreaElement ? element.value : undefined;
      });
    };
    const field = async (name: string): Promise<string> =>
      await (await findCurrentFrame(page))!.locator("[data-link-field='" + name + "']").inputValue();
    await press(page, "Home");
    for (let index = 0; index < "See [the".length; index += 1) await press(page, "ArrowRight");
    await press(page, MOD + "+k");
    await waitFor("the link panel", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("[role='dialog'][aria-label='Insert link']").count() === 1;
    });
    assert.equal(await field("text"), "the docs", "the text is prefilled from the link");
    assert.equal(await field("url"), "https://example.org/docs", "the URL is prefilled from the link");
    await captureAfter(evidence, page, "palette-slash/r08-link-panel-prefilled",
      "Edit mode on; Cmd/Ctrl+K with the caret inside [the docs](https://example.org/docs) opened the link panel "
      + "pre-filled with the text and the URL.");
    await (await findCurrentFrame(page))!.locator("[data-link-field='url']").fill("https://example.org/new");
    await press(page, "Enter");
    await waitFor("the link to be replaced", async () =>
      await readValue() === 'See [the docs](https://example.org/new "Docs")' + " now.");
    await press(page, MOD + "+z");
    await waitFor("one undo to restore the link", async () => await readValue() === original);
    await escapeBlockEditor(page, "the block editor to close after Escape");
  });
}
