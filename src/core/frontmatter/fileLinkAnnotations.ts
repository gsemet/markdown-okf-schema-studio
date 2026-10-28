/**
 * The schema side of frontmatter file links: the `x-okf-link` annotations of a schema that apply
 * to a frontmatter value, the annotation and the link value parsed, and the diagnostics of a bad
 * one. Pure: no file access (resolution against the disk stays in `fileLinks.ts`).
 */

import {
  FILE_LINK_RESOLUTIONS,
  FILE_LINK_SYNTAXES,
  type FileLinkResolution,
  type FileLinkSyntax,
} from "./fileLinkTypes";
import { getCachedBranchValidator } from "./schemaValidator";

export interface ParsedLink {
  target: string;
  query: string | undefined;
  fragment: string | undefined;
  label: string | undefined;
}

export interface ParsedAnnotation {
  resolution: FileLinkResolution;
  syntax: FileLinkSyntax;
  basenameMarker?: string;
  idMarker?: string;
  tooltipShowsFields?: string[];
  previewShowsFields?: string[];
  showLineNumber?: boolean;
}

export interface AnnotationValue {
  annotation: unknown;
  value: unknown;
  fieldPath: string;
  arrayIndex: number | undefined;
}

export interface LinkError {
  code: "E10" | "W15";
  severity: "error" | "warning";
  message: string;
}

