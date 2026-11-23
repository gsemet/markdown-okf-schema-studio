/**
 * The rewrite of a `workbench.editorAssociations` value for the editor association restore: it adds
 * the entry that opens every `*.md` file in the Studio editor and keeps every other entry. It is the
 * inverse of the removal 1.11.0 made when it moved the entry to a setting, which 1.12.1 retires.
 * Pure module: no host API, no DOM, no Node built-ins.
 */

/** The view type of the Studio Open With editor, as `workbench.editorAssociations` names it. */
export const STUDIO_EDITOR_VIEW_TYPE = "markdown-okf-schema-studio.editor";

/** The only pattern the restore touches; folder settings and other patterns are left alone. */
const MARKDOWN_PATTERN = "*.md";

/**
 * What to do with the association value of one scope:
 * - `write`: write `value` (the entry was added);
 * - `none`: nothing to write (the scope already has a `*.md` entry, Studio's or another editor's);
 * - `malformed`: the value is neither an object nor an array; nothing is written and the caller
 *   keeps the retired setting so nothing is lost.
 */
export type AssociationRestore =
  | { readonly kind: "write"; readonly value: unknown }
  | { readonly kind: "none" }
  | { readonly kind: "malformed" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Adds the `*.md` entry naming the Studio editor to a scope's association value: the object form
 * (`{"*.md": "<view type>"}`), the legacy array form (`[{ viewType, filenamePattern }]`), or an
 * absent value. A `*.md` entry that already exists, for Studio or for another editor, is the
 * user's own and wins: nothing is written. Other entries and their order are kept.
 */
export function restoreStudioMarkdownAssociation(value: unknown): AssociationRestore {
  if (value === undefined) return { kind: "write", value: { [MARKDOWN_PATTERN]: STUDIO_EDITOR_VIEW_TYPE } };
  if (Array.isArray(value)) {
    if (value.some((entry) => isRecord(entry) && entry.filenamePattern === MARKDOWN_PATTERN)) return { kind: "none" };
    return { kind: "write", value: [...value, { viewType: STUDIO_EDITOR_VIEW_TYPE, filenamePattern: MARKDOWN_PATTERN }] };
  }
  if (isRecord(value)) {
    if (MARKDOWN_PATTERN in value) return { kind: "none" };
    return { kind: "write", value: { ...value, [MARKDOWN_PATTERN]: STUDIO_EDITOR_VIEW_TYPE } };
  }
  return { kind: "malformed" };
}
