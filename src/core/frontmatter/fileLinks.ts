import * as fs from "node:fs";
import * as path from "node:path";
import { parseDocument } from "yaml";
import { markdownMarkerLine } from "../navigation/previewNavigation";
import { matchFrontmatterBlock } from "./okfFrontmatter";
import { getCachedBranchValidator } from "./schemaValidator";
import {
  getCachedMarkdownStemIndex,
  invalidateStemIndex,
  type MarkdownStemIndex,
} from "./stemIndex";

export { invalidateStemIndex } from "./stemIndex";

 const FILE_LINK_RESOLUTIONS = [
  "document-relative",
  "bundle-relative",
  "bundle-relative-stem",
  "project-relative",
  "filename-stem",
] as const;

 const FILE_LINK_SYNTAXES = ["plain", "wikilink"] as const;

export type FileLinkResolution = typeof FILE_LINK_RESOLUTIONS[number];
export type FileLinkSyntax = typeof FILE_LINK_SYNTAXES[number];
export type FileLinkStatus = "valid" | "invalid" | "unavailable" | "pending";

export interface FrontmatterLinkResult {
  value: unknown;
  fieldPath: string;
  arrayIndex: number | undefined;
  basenameMarker?: string;
  idMarker?: string;
  tooltipFields?: Record<string, string>;
  previewFields?: Record<string, string>;
  markerLine?: number;
  syntax: FileLinkSyntax | undefined;
  resolution: FileLinkResolution | undefined;
  target: string | undefined;
  normalizedTarget: string | undefined;
  resolvedPath: string | undefined;
  workspaceRelativePath?: string;
  query: string | undefined;
  fragment: string | undefined;
  label: string | undefined;
  status: FileLinkStatus;
  code: "E10" | "W15" | undefined;
  severity: "error" | "warning" | undefined;
  message: string;
}

export interface FileLinkInspectionOptions {
  filePath: string;
  bundleRoot?: string;
  projectRoot?: string;
  workspaceRoots?: readonly string[];
  schemaDirectory?: string;
  resolveTargets?: boolean;
  stemIndex?: MarkdownStemIndex;
  allowOutsideWorkspaceLinks?: boolean;
}

export interface FrontmatterLinkRoots {
  bundleRoot: string | undefined;
  projectRoot: string | undefined;
  filenameRoots: readonly string[];
  navigationRoots: readonly string[];
}

interface ParsedLink {
  target: string;
  query: string | undefined;
  fragment: string | undefined;
  label: string | undefined;
}

interface ParsedAnnotation {
  resolution: FileLinkResolution;
  syntax: FileLinkSyntax;
  basenameMarker?: string;
  idMarker?: string;
  tooltipShowsFields?: string[];
  previewShowsFields?: string[];
  showLineNumber?: boolean;
}

interface AnnotationValue {
  annotation: unknown;
  value: unknown;
  fieldPath: string;
  arrayIndex: number | undefined;
}

