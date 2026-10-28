import * as vscode from "vscode";

import { storeWorkspaceChoicesForTests } from "./extensionApi";

/**
 * The workspace choices these suites were written against: the preview theme follows VS Code, the
 * floating toolbar shows its five rows and the palette offers the MyST buttons. A fresh workspace
 * now starts in cream with the toolbar collapsed and the GFM palette, so the suites store these
 * choices first, like a user who had made them (the fresh defaults have their own tests).
 */
export const PINNED_WORKSPACE_CHOICES = Object.freeze({
  previewThemeMode: "current",
  toolbarCollapsed: false,
  paletteMode: "myst",
} as const);

export async function pinStoredWorkspaceChoices(): Promise<void> {
  await vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio")?.activate();
  await storeWorkspaceChoicesForTests(PINNED_WORKSPACE_CHOICES);
}
