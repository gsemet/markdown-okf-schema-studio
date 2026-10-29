import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { captureByLegacy } from "../../shared/captureRegistry";
import { withFocusDumpOnFailure } from "../../shared/workbenchFocusDump";
import {
  closeAllEditors,
  createFixture,
  type Evidence,
  findCurrentFrame,
  focusedCaret,
  press,
  setEditMode,
  waitFor,
  withCurrentFrame,
  writeSchema,
} from "./harness";

export const SMOKE = [
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
export async function waitForCaretAtEnd(page: Page): Promise<void> {
  await waitFor("the caret at the end of the editor", async () => {
    const current = await findCurrentFrame(page);
    if (current === undefined) return false;
    const caret = await focusedCaret(current);
    return caret !== undefined && caret.start === caret.length && caret.end === caret.length;
  });
}

/** Waits until no raw-Markdown editor is open in the current webview. */
export async function waitForNoBlockEditor(page: Page, description: string): Promise<void> {
  await waitFor(description, async () => {
    const current = await findCurrentFrame(page);
    return current !== undefined && await current.locator("[data-sphinx-preview-block-editor]").count() === 0;
  });
}

/** Presses Escape and waits until no raw-Markdown editor is open. */
export async function escapeBlockEditor(page: Page, description: string): Promise<void> {
  await press(page, "Escape");
  await waitForNoBlockEditor(page, description);
}

export const TABLE_DOCUMENT = [
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

/** Records the workbench page the scenarios drive (set once by run()). */
export function setWorkbenchPage(page: Page | undefined): void {
  workbenchPage = page;
}

let failureDump: string | undefined;

/**
 * The workbench focus dump read when a scenario failed, before its cleanup closed the editors (see
 * withDocument), then forgotten. The suite's own handler runs after that cleanup, when the webview
 * is gone and an empty editor group holds the focus.
 */
export function takeFailureFocusDump(): string | undefined {
  const dump = failureDump;
  failureDump = undefined;
  return dump;
}

/**
 * Edit mode persists per workspace, so a scenario that leaves it on would start the next one in
 * edit mode. Switches it off in the current webview, if there is one.
 */
export async function leaveEditModeOff(): Promise<void> {
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

export async function withSmokeDocument(
  prefix: string,
  scenario: (document: vscode.TextDocument) => Promise<void>,
): Promise<void> {
  await withDocument(prefix, SMOKE, scenario);
}

export async function withDocument(
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
      // The first failure keeps its dump: an outer withDocument sees the same error again.
      await withFocusDumpOnFailure(workbenchPage, () => scenario(document),
        (dump) => { failureDump ??= `scenario fixture ${prefix}\n${dump}`; });
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

/** Registry id of a capture whose former name is built from a scenario parameter. */
export function realInputId(legacy: string): string {
  const entry = captureByLegacy("real-input", legacy);
  assert.ok(entry, `no registered real-input capture was named "${legacy}"`);
  return entry.id;
}

export async function captureAfter(
  evidence: Evidence,
  page: Page,
  name: string,
  note: string,
): Promise<void> {
  await withCurrentFrame(page, (frame) => evidence.capture(page, frame, name, note));
}
