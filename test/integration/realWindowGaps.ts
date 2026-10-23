/**
 * Real-window gap fill of the e2e campaign (CR 043, P9 T2): behaviour that had assertions only
 * (message-level integration tests) or no real-window evidence at all now runs in a real VS Code
 * window with real mouse and keyboard events, and leaves a registered capture.
 *
 * Every wait here is on a state the host or the page reports (a test hook of the extension, a page
 * attribute, the file on disk, the workbench DOM), never on time. Each scenario is in the stress
 * plan (`test/shared/stressPlan.ts`, CI rule 12), so it must leave the window as it found it: no
 * open editor, edit mode off and remembered off, settings restored, temporary files removed.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Page } from "playwright-core";
import * as vscode from "vscode";

import {
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  REFRESH_COMMAND_ID,
  storedEditModeForTests,
} from "./extensionApi";
import {
  bufferText,
  closeAllEditors,
  createFixture,
  currentPreviewFrame,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
  type Evidence,
} from "./realInput/harness";

const extensionRoot = path.resolve(__dirname, "../../..");

/** Tracked fixture: its committed text is the Git HEAD baseline of the incoming-change marks. */
export const INCOMING_FIXTURE = path.join(extensionRoot, "test", "integration", "fixtures", "incoming-changes.md");

async function captureNow(evidence: Evidence, page: Page, id: string, note: string): Promise<void> {
  await withCurrentFrame(page, (frame) => evidence.capture(page, frame, id, note));
}

/** Edit mode off in the page, and the workspace remembers it off for the next preview. */
async function leaveEditMode(page: Page): Promise<void> {
  if (await findCurrentFrame(page) !== undefined) await setEditMode(page, false);
  await waitFor("the workspace to remember edit mode off", () => storedEditModeForTests() !== true);
}

/** The ready preview of `document`, with the page loaded for its current render. */
async function waitForPreviewReady(document: vscode.TextDocument, timeoutMs = 10_000): Promise<void> {
  await waitFor(`the preview of ${path.basename(document.uri.fsPath)} to be ready`, () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString() && preview.phase === "ready"
      && preview.webviewReady && preview.documentVersion === document.version;
  }, timeoutMs);
}

