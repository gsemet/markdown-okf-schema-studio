import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Frame, Page } from "playwright-core";
import * as vscode from "vscode";
import { parse as parseYaml } from "yaml";

import {
  COMMAND_ID,
  deserializePreviewPanelForTests,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  PANEL_VIEW_TYPE,
  resetRenderHooksForTests,
  setRenderDelayForTests,
  setRenderOverrideForTests,
} from "./extensionApi";
import { lineDelta } from "../shared/lineDelta";
import {
  bufferText,
  caretToEnd,
  closeAllEditors,
  connectWorkbench,
  createEvidence,
  createFixture,
  findCurrentFrame,
  focusedCaret,
  htmlAssignmentCount,
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
  writeSchema,
  type Evidence,
} from "./realInput/harness";

const SMOKE = [
  "# Smoke document",
  "",
  "First paragraph line one",
  "continues on line two.",
  "",
  "Second paragraph.",
  "",
  "| Name | Value |",
  "|------|-------|",
  "| alpha | one |",
  "| beta | two |",
  "",
  "- item one",
  "- item two",
  "",
].join("\n");

/** Waits until the caret of the focused editor sits at the end of its text. */
async function waitForCaretAtEnd(page: Page): Promise<void> {
  await waitFor("the caret at the end of the editor", async () => {
    const current = await findCurrentFrame(page);
    if (current === undefined) return false;
    const caret = await focusedCaret(current);
    return caret !== undefined && caret.start === caret.length && caret.end === caret.length;
  });
}

/** Waits until no raw-Markdown editor is open in the current webview. */
async function waitForNoBlockEditor(page: Page, description: string): Promise<void> {
  await waitFor(description, async () => {
    const current = await findCurrentFrame(page);
    return current !== undefined && await current.locator("[data-sphinx-preview-block-editor]").count() === 0;
  });
}

const TABLE_DOCUMENT = [
  "# Table document",
  "",
  "| Column A | Column B |",
  "|----------|----------|",
  "| first    | second   |",
  "",
  "Between the tables.",
  "",
  "| Step | Owner |",
  "|---|---|",
  "| Plan | Ana |",
  "| Ship | Bo |",
  "",
].join("\n");

let workbenchPage: Page | undefined;

/**
 * Edit mode persists per workspace, so a scenario that leaves it on would start the next one in
 * edit mode. Switches it off in the current webview, if there is one.
 */
async function leaveEditModeOff(): Promise<void> {
  const page = workbenchPage;
  if (page === undefined) return;
  try {
    const frame = await findCurrentFrame(page);
    if (frame === undefined) return;
    if (await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode") !== "on") return;
    await setEditMode(page, false);
    // Let the webview's previewEditModeChanged message reach the host before the preview closes.
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  } catch {
    // Best effort: a failure here must not hide the scenario's own result.
  }
}

async function withSmokeDocument(
  prefix: string,
  scenario: (document: vscode.TextDocument) => Promise<void>,
): Promise<void> {
  await withDocument(prefix, SMOKE, scenario);
}

async function withDocument(
  prefix: string,
  content: string,
  scenario: (document: vscode.TextDocument) => Promise<void>,
  schemaYaml?: string,
): Promise<void> {
  const fixture = createFixture(prefix, { "smoke.md": content });
  try {
    if (schemaYaml !== undefined) writeSchema(fixture.directory, "req", schemaYaml);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    try {
      await scenario(document);
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

async function captureAfter(
  evidence: Evidence,
  page: Page,
  name: string,
  note: string,
): Promise<void> {
  await withCurrentFrame(page, (frame) => evidence.capture(page, frame, name, note));
}

async function scenarioParagraphBlurCommit(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "01-paragraph-blur-commit",
      "Edit mode on; the paragraph gained ` Added.` and the heading click moved focus out. "
      + "The buffer line reads `Second paragraph. Added.`; nothing else changed.");
  });
}

async function scenarioCtrlEnterCommit(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "02-ctrl-enter-commit",
      "Edit mode on; the first paragraph gained ` X` and Cmd/Ctrl+Enter saved it. The editor is closed "
      + "after the re-render, and buffer line 4 reads `continues on line two. X`.");
  });
}

async function scenarioArrowNavigation(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "03-arrow-navigation",
      "Edit mode on; ArrowDown at the end of the paragraph moved the raw Markdown editor to the table, "
      + "whose textarea starts with `| Name | Value |`.");
  });
}

async function scenarioTableCellEnter(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "04-table-cell-enter",
      "Edit mode on; the cell `one` was edited with End, `1` and Enter. The buffer contains "
      + "`| alpha | one1 |` and the table still has four lines.");
  });
}

/** RI-T04: one cell edit changes exactly one source line, in a padded and in a compact table. */
async function scenarioTableMinimalDiff(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "06-table-padded-edit",
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
    await captureAfter(evidence, page, "07-table-compact-edit",
      "Edit mode on; the compact table cell `Ana` gained ` Lee` and Enter saved it. The buffer changed "
      + "only the line `| Plan | Ana Lee |`; the compact `|---|---|` delimiter is untouched.");
  });
}

async function scenarioOpenWithEditor(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "05-open-with-editor",
      "Opened with the Studio Open With editor (no side preview); edit mode on; Cmd/Ctrl+Enter saved "
      + "`Second paragraph. Z` to the buffer.");
  });
}

const REQ_SCHEMA = [
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
async function scenarioFrontmatterValueMinimalPatch(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "08-frontmatter-value-minimal-patch",
      "Edit mode on; the status row was changed to `active` by typing `a` on the focused select "
      + "and pressing Enter. The buffer changed only the line `status: active`; the compact sequences and the two-line summary are untouched.");
  }, REQ_SCHEMA);
}

/** RI-T06: renaming and removing a frontmatter field change only that field's lines. */
async function scenarioFrontmatterStructuralMinimalPatch(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t06", REQ_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="summary"] [data-okf-edit-cell="name"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] > input");
    await press(page, `${MOD}+A`);
    // VS Code forwards Cmd/Ctrl+A to the workbench, which echoes `selectAll` into the webview
    // asynchronously. A key typed before that echo is selected again and replaced (`bstract`), so
    // wait for the echo. This is a host timing issue, not a frontmatter defect; it also occurs on
    // the code before T06.
    await new Promise((resolve) => setTimeout(resolve, 300));
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
    await captureAfter(evidence, page, "09-frontmatter-rename-minimal-patch",
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
    await captureAfter(evidence, page, "10-frontmatter-remove-minimal-patch",
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
async function scenarioEnterCommitsTextField(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t07", REQ_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="title"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await press(page, `${MOD}+A`);
    // See RI-T06: wait for the workbench's asynchronous selectAll echo before typing.
    await new Promise((resolve) => setTimeout(resolve, 300));
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
    await captureAfter(evidence, page, "11-frontmatter-title-enter",
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
    await captureAfter(evidence, page, "12-frontmatter-title-multiline",
      "Edit mode on; Shift+Enter added a line and Cmd/Ctrl+Enter saved a two-line title.");
  }, REQ_SCHEMA);
}

/**
 * RI-T08: Escape cancels (block and table cell), also after an autosave reached the buffer;
 * Cmd/Ctrl+Enter and leaving edit mode keep the typed text.
 */
async function scenarioEscapeCancels(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t08", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Second paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "End");
    await typeText(page, " DROP ME.");
    await press(page, "Escape");
    await waitForNoBlockEditor(page, "the block editor to close after Escape");
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
    await captureAfter(evidence, page, "13-escape-cancels-block",
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
    await captureAfter(evidence, page, "14-escape-cancels-table-cell",
      "Edit mode on; the cell `two` gained `2` (autosaved) and Escape closed the editor. The cell "
      + "reads `two` again in the preview and in the buffer.");
  });
}

async function scenarioTypingUndoGrouping(page: Page, evidence: Evidence): Promise<void> {
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
      await waitForNoBlockEditor(page, "the block editor to close before the undo");
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
      await vscode.commands.executeCommand("undo");
      try {
        await waitFor("one undo to restore the paragraph", () => bufferText(document) === SMOKE);
      } catch (error) {
        throw new Error(String(error) + " Buffer paragraph line: "
          + JSON.stringify(lines(bufferText(document))[5]) + "; changes: " + JSON.stringify(changes));
      }
      await captureAfter(evidence, page, "15-typing-undo-grouping",
        "Typed 20 characters inline; " + changes.length + " content change(s) reached the source "
        + "(" + JSON.stringify(changes) + "), and one undo restored `Second paragraph.`.");
    } finally {
      subscription.dispose();
    }
  });
}

/** RI-T10: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z undo typing inside the open inline editor. */
async function scenarioUndoStaysInEditor(
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
    await captureAfter(evidence, page, "16-undo-stays-" + mode,
      "Typed ` abc` and ` def` inline (" + mode + "); Cmd/Ctrl+Z undid typing inside the textarea "
      + "and Cmd/Ctrl+Shift+Z restored it; the inline editor stayed open and focused.");
  });
}

/** RI-T20: Cmd/Ctrl+B and Ctrl+/ edit the text box, and one Cmd/Ctrl+Z undoes each of them. */
async function scenarioShortcuts(page: Page, evidence: Evidence): Promise<void> {
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
    await press(page, MOD + "+z");
    await expectValue("one undo to restore the line", original);
    await captureAfter(evidence, page, "t20-shortcuts",
      "Edit mode on; Cmd/Ctrl+B bolded the selected word and Ctrl+/ wrapped the line in a TODO "
      + "comment, each undone by a single Cmd/Ctrl+Z with the focus staying in the text box.");
    await press(page, "Escape");
    await waitForNoBlockEditor(page, "the block editor to close after Escape");
  });
}

/** RI-T21: palette buttons edit the text box without closing it, and one undo reverts each. */
async function scenarioPalette(page: Page, evidence: Evidence): Promise<void> {
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
    await press(page, "Escape");
    await waitFor("Escape to close the list", async () => await count(".sphinx-preview-edit-palette-menu") === 0);
    assert.equal(await count("[data-sphinx-preview-block-editor] textarea"), 1, "the editor stayed open");
    await captureAfter(evidence, page, "t21-palette",
      "Edit mode on; Bold then typing wrote inside the markers, Heading 2 was undone by one Cmd/Ctrl+Z "
      + "and Escape closed the language list while the editor stayed open.");
    await press(page, "Escape");
    await waitForNoBlockEditor(page, "the block editor to close after the second Escape");
  });
}

/** RI-T22: Cmd/Ctrl+K opens the link panel, Enter inserts [text](url) and one undo reverts it. */
async function scenarioLinkPanel(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "t22-link-panel",
      "Edit mode on; Cmd/Ctrl+K opened the link panel with the selected word as its text, Escape closed it "
      + "unchanged, and a second round with a typed URL inserted [paragraph](https://example.org), undone by one Cmd/Ctrl+Z.");
    await press(page, "Escape");
    await waitForNoBlockEditor(page, "the block editor to close after Escape");
  });
}

/** RI-T11: Enter in a nested list continues the list at the same indentation. */
async function scenarioEnterContinuesList(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "17-enter-continues-list",
      "Edit mode on; Enter after `Refrigerated goods` continued the list, and `Frozen goods` is a sibling "
      + "at the same indentation while `Deduplication` kept its place.");
  });
}

/** RI-T32: the edited block keeps its viewport top across the render that follows Save. */
async function scenarioSaveKeepsBlockInPlace(page: Page, evidence: Evidence): Promise<void> {
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

  await listCase("realinput-t32-list", "32-save-keeps-list-in-place");

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
    await captureAfter(evidence, page, "33-save-keeps-table-in-place",
      "Edit mode on; the cell `Ana` gained `-Lee` and Enter committed it in a visible table. "
      + "Table top " + t0 + " before the click, " + tCommit + " at Enter and " + t1 + " after Save.");
  });
}

/** RI-T12: Tab and Shift+Tab indent and outdent in the block editor; Escape then Tab leaves it. */
async function scenarioTabIndents(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "18-tab-indents",
      "Edit mode on; Tab indented `Refrigerated goods` by 2 spaces and Shift+Tab restored it, "
      + "with the focus staying in the editor.");
    await press(page, "Escape");
    await waitForNoBlockEditor(page, "the block editor to close after Escape");
    await press(page, "Tab");
    const afterTab = await readFocus();
    assert.notEqual(afterTab.tag, "TEXTAREA", "after Escape, Tab moves the focus out of a textarea");
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(bufferText(source), LIST_DOCUMENT, "indent then outdent leaves the source unchanged");
  });
}

