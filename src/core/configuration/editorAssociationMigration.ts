/**
 * The rewrite of a `workbench.editorAssociations` value for the editor association migration: it
 * removes the entry that opens every `*.md` file in the Studio editor and keeps every other entry.
 * Pure module: no host API, no DOM, no Node built-ins.
 */

/** The view type of the Studio Open With editor, as `workbench.editorAssociations` names it. */
export const STUDIO_EDITOR_VIEW_TYPE = "markdown-okf-schema-studio.editor";

/** The only pattern the migration touches; folder settings and other patterns are left alone. */
const MARKDOWN_PATTERN = "*.md";

/** The outcome of the rewrite: `value` is what the scope should hold when `changed`. */
export interface AssociationRewrite {
  /** True when an entry was removed. */
  changed: boolean;
  /** The new value of the setting (`undefined` removes the key); the input itself when not `changed`. */
  value: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Removes the `*.md` entry that names the Studio editor from a scope's association value: the
 * object form (`{"*.md": "<view type>"}`) and the legacy array form
 * (`[{ viewType, filenamePattern }]`). An entry naming another editor, another pattern
 * (`**` + `/*.md`, `docs/*.md`) or anything unexpected is kept. An emptied value becomes `undefined`.
 */
export function removeStudioMarkdownAssociation(value: unknown): AssociationRewrite {
  if (Array.isArray(value)) {
    const kept = value.filter((entry) => !(isRecord(entry)
      && entry.filenamePattern === MARKDOWN_PATTERN
      && entry.viewType === STUDIO_EDITOR_VIEW_TYPE));
    if (kept.length === value.length) return { changed: false, value };
    return { changed: true, value: kept.length === 0 ? undefined : kept };
  }
  if (isRecord(value) && value[MARKDOWN_PATTERN] === STUDIO_EDITOR_VIEW_TYPE) {
    const { [MARKDOWN_PATTERN]: _removed, ...rest } = value;
    return { changed: true, value: Object.keys(rest).length === 0 ? undefined : rest };
  }
  return { changed: false, value };
}
