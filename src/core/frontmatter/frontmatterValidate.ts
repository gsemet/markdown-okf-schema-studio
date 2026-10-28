/**
 * Frontmatter validation model: the field entries and issues of the properties table, the display
 * type of a field, and the schema rules (effective properties of composed schemas, enums, nullable
 * fields, defaults, docs) that turn a frontmatter mapping into table rows. Pure: the schema comes
 * already resolved (see `okfFrontmatter.ts`).
 */

import type { FrontmatterLinkResult } from "./fileLinks";
import { validateWithCachedValidator } from "./schemaValidator";

/** How serious a frontmatter issue is. */
export type ValidationSeverity = "info" | "warning" | "error";

/** One issue of a field or of the whole frontmatter: from the schema, or from a link check. */
export interface FieldIssue {
  severity: ValidationSeverity;
  message: string;
  origin?: "schema" | "link";
}

/** One row of the properties table: a field, its value, its schema facts and its issues. */
export interface FieldEntry {
  name: string;
  value: unknown;
  valueKind: "scalar" | "list" | "null";
  nullable: boolean;
  /** Obsidian-like field type used to pick the type icon in the table. */
  fieldType: FieldType;
  doc: { title?: string; description?: string } | null;
  enums: string[] | null;
  issues: FieldIssue[];
  known: boolean;
  /** True when the effective schema requires this field; such a field cannot be removed. */
  required?: boolean;
  linkResults?: FrontmatterLinkResult[];
  /** Known Markdown filename stems, set only for filename-stem link fields after link inspection. */
  linkSuggestions?: string[];
  /** The source lines of the field (1-based, whole file); set by `analyzeFrontmatter`. */
  sourceLines?: { start: number; end: number };
}

/**
 * Obsidian-like property types. The icon in the table is chosen from this
 * union; enums show the list-with-arrow icon, booleans the checkbox.
 */
export type FieldType =
  | "text"
  | "number"
  | "list"
  | "checkbox"
  | "enum"
  | "date"
  | "time"
  | "datetime"
  | "unknown";

/**
 * Maps a schema property declaration (or, when no schema matched, the YAML
 * value itself) to a display type for the table icon.
 */
