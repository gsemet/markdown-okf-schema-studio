/**
 * OKF frontmatter awareness for the MyST preview.
 *
 * Extracts YAML frontmatter, discovers the OKF schema of the enclosing bundle
 * (nearest `_schema`/`_schemas` ancestor directory), and validates the
 * frontmatter against it with JSON Schema Draft 2020-12. The result is a
 * structured payload injected into the preview webview, which renders the
 * Obsidian-style properties table with validation overlays.
 *
 * This module holds the schema discovery (through the {@link SchemaFiles} port, so the core reads
 * no file itself) and the analysis; parsing, validation rules and serialization live in
 * `frontmatterParse.ts`, `frontmatterValidate.ts` and `frontmatterSerialize.ts`, re-exported here.
 */

import * as path from "../path/hostPath";
import { parseDocument } from "yaml";
import type { FileLinkInspectionOptions, FrontmatterLinkResult } from "./fileLinkTypes";
import {
  inspectFrontmatterLinks,
  filenameStemSuggestions,
  pendingFrontmatterLinks,
} from "./fileLinks";
import { frontmatterEndLine, frontmatterFieldLines } from "./frontmatterChanges";
import { extractFrontmatter, extractFrontmatterShared, stripJson5Comments } from "./frontmatterParse";
import {
  defaultValueOf,
  docOf,
  effectiveProperties,
  enumsOf,
  fieldIconType,
  fieldsFromYaml,
  fieldUsesFilenameStemLinks,
  type AvailableFieldEntry,
  type FieldIssue,
  type FrontmatterResult,
} from "./frontmatterValidate";
import type { LinkFiles } from "./linkFiles";
import type { SchemaFiles } from "./schemaFiles";
import { getResolvedSchema, resetSchemaRegistryForTests, type SchemaDependencyCheck } from "./schemaRegistry";
import { getCachedValidator } from "./schemaValidator";

export {
  extractFrontmatter,
  matchFrontmatterBlock,
  parseYamlValue,
  type FrontmatterBlock,
  type FrontmatterExtraction,
  type ParsedYamlValue,
} from "./frontmatterParse";
export {
  effectiveProperties,
  fieldIconType,
  type AvailableFieldEntry,
  type FieldEntry,
  type FieldIssue,
  type FieldType,
  type FrontmatterResult,
  type ValidationSeverity,
} from "./frontmatterValidate";
export {
  createFrontmatterFieldPatch,
  createFrontmatterFieldRemovePatch,
  createFrontmatterFieldRenamePatch,
  frontmatterAddPlacement,
  guardedPatch,
  isPlainSafeScalar,
  type FrontmatterFieldPatch,
} from "./frontmatterSerialize";
export type { SchemaFiles } from "./schemaFiles";

/** The names of a bundle's schema directory, in order of preference at each level. */
 const SCHEMA_DIRECTORIES = ["_schema", "_schemas"] as const;
/** The extensions of schema files (`<type>.schema<extension>`). */
 const SCHEMA_FILE_EXTENSIONS = [".json", ".json5", ".yaml", ".yml"] as const;