function fieldPath(pathParts: (string | number)[]): string {
  let result = "";
  for (const part of pathParts) {
    result += typeof part === "number" ? `[${part}]` : result ? `.${part}` : part;
  }
  return result || "<root>";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function localRef(rootSchema: Record<string, unknown>, reference: string): unknown {
  if (reference === "#") return rootSchema;
  if (!reference.startsWith("#/")) return undefined;
  let current: unknown = rootSchema;
  for (const rawPart of reference.slice(2).split("/")) {
    const part = rawPart.replace(/~1/gu, "/").replace(/~0/gu, "~");
    if (Array.isArray(current) && /^\d+$/u.test(part)) {
      current = current[Number(part)];
    } else if (isRecord(current)) {
      current = current[part];
    } else {
      return undefined;
    }
    if (current === undefined) return undefined;
  }
  return current;
}

function valueMatchesSchema(
  value: unknown,
  schema: unknown,
  rootSchema: Record<string, unknown>,
): boolean {
  if (schema === true) return true;
  if (schema === false || !isRecord(schema)) return false;
  try {
    const activeRefs = new Set<string>();
    const expandLocalRefs = (candidate: unknown): unknown => {
      if (Array.isArray(candidate)) return candidate.map(expandLocalRefs);
      if (!isRecord(candidate)) return candidate;
      const reference = candidate.$ref;
      if (typeof reference === "string" && reference.startsWith("#/")) {
        const resolved = localRef(rootSchema, reference);
        if (resolved !== undefined && !activeRefs.has(reference)) {
          const siblings = Object.fromEntries(
            Object.entries(candidate).filter(([key]) => key !== "$ref"),
          );
          if (typeof resolved === "boolean") {
            if (!resolved || Object.keys(siblings).length === 0) return resolved;
            return expandLocalRefs(siblings);
          }
          if (isRecord(resolved)) {
            activeRefs.add(reference);
            const expanded = expandLocalRefs({ ...resolved, ...siblings });
            activeRefs.delete(reference);
            return expanded;
          }
        }
      }
      return Object.fromEntries(
        Object.entries(candidate).map(([key, value]) => [key, expandLocalRefs(value)]),
      );
    };
    const branch = expandLocalRefs(schema);
    if (typeof schema !== "object" || schema === null) return false;
    return getCachedBranchValidator(schema, rootSchema, branch)(value) === true;
  } catch {
    return false;
  }
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-046
export function iterAnnotations(
  schema: unknown,
  value: unknown,
  pathParts: (string | number)[],
  rootSchema: Record<string, unknown>,
  activeRefs: Set<string>,
): AnnotationValue[] {
  if (!isRecord(schema)) return [];
  const results: AnnotationValue[] = [];
  const reference = schema.$ref;
  if (typeof reference === "string") {
    const referenceKey = `${reference}:${fieldPath(pathParts)}`;
    const resolved = localRef(rootSchema, reference);
    if (resolved !== undefined && !activeRefs.has(referenceKey)) {
      results.push(...iterAnnotations(
        resolved, value, pathParts, rootSchema, new Set(activeRefs).add(referenceKey),
      ));
    }
    const siblings = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$ref"));
    if (Object.keys(siblings).length > 0) {
      results.push(...iterAnnotations(siblings, value, pathParts, rootSchema, activeRefs));
    }
    return results;
  }
  if (Object.prototype.hasOwnProperty.call(schema, "x-okf-link")) {
    results.push({
      annotation: schema["x-okf-link"],
      value,
      fieldPath: fieldPath(pathParts),
      arrayIndex: pathParts.length > 0 && typeof pathParts[pathParts.length - 1] === "number"
        ? pathParts[pathParts.length - 1] as number
        : undefined,
    });
  }
  if (isRecord(schema.properties) && isRecord(value)) {
    for (const [name, child] of Object.entries(schema.properties)) {
      if (Object.hasOwn(value, name)) {
        results.push(...iterAnnotations(
          child, value[name], [...pathParts, name], rootSchema, activeRefs,
        ));
      }
    }
  }
  if (isRecord(value)) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const patterns = isRecord(schema.patternProperties) ? schema.patternProperties : {};
    const covered = new Set(Object.keys(properties));
    for (const [pattern, child] of Object.entries(patterns)) {
      let expression: RegExp;
      try {
        expression = new RegExp(pattern, "u");
      } catch {
        continue;
      }
      for (const name of Object.keys(value)) {
        if (!expression.test(name)) continue;
        covered.add(name);
        results.push(...iterAnnotations(
          child, value[name], [...pathParts, name], rootSchema, activeRefs,
        ));
      }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      for (const [name, childValue] of Object.entries(value)) {
        if (covered.has(name)) continue;
        results.push(...iterAnnotations(
          schema.additionalProperties,
          childValue,
          [...pathParts, name],
          rootSchema,
          activeRefs,
        ));
      }
    }
  }
  if (Array.isArray(value)) {
    const prefixItems = Array.isArray(schema.prefixItems) ? schema.prefixItems : [];
    if (isRecord(schema.items)) {
      value.slice(prefixItems.length).forEach((item, offset) => {
        const index = offset + prefixItems.length;
        results.push(...iterAnnotations(
          schema.items, item, [...pathParts, index], rootSchema, activeRefs,
        ));
      });
    } else if (Array.isArray(schema.items)) {
      schema.items.forEach((child, index) => {
        if (index < value.length) {
          results.push(...iterAnnotations(
            child, value[index], [...pathParts, index], rootSchema, activeRefs,
          ));
        }
      });
    }
    if (prefixItems.length > 0) {
      prefixItems.forEach((child, index) => {
        if (index < value.length) {
          results.push(...iterAnnotations(
            child, value[index], [...pathParts, index], rootSchema, activeRefs,
          ));
        }
      });
    }
  }
  for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
    const branches = schema[keyword];
    if (!Array.isArray(branches)) continue;
    const matchingBranches = keyword === "allOf"
      ? branches
      : branches.filter((branch) => valueMatchesSchema(value, branch, rootSchema));
    if (keyword === "oneOf" && matchingBranches.length !== 1) continue;
    for (const branch of matchingBranches) {
      results.push(...iterAnnotations(branch, value, pathParts, rootSchema, activeRefs));
    }
  }
  if (Object.prototype.hasOwnProperty.call(schema, "if")) {
    const conditional = valueMatchesSchema(value, schema.if, rootSchema);
    const branch = conditional ? schema.then : schema.else;
    if (branch !== undefined) {
      results.push(...iterAnnotations(branch, value, pathParts, rootSchema, activeRefs));
    }
  }
  return results;
}