/** RI-T13: a non-Markdown editor does not blank the side preview; another Markdown file switches it. */
async function scenarioPreviewKeepsMarkdown(page: Page, evidence: Evidence): Promise<void> {
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
      await captureAfter(evidence, page, "19-preview-keeps-markdown",
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
async function scenarioCaretAtClick(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "20-caret-at-click",
      "Edit mode on; clicking the word `bravo` placed the caret there, and the typed `X` landed in line one.");
  });
}

/** RI-T15: hover outlines what a click edits; Done keeps and Cancel restores the block text. */
async function scenarioEditAffordances(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "21-edit-hover",
      "Edit mode on; hovering the nested item outlines the list a click would edit.");

    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Alpha paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await typeText(page, " R");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await captureAfter(evidence, page, "22-editor-frame-and-buttons",
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
async function scenarioEditModeNoReflow(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "23-edit-mode-no-reflow",
      "Edit mode on; hard-wrapped paragraphs (about 40 characters per source line) keep their reading flow.");
    assert.ok(Math.abs(after.height - before.height) <= 2,
      "scrollHeight changed from " + before.height + " to " + after.height);
    assert.ok(Math.abs(after.top - before.top) <= 2,
      "third paragraph top moved from " + before.top + " to " + after.top);
  });
}

/** RI-T17: Tab moves between table cells, adds a row on the last cell, and focus loss commits. */
async function scenarioTableTab(page: Page, evidence: Evidence): Promise<void> {
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
    await typeText(page, "gamma");
    await press(page, "Tab");
    await waitFor("Tab to open the second cell of the new row", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("tbody tr:nth-child(3) td:nth-child(2) " + CELL).count() === 1;
    });
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
    await captureAfter(evidence, page, "24-table-tab",
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
async function scenarioTableToolbar(page: Page, evidence: Evidence): Promise<void> {
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
    assert.ok(Math.abs(after - before) <= 2, "the selected cell moved " + (after - before) + " px");
    await withCurrentFrame(page, async (frame) => {
      const status = await frame.locator("[data-sphinx-table-menu] [data-sphinx-preview-edit-status]").textContent();
      assert.equal(status, "Row 1 of 2 \u00b7 column 2 of 2");
      const labels = await frame.locator(".sphinx-preview-table-menu-label").allTextContents();
      assert.deepEqual(labels, ["Row +", "Row \u2212", "Col +", "Col \u2212"]);
      const position = await frame.locator("[data-sphinx-table-menu]").evaluate((element) => getComputedStyle(element).position);
      assert.equal(position, "static");
    });
    await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "25-table-toolbar",
      "Edit mode on; the cell `one` is open. The toolbar sits in the flow above the table with text labels, "
      + "and the selected cell is outlined.",
      { checks: { required: ["overlay-covers-text", "overlay-clipped"] } }));
  });
}

const BOOLEAN_DOCUMENT = [
  "---",
  "type: req",
  "title: Boolean field",
  "annotation_exemption: false",
  "---",
  "",
  "# Requirement",
  "",
  "Body text.",
  "",
].join("\n");

const BOOLEAN_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  annotation_exemption:",
  "    type: boolean",
  "",
].join("\n");

/** T14: in edit mode a click on a block comment (not its chip) opens the block editor on its raw lines. */
async function scenarioCommentBlockEdit(page: Page, evidence: Evidence): Promise<void> {
  const source = ["# Notes", "", "<!--", "keep this", "-->", "", "TODO write the rest.", ""].join("\n");
  await withDocument("realinput-comment", source, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await frame.locator("div.okf-comment > .okf-chip").count(), 1);
      assert.equal(await frame.locator("p .okf-chip--todo").count(), 1);
      // The chip is reserved for expansion: it must not open an editor.
      await frame.locator("div.okf-comment > .okf-chip").click();
      assert.equal(await frame.locator("[data-sphinx-preview-block-editor]").count(), 0);
      await frame.locator("div.okf-comment").click({ position: { x: 300, y: 4 } });
    });
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue(), "<!--\nkeep this\n-->");
    });
    await captureAfter(evidence, page, "comment-block-edit",
      "Edit mode on; a click on the comment block (not its chip) opened the block editor on the three raw comment lines.");
  });
}

/** RI-T20: one click on a boolean value toggles and saves it. */
async function scenarioBooleanOneClick(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t20", BOOLEAN_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    // The read-mode checkbox is aria-disabled, which Playwright's actionability check treats as
    // "not enabled"; click its centre with the real mouse instead.
    const box = await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="annotation_exemption"] [data-okf-edit-cell="value"] input[type="checkbox"]')
        .first().boundingBox());
    assert.ok(box, "the boolean checkbox has a box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const expected = BOOLEAN_DOCUMENT.replace("annotation_exemption: false", "annotation_exemption: true");
    await waitFor("the toggled boolean to reach the source buffer", () =>
      bufferText(document) === expected);
    assert.deepEqual(lineDelta(BOOLEAN_DOCUMENT, bufferText(document)), {
      removed: ["annotation_exemption: false"],
      added: ["annotation_exemption: true"],
    });
    await waitForRender(document);
    await waitFor("no frontmatter editor after the re-render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    await captureAfter(evidence, page, "26-boolean-one-click",
      "Edit mode on; one click on the annotation_exemption checkbox saved `true`. No editor stays open.");
  }, BOOLEAN_SCHEMA);
}

const LIST_DOCUMENT = [
  "---",
  "type: req",
  "title: Linked list",
  "derives_from:",
  "- StRS-A",
  "---",
  "",
  "# Requirement",
  "",
  "Body text.",
  "",
].join("\n");

const LIST_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  derives_from:",
  "    type: array",
  "    items:",
  "      type: string",
  "      x-okf-link: { resolution: filename-stem, syntax: plain }",
  "",
].join("\n");

/** RI-T21: a click on a link value edits it; Enter and Backspace manage list items. */
async function scenarioListEditorClickAndKeys(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t21", {
    "smoke.md": LIST_DOCUMENT,
    "StRS-A.md": "# StRS A\n",
    "StRS-B.md": "# StRS B\n",
  });
  try {
    writeSchema(fixture.directory, "req", LIST_SCHEMA);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      const linkSelector = 'tr[data-okf-field="derives_from"] a[data-sphinx-preview-navigation^="okf-link:"]';
      await waitFor("the resolved StRS-A link", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined && await current.locator(linkSelector).count() === 1;
      });
      const documentUri = getActivePreviewForTests()?.documentUri;
      await withCurrentFrame(page, (frame) => frame.locator(linkSelector).first().click());
      await waitForEditor(page, "[data-okf-frontmatter-editor] .okf-list-editor");
      assert.equal(getActivePreviewForTests()?.documentUri, documentUri, "a plain click must not navigate");
      await captureAfter(evidence, page, "27-list-click-edits",
        "Edit mode on; a plain click on the StRS-A link opened the list editor and the preview kept the document.");

      await withCurrentFrame(page, (frame) =>
        frame.locator("[data-okf-list-item-input]").last().click());
      await press(page, "End");
      await press(page, "Enter");
      await typeText(page, "StRS-B");
      await press(page, "Enter");
      await press(page, "Enter");

      const expected = LIST_DOCUMENT.replace("- StRS-A\n", "- StRS-A\n- StRS-B\n");
      await waitFor("the extended list to reach the source buffer", () => bufferText(document) === expected);
      assert.deepEqual(lineDelta(LIST_DOCUMENT, bufferText(document)), {
        removed: [],
        added: ["- StRS-B"],
      });
      await waitForRender(document);
      await waitFor("no frontmatter editor after the re-render", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined
          && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
      });
      await captureAfter(evidence, page, "28-list-enter-adds",
        "Enter added an item, `StRS-B` was typed, Enter again and Enter on the empty item saved the list.");

      const box = await withCurrentFrame(page, (frame) =>
        frame.locator(linkSelector).first().boundingBox());
      assert.ok(box, "the StRS-A link has a box");
      await page.keyboard.down(MOD);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.up(MOD);
      await waitFor("StRS-A.md to become the active text editor", () =>
        vscode.window.activeTextEditor?.document.uri.fsPath === fixture.path("StRS-A.md"));
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

/** RI-T22: list items suggest Markdown targets and warn, without blocking, about unknown ones. */
async function scenarioListLinkCompletion(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t22", {
    "smoke.md": LIST_DOCUMENT,
    "StRS-A.md": "# StRS A\n",
    "StRS-B.md": "# StRS B\n",
  });
  try {
    writeSchema(fixture.directory, "req", LIST_SCHEMA);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      const linkSelector = 'tr[data-okf-field="derives_from"] a[data-sphinx-preview-navigation^="okf-link:"]';
      await waitFor("the resolved StRS-A link", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined && await current.locator(linkSelector).count() === 1;
      });
      await withCurrentFrame(page, (frame) => frame.locator(linkSelector).first().click());
      await waitForEditor(page, "[data-okf-frontmatter-editor] .okf-list-editor");
      await withCurrentFrame(page, (frame) =>
        frame.locator("[data-okf-list-item-input]").last().click());
      await press(page, "End");
      await press(page, "Enter");
      await typeText(page, "StRS-B");
      const warning = '[data-okf-frontmatter-editor] [role="status"][data-state="warning"][data-visible="true"]';
      const options = await withCurrentFrame(page, (frame) => frame.evaluate(() => {
        const input = globalThis.document.activeElement as HTMLInputElement;
        return Array.from(input.list?.options ?? []).map((option) => option.value);
      }));
      assert.ok(options.includes("StRS-B"), "the datalist offers StRS-B: " + JSON.stringify(options));
      assert.equal(await withCurrentFrame(page, (frame) => frame.locator(warning).count()), 0,
        "a known stem shows no warning");
      await typeText(page, "X");
      await waitFor("the unknown-target warning", async () =>
        await withCurrentFrame(page, (frame) => frame.locator(warning).count()) === 1);
      await captureAfter(evidence, page, "29-list-link-warning",
        "`StRS-BX` typed in a new list item: the datalist offered the known stems and the warning is shown.");
      await press(page, "Enter");
      await press(page, "Enter");
      const expected = LIST_DOCUMENT.replace("- StRS-A\n", "- StRS-A\n- StRS-BX\n");
      await waitFor("the unknown target to be saved as typed", () => bufferText(document) === expected);
      await waitForRender(document);
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

const SCOPE_DOCUMENT = [
  "---",
  "type: req",
  "title: Requirement F1",
  "status: draft",
  "scope: Core",
  "owner: platform",
  "---",
  "",
  "# Requirement",
  "",
  "Body text.",
  "",
].join("\n");

const SCOPE_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  status:",
  "    type: string",
  "  scope:",
  "    type: string",
  "  owner:",
  "    type: string",
  "  summary:",
  "    type: string",
  "",
].join("\n");

/** RI-T23: the field actions sit inside the edited row at a 540 px preview and cover nothing. */
async function scenarioFrontmatterActionsLayout(page: Page, evidence: Evidence): Promise<void> {
  const required = ["overlay-covers-text", "overlay-clipped"];
  await page.setViewportSize({ width: 1100, height: 900 });
  try {
    await withDocument("realinput-t23", SCOPE_DOCUMENT, async (document) => {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      const frameWidth = await withCurrentFrame(page, async (frame) => {
        const box = await (await frame.frameElement()).boundingBox();
        return box?.width ?? 0;
      });
      assert.ok(frameWidth >= 480 && frameWidth <= 620, "preview frame width " + frameWidth + " px");
      await withCurrentFrame(page, (frame) =>
        frame.locator('tr[data-okf-field="scope"] [data-okf-edit-cell="value"]').click());
      await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
      await withCurrentFrame(page, async (frame) => {
        const placement = await frame.locator("[data-okf-frontmatter-menu]").evaluate((menu) => ({
          inEditor: menu.parentElement === menu.closest("[data-okf-frontmatter-editor]"),
          position: getComputedStyle(menu).position,
          labels: Array.from(menu.querySelectorAll("button")).map((button) => (button.textContent ?? "").trim()),
        }));
        assert.equal(placement.inEditor, true);
        assert.equal(placement.position, "static");
        assert.deepEqual(placement.labels.slice(0, 2), ["Add field", "Remove field"]);
        const rows = await frame.locator("[data-okf-frontmatter-editor] textarea").evaluate((element) =>
          (element as HTMLTextAreaElement).rows);
        assert.equal(rows, 1);
      });
      await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "30-frontmatter-actions-value",
        "Window 1100 px wide, preview frame " + Math.round(frameWidth) + " px. The `scope` value editor is open; "
        + "Add field / Remove field sit under the one-row textarea inside the row and cover no other row.",
        { checks: { required } }));
      await withCurrentFrame(page, (frame) =>
        frame.locator("[data-okf-frontmatter-operation='add']").click());
      await waitFor("the add-field picker to show", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined
          && await current.locator(".sphinx-preview-frontmatter-picker:visible").count() === 1;
      });
      await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "31-frontmatter-actions-picker",
        "Same row after clicking Add field: the picker and its Add button wrap inside the row, not over other rows.",
        { checks: { required } }));
    }, SCOPE_SCHEMA);
  } finally {
    await page.setViewportSize({ width: 1400, height: 900 });
  }
}

