/**
 * The frontmatter edits of the properties table: change a value, rename a key, add or remove a
 * field. Planning and checking are pure: {@link planFrontmatterSave} turns a page request into one
 * {@link TextEdit} of the YAML, and {@link checkFrontmatterCandidate} checks the schema analysis
 * of the edited text, which the host computes in between (it may read the schema from disk).
 * Every refusal is the message the properties table shows.
 */

import {
  createFrontmatterFieldPatch,
  createFrontmatterFieldRemovePatch,
  createFrontmatterFieldRenamePatch,
  extractFrontmatter,
  frontmatterAddPlacement,
  parseYamlValue,
  type FrontmatterResult,
} from "../frontmatter/okfFrontmatter";
import type { PageMessageOf } from "../protocol/pageToHost";
import type { TextEdit } from "./textEdit";

/** Refusal of a field that no longer exists, or a value of the wrong type. */
export const FRONTMATTER_STALE = "The frontmatter field is stale or its value does not match the schema.";

/** One field of the properties table, as the last frontmatter analysis reported it. */
export type FrontmatterField = FrontmatterResult["fields"][number];

/** What the page sends to change one field (the fields of `previewFrontmatterSave` the plan reads). */
export type FrontmatterSaveRequest = Pick<
  PageMessageOf<"previewFrontmatterSave">,
  "fieldName" | "frontmatterAction" | "afterField" | "newFieldName" | "fieldValue" | "fieldValueFormat"
  | "fieldValueStyle" | "flush"
>;

/** A refusal, with the message the properties table shows. */
export interface FrontmatterSaveError {
  error: string;
}

/** A planned frontmatter save: the edit, and what the schema check of its result needs. */
export interface FrontmatterSavePlan {
  edit: TextEdit;
  /** The document text with the edit applied. */
  candidateSource: string;
  /** The field the edit writes (the new name of a rename, the added key); undefined for a remove. */
  targetFieldName: string | undefined;
  /** The value written (parsed from YAML when the page sent YAML text). */
  fieldValue: unknown;
  /** The edited text must pass the schema check before the edit is applied (see checkFrontmatterCandidate). */
  needsSchemaCheck: boolean;
  isRemove: boolean;
}

/**
 * Whether `value` fits the type of `field`. Without a schema, or for a field of unknown type,
 * every value fits.
 */
export function frontmatterValueMatchesField(field: FrontmatterField, value: unknown, schemaFound: boolean): boolean {
  if (!schemaFound || field.fieldType === "unknown") return true;
  if (value === null) return field.nullable;
  switch (field.fieldType) {
    case "text":
    case "date":
    case "time":
    case "datetime":
      return typeof value === "string";
    case "checkbox":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "list":
      return Array.isArray(value);
    case "enum":
      return typeof value === "string" && Boolean(field.enums?.includes(value));
    default:
      return false;
  }
}

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-016
// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-024
// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-037
// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-067
/**
 * Plans one save of the properties table on `sourceText`, given the frontmatter analysis the table
 * was built from (`frontmatter`, undefined when the document has none).
 *
 * A save with `flush` (sent before a navigation) writes the value as typed, whatever the schema or
 * the YAML syntax says: the reader leaves the page and could not fix it, and the typed text must
 * not be lost; the preview then shows the validation error.
 */