async function withFixtureDocument(
  prefix: string,
  files: Record<string, string>,
  main: string,
  body: (document: vscode.TextDocument, directory: string) => Promise<void>,
): Promise<void> {
  const fixture = createFixture(prefix, files);
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path(main)));
    try {
      await body(document, fixture.directory);
    } finally {
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

/** Sets workspace values of the preview settings for `body`, then restores the former values. */
async function withPreviewSettings(values: Record<string, boolean>, body: () => Promise<void>): Promise<void> {
  const configuration = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.preview");
  const original = Object.fromEntries(Object.keys(values).map((key) =>
    [key, configuration.inspect<boolean>(key)?.workspaceValue]));
  try {
    for (const [key, value] of Object.entries(values)) {
      await configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
    await body();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      await configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
  }
}

interface GitRepositoryState {
  state: { HEAD?: { commit?: string } };
}

/** The repository the built-in Git extension holds for `uri`, once it reports a HEAD commit. */
async function waitForGitRepository(uri: vscode.Uri): Promise<void> {
  const extension = vscode.extensions.getExtension<{ getAPI(version: 1): { getRepository(uri: vscode.Uri): GitRepositoryState | null } }>("vscode.git");
  assert.ok(extension, "the built-in Git extension is present in the test host");
  const api = (await extension.activate()).getAPI(1);
  await waitFor("the Git extension to open the repository of the fixture", () =>
    api.getRepository(uri)?.state.HEAD?.commit !== undefined, 30_000);
}

/**
 * review-annotations/r03: a tracked file whose buffer differs from Git HEAD. The buffer is edited,
 * never saved, and reverted at the end, so the working tree does not change.
 */
export async function scenarioIncomingChanges(page: Page, evidence: Evidence): Promise<void> {
  const uri = vscode.Uri.file(INCOMING_FIXTURE);
  const committed = fs.readFileSync(INCOMING_FIXTURE, "utf8");
  await waitForGitRepository(uri);
  const document = await vscode.workspace.openTextDocument(uri);
  try {
    assert.equal(document.getText(), committed, "the fixture starts as committed");
    const editedLine = document.getText().split("\n").findIndex((line) => line.startsWith("This paragraph will change"));
    assert.ok(editedLine > 0, "the fixture holds the paragraph to edit");
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, document.lineAt(editedLine).range, "This paragraph changed in the buffer and is not saved.");
    edit.insert(uri, new vscode.Position(document.lineCount - 1, 0), "\nA paragraph added after the commit.\n");
    assert.equal(await vscode.workspace.applyEdit(edit), true);
    await openSidePreview(document);
    await waitForPreviewReady(document);
    await waitFor("the host to mark the changed lines", () => {
      const last = getActivePreviewForTests()?.incomingChanges.last;
      return last?.enabled === true && last.ranges.length >= 2;
    }, 20_000);
    await waitFor("the change bars in the page", () => withCurrentFrame(page, async (frame) =>
      await frame.locator("[data-sphinx-preview-changed]").count() >= 2
      && await frame.locator("[data-sphinx-preview-change-layer] > *").count() >= 2));
    await withCurrentFrame(page, async (frame) => {
      const marked = await frame.locator("[data-sphinx-preview-changed]").allTextContents();
      assert.ok(marked.some((text) => text.includes("changed in the buffer")), `edited paragraph marked: ${JSON.stringify(marked)}`);
      assert.ok(marked.some((text) => text.includes("added after the commit")), `added paragraph marked: ${JSON.stringify(marked)}`);
      assert.ok(!marked.some((text) => text.includes("stays as committed")), "an unchanged paragraph carries no mark");
    });
    await captureNow(evidence, page, "review-annotations/r03-incoming-change-bars",
      "Reading mode; the buffer of a tracked fixture differs from Git HEAD (one paragraph edited, one "
      + "added, not saved). Both blocks carry the green change bar; the unchanged blocks do not.");
  } finally {
    disposeActivePreviewForTests();
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.files.revert");
    await waitFor("the fixture buffer to be reverted", () => !document.isDirty && document.getText() === committed);
    await closeAllEditors();
  }
}

/** myst/r01: the conf.py next to the document does not enable `colon_fence`. */
export async function scenarioConfExtensionWarning(page: Page, evidence: Evidence): Promise<void> {
  const files = {
    "conf.py": 'extensions = ["myst_parser"]\nmyst_enable_extensions = ["dollarmath"]\n',
    "doc.md": "# Colon fence\n\nSome text.\n\n:::{note}\nA note.\n:::\n",
  };
  await withFixtureDocument("realinput-myst-conf", files, "doc.md", async (document) => {
    const entries = () => vscode.languages.getDiagnostics(document.uri).filter((entry) => entry.code === "myst-extension");
    await openSidePreview(document);
    await waitForPreviewReady(document);
    await waitFor("the colon_fence entry in Problems", () => entries().length === 1);
    const [entry] = entries();
    assert.equal(entry!.severity, vscode.DiagnosticSeverity.Warning);
    assert.equal(entry!.range.start.line, 4, "the entry points at the colon fence");
    assert.match(entry!.message, /colon_fence/u);
    assert.match(entry!.message, /myst_enable_extensions/u);
    await waitFor("the warning in the preview status", () => withCurrentFrame(page, async (frame) =>
      (await frame.locator("[data-sphinx-preview-diagnostics] li").allTextContents())
        .some((text) => text.includes("colon_fence") && text.includes("myst_enable_extensions"))));
    await vscode.commands.executeCommand("workbench.actions.view.problems");
    try {
      // The Problems view is workbench DOM (not inside the webview frame).
      await waitFor("the entry in the Problems view", async () =>
        await page.getByText(/myst_enable_extensions/u).first().isVisible().catch(() => false));
      await captureNow(evidence, page, "myst/r01-conf-extension-warning",
        "Reading mode; conf.py enables dollarmath only and the document uses a `:::` fence. The preview "
        + "status lists the warning (names colon_fence and myst_enable_extensions) and the Problems view "
        + "shows the same entry at the fence line.");
    } finally {
      await vscode.commands.executeCommand("workbench.action.closePanel");
    }
  });
}

/** Position of the middle of `word` inside the first paragraph containing it, relative to that paragraph. */
async function wordPosition(page: Page, word: string): Promise<{ x: number; y: number }> {
  return withCurrentFrame(page, (frame) => frame.evaluate((needle) => {
    const paragraph = Array.from(document.querySelectorAll("p")).find((element) => element.textContent?.includes(needle));
    if (!paragraph) throw new Error(`no paragraph holds ${needle}`);
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.nodeValue?.indexOf(needle) ?? -1;
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + needle.length);
      const box = range.getBoundingClientRect();
      const outer = paragraph.getBoundingClientRect();
      return { x: box.left - outer.left + box.width / 2, y: box.top - outer.top + box.height / 2 };
    }
    throw new Error(`${needle} is not inside one text node`);
  }, word));
}

