/**
 * The link checks of the preview on the host's file system: a followed link becomes a local file
 * below a workspace root, an anchor, an external URL, or a blocked target with a reason. The pure
 * classification lives in `core/navigation/previewNavigation.ts`; this half reads the disk through
 * the `FileSystem` port.
 */
import * as path from "node:path";

import type { FileSystem } from "../host-api/fileSystem";
import {
  classifyPreviewReference,
  decodePath,
  type PreviewNavigation,
} from "../core/navigation/previewNavigation";
import { resourcePathPart, resourceReferenceSuffix } from "../core/security/resource-policy";

function fileReference(filename: string, suffix: string): string {
  return filename.split("/").map((segment) => encodeURIComponent(segment)).join("/") + suffix;
}

function uniqueRoots(roots: readonly string[]): string[] {
  return [...new Set(roots.map((root) => path.resolve(root)))];
}

/** The file access link navigation needs: canonical paths and the kind of a path. */
export type NavigationFiles = Pick<FileSystem, "realpath" | "stat">;

/** The checks of a followed link, reading the disk through a {@link NavigationFiles}. */
export interface PreviewNavigator {
  /**
   * Resolves a link of the page: an anchor, an external URL, a file below one of the roots, or a
   * wikilink found by `discover` (a search by file name). Anything else is blocked with a reason.
   */
  resolvePreviewNavigation(
    request: string,
    activeSourceFile: string,
    workspaceRoot: string,
    discover: (name: string) => Promise<readonly string[]>,
    rootLabel?: string,
    workspaceRoots?: readonly string[],
  ): Promise<PreviewNavigation>;
  /**
   * Checks a file the host resolved itself (a frontmatter link): a regular file below one of
   * `workspaceRoots`, symbolic links included, unless `allowOutsideRoot`.
   */
  validateResolvedPreviewNavigation(
    filePath: string,
    suffix: string,
    workspaceRoots: readonly string[],
    rootLabel?: string,
    allowOutsideRoot?: boolean,
  ): Promise<PreviewNavigation>;
  /** Checks a relative link of the page against one root. */
  validatePreviewNavigation(
    request: string,
    activeSourceFile: string,
    workspaceRoot: string,
    rootLabel?: string,
  ): Promise<PreviewNavigation>;
}

/** The link checks on `files`. Every file access is asynchronous and in the order of the checks. */
export function createPreviewNavigator(files: NavigationFiles): PreviewNavigator {
  const isRegularFile = async (filePath: string): Promise<boolean> => (await files.stat(filePath)).kind === "file";

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-098
  async function resolvePreviewNavigation(
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
        const navigation = await validatePreviewNavigation(request, activeSourceFile, root, rootLabel);
        if (navigation.kind === "local" || navigation.kind === "anchor" || navigation.kind === "external") {
          return navigation;
        }
        if (navigation.kind === "blocked" && !navigation.reason.includes("outside")) {
          return navigation;
        }
      }
      return await validatePreviewNavigation(request, activeSourceFile, workspaceRoot, rootLabel);
    }
    const target = reference.value.slice(5);
    const name = decodePath(resourcePathPart(target))!;
    const filename = path.extname(name) ? name : `${name}.md`;
    const suffix = resourceReferenceSuffix(target);
    const roots = uniqueRoots([workspaceRoot, ...workspaceRoots]);
    let local: Extract<PreviewNavigation, { kind: "local" }> | undefined;
    for (const root of roots) {
      const navigation = await validatePreviewNavigation(fileReference(filename, suffix), activeSourceFile, root, rootLabel);
      if (navigation.kind === "local") {
        local ??= navigation;
      }
    }
    if (name.includes("/")) {
      return local ?? { kind: "blocked", reason: "The wikilink target is unavailable." };
    }
    const matches = await discover(filename);
    const candidates = new Map<string, PreviewNavigation>();
    for (const match of matches) {
      if (path.basename(match) !== filename) continue;
      const navigation = await validateResolvedPreviewNavigation(match, suffix, roots, rootLabel);
      if (navigation.kind === "local") candidates.set(navigation.path, navigation);
    }
    if (candidates.size === 1) return [...candidates.values()][0];
    if (candidates.size === 0 && local) return local;
    return { kind: "blocked", reason: candidates.size > 1
      ? "The wikilink is ambiguous; use a relative path to choose a note."
      : "The wikilink target is unavailable." };
  }

  async function validateResolvedPreviewNavigation(
    filePath: string,
    suffix: string,
    workspaceRoots: readonly string[],
    rootLabel = "the workspace",
    allowOutsideRoot = false,
  ): Promise<PreviewNavigation> {
    const candidate = path.resolve(filePath);
    let realPath: string;
    try {
      realPath = await files.realpath(candidate);
      if (!await isRegularFile(realPath)) {
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
        const realRoot = await files.realpath(root);
        if (isWithin(root, candidate) && isWithin(realRoot, realPath)) {
          return { kind: "local", path: realPath, suffix };
        }
      } catch {
        // Try the next workspace root.
      }
    }
    return { kind: "blocked", reason: `The navigation target is outside ${rootLabel}.` };
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-094
  async function validatePreviewNavigation(
    request: string,
    activeSourceFile: string,
    workspaceRoot: string,
    rootLabel = "the workspace",
  ): Promise<PreviewNavigation> {
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
      realRoot = await files.realpath(root);
      realPath = await files.realpath(candidate);
      if (!await isRegularFile(realPath)) {
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

  return { resolvePreviewNavigation, validateResolvedPreviewNavigation, validatePreviewNavigation };
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