export function planFrontmatterSave(
  sourceText: string,
  frontmatter: FrontmatterResult | undefined,
  request: FrontmatterSaveRequest,
): FrontmatterSaveError | FrontmatterSavePlan {
  const fieldName = request.fieldName ?? "";
  const action = request.frontmatterAction;
  const isAdd = action === "add";
  const isRemove = action === "remove";
  const field = frontmatter?.fields.find((candidate) => candidate.name === fieldName);
  if (isAdd ? field !== undefined : !field) {
    return { error: FRONTMATTER_STALE };
  }
  const currentField = field as FrontmatterField;
  const newFieldName = !isAdd && !isRemove ? request.newFieldName : undefined;
  if ((isAdd && (!fieldName.trim() || fieldName !== fieldName.trim() || /[\r\n]/u.test(fieldName)))
    || (newFieldName !== undefined && (!newFieldName.trim() || newFieldName !== newFieldName.trim()))) {
    return { error: "Enter a non-empty frontmatter key without leading or trailing spaces." };
  }
  let fieldValue = request.fieldValue;
  if (!isRemove && request.fieldValueFormat === "yaml") {
    if (typeof fieldValue !== "string") {
      return { error: "The YAML field value must be text." };
    }
    const parsed = parseYamlValue(fieldValue);
    if (parsed.valid) {
      fieldValue = parsed.value;
    } else if (request.flush !== true) {
      return { error: `Invalid YAML value: ${parsed.error}` };
    }
  }
  const schemaFound = frontmatter?.schemaFound === true;
  const flushed = request.flush === true;
  if (!isAdd && !isRemove && newFieldName === undefined && !flushed
    && !frontmatterValueMatchesField(currentField, fieldValue, schemaFound)) {
    return { error: FRONTMATTER_STALE };
  }
  // With a schema the table lists the fields in schema order, so the new key goes where its row
  // will be shown. Without one, the table follows the source and the clicked row decides.
  const clickedAfterField = request.afterField !== undefined
    && frontmatter?.fields.some((candidate) => candidate.name === request.afterField)
    ? { afterField: request.afterField }
    : undefined;
  const addPlacement = isAdd
    ? schemaFound && frontmatter?.availableKeys
      ? frontmatterAddPlacement(
        Object.keys(extractFrontmatter(sourceText).frontmatter ?? {}),
        frontmatter.availableKeys,
        fieldName,
      )
      : clickedAfterField
    : undefined;
  // Only the empty string a just-added custom key holds may be rewritten as a plain scalar.
  const plainScalar = !isAdd && !isRemove && newFieldName === undefined
    && request.fieldValueStyle === "plain"
    && currentField.value === ""
    && typeof fieldValue === "string";
  const patch = isRemove
    ? createFrontmatterFieldRemovePatch(sourceText, fieldName)
    : isAdd
      ? createFrontmatterFieldPatch(sourceText, fieldName, fieldValue, addPlacement)
      : newFieldName === undefined
        ? createFrontmatterFieldPatch(
          sourceText,
          currentField.name,
          fieldValue,
          plainScalar ? { plainScalar: true } : undefined,
        )
        : createFrontmatterFieldRenamePatch(sourceText, currentField.name, newFieldName);
  if (!patch) {
    const duplicateName = isAdd ? fieldName : newFieldName;
    const duplicate = duplicateName !== undefined
      && frontmatter?.fields.some((candidate) => candidate.name === duplicateName);
    return {
      error: duplicate
        ? `A frontmatter field named "${duplicateName}" already exists.`
        : "The frontmatter YAML could not be updated.",
    };
  }
  return {
    edit: { start: patch.start, end: patch.end, text: patch.text },
    candidateSource: sourceText.slice(0, patch.start) + patch.text + sourceText.slice(patch.end),
    targetFieldName: isRemove ? undefined : isAdd ? fieldName : newFieldName ?? currentField.name,
    fieldValue,
    needsSchemaCheck: schemaFound && !flushed,
    isRemove,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-029
/**
 * Checks the frontmatter analysis of a planned save's `candidateSource`: a remove must not make a
 * required field missing that was present before (`before`: the analysis the table was built
 * from); any other save must leave its field present, without a schema error (link checks aside)
 * and with a value of the field's type. Returns the refusal, or undefined when the save may go in.
 */
export function checkFrontmatterCandidate(
  plan: FrontmatterSavePlan,
  candidate: FrontmatterResult,
  before: FrontmatterResult | undefined,
): FrontmatterSaveError | undefined {
  if (plan.isRemove) {
    const existingMissing = new Set(before?.missingRequiredFields ?? []);
    const newlyMissing = candidate.missingRequiredFields.find((name) => !existingMissing.has(name));
    return newlyMissing ? { error: `Cannot remove required frontmatter field "${newlyMissing}".` } : undefined;
  }
  const candidateField = candidate.fields.find((entry) => entry.name === plan.targetFieldName);
  if (!candidateField) {
    return { error: "The renamed frontmatter field could not be validated." };
  }
  const validationError = candidateField.issues.find((issue) => issue.severity === "error" && issue.origin !== "link");
  if (validationError) {
    return { error: `Schema validation failed: ${validationError.message}` };
  }
  if (!frontmatterValueMatchesField(candidateField, plan.fieldValue, candidate.schemaFound)) {
    return { error: FRONTMATTER_STALE };
  }
  return undefined;
}