/** Returns the identity used by an x-okf-link marker hint. */
export function frontmatterLinkIdentity(
  source: string,
  filePath: string,
  idMarker?: string,
): string | undefined {
  if (idMarker !== undefined && idMarker.trim()) {
    const value = extractFrontmatter(source).frontmatter?.[idMarker];
    return typeof value === "string" && value.trim() ? value : undefined;
  }
  return path.basename(filePath, path.extname(filePath));
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-019
/**
 * Finds the schema directory for a file: walks ancestors and returns the
 * first directory named `_schema` or `_schemas` (with `_schema` preferred at
 * each level). Search stops at the filesystem root or at `stopDir` (exclusive).
 */
export function findSchemaDirectory(files: SchemaFiles, filePath: string, stopDir?: string): string | undefined {
  let dir = path.dirname(path.resolve(filePath));
  const stop = stopDir ? path.resolve(stopDir) : path.parse(dir).root;
  for (;;) {
    for (const name of SCHEMA_DIRECTORIES) {
      const candidate = path.join(dir, name);
      if (files.isDirectory(candidate)) {
        return candidate;
      }
    }
    if (dir === stop || path.dirname(dir) === dir) {
      return undefined;
    }
    dir = path.dirname(dir);
  }
}

/** A schema file that matches a type value, with its extension (which picks the parser). */
export interface SchemaCandidate {
  path: string;
  extension: string;
}

/** Case-folds only the part before `.schema` when matching a type value. */
export function matchSchemaFile(
  files: SchemaFiles,
  schemaDir: string,
  typeValue: string,
): SchemaCandidate | undefined {
  const wanted = typeValue.toLowerCase();
  // Prefer .yaml, then .yml, .json, .json5 — the dominant convention in bundles.
  const extensionPreference = [".yaml", ".yml", ".json", ".json5"] as const;
  let best: SchemaCandidate | undefined;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (const name of files.listFiles(schemaDir)) {
    for (const extension of SCHEMA_FILE_EXTENSIONS) {
      if (!name.toLowerCase().endsWith(`.schema${extension}`)) {
        continue;
      }
      const stem = name.slice(0, name.length - `.schema${extension}`.length).toLowerCase();
      if (stem !== wanted) {
        continue;
      }
      const priority = extensionPreference.indexOf(extension);
      if (priority < bestPriority) {
        best = { path: path.join(schemaDir, name), extension };
        bestPriority = priority;
      }
    }
  }
  return best;
}

let fileReader: ((schemaPath: string) => string) | undefined;

/** Test hook: replaces the text of every schema file read (undefined restores the port's reads). */
export function setSchemaFileReaderForTests(reader: ((schemaPath: string) => string) | undefined): void {
  fileReader = reader;
  resetSchemaRegistryForTests();
}


// While a schema is being resolved, every file read and `$ref` probe registers a re-check here so
// the registry can tell whether the cached result is still exact.
let activeDependencies: SchemaDependencyCheck[] | undefined;

function readSchemaFile(files: SchemaFiles, schemaPath: string): string {
  const read = (): string => (fileReader ? fileReader(schemaPath) : files.readText(schemaPath));
  const text = read();
  activeDependencies?.push(() => {
    try {
      return read() === text;
    } catch {
      return false;
    }
  });
  return text;
}


// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-023
function parseSchemaFile(files: SchemaFiles, candidate: SchemaCandidate): Record<string, unknown> {
  const raw = readSchemaFile(files, candidate.path);
  if (candidate.extension === ".json" || candidate.extension === ".json5") {
    const stripped = stripJson5Comments(raw);
    return JSON.parse(stripped) as Record<string, unknown>;
  }
  // An empty or comment-only YAML file parses to null: the schema has no content yet.
  return parseDocument(raw).toJS() as Record<string, unknown>;
}

/** True for a parsed schema with no content (an empty or comment-only file). */
function isEmptySchema(schema: unknown): boolean {
  return schema === null || schema === undefined;
}

const REF_SUFFIX_FALLBACKS = ["", ".json", ".json5", ".yaml", ".yml"] as const;

function refTargetExists(files: SchemaFiles, schemaDir: string, ref: string): string | undefined {
  const base = ref.split("#", 1)[0];
  if (!base) {
    return undefined;
  }
  for (const suffix of REF_SUFFIX_FALLBACKS) {
    const candidate = path.resolve(schemaDir, `${base}${suffix}`);
    const exists = files.isFile(candidate);
    activeDependencies?.push(() => files.isFile(candidate) === exists);
    if (exists) {
      return candidate;
    }
  }
  return undefined;
}

function resolveCandidateSchema(files: SchemaFiles, candidate: SchemaCandidate): Record<string, unknown> {
  return getResolvedSchema(candidate.path, (dependencies) => {
    const outer = activeDependencies;
    activeDependencies = dependencies;
    try {
      return resolveSchemaRefs(files, parseSchemaFile(files, candidate), path.dirname(candidate.path));
    } finally {
      activeDependencies = outer;
    }
  });
}

function fileExistsForTests(files: SchemaFiles, schemaDir: string, ref: string): string | undefined {
  return refTargetExists(files, schemaDir, ref);
}

/**
 * Recursively inlines relative `$ref`s inside the schema directory, the same
 * way `okf-schema` resolves `base.schema.yaml`-style references. Cycles are
 * broken by keeping the first (already-inlined) copy.
 */
export function resolveSchemaRefs(
  files: SchemaFiles,
  schema: unknown,
  schemaDir: string,
  seen: Set<string> = new Set(),
): Record<string, unknown> {
  const inlineRef = (ref: string): unknown => {
    const base = ref.split("#", 1)[0];
    const pointer = ref.slice(base.length) || "#";
    if (!base) {
      return { $ref: pointer };
    }
    const target = fileExistsForTests(files, schemaDir, base);
    if (!target || seen.has(target)) {
      return { $ref: pointer };
    }
    seen.add(target);
    const parsed = parseSchemaFile(files, { path: target, extension: path.extname(target) });
    let node: unknown = parsed;
    if (pointer.length > 1) {
      node = lookupJsonPointer(parsed, pointer.slice(1));
    }
    return resolveSchemaRefs(files, node, schemaDir, seen);
  };

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (!node || typeof node !== "object") {
      return node;
    }
    const record = node as Record<string, unknown>;
    // A node that is exactly a {$ref: "..."} reference is replaced wholesale
    // by the referenced schema fragment, not wrapped under a "$ref" key.
    const keys = Object.keys(record);
    if (keys.length === 1 && keys[0] === "$ref" && typeof record.$ref === "string") {
      return inlineRef(record.$ref);
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = walk(value);
    }
    return result;
  };
  return walk(schema) as Record<string, unknown>;
}

