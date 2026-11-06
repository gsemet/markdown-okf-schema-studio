// @implements_req SwRS-MDOKFSTUDIO-TRUST-001
/**
 * The one reason a preview cannot edit: VS Code itself holds the file read-only. Trust never makes
 * a document read-only, so no reason names a missing trust or a missing workspace folder.
 */

/**
 * Why a toggle wrote nothing although VS Code accepted the edit: the file is read-only in VS Code
 * (`files.readonlyInclude`, or made read-only in the session).
 */
export const READ_ONLY_FILE = "This file is read-only in VS Code.";
