import * as vscode from "vscode";
import type { Page } from "playwright-core";

import type { ScenarioSnapshot } from "../shared/realWindowTrace";
import { getActivePreviewForTests } from "./extensionApi";
import { findCurrentFrame } from "./realInput/harness";

/**
 * The collector of `withFailureTrace` for a scenario with one source document: the host state of the
 * active preview, the document, the current frame's edit mode, the open editor tabs and the
 * scenario's own `failures` so far. Every part is read on its own, so one that fails reports itself
 * and leaves the others. `source` is a function because the document opens after the scenario starts.
 */
export function scenarioTraceCollector(
  page: Page,
  source: () => vscode.TextDocument | undefined,
  failures: readonly string[],
): () => Promise<ScenarioSnapshot> {
  return async () => {
    const part = async <T>(read: () => T | Promise<T>): Promise<T | { error: string }> => {
      try {
        return await read();
      } catch (error) {
        return { error: String(error) };
      }
    };
    return {
      preview: await part(() => {
        const preview = getActivePreviewForTests();
        if (preview === undefined) return null;
        return {
          phase: preview.phase,
          requestId: preview.requestId,
          documentVersion: preview.documentVersion,
          webviewReady: preview.webviewReady,
          deferredWorkPending: preview.deferredWorkPending,
          blockEditOpen: preview.blockEditOpen,
          pageEditorOpen: preview.pageEditorOpen,
          contentPatches: preview.contentPatches,
          htmlAssignments: preview.htmlAssignments,
          panelActive: preview.panelActive,
        };
      }),
      source: await part(() => {
        const document = source();
        return document === undefined ? null : { version: document.version, text: document.getText() };
      }),
      frame: await part(async () => {
        const frame = await findCurrentFrame(page);
        if (frame === undefined) return { found: false };
        return { found: true, editMode: await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode", { timeout: 2_000 }) };
      }),
      tabs: await part(() => vscode.window.tabGroups.all.map((group) => group.tabs.map((tab) => ({
        label: tab.label,
        inputType: tab.input === undefined || tab.input === null ? "none" : (tab.input as object).constructor?.name ?? "unknown",
      })))),
      failures: [...failures],
    };
  };
}