export function diagnostic(code: "E10" | "W15", field: string, message: string): LinkError {
  return {
    code,
    severity: code === "E10" ? "error" : "warning",
    message: code === "E10"
      ? `${message} at '${field}'`
      : `Skipped file-link check at '${field}': ${message}`,
  };
}

export function parseAnnotation(annotation: unknown, field: string): ParsedAnnotation | LinkError {
  if (!isRecord(annotation)) return diagnostic("E10", field, "x-okf-link must be an object");
  const resolution = annotation.resolution;
  const syntax = annotation.syntax;
  if (!FILE_LINK_RESOLUTIONS.includes(resolution as FileLinkResolution)) {
    return diagnostic("E10", field, `x-okf-link resolution is invalid`);
  }
  if (!FILE_LINK_SYNTAXES.includes(syntax as FileLinkSyntax)) {
    return diagnostic("E10", field, "x-okf-link syntax is invalid");
  }
  const basenameMarker = annotation.basename_marker;
  if (basenameMarker !== undefined && typeof basenameMarker !== "string") {
    return diagnostic("E10", field, "x-okf-link basename_marker is invalid");
  }
  const idMarker = annotation.id_marker;
  if (idMarker !== undefined && typeof idMarker !== "string") {
    return diagnostic("E10", field, "x-okf-link id_marker is invalid");
  }
  const fieldLists: Record<string, string[]> = {};
  for (const key of ["tooltip_shows_fields", "preview_shows_fields"]) {
    const value = annotation[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string" && entry.trim())) {
      return diagnostic("E10", field, `x-okf-link ${key} must be a list of field names`);
    }
    fieldLists[key] = value;
  }
  if (annotation.show_line_number !== undefined && typeof annotation.show_line_number !== "boolean") {
    return diagnostic("E10", field, "x-okf-link show_line_number must be a boolean");
  }
  return {
    resolution: resolution as FileLinkResolution,
    syntax: syntax as FileLinkSyntax,
    ...(basenameMarker !== undefined ? { basenameMarker } : {}),
    ...(idMarker !== undefined ? { idMarker } : {}),
    tooltipShowsFields: fieldLists.tooltip_shows_fields,
    previewShowsFields: fieldLists.preview_shows_fields,
    showLineNumber: annotation.show_line_number as boolean | undefined,
  };
}

export function parseLink(value: unknown, syntax: FileLinkSyntax, field: string): ParsedLink | LinkError {
  if (typeof value !== "string") return diagnostic("E10", field, "file-link value must be a string");
  let content = value;
  let label: string | undefined;
  if (syntax === "wikilink") {
    if (!value.startsWith("[[") || !value.endsWith("]]")) {
      return diagnostic("E10", field, "wikilink value has invalid syntax");
    }
    const inner = value.slice(2, -2);
    const separator = inner.indexOf("|");
    content = separator < 0 ? inner : inner.slice(0, separator);
    label = separator < 0 ? undefined : inner.slice(separator + 1);
  }
  const fragmentIndex = content.indexOf("#");
  const pathAndQuery = fragmentIndex < 0 ? content : content.slice(0, fragmentIndex);
  const fragment = fragmentIndex < 0 ? undefined : content.slice(fragmentIndex + 1);
  const queryIndex = pathAndQuery.indexOf("?");
  const target = (queryIndex < 0 ? pathAndQuery : pathAndQuery.slice(0, queryIndex)).trim();
  const query = queryIndex < 0 ? undefined : pathAndQuery.slice(queryIndex + 1);
  if (!target) return diagnostic("E10", field, "file-link target is empty");
  return { target, query, fragment, label };
}
