/**
 * The extension's entry point (the esbuild entry of `bundle/extension.js`). `activate` creates one
 * {@link StudioActivation}, the composition root in `src/host-vscode/activation.ts`; the previews,
 * their sessions and their features live in `src/session/`. The `*ForTests` hooks of the integration
 * tests are re-exported from `src/host-vscode/testHooks.ts`.
 */

import type * as vscode from "vscode";

import { StudioActivation } from "./host-vscode/activation";
import { setCurrentActivation } from "./host-vscode/testHooks";

export { COMMAND_ID, EDITOR_VIEW_TYPE, PANEL_VIEW_TYPE, REFRESH_COMMAND_ID } from "./host-vscode/activation";
export {
  clearStoredPaletteModeForTests,
  deserializePreviewPanelForTests,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  getLivePreviewRolesForTests,
  listCitationKeysForTests,
  listDocumentTargetsForTests,
  previewGroupFocusMovesForTests,
  previewGroupUnlocksSettledForTests,
  resetPreviewThemeModeForTests,
  sendPreviewMessageForTests,
  storedEditModeForTests,
  storeWorkspaceChoicesForTests,
  syncActiveEditorForTests,
} from "./host-vscode/testHooks";
export { resetRenderHooksForTests, setRenderDelayForTests, setRenderOverrideForTests } from "./core/render/renderPipeline";

/** The activation that runs; undefined before `activate` and after `deactivate`. */
let activation: StudioActivation | undefined;

// @implements_req SwRS-MDOKFSTUDIO-LIFE-001
/** Activates the extension: commands, the custom editor, the serializer and the event wiring. */
export function activate(context: vscode.ExtensionContext): void {
  activation = new StudioActivation(context.extensionUri);
  setCurrentActivation(activation);
  activation.start(context);
}

/** Disposes the previews (their panels stay with VS Code) and what the activation holds. */
export function deactivate(): void {
  activation?.stop();
  activation = undefined;
  setCurrentActivation(undefined);
}