const REQUIRED_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  status:",
  "    type: string",
  "  scope:",
  "    type: string",
  "  owner:",
  "    type: string",
  "  depends_on:",
  "    type: array",
  "    items:",
  "      type: string",
  "required: [type, scope]",
  "",
].join("\n");

/**
 * RI-T24: a required field cannot be removed, and a field chosen in the add picker is inserted at
 * once, right after the row whose Add field button was used.
 * The native select popup cannot be driven through CDP, so `selectOption` is the one allowed
 * exception to the real-input rule here; every other step uses the real mouse and keyboard.
 */
async function scenarioRequiredAndPositionedAdd(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t24", SCOPE_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="scope"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    const remove = "[data-okf-frontmatter-operation='remove']";
    assert.equal(await withCurrentFrame(page, (frame) => frame.locator(remove).isDisabled()), true,
      "Remove field is disabled on the required scope field");
    assert.equal(await withCurrentFrame(page, (frame) => frame.locator(remove).getAttribute("title")),
      "Required by the schema; it cannot be removed");
    await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-operation='add']").click());
    await waitFor("the add-field picker to show", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator(".sphinx-preview-frontmatter-picker:visible").count() === 1;
    });
    await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "32-required-remove-disabled",
      "The `scope` value editor is open: Remove field is disabled (required by the schema) and the add picker is open."));
    await withCurrentFrame(page, (frame) =>
      frame.locator("select[aria-label='Frontmatter field to add']").selectOption("depends_on"));
    // T41 (D-21 a): the key goes where the table shows its row, after owner, not after scope.
    const expected = SCOPE_DOCUMENT.replace("owner: platform\n", "owner: platform\ndepends_on: []\n");
    await waitFor("depends_on to be inserted after owner, its table neighbour", () => bufferText(document) === expected);
    assert.deepEqual(lines(bufferText(document)), lines(expected));
    await waitForRender(document);
  }, REQUIRED_SCHEMA);
}

/**
 * RI-T25: the add picker offers `Custom key…` when the schema allows additional properties; the
 * new field's editor opens right after the add, for a custom key and for a schema field.
 * `selectOption` is the one allowed exception to the real-input rule (native select popup).
 */
async function scenarioCustomKeyAndOpenNewField(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t25", SCOPE_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="scope"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    const openPicker = async (): Promise<void> => {
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-operation='add']").click());
      await waitFor("the add-field picker to show", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined
          && await current.locator(".sphinx-preview-frontmatter-picker:visible").count() === 1;
      });
    };
    const editorFocused = (): Promise<boolean> => withCurrentFrame(page, (frame) =>
      frame.evaluate(() => {
        const active = globalThis.document.activeElement;
        return Boolean(active?.closest("[data-okf-frontmatter-editor]"));
      }));
    await openPicker();
    await withCurrentFrame(page, (frame) =>
      frame.locator("select[aria-label='Frontmatter field to add']").selectOption("__custom__"));
    await waitFor("the custom key input", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("input[aria-label='New field name']:visible").count() === 1;
    });
    await withCurrentFrame(page, (frame) => frame.locator("input[aria-label='New field name']").click());
    await typeText(page, "reviewer");
    await press(page, "Enter");
    // T41 (D-21 a): a custom key goes after the last row of the table.
    await waitFor("reviewer to be inserted after owner, the last table row", () =>
      bufferText(document) === SCOPE_DOCUMENT.replace("owner: platform\n", "owner: platform\nreviewer: \"\"\n"));
    await waitForRender(document);
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await waitFor("the reviewer editor to be focused", editorFocused);
    await typeText(page, "Ana");
    // T41 (D-21 b): a new custom key is a one-line text; Enter saves it as a plain scalar.
    await press(page, "Enter");
    await waitFor("reviewer: Ana after owner", () =>
      bufferText(document) === SCOPE_DOCUMENT.replace("owner: platform\n", "owner: platform\nreviewer: Ana\n"));
    await waitForRender(document);
    await waitFor("no frontmatter editor to be open after the saved value's render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("tr[data-okf-field=\"reviewer\"]").count() === 1
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "33-custom-key-added",
      "A custom `reviewer` key was added after `owner` (the last table row), typed as `Ana` and saved with Enter as `reviewer: Ana`."));

    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="scope"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await openPicker();
    await withCurrentFrame(page, (frame) =>
      frame.locator("select[aria-label='Frontmatter field to add']").selectOption("depends_on"));
    await waitFor("depends_on to be inserted", () => bufferText(document).includes("depends_on: []"));
    await waitForRender(document);
    await waitForEditor(page, "[data-okf-frontmatter-editor] .okf-list-editor");
    await waitFor("the depends_on list editor to be focused", editorFocused);
  }, REQUIRED_SCHEMA);
}

const POSITION_DOCUMENT = [
  "---",
  "type: req",
  "note: hello",
  "title: Requirement F1",
  "status: draft",
  "owner: platform",
  "---",
  "",
  "# Requirement",
  "",
  "Body text.",
  "",
].join("\n");

/**
 * RI-T41: a new field is inserted where the table shows its row; a new custom key is one line that
 * Enter saves as a plain scalar; Escape on the field picker cancels the open edit.
 * `selectOption` is the one allowed exception to the real-input rule (native select popup).
 */
async function scenarioAddFieldPositionAndEscape(page: Page, evidence: Evidence): Promise<void> {
  const schema = REQUIRED_SCHEMA.replace("required: [type, scope]\n", "");
  await withDocument("realinput-t41", POSITION_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const openPicker = async (field: string): Promise<void> => {
      await withCurrentFrame(page, (frame) =>
        frame.locator(`tr[data-okf-field="${field}"] [data-okf-edit-cell="value"]`).click());
      await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-operation='add']").click());
      await waitFor("the add-field picker to show", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined
          && await current.locator(".sphinx-preview-frontmatter-picker:visible").count() === 1;
      });
    };
    const rowOrder = (): Promise<string[]> => withCurrentFrame(page, (frame) =>
      frame.locator("tr[data-okf-field]").evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-okf-field") ?? "")));

    // 1. A schema field added from a row that is not its table neighbour.
    await openPicker("title");
    await withCurrentFrame(page, (frame) =>
      frame.locator("select[aria-label='Frontmatter field to add']").selectOption("depends_on"));
    const withDependsOn = POSITION_DOCUMENT.replace("owner: platform\n", "owner: platform\ndepends_on: []\n");
    await waitFor("depends_on between its table neighbours", () => bufferText(document) === withDependsOn);
    assert.deepEqual(lineDelta(POSITION_DOCUMENT, bufferText(document)), {
      removed: [],
      added: ["depends_on: []"],
    });
    await waitForRender(document);
    await waitForEditor(page, "[data-okf-frontmatter-editor] .okf-list-editor");
    const order = await rowOrder();
    assert.ok(order.indexOf("depends_on") === order.indexOf("owner") + 1, order.join(","));
    await press(page, "Escape");
    await waitFor("the depends_on editor to close", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    assert.equal(bufferText(document), withDependsOn);
    await captureAfter(evidence, page, "t41-add-field-position",
      "`depends_on` was added from the `title` row; the source line sits after `owner` and its row is shown right after `owner`.");

    // 2. A custom key typed and saved with Enter, written as a plain scalar.
    await openPicker("title");
    await withCurrentFrame(page, (frame) =>
      frame.locator("select[aria-label='Frontmatter field to add']").selectOption("__custom__"));
    await withCurrentFrame(page, (frame) => frame.locator("input[aria-label='New field name']").click());
    await typeText(page, "approver");
    await press(page, "Enter");
    await waitFor("approver to be added after note, the last table row", () =>
      bufferText(document) === withDependsOn.replace("note: hello\n", "note: hello\napprover: \"\"\n"));
    await waitForRender(document);
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await typeText(page, "Ann");
    await press(page, "Enter");
    const withApprover = withDependsOn.replace("note: hello\n", "note: hello\napprover: Ann\n");
    await waitFor("approver: Ann in the buffer", () => bufferText(document) === withApprover);
    assert.deepEqual(lineDelta(withDependsOn, bufferText(document)), {
      removed: [],
      added: ["approver: Ann"],
    });
    await waitForRender(document);
    await waitFor("the approver editor to close", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0;
    });
    await captureAfter(evidence, page, "t41-custom-key-plain",
      "A custom `approver` key was added from the `title` row, typed as `Ann` and saved with Enter: the line is `approver: Ann`.");

    // 3. Escape on the field picker cancels the open edit, with a typed change that is not saved.
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="status"] [data-okf-edit-cell="value"]').click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    await typeText(page, "x");
    await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-operation='add']").click());
    await waitFor("the add-field picker to show", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator(".sphinx-preview-frontmatter-picker:visible").count() === 1;
    });
    await press(page, "Escape");
    await waitFor("the editor and the picker to close", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0
        && await current.locator(".sphinx-preview-frontmatter-picker").count() === 0;
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    assert.equal(bufferText(document), withApprover, "Escape on the picker writes nothing");
    await captureAfter(evidence, page, "t41-escape-on-picker",
      "Escape with focus on the field picker closed the status editor and the picker; the typed `x` was not written.");
  }, schema);
}

const LINK_PROBLEM_DOCUMENT = [
  "---",
  "type: req",
  "title: Broken link",
  "implemented_in_files:",
  "- missing.py",
  "---",
  "",
  "# Requirement",
  "",
  ...Array.from({ length: 60 }, (_unused, index) => `Paragraph ${index + 1}.\n`),
].join("\n");

const LINK_PROBLEM_SCHEMA = [
  "type: object",
  "required: [type, title]",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  implemented_in_files:",
  "    type: array",
  "    items:",
  "      type: string",
  "      x-okf-link: { resolution: document-relative, syntax: plain }",
  "",
].join("\n");

/**
 * RI-T26: an invalid link reads "File not found" rather than an error code, its full message shows
 * in a tooltip on keyboard focus, and the header badge jumps to the first problem row.
 */
async function scenarioReadableLinkDiagnostics(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t26", LINK_PROBLEM_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    const linkSelector = 'tr[data-okf-field="implemented_in_files"] [data-okf-link-status="invalid"]';
    await waitFor("the invalid link to be resolved", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator(linkSelector).count() === 1;
    });
    const text = await withCurrentFrame(page, (frame) =>
      frame.locator("[data-okf-properties]").innerText());
    assert.ok(text.includes("File not found"), "the label reads File not found: " + text);
    assert.ok(!text.includes("[E10]"), "no error code is visible: " + text);
    // Start from the preview body so that Tab walks the page from the top.
    await withCurrentFrame(page, (frame) => frame.locator(".okf-properties-title").click());
    const onLink = (): Promise<boolean> => withCurrentFrame(page, (frame) => frame.evaluate(() =>
      Boolean(globalThis.document.activeElement?.matches('[data-okf-link-status="invalid"]'))));
    for (let step = 0; step < 40 && !await onLink(); step += 1) await press(page, "Tab");
    assert.equal(await onLink(), true, "Tab reached the invalid link value");
    const tooltip = '[role="tooltip"]';
    await waitFor("the tooltip to show on keyboard focus", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && (await current.locator(tooltip).allInnerTexts())
        .some((value) => value.includes("does not resolve"));
    });
    await captureAfter(evidence, page, "34-link-diagnostic-tooltip",
      "The invalid `missing.py` value reads `File not found` and its explanation shows on keyboard focus.");
    await press(page, "Escape");
    await withCurrentFrame(page, (frame) => frame.evaluate(() => globalThis.window.scrollTo(0, 1500)));
    await withCurrentFrame(page, (frame) => frame.locator("[data-okf-badge]").click());
    await waitFor("the badge to bring the problem row into view and focus it", async () => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return false;
      return current.evaluate(() => {
        const row = globalThis.document.querySelector('tr[data-okf-field="implemented_in_files"]');
        const active = globalThis.document.activeElement;
        if (!row || !active || !row.contains(active)) return false;
        const rect = row.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < globalThis.window.innerHeight;
      });
    });
  }, LINK_PROBLEM_SCHEMA);
}

