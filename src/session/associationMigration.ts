/**
 * The editor association restore. Versions 1.11.0 and 1.12.0 moved a `*.md` association to the
 * Studio editor into the setting `open.markdownFilesInStudio`; this version retires that setting
 * and VS Code's own `workbench.editorAssociations` opens Markdown files in Studio again. For each
 * scope (user, then workspace) that holds the setting on, the association is written back and the
 * retired settings are removed. Silent: nothing is shown to the reader, a failure is logged only.
 * Host-neutral: ports only.
 */

import { restoreStudioMarkdownAssociation } from "../core/configuration/editorAssociationMigration";
import type { KeyValueStore } from "../host-api/keyValueStore";
import type { Logger } from "../host-api/logger";
import type { SettingScope, SettingScopes } from "../host-api/settingScopes";

/** The section of the retired settings. */
const RETIRED_SECTION = "markdownOkfSchemaStudio";
/** The retired setting that, when on, asked Studio to open every Markdown file. */
const MARKDOWN_FILES_KEY = "open.markdownFilesInStudio";
/** The other retired setting; its value never matters again. */
const SEARCH_RESULTS_KEY = "open.searchResultsInStudio";

/** The store key the 1.11.0 migration left (global state for `user`, workspace state for `workspace`). */
const OLD_MIGRATED_KEY = "markdownOkfSchemaStudio.migrations.editorAssociation";

/** What the restore reaches. */
export interface AssociationRestorePorts {
  /** The host's setting writer; absent: the restore does nothing. */
  readonly settingScopes: SettingScopes | undefined;
  /** Holds the old mark of the user scope, which is removed. */
  readonly globalState: KeyValueStore;
  /** Holds the old mark of the workspace scope, which is removed. */
  readonly workspaceState: KeyValueStore;
  readonly logger: Logger;
}

const SCOPES: readonly SettingScope[] = ["user", "workspace"];

// @implements_req SwRS-MDOKFSTUDIO-LIFE-195
/**
 * Restores the `*.md` association in each scope whose own value of the retired setting is on, then
 * removes the retired settings of that scope. The association is written first, so a failure never
 * leaves the reader with neither; a failed write is logged, the setting stays and the next
 * activation tries again. A scope whose association value has an unknown shape keeps its setting.
 * Never shows anything. Returns the scopes whose setting was on and now is replaced by the association.
 */
export async function restoreEditorAssociation(ports: AssociationRestorePorts): Promise<readonly SettingScope[]> {
  const { settingScopes, logger } = ports;
  if (!settingScopes) return [];
  const restored: SettingScope[] = [];
  for (const scope of SCOPES) {
    try {
      if (await restoreScope(settingScopes, scope, logger) === "restored") restored.push(scope);
    } catch (error) {
      logger.error(`Could not restore the *.md editor association in the ${scope} settings.`, error);
    }
  }
  for (const store of [ports.globalState, ports.workspaceState]) {
    if (store.get(OLD_MIGRATED_KEY) === undefined) continue;
    try {
      await store.update(OLD_MIGRATED_KEY, undefined);
    } catch (error) {
      logger.error("Could not remove the old editor association mark.", error);
    }
  }
  return restored;
}

/** Restores one scope; "kept" when the malformed association value made it keep the setting. */
async function restoreScope(
  settingScopes: SettingScopes,
  scope: SettingScope,
  logger: Logger,
): Promise<"restored" | "kept" | "nothing"> {
  const retired = (key: string): unknown => settingScopes.inspect(RETIRED_SECTION, key)[scope];
  const remove = (key: string): PromiseLike<void> => settingScopes.write(RETIRED_SECTION, key, undefined, scope);
  const markdownFiles = retired(MARKDOWN_FILES_KEY);
  let outcome: "restored" | "kept" | "nothing" = "nothing";
  if (markdownFiles === true) {
    const restore = restoreStudioMarkdownAssociation(settingScopes.inspect("workbench", "editorAssociations")[scope]);
    if (restore.kind === "malformed") {
      logger.error(`The *.md editor association of the ${scope} settings has an unknown shape; it was left as it is.`);
      outcome = "kept";
    } else {
      if (restore.kind === "write") await settingScopes.write("workbench", "editorAssociations", restore.value, scope);
      await remove(MARKDOWN_FILES_KEY);
      outcome = "restored";
    }
  } else if (markdownFiles !== undefined) {
    await remove(MARKDOWN_FILES_KEY);
  }
  if (retired(SEARCH_RESULTS_KEY) !== undefined) await remove(SEARCH_RESULTS_KEY);
  return outcome;
}
