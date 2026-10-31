// @implements_req SwRS-MDOKFSTUDIO-TRUST-001
/** The reasons a preview is read-only, and the tooltips of the greyed Edit button. */

/** Why a preview is read-only when the workspace is not trusted. */
export const READ_ONLY_UNTRUSTED = "Editing requires a trusted workspace.";
/** Why a preview is read-only when the file is outside every workspace folder. */
export const READ_ONLY_NO_FOLDER = "Editing needs the file's folder opened as a workspace folder in VS Code.";
/**
 * Why a toggle wrote nothing although VS Code accepted the edit: the file is read-only in VS Code
 * (`files.readonlyInclude`, or made read-only in the session).
 */
export const READ_ONLY_FILE = "This file is read-only in VS Code.";
/** Tooltip of the greyed Edit button when the workspace is untrusted. */
export const EDIT_UNAVAILABLE_UNTRUSTED = "Editing is unavailable: this file is not in a trusted workspace";
/** Tooltip of the greyed Edit button when the file is outside every workspace folder. */
export const EDIT_UNAVAILABLE_NO_FOLDER =
  "Editing is unavailable: this file is not in a folder opened in the VS Code workspace";
