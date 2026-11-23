import * as path from "node:path";

import type { FileKind, FileSystem } from "../files/fileSystem";

/** What the glob asks of the file system: a directory listing, and whether an entry is a symbolic link. */
export type GlobFiles = Pick<FileSystem, "readDirectory" | "isSymbolicLink">;

const DOCUMENT_EXTENSIONS = new Set([".md", ".markdown", ".myst"]);
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "_build", "out"]);
export const MAX_GLOB_MATCHES = 200;
const MAX_GLOB_DIRECTORIES = 400;
const MAX_GLOB_DEPTH = 8;

/** Translates a Sphinx-style document glob (`*`, `**`, `?`, `[abc]`) into an anchored regular expression. */
export function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") {
          index += 1;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else if (char === "[") {
      const close = pattern.indexOf("]", index + 2);
      if (close === -1) {
        source += "\\[";
      } else {
        source += `[${pattern.slice(index + 1, close).replace(/^!/u, "^").replace(/\\/gu, "\\\\")}]`;
        index = close;
      }
    } else {
      source += char.replace(/[.+^${}()|\\]/gu, "\\$&");
    }
  }
  return new RegExp(`^${source}$`, "u");
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-057
/**
 * Lists the Markdown documents below `baseDirectory` whose path (without extension) matches the
 * glob, as sorted posix requests relative to it, extension included. Bounded in matches,
 * directories and depth; `allow` vets each candidate request (the resource policy).
 */
export async function listGlobDocuments(
  files: GlobFiles,
  pattern: string,
  baseDirectory: string,
  allow: (request: string) => boolean | Promise<boolean>,
  excludePath?: string,
): Promise<string[]> {
  const normalized = pattern.replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) return [];
  const segments = normalized.split("/");
  const fixed: string[] = [];
  for (const segment of segments.slice(0, -1)) {
    if (/[*?[]/u.test(segment)) break;
    fixed.push(segment);
  }
  const regex = globToRegExp(normalized);
  const recursive = normalized.includes("**");
  const depthLimit = recursive ? MAX_GLOB_DEPTH : segments.length - fixed.length;
  const matches: string[] = [];
  let directories = 0;

  // A symbolic link is never listed nor walked (the listing reports the kind of its target).
  const isLink = (request: string): Promise<boolean> =>
    files.isSymbolicLink(path.join(baseDirectory, request)).catch(() => true);

  const walk = async (relative: string, depth: number): Promise<void> => {
    if (depth > depthLimit || directories >= MAX_GLOB_DIRECTORIES || matches.length >= MAX_GLOB_MATCHES) return;
    directories += 1;
    let entries: Array<[string, FileKind]>;
    try {
      entries = await files.readDirectory(path.join(baseDirectory, relative));
    } catch {
      return;
    }
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, kind] of entries) {
      if (matches.length >= MAX_GLOB_MATCHES) return;
      const request = relative ? `${relative}/${name}` : name;
      if (kind === "directory") {
        if (!name.startsWith(".") && !SKIPPED_DIRECTORIES.has(name) && !(await isLink(request))) {
          await walk(request, depth + 1);
        }
        continue;
      }
      const extension = path.extname(name).toLowerCase();
      if (kind !== "file" || !DOCUMENT_EXTENSIONS.has(extension) || name.startsWith(".")) continue;
      const docname = request.slice(0, request.length - extension.length);
      if (!regex.test(docname) && !regex.test(request)) continue;
      if (excludePath && path.resolve(baseDirectory, request) === path.resolve(excludePath)) continue;
      if (await isLink(request)) continue;
      if (await allow(request)) matches.push(request);
    }
  };

  await walk(fixed.join("/"), 1);
  return matches.sort();
}
