import * as fs from "node:fs";
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