interface SidecarThread {
  resolved: boolean;
  anchor: { quote: string };
  comments: Array<{ author: string; body: string }>;
}

function readThreads(file: string): SidecarThread[] {
  if (!fs.existsSync(file)) return [];
  try {
    return (JSON.parse(fs.readFileSync(file, "utf8")) as { threads: SidecarThread[] }).threads;
  } catch {
    return []; // the host writes the file whole; a half-read file is just "not yet"
  }
}

/** review-annotations/r04-r06: create, reply and resolve a review thread with the mouse and keyboard. */
export async function scenarioReviewThreads(page: Page, evidence: Evidence): Promise<void> {
  const settings = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.comments");
  const originalAuthor = settings.inspect<string>("authorName")?.globalValue;
  const text = "# Notes\n\nThe first paragraph holds a quotable phrase here.\n\nThe second paragraph.\n";
  await settings.update("authorName", "Ada Reviewer", vscode.ConfigurationTarget.Global);
  try {
    await withFixtureDocument("realinput-threads", { "notes.md": text }, "notes.md", async (document, directory) => {
      const sidecar = path.join(directory, "notes.comments.json");
      await openSidePreview(document);
      await waitForPreviewReady(document);
      await setEditMode(page, false);
      const paragraph = "p:has-text('quotable phrase')";
      // Create: a double-click selects the word, the Comment button opens the box, Mod+Enter saves.
      const position = await wordPosition(page, "quotable");
      await withCurrentFrame(page, (frame) => frame.locator(paragraph).first().dblclick({ position }));
      await waitFor("the Comment button of the selection", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-okf-comment-create]").count() === 1
        && await frame.locator("[data-okf-comment-create]").isVisible()));
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-create]").click());
      await waitFor("the comment box with the focus", () => withCurrentFrame(page, (frame) => frame.evaluate(() =>
        window.document.activeElement?.matches("[data-okf-comment-compose-input]") === true)));
      await typeText(page, "Please cite a source.");
      await press(page, `${MOD}+Enter`);
      await waitFor("the thread in the sidecar", () => readThreads(sidecar).length === 1);
      const created = readThreads(sidecar)[0]!;
      assert.equal(created.anchor.quote, "quotable");
      assert.deepEqual(created.comments.map((comment) => [comment.author, comment.body]), [["Ada Reviewer", "Please cite a source."]]);
      assert.equal(bufferText(document), text, "a review thread never edits the document");
      await waitFor("the highlighted quote and the closed box", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("mark[data-okf-comment-thread]").count() === 1
        && await frame.locator("[data-okf-comment-compose]").count() === 0));
      await withCurrentFrame(page, (frame) => frame.locator("mark[data-okf-comment-thread]").click());
      await waitFor("the thread popover", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-okf-comment-popover] [data-okf-comment-entry]").count() === 1));
      await captureNow(evidence, page, "review-annotations/r04-thread-created",
        "Reading mode; `quotable` was selected with a double-click, commented through the Comment button "
        + "and saved with Mod+Enter. The quote is highlighted and its popover shows the comment by Ada Reviewer.");

      // Reply from the popover.
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-reply-input]").click());
      await typeText(page, "Added in the next revision.");
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-reply-send]").click());
      await waitFor("the reply in the sidecar", () => readThreads(sidecar)[0]?.comments.length === 2);
      assert.equal(readThreads(sidecar)[0]!.comments[1]!.body, "Added in the next revision.");
      await waitFor("the reply in the popover", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-okf-comment-popover] [data-okf-comment-entry]").count() === 2));
      await captureNow(evidence, page, "review-annotations/r05-thread-reply",
        "The reply typed in the popover and sent with Reply is saved in the sidecar and listed after the first comment.");

      // Resolve from the popover.
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-resolve]").click());
      await waitFor("the resolved thread in the sidecar", () => readThreads(sidecar)[0]?.resolved === true);
      await waitFor("the resolved state in the popover", () => withCurrentFrame(page, async (frame) =>
        (await frame.locator("[data-okf-comment-popover] [data-okf-comment-resolve]").textContent())?.trim() === "Reopen"));
      assert.equal(bufferText(document), text, "a review thread never edits the document");
      await captureNow(evidence, page, "review-annotations/r06-thread-resolved",
        "Resolve was clicked: the sidecar marks the thread resolved and the popover offers Reopen.");
    });
  } finally {
    await settings.update("authorName", originalAuthor, vscode.ConfigurationTarget.Global);
  }
}