/** Opening a preview triggers follow-up renders; waits until the assignment counter stays put. */
async function waitForRenderChurnToSettle(): Promise<void> {
  let lastSeen = "";
  let stableSince = Date.now();
  let lastCount = htmlAssignmentCount();
  try {
    await waitFor("the render churn after opening to settle", () => {
      const preview = getActivePreviewForTests();
      const count = htmlAssignmentCount();
      lastSeen = JSON.stringify({ count, phase: preview?.phase, ready: preview?.webviewReady, status: preview?.status });
      if (count !== lastCount) {
        lastCount = count;
        stableSince = Date.now();
      }
      return Date.now() - stableSince >= 2_500 && preview?.phase === "ready" && preview.webviewReady === true;
    }, 40_000);
  } catch (error) {
    throw new Error(String(error) + " last=" + lastSeen);
  }
}

/**
 * RI-T43: typing on a rendered page assigns the webview document once (the ready render), not
 * twice; a slow render shows a floating overlay after 1.5 s and nothing in the page moves.
 */
async function scenarioPendingOverlayWithoutReload(page: Page, evidence: Evidence): Promise<void> {
  const body = Array.from({ length: 60 }, (_, index) => "Paragraph " + index + " keeps the reader busy.")
    .join("\n\n");
  await withDocument("realinput-t43", "# Pending overlay\n\n" + body + "\n", async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
    const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const end = source.positionAt(source.getText().length);
    editor.selection = new vscode.Selection(end, end);
    await waitForRenderChurnToSettle();
    const frame = await withCurrentFrame(page, async (current) => current);
    // Editor-to-preview sync would scroll the page on its own when the source changes; switch it
    // off so that only the pending state could move the content.
    const anchorButton = frame.locator("[data-sphinx-preview-anchor]");
    if (await anchorButton.getAttribute("aria-pressed") === "true") {
      await anchorButton.click();
      await waitFor("anchoring to be off", async () => await anchorButton.getAttribute("aria-pressed") === "false");
    }
    const bounds = await (await frame.frameElement()).boundingBox();
    assert.ok(bounds, "the preview pane is visible");
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + Math.min(200, bounds.height / 2));
    await page.mouse.wheel(0, 300);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const paragraphTop = (current: Frame): Promise<number> =>
      current.locator("p[data-sphinx-source-line]").nth(30).evaluate((element) => element.getBoundingClientRect().top);
    const a0 = htmlAssignmentCount();
    assert.ok(await frame.evaluate(() => window.scrollY) > 0, "the preview is scrolled");

    // Fast render: one assignment (the ready render), and the overlay never appears.
    const shownBefore = getActivePreviewForTests()?.pendingOverlayShown ?? 0;
    await page.keyboard.type("x");
    await waitForRender(source);
    await waitFor("the fast render to settle", () => getActivePreviewForTests()?.status === "success");
    await waitForRenderChurnToSettle();
    assert.equal(htmlAssignmentCount() - a0, 1, "one html assignment for a fast edit");
    assert.equal(getActivePreviewForTests()?.pendingOverlayShown ?? 0, shownBefore, "no overlay for a fast render");
    console.log("RI-T43 fast edit html assignments: " + (htmlAssignmentCount() - a0));

    // Slow render: the page stays still, the overlay appears after about 1.5 s.
    const slowFrame = await withCurrentFrame(page, async (current) => current);
    const top1 = await paragraphTop(slowFrame);
    const a1 = htmlAssignmentCount();
    let overlayTop = Number.NaN;
    try {
      setRenderDelayForTests(6_000);
      await page.keyboard.type("y");
      await waitFor("the pending status", () => getActivePreviewForTests()?.status === "pending");
      assert.equal(htmlAssignmentCount(), a1, "pending must not assign the webview html");
      assert.equal(getActivePreviewForTests()?.pendingOverlayVisible, false, "no overlay before the delay");
      assert.equal(await slowFrame.locator("#sphinx-myst-preview-content").count(), 1, "the same page is still shown");
      assert.equal(await slowFrame.locator("[data-sphinx-preview-pending-overlay]").count(), 0);
      assert.ok(Math.abs(await paragraphTop(slowFrame) - top1) <= 1, "the page does not move while pending");
      try {
        await waitFor("the pending overlay", async () =>
          getActivePreviewForTests()?.pendingOverlayVisible === true
          && await slowFrame.locator("[data-sphinx-preview-pending-overlay]").isVisible(), 4_000);
      } catch (error) {
        const preview = getActivePreviewForTests();
        throw new Error(String(error) + " phase=" + preview?.phase + " status=" + preview?.status
          + " visible=" + preview?.pendingOverlayVisible + " shown=" + preview?.pendingOverlayShown
          + " ready=" + preview?.webviewReady + " overlays="
          + await slowFrame.locator("[data-sphinx-preview-pending-overlay]").count());
      }
      assert.equal(htmlAssignmentCount(), a1, "the overlay does not reload the page");
      const delta = Math.abs(await paragraphTop(slowFrame) - top1);
      assert.ok(delta <= 1, "the page does not move when the overlay appears: " + delta);
      console.log("RI-T43 slow edit: assignments " + (htmlAssignmentCount() - a1) + ", paragraph shift "
        + delta + " px");
      const text = await slowFrame.locator("[data-sphinx-preview-pending-overlay]").innerText();
      assert.ok(/Preview pending\s*\n+\s*\S/u.test(text), "label and message on two lines: " + JSON.stringify(text));
      overlayTop = await slowFrame.locator("[data-sphinx-preview-pending-overlay]")
        .evaluate((element) => element.getBoundingClientRect().top);
      const toolbarBottom = await slowFrame.locator("[data-sphinx-preview-toolbar]")
        .evaluate((element) => element.getBoundingClientRect().bottom);
      assert.ok(overlayTop >= toolbarBottom - 1, "the overlay sits below the toolbar");
      await evidence.capture(page, slowFrame, "43-pending-overlay",
        "A slow render: the previous page stays still and a floating overlay says the preview is pending.");
    } finally {
      resetRenderHooksForTests();
    }
    await waitForRender(source);
    await waitFor("the settled render", () => getActivePreviewForTests()?.status === "success");
    await waitForRenderChurnToSettle();
    assert.equal(htmlAssignmentCount() - a1, 1, "one html assignment for the slow edit");
    assert.equal(getActivePreviewForTests()?.pendingOverlayVisible, false);
    const current = await withCurrentFrame(page, async (frame2) => frame2);
    assert.equal(await current.locator("[data-sphinx-preview-pending-overlay]").count(), 0, "the overlay is gone");
  });
}

const T30_DOCUMENT = [
  "---",
  "type: req",
  "title: In-place table",
  "related: target.md",
  "---",
  "",
  "# Body",
  "",
  "Some text.",
  "",
].join("\n");

const T30_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  related:",
  "    type: string",
  "    x-okf-link:",
  "      resolution: document-relative",
  "      syntax: plain",
  "      tooltip_shows_fields: [description]",
  "      preview_shows_fields: [description]",
  "",
].join("\n");

const T30_TARGET = (description: string): string => "---\ndescription: " + description + "\n---\n# Target\n";

/**
 * RI-T30: typing in the body costs one html assignment per ready render (the properties table is
 * patched in place), and a change to a linked file updates the excerpt in the same frame.
 */
