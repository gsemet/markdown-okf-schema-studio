import * as path from "node:path";
import { parseDocument } from "yaml";
import { markdownMarkerLine } from "../navigation/previewNavigation";
import {
  diagnostic,
  isRecord,
  iterAnnotations,
  parseAnnotation,
  parseLink,
  type AnnotationValue,
  type LinkError,
  type ParsedAnnotation,
  type ParsedLink,
} from "./fileLinkAnnotations";
import type {
  FileLinkInspectionOptions,
  FileLinkResolution,
  FileLinkStatus,
  FrontmatterLinkResult,
  FrontmatterLinkRoots,
} from "./fileLinkTypes";
import { matchFrontmatterBlock } from "./frontmatterParse";
import type { LinkFiles } from "./linkFiles";
import {
  getCachedMarkdownStemIndex,
  invalidateStemIndex,
  type MarkdownStemIndex,
} from "./stemIndex";

export { invalidateStemIndex } from "./stemIndex";
export {
  FILE_LINK_RESOLUTIONS,
  FILE_LINK_SYNTAXES,
  type FileLinkInspectionOptions,
  type FileLinkResolution,
  type FileLinkStatus,
  type FileLinkSyntax,
  type FrontmatterLinkResult,
  type FrontmatterLinkRoots,
} from "./fileLinkTypes";

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
async function linkedFileDetails(
  files: LinkFiles,
  targetPath: string,
  annotation: ParsedAnnotation,
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): Promise<Pick<FrontmatterLinkResult, "tooltipFields" | "previewFields" | "markerLine">> {
  if (!annotation.tooltipShowsFields?.length && !annotation.previewShowsFields?.length
    && !annotation.showLineNumber) return {};
  try {
    const source = new TextDecoder().decode(await files.readFile(targetPath));
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

async function rootPath(files: LinkFiles, candidate: string | undefined): Promise<string | undefined> {
  if (!candidate) return undefined;
  try {
    return (await files.stat(candidate)).kind === "directory" ? await files.realpath(candidate) : undefined;
  } catch {
    return undefined;
  }
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function pathExists(files: LinkFiles, candidate: string): Promise<boolean> {
  try {
    await files.stat(candidate);
    return true;
  } catch {
    return false;
  }
}

async function gitRoot(files: LinkFiles, filePath: string): Promise<string | undefined> {
  let current = path.dirname(path.resolve(filePath));
  for (;;) {
    if (await pathExists(files, path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-050
async function configuredRoot(
  files: LinkFiles,
  configured: string | undefined,
  filePath: string,
  workspaceRoots: readonly string[],
): Promise<{ specified: boolean; root: string | undefined }> {
  if (!configured?.trim()) return { specified: false, root: undefined };
  const value = configured.trim();
  const candidates = path.isAbsolute(value)
    ? [value]
    : [path.resolve(workspaceRoots[0] ?? path.dirname(filePath), value)];
  let root: string | undefined;
  for (const candidate of candidates) {
    root = await rootPath(files, candidate);
    if (root !== undefined) break;
  }
  return { specified: true, root };
}

async function isFile(files: LinkFiles, candidate: string): Promise<boolean> {
  try {
    return (await files.stat(candidate)).kind === "file";
  } catch {
    return false;
  }
}

async function conventionBundleRoot(
  files: LinkFiles,
  schemaDirectory: string | undefined,
  filePath: string,
): Promise<string | undefined> {
  if (!schemaDirectory) return undefined;
  const candidate = await rootPath(files, path.dirname(schemaDirectory));
  if (!candidate || !isWithin(candidate, path.resolve(filePath))) return undefined;
  for (const name of ["index.md", "log.md"]) {
    if (await isFile(files, path.join(candidate, name))) return candidate;
  }
  return undefined;
}

async function uniqueRoots(files: LinkFiles, roots: readonly (string | undefined)[]): Promise<string[]> {
  const resolved = await Promise.all(roots.map((root) => rootPath(files, root)));
  return [...new Set(resolved.filter((root): root is string => root !== undefined))];
}

export async function resolveFrontmatterLinkRoots(options: FileLinkInspectionOptions): Promise<FrontmatterLinkRoots> {
  const { files } = options;
  const workspaceRoots = options.workspaceRoots ?? [];
  const navigationRoots = await uniqueRoots(files, workspaceRoots.length > 0
    ? workspaceRoots
    : [path.dirname(options.filePath)]);
  const configuredBundle = await configuredRoot(files, options.bundleRoot, options.filePath, workspaceRoots);
  const configuredProject = await configuredRoot(files, options.projectRoot, options.filePath, workspaceRoots);
  const bundleRoot = configuredBundle.specified
    ? configuredBundle.root
    : await conventionBundleRoot(files, options.schemaDirectory, options.filePath);
  const detectedProjectRoot = await gitRoot(files, options.filePath);
  const projectRoot = configuredProject.specified
    ? configuredProject.root
    : detectedProjectRoot && navigationRoots.some((root) => isWithin(root, detectedProjectRoot))
      ? detectedProjectRoot
      : undefined;
  const filenameRoots = await uniqueRoots(files, [...workspaceRoots, bundleRoot]);
  return { bundleRoot, projectRoot, filenameRoots, navigationRoots };
}

/** The Markdown filename stems of a filename-stem link field, for its list editor. */
export interface FilenameStemSuggestions {
  /** The dropdown entries: the stems closest to the document first, at most `limit`. */
  suggestions: string[];
  /** Every known stem, sorted: the same index the table resolves the links with. */
  known: string[];
}

/** Known Markdown filename stems under the roots used by filename-stem resolution. */
// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-010
export async function filenameStemSuggestions(
  options: FileLinkInspectionOptions,
  limit = 500,
): Promise<FilenameStemSuggestions> {
  const index = await getCachedMarkdownStemIndex(options.files, (await resolveFrontmatterLinkRoots(options)).filenameRoots);
  return {
    suggestions: await index.nearestStems(options.files, path.dirname(path.resolve(options.filePath)), limit),
    known: index.stems(),
  };
}

function rejectAbsolute(target: string): boolean {
  return path.isAbsolute(target) || /^[A-Za-z]:[\\/]/u.test(target) || target.startsWith("\\\\");
}

async function withinAnyRealRoot(
  files: LinkFiles,
  roots: readonly string[],
  realPath: string,
): Promise<boolean> {
  for (const root of roots) {
    try {
      if (isWithin(await files.realpath(root), realPath)) return true;
    } catch {
      // An unresolvable root contains nothing.
    }
  }
  return false;
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-050
async function resolveExact(
  target: string,
  resolution: FileLinkResolution,
  options: FileLinkInspectionOptions,
  bundle: string | undefined,
  project: string | undefined,
  navigationRoots: readonly string[],
  field: string,
): Promise<{ path: string; normalizedTarget: string } | LinkError> {
  const { files } = options;
  if (rejectAbsolute(target)) return diagnostic("E10", field, `absolute target '${target}' is not allowed`);
  const documentRoot = await rootPath(files, path.dirname(path.resolve(options.filePath)))
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
    const realRoot = await files.realpath(root);
    const realPath = await files.realpath(candidate);
    if ((await files.stat(realPath)).kind !== "file") {
      return diagnostic("E10", field, `target '${target}' does not resolve to a file`);
    }
    if (resolution !== "document-relative" && !isWithin(realRoot, realPath)) {
      return diagnostic("E10", field, `target '${target}' escapes its ${resolution} root`);
    }
    if (resolution === "document-relative"
      && !options.allowOutsideWorkspaceLinks
      && !(await withinAnyRealRoot(files, containmentRoots, realPath))) {
      return diagnostic("E10", field, `target '${target}' escapes its navigation root`);
    }
    return { path: realPath, normalizedTarget };
  } catch {
    return diagnostic("E10", field, `target '${target}' does not resolve to a file`);
  }
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
async function resolveFilenameStem(
  files: LinkFiles,
  target: string,
  roots: readonly string[],
  field: string,
  stemIndex?: MarkdownStemIndex,
): Promise<{ path: string; normalizedTarget: string } | LinkError> {
  if (rejectAbsolute(target)) return diagnostic("E10", field, `absolute target '${target}' is not allowed`);
  if (roots.length === 0) return diagnostic("W15", field, "filename-stem root is unavailable");
  let lookup = await (stemIndex ?? await getCachedMarkdownStemIndex(files, roots)).lookup(files, target);
  // An indexed file that no longer exists means the cached index is stale (file watcher events
  // can lag, or miss the files of a deleted directory): rebuild it once before deciding.
  if (!stemIndex && lookup.unavailable) {
    invalidateStemIndex();
    lookup = await (await getCachedMarkdownStemIndex(files, roots)).lookup(files, target);
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

/** A link of the frontmatter as the schema declares it: parsed, or rejected with its diagnostic. */
interface CollectedLink {
  item: AnnotationValue;
  annotation: ParsedAnnotation | undefined;
  parsed: ParsedLink | undefined;
  error: LinkError | undefined;
}

/** The links the schema annotates in `frontmatter`, parsed and de-duplicated; reads no file. */
function collectLinks(frontmatter: Record<string, unknown>, schema: Record<string, unknown>): CollectedLink[] {
  const collected: CollectedLink[] = [];
  const seen = new Set<string>();
  for (const item of iterAnnotations(schema, frontmatter, [], schema, new Set())) {
    const annotation = parseAnnotation(item.annotation, item.fieldPath);
    if ("code" in annotation) {
      collected.push({ item, annotation: undefined, parsed: undefined, error: annotation });
      continue;
    }
    const parsed = parseLink(item.value, annotation.syntax, item.fieldPath);
    if ("code" in parsed) {
      collected.push({ item, annotation, parsed: undefined, error: parsed });
      continue;
    }
    const identity = `${item.fieldPath}:${item.arrayIndex ?? "scalar"}:${annotation.resolution}:${annotation.syntax}:${parsed.target}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    collected.push({ item, annotation, parsed, error: undefined });
  }
  return collected;
}

function pendingResult(item: AnnotationValue, annotation: ParsedAnnotation, parsed: ParsedLink): FrontmatterLinkResult {
  return {
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
  };
}

/**
 * The links of the frontmatter before any target is looked up: the ones that parse are `pending`,
 * the others carry their diagnostic. Synchronous and reads no file: the first paint uses it.
 */
export function pendingFrontmatterLinks(
  frontmatter: Record<string, unknown>,
  schema: Record<string, unknown>,
): FrontmatterLinkResult[] {
  return collectLinks(frontmatter, schema).map(({ item, annotation, parsed, error }) =>
    error ? resultForError(item, annotation, parsed, error) : pendingResult(item, annotation!, parsed!));
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
export async function inspectFrontmatterLinks(
  frontmatter: Record<string, unknown>,
  schema: Record<string, unknown>,
  options: FileLinkInspectionOptions,
): Promise<FrontmatterLinkResult[]> {
  const roots = await resolveFrontmatterLinkRoots(options);
  const results: FrontmatterLinkResult[] = [];
  for (const { item, annotation, parsed, error } of collectLinks(frontmatter, schema)) {
    if (error) {
      results.push(resultForError(item, annotation, parsed, error));
      continue;
    }
    const link = parsed!;
    const annotated = annotation!;
    const resolved = annotated.resolution === "filename-stem"
      ? await resolveFilenameStem(
        options.files,
        link.target,
        roots.filenameRoots,
        item.fieldPath,
        options.stemIndex,
      )
      : await resolveExact(
        link.target,
        annotated.resolution,
        options,
        roots.bundleRoot,
        roots.projectRoot,
        roots.navigationRoots,
        item.fieldPath,
      );
    if ("code" in resolved) {
      results.push(resultForError(item, annotated, link, resolved));
      continue;
    }
    results.push({
      value: item.value,
      fieldPath: item.fieldPath,
      arrayIndex: item.arrayIndex,
      basenameMarker: annotated.basenameMarker,
      idMarker: annotated.idMarker,
      syntax: annotated.syntax,
      resolution: annotated.resolution,
      target: link.target,
      normalizedTarget: resolved.normalizedTarget,
      resolvedPath: resolved.path,
      ...await linkedFileDetails(options.files, resolved.path, annotated, frontmatter, options.filePath),
      workspaceRelativePath: workspaceRelativePath(
        resolved.path,
        roots.navigationRoots,
        options.filePath,
      ),
      query: link.query,
      fragment: link.fragment,
      label: link.label,
      status: "valid",
      code: undefined,
      severity: undefined,
      message: "",
    });
  }
  return results;
}
