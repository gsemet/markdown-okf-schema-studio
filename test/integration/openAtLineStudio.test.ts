import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import type { Page } from "playwright-core";

import { EDITOR_VIEW_TYPE, getActivePreviewForTests, pinPreviewForTests, sendPreviewMessageForTests } from "./extensionApi";
import { activeTab, documentWithHeadingAt42, pageMarks, settle, slugOf, studioTabs, tabs, textTabs, withAssociation } from "./openAtLineHelpers";
import { connectWorkbench, createFixture, waitFor } from "./realInput/harness";

const OPEN_IN_STUDIO_AT_LINE = "markdown-okf-schema-studio.openInStudioAtLine";
const HEADING = "Needle heading";

/**
 * The preview the hooks read and message is the one created last, not the tab the reader sees: pin
 * the Studio tab of `file` (the hooks follow it until the next pin or the end of the window).
 */
const view = (file: vscode.Uri): ReturnType<typeof getActivePreviewForTests> => {
  pinPreviewForTests(file.toString());
  return getActivePreviewForTests();
};

const markedLine = (file: vscode.Uri): { line: number; documentId: string } | undefined => view(file)?.markedLine;

/** The column of the group that holds the first tab matching `predicate`. */
function columnOf(predicate: (tab: vscode.Tab) => boolean): number | undefined {
  return vscode.window.tabGroups.all.find((group) => group.tabs.some(predicate))?.viewColumn;
}

function context(file: vscode.Uri): { documentId: string; revision: number; requestId: number } {
  const preview = view(file);
  assert.ok(preview && preview.requestId !== undefined && preview.documentVersion !== undefined, "a preview with a render");
  return { documentId: preview.documentUri, revision: preview.documentVersion, requestId: preview.requestId };
}

async function waitForReady(file: vscode.Uri): Promise<void> {
  await waitFor(`the Studio tab of ${path.basename(file.fsPath)} to be ready`, () => {
    const preview = view(file);
    return preview?.documentUri === file.toString() && preview.phase === "ready" && preview.webviewReady;
  }, 30_000);
}

/** The Studio tab of `file` is the active tab, with the host's line marker on `line`. */
async function waitForMarked(label: string, file: vscode.Uri, line: number): Promise<void> {
  try {
    await waitFor(`${label}: the Studio tab of ${path.basename(file.fsPath)} is active and marked at ${line}`, () => {
      const active = activeTab();
      return active?.kind === "studio" && active.file === file.fsPath && markedLine(file)?.line === line;
    }, 20_000);
  } catch (error) {
    throw new Error(`${String(error)} Window: activeTab=${JSON.stringify(activeTab())} markedLine=${JSON.stringify(markedLine(file))}`
      + ` history=${JSON.stringify(view(file)?.history.entries)} tabs=${JSON.stringify(tabs().map((tab) => tab.label))}`);
  }
}

async function waitForPageMark(label: string, file: vscode.Uri, page: Page): Promise<void> {
  pinPreviewForTests(file.toString());
  await waitFor(`${label}: the page draws its line marker`, async () => await pageMarks(page) > 0, 30_000);
}

/** Opens `file` as a Studio tab of the group `viewColumn` and waits for its first render. */
async function openStudio(file: vscode.Uri, viewColumn: vscode.ViewColumn): Promise<void> {
  await vscode.commands.executeCommand("vscode.openWith", file, EDITOR_VIEW_TYPE, { viewColumn, preview: false });
  await waitForReady(file);
}

/** The reader sits on `line` of the Studio tab of `file`, then follows `request` (a link of the page). */
function followLinkAt(file: vscode.Uri, line: number, request: string): void {
  void sendPreviewMessageForTests({ type: "previewState", ...context(file), anchorLine: line, line, scrollTop: 0, editMode: false });
  void sendPreviewMessageForTests({ type: "previewLink", ...context(file), request });
}