async function scenarioPropertiesTableWithoutReload(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t30", {
    "smoke.md": T30_DOCUMENT,
    "target.md": T30_TARGET("Original excerpt"),
  });
  try {
    writeSchema(fixture.directory, "req", T30_SCHEMA);
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    try {
      await openSidePreview(source);
      await waitForRender(source, (html) => html.includes("Original excerpt"));
      await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
      await waitForRenderChurnToSettle();
      const frame = await withCurrentFrame(page, async (current) => current);
      const excerpt = frame.locator('[data-okf-field="related"] .okf-link-excerpt');
      await waitFor("the link excerpt in the page", async () => await excerpt.count() === 1);
      assert.equal(await excerpt.textContent(), "Original excerpt");
      const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
      const end = source.positionAt(source.getText().length);
      editor.selection = new vscode.Selection(end, end);
      await waitFor("the caret at the end of the source", () =>
        vscode.window.activeTextEditor?.document === source
        && vscode.window.activeTextEditor.selection.active.isEqual(end));
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Typing in the body: every finished render replaces the page once, and nothing else may.
      // `renderedStages` counts the finished renders exactly; sampling the phase would miss the
      // ones that are followed at once by the next build.
      const a0 = htmlAssignmentCount();
      const renders0 = getActivePreviewForTests()?.renderedStages ?? 0;
      await typeText(page, "abcdefghij", 60);
      assert.ok(source.getText().endsWith("Some text.\nabcdefghij"), "the text went to the body: "
        + JSON.stringify(source.getText()));
      await waitForRender(source);
      await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const assignments = htmlAssignmentCount() - a0;
      const renders = (getActivePreviewForTests()?.renderedStages ?? 0) - renders0;
      console.log("RI-T30 typing: " + assignments + " html assignments, " + renders + " ready renders");
      assert.ok(renders >= 1, "at least one render finished");
      assert.ok(assignments <= renders,
        "html assignments (" + assignments + ") must not exceed ready renders (" + renders + ")");

      // A change to the linked file patches the excerpt in the same frame, without any assignment.
      await waitForRenderChurnToSettle();
      const settled = await withCurrentFrame(page, async (current) => current);
      await settled.evaluate(() => {
        (globalThis as unknown as { __t30Marker?: boolean }).__t30Marker = true;
      });
      await waitFor("the link excerpt after the render", async () =>
        await settled.locator('[data-okf-field="related"] .okf-link-excerpt').count() === 1);
      const a1 = htmlAssignmentCount();
      fs.writeFileSync(fixture.path("target.md"), T30_TARGET("Updated excerpt"));
      await waitFor("the excerpt to show the updated description", async () =>
        await settled.locator('[data-okf-field="related"] .okf-link-excerpt').textContent() === "Updated excerpt");
      assert.equal(htmlAssignmentCount(), a1, "the linked file change must not assign the html");
      assert.equal(await settled.evaluate(() =>
        (globalThis as unknown as { __t30Marker?: boolean }).__t30Marker), true, "the same page, not a reload");
      assert.equal(settled.isDetached(), false);
      await evidence.capture(page, settled, "30-properties-in-place",
        "The linked file changed on disk: the excerpt updated in the open page without a reload.");
    } finally {
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

const T34_DOCUMENT = [
  "# In-place content",
  "",
  "A paragraph before the diagram.",
  "",
  "```mermaid",
  "graph LR",
  "  input --> output",
  "```",
  "",
  "The last paragraph.",
  "",
].join("\n");

function contentPatchCount(): number {
  return getActivePreviewForTests()?.contentPatches ?? 0;
}

/** Runs `body` with preview.incrementalUpdates set in the workspace, then restores the setting. */
async function withIncrementalUpdates(enabled: boolean, body: () => Promise<void>): Promise<void> {
  const configuration = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.preview");
  const original = configuration.inspect<boolean>("incrementalUpdates")?.workspaceValue;
  await configuration.update("incrementalUpdates", enabled, vscode.ConfigurationTarget.Workspace);
  try {
    await body();
  } finally {
    await configuration.update("incrementalUpdates", original, vscode.ConfigurationTarget.Workspace);
  }
}

/**
 * RI-T34: typing in the source patches the content of the open preview page. The same frame stays
 * attached, shows the typed text, carries the identifiers of the host's render, and the webview
 * document is not assigned again. A Mermaid diagram is rendered again in the same frame, and a slow
 * render still shows the pending overlay and ends with a clean page. With the setting off, every
 * ready render assigns the document.
 */
async function scenarioContentPatchedInPlace(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t34", T34_DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
    const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const end = source.positionAt(source.getText().length);
    editor.selection = new vscode.Selection(end, end);
    await waitFor("the caret at the end of the source", () =>
      vscode.window.activeTextEditor?.document === source
      && vscode.window.activeTextEditor.selection.active.isEqual(end));
    await waitForRenderChurnToSettle();
    const frame = await withCurrentFrame(page, async (current) => current);
    assert.equal(getActivePreviewForTests()?.incrementalUpdates, true, "the setting is on by default");
    // The diagram of the first render is drawn by the page's own Mermaid script.
    await waitFor("the Mermaid diagram in the page", async () =>
      await frame.locator(".myst-mermaid-diagram img.myst-mermaid-image").count() === 1);
    await frame.evaluate(() => {
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker = true;
    });
    const a0 = htmlAssignmentCount();
    const patches0 = contentPatchCount();
    const typed = "abcdefghijklmnopqrst";
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Twenty characters, one every 60 ms: the page is patched, never reloaded.
    await typeText(page, typed, 60);
    assert.ok(source.getText().endsWith("The last paragraph.\n" + typed), "the text went to the end of the source: "
      + JSON.stringify(source.getText().slice(-60)));
    await waitForRender(source);
    await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log("RI-T34 typing: " + (htmlAssignmentCount() - a0) + " html assignments, "
      + (contentPatchCount() - patches0) + " content patches");
    assert.equal(htmlAssignmentCount(), a0, "typing does not assign the webview document");
    assert.ok(contentPatchCount() > patches0, "the renders were applied as content patches");
    assert.equal(frame.isDetached(), false, "the frame the scenario started with is still attached");
    assert.equal(await frame.evaluate(() =>
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker), true, "the same page, not a reload");
    await waitFor("the typed text in the page", async () =>
      (await frame.locator("#sphinx-myst-preview-content").innerText()).includes(typed));
    const preview = getActivePreviewForTests();
    assert.ok(preview?.requestId !== undefined);
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-request-id"), String(preview.requestId),
      "the page carries the identifiers of the host's render");
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-document-version"),
      String(source.version));
    assert.equal(await frame.locator("[data-sphinx-preview-status]").count(), 1, "one status region");
    assert.equal(await frame.locator("[data-sphinx-preview-status]").getAttribute("data-sphinx-preview-status"),
      "success");
    await waitFor("the Mermaid diagram drawn again in the same frame", async () =>
      await frame.locator(".myst-mermaid-diagram img.myst-mermaid-image").count() === 1);
    assert.equal(await frame.locator(".myst-mermaid-error").count(), 0, "no diagram error");
    await evidence.capture(page, frame, "34-content-patched",
      "Twenty characters typed in the source: the open page shows them and the diagram, without a reload.");

    // A slow render: the pending overlay appears over the page, the result lands as a patch, and
    // the overlay is gone afterwards. Nothing assigns the document.
    const a1 = htmlAssignmentCount();
    const patches1 = contentPatchCount();
    try {
      setRenderDelayForTests(5_000);
      await typeText(page, "yz", 30);
      await waitFor("the pending overlay", async () =>
        getActivePreviewForTests()?.pendingOverlayVisible === true
        && await frame.locator("[data-sphinx-preview-pending-overlay]").isVisible(), 6_000);
    } finally {
      resetRenderHooksForTests();
    }
    await waitForRender(source);
    await waitFor("the slow render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
    await waitFor("the overlay to be gone", async () =>
      await frame.locator("[data-sphinx-preview-pending-overlay]").count() === 0);
    assert.equal(htmlAssignmentCount(), a1, "the slow render did not assign the document");
    assert.ok(contentPatchCount() > patches1, "the slow render was applied as a content patch");
    assert.equal(getActivePreviewForTests()?.pendingOverlayVisible, false);
    await waitFor("the typed text of the slow render in the page", async () =>
      (await frame.locator("#sphinx-myst-preview-content").innerText()).includes(typed + "yz"));

    // A patched page keeps the nonce it was loaded with, and so does the host's record. A document
    // loaded from that record (here: the stale status after a failed render) gets a fresh nonce.
    const recordNonce = (): string | undefined =>
      /\bnonce="([^"]+)"/u.exec(getActivePreviewForTests()?.html ?? "")?.[1];
    const scriptNonce = (target: Frame): Promise<string | undefined> =>
      target.evaluate(() => (document.querySelector("script[nonce]") as HTMLScriptElement | null)?.nonce);
    const nonceBefore = await scriptNonce(frame);
    assert.ok(nonceBefore);
    assert.equal(recordNonce(), nonceBefore, "the record of a patched page carries the loaded nonce");
    try {
      setRenderOverrideForTests(() => {
        throw new Error("simulated render failure");
      });
      await typeText(page, "!", 30);
      await waitFor("the stale status", () => getActivePreviewForTests()?.status === "stale", 6_000);
    } finally {
      resetRenderHooksForTests();
    }
    await waitFor("a new document with a fresh nonce", async () => {
      const nonce = recordNonce();
      if (nonce === undefined || nonce === nonceBefore) return false;
      for (const candidate of page.frames()) {
        try {
          if (await candidate.locator("#sphinx-myst-preview-content").count() === 0) continue;
          if (await scriptNonce(candidate) === nonce) return true;
        } catch (error) {
          if (!/frame.*detach|execution context was destroyed|cannot find context/iu.test(String(error))) throw error;
        }
      }
      return false;
    }, 8_000);
    // The frame whose script carries the record's new nonce is a new document: the old one had nonceBefore.
    // The next good render is applied to the new document again.
    await typeText(page, "?", 30);
    await waitForRender(source);
    await waitFor("the recovered render in the page", () => getActivePreviewForTests()?.webviewReady === true);
    const recovered = await withCurrentFrame(page, async (current) => current);
    await waitFor("the recovered text in the page", async () =>
      (await recovered.locator("#sphinx-myst-preview-content").innerText()).includes(typed + "yz!?"));

    // With the setting off, every ready render assigns the document again.
    await withIncrementalUpdates(false, async () => {
      await waitFor("the preview to hold the setting", () => getActivePreviewForTests()?.incrementalUpdates === false);
      await waitForRenderChurnToSettle();
      const offAssignments = htmlAssignmentCount();
      const offPatches = contentPatchCount();
      const offFrame = await withCurrentFrame(page, async (current) => current);
      await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
      await typeText(page, "123", 60);
      await waitForRender(source);
      await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
      assert.ok(htmlAssignmentCount() > offAssignments, "with the setting off the document is assigned again");
      assert.equal(contentPatchCount(), offPatches, "with the setting off nothing is patched");
      await waitFor("the previous frame to be replaced", () => offFrame.isDetached());
    });
  });
}

/** About 70 KB of Markdown: headings, paragraphs, a table and a list in every section. */
function largeChapter(): string {
  const sections: string[] = ["# Large chapter", ""];
  for (let index = 1; index <= 70; index += 1) {
    sections.push(
      "## Section " + index,
      "",
      ("Paragraph text for section " + index + " keeps the reader busy with ordinary sentences. ").repeat(5).trim(),
      "",
      ("Second paragraph of section " + index + " has **bold** words and `inline code` too. ").repeat(4).trim(),
      "",
      "| Name | Value | Note |",
      "|------|-------|------|",
      ...Array.from({ length: 5 }, (_, row) => "| item " + row + " | " + (index * 10 + row) + " | row note |"),
      "",
      ...Array.from({ length: 5 }, (_, item) => "- list item " + item + " of section " + index),
      "",
    );
  }
  sections.push("The last paragraph.", "");
  return sections.join("\n");
}

const LARGE_DOCUMENT_CPU_THROTTLE = 6;

/**
 * RI-T34 on a large document: applying a patch takes long enough that the next render finishes
 * before the page acknowledged the previous one. Fast continuous typing must still never assign
 * the webview document.
 */
async function scenarioLargeDocumentPatched(page: Page, evidence: Evidence): Promise<void> {
  const chapter = largeChapter();
  assert.ok(chapter.length > 65_000, "the fixture is about 70 KB: " + chapter.length);
  await withDocument("realinput-t34-large", chapter, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
    const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const end = source.positionAt(source.getText().length);
    editor.selection = new vscode.Selection(end, end);
    await waitFor("the caret at the end of the source", () =>
      vscode.window.activeTextEditor?.document === source
      && vscode.window.activeTextEditor.selection.active.isEqual(end));
    await waitForRenderChurnToSettle();
    const frame = await withCurrentFrame(page, async (current) => current);
    await frame.evaluate(() => {
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker = true;
    });
    const a0 = htmlAssignmentCount();
    const patches0 = contentPatchCount();
    const typed = "abcdefghijklmnopqrstuvwxyz012345";
    // A slower machine makes applying a patch take longer than a render; slow the page's CPU down
    // so that the next render finishes before the page acknowledged the previous patch.
    const throttle = await page.context().newCDPSession(frame.parentFrame() ?? frame);
    try {
      await throttle.send("Emulation.setCPUThrottlingRate", { rate: LARGE_DOCUMENT_CPU_THROTTLE });
      await typeText(page, typed, 60);
      await waitForRender(source);
      await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true, 30_000);
    } finally {
      await throttle.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => undefined);
      await throttle.detach().catch(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log("RI-T34 large document typing: " + (htmlAssignmentCount() - a0) + " html assignments, "
      + (contentPatchCount() - patches0) + " content patches");
    assert.equal(htmlAssignmentCount(), a0, "typing in a large document does not assign the webview document");
    assert.ok(contentPatchCount() > patches0, "the renders were applied as content patches");
    assert.equal(await frame.evaluate(() =>
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker), true, "the same page, not a reload");
    await waitFor("the typed text in the page", async () =>
      (await frame.locator("#sphinx-myst-preview-content").innerText()).includes(typed));
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-request-id"),
      String(getActivePreviewForTests()?.requestId));
  });
}

/**
 * RI-T28: an empty document is written from the preview alone (Start writing), then a block is
 * inserted between two blocks with the + button; turning edit mode on does not move the layout.
 */
async function scenarioInsertBlocksFromPreview(page: Page, evidence: Evidence): Promise<void> {
  const DONE = "button[aria-label='Done editing']";
  await withDocument("realinput-t28", "", async (source) => {
    await openStudioEditor(source.uri);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.getByRole("button", { name: "Start writing" }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await captureAfter(evidence, page, "24-start-writing-open",
      "Empty document, edit mode on; Start writing opened an empty editor with its placeholder.");
    await typeText(page, "# Incident review checklist");
    await press(page, "Enter");
    await press(page, "Enter");
    await typeText(page, "First paragraph.");
    await withCurrentFrame(page, (frame) => frame.locator(DONE).click());
    const first = "# Incident review checklist\n\nFirst paragraph.\n";
    try {
      await waitFor("the first block to reach the buffer", () => bufferText(source) === first);
    } catch (error) {
      throw new Error(String(error) + " Buffer: " + JSON.stringify(bufferText(source)));
    }
    await waitForRender(source);
    await waitForNoBlockEditor(page, "the block editor to close after Done");
    await waitFor("the heading to render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("h1", { hasText: "Incident review checklist" }).count() === 1;
    });

    await withCurrentFrame(page, async (frame) => {
      await frame.locator("h1[data-sphinx-source-line]").first().hover();
      await frame.locator("h1[data-sphinx-source-line] + .sphinx-preview-insert-point button").click();
    });
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await typeText(page, "- check logs");
    await withCurrentFrame(page, (frame) => frame.locator(DONE).click());
    const second = "# Incident review checklist\n\n- check logs\n\nFirst paragraph.\n";
    try {
      await waitFor("the list to be inserted between the heading and the paragraph", () =>
        bufferText(source) === second);
    } catch (error) {
      throw new Error(String(error) + " Buffer: " + JSON.stringify(bufferText(source)));
    }
    await waitForRender(source);
    await waitForNoBlockEditor(page, "the block editor to close after the second Done");
    await waitFor("the list to render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("li", { hasText: "check logs" }).count() === 1;
    });
    await captureAfter(evidence, page, "25-block-inserted",
      "Edit mode on; the list was inserted between the heading and the paragraph with the + button.");

    // The T16 guarantee still holds with insertion points in the content.
    const measure = (): Promise<{ height: number; top: number }> => withCurrentFrame(page, (frame) =>
      frame.locator("p[data-sphinx-source-line]").last().evaluate((element) => ({
        height: document.documentElement.scrollHeight,
        top: element.getBoundingClientRect().top + window.scrollY,
      })));
    await setEditMode(page, false);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const reading = await measure();
    await setEditMode(page, true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const editing = await measure();
    assert.ok(Math.abs(editing.height - reading.height) <= 2,
      "scrollHeight changed from " + reading.height + " to " + editing.height);
    assert.ok(Math.abs(editing.top - reading.top) <= 2,
      "last paragraph top moved from " + reading.top + " to " + editing.top);
  });
}

/**
 * RI-T28b: a block is inserted after a figure that is the last block of the document, with and
 * without a final line break, and lands after the closing fence with one blank line.
 */