function lookupJsonPointer(root: unknown, pointer: string): unknown {
  const segments = pointer.split("/").map((segment) => segment.replace(/~1/gu, "/").replace(/~0/gu, "~"));
  let node: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(node) && /^\d+$/u.test(segment)) {
      node = node[Number(segment)];
    } else if (node && typeof node === "object") {
      node = (node as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return node;
}

/** What {@link analyzeFrontmatter} reads: the document, where to look for its schema, and how. */
export interface FrontmatterOptions {
  /** The schema files of the bundle: the host's port (Node's file system in a Node host). */
  schemaFiles: SchemaFiles;
  filePath: string;
  sourceText: string;
  /** Stop walking ancestors at this directory (exclusive). */
  stopDir?: string;
  /** Skip project schema discovery when the source has no trusted root. */
  allowSchemaResolution?: boolean;
  /** Skip filesystem-backed link inspection for the first-paint table. */
  inspectLinks?: boolean;
  strictAdditionalProperties: boolean;
  schemaDirOverride?: string;
  bundleRoot?: string;
  projectRoot?: string;
  workspaceRoots?: readonly string[];
  allowOutsideWorkspaceLinks?: boolean;
}

/** What {@link analyzeFrontmatterWithLinks} reads: {@link FrontmatterOptions} and the files the links resolve through. */
export interface FrontmatterWithLinksOptions extends FrontmatterOptions {
  /** The file access of the link inspection (the host's `FileSystem` satisfies it). */
  files: LinkFiles;
}

/**
 * Builds the webview payload for a document's frontmatter, without looking up any link target: the
 * links that parse are `pending`, and no stem suggestion is made. Synchronous (the first paint,
 * the refresh, the save validation). {@link analyzeFrontmatterWithLinks} resolves the links.
 */
export function analyzeFrontmatter(options: Omit<FrontmatterOptions, "inspectLinks"> & { inspectLinks?: false }): FrontmatterResult {
  const prepared = prepareAnalysis(options);
  if (!("effective" in prepared)) return withSourceLines(prepared, options.sourceText);
  const linkResults = pendingFrontmatterLinks(prepared.frontmatter, prepared.schema);
  const fields = buildFields(prepared, options.strictAdditionalProperties, linkResults);
  return withSourceLines(completeAnalysis(prepared, fields, linkResults), options.sourceText);
}

/**
 * Builds the webview payload with the links resolved (and, with `inspectLinks: true`, the stem
 * suggestions of the filename-stem fields), reading files only through `options.files`.
 */
export async function analyzeFrontmatterWithLinks(options: FrontmatterWithLinksOptions): Promise<FrontmatterResult> {
  const prepared = prepareAnalysis(options);
  if (!("effective" in prepared)) return withSourceLines(prepared, options.sourceText);
  const inspection: FileLinkInspectionOptions = { ...prepared.linkInspectionOptions, files: options.files };
  const linkResults = options.inspectLinks === false
    ? pendingFrontmatterLinks(prepared.frontmatter, prepared.schema)
    : await inspectFrontmatterLinks(prepared.frontmatter, prepared.schema, inspection);
  const fields = buildFields(prepared, options.strictAdditionalProperties, linkResults);
  if (options.inspectLinks === true) {
    let stems: Awaited<ReturnType<typeof filenameStemSuggestions>> | undefined;
    for (const field of fields) {
      if (!fieldUsesFilenameStemLinks(prepared.effective.properties[field.name])) continue;
      stems ??= await filenameStemSuggestions(inspection);
      if (stems.suggestions.length > 0) {
        field.linkSuggestions = stems.suggestions;
        // Only a capped dropdown needs the full list; otherwise the suggestions are the known set.
        if (stems.known.length > stems.suggestions.length) field.linkKnownStems = stems.known;
      }
    }
  }
  return withSourceLines(completeAnalysis(prepared, fields, linkResults), options.sourceText);
}

function withSourceLines(result: FrontmatterResult, sourceText: string): FrontmatterResult {
  const lines = frontmatterFieldLines(sourceText);
  const fields = lines.size === 0 ? result.fields : result.fields.map((field) => {
    const sourceLines = lines.get(field.name);
    return sourceLines ? { ...field, sourceLines } : field;
  });
  // Without a matched schema every key is allowed.
  const endLine = result.present ? frontmatterEndLine(sourceText) : undefined;
  return {
    ...result,
    fields,
    additionalPropertiesAllowed: result.additionalPropertiesAllowed ?? true,
    ...(endLine === undefined ? {} : { endLine }),
  };
}

/** The analysis up to the link step: what the fields and the summary are built from. */
interface PendingAnalysis {
  frontmatter: Record<string, unknown>;
  schema: Record<string, unknown>;
  effective: ReturnType<typeof effectiveProperties>;
  info: FieldIssue[];
  missingRequiredFields: string[];
  /** The link inspection settings, before the files are attached. */
  linkInspectionOptions: Omit<FileLinkInspectionOptions, "files">;
}

/** Everything that needs no link lookup: the final result when no table is built, else the state to finish. */
function prepareAnalysis(options: FrontmatterOptions): FrontmatterResult | PendingAnalysis {
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-001
  const extraction = extractFrontmatterShared(options.sourceText);
  if (!extraction.present) {
    return {
      present: false,
      fields: [],
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [],
      summary: { errors: 0, warnings: 0, infos: 0 },
    };
  }
  if (extraction.error || !extraction.frontmatter) {
    return {
      present: true,
      fields: [],
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [{ severity: "error", message: `Invalid frontmatter YAML: ${extraction.error}` }],
      summary: { errors: 1, warnings: 0, infos: 0 },
    };
  }
  const frontmatter = extraction.frontmatter;
  const info: FieldIssue[] = [];
  const typeValue = typeof frontmatter.type === "string" ? frontmatter.type : undefined;
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-005
  if (!typeValue) {
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info,
      summary: { errors: 0, warnings: 0, infos: 0 },
    };
  }
  const schemaDir = options.allowSchemaResolution === false
    ? undefined
    : options.schemaDirOverride ?? findSchemaDirectory(options.schemaFiles, options.filePath, options.stopDir);
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-005
  if (!schemaDir) {
    const schemaSuppressed = options.allowSchemaResolution === false;
    const suppressionInfo = schemaSuppressed
      ? [{
        severity: "info" as const,
        message: "Schema validation requires a trusted workspace; showing generic frontmatter.",
      }]
      : info;
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: suppressionInfo,
      summary: { errors: 0, warnings: 0, infos: suppressionInfo.length },
    };
  }
  const candidate = matchSchemaFile(options.schemaFiles, schemaDir, typeValue);
  if (!candidate) {
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [{ severity: "info", message: `No schema found for type "${typeValue}" in ${path.basename(schemaDir)}/.` }],
      summary: { errors: 0, warnings: 0, infos: 1 },
    };
  }
  let schema: Record<string, unknown>;
  try {
    schema = resolveCandidateSchema(options.schemaFiles, candidate);
    if (isEmptySchema(schema)) {
      // A schema file with no content yet (just created): the type stays without schema and the
      // note carries okf-schema's wording.
      return {
        present: true,
        fields: fieldsFromYaml(frontmatter, undefined, false),
        orderMode: "yaml",
        schemaFound: false,
        missingRequiredFields: [],
        info: [{ severity: "info", message: `schema file '${path.basename(candidate.path)}' is empty` }],
        summary: { errors: 0, warnings: 0, infos: 1 },
      };
    }
  } catch (error) {
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [{ severity: "warning", message: `Schema could not be parsed: ${error instanceof Error ? error.message : String(error)}` }],
      summary: { errors: 0, warnings: 1, infos: 0 },
    };
  }

  const effective = effectiveProperties(schema, frontmatter);
  const missingRequiredFields = [...effective.required].filter(
    (name) => !Object.hasOwn(frontmatter, name),
  );
  const linkInspectionOptions: Omit<FileLinkInspectionOptions, "files"> = {
    filePath: options.filePath,
    ...(options.bundleRoot ? { bundleRoot: options.bundleRoot } : {}),
    ...(options.projectRoot ? { projectRoot: options.projectRoot } : {}),
    ...(options.workspaceRoots ? { workspaceRoots: options.workspaceRoots } : {}),
    ...(options.allowOutsideWorkspaceLinks !== undefined
      ? { allowOutsideWorkspaceLinks: options.allowOutsideWorkspaceLinks }
      : {}),
    schemaDirectory: schemaDir,
  };
  return { frontmatter, schema, effective, info, missingRequiredFields, linkInspectionOptions };
}

