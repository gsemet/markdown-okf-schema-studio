import type * as ExtensionApi from "../../src/extension";

const extensionApi = require("../../bundle/extension") as typeof ExtensionApi;

export const {
  COMMAND_ID,
  deserializePreviewPanelForTests,
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  getLivePreviewRolesForTests,
  listCitationKeysForTests,
  listDocumentTargetsForTests,
  PANEL_VIEW_TYPE,
  previewGroupFocusMovesForTests,
  previewGroupUnlocksSettledForTests,
  REFRESH_COMMAND_ID,
  resetPreviewThemeModeForTests,
  resetRenderHooksForTests,
  sendPreviewMessageForTests,
  setRenderDelayForTests,
  setRenderOverrideForTests,
  syncActiveEditorForTests,
} = extensionApi;