interface LinkError {
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

function isRecord(value: unknown): value is Record<string, unknown> {
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
function iterAnnotations(
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

function diagnostic(code: "E10" | "W15", field: string, message: string): LinkError {
  return {
    code,
    severity: code === "E10" ? "error" : "warning",
    message: code === "E10"
      ? `${message} at '${field}'`
      : `Skipped file-link check at '${field}': ${message}`,
  };
}

function parseAnnotation(annotation: unknown, field: string): ParsedAnnotation | LinkError {
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

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
function linkedFileDetails(
  targetPath: string,
  annotation: ParsedAnnotation,
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): Pick<FrontmatterLinkResult, "tooltipFields" | "previewFields" | "markerLine"> {
  if (!annotation.tooltipShowsFields?.length && !annotation.previewShowsFields?.length
    && !annotation.showLineNumber) return {};
  try {
    const source = fs.readFileSync(targetPath, "utf8");
    const yaml = matchFrontmatterBlock(source.replace(/^\uFEFF/u, ""))?.body;
    const document = yaml === undefined ? undefined : parseDocument(yaml);
    const metadata: unknown = document && document.errors.length === 0 ? document.toJS() : undefined;
    const fields = (names: readonly string[] | undefined): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const name of names ?? []) {
        const value = isRecord(metadata) && Object.hasOwn(metadata, name) ? metadata[name] : undefined;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          result[name] = String(value);
        }
      }
      return result;
    };
    const identity = annotation.idMarker?.trim()
      ? frontmatter[annotation.idMarker]
      : path.basename(sourcePath, path.extname(sourcePath));
    return {
      tooltipFields: fields(annotation.tooltipShowsFields),
      previewFields: fields(annotation.previewShowsFields),
      markerLine: annotation.showLineNumber && annotation.basenameMarker && typeof identity === "string"
        ? markdownMarkerLine(source, annotation.basenameMarker, identity)
        : undefined,
    };
  } catch {
    return {};
  }
}

function parseLink(value: unknown, syntax: FileLinkSyntax, field: string): ParsedLink | LinkError {
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

function rootPath(candidate: string | undefined): string | undefined {
  if (!candidate) return undefined;
  try {
    return fs.statSync(candidate).isDirectory() ? fs.realpathSync(candidate) : undefined;
  } catch {
    return undefined;
  }
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function gitRoot(filePath: string): string | undefined {
  let current = path.dirname(path.resolve(filePath));
  for (;;) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-060
function configuredRoot(
  configured: string | undefined,
  filePath: string,
  workspaceRoots: readonly string[],
): { specified: boolean; root: string | undefined } {
  if (!configured?.trim()) return { specified: false, root: undefined };
  const value = configured.trim();
  const candidates = path.isAbsolute(value)
    ? [value]
    : [path.resolve(workspaceRoots[0] ?? path.dirname(filePath), value)];
  return {
    specified: true,
    root: candidates.map(rootPath).find((candidate): candidate is string => candidate !== undefined),
  };
}

function conventionBundleRoot(schemaDirectory: string | undefined, filePath: string): string | undefined {
  if (!schemaDirectory) return undefined;
  const candidate = rootPath(path.dirname(schemaDirectory));
  if (!candidate || !isWithin(candidate, path.resolve(filePath))) return undefined;
  const hasMarker = ["index.md", "log.md"].some((name) => fs.statSync(path.join(candidate, name), { throwIfNoEntry: false })?.isFile());
  return hasMarker ? candidate : undefined;
}

function uniqueRoots(roots: readonly (string | undefined)[]): string[] {
  return [...new Set(roots.flatMap((root) => {
    const resolved = rootPath(root);
    return resolved ? [resolved] : [];
  }))];
}

export function resolveFrontmatterLinkRoots(options: FileLinkInspectionOptions): FrontmatterLinkRoots {
  const workspaceRoots = options.workspaceRoots ?? [];
  const navigationRoots = uniqueRoots(workspaceRoots.length > 0
    ? workspaceRoots
    : [path.dirname(options.filePath)]);
  const configuredBundle = configuredRoot(options.bundleRoot, options.filePath, workspaceRoots);
  const configuredProject = configuredRoot(options.projectRoot, options.filePath, workspaceRoots);
  const bundleRoot = configuredBundle.specified
    ? configuredBundle.root
    : conventionBundleRoot(options.schemaDirectory, options.filePath);
  const detectedProjectRoot = gitRoot(options.filePath);
  const projectRoot = configuredProject.specified
    ? configuredProject.root
    : detectedProjectRoot && navigationRoots.some((root) => isWithin(root, detectedProjectRoot))
      ? detectedProjectRoot
      : undefined;
  const filenameRoots = uniqueRoots([...workspaceRoots, bundleRoot]);
  return { bundleRoot, projectRoot, filenameRoots, navigationRoots };
}

/** Known Markdown filename stems under the roots used by filename-stem resolution. */
export function filenameStemSuggestions(options: FileLinkInspectionOptions, limit = 500): string[] {
  return getCachedMarkdownStemIndex(resolveFrontmatterLinkRoots(options).filenameRoots).stems(limit);
}

function rejectAbsolute(target: string): boolean {
  return path.isAbsolute(target) || /^[A-Za-z]:[\\/]/u.test(target) || target.startsWith("\\\\");
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-050
function resolveExact(
  target: string,
  resolution: FileLinkResolution,
  options: FileLinkInspectionOptions,
  bundle: string | undefined,
  project: string | undefined,
  navigationRoots: readonly string[],
  field: string,
): { path: string; normalizedTarget: string } | LinkError {
  if (rejectAbsolute(target)) return diagnostic("E10", field, `absolute target '${target}' is not allowed`);
  const documentRoot = rootPath(path.dirname(path.resolve(options.filePath)))
    ?? path.dirname(path.resolve(options.filePath));
  const root = resolution === "document-relative"
    ? documentRoot
    : resolution.startsWith("bundle-relative") ? bundle : project;
  if (!root) return diagnostic("W15", field, `${resolution} root is unavailable`);
  const normalizedTarget = resolution === "bundle-relative-stem" ? `${target}.md` : target;
  const candidate = path.resolve(root, normalizedTarget);
  const containmentRoots = resolution === "document-relative"
    ? (navigationRoots.length > 0 ? navigationRoots : [root])
    : [root];
  if (resolution !== "document-relative" && !isWithin(root, candidate)) {
    return diagnostic("E10", field, `target '${target}' escapes its ${resolution} root`);
  }
  if (resolution === "document-relative"
    && !options.allowOutsideWorkspaceLinks
    && !containmentRoots.some((containmentRoot) => isWithin(containmentRoot, candidate))) {
    return diagnostic("E10", field, `target '${target}' escapes its navigation root`);
  }
  try {
    const realRoot = fs.realpathSync(root);
    const realPath = fs.realpathSync(candidate);
    if (!fs.statSync(realPath).isFile()) {
      return diagnostic("E10", field, `target '${target}' does not resolve to a file`);
    }
    if (resolution !== "document-relative" && !isWithin(realRoot, realPath)) {
      return diagnostic("E10", field, `target '${target}' escapes its ${resolution} root`);
    }
    if (resolution === "document-relative"
      && !options.allowOutsideWorkspaceLinks
      && !containmentRoots.some((containmentRoot) => {
        try {
          return isWithin(fs.realpathSync(containmentRoot), realPath);
        } catch {
          return false;
        }
      })) {
      return diagnostic("E10", field, `target '${target}' escapes its navigation root`);
    }
    return { path: realPath, normalizedTarget };
  } catch {
    return diagnostic("E10", field, `target '${target}' does not resolve to a file`);
  }
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
function resolveFilenameStem(
  target: string,
  roots: readonly string[],
  field: string,
  stemIndex?: MarkdownStemIndex,
): { path: string; normalizedTarget: string } | LinkError {
  if (rejectAbsolute(target)) return diagnostic("E10", field, `absolute target '${target}' is not allowed`);
  if (roots.length === 0) return diagnostic("W15", field, "filename-stem root is unavailable");
  let lookup = (stemIndex ?? getCachedMarkdownStemIndex(roots)).lookup(target);
  // An indexed file that no longer exists means the cached index is stale (file watcher events
  // can lag, or miss the files of a deleted directory): rebuild it once before deciding.
  if (!stemIndex && lookup.unavailable) {
    invalidateStemIndex();
    lookup = getCachedMarkdownStemIndex(roots).lookup(target);
  }
  const uniqueMatches = [...new Set(lookup.paths)];
  if (uniqueMatches.length === 0) {
    return diagnostic(
      lookup.escaped || !lookup.unavailable ? "E10" : "W15",
      field,
      lookup.escaped
        ? `filename stem '${target}' escapes its filename-stem root`
        : lookup.unavailable
        ? `filename stem '${target}' could not be resolved because the workspace may be unavailable`
        : `filename stem '${target}' was not found`,
    );
  }
  if (uniqueMatches.length > 1) return diagnostic("E10", field, `filename stem '${target}' is ambiguous`);
  return { path: uniqueMatches[0], normalizedTarget: target };
}

function resultForError(
  item: AnnotationValue,
  annotation: ParsedAnnotation | undefined,
  parsed: ParsedLink | undefined,
  error: LinkError,
): FrontmatterLinkResult {
  return {
    value: item.value,
    fieldPath: item.fieldPath,
    arrayIndex: item.arrayIndex,
    basenameMarker: annotation?.basenameMarker,
    idMarker: annotation?.idMarker,
    syntax: annotation?.syntax,
    resolution: annotation?.resolution,
    target: parsed?.target,
    normalizedTarget: parsed?.target,
    resolvedPath: undefined,
    query: parsed?.query,
    fragment: parsed?.fragment,
    label: parsed?.label,
    status: error.code === "W15" ? "unavailable" : "invalid",
    code: error.code,
    severity: error.severity,
    message: error.message,
  };
}

function workspaceRelativePath(
  filePath: string,
  navigationRoots: readonly string[],
  fallbackFilePath: string,
): string {
  const referenceRoot = navigationRoots.find((root) => isWithin(root, filePath))
    ?? navigationRoots[0]
    ?? path.dirname(path.resolve(fallbackFilePath));
  const relative = path.relative(referenceRoot, filePath);
  return (relative || path.basename(filePath)).split(path.sep).join("/");
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
export function inspectFrontmatterLinks(
  frontmatter: Record<string, unknown>,
  schema: Record<string, unknown>,
  options: FileLinkInspectionOptions,
): FrontmatterLinkResult[] {
  const resolveTargets = options.resolveTargets !== false;
  const roots = resolveTargets ? resolveFrontmatterLinkRoots(options) : undefined;
  const annotations = iterAnnotations(schema, frontmatter, [], schema, new Set());
  const results: FrontmatterLinkResult[] = [];
  const seen = new Set<string>();
  for (const item of annotations) {
    const annotation = parseAnnotation(item.annotation, item.fieldPath);
    if ("code" in annotation) {
      results.push(resultForError(item, undefined, undefined, annotation));
      continue;
    }
    const parsed = parseLink(item.value, annotation.syntax, item.fieldPath);
    if ("code" in parsed) {
      results.push(resultForError(item, annotation, undefined, parsed));
      continue;
    }
    const identity = `${item.fieldPath}:${item.arrayIndex ?? "scalar"}:${annotation.resolution}:${annotation.syntax}:${parsed.target}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    if (!resolveTargets) {
      results.push({
        value: item.value,
        fieldPath: item.fieldPath,
        arrayIndex: item.arrayIndex,
        basenameMarker: annotation.basenameMarker,
        idMarker: annotation.idMarker,
        syntax: annotation.syntax,
        resolution: annotation.resolution,
        target: parsed.target,
        normalizedTarget: parsed.target,
        resolvedPath: undefined,
        query: parsed.query,
        fragment: parsed.fragment,
        label: parsed.label,
        status: "pending",
        code: undefined,
        severity: undefined,
        message: "",
      });
      continue;
    }
    const resolved = annotation.resolution === "filename-stem"
      ? resolveFilenameStem(
        parsed.target,
        roots?.filenameRoots ?? [],
        item.fieldPath,
        options.stemIndex,
      )
      : resolveExact(
        parsed.target,
        annotation.resolution,
        options,
        roots?.bundleRoot,
        roots?.projectRoot,
        roots?.navigationRoots ?? [],
        item.fieldPath,
      );
    if ("code" in resolved) {
      results.push(resultForError(item, annotation, parsed, resolved));
      continue;
    }
    results.push({
      value: item.value,
      fieldPath: item.fieldPath,
      arrayIndex: item.arrayIndex,
      basenameMarker: annotation.basenameMarker,
      idMarker: annotation.idMarker,
      syntax: annotation.syntax,
      resolution: annotation.resolution,
      target: parsed.target,
      normalizedTarget: resolved.normalizedTarget,
      resolvedPath: resolved.path,
      ...linkedFileDetails(resolved.path, annotation, frontmatter, options.filePath),
      workspaceRelativePath: workspaceRelativePath(
        resolved.path,
        roots?.navigationRoots ?? [],
        options.filePath,
      ),
      query: parsed.query,
      fragment: parsed.fragment,
      label: parsed.label,
      status: "valid",
      code: undefined,
      severity: undefined,
      message: "",
    });
  }
  return results;
}