function buildFields(
  pending: PendingAnalysis,
  strictAdditionalProperties: boolean,
  linkResults: FrontmatterLinkResult[],
): FrontmatterResult["fields"] {
  return fieldsFromYaml(pending.frontmatter, pending.effective, strictAdditionalProperties, linkResults);
}

/** The result of an analysis whose fields are built (links resolved or pending). */
function completeAnalysis(
  pending: PendingAnalysis,
  fields: FrontmatterResult["fields"],
  linkResults: FrontmatterLinkResult[],
): FrontmatterResult {
  const { frontmatter, schema, effective, info, missingRequiredFields } = pending;
  const availableFields = effective.order
    .filter((name) => !fields.some((field) => field.name === name))
    .map((name): AvailableFieldEntry => {
      const property = effective.properties[name];
      const enums = enumsOf(property);
      const fieldType = fieldIconType(property, undefined, enums);
      return {
        name,
        fieldType,
        enums,
        defaultValue: defaultValueOf(property, fieldType, enums),
      };
    });

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-084
  // Map ajv instance paths to field names for per-row underlines.
  const fieldIssues = new Map<string, FieldIssue[]>();
  try {
    const validate = getCachedValidator(schema);
    if (!validate(frontmatter)) {
      for (const error of [...validate.errors ?? []]) {
        const ajvError = error as { instancePath: string; message?: string; keyword?: string; params?: { missingProperty?: string } };
        const name = ajvError.instancePath.replace(/^\//u, "").split("/", 1)[0];
        const message = ajvError.keyword === "required" && ajvError.params?.missingProperty
          ? `Required field "${ajvError.params.missingProperty}" is missing.`
          : ajvError.message ?? "The value does not satisfy the schema.";
        const target = name || ajvError.params?.missingProperty;
        if (target) {
          const issues = fieldIssues.get(target) ?? [];
          issues.push({ severity: "error", message, origin: "schema" });
          fieldIssues.set(target, issues);
        } else {
          info.push({ severity: "error", message, origin: "schema" });
        }
      }
    }
  } catch (error) {
    info.push({
      severity: "error",
      message: `Schema validation failed to run: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  for (const field of fields) {
    const issues = fieldIssues.get(field.name);
    if (issues) {
      field.issues.push(...issues);
    }
  }
  // Required-but-absent fields get their own (empty-value) rows so the
  // missing error is visible in the table instead of vanishing.
  for (const [name, issues] of fieldIssues) {
    if (fieldIssues.get(name) && !fields.some((field) => field.name === name)) {
      const property = effective.properties[name];
      fields.push({
        name,
        value: null,
        valueKind: "null",
        nullable: effective.nullable.has(name),
        fieldType: fieldIconType(property, null, property ? enumsOf(property) : null),
        doc: property ? docOf(property) : null,
        enums: property ? enumsOf(property) : null,
        issues: [...issues],
        known: Object.hasOwn(effective.properties, name),
        ...(effective.required.has(name) ? { required: true } : {}),
      });
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
  const summary = { errors: 0, warnings: 0, infos: 0 };
  for (const field of fields) {
    for (const issue of field.issues) {
      summary[issue.severity === "error" ? "errors" : issue.severity === "warning" ? "warnings" : "infos"] += 1;
    }
  }
  for (const issue of info) {
    summary[issue.severity === "error" ? "errors" : issue.severity === "warning" ? "warnings" : "infos"] += 1;
  }
  return {
    present: true,
    fields,
    availableKeys: effective.order,
    availableFields,
    orderMode: "schema",
    schemaFound: true,
    missingRequiredFields,
    info,
    summary,
    linkResults,
    additionalPropertiesAllowed: schema.additionalProperties !== false,
  };
}