async function scenarioInsertAfterFinalFigure(page: Page, evidence: Evidence): Promise<void> {
  const DONE = "button[aria-label='Done editing']";
  const figure = ":::{figure} figure.svg\n:alt: A figure\n\nCaption.\n:::";
  const variants: Array<[string, string]> = [["with-newline", figure + "\n"], ["without-newline", figure]];
  for (const [name, text] of variants) {
    await withDocument("realinput-t28b-" + name, "# Figures\n\n" + text, async (source) => {
      await openStudioEditor(source.uri);
      await waitForRender(source);
      await setEditMode(page, true);
      await withCurrentFrame(page, async (frame) => {
        await frame.locator("figure[data-sphinx-source-line]").first().hover();
        await frame.locator("figure[data-sphinx-source-line] + .sphinx-preview-insert-point button").click();
      });
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await captureAfter(evidence, page, "25b-insert-after-figure-" + name,
        "Edit mode on; the + after the final figure opened an empty editor below it.");
      await typeText(page, "After the figure.");
      await withCurrentFrame(page, (frame) => frame.locator(DONE).click());
      const expected = "# Figures\n\n" + figure + "\n\nAfter the figure.\n";
      try {
        await waitFor("the paragraph to be inserted after the figure", () =>
          bufferText(source).replace(/\n$/u, "") === expected.replace(/\n$/u, ""));
      } catch (error) {
        throw new Error(String(error) + " Buffer: " + JSON.stringify(bufferText(source)));
      }
      await waitForNoBlockEditor(page, "the block editor to close after Done");
    });
  }
}

/**
 * RI-T07: a plain image, an image inside a link and a raw `<img>` all open their block editor on a
 * click; ArrowUp from the paragraph below reaches the raw image; each image has a "+" after it.
 */
async function scenarioImageEditing(page: Page, evidence: Evidence): Promise<void> {
  const text = "First paragraph.\n\n![a](img.png)\n\n[![b](img.png)](https://example.com)\n\n"
    + "<img src=\"img.png\" alt=\"c\">\n\nLast paragraph.\n";
  await withDocument("realinput-t07-images", text, async (source) => {
    await openStudioEditor(source.uri);
    await waitForRender(source);
    await setEditMode(page, true);
    const editorValue = async (): Promise<string | undefined> => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return undefined;
      const textarea = current.locator("[data-sphinx-preview-block-editor] textarea");
      return await textarea.count() === 1 ? await textarea.inputValue() : undefined;
    };
    const images: Array<[string, string]> = [
      ["img[alt='a']", "![a](img.png)"],
      ["img[alt='b']", "[![b](img.png)](https://example.com)"],
      ["img[alt='c']", "<img src=\"img.png\" alt=\"c\">"],
    ];
    for (const [selector, source_] of images) {
      await withCurrentFrame(page, (frame) => frame.locator(selector).first().click({ force: true }));
      await waitFor("the editor for " + source_, async () => (await editorValue())?.trim() === source_);
      await press(page, "Escape");
      await waitForNoBlockEditor(page, "the editor to close after Escape");
      await withCurrentFrame(page, async (frame) => {
        const following = frame.locator(selector).first()
          .locator("xpath=ancestor-or-self::*[@data-sphinx-source-line][1]/following-sibling::*[1]");
        assert.ok((await following.getAttribute("class"))?.includes("sphinx-preview-insert-point"),
          "a + follows " + source_);
      });
    }
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Last paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "ArrowUp");
    await waitFor("the raw image editor after ArrowUp", async () =>
      (await editorValue())?.trim() === images[2][1]);
    await captureAfter(evidence, page, "07-image-editing",
      "Edit mode on; ArrowUp from the last paragraph reached the raw <img> block editor.");
  });
}

/**
 * RI-T35: deleting the source shows the missing-source page with its title and message on two
 * lines; restoring the file brings the preview back.
 */
async function scenarioStatusPageTwoLines(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t35", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    // Let the file watcher see the file before it disappears, so the create and the delete are
    // not coalesced into nothing.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    // The VS Code file service reports the deletion at once; a bare fs.rmSync waits for the
    // OS watcher, which does not reliably deliver events for the fixtures folder.
    await vscode.workspace.fs.delete(document.uri);
    const seen = new Set<string>();
    try {
      await waitFor("the missing-source page", () => {
        seen.add(String(getActivePreviewForTests()?.status));
        return getActivePreviewForTests()?.status === "missing-source";
      }, 20_000);
    } catch (error) {
      const active = getActivePreviewForTests();
      throw new Error(String(error) + " status=" + active?.status + " phase=" + active?.phase
        + " exists=" + fs.existsSync(document.uri.fsPath) + " seen=" + [...seen].join(","));
    }
    // A status page has no render markers, so findCurrentFrame cannot see it: find its frame by the
    // status-page marker on <body>.
    const statusFrame = async (): Promise<Frame | undefined> => {
      for (const frame of page.frames()) {
        try {
          if (await frame.locator("body[data-sphinx-preview-status-page]").count() === 1
            && await (await frame.frameElement()).isVisible()) return frame;
        } catch (error) {
          if (!/detached|destroyed|Target closed/iu.test(String(error))) throw error;
        }
      }
      return undefined;
    };
    let shown: Frame | undefined;
    await waitFor("the missing-source page to be visible", async () => {
      shown = await statusFrame();
      return shown !== undefined
        && await shown.locator('[data-sphinx-preview-status="missing-source"]').count() === 1;
    });
    assert.ok(shown);
    const text = await shown.locator("[data-sphinx-preview-status]").innerText();
    assert.ok(!text.includes("Sphinx"), "no Sphinx in the status page: " + text);
    assert.ok(/Preview source missing\s*\n+\s*\S/u.test(text),
      "title and message on two lines: " + JSON.stringify(text));
    await evidence.capture(page, shown, "35-status-two-lines",
      "Missing-source page: the title and the message sit on separate lines.",
      { checks: { required: ["status-two-lines"] } });
    await vscode.workspace.fs.writeFile(document.uri, Buffer.from(SMOKE, "utf8"));
    await waitFor("the preview to recover", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("h1", { hasText: "Smoke document" }).count() === 1;
    });
  });
}

/** RI-T31: moving focus between the editor and the preview does not move the preview. */
async function scenarioFocusChangeKeepsPreviewStill(page: Page, evidence: Evidence): Promise<void> {
  const TRACKER_CELL = "table tbody tr:first-child td:nth-child(2)";
  const chapter = fs.readFileSync(
    path.resolve(__dirname, "../../..", "test", "visual", "fixtures", "05-long-chapter.md"), "utf8");
  await withDocument("realinput-t31", chapter, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    const scrollY = (): Promise<number> => withCurrentFrame(page, (frame) => frame.evaluate(() => window.scrollY));
    const wheelPreview = async (delta: number): Promise<void> => {
      const box = await withCurrentFrame(page, async (frame) => (await frame.frameElement()).boundingBox());
      assert.ok(box, "the preview frame has a bounding box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, delta);
      await new Promise((resolve) => setTimeout(resolve, 800));
    };
    await wheelPreview(1200);
    const y0 = await scrollY();
    assert.ok(y0 > 300, "the preview scrolled before the focus change (scrollY " + y0 + ")");

    // Case A: click into the source editor, then type.
    const restoreCallsBefore = getActivePreviewForTests()?.restorePreviewStateCalls;
    assert.ok(restoreCallsBefore !== undefined, "the restore-call counter is exposed");
    // The visible editor viewport, not `.view-lines`: that element is as tall as the whole document
    // and moves with the editor's scroll, so a fraction of it can land on the title bar or a tab.
    const editorBox = await page.locator(".monaco-editor:visible").first().boundingBox();
    assert.ok(editorBox, "the source editor has a bounding box");
    await page.mouse.click(editorBox.x + editorBox.width / 3, editorBox.y + editorBox.height * 0.3);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const y1 = await scrollY();
    await typeText(page, "x");
    await waitForRender(document);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const y2 = await scrollY();
    console.log("RI-T31 case A: Y0=" + y0 + " Y1=" + y1 + " Y2=" + y2);
    assert.ok(Math.abs(y1 - y0) <= 4, "clicking the editor moved the preview from " + y0 + " to " + y1);
    assert.ok(Math.abs(y2 - y0) <= 4, "typing in the editor moved the preview from " + y0 + " to " + y2);
    assert.strictEqual(getActivePreviewForTests()?.restorePreviewStateCalls, restoreCallsBefore,
      "a focus-only view state change must not run restorePreviewState");

    // Case B: click a table cell in edit mode. The in-flow toolbar legitimately scrolls the page
    // (R7), so the clicked cell's viewport top is the measure, not scrollY.
    await setEditMode(page, true);
    await waitFor("the observability table cell", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator(TRACKER_CELL).count() === 1;
    });
    await wheelPreview(400);
    const cellTop = (): Promise<number | undefined> => withCurrentFrame(page, async (frame) => {
      const box = await frame.locator(TRACKER_CELL).boundingBox();
      const host = await (await frame.frameElement()).boundingBox();
      return box === null || host === null ? undefined : box.y - host.y;
    });
    const cellPoint = (): Promise<{ x: number; y: number } | undefined> => withCurrentFrame(page, async (frame) => {
      const box = await frame.locator(TRACKER_CELL).boundingBox();
      return box === null ? undefined : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    const tableTop = (): Promise<number | undefined> => withCurrentFrame(page, async (frame) => {
      const box = await frame.locator("table").first().boundingBox();
      const host = await (await frame.frameElement()).boundingBox();
      return box === null || host === null ? undefined : box.y - host.y;
    });
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const top = await tableTop();
      const point = await cellPoint();
      const viewport = page.viewportSize();
      if (top !== undefined && top >= 250 && point !== undefined && viewport !== null
        && point.y < viewport.height - 80) break;
      const delta = top !== undefined && top < 250 ? Math.min(-100, top - 300) : 400;
      await wheelPreview(delta);
    }
    const top0 = await cellTop();
    const point = await cellPoint();
    assert.ok(top0 !== undefined && point !== undefined, "the table cell is on screen");
    await page.mouse.click(point.x, point.y);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const top1 = await cellTop();
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const top2 = await cellTop();
    console.log("RI-T31 case B cell top: before=" + top0 + " after100ms=" + top1 + " editorOpen=" + top2);
    assert.ok(top1 !== undefined && Math.abs(top1 - top0) <= 4,
      "clicking a table cell moved it on screen from " + top0 + " to " + top1);
    assert.ok(top2 !== undefined && Math.abs(top2 - top0) <= 4,
      "opening the cell editor moved the cell on screen from " + top0 + " to " + top2);
    await captureAfter(evidence, page, "26-focus-change-still",
      "The preview was scrolled, then the editor was clicked and typed in, then a table cell was "
      + "clicked; the page scroll and the cell's position on screen stayed within 4 px.");
  });
}

