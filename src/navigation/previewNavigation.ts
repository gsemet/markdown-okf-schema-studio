import * as fs from "node:fs";
import * as path from "node:path";

import { resourcePathPart, resourceReferenceSuffix } from "../security/resource-policy";

export type PreviewNavigation =
  | { kind: "anchor"; value: string }
  | { kind: "external"; value: string }
  | { kind: "local"; path: string; suffix: string; markerLine?: number }
  | { kind: "blocked"; reason: string };

const EXTERNAL_SCHEMES = new Set(["http:", "https:", "mailto:"]);
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/iu;
const ANCHOR_PATTERN = /^#[^\s#?]+$/u;

function fileReference(filename: string, suffix: string): string {
  return filename.split("/").map((segment) => encodeURIComponent(segment)).join("/") + suffix;
}

export interface MarkdownFragmentRange {
  startLine: number;
  endLine: number;
}

export function markdownFragmentRange(source: string, suffix: string): MarkdownFragmentRange | undefined {
  const fragment = suffix.slice(suffix.indexOf("#") + 1);
  if (!suffix.includes("#") || !fragment) return undefined;
  let target: string;
  try { target = decodeURIComponent(fragment); } catch { return undefined; }
  const lines = source.split(/\r?\n/u);
  const lineTarget = /^L([1-9]\d*)(?:-L([1-9]\d*))?$/u.exec(target);
  if (lineTarget) {
    const startLine = Number(lineTarget[1]);
    const endLine = Number(lineTarget[2] ?? lineTarget[1]);
    return startLine <= endLine && endLine <= lines.length
      ? { startLine, endLine }
      : undefined;
  }
  const blockTarget = target.startsWith("^") ? target.slice(1) : undefined;
  const slug = (value: string) => value.trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s+/gu, "-");
  let fence: string | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const marker = /^ {0,3}(`{3,}|~{3,})/u.exec(lines[index])?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    // A MyST `(label)=` line is the target of `#label`.
    if (target === /^ {0,3}\(([A-Za-z0-9_.:-]+)\)=\s*$/u.exec(lines[index])?.[1]) {
      return { startLine: index + 1, endLine: index + 1 };
    }
    const blockId = /(?:^|\s)\^([^\s]+)\s*$/u.exec(lines[index])?.[1];
    if (blockTarget && blockId === blockTarget) {
      return { startLine: index + 1, endLine: index + 1 };
    }
    const htmlId = /<h[1-6]\b[^>]*\bid=["']([^"']+)["'][^>]*>/iu.exec(lines[index])?.[1];
    if (htmlId && htmlId === target) {
      return { startLine: index + 1, endLine: index + 1 };
    }
    const atx = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/u.exec(lines[index]);
    const heading = atx?.[1]
      ?? (/^ {0,3}(?:=+|-+)\s*$/u.test(lines[index + 1] ?? "") ? lines[index].trim() : undefined);
    const explicitId = heading?.match(/\s*\{#([^}\s]+)\}\s*$/u)?.[1];
    const headingText = heading?.replace(/\s*\{#[^}\s]+\}\s*$/u, "");
    if (heading && ((explicitId && explicitId === target) || slug(headingText ?? heading) === slug(target))) {
      return { startLine: index + 1, endLine: index + 1 };
    }
  }
  return undefined;
}

export function markdownFragmentLine(source: string, suffix: string): number | undefined {
  return markdownFragmentRange(source, suffix)?.startLine;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** Finds the first source line containing a marker followed by an exact identity. */
export function markdownMarkerLine(
  source: string,
  marker: string,
  identity: string,
): number | undefined {
  const normalizedMarker = marker.trim();
  const normalizedIdentity = identity.trim();
  if (!normalizedMarker || !normalizedIdentity) return undefined;
  const pattern = new RegExp(
    `(?:^|\\s)${escapeRegExp(normalizedMarker)}\\s+${escapeRegExp(normalizedIdentity)}(?=$|[^\\p{L}\\p{N}_-])`,
    "u",
  );
  const lines = source.split(/\r?\n/u);
  const index = lines.findIndex((line) => pattern.test(line));
  return index < 0 ? undefined : index + 1;
}

export type PreviewReference =
  | { kind: "anchor"; value: string }
  | { kind: "external"; value: string }
  | { kind: "relative"; value: string }
  | { kind: "wiki"; value: string }
  | { kind: "blocked"; reason: string };

export function classifyPreviewReference(request: string): PreviewReference {
  const trimmed = request.trim();
  if (trimmed.startsWith("#")) {
    return ANCHOR_PATTERN.test(trimmed)
      ? { kind: "anchor", value: trimmed }
      : { kind: "blocked", reason: "The preview anchor is invalid." };
  }
  if (trimmed.startsWith("?") && resourcePathPart(trimmed) === "") {
    return { kind: "blocked", reason: "Query-only navigation targets are not valid file links." };
  }
  const wiki = trimmed.startsWith("wiki:");
  const decoded = decodePath(resourcePathPart(wiki ? trimmed.slice(5) : trimmed));
  if (!decoded || decoded.includes("\0") || decoded.includes("\\")) {
    return { kind: "blocked", reason: "The navigation target could not be decoded safely." };
  }
  const scheme = schemeOf(decoded);
  if (scheme) {
    return !wiki && EXTERNAL_SCHEMES.has(scheme)
      ? { kind: "external", value: trimmed }
      : { kind: "blocked", reason: "The navigation scheme is not allowed in the preview." };
  }
  if (decoded.startsWith("/")) {
    return { kind: "blocked", reason: "Absolute navigation targets are not allowed." };
  }
  return { kind: wiki ? "wiki" : "relative", value: trimmed };
}

export async function resolvePreviewNavigation(
  request: string,
  activeSourceFile: string,
  workspaceRoot: string,
  discover: (name: string) => Promise<readonly string[]>,
  rootLabel = "the workspace",
  workspaceRoots: readonly string[] = [workspaceRoot],
): Promise<PreviewNavigation> {
  const reference = classifyPreviewReference(request);
  if (reference.kind !== "wiki") {
    for (const root of uniqueRoots([workspaceRoot, ...workspaceRoots])) {
      const navigation = validatePreviewNavigation(request, activeSourceFile, root, rootLabel);
      if (navigation.kind === "local" || navigation.kind === "anchor" || navigation.kind === "external") {
        return navigation;
      }
      if (navigation.kind === "blocked" && !navigation.reason.includes("outside")) {
        return navigation;
      }
    }
    return validatePreviewNavigation(request, activeSourceFile, workspaceRoot, rootLabel);
  }
  const target = reference.value.slice(5);
  const name = decodePath(resourcePathPart(target))!;
  const filename = path.extname(name) ? name : `${name}.md`;
  const suffix = resourceReferenceSuffix(target);
  const roots = uniqueRoots([workspaceRoot, ...workspaceRoots]);
  const local = roots
    .map((root) => validatePreviewNavigation(fileReference(filename, suffix), activeSourceFile, root, rootLabel))
    .find((navigation): navigation is Extract<PreviewNavigation, { kind: "local" }> => navigation.kind === "local");
  if (name.includes("/")) {
    return local ?? { kind: "blocked", reason: "The wikilink target is unavailable." };
  }
  const matches = await discover(filename);
  const candidates = new Map<string, PreviewNavigation>();
  for (const match of matches) {
    if (path.basename(match) !== filename) continue;
    const navigation = validateResolvedPreviewNavigation(match, suffix, roots, rootLabel);
    if (navigation.kind === "local") candidates.set(navigation.path, navigation);
  }
  if (candidates.size === 1) return [...candidates.values()][0];
  if (candidates.size === 0 && local) return local;
  return { kind: "blocked", reason: candidates.size > 1
    ? "The wikilink is ambiguous; use a relative path to choose a note."
    : "The wikilink target is unavailable." };
}

function uniqueRoots(roots: readonly string[]): string[] {
  return [...new Set(roots.map((root) => path.resolve(root)))];
}

export function validateResolvedPreviewNavigation(
  filePath: string,
  suffix: string,
  workspaceRoots: readonly string[],
  rootLabel = "the workspace",
  allowOutsideRoot = false,
): PreviewNavigation {
  const candidate = path.resolve(filePath);
  let realPath: string;
  try {
    realPath = fs.realpathSync(candidate);
    if (!fs.statSync(realPath).isFile()) {
      return { kind: "blocked", reason: "The navigation target is not a regular file." };
    }
  } catch {
    return { kind: "blocked", reason: "The navigation target is unavailable." };
  }
  if (allowOutsideRoot) {
    return { kind: "local", path: realPath, suffix };
  }
  for (const root of uniqueRoots(workspaceRoots)) {
    try {
      const realRoot = fs.realpathSync(root);
      if (isWithin(root, candidate) && isWithin(realRoot, realPath)) {
        return { kind: "local", path: realPath, suffix };
      }
    } catch {
      // Try the next workspace root.
    }
  }
  return { kind: "blocked", reason: `The navigation target is outside ${rootLabel}.` };
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function schemeOf(value: string): string | undefined {
  return value.match(SCHEME_PATTERN)?.[0].toLowerCase();
}

function decodePath(value: string): string | undefined {
  let decoded = value;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        return decoded;
      }
      decoded = next;
    }
  } catch {
    return undefined;
  }
  return /%[\da-f]{2}/iu.test(decoded) ? undefined : decoded;
}

export function validatePreviewNavigation(
  request: string,
  activeSourceFile: string,
  workspaceRoot: string,
  rootLabel = "the workspace",
): PreviewNavigation {
  const reference = classifyPreviewReference(request);
  if (reference.kind === "blocked" || reference.kind === "anchor" || reference.kind === "external") return reference;
  if (reference.kind === "wiki") return { kind: "blocked", reason: "Wikilinks require note discovery." };
  const trimmed = reference.value;
  const decoded = decodePath(resourcePathPart(trimmed))!;

  const root = path.resolve(workspaceRoot);
  const candidate = path.resolve(path.dirname(activeSourceFile), decoded);
  if (!isWithin(root, candidate)) {
    return { kind: "blocked", reason: `The navigation target is outside ${rootLabel}.` };
  }

  let realPath: string;
  let realRoot: string;
  try {
    realRoot = fs.realpathSync(root);
    realPath = fs.realpathSync(candidate);
    if (!fs.statSync(realPath).isFile()) {
      return { kind: "blocked", reason: "The navigation target is not a regular file." };
    }
  } catch {
    return { kind: "blocked", reason: "The navigation target is unavailable." };
  }
  if (!isWithin(realRoot, realPath)) {
    return { kind: "blocked", reason: `The navigation target escapes ${rootLabel}.` };
  }
  return { kind: "local", path: realPath, suffix: resourceReferenceSuffix(trimmed) };
}
