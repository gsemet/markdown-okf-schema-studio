import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { getActivePreviewForTests } from "../extensionApi";
import { lineDelta } from "../../shared/lineDelta";
import {
  bufferText,
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
  writeSchema,
} from "./harness";
import { captureAfter, leaveEditModeOff, withDocument } from "./common";
import { previewDiagnostics, waitForPageSettled } from "./flushBeforeNavigate";
import { run } from "./run";

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
export async function scenarioCommentBlockEdit(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "review-annotations/r01-comment-block-opens-editor",
      "Edit mode on; a click on the comment block (not its chip) opened the block editor on the three raw comment lines.");
  });
}

/** RI-T20: one click on a boolean value toggles and saves it. */
export async function scenarioBooleanOneClick(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "frontmatter-editing/r06-boolean-one-click",
      "Edit mode on; one click on the annotation_exemption checkbox saved `true`. No editor stays open.");
  }, BOOLEAN_SCHEMA);
}

export const LIST_DOCUMENT = [
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
export async function scenarioListEditorClickAndKeys(page: Page, evidence: Evidence): Promise<void> {
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
      await captureAfter(evidence, page, "frontmatter-editing/r07-list-click-edits",
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
      await captureAfter(evidence, page, "frontmatter-editing/r08-list-enter-adds",
        "Enter added an item, `StRS-B` was typed, Enter again and Enter on the empty item saved the list.");

      // The re-render shows the links unresolved first; the host resolves them asynchronously.
      await waitFor("the StRS-A link resolved again after the re-render", async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined && await current.locator(linkSelector).count() >= 1;
      });
      // The resolved link can still be replaced: by the properties table of the link check or of
      // the frontmatter refresh (posted after the render, applied in place) or by a full page load.
      // A box read from a link that is replaced meanwhile is null (main run 39916805010). Read it once
      // the page shows the host's last render and last properties table and no update is armed.
      await waitForPageSettled(page, "list editor", document);
      const box = await withCurrentFrame(page, (frame) => frame.locator(linkSelector).first().boundingBox());
      assert.ok(box, `the StRS-A link has a box; ${await previewDiagnostics(page)}`);
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
export async function scenarioListLinkCompletion(page: Page, evidence: Evidence): Promise<void> {
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
      await captureAfter(evidence, page, "frontmatter-editing/r09-list-link-warning",
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
export async function scenarioFrontmatterActionsLayout(page: Page, evidence: Evidence): Promise<void> {
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
      await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "frontmatter-editing/r10-row-actions-layout",
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
      await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "frontmatter-editing/r11-add-field-picker-layout",
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
export async function scenarioRequiredAndPositionedAdd(page: Page, evidence: Evidence): Promise<void> {
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
    await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "frontmatter-editing/r12-required-remove-disabled",
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
export async function scenarioCustomKeyAndOpenNewField(page: Page, evidence: Evidence): Promise<void> {
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
    await withCurrentFrame(page, (frame) => evidence.capture(page, frame, "frontmatter-editing/r13-custom-key-added",
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
export async function scenarioAddFieldPositionAndEscape(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "frontmatter-editing/r15-add-field-position",
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
    await captureAfter(evidence, page, "frontmatter-editing/r16-custom-key-plain",
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
    // Captured with the picker open, before the Escape that cancels the edit.
    await captureAfter(evidence, page, "frontmatter-editing/r17-escape-on-picker",
      "The status editor holds the typed `x` and the add-field picker is open; the next Escape closes both and "
      + "writes nothing.");
    await press(page, "Escape");
    await waitFor("the editor and the picker to close", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("[data-okf-frontmatter-editor]").count() === 0
        && await current.locator(".sphinx-preview-frontmatter-picker").count() === 0;
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    assert.equal(bufferText(document), withApprover, "Escape on the picker writes nothing");
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
export async function scenarioReadableLinkDiagnostics(page: Page, evidence: Evidence): Promise<void> {
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
    await captureAfter(evidence, page, "frontmatter-editing/r14-link-diagnostic-tooltip",
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

const REFUSED_DOCUMENT = [
  "---",
  "type: req",
  "title: Refused value",
  "priority: 3",
  "---",
  "",
  "# Requirement",
  "",
  "Body text.",
  "",
].join("\n");

const REFUSED_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  priority:",
  "    type: integer",
  "    minimum: 1",
  "    maximum: 5",
  "",
].join("\n");

const PRIORITY_INPUT = 'input[aria-label="Frontmatter priority"]';
const PRIORITY_CELL = 'tr[data-okf-field="priority"] [data-okf-edit-cell="value"]';
const TITLE_CELL = 'tr[data-okf-field="title"] [data-okf-edit-cell="value"]';

/** Opens `priority`, replaces its value with 7 and waits until the host refused the save. */
async function refusePriority(page: Page, label: string): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.locator(PRIORITY_CELL).click());
  await waitForEditor(page, `[data-okf-frontmatter-editor] ${PRIORITY_INPUT}`);
  await press(page, `${MOD}+a`);
  await typeText(page, "7");
  await waitFor(`${label}: priority holds 7`, async () =>
    await withCurrentFrame(page, (frame) => frame.locator(PRIORITY_INPUT).inputValue()) === "7");
  await press(page, "Enter");
  await waitFor(`${label}: the refusal shown in the priority editor`, async () => {
    const current = await findCurrentFrame(page);
    return current !== undefined && await current.locator(
      '[data-okf-frontmatter-editor] [role="status"][data-state="error"][data-visible="true"]').count() === 1;
  });
}

/** The tag name and aria-label of the focused element of the preview. */
async function activeControl(page: Page): Promise<string> {
  return withCurrentFrame(page, (frame) => frame.evaluate(() => {
    const active = globalThis.document.activeElement;
    return active ? `${active.tagName} ${active.getAttribute("aria-label") ?? ""}`.trim() : "none";
  }));
}

/**
 * RI-T44 (CR 218): a value the schema refuses leaves the field editor usable. The focus comes back
 * to the control, Escape closes it, and a click on another field closes the refused editor without
 * a save and opens the clicked field in the same click. The buffer never changes.
 */
export async function scenarioRefusedValueKeepsEditorUsable(page: Page): Promise<void> {
  await withDocument("realinput-t44", REFUSED_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);

    // 1. Refused, then Escape, then another field opens.
    await refusePriority(page, "RI-T44 Escape");
    await waitFor("RI-T44: the focus back in the priority input after the refusal", async () =>
      await activeControl(page) === "INPUT Frontmatter priority");
    await press(page, "Escape");
    await waitFor("RI-T44: Escape closed the refused priority editor", async () =>
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-editor]").count()) === 0);
    await withCurrentFrame(page, (frame) => frame.locator(TITLE_CELL).click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    assert.equal(await activeControl(page), "TEXTAREA Frontmatter title");
    assert.equal(bufferText(document), REFUSED_DOCUMENT, "the refused value never reached the buffer");
    await press(page, "Escape");
    await waitFor("RI-T44: the title editor closed", async () =>
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-editor]").count()) === 0);

    // 2. Refused, then one click on another field: the refused editor closes and title opens.
    await refusePriority(page, "RI-T44 click");
    await withCurrentFrame(page, (frame) => frame.locator(TITLE_CELL).click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] textarea");
    assert.equal(await activeControl(page), "TEXTAREA Frontmatter title");
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await frame.locator(PRIORITY_INPUT).count(), 0, "the refused priority editor closed");
      assert.equal((await frame.locator(`${PRIORITY_CELL} [data-okf-value-display]`).innerText()).trim(), "3",
        "priority shows its saved value");
    });
    assert.equal(bufferText(document), REFUSED_DOCUMENT, "the refused value is not posted again");
    await press(page, "Escape");
  }, REFUSED_SCHEMA);
}
