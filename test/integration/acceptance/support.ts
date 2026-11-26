/**
 * Shared set-up and waits of the acceptance files that run the repository's extension in a trusted
 * or a Restricted Mode window. The built-VSIX files never import it: it loads the repository's
 * extension bundle (`extensionApi.ts`).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { Browser, Page } from "playwright-core";
import * as vscode from "vscode";

import { getActivePreviewForTests } from "../extensionApi";
import {
  closeAllEditors,
  connectWorkbench,
  createFixture,
  openSidePreview,
  setViewport,
  waitFor,
} from "../realInput/harness";
import { pinStoredWorkspaceChoices } from "../storedChoices";
import { ensureTestWindowFocused } from "../windowFocus";

/** The repository root, from `out/test/integration/acceptance/`. */
const REPOSITORY_ROOT = path.resolve(__dirname, "../../../..");

/** The Studio connected to its window, its side bars closed and no editor open. */
export async function prepareWorkbench(): Promise<{ browser: Browser; page: Page }> {
  await pinStoredWorkspaceChoices();
  await ensureTestWindowFocused();
  const workbench = await connectWorkbench();
  await setViewport(workbench.page, { width: 1400, height: 900 });
  await vscode.commands.executeCommand("workbench.action.closeSidebar");
  await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
  await closeAllEditors();
  return workbench;
}

/**
 * Polls `read` until `done` accepts what it returns, and returns it. A timeout names the last state
 * that was read.
 */
export async function waitForState<T>(
  description: string,
  read: () => T | Promise<T>,
  done: (state: T) => boolean,
  timeoutMs = 20_000,
): Promise<T> {
  const seen: T[] = [];
  try {
    await waitFor(description, async () => {
      seen[0] = await read();
      return done(seen[0]);
    }, timeoutMs);
  } catch (error) {
    throw new Error(`${String(error)} Last seen: ${seen.length === 0 ? "nothing" : String(JSON.stringify(seen[0]))}`);
  }
  return seen[0];
}

/** What the host reports about the active preview, without the page's HTML. */
export function previewState() {
  const preview = getActivePreviewForTests();
  if (preview === undefined) return undefined;
  const {
    documentUri, phase, status, documentVersion, requestId, shownRequestId, webviewReady,
    deferredWorkPending, htmlAssignments, contentPatches,
  } = preview;
  return {
    documentUri, phase, status, documentVersion, requestId, shownRequestId, webviewReady,
    deferredWorkPending, htmlAssignments, contentPatches,
  };
}

export type PreviewState = ReturnType<typeof previewState>;

/** True when the page has confirmed that it shows the host's render of this version of `document`. */
export function showsCurrentRender(document: vscode.TextDocument, state: PreviewState): boolean {
  return state !== undefined && state.documentUri === document.uri.toString() && state.phase === "ready"
    && state.documentVersion === document.version && state.requestId !== undefined
    && state.shownRequestId === state.requestId && state.webviewReady;
}

export async function waitForShownPreview(document: vscode.TextDocument): Promise<void> {
  await waitForState(
    `the page to show the current render of ${path.basename(document.uri.fsPath)}`,
    previewState,
    (state) => showsCurrentRender(document, state),
    30_000,
  );
}

/**
 * Copies fixtures of `test/integration/fixtures/acceptance/<group>/` into a disposable folder inside
 * the repository, opens the first one with its side preview and runs `run` once the page shows it.
 * The editors are closed and the folder removed afterwards, so no fixture of the repository changes.
 */
export async function withFixturePreview(
  group: string,
  files: readonly [string, ...string[]],
  run: (document: vscode.TextDocument) => Promise<void>,
): Promise<void> {
  const sources = path.join(REPOSITORY_ROOT, "test", "integration", "fixtures", "acceptance", group);
  const fixture = createFixture(`acceptance-${group}`, Object.fromEntries(files.map((name) =>
    [name, fs.readFileSync(path.join(sources, name), "utf8").replace(/\r\n/gu, "\n")])));
  let passed = false;
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path(files[0])));
    await openSidePreview(document);
    await waitForShownPreview(document);
    await run(document);
    passed = true;
  } finally {
    const closing = closeAllEditors().finally(() => fixture.dispose());
    // After a failed path, its own error stays the one reported.
    await (passed ? closing : closing.catch((error: unknown) => console.log(`closing the editors failed: ${String(error)}`)));
  }
}