export function fieldIconType(
  property: unknown,
  value: unknown,
  enums: string[] | null,
): FieldType {
  const record = property && typeof property === "object"
    ? property as Record<string, unknown>
    : undefined;
  if (record) {
    if (record.enum !== undefined || record.const !== undefined) {
      return "enum";
    }
    if (typeof record.format === "string") {
      const format = record.format.toLowerCase();
      if (format === "date-time" || format === "datetime") {
        return "datetime";
      }
      if (format === "date") {
        return "date";
      }
      if (format === "time") {
        return "time";
      }
    }
    const type = record.type;
    if (Array.isArray(type)) {
      const primary = type.find((entry) => entry !== "null");
      if (primary === "boolean") return "checkbox";
      if (primary === "number" || primary === "integer") return "number";
      if (primary === "array") return "list";
      if (primary === "string") return "text";
    } else if (typeof type === "string") {
      if (type === "boolean") return "checkbox";
      if (type === "number" || type === "integer") return "number";
      if (type === "array") return "list";
      if (type === "string") return "text";
    }
    if (Array.isArray(record.allOf) || Array.isArray(record.anyOf) || Array.isArray(record.oneOf)) {
      return "unknown";
    }
  }
  if (enums && enums.length > 0) {
    return "enum";
  }
  if (typeof value === "boolean") {
    return "checkbox";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (Array.isArray(value)) {
    return "list";
  }
  return "unknown";
}

/** The frontmatter analysis of a document: the payload of the properties table. */
export interface FrontmatterResult {
  present: boolean;
  fields: FieldEntry[];
  availableKeys?: string[];
  availableFields?: AvailableFieldEntry[];
  orderMode: "schema" | "yaml";
  schemaFound: boolean;
  missingRequiredFields: string[];
  info: FieldIssue[];
  summary: { errors: number; warnings: number; infos: number };
  linkResults?: FrontmatterLinkResult[];
  /** False only when the matched schema root declares `additionalProperties: false`. */
  additionalPropertiesAllowed?: boolean;
}

/** A schema field the document does not set yet, offered by the Add field menu. */
export interface AvailableFieldEntry {
  name: string;
  fieldType: FieldType;
  enums: string[] | null;
  defaultValue?: unknown;
}

/** The properties of a schema with its composition keywords collapsed, in reading order. */
export interface EffectiveSchema {
  properties: Record<string, unknown>;
  order: string[];
  required: Set<string>;
  nullable: Set<string>;
}

/** Collapses allOf/anyOf/oneOf property branches into one effective schema. */
export function effectiveProperties(
  schema: Record<string, unknown>,
  frontmatter: Record<string, unknown> = {},
): EffectiveSchema {
  // Null prototype: a field named `constructor` or `toString` must not read an inherited member.
  const properties: Record<string, unknown> = Object.create(null);
  const order: string[] = [];
  const required = new Set<string>();
  const nullable = new Set<string>();
  const branches: unknown[] = [schema];
  let cursor = 0;
  while (cursor < branches.length) {
    const branch = branches[cursor];
    cursor += 1;
    if (!branch || typeof branch !== "object") {
      continue;
    }
    const record = branch as Record<string, unknown>;
    // Nested composition keywords are visited depth-first in declaration
    // order so property order matches the schema's reading order.
    for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
      const composed = record[keyword];
      if (Array.isArray(composed)) {
        branches.push(...composed);
      }
    }
    if (Object.hasOwn(record, "if")) {
      let matches: boolean | undefined;
      try {
        matches = validateWithCachedValidator(record.if, frontmatter);
      } catch {
        matches = undefined;
      }
      if (matches !== undefined) {
        branches.push(matches ? record.then : record.else);
      }
    }
    if (record.properties && typeof record.properties === "object") {
      for (const [name, property] of Object.entries(record.properties as Record<string, unknown>)) {
        if (schemaAllowsNull(property)) {
          nullable.add(name);
        }
        if (!Object.hasOwn(properties, name)) {
          order.push(name);
        }
        const existing = properties[name];
        properties[name] = existing && typeof existing === "object"
          && property && typeof property === "object"
          ? { ...existing, ...property }
          : property;
      }
    }
    if (Array.isArray(record.required)) {
      for (const name of record.required) {
        if (typeof name === "string") {
          required.add(name);
        }
      }
    }
  }
  return { properties, order, required, nullable };
}

/** The allowed values of a property (`enum` then `const`), as strings; null when it has none. */
export function enumsOf(property: unknown): string[] | null {
  if (!property || typeof property !== "object") {
    return null;
  }
  const record = property as Record<string, unknown>;
  const values: string[] = [];
  if (Array.isArray(record.enum)) {
    values.push(...record.enum.map((item) => String(item)));
  }
  if (Object.hasOwn(record, "const") && record.const !== undefined && record.const !== null) {
    values.push(String(record.const));
  }
  return values.length > 0 ? values : null;
}

function schemaAllowsNull(property: unknown): boolean {
  if (!property || typeof property !== "object") {
    return false;
  }
  const record = property as Record<string, unknown>;
  if (record.nullable === true || record.type === "null") {
    return true;
  }
  if (Array.isArray(record.type) && record.type.includes("null")) {
    return true;
  }
  if (Array.isArray(record.enum) && record.enum.includes(null)) {
    return true;
  }
  return ["anyOf", "oneOf"].some((keyword) =>
    Array.isArray(record[keyword]) && record[keyword].some(schemaAllowsNull));
}