/**
 * palette-slash/r09: an image pasted into a block editor. The paste event is dispatched on the
 * editor's textarea with the PNG file in its clipboard data (a test cannot put an image on the
 * system clipboard of the CI display); everything after it is the product's own path: the page
 * reads the file, the host writes it next to the document, the page inserts the reference.
 */
export async function scenarioImagePaste(page: Page, evidence: Evidence): Promise<void> {
  const png = fs.readFileSync(path.join(extensionRoot, "test", "integration", "fixtures", "markdown-logo.png"));
  const text = "# Chapter\n\nText before the image.\n";
  await withFixtureDocument("realinput-paste", { "chapter.md": text }, "chapter.md", async (document, directory) => {
    await openSidePreview(document);
    await waitForPreviewReady(document);
    try {
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Text before the image." }).first().click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await press(page, "End");
      await typeText(page, " ");
      await withCurrentFrame(page, (frame) => frame.evaluate((base64) => {
        const textarea = window.document.querySelector("[data-sphinx-preview-block-editor] textarea");
        if (!textarea) throw new Error("no block editor");
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const data = new DataTransfer();
        data.items.add(new File([bytes], "clipboard.png", { type: "image/png" }));
        textarea.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
      }, png.toString("base64")));
      await waitFor("the image file next to the document", () => fs.existsSync(path.join(directory, "image.png")));
      assert.deepEqual(fs.readFileSync(path.join(directory, "image.png")), png, "the pasted bytes are saved unchanged");
      await waitFor("the reference in the editor", () => withCurrentFrame(page, async (frame) =>
        (await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue()).includes("![image.png](image.png)")));
      await press(page, `${MOD}+Enter`);
      await waitFor("the committed block with the image", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-sphinx-preview-block-editor]").count() === 0
        && await frame.locator('img[src*="image.png"]').count() === 1
        && await frame.locator('img[src*="image.png"]').evaluate((image) => (image as HTMLImageElement).naturalWidth > 0)));
      assert.equal(bufferText(document), "# Chapter\n\nText before the image. ![image.png](image.png)\n");
      await captureNow(evidence, page, "palette-slash/r09-image-paste-inserted",
        "Edit mode on; a PNG was pasted at the end of the paragraph editor and committed with Mod+Enter. "
        + "The host saved it as image.png next to the document and the block shows the image.");
    } finally {
      await leaveEditMode(page);
    }
  });
}

/** myst/r02: a label renamed from its anchor icon. */
export async function scenarioLabelRename(page: Page, evidence: Evidence): Promise<void> {
  const text = "# Labels\n\n(old-name)=\nA labelled paragraph.\n\nSee {ref}`old-name` and {ref}`Title <old-name>`.\n";
  await withFixtureDocument("realinput-label", { "labels.md": text }, "labels.md", async (document) => {
    await openSidePreview(document);
    await waitForPreviewReady(document);
    try {
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) => frame.locator('.okf-anchor[data-okf-label="old-name"]').click());
      await waitFor("the rename field with the label selected", () => withCurrentFrame(page, (frame) => frame.evaluate(() => {
        const field = window.document.activeElement;
        return field instanceof HTMLInputElement && field.closest("[data-okf-label-rename]") !== null
          && field.value === "old-name" && field.selectionStart === 0 && field.selectionEnd === field.value.length;
      })));
      await typeText(page, "new-name");
      await press(page, "Enter");
      await waitFor("the label line to change", () => bufferText(document).includes("(new-name)="));
      assert.equal(bufferText(document), text.replace("(old-name)=", "(new-name)="), "only the label line changes");
      await waitFor("the rename result in the popover", () => withCurrentFrame(page, async (frame) =>
        /^Renamed\. 2 uses of "old-name" remain/u.test(
          (await frame.locator("[data-okf-label-rename-status]").textContent()) ?? "")));
      await captureNow(evidence, page, "myst/r02-label-rename",
        "Edit mode on; the anchor icon of `(old-name)=` was clicked, `new-name` typed and Enter pressed. "
        + "Only the label line changed; the popover reports the 2 uses of the old name that remain.");
    } finally {
      await leaveEditMode(page);
    }
  });
}

