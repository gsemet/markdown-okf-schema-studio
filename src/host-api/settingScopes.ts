/**
 * The `SettingScopes` port: the one place the extension writes a setting. It reads what the user
 * and the workspace settings each hold for one key, and writes one key in one of those two scopes.
 * Only the editor association migration uses it (`src/session/associationMigration.ts`); the
 * everyday settings are read through {@link Settings}.
 */

/** A settings scope the extension may write. */
export type SettingScope = "user" | "workspace";

/** Reads and writes one setting in the user and the workspace scopes. */
export interface SettingScopes {
  /** The values `section.key` holds in the user and the workspace settings (undefined when unset). */
  inspect(section: string, key: string): { user?: unknown; workspace?: unknown };
  /**
   * Writes `section.key` in one scope (`undefined` removes it). Refuses any other key than
   * `workbench.editorAssociations` and the `markdownOkfSchemaStudio.*` settings.
   */
  write(section: string, key: string, value: unknown, scope: SettingScope): PromiseLike<void>;
}
