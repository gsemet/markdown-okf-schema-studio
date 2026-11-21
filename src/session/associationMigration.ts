/**
 * The editor association migration. Studio opens Markdown files itself through the setting
 * `open.markdownFilesInStudio`, so a `workbench.editorAssociations` entry `*.md` naming the Studio
 * editor is moved to that setting, once per scope (user, workspace). A migrated scope is remembered,
 * so an association the user adds again later is respected. Host-neutral: ports only.
 */

import { removeStudioMarkdownAssociation } from "../core/configuration/editorAssociationMigration";
import { settingSection } from "../core/configuration/settingsRegistry";
import type { HostUi } from "../host-api/hostUi";
import type { KeyValueStore } from "../host-api/keyValueStore";
import { fireAndForget, type Logger } from "../host-api/logger";
import type { SettingScope, SettingScopes } from "../host-api/settingScopes";
import type { FeatureIntroductions } from "./featureIntroductions";

/** The store key that remembers a scope as migrated (global state for `user`, workspace state for `workspace`). */
const MIGRATED_KEY = "markdownOkfSchemaStudio.migrations.editorAssociation";

/** The notice shown when a migration changed a setting. */
export const MIGRATION_NOTICE =
  "Markdown OKF-Schema Studio replaced your editor association for *.md with its own setting "
  + "'Open Markdown files in Studio', so Markdown files still open in Studio, now at the searched line. "
  + "Use 'Open as Text' for the raw text. Change this in Settings: Markdown OKF-Schema Studio > Opening Files.";

/** What the migration reaches. */
export interface AssociationMigrationPorts {
  /** The host's setting writer; absent: the migration does nothing. */
  readonly settingScopes: SettingScopes | undefined;
  /** Remembers the user scope as migrated. */
  readonly globalState: KeyValueStore;
  /** Remembers the workspace scope as migrated. */
  readonly workspaceState: KeyValueStore;
  readonly ui: HostUi;
  readonly logger: Logger;
  readonly introductions: FeatureIntroductions;
}

const SCOPES: readonly SettingScope[] = ["user", "workspace"];

// @implements_req SwRS-MDOKFSTUDIO-LIFE-175
/**
 * Migrates the `*.md` association to Studio in each scope that holds one and is not yet marked.
 * The Studio setting is written first, so a failure never leaves the reader without either; a
 * failed write is logged and warned once, the scope is not marked and the next activation tries
 * again. Returns whether any scope changed (the migration notice was then shown).
 */
export async function migrateEditorAssociation(ports: AssociationMigrationPorts): Promise<boolean> {
  const { settingScopes, logger } = ports;
  if (!settingScopes) return false;
  let changed = false;
  let warned = false;
  for (const scope of SCOPES) {
    const marks = scope === "user" ? ports.globalState : ports.workspaceState;
    if (marks.get<boolean>(MIGRATED_KEY) === true) continue;
    try {
      const rewrite = removeStudioMarkdownAssociation(settingScopes.inspect("workbench", "editorAssociations")[scope]);
      if (!rewrite.changed) continue;
      await settingScopes.write(settingSection("open"), "markdownFilesInStudio", true, scope);
      await settingScopes.write("workbench", "editorAssociations", rewrite.value, scope);
      await marks.update(MIGRATED_KEY, true);
      changed = true;
    } catch (error) {
      logger.error(`Could not migrate the *.md editor association in the ${scope} settings.`, error);
      if (!warned) {
        warned = true;
        fireAndForget(logger, ports.ui.showWarning(
          "Markdown OKF-Schema Studio could not move your *.md editor association to its setting "
          + "'Open Markdown files in Studio'. It will try again at the next start.",
        ), "showWarning");
      }
    }
  }
  if (changed) {
    await ports.introductions.markShown("openInStudio");
    fireAndForget(logger, ports.ui.showInformation(MIGRATION_NOTICE), "showInformation");
  }
  return changed;
}
