/**
 * Pure helpers behind the files dropped from the Explorer onto the preview (CR 146): the title of a
 * dropped Markdown file (its first heading) and the Markdown reference written for each dropped
 * file, relative to the document. This module must not import `vscode`.
 */

import { isImageFileName, relativeImageReference } from "./imageReference";

/** How many files one drop may bring. */
export const MAX_DROPPED_FILES = 50;

/** The longest address of one dropped file the page may send. */
export const MAX_DROPPED_URI_LENGTH = 4096;

/** How much of a dropped Markdown file is read to find its first heading. */
export const MAX_HEADING_SCAN_BYTES = 65_536;

const MARKDOWN_NAME = /\.(?:md|markdown|mdx)$/iu;

/** True for the name of a Markdown file, whose first heading gives the link text. */
export function isMarkdownFileName(name: string): boolean {
  return MARKDOWN_NAME.test(name);
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-004
/**
 * The text of the first heading of a Markdown text (an ATX `# …` line outside the front matter and
 * outside fenced code), with the closing hashes and inline emphasis markers removed, or `undefined`.
 */
export function firstHeadingTitle(markdown: string): string | undefined {
  const lines = markdown.replace(/^﻿/u, "").split(/\r\n|\n|\r/u);
  let index = 0;
  if (lines[0]?.trim() === "---") {
    index = 1;
    while (index < lines.length && !/^(?:---|\.\.\.)\s*$/u.test(lines[index])) index += 1;
    index += 1;
  }
  let fence: string | undefined;
  for (; index < lines.length; index += 1) {
    const line = lines[index];
    const opening = /^ {0,3}(`{3,}|~{3,})/u.exec(line);
    if (fence !== undefined) {
      if (opening && opening[1][0] === fence[0] && opening[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (opening) {
      fence = opening[1];
      continue;
    }
    const heading = /^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/u.exec(line);
    if (!heading) continue;
    const title = heading[1].replace(/[*_`]/gu, "").replace(/\s+/gu, " ").trim();
    if (title !== "") return title;
  }
  return undefined;
}

/** The address of a file as a Markdown destination: spaces and parentheses are percent-encoded. */
function encodeDestination(relative: string): string {
  return relative.split("/").map((segment) => encodeURIComponent(segment)
    .replace(/[!'()*]/gu, (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase())).join("/");
}

/** A link text: the brackets and the backslash of `text` escaped. */
function escapeLinkText(text: string): string {
  return text.replace(/[\\[\]]/gu, "\\$&");
}

/**
 * The local path a dropped `file:` address names (a Windows drive path keeps its backslashes), or
 * `undefined` for any other scheme, a remote host or an address that is not valid.
 */
export function droppedFilePath(uri: string): string | undefined {
  try {
    const url = new URL(uri);
    if (url.protocol !== "file:" || (url.hostname !== "" && url.hostname !== "localhost")) return undefined;
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes("\0")) return undefined;
    return /^\/[A-Za-z]:\//u.test(decoded) ? decoded.slice(1).replace(/\//gu, "\\") : decoded;
  } catch {
    return undefined;
  }
}

/** A dropped file: its absolute path and, for a Markdown file, the title the host found. */
export interface DroppedFile {
  path: string;
  title?: string;
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-004
/**
 * The Markdown of one dropped file seen from `documentPath`: `![name](path)` for an image,
 * `[title](path)` for anything else (the title is the first heading of a Markdown file, else the
 * file name without its extension). `undefined` when no relative path exists.
 */
export function droppedReference(documentPath: string, file: DroppedFile): string | undefined {
  const relative = relativeImageReference(documentPath, file.path);
  if (relative === undefined) return undefined;
  const baseName = file.path.split(/[\\/]/u).pop() ?? file.path;
  const stem = baseName.replace(/\.[^.]*$/u, "") || baseName;
  const destination = encodeDestination(relative);
  if (isImageFileName(baseName)) return "![" + escapeLinkText(stem) + "](" + destination + ")";
  const title = file.title !== undefined && file.title !== "" ? file.title : (isMarkdownFileName(baseName) ? stem : baseName);
  return "[" + escapeLinkText(title) + "](" + destination + ")";
}

/** The text a drop writes: one reference per file, separated by a space; `undefined` when none can be written. */
export function droppedText(documentPath: string, files: readonly DroppedFile[]): string | undefined {
  const references = files
    .map((file) => droppedReference(documentPath, file))
    .filter((reference): reference is string => reference !== undefined);
  return references.length === 0 ? undefined : references.join(" ");
}
