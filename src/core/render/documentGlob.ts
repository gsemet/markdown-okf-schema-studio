import * as fs from "node:fs";
import * as path from "node:path";

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
export function listGlobDocuments(
  pattern: string,
  baseDirectory: string,
  allow: (request: string) => boolean,
  excludePath?: string,
): string[] {
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

  const walk = (relative: string, depth: number): void => {
    if (depth > depthLimit || directories >= MAX_GLOB_DIRECTORIES || matches.length >= MAX_GLOB_MATCHES) return;
    directories += 1;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(baseDirectory, relative), { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (matches.length >= MAX_GLOB_MATCHES) return;
      const request = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !SKIPPED_DIRECTORIES.has(entry.name)) walk(request, depth + 1);
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (!entry.isFile() || !DOCUMENT_EXTENSIONS.has(extension) || entry.name.startsWith(".")) continue;
      const docname = request.slice(0, request.length - extension.length);
      if (!regex.test(docname) && !regex.test(request)) continue;
      if (excludePath && path.resolve(baseDirectory, request) === path.resolve(excludePath)) continue;
      if (allow(request)) matches.push(request);
    }
  };

  walk(fixed.join("/"), 1);
  return matches.sort();
}
