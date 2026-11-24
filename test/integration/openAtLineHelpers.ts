import * as vscode from "vscode";
import type { Page } from "playwright-core";

import { EDITOR_VIEW_TYPE, getActivePreviewForTests, pinPreviewForTests } from "./extensionApi";
import { closeAllEditors, findCurrentFrame, waitFor } from "./realInput/harness";

/** Every tab of the window, in every group. */
export function tabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs);
}

/** The Studio tabs (custom editor of the extension), optionally of one file. */
export function studioTabs(file?: string): vscode.Tab[] {
  return tabs().filter((tab) => tab.input instanceof vscode.TabInputCustom
    && tab.input.viewType === EDITOR_VIEW_TYPE
    && (file === undefined || tab.input.uri.fsPath === file));
}

/** The text tabs, optionally of one file. */
export function textTabs(file?: string): vscode.Tab[] {
  return tabs().filter((tab) => tab.input instanceof vscode.TabInputText
    && (file === undefined || tab.input.uri.fsPath === file));
}

export const settle = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** The active tab of the window, with its kind and file. */
export function activeTab(): { kind: "studio" | "text" | "other"; file?: string; viewColumn: number } | undefined {
  const group = vscode.window.tabGroups.activeTabGroup;
  const tab = group.activeTab;
  if (!tab) return undefined;
  if (tab.input instanceof vscode.TabInputCustom && tab.input.viewType === EDITOR_VIEW_TYPE) {
    return { kind: "studio", file: tab.input.uri.fsPath, viewColumn: group.viewColumn };
  }
  if (tab.input instanceof vscode.TabInputText) return { kind: "text", file: tab.input.uri.fsPath, viewColumn: group.viewColumn };
  return { kind: "other", viewColumn: group.viewColumn };
}

/**
 * The editor association a reader would set (`"*.md"` to Studio) for the body, then put back as it was
 * (the user value, so that the next step of the trusted window starts clean). Every tab is closed
 * before the body and after it.
 */
export async function withAssociation<T>(associated: boolean, body: () => Promise<T>): Promise<T> {
  const configuration = vscode.workspace.getConfiguration("workbench");
  const before = configuration.inspect<Record<string, string>>("editorAssociations")?.globalValue;
  await configuration.update("editorAssociations", associated ? { "*.md": EDITOR_VIEW_TYPE } : undefined, vscode.ConfigurationTarget.Global);
  try {
    pinPreviewForTests(undefined);
    await closeAllEditors();
    return await body();
  } finally {
    pinPreviewForTests(undefined);
    await configuration.update("editorAssociations", before, vscode.ConfigurationTarget.Global);
    await closeAllEditors();
  }
}

/**
 * A document of 100 lines whose line 42 is the heading `## <heading>` (the others are paragraphs on
 * the odd lines and blank on the even ones), so that a jump to "line 42" is unambiguous.
 */
export function documentWithHeadingAt42(title: string, heading: string, extra: Record<number, string> = {}): string {
  return Array.from({ length: 100 }, (_, index) => {
    const line = index + 1;
    if (line === 1) return `# ${title}`;
    if (line === 42) return `## ${heading}`;
    return extra[line] ?? (line % 2 === 1 ? `Line ${line}: filler paragraph.` : "");
  }).join("\n") + "\n";
}

/** The slug VS Code and Studio give a heading as its anchor. */
export const slugOf = (heading: string): string => heading.toLowerCase().replace(/\s+/gu, "-");

/** Eighty paragraphs, so that a document has lines to jump to. */
export const FILLER = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}: filler paragraph.\n`).join("\n");

/**
 * How many marker overlays (the arrow and the band) the page of the active Studio tab draws. It waits
 * for the tab's first render and its frame first: a frame still loading answers a locator call late.
 */
export async function pageMarks(page: Page): Promise<number> {
  await waitFor("the active Studio tab to be ready", () => {
    const preview = getActivePreviewForTests();
    return preview?.phase === "ready" && preview.webviewReady;
  }, 30_000);
  let count = 0;
  await waitFor("the frame of the active Studio tab", async () => {
    const frame = await findCurrentFrame(page);
    if (frame === undefined) return false;
    count = await frame.locator(".sphinx-preview-line-marker").count();
    return true;
  }, 30_000);
  return count;
}
