import type * as ExtensionApi from "../../src/extension";

const extensionApi = require("../../bundle/extension") as typeof ExtensionApi;

export const {
  clearStoredPaletteModeForTests,
  COMMAND_ID,
  deserializePreviewPanelForTests,
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  getLivePreviewRolesForTests,
  listCitationKeysForTests,
  listDocumentTargetsForTests,
  noteKeystrokeForTests,
  PANEL_VIEW_TYPE,
  previewGroupFocusMovesForTests,
  previewGroupUnlocksSettledForTests,
  REFRESH_COMMAND_ID,
  resetPreviewThemeModeForTests,
  resetRenderHooksForTests,
  sendPreviewMessageForTests,
  setRenderDelayForTests,
  setRenderOverrideForTests,
  storedEditModeForTests,
  storeWorkspaceChoicesForTests,
  syncActiveEditorForTests,
} = extensionApi;