/** Studio Back or Next, asked by the page of the Studio tab of `file`. */
function historyGo(file: vscode.Uri, direction: "back" | "forward"): void {
  void sendPreviewMessageForTests({ type: "previewHistoryGo", ...context(file), direction });
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196
// @tests_req SwRS-MDOKFSTUDIO-LIFE-197
// @tests_req SwRS-MDOKFSTUDIO-LIFE-198
/**
 * CR-483 in the real window (specification 7.3), associated (the `*.md` association set) and default
 * (not set): the command "Open in Studio at This Line", a link `#heading` followed in a Studio tab,
 * Studio Back and Next, a Studio tab in another group (no second tab opens), VS Code Go Back and Go
 * Forward, "Reopen Editor With... > Text Editor" and `openWith` default (text, and it stays). The
 * entries of the probe (search, Quick Open, Problems, Go to Symbol, links of a text editor) are in
 * `openAtLineProbe.test.ts`; the plain opening without a line (no marker) and the jump with the file
 * open as text are rows of `openAtLine.test.ts`.
 */
export async function run(): Promise<void> {
  const fixture = createFixture("open-at-line-studio", {
    "target.md": documentWithHeadingAt42("Target", HEADING),
    "source.md": `# Source\n\nGo to [the heading](target.md#${slugOf(HEADING)}).\n`,
  });
  const target = vscode.Uri.file(fixture.path("target.md"));
  const source = vscode.Uri.file(fixture.path("source.md"));
  const { browser, page } = await connectWorkbench();
  try {
    // The command, from a text editor at line 42: a Studio tab in the editor's group, marked, the text tab stays.
    for (const associated of [true, false]) {
      await withAssociation(associated, async () => {
        const label = `command (${associated ? "associated" : "default"})`;
        await vscode.commands.executeCommand("vscode.openWith", target, "default", { viewColumn: vscode.ViewColumn.One, preview: false });
        await waitFor("the text editor", () => vscode.window.activeTextEditor?.document.uri.fsPath === target.fsPath);
        const editor = vscode.window.activeTextEditor!;
        editor.selection = new vscode.Selection(41, 0, 41, 0);
        await vscode.commands.executeCommand(OPEN_IN_STUDIO_AT_LINE);
        await waitForMarked(label, target, 42);
        await waitForPageMark(label, target, page);
        await settle(2000);
        assert.deepEqual([studioTabs(target.fsPath).length, textTabs(target.fsPath).length], [1, 1], `${label}: a Studio tab and the text tab both stay`);
        assert.equal(columnOf((tab) => studioTabs(target.fsPath).includes(tab)), editor.viewColumn, `${label}: the Studio tab is in the text editor's group`);
        assert.equal(activeTab()?.kind, "studio", `${label}: the Studio tab stays active`);
      });
    }
    // The command with the Studio tab already open in another group: that tab takes the line, no second tab.
    await withAssociation(true, async () => {
      await openStudio(target, vscode.ViewColumn.Two);
      await vscode.commands.executeCommand("vscode.openWith", target, "default", { viewColumn: vscode.ViewColumn.One, preview: false });
      await waitFor("the text editor", () => vscode.window.activeTextEditor?.document.uri.fsPath === target.fsPath);
      vscode.window.activeTextEditor!.selection = new vscode.Selection(41, 0, 41, 0);
      await vscode.commands.executeCommand(OPEN_IN_STUDIO_AT_LINE);
      await waitForMarked("command with a Studio tab elsewhere", target, 42);
      await settle(2000);
      assert.deepEqual([studioTabs(target.fsPath).length, textTabs(target.fsPath).length], [1, 1], "no second Studio tab, the text tab stays");
      assert.equal(columnOf((tab) => studioTabs(target.fsPath).includes(tab)), vscode.ViewColumn.Two, "the existing Studio tab keeps its group");
    });

    // A link `#heading` from a Studio tab, Studio Back and Next, VS Code Go Back and Go Forward (associated).
    await withAssociation(true, async () => {
      await openStudio(source, vscode.ViewColumn.One);
      followLinkAt(source, 3, `target.md#${slugOf(HEADING)}`);
      await waitForMarked("link from a Studio tab", target, 42);
      await waitForPageMark("link from a Studio tab", target, page);
      assert.equal(studioTabs(target.fsPath).length, 1, "the link opened one Studio tab of the target");
      assert.equal(studioTabs(source.fsPath).length, 1, "the source Studio tab stays");
      assert.equal(textTabs().length, 0, "no text tab");
      await waitFor("Back to be enabled in the target tab", () => view(target)?.history.posted?.canBack === true);
      historyGo(target, "back");
      await waitForMarked("Studio Back", source, 3);
      assert.deepEqual([studioTabs(source.fsPath).length, studioTabs(target.fsPath).length], [1, 1], "Back opens no second Studio tab");
      historyGo(source, "forward");
      await waitForMarked("Studio Next", target, 42);
      assert.deepEqual([studioTabs(source.fsPath).length, studioTabs(target.fsPath).length], [1, 1], "Next opens no second Studio tab");
      // VS Code's own history: Go Back returns to the Studio tab left, Go Forward to the target.
      await vscode.commands.executeCommand("workbench.action.navigateBack");
      await waitFor("Go Back to the source Studio tab", () => activeTab()?.kind === "studio" && activeTab()?.file === source.fsPath);
      await vscode.commands.executeCommand("workbench.action.navigateForward");
      await waitFor("Go Forward to the target Studio tab", () => activeTab()?.kind === "studio" && activeTab()?.file === target.fsPath);
      assert.equal(tabs().length, 2, "Go Back and Go Forward open no tab");
      // Reopen Editor With... > Text Editor on the target Studio tab: text, and it stays.
      await vscode.commands.executeCommand("workbench.action.reopenTextEditor");
      await waitFor("the target as text", () => textTabs(target.fsPath).length === 1 && studioTabs(target.fsPath).length === 0, 30_000);
      await settle(2000);
      assert.deepEqual([textTabs(target.fsPath).length, studioTabs(target.fsPath).length], [1, 0], "Reopen With Text Editor: the text stays, no Studio tab comes back");
      // openWith default on the source Studio tab's file: a text tab beside it, and it stays.
      await vscode.commands.executeCommand("vscode.openWith", source, "default", { viewColumn: vscode.ViewColumn.One, preview: false });
      await waitFor("the source as text", () => textTabs(source.fsPath).length === 1);
      await settle(2000);
      assert.equal(activeTab()?.kind, "text", "openWith default: the text tab is the active tab and stays");
    });

    // The same link by default: the target opens as text at the heading, the source tab's history is untouched.
    await withAssociation(false, async () => {
      await openStudio(source, vscode.ViewColumn.One);
      const before = view(source)!.history.entries.length;
      followLinkAt(source, 3, `target.md#${slugOf(HEADING)}`);
      await waitFor("the target as text at its heading", () => vscode.window.activeTextEditor?.document.uri.fsPath === target.fsPath
        && vscode.window.activeTextEditor.selection.active.line === 41, 30_000);
      await settle(2000);
      assert.equal(studioTabs(target.fsPath).length, 0, "default: no Studio tab of the target");
      assert.equal(textTabs(target.fsPath).length, 1, "default: the text tab stays");
      assert.equal(view(source)?.history.entries.length, before, "default: a link that opens as text is not added to Studio's history");
    });

    // The target's Studio tab in another group, with a history of its own: the link reveals it there.
    await withAssociation(true, async () => {
      await openStudio(target, vscode.ViewColumn.One);
      followLinkAt(target, 1, `#${slugOf(HEADING)}`);
      await waitFor("the in-page jump recorded in the target's own history", () => view(target)?.history.entries.length === 2);
      await openStudio(source, vscode.ViewColumn.Two);
      followLinkAt(source, 3, `target.md#${slugOf(HEADING)}`);
      await waitForMarked("link to a Studio tab in another group", target, 42);
      await settle(1500);
      assert.deepEqual([studioTabs(source.fsPath).length, studioTabs(target.fsPath).length], [1, 1], "no second Studio tab of the target in any group");
      assert.equal(columnOf((tab) => studioTabs(target.fsPath).includes(tab)), vscode.ViewColumn.One, "the target tab stays in its own group");
      assert.equal(columnOf((tab) => studioTabs(source.fsPath).includes(tab)), vscode.ViewColumn.Two, "the source tab stays in its own group");
      // Back first returns to the place left in the source, in the source's own group.
      historyGo(target, "back");
      await waitForMarked("Back to the source in another group", source, 3);
      assert.deepEqual([studioTabs(source.fsPath).length, studioTabs(target.fsPath).length], [1, 1], "Back opens no second Studio tab");
      assert.equal(activeTab()?.viewColumn, vscode.ViewColumn.Two, "the source tab is active in its own group");
      // Then to the target's own earlier place.
      await openStudio(target, vscode.ViewColumn.One);
      historyGo(target, "back");
      await waitFor("Back to the target's own earlier place", () => activeTab()?.file === target.fsPath);
      assert.deepEqual([studioTabs(source.fsPath).length, studioTabs(target.fsPath).length], [1, 1], "the second Back opens no Studio tab either");
    });
  } finally {
    pinPreviewForTests(undefined);
    await browser.close();
    fixture.dispose();
  }
}