/** The value a new field starts with: the schema default, the first enum value, or one per type. */
export function defaultValueOf(
  property: unknown,
  fieldType: FieldType,
  enums: string[] | null,
): unknown {
  if (property && typeof property === "object") {
    const record = property as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(record, "default")) {
      return record.default;
    }
  }
  if (enums && enums.length > 0) return enums[0];
  switch (fieldType) {
    case "checkbox":
      return false;
    case "number":
      return 0;
    case "list":
      return [];
    case "text":
    case "date":
    case "time":
    case "datetime":
      return "";
    default:
      return null;
  }
}

/** The title and description of a property; null when it has neither. */
export function docOf(property: unknown): { title?: string; description?: string } | null {
  if (!property || typeof property !== "object") {
    return null;
  }
  const record = property as Record<string, unknown>;
  const doc: { title?: string; description?: string } = {};
  if (typeof record.title === "string") {
    doc.title = record.title;
  }
  if (typeof record.description === "string") {
    doc.description = record.description;
  }
  return doc.title || doc.description ? doc : null;
}

function valueKindOf(value: unknown): FieldEntry["valueKind"] {
  if (value === null || value === undefined) {
    return "null";
  }
  return Array.isArray(value) ? "list" : "scalar";
}

function isFilenameStemAnnotation(schema: unknown): boolean {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;
  const annotation = (schema as Record<string, unknown>)["x-okf-link"];
  return !!annotation && typeof annotation === "object" && !Array.isArray(annotation)
    && (annotation as Record<string, unknown>).resolution === "filename-stem";
}

/** True when a field, or the items of a list field, resolves links by filename stem. */
export function fieldUsesFilenameStemLinks(property: unknown): boolean {
  if (!property || typeof property !== "object" || Array.isArray(property)) return false;
  return isFilenameStemAnnotation(property)
    || isFilenameStemAnnotation((property as Record<string, unknown>).items);
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-029
// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-084
// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
/**
 * The table rows of a frontmatter mapping: schema fields in schema order, then unknown fields in
 * YAML order (warned about when `strict`), each with its link results and their issues.
 */
export function fieldsFromYaml(
  frontmatter: Record<string, unknown>,
  effective: EffectiveSchema | undefined,
  strict: boolean,
  linkResults: readonly FrontmatterLinkResult[] = [],
): FieldEntry[] {
  const entries: FieldEntry[] = [];
  const emit = (name: string, known: boolean) => {
    const property = effective?.properties[name];
    const issueList: FieldIssue[] = [];
    if (effective && !known && strict) {
      issueList.push({
        severity: "warning",
        message: `Unknown field; it is not declared in the "${String(frontmatter.type ?? "schema")}" schema.`,
      });
    }
    const fieldLinks = linkResults.filter((link) =>
      link.fieldPath === name
      || link.fieldPath.startsWith(`${name}[`)
      || link.fieldPath.startsWith(`${name}.`));
    issueList.push(...fieldLinks
      .filter((link) => link.severity !== undefined && link.code !== undefined)
      .map((link) => ({
        severity: link.severity === "error" ? "error" as const : "warning" as const,
        message: `[${link.code}] ${link.message}`,
          origin: "link" as const,
      })));
    entries.push({
      name,
      value: frontmatter[name],
      valueKind: valueKindOf(frontmatter[name]),
      nullable: effective?.nullable.has(name) ?? false,
      fieldType: fieldIconType(property, frontmatter[name], property ? enumsOf(property) : null),
      doc: property ? docOf(property) : null,
      enums: property ? enumsOf(property) : null,
      issues: issueList,
      known,
      ...(effective?.required.has(name) ? { required: true } : {}),
      linkResults: fieldLinks,
    });
  };
  if (effective) {
    for (const name of effective.order) {
      if (Object.hasOwn(frontmatter, name)) {
        emit(name, true);
      }
    }
    for (const name of Object.keys(frontmatter)) {
      if (!Object.hasOwn(effective.properties, name)) {
        emit(name, false);
      }
    }
  } else {
    for (const name of Object.keys(frontmatter)) {
      emit(name, false);
    }
  }
  return entries;
}