/** toolbar-navigation/r05: Back and Next across two documents. */
export async function scenarioBackNextAcrossDocuments(page: Page, evidence: Evidence): Promise<void> {
  const files = {
    "first.md": "# First\n\nGo to [the second note](second.md).\n",
    "second.md": "# Second\n\nThe second note.\n",
  };
  await withFixtureDocument("realinput-history", files, "first.md", async (first, directory) => {
    const second = vscode.Uri.file(path.join(directory, "second.md")).toString();
    const showing = (uri: string) => () => {
      const preview = getActivePreviewForTests();
      return preview?.documentUri === uri && preview.phase === "ready" && preview.webviewReady;
    };
    const buttons = () => withCurrentFrame(page, async (frame) => ({
      back: !await frame.locator("[data-sphinx-preview-back]").isDisabled(),
      next: !await frame.locator("[data-sphinx-preview-next]").isDisabled(),
    }));
    await openSidePreview(first);
    await waitForPreviewReady(first);
    await setEditMode(page, false);
    await withCurrentFrame(page, (frame) => frame.locator("a", { hasText: "the second note" }).click());
    await waitFor("the preview to show the second document", showing(second));
    await waitFor("Back enabled on the second document", async () => {
      const state = await buttons();
      return state.back && !state.next;
    });
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-back]").click());
    await waitFor("the preview to show the first document again", showing(first.uri.toString()));
    await waitFor("Next enabled on the first document", async () => {
      const state = await buttons();
      return !state.back && state.next;
    });
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await frame.locator("h1").first().textContent(), "First");
    });
    await captureNow(evidence, page, "toolbar-navigation/r05-back-next-across-documents",
      "Reading mode; the link opened second.md in the preview, then Back was clicked: the first "
      + "document is shown again, Back is disabled and Next is enabled.");
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-next]").click());
    await waitFor("Next to show the second document again", showing(second));
  });
}

/** lifecycle-sync/r19 (keybinding) and r20 (Refresh Preview, assertion-only). */
export async function scenarioKeybindingAndRefresh(page: Page, evidence: Evidence): Promise<void> {
  const text = "# Keybinding\n\nOpened with Cmd/Ctrl+K Shift+V.\n";
  await withFixtureDocument("realinput-keys", { "keys.md": text }, "keys.md", async (document) => {
    assert.equal(getActivePreviewForTests(), undefined, "no preview is open before the keybinding");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
    await waitFor("the source editor to hold the keyboard focus", () => page.evaluate(() => {
      const focused = window.document.activeElement;
      return focused !== null && focused.closest(".monaco-editor") !== null;
    }));
    await press(page, `${MOD}+K`);
    await press(page, "Shift+V");
    await waitForPreviewReady(document, 20_000);
    assert.ok(vscode.window.visibleTextEditors.some((editor) => editor.document === document),
      "the source editor stays visible beside the preview");
    await captureNow(evidence, page, "lifecycle-sync/r19-keybinding-opens-preview",
      "The Markdown editor had the focus; Cmd/Ctrl+K then Shift+V opened the Studio preview beside it.");

    const panel = getActivePreviewPanelForTests();
    const before = getActivePreviewForTests()!;
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(REFRESH_COMMAND_ID);
    await waitFor("the refreshed render", () => {
      const preview = getActivePreviewForTests();
      return preview !== undefined && preview.requestId !== undefined && before.requestId !== undefined
        && preview.requestId > before.requestId && preview.phase === "ready" && preview.webviewReady
        && preview.renderedStages > before.renderedStages;
    });
    assert.equal(getActivePreviewPanelForTests(), panel, "Refresh Preview keeps the open panel");
    assert.equal(getActivePreviewForTests()?.documentUri, document.uri.toString());
    await captureNow(evidence, page, "lifecycle-sync/r20-refresh-command",
      "Refresh Preview rendered the active document again (a new request id, one more rendered stage) in the same panel.");
  });
}

/**
 * toolbar-navigation/r06 (assertion-only): doubleClickToSwitchToEditor. The preview's scroll
 * messages are switched off (scrollPreviewWithEditor) so only a reveal can move the editor.
 */