/** RI-T31b: a hidden preview that becomes visible again catches up with the moved editor. */
async function scenarioHiddenPreviewCatchesUp(page: Page, evidence: Evidence): Promise<void> {
  const sections: string[] = [];
  for (let index = 0; index < 300; index += 1) {
    sections.push("## Section " + index, "", "Paragraph " + index + " line one", "continues on line two.", "");
  }
  await withDocument("realinput-t31b", sections.join("\n"), async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    const panel = getActivePreviewPanelForTests();
    assert.ok(panel, "the side preview panel exists");
    await waitFor("the preview to be visible", () => panel.visible);
    const sourceEditor = vscode.window.visibleTextEditors.find((editor) =>
      editor.document.uri.toString() === document.uri.toString() && editor.viewColumn === vscode.ViewColumn.One);
    assert.ok(sourceEditor, "the source editor is in the left group");
    const editorTop = (): number => sourceEditor.visibleRanges[0]?.start.line ?? -1;

    // Hide the preview by opening another editor in its group.
    const otherPath = path.join(path.dirname(document.uri.fsPath), "other.txt");
    fs.writeFileSync(otherPath, "Other\n");
    const other = await vscode.workspace.openTextDocument(vscode.Uri.file(otherPath));
    await vscode.window.showTextDocument(other, { viewColumn: panel.viewColumn, preserveFocus: true });
    await waitFor("the preview panel to be hidden", () => !panel.visible);

    // Scroll the source editor by about 200 lines while the preview is hidden.
    const before = editorTop();
    sourceEditor.revealRange(new vscode.Range(before + 200, 0, before + 200, 0), vscode.TextEditorRevealType.AtTop);
    await waitFor("the source editor to scroll", () => editorTop() >= before + 150);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const restoreCallsBefore = getActivePreviewForTests()?.restorePreviewStateCalls;
    assert.ok(restoreCallsBefore !== undefined, "the restore-call counter is exposed");
    // Reveal the panel again; it must catch up with the editor.
    panel.reveal(panel.viewColumn, true);
    await waitFor("the preview panel to be visible again", () => panel.visible);
    await waitFor("restorePreviewState to run on the hidden to visible transition",
      () => (getActivePreviewForTests()?.restorePreviewStateCalls ?? 0) >= restoreCallsBefore + 1);
    // The preview's anchor block: the last block starting at or above the reading line. The editor's
    // top line must lie within 2 lines of that block's span.
    const anchorDistance = (): Promise<number> => withCurrentFrame(page, (frame) => frame.evaluate((line) => {
      const blocks = Array.from(window.document.querySelectorAll<HTMLElement>("[data-sphinx-source-line]"))
        .map((element) => ({ element, start: Number(element.dataset.sphinxSourceLine) }))
        .sort((left, right) => left.start - right.start);
      const band = window.document.querySelector<HTMLElement>("[data-sphinx-preview-sticky-headings]");
      const controls = parseFloat(getComputedStyle(window.document.documentElement)
        .getPropertyValue("--sphinx-preview-controls-height")) || 0;
      const readingLine = band && !band.hidden ? band.getBoundingClientRect().bottom : controls;
      let index = -1;
      for (let i = 0; i < blocks.length; i += 1) {
        if (blocks[i].element.getBoundingClientRect().top <= readingLine + 1) index = i;
      }
      if (index < 0) return Number.POSITIVE_INFINITY;
      const start = blocks[index].start;
      const end = (blocks[index + 1]?.start ?? start + 1) - 1;
      return line < start ? start - line : line > end ? line - end : 0;
    }, editorTop() + 1));
    let distance = Number.POSITIVE_INFINITY;
    await waitFor("the revealed preview anchors within 2 lines of the editor top", async () => {
      distance = await anchorDistance();
      return distance <= 2;
    });
    console.log("RI-T31b: editor top line " + (editorTop() + 1) + ", anchor distance " + distance);
    assert.ok(editorTop() >= before + 150, "the editor stayed scrolled");
    await captureAfter(evidence, page, "27-hidden-preview-catches-up",
      "The preview was hidden behind another tab, the editor scrolled about 200 lines, and the "
      + "revealed preview shows the editor's top line.");
  });
}

async function scenarioTitleBarButton(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t36", async (document) => {
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitFor("no preview before the click", () => getActivePreviewForTests() === undefined);
    const button = page.locator(".editor-actions .codicon-book").first();
    await waitFor("the Studio title-bar action", async () => await button.count() > 0);
    await button.click();
    await waitForRender(document);
    await waitFor("the side preview panel", () => getActivePreviewPanelForTests() !== undefined);
    await captureAfter(evidence, page, "36-title-bar-button",
      "A Markdown file is active in the text editor; a click on the book icon in the editor title "
      + "bar opened the Studio preview beside it.");
  });
}

/** RI-T38: the anchor button needs a paired text editor; edit mode is remembered per workspace. */
async function scenarioToolbarState(page: Page, evidence: Evidence): Promise<void> {
  const demo = [
    "# Fleet dispatch review",
    "",
    "````{admonition} Dispatch readiness",
    ":class: tip",
    "",
    "Confirm **vehicle availability** and the latest operating limits before dispatch.",
    "",
    "- Review the route and charging plan.",
    "- Record the operator approval in the dispatch log.",
    "",
    "```{warning}",
    "If telemetry is stale, **hold dispatch** until the vehicle reports a fresh status.",
    "```",
    "````",
    "",
    "```mermaid",
    "flowchart LR",
    "  Review[Review telemetry] --> Ready{Ready?}",
    "  Ready -->|Yes| Dispatch[Dispatch fleet]",
    "  Ready -->|No| Hold[Hold and inspect]",
    "```",
    "",
    "```{figure} fleet-loop.svg",
    ":width: 360px",
    ":alt: Fleet operating loop: plan, dispatch, observe, and correct.",
    "",
    "Fleet operating loop, rendered from a local SVG.",
    "```",
    "",
  ].join("\n");
  await withDocument("realinput-t38", demo, async (document) => {
    fs.copyFileSync(
      path.resolve(__dirname, "../../..", "test", "visual", "external-img", "fleet-loop.svg"),
      path.join(path.dirname(document.uri.fsPath), "fleet-loop.svg"),
    );
    await openStudioEditor(document.uri);
    await waitForRender(document);
    assert.equal(
      vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === document.uri.toString()),
      false,
      "no text editor shows the document",
    );
    const anchorButton = (frame: Frame) => frame.locator("[data-sphinx-preview-anchor]");
    await waitFor("the anchor button to be disabled", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await anchorButton(current).isDisabled();
    });
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await anchorButton(frame).getAttribute("title"), "No text editor shows this file");
    });
    await captureAfter(evidence, page, "38-anchor-disabled",
      "The Open With editor is alone: the anchor button is disabled with its tooltip.");

    await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
    await waitFor("the anchor button to be enabled", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await anchorButton(current).isEnabled();
    });
    await captureAfter(evidence, page, "38-anchor-enabled",
      "A text editor now shows the file beside the Open With editor: the anchor button is enabled.");
    await closeAllEditors();

    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    await closeAllEditors();
    await openSidePreview(document);
    await waitForRender(document);
    await waitFor("edit mode to be on in the reopened preview", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on";
    });
    const workbench = vscode.workspace.getConfiguration("workbench");
    const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
    const palettes = {
      dark: ["rgb(30, 30, 30)", "rgb(37, 37, 38)", "rgb(212, 212, 212)", "rgb(14, 99, 156)"],
      white: ["rgb(255, 255, 255)", "rgb(243, 243, 243)", "rgb(51, 51, 51)", "rgb(0, 95, 184)"],
      cream: ["rgb(245, 241, 232)", "rgb(251, 248, 241)", "rgb(74, 70, 61)", "rgb(154, 74, 42)"],
    };
    try {
      for (const host of ["Dark", "Light"] as const) {
        await workbench.update("colorTheme", `Default ${host} Modern`, vscode.ConfigurationTarget.Workspace);
        await waitFor(`the ${host} host theme to reach the webview`, async () => {
          const current = await findCurrentFrame(page);
          return current !== undefined && await current.locator("body").evaluate(
            (body, kind) => body.classList.contains(`vscode-${kind}`), host.toLowerCase());
        });
        for (const mode of ["current", "dark", "white", "cream"] as const) {
          await withCurrentFrame(page, async (frame) => {
            const toggle = frame.locator("[data-sphinx-preview-theme-toggle]");
            for (let attempt = 0; attempt < 4; attempt += 1) {
              if (await toggle.getAttribute("data-theme-mode") === mode) break;
              await toggle.click();
            }
          });
          await page.mouse.move(10, 10);
          await waitFor(`${mode} toolbar colors on the ${host} host`, async () => {
            const current = await findCurrentFrame(page);
            if (current === undefined) return false;
            return current.evaluate(({ mode, palettes }) => {
              if (window.document.documentElement.getAttribute("data-sphinx-preview-theme-mode") !== mode) return false;
              const toolbar = window.document.querySelector<HTMLElement>("[data-sphinx-preview-toolbar]");
              const active = toolbar?.querySelector<HTMLElement>('button[aria-pressed="true"]');
              if (!toolbar || !active) return false;
              const bodyStyle = getComputedStyle(window.document.body);
              const toolbarStyle = getComputedStyle(toolbar);
              const activeStyle = getComputedStyle(active);
              const actual = [bodyStyle.backgroundColor, toolbarStyle.backgroundColor,
                toolbarStyle.color, activeStyle.backgroundColor];
              if (mode !== "current") {
                const borders = { dark: "rgb(69, 69, 69)", white: "rgb(200, 200, 200)", cream: "rgb(214, 205, 189)" };
                const panels = [toolbar, ...window.document.querySelectorAll<HTMLElement>(".admonition")];
                return actual.every((color, index) => color === palettes[mode][index])
                  && panels.every((panel) => {
                    const style = getComputedStyle(panel);
                    return [style.borderTopColor, style.borderRightColor, style.borderBottomColor]
                      .every((color) => color === borders[mode]);
                  });
              }
              const probe = window.document.createElement("span");
              window.document.body.append(probe);
              const expected = ["--vscode-editor-background", "--vscode-editorWidget-background",
                "--vscode-icon-foreground", "--vscode-button-background"].map((variable) => {
                probe.style.color = `var(${variable})`;
                return getComputedStyle(probe).color;
              });
              probe.remove();
              return actual.every((color, index) => color === expected[index]);
            }, { mode, palettes });
          });
          await captureAfter(evidence, page, `38-toolbar-${host.toLowerCase()}-${mode}`,
            `${mode} preview mode updates the document and floating toolbar on the ${host} VS Code theme.`);
        }
      }
    } finally {
      await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    }
    await withCurrentFrame(page, async (frame) => {
      const themeButton = frame.locator("[data-sphinx-preview-theme-toggle]");
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (await themeButton.getAttribute("data-theme-mode") === "white") break;
        await themeButton.click();
      }
      assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode"), "white");
      assert.equal(await frame.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor),
        "rgb(255, 255, 255)");
      assert.equal(await frame.locator(".admonition.tip").count(), 1);
      assert.equal(await frame.locator(".admonition.warning").count(), 1);
      await waitFor("the demo Mermaid and SVG images to load", async () => {
        const diagram = frame.locator("img.myst-mermaid-image");
        const svg = frame.locator('img[alt="Fleet operating loop: plan, dispatch, observe, and correct."]');
        return await diagram.count() === 1 && await svg.count() === 1
          && await diagram.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
          && await svg.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0);
      }).catch(async (error: unknown) => {
        console.error("Demo asset state:", await frame.locator("img").evaluateAll((images) =>
          images.map((image) => ({
            alt: image.getAttribute("alt"),
            className: image.className,
            complete: (image as HTMLImageElement).complete,
            naturalWidth: (image as HTMLImageElement).naturalWidth,
            source: image.getAttribute("src")?.slice(0, 180),
          }))));
        console.error("Demo Mermaid errors:", await frame.locator(".myst-mermaid-error").allTextContents());
        throw error;
      });
      assert.equal(await frame.locator(".myst-mermaid-error").count(), 0);
      for (const selector of [".admonition.tip", "img.myst-mermaid-image",
        'img[alt="Fleet operating loop: plan, dispatch, observe, and correct."]']) {
        assert.equal(await frame.locator(selector).evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0 && bounds.top >= 0 && bounds.bottom <= window.innerHeight;
        }), true, `${selector} must be fully visible in the demo capture`);
      }
    });
    await page.mouse.move(10, 10);
    await captureAfter(evidence, page, "38-edit-mode-remembered",
      "A white-background preview restores edit mode and renders a nested MyST admonition, "
      + "a Mermaid dispatch flowchart, and a local SVG fleet operating loop.");
  });

  // A previewState message carries editMode: true; the host must accept it (scrollTop is recorded).
  const chapter = fs.readFileSync(
    path.resolve(__dirname, "../../..", "test", "visual", "fixtures", "05-long-chapter.md"), "utf8");
  await withDocument("realinput-t38-state", chapter, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const box = await withCurrentFrame(page, async (frame) => (await frame.frameElement()).boundingBox());
    assert.ok(box, "the preview frame has a bounding box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 1200);
    await waitFor("the host to record the preview scroll position in edit mode",
      () => (getActivePreviewForTests()?.scrollTop ?? 0) > 0);
  });
}

