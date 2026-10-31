import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { getActivePreviewForTests } from "../extensionApi";
import {
  closeAllEditors,
  createFixture,
  type Evidence,
  findCurrentFrame,
  MOD,
  openSidePreview,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";
import { escapeBlockEditor, leaveEditModeOff } from "./common";

const LINKS = [
  "# Link only",
  "",
  "Some intro paragraph.",
  "",
  "*Next: [Related](related-target.md)*",
  "",
  "::::{grid} 1 1 2 2",
  "",
  ":::{grid-item-card} Linked card",
  ":link: targets/alpha.md",
  "",
  "Header of the card",
  "^^^",
  "The body of the card.",
  "+++",
  "Footer of the card",
  ":::",
  "",
  "::::",
  "",
  "Tail paragraph.",
  "",
].join("\n");

const ALPHA = ["---", "title: Alpha", "---", "", "# Alpha", "", "Alpha body.", ""].join("\n");
const RELATED = ["# Related", "", "Related body.", ""].join("\n");

/** True when the preview shows `document` and has finished rendering it. */
function previewShows(document: vscode.TextDocument | vscode.Uri): boolean {
  const uri = "uri" in document ? document.uri : document;
  const preview = getActivePreviewForTests();
  return preview?.documentUri === uri.toString() && preview.phase === "ready";
}

/** The preview and every visible text editor still show `source`; `target` was never opened or changed. */
function assertStayedOn(source: vscode.TextDocument, target: vscode.Uri, label: string): void {
  assert.ok(previewShows(source), `${label}: the preview still shows ${path.basename(source.uri.fsPath)}`);
  const shown = vscode.window.visibleTextEditors.map((editor) => editor.document.uri.fsPath);
  assert.ok(!shown.includes(target.fsPath), `${label}: ${path.basename(target.fsPath)} is not opened (${shown.join(", ")})`);
  const dirty = vscode.workspace.textDocuments.find((document) => document.uri.fsPath === target.fsPath)?.isDirty;
  assert.notEqual(dirty, true, `${label}: ${path.basename(target.fsPath)} is not changed`);
}

/**
 * CR 217: in edit mode a real click on a link-only paragraph and on the footer of a `:link:` card
 * opens the block editor and leaves the active file as it is; keys typed after the footer click go
 * to that editor, never to the card's target (QA215-01: ` F` landed in `targets/alpha.md`). A
 * Cmd/Ctrl+click on the same link, and on the card title, still navigates to its target.
 */
export async function scenarioLinkClickEditsInEditMode(page: Page, _evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-cr217", {
    "links.md": LINKS,
    "related-target.md": RELATED,
    "targets/alpha.md": ALPHA,
  });
  try {
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("links.md")));
    const alpha = vscode.Uri.file(fixture.path("targets/alpha.md"));
    const related = vscode.Uri.file(fixture.path("related-target.md"));
    try {
      await openSidePreview(source);
      await waitForRender(source);
      await setEditMode(page, true);

      // A real click on the link of the link-only paragraph opens its editor.
      await withCurrentFrame(page, (frame) => frame.locator("p a", { hasText: "Related" }).click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      assertStayedOn(source, related, "link-only paragraph click");
      await escapeBlockEditor(page, "the link-only paragraph editor to close");

      // A real click on the footer of the linked card opens an editor in the card; the keys typed
      // next go into it, and the card's target is never opened nor changed.
      await withCurrentFrame(page, (frame) => frame.locator(".myst-grid-card-footer", { hasText: "Footer of the card" }).click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      assertStayedOn(source, alpha, "card footer click");
      await typeText(page, " F", 5);
      await waitFor("the typed keys to reach the card footer editor", async () => {
        const frame = await findCurrentFrame(page);
        return frame !== undefined
          && (await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue()).includes(" F");
      });
      assertStayedOn(source, alpha, "keys typed after the card footer click");
      await escapeBlockEditor(page, "the card footer editor to close");

      // Cmd/Ctrl+click on the same link follows it.
      await withCurrentFrame(page, (frame) =>
        frame.locator("p a", { hasText: "Related" }).click({ modifiers: [MOD] }));
      await waitFor("the preview to show related-target.md after a Cmd/Ctrl+click", () => previewShows(related));

      // Back on links.md in edit mode, a Cmd/Ctrl+click on the card title follows the card link.
      await openSidePreview(source);
      await waitForRender(source);
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) =>
        frame.locator("a.myst-grid-card-link", { hasText: "Linked card" }).click({ modifiers: [MOD] }));
      await waitFor("the preview to show targets/alpha.md after a Cmd/Ctrl+click on the card title",
        () => previewShows(alpha));
    } finally {
      await leaveEditModeOff();
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}