export async function scenarioDoubleClickRevealsSource(page: Page, evidence: Evidence): Promise<void> {
  const paragraphs = Array.from({ length: 60 }, (_, index) => `Paragraph ${index + 1}.`);
  const text = ["# Double click", "", ...paragraphs.flatMap((paragraph) => [paragraph, ""])].join("\n");
  const lineOf = (number: number) => 3 + 2 * (number - 1);
  await withPreviewSettings({ doubleClickToSwitchToEditor: true, scrollPreviewWithEditor: false }, async () => {
    await withFixtureDocument("realinput-dblclick", { "long.md": text }, "long.md", async (document) => {
      await openSidePreview(document);
      await waitForPreviewReady(document);
      try {
        await setEditMode(page, false);
        await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: /^Paragraph 50\.$/u }).dblclick());
        await waitFor("the editor to reveal the double-clicked line", () =>
          getActivePreviewForTests()?.lastRevealedSourceLine === lineOf(50));
        const editor = vscode.window.visibleTextEditors.find((candidate) => candidate.document === document);
        assert.ok(editor, "the source editor is visible");
        await waitFor("the line in the editor viewport", () =>
          editor.visibleRanges.some((range) => range.start.line <= lineOf(50) - 1 && range.end.line >= lineOf(50) - 1));

        // Edit mode: the first click opens the block editor, the double-click reveals nothing.
        await setEditMode(page, true);
        await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: /^Paragraph 52\.$/u }).dblclick());
        await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
        await waitFor("the host to hold the block edit", () => getActivePreviewForTests()?.blockEditOpen === true);
        await press(page, "Escape");
        // The page posts in order: a reveal of the double-click would reach the host before the cancel.
        await waitFor("the host to drop the block edit", () => getActivePreviewForTests()?.blockEditOpen === false);
        assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, lineOf(50),
          "a double-click in edit mode reveals nothing");
        assert.equal(bufferText(document), text, "cancelling the editor changed nothing");
        await captureNow(evidence, page, "toolbar-navigation/r06-double-click-reveals-source",
          "doubleClickToSwitchToEditor on: a double-click on Paragraph 50 in reading mode revealed its line in "
          + "the editor; in edit mode a double-click opened the block editor and revealed nothing.");
      } finally {
        await leaveEditMode(page);
      }
    });
  });
}

/**
 * trust-security/r02: a Markdown file outside every workspace folder (a temporary folder in the home
 * directory, like the standalone suite) opens read-only.
 */
export async function scenarioStandaloneReadOnly(page: Page, evidence: Evidence): Promise<void> {
  const directory = fs.mkdtempSync(path.join(os.homedir(), "markdown-okf-schema-standalone-capture-"));
  const filePath = path.join(directory, "finding.md");
  fs.writeFileSync(filePath, "---\ntype: finding\nstatus: draft\n---\n# Standalone document\n\nThis file is outside the workspace.\n", "utf8");
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    assert.equal(vscode.workspace.getWorkspaceFolder(document.uri), undefined, "the file is outside the workspace");
    try {
      await openSidePreview(document);
      await waitForPreviewReady(document);
      assert.equal(getActivePreviewForTests()?.readOnly, true);
      const frame = await currentPreviewFrame(page);
      assert.equal(await frame.locator("[data-sphinx-preview-edit-toggle]").count(), 0, "no Edit button");
      assert.notEqual(await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode"), "on");
      await captureNow(evidence, page, "trust-security/r02-standalone-read-only",
        "A Markdown file in a folder outside the workspace: the preview renders read-only, the toolbar has no Edit button.");
    } finally {
      await closeAllEditors();
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/** trust-security/r01: the side preview of an untrusted workspace (runs in the Restricted Mode window). */
export async function scenarioUntrustedReadOnly(page: Page, evidence: Evidence): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, false, "this scenario runs in the Restricted Mode window");
  const text = "# Restricted Mode\n\nThis workspace is not trusted.\n\n- the preview renders\n- nothing can be edited\n";
  await withFixtureDocument("untrusted-capture", { "restricted.md": text }, "restricted.md", async (document) => {
    await openSidePreview(document);
    await waitForPreviewReady(document);
    assert.equal(getActivePreviewForTests()?.readOnly, true);
    const frame = await currentPreviewFrame(page);
    assert.equal(await frame.locator("[data-sphinx-preview-edit-toggle]").count(), 0, "no Edit button");
    assert.notEqual(await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode"), "on");
    await captureNow(evidence, page, "trust-security/r01-untrusted-read-only",
      "Restricted Mode window: the side preview renders the document read-only and the toolbar has no Edit button.");
  });
}