/** RI-T39: files opened while the side preview has focus land in another group. */
async function scenarioPreviewGroupLock(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t39", {
    "smoke.md": SMOKE,
    "other-t39.md": "# Other T39\n\nSecond fixture.\n",
    "third-t39.md": "# Third T39\n\nThird fixture.\n",
    "fourth-t39.md": "# Fourth T39\n\nFourth fixture.\n",
  });
  const groupCount = (): number => vscode.window.tabGroups.all.length;
  const groupOf = (column: vscode.ViewColumn | undefined) =>
    vscode.window.tabGroups.all.find((group) => group.viewColumn === column);
  const editorColumnOf = (uri: vscode.Uri): vscode.ViewColumn | undefined => {
    const key = uri.toString();
    for (const group of vscode.window.tabGroups.all) {
      if (group.tabs.some((tab) => tab.input instanceof vscode.TabInputText
        && tab.input.uri.toString() === key && tab.isActive)) return group.viewColumn;
    }
    return undefined;
  };
  const quickOpen = async (name: string, uri: vscode.Uri): Promise<void> => {
    await press(page, `${MOD}+P`);
    await typeText(page, name);
    try {
      await waitFor("Quick Open to list the file", async () =>
        (await page.locator(".quick-input-widget .monaco-list-row", { hasText: name }).count()) > 0, 5_000);
    } catch (error) {
      const typed = await page.locator(".quick-input-box input").first().inputValue().catch(() => "<no input>");
      const rows = await page.locator(".quick-input-list .monaco-list-row").allInnerTexts().catch(() => []);
      throw new Error(String(error) + " Input: " + typed + " Rows: " + rows.join(" | ").slice(0, 300));
    }
    await press(page, "Enter");
    await waitFor("the file to open in a text editor", () => editorColumnOf(uri) !== undefined);
  };
  const closeTextTab = async (uri: vscode.Uri): Promise<void> => {
    const key = uri.toString();
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === key) {
          await vscode.window.tabGroups.close(tab);
        }
      }
    }
  };
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    const other = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("other-t39.md")));
    const third = vscode.Uri.file(fixture.path("third-t39.md"));
    const fourthDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("fourth-t39.md")));
    const fourth = fourthDocument.uri;
    try {
      // The previous scenario's preview group is unlocked shortly after it closes (no observable state).
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      // (a) Leak canary: before any preview exists, Quick Open must reuse the source group.
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      const sourceColumn = editorColumnOf(document.uri);
      assert.ok(sourceColumn !== undefined, "smoke.md is open in a group");
      const groupsBefore = groupCount();
      await quickOpen("other-t39.md", other.uri);
      assert.equal(editorColumnOf(other.uri), sourceColumn,
        "canary: Quick Open reused the source group (a locked group leaked from an earlier scenario)");
      assert.equal(groupCount(), groupsBefore, "canary: Quick Open did not create a group");
      await closeTextTab(other.uri);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

      await openSidePreview(document);
      await waitForRender(document);
      const panel = getActivePreviewPanelForTests();
      assert.ok(panel, "the side preview panel exists");
      const previewColumn = panel.viewColumn;
      assert.ok(previewColumn !== undefined, "the side preview has a column");
      assert.notEqual(previewColumn, sourceColumn);
      assert.equal(groupCount(), 2, "source group plus preview group");
      const previewIsActiveTab = (): boolean => {
        const tab = groupOf(previewColumn)?.activeTab;
        return tab !== undefined && tab.input instanceof vscode.TabInputWebview;
      };

      // Give the preview focus with a real click.
      const box = await withCurrentFrame(page, async (frame) => (await frame.frameElement()).boundingBox());
      assert.ok(box, "the preview frame has a bounding box");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await waitFor("the preview to have focus before Quick Open", () => panel.active);

      // Case A: Quick Open from the focused preview.
      await quickOpen("other-t39.md", other.uri);
      assert.equal(editorColumnOf(other.uri), sourceColumn, "Quick Open opened the file in the source group");
      assert.equal(groupCount(), 2, "Quick Open did not create a third group");
      assert.ok(previewIsActiveTab(), "the preview is still the active tab of its group");
      await waitFor("the preview to follow the opened Markdown file",
        () => getActivePreviewForTests()?.documentUri === other.uri.toString());
      await captureAfter(evidence, page, "39-quick-open-beside-preview",
        "Quick Open from the focused preview opened the file in the source group; the preview stayed visible.");

      // Case B: the Explorer entry runs the command with a URI while the preview has focus.
      panel.reveal(previewColumn, false);
      await waitFor("the preview to have focus again", () => panel.active);
      await vscode.commands.executeCommand(COMMAND_ID, third);
      await waitFor("the third file to open in a text editor", () => editorColumnOf(third) !== undefined);
      assert.notEqual(editorColumnOf(third), previewColumn, "the Explorer entry did not open in the preview's group");
      assert.ok(previewIsActiveTab(), "the preview is still the active tab after the Explorer entry");
      assert.equal(groupCount(), 2, "the Explorer entry did not create a group");

      // (d) Unlock after close.
      const previewTab = groupOf(previewColumn)?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
      assert.ok(previewTab, "the preview tab exists");
      await vscode.window.tabGroups.close(previewTab);
      await waitFor("the preview to close", () => getActivePreviewPanelForTests() === undefined);
      // The unlock runs one tick after dispose and moves focus briefly; it has no observable state.
      // 400 ms is enough: the unlock only waits for the preview's own tab, which is already gone here.
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
      const countBeforeReuse = groupCount();
      await quickOpen("fourth-t39.md", fourth);
      assert.equal(editorColumnOf(fourth), sourceColumn);
      assert.ok(groupCount() <= countBeforeReuse, "Quick Open after closing the preview created no group");

      // Last-group case: the preview's group is the only one left when the preview closes.
      await closeAllEditors();
      await openSidePreview(document);
      await waitForRender(document);
      const lastPanel = getActivePreviewPanelForTests();
      assert.ok(lastPanel, "a second side preview exists");
      for (const uri of [document.uri, other.uri, third, fourth]) await closeTextTab(uri);
      await waitFor("only the preview group to remain", () => groupCount() === 1);
      const lastTab = vscode.window.tabGroups.all[0]?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
      assert.ok(lastTab, "the preview is the last tab");
      await vscode.window.tabGroups.close(lastTab);
      await waitFor("the second preview to close", () => getActivePreviewPanelForTests() === undefined);
      // The unlock runs one tick after dispose and has no observable state; give it that tick.
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      await vscode.window.showTextDocument(document);
      await waitFor("the file to open", () => editorColumnOf(document.uri) !== undefined);
      assert.equal(groupCount(), 1, "a file opened after the last preview closed stayed in the single group");

      // (f) A user lock on a group to the right of the preview survives the preview closing.
      await closeAllEditors();
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await openSidePreview(document);
      await waitForRender(document);
      await vscode.window.showTextDocument(fourthDocument, vscode.ViewColumn.Three);
      assert.equal(groupCount(), 3, "source, preview and the user's group");
      try {
        await vscode.commands.executeCommand("workbench.action.focusThirdEditorGroup");
        await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
        const middleTab = groupOf(vscode.ViewColumn.Two)?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
        assert.ok(middleTab, "the preview is in the middle group");
        await vscode.window.tabGroups.close(middleTab);
        await waitFor("the middle preview to close", () => getActivePreviewPanelForTests() === undefined);
        await waitFor("the preview group to close", () => groupCount() === 2);
        const activeAfterClose = vscode.window.tabGroups.activeTabGroup.viewColumn;
        for (let i = 0; i < 12; i += 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
          assert.equal(vscode.window.tabGroups.activeTabGroup.viewColumn, activeAfterClose,
            "closing the preview did not move focus into the user's locked group");
        }
        await vscode.commands.executeCommand("workbench.action.focusSecondEditorGroup");
        await quickOpen("other-t39.md", other.uri);
        // A locked group refuses new editors, so the file lands in the other group.
        assert.equal(editorColumnOf(other.uri), vscode.ViewColumn.One,
          "the user's lock survived: Quick Open from the locked group opened elsewhere");
        assert.equal(groupCount(), 2, "no group was created");
      } finally {
        try {
          await vscode.commands.executeCommand("workbench.action.focusSecondEditorGroup");
          await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
        } catch {
          // Best effort.
        }
      }

      // Restored previews: the workbench restores the group's lock; closing the preview must release it.
      await closeAllEditors();
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      const restoredPanel = vscode.window.createWebviewPanel(PANEL_VIEW_TYPE, "Restored preview",
        vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] });
      await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
      await deserializePreviewPanelForTests(restoredPanel, {
        documentId: document.uri.toString(),
        sourceFile: document.uri.fsPath,
        sourceLine: 1,
        scrollTop: 0,
        descriptionsCollapsed: false,
      });
      await waitFor("the restored preview to render", () =>
        getActivePreviewForTests()?.documentUri === document.uri.toString());
      for (const uri of [document.uri, other.uri, third, fourth]) await closeTextTab(uri);
      await waitFor("only the restored preview group to remain", () => groupCount() === 1);
      const restoredTab = vscode.window.tabGroups.all[0]?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
      assert.ok(restoredTab, "the restored preview is the last tab");
      await vscode.window.tabGroups.close(restoredTab);
      await waitFor("the restored preview to close", () => getActivePreviewPanelForTests() === undefined);
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      await vscode.window.showTextDocument(document);
      await waitFor("the file to open", () => editorColumnOf(document.uri) !== undefined);
      assert.equal(groupCount(), 1, "a restored preview releases its lock too");
    } finally {
      try {
        const panel = getActivePreviewPanelForTests();
        if (panel !== undefined) {
          panel.reveal(panel.viewColumn, false);
          await waitFor("the preview to have focus", () => panel.active, 2_000);
        }
      } catch {
        // Best effort: the backstop below must still run.
      }
      try {
        await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
      } catch {
        // Best effort: unlocking must not hide the scenario's own result.
      }
      await closeAllEditors();
      // The preview's group is unlocked one tick after it closes; let that settle before the next suite.
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
    }
  } finally {
    fixture.dispose();
  }
}

export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  const evidence = createEvidence("real-input");
  let passed = false;
  workbenchPage = page;
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    if (process.env.STUDIO_REAL_INPUT_SCENARIO === "toolbar") {
      await scenarioToolbarState(page, evidence);
      passed = true;
      return;
    }
    await scenarioParagraphBlurCommit(page, evidence);
    await scenarioCommentBlockEdit(page, evidence);
    await scenarioCtrlEnterCommit(page, evidence);
    await scenarioArrowNavigation(page, evidence);
    await scenarioTableCellEnter(page, evidence);
    await scenarioTableMinimalDiff(page, evidence);
    await scenarioOpenWithEditor(page, evidence);
    await scenarioFrontmatterValueMinimalPatch(page, evidence);
    await scenarioFrontmatterStructuralMinimalPatch(page, evidence);
    await scenarioEnterCommitsTextField(page, evidence);
    await scenarioEscapeCancels(page, evidence);
    await scenarioTypingUndoGrouping(page, evidence);
    await scenarioUndoStaysInEditor(page, evidence, "side");
    await scenarioUndoStaysInEditor(page, evidence, "open-with");
    await scenarioEnterContinuesList(page, evidence);
    await scenarioTabIndents(page, evidence);
    await scenarioShortcuts(page, evidence);
    await scenarioPalette(page, evidence);
    await scenarioLinkPanel(page, evidence);
    await scenarioPreviewKeepsMarkdown(page, evidence);
    await scenarioCaretAtClick(page, evidence);
    await scenarioEditAffordances(page, evidence);
    await scenarioEditModeNoReflow(page, evidence);
    await scenarioTableTab(page, evidence);
    await scenarioTableToolbar(page, evidence);
    await scenarioBooleanOneClick(page, evidence);
    await scenarioListEditorClickAndKeys(page, evidence);
    await scenarioListLinkCompletion(page, evidence);
    await scenarioFrontmatterActionsLayout(page, evidence);
    await scenarioRequiredAndPositionedAdd(page, evidence);
    await scenarioCustomKeyAndOpenNewField(page, evidence);
    await scenarioAddFieldPositionAndEscape(page, evidence);
    await scenarioReadableLinkDiagnostics(page, evidence);
    await scenarioInsertBlocksFromPreview(page, evidence);
    await scenarioInsertAfterFinalFigure(page, evidence);
    await scenarioImageEditing(page, evidence);
    await scenarioFocusChangeKeepsPreviewStill(page, evidence);
    await scenarioHiddenPreviewCatchesUp(page, evidence);
    await scenarioSaveKeepsBlockInPlace(page, evidence);
    await scenarioStatusPageTwoLines(page, evidence);
    await scenarioTitleBarButton(page, evidence);
    await scenarioToolbarState(page, evidence);
    await scenarioPreviewGroupLock(page, evidence);
    // RI-T43 describes the document-assignment path, which the setting keeps available.
    await withIncrementalUpdates(false, () => scenarioPendingOverlayWithoutReload(page, evidence));
    await scenarioPropertiesTableWithoutReload(page, evidence);
    await scenarioContentPatchedInPlace(page, evidence);
    await scenarioLargeDocumentPatched(page, evidence);
    passed = true;
  } finally {
    evidence.finish(passed);
    await browser.close();
  }
}
